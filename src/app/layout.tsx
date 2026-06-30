import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leaf Chill Daily",
  description: "ระบบจัดการร้านอาหาร พนักงาน เวลาเข้างาน และค่าแรง"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
