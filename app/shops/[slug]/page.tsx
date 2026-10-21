import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getShop, getStory, getMessages, submissionsEnabled } from "@/lib/data";
import { Community } from "@/components/community";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const shop = await getShop((await params).slug); return { title: shop?.name || "가게를 찾을 수 없습니다" }; }
export default async function ShopPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ write?: string }> }) {
  const shop = await getShop((await params).slug); if (!shop) notFound();
  const initialKind = (await searchParams).write === "letter" ? "letter" : "review";
  const [story, reviews, letters] = await Promise.all([getStory(shop.id), getMessages(shop.id, "reviews"), getMessages(shop.id, "letters")]);
  return <main id="main" className="container page-content"><Link className="back-link" href="/shops">← 가게 둘러보기</Link><header className="detail-heading"><p className="eyebrow">{shop.region} · {shop.category}</p><h1>{shop.name}</h1><p>{shop.summary}</p>{shop.is_sample && <span className="sample-label">예시 가게 · 실제 영업 정보가 아닙니다</span>}</header>{!shop.is_sample && shop.image_url && <div className="detail-photo"><Image src={shop.image_url} alt={shop.image_alt || shop.name} fill priority unoptimized sizes="100vw"/></div>}<div className="detail-columns"><article id="story" className="story-body"><p className="eyebrow">THE STORY BEHIND</p><h2>{story?.title || "이야기를 준비하고 있어요"}</h2>{story && <><p className="story-lead">{story.introduction}</p>{story.body.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</>}</article><aside className="visit-info"><p className="eyebrow">PLAN YOUR VISIT</p><h3>찾아가는 길</h3><dl><dt>주소</dt><dd>{shop.address || "확인 중입니다"}</dd><dt>영업시간</dt><dd>{shop.hours || "방문 전 확인해주세요"}</dd><dt>대표 메뉴 · 상품</dt><dd>{shop.menu || "준비 중입니다"}</dd>{shop.phone && <><dt>연락처</dt><dd>{shop.phone}</dd></>}</dl>{!shop.is_sample && shop.address && <a className="button primary" href={`https://map.kakao.com/link/search/${encodeURIComponent(shop.address + " " + shop.name)}`} target="_blank" rel="noopener noreferrer">지도에서 보기 ↗</a>}{shop.checked_at && <small>정보 확인일 {shop.checked_at}</small>}<a className="text-link" href="#community">후기와 편지 남기기 ↓</a></aside></div><Community initialKind={initialKind} shopId={shop.id} shopName={shop.name} reviews={reviews} letters={letters} enabled={submissionsEnabled()} sample={shop.is_sample}/></main>;
}

