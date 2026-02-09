import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Otim Vault Actions",
  description: "Deposit and withdraw from yield vaults using Otim",
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
