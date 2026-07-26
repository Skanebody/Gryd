/**
 * GRYD — LE NOM ET LE @HANDLE DE REPLI CHANGENT ENSEMBLE, OU PAS DU TOUT.
 *
 * Le mot de repli d'un joueur (`profil.defaultPlayerName`) et le @handle de
 * repli sont le MÊME correctif : le second est dérivé du premier. Les corriger
 * à moitié fabriquerait deux vérités — un joueur nommé « Joueur » avec un
 * pseudo @coureur, ou l'inverse.
 *
 * Ces tests verrouillent les trois faits qui font que la correction tient :
 *  1. les cinq mots de repli traversent INTACTS le filtre ASCII du @handle
 *     (c'est le défaut que l'ancien « Läufer » → « lufer » avait laissé passer) ;
 *  2. le @handle ne se localise QUE faute de mieux : dès qu'un e-mail existe,
 *     il l'emporte, donc un joueur connecté ne voit pas son @ changer quand il
 *     change la langue de son téléphone ;
 *  3. le pseudo produit reste ACCEPTABLE par la base (HANDLE_REGEX, 0011) —
 *     y compris pour un nom de compte entièrement non latin.
 *
 * PUR : aucun React, aucun réseau — Deno-testable. Le catalogue est importé
 * pour tester les VRAIS mots des 5 langues, pas des copies de test.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { HANDLE_REGEX } from '@klaim/shared';
import { LOCALES } from '../../i18n/types.ts';
import { C } from '../../i18n/catalog/profil.ts';
import {
  fallbackIdentity,
  isUsableHandle,
  LAST_RESORT_HANDLE,
  sanitizeHandle,
} from './playerHandle.ts';

Deno.test('les 5 mots de repli survivent au filtre ASCII du @handle', () => {
  // LE DÉFAUT RÉEL DU 26/07 : « Läufer ».toLowerCase() = « läufer », et le
  // filtre `[^a-z0-9_]` SUPPRIME le « ä » → « lufer ». Un germanophone sans nom
  // de compte portait un pseudo qui ne veut rien dire dans aucune langue.
  for (const locale of LOCALES) {
    const mot = C.defaultPlayerName[locale];
    const handle = sanitizeHandle(mot);
    assertEquals(
      handle,
      mot.toLowerCase(),
      `defaultPlayerName.${locale} est mutilé par le filtre : « ${mot} » → « ${handle} »`,
    );
    assert(
      isUsableHandle(handle),
      `le @handle dérivé de defaultPlayerName.${locale} est refusé par la base : « ${handle} »`,
    );
  }
});

Deno.test('MUTATION : l’ancien mot allemand aurait échoué à ce test', () => {
  // La preuve que le filet attrape la régression qu'il est censé attraper.
  assertEquals(sanitizeHandle('Läufer'), 'lufer');
  assert(sanitizeHandle('Läufer') !== 'läufer');
  assertEquals(sanitizeHandle('Spieler'), 'spieler');
});

Deno.test('l’e-mail l’emporte : un joueur connecté ne voit pas son @ changer de langue', () => {
  const fr = fallbackIdentity({ emailPrefix: 'benjamin.b', fallbackName: 'Joueur' });
  const de = fallbackIdentity({ emailPrefix: 'benjamin.b', fallbackName: 'Spieler' });
  assertEquals(fr.handle, 'benjaminb');
  assertEquals(de.handle, fr.handle);
});

Deno.test('le nom de compte prime sur le mot de repli, et le pseudo en découle', () => {
  const id = fallbackIdentity({ accountName: 'Benjamin Bel', fallbackName: 'Joueur' });
  assertEquals(id.displayName, 'Benjamin Bel');
  assertEquals(id.handle, 'benjaminbel');
});

Deno.test('sans rien du tout : le mot de repli traduit, et son pseudo', () => {
  const id = fallbackIdentity({ fallbackName: 'Joueur' });
  assertEquals(id.displayName, 'Joueur');
  assertEquals(id.handle, 'joueur');
});

Deno.test('nom entièrement non latin : le pseudo reste utilisable par la base', () => {
  // Ce cas EXISTE (compte Apple/Google avec un nom en japonais et sans e-mail
  // exploitable) : le filtre ASCII n'en garde rien, et un @handle vide serait
  // refusé par la base. On retombe sur le mot de repli traduit — pas sur un
  // littéral français codé en dur, ce qu'était l'ancien « coureur ».
  const id = fallbackIdentity({ accountName: '山田太郎', fallbackName: 'Spieler' });
  assertEquals(id.displayName, '山田太郎');
  assertEquals(id.handle, 'spieler');
  assert(HANDLE_REGEX.test(id.handle));
});

Deno.test('ultime filet : jamais un @handle vide, même si tout s’effondre', () => {
  // Ne peut se produire que si une traduction future du mot de repli n'avait
  // aucun caractère ASCII — le premier test l'interdit, celui-ci garantit qu'on
  // ne rendrait quand même pas un pseudo vide.
  const id = fallbackIdentity({ accountName: '山田', fallbackName: '選手' });
  assertEquals(id.handle, LAST_RESORT_HANDLE);
  assert(HANDLE_REGEX.test(id.handle));
});

Deno.test('les espaces ne fabriquent pas un nom vide', () => {
  const id = fallbackIdentity({ accountName: '   ', emailPrefix: '  ', fallbackName: 'Player' });
  assertEquals(id.displayName, 'Player');
  assertEquals(id.handle, 'player');
});
