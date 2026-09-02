/**
 * GRYD — le téléphone ne vibre ni trop, ni pour annoncer une mauvaise nouvelle.
 *
 * L6 ne se voit sur AUCUNE capture d'écran : un `ux-gate` visuel la laisse
 * passer intégralement, et le produit se retrouve muet dans la main de
 * quelqu'un qui court en regardant la route. Ces tests sont donc la seule
 * vérification possible de cette loi.
 */
import {
  gaugeHaptic,
  gaugeVoice,
  resultHaptic,
  signalHaptic,
  startVoice,
  type GaugePhase,
  type GaugeVoiceCue,
  type VoiceCue,
} from './feedback';
import { C } from '../../i18n/catalog/mvp';
import { LOCALES } from '../../i18n/types';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const PHASES: GaugePhase[] = ['silent', 'closed', 'almost', 'missing'];

// ─── LE test : ne pas vibrer en continu ─────────────────────────────────────

Deno.test('un état INCHANGÉ ne vibre jamais', () => {
  // La jauge est recalculée à chaque point GPS, soit ~1 fois par seconde.
  // Brancher l'haptique sur l'ÉTAT ferait vibrer sans discontinuer pendant tout
  // le retour vers le départ — et l'information disparaîtrait dans le bruit
  // exactement au moment où elle compte.
  for (const p of PHASES) assertEquals(gaugeHaptic(p, p), null, `${p} → ${p}`);
});

// ─── Ce qui parle, et ce qui se tait ────────────────────────────────────────

Deno.test('la FERMETURE vibre — c’est le moment que le joueur attend', () => {
  assertEquals(gaugeHaptic('missing', 'closed'), 'medium');
  assertEquals(gaugeHaptic('almost', 'closed'), 'medium');
  assertEquals(gaugeHaptic('silent', 'closed'), 'medium');
});

Deno.test('la QUASI-fermeture vibre plus discrètement', () => {
  assertEquals(gaugeHaptic('missing', 'almost'), 'light');
});

Deno.test('S’ÉLOIGNER ne vibre PAS : ce n’est pas un événement', () => {
  // Une alerte à chaque mètre perdu transformerait la jauge en réprimande —
  // exactement ce que L19 interdit.
  assertEquals(gaugeHaptic('closed', 'missing'), null);
  assertEquals(gaugeHaptic('almost', 'missing'), null);
  assertEquals(gaugeHaptic('closed', 'silent'), null);
});

Deno.test('INVARIANT : aucune transition vers `missing` ou `silent` ne vibre', () => {
  for (const avant of PHASES) {
    assertEquals(gaugeHaptic(avant, 'missing'), null, `${avant} → missing`);
    assertEquals(gaugeHaptic(avant, 'silent'), null, `${avant} → silent`);
  }
});

// ─── Le signal ──────────────────────────────────────────────────────────────

Deno.test('la PERTE d’un signal qu’on avait alerte — et rien d’autre', () => {
  assertEquals(signalHaptic('good', 'weak'), 'error');
  assertEquals(signalHaptic('good', 'searching'), 'error');
});

Deno.test('la recherche initiale ne crie PAS à la panne', () => {
  // Vibrer au démarrage, quand le signal n'est pas encore arrivé, alerterait
  // pendant les trois secondes normales de recherche.
  assertEquals(signalHaptic('searching', 'weak'), null);
  assertEquals(signalHaptic('searching', 'searching'), null);
  assertEquals(signalHaptic('weak', 'searching'), null);
  // Retrouver le signal est une bonne nouvelle : elle se voit, elle ne s'impose pas.
  assertEquals(signalHaptic('weak', 'good'), null);
});

// ─── Le résultat ────────────────────────────────────────────────────────────

Deno.test('la CAPTURE est le seul `success` du MVP (L7, peak-end)', () => {
  assertEquals(resultHaptic('captured'), 'success');
  assertEquals(resultHaptic('takenNoArea'), 'light');
});

Deno.test('un REFUS ne vibre pas — l’app n’accuse jamais, même physiquement', () => {
  for (const k of ['missing', 'noLoop', 'refused', 'pending', 'lost']) {
    assertEquals(resultHaptic(k), null, `issue « ${k} »`);
  }
});

// ══════════ LA VOIX — trois phrases par course, pas une de plus ════════════
//
// La voix est le SEUL canal qui atteint un coureur téléphone en poche, et donc
// le seul qu'on ne peut pas ignorer. Un défaut de dosage ici ne se voit sur
// AUCUNE capture d'écran et ne se rattrape pas : la phrase est déjà dite.

const MEMOIRES: (GaugeVoiceCue | null)[] = [null, 'runLoopAlmost', 'runLoopClosed'];

// ─── ÉTAPE 0 : le défaut EXISTAIT ───────────────────────────────────────────
// Brancher la voix sur l'ÉTAT de la jauge — la façon naturelle de l'écrire —
// la ferait parler à CHAQUE relevé GPS, soit environ une fois par seconde.
// Ces deux tests sont la seule chose qui distingue la règle « trois moments »
// d'un flux continu.

