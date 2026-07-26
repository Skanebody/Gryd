/**
 * GRYD — tests du garde-fou de vocabulaire (fonctions PURES, zéro JSX).
 *
 * Ce module est la brique sur laquelle reposent `profil.test.ts` et
 * `reglages.test.ts` : s'il se trompe, les deux catalogues croient à tort être
 * neutres. On le teste donc DANS LES DEUX SENS — ce qui doit être repéré l'est,
 * et ce qui ne doit pas l'être ne l'est pas — avec une attention particulière
 * au piège qui l'a réellement fait mentir en cours d'écriture : `\b` est ASCII,
 * et « à pied » / « zu Fuß » / « a pé » n'y ont PAS de frontière de mot.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { clesQuiNommentUneDiscipline, porteeDuTexte } from './disciplineVocabulary.ts';

Deno.test('la course à pied est repérée dans les 5 langues', () => {
  assertEquals(porteeDuTexte('Historique des courses'), 'course');
  assertEquals(porteeDuTexte('Run history'), 'course');
  assertEquals(porteeDuTexte('Historial de carreras'), 'course');
  assertEquals(porteeDuTexte('Lauf-Historie'), 'course');
  assertEquals(porteeDuTexte('Histórico de corridas'), 'course');
});

Deno.test('le vélo est repéré dans les 5 langues (symétrie exigée)', () => {
  assertEquals(porteeDuTexte('Territoire à vélo'), 'velo');
  assertEquals(porteeDuTexte('Cycling territory'), 'velo');
  assertEquals(porteeDuTexte('Territorio en bici'), 'velo');
  assertEquals(porteeDuTexte('Rad-Gebiet'), 'velo');
  assertEquals(porteeDuTexte('Território de bike'), 'velo');
});

Deno.test('les libellés neutralisés de cette vague passent pour neutres', () => {
  for (
    const texte of [
      'Historique des sorties',
      'Activity history',
      'Historial de actividades',
      'Aktivitäten-Verlauf',
      'Histórico de atividades',
      'PENDANT LA SORTIE',
      'DURING THE ACTIVITY',
      'WÄHREND DER AKTIVITÄT',
      'Pourquoi ma sortie n’a pas compté ?',
      'Warum zählte meine Aktivität nicht?',
    ]
  ) {
    assertEquals(porteeDuTexte(texte), 'neutre', `« ${texte} » ne devrait nommer aucun monde`);
  }
});

Deno.test('« à pied comme à vélo » nomme LES DEUX — le piège des bornes ASCII', () => {
  // C'est exactement ce que `\b` ratait : « , à pied » n'a pas de frontière de
  // mot ASCII avant « à ». Sans les bornes Unicode, ces phrases se lisaient
  // « vélo seul » — la neutralisation la plus explicite passait pour la faute.
  assertEquals(porteeDuTexte('Respecte le code de la route, à pied comme à vélo.'), 'les-deux');
  assertEquals(porteeDuTexte('Respect traffic rules, on foot as on a bike.'), 'les-deux');
  assertEquals(porteeDuTexte('Respeta las normas, a pie o en bici.'), 'les-deux');
  assertEquals(porteeDuTexte('Halte dich an die Regeln, zu Fuß wie auf dem Rad.'), 'les-deux');
  assertEquals(porteeDuTexte('Respeite as leis, a pé ou de bike.'), 'les-deux');
});

Deno.test('les faux amis ne déclenchent pas', () => {
  // Un garde-fou qui crie sur « Enregistrement en cours… » finit désactivé.
  assertEquals(porteeDuTexte('Enregistrement en cours…'), 'neutre');
  assertEquals(porteeDuTexte('Tous tes parcours sont là'), 'neutre');
  assertEquals(porteeDuTexte('This build runs without an account'), 'neutre');
  assertEquals(porteeDuTexte('GRYD konnte nicht lesen, ob eine Löschung läuft.'), 'neutre');
});

Deno.test('le balayage d’un catalogue ne rend que les clés fautives, triées', () => {
  const faux = {
    aNeutre: { fr: 'Historique des sorties', en: 'Activity history' },
    zCourse: { fr: 'Historique des sorties', en: 'Run history' }, // UNE langue suffit
    mVelo: { fr: 'Sortie vélo', en: 'Bike ride' },
    bDeux: { fr: 'à pied comme à vélo', en: 'on foot as on a bike' },
  };
  assertEquals(clesQuiNommentUneDiscipline(faux), ['mVelo', 'zCourse']);
});

Deno.test('MUTATION : remettre « courses » dans un libellé neutre le fait ressortir', () => {
  // La preuve que le filet attrape la régression qu'il est censé attraper : on
  // rejoue le défaut du 26/07 (le libellé d'historique renommé « courses »).
  const avant = { previewHistory: { fr: 'Historique des sorties · 12' } };
  assertEquals(clesQuiNommentUneDiscipline(avant), []);
  const apres = { previewHistory: { fr: 'Historique des courses · 12' } };
  assert(clesQuiNommentUneDiscipline(apres).includes('previewHistory'));
});
