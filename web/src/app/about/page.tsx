import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "How the Order Book dashboard was built: data cleaning, RFM segmentation, K-Means clustering and cohort retention.",
};

const findings = [
  {
    figure: "£17.37M",
    text: "in revenue from 36,969 orders placed by 5,878 customers in 41 countries. The average order is £470.",
  },
  {
    figure: "68%",
    text: "of revenue comes from Champions, who are 22% of customers. Losing a few of them costs more than losing hundreds of occasional buyers.",
  },
  {
    figure: "82.8%",
    text: "of revenue is from the United Kingdom. EIRE, the Netherlands and Germany are the largest markets abroad.",
  },
  {
    figure: "21%",
    text: "of a month’s new customers order again the next month, on average. Most repeat business comes from customers who come back later.",
  },
  {
    figure: "Nov 2010",
    text: "was the biggest month at £1.17M. Every year peaks between September and November as wholesale buyers stock up for Christmas.",
  },
];

const steps = [
  {
    title: "Clean the raw ledger",
    text: "Both Excel sheets are combined (1.07M lines). Lines without a customer ID, cancelled invoices, non-positive quantities or prices, and exact duplicates are removed, leaving 779,425 lines.",
  },
  {
    title: "Score every customer (RFM)",
    text: "Each customer gets a 1–5 score for how recently they ordered, how often and how much they spent. The scores map to seven segments, from Champions to Hibernating.",
  },
  {
    title: "Find natural groups (K-Means)",
    text: "Recency, frequency and spend are log-transformed and standardised, then clustered. The elbow method picks four clusters: High-Value, Mid-Value, Occasional and Dormant.",
  },
  {
    title: "Ship it to the browser",
    text: "The 100 MB cleaned file is reduced to one row per order (about 450 KB compressed). Every chart on the dashboard is recomputed in the browser whenever a filter changes, so the numbers always agree.",
  },
];

export default function About() {
  return (
    <main id="main" className="page about">
      <section className="hero">
        <h1 className="hero-title">Two years of orders from one UK giftware wholesaler.</h1>
        <p className="hero-lede">
          The UCI Online Retail II dataset records every order placed with a UK-based online shop that sells
          all-occasion giftware, mostly to wholesalers, between 1 December 2009 and 9 December 2011. This project
          cleans it, segments the customers and turns it into a dashboard you can filter by period, country and
          customer segment.
        </p>
      </section>

      <section className="section" aria-labelledby="findings">
        <header className="section-head">
          <h2 id="findings">What the data shows</h2>
          <p>Figures cover the full period and all countries. Use the dashboard filters to see any slice.</p>
        </header>
        <dl className="findings">
          {findings.map((f) => (
            <div key={f.figure}>
              <dt>{f.figure}</dt>
              <dd>{f.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section" aria-labelledby="method">
        <header className="section-head">
          <h2 id="method">How it was built</h2>
          <p>
            A Python pipeline (pandas, scikit-learn) prepares the data. This site is built with Next.js and draws
            its charts as plain SVG. The original Streamlit dashboard is in the same repository.
          </p>
        </header>
        <ol className="steps">
          {steps.map((s) => (
            <li key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" aria-labelledby="caveats">
        <header className="section-head">
          <h2 id="caveats">Known limits</h2>
          <p>Things to keep in mind when reading the numbers.</p>
        </header>
        <ul className="caveats">
          <li>
            December 2011 only runs to the 9th, so it is shown as a partial month and left out of month-on-month
            growth.
          </li>
          <li>
            Cleaning removed cancellation lines but kept the original orders they reversed. Two very large orders
            that were cancelled straight away (about £245K) are still counted in revenue.
          </li>
          <li>
            Postage, manual adjustments and fees count towards revenue but are left out of the product rankings.
          </li>
          <li>RFM scores and clusters use each customer’s full history, whatever period is selected.</li>
        </ul>
        <p className="about-cta">
          <Link href="/">Open the dashboard</Link>
        </p>
      </section>
    </main>
  );
}
