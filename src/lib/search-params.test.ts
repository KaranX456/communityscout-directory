import { strict as assert } from "node:assert";
import { test } from "node:test";
import { validateSearchState, withSearchSort } from "./search-params";

test("default sorting omits sort from search requests", () => {
  assert.equal(validateSearchState({}).sort, undefined);
  assert.deepEqual(withSearchSort({ q: "test", sort: undefined }), { q: "test" });
});
test("best text match keeps relevance in URL state and search requests", () => {
  assert.equal(validateSearchState({ sort: "relevance" }).sort, "relevance");
  assert.deepEqual(withSearchSort({ q: "test", sort: "relevance" }), { q: "test", sort: "relevance" });
});
test("legacy members sorting normalizes to the default", () => {
  assert.equal(validateSearchState({ sort: "members" }).sort, undefined);
  assert.deepEqual(withSearchSort({ q: "test", sort: "members" }), { q: "test" });
});
test("sort normalization preserves every other search parameter", () => {
  const state = { q: "test", min: 100, kind: "group", cat: "technology", lang: "en", country: "ke", adult: true };
  assert.deepEqual(validateSearchState({ ...state, sort: "relevance" }), { ...state, sort: "relevance" });
});
