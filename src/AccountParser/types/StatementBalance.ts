import { Transaction } from "./Transaction";

export interface AccountStatement {
  asOf: String;
  currency: string;

  transactions: Transaction[];
  // positions: Position[];
  balance: Balance;
}

export interface Balance {
  cash: number;
  margin: number;
  short: number;
}
