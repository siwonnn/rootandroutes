import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAdminInput } from "../lib/admin-validation.ts";
const shop = { name: "가게", slug: "test-shop", category: "카페", region: "안산", status: "draft" };
const story = { shop_id: "11111111-1111-4111-8111-111111111111", title: "이야기", body: "본문", status: "published" };
test("shop fields normalized and extra fields excluded", () => {
  const r = validateAdminInput("save_shop", { ...shop, name: " 가게 ", created_at: "fake", is_sample: "true" });
  assert.ok("data" in r); assert.equal(r.data.name, "가게"); assert.equal(r.data.is_sample, false); assert.equal("created_at" in r.data, false);
});
test("reject unsafe image URLs, missing alt, invalid dates and unauthorized actions", () => {
  for (const bad of [{ slug: "../admin" }, { image_url: "javascript:alert(1)" }, { image_url: "https://example.com/a.png" }, { checked_at: "2026-02-30" }, { status: "deleted" }, { name: " " }, { id: "bad" }, { summary: "x".repeat(501) }]) assert.ok("error" in validateAdminInput("save_shop", { ...shop, ...bad }));
  assert.ok("error" in validateAdminInput("delete_shop", shop));
});
test("story needs existing-format shop ID and body to publish, draft can be empty", () => {
  assert.ok("data" in validateAdminInput("save_story", story));
  assert.ok("error" in validateAdminInput("save_story", { ...story, body: " " }));
  assert.ok("error" in validateAdminInput("save_story", { ...story, shop_id: "bad" }));
  assert.ok("data" in validateAdminInput("save_story", { ...story, body: "", status: "draft" }));
});
