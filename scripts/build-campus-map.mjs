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
  way["landuse"="education"]["name"](${BBOX});
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

// The campus is taller than it is wide, which wastes a landscape hero, so the
// whole drawing is turned a quarter turn clockwise: (x, y) -> (H - y, x).
const project = ([lon, lat]) => {
  const x = ((lon - minLon) * kx * WIDTH) / spanX;
  const y = HEIGHT - ((lat - minLat) * HEIGHT) / spanY;
  return [HEIGHT - y, x];
};

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
  { key: "arts", label: "Arts and Humanities", href: "/faculties#arts", names: ["Faculty of Arts"] },
  { key: "science", label: "Science", href: "/faculties#science", names: ["Faculty of Sciences"] },
  { key: "business", label: "Business Administration", href: "/faculties#business", names: ["Faculty of Commerce"] },
  { key: "social", label: "Social Sciences", href: "/faculties#social", names: ["Faculty of Social Sciences"] },
  { key: "law", label: "Law", href: "/faculties#law", names: ["Faculty of Law"] },
  { key: "engineering", label: "Engineering", href: "/faculties#engineering", names: ["Dean Office, Faculty of Engineering"] },
  { key: "marine", label: "Marine Sciences and Fisheries", href: "/faculties#marine", names: ["FMSF New Building"] },
  { key: "ifes", label: "Forestry and Environmental Sciences", href: "/d/ifes", names: ["Institute of Forestry and Environmental Sciences"] },
];

/**
 * Biological Sciences has no single building of its own in the map data, but
 * OSM does name the faculty grounds: two adjoining `landuse=education` areas
 * both called "Faculty of Biological Sciences", which together are the
 * precinct the departments sit in. The marker goes at the middle of those.
 *
 * An earlier version averaged the road and the pond named after the faculty
 * instead. Both run far past the faculty itself — the road crosses most of the
 * campus — so that average landed nowhere near the buildings.
 */
const DERIVED = [
  {
    key: "biological",
    label: "Biological Sciences",
    href: "/faculties#biological",
    from: ["Faculty of Biological Sciences"],
  },
];
const derivedPoints = new Map(DERIVED.map((d) => [d.key, []]));

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

  for (const d of DERIVED) {
    if (d.from.includes(tags.name) && !tags.highway && !tags.natural) {
      for (const point of geometry) derivedPoints.get(d.key).push([point.lon, point.lat]);
    }
  }

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
      faculties.push({ key: faculty.key, label: faculty.label, href: faculty.href, d, x: cx, y: cy });
    } else if (size > 4) {
      // Only the very smallest sheds are dropped: the rest are what makes the
      // shape read as a campus rather than a scatter of blocks.
      buildings.push(d);
    }
  }
}

for (const d of DERIVED) {
  const points = derivedPoints.get(d.key);
  if (!points.length) {
    console.warn(`  ! no reference features found for ${d.key}`);
    continue;
  }
  const lon = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const lat = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const [x, y] = project([lon, lat]).map(round);
  faculties.push({ key: d.key, label: d.label, href: d.href, x, y });
}

const outlinePath = toPath(outline.geometry, true);

// The campus boundary takes in a lot of empty hillside. Frame the drawing on
// the built-up part instead, which is the campus students actually walk.
const numbers = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number);
const xs = [];
const ys = [];
for (const d of [...buildings, ...water, ...faculties.map((f) => f.d).filter(Boolean)]) {
  const n = numbers(d);
  for (let i = 0; i < n.length; i += 2) {
    xs.push(n[i]);
    ys.push(n[i + 1]);
  }
}
for (const point of [...landmarks, ...faculties]) {
  xs.push(point.x);
  ys.push(point.y);
}

