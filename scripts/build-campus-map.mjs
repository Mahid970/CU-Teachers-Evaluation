/**
 * Builds the campus map used on the home page from OpenStreetMap data.
 *
 *   node scripts/build-campus-map.mjs
 *
 * Everything drawn on that map is real: the campus outline, the lakes, the
 * roads and the buildings are OSM geometry, and a marker is only placed where
 * OSM actually names that building. Nothing is positioned by guesswork.
 *
 * Output: src/lib/campus-map.ts
 * Map data © OpenStreetMap contributors, ODbL.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BBOX = "22.460,91.775,22.490,91.805";
const ENDPOINT = "https://overpass-api.de/api/interpreter";

const overpass = async (query) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "cu-rate/1.0 (campus map build)",
      },
      body: new URLSearchParams({ data: query }),
    });
    if (response.ok) return response.json();
    await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
  }
  throw new Error("Overpass did not answer");
};

console.log("Fetching campus boundary…");
const campus = await overpass(`[out:json][timeout:90];
way["amenity"="university"]["name"~"চট্টগ্রাম|Chittagong"](${BBOX});
out geom;`);

const outline = campus.elements.find((e) => e.geometry?.length > 40);
if (!outline) throw new Error("Campus outline not found");

console.log("Fetching campus features…");
const features = await overpass(`[out:json][timeout:120];
(
  way["building"](${BBOX});
  way["highway"~"^(primary|secondary|tertiary|unclassified|residential|service)$"](${BBOX});
  way["natural"="water"](${BBOX});
  way["waterway"="riverbank"](${BBOX});
  node["railway"="station"](${BBOX});
  way["railway"](${BBOX});
);
out geom;`);

/* ---- geometry helpers -------------------------------------------------- */

const poly = outline.geometry.map((p) => [p.lon, p.lat]);

const inside = ([x, y]) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

const centroid = (points) => [
  points.reduce((s, p) => s + p.lon, 0) / points.length,
  points.reduce((s, p) => s + p.lat, 0) / points.length,
];

// Equirectangular, corrected for latitude, then normalised into a viewBox.
const lats = poly.map((p) => p[1]);
const lons = poly.map((p) => p[0]);
const minLat = Math.min(...lats);
const maxLat = Math.max(...lats);
const minLon = Math.min(...lons);
const maxLon = Math.max(...lons);
const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));

const WIDTH = 1000;
const spanX = (maxLon - minLon) * kx;
const spanY = maxLat - minLat;
const HEIGHT = Math.round((spanY / spanX) * WIDTH);

const project = ([lon, lat]) => [
  ((lon - minLon) * kx * WIDTH) / spanX,
  HEIGHT - ((lat - minLat) * HEIGHT) / spanY,
];

const round = (n) => Math.round(n * 10) / 10;

const toPath = (points, close) => {
  const projected = points.map((p) => project([p.lon, p.lat]).map(round));
  // Drop points that barely move the line; the map is drawn small.
  const kept = projected.filter(([x, y], i) => {
    if (i === 0 || i === projected.length - 1) return true;
    const [px, py] = projected[i - 1];
    return Math.hypot(x - px, y - py) > 1.2;
  });
  if (kept.length < 2) return null;
  return (
    `M${kept.map(([x, y]) => `${x} ${y}`).join("L")}` + (close ? "Z" : "")
  );
};

const area = (points) => {
  const pts = points.map((p) => project([p.lon, p.lat]));
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2);
};

/* ---- faculties, matched to buildings OSM actually names ---------------- */

const FACULTY_MATCHES = [
  { key: "arts", label: "Arts and Humanities", names: ["Faculty of Arts"] },
  { key: "science", label: "Science", names: ["Faculty of Sciences"] },
  { key: "business", label: "Business Administration", names: ["Faculty of Commerce"] },
  { key: "social", label: "Social Sciences", names: ["Faculty of Social Sciences"] },
  { key: "law", label: "Law", names: ["Faculty of Law"] },
  { key: "engineering", label: "Engineering", names: ["Dean Office, Faculty of Engineering"] },
  { key: "marine", label: "Marine Sciences and Fisheries", names: ["FMSF New Building"] },
];

const LANDMARKS = [
  { match: "চট্টগ্রাম বিশ্ববিদ্যালয় রেলওয়ে স্টেশন", label: "Shuttle station" },
  { match: "Chittagong University Railway Station", label: "Shuttle station" },
  { match: "Chittagong University Library", label: "Library" },
  { match: "Chittagong University Central Mosque", label: "Central mosque" },
  { match: "Sheikh Kamal Gymnasium Hall (Institute of Physical Education)", label: "Gymnasium" },
  { match: "Cafeteria", label: "Cafeteria" },
];

/* ---- build ------------------------------------------------------------- */

const buildings = [];
const water = [];
const roads = [];
const faculties = [];
const landmarks = [];

