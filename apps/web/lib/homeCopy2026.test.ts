/**
 * GRYD — LE VERROU DE LA COPIE DE L'ACCUEIL (lot W2).
 *
 * ÉTAPE 0, LE DÉFAUT QU'ON MESURE : le site en ligne le 12/09/2026 vendait
 * « GRYD Club », un « Founder Pack à vie », une « monnaie de style » et un seuil
 * de 500 inscrits par quartier. Rien de tout cela n'existe. Il écrivait aussi
 * « GRYD » en capitales dans des phrases courtes, et des tirets longs partout.
 * Ces tests tiennent la copie neuve à trois règles que le cahier de contenu
 * (`docs/product/GRYD_SITE_CONTENU_2026_09.md` §4) pose une par une, et que
 * seule une relecture automatique peut tenir au fil des lots suivants.
 *
 * ⚠ POURQUOI AUCUN IMPORT EXTERNE ET UN `Deno` DÉCLARÉ LOCALEMENT — même
 * arbitrage que `authCallbackLink2026.test.ts` : ce fichier est lu par DEUX
 * outils aux attentes opposées. Deno l'exécute (`npm run test:web`), et
 * `tsc --noEmit` le typecheck (il tombe sous `include: ["**\/*.ts"]` de
 * `apps/web/tsconfig.json`, donc aussi pendant `next build`). Un spécificateur
 * `https://deno.land/std…` fait échouer `tsc`, et `/// <reference lib="deno.ns" />`
 * aussi. Une déclaration de portée module et deux assertions locales
 * satisfont les deux.
 *
 * PUR : aucun DOM, aucun réseau, aucune horloge.
 */
