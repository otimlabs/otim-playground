import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OTIM Vault Actions",
  description: "Deposit, withdraw, and migrate between yield vaults using OTIM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
