import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "短视频创作 UI 原型",
  description: "AI 短视频创作应用的静态 UI 原型"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
