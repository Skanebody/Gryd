/**
 * GRYD — tests de LA DÉCLARATION AU DÉPART (E14, 26/07/2026).
 *
 * Ce que ces tests verrouillent, c'est le défaut exact trouvé par la revue
 * adversariale : deux départs sur trois ne déclaraient rien, donc enregistraient
 * TOUJOURS une course à pied, y compris atteints depuis une lentille vélo.
 *
 * La preuve n'est pas une comparaison de chaînes : chaque cible est relue par
 * `parseStartActivity` — LE lecteur réel du départ (`app/course-live.tsx`) — et
 * doit rendre la discipline qu'on a déclarée. Un test qui se contenterait de
 * chercher « activity=bike » dans l'URL validerait aussi un paramètre mal
 * nommé, mal placé, ou dupliqué.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES, DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import {
  parseStartActivity,
  START_ACTIVITY_PARAM,
  UNDECLARED_START_ACTIVITY,
} from '../run/gps/runActivity.ts';
import { START_SORTIE_BASE_HREF } from '../../ui/activityLens.ts';
import {
  missionStartHref,
  plannerHref,
  plannerStartHref,
  PLANNER_HREF,
  START_INTENTION_PARAM,
} from './startTargets.ts';
import { PLANNER_INTENTIONS } from './types.ts';

/** Relit une cible comme le fera le routeur : par sa query, pas par son texte. */
function declaredActivity(href: string): Activity {
  const url = new URL(href, 'https://gryd.app');
  return parseStartActivity(url.searchParams.getAll(START_ACTIVITY_PARAM));
}

function pathOf(href: string): string {
  return new URL(href, 'https://gryd.app').pathname;
}

Deno.test('« Commencer la mission » déclare la discipline de la lentille', () => {
  for (const activity of ACTIVITIES) {
    const href = missionStartHref(activity);
    assertEquals(declaredActivity(href), activity);
    // Le départ du briefing ne doit pas être un AUTRE départ que le GO.
    assertEquals(pathOf(href), pathOf(START_SORTIE_BASE_HREF));
  }
});

Deno.test('le CTA du planificateur déclare la discipline ET porte son objectif', () => {
  for (const activity of ACTIVITIES) {
    for (const intention of PLANNER_INTENTIONS) {
      const href = plannerStartHref(intention, activity);
      assertEquals(declaredActivity(href), activity);
      const url = new URL(href, 'https://gryd.app');
      assertEquals(url.searchParams.get('intention'), START_INTENTION_PARAM[intention]);
      assertEquals(pathOf(href), pathOf(START_SORTIE_BASE_HREF));
    }
  }
});

Deno.test('ouvrir le planificateur transmet la lentille (il n’a pas de commutateur)', () => {
  for (const activity of ACTIVITIES) {
    const href = plannerHref(activity);
    assertEquals(declaredActivity(href), activity);
    assertEquals(pathOf(href), PLANNER_HREF);
  }
});

Deno.test('en course à pied, les trois cibles sont EXACTEMENT celles d’avant le vélo', () => {
  // Non-régression stricte : aucun chemin existant ne change de sens du fait de
  // ce chantier. C'est la contrepartie de `UNDECLARED_START_ACTIVITY`.
  assertEquals(missionStartHref(DEFAULT_ACTIVITY), START_SORTIE_BASE_HREF);
  assertEquals(plannerHref(DEFAULT_ACTIVITY), PLANNER_HREF);
  assertEquals(
    plannerStartHref('conquerir', DEFAULT_ACTIVITY),
    `${START_SORTIE_BASE_HREF}&intention=conquest`,
  );
  assertEquals(
    plannerStartHref('defendre', DEFAULT_ACTIVITY),
    `${START_SORTIE_BASE_HREF}&intention=defense`,
  );
});

Deno.test('une cible SANS déclaration vaut course à pied (chemin antérieur au vélo)', () => {
  assertEquals(declaredActivity(START_SORTIE_BASE_HREF), UNDECLARED_START_ACTIVITY);
  assertEquals(declaredActivity(PLANNER_HREF), UNDECLARED_START_ACTIVITY);
});

Deno.test('aucune cible ne déclare deux fois la discipline', () => {
  // Un second `activity=` (concaténation en aveugle) serait invisible à l'œil et
  // laisserait un lien forgé glisser une discipline derrière la première.
  const hrefs = [
    ...ACTIVITIES.map(missionStartHref),
    ...ACTIVITIES.map(plannerHref),
    ...ACTIVITIES.flatMap((a) => PLANNER_INTENTIONS.map((i) => plannerStartHref(i, a))),
  ];
  for (const href of hrefs) {
    const url = new URL(href, 'https://gryd.app');
    assert(
      url.searchParams.getAll(START_ACTIVITY_PARAM).length <= 1,
      `déclaration dupliquée dans ${href}`,
    );
    // Et jamais un « ? » posé au milieu d'une query déjà commencée.
    assertEquals(href.split('?').length <= 2, true, `query malformée : ${href}`);
  }
});

Deno.test('un troisième objectif exigerait sa valeur (le Record ne se contourne pas)', () => {
  for (const intention of PLANNER_INTENTIONS) {
    const value = START_INTENTION_PARAM[intention];
    assert(typeof value === 'string' && value.length > 0);
  }
  assertEquals(Object.keys(START_INTENTION_PARAM).length, PLANNER_INTENTIONS.length);
});
