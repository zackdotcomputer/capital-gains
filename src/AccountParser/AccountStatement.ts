import { DateTime } from "luxon";
import { Balance, parseBalance } from "./Balance";
import parseHorribleDate from "./parsehorribleDate";
import { Security } from "./Security";
import { ALL_TRANSACTION_TYPES, parseTransaction, Transaction } from "./Transaction";

export interface AccountStatement {
  asOf: DateTime;
  currency: string;

  transactions: Transaction[];
  // positions: Position[];
  balance: Balance;
}

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

  let asOf = DateTime.now();
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

  return ALL_TRANSACTION_TYPES.flatMap((key): Transaction[] => {
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
}
