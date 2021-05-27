export interface Balance {
  cash: number;
  margin: number;
  short: number;
}

export function parseBalance(ofx: any): Balance {
  return {
    cash: Number(ofx.AVAILCASH ?? "0") ?? 0,
    margin: Number(ofx.MARGINBALANCE ?? "0") ?? 0,
    short: Number(ofx.SHORTBALANCE ?? "0") ?? 0
  };
}
