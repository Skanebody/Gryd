/**
 * Re-route les BOUCLES-ZONES du territoire sur les VRAIES RUES (OSRM foot) : les
 * boucles demo n'avaient que les coins (intersections), donc leurs segments
 * droits coupaient les patés de maisons. On route la boucle fermee a travers ses
 * waypoints → frontiere qui suit les rues (zone = blocs bordes par les rues).
 * Sortie = arrays TS a coller dans realAnchors.ts / franceTerritories.ts.
 * Aucun runtime : fige la geometrie a l'authoring.
 */
const OSRM = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';
const M_PER_DEG_LAT = 111_320;

const ZONES = {
  BOUCLE_REPUBLIQUE: [
    [48.86697, 2.3656], [48.86529, 2.37444], [48.862, 2.37698],
    [48.86099, 2.37477], [48.86673, 2.36514], [48.86698, 2.36549],
  ],
  BOUCLE_PLACE_REPUBLIQUE: [
    [48.8683, 2.3628], [48.8681, 2.3648], [48.8668, 2.3645],
    [48.8664, 2.363], [48.8672, 2.3616],
  ],
  BOUCLE_SQUARE_VILLEMIN: [
    [48.8752, 2.3608], [48.8756, 2.363], [48.8743, 2.3638], [48.8739, 2.3614],
  ],
  BOUCLE_BASTILLE: [
    [48.854, 2.3686], [48.8536, 2.37], [48.8527, 2.3698],
    [48.8524, 2.3683], [48.8532, 2.3676],
  ],
  LILLE_BOUCLE: [
    [50.6369, 3.06376], [50.63727, 3.0631], [50.63457, 3.05678], [50.6374, 3.05164],
    [50.63902, 3.05342], [50.63984, 3.05368], [50.64264, 3.05351], [50.64331, 3.05319],
    [50.64542, 3.06042], [50.64456, 3.06108], [50.64097, 3.06499], [50.64062, 3.06413],
    [50.6386, 3.06305], [50.6376, 3.0633],
  ],
};

const mPerDegLng = (lat) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function routeFoot(waypoints) {
  const coords = waypoints.map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(';');
  const url = `${OSRM}/${coords}?overview=full&geometries=geojson`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.code === 'Ok' && json.routes?.[0]) return json.routes[0].geometry.coordinates;
    } catch {
      /* retry */
    }
    await sleep(600);
  }
  return null;
}

function decimate(coords, minGapM) {
  const out = [];
  let last = null;
  for (const [lng, lat] of coords) {
    if (last) {
      const dx = (lng - last.lng) * mPerDegLng(lat);
      const dy = (lat - last.lat) * M_PER_DEG_LAT;
      if (Math.hypot(dx, dy) < minGapM) continue;
    }
    const p = { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
    out.push(p);
    last = p;
  }
  return out;
}

for (const [name, waypoints] of Object.entries(ZONES)) {
  const closed = [...waypoints, waypoints[0]]; // ferme la boucle
  const coords = await routeFoot(closed);
  await sleep(300);
  if (!coords) {
    console.error(`SKIP ${name}`);
    continue;
  }
  const line = decimate(coords, 12);
  const body = line.map((p) => `  { lat: ${p.lat}, lng: ${p.lng} },`).join('\n');
  console.log(`export const ${name}: readonly LatLngPoint[] = [\n${body}\n];\n`);
  console.error(`ok ${name} → ${line.length} pts`);
}
