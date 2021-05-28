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

export type BuySellType =
  | TransactionType.BUYMF
  | TransactionType.BUYSTOCK
  | TransactionType.SELLMF
  | TransactionType.SELLSTOCK;
