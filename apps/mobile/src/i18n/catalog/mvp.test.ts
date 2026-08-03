/**
 * GRYD — la microcopy MVP tient les lois L5, L16, L18 et L19 (lot M1).
 *
 * ─── POURQUOI TESTER DES TEXTES ─────────────────────────────────────────────
 * Parce que ce sont les seules lois du MASTER qu'une relecture humaine laisse
 * passer. Un contraste se mesure, une navigation se compte — mais « ≤ 8 mots »
 * et « ne jamais accuser » se dégradent d'une traduction à l'autre, dans la
 * langue que personne ne relit. Ces tests portent donc sur les CINQ langues.
 *
 * Ce qu'ils gardent :
 *   L5  — tout message affiché PENDANT une course tient en ≤ 8 mots ;
 *   L16 — une notification nomme un FAIT de jeu, jamais un rappel culpabilisant ;
 *   L18 — parité complète, aucune variable orpheline entre langues ;
 *   L19 — aucun refus n'accuse, et le refus principal RAPPELLE ce qui est gardé.
 */
import { LOCALES } from '../types';
import { C, IN_RUN_KEYS } from './mvp';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const entries = Object.entries(C) as [string, Record<string, string>][];
const mots = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
/** Variables d'un gabarit : `{m}`, `{zone}`… — l'ordre n'importe pas, la présence si. */
const vars = (s: string) => new Set((s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).map((v) => v));

// ─── L5 — lisible en courant ────────────────────────────────────────────────

Deno.test('L5 — tout message affiché PENDANT une course tient en 8 mots ou moins', () => {
  for (const key of IN_RUN_KEYS) {
    for (const locale of LOCALES) {
      const texte = (C as Record<string, Record<string, string>>)[key]![locale]!;
      const n = mots(texte);
      assert(
        n <= 8,
        `${key} [${locale}] : ${n} mots — « ${texte} » ne se lit pas à bout de souffle`,
      );
    }
  }
});

Deno.test('L5 — les messages de la jauge visent l’idéal de 4 mots', () => {
  // Les trois phrases qui accompagnent la fermeture sont celles qu'on lit en
  // pleine tension : elles ne peuvent pas se permettre 8 mots.
  for (const key of ['runMetersLeft', 'runLoopAlmost', 'runLoopClosed'] as const) {
    for (const locale of LOCALES) {
      const texte = C[key][locale];
      assert(mots(texte) <= 4, `${key} [${locale}] : « ${texte} » dépasse l'idéal de 4 mots`);
    }
  }
});

// ─── L18 — parité réelle, pas seulement typée ───────────────────────────────

Deno.test('L18 — aucune langue ne perd une VARIABLE en route', () => {
  // Le type garantit la présence des cinq langues ; il ne garantit PAS que la
  // traduction ait gardé `{m}`. Une variable perdue affiche une phrase à trou —
  // « Il manquait m pour fermer ta boucle » — que personne ne relira jamais.
  for (const [key, e] of entries) {
    const attendu = vars(e.fr!);
    for (const locale of LOCALES) {
      const obtenu = vars(e[locale]!);
      assertEquals(
        [...obtenu].sort().join(','),
        [...attendu].sort().join(','),
        `${key} [${locale}] : variables différentes du français`,
      );
    }
  }
});

Deno.test('L18 — aucun texte n’est vide ni laissé en français par défaut', () => {
  for (const [key, e] of entries) {
    for (const locale of LOCALES) {
      assert((e[locale] ?? '').trim().length > 0, `${key} [${locale}] : texte vide`);
    }
    // Les INVARIANTS assumés (marque, signature) : identiques partout, et c'est
    // voulu. Tout le reste doit avoir été réellement traduit dans au moins une
    // langue éloignée du français.
    // `unitM2` : un symbole d'unité SI est le même dans toutes les langues.
    // Le « traduire » serait une faute, pas une amélioration.
    const invariant = ['ctaGo', 'shareTagline', 'captureGain', 'unitM2', 'unitKm'].includes(key);
    if (!invariant) {
      assert(
        e.de !== e.fr || e.en !== e.fr,
        `${key} : identique au français en anglais ET en allemand — traduction oubliée ?`,
      );
    }
  }
});

