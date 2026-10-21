import Link from "next/link";
import Image from "next/image";
import { isDemo } from "@/lib/data";
export function Header() {
  return <header className="site-header"><Link href="/" className="brand" aria-label="Roots and Routes 홈"><Image src="/images/logo.png" alt="Roots and Routes" width={92} height={92} priority/><span className="brand-caption">다른 뿌리,<br/>함께 걷는 길.</span></Link><nav aria-label="주 메뉴"><Link href="/shops">가게 둘러보기</Link><Link href="/stories">이야기</Link><Link href="/about">단체 소개</Link></nav><a className="header-social" href="https://www.instagram.com/rootsandrouteskorea/" target="_blank" rel="noopener noreferrer">Instagram ↗</a></header>;
}
export function Footer() {
  return <footer className="site-footer"><div className="container footer-top"><Link href="/" className="footer-brand">Roots <span>&</span> Routes<small>다른 뿌리, 함께 걷는 길</small></Link><p>누군가의 고향이<br/>우리 동네의 이야기가 됩니다.</p><div><Link href="/shops">가게 둘러보기</Link><Link href="/about">단체 소개</Link><a href="https://www.instagram.com/rootsandrouteskorea/" target="_blank" rel="noopener noreferrer">Instagram ↗</a></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Roots & Routes</span><span>WE RECORD STORIES. YOUR VOICE REMAINS.</span></div>{isDemo() && <p className="demo-note">미리보기 · 가게명, 사진, 이야기는 구성 확인을 위한 예시이며 실제 등록 가게가 아닙니다.</p>}</footer>;
}
