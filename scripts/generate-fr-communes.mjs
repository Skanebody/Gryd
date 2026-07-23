/**
 * GRYD — génère le référentiel EXHAUSTIF des communes de France.
 *
 * POURQUOI CE FICHIER EXISTE — le référentiel embarqué (GeoNames cities15000,
 * `cities-eu.ts`) est SEUILLÉ par population (≥ 15 000 hab.) : il ne contiendra
 * JAMAIS les communes rurales. Or le modèle GRYD est devenu « toutes les
 * communes, même en campagne : le premier qui y court l'ouvre ». Il faut donc la
 * liste COMPLÈTE et RÉELLE des communes françaises, pas un sous-ensemble.
 *
 * SOURCE — `geo.api.gouv.fr/communes` (API Découpage administratif, Etalab /
 * DINUM). C'est le registre officiel : 34 969 communes (métropole + DROM), avec
 * nom, code INSEE, centre (GeoJSON [lng, lat]) et population INSEE. Licence
 * Ouverte 2.0 (Etalab) — DÉJÀ créditée dans le projet (contours de 0033,
 * `credits-donnees.tsx`). Vérifié le 23/07/2026 : 34 969 communes, 100 % avec un
 * centre, 6 sans population (→ NULL, jamais un 0 fabriqué).
 *
 * CE QU'IL PRODUIT — la migration `0068_fr_communes_reference.sql` EN ENTIER :
 * une table de référence `public.fr_communes` (lecture publique, écriture
 * service-role), son seed (34 969 lignes réelles), et la RPC `search_communes`
 * qui sert la recherche du sélecteur CÔTÉ SERVEUR (0 Ko ajouté au bundle mobile).
 * La même table servira, au chantier suivant, à résoudre GPS → commune pour
 * l'auto-ouverture par présence.
 *
 * POURQUOI UNE TABLE ET PAS UN FICHIER PACKÉ — embarquer 34 969 communes packées
 * pèserait ~590 Ko gzip (×3 le référentiel EU actuel) pour une recherche devenue
 * SECONDAIRE une fois que la présence ouvre la ville. Une table interrogée par
 * RPC ne coûte rien au bundle ET reste la source de vérité unique (pas de dérive
 * entre un pack et le résolveur GPS).
 *
 * IDENTIFIANT — `city_zones.city_id = 'insee-' + code`. Le code INSEE est un
 * TEXTE : il porte des zéros de tête (« 01001 ») et la Corse (« 2A004 »/« 2B033 »).
 * Le stocker en integer les détruirait. 'insee-' préfixe pour ne pas entrer en
 * collision avec les geonameid EU ni les starters 'paris'/'lille'.
 *
 * RÈGLE MIGRATION — une migration APPLIQUÉE ne se réécrit jamais. Tant que 0068
 * n'est pas déployée, la régénérer est libre. APRÈS déploiement, un rafraîchissement
 * (communes nouvelles/fusionnées) = une NOUVELLE migration, jamais un edit de 0068.
 *
 * SI LE RÉSEAU ÉCHOUE et qu'aucun chemin local n'est fourni, le script S'ARRÊTE
 * en erreur. Il ne fabrique JAMAIS de commune de repli.
 *
 * USAGE
 *   node scripts/generate-fr-communes.mjs                     # télécharge l'API
 *   node scripts/generate-fr-communes.mjs --local communes.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'supabase', 'migrations', '0068_fr_communes_reference.sql');

const API_URL =
  'https://geo.api.gouv.fr/communes?fields=nom,code,centre,population&format=json';
const SOURCE = 'geo.api.gouv.fr (Découpage administratif, Etalab / DINUM)';
const LICENSE = 'Licence Ouverte 2.0 (Etalab)';
const LICENSE_URL = 'https://www.etalab.gouv.fr/licence-ouverte-open-licence';
const GENERATED_AT = '2026-07-23'; // horodatage du snapshot (pas Date.now : reproductible)

// ─── Récupération ────────────────────────────────────────────────────────────
async function loadCommunes() {
  const localIdx = process.argv.indexOf('--local');
  if (localIdx !== -1 && process.argv[localIdx + 1]) {
    const path = process.argv[localIdx + 1];
    console.log(`lecture locale : ${path}`);
    return JSON.parse(readFileSync(path, 'utf8'));
  }
  console.log(`téléchargement : ${API_URL}`);
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`geo.api.gouv.fr a répondu ${res.status} — ARRÊT (aucune commune de repli)`);
  return res.json();
}

// ─── Escape SQL (littéral de chaîne) ─────────────────────────────────────────
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const num = (n) => (Number.isFinite(n) ? String(n) : null);

function buildSeedRows(communes) {
  const rows = [];
  for (const c of communes) {
    const insee = c.code;
    const nom = c.nom;
    const centre = c.centre?.coordinates;
    if (typeof insee !== 'string' || !insee || typeof nom !== 'string' || !nom) {
      throw new Error(`commune illisible (code/nom manquant) : ${JSON.stringify(c)}`);
    }
    if (!Array.isArray(centre) || centre.length !== 2) {
      throw new Error(`commune ${insee} sans centre exploitable — ARRÊT (jamais de coordonnée fabriquée)`);
    }
    const lng = Number(centre[0]);
    const lat = Number(centre[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`commune ${insee} : centre non numérique`);
    }
    // Population absente (6 communes vérifiées) → NULL, JAMAIS un 0 fabriqué.
    const pop = c.population === undefined || c.population === null ? 'null' : num(c.population);
    rows.push(`(${q(insee)},${q(nom)},${lat.toFixed(4)},${lng.toFixed(4)},${pop ?? 'null'})`);
  }
  return rows;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const HEADER = (count) => `-- GRYD — 0068 : référentiel EXHAUSTIF des communes de France (auto-open par présence).
--
-- ⚠️ FICHIER GÉNÉRÉ par scripts/generate-fr-communes.mjs — NE PAS ÉDITER À LA MAIN.
--    Le seed vient de ${SOURCE}.
--    ${LICENSE} — ${LICENSE_URL}
--    Snapshot du ${GENERATED_AT} : ${count} communes réelles (métropole + DROM).
--
-- POURQUOI CETTE TABLE — le référentiel embarqué (GeoNames cities15000) est
-- seuillé à 15 000 hab. : il n'aura JAMAIS les communes rurales. Le modèle GRYD
-- veut « toutes les communes, même en campagne ». Cette table est la source de
-- vérité UNIQUE pour (1) la recherche du sélecteur (RPC search_communes, côté
-- serveur → 0 Ko de bundle) et (2) la résolution GPS → commune de l'auto-open
-- (chantier suivant). Purement ADDITIVE : ne touche ni 0028, ni 0033, ni 0066.
--
-- L'APP NE MENT JAMAIS : données RÉELLES ou VIDES. Population absente = NULL
-- (6 communes), jamais un 0. Aucune commune de repli n'est fabriquée.
--
-- IDENTIFIANT — le code INSEE est un TEXTE (zéros de tête « 01001 », Corse
-- « 2A004 »/« 2B033 »). city_zones.city_id vaudra 'insee-' + code (chantier 2).

-- ─── Normalisation de recherche (accents/casse/ponctuation), pur SQL core ────
-- IMMUTABLE (donc indexable) et SANS extension (unaccent absent en PGlite/tests) :
-- translate mappe 1:1 les diacritiques français, replace neutralise
-- apostrophes/traits d'union/points en espaces (« L'Abergement-Clémenciat » se
-- cherche par « abergement »). La MÊME fonction sert le seed indexé ET la RPC :
-- jamais deux normalisations qui divergent.
create or replace function public.commune_norm(p text)
returns text language sql immutable as $func$
  -- btrim + collapse des espaces : une requête de blancs (« '   ' ») se réduit à
  -- la chaîne VIDE, que la RPC rejette — sinon « %   % » ramènerait des communes
  -- au hasard. IMMUTABLE conservé (translate/regexp_replace/btrim le sont).
  select btrim(regexp_replace(
    translate(
      lower(replace(replace(replace(coalesce(p, ''), '''', ' '), '-', ' '), '.', ' ')),
      'àâäáãéèêëíìîïóòôöõúùûüçñýÿœæ',
      'aaaaaeeeeiiiiooooouuuucnyyoa'
    ),
    '\\s+', ' ', 'g'
  ));
$func$;
comment on function public.commune_norm(text) is
  'Normalisation de recherche commune (accents/casse/ponctuation FR). Immutable, sans extension.';

-- ─── Table de référence ──────────────────────────────────────────────────────
create table if not exists public.fr_communes (
  insee      text primary key check (insee ~ '^[0-9][0-9AB][0-9]{3}$'),
  nom        text not null check (char_length(nom) between 1 and 120),
  lat        double precision not null check (lat between -90 and 90),
  lng        double precision not null check (lng between -180 and 180),
  population integer check (population is null or population >= 0)
);
-- Index fonctionnel pour la recherche préfixe/contient (35 k lignes : le seq scan
-- sur « contient » reste sous la milliseconde ; le préfixe profite de l'index).
create index if not exists fr_communes_norm_idx on public.fr_communes (public.commune_norm(nom));

-- RLS : lecture publique (référentiel géographique ouvert), AUCUNE écriture
-- client — seul le service-role peuple/rafraîchit (via migration).
alter table public.fr_communes enable row level security;
drop policy if exists fr_communes_read on public.fr_communes;
create policy fr_communes_read on public.fr_communes for select using (true);
-- La policy dit QUELLES lignes ; le grant dit si le rôle peut lire TOUT COURT.
-- Les deux sont nécessaires : lecture ouverte, écriture jamais accordée.
grant select on public.fr_communes to anon, authenticated;
revoke insert, update, delete on public.fr_communes from anon, authenticated;

`;

const RPC = `
-- ─── RPC de recherche (sert le sélecteur, côté serveur) ──────────────────────
-- Le CAP fait autorité côté client (CITY_SEARCH_RESULT_LIMIT, game-rules) et est
-- PASSÉ en paramètre : aucun nombre magique en SQL. Tri : préfixe d'abord, puis
-- population décroissante (les 6 communes sans population trient en dernier via
-- coalesce 0 — un 0 de TRI, jamais affiché comme donnée).
create or replace function public.search_communes(p_query text, p_limit integer)
returns table (insee text, nom text, lat double precision, lng double precision, population integer)
language sql stable as $func$
  with q as (select public.commune_norm(p_query) as nq)
  select c.insee, c.nom, c.lat, c.lng, c.population
  from public.fr_communes c, q
  where q.nq <> '' and public.commune_norm(c.nom) like '%' || q.nq || '%'
  order by
    (public.commune_norm(c.nom) like q.nq || '%') desc,
    coalesce(c.population, 0) desc,
    c.nom
  limit greatest(coalesce(p_limit, 0), 0);
$func$;
comment on function public.search_communes(text, integer) is
  'Recherche de commune par nom (normalisé). Cap = CITY_SEARCH_RESULT_LIMIT passé en paramètre.';
-- EXECUTE : lecture, ouverte aux clients ; on révoque d'abord PUBLIC (grant par
-- défaut à la création) puis on accorde nommément.
revoke all on function public.search_communes(text, integer) from public;
grant execute on function public.search_communes(text, integer) to anon, authenticated;
`;

// ─── Assemblage ──────────────────────────────────────────────────────────────
const communesRaw = await loadCommunes();
if (!Array.isArray(communesRaw) || communesRaw.length === 0) {
  throw new Error('réponse vide — ARRÊT (aucune commune de repli)');
}
const communes = [...communesRaw].sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
const rows = buildSeedRows(communes);
const count = rows.length;

let sql = HEADER(count);
sql += `-- ─── Seed : ${count} communes réelles (append-only, idempotent) ─────────────────\n`;
for (const batch of chunk(rows, 500)) {
  sql += `insert into public.fr_communes (insee, nom, lat, lng, population) values\n`;
  sql += batch.join(',\n');
  sql += `\non conflict (insee) do nothing;\n`;
}
sql += RPC;

writeFileSync(OUT, sql, 'utf8');
console.log(`écrit : ${OUT}`);
console.log(`communes : ${count}`);
console.log(`taille : ${(sql.length / 1024).toFixed(0)} Ko`);
