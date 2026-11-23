// Builds data.js (countries + capitals + simplified map shapes) for the app.
// Runs on Node 18+ with no dependencies: fetches Natural Earth 1:50m country shapes,
// clips them to a Europe window, simplifies the rings and writes window.EUROPE.
// Usage:
//   node build.js [outputPath]   writes just data.js (default: data.js)
//   node build.js --dist        copies the site files into dist/ for deployment

const COUNTRIES = [
  ["AL", "Albania", "Tirana", 19.8187, 41.3275],
  ["AD", "Andorra", "Andorra la Vella", 1.5218, 42.5063],
  ["AT", "Austria", "Vienna", 16.3738, 48.2082],
  ["BY", "Belarus", "Minsk", 27.5615, 53.9006],
  ["BE", "Belgium", "Brussels", 4.3517, 50.8503],
  ["BA", "Bosnia and Herzegovina", "Sarajevo", 18.4131, 43.8563],
  ["BG", "Bulgaria", "Sofia", 23.3219, 42.6977],
  ["HR", "Croatia", "Zagreb", 15.9819, 45.815],
  ["CY", "Cyprus", "Nicosia", 33.3823, 35.1856],
  ["CZ", "Czechia", "Prague", 14.4378, 50.0755],
  ["DK", "Denmark", "Copenhagen", 12.5683, 55.6761],
  ["EE", "Estonia", "Tallinn", 24.7536, 59.437],
  ["FI", "Finland", "Helsinki", 24.9384, 60.1699],
  ["FR", "France", "Paris", 2.3522, 48.8566],
  ["DE", "Germany", "Berlin", 13.405, 52.52],
  ["GR", "Greece", "Athens", 23.7275, 37.9838],
  ["HU", "Hungary", "Budapest", 19.0402, 47.4979],
  ["IS", "Iceland", "Reykjavík", -21.9426, 64.1466],
  ["IE", "Ireland", "Dublin", -6.2603, 53.3498],
  ["IT", "Italy", "Rome", 12.4964, 41.9028],
  ["LV", "Latvia", "Riga", 24.1052, 56.9496],
  ["LI", "Liechtenstein", "Vaduz", 9.5209, 47.141],
  ["LT", "Lithuania", "Vilnius", 25.2797, 54.6872],
  ["LU", "Luxembourg", "Luxembourg City", 6.1296, 49.6116],
  ["MT", "Malta", "Valletta", 14.5146, 35.8989],
  ["MD", "Moldova", "Chișinău", 28.8638, 47.0105],
  ["MC", "Monaco", "Monaco", 7.4246, 43.7384],
  ["ME", "Montenegro", "Podgorica", 19.2594, 42.4426],
  ["NL", "Netherlands", "Amsterdam", 4.9041, 52.3676],
  ["MK", "North Macedonia", "Skopje", 21.4254, 41.9981],
  ["NO", "Norway", "Oslo", 10.7522, 59.9139],
  ["PL", "Poland", "Warsaw", 21.0122, 52.2297],
  ["PT", "Portugal", "Lisbon", -9.1393, 38.7223],
  ["RO", "Romania", "Bucharest", 26.1025, 44.4268],
  ["RU", "Russia", "Moscow", 37.6173, 55.7558],
  ["SM", "San Marino", "San Marino", 12.4578, 43.9424],
  ["RS", "Serbia", "Belgrade", 20.4489, 44.7866],
  ["SK", "Slovakia", "Bratislava", 17.1077, 48.1486],
  ["SI", "Slovenia", "Ljubljana", 14.5058, 46.0569],
  ["ES", "Spain", "Madrid", -3.7038, 40.4168],
  ["SE", "Sweden", "Stockholm", 18.0686, 59.3293],
  ["CH", "Switzerland", "Bern", 7.4474, 46.948],
  ["UA", "Ukraine", "Kyiv", 30.5234, 50.4501],
  ["GB", "United Kingdom", "London", -0.1276, 51.5074],
  ["VA", "Vatican City", "Vatican City", 12.4534, 41.9029],
];

const NAME_TO_ISO = { France: "FR", Norway: "NO", Kosovo: "XK" };
const EXTRA = { XK: "Kosovo" };
const BBOX = [-25.5, 34.0, 62.0, 72.0];

const SOURCES = [
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson",
];

function clipRing(ring, bbox) {
  const [x0, y0, x1, y1] = bbox;
  const edge = (pts, inside, cut) => {
    const out = [];
    if (!pts.length) return out;
    let prev = pts[pts.length - 1];
    let prevIn = inside(prev);
    for (const cur of pts) {
      const curIn = inside(cur);
      if (curIn) {
        if (!prevIn) out.push(cut(prev, cur));
        out.push(cur);
      } else if (prevIn) {
        out.push(cut(prev, cur));
      }
      prev = cur;
      prevIn = curIn;
    }
    return out;
  };
  const ixV = (p, q, x) => [x, p[1] + ((x - p[0]) / (q[0] - p[0])) * (q[1] - p[1])];
  const ixH = (p, q, y) => [p[0] + ((y - p[1]) / (q[1] - p[1])) * (q[0] - p[0]), y];

  let pts = ring;
  pts = edge(pts, (p) => p[0] >= x0, (p, q) => ixV(p, q, x0));
  pts = edge(pts, (p) => p[0] <= x1, (p, q) => ixV(p, q, x1));
  pts = edge(pts, (p) => p[1] >= y0, (p, q) => ixH(p, q, y0));
  pts = edge(pts, (p) => p[1] <= y1, (p, q) => ixH(p, q, y1));
  return pts;
}

