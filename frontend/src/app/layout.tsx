import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Coffee Craft - 咖啡手沖計時器 & 統計儀表板",
  description: "一個極具質感的手沖咖啡計時器與統計儀表板，助您記錄、分析並精進每一次沖煮風味。",
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  return (
    <html lang="zh-TW" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0f0b09] text-[#f4eae0]">
        {children}
      </body>
    </html>
  );
}
