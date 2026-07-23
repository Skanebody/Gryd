#!/usr/bin/env node
/**
 * Génère packages/shared/src/cities-eu.ts : le RÉFÉRENTIEL des villes d'Europe.
 *
 * CE QUE C'EST — une donnée GÉOGRAPHIQUE réelle, importée d'une source ouverte,
 * exactement comme les contours geo.api.gouv.fr déjà embarqués par la migration
 * 0033_real_city_zones.sql. Un référentiel dit « cette ville existe, elle est
 * là ». Il ne dit RIEN sur le jeu.
 *
 * CE QUE CE N'EST PAS — de la donnée de jeu fabriquée. Aucun classement, aucun
 * territoire, aucun rival, aucune densité, aucune « activité » n'est attaché à
 * ces villes : personne ne les a produits. CLAUDE.md est catégorique et
 * AMENDEMENT-35 §6 a déjà été RÉTRACTÉ pour cette faute. Une ville ouverte et
 * vide doit se dire vide.
 *
 * SOURCE — GeoNames `cities15000` (toutes les localités de plus de 15 000
 * habitants), licence **Creative Commons Attribution 4.0** confirmée dans le
 * readme.txt du dump lui-même :
 *   « This work is licensed under a Creative Commons Attribution 4.0 License,
 *     see https://creativecommons.org/licenses/by/4.0/ »
 * L'attribution CC BY est une OBLIGATION DE LICENCE, pas un détail : elle est
 * portée par `EU_CITIES_SOURCE.attribution` dans le fichier généré et doit être
 * affichée sur une surface de crédits.
 *
 * FILTRE EUROPE — deux critères, tous deux DÉCLARÉS, aucun jugement au cas par cas :
 *   1. la liste des pays vient de `countryInfo.txt` (colonne `continent` == 'EU')
 *      du MÊME dump — aucun pays n'est ajouté ni retiré à la main ;
 *   2. GeoNames classe TOUTE la Russie en continent 'EU', jusqu'à Vladivostok :
 *      le critère 1 seul faisait entrer 267 villes transouraliennes (Novossibirsk
 *      à 82,9°E, Krasnoïarsk à 92,9°E…) dans un fichier qui s'annonce européen.
 *      On applique donc UNE borne supplémentaire, mécanique et déclarée :
 *      longitude ≤ `EUROPE_EAST_LIMIT_DEG`, la limite conventionnelle
 *      Europe/Asie de l'Oural. Elle coupe au ras d'Ekaterinbourg (60,6°E), qui
 *      chevauche l'Oural — c'est le bord assumé de la convention, pas un
 *      arbitrage sur cette ville en particulier.
 * Mieux vaut un périmètre légèrement discutable mais ÉNONCÉ qu'un fichier qui
 * promet « l'Europe » et livre la Sibérie.
 *
 * IDENTIFIANT — `geonameid`. C'est CRITIQUE : `city_zones.city_id` est la clé de
 * hachage du tirage de la Zone du Jour (migration 0052) ; un identifiant
 * instable (slug du nom, index de ligne) casserait la reproductibilité du
 * le geonameid désambiguë aussi les homonymes (Brest FR et Brest BY coexistent
 * dans le référentiel et restent tous deux choisissables, départagés par le code
 * pays). Aucun décompte n'est avancé ici : il dépendrait d'une définition
 * d'« homonyme » (exacte ? après normalisation des accents ? inter-pays ?) que
 * ce fichier ne fixe pas — un chiffre non reproductible n'a rien à faire dans un
 * fichier d'autorité.
 * (Brest FR/BY, Bergen NO/DE/NL, Bar ME/UA…), que le code pays affiche à l'écran.
 *
 * ARBITRAGE DE TAILLE — deux mesures, et il faut les distinguer :
 *
 *   CE QUI EST RÉELLEMENT LIVRÉ (mesuré le 23/07/2026 sur le fichier généré,
 *   `wc -c` et `gzip -c | wc -c`, donc APRÈS la borne de l'Oural) :
 *     · cities15000/Europe → 7 870 villes, 53 pays,
 *       345 853 octets bruts (346 Ko) / 176 919 octets gzip (177 Ko).
 *   Le compte fait foi dans le fichier lui-même : `EU_CITIES_COUNT`.
 *
 *   CE QUI A SERVI À CHOISIR LE DUMP (mesuré avant que la borne de l'Oural ne
 *   soit posée — 267 villes transouraliennes étaient alors incluses ; ces
 *   volumes ne décrivent donc AUCUN fichier livré, ils comparent des dumps) :
 *   · cities15000 → 8 137 villes d'Europe, 353 Ko bruts / 165 Ko gzip ← RETENU
 *   · cities5000  → 21 917 villes d'Europe, 944 Ko bruts / 422 Ko gzip (×2,7)
 *   · top 2 000   → ~90 Ko, mais remonte le plancher de population de 15 000 à
 *                   ~45 000 habitants : cela supprimerait les villes moyennes où
 *                   vivent les vrais crews. Le gain ne justifie pas l'amputation.
 * On embarque donc TOUT cities15000/Europe, sans troncature. Le seuil reste
 * réversible : ce script prend le dump en argument, passer à cities5000 est une
 * commande, pas une réécriture.
 *
 * FORMAT DE SORTIE — une seule chaîne « packée » (`EU_CITIES_PACKED`), un
 * enregistrement par ligne, champs séparés par `|` :
 *     geonameid|nom|codePays|lat|lng|population
 * Un littéral de chaîne unique se parse bien plus vite qu'un littéral d'objet de
 * 7 870 entrées, et le fichier reste diffable ligne à ligne dans git. Le parsing
 * est fait à la demande par `parsePackedCities()` (packages/shared/src/cities.ts).
 *
 * ─ CE QUI RESTE EN SUSPENS (mesuré ce jour, pas supposé) ────────────────────
 * 1. EXONYMES ABSENTS. La colonne `name` de GeoNames porte le nom local ou
 *    anglais. Une recherche en français échoue donc silencieusement sur les
 *    villes dont le nom français diffère — VÉRIFIÉ sur le référentiel généré :
 *      « londres » → aucun résultat (il faut taper « london »)
 *      « bruxelles » → aucun (« brussels »)   « anvers » → aucun (« antwerp »)
 *      « cracovie » → aucun (« krakow »)      « lisbonne » → aucun (« lisbon »)
 *      « copenhague » → aucun (« copenhagen ») « séville » → aucun (« sevilla »)
 *    Les accents et la casse, eux, sont bien couverts (« zurich » trouve Zürich,
 *    « malaga » trouve Málaga) : c'est un problème d'EXONYME, pas de
 *    normalisation. Un utilisateur français qui tape « Bruxelles » et ne trouve
 *    rien conclura que sa ville n'existe pas — l'app lui aura menti par omission.
 *    CORRECTIF IDENTIFIÉ : `alternateNamesV2.zip` (193 Mo au 23/07/2026) porte
 *    une colonne `isolanguage` ; en extraire les seules langues de GRYD
 *    (fr/en/es/de/pt) pour les 7 870 geonameids retenus donnerait un 7e champ
 *    packé. Le parseur l'ACCEPTE DÉJÀ (il exige « au moins 6 champs », pas
 *    exactement 6) : l'ajout ne cassera aucun consommateur déployé.
 * 2. (LEVÉ le 23/07/2026 — laissé écrit pour que la relecture sache que la
 *    question a été posée.) La surface de crédits manquait : `attribution`
 *    existait dans le code et n'était rendue nulle part, donc l'obligation CC BY
 *    n'était pas tenue. Elle l'est désormais — `apps/mobile/app/credits-donnees.tsx`
 *    affiche `EU_CITIES_SOURCE.attribution`, la licence, son URL, la date de
 *    génération et le dump, LUS du fichier généré (jamais retapés, donc jamais
 *    désynchronisés) ; la page est atteignable depuis Réglages → Légal
 *    (`apps/mobile/app/parametres/[section].tsx`). Elle crédite aussi
 *    geo.api.gouv.fr / Etalab pour les contours de 0033.
 *
 * USAGE
 *   node scripts/generate-eu-cities.mjs                  # télécharge le dump
 *   node scripts/generate-eu-cities.mjs --dump <cities15000.txt> --countries <countryInfo.txt>
 *
 * Si le réseau échoue et qu'aucun chemin local n'est fourni, le script S'ARRÊTE
 * en erreur. Il ne fabrique jamais de ville de repli.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'packages', 'shared', 'src', 'cities-eu.ts');

const DUMP_URL = 'https://download.geonames.org/export/dump/cities15000.zip';
const COUNTRY_URL = 'https://download.geonames.org/export/dump/countryInfo.txt';
const README_URL = 'https://download.geonames.org/export/dump/readme.txt';
const DATASET = 'cities15000';
const LICENSE = 'CC BY 4.0';
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

/** Séparateurs du format packé — MIROIR de packages/shared/src/cities.ts. */
const RECORD_SEP = '\n';
const FIELD_SEP = '|';
/** Décimales conservées sur lat/lng : 4 ≈ 11 m, largement assez pour cadrer une
 * carte et poser un disque d'aire de jeu de plusieurs kilomètres de rayon. */
