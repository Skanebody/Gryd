/**
 * GRYD — génération des icônes de marque depuis LA géométrie du logo.
 *
 * Pourquoi un script et pas des PNG posés à la main : l'icône existe en 4
 * déclinaisons (iOS, foreground Android, splash, favicon web) qui doivent rester
 * RIGOUREUSEMENT la même lettre. Un fichier retouché séparément dérive au
 * premier ajustement — ici, une seule source de vérité géométrique, et
 * `node scripts/build-brand-icons.mjs` régénère tout.
 *
 * ⚠ Le G est reconstruit GÉOMÉTRIQUEMENT (arêtes nettes, terminaisons coupées),
 * PAS avec le tracé arrondi de `LogoRouteMark`. Ce sont deux objets différents :
 * l'animation est un PARCOURS (extrémités rondes, §B) ; l'icône est la LETTRE.
 * Les confondre donnerait une icône molle, illisible à 40 px.
 *
 * Contraintes de plateforme respectées :
 * - Android adaptive : le foreground est réduit à ~0,72 pour tenir dans la zone
 *   sûre (le système masque hors d'un cercle de ~66 % — un mark pleine taille
 *   se ferait rogner les flancs).
 * - iOS : pas de transparence, pas de coins arrondis (le système les applique).
 *
 * La sortie est du binaire versionné : ne pas l'éditer, regénérer.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const NOIR = '#0A0B09';
const CHARTREUSE = '#B4FF0D';

/**
 * Géométrie du G, en fractions du côté du canevas. Relevée sur le logo fourni
 * par le fondateur (21/07/2026). Un seul endroit à toucher si la marque bouge.
 */
const G = {
  cx: 0.5,
  cy: 0.5,
  rx: 0.29, // demi-largeur extérieure — l'ellipse est LARGE, pas circulaire
  ry: 0.1875,
  stroke: 0.078,
  barLeft: 0.545, // bord gauche de la barre horizontale
  openFromDeg: -38, // terminaison haute de l'arc (l'ouverture du G)
};

/**
 * Programme Python (Pillow) : dessiné en SUPER-ÉCHANTILLONNAGE ×4 puis réduit
 * en LANCZOS. Sans ça, les bords de l'ellipse crénellent salement à 1024, et le
 * défaut se voit surtout aux petites tailles où l'icône est réellement regardée.
 */
const PY = `
import math, sys, json
from PIL import Image, ImageDraw

cfg = json.loads(sys.argv[1])
S = cfg["size"]; SS = 4; N = S * SS
g = cfg["g"]; scale = cfg["scale"]
# JSON rend des listes ; Pillow exige des tuples pour les couleurs.
bg = tuple(cfg["bg"]) if cfg["bg"] else None
fg = tuple(cfg["fg"])
TRANSP = (0, 0, 0, 0)

img = Image.new("RGBA", (N, N), bg if bg else TRANSP)
d = ImageDraw.Draw(img)

cx, cy = g["cx"] * N, g["cy"] * N
rx, ry = g["rx"] * N * scale, g["ry"] * N * scale
st = g["stroke"] * N * scale
irx, iry = rx - st, ry - st

# Anneau : ellipse pleine, puis on recreuse le contre-forme.
d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fg)
d.ellipse([cx - irx, cy - iry, cx + irx, cy + iry], fill=bg if bg else TRANSP)

# La barre, avant l'ouverture : c'est elle qui borne le bas de l'encoche.
bar_h = st
bar_l = g["barLeft"] * N
if scale != 1.0:
    bar_l = cx + (bar_l - g["cx"] * N) * scale
bar_top, bar_bot = cy - bar_h / 2, cy + bar_h / 2
d.rectangle([bar_l, bar_top, cx + rx, bar_bot], fill=fg)

# L'OUVERTURE du G : un coin radial retiré entre la terminaison haute de l'arc
# et le dessus de la barre. C'est ce qui distingue un G d'un O barré.
a0 = math.radians(g["openFromDeg"])
a1 = -math.asin(min(1.0, (bar_h / 2) / ry))
far = max(N, rx * 3)
poly = [(cx, cy)]
steps = 48
for i in range(steps + 1):
    a = a0 + (a1 - a0) * (i / steps)
    poly.append((cx + far * math.cos(a), cy + far * math.sin(a)))
d.polygon(poly, fill=bg if bg else TRANSP)

img = img.resize((S, S), Image.LANCZOS)

# Le rééchantillonnage LANCZOS SURTIRE : il produit des pixels plus clairs que
# la chartreuse et plus foncés que le noir (ringing). Ce sont littéralement des
# couleurs hors charte. On reprojette chaque pixel sur le SEGMENT entre les deux
# tokens, en bornant t a [0,1] : l'anticrenelage est conserve, l'overshoot non.
px = img.load()
c0 = fg
c1 = bg if bg else fg
if bg:
    dv = [c1[i] - c0[i] for i in range(3)]
    den = sum(v * v for v in dv) or 1
    for yy in range(S):
        for xx in range(S):
            r, gg, b, a = px[xx, yy]
            t = sum((v - c0[i]) * dv[i] for i, v in enumerate((r, gg, b))) / den
            t = 0.0 if t < 0 else (1.0 if t > 1 else t)
            px[xx, yy] = (
                int(round(c0[0] + dv[0] * t)),
                int(round(c0[1] + dv[1] * t)),
                int(round(c0[2] + dv[2] * t)),
                a,
            )
if cfg["opaque"]:
    flat = Image.new("RGB", (S, S), bg)
    flat.paste(img, mask=img.split()[3])
    flat.save(cfg["out"])
else:
    img.save(cfg["out"])
print(cfg["out"])
`;

