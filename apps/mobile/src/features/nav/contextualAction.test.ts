/**
 * GRYD — LE BOUTON GO NE PEUT PLUS SE CONTREDIRE À VOIX HAUTE.
 *
 * LE DÉFAUT (B1, revue finale du 26/07/2026). L'écran principal composait
 * `GO — <discipline> — <action>`, où la discipline suivait la lentille et où
 * l'action disait « course » quoi qu'il arrive. Sous lentille vélo, VoiceOver
 * annonçait donc, mot pour mot :
 *     « GO — sortie vélo — Lancer une course libre »
 * Le pire défaut restant de l'app : permanent, sur le CTA le plus important, et
 * touchant les seuls utilisateurs qui ne peuvent pas le rattraper du regard.
 *
 * CE QUE CES TESTS VERROUILLENT :
 *   1. l'énoncé COMPLET ne nomme jamais deux mondes à la fois — c'est la
 *      propriété exacte qui manquait, et elle est testée sur les 5 langues,
 *      les 2 disciplines et les 5 verbes ;
 *   2. les trois actions qui PORTENT la lentille parlent bien du monde
 *      demandé (jumeaux) ;
 *   3. TERMINER et REJOINDRE restent NEUTRES — un jumeau y serait un doublon
 *      sans information ;
 *   4. les tables sont EXHAUSTIVES sur `ACTIVITIES` : aucune discipline connue
 *      du moteur ne peut être servie par les mots d'une autre.
 *
 * PUR : le module testé n'importe ni React, ni store i18n, ni AsyncStorage.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES } from '@klaim/shared';
import type { Activity } from '@klaim/shared';
import { LOCALES } from '../../i18n/types.ts';
import type { Locale } from '../../i18n/types.ts';
import { porteeDuTexte } from '../../i18n/catalog/disciplineVocabulary.ts';
import { deriveContextualAction, goButtonA11yLabel } from './contextualAction.ts';
import type { ContextInput } from './contextualAction.ts';

/** Les 5 entrées qui produisent les 5 verbes — la dérivation entière. */
const ENTREES: Readonly<Record<string, ContextInput>> = {
  run: {},
  defendre: { selectedZone: { kind: 'attacked' } },
  conquerir: { selectedZone: { kind: 'neutral' } },
  terminer: { selectedBoundary: { id: 'b-1', zone: 'République' } as never },
  rejoindre: { selectedCrewMissionId: 'm-1' },
};

/** Les 3 verbes dont l'écran PORTE la lentille (jumeaux attendus). */
const PORTENT_LA_LENTILLE = ['run', 'defendre', 'conquerir'] as const;
/** Les 2 verbes NEUTRES (aucun jumeau — c'est voulu, pas un oubli). */
const NEUTRES = ['terminer', 'rejoindre'] as const;

/** Ce que la discipline demandée doit produire comme portée de texte. */
const PORTEE_ATTENDUE: Readonly<Record<Activity, 'course' | 'velo'>> = {
  run: 'course',
  bike: 'velo',
};

Deno.test('B1 — l’énoncé de GO ne nomme JAMAIS les deux mondes à la fois', () => {
  // LE test de non-régression. `porteeDuTexte` rend 'les-deux' dès qu'une
  // phrase contient à la fois un mot de course et un mot de vélo : c'est
  // exactement la signature de « GO — sortie vélo — Lancer une course libre ».
  for (const activity of ACTIVITIES) {
    for (const [verbe, input] of Object.entries(ENTREES)) {
      for (const locale of LOCALES) {
        const action = deriveContextualAction(input, locale, activity);
        const enonce = goButtonA11yLabel(action, activity, locale);
        assertEquals(
          porteeDuTexte(enonce),
          PORTEE_ATTENDUE[activity],
          `GO/${verbe}/${activity}/${locale} annonce deux mondes (ou aucun) : « ${enonce} »`,
        );
      }
    }
  }
});

Deno.test('B1 — l’énoncé nomme TOUJOURS ce qui va être enregistré', () => {
  // Corollaire du précédent, énoncé à l'endroit : même quand l'action est
  // neutre, la discipline reste dite. Un « GO — Terminer cette zone » muet
  // laisserait le seul indice de discipline à un picto, que rien ne prononce.
  for (const activity of ACTIVITIES) {
    for (const verbe of NEUTRES) {
      for (const locale of LOCALES) {
        const action = deriveContextualAction(ENTREES[verbe], locale, activity);
        const enonce = goButtonA11yLabel(action, activity, locale);
        assert(enonce.startsWith('GO — '), `GO/${verbe}/${locale} ne commence pas par GO`);
        assertEquals(
          porteeDuTexte(enonce),
          PORTEE_ATTENDUE[activity],
          `GO/${verbe}/${activity}/${locale} n’annonce plus la discipline : « ${enonce} »`,
        );
      }
    }
  }
});

