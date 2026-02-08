import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Otim Vault Actions",
  description: "Deposit, withdraw, and migrate between yield vaults using Otim",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
