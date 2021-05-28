import { Form } from "multiparty";
import { NextApiHandler } from "next";
import ofx from "ofx";
import { ofxFullParse } from "../../AccountParser";

const handler: NextApiHandler = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({
      error: `Method ${req.method} is not allowed.`
    });
    return;
  }

  console.log("File upload received");

  try {
    const fileContents: string = await new Promise((resolve, reject) => {
      let form = new Form({
        maxFieldsSize: 100 * 1024 * 1024 // 100MB
      });
      form.parse(req, (err, fields, files) => {
        if (fields?.qfx) {
          console.log("Found QFX file");
          resolve(fields.qfx[0]);
        } else if (err) {
          console.error("Error while parsing file", err);
          reject(err);
        } else {
          console.error("Failed to parse a file - unclear why");
          reject(Error("Failed to parse file"));
        }
      });
    });

    const data: { header: Record<string, string>; OFX: any } = ofx.parse(fileContents);

    console.log("OFX extracted");

    const parsedAccounts = ofxFullParse(data);

    res.status(200).json(parsedAccounts);
  } catch (e) {
    console.error("Error encountered", e);
    res.status(500).json({ error: "There was an error receiving your file" });
  }
};

export const config = {
  api: {
    bodyParser: false
  }
};

export default handler;
