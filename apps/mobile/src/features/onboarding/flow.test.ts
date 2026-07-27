/**
 * GRYD — LE PARCOURS D'ONBOARDING TIENT SES PROMESSES STRUCTURELLES.
 *
 * Ce que ces tests protègent n'est pas du pixel : c'est l'ORDRE du flow (celui
 * des planches E01b), la continuité du funnel, et trois règles qui se sont déjà
 * perdues une fois chacune dans ce dossier — « le crew n'apparaît pas au premier
 * écran » (diagnostic fondateur), « la frise ne compte pas plus d'étapes qu'il
 * n'en existe » (cinq points en dur pour quatre écrans), et « le gate d'âge
 * précède toute création de compte » (Apple 5.1.1 / RGPD). Ce sont des invariants
 * de PARCOURS : ils se vérifient sans écran, donc sans capture — dans l'aperçu
 * headless une capture ne prouverait rien de toute façon.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  CREW,
  LOCATION,
  LOOP,
  MECHANIC,
  ONBOARDING_STEPS,
  RIVALRY,
  STEP_EVENT_N,
  isOnboardingStep,
  stepAfter,
  stepBefore,
  stepProgress,
  type OnboardingStep,
} from './content.ts';
import { LOCALES, type Entry } from '../../i18n/types.ts';

/** Position d'une étape dans le flow (−1 si absente). */
const at = (step: OnboardingStep): number => ONBOARDING_STEPS.indexOf(step);

Deno.test('LE FLOW EST EXACTEMENT LA SÉQUENCE DES PLANCHES E01b', () => {
  // E01 promesse → E02 boucle → E03 rivalité → E04 crew → E05 position, puis la
  // SORTIE vers E06 (l'authentification), qui n'est pas une étape de ce stepper.
  // ⚠️ `mechanic` est l'identifiant HISTORIQUE de E01 (la promesse) : il est
  // conservé pour la continuité du funnel, pas parce qu'il enseigne la mécanique
  // — c'est `loop` qui le fait depuis le 27/07/2026.
  assertEquals([...ONBOARDING_STEPS], ['mechanic', 'loop', 'rivalry', 'crew', 'location']);
  assertEquals(ONBOARDING_STEPS.length, 5, 'cinq écrans : les cinq planches');
});

Deno.test('le flow enchaîne : promettre → enseigner → préparer', () => {
  // Un écran qui DEMANDE quelque chose avant d'avoir rien expliqué est la landing
  // page qu'on a retirée : la pré-permission ferme la marche, jamais l'inverse.
  assertEquals(at('mechanic'), 0, 'la promesse n’ouvre plus le flow');
  assert(at('loop') > at('mechanic'), 'la boucle doit suivre la promesse');
  assert(at('rivalry') > at('loop'), 'la rivalité n’a de sens qu’après la boucle');
  assert(at('crew') > at('rivalry'), 'le crew répond à la question posée par la rivalité');
  assertEquals(
    at('location'),
    ONBOARDING_STEPS.length - 1,
    'la pré-permission doit fermer le flow',
  );
});

Deno.test('LA MARCHE AVANT ET LA MARCHE ARRIÈRE NE PEUVENT PLUS DIVERGER', () => {
  // Une table `STEP_PREV` écrite à la main a déjà divergé de `ONBOARDING_STEPS`
  // ici. Les deux sens se DÉRIVENT désormais du même tableau.
  for (const [i, step] of ONBOARDING_STEPS.entries()) {
    const next = stepAfter(step);
    const prev = stepBefore(step);
    if (i === 0) assertEquals(prev, undefined, 'la 1re étape n’a pas de précédent');
    else assertEquals(prev, ONBOARDING_STEPS[i - 1]);
    if (i === ONBOARDING_STEPS.length - 1) {
      // Pas d'étape après la dernière : le flow SORT vers E06 (/sign-in).
      assertEquals(next, undefined, 'la dernière étape ne doit mener à aucune autre');
    } else {
      assertEquals(next, ONBOARDING_STEPS[i + 1]);
      assertEquals(stepBefore(next!), step, 'aller puis retour ne revient pas au même écran');
    }
  }
});

Deno.test('NI LA VILLE NI LE COMPTE NE SONT DES ÉTAPES — la planche 06 les déplace', () => {
  // « Aucune création de profil ici — pseudo et ville arrivent au premier usage
  // réel. » Ils ne sont pas SUPPRIMÉS du produit pour autant : le choix de ville
  // et le pseudo vivent dans `app/profil-edit.tsx` (sélecteur PARTAGÉ
  // `features/city/CityPicker`), et le gate d'âge 16+ dans
  // `app/(auth)/sign-in.tsx`, au point de CRÉATION du compte — là où il a un sens
  // légal. Ce test gèle leur SORTIE DU FLOW, pas leur disparition.
  for (const gone of ['city', 'account', 'age', 'profile']) {
    assert(
      !(ONBOARDING_STEPS as readonly string[]).includes(gone),
      `« ${gone} » est redevenu une étape de l’onboarding`,
    );
  }
});

