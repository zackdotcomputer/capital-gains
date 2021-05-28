import { Balance } from "./types";

export function parseBalance(ofx: any): Balance {
  return {
    cash: Number(ofx.AVAILCASH ?? "0") ?? 0,
    margin: Number(ofx.MARGINBALANCE ?? "0") ?? 0,
    short: Number(ofx.SHORTBALANCE ?? "0") ?? 0
  };
}
