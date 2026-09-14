import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

void test("command ids stay unique and let Obsidian add the plugin prefix", () => {
  const source = fs.readFileSync("src/main.ts", "utf8");
  const ids = Array.from(source.matchAll(/addCommand\(\{[\s\S]*?\bid:\s*"([^"]+)"/g), (match) => match[1]);

  assert.ok(ids.length > 0, "Expected Veil to register at least one command.");
  assert.equal(new Set(ids).size, ids.length, "Command IDs must be unique.");
  for (const id of ids) {
    assert.doesNotMatch(id, /^veil(?:-|$)/, `Obsidian prefixes command IDs automatically: ${id}`);
  }
});
