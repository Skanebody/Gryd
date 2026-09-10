/**
 * GRYD — LA COUTURE DU JOURNAL : ce que les ÉCRANS reprennent d'une main à ce
 * que les modules purs ont posé de l'autre.
 *
 * ═══ POURQUOI CE FICHIER ════════════════════════════════════════════════════
 * Même raison que `src/mvp/couture.test.ts` : les modules de ce lot sont testés
 * un par un (splits, allure, dénivelé, géométrie de graphique, lecture de
 * trace), et aucun de ces tests ne verrait un écran qui, tout simplement, ne
 * les monte pas — ou qui recopie leur calcul à côté. Ce filet lit le SOURCE des
 * écrans. Il attrape une forme, pas une intention : il ne remplace ni la
 * relecture, ni le gate `ux-gate`.
 *
 * ═══ ÉTAPE 0 — les défauts existaient, tous ═════════════════════════════════
 *  · `/course/[id]` affichait « GRYD ne conserve pas le tracé d'une sortie
 *    passée » alors que `ingest_run` écrit DEUX formes de trace. Aucun test ne
 *    pouvait le voir : la phrase était vraie du code, fausse du serveur ;
 *  · l'écran Statistiques calculait ses barres dans son JSX (`day.km / chartMax
 *    * 112`) — donc hors de portée du moindre test ;
 *  · le journal du Profil n'affichait ni allure, ni terrain gagné, ni statut,
 *    alors que les trois étaient déjà lus par `history/real.ts`.
 */

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFileSync(chemin: string | URL): string;
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function lire(chemin: string): string {
  return Deno.readTextFileSync(new URL(chemin, import.meta.url));
}

/** Le code hors commentaires — sinon citer un défaut dans un commentaire le recrée. */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((ligne) => !ligne.trim().startsWith('//') && !ligne.trim().startsWith('*'))
    .join('\n');
}

const DETAIL = '../../../app/course/[id].tsx';
const STATS = '../refonte/ProfileStatsScreen.tsx';
const JOURNAL = './JournalSection2026.tsx';
const CATALOGUE = '../../i18n/catalog/journal.ts';
const CATALOGUE_HISTORIQUE = '../../i18n/catalog/historique.ts';

// ─── LE DÉTAIL D'UNE SORTIE ─────────────────────────────────────────────────

Deno.test('couture — /course/[id] monte la carte, l’analyse et le partage', () => {
  const code = codeSeul(lire(DETAIL));
  for (const attendu of ['TraceMap2026', 'RunAnalysisBlocks2026', 'setShareRun']) {
    assert(code.includes(attendu), `/course/[id] ne monte pas ${attendu}`);
  }
  // La trace vient de la LECTURE, pas d'une géométrie d'authoring ni de la
  // mémoire du dernier résultat (qui appartient à une AUTRE sortie).
  assert(code.includes('run.trace.points'), '/course/[id] ne dessine pas la trace LUE');
  assert(
    !code.includes('getFinishedTrace') && !code.includes('demoRuns'),
    '/course/[id] emprunte une trace qui n’est pas celle de cette sortie',
  );
});

Deno.test('couture — /course/[id] n’affirme plus qu’aucun tracé n’existe', () => {
  const source = lire(DETAIL);
  assert(
    !source.includes('detailTraceNote') && !source.includes('detailShareNote'),
    '/course/[id] sert encore les phrases « pas de carte » et « pas de partage »',
  );
  // `codeSeul` : le catalogue EXPLIQUE en commentaire pourquoi ces deux entrées
  // ont été retirées, en les citant. Citer un défaut ne doit pas le recréer.
  const catalogue = codeSeul(lire(CATALOGUE_HISTORIQUE));
  assert(
    !catalogue.includes('GRYD ne conserve pas le tracé'),
    'le catalogue porte encore la phrase que le serveur dément',
  );
});

