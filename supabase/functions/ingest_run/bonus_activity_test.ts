/**
 * GRYD — UNE RÉCOMPENSE APPARTIENT AU MONDE DE SON DÉCLENCHEUR (E14, 0071).
 *
 * Le défaut réparé ici, dit sans euphémisme : une fenêtre « Défense critique »
 * ouverte parce qu'une zone VÉLO s'efface, ou un « Finisher » posé sur une
 * frontière vélo, était RÉCLAMABLE PAR UNE COURSE À PIED. 0070 avait séparé
 * les territoires, 0071 faisait écrire la discipline de la fenêtre par
 * `digest_job` — mais `ingest_run` ne la lisait pas (`select('id, scope,
 * bonus_id')`). La discipline était enregistrée, elle n'était pas OPPOSÉE.
 *
 * Deux niveaux de preuve, comme ailleurs dans ce dossier :
 *   1. la RÈGLE, fonction pure (`bonusWindowOpposable`) — exécutée ;
 *   2. le CÂBLAGE dans `index.ts`, qui n'est pas exécutable ici (c'est un
 *      `Deno.serve` avec une base derrière) et se lit donc comme du TEXTE.
 *      C'est une preuve d'INTENTION du fichier, dite telle quelle — même
 *      procédé que `digest_job/activity_discipline_test.ts`.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import { ACTIVITIES } from '../_shared/game-rules.ts';
import { bonusWindowOpposable } from './activity.ts';

const INDEX = Deno.readTextFileSync(new URL('./index.ts', import.meta.url)).replace(/\s+/g, ' ');

// ════════════════════════════════════════════════════════════════════════════
// 1. LA RÈGLE — le monde de la fenêtre contre le monde de la sortie
// ════════════════════════════════════════════════════════════════════════════

Deno.test('LE DÉFAUT : une fenêtre VÉLO n’est plus réclamable par une course', () => {
  assertEquals(bonusWindowOpposable('bike', 'run'), false);
  // Et la réciproque, qui n'est pas la même faute mais serait la même injustice.
  assertEquals(bonusWindowOpposable('run', 'bike'), false);
});

Deno.test('chaque monde réclame le sien', () => {
  for (const a of ACTIVITIES) {
    assertEquals(bonusWindowOpposable(a, a), true, `${a} doit réclamer sa propre fenêtre`);
  }
});

Deno.test('une fenêtre SANS monde reste ouverte aux deux disciplines', () => {
  // `null` n'est pas « discipline inconnue » : le Coffre crew se déclenche sur
  // la progression hebdomadaire du coffre, qui n'appartient à aucun monde
  // (0071). Le refuser à un cycliste inventerait une discipline qu'il n'a pas.
  for (const a of ACTIVITIES) {
    assertEquals(bonusWindowOpposable(null, a), true);
    assertEquals(bonusWindowOpposable(undefined, a), true);
  }
});

Deno.test('une discipline ILLISIBLE ne récompense rien, et ne casse pas la course', () => {
  // La contrainte `active_bonuses_activity_check` rend le cas impossible en
  // base : ceci est une ceinture. Le choix testé est le SENS du repli — refuser
  // la récompense plutôt que lever. `applyActiveBonus` tourne APRÈS l'écriture
  // du run et l'attribution des hexagones : lever y transformerait une conquête
  // RÉELLE en 500 côté joueur. Ne pas récompenser, lui, est un résultat déjà
  // normal de ce chemin (caps, cooldown, run non vérifié) et la fenêtre reste
  // ouverte pour la prochaine sortie.
  for (const bogus of ['scooter', '', 'RUN', 'Bike', 0, 1, true, {}, []]) {
    assertEquals(
      bonusWindowOpposable(bogus, 'run'),
      false,
      `« ${JSON.stringify(bogus)} » ne doit jamais valoir une récompense`,
    );
  }
});

Deno.test('la règle ne privilégie pas la course : « run » n’est pas un passe-partout', () => {
  // Le piège serait de traiter `run` comme le monde par défaut et de le laisser
  // réclamer toutes les fenêtres — le vélo redeviendrait un citoyen de seconde
  // zone, exactement ce que la décision fondateur du 26/07/2026 refuse.
  const claimableByRun = ACTIVITIES.filter((a) => bonusWindowOpposable(a, 'run'));
  const claimableByBike = ACTIVITIES.filter((a) => bonusWindowOpposable(a, 'bike'));
  assertEquals(claimableByRun.length, 1);
  assertEquals(claimableByBike.length, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LE CÂBLAGE — la règle sert vraiment, sur les vraies lignes
// ════════════════════════════════════════════════════════════════════════════

Deno.test('ingest_run LIT la discipline des fenêtres de bonus', () => {
  assert(
    INDEX.includes(".select('id, scope, bonus_id, activity')"),
    'La lecture des fenêtres actives doit demander `activity` : sans la ' +
      'colonne, la discipline n’atteint jamais le filtre et une récompense ' +
      'vélo redevient réclamable à pied.',
  );
  assert(
    !INDEX.includes(".select('id, scope, bonus_id')"),
    'L’ancienne lecture aveugle au monde ne doit pas revenir par copier-coller.',
  );
});

Deno.test('ingest_run OPPOSE cette discipline au monde du run', () => {
  assert(
    INDEX.includes('if (!bonusWindowOpposable(r.activity, ctx.activity)) return false;'),
    'Lire la colonne sans s’en servir serait le défaut d’origine, en plus verbeux.',
  );
  assert(
    /activity: Activity;/.test(INDEX) && INDEX.includes('// Le monde de CETTE sortie'),
    'Le contexte de récompense doit porter la discipline de la sortie.',
  );
});
