import { DateTime } from "luxon";
import parseHorribleDate from "./parsehorribleDate";
import { Security } from "./Security";

export enum TransactionType {
  BUYDEBT = "BUYDEBT",
  BUYMF = "BUYMF",
  BUYOPT = "BUYOPT",
  BUYOTHER = "BUYOTHER",
  BUYSTOCK = "BUYSTOCK",
  CLOSUREOPT = "CLOSUREOPT",
  INCOME = "INCOME",
  INVEXPENSE = "INVEXPENSE",
  JRNLFUND = "JRNLFUND",
  JRNLSEC = "JRNLSEC",
  MARGININTEREST = "MARGININTEREST",
  REINVEST = "REINVEST",
  RETOFCAP = "RETOFCAP",
  SELLDEBT = "SELLDEBT",
  SELLMF = "SELLMF",
  SELLOPT = "SELLOPT",
  SELLOTHER = "SELLOTHER",
  SELLSTOCK = "SELLSTOCK",
  SPLIT = "SPLIT",
  TRANSFER = "TRANSFER",
  INVBANKTRAN = "INVBANKTRAN"
}

export const ALL_TRANSACTION_TYPES = [
  TransactionType.BUYDEBT,
  TransactionType.BUYMF,
  TransactionType.BUYOPT,
  TransactionType.BUYOTHER,
  TransactionType.BUYSTOCK,
  TransactionType.CLOSUREOPT,
  TransactionType.INCOME,
  TransactionType.INVEXPENSE,
  TransactionType.JRNLFUND,
  TransactionType.JRNLSEC,
  TransactionType.MARGININTEREST,
  TransactionType.REINVEST,
  TransactionType.RETOFCAP,
  TransactionType.SELLDEBT,
  TransactionType.SELLMF,
  TransactionType.SELLOPT,
  TransactionType.SELLOTHER,
  TransactionType.SELLSTOCK,
  TransactionType.SPLIT,
  TransactionType.TRANSFER,
  TransactionType.INVBANKTRAN
];

type BuySellType =
  | TransactionType.BUYMF
  | TransactionType.BUYSTOCK
  | TransactionType.SELLMF
  | TransactionType.SELLSTOCK;

export interface Transaction {
  type: TransactionType;
  time: DateTime;
}

export interface SplitTransaction extends Transaction {
  type: TransactionType.SPLIT;
  security: Security;
  ratio: number;
}

export interface BankTransaction extends Transaction {
  type: TransactionType.INVBANKTRAN;
  amount: number;
}

export interface DividendTransaction extends Transaction {
  type: TransactionType.INCOME;
  amount: number;
  security: Security;
}

export interface BuySellTransaction extends Transaction {
  type: BuySellType;
  amount: number; // Should equal -1 * units * unitPrice because it's a trade
  security: Security;
  units: number; // Positive for buys, negative for sells
  unitPrice: number; // Should be always positive
}

export interface TransferTransaction extends Transaction {
  type: TransactionType.TRANSFER;
  security: Security;
  units: number; // Positive for transfers in, negative for out
  costBasis: number; // Should be always positive
}

export function parseTransaction(
  ofx: any,
  type: TransactionType,
  securitiesMap: Record<string, Security>
): Transaction | null {
  if (type === TransactionType.INVBANKTRAN) {
    return parseBankTransaction(ofx);
  } else if (type === TransactionType.INCOME) {
    return parseDividend(ofx, securitiesMap);
  } else if (
    type === TransactionType.BUYMF ||
    type === TransactionType.BUYSTOCK ||
    type === TransactionType.SELLMF ||
    type === TransactionType.SELLSTOCK
  ) {
    return parseBuySell(ofx, type, securitiesMap);
  } else if (type === TransactionType.SPLIT) {
    return parseSplit(ofx, securitiesMap);
  } else if (TransactionType.TRANSFER === type) {
    return parseTransfer(ofx, securitiesMap);
  } else {
    // TransactionType.BUYDEBT
    // TransactionType.BUYOPT
    // TransactionType.BUYOTHER
    // TransactionType.CLOSUREOPT,
    //   TransactionType.INVEXPENSE,
    //   TransactionType.JRNLFUND,
    //   TransactionType.JRNLSEC,
    // TransactionType.MARGININTEREST
    // TransactionType.REINVEST,
    //   TransactionType.RETOFCAP,
    //   TransactionType.SELLDEBT,
    //   TransactionType.SELLOPT,
    //   TransactionType.SELLOTHER,
    console.error("Unhandled transaction type", type);
  }

  return null;
}

function parseBankTransaction(ofx: any): BankTransaction | null {
  if ((ofx.SUBACCTFUND as string)?.toLowerCase() !== "cash") {
    console.error("Unhandled account fund!", ofx.SUBACCTFUND);
  }

  return {
    type: TransactionType.INVBANKTRAN,
    time: parseHorribleDate(ofx.STMTTRN.DTPOSTED),
    amount: Number(ofx.STMTTRN.TRNAMT)
  };
}