function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const seg = Math.hypot(dx, dy);
    let best = -1;
    let bi = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      const d = seg === 0
        ? Math.hypot(px - ax, py - ay)
        : Math.abs(dy * px - dx * py + bx * ay - by * ax) / seg;
      if (d > best) { best = d; bi = i; }
    }
    if (best > tol) {
      keep[bi] = true;
      stack.push([a, bi], [bi, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

function ringArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1];
  }
  return Math.abs(a) / 2;
}

function insideRing(pt, ring) {
  const [x, y] = pt;
  let hit = false;
  let j = ring.length - 1;
  for (let i = 0; i < ring.length; i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y)) {
      const xc = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (x < xc) hit = !hit;
    }
    j = i;
  }
  return hit;
}

function labelPoint(ring) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const cross = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    a += cross;
    cx += (ring[i][0] + ring[i + 1][0]) * cross;
    cy += (ring[i][1] + ring[i + 1][1]) * cross;
  }
  if (a === 0) return ring[0];
  a *= 0.5;
  const c = [cx / (6 * a), cy / (6 * a)];
  if (insideRing(c, ring)) return c;
  let best = ring[0];
  let bd = Infinity;
  for (const p of ring) {
    const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

async function download() {
  let lastErr;
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(url + " -> HTTP " + res.status);
      return await res.json();
    } catch (err) {
      lastErr = err;
      console.warn("source failed:", err.message);
    }
  }
  throw lastErr;
}

async function main() {
  const dist = process.argv.includes("--dist");
  const outputPath = dist ? "dist/data.js" : process.argv[2] || "data.js";
  const fs = await import("node:fs");
  if (dist) {
    fs.mkdirSync("dist", { recursive: true });
    for (const name of ["index.html", "styles.css", "app.js"]) {
      fs.copyFileSync(name, "dist/" + name);
    }
  }
  const geo = await download();
  const wanted = new Set([...COUNTRIES.map((c) => c[0]), ...Object.keys(EXTRA)]);
  const shapes = {};

  for (const feature of geo.features) {
    const p = feature.properties;
    let iso = String(p.ISO_A2 || "").trim().toUpperCase();
    if (iso === "" || iso === "-99") iso = NAME_TO_ISO[p.NAME] || "";
    if (!wanted.has(iso)) continue;

    const g = feature.geometry;
    const polys = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
    let rings = [];
    for (const poly of polys) {
      const clipped = clipRing(poly[0].map((c) => [c[0], c[1]]), BBOX);
      if (clipped.length < 4) continue;
      let pts = clipped.map((c) => [Math.round(c[0] * 100) / 100, Math.round(c[1] * 100) / 100]);
      if (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1]) pts.push(pts[0]);
      pts = simplify(pts, 0.06);
      const dedup = [pts[0]];
      for (const pt of pts.slice(1)) {
        const last = dedup[dedup.length - 1];
        if (pt[0] !== last[0] || pt[1] !== last[1]) dedup.push(pt);
      }
      if (dedup.length < 4) continue;
      if (dedup[0][0] !== dedup[dedup.length - 1][0] || dedup[0][1] !== dedup[dedup.length - 1][1]) {
        dedup.push(dedup[0]);
      }
      rings.push(dedup);
    }

    if (!rings.length) {
      const row = COUNTRIES.find((c) => c[0] === iso);
      const lon = row ? row[3] : 20;
      const lat = row ? row[4] : 45;
      const r = 0.08;
      const oct = [];
      for (let i = 0; i < 8; i++) {
        oct.push([
          Math.round((lon + r * Math.cos((i * Math.PI) / 4)) * 1000) / 1000,
          Math.round((lat + r * Math.sin((i * Math.PI) / 4)) * 1000) / 1000,
        ]);
      }
      oct.push(oct[0]);
      rings.push(oct);
    }

    rings.sort((a, b) => ringArea(b) - ringArea(a));
    const biggest = ringArea(rings[0]);
    rings = [rings[0], ...rings.slice(1).filter((r) => ringArea(r) > Math.max(0.012, biggest * 0.0008))];
    shapes[iso] = rings;
  }

  const countries = [];
  for (const [iso, name, capital, lon, lat] of COUNTRIES) {
    if (!shapes[iso]) {
      console.warn("missing shape for", iso);
      continue;
    }
    const ll = labelPoint(shapes[iso][0]);
    countries.push({
      iso,
      name,
      capital,
      lon: Math.round(lon * 1e4) / 1e4,
      lat: Math.round(lat * 1e4) / 1e4,
      labLon: Math.round(ll[0] * 1000) / 1000,
      labLat: Math.round(ll[1] * 1000) / 1000,
    });
  }
  countries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const extra = Object.keys(EXTRA)
    .filter((iso) => shapes[iso])
    .map((iso) => ({ iso, name: EXTRA[iso] }));

  const payload = "window.EUROPE = " + JSON.stringify({ countries, extra, shapes }) + ";\n";
  fs.writeFileSync(outputPath, payload);
  const points = Object.values(shapes).reduce((n, rs) => n + rs.reduce((m, r) => m + r.length, 0), 0);
  console.log(
    `wrote ${outputPath}: ${countries.length} countries, ${Object.keys(shapes).length} shapes, ` +
    `${points} points, ${(payload.length / 1024).toFixed(1)} KB`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
