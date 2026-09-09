/**
 * GRYD — LA SURFACE SAISON NE PEUT PLUS DIVERGER DU MOTEUR DE SAISON.
 *
 * ─── LE BUG QUE CES TESTS AURAIENT ATTRAPÉ ──────────────────────────────────
 * Le 28/07/2026, la migration `0106` a déplanifié `gryd_season_close` et
 * `SEASON_RESET_KEEPS.territory` est passé à `true` : plus aucune saison ne se
 * clôture, et un reset n'efface plus rien. Trois choses ont continué d'affirmer
 * le contraire pendant quatre jours, sans qu'un seul test rougisse :
 *   · `flags.season` valait `true` en dur → l'app ouvrait un écran dont
 *     l'en-tête décompte « Se termine dans {n} j » vers une échéance que plus
 *     rien n'honore (et qui, une fois passée, promet « Se termine aujourd'hui »
 *     tous les jours, pour toujours) ;
 *   · `saison.ts#resetLigne1` et `finSaison.ts#reglesCarteRepartAZero`
 *     annonçaient au joueur, dans CINQ langues, que ses zones capturées
 *     seraient libérées — la perte exacte de ce que le serveur lui garde ;
 *   · le docbloc de `SEASON_RESET_KEEPS` décrivait encore l'effacement, EN
 *     CAPITALES, en se réclamant du code.
 *
 * Les 12 tests de `season_close` étaient verts pendant tout ce temps : ils
 * regardaient les RANGS. « Un test vert ne dit rien de ce qu'il ne regarde
 * pas. » Ces tests-ci regardent la COHÉRENCE entre le fait moteur, la porte et
 * la copie — le seul endroit où le mensonge pouvait se loger.
 *
 * ─── ILS GARDENT UNE RÈGLE, PAS UN ÉTAT ─────────────────────────────────────
 * Aucun n'exige que la saison reste fermée : chacun est conditionné à
 * `SEASON_CLOSE_SCHEDULED` / `SEASON_RESET_KEEPS`. Le jour où le fondateur
 * replanifie le job, ces tests suivent le fait au lieu de bloquer le travail —
 * c'est la différence entre figer un APPEL et garder une RÈGLE.
 *
 * ─── 09/09/2026 — ADR-012 ────────────────────────────────────────────────────
 * La surface Saison legacy (E11/E12/E59-E61) et `flags.season` sont RETIRÉS :
 * le cahier de septembre sert son propre parcours (`/season`). La section 1
 * garde la trace du drapeau disparu, la section 4 les routes ré-aiguillées ;
 * les sections 2 et 3 (moteur et copie legacy) restent des règles vivantes tant
 * que les catalogues existent.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { SEASON_CLOSE_SCHEDULED, SEASON_RESET_KEEPS } from '@klaim/shared';
import { LOCALES } from '../i18n/types.ts';
import { C as SAISON } from '../i18n/catalog/saison.ts';
import { C as FIN_SAISON } from '../i18n/catalog/finSaison.ts';
import { flags } from './flags.ts';

// ─── 1. La porte legacy est RETIRÉE, pas rouverte en dur (ADR-012, 09/09/2026) ──

Deno.test('flags.season n existe plus — la porte legacy ne se rouvre pas en douce', async () => {
  // Jusqu'au 09/09/2026, `flags.season` DÉRIVAIT de `SEASON_CLOSE_SCHEDULED` :
  // une porte vers un décompte que rien n'honore est un mensonge qui grandit
  // tout seul. Le cahier de septembre a retiré la surface entière ; un drapeau
  // qui reviendrait en littéral (`season: true`) rouvrirait la porte legacy
  // sans le fait moteur. On garde donc la trace de sa disparition.
  assert(!('season' in flags), 'flags.season est revenu — la surface Saison legacy est retirée (ADR-012)');
  const src = await Deno.readTextFile(new URL('./flags.ts', import.meta.url));
  assert(!/^\s*season:\s*/m.test(src), 'flags.ts redéclare `season:` — la porte legacy ne se rouvre pas en dur');
});

// ─── 2. Tant que rien ne clôture, rien ne doit pouvoir détruire ──────────────

Deno.test('aucune clôture planifiée implique aucune destruction possible', () => {
  if (SEASON_CLOSE_SCHEDULED) return; // règle inapplicable : les saisons tournent.
  assertEquals(
    SEASON_RESET_KEEPS.territory,
    true,
    'la carte doit être conservée : `resetSeason` supprimait TOUTES les lignes hex_claims, non bornées à une ville',
  );
  assertEquals(SEASON_RESET_KEEPS.shields, true, 'les boucliers partaient avec la carte');
});

// ─── 3. Aucune copie ne promet une remise à zéro que le moteur refuse ────────

/**
 * « La carte repart à zéro » / « les zones capturées sont libérées », par
 * langue. On cherche le SENS, pas une phrase : le motif exige le sujet (carte /
 * map / mapa / Karte) puis le verbe de remise à zéro DANS LA MÊME PHRASE
 * (`[^.]` interdit de traverser un point). « Ta carte reste » ne matche donc
 * pas, et « Points et rang repartent à zéro » non plus — c'est le TABLEAU, et
 * lui repart bel et bien à zéro.
 */
