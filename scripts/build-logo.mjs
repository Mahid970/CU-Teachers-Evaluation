/**
 * Traces the University of Chittagong crest into a single SVG path.
 *
 *   node scripts/build-logo.mjs <source.png>
 *
 * The crest is published as line art on a transparent background. A raster is
 * soft in a header and cannot follow the theme, so the outlines are traced once
 * here and checked in as `public/cu-logo.svg`, drawn in `currentColor`.
 *
 * Output: public/cu-logo.svg
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw new Error("usage: node scripts/build-logo.mjs <source.png>");

// Tracing at the crest's own size leaves the Bengali lettering ragged. The
// extra samples from resampling are what smooth the outline the tracer walks.
const SCALE = 2;
const image = sharp(source);
const meta = await image.metadata();
const W = meta.width * SCALE;
const H = meta.height * SCALE;

const { data } = await image
  .resize(W, H, { kernel: "lanczos3" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// Ink is any pixel that is both opaque and dark.
const ink = new Uint8Array(W * H);
for (let i = 0, p = 0; p < W * H; p += 1, i += 4) {
  const luma = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
  ink[p] = data[i + 3] > 140 && luma < 0.55 ? 1 : 0;
}
const solid = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : ink[y * W + x]);

/* ---- crack following --------------------------------------------------- */

// Every boundary between ink and paper is a run of unit edges along pixel
// sides. Each edge is directed so the ink is always on its right, which makes
// the outside of a shape wind one way and the holes inside it wind the other.
// Walking consumes edges, so the trace cannot loop.
const VW = W + 1;
const vertex = (x, y) => y * VW + x;
const outA = new Int32Array(VW * (H + 1)).fill(-1);
const outB = new Int32Array(VW * (H + 1)).fill(-1);

const addEdge = (fx, fy, tx, ty) => {
  const from = vertex(fx, fy);
  const to = vertex(tx, ty);
  if (outA[from] === -1) outA[from] = to;
  else outB[from] = to;
};

for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    if (!solid(x, y)) continue;
    if (!solid(x, y - 1)) addEdge(x, y, x + 1, y);
    if (!solid(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1);
    if (!solid(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1);
    if (!solid(x - 1, y)) addEdge(x, y + 1, x, y);
  }
}

const take = (from) => {
  if (outA[from] !== -1) {
    const to = outA[from];
    outA[from] = -1;
    return to;
  }
  if (outB[from] !== -1) {
    const to = outB[from];
    outB[from] = -1;
    return to;
  }
  return -1;
};

const contours = [];
for (let start = 0; start < outA.length; start += 1) {
  while (outA[start] !== -1 || outB[start] !== -1) {
    const loop = [];
    let at = start;
    while (true) {
      const next = take(at);
      if (next === -1) break;
      loop.push(next);
      at = next;
      if (at === start) break;
    }
    if (loop.length > 8) contours.push(loop);
  }
}

/* ---- simplify ---------------------------------------------------------- */

// Douglas-Peucker. A traced pixel boundary is all right angles; without this
// every staircase step of the resampled edge becomes its own line segment.
function simplify(points, epsilon) {
  const stack = [[0, points.length - 1]];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  while (stack.length) {
    const [first, last] = stack.pop();
    if (last - first < 2) continue;
    const [ax, ay] = points[first];
    const [bx, by] = points[last];
    const dx = bx - ax;
    const dy = by - ay;
    const norm = Math.hypot(dx, dy) || 1;

    let index = -1;
    let far = epsilon;
    for (let i = first + 1; i < last; i += 1) {
      const [px, py] = points[i];
      const distance = Math.abs(dy * px - dx * py + bx * ay - by * ax) / norm;
      if (distance > far) {
        far = distance;
        index = i;
      }
    }
    if (index === -1) continue;
    keep[index] = 1;
    stack.push([first, index], [index, last]);
  }
  return points.filter((_, i) => keep[i]);
}

const round = (n) => Math.round((n / SCALE) * 10) / 10;

const shapes = contours.map((loop) => loop.map((v) => [v % VW, Math.floor(v / VW)]));

const polygonArea = (points) => {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2);
};

/**
 * `epsilon` is how far the traced line may be straightened, `minArea` how small
 * a shape has to be before it is left out. The header needs every detail; the
 * browser tab, drawn at sixteen pixels, is clearer without the ones it cannot
 * resolve anyway.
 */
function buildPaths(epsilon, minArea) {
  const paths = [];
  let points = 0;
  for (const pts of shapes) {
    // A closed loop has no natural endpoints, so it is simplified in halves.
    const half = Math.floor(pts.length / 2);
    const kept = [
      ...simplify(pts.slice(0, half + 1), epsilon * SCALE),
      ...simplify(pts.slice(half), epsilon * SCALE).slice(1, -1),
    ];
    if (kept.length < 3) continue;
    if (polygonArea(kept) < minArea * SCALE * SCALE) continue;

    points += kept.length;
    paths.push(`M${kept.map(([x, y]) => `${round(x)} ${round(y)}`).join("L")}Z`);
  }
  return { paths, points };
}

const { paths, points } = buildPaths(0.55, 5);

// One path, even-odd: the counters inside the crest and inside the letters stay
// open without having to work out which loop encloses which.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(W)} ${round(H)}" fill="currentColor" fill-rule="evenodd"><path d="${paths.join("")}"/></svg>`;

const out = resolve(import.meta.dirname, "../public/cu-logo.svg");
writeFileSync(out, svg);

/* ---- the browser tab icon ---------------------------------------------- */

// At 16px the crest's interior — a book, an atom, a line of Bengali — turns to
// mush whatever you do. A filled tile keeps a recognisable silhouette at that
// size and stays visible against light and dark browser chrome alike.
const tile = buildPaths(2.4, 110);

const TILE = 64;
const CREST = 44;
const scale = CREST / round(H);
const crestWidth = round(W) * scale;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE} ${TILE}"><rect width="${TILE}" height="${TILE}" rx="13" fill="#0e3b2c"/><g transform="translate(${
  Math.round(((TILE - crestWidth) / 2) * 10) / 10
} ${(TILE - CREST) / 2}) scale(${Math.round(scale * 10000) / 10000})" fill="#ffffff" fill-rule="evenodd"><path d="${tile.paths.join("")}"/></g></svg>`;

const iconOut = resolve(import.meta.dirname, "../src/app/icon.svg");
writeFileSync(iconOut, icon);

// iOS ignores an SVG icon, so the same tile is rendered once for the home
// screen. It is opaque, because iOS puts anything transparent on black.
await sharp(Buffer.from(icon), { density: 600 })
  .resize(180, 180)
  .png()
  .toFile(resolve(import.meta.dirname, "../src/app/apple-icon.png"));

console.log(`Wrote ${out}`);
console.log(`       ${iconOut}`);
console.log(`  source     ${meta.width}x${meta.height}, traced at ${W}x${H}`);
console.log(`  contours   ${contours.length} -> ${paths.length} kept`);
console.log(`  points     ${points}`);
console.log(`  size       ${(svg.length / 1024).toFixed(1)} KB logo, ${(icon.length / 1024).toFixed(1)} KB tile`);
