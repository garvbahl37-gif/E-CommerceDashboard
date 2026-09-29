import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { Masthead } from "@/components/Masthead";
import "./globals.css";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Order Book: E-Commerce Sales Intelligence",
    template: "%s | Order Book",
  },
  description:
    "Interactive sales dashboard for 36,969 orders from a UK online giftware wholesaler (UCI Online Retail II, Dec 2009 to Dec 2011): revenue trends, RFM segments, cohort retention, K-Means clusters, products and markets.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1421" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={schibsted.variable}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Masthead />
        {children}
        <footer className="footer">
          <div className="wrap">
            Data: UCI Online Retail II, a UK-based online retailer of giftware selling mostly to wholesalers.
            Built by Garv Bahl.{" "}
            <a href="https://github.com/garvbahl37-gif/E-CommerceDashboard">Source on GitHub</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
