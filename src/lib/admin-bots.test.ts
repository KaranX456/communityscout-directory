import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DEFAULT_BOTS_FILTERS, botsListArgs, botsBulkArgs, botsSetArgs, canApplyToMatching } from "./admin-bots";

test("staff bot review defaults to held bots and fetches 50 per page", () => {
  assert.deepEqual(botsListArgs(DEFAULT_BOTS_FILTERS), { p_status: "blocked", p_limit: 50, p_offset: 0 });
  assert.equal(botsListArgs({ ...DEFAULT_BOTS_FILTERS, page: 2 }).p_offset, 100);
});
test("held reason filters pass the exact backend reason text", () => {
  for (const reason of ["airdrop", "human review", "staff"]) {
    assert.equal(botsListArgs({ ...DEFAULT_BOTS_FILTERS, reason }).p_reason, reason);
  }
  assert.equal(botsListArgs({ ...DEFAULT_BOTS_FILTERS, status: "active", reason: "airdrop" }).p_reason, undefined);
});
test("apply to all matching requires a search, category or reason", () => {
  assert.equal(canApplyToMatching(DEFAULT_BOTS_FILTERS), false);
  assert.throws(() => botsBulkArgs(DEFAULT_BOTS_FILTERS, "approve"));
  assert.throws(() => botsBulkArgs({ ...DEFAULT_BOTS_FILTERS, q: "   " }, "block"));
  for (const patch of [{ q: "music" }, { category: "tools" }, { reason: "staff" }]) {
    assert.equal(canApplyToMatching({ ...DEFAULT_BOTS_FILTERS, ...patch }), true);
  }
});
test("bulk approval sends matching filters with a 5000 row limit", () => {
  assert.deepEqual(botsBulkArgs({ ...DEFAULT_BOTS_FILTERS, q: " music ", category: "tools", reason: "human review", page: 3 }, "approve"), { p_status: "blocked", p_q: "music", p_category: "tools", p_reason: "human review", p_action: "approve", p_limit: 5000 });
});
test("selected bot actions accept at most 5000 IDs", () => {
  assert.throws(() => botsSetArgs([], "block"));
  assert.throws(() => botsSetArgs(Array.from({ length: 5001 }, (_, i) => String(i)), "block"));
  assert.equal(botsSetArgs(Array.from({ length: 5000 }, (_, i) => String(i)), "block").p_ids.length, 5000);
});
test("category updates require and send a category only for that action", () => {
  assert.throws(() => botsSetArgs(["bot-id"], "category"));
  assert.deepEqual(botsSetArgs(["bot-id"], "category", "education"), { p_ids: ["bot-id"], p_action: "category", p_category: "education" });
  assert.deepEqual(botsSetArgs(["bot-id"], "adult", "education"), { p_ids: ["bot-id"], p_action: "adult" });
});