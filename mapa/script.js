// ============================================================
//  Mapa 3D — Partidos de la Provincia de Buenos Aires
//  MapLibre GL JS (libre, sin token) · estilo nocturno ·
//  extrusión 3D · colores neón
// ============================================================

// Estilo oscuro libre de CARTO (no requiere token)
const ESTILO_OSCURO = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// ── Config general ──────────────────────────────────────────
const GEOJSON_URL = "partidos.geojson";
const CENTRO_PBA = [-60.0, -37.2]; // [lng, lat] (¡MapLibre usa lng primero!)

// Encuadre inicial — cerca del conurbano, incluyendo San Vicente y Cañuelas al sur
const FIT_BOUNDS = [
  [-59.15, -35.24], // suroeste (lng, lat)
  [-57.95, -34.15], // noreste  (lng, lat)
];

// Límite MÁXIMO de arrastre — ajustado al AMBA (no deja irse del foco)
const MAX_BOUNDS = [
  [-59.95, -35.55], // suroeste (lng, lat)
  [-57.55, -33.70], // noreste  (lng, lat)
];

// Municipio disruptivo (color totalmente distinto)
const MUNI_DESTACADO = "TRES DE FEBRERO"; // nombre crudo en el GeoJSON

// ── Municipios AMBA analizados (38). Nombres crudos del GeoJSON ──
const MUNICIPIOS_RESALTADOS = [
  "ALMIRANTE BROWN", "AVELLANEDA", "BERAZATEGUI", "BERISSO", "CAMPANA",
  "CAÑUELAS", "ENSENADA", "ESCOBAR", "ESTEBAN ECHEVERRIA", "EZEIZA",
  "FLORENCIO VARELA", "GENERAL RODRIGUEZ", "GENERAL SAN MARTIN", "HURLINGHAM",
  "ITUZAINGO", "JOSE C PAZ", "LA MATANZA", "LA PLATA", "LANUS",
  "LOMAS DE ZAMORA", "LUJAN", "MALVINAS ARGENTINAS", "MARCOS PAZ", "MERCEDES",
  "MERLO", "MORENO", "MORON", "PILAR", "PRESIDENTE PERON", "QUILMES",
  "SAN FERNANDO", "SAN ISIDRO", "SAN MIGUEL", "SAN VICENTE", "TIGRE",
  "TRES DE FEBRERO", "VICENTE LOPEZ", "ZARATE",
];

// ── Región AMBA a dibujar (analizados + contexto en gris). Todo lo demás no se muestra ──
const AMBA_REGION = [
  "ALMIRANTE BROWN", "AVELLANEDA", "BARADERO", "BERAZATEGUI", "BERISSO",
  "BRANDSEN", "CAMPANA", "CAÑUELAS", "ENSENADA", "ESCOBAR",
  "ESTEBAN ECHEVERRIA", "EXALTACION DE LA CRUZ", "EZEIZA", "FLORENCIO VARELA",
  "GENERAL LAS HERAS", "GENERAL PAZ", "GENERAL RODRIGUEZ", "GENERAL SAN MARTIN",
  "HURLINGHAM", "ITUZAINGO", "JOSE C PAZ", "LA MATANZA", "LA PLATA", "LANUS",
  "LOBOS", "LOMAS DE ZAMORA", "LUJAN", "MAGDALENA", "MALVINAS ARGENTINAS",
  "MARCOS PAZ", "MERCEDES", "MERLO", "MONTE", "MORENO", "MORON", "NAVARRO",
  "PILAR", "PRESIDENTE PERON", "QUILMES", "ROQUE PEREZ", "SAN ANDRES DE GILES",
  "SAN ANTONIO DE ARECO", "SAN FERNANDO", "SAN ISIDRO", "SAN MIGUEL",
  "SAN VICENTE", "SUIPACHA", "TIGRE", "TRES DE FEBRERO", "VICENTE LOPEZ",
  "ZARATE",
];

// Etiquetas "lindas" para popup / panel
const NOMBRES_DISPLAY = {
  "CORONEL DE MARINA LEONARDO ROSALES": "Coronel Rosales",
};

