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
  const labels = data.map(p => new Date(p.t));

  const sets = {
    temperature: data.map(p => p.temperature),
    humidity: data.map(p => p.humidity),
    luminosity: data.map(p => p.luminosity),
    energy_consumed: data.map(p => p.energy_consumed),
    energy_produced: data.map(p => p.energy_produced),
    water_consumed: data.map(p => p.water_consumed),
  };

  renderLine("chart-temp", labels, [{label: "Température (°C)", data: sets.temperature}]);
  renderLine("chart-humi", labels, [{label: "Humidité (%)", data: sets.humidity}]);
  renderLine("chart-lux", labels, [{label: "Luminosité (lx)", data: sets.luminosity}]);
  renderLine("chart-energy", labels, [
    {label: "Énergie consommée (Wh)", data: sets.energy_consumed},
    {label: "Énergie produite (Wh)", data: sets.energy_produced}
  ]);
  renderLine("chart-water", labels, [{label: "Eau consommée (L)", data: sets.water_consumed}]);
}

function renderLine(id, labels, datasets) {
  const ctx = document.getElementById(id).getContext("2d");
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "top" } },
      scales: {
        x: { type: "time", time: { unit: "minute" } },
        y: { beginAtZero: false }
      }
    }
  });
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
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

function showMsg(text, error=false) {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = error ? "error" : "ok";
  setTimeout(() => { el.textContent = ""; el.className=""; }, 3000);
}

async function tick() {
  try {
    await loadLatest();
  } catch {}
}

window.addEventListener("load", async () => {
  bindControls();
  await loadConfig();
  await loadLatest();
  await loadHistory();
  setInterval(tick, 3000);
});
