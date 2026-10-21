import Link from "next/link";
import { getShops } from "@/lib/data";
import { ShopGrid } from "@/components/shop-grid";
import { Arrow, RouteLine } from "@/components/marks";

export default async function Home() {
  const shops = await getShops();
  const featured = shops[0];
  return <main id="main">
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">다른 뿌리, 함께 걷는 길</p>
        <h1>가게의 문을 열면,<br/>한 사람의 이야기가<br/><span>시작됩니다.</span></h1>
        <p className="hero-description">저마다의 고향을 품고, 이곳에 뿌리내린 이웃들.<br className="desktop-break"/> 가게 너머의 삶과 다정한 이야기를 만나보세요.</p>
        <Link className="button primary" href="/shops">이웃의 가게 만나기 <Arrow/></Link>
        <div className="hero-signature"><RouteLine/><span>Every place has a story.</span></div>
      </div>
    </section>
    <section className="section container" id="shops"><div className="section-heading"><div><p className="eyebrow">PLACES & PEOPLE</p><h2>우리 곁의 작은 가게들</h2></div><Link className="text-link" href="/shops">모든 가게 보기 <Arrow/></Link></div><ShopGrid shops={shops} compact/></section>
    {featured && <section className="story-feature story-feature-text container"><div className="story-feature-copy"><p className="eyebrow">BEHIND THE COUNTER</p><h2>낯선 동네가<br/>우리 동네가 되기까지.</h2><p>어떤 마음으로 이곳에 오셨나요?<br/>가게 안에는 메뉴판에 다 담지 못한 이야기가 있습니다.</p><Link className="text-link" href={`/shops/${featured.slug}#story`}>사장님의 이야기 읽기 <Arrow/></Link></div></section>}
    <section className="letter-feature container"><div><p className="eyebrow">A LITTLE NOTE, A LONG WAY</p><h2>잘 읽었어요. 잘 먹었어요.<br/>그 마음을 전해보세요.</h2><p>방문한 날의 기억도, 이야기를 읽고 떠오른 마음도 좋아요.</p><Link className="button outline" href={featured ? `/shops/${featured.slug}?write=letter#community` : "/shops"}>이웃에게 편지 쓰기 <Arrow/></Link></div><div className="paper-note" aria-hidden="true"><span>Dear, 우리 동네 이웃에게</span><p>한 끼의 음식에서<br/>먼 곳의 이야기를 만났어요.<br/>당신의 오늘을 응원합니다.</p><span className="note-sign">마음을 담아, 이웃으로부터</span><small>편지 예시</small></div></section>
    <section className="about-preview container"><p className="eyebrow">ABOUT ROOTS & ROUTES</p><h2>뿌리는 달라도,<br className="mobile-break"/> 우리의 길은 만납니다.</h2><p>Roots & Routes는 한국에 이주한 이웃의 삶을 듣고 기록하는 학생 주도 단체입니다.<br/>가게와 음식, 일상 속 이야기를 통해 서로를 조금 더 가까이 알아갑니다.</p><Link className="text-link" href="/about">단체 알아보기 <Arrow/></Link></section>
  </main>;
}