// ============================================================
//  Vinculación nombre GeoJSON (MAYÚSCULAS) ↔ entrada en DATA
// ============================================================
function normNombre(s) {
  return (s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PANEL_INDEX = {};
if (typeof DATA !== "undefined" && Array.isArray(DATA)) {
  DATA.forEach((m) => {
    PANEL_INDEX[normNombre(m.nombre)] = m;
  });
}

const ALIAS_GEOJSON = {
  "CORONEL DE MARINA LEONARDO ROSALES": "Coronel Rosales",
};

function getPanelData(rawNombre) {
  const alias = ALIAS_GEOJSON[rawNombre];
  return PANEL_INDEX[normNombre(alias || rawNombre)] || null;
}

function getNombreDisplay(raw) {
  if (NOMBRES_DISPLAY[raw]) return NOMBRES_DISPLAY[raw];
  return (raw || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Panel lateral con la ficha (opción B, se conserva) ──────
function abrirPanelPorNombre(raw) {
  const m = getPanelData(raw);
  const body = document.getElementById("panel-municipio-body");
  const panel = document.getElementById("panel-municipio");
  if (!m) {
    body.innerHTML =
      '<div style="padding:20px;color:#6c6f78;font-style:italic;font-size:12px">' +
      "Sin datos de panel para <strong>" + getNombreDisplay(raw) + "</strong>.</div>";
  } else {
    body.innerHTML = renderPmunFicha(m, {});
  }
  panel.classList.add("open");
}
function cerrarPanel() {
  document.getElementById("panel-municipio").classList.remove("open");
}

// ── Selector de sección electoral ───────────────────────────
// Al elegir una sección, sus municipios mantienen color/altura
// (presión fiscal) y el resto queda gris y plano como contexto.
// ── Filtros combinados: sección electoral + intensidad de presión ──
const filtro = { seccion: "all", tramo: "all" };

// Despliega/contrae un panel de filtro (y cierra el otro)
function toggleFiltro(id) {
  const t = document.getElementById(id);
  if (!t) return;
  const abrir = t.classList.contains("collapsed");
  document.querySelectorAll(".filtro").forEach((f) => f.classList.add("collapsed"));
  if (abrir) t.classList.remove("collapsed");
}

function setSeccion(sec, btn) {
  filtro.seccion = sec;
  const cur = document.getElementById("sec-current");
  if (cur) cur.textContent = sec === "all" ? "Todas" : sec + "ª";
  document.querySelectorAll("#secciones .sec-btn").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const box = document.getElementById("secciones");
  if (box) box.classList.add("collapsed");
  aplicarFiltro();
}

function setIntensidad(tramo, btn) {
  filtro.tramo = tramo;
  const labels = { all: "Todas", alta: "Alta", media: "Media", baja: "Baja" };
  const cur = document.getElementById("int-current");
  if (cur) cur.textContent = labels[tramo] || "Todas";
  document.querySelectorAll("#intensidad .int-btn").forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  const box = document.getElementById("intensidad");
  if (box) box.classList.add("collapsed");
  aplicarFiltro();
}

// Aplica ambos filtros combinados (AND) sobre el mapa
function aplicarFiltro() {
  if (typeof map === "undefined" || !map.getLayer || !map.getLayer("partidos-3d")) return;

  const hover = ["boolean", ["feature-state", "hover"], false];
  const colorNormal = ["case", hover, ["get", "pf_color_hover"], ["get", "pf_color"]];

  const condSec = filtro.seccion === "all" ? true : ["==", ["get", "pf_seccion"], filtro.seccion];
  const condTramo = filtro.tramo === "all" ? true : ["==", ["get", "pf_tramo"], filtro.tramo];
  const visible = ["all", condSec, condTramo];

  const dim = TEMAS[temaActual].dim;
  map.setPaintProperty("partidos-3d", "fill-color", ["case", visible, colorNormal, dim]);
  map.setFilter("partidos-labels", [
    "all",
    ["in", ["get", "departamento"], ["literal", MUNICIPIOS_RESALTADOS]],
    visible,
  ]);
}

// ============================================================
//  Temas (oscuro / claro) — colores del mapa por tema
// ============================================================
const ESTILO_CLARO = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const TEMAS = {
  oscuro: { style: ESTILO_OSCURO, mapBg: "#0a0b10", base: "#242a40", dim: "#2b3448", label: "#ffffff", halo: "rgba(0,0,0,0.85)" },
  claro: { style: ESTILO_CLARO, mapBg: "#efece3", base: "#c9c6ba", dim: "#d6d2c6", label: "#1e2d5a", halo: "rgba(255,255,255,0.92)" },
};
let temaActual = "claro"; // arranca en claro; se puede pasar a oscuro
let geoEnriquecido = null; // GeoJSON ya enriquecido (se reutiliza al cambiar de tema)

// ============================================================
//  Inicialización del mapa (MapLibre) — plano (2D)
// ============================================================
const map = new maplibregl.Map({
  container: "map",
  style: TEMAS[temaActual].style,
  bounds: FIT_BOUNDS, // abre YA encuadrado en el AMBA (sin animación)
  fitBoundsOptions: { padding: 0, pitch: 32 }, // leve inclinación
  bearing: 0, // norte arriba
  antialias: true,
  maxPitch: 60, // permite la inclinación
  dragRotate: false, // no se puede rotar
  touchPitch: false,
  // Se puede desplazar (arrastre) pero acotado al AMBA por maxBounds
  // maxBounds/minZoom se fijan al cargar (ver abajo)
});
map.touchZoomRotate.disableRotation();

// Muestra errores de MapLibre en el cartel de diagnóstico
map.on("error", (e) => {
  const msg = (e && e.error && e.error.message) || "Error de MapLibre";
  if (window.__showErr) window.__showErr("MapLibre: " + msg);
  console.error("MapLibre error:", e && e.error);
});

// Controles de navegación (solo zoom; sin brújula/pitch en mapa plano)
map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), "bottom-right");

const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true });
let hoveredId = null;

