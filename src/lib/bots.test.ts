import { strict as assert } from "node:assert";
import { test } from "node:test";
import { botBrowseArgs, validateBotSearch } from "./bots";

test("bots browse empty searches with 24 rows and no adult results", () => {
  assert.deepEqual(botBrowseArgs(validateBotSearch({})), { p_q: null, p_category: null, p_show_adult: false, p_limit: 24, p_offset: 0 });
});
test("bot search, category and page round-trip into the paged RPC", () => {
  assert.deepEqual(botBrowseArgs(validateBotSearch({ q: " music ", category: " tools ", page: "3" })), { p_q: "music", p_category: "tools", p_show_adult: false, p_limit: 24, p_offset: 48 });
});
test("invalid bot pages reset to page one", () => {
  for (const page of [-1, 0, 1.5, "bad"]) assert.equal(validateBotSearch({ page }).page, 1);
});