"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Shop } from "@/lib/types";
import { Arrow } from "./marks";
export function ShopGrid({ shops, compact = false }: { shops: Shop[]; compact?: boolean }) {
  const [category, setCategory] = useState("전체"), [query, setQuery] = useState(""), [region, setRegion] = useState("전체 지역");
  const regions = [...new Set(shops.map(s => s.region))];
  const categories = ["전체", ...new Set(["음식점", "카페", "상점", ...shops.map(s => s.category)])];
  const filtered = shops.filter(s => (category === "전체" || s.category === category) && (region === "전체 지역" || s.region === region) && `${s.name} ${s.summary} ${s.region}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <><div className="shop-tools"><div className="filters" aria-label="가게 업종">{categories.map(c => <button key={c} type="button" aria-pressed={category === c} className={category === c ? "filter active" : "filter"} onClick={() => setCategory(c)}>{c}</button>)}</div>{!compact && <div className="search-tools"><label className="sr-only" htmlFor="region">지역</label><select id="region" value={region} onChange={e => setRegion(e.target.value)}><option>전체 지역</option>{regions.map(r => <option key={r}>{r}</option>)}</select><label className="sr-only" htmlFor="search">가게 검색</label><input id="search" type="search" placeholder="어떤 가게를 찾으세요?" value={query} onChange={e => setQuery(e.target.value)}/></div>}</div>
    <div className="shop-grid">{(compact ? filtered.slice(0, 3) : filtered).map((shop, i) => <Link className="shop-card" href={`/shops/${shop.slug}`} key={shop.id}>{!shop.is_sample && shop.image_url ? <div className="shop-card-photo"><Image src={shop.image_url} alt={shop.image_alt || shop.name} fill sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw" unoptimized/></div> : null}<div className="shop-card-category">{shop.category}{shop.is_sample ? " · 예시" : ""}</div><div className="shop-card-meta"><span>{shop.region}</span><span>0{i + 1}</span></div><div className="shop-card-title"><h3>{shop.name}</h3><Arrow/></div><p>{shop.summary}</p></Link>)}</div>
    {filtered.length === 0 && <div className="empty-state" role="status"><h3>{shops.length ? "찾으시는 가게가 아직 없어요." : "첫 번째 이웃의 이야기를 준비하고 있어요."}</h3><p>{shops.length ? "다른 검색어나 업종으로 다시 찾아보세요." : "가게와 사장님의 이야기를 확인한 뒤 이곳에 소개할게요."}</p>{shops.length > 0 && <button className="button outline" onClick={() => { setQuery(""); setCategory("전체"); setRegion("전체 지역"); }}>검색 초기화</button>}</div>}
  </>;
}
