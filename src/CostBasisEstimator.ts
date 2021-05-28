import { DateTime, Duration } from "luxon";
import { useEffect, useMemo, useState } from "react";
import {
  AccountStatement,
  BuySellTransaction,
  FullOfxParse,
  TransactionType,
  TransferTransaction
} from "./AccountParser/types";

const IGNORE_TICKERS = ["TIMXX"];

type BuySellWithCostBasis = BuySellTransaction & {
  costBasis: number;
  relevantBuys: (BuySellTransaction | TransferTransaction)[];
};

export interface Calculations {
  richSalesInWindow: BuySellWithCostBasis[];
  proceeds: {
    long: number;
    short: number;
    total: number;
  };
  costs: {
    long: number;
    short: number;
    total: number;
  };
  gains: {
    long: number;
    short: number;
    total: number;
  };
}

export function useEstimateCostBasis(
  fromDate: DateTime | undefined,
  toDate: DateTime | undefined
): {
  loading: boolean;
  calculations: Calculations | null;
  statement: AccountStatement | undefined;
} {
  const [loading, setLoading] = useState(true);
  const [calculations, setCalculations] = useState<Calculations | null>(null);

  const account: FullOfxParse | undefined = useMemo(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const infoString = localStorage.getItem("accountInfo");
    const accounts = infoString && JSON.parse(infoString);
    return accounts;
  }, []);

  const salesWithCostBasis: Promise<BuySellWithCostBasis[]> = useMemo(async (): Promise<
    BuySellWithCostBasis[]
  > => {
    const transactions = account?.account.transactions ?? [];
    transactions.sort();

    const buys: Record<string, (BuySellTransaction | TransferTransaction)[]> = {};

    // Assemble the buys map
    for (let i = 0; i < transactions.length; i += 1) {
      const t = transactions[i];
      const { type } = t;
      if (
        type === TransactionType.BUYMF ||
        type === TransactionType.BUYSTOCK ||
        type === TransactionType.TRANSFER
      ) {
        // BUY
        const buy = t as BuySellTransaction | TransferTransaction;

        if (!buys[buy.security.id]) {
          buys[buy.security.id] = [];
        }
        buys[buy.security.id] = buys[buy.security.id].concat([{ ...buy }]);
      }
    }

    // Calculate the cost basis for each sale in the past
    const result: BuySellWithCostBasis[] = transactions.flatMap((t): BuySellWithCostBasis[] => {
      const { type } = t;
      if (type === TransactionType.SELLMF || type === TransactionType.SELLSTOCK) {
        // SELL
        const sell = t as BuySellTransaction;

        if (sell.security.ticker && IGNORE_TICKERS.indexOf(sell.security.ticker) >= 0) {
          return [];
        }

        // To calculate the cost basis for a sale, you walk the oldest items in the list until you have
        // enough stock for the sale.
        let buyList = buys[sell.security.id] ?? [];

        const target = sell.units * -1;

        if (target <= 0) {
          console.warn("Sale of negative units?", sell);
          return [
            {
              ...sell,
              costBasis: 0,
              relevantBuys: []
            }
          ];
        }

        let sharesFound = 0;
        let aggregateSpend = 0;
        let upToIndex = 0;
        let overflowUnits = 0;
        for (; upToIndex < buyList.length; upToIndex += 1) {
          const buy = buyList[upToIndex];
          if (sharesFound + buy.units <= target) {
            sharesFound += buy.units;
            aggregateSpend += buy.units * buy.unitPrice;

            // If this got us perfectly to target, break;
            if (sharesFound === target) {
              break;
            }
          } else if (sharesFound + buy.units > target) {
            // If we overshot, we only slurp in the chunk of the buy we need
            const underflow = target - sharesFound;

            overflowUnits = buy.units - underflow;
            sharesFound = target;
            aggregateSpend += underflow * buy.unitPrice;

            break;
          }
        }

        if (sharesFound < target) {
          console.error(`Don't have enough buys to handle sale of security`, sell);
          throw new Error(`Don't have enough buys to handle sale of security`);
        }

        // If there was an overflow, the overflowed buy should wind up in both lists.
        const relevantBuys = buyList.slice(0, upToIndex + 1);
        buyList = buyList.slice(overflowUnits > 0 ? upToIndex : upToIndex + 1);

        if (overflowUnits > 0) {
          const underflowUnits = relevantBuys[relevantBuys.length - 1].units - overflowUnits;
          relevantBuys[relevantBuys.length - 1] = {
            ...relevantBuys[relevantBuys.length - 1],
            units: underflowUnits
          };
          buyList[0].units = overflowUnits;
        }

        buys[sell.security.id] = buyList;
        return [
          {
            ...sell,
            costBasis: aggregateSpend,
            relevantBuys
          }
        ];
      } else {
        return [];
      }
    });

    return result;
  }, [account?.account.transactions]);

  useEffect(() => {
    if (account && fromDate && toDate) {
      setLoading(true);
      (async () => {
        const sales = await salesWithCostBasis;

        const inWindow = sales.filter((s) => {
          const saleTime = DateTime.fromMillis(Number(s.time));
          return saleTime >= fromDate && saleTime <= toDate;
        });

        let proceeds = {
          total: 0,
          long: 0,
          short: 0
        };
        let costs = {
          total: 0,
          long: 0,
          short: 0
        };
        let gains = {
          total: 0,
          long: 0,
          short: 0
        };

        inWindow.forEach((s) => {
          if (s.units > 0) {
            console.warn("Sale had positive units");
          }

          if (s.costBasis < 0) {
            console.warn("Sale had negative cost basis");
          }

          if (s.amount < 0) {
            console.warn("Sale generated negative revenue");
          }

          // Money in
          const revenue = centRound(s.amount);
          // (Past) money out
          const cost = centRound(s.costBasis);
          // Time Held
          const isShort = (() => {
            if (s.relevantBuys.length < 1) {
              return true;
            }

            const latestBuy = s.relevantBuys[s.relevantBuys.length - 1];
            return (
              Math.abs(Number(s.time) - Number(latestBuy.time)) <
              Duration.fromObject({ years: 1 }).toMillis()
            );
          })();

          const profit = centRound(revenue - cost);

          proceeds.total += revenue;
          costs.total += cost;
          gains.total += profit;

          const key = isShort ? "short" : "long";
          proceeds[key] += revenue;
          costs[key] += cost;
          gains[key] += profit;
        });

        function centRound(n: number): number {
          return Math.round(n * 100) / 100;
        }

        setLoading(false);
        setCalculations({
          richSalesInWindow: inWindow,
          proceeds,
          costs,
          gains
        });
      })();
    }
  }, [account, fromDate, toDate, salesWithCostBasis]);

  return {
    loading,
    calculations,
    statement: account?.account
  };
}