Deno.test('le funnel ne recolle jamais deux populations : aucun n réservé réutilisé', () => {
  // Les n sont des IDENTIFIANTS STABLES d'étape, pas des positions. Chacun de
  // ceux-ci a eu sa population sur un écran qui n'existe plus (ou plus ici) :
  // les réutiliser fausserait l'entonnoir historique sans que personne ne le voie.
  // 9 (`account`) et 16 (`city`) rejoignent la liste le 27/07/2026 avec les
  // planches E01b ; 10 est le `crew` de juillet, que l'étape `crew`
  // d'aujourd'hui — pédagogique, elle ne demande rien — ne reprend PAS.
  const RESERVED = [1, 2, 3, 4, 5, 6, 7, 9, 10, 12, 13, 16, 17];
  for (const [step, n] of Object.entries(STEP_EVENT_N)) {
    assert(!RESERVED.includes(n), `« ${step} » reprend le n réservé ${n}`);
  }
});

Deno.test('chaque étape a UN n, et deux étapes n’en partagent jamais un', () => {
  const ns = ONBOARDING_STEPS.map((s) => STEP_EVENT_N[s]);
  for (const [i, n] of ns.entries()) {
    assert(Number.isInteger(n) && n > 0, `${ONBOARDING_STEPS[i]} n’a pas de n valide`);
  }
  assertEquals(new Set(ns).size, ns.length, 'deux étapes partagent le même n');
});

Deno.test('LES DEUX ÉCRANS SURVIVANTS GARDENT LEUR n (continuité du funnel)', () => {
  // E01 est le MÊME écran qu'avant (même photo, même copie) et E03 garde son
  // objet (« ta zone reste en jeu ») : leur donner un n neuf couperait en deux
  // une population continue. Seuls les écrans NEUFS prennent des n neufs.
  assertEquals(STEP_EVENT_N.mechanic, 14, 'E01 a changé de n sans changer d’écran');
  assertEquals(STEP_EVENT_N.rivalry, 15, 'E03 a changé de n sans changer d’objet');
});

Deno.test('LA FRISE NE PEUT PLUS ANNONCER PLUS D’ÉTAPES QU’IL N’EN EXISTE', () => {
  // Le mensonge d'origine : `stepCount={5}` écrit en dur sous le tout premier CTA
  // de l'app, pour un parcours de QUATRE écrans — une promesse chiffrée fausse,
  // dont le cinquième point ne s'allumait jamais. Le parcours en compte cinq
  // aujourd'hui, ce qui ne rend pas le littéral moins dangereux : il se DÉRIVE.
  for (const step of ONBOARDING_STEPS) {
    const { index, count } = stepProgress(step);
    assertEquals(count, ONBOARDING_STEPS.length, `« ${step} » annonce ${count} étapes`);
    assertEquals(index, at(step), `« ${step} » n’est pas à sa place dans la frise`);
  }
});

Deno.test('aucun point de la frise ne reste éteint pour toujours', () => {
  // Un point qu'AUCUNE étape n'allume est une étape promise qui n'existe pas.
  const lit = new Set(ONBOARDING_STEPS.map((s) => stepProgress(s).index));
  const { count } = stepProgress(ONBOARDING_STEPS[0]!);
  assertEquals(count, 5, 'les planches montrent une frise de CINQ points');
  assertEquals(lit.size, count, 'des points de la frise ne s’allument jamais');
  for (let i = 0; i < count; i++) assert(lit.has(i), `le point ${i + 1} ne s’allume jamais`);
  // …et le dernier écran allume bien le DERNIER point (pas d'étape fantôme après).
  assertEquals(stepProgress(ONBOARDING_STEPS[count - 1]!).index, count - 1);
});

Deno.test('une étape lue sur le disque est validée contre le flow COURANT', () => {
  // « Quitter et reprendre » relit un nom d'étape écrit par une version
  // antérieure. Un nom disparu n'est pas une erreur : c'est un flow qui a changé.
  for (const step of ONBOARDING_STEPS) assert(isOnboardingStep(step));
  for (const gone of ['hook', 'learn', 'permission', 'city', 'account', '', null, undefined, 7]) {
    assert(!isOnboardingStep(gone), `« ${String(gone)} » est accepté comme étape`);
  }
});

