/**
 * GRYD — LES DEUX ÉCRANS DU LOT T SONT BRANCHÉS SUR CE QUE LE SERVEUR FAIT.
 *
 * Ces gardes lisent la SOURCE plutôt que d'exécuter React : `confidentialite.tsx`
 * et `app/course/[id].tsx` tirent AsyncStorage, expo-router, supabase-js et le
 * GPS, que Deno n'a pas à résoudre pour vérifier qu'une ligne d'écran est bien
 * branchée sur le fait qu'elle annonce. Même patron que `privacyScreen.test.ts`,
 * et pour la même raison : le défaut à empêcher n'est pas une logique fausse,
 * c'est une PHRASE sans code derrière — ou un code sans phrase devant.
 *
 * ═══ ÉTAPE 0 — CE QUI ÉTAIT FAUX ════════════════════════════════════════════
 * Jusqu'au 11/09/2026, le catalogue `journal.ts` annonçait, dans le détail de
 * chaque sortie, que la trace protégée « s'efface au bout de 90 jours ». C'était
 * vrai POUR TOUT LE MONDE (job `gryd_purge_polylines`, 0102) — et personne
 * n'avait choisi cette durée, ni ne pouvait en choisir une autre. Depuis
 * 0195/0196, la conservation est un choix dont le défaut est « tout garder » :
 * cette phrase serait devenue un mensonge le jour du déploiement. Le premier
 * test verrouille son retrait.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../../i18n/types.ts';
import { C as R } from '../../i18n/catalog/reglages.ts';
import { C as H } from '../../i18n/catalog/historique.ts';
import { C as J } from '../../i18n/catalog/journal.ts';
import { TRACE_RETENTION_CHOICES_2026 } from '@klaim/shared';

const read = (relative: string) => Deno.readTextFile(new URL(relative, import.meta.url));

Deno.test('étape 0 — plus aucune phrase n’annonce une purge à 90 jours à qui n’a rien choisi', () => {
  for (const locale of LOCALES) {
    assertEquals(
      /90\s*(jours|days|días|Tage|dias)/.test(J.traceMasked[locale]),
      false,
      `journal.traceMasked.${locale} annonce encore une échéance : « ${J.traceMasked[locale]} »`,
    );
  }
  // Ce qui RESTE vrai pour tout le monde y est toujours dit : les extrémités
  // sont retirées de la trace protégée.
  assert(J.traceMasked.fr.includes('départ'));
});

Deno.test('CONFIDENTIALITÉ — les trois choix sont peints, et aucun n’est un libellé mort', async () => {
  const src = await read('../../../app/confidentialite.tsx');
  assert(src.includes('<TraceRetentionBlock'), 'le bloc doit être rendu');
  assert(
    src.includes('TRACE_RETENTION_ORDER.map'),
    'les pastilles viennent de la constante partagée, pas d’une liste recopiée',
  );
  // Chaque valeur du domaine a SON libellé et SA conséquence : un choix sans
  // conséquence écrite obligerait le joueur à deviner ce qu'il change.
  for (const choice of TRACE_RETENTION_CHOICES_2026) {
    assert(
      new RegExp(`\\b${choice}:\\s*C\\.trace`).test(src),
      `${choice} doit avoir son libellé ET sa conséquence`,
    );
  }
  assertEquals(Object.keys(R).includes('traceKeepConseq'), true);
});

Deno.test('CONFIDENTIALITÉ — le simple affichage n’efface RIEN', async () => {
  const src = await read('../../../app/confidentialite.tsx');
  const block = src.slice(src.indexOf('function TraceRetentionBlock'));
  const body = block.slice(0, block.indexOf('\n}\n'));
  // Aucune écriture au montage : la seule écriture part d'un `onChange`.
  assertEquals(body.includes('useEffect'), false, 'aucun effet : ouvrir la page n’écrit pas');
  assert(body.includes('saveTraceRetention'), 'l’écriture existe…');
  assert(body.includes('onChange'), '…et elle part d’un geste');
  // …et rien n'appelle jamais l'effacement depuis cette page.
  assertEquals(body.includes('deleteRunTrace'), false);
});

Deno.test('CONFIDENTIALITÉ — « on n’a pas pu lire » n’est jamais déguisé en « tout est gardé »', async () => {
  const src = await read('../../../app/confidentialite.tsx');
  const block = src.slice(src.indexOf('function TraceRetentionBlock'));
  const body = block.slice(0, block.indexOf('\n}\n'));
  assert(body.includes('current === null'), 'le quatrième état doit être traité à part');
  assert(body.includes('traceRetentionUnknownTitle'), 'et il a sa propre copie');
  // Le repli interdit : présélectionner `keep` quand le serveur n'a rien dit.
  assertEquals(
    /current\s*\?\?\s*'keep'/.test(body),
    false,
    'aucun repli sur « keep » : ce serait affirmer un réglage que personne n’a confirmé',
  );
});

Deno.test('DÉTAIL DE SORTIE — l’effacement passe par la RPC, jamais par un update client', async () => {
  const src = await read('../../../app/course/[id].tsx');
  assert(src.includes("from '../../src/features/privacy/traceDelete'"), 'l’I/O est partagée');
  assert(src.includes('deleteRunTrace(run.id)'), 'et elle porte l’identifiant de CETTE sortie');
  // « Tout claim est décidé serveur ; écriture client interdite sur les tables
  // de jeu » : aucun `.from('runs').update(` ne doit apparaître ici.
  assertEquals(/\.from\(\s*'runs'\s*\)[\s\S]{0,80}\.update\(/.test(src), false);
});

Deno.test('DÉTAIL DE SORTIE — irréversible donc confirmé, et la confirmation dit ce qui RESTE', async () => {
  const src = await read('../../../app/course/[id].tsx');
  assert(src.includes('traceDeleteConfirmTitle'), 'une confirmation existe');
  assert(src.includes("style: 'destructive'"), 'et elle nomme l’action destructive');
  // La phrase de confirmation doit énumérer ce qui survit : sans elle, l'action
  // se lirait « supprimer la sortie ».
  for (const kept of ['distance', 'terrain']) {
    assert(
      H.traceDeleteConfirmBody.fr.toLowerCase().includes(kept),
      `la confirmation doit dire que « ${kept} » reste`,
    );
  }
});

Deno.test('DÉTAIL DE SORTIE — chaque issue a SA phrase, et le plancher n’est pas un échec', async () => {
  const src = await read('../../../app/course/[id].tsx');
  for (const entry of [
    'traceDeleteDoneBody',
    'traceDeleteAlreadyBody',
    'traceDeleteReviewBody',
    'traceDeleteNotFoundBody',
    'traceDeleteFailedBody',
  ]) {
    assert(src.includes(entry), `l’issue ${entry} doit être câblée`);
  }
  // Une revue ouverte n'est PAS un échec : elle a son propre titre, qui ne dit
  // pas « rien n'a été supprimé » mais « vérification en cours ».
  assert(src.includes('traceDeleteReviewTitle'));
  for (const locale of LOCALES) {
    assert(
      H.traceDeleteReviewTitle[locale] !== H.traceDeleteFailedTitle[locale],
      `un plancher n’est pas une panne : ${locale} donne le même titre aux deux`,
    );
  }
  // …et sa copie promet le RETOUR du droit, elle ne le confisque pas.
  assert(H.traceDeleteReviewBody.fr.includes('Tu pourras'));
});

Deno.test('DÉTAIL DE SORTIE — aucun bouton mort : sans tracé, la ligne disparaît', async () => {
  const src = await read('../../../app/course/[id].tsx');
  const cta = src.slice(src.indexOf('styles.deleteTraceCta') - 400, src.indexOf('styles.deleteTraceCta') + 600);
  assert(cta.includes('hasTrace ?'), 'la ligne n’existe que s’il y a un tracé à effacer');
  // Et après un effacement, l'écran RELIT plutôt que de garder une carte que le
  // serveur n'a plus : l'état honnête « Tracé non disponible » existe déjà.
  assert(src.includes('onTraceDeleted={reload}'), 'la relecture doit être branchée');
  assert(src.includes('onTraceDeleted();'));
});