const tmp = mkdtempSync(join(tmpdir(), 'gryd-icons-'));
const script = join(tmp, 'draw.py');
writeFileSync(script, PY);

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

const jobs = [
  {
    label: 'iOS / store — la marque telle quelle',
    out: 'apps/mobile/assets/icon.png',
    size: 1024,
    scale: 1,
    bg: hex(CHARTREUSE),
    fg: hex(NOIR),
    opaque: true, // iOS refuse l'alpha sur l'icône du store
  },
  {
    label: 'Android adaptive (foreground) — réduit pour la zone sûre',
    out: 'apps/mobile/assets/adaptive-icon.png',
    size: 1024,
    scale: 0.72,
    bg: null, // transparent : le système pose le backgroundColor
    fg: hex(NOIR),
    opaque: false,
  },
  {
    label: 'Splash — chartreuse sur noir (jamais l’inverse : contraste)',
    out: 'apps/mobile/assets/splash.png',
    size: 1024,
    scale: 0.62,
    bg: null,
    fg: hex(CHARTREUSE),
    opaque: false,
  },
  {
    // Android teinte cette image et n'en garde QUE l'alpha : toute couleur y est
    // ignoree. Un PNG couleur donne un carre blanc plein dans la barre d'etat.
    label: 'Notification Android — silhouette (alpha seul, le systeme teinte)',
    out: 'apps/mobile/assets/notification-icon.png',
    size: 256,
    scale: 0.78,
    bg: null,
    fg: [255, 255, 255],
    opaque: false,
  },
  {
    // Android 13+ « icones thematiques » : meme silhouette, le lanceur la teinte
    // selon le fond d'ecran de l'utilisateur (Material You).
    label: 'Android monochrome (Material You)',
    out: 'apps/mobile/assets/adaptive-icon-monochrome.png',
    size: 1024,
    scale: 0.72,
    bg: null,
    fg: [255, 255, 255],
    opaque: false,
  },
  {
    // A 16 px, la marque a la taille du logo se delite (contre-forme bouchee,
    // barre detachee). Le favicon assume donc un G PLUS GRAND que l'icone : ce
    // n'est pas la meme surface, ce n'est pas la meme distance de lecture.
    label: 'Favicon web (marque agrandie — lu a 16 px)',
    out: 'apps/mobile/assets/favicon.png',
    size: 256,
    scale: 1.34,
    bg: hex(CHARTREUSE),
    fg: hex(NOIR),
    opaque: true,
  },
];

for (const j of jobs) {
  const cfg = JSON.stringify({ ...j, g: G });
  execFileSync('python3', [script, cfg], { stdio: 'inherit' });
  console.log(`  ${j.label}`);
}
console.log('\nIcônes régénérées depuis la géométrie du logo (G ci-dessus).');
