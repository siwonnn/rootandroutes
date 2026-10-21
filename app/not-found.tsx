import Link from "next/link";
export default function NotFound() { return <main id="main" className="container empty-state page-content"><p className="eyebrow">A LITTLE DETOUR</p><h1>아직 닿지 않은 길이에요.</h1><p>페이지가 없거나 아직 공개되지 않았습니다.</p><Link className="button primary" href="/shops">가게 둘러보기</Link></main>; }
