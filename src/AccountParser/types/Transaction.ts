import { Security } from "./Security";
import { BuySellType, TransactionType } from "./TransactionType";

export interface Transaction {
  type: TransactionType;
  time: string; // Needs to smoothly move to/from JSON, so we'll do a string of millis
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
  unitPrice: number; // Should be always positive
}

export function isBuySellTransaction(t: Transaction): t is BuySellTransaction {
  return (
    [
      TransactionType.BUYMF,
      TransactionType.BUYSTOCK,
      TransactionType.SELLMF,
      TransactionType.SELLSTOCK
    ].indexOf(t.type) >= 0
  );
}

export function isTransferTransaction(t: Transaction): t is TransferTransaction {
  return t.type === TransactionType.TRANSFER;
}

export function isSplitTransaction(t: Transaction): t is SplitTransaction {
  return t.type === TransactionType.SPLIT;
}
