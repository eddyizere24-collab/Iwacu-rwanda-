import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IWACU RWANDA",
  description:
    "Menya aho uri n'abayobozi bawe mu Rwanda ukoresheje GPS — nta konti, nta amateka y'aho wagiye.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="rw">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
