/**
 * GRYD — trace GPX de DÉMO partagée (native + web). Un court fichier .gpx réel
 * (3 points horodatés au format standard) sert à prouver le parseur PUR
 * (gpx-parse.ts) de bout en bout dans l'aperçu, SANS sélecteur de fichier natif
 * (expo-document-picker hors stack, requiert un dev build — O8). Aucune valeur
 * de jeu ici : c'est un échantillon d'illustration, la décision capture reste
 * 100 % serveur (ingest_run).
 */

/** Petit GPX valide (Boulevard de Sébastopol, Paris) — 3 <trkpt> horodatés. */
export const DEMO_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GRYD demo">
  <trk>
    <name>Demo run</name>
    <trkseg>
      <trkpt lat="48.8620" lon="2.3510">
        <ele>35.0</ele>
        <time>2026-07-01T07:00:00Z</time>
      </trkpt>
      <trkpt lat="48.8631" lon="2.3522">
        <ele>36.2</ele>
        <time>2026-07-01T07:00:30Z</time>
      </trkpt>
      <trkpt lat="48.8642" lon="2.3535">
        <ele>35.8</ele>
        <time>2026-07-01T07:01:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;
