/**
 * GRYD — ce qu'une ligne du Verify Hub a le droit d'affirmer.
 *
 * Ce que ces tests protègent, dans l'ordre de gravité :
 *  1. LE COÛT N'EST JAMAIS PAYÉ AVANT LE MESSAGE. Sans compte, « Importer »
 *     ouvrait le sélecteur de fichier natif, lisait et parsait le GPX — puis
 *     annonçait qu'il fallait un compte. La condition « pas de compte » doit
 *     donc PRIMER sur l'action, pas la suivre ;
 *  2. un statut PAS ENCORE LU n'est pas un statut : il ne se rend ni comme
 *     « prêt », ni comme « bloqué », ni comme un « … » qui n'affirme rien ;
 *  3. la source NATIVE n'exige jamais de compte — la capture GPS locale marche
 *     hors ligne, et lui réclamer une session serait un obstacle inventé ;
 *  4. une ligne de contexte ne montre jamais un séparateur orphelin : un segment
 *     sans source disparaît, il ne devient pas « — ».
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { sourceContextLine, sourceRowKind } from './rowView.ts';

const connectable = { availability: 'connectable' as const, signedIn: true, busy: false };

Deno.test('PAS DE COMPTE prime sur l’action : on le dit avant le sélecteur de fichier', () => {
  assertEquals(
    sourceRowKind({ ...connectable, action: 'import', status: 'disconnected', signedIn: false }),
    'needsAccount',
  );
  assertEquals(
    sourceRowKind({ ...connectable, action: 'connect', status: 'disconnected', signedIn: false }),
    'needsAccount',
  );
  // Même une source DÉJÀ connectée : sans session, l'aller-retour serveur ne
  // peut pas aboutir — on ne peint pas une action qui échouerait.
  assertEquals(
    sourceRowKind({ ...connectable, action: 'connect', status: 'connected', signedIn: false }),
    'needsAccount',
  );
});

Deno.test('un statut pas encore lu se dit « lecture », jamais autre chose', () => {
  assertEquals(sourceRowKind({ ...connectable, action: 'import', status: undefined }), 'reading');
  // Et il passe AVANT « pas de compte » : on ne peut pas conclure sur une
  // source dont on n'a même pas lu l'état.
  assertEquals(
    sourceRowKind({ ...connectable, action: 'import', status: undefined, signedIn: false }),
    'reading',
  );
});

Deno.test('la source native est active, sans compte et sans lecture', () => {
  assertEquals(
    sourceRowKind({ availability: 'native', status: undefined, busy: false, signedIn: false }),
    'active',
  );
});

Deno.test('les actions et les blocages se distinguent', () => {
  assertEquals(sourceRowKind({ ...connectable, action: 'import', status: 'disconnected' }), 'import');
  assertEquals(sourceRowKind({ ...connectable, action: 'connect', status: 'disconnected' }), 'connect');
  assertEquals(sourceRowKind({ ...connectable, status: 'disconnected' }), 'connect');
  assertEquals(sourceRowKind({ ...connectable, action: 'import', status: 'connected' }), 'connected');
  assertEquals(sourceRowKind({ ...connectable, action: 'import', status: 'app_only' }), 'blocked');
  assertEquals(sourceRowKind({ ...connectable, action: 'import', status: 'needs_keys' }), 'blocked');
});

Deno.test('une action en vol ne se confond avec aucun état stable', () => {
  assertEquals(
    sourceRowKind({ ...connectable, action: 'import', status: 'disconnected', busy: true }),
    'busy',
  );
  assertEquals(
    sourceRowKind({ ...connectable, action: 'connect', status: 'connected', busy: true }),
    'busy',
  );
});

Deno.test('la ligne de contexte n’affiche jamais un séparateur orphelin', () => {
  assertEquals(sourceContextLine(['Trust élevé', 'Capture directe']), 'Trust élevé · Capture directe');
  assertEquals(sourceContextLine(['Trust élevé', undefined, '412 points']), 'Trust élevé · 412 points');
  assertEquals(sourceContextLine([undefined, null, '   ']), '');
  assertEquals(sourceContextLine(['Trust moyen']), 'Trust moyen');
});
