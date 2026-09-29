"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Masthead() {
  const path = usePathname();
  return (
    <header className="masthead">
      <div className="wrap">
        <Link href="/" className="wordmark">
          <span className="wordmark-mark" aria-hidden="true" />
          Order Book
          <small>UK giftware wholesaler, 2009–2011</small>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            Dashboard
          </Link>
          <Link href="/about" aria-current={path === "/about" ? "page" : undefined}>
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