const COORD_DECIMALS = 4;
/**
 * Limite EST du périmètre européen (degrés de longitude) : la frontière
 * conventionnelle Europe/Asie de l'Oural. Nécessaire parce que GeoNames range
 * toute la Russie en continent 'EU'. Critère DÉCLARÉ, appliqué mécaniquement à
 * toutes les villes sans exception.
 */
const EUROPE_EAST_LIMIT_DEG = 60;

// ─── args ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

// ─── ZIP minimal (lecture par le répertoire central) ────────────────────────
/**
 * Extrait un membre d'une archive ZIP.
 *
 * On passe par le RÉPERTOIRE CENTRAL et non par les en-têtes locaux : les dumps
 * GeoNames sont écrits en flux, donc leurs en-têtes locaux portent le bit 3
 * (« taille différée ») et annoncent une taille compressée nulle. Seul le
 * répertoire central, en fin d'archive, porte les vraies tailles.
 * Membres non chiffrés, stored (0) ou deflate (8) uniquement.
 */
function unzipMember(buf, wantedName) {
  // End of Central Directory : signature PK\x05\x06, cherchée depuis la fin
  // (le commentaire d'archive, s'il existe, la précède de 0 à 65 535 octets).
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 0xffff; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('ZIP: répertoire central introuvable (EOCD)');

  const entries = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);

  for (let i = 0; i < entries; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('ZIP: entrée centrale invalide');
    const method = buf.readUInt16LE(off + 10);
    const compressedSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);

    if (name === wantedName) {
      // Les longueurs nom/extra de l'en-tête LOCAL peuvent différer du central.
      const lNameLen = buf.readUInt16LE(localOff + 26);
      const lExtraLen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + compressedSize);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      throw new Error(`ZIP: méthode de compression ${method} non supportée`);
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`ZIP: membre « ${wantedName} » introuvable`);
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// ─── Entrées : chemins locaux, sinon téléchargement ─────────────────────────
const dumpPath = arg('dump');
const countriesPath = arg('countries');