for (const el of features.elements) {
  const tags = el.tags ?? {};

  if (el.type === "node") {
    const hit = LANDMARKS.find((l) => tags.name === l.match);
    if (hit && inside([el.lon, el.lat])) {
      const [x, y] = project([el.lon, el.lat]).map(round);
      landmarks.push({ label: hit.label, x, y });
    }
    continue;
  }

  const geometry = el.geometry ?? [];
  if (geometry.length < 3) continue;

  // Landmarks only have to sit inside the drawn frame. The campus outline is
  // irregular and excludes places students plainly think of as campus — the
  // shuttle station among them.
  const landmarkWay = LANDMARKS.find((l) => tags.name === l.match || tags["name:en"] === l.match);
  const [lx, ly] = centroid(geometry);
  const inFrame = lx >= minLon && lx <= maxLon && ly >= minLat && ly <= maxLat;
  if (landmarkWay && !tags.highway && inFrame) {
    const d = toPath(geometry, true);
    const [cx, cy] = project([lx, ly]).map(round);
    landmarks.push({ label: landmarkWay.label, x: cx, y: cy, ...(d ? { d } : {}) });
    continue;
  }

  if (!inside(centroid(geometry))) continue;

  if (tags.natural === "water" || tags.waterway === "riverbank") {
    const d = toPath(geometry, true);
    if (d && area(geometry) > 15) water.push(d);
    continue;
  }

  if (tags.highway) {
    const d = toPath(geometry, false);
    if (d) roads.push(d);
    continue;
  }

  if (tags.building) {
    const size = area(geometry);
    const faculty = FACULTY_MATCHES.find((f) => f.names.includes(tags.name));
      const d = toPath(geometry, true);
    if (!d) continue;

    if (faculty) {
      const [cx, cy] = project(centroid(geometry)).map(round);
      faculties.push({ key: faculty.key, label: faculty.label, d, x: cx, y: cy });
    } else if (size > 4) {
      // Only the very smallest sheds are dropped: the rest are what makes the
      // shape read as a campus rather than a scatter of blocks.
      buildings.push(d);
    }
  }
}

const outlinePath = toPath(outline.geometry, true);

// The campus boundary takes in a lot of empty hillside. Frame the drawing on
// the built-up part instead, which is the campus students actually walk.
const numbers = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number);
const xs = [];
const ys = [];
for (const d of [...buildings, ...water, ...faculties.map((f) => f.d)]) {
  const n = numbers(d);
  for (let i = 0; i < n.length; i += 2) {
    xs.push(n[i]);
    ys.push(n[i + 1]);
  }
}
for (const l of landmarks) {
  xs.push(l.x);
  ys.push(l.y);
}

const padX = (Math.max(...xs) - Math.min(...xs)) * 0.06;
const padY = (Math.max(...ys) - Math.min(...ys)) * 0.06;
const viewX = Math.round(Math.min(...xs) - padX);
const viewY = Math.round(Math.min(...ys) - padY);
const viewW = Math.round(Math.max(...xs) - Math.min(...xs) + padX * 2);
const viewH = Math.round(Math.max(...ys) - Math.min(...ys) + padY * 2);

const file = `// Generated by scripts/build-campus-map.mjs — do not edit by hand.
// Map data © OpenStreetMap contributors (ODbL). Every shape here is real
// geometry, and a marker only appears where OSM names that building.

export const CAMPUS_VIEWBOX = "${viewX} ${viewY} ${viewW} ${viewH}";

export const CAMPUS_OUTLINE = ${JSON.stringify(outlinePath)};

export const CAMPUS_WATER: string[] = ${JSON.stringify(water)};

export const CAMPUS_ROADS: string[] = ${JSON.stringify(roads)};

export const CAMPUS_BUILDINGS: string[] = ${JSON.stringify(buildings)};

export type CampusFaculty = {
  key: string;
  label: string;
  d: string;
  x: number;
  y: number;
};

export const CAMPUS_FACULTIES: CampusFaculty[] = ${JSON.stringify(faculties, null, 2)};

export type CampusLandmark = { label: string; x: number; y: number; d?: string };

export const CAMPUS_LANDMARKS: CampusLandmark[] = ${JSON.stringify(landmarks, null, 2)};
`;

const out = resolve(import.meta.dirname, "../src/lib/campus-map.ts");
writeFileSync(out, file);

console.log(`\nWrote ${out}`);
console.log(`  viewBox      ${viewX} ${viewY} ${viewW} ${viewH}`);
console.log(`  buildings    ${buildings.length}`);
console.log(`  water        ${water.length}`);
console.log(`  roads        ${roads.length}`);
console.log(`  faculties    ${faculties.length} (${faculties.map((f) => f.key).join(", ")})`);
console.log(`  landmarks    ${landmarks.length} (${landmarks.map((l) => l.label).join(", ")})`);
console.log(`  size         ${(file.length / 1024).toFixed(0)} KB`);