function parseDividend(
  ofx: any,
  securitiesMap: Record<string, Security>
): DividendTransaction | null {
  if ((ofx.SUBACCTFUND as string)?.toLowerCase() !== "cash") {
    console.error("Unhandled account fund!", ofx.SUBACCTFUND);
  }
  if ((ofx.SUBACCTSEC as string)?.toLowerCase() !== "cash") {
    console.error("Unhandled account sec!", ofx.SUBACCTSEC);
  }
  if ((ofx.INCOMETYPE as string)?.toLowerCase() !== "div") {
    console.error("Unhandled income type!", ofx.INCOMETYPE);
  }

  let security = securitiesMap[ofx.SECID.UNIQUEID];
  if (!security) {
    console.warn("Income transaction for unknown security: ", ofx.SECID);
    security = {
      id: ofx.SECID.UNIQUEID,
      idType: ofx.SECID.UNIQUEIDTYPE
    };
  }

  return {
    type: TransactionType.INCOME,
    time: parseHorribleDate(ofx.INVTRAN.DTSETTLE),
    amount: Number(ofx.TOTAL),
    security
  };
}

function parseBuySell(
  ofx: any,
  type: BuySellType,
  securitiesMap: Record<string, Security>
): BuySellTransaction | null {
  const isSell = type === TransactionType.SELLMF || type === TransactionType.SELLSTOCK;

  if (isSell && (ofx.SELLTYPE as string)?.toLowerCase() !== "sell") {
    console.error("Unexpected sell type!", ofx.SELLTYPE);
  }

  if (!isSell && (ofx.BUYTYPE as string)?.toLowerCase() !== "buy") {
    console.error("Unexpected buy type!", ofx.BUYTYPE);
  }

  const invObj = isSell ? ofx.INVSELL : ofx.INVBUY;
  if ((invObj.SUBACCTFUND as string)?.toLowerCase() !== "cash") {
    console.error("Unhandled account fund!", invObj.SUBACCTFUND);
  }
  if ((invObj.SUBACCTSEC as string)?.toLowerCase() !== "cash") {
    console.error("Unhandled account sec!", invObj.SUBACCTSEC);
  }

  let security = securitiesMap[invObj.SECID.UNIQUEID];
  if (!security) {
    console.error("Income transaction for unknown security: ", invObj.SECID);
    security = {
      id: invObj.SECID.UNIQUEID,
      idType: invObj.SECID.UNIQUEIDTYPE
    };
  }

  return {
    type,
    time: parseHorribleDate(invObj.INVTRAN.DTSETTLE),
    amount: Number(ofx.TOTAL),
    security,
    units: Number(invObj.UNITS),
    unitPrice: Number(invObj.UNITPRICE)
  };
}

function parseTransfer(
  ofx: any,
  securitiesMap: Record<string, Security>
): TransferTransaction | null {
  if ((ofx.POSTYPE as string)?.toLowerCase() !== "long") {
    console.error("Unexpected transfer position type!", ofx.POSTYPE);
  }

  if ((ofx.SUBACCTSEC as string)?.toLowerCase() !== "cash") {
    console.error("Unhandled account sec!", ofx.SUBACCTSEC);
  }

  let security = securitiesMap[ofx.SECID.UNIQUEID];
  if (!security) {
    console.error("Transfer transaction for unknown security: ", ofx.SECID);
    security = {
      id: ofx.SECID.UNIQUEID,
      idType: ofx.SECID.UNIQUEIDTYPE
    };
  }

  return {
    type: TransactionType.TRANSFER,
    time: parseHorribleDate(ofx.INVTRAN.DTSETTLE),
    security,
    units: Number(ofx.UNITS),
    costBasis: Number(ofx.AVGCOSTBASIS)
  };
}

function parseSplit(ofx: any, securitiesMap: Record<string, Security>): SplitTransaction | null {
  if ((ofx.SUBACCTFUND as string)?.toLowerCase() !== "cash") {
    console.error("Unhandled account fund!", ofx.SUBACCTFUND);
  }
  if ((ofx.SUBACCTSEC as string)?.toLowerCase() !== "cash") {
    console.error("Unhandled account sec!", ofx.SUBACCTSEC);
  }
  if (String(ofx.NUMERATOR) !== "1" || String(ofx.DENOMINATOR) !== "1") {
    console.error("Unhandled ratio!", `${ofx.NUMERATOR} / ${ofx.DENOMINATOR}`);
  }

  let security = securitiesMap[ofx.SECID.UNIQUEID];
  if (!security) {
    console.error("Split transaction for unknown security: ", ofx.SECID);
    security = {
      id: ofx.SECID.UNIQUEID,
      idType: ofx.SECID.UNIQUEIDTYPE
    };
  }

  const oldUnits = Number(ofx.OLDUNITS);
  const newUnits = Number(ofx.NEWUNITS);

  if (isNaN(oldUnits) || oldUnits <= 0) {
    console.error("Don't understand old unit value: ", ofx.OLDUNITS);
    return null;
  }

  if (isNaN(newUnits) || newUnits <= 0) {
    console.error("Don't understand new unit value: ", ofx.NEWUNITS);
    return null;
  }

  return {
    type: TransactionType.SPLIT,
    time: parseHorribleDate(ofx.INVTRAN.DTSETTLE),
    ratio: newUnits / oldUnits,
    security
  };
}
