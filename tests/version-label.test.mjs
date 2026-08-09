import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("o rodapé público identifica o Site como v2", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /© Live Santa Maria · v2 ·/);
  assert.doesNotMatch(html, /v1\.0\.0-dev/);
});
