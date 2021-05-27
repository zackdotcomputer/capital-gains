export interface Security {
  name?: string;
  ticker?: string;
  idType: string;
  id: string;
}

export function parseSecurity(ofx: any): Security | null {
  if (typeof ofx !== "object") {
    return null;
  }

  if ("SECINFO" in ofx) {
    return parseSecurity(ofx.SECINFO);
  }

  if ("SECNAME" in ofx && "SECID" in ofx) {
    if (ofx.SECID.UNIQUEIDTYPE !== "CUSIP") {
      console.error("Unexpected security id type", ofx.SECID.UNIQUEIDTYPE);
    }

    return {
      name: ofx.SECNAME,
      ticker: ofx.TICKER ?? undefined,
      id: ofx.SECID.UNIQUEID,
      idType: ofx.SECID.UNIQUEIDTYPE
    };
  }

  return null;
}
