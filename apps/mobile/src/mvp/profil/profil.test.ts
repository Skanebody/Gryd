/**
 * GRYD — le tableau de bord et le compte ne mentent pas (lot M12).
 *
 * Deux surfaces sensibles pour deux raisons opposées : le tableau de bord parce
 * qu'un joueur y revient tous les jours et apprend vite à ne plus croire des
 * chiffres qui clignotent ; le compte parce que la suppression est l'action la
 * plus irréversible du produit ET une exigence App Store.
 */
import {
  canRetryStats,
  statAreaM2,
  statDistanceM,
  statLastRunAt,
  statRuns,
  statsStatus,
  type StatsInput,
  type StatsRead,
} from './stats';
import { accountView, canExport, DELETION_NEEDS_CONFIRMATION } from './account';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const PLEIN: StatsRead = { kind: 'ok', runs: 12, distanceM: 84_300, areaM2: 128_400, lastRunAt: 1_770_000_000_000 };
const VIDE: StatsRead = { kind: 'ok', runs: 0, distanceM: 0, areaM2: 0, lastRunAt: null };
const jeu = (p: Partial<StatsInput> = {}): StatsInput => ({ signedIn: true, read: PLEIN, ...p });

const LECTURES: StatsRead[] = [{ kind: 'idle' }, { kind: 'loading' }, { kind: 'failed' }, VIDE, PLEIN];
function toutesLesEntrees(): StatsInput[] {
  const out: StatsInput[] = [];
  for (const signedIn of [true, false]) for (const read of LECTURES) out.push({ signedIn, read });
  return out;
}

// ─── Le tableau de bord ─────────────────────────────────────────────────────

Deno.test('un CHARGEMENT n’est pas un tableau de bord vide', () => {
  // Afficher des zéros en attendant apprend au joueur à ne plus croire ses
  // propres chiffres — et il ne les recroira pas quand ils seront justes.
  assertEquals(statsStatus(jeu({ read: { kind: 'loading' } })), 'loading');
  assertEquals(statsStatus(jeu({ read: { kind: 'idle' } })), 'loading');
});

Deno.test('un ÉCHEC de lecture n’est pas un vide non plus', () => {
  assertEquals(statsStatus(jeu({ read: { kind: 'failed' } })), 'failed');
});

Deno.test('sans compte, il n’y a pas de « mes » statistiques', () => {
  assertEquals(statsStatus(jeu({ signedIn: false, read: PLEIN })), 'signedOut');
});

Deno.test('lu et sans sortie → vide ; lu et avec sorties → prêt', () => {
  assertEquals(statsStatus(jeu({ read: VIDE })), 'empty');
  assertEquals(statsStatus(jeu()), 'ready');
});

Deno.test('INVARIANT : aucun chiffre ne sort d’un état qui ne sait pas', () => {
  for (const e of toutesLesEntrees()) {
    const chiffres = [statRuns(e), statDistanceM(e), statAreaM2(e), statLastRunAt(e)];
    if (chiffres.every((c) => c === null)) continue;
    assertEquals(statsStatus(e), 'ready', `chiffre affiché hors de « prêt » : ${JSON.stringify(e)}`);
  }
  assertEquals(statRuns(jeu()), 12);
  assertEquals(statDistanceM(jeu()), 84_300);
});

Deno.test('un territoire à ZÉRO s’affiche — c’est une réponse, pas une ignorance', () => {
  // On peut avoir couru sans jamais refermer une boucle. Ici le zéro RÉPOND à
  // la question posée, au lieu de la masquer comme le ferait un compteur en
  // cours de chargement.
  const sansZone = jeu({ read: { ...PLEIN, areaM2: 0 } });
  assertEquals(statsStatus(sansZone), 'ready');
  assertEquals(statAreaM2(sansZone), 0);
});

Deno.test('une DERNIÈRE COURSE aberrante ne s’affiche pas', () => {
  for (const v of [0, -1, Number.NaN]) {
    assertEquals(statLastRunAt(jeu({ read: { ...PLEIN, lastRunAt: v } })), null, `valeur ${String(v)}`);
  }
});

Deno.test('« réessayer » n’existe QUE sur un échec', () => {
  for (const e of toutesLesEntrees()) {
    if (canRetryStats(e)) assertEquals(statsStatus(e), 'failed', JSON.stringify(e));
  }
  assert(canRetryStats(jeu({ read: { kind: 'failed' } })));
});

// ─── Le compte (App Store 5.1.1(v) + RGPD) ──────────────────────────────────

Deno.test('une demande EN COURS n’offre PAS de re-supprimer — elle offre d’ANNULER', () => {
  // Reproposer « Supprimer » ferait croire que la première demande n'a pas
  // pris, et cacherait les jours qui restent pour changer d'avis. Le délai de
  // grâce existe pour ça ; le taire l'annule.
  const v = accountView({ ok: true, pending: true, graceDays: 27 });
  assertEquals(v.kind, 'pending');
  assert(v.kind === 'pending' && v.graceDays === 27);
});

Deno.test('aucune demande → la suppression est proposée', () => {
  assertEquals(accountView({ ok: true, pending: false }).kind, 'deletable');
});

Deno.test('état INCONNU → on ne propose RIEN', () => {
  // Offrir de supprimer sans savoir où en est la demande précédente est le pire
  // des deux mondes.
  assertEquals(accountView(null).kind, 'unknown');
  assertEquals(accountView(undefined).kind, 'unknown');
  assertEquals(accountView({ ok: false }).kind, 'unknown');
});

Deno.test('un délai ABSENT ou aberrant ne devient JAMAIS « 0 jour »', () => {
  // « Il te reste 0 jour » se lit « c'est déjà fait », alors qu'on ne sait pas.
  // Sur cette action-là, se taire vaut mieux qu'approximer.
  for (const j of [undefined, Number.NaN, -1]) {
    assertEquals(
      accountView({ ok: true, pending: true, graceDays: j as number }).kind,
      'unknown',
      `délai ${String(j)}`,
    );
  }
});

Deno.test('la suppression exige TOUJOURS une confirmation (L17 en miroir)', () => {
  // Une action irréversible atteinte en un seul tap est un piège, pas une
  // simplification.
  assertEquals(DELETION_NEEDS_CONFIRMATION, true);
});

Deno.test('l’export ne se MÉRITE pas : il suit le compte, jamais l’usage', () => {
  // RGPD. Un export vide est une réponse légitime ; le refuser à quelqu'un qui
  // n'a rien couru lui ferait croire que le droit dépend de l'usage.
  assertEquals(canExport(true), true);
  assertEquals(canExport(false), false);
});