// Inyecta en cada municipio resaltado su color/altura según presión fiscal
function enriquecerGeo(geo) {
  const CUARTIL_COLORS = { Q1: "#4F9C7A", Q2: "#E8C547", Q3: "#E89547", Q4: "#C84747" };
  const PF_MIN = 0.52, PF_MAX = 3.164; // rango real del índice (%)
  const H_MIN = 2000, H_MAX = 8200; // rango de alturas (m)
  const TRAMO = { Q1: "baja", Q2: "media", Q3: "media", Q4: "alta" };

  function pfHeight(total) {
    const t = Math.max(PF_MIN, Math.min(PF_MAX, total));
    return Math.round(H_MIN + ((t - PF_MIN) / (PF_MAX - PF_MIN)) * (H_MAX - H_MIN));
  }
  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * amt);
    g = Math.round(g + (255 - g) * amt);
    b = Math.round(b + (255 - b) * amt);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  geo.features.forEach((f) => {
    const raw = f.properties.departamento;
    if (!MUNICIPIOS_RESALTADOS.includes(raw)) return;
    const m = getPanelData(raw);
    if (!m || !m.indice_fiscal) return;
    f.properties.pf_cuartil = m.indice_fiscal.cuartil;
    f.properties.pf_total = m.indice_fiscal.total;
    f.properties.pf_label = getNombreDisplay(raw);
    f.properties.pf_seccion = Number(m.seccion);
    f.properties.pf_tramo = TRAMO[m.indice_fiscal.cuartil] || "media";
    const col = CUARTIL_COLORS[m.indice_fiscal.cuartil] || "#888888";
    f.properties.pf_color = col;
    f.properties.pf_color_hover = lighten(col, 0.45);
    f.properties.pf_height = pfHeight(m.indice_fiscal.total);
  });
  return geo;
}

// Carga el GeoJSON: objeto embebido (versión para compartir) o fetch (desarrollo)
async function cargarGeojson() {
  if (typeof PARTIDOS_GEOJSON !== "undefined" && PARTIDOS_GEOJSON) return PARTIDOS_GEOJSON;
  const res = await fetch(GEOJSON_URL);
  return res.json();
}

