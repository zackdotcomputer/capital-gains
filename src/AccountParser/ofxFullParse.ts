import { DateTime } from "luxon";
import { parseStatement } from "./AccountStatement";
import { parseSecurity, Security } from "./Security";

export default function ofxFullParse(ofx: any) {
  const trueOfx = ofx?.OFX;

  if (!trueOfx) {
    return null;
  }

  const rawSeclist: any[] = trueOfx.SECLISTMSGSRSV1 ?? [];
  const securities = parseSecList(rawSeclist);

  console.log(`Parsed ${securities.length} securities`);

  const rawStatement = trueOfx.INVSTMTMSGSRSV1 ?? {};
  const account = parseStatement(rawStatement, securities);

  console.log(
    `Parsed account as of ${account.asOf.toLocaleString(DateTime.DATETIME_MED)} with balance of ${
      account.balance.cash
    }`
  );

  const untrackedSecurities = account.transactions.flatMap((t) =>
    "security" in t && !((t as any).security as Security).name
      ? [(t as any).security as Security]
      : []
  );

  return {
    securities,
    account,
    untrackedSecurities
  };
}

function parseSecList(seclist: any): Security[] {
  if (Array.isArray(seclist)) {
    return seclist.flatMap((s) => {
      const sec = parseSecurity(s);
      return sec ? [sec] : [];
    });
  } else if (typeof seclist === "object") {
    if ("SECLIST" in seclist) {
      return parseSecList(seclist.SECLIST);
    }

    if ("SECINFO" in seclist) {
      return parseSecList([seclist.SECINFO]);
    }

    return ["MFINFO", "STOCKINFO", "OPTINFO", "DEBTINFO", "OTHERINFO"].flatMap((key) => {
      const s = seclist[key];
      if (!s) {
        return [];
      } else {
        return parseSecList(s);
      }
    });
  } else {
    return [];
  }
}
