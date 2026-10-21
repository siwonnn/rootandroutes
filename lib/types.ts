export type Shop = { id: string; slug: string; name: string; category: string; region: string; summary: string; image_url: string; image_alt: string; address: string; hours: string; phone: string; menu: string; checked_at: string | null; status: string; is_sample: boolean; };
export type Story = { id: string; shop_id: string; title: string; introduction: string; body: string; status: string; };
export type Message = { id: string; nickname: string; body: string; created_at: string; };
