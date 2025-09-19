import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700', '800']
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700', '800']
});

export const metadata: Metadata = {
  title: "MedHubb - La tua salute, gestita con cura",
  description: "MedHubb è la piattaforma digitale che connette medici e pazienti, rendendo l'assistenza sanitaria più accessibile, efficiente e personalizzata.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${plusJakartaSans.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
