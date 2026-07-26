/**
 * GRYD — LA DISCIPLINE SURVIT AU PASSAGE DE RELAIS COURSE → RÉSULTAT.
 *
 * Ces tests existent à cause d'une seule ligne manquante : l'objet `params` du
 * `router.replace` vers `/course-result` portait `mode`, `dist`, `dur`,
 * `queued`… et pas la discipline. Résultat, `parseStartActivity(undefined)`
 * retombait sur `run` et un cycliste lisait « COURSE TERMINÉE » à la fin de
 * chaque sortie, sur l'écran le plus vu du jeu.
 *
 * Le filet ne peut pas être « on a rajouté la ligne » : c'est l'ALLER-RETOUR
 * COMPLET qui doit être prouvé — construction des paramètres, sérialisation
 * dans une URL (ce que fait `expo-router`), puis relecture par la fonction que
 * l'écran de résultat appelle vraiment. Un maillon cassé au milieu (clé
 * renommée, paramètre dupliqué, valeur non textuelle) redonnerait le même
 * silence, et c'est ce silence qu'on rend impossible.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES } from '@klaim/shared';
import { parseStartActivity, START_ACTIVITY_PARAM } from './runActivity.ts';
import { courseResultParams, type FinishedRunHandoff } from './resultHandoff.ts';

/** Une sortie terminée, minimale — chaque test ne surcharge que ce qu'il teste. */
function finished(over: Partial<FinishedRunHandoff> = {}): FinishedRunHandoff {
  return {
    mode: 'conquete',
    activity: 'run',
    distanceM: 4321.4,
    durationS: 1502.6,
    uploadQueued: false,
    ...over,
  };
}

/**
 * Ce que fait `expo-router` d'un objet `params` : il le pose dans l'URL. On
 * rejoue le trajet réel plutôt que de relire l'objet en mémoire — c'est
 * précisément entre les deux que la discipline se perdait.
 */
function throughUrl(params: Record<string, string>): URLSearchParams {
  const url = new URL('gryd:///course-result');
  for (const [key, value] of Object.entries(params)) url.searchParams.append(key, value);
  return new URL(url.toString()).searchParams;
}

// ─── 1. L'ALLER-RETOUR : la discipline arrive intacte, quelle qu'elle soit ──

Deno.test('la discipline survit à l’aller-retour sérialisation → relecture', () => {
  for (const activity of ACTIVITIES) {
    const query = throughUrl(courseResultParams(finished({ activity })));
    assertEquals(
      parseStartActivity(query.getAll(START_ACTIVITY_PARAM)),
      activity,
      `« ${activity} » n’est pas arrivé jusqu’au Résultat`,
    );
  }
});

Deno.test('la discipline est ÉCRITE même quand c’est la course à pied', () => {
  // Une omission « parce que c'est le défaut » rendrait le test précédent
  // vert pour la mauvaise raison : `parseStartActivity` retombe sur `run`
  // quand il ne trouve rien. C'est exactement le bug d'origine, déguisé.
  const params = courseResultParams(finished({ activity: 'run' }));
  assertEquals(params[START_ACTIVITY_PARAM], 'run');
});

Deno.test('la discipline n’est écrite QU’UNE FOIS — un lecteur ne choisit jamais', () => {
  // `parseStartActivity` garde la PREMIÈRE valeur d'un paramètre répété ; un
  // doublon rendrait le comportement dépendant de l'ordre d'écriture.
  for (const activity of ACTIVITIES) {
    const query = throughUrl(courseResultParams(finished({ activity })));
    assertEquals(query.getAll(START_ACTIVITY_PARAM).length, 1, activity);
  }
});

Deno.test('le nom du paramètre est celui du DÉPART — un seul contrat, pas deux', () => {
  // Le Résultat doit redire au joueur ce que le préflight lui a montré avant le
  // premier mètre. Deux noms de paramètre égaux aujourd'hui finiraient par
  // diverger, et la divergence serait silencieuse.
  assert(START_ACTIVITY_PARAM in courseResultParams(finished()));
});

// ─── 2. Les MESURES : entières, textuelles, relisibles ─────────────────────

Deno.test('distance et durée partent en entiers relisibles (mètres, secondes)', () => {
  const query = throughUrl(courseResultParams(finished({ distanceM: 4321.4, durationS: 1502.6 })));
  assertEquals(query.get('dist'), '4321');
  assertEquals(query.get('dur'), '1503');
  assertEquals(Number(query.get('dist')), 4321);
  assertEquals(Number(query.get('dur')), 1503);
});

Deno.test('le mode traverse tel quel — le Résultat ne redevine pas ce qui a été lancé', () => {
  for (const mode of ['conquete', 'social_run', 'course_privee']) {
    assertEquals(throughUrl(courseResultParams(finished({ mode }))).get('mode'), mode);
  }
});

// ─── 3. La file d'envoi : présente ou absente, jamais un faux booléen ──────

Deno.test('fin hors-ligne : « queued » n’existe que si l’envoi attend vraiment', () => {
  assertEquals(throughUrl(courseResultParams(finished({ uploadQueued: true }))).get('queued'), '1');
  // Absent, et surtout pas « 0 » : l'écran teste `queued === '1'`, et une clé
  // toujours présente ferait croire à un booléen là où il n'y en a pas.
  assertEquals(throughUrl(courseResultParams(finished({ uploadQueued: false }))).get('queued'), null);
});
