import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useState } from "react";
import { Card, Container, Row } from "react-bootstrap";
import { useDropzone } from "react-dropzone";

export default function Home() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsLoading(true);

    if (acceptedFiles.length < 1) {
      alert("No valid files were detected - try again");
      return;
    }

    const file = acceptedFiles[0];
    const lowercaseName = file.name.toLowerCase();

    if (!(lowercaseName.endsWith(".qfx") || lowercaseName.endsWith(".ofx"))) {
      alert("That isn't a QFX or OFX file");
      return;
    }

    const reader = new FileReader();

    reader.onabort = () => {
      console.log("file reading was aborted");
      setIsLoading(false);
    };
    reader.onerror = () => {
      console.log("file reading failed");
      setIsLoading(false);
    };
    reader.onload = () => {
      const fileContents = reader.result;
      let data = new FormData();
      data.append("qfx", fileContents as string);

      fetch("/api/digest", {
        // Your POST endpoint
        method: "POST",
        body: data
      })
        .then(async (r) => {
          const res = await r.json();
          if (res.accountInfo) {
            localStorage.setItem("accountInfo", JSON.stringify(res.accountInfo));
            router.push("/view");
          } else {
            alert("Something went wrong parsing that file...");
            setIsLoading(false);
          }
        })
        .catch((e) => {
          console.error(e);
          alert("Something went wrong parsing that file...");
          setIsLoading(false);
        });
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop
  });

  return (
    <Container className="md-container">
      <Head>
        <title>Calculate your Wealthfront Gains</title>
      </Head>
      <Container>
        <h1>Capital Gains</h1>
        <p>
          This tool allows you to calculate your{" "}
          <a href="https://www.wealthfront.com">Wealthfront</a> capital gains over an arbitrary
          period.
        </p>
        <Container>
          <Row className="justify-content-md-between">
            <Card className="sml-card" {...getRootProps()}>
              <Card.Body>
                <Card.Title>Upload QFX File</Card.Title>
                <Card.Text>
                  You will need to export your <strong>full account history</strong> to QFX for this
                  to work properly.
                </Card.Text>
                <input {...getInputProps()} />
                {isLoading
                  ? "Parsing... Please wait..."
                  : isDragActive
                  ? "Go ahead and drop it"
                  : "Drag your QFX file here"}
              </Card.Body>
            </Card>
          </Row>
        </Container>
      </Container>

      <footer className="cntr-footer"></footer>
    </Container>
  );
}