let dumpText;
let countryText;
let licenseLine;

if (dumpPath && countriesPath) {
  dumpText = readFileSync(dumpPath, 'utf8');
  countryText = readFileSync(countriesPath, 'utf8');
  licenseLine = `(licence lue hors-ligne : ${LICENSE})`;
} else {
  console.log(`↓ ${DUMP_URL}`);
  const zip = await fetchBuffer(DUMP_URL);
  dumpText = unzipMember(zip, `${DATASET}.txt`).toString('utf8');

  // La licence est LUE dans le readme du dump, pas supposée. Il n'est PAS dans
  // l'archive (qui ne contient que cities15000.txt) : il est à la racine de
  // l'export GeoNames, à côté de tous les dumps qu'il couvre.
  console.log(`↓ ${README_URL}`);
  const readme = (await fetchBuffer(README_URL)).toString('utf8');
  const found = readme.split('\n').find((l) => /creative commons/i.test(l));
  if (!found || !/attribution/i.test(found)) {
    throw new Error(
      `Licence CC BY non confirmée dans le readme.txt du dump — arrêt. ` +
        `Vérifier ${README_URL} avant d'embarquer la donnée.`,
    );
  }
  licenseLine = found.trim();
  console.log(`✓ licence confirmée dans le readme du dump : ${licenseLine}`);

  console.log(`↓ ${COUNTRY_URL}`);
  countryText = (await fetchBuffer(COUNTRY_URL)).toString('utf8');
}

