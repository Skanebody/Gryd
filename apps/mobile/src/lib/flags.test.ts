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
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { SEASON_CLOSE_SCHEDULED, SEASON_RESET_KEEPS } from '@klaim/shared';
import { LOCALES } from '../i18n/types.ts';
import { C as SAISON } from '../i18n/catalog/saison.ts';
import { C as FIN_SAISON } from '../i18n/catalog/finSaison.ts';
import { flags } from './flags.ts';

// ─── 1. La porte dérive du fait, elle n'est plus un booléen indépendant ───────

Deno.test('surface Saison fermée tant qu aucune saison ne se clôture', () => {
  // `EXPO_PUBLIC_FULL_SURFACE` n'est pas posé sous Deno : on lit donc la valeur
  // dérivée pure. Si un jour la constante repasse à `true`, cette assertion
  // s'inverse d'elle-même — elle décrit le lien, pas l'état.
  assertEquals(
    flags.season,
    SEASON_CLOSE_SCHEDULED,
    'flags.season doit DÉRIVER de SEASON_CLOSE_SCHEDULED — une porte vers un décompte que rien n honore est un mensonge qui grandit tout seul',
  );
});

Deno.test('flags.ts ne redéclare pas la saison en dur', async () => {
  const src = await Deno.readTextFile(new URL('./flags.ts', import.meta.url));
  // La dérivation doit être VISIBLE dans la source : `season: true` recopié à la
  // main rendrait le test ci-dessus vert par coïncidence le jour où la constante
  // passerait à `true`, puis faux pour toujours ensuite.
  assert(
    /season:\s*FULL_SURFACE\s*\|\|\s*SEASON_CLOSE_SCHEDULED/.test(src),
    'la surface Saison doit dériver de SEASON_CLOSE_SCHEDULED, jamais être un littéral',
  );
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

// ─── 4. Fermer la porte ne laisse aucun lien mort ────────────────────────────

/**
 * Les TROIS écrans de la surface Saison se gardent sur `flags.season`. Sans
 * cette garde, fermer la porte du Profil laisserait les routes atteignables au
 * deep link (et `/fin-saison` par le bouton de `/season`) : une surface
 * « retirée » qu'une URL rouvre n'est pas retirée.
 */
const ECRANS_SAISON = [
  '../../app/(tabs)/classement.tsx',
  '../../app/season.tsx',
  '../../app/fin-saison.tsx',
] as const;

Deno.test('les trois écrans de saison redirigent quand la surface est fermée', async () => {
  for (const chemin of ECRANS_SAISON) {
    const src = await Deno.readTextFile(new URL(chemin, import.meta.url));
    assert(
      /if\s*\(!flags\.season\)\s*return\s*<Redirect/.test(src),
      `${chemin} doit rediriger tant que la surface Saison est fermée`,
    );
  }
});

Deno.test('le Profil ne pousse vers le classement que derrière la garde', async () => {
  const src = await Deno.readTextFile(new URL('../../app/(tabs)/profil.tsx', import.meta.url));
  // Les deux seules portes vers /classement de toute l'app vivent ici. Chacune
  // doit être précédée, dans les 400 caractères qui la couvrent, par la garde —
  // on vérifie qu'AUCUNE poussée n'est nue, pas qu'elles sont au bon endroit.
  const poussees = [...src.matchAll(/router\.push\('\/classement'\)/g)];
  assert(poussees.length > 0, 'le Profil doit rester le chemin nommé vers la Saison');
  for (const poussee of poussees) {
    const amont = src.slice(Math.max(0, poussee.index - 400), poussee.index);
    assert(
      amont.includes('flags.season'),
      'une poussée vers /classement sans garde flags.season est un lien vers une route masquée',
    );
  }
});

Deno.test('le rang local n est affiché que si son tableau est atteignable', async () => {
  const src = await Deno.readTextFile(new URL('../../app/(tabs)/profil.tsx', import.meta.url));
  // Ligne d'identité (« CREW · ville · #rang ») et ShareCard : les deux seules
  // surfaces qui montrent une place locale. Un rang tiré d'un tableau que l'app
  // n'ouvre plus est l'équivalent informationnel d'un bouton mort.
  assert(
    /const rankProgress =\s*\n?\s*flags\.season &&/.test(src),
    'rankProgress doit être gardé par flags.season',
  );
  assert(
    /const hasSeasonRank = flags\.season &&/.test(src),
    'hasSeasonRank (ShareCard) doit être gardé par flags.season',
  );
});
