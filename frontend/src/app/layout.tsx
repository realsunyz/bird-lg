import type { Metadata } from "next";
import { Lato, Noto_Sans } from "next/font/google";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
});

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
});

export const metadata: Metadata = {
  title: "BIRD Looking Glass",
  description: "Web-based BIRD routing daemon looking glass",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lato.variable} ${notoSans.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
