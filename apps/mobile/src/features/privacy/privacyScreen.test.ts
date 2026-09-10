/**
 * GRYD — L'ÉCRAN DE CONFIDENTIALITÉ DIT LES EXPOSITIONS QUI EXISTENT.
 *
 * Ces gardes lisent la SOURCE plutôt que d'exécuter React : `confidentialite.tsx`
 * tire AsyncStorage, expo-router, supabase-js et le GPS, que Deno n'a pas à
 * résoudre pour vérifier qu'une ligne d'écran est bien branchée sur le fait
 * qu'elle annonce. Même patron que `features/crew/moderation2026.test.ts`, et
 * pour la même raison : le défaut n'était pas une logique fausse, c'était une
 * PHRASE sans code derrière (ou, ici, un code sans phrase devant).
 *
 * ═══ ÉTAPE 0 — CE QUI ÉTAIT FAUX, ET QUE CES TESTS EMPÊCHENT DE REVENIR ═════
 * Le 10/09/2026 au matin, la ligne « Apparaître dans les classements · Bientôt »
 * a été retirée de cet écran, à raison : elle ne réglait rien. Le motif écrit
 * alors — « aucun classement n'existe dans le produit 2026 » — a expiré LE SOIR
 * MÊME : les migrations 0160-0164 ont publié « Ta commune, cette semaine », qui
 * lit `map_sharing` et `discreet_mode` (0161) et nomme ses lignes avec
 * `territory_owner_identity_2026` (0126).
 * Entre les deux, l'écran affirmait « Trois choses peuvent te rendre visible »
 * et décrivait `discreet_mode` par sa seule conséquence de CARTE : un joueur qui
 * fermait son nom ne pouvait pas savoir qu'il sortait aussi, ligne comprise, du
 * classement de sa commune.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { C } from '../../i18n/catalog/reglages.ts';
import { LOCALES } from '../../i18n/types.ts';

const read = (relative: string) => Deno.readTextFile(new URL(relative, import.meta.url));

Deno.test('la présence au classement est DÉRIVÉE, jamais un onzième interrupteur', async () => {
  const src = await read('../../../app/confidentialite.tsx');
  assert(
    src.includes('communeBoardPresence'),
    'l’écran doit dériver la présence des réglages déjà pris',
  );
  assert(src.includes('<BoardPresenceRow'), 'la ligne doit être rendue');
  // FactRow = une ligne d'INFORMATION (aucun `onPress`, aucun `onValueChange`).
  // Un `SwitchRow` ici serait soit un doublon de l'interrupteur du nom, soit une
  // contradiction avec lui.
  const row = src.slice(src.indexOf('function BoardPresenceRow'));
  assert(row.includes('<FactRow'), 'la présence s’AFFICHE, elle ne se règle pas');
  assertEquals(
    row.slice(0, row.indexOf('\n}\n')).includes('onValueChange'),
    false,
    'aucun interrupteur : la décision est déjà prise deux lignes plus haut',
  );
});

Deno.test('chaque absence porte SON motif — jamais un « non » muet', async () => {
  const src = await read('../../../app/confidentialite.tsx');
  // Les quatre cas de `CommuneBoardPresence` ont chacun leur phrase : le motif
  // `map_sharing` ne se lève PAS depuis cet écran, et le taire ferait croire
  // qu'un tap sur l'interrupteur du nom suffit à revenir dans le tableau.
  for (const entry of [
    'boardPresenceListedDetail',
    'boardPresenceDiscretionDetail',
    'boardPresenceMapDetail',
    'boardPresenceNoProfileDetail',
  ]) {
    assert(src.includes(entry), `le motif ${entry} doit être câblé`);
  }
});

Deno.test('les textes du classement existent dans les CINQ langues', () => {
  for (const entry of [
    C.boardPresenceTitle,
    C.boardPresenceInValue,
    C.boardPresenceOutValue,
    C.boardPresenceListedDetail,
    C.boardPresenceDiscretionDetail,
    C.boardPresenceMapDetail,
    C.boardPresenceNoProfileDetail,
  ]) {
    for (const locale of LOCALES) {
      assert(entry[locale].trim().length > 0, `traduction ${locale} manquante`);
    }
  }
});

Deno.test('le sous-titre annonce QUATRE expositions, et nomme le classement', () => {
  // Étape 0 : la version d'avant disait « Trois choses peuvent te rendre
  // visible » — vrai le matin, faux le soir. Le compte doit suivre le produit.
  assertEquals(C.privSubtitle.fr.startsWith('Trois choses'), false);
  assert(C.privSubtitle.fr.startsWith('Quatre choses'), 'quatre expositions réelles');
  for (const locale of LOCALES) {
    assert(
      /classement|leaderboard|clasificación|Rangliste|classificação/i.test(C.privSubtitle[locale]),
      `le sous-titre ${locale} doit nommer le classement`,
    );
  }
});

Deno.test('la conséquence de la discrétion nomme la LIGNE, pas seulement le nom', () => {
  // « sans ton nom » décrivait la carte. Sur le classement, `discreet_mode`
  // retire le sujet du tableau entier (0161) : la nuance n'en est pas une.
  for (const locale of LOCALES) {
    assert(
      /classement|leaderboard|clasificación|Rangliste|classificação/i.test(
        C.territoryNameGovernNote[locale],
      ),
      `la note ${locale} doit dire la seconde conséquence`,
    );
  }
  assert(C.territoryNameGovernNote.fr.includes('ta ligne'));
});
