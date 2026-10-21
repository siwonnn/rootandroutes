import type { Metadata } from "next";
import { Header, Footer } from "@/components/site-shell";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Roots & Routes — 우리 곁의 가게와 이야기", template: "%s | Roots & Routes" }, description: "다른 뿌리, 함께 걷는 길. 한국에 이주한 이웃의 가게와 이야기를 만나고 마음을 전해보세요.", icons: { icon: "/images/logo.png", apple: "/images/logo.png" } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body><a className="skip-link" href="#main">본문으로 바로가기</a><Header/>{children}<Footer/></body></html>;
}
