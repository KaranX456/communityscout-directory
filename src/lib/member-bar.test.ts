import { strict as assert } from "node:assert";
import { test } from "node:test";
import { memberBarPercent } from "./member-bar";
test("relative member bars use the requested logarithmic scale with an eight percent minimum", () => {
  assert.equal(memberBarPercent(0, 10000), 8);
  assert.equal(memberBarPercent(10000, 10000), 100);
  assert.equal(memberBarPercent(100, 10000), 100 * Math.log1p(100) / Math.log1p(10000));
});
