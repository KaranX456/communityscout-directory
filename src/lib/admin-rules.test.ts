import { strict as assert } from "node:assert";
import { test } from "node:test";
import { storageState, canActivateBatch, feedbackCounts, REVIEW_PAGE_SIZE, REVIEW_BATCH_SIZE } from "./admin-rules";
test("storage turns amber at 70 percent", () => { assert.equal(storageState(349, 500).tone, "normal"); assert.equal(storageState(350, 500).tone, "attention"); });
test("storage turns red at 90 percent", () => { assert.equal(storageState(449, 500).tone, "attention"); assert.equal(storageState(450, 500).tone, "danger"); });
test("activation requires a specific source", () => { assert.equal(canActivateBatch("all", [true, true, true]), false); assert.equal(canActivateBatch("", [true, true, true]), false); assert.equal(canActivateBatch("atlas", [true, true, true]), true); });
test("activation requires all three checklist confirmations", () => { for (let i = 0; i < 3; i++) { const checks = [true, true, true]; checks[i] = false; assert.equal(canActivateBatch("atlas", checks), false); } assert.equal(canActivateBatch("atlas", [true, true]), false); });
test("feedback uses exact RPC keys and safely defaults missing values", () => { assert.deepEqual(feedbackCounts({ relevant: 2, not_relevant: 3, incorrect: 4, spam_scam: 5 }), { relevant: 2, not_relevant: 3, incorrect: 4, spam_scam: 5 }); assert.deepEqual(feedbackCounts(null), { relevant: 0, not_relevant: 0, incorrect: 0, spam_scam: 0 }); });
test("review paginates 50 and processes batches of 5000", () => { assert.equal(REVIEW_PAGE_SIZE, 50); assert.equal(REVIEW_BATCH_SIZE, 5000); });
