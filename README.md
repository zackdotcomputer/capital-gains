# Capital Gains Calculator

This is a quick, dirty, and tbh fairly inaccurate attempt at a Capital Gains calculator.

## Problem:

You have tax reporting responsibilities to some jurisdiction like the UK or Australia that uses a non-calendar tax year. However, Wealthfront (and others) don't let you easily calculate your capital gains for a period other than the US tax year (calendar year).

## Solution:

**Not this. I offer no warranty. I'm not a financial or tax expert, and I'm definitely not YOUR expert.**

BUT if you want to get an idea of the rough magnitude of your capital gains, this is a node/next webapp that can ingest a QFX or OFX file (used for transferring transaction history between software - available from your Wealthfront statements page) and, for an arbitrary calendar period, can attempt to calculate your capital gains or losses.

## Caveats:

**Infinite caveats.** See above about no warranty and how I'm not an expert.

Additionally, I have run this on my Wealthfront export and compared the results to the 1099 reports Wealthfront has set me and they have not agreed. They were, in my case, within the approximate order of magnitude (indeed, the error was less than 100%), but something is definitely incorrect with some combination of: my math, javascript's handling of floating point numbers, my understanding of the QFX standard, Wealthfront's reporting.

If you have any insight, please open a PR.
