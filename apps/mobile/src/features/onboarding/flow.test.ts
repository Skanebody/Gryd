/**
 * GRYD — LE PARCOURS D'ONBOARDING TIENT SES PROMESSES STRUCTURELLES.
 *
 * Ce que ces tests protègent n'est pas du pixel : c'est l'ordre du flow, la
 * continuité du funnel, et deux règles qui se sont déjà perdues une fois chacune
 * dans ce dossier — « le crew n'apparaît pas au premier écran » (diagnostic
 * fondateur) et « le gate d'âge précède toute collecte » (Apple 5.1.1 / RGPD).
 * Ce sont des invariants de PARCOURS : ils se vérifient sans écran, donc sans
 * capture — dans l'aperçu headless une capture ne prouverait rien de toute façon.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  CITY,
  MECHANIC,
  ONBOARDING_STEPS,
  PROFILE,
  RIVALRY,
  STEP_EVENT_N,
  isOnboardingStep,
  stepAfterRivalry,
  stepBeforeCity,
  type OnboardingStep,
} from './content.ts';
import { LOCALES, type Entry } from '../../i18n/types.ts';

/** Position d'une étape dans le flow (−1 si absente). */
const at = (step: OnboardingStep): number => ONBOARDING_STEPS.indexOf(step);

Deno.test('le flow enchaîne : comprendre → gate → décider → entrer', () => {
  // L'onboarding fait TROIS choses : comprendre, personnaliser un peu, entrer.
  // Les deux cartes pédagogiques passent d'abord — un écran qui demande quelque
  // chose avant d'avoir rien expliqué est la landing page qu'on a retirée.
  assertEquals(at('mechanic'), 0, 'la mécanique n’ouvre plus le flow');
  assert(at('rivalry') > at('mechanic'), 'la rivalité doit suivre la mécanique');
  assert(at('city') > at('rivalry'), 'la ville se choisit après avoir compris');
  assert(at('profile') > at('city'), 'le profil rappelle une ville déjà choisie');
  assert(at('account') > at('profile'), 'le compte ferme le flow');
});

Deno.test('LE PARCOURS EST LINÉAIRE, ET NE DÉPASSE PAS QUATRE ÉCRANS DE PRODUIT', () => {
  // La doctrine fixe un maximum de QUATRE écrans obligatoires avant l'app. Les
  // quatre écrans de PRODUIT sont ceux-ci ; `account` est la création de compte
  // elle-même, qu'aucune session ne permet d'éviter tant que la carte l'exige.
  assertEquals(
    [...ONBOARDING_STEPS].filter((s) => s !== 'account'),
    ['mechanic', 'rivalry', 'city', 'profile'],
  );
  // Plus aucune dérivation conditionnelle : deux écrans ne peuvent plus diverger.
  assertEquals(stepAfterRivalry(), 'city');
  assertEquals(stepBeforeCity(), 'rivalry');
});

Deno.test('LE CTA DE LA CARTE 2 NE PEUT PAS MENTIR SUR L’ÉTAPE SUIVANTE', () => {
  // La carte 2 annonce « Choisir ma ville ». Elle a menti tant qu'un age-gate
  // s'intercalait entre les deux — exactement le reproche fait à l'ancien
  // « Découvrir ma ville ». Ce test gèle la vérité de cette promesse.
  assertEquals(stepAfterRivalry(), 'city');
});

Deno.test('L’ÂGE RESTE DEVANT LE SEUL GESTE QUI LIT UN CAPTEUR', () => {
  // L'age-gate a quitté le PARCOURS (il vit au point de création du compte, là
  // où il a un sens légal : un refus n'y peint aucune voie d'auth). Ce qui le
  // plaçait devant la ville était le raccourci facultatif « utiliser ma
  // position ». Il n'est donc pas supprimé : il est déplacé DEVANT CE GESTE.
  // La recherche MANUELLE, elle, n'est jamais gatée — l'écran doit rester
  // utilisable assis, sans GPS et sans avoir rien déclaré.
  assert(!(ONBOARDING_STEPS as readonly string[]).includes('age'), 'age n’est plus une étape');
});

