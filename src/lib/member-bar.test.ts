import { expect, test } from "bun:test";
import { memberBarPercent } from "./member-bar";
test("relative member bars use the requested logarithmic scale with an eight percent minimum", () => {
  expect(memberBarPercent(0, 10000)).toBe(8);
  expect(memberBarPercent(10000, 10000)).toBe(100);
  expect(memberBarPercent(100, 10000)).toBeCloseTo(100 * Math.log1p(100) / Math.log1p(10000));
});
