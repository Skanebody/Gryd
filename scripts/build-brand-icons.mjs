/**
 * GRYD — génération des icônes de marque depuis LE VRAI LOGO.
 *
 * SOURCE UNIQUE : `brand/logo-gryd.png` — le master fourni par le fondateur
 * (2000², G noir sur chartreuse, opaque). Toutes les déclinaisons en sortent.
 *
 * ─── Pourquoi cette réécriture (22/07/2026) ─────────────────────────────────
 * Ce script RECONSTRUISAIT le G géométriquement (ellipse + barre + coin retiré),
 * d'après des proportions relevées à l'œil sur le logo. L'approximation était
 * FAUSSE et visible : la barre horizontale sortait biseautée, avec une encoche
 * près du centre. C'était l'icône destinée à l'App Store. On ne redessine plus
 * la marque : on la DÉCOUPE du master.
 *
 * Méthode : le master n'a que deux couleurs, donc un masque d'encre s'en extrait
 * proprement — chaque pixel est projeté sur le segment chartreuse→noir (LUT sur
 * la luminance), ce qui conserve l'anticrénelage d'origine au lieu de seuiller
 * brutalement. Le masque est ensuite recadré sur la lettre, mis à l'échelle
 * demandée, colorisé, et posé au centre.
 *
 * Contraintes de plateforme respectées :
 * - iOS : réduction DIRECTE du master (on garde le cadrage officiel de la marque),
 *   opaque, sans transparence ni coins arrondis (le système les applique).
 * - Android adaptive : le système masque hors d'un cercle de ~66 % → la lettre est
 *   ramenée à ~42 % de la largeur du canevas pour tenir dans la zone sûre.
 * - Notification Android : l'image est réduite à son ALPHA et teintée par le
 *   système — toute couleur y est ignorée (un PNG couleur = carré blanc plein).
 * - Favicon : la marque EXACTE, sans intermédiaire (lu à 16 px).
 *
 * La sortie est du binaire versionné : ne pas l'éditer, regénérer.
 *   node scripts/build-brand-icons.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MASTER = 'brand/logo-gryd.png';
const NOIR = '#0A0B09';
const CHARTREUSE = '#B4FF0D';
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/**
 * Programme Python (Pillow). Deux modes :
 *  - `direct` : simple réduction LANCZOS du master (cadrage officiel conservé) ;
 *  - `mark`   : extraction du masque d'encre, recadrage sur la lettre, mise à
 *               l'échelle, colorisation, centrage sur un canevas transparent.
 */
const PY = `
import json, sys
from PIL import Image

cfg = json.loads(sys.argv[1])
S = cfg["size"]
src = Image.open(cfg["src"]).convert("RGB")

if cfg["mode"] == "direct":
    src.resize((S, S), Image.Resampling.LANCZOS).save(cfg["out"], "PNG", optimize=True)
    print(cfg["out"])
    sys.exit(0)

# --- Masque d'encre -----------------------------------------------------------
# Le master est bicolore : la luminance suffit a separer l'encre du fond. On mappe
# [lum_encre .. lum_fond] -> [255 .. 0] via une LUT (rapide, et surtout PROGRESSIVE :
# les pixels intermediaires du bord gardent leur valeur -> anticrenelage preserve).
LO, HI = cfg["inkLum"], cfg["bgLum"]
lut = []
for v in range(256):
    t = (HI - v) / float(HI - LO)
    lut.append(int(round(min(1.0, max(0.0, t)) * 255)))
mask = src.convert("L").point(lut)

box = mask.getbbox()  # recadre sur la LETTRE : l'echelle se compte sur elle, pas
if box:               # sur la marge du master (sinon toutes les tailles derivent)
    mask = mask.crop(box)

mw, mh = mask.size
tw = int(round(S * cfg["markWidth"]))
th = max(1, int(round(tw * mh / float(mw))))
mask = mask.resize((tw, th), Image.Resampling.LANCZOS)

fg = tuple(cfg["fg"])
canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ink = Image.new("RGBA", (tw, th), fg + (255,))
canvas.paste(ink, ((S - tw) // 2, (S - th) // 2), mask)

if cfg["bg"]:
    flat = Image.new("RGB", (S, S), tuple(cfg["bg"]))
    flat.paste(canvas, mask=canvas.split()[3])
    flat.save(cfg["out"], "PNG", optimize=True)
else:
    canvas.save(cfg["out"], "PNG", optimize=True)
print(cfg["out"])
`;

const tmp = mkdtempSync(join(tmpdir(), 'gryd-icons-'));
const script = join(tmp, 'draw.py');
writeFileSync(script, PY);

// Luminances des deux tokens (ITU-R 601, comme PIL "L") : bornes du masque.
const lum = ([r, g, b]) => Math.round(0.299 * r + 0.587 * g + 0.114 * b);
const INK_LUM = lum(hex(NOIR));
const BG_LUM = lum(hex(CHARTREUSE));

/**
 * `markWidth` = largeur de la LETTRE en fraction du canevas. Dans le master, la
 * lettre occupe ~0,56 du carré ; les variantes qui doivent rentrer dans une zone
 * sûre partent de là (0,56 × le retrait voulu).
 */
const jobs = [
  {
    label: 'iOS / store — la marque telle quelle (cadrage officiel)',
    mode: 'direct',
    out: 'apps/mobile/assets/icon.png',
    size: 1024,
  },
  {
    label: 'Android adaptive (foreground) — réduit pour la zone sûre',
    mode: 'mark',
    out: 'apps/mobile/assets/adaptive-icon.png',
    size: 1024,
    markWidth: 0.42,
    fg: hex(NOIR),
    bg: null, // transparent : le système pose le backgroundColor
  },
  {
    label: 'Splash — chartreuse sur noir (jamais l’inverse : contraste)',
    mode: 'mark',
    out: 'apps/mobile/assets/splash.png',
    size: 1024,
    markWidth: 0.36,
    fg: hex(CHARTREUSE),
    bg: null,
  },
  {
    label: 'Notification Android — silhouette (alpha seul, le système teinte)',
    mode: 'mark',
    out: 'apps/mobile/assets/notification-icon.png',
    size: 256,
    markWidth: 0.45,
    fg: [255, 255, 255],
    bg: null,
  },
  {
    label: 'Android monochrome (Material You)',
    mode: 'mark',
    out: 'apps/mobile/assets/adaptive-icon-monochrome.png',
    size: 1024,
    markWidth: 0.42,
    fg: [255, 255, 255],
    bg: null,
  },
  // Famille FAVICON : la marque EXACTE, réduite du master. Aucune contrainte de
  // zone sûre ici — donc aucune raison de passer par une reconstruction.
  { label: 'Favicon mobile-web (Expo)', mode: 'direct', out: 'apps/mobile/assets/favicon.png', size: 256 },
  { label: 'Favicon site web (Next.js)', mode: 'direct', out: 'apps/web/app/icon.png', size: 256 },
  { label: 'Apple touch icon site web', mode: 'direct', out: 'apps/web/app/apple-icon.png', size: 1024 },
];

for (const j of jobs) {
  const cfg = JSON.stringify({ src: MASTER, inkLum: INK_LUM, bgLum: BG_LUM, ...j });
  execFileSync('python3', [script, cfg], { stdio: 'inherit' });
  console.log(`  ${j.label}`);
}

console.log(`\nIcônes régénérées depuis le master ${MASTER} (le vrai logo).`);