Deno.test('ÉTAPE 0 — un état INCHANGÉ ne parle jamais, quelle que soit la mémoire', () => {
  for (const p of PHASES) {
    for (const m of MEMOIRES) {
      assertEquals(gaugeVoice(p, p, m), null, `${p} → ${p} (déjà dit : ${String(m)})`);
    }
  }
});

Deno.test('ÉTAPE 0 — une course entière à 1 Hz ne produit que DEUX phrases', () => {
  // Une minute de jauge telle qu'elle sort vraiment du capteur : du silence,
  // l'approche, la bande assistée, puis la fermeture — avec le tremblement de
  // quelques mètres qui fait osciller l'état autour du seuil (`gauge()` n'a
  // AUCUNE hystérésis). Une voix branchée sur l'état dirait ici ~60 phrases.
  const seconde: GaugePhase[] = [
    ...Array<GaugePhase>(20).fill('silent'),
    ...Array<GaugePhase>(15).fill('missing'),
    'almost', 'almost', 'missing', 'almost', 'almost', 'almost',
    'closed', 'almost', 'closed', 'closed', 'missing', 'closed',
    ...Array<GaugePhase>(15).fill('closed'),
  ];

  const dites: GaugeVoiceCue[] = [];
  let avant: GaugePhase = 'silent';
  let memoire: GaugeVoiceCue | null = null;
  for (const apres of seconde) {
    const phrase = gaugeVoice(avant, apres, memoire);
    avant = apres;
    if (phrase !== null) {
      memoire = phrase;
      dites.push(phrase);
    }
  }

  assertEquals(dites.length, 2, `phrases dites : ${dites.join(', ')}`);
  assertEquals(dites[0], 'runLoopAlmost');
  assertEquals(dites[1], 'runLoopClosed');
});

// ─── Ce qui parle ───────────────────────────────────────────────────────────

Deno.test('la FERMETURE parle, même sans être passée par « presque »', () => {
  assertEquals(gaugeVoice('missing', 'closed', null), 'runLoopClosed');
  assertEquals(gaugeVoice('silent', 'closed', null), 'runLoopClosed');
  assertEquals(gaugeVoice('almost', 'closed', 'runLoopAlmost'), 'runLoopClosed');
});

Deno.test('la QUASI-fermeture parle une fois, et seulement en PREMIÈRE nouvelle', () => {
  assertEquals(gaugeVoice('missing', 'almost', null), 'runLoopAlmost');
  assertEquals(gaugeVoice('silent', 'almost', null), 'runLoopAlmost');
  // Déjà dite : une deuxième fois serait du bavardage.
  assertEquals(gaugeVoice('missing', 'almost', 'runLoopAlmost'), null);
});

// ─── Ce qui se tait ─────────────────────────────────────────────────────────

Deno.test('on ne RÉTROGRADE jamais à voix haute — « presque » ne suit pas « fermée »', () => {
  // Ce serait une correction dite dans l'oreille de quelqu'un qui vient
  // d'entendre une bonne nouvelle : un reproche, que L19 interdit.
  assertEquals(gaugeVoice('closed', 'almost', 'runLoopClosed'), null);
});

Deno.test('S’ÉLOIGNER ne parle PAS, et PERDRE la boucle non plus', () => {
  for (const avant of PHASES) {
    for (const m of MEMOIRES) {
      assertEquals(gaugeVoice(avant, 'missing', m), null, `${avant} → missing`);
      assertEquals(gaugeVoice(avant, 'silent', m), null, `${avant} → silent`);
    }
  }
});

Deno.test('INVARIANT : la voix ne parle nulle part où l’haptique se tait', () => {
  // La voix est le canal le plus intrusif du jeu : elle ne peut pas être plus
  // bavarde que la vibration. Si cet invariant tombe, c'est qu'une phrase a été
  // ajoutée sans repasser par la grammaire d'événements de L6.
  for (const avant of PHASES) {
    for (const apres of PHASES) {
      for (const m of MEMOIRES) {
        if (gaugeVoice(avant, apres, m) !== null) {
          assert(
            gaugeHaptic(avant, apres) !== null,
            `${avant} → ${apres} parle mais ne vibre pas`,
          );
        }
      }
    }
  }
});

// ─── Le départ ──────────────────────────────────────────────────────────────

Deno.test('le DÉPART parle, la REPRISE non', () => {
  assertEquals(startVoice(false), 'voiceStart');
  // « C'est parti » à quelqu'un qui reprend une course commencée des kilomètres
  // plus tôt démentirait à voix haute ce que l'écran affirme au même instant.
  assertEquals(startVoice(true), null);
});

// ─── L18 : ce sont des CLÉS, et elles existent ──────────────────────────────

Deno.test('les trois phrases sont des clés du catalogue, traduites partout (L18)', () => {
  // La décision rend une clé, jamais du texte. Ce test est ce qui empêche la
  // voix de devenir le seul endroit de l'app où une chaîne est écrite en dur —
  // et il vérifie les cinq langues, pas seulement celle qu'on entend au bureau.
  const cues: VoiceCue[] = ['voiceStart', 'runLoopAlmost', 'runLoopClosed'];
  for (const cue of cues) {
    const entry = C[cue];
    for (const locale of LOCALES) {
      assert(entry[locale].length > 0, `« ${cue} » vide en ${locale}`);
    }
  }
});