// ─── Pays d'Europe : DÉRIVÉS de countryInfo.txt (colonne continent) ─────────
const euCountries = new Set();
for (const line of countryText.split('\n')) {
  if (!line || line.startsWith('#')) continue;
  const f = line.split('\t');
  if (f[8] === 'EU') euCountries.add(f[0]);
}
if (euCountries.size === 0) throw new Error('countryInfo.txt : aucun pays continent=EU — arrêt.');
console.log(`✓ ${euCountries.size} pays européens dérivés de countryInfo.txt`);

// ─── Filtrage + réduction aux 6 champs utiles ──────────────────────────────
// Colonnes cities15000 (geonames readme) : 0 geonameid, 1 name, 4 latitude,
// 5 longitude, 8 country code, 14 population.
const cities = [];
let beyondUral = 0;
for (const line of dumpText.split('\n')) {
  if (!line) continue;
  const f = line.split('\t');
  const country = f[8];
  if (!euCountries.has(country)) continue;
  // Critère 2 : borne de l'Oural (voir EUROPE_EAST_LIMIT_DEG).
  if (Number(f[5]) > EUROPE_EAST_LIMIT_DEG) {
    beyondUral++;
    continue;
  }
  const id = f[0];
  const name = f[1];
  const lat = Number(f[4]);
  const lng = Number(f[5]);
  const population = Number(f[14]);
  if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`Ligne du dump illisible (geonameid ${id || '?'}) — arrêt, aucune ville inventée.`);
  }
  // Le format packé est positionnel : un nom porteur d'un séparateur le
  // casserait silencieusement. On échoue fort plutôt que de mutiler la donnée.
  if (name.includes(FIELD_SEP) || name.includes(RECORD_SEP) || name.includes('\r')) {
    throw new Error(`Nom incompatible avec le format packé : « ${name} » (geonameid ${id})`);
  }
  cities.push({ id, name, country, lat, lng, population: Number.isFinite(population) ? population : 0 });
}
if (cities.length === 0) throw new Error('Aucune ville européenne extraite — arrêt.');
console.log(`✓ ${cities.length} villes retenues (${beyondUral} écartées au-delà de l'Oural)`);

// Tri DÉTERMINISTE : population décroissante (les grandes villes en tête, la
// recherche les remonte naturellement), geonameid croissant pour départager.
cities.sort((a, b) => b.population - a.population || Number(a.id) - Number(b.id));

const packed = cities
  .map((c) =>
    [
      c.id,
      c.name,
      c.country,
      c.lat.toFixed(COORD_DECIMALS),
      c.lng.toFixed(COORD_DECIMALS),
      String(c.population),
    ].join(FIELD_SEP),
  )
  .join(RECORD_SEP);

