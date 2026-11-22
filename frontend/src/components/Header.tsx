import Link from "next/link";
import type { ReactNode } from "react";

export default function Header({ title, subtitle }: { title: ReactNode; subtitle?: string }) {
  return (
    <header>
      <div className="wrap">
        <nav>
          <Link href="/">Tiketku</Link>
          <Link href="/admin/login">Admin</Link>
        </nav>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  );
}