const CARTE_EFFACEE: Record<string, readonly RegExp[]> = {
  fr: [/carte[^.]{0,60}(repart|revient|remise)\s+à\s+zéro/i, /zones?[^.]{0,40}lib[ée]r[ée]e?s/i],
  en: [/map[^.]{0,60}(starts over|resets|back to zero)/i, /zones?[^.]{0,40}(are )?released/i],
  es: [
    /mapa[^.]{0,60}(vuelve a cero|se reinicia|empieza de nuevo)/i,
    /zonas[^.]{0,40}(se liberan|liberadas)/i,
  ],
  de: [
    /Karte[^.]{0,60}(startet neu|beginnt bei null|wird zurückgesetzt)/i,
    /Zonen[^.]{0,40}(werden frei|freigegeben)/i,
  ],
  pt: [
    /mapa[^.]{0,60}(recomeça|volta a zero|zera)/i,
    /zonas[^.]{0,40}(são lib|liberadas|libertadas)/i,
  ],
};

Deno.test('aucune copie de saison ne promet la libération des zones capturées', () => {
  if (!SEASON_RESET_KEEPS.territory) return; // le reset efface : la copie DOIT le dire.

  // Les DEUX catalogues entiers, pas les deux clés fautives d'hier : la
  // promesse doit être impossible à réintroduire AILLEURS dans ces écrans.
  const catalogues: readonly [string, Record<string, Record<string, string>>][] = [
    ['saison', SAISON as unknown as Record<string, Record<string, string>>],
    ['finSaison', FIN_SAISON as unknown as Record<string, Record<string, string>>],
  ];

  for (const [nom, catalogue] of catalogues) {
    for (const [cle, entree] of Object.entries(catalogue)) {
      for (const locale of LOCALES) {
        const texte = entree?.[locale];
        if (typeof texte !== 'string') continue;
        for (const motif of CARTE_EFFACEE[locale] ?? []) {
          assert(
            !motif.test(texte),
            `${nom}.${cle} [${locale}] annonce une remise à zéro de la CARTE que le moteur ne fait plus ` +
              `(SEASON_RESET_KEEPS.territory = true) — une saison remet à zéro le TABLEAU, jamais la carte : ${texte}`,
          );
        }
      }
    }
  }
});

// ─── 4. La surface Saison legacy est RETIRÉE, pas masquée (ADR-012, 09/09/2026) ──

/**
 * Jusqu'au 09/09/2026, trois écrans (E11 `(tabs)/classement`, E59/E60 `season`,
 * E61 `fin-saison`) se gardaient sur `flags.season`, et le Profil n'y menait que
 * derrière la même garde : fermer la porte ne laissait aucun lien mort.
 *
 * Le cahier de septembre (rang 0 depuis l'ADR-012) remplace cette surface par
 * SON parcours de saison (`features/refonte/SeasonJourneyScreen`, servi par
 * `/season`), sans drapeau. Les autres routes ne sont plus des écrans : ce sont
 * des ré-aiguillages INCONDITIONNELS vers `/season`. L'invariant survit sous
 * une autre forme — aucune route retirée ne rend un écran à moitié legacy, et
 * le chemin nommé du Profil vers la saison existe toujours.
 */
const RETIREES_VERS_SEASON = [
  '../../app/(tabs)/classement.tsx',
  '../../app/fin-saison.tsx',
  '../../app/aujourdhui.tsx',
] as const;

/** Un fichier de route qui n'est qu'une ré-exportation → le module qu'il sert. */
async function moduleServi(cheminRoute: string): Promise<string> {
  const url = new URL(cheminRoute, import.meta.url);
  const src = await Deno.readTextFile(url);
  const m = src.match(/^export\s*\{[^}]*\}\s*from\s*'([^']+)'/m);
  const brut = m?.[1];
  if (brut === undefined) return src;
  const cible = /\.tsx?$/.test(brut) ? brut : `${brut}.tsx`;
  return await Deno.readTextFile(new URL(cible, url));
}

Deno.test('les routes de saison retirées ré-aiguillent sans condition vers /season', async () => {
  for (const chemin of RETIREES_VERS_SEASON) {
    const src = await Deno.readTextFile(new URL(chemin, import.meta.url));
    assert(
      /return\s*<Redirect\s+href="\/season"\s*\/>/.test(src),
      `${chemin} doit ré-aiguiller vers /season : une route retirée qui rend encore un écran est une surface à moitié legacy`,
    );
    assert(!/flags\.season/.test(src), `${chemin} lit flags.season, un drapeau qui n'existe plus (ADR-012)`);
  }
  // Et la cible est un VRAI écran : la ré-exportation de `/season` se résout.
  const season = await moduleServi('../../app/season.tsx');
  assert(/export (default )?function|export const/.test(season), '/season doit servir un module qui existe');
});

Deno.test('le Profil reste le chemin nommé vers la saison', async () => {
  const src = await moduleServi('../../app/(tabs)/profil.tsx');
  const poussees = [...src.matchAll(/router\.push\('\/season'\)/g)];
  assert(poussees.length > 0, "le Profil (ou le module qu'il sert) doit pousser vers /season");
});

Deno.test('le Profil ne peint aucun rang tiré du tableau legacy retiré', async () => {
  const src = await moduleServi('../../app/(tabs)/profil.tsx');
  // `(tabs)/classement` n'est plus un tableau : un rang qui en serait tiré serait
  // l'équivalent informationnel d'un bouton mort (un chiffre dont la source ne
  // s'ouvre plus). Le jour où un rang local revient, il devra venir du parcours
  // de saison du cahier — et ce test devra le dire.
  assert(
    !/seasonRankProgress|hasSeasonRank/.test(src),
    'le Profil peint un rang du tableau legacy retiré (seasonRankProgress / hasSeasonRank)',
  );
});
