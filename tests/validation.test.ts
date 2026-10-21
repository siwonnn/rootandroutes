import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSubmission } from "../lib/validation.ts";
const valid = { kind: "review", shopId: "11111111-1111-4111-8111-111111111111", nickname: "이웃", body: "따뜻한 음식이 기억에 남아요.", consent: true, website: "" };
test("valid submission is normalized, never accepts moderation fields", () => { const result = validateSubmission({ ...valid, nickname: " 이웃 ", body: " 따뜻한 음식이 기억에 남아요. ", status: "approved" }); assert.ok("value" in result); assert.equal(result.value.nickname, "이웃"); assert.equal(result.value.body, valid.body); assert.equal("status" in result.value, false); });
test("rejects malformed, empty, oversized, and non-consenting submissions", () => { for (const input of [null, [], {}, { ...valid, kind: "admin" }, { ...valid, shopId: "bad" }, { ...valid, nickname: " " }, { ...valid, nickname: "a".repeat(21) }, { ...valid, body: " " }, { ...valid, body: "a".repeat(2001) }, { ...valid, consent: "true" }, { ...valid, website: "spam" }]) assert.ok("error" in validateSubmission(input)); });

test("obsolete visit dates are not forwarded", () => { const result = validateSubmission({ ...valid, visitedOn: "2999-01-01" }); assert.ok("value" in result); assert.equal("visitedOn" in result.value, false); });