Deno.test('le funnel ne recolle jamais deux populations : aucun n réservé réutilisé', () => {
  // Les n sont des IDENTIFIANTS STABLES d'étape, pas des positions. Chacun de
  // ceux-ci a eu sa population sur un écran qui n'existe plus : les réutiliser
  // fausserait l'entonnoir historique sans que personne ne le voie.
  const RESERVED = [1, 2, 3, 4, 5, 6, 7, 10, 13];
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

Deno.test('une étape lue sur le disque est validée contre le flow COURANT', () => {
  // « Quitter et reprendre » relit un nom d'étape écrit par une version
  // antérieure. Un nom disparu n'est pas une erreur : c'est un flow qui a changé.
  for (const step of ONBOARDING_STEPS) assert(isOnboardingStep(step));
  for (const gone of ['hook', 'learn', 'permission', 'crew', 'sync', '', null, undefined, 7]) {
    assert(!isOnboardingStep(gone), `« ${String(gone)} » est accepté comme étape`);
  }
});

Deno.test('LE CREW N’APPARAÎT PAS SUR LE PREMIER ÉCRAN — et il apparaît sur le second', () => {
  // Diagnostic fondateur : « Cours pour ton crew » introduisait le CREW à
  // quelqu'un qui ne sait pas encore ce que c'est. Il entre à la carte 2, quand
  // il répond à une question que le joueur vient de se poser (« on peut me la
  // reprendre ? »). Le mot est un invariant, jamais traduit — une seule
  // recherche suffit pour les 5 langues.
  const first: Entry[] = [MECHANIC.kicker, MECHANIC.title, MECHANIC.tagline, MECHANIC.demoLabel];
  for (const entry of first) {
    for (const locale of LOCALES) {
      assert(
        !entry[locale].toLowerCase().includes('crew'),
        `la carte 1 parle de crew (${locale}) : « ${entry[locale]} »`,
      );
    }
  }
  for (const locale of LOCALES) {
    assert(
      RIVALRY.tagline[locale].toLowerCase().includes('crew'),
      `la carte 2 ne dit plus le crew (${locale})`,
    );
  }
});

Deno.test('l’écran ville n’ORDONNE jamais d’autoriser la position', () => {
  // « Autorise ta localisation pour continuer » n'existe pas : on peut être dans
  // un train, en vacances, ou simplement ne pas vouloir donner sa position à une
  // app qu'on découvre. La position est un RACCOURCI, et sa phrase d'explication
  // doit dire l'usage — une lecture, pour trouver la ville.
  for (const locale of LOCALES) {
    const why = CITY.locationWhy[locale];
    assert(why.length > 0, `locationWhy vide en ${locale}`);
    // Le titre et le sous-titre de l'écran promettent un rythme choisi, pas une
    // permission : ils ne doivent pas non plus porter d'injonction.
    assert(
      !/continuer|continue|continuar|weiter/i.test(CITY.tagline[locale]),
      `le sous-titre ville conditionne la suite (${locale})`,
    );
  }
});

Deno.test('le dernier CTA ne promet la carte que s’il n’y a plus d’écran devant', () => {
  // `profileCta` (« Entrer sur la carte ») ne s'emploie que lorsque le flow
  // s'arrête là ; quand un écran compte suit encore, c'est `ctaBeforeAccount`.
  // Deux Entries DIFFÉRENTES : si elles se confondaient, l'une des deux
  // situations mentirait.
  for (const locale of LOCALES) {
    assert(
      PROFILE.cta[locale] !== PROFILE.ctaBeforeAccount[locale],
      `le CTA profil est identique avec et sans écran compte (${locale})`,
    );
  }
});