// ─── L19 — l'app n'accuse jamais ────────────────────────────────────────────

Deno.test('L19 — aucun refus n’emploie de mot qui accuse', () => {
  // Vocabulaire du reproche, dans les cinq langues. Un refus dit ce qui s'est
  // passé et ce qu'il manquait ; il ne qualifie jamais le joueur ni son effort.
  const accusateurs = [
    'échec', 'échoué', 'raté', 'invalide', 'refusé', 'rejeté', 'erreur', 'triche',
    'failed', 'invalid', 'rejected', 'error', 'cheat',
    'fallo', 'inválido', 'rechazado',
    'fehler', 'ungültig', 'abgelehnt',
    'falha', 'inválido', 'rejeitado',
  ];
  for (const [key, e] of entries) {
    for (const locale of LOCALES) {
      const bas = e[locale]!.toLowerCase();
      for (const mot of accusateurs) {
        assert(!bas.includes(mot), `${key} [${locale}] : « ${mot} » accuse — « ${e[locale]} »`);
      }
    }
  }
});

Deno.test('L19 — le refus principal RAPPELLE ce qui est conservé', () => {
  // « Tes stats restent disponibles » n'est pas une politesse : c'est la moitié
  // du message. Sans elle, le joueur croit avoir tout perdu.
  const garde = { fr: 'stats', en: 'stats', es: 'estadísticas', de: 'statistik', pt: 'estatísticas' };
  for (const locale of LOCALES) {
    const bas = C.verifyPartial[locale].toLowerCase();
    assert(
      bas.includes(garde[locale as keyof typeof garde]),
      `verifyPartial [${locale}] : ne dit pas ce qui est CONSERVÉ — « ${C.verifyPartial[locale]} »`,
    );
  }
});

Deno.test('L19 — le manque se dit en MÈTRES, jamais en jugement', () => {
  for (const locale of LOCALES) {
    assert(
      vars(C.verifyGap[locale]).has('{m}'),
      `verifyGap [${locale}] : sans le nombre de mètres, la phrase redevient un « raté »`,
    );
  }
});

// ─── L16 — une notification nomme un fait ───────────────────────────────────

Deno.test('L16 — chaque notification porte un FAIT nommé, pas un rappel', () => {
  // Un fait de jeu se reconnaît à ses variables : QUI, QUOI, OÙ. Une notif sans
  // variable est un rappel générique — exactement ce que L16 interdit.
  for (const key of ['notifTaken', 'notifFragile', 'notifCrewRank'] as const) {
    for (const locale of LOCALES) {
      assert(
        vars(C[key][locale]).size > 0,
        `${key} [${locale}] : aucune variable — c'est un rappel, pas un fait`,
      );
    }
  }
});

// ─── L8 — un état vide contient l'action qui le remplit ─────────────────────

Deno.test('L8 — l’état vide de la carte dit QUOI FAIRE', () => {
  for (const locale of LOCALES) {
    const texte = C.emptyMap[locale];
    // Deux phrases : le constat, puis l'action. Sans la seconde, c'est un mur.
    assert(
      /[.!]\s+\S/.test(texte),
      `emptyMap [${locale}] : une seule phrase — l'action manque : « ${texte} »`,
    );
  }
});

// ─── La liste in-run ne peut pas se vider en silence ────────────────────────

Deno.test('IN_RUN_KEYS reste peuplée et pointe des clés RÉELLES', () => {
  // Si quelqu'un vide cette liste, la limite des 8 mots cesse de s'appliquer
  // sans qu'aucun test ne rougisse. C'est ce test qui l'empêche.
  assert(IN_RUN_KEYS.length >= 5, 'la liste in-run a été vidée : L5 ne garde plus rien');
  for (const key of IN_RUN_KEYS) {
    assert(key in C, `IN_RUN_KEYS pointe « ${key} », absente du catalogue`);
  }
});