import { COMMERCIAL_PROPOSAL_2026, SHARE_TRIM_M, TERRITORY_RULES_2026 } from '@klaim/shared';
import { HOME_COPY, homeCopyStrings } from './homeCopy2026.ts';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message?: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message ?? 'valeurs différentes'} — attendu ${String(expected)}, reçu ${String(actual)}`);
  }
}

/** Les chaînes de la copie qui sont de la PROSE, donc pas les adresses. */
function proseStrings(): string[] {
  return homeCopyStrings().filter((value) => !value.startsWith('/'));
}

Deno.test('la copie de l accueil ne contient AUCUN tiret long', () => {
  // §4.1 : « Aucun tiret long. Ni — ni –. Une virgule, un deux-points ou un
  // point font le travail. » Le même verrou existe côté application
  // (`apps/mobile/src/i18n/noDashFr2026.test.ts`) ; le site le pose ici.
  const dashes = ['—', '–', '‒', '―'];
  for (const value of homeCopyStrings()) {
    for (const dash of dashes) {
      assert(
        !value.includes(dash),
        `tiret long ${JSON.stringify(dash)} trouvé dans la copie : ${JSON.stringify(value)}`,
      );
    }
  }
});

Deno.test('« GRYD » en capitales n existe que dans le nom de l offre', () => {
  // §4.2 : les capitales appartiennent au LOGO DESSINÉ (un graphisme, pas de la
  // typographie de texte) et aux IDENTIFIANTS. Dans la prose, la marque s'écrit
  // « Gryd ». La seule exception tolérée ici est le nom exact de l'offre,
  // `GRYD+`, que la source de vérité écrit ainsi et dont les CGV dépendent.
  for (const value of homeCopyStrings()) {
    let at = value.indexOf('GRYD');
    while (at !== -1) {
      const suivant = value.slice(at + 'GRYD'.length, at + 'GRYD'.length + 1);
      assert(
        suivant === '+',
        `« GRYD » en capitales hors du nom de l offre dans : ${JSON.stringify(value)}`,
      );
      at = value.indexOf('GRYD', at + 1);
    }
  }
  // Et la marque est bien PRÉSENTE sous sa forme de prose : un test qui ne
  // vérifierait que l'absence passerait aussi sur une page vide.
  assert(
    proseStrings().some((value) => value.includes('Gryd')),
    'la copie ne nomme jamais Gryd : le test précédent ne prouverait rien',
  );
});

Deno.test('aucun mot de l ancien site ne survit', () => {
  // §4.4, « Mots bannis, hérités de l'ancien site ». Chacun a été affiché en
  // ligne ; chacun décrit une mécanique qui n'existe pas.
  const bannis = [
    'War Room', 'Warroom', 'Arsenal', 'GRYD Club', 'Gryd Club', 'Founder Pack',
    'monnaie de style', 'quartier débloqué', 'pass de saison', 'battle pass',
    'bouclier', 'gel de série', 'territoire', 'hexagone', 'runners',
  ];
  for (const value of proseStrings()) {
    const bas = value.toLowerCase();
    for (const mot of bannis) {
      assert(!bas.includes(mot.toLowerCase()), `mot banni « ${mot} » dans : ${JSON.stringify(value)}`);
    }
  }
});

Deno.test('la copie tutoie, elle ne vouvoie jamais', () => {
  // §4.1 : « Tutoiement, toujours. » Un « vous » isolé suffit à casser la voix.
  for (const value of proseStrings()) {
    assert(
      !/\b(vous|votre|vos)\b/i.test(value),
      `vouvoiement dans : ${JSON.stringify(value)}`,
    );
  }
});

Deno.test('aucun chiffre de jeu n est tapé à la main', () => {
  // §4.3 : chaque valeur affichée vient de `game-rules.ts`. Si une règle change
  // et que quelqu'un a recopié le nombre dans la prose, ce test tombe.
  const { run, bike } = TERRITORY_RULES_2026;
  assert(
    HOME_COPY.steps.items[1]?.body.includes(String(run.closureMaxGapM)) === true,
    'la tolérance à pied ne vient plus de TERRITORY_RULES_2026',
  );
  assert(
    HOME_COPY.steps.items[1]?.body.includes(String(bike.closureMaxGapM)) === true,
    'la tolérance à vélo ne vient plus de TERRITORY_RULES_2026',
  );
  assert(
    HOME_COPY.privacy.body.includes(String(SHARE_TRIM_M)),
    'la coupe de partage ne vient plus de SHARE_TRIM_M',
  );
  assertEquals(
    HOME_COPY.fairPlay.cta.label.endsWith(COMMERCIAL_PROPOSAL_2026.subscriptionName),
    true,
    'le nom de l offre ne vient plus de COMMERCIAL_PROPOSAL_2026',
  );
});

Deno.test('chaque chiffre affiché cite la constante dont il sort', () => {
  // Le composant `Stat` pose la constante en `data-rule` : une valeur sans
  // provenance est un nombre inventé qui attend son tour.
  const stats = [...HOME_COPY.sports.stats, ...HOME_COPY.fairPlay.stats, HOME_COPY.privacy.stat];
  for (const stat of stats) {
    assert(stat.rule.length > 0, `chiffre « ${stat.value} » sans constante citée`);
    assert(stat.value.length > 0, `constante ${stat.rule} sans valeur affichée`);
  }
  // Les trois multiplicateurs commerciaux valent 1 : l'anti-pay-to-win n'est pas
  // un slogan, c'est une valeur. Si l'un d'eux bouge, la page doit tomber avant
  // d'aller le promettre en ligne.
  const multiplicateurs = [
    COMMERCIAL_PROPOSAL_2026.paidCaptureMultiplier,
    COMMERCIAL_PROPOSAL_2026.paidXpMultiplier,
    COMMERCIAL_PROPOSAL_2026.paidChallengeMultiplier,
  ];
  for (const valeur of multiplicateurs) {
    assertEquals(valeur, 1, 'un multiplicateur payant ne vaut plus 1 : la page ne peut plus le promettre');
  }
});

Deno.test('l accueil ne promet ni date de sortie ni nombre d inscrits', () => {
  // §4.5 : aucune date non décidée, aucun compteur, aucun « bientôt ». La seule
  // date écrite du site est celle de la Saison 0, qui est configurée en base et
  // qui n'appartient pas à l'accueil.
  for (const value of proseStrings()) {
    const bas = value.toLowerCase();
    for (const interdit of ['bientôt', 'prochainement', 'dans les prochaines semaines', 'rejoins les milliers']) {
      assert(!bas.includes(interdit), `promesse interdite « ${interdit} » dans : ${JSON.stringify(value)}`);
    }
  }
  // L'état réel est DIT, et il est dit avant qu'on le découvre.
  assert(
    HOME_COPY.hero.status.includes('App Store'),
    'la ligne d état du héros ne dit plus que Gryd n est pas sur l App Store',
  );
});