// The order the line visits faculties in. Nearest neighbour gets close, then
// 2-opt untangles it: nearest neighbour always strands whatever it skipped, and
// here that left one hop crossing the entire campus at the end.
const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const tourOrder = [];
const remaining = [...faculties];
let cursor = remaining.reduce((a, b) => (a.x <= b.x ? a : b));
remaining.splice(remaining.indexOf(cursor), 1);
tourOrder.push(cursor);
while (remaining.length) {
  let best = 0;
  let bestDistance = Infinity;
  remaining.forEach((f, i) => {
    const distance = gap(f, cursor);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  cursor = remaining.splice(best, 1)[0];
  tourOrder.push(cursor);
}

const walked = (route) =>
  route.reduce((sum, f, i) => (i ? sum + gap(route[i - 1], f) : 0), 0);

// The route is a walk, not a circuit, so either end is free to move.
for (let pass = 0; pass < 40; pass += 1) {
  let improved = false;
  for (let i = 0; i < tourOrder.length - 1; i += 1) {
    for (let j = i + 1; j < tourOrder.length; j += 1) {
      const candidate = [
        ...tourOrder.slice(0, i),
        ...tourOrder.slice(i, j + 1).reverse(),
        ...tourOrder.slice(j + 1),
      ];
      if (walked(candidate) < walked(tourOrder) - 0.01) {
        tourOrder.splice(0, tourOrder.length, ...candidate);
        improved = true;
      }
    }
  }
  if (!improved) break;
}

// Each leg is thrown rather than drawn: a high arc that leaves one faculty and
// lands on the next, the way a lofted shot travels. The bow always swings away
// from the middle of the campus, so the arcs open outwards instead of cutting
// back through the buildings they are meant to fly over.
const hubX = tourOrder.reduce((sum, f) => sum + f.x, 0) / tourOrder.length;
const hubY = tourOrder.reduce((sum, f) => sum + f.y, 0) / tourOrder.length;

const apexes = [];

const legPath = (a, b) => {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;

  // The perpendicular, turned to point away from the centre of the campus.
  let nx = -dy / length;
  let ny = dx / length;
  if (nx * (mx - hubX) + ny * (my - hubY) < 0) {
    nx = -nx;
    ny = -ny;
  }

  // Short hops still need visible air under them; long ones would loop absurdly
  // far out on a flat share of their length, so the rise is capped.
  const rise = Math.min(Math.max(length * 0.24, 22), 82);
  // A quadratic sits halfway to its control point at the top of its travel.
  apexes.push([mx + nx * rise, my + ny * rise]);
  return `M${a.x} ${a.y}Q${round(mx + nx * rise * 2)} ${round(my + ny * rise * 2)} ${b.x} ${b.y}`;
};

const legs = [];
for (let i = 1; i < tourOrder.length; i += 1) {
  legs.push({
    from: tourOrder[i - 1].key,
    to: tourOrder[i].key,
    d: legPath(tourOrder[i - 1], tourOrder[i]),
  });
}

// One path of the whole route, for readers who have asked for less motion.
const tour = legs.map((leg, i) => (i === 0 ? leg.d : leg.d.replace(/^M[^Q]*/, ""))).join("");

for (const [ax, ay] of apexes) {
  xs.push(ax);
  ys.push(ay);
}

const padX = (Math.max(...xs) - Math.min(...xs)) * 0.04;
const padY = (Math.max(...ys) - Math.min(...ys)) * 0.04;
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
  href: string;
  /** Absent when OSM names no building for that faculty. */
  d?: string;
  x: number;
  y: number;
};

/** The whole route as one path, drawn static when motion is not wanted. */
export const CAMPUS_TOUR = ${JSON.stringify(tour)};

export type CampusLeg = { from: string; to: string; d: string };

/**
 * The route split into single hops. Each is flown one at a time so the line can
 * stop on arrival and name the faculty it has reached.
 */
export const CAMPUS_TOUR_LEGS: CampusLeg[] = ${JSON.stringify(legs, null, 2)};

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
console.log(`  tour         ${tourOrder.length} stops: ${tourOrder.map((f) => f.key).join(" → ")}`);
console.log(`  landmarks    ${landmarks.length} (${landmarks.map((l) => l.label).join(", ")})`);
console.log(`  size         ${(file.length / 1024).toFixed(0)} KB`);
