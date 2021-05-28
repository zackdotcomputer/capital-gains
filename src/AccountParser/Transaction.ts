import parseHorribleDate from "./parseDate";
import {
  BankTransaction,
  BuySellTransaction,
  BuySellType,
  DividendTransaction,
  Security,
  SplitTransaction,
  Transaction,
  TransactionType,
  TransferTransaction
} from "./types";

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
    time: parseHorribleDate(ofx.INVTRAN.DTTRADE),
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

  const units = Number(invObj.UNITS);
  const time = parseHorribleDate(invObj.INVTRAN.DTTRADE);

  let outputType = type;

  if (isSell && units > 0) {
    console.warn(`Flipping sell of ${security.id} on ${time}`);
    outputType = type === TransactionType.SELLMF ? TransactionType.BUYMF : TransactionType.BUYSTOCK;
  }

  if (!isSell && units < 0) {
    console.warn(`Flipping buy of ${security.id} on ${time}`);
    outputType =
      type === TransactionType.BUYMF ? TransactionType.SELLMF : TransactionType.SELLSTOCK;
  }

  return {
    type: outputType,
    time,
    amount: Number(invObj.TOTAL),
    security,
    units,
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

  const units = Number(ofx.UNITS);

  if (isNaN(units) || units === 0) {
    return null;
  }

  return {
    type: TransactionType.TRANSFER,
    time: parseHorribleDate(ofx.INVTRAN.DTTRADE),
    security,
    units,
    unitPrice: Number(ofx.AVGCOSTBASIS ?? "0") / units
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
    time: parseHorribleDate(ofx.INVTRAN.DTTRADE),
    ratio: newUnits / oldUnits,
    security
  };
}
