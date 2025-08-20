let charts = {};

function fmtTs(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function chip(elem, on) {
  elem.classList.toggle("on", !!on);
}

async function loadConfig() {
  const res = await fetch("/api/config");
  const cfg = await res.json();
  const form = document.getElementById("setpoints-form");
  form.temperature.value = cfg.setpoints.temperature;
  form.humidity.value = cfg.setpoints.humidity;
  form.luminosity.value = cfg.setpoints.luminosity;
  document.getElementById("auto-toggle").checked = cfg.auto_mode;
  document.getElementById("manual-controls").classList.toggle("hidden", cfg.auto_mode);
}

async function loadLatest() {
  const res = await fetch("/api/latest");
  const j = await res.json();
  document.getElementById("t-val").textContent = j.temperature.toFixed(2);
  document.getElementById("h-val").textContent = j.humidity.toFixed(2);
  document.getElementById("l-val").textContent = Math.round(j.luminosity);
  document.getElementById("eC-val").textContent = j.energy_consumed.toFixed(1);
  document.getElementById("eP-val").textContent = j.energy_produced.toFixed(1);
  document.getElementById("w-val").textContent = j.water_consumed.toFixed(3);
  document.getElementById("ts").textContent = fmtTs(j.timestamp);

  chip(document.getElementById("chip-heater"), j.actuators.heater);
  chip(document.getElementById("chip-fan"), j.actuators.fan);
  chip(document.getElementById("chip-pump"), j.actuators.pump);
  chip(document.getElementById("chip-light"), j.actuators.light);
}

async function loadHistory() {
  const hours = parseFloat(document.getElementById("hours").value || "12");
  const res = await fetch(`/api/history?hours=${hours}`);
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    clearAllCharts();
    return;
  }

  // Labels en TEXTE (compatibles axe category)
  const labels = data.map(p => fmtTs(p.t));

  const sets = {
    temperature: data.map(p => p.temperature),
    humidity: data.map(p => p.humidity),
    luminosity: data.map(p => p.luminosity),
    energy_consumed: data.map(p => p.energy_consumed),
    energy_produced: data.map(p => p.energy_produced),
    water_consumed: data.map(p => p.water_consumed),
  };

  renderLine("chart-temp", labels, [{ label: "Température (°C)", data: sets.temperature }]);
  renderLine("chart-humi", labels, [{ label: "Humidité (%)", data: sets.humidity }]);
  renderLine("chart-lux", labels, [{ label: "Luminosité (lx)", data: sets.luminosity }]);
  renderLine("chart-energy", labels, [
    { label: "Énergie consommée (Wh)", data: sets.energy_consumed },
    { label: "Énergie produite (Wh)", data: sets.energy_produced }
  ]);
  renderLine("chart-water", labels, [{ label: "Eau consommée (L)", data: sets.water_consumed }]);
}

function clearAllCharts() {
  ["chart-temp","chart-humi","chart-lux","chart-energy","chart-water"].forEach(id => {
    if (charts[id]) { charts[id].destroy(); charts[id] = null; }
    const c = document.getElementById(id);
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
  });
}

// === Patch anti-"flash puis blanc": taille explicite + responsive:false
function renderLine(id, labels, datasets) {
  const canvas = document.getElementById(id);
  const parent = canvas.parentElement;

  // Fixer taille bitmap pour éviter width/height = 0 après reflow
  const w = Math.max(320, parent.clientWidth || 800);
  const h = 180; // hauteur désirée
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (charts[id]) charts[id].destroy();

  charts[id] = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: false,     // très important pour éviter un recalcul à 0px
      animation: false,      // (optionnel) supprime micro-anim
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "top" } },
      scales: {
        x: { type: "category", ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
        y: { beginAtZero: false }
      },
      spanGaps: true
    }
  });
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
}

function bindControls() {
  document.getElementById("setpoints-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await postJSON("/api/setpoints", {
        temperature: parseFloat(f.temperature.value),
        humidity: parseFloat(f.humidity.value),
        luminosity: parseFloat(f.luminosity.value),
      });
      showMsg("Consignes mises à jour ✅");
    } catch (err) {
      showMsg("Erreur: " + err.message, true);
    }
  });

  document.getElementById("auto-toggle").addEventListener("change", async (e) => {
    try {
      await postJSON("/api/mode", { auto: e.target.checked });
      document.getElementById("manual-controls").classList.toggle("hidden", e.target.checked);
      showMsg(e.target.checked ? "Mode auto activé" : "Mode manuel activé");
    } catch (err) {
      e.target.checked = !e.target.checked;
      showMsg("Erreur: " + err.message, true);
    }
  });

  document.querySelectorAll("#manual-controls button").forEach(btn => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.act;
      try {
        const payload = {};
        const isOn = !btn.classList.contains("on");
        payload[key] = isOn;
        await postJSON("/api/actuators", payload);
        btn.classList.toggle("on", isOn);
        showMsg("Actionneur mis à jour");
      } catch (err) {
        showMsg("Erreur: " + err.message, true);
      }
    });
  });

  document.getElementById("reload").addEventListener("click", loadHistory);
}

function showMsg(text, error = false) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = error ? "error" : "ok";
  setTimeout(() => { el.textContent = ""; el.className = ""; }, 3000);
}

async function tick() {
  try { await loadLatest(); } catch {}
}

// Recalcule la taille des canvas si la fenêtre change
window.addEventListener("resize", () => {
  loadHistory();
});

window.addEventListener("load", async () => {
  bindControls();
  await loadConfig();
  await loadLatest();
  await loadHistory();
  setInterval(tick, 3000);
});
