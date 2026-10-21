import { getShops } from "@/lib/data";
import { ShopGrid } from "@/components/shop-grid";
export const metadata = { title: "가게 둘러보기" };
export default async function ShopsPage() { const shops = await getShops(); return <main id="main" className="container page-content"><div className="page-intro"><p className="eyebrow">EXPLORE THE NEIGHBORHOOD</p><h1>우리 곁의 작은 가게들.</h1><p>한 번의 방문이, 새로운 이웃을 만나는 일이 될 수 있도록.</p>{shops.some(s => s.is_sample) && <span className="sample-label">미리보기 · 예시 표시가 있는 가게는 실제 등록 가게가 아닙니다</span>}</div><ShopGrid shops={shops}/></main>; }
