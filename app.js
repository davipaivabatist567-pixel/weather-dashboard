(() => {
  "use strict";

  const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
  const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
  const DEFAULT_PLACE = { name: "São Paulo", admin1: "São Paulo", country: "Brasil", latitude: -23.5475, longitude: -46.6361 };

  // Códigos WMO -> descrição e ícones (dia / noite)
  const WEATHER = {
    0: ["Céu limpo", "☀️", "🌙"],
    1: ["Predominantemente limpo", "🌤️", "🌙"],
    2: ["Parcialmente nublado", "⛅", "☁️"],
    3: ["Nublado", "☁️", "☁️"],
    45: ["Neblina", "🌫️", "🌫️"],
    48: ["Neblina com geada", "🌫️", "🌫️"],
    51: ["Garoa fraca", "🌦️", "🌧️"],
    53: ["Garoa", "🌦️", "🌧️"],
    55: ["Garoa forte", "🌧️", "🌧️"],
    56: ["Garoa congelante", "🌧️", "🌧️"],
    57: ["Garoa congelante forte", "🌧️", "🌧️"],
    61: ["Chuva fraca", "🌦️", "🌧️"],
    63: ["Chuva", "🌧️", "🌧️"],
    65: ["Chuva forte", "🌧️", "🌧️"],
    66: ["Chuva congelante", "🌧️", "🌧️"],
    67: ["Chuva congelante forte", "🌧️", "🌧️"],
    71: ["Neve fraca", "🌨️", "🌨️"],
    73: ["Neve", "🌨️", "🌨️"],
    75: ["Neve forte", "❄️", "❄️"],
    77: ["Grãos de neve", "🌨️", "🌨️"],
    80: ["Pancadas de chuva fracas", "🌦️", "🌧️"],
    81: ["Pancadas de chuva", "🌧️", "🌧️"],
    82: ["Pancadas de chuva fortes", "⛈️", "⛈️"],
    85: ["Pancadas de neve", "🌨️", "🌨️"],
    86: ["Pancadas de neve fortes", "❄️", "❄️"],
    95: ["Trovoada", "⛈️", "⛈️"],
    96: ["Trovoada com granizo", "⛈️", "⛈️"],
    99: ["Trovoada com granizo forte", "⛈️", "⛈️"],
  };

  const $ = (id) => document.getElementById(id);
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* ignorado */ } },
  };

  const state = {
    unit: store.get("unit") === "F" ? "F" : "C",
    place: null,
    data: null,
  };

  // ---------- Utilidades ----------
  const weatherInfo = (code, isDay = 1) => {
    const w = WEATHER[code] || ["Desconhecido", "❔", "❔"];
    return { label: w[0], icon: isDay ? w[1] : w[2] };
  };
  const temp = (c) => {
    const v = state.unit === "F" ? c * 9 / 5 + 32 : c;
    return `${Math.round(v)}°`;
  };
  const windDir = (deg) => ["N", "NE", "L", "SE", "S", "SO", "O", "NO"][Math.round(deg / 45) % 8];
  const timeOf = (iso) => iso.slice(11, 16);
  const placeLabel = (p) => [p.name, p.admin1, p.country].filter((x, i, a) => x && a.indexOf(x) === i).join(", ");
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function setStatus(msg, isError = false) {
    const el = $("status");
    el.textContent = msg;
    el.classList.toggle("error", isError);
    el.hidden = !msg;
  }

  // ---------- API ----------
  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function searchCities(query) {
    const url = `${GEO_URL}?name=${encodeURIComponent(query)}&count=6&language=pt&format=json`;
    const json = await fetchJson(url);
    return json.results || [];
  }

  async function fetchForecast({ latitude, longitude }) {
    const params = new URLSearchParams({
      latitude, longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m",
      hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
      timezone: "auto",
      forecast_days: 7,
    });
    return fetchJson(`${FORECAST_URL}?${params}`);
  }

  // ---------- Renderização ----------
  function render() {
    const { data, place } = state;
    if (!data) return;
    const c = data.current;
    const d = data.daily;
    const info = weatherInfo(c.weather_code, c.is_day);

    $("place").textContent = placeLabel(place);
    $("updated").textContent = `Atualizado às ${timeOf(c.time)} (horário local)`;
    $("current-icon").textContent = info.icon;
    $("current-temp").textContent = temp(c.temperature_2m);
    $("current-desc").textContent = info.label;
    $("current-range").textContent = `Máx ${temp(d.temperature_2m_max[0])} · Mín ${temp(d.temperature_2m_min[0])}`;
    $("feels").textContent = temp(c.apparent_temperature);
    $("humidity").textContent = `${c.relative_humidity_2m}%`;
    $("wind").textContent = `${Math.round(c.wind_speed_10m)} km/h ${windDir(c.wind_direction_10m)}`;
    $("precip").textContent = `${c.precipitation} mm`;
    $("pressure").textContent = `${Math.round(c.surface_pressure)} hPa`;
    $("uv").textContent = d.uv_index_max[0] != null ? d.uv_index_max[0].toFixed(1) : "—";
    $("sunrise").textContent = timeOf(d.sunrise[0]);
    $("sunset").textContent = timeOf(d.sunset[0]);

    // Mostra as seções antes de desenhar, para o gráfico medir a largura real
    ["current", "hourly-section", "daily-section"].forEach((id) => { $(id).hidden = false; });
    renderHourly();
    renderDaily();
    $("unit-btn").textContent = `°${state.unit}`;
    document.title = `${temp(c.temperature_2m)} ${place.name} · Painel do Clima`;
  }

  function renderHourly() {
    const h = state.data.hourly;
    const now = state.data.current.time.slice(0, 13);
    let start = h.time.findIndex((t) => t.slice(0, 13) === now);
    if (start < 0) start = 0;
    const idx = Array.from({ length: 24 }, (_, i) => start + i).filter((i) => i < h.time.length);

    $("hourly").innerHTML = idx.map((i, n) => {
      const info = weatherInfo(h.weather_code[i], h.is_day[i]);
      const p = h.precipitation_probability[i];
      return `<div class="hour">
        <div class="t">${n === 0 ? "Agora" : timeOf(h.time[i])}</div>
        <div class="i" title="${info.label}">${info.icon}</div>
        <div class="v">${temp(h.temperature_2m[i])}</div>
        <div class="p">${p ? `💧${p}%` : ""}</div>
      </div>`;
    }).join("");

    renderChart(idx.map((i) => h.temperature_2m[i]));
  }

  function renderChart(values) {
    const svg = $("hourly-chart");
    const width = svg.clientWidth || 800;
    const height = 140;
    const pad = { top: 22, bottom: 10, x: 14 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const x = (i) => pad.x + (i * (width - pad.x * 2)) / (values.length - 1);
    const y = (v) => pad.top + (1 - (v - min) / span) * (height - pad.top - pad.bottom);

    const pts = values.map((v, i) => [x(i), y(v)]);
    const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
    const area = `${line} L${x(values.length - 1)},${height} L${x(0)},${height} Z`;
    const labels = pts
      .map(([px, py], i) => (i % 3 === 0 ? `<circle class="dot" cx="${px}" cy="${py}" r="3"/><text class="label" x="${px}" y="${py - 8}">${temp(values[i])}</text>` : ""))
      .join("");

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.innerHTML = `<path class="area" d="${area}"/><path class="line" d="${line}"/>${labels}`;
  }

  function renderDaily() {
    const d = state.data.daily;
    const lo = Math.min(...d.temperature_2m_min);
    const hi = Math.max(...d.temperature_2m_max);
    const span = hi - lo || 1;
    const fmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });

    $("daily").innerHTML = d.time.map((t, i) => {
      const info = weatherInfo(d.weather_code[i]);
      const name = i === 0 ? "Hoje" : fmt.format(new Date(`${t}T12:00:00Z`)).replace("-feira", "");
      const left = ((d.temperature_2m_min[i] - lo) / span) * 100;
      const w = ((d.temperature_2m_max[i] - d.temperature_2m_min[i]) / span) * 100;
      const p = d.precipitation_probability_max[i];
      return `<li class="day">
        <span class="name">${name}</span>
        <span class="icon" title="${info.label}">${info.icon}</span>
        <span class="rain">${p ? `💧${p}%` : ""}</span>
        <span class="range">
          <span class="lo">${temp(d.temperature_2m_min[i])}</span>
          <span class="bar"><span style="left:${left}%;width:${Math.max(w, 4)}%"></span></span>
          <span class="hi">${temp(d.temperature_2m_max[i])}</span>
        </span>
      </li>`;
    }).join("");
  }

  // ---------- Carregamento ----------
  async function loadPlace(place) {
    setStatus("Carregando previsão…");
    try {
      const data = await fetchForecast(place);
      state.place = place;
      state.data = data;
      store.set("place", JSON.stringify(place));
      setStatus("");
      render();
    } catch (err) {
      setStatus(`Não foi possível carregar o clima (${err.message}). Tente novamente.`, true);
    }
  }

  async function reverseName(lat, lon) {
    // Open-Meteo não tem geocodificação reversa; usamos o BigDataCloud (gratuito, sem chave).
    try {
      const json = await fetchJson(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`);
      return { name: json.city || json.locality || "Minha localização", admin1: json.principalSubdivision, country: json.countryName };
    } catch {
      return { name: "Minha localização" };
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setStatus("Geolocalização não suportada neste navegador.", true);
      return;
    }
    setStatus("Obtendo sua localização…");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        const names = await reverseName(latitude, longitude);
        loadPlace({ ...names, latitude, longitude });
      },
      () => {
        if (state.data) setStatus("");
        else setStatus("Permissão de localização negada. Busque uma cidade acima.", true);
        if (!state.data) loadPlace(DEFAULT_PLACE);
      },
      { timeout: 10000 }
    );
  }

  // ---------- Busca com sugestões ----------
  const input = $("search-input");
  const list = $("suggestions");
  let results = [];
  let active = -1;
  let timer;

  function showSuggestions(items) {
    results = items;
    active = -1;
    if (!items.length) {
      list.innerHTML = `<li aria-disabled="true"><small>Nenhuma cidade encontrada</small></li>`;
    } else {
      list.innerHTML = items.map((r, i) =>
        `<li role="option" data-i="${i}">${escapeHtml(r.name)} <small>${escapeHtml([r.admin1, r.country].filter(Boolean).join(", "))}</small></li>`
      ).join("");
    }
    list.hidden = false;
  }

  function hideSuggestions() { list.hidden = true; active = -1; }

  function choose(i) {
    const r = results[i];
    if (!r) return;
    hideSuggestions();
    input.value = "";
    input.blur();
    loadPlace({ name: r.name, admin1: r.admin1, country: r.country, latitude: r.latitude, longitude: r.longitude });
  }

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { hideSuggestions(); return; }
    timer = setTimeout(async () => {
      try { showSuggestions(await searchCities(q)); } catch { hideSuggestions(); }
    }, 300);
  });

  input.addEventListener("keydown", (e) => {
    if (list.hidden || !results.length) return;
    const items = list.querySelectorAll("li[data-i]");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((li, i) => li.classList.toggle("active", i === active));
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  });

  $("search-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!list.hidden && results.length) { choose(active >= 0 ? active : 0); return; }
    const q = input.value.trim();
    if (!q) return;
    try {
      const r = await searchCities(q);
      if (r.length) { results = r; choose(0); } else showSuggestions([]);
    } catch { setStatus("Erro ao buscar cidade.", true); }
  });

  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li) { e.preventDefault(); choose(Number(li.dataset.i)); }
  });
  input.addEventListener("blur", () => setTimeout(hideSuggestions, 150));

  // ---------- Botões ----------
  $("locate-btn").addEventListener("click", locate);

  $("unit-btn").addEventListener("click", () => {
    state.unit = state.unit === "C" ? "F" : "C";
    store.set("unit", state.unit);
    render();
  });

  const savedTheme = store.get("theme");
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $("theme-btn").addEventListener("click", () => {
    const current = document.documentElement.dataset.theme
      || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => state.data && renderHourly(), 150);
  });

  // Atualiza a cada 10 minutos
  setInterval(() => state.place && loadPlace(state.place), 10 * 60 * 1000);

  // ---------- Início ----------
  let saved = null;
  try { saved = JSON.parse(store.get("place")); } catch { /* ignorado */ }
  loadPlace(saved && saved.latitude != null ? saved : DEFAULT_PLACE);
})();