Deno.test('LE CREW N’APPARAÎT PAS AVANT SON ÉCRAN — et il apparaît dessus', () => {
  // Diagnostic fondateur : « Cours pour ton crew » introduisait le CREW à
  // quelqu'un qui ne sait pas encore ce que c'est. Il entre à E04, quand il
  // répond à une question que le joueur vient de se poser (« on peut me la
  // reprendre ? »). Le mot est un invariant, jamais traduit — une seule recherche
  // suffit pour les 5 langues.
  const before: Entry[] = [
    MECHANIC.kicker,
    MECHANIC.title,
    MECHANIC.tagline,
    LOOP.title,
    LOOP.tagline,
    RIVALRY.title,
    RIVALRY.tagline,
    RIVALRY.takenLabel,
  ];
  for (const entry of before) {
    for (const locale of LOCALES) {
      assert(
        !entry[locale].toLowerCase().includes('crew'),
        `un écran d’avant E04 parle de crew (${locale}) : « ${entry[locale]} »`,
      );
    }
  }
  for (const locale of LOCALES) {
    assert(
      CREW.title[locale].toLowerCase().includes('crew') ||
        CREW.tagline[locale].toLowerCase().includes('crew'),
      `E04 ne dit pas le crew (${locale})`,
    );
  }
});

Deno.test('E04 ENSEIGNE, IL NE DEMANDE RIEN (note de planche)', () => {
  // « La création/adhésion au crew reste post-onboarding, jamais forcée ici. » La
  // copie de l'écran ne doit donc porter AUCUN verbe d'adhésion : un CTA « Créer
  // mon crew » sur un écran pédagogique serait exactement la friction que la
  // planche interdit — et il mènerait à une écriture serveur avant tout compte.
  // ⚠️ Liste volontairement composée de VERBES sans ambiguïté : « entre »/
  // « entrar » en sont EXCLUS parce que « entre » est aussi une préposition
  // espagnole (« El barrio se toma entre varios »), et un faux positif ferait
  // rougir le filet sur une phrase parfaitement conforme.
  const JOIN_VERBS = [
    'rejoins', 'rejoindre', 'crée', 'créer', 'inviter',
    'join', 'create', 'invite',
    'únete', 'unirse', 'crea', 'crear', 'invita',
    'tritt', 'beitreten', 'erstelle', 'erstellen',
    'crie', 'criar', 'convide',
  ];
  for (const entry of [CREW.title, CREW.tagline, CREW.cta]) {
    for (const locale of LOCALES) {
      for (const verb of JOIN_VERBS) {
        assert(
          !new RegExp(`\\b${verb}\\b`, 'i').test(entry[locale]),
          `E04 demande une adhésion (« ${verb} », ${locale}) — « ${entry[locale]} »`,
        );
      }
    }
  }
});

Deno.test('E05 PORTE SES TROIS GARANTIES, ET AUCUNE N’EST VIDE', () => {
  // Elles sont la raison pour laquelle le dialogue système ne tombe pas de nulle
  // part : elles se lisent AVANT le tap. Une garantie manquante ou vide, et
  // l'écran redevient une demande de permission sèche.
  assertEquals(LOCATION.guarantees.length, 3, 'la planche en montre TROIS');
  for (const entry of LOCATION.guarantees) {
    for (const locale of LOCALES) {
      assert(entry[locale].trim().length > 0, `une garantie est vide (${locale})`);
      assert(!entry[locale].includes('…'), `une garantie est abrégée (${locale})`);
    }
  }
  // Les trois garanties sont DISTINCTES (usage · direct · floutage) : trois fois
  // la même phrase serait un mur de réassurance sans contenu.
  for (const locale of LOCALES) {
    const seen = new Set(LOCATION.guarantees.map((g) => g[locale]));
    assertEquals(seen.size, 3, `deux garanties identiques en ${locale}`);
  }
});

Deno.test('E05 N’ORDONNE JAMAIS, ET NE CULPABILISE JAMAIS', () => {
  // « Autorise ta localisation pour continuer » n'existe pas : « Plus tard » mène
  // à la suite, et la carte fonctionne en lecture seule. Aucune phrase de l'écran
  // ne doit donc conditionner la suite, ni dire au joueur ce qu'il « rate ».
  const PRESSURE = [
    'obligatoire', 'nécessaire', 'requis', 'sans quoi', 'sinon',
    'required', 'mandatory', 'otherwise',
    'obligatorio', 'necesario',
    'erforderlich', 'notwendig', 'sonst',
    'obrigatório', 'necessário',
  ];
  const screen: Entry[] = [LOCATION.title, LOCATION.cta, LOCATION.later, ...LOCATION.guarantees];
  for (const entry of screen) {
    for (const locale of LOCALES) {
      for (const word of PRESSURE) {
        assert(
          !new RegExp(`\\b${word}\\b`, 'i').test(entry[locale]),
          `E05 met la pression (« ${word} », ${locale}) — « ${entry[locale]} »`,
        );
      }
    }
  }
});
