import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const font = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font" });

export const metadata: Metadata = {
  title: "Tixify — Platform Tiket & Manajemen Event Modern",
  description: "Beli tiket cepat via aplikasi mobile Tixify dan kelola acara secara profesional melalui Portal Admin.",
 icons: {
    icon: [
      { url: "/favicon.ico", type: "image/ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/icon.png",
  },
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={font.variable}>
      <body>{children}</body>
    </html>
  );
}