// Crea/recrea la fuente y las capas con los colores del tema actual.
// Se llama al cargar y cada vez que se cambia de tema (setStyle borra todo).
function construirCapas() {
  const tema = TEMAS[temaActual];
  const enResaltados = ["in", ["get", "departamento"], ["literal", MUNICIPIOS_RESALTADOS]];
  const hover = ["boolean", ["feature-state", "hover"], false];

  // Borra capas/fuente previas si quedaron (evita "already exists")
  ["isla-mg-label", "partidos-labels", "partidos-3d", "partidos-base"].forEach((id) => {
    if (map.getLayer(id)) map.removeLayer(id);
  });
  if (!map.getSource("partidos")) {
    map.addSource("partidos", { type: "geojson", data: geoEnriquecido, generateId: true });
  }

  // Capa base (partidos de contexto, solo dentro de la región AMBA) — plana
  map.addLayer({
    id: "partidos-base",
    type: "fill",
    source: "partidos",
    filter: ["all", ["!", enResaltados], ["in", ["get", "departamento"], ["literal", AMBA_REGION]]],
    paint: {
      "fill-color": tema.base,
      "fill-opacity": 0.4,
      "fill-outline-color": tema.dim,
    },
  });

  // Capa de municipios (los 52) — plana, color por cuartil de presión fiscal
  map.addLayer({
    id: "partidos-3d",
    type: "fill",
    source: "partidos",
    filter: enResaltados,
    paint: {
      "fill-color": ["case", hover, ["get", "pf_color_hover"], ["get", "pf_color"]],
      "fill-opacity": 0.85,
      "fill-outline-color": tema.label,
    },
  });

  // Nombres sobre el mapa (solo los 52)
  map.addLayer({
    id: "partidos-labels",
    type: "symbol",
    source: "partidos",
    filter: enResaltados,
    layout: {
      "text-field": ["get", "pf_label"],
      "text-font": ["Open Sans Bold"],
      "text-size": ["interpolate", ["linear"], ["zoom"], 5, 9, 8, 11.5, 11, 14],
      "text-max-width": 7,
      "text-padding": 1,
      "text-allow-overlap": true, // muestra SIEMPRE todos los nombres
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": tema.label,
      "text-halo-color": tema.halo,
      "text-halo-width": 1.3,
      "text-halo-blur": 0.3,
    },
  });

  // ── Rótulo de Isla Martín García (enclave del partido de La Plata) ──
  if (!map.getSource("isla-mg")) {
    map.addSource("isla-mg", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-58.251, -34.183] },
        properties: {},
      },
    });
  }
  map.addLayer({
    id: "isla-mg-label",
    type: "symbol",
    source: "isla-mg",
    layout: {
      "text-field": "Isla Martín García\n(La Plata)",
      "text-font": ["Open Sans Bold"],
      "text-size": 10.5,
      "text-offset": [0, 0.9],
      "text-anchor": "top",
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": tema.label,
      "text-halo-color": tema.halo,
      "text-halo-width": 1.3,
      "text-halo-blur": 0.3,
    },
  });

  aplicarFiltro(); // reaplica el filtro actual (sección/intensidad)
}

// Registra hover/clic una sola vez (persisten al cambiar de estilo)
let interaccionLista = false;
function registrarInteraccion() {
  if (interaccionLista) return;
  interaccionLista = true;

  map.on("mousemove", "partidos-3d", (e) => {
    if (!e.features.length) return;
    map.getCanvas().style.cursor = "pointer";
    if (hoveredId !== null) {
      map.setFeatureState({ source: "partidos", id: hoveredId }, { hover: false });
    }
    hoveredId = e.features[0].id;
    map.setFeatureState({ source: "partidos", id: hoveredId }, { hover: true });
  });

  map.on("mouseleave", "partidos-3d", () => {
    map.getCanvas().style.cursor = "";
    if (hoveredId !== null) {
      map.setFeatureState({ source: "partidos", id: hoveredId }, { hover: false });
    }
    hoveredId = null;
  });

  map.on("click", "partidos-3d", (e) => {
    const f = e.features[0];
    const raw = f.properties.departamento;
    const nombre = getNombreDisplay(raw);
    popup.setLngLat(e.lngLat).setHTML("<strong>" + nombre + "</strong>").addTo(map);
    abrirPanelPorNombre(raw);
  });
}

// ── Cambio de tema (oscuro ↔ claro) ─────────────────────────
function setTema(t) {
  if (t === temaActual || !TEMAS[t]) return;
  temaActual = t;
  const tema = TEMAS[t];
  document.body.classList.toggle("tema-claro", t === "claro");
  const mapEl = document.getElementById("map");
  if (mapEl) mapEl.style.background = tema.mapBg;
  const btn = document.getElementById("tema-toggle");
  if (btn) btn.textContent = t === "claro" ? "☀ Claro" : "🌙 Oscuro";
  // setStyle borra fuente y capas; las recreamos cuando el nuevo estilo
  // terminó de cargar y renderizar (evento 'idle', el más confiable).
  // diff:false fuerza una recarga completa del estilo.
  map.setStyle(tema.style, { diff: false });
  map.once("idle", () => construirCapas());
}
function toggleTema() {
  setTema(temaActual === "oscuro" ? "claro" : "oscuro");
}

// ── Carga inicial ────────────────────────────────────────────
map.on("load", async () => {
  geoEnriquecido = enriquecerGeo(await cargarGeojson());
  construirCapas();
  registrarInteraccion();

  // El mapa ya abrió encuadrado (opción bounds); solo fijamos límites.
  map.setMinZoom(map.getZoom() - 0.25); // casi no se puede alejar
  map.setMaxBounds(MAX_BOUNDS);
});

window._map = map; // por si querés inspeccionarlo desde la consola
