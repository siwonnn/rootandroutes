import { adminCall, adminConfigured, sessionHash, type AdminResult } from "@/lib/admin";
import { AdminLogin } from "@/components/admin/login";
import { AdminDashboard } from "@/components/admin/dashboard";
export const metadata = { title: "관리자", robots: { index: false, follow: false } };
export default async function AdminPage() {
  const configured = adminConfigured();
  let result: AdminResult | undefined, failed = false;
  if (configured && await sessionHash()) {
    try { result = await adminCall("dashboard"); } catch { failed = true; }
  }
  if (failed) return <main id="main" className="container admin-page"><p role="alert">관리 데이터를 불러오지 못했습니다. 잠시 후 새로고침해주세요.</p></main>;
  if (result?.ok) return <main id="main" className="container admin-page"><AdminDashboard shops={result.shops || []} stories={result.stories || []}/></main>;
  return <main id="main" className="container admin-page"><AdminLogin configured={configured}/></main>;
}
