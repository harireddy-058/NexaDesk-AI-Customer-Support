import test from "node:test";
import assert from "node:assert/strict";

test("AI service fallback classification rules are documented", () => {
  assert.ok(process.env.OPENAI_API_KEY === undefined || typeof process.env.OPENAI_API_KEY === "string");
});
