const RATING = Object.freeze({
  excellent: { icon: "🟢", label: "Muito bom", tone: "excellent" },
  good: { icon: "🟢", label: "Bom", tone: "good" },
  moderate: { icon: "🟡", label: "Razoável", tone: "moderate" },
  exposed: { icon: "🟠", label: "Exposto", tone: "exposed" },
  very_exposed: { icon: "🔴", label: "Muito exposto", tone: "very_exposed" }
});

export const DEFAULT_BATHING_SEASON = Object.freeze({
  start: "2026-06-01", end: "2026-09-30", timezone: "Atlantic/Azores"
});

export function ratingPresentation(rating) {
  return RATING[rating] ? { ...RATING[rating] } : { icon: "🟡", label: "Razoável", tone: "moderate" };
}

function localCalendarDate(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isBathingSeason(now = new Date(), season = DEFAULT_BATHING_SEASON) {
  const date = localCalendarDate(now, season.timezone || "Atlantic/Azores");
  return date >= season.start && date <= season.end;
}

function text(parent, selector, value) {
  const node = parent.querySelector(selector);
  if (node) node.textContent = value;
}

function formatNumber(value, suffix, digits = 0) {
  return Number.isFinite(value) ? `${value.toLocaleString("pt-PT", { maximumFractionDigits: digits })}${suffix}` : "—";
}

function renderUnavailable(root) {
  root.hidden = false;
  root.classList.add("is-unavailable");
  const status = root.querySelector(".marine-module__status");
  if (status) status.textContent = "Recomendações temporariamente indisponíveis.";
}

export function activateMarineRecommendationsAnchor({
  windowRef = window,
  documentRef = document,
  updateHistory = false
} = {}) {
  if (!updateHistory && windowRef.location?.hash !== "#marine-recommendations") return false;
  const target = documentRef.getElementById("marine-recommendations");
  if (!target) return false;
  if (updateHistory) windowRef.history.pushState({}, "", "?section=forecast#marine-recommendations");
  windowRef.setSection?.("forecast");
  windowRef.requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
  return true;
}

export function marineCameraHref(cameraId) {
  const encodedId = encodeURIComponent(String(cameraId));
  return `?section=cameras&camera=${encodedId}#camera-${encodedId}`;
}

export function activateCameraDeepLink({ windowRef = window, documentRef = document } = {}) {
  const params = new URLSearchParams(windowRef.location?.search || "");
  const cameraId = params.get("camera");
  if (!cameraId) return false;
  windowRef.setSection?.("cameras");
  windowRef.requestAnimationFrame(() => {
    const target = documentRef.getElementById(`camera-${cameraId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    windowRef.history.replaceState({}, "", `${windowRef.location.pathname}${windowRef.location.search}`);
  });
  return true;
}

export function renderMarineRecommendations(payload, { documentRef = document, now = new Date() } = {}) {
  const teaser = documentRef.querySelector("#marineTeaser");
  const root = documentRef.querySelector("#marine-recommendations");
  if (!root || !teaser) return;
  if (!payload || ["expired", "unavailable"].includes(payload.dataStatus) || !Array.isArray(payload.locations)) {
    teaser.hidden = !isBathingSeason(now);
    text(teaser, ".marine-teaser__context", "RecomendaÃ§Ãµes temporariamente indisponÃ­veis. â†’");
    renderUnavailable(root);
    return;
  }
  root.hidden = false;
  root.classList.remove("is-unavailable");
  const stale = payload.dataStatus === "stale";
  text(root, ".marine-module__status", stale ? "Dados menos recentes" : "Onde está melhor o mar?");
  text(root, ".marine-module__context", `${payload.context.waveDirectionLabel || "—"} · ${formatNumber(payload.context.waveHeightM, " m", 1)} · Água ${formatNumber(payload.context.seaTemperatureC, " °C")}`);

  teaser.hidden = !isBathingSeason(now, payload.season || DEFAULT_BATHING_SEASON);
  text(teaser, ".marine-teaser__context", `Água ${formatNumber(payload.context.seaTemperatureC, " °C")} · ${payload.context.waveDirectionLabel || "—"} · ${formatNumber(payload.context.waveHeightM, " m", 1)} →`);

  const locationsHost = root.querySelector("#marineLocations");
  const detail = root.querySelector("#marineLocationDetail");
  locationsHost.replaceChildren();
  let selectedId = payload.locations[0]?.id;

  const renderDetail = () => {
    const location = payload.locations.find((item) => item.id === selectedId);
    if (!location) return;
    const presentation = ratingPresentation(location.rating);
    detail.replaceChildren();
    const heading = documentRef.createElement("strong");
    heading.textContent = `${presentation.icon} ${location.name} · ${presentation.label}`;
    const message = documentRef.createElement("span");
    message.textContent = location.message;
    const conditions = documentRef.createElement("span");
    conditions.textContent = `Ondulação ${payload.context.waveDirectionLabel || "—"} · ${formatNumber(payload.conditions.swellHeightM, " m", 1)} · ${formatNumber(payload.conditions.swellPeriodS, " s")} · vento ${formatNumber(payload.conditions.windSpeedKmh, " km/h")}`;
    const camera = documentRef.createElement("a");
    camera.href = marineCameraHref(location.cameraId);
    camera.textContent = "Ver câmara";
    detail.append(heading, message, conditions, camera);
  };

  for (const location of payload.locations) {
    const presentation = ratingPresentation(location.rating);
    const button = documentRef.createElement("button");
    button.type = "button";
    button.className = `marine-location marine-location--${presentation.tone}`;
    button.setAttribute("aria-pressed", String(location.id === selectedId));
    const title = documentRef.createElement("strong");
    title.textContent = `${presentation.icon} ${location.name}`;
    const label = documentRef.createElement("span");
    label.textContent = presentation.label;
    const reason = documentRef.createElement("small");
    reason.textContent = location.message;
    button.append(title, label, reason);
    button.addEventListener("click", () => {
      selectedId = location.id;
      locationsHost.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      renderDetail();
    });
    locationsHost.append(button);
  }
  renderDetail();
}

export async function initializeMarineRecommendations({ fetchImpl = fetch, documentRef = document } = {}) {
  activateCameraDeepLink({ documentRef });
  const teaser = documentRef.querySelector("#marineTeaser");
  teaser?.addEventListener("click", event => {
    event.preventDefault();
    activateMarineRecommendationsAnchor({ documentRef, updateHistory: true });
  });
  try {
    const response = await fetchImpl("/api/marine-recommendations", { cache: "no-store" });
    if (!response.ok) throw new Error("unavailable");
    renderMarineRecommendations(await response.json(), { documentRef });
  } catch {
    renderMarineRecommendations({ dataStatus: "unavailable" }, { documentRef });
  }
  activateMarineRecommendationsAnchor({ documentRef });
}

if (typeof document !== "undefined") void initializeMarineRecommendations();