Deno.test('couture — les trois repères du détail sont lisibles en français', () => {
  const catalogue = lire(CATALOGUE);
  const historique = lire(CATALOGUE_HISTORIQUE);
  assert(catalogue.includes("fr: 'Splits'"), 'aucun libellé « Splits »');
  assert(catalogue.includes('Allure sur le parcours'), 'aucun libellé d’allure sur le parcours');
  assert(catalogue.includes("fr: 'Dénivelé'"), 'aucun libellé de dénivelé');
  assert(historique.includes("fr: 'Impact territorial'"), 'aucun libellé de territoire');
});

Deno.test('couture — aucun écran ne recalcule un split ou une allure lissée', () => {
  for (const chemin of [DETAIL, STATS, JOURNAL]) {
    const code = codeSeul(lire(chemin));
    assert(
      !/\/\s*1000\s*\)\s*\*\s*60/.test(code) && !code.includes('SPLIT_DISTANCE_M ='),
      `${chemin} recalcule une allure ou un split au lieu de consommer features/journal/metrics`,
    );
  }
});

// ─── LE JOURNAL ─────────────────────────────────────────────────────────────

Deno.test('couture — JournalSection2026 est exporté et montre plus qu’une date', () => {
  const source = lire(JOURNAL);
  assert(source.includes('export function JournalSection2026'), 'section non exportée');
  assert(source.includes('export function JournalRow2026'), 'ligne non exportée');
  const code = codeSeul(source);
  for (const attendu of ['formatRate', 'captureAreaLabel2026', 'PosterTrace', 'verdictPill']) {
    assert(code.includes(attendu), `la ligne de journal ne porte pas ${attendu}`);
  }
});

Deno.test('couture — la ligne de journal ouvre un détail, elle ne mène pas nulle part', () => {
  const code = codeSeul(lire(JOURNAL));
  assert(code.includes('onOpen(entry)'), 'la ligne n’ouvre rien');
  assert(code.includes("accessibilityRole=\"button\""), 'la ligne ne se dit pas tapable');
});

// ─── LES STATISTIQUES ───────────────────────────────────────────────────────

Deno.test('couture — l’écran Statistiques porte de VRAIS graphiques', () => {
  const code = codeSeul(lire(STATS));
  assert(code.includes('<BarChart'), 'aucun histogramme');
  assert(code.includes('<LineChart'), 'aucune courbe');
  assert(code.includes('weeklyDistance'), 'aucune évolution par semaine (cahier G25)');
  assert(code.includes('sessionPaces'), 'aucune évolution d’allure par sortie');
  // La géométrie ne revient PAS dans le JSX : c'est exactement le défaut qu'on
  // vient de sortir de cet écran.
  assert(
    !code.includes('* 112') && !code.includes('chartMax'),
    'la hauteur des barres est recalculée dans le JSX',
  );
});

Deno.test('couture — les quatre états de l’écran Statistiques survivent', () => {
  const code = codeSeul(lire(STATS));
  for (const etat of ["'loading'", "'failed'", "'signed-out'"]) {
    assert(code.includes(etat), `état ${etat} disparu`);
  }
  assert(code.includes('outings > 0'), 'l’état « lu, et rien » a disparu');
});

// ─── LA RÈGLE DE COPIE ──────────────────────────────────────────────────────

Deno.test('couture — aucun tiret cadratin dans le français de ce lot', () => {
  // Règle de copie du lot : en français, ni « — » ni « – » dans un texte
  // AFFICHÉ. Les commentaires en usent (ils ne sont lus par personne à
  // l'écran) : on ne regarde donc que les chaînes du catalogue.
  const catalogue = lire(CATALOGUE);
  const chaines = catalogue.match(/fr: '(?:[^'\\]|\\.)*'/g) ?? [];
  assert(chaines.length > 10, `catalogue introuvable ou vide (${chaines.length} chaînes)`);
  for (const chaine of chaines) {
    assert(!chaine.includes('—') && !chaine.includes('–'), `tiret cadratin : ${chaine}`);
  }
});
