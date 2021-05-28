import { DateTime } from "luxon";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useMemo, useState } from "react";
import { Card, Container, Row } from "react-bootstrap";
import { useEstimateCostBasis } from "../CostBasisEstimator";

export default function View() {
  const router = useRouter();

  const [fromDateString, setFromDateString] = useState<string>("2020-01-01");
  const [toDateString, setToDateString] = useState<string>("2020-12-31");

  const [fromDate, toDate] = useMemo(() => {
    return [
      fromDateString ? DateTime.fromJSDate(new Date(fromDateString)) : undefined,
      toDateString ? DateTime.fromJSDate(new Date(toDateString)) : undefined
    ];
  }, [fromDateString, toDateString]);

  const { loading, calculations, statement } = useEstimateCostBasis(fromDate, toDate);

  if (!statement) {
    if (typeof window !== "undefined") {
      router.replace("/");
    }
    return null;
  }

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
        <p>
          Now that your {statement.transactions.length} transactions are loaded in, select the date
          whose gains you're interested in.
        </p>
        <p>
          The system will then walk your transaction history (it might take a moment) and estimate
          your total, long term (held over a year), and short term capital gains, as well as any
          dividends, from that period.
        </p>
        <Container>
          <Row className="justify-content-md-between">
            <Card className="col-4 offset-1 d-flex flex-column align-items-center">
              <h4>From</h4>
              <input
                type="date"
                value={fromDateString}
                onChange={(e) => setFromDateString(e.target.value)}
              />
            </Card>
            <Card className="col-4 offset-2 d-flex flex-column align-items-center">
              <h4>To</h4>
              <input
                type="date"
                value={toDateString}
                onChange={(e) => setToDateString(e.target.value)}
              />
            </Card>
          </Row>
          <hr />
          {loading && (
            <Row className="justify-content-md-between">
              <p className="text-center">Calculating...</p>
            </Row>
          )}
          {calculations && (
            <Row className="justify-content-md-between">
              <p>
                <strong>Sales in Window:</strong> {calculations.richSalesInWindow.length}
              </p>
              <p>proceeds: {JSON.stringify(calculations.proceeds)}</p>
              <p>costs: {JSON.stringify(calculations.costs)}</p>
              <p>gains: {JSON.stringify(calculations.gains)}</p>
            </Row>
          )}
        </Container>
      </Container>

      <footer className="cntr-footer"></footer>
    </Container>
  );
}