Deno.test('B1 — les JUMEAUX des 3 actions à lentille disent le bon monde', () => {
  for (const activity of ACTIVITIES) {
    for (const verbe of PORTENT_LA_LENTILLE) {
      for (const locale of LOCALES) {
        const { a11yLabel } = deriveContextualAction(ENTREES[verbe], locale, activity);
        assertEquals(
          porteeDuTexte(a11yLabel),
          PORTEE_ATTENDUE[activity],
          `${verbe}/${activity}/${locale} : « ${a11yLabel} »`,
        );
      }
    }
  }
});

Deno.test('B1 — TERMINER et REJOINDRE restent neutres, dans les deux mondes', () => {
  // Verrouille la DÉCISION de ne pas les jumeler : si quelqu'un « complète la
  // série » en leur écrivant une variante vélo, ce test tombe et le rappelle.
  // Une dimension globale ne doit pas suggérer deux compteurs.
  for (const activity of ACTIVITIES) {
    for (const verbe of NEUTRES) {
      for (const locale of LOCALES) {
        const { a11yLabel } = deriveContextualAction(ENTREES[verbe], locale, activity);
        assertEquals(
          porteeDuTexte(a11yLabel),
          'neutre',
          `${verbe}/${activity}/${locale} s’est mis à nommer une discipline : « ${a11yLabel} »`,
        );
      }
    }
  }
});

Deno.test('B1 — la discipline change les MOTS, jamais la cible ni le verbe', () => {
  // Le correctif ne devait toucher QUE l'énoncé. Si un jour il déplaçait aussi
  // le départ (targetHref) ou le type d'action, on aurait réparé une phrase en
  // cassant un routage — et personne ne le verrait avant la production.
  for (const [verbe, input] of Object.entries(ENTREES)) {
    for (const locale of LOCALES) {
      const aPied = deriveContextualAction(input, locale, 'run');
      const aVelo = deriveContextualAction(input, locale, 'bike');
      assertEquals(aPied.kind, aVelo.kind, `${verbe}/${locale} : le verbe a changé`);
      assertEquals(aPied.targetHref, aVelo.targetHref, `${verbe}/${locale} : la cible a changé`);
      assertEquals(aPied.intention, aVelo.intention, `${verbe}/${locale} : l’intention a changé`);
      assertEquals(aPied.icon, aVelo.icon, `${verbe}/${locale} : l’icône a changé`);
    }
  }
});

Deno.test('B1 — toute discipline connue du moteur a ses mots (tables exhaustives)', () => {
  // `ACTIVITIES` est la liste du moteur (`packages/shared/game-rules.ts`). Le
  // typage `Record<Activity, Entry>` empêche déjà une table incomplète de
  // compiler ; ce test couvre l'autre moitié — une discipline ajoutée AU
  // MOTEUR sans mots ne doit pas produire un `undefined` silencieux au rendu.
  for (const activity of ACTIVITIES) {
    for (const locale of LOCALES as readonly Locale[]) {
      const enonce = goButtonA11yLabel(
        deriveContextualAction({}, locale, activity),
        activity,
        locale,
      );
      assert(!enonce.includes('undefined'), `${activity}/${locale} : « ${enonce} »`);
      assert(!enonce.includes('{'), `${activity}/${locale} : placeholder non résolu « ${enonce} »`);
    }
  }
});

Deno.test('B1 — aucun placeholder ne survit dans les libellés de zone', () => {
  // `{zone}` est interpolé par `format` ; un jumeau ajouté sans son
  // placeholder rendrait la phrase amputée du nom de zone, en silence.
  for (const activity of ACTIVITIES) {
    for (const verbe of ['defendre', 'conquerir', 'terminer'] as const) {
      for (const locale of LOCALES) {
        const { a11yLabel } = deriveContextualAction(ENTREES[verbe], locale, activity);
        assert(!a11yLabel.includes('{'), `${verbe}/${activity}/${locale} : « ${a11yLabel} »`);
      }
    }
  }
});
