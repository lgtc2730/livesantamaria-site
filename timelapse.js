const TIMELAPSE_BASE_URL = "https://anjos-timelapse.livesantamaria.org";
const TIMELAPSE_INDEX_URL = `${TIMELAPSE_BASE_URL}/index.json`;

function timelapseUrl(path) {
  if (!path) return "";
  if (path === "#") return "#";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${TIMELAPSE_BASE_URL}${path}`;
}

console.log("LVSM Timelapse JS remoto activo:", TIMELAPSE_INDEX_URL);

let timelapseData = null;
let activeTimelapseCameraId = null;

function tlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTimelapseDate(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return `${weekdays[date.getDay()]} ${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]}`;
}

function formatTimelapseUpdated(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("pt-PT", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

async function loadTimelapseIndex() {
  const response = await fetch(`${TIMELAPSE_INDEX_URL}?t=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Erro ao carregar index.json: HTTP ${response.status}`);
  }

  return await response.json();
}

function renderTimelapseCameraSelector(cameras) {
  return `
    <div class="timelapse-camera-selector">
      ${cameras.map((cam, index) => `
        <button
          class="timelapse-camera-choice ${cam.id === activeTimelapseCameraId ? "active" : ""}"
          data-timelapse-camera="${tlEscape(cam.id)}"
          type="button"
        >
          <img src="${tlEscape(timelapseUrl(cam.currentThumb))}" alt="${tlEscape(cam.name)}">
          <span>${tlEscape(cam.name)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderTimelapseCamera(cam) {
  const dailyItems = cam.daily || [];
  const todayItems = cam.today || [];

  const updatedLabel = formatTimelapseUpdated(timelapseData?.updated);

  const previewDays = [...dailyItems];

  while (previewDays.length < 6) {
    previewDays.push({
      date: `2026-05-${String(30 - previewDays.length).padStart(2, "0")}`,
      thumb: timelapseUrl(cam.currentThumb),
      video: "#"
    });
  }

  return `
    <article class="timelapse-dashboard-card">

      <div class="timelapse-dashboard-main">

        <div class="timelapse-left-column">
          <section class="timelapse-live-panel">
            <h4>
              Agora
              ${updatedLabel ? `<span class="timelapse-updated">Actualizado ${tlEscape(updatedLabel)}</span>` : ""}
            </h4>
            <img src="${tlEscape(timelapseUrl(cam.currentThumb))}" alt="${tlEscape(cam.name)}">
          </section>

          <section class="timelapse-strip-panel">
            <h4>Evolução do dia</h4>

            <div class="timelapse-thumb-strip">
              ${todayItems.map(item => `
                <button
                  class="timelapse-thumb-item"
                  type="button"
                  data-timelapse-image="${tlEscape(timelapseUrl(item.thumb))}"
                  data-timelapse-title="${tlEscape(cam.name)} — ${tlEscape(item.hour)}"
                >
                  <img src="${tlEscape(timelapseUrl(item.thumb))}" alt="${tlEscape(item.hour)}">
                  <span>${tlEscape(item.hour)}</span>
                </button>
              `).join("")}
            </div>
          </section>
        </div>

        <div class="timelapse-right-column">
          <section class="timelapse-video-panel">
            <h4>Hoje</h4>

            <button
              class="timelapse-play-card"
              type="button"
              data-timelapse-video="${tlEscape(timelapseUrl(cam.latest?.dayVideo))}"
              data-timelapse-title="${tlEscape(cam.name)} — Timelapse diário"
            >
              <img src="${tlEscape(timelapseUrl(cam.latest?.dayThumb))}" alt="${tlEscape(cam.name)}">
              <span class="timelapse-play-icon">▶</span>
            </button>
          </section>

          <section class="timelapse-mini-days">
            <h4>Últimos dias</h4>

            <div class="timelapse-mini-days-grid">
              ${previewDays.slice(0, 6).map(item => `
                <button
                  class="timelapse-mini-day"
                  type="button"
                  data-timelapse-video="${tlEscape(timelapseUrl(item.video))}"
                  data-timelapse-title="${tlEscape(cam.name)} — ${tlEscape(formatTimelapseDate(item.date))}"
                >
                  <img src="${tlEscape(timelapseUrl(item.thumb))}" alt="${tlEscape(item.date)}">
                  <span>${tlEscape(formatTimelapseDate(item.date))}</span>
                </button>
              `).join("")}
            </div>
          </section>

          <section class="timelapse-weekly-panel">
            <h4>Semanal</h4>

            <button
              class="timelapse-play-card"
              type="button"
              data-timelapse-video="${tlEscape(timelapseUrl(cam.weekly?.video))}"
              data-timelapse-title="${tlEscape(cam.name)} — Timelapse semanal"
            >
              <img src="${tlEscape(timelapseUrl(cam.weekly?.thumb))}" alt="${tlEscape(cam.name)} semanal">
              <span class="timelapse-play-icon">▶</span>
            </button>
          </section>
        </div>

      </div>
    </article>
  `;
}

function renderTimelapseDashboard() {
  const grid = document.getElementById("timelapseGrid");
  if (!grid || !timelapseData?.cameras?.length) return;

  const cameras = timelapseData.cameras.filter(cam => cam.enabled !== false);
  if (!cameras.length) return;

  if (!activeTimelapseCameraId) {
    activeTimelapseCameraId = cameras[0].id;
  }

  const activeCam =
    cameras.find(cam => cam.id === activeTimelapseCameraId) ||
    cameras[0];

  grid.innerHTML = `
    ${renderTimelapseCameraSelector(cameras)}
    ${renderTimelapseCamera(activeCam)}
  `;

  grid.querySelectorAll("[data-timelapse-camera]").forEach(button => {
    button.addEventListener("click", () => {
      activeTimelapseCameraId = button.dataset.timelapseCamera;
      renderTimelapseDashboard();
    });
  });

  grid.querySelectorAll("[data-timelapse-video]").forEach(button => {
    button.addEventListener("click", () => {
      openTimelapseVideo(
        button.dataset.timelapseVideo,
        button.dataset.timelapseTitle
      );
    });
  });

  grid.querySelectorAll("[data-timelapse-image]").forEach(button => {
    button.addEventListener("click", () => {
      openTimelapseImage(
        button.dataset.timelapseImage,
        button.dataset.timelapseTitle
      );
    });
  });

}

function openTimelapseVideo(videoUrl, title) {
  if (!videoUrl || videoUrl === "#") return;

  const overlay = document.createElement("div");
  overlay.className = "timelapse-video-overlay";

  overlay.innerHTML = `
    <div class="timelapse-video-fullscreen">
      <button class="timelapse-video-close" type="button" aria-label="Fechar">×</button>
      <video controls autoplay playsinline>
        <source src="${tlEscape(videoUrl)}" type="video/mp4">
      </video>
      <div class="timelapse-video-title">${tlEscape(title || "Timelapse")}</div>
    </div>
  `;

  overlay.querySelector(".timelapse-video-close")?.addEventListener("click", () => {
    overlay.remove();
  });

  overlay.addEventListener("click", event => {
    if (event.target === overlay) overlay.remove();
  });

  document.addEventListener("keydown", function escHandler(event) {
    if (event.key !== "Escape") return;
    overlay.remove();
    document.removeEventListener("keydown", escHandler);
  });

  document.body.appendChild(overlay);

  const video = overlay.querySelector("video");
  video?.play?.().catch(() => {});
}

function openTimelapseImage(imageUrl, title) {
  if (!imageUrl) return;

  const overlay = document.createElement("div");
  overlay.className = "timelapse-video-overlay";

  overlay.innerHTML = `
    <div class="timelapse-video-fullscreen">
      <button class="timelapse-video-close" type="button" aria-label="Fechar">×</button>
      <img
        src="${tlEscape(imageUrl)}"
        alt="${tlEscape(title || "Imagem timelapse")}"
        class="timelapse-full-image"
      >
      <div class="timelapse-video-title">${tlEscape(title || "Imagem timelapse")}</div>
    </div>
  `;

  overlay.querySelector(".timelapse-video-close")?.addEventListener("click", () => {
    overlay.remove();
  });

  overlay.addEventListener("click", event => {
    if (event.target === overlay) overlay.remove();
  });

  document.addEventListener("keydown", function escHandler(event) {
    if (event.key !== "Escape") return;
    overlay.remove();
    document.removeEventListener("keydown", escHandler);
  });

  document.body.appendChild(overlay);
}

async function initTimelapseDashboard() {
  const grid = document.getElementById("timelapseGrid");
  if (!grid) return;

  try {
    timelapseData = await loadTimelapseIndex();
    renderTimelapseDashboard();
  } catch (err) {
    console.warn("Erro Timelapse:", err);
    grid.innerHTML = `
      <div class="timelapse-card">
        <div class="timelapse-info">
          <h3>Timelapse indisponível</h3>
          <p>Não foi possível carregar o índice de timelapse.</p>
        </div>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", initTimelapseDashboard);