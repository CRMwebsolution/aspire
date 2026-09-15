import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mobile Auto Detailing in Eastern NC | Aspire",
  description: "Certified mobile detailing for cars, trucks, SUVs, boats, side-by-sides and RVs across Carteret, Onslow and Craven counties.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
