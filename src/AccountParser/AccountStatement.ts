import { DateTime } from "luxon";
import { parseBalance } from "./Balance";
import parseHorribleDate from "./parseDate";
import { parseTransaction } from "./Transaction";
import {
  AccountStatement,
  ALL_TRANSACTION_TYPES,
  isBuySellTransaction,
  isSplitTransaction,
  isTransferTransaction,
  Security,
  Transaction
} from "./types";

export function parseStatement(ofx: any, securities: Security[]): AccountStatement | null {
  if (typeof ofx !== "object") {
    return null;
  }

  if ("INVSTMTTRNRS" in ofx) {
    return parseStatement(ofx.INVSTMTTRNRS, securities);
  }

  if ("INVSTMTRS" in ofx) {
    return parseStatement(ofx.INVSTMTRS, securities);
  }

  let currency = "USD";
  if ("CURDEF" in ofx && ofx.CURDEF) {
    currency = ofx.CURDEF;
  }

  let asOf = String(DateTime.now().toMillis());
  if ("DTASOF" in ofx) {
    asOf = parseHorribleDate(ofx.DTASOF);
  }

  const balance = parseBalance(ofx.INVBAL);

  const transactions = parseTransactionList(ofx.INVTRANLIST, securities);

  return {
    currency,
    asOf,
    balance,
    transactions
  };
}

function parseTransactionList(ofx: any, securities: Security[]): Transaction[] {
  if (typeof ofx !== "object" || !ofx) {
    return [];
  }

  const securityMap: Record<string, Security> = {};
  securities.forEach((s) => {
    securityMap[s.id] = s;
  });

  let transactions = ALL_TRANSACTION_TYPES.flatMap((key): Transaction[] => {
    const l = ofx[key];
    if (!l) {
      return [];
    } else {
      if (Array.isArray(l)) {
        return l.flatMap((t): Transaction[] => {
          const transaction = parseTransaction(t, key, securityMap);
          return transaction ? [transaction] : [];
        });
      } else {
        const transaction = parseTransaction(l, key, securityMap);
        return transaction ? [transaction] : [];
      }
    }
  });

  transactions.sort((a, b) => {
    return Number(a.time) - Number(b.time);
  });

  // Roll in any splits
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (isSplitTransaction(t)) {
      const r = t.ratio;
      for (let j = 0; j < i; j++) {
        const mod = transactions[j];
        if (
          (isTransferTransaction(mod) || isBuySellTransaction(mod)) &&
          mod.security.id === t.security.id
        ) {
          mod.units = mod.units * r;
          mod.unitPrice = mod.unitPrice / r;
        }
      }
    }
  }

  return transactions;
}
