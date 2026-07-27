/**
 * GRYD — E37 : LE PANNEAU DE FIN NE PEUT PAS SE DÉCERNER UN SUCCÈS.
 *
 * ─── POURQUOI UN TEST DE SOURCE, ET PAS SEULEMENT UN TEST DE MOTEUR ─────────
 * `shareOutcome.test.ts` prouve la RÈGLE : une annulation ne produit pas de
 * panneau, `expo-sharing` et Android ne confirment jamais rien. Il ne peut rien
 * prouver du CÂBLAGE — et c'est là que la faute se commet en pratique : il
 * suffit d'écrire `SHARE_COPY.doneTitleConfirmed` sans garde dans le composant
 * pour que « Partage terminé » s'affiche après un « Annuler », avec un moteur
 * pourtant juste. C'est exactement le défaut qu'`exportedCardCopy.test.ts` a
 * attrapé sur les cartes : un catalogue juste servi au mauvais endroit produit
 * le même mensonge qu'un catalogue faux.
 *
 * `ShareDonePanel.tsx` et `app/partage.tsx` sont des modules React Native, donc
 * non importables en Deno — mais leur texte, lui, se lit.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { SHARE_COPY } from './copy.ts';
import { LOCALES, type Entry } from '../../i18n/types.ts';

const PANEL_SRC = Deno.readTextFileSync(new URL('./ShareDonePanel.tsx', import.meta.url));
const SCREEN_SRC = Deno.readTextFileSync(new URL('../../../app/partage.tsx', import.meta.url));

/** Les entrées introduites pour E37 (spec l.1463-1472). */
const E37: Record<string, Entry> = {
  doneTitleConfirmed: SHARE_COPY.doneTitleConfirmed,
  doneBodyConfirmed: SHARE_COPY.doneBodyConfirmed,
  doneTitleHandedOff: SHARE_COPY.doneTitleHandedOff,
  doneBodyHandedOff: SHARE_COPY.doneBodyHandedOff,
  doneBackToResult: SHARE_COPY.doneBackToResult,
  doneShareAgain: SHARE_COPY.doneShareAgain,
  doneCloseA11y: SHARE_COPY.doneCloseA11y,
};

// ═══ 1. LA COPIE ════════════════════════════════════════════════════════════

Deno.test('E37 : cinq langues, aucune vide (ce que le typage ne voit pas)', () => {
  for (const [key, entry] of Object.entries(E37)) {
    for (const locale of LOCALES) {
      const s = entry[locale];
      assert(typeof s === 'string' && s.trim().length > 0, `${key}.${locale} vide`);
    }
  }
});

Deno.test('§A.9 : aucun texte d’action ne se termine par une ellipse', () => {
  for (const [key, entry] of Object.entries(E37)) {
    for (const locale of LOCALES) {
      assert(!entry[locale].includes('…'), `${key}.${locale} contient une ellipse`);
      assert(!entry[locale].includes('...'), `${key}.${locale} contient une ellipse`);
    }
  }
});

Deno.test('français : tutoiement (des tests du projet le verrouillent ailleurs)', () => {
  for (const [key, entry] of Object.entries(E37)) {
    const fr = entry.fr.toLowerCase();
    for (const interdit of [' vous ', ' votre ', ' vos ']) {
      assert(!` ${fr} `.includes(interdit), `${key}.fr vouvoie (${interdit.trim()})`);
    }
  }
});

Deno.test('portugais : jamais « teu » / « tua »', () => {
  for (const [key, entry] of Object.entries(E37)) {
    const mots = entry.pt.toLowerCase().split(/[^a-zà-ú]+/);
    for (const interdit of ['teu', 'teus', 'tua', 'tuas']) {
      assert(!mots.includes(interdit), `${key}.pt utilise « ${interdit} »`);
    }
  }
});

Deno.test('aucune entrée E37 ne NOMME une discipline (ni jumeau vélo à tenir)', () => {
  // Ce panneau ne décrit aucun effort : il parle d'un ENVOI. S'il nommait la
  // course, il lui faudrait un jumeau vélo comme `resultCopy` — et c'est
  // précisément la dette que ces libellés évitent en restant neutres.
  const interdits = [
    'course',
    'sortie',
    'run',
    'ride',
    'carrera',
    'corrida',
    'pedalada',
    'lauf',
    'fahrt',
  ];
  for (const [key, entry] of Object.entries(E37)) {
    for (const locale of LOCALES) {
      const mots = entry[locale].toLowerCase().split(/[^a-zà-ú]+/);
      for (const mot of interdits) {
        assert(!mots.includes(mot), `${key}.${locale} nomme une discipline (« ${mot} »)`);
      }
    }
  }
});

// ═══ 2. LE CÂBLAGE DU PANNEAU ═══════════════════════════════════════════════

Deno.test('« Partage terminé » est SERVI SOUS GARDE, jamais en dur', () => {
  // Le titre de succès n'apparaît qu'à un seul endroit, et cet endroit est le
  // ternaire gardé par la revendication du moteur.
  const occurrences = PANEL_SRC.split('doneTitleConfirmed').length - 1;
  assertEquals(occurrences, 1, 'le titre de succès apparaît ailleurs que sous sa garde');
  assert(
    PANEL_SRC.includes("const confirmed = claim === 'confirmed';"),
    'la garde ne lit plus la revendication du moteur',
  );
  assert(
    PANEL_SRC.includes(
      'confirmed ? SHARE_COPY.doneTitleConfirmed : SHARE_COPY.doneTitleHandedOff',
    ),
    'le titre n’est plus choisi par la revendication',
  );
  assert(
    PANEL_SRC.includes('confirmed ? SHARE_COPY.doneBodyConfirmed : SHARE_COPY.doneBodyHandedOff'),
    'la phrase n’est plus choisie par la revendication',
  );
});

Deno.test('le panneau ne s’ouvre QUE sur la décision du moteur pur', () => {
  assert(
    SCREEN_SRC.includes("if (outcome.surface === 'panel'"),
    'l’écran n’ouvre plus le panneau sur `shareOutcome`',
  );
  // Toute ouverture porte la revendication CALCULÉE ; les autres appels ferment.
  for (const call of SCREEN_SRC.split('setDone(').slice(1)) {
    assert(
      call.startsWith('null)') || call.startsWith('{ claim: outcome.claim'),
      `un setDone(…) n’est ni une fermeture ni une revendication du moteur : ${call.slice(0, 40)}`,
    );
  }
});

Deno.test('AUCUN BOUTON MORT : le profil public n’est pas peint (aucune route)', () => {
  assert(
    SCREEN_SRC.includes('const PUBLIC_PROFILE_ROUTE_EXISTS = false;'),
    'la capacité « profil public » a été mise à vrai sans qu’une route existe',
  );
});

Deno.test('« Lien copié » n’est affiché qu’après une copie RÉELLE', () => {
  assert(
    SCREEN_SRC.includes("if (r.ok && r.via === 'clipboard')"),
    'la confirmation de copie ne lit plus le canal réel',
  );
  assert(
    PANEL_SRC.includes("t(id === 'copy_link' && linkCopied ? C.linkCopied : ACTION_LABEL[id])"),
    'le libellé « Lien copié » ne dépend plus d’une copie mesurée',
  );
});
