import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../timelapse.js", import.meta.url), "utf8");

function loadTimelapse(fetch) {
  const context = {
    console: { log() {}, warn() {} },
    Date,
    document: { addEventListener() {} },
    fetch
  };

  vm.runInNewContext(
    `${source}\nglobalThis.timelapseTestApi = { TIMELAPSE_SOURCES, loadTimelapseIndex };`,
    context
  );

  return context.timelapseTestApi;
}

test("loads the configured Anjos and Malbusca timelapse sources", () => {
  const { TIMELAPSE_SOURCES } = loadTimelapse(async () => {
    throw new Error("fetch is not expected in this test");
  });

  assert.deepEqual(JSON.parse(JSON.stringify(TIMELAPSE_SOURCES)), [
    {
      id: "anjos-porto",
      baseUrl: "https://anjos-timelapse.livesantamaria.org"
    },
    {
      id: "malbusca-sunset",
      baseUrl: "https://malbusca-sunset-timelapse.livesantamaria.org"
    }
  ]);
});

test("keeps cameras from a healthy source when another source fails", async () => {
  const { loadTimelapseIndex } = loadTimelapse(async url => {
    if (url.startsWith("https://anjos-timelapse.livesantamaria.org/")) {
      throw new Error("Anjos unavailable");
    }

    return {
      ok: true,
      async json() {
        return {
          updated: "2026-08-12T10:30:45+00:00",
          cameras: [
            {
              id: "malbusca-sunset",
              name: "Malbusca Sunset",
              enabled: true,
              currentThumb: "/thumbs/current.jpg"
            }
          ]
        };
      }
    };
  });

  const result = await loadTimelapseIndex();
  const cameras = JSON.parse(JSON.stringify(result.cameras));

  assert.equal(cameras.length, 1);
  assert.deepEqual(cameras[0], {
    id: "malbusca-sunset",
    name: "Malbusca Sunset",
    enabled: true,
    currentThumb: "/thumbs/current.jpg",
    sourceId: "malbusca-sunset",
    baseUrl: "https://malbusca-sunset-timelapse.livesantamaria.org",
    indexUpdated: "2026-08-12T10:30:45+00:00"
  });
});