// Littéral template : le fichier reste diffable ligne à ligne. Échappement
// défensif de ` \ et ${ (aucun nom GeoNames n'en porte, mais on ne parie pas).
const escaped = packed.replace(/[\\`]/g, '\\$&').replace(/\$\{/g, '\\${');

const countries = [...new Set(cities.map((c) => c.country))].sort();
const generatedAt = new Date().toISOString().slice(0, 10);

const out = `// GÉNÉRÉ par scripts/generate-eu-cities.mjs — ne pas éditer à la main.
/**
 * GRYD — RÉFÉRENTIEL DES VILLES D'EUROPE (donnée géographique réelle).
 *
 * « Il faut le fichier qui répertorie toutes les villes en Europe pour pouvoir
 *   choisir la ville que l'on souhaite et ne pas en inventer une. »
 *
 * ─ CE QUE CE FICHIER AFFIRME ────────────────────────────────────────────────
 * Que ces villes EXISTENT et où elles se trouvent. Rien d'autre. Il ne porte
 * AUCUN classement, AUCUN territoire, AUCUN rival, AUCUNE densité, AUCUNE
 * activité : personne ne les a produits, et les inventer serait la faute pour
 * laquelle AMENDEMENT-35 §6 a été rétracté. Une ville ouverte et vide doit se
 * DIRE vide (« personne ne court encore ici — sois le premier »), jamais
 * afficher un « 0 » nu ni un repli fabriqué.
 *
 * ─ ATTRIBUTION (OBLIGATION DE LICENCE) ──────────────────────────────────────
 * Donnée GeoNames sous licence ${LICENSE}. \`EU_CITIES_SOURCE.attribution\` doit
 * être affichée sur une surface de crédits de données visible par l'utilisateur.
 * Ce n'est pas un détail de politesse : c'est la condition de l'usage.
 *
 * ─ IDENTIFIANT ──────────────────────────────────────────────────────────────
 * \`geonameid\` (stable dans le temps, désambiguë les homonymes européens). C'est
 * lui qui sert de \`city_zones.city_id\` pour toute ville ouverte depuis ce
 * référentiel — donc la clé de hachage du tirage de la Zone du Jour (0052) : un
 * identifiant instable casserait la reproductibilité du tirage.
 * Les villes de démarrage (\`CITIES\` dans game-rules.ts) gardent leurs
 * identifiants historiques en toutes lettres (\`paris\`, \`lille\`) : elles ont été
 * provisionnées avant ce référentiel, avec de VRAIS contours (migration 0033).
 *
 * Parsing : \`parsePackedCities(EU_CITIES_PACKED)\` — packages/shared/src/cities.ts.
 */

/** Provenance, licence et volumétrie du référentiel embarqué. */
export const EU_CITIES_SOURCE = {
  /** Dump GeoNames utilisé (localités de plus de 15 000 habitants). */
  dataset: ${JSON.stringify(DATASET)},
  url: ${JSON.stringify(DUMP_URL)},
  /** Licence LUE dans le readme.txt du dump, pas supposée. */
  license: ${JSON.stringify(LICENSE)},
  licenseUrl: ${JSON.stringify(LICENSE_URL)},
  licenseNotice: ${JSON.stringify(licenseLine)},
  /** À AFFICHER sur la surface de crédits de données (obligation CC BY). */
  attribution: 'Villes : GeoNames (geonames.org) — licence CC BY 4.0',
  /**
   * Périmètre, DÉRIVÉ et déclaré — jamais un tri à la main ville par ville :
   * pays de countryInfo.txt (continent = EU), puis borne est de l'Oural
   * (GeoNames range toute la Russie en 'EU', Vladivostok compris).
   */
  continentFilter: 'countryInfo.txt · continent = EU · longitude ≤ ${EUROPE_EAST_LIMIT_DEG}°E (Oural)',
  /** Limite est du périmètre européen retenu (degrés de longitude). */
  eastLimitDeg: ${EUROPE_EAST_LIMIT_DEG},
  generatedAt: ${JSON.stringify(generatedAt)},
  cityCount: ${cities.length},
  countryCount: ${countries.length},
} as const;

/** Nombre de villes du référentiel (redondant avec EU_CITIES_SOURCE, pratique en garde de test). */
export const EU_CITIES_COUNT = ${cities.length};

/** Codes pays ISO présents dans le référentiel, triés. */
export const EU_CITIES_COUNTRY_CODES: readonly string[] = ${JSON.stringify(countries)};

/**
 * Référentiel packé : un enregistrement par ligne, champs séparés par \`|\` —
 * \`geonameid|nom|codePays|lat|lng|population\`. Trié par population décroissante.
 * Une chaîne unique plutôt qu'un littéral d'objet : ${cities.length} entrées se parsent
 * bien plus vite ainsi, et le parsing n'a lieu que si un écran le demande.
 */
export const EU_CITIES_PACKED = \`${escaped}\`;
`;

writeFileSync(OUT, out);
console.log(
  `✓ ${OUT}\n  ${cities.length} villes · ${countries.length} pays · ` +
    `${(Buffer.byteLength(out) / 1024).toFixed(0)} Ko`,
);
