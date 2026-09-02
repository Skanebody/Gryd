/**
 * GRYD — L'ONBOARDING : UN SEUL ÉCRAN (lot M2 ; fusion du 02/09/2026).
 *
 * ─── DEUX ÉCRANS SONT DEVENUS UN ────────────────────────────────────────────
 * Il y avait `/bienvenue` PUIS `/position`. Le premier disait le jeu (« tu
 * cours, ta trace dessine une ligne, si elle se referme l'intérieur est à
 * toi »), le second disait pourquoi GRYD a besoin de la position. Deux écrans,
 * deux taps — et UN SEUL argument, coupé en deux : montrer ce qu'on gagne, puis
 * demander de quoi le dessiner. Le tap de « Continuer » ne faisait choisir
 * RIEN ; il ne faisait qu'annoncer l'écran suivant, et un tap qui ne fait rien
 * choisir ne se paie pas.
 *
 * L9 pose un PLAFOND (« ≤ 3 écrans avant la carte »), pas un objectif : être
 * sous le plafond n'a jamais été une raison d'y rester. L'audit de friction
 * comptait 9 taps du premier lancement à la première course ; cette fusion en
 * rend un, et l'argument ne perd rien — il se lit d'un seul regard au lieu de
 * deux. Le HIG (« Designing for games ») demande un onboarding « fast, fun, and
 * optional » : un écran dont le seul rôle est d'amener au suivant échoue aux
 * trois mots à la fois.
 *
 * ⚠️ Le FICHIER reste `position.tsx`, donc la route reste `/position`. Renommer
 * aurait touché la garde d'entrée, l'audit de routes et la table des
 * transitions pour un gain nul : c'est le contenu qui a fusionné, pas l'adresse.
 *
 * ─── L'ORDRE SUR L'ÉCRAN, ET POURQUOI CET ORDRE ─────────────────────────────
 * De haut en bas : la photo, l'objet, le jeu, la demande, l'action.
 *   · la PHOTO (`assets/onboarding/`) dit CE QUE C'EST — des gens qui courent
 *     en ville, reconnaissable en une demi-seconde, avant le moindre mot ;
 *   · `TerritoryMark` dit CE QU'ON OBTIENT — un contour fermé, l'objet
 *     signature. Il est montré AVANT la demande : c'est lui qui donne la valeur
 *     que L9 exige de montrer avant de demander quoi que ce soit ;
 *   · `obTitle` / `obBody` disent LE JEU, en trois phrases ;
 *   · et seulement là, la demande — courte, en dessous, subordonnée.
 *
 * Aucune feuille système ne s'ouvre sans un geste explicite. Une permission
 * refusée par surprise ne se redemande pas : c'est la seule erreur de cet écran
 * qui soit irréversible.
 *
 * ─── AUCUN CUL-DE-SAC, DANS AUCUNE DES TROIS ISSUES ─────────────────────────
 * La décision vit dans `permissionOutcome` (PUR, testé) : accordée → la suite ;
 * refusée mais redemandable → on repropose ; refusée définitivement → et
 * seulement là — les réglages système. Peindre « Ouvrir les réglages » sur un
 * refus redemandable enverrait chercher un interrupteur qui n'existe pas encore.
 *
 * Et « Voir la carte d'abord » reste TOUJOURS offert : refuser est un choix
 * légitime, la carte a un état vide honnête, et en faire une rançon serait un
 * dark pattern (L17). C'est aussi le « optional » du HIG — cet écran n'est pas
 * un péage.
 */
import { useCallback, useEffect, useState } from 'react';
import { Linking, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Stage } from '../../src/mvp/ui/Stage';
import { TerritoryMark } from '../../src/mvp/ui/TerritoryMark';
import { permissionOutcome, type PermissionOutcome } from '../../src/mvp/onboarding/permission';
import { markOnboardingSeen } from '../../src/mvp/onboarding/seen';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { EVENTS } from '@klaim/shared';
import { screen, track } from '../../src/lib/analytics';

/**
 * Là où mène la fin de l'onboarding.
 *
 * Depuis M10, c'est la CONNEXION : l'onboarding se termine, et la carte demande
 * un compte pour dire ce qui est à toi. Envoyer directement à la carte ferait
 * lire « Sans compte, GRYD ne sait pas encore ce qui est à toi » à quelqu'un qui
 * vient d'accepter de jouer — une phrase vraie, au pire moment, sans porte.
 *
 * ⚠️ Y compris quand la permission est REFUSÉE, et c'est délibéré : refuser sa
 * position n'est pas refuser de jouer, et la carte a un état vide honnête. Le
 * lien « Voir la carte d'abord » reste, lui, la sortie directe.
 */
const APRES = '/connexion';

/**
 * Où mène « Voir la carte d'abord ». La CARTE — son libellé le dit.
 *
 * ⚠️ Une version de ce fichier a fait pointer ce lien sur `/connexion` en même
 * temps que le CTA. Le libellé promettait alors une chose et en faisait une
 * autre : c'est la faute que tout le reste de cet écran existe pour éviter.
 * Refuser de créer un compte tout de suite est un choix légitime, et la carte a
 * un état vide honnête qui se suffit.
 */
const SANS_COMPTE = '/carte';

/**
 * Taille de l'objet signature SUR CET ÉCRAN — 120 et non 200 (son défaut).
 *
 * L'écran fusionné porte désormais quatre blocs au lieu de deux (objet, titre,
 * corps, demande) au-dessus d'un CTA ancré. À 200, l'objet mangeait la moitié
 * de la colonne et poussait le jeu hors du premier regard : c'est exactement
 * l'inverse de ce que la fusion cherchait. À 120 il reste lisible comme forme —
 * c'est un contour, pas un détail — et laisse le haut de la photo intact.
 */
const MARQUE_PT = 120;

/**
 * Au-delà de cette échelle de police, l'objet signature CÈDE LA PLACE au texte.
 *
 * ⚠️ Ce n'est pas une préférence. Le contenu défile (`Stage`), donc à l'échelle
 * AX3 le premier écran-plein deviendrait un DESSIN décoratif de 120 pt, et il
 * faudrait faire défiler pour lire le titre. Quelqu'un qui a agrandi ses polices
 * a demandé du texte, pas une illustration — le HIG demande précisément de
 * retirer les images décoratives aux tailles d'accessibilité.
 *
 * 1,5 n'est pas un chiffre choisi : c'est la frontière `isAccessibilityCategory`
 * d'iOS, qui tombe entre `xxxLarge` (~1,35×) et `accessibilityMedium` (~1,65×).
 * Le seuil suit donc la bascule que le système opère déjà.
 */
const ECHELLE_SANS_MARQUE = 1.5;

export default function Onboarding() {
  const t = useT();
  const { fontScale } = useWindowDimensions();
  const [issue, setIssue] = useState<PermissionOutcome | null>(null);
  const [busy, setBusy] = useState(false);

  // UN SEUL écran, donc UN SEUL événement d'écran. `permission_primed` marquait
  // le passage de `/bienvenue` à `/position` : cette étape n'existe plus, et la
  // garder ferait un palier d'entonnoir converti à 100 % par construction —
  // du bruit, pas une mesure. Le RÉSULTAT de la demande reste tracé, lui, par
  // `permission_location` ci-dessous : l'entonnoir « onboarding vu → permission
  // décidée » est intact, et il est même plus juste qu'avant.
  useEffect(() => {
    screen('onboarding_started');
  }, []);

  const demander = useCallback(async () => {
    setBusy(true);
    try {
      const reponse = await Location.requestForegroundPermissionsAsync();
      const suite = permissionOutcome(reponse);
      // L'Annexe B liste `permission_granted` / `permission_denied` en deux
      // événements. La taxonomie du dépôt a DÉJÀ `permission_location` avec un
      // `result` : en ajouter deux créerait un doublon, donc deux entonnoirs
      // qui divergeraient à la première analyse. Même information, un seul nom.
      track(EVENTS.permissionLocation, { result: suite });
      if (suite === 'granted') {
        // Le drapeau se pose ICI, à la SORTIE de l'onboarding — jamais au
        // montage. Le poser à l'entrée marquerait « vu » quelqu'un qui a fermé
        // l'app sur la première seconde, et lui ferait manquer l'explication du
        // jeu pour toujours.
        await markOnboardingSeen();
        router.replace(APRES);
        return;
      }
      setIssue(suite);
    } catch {
      // L'API a jeté : on ne sait pas si l'OS acceptera de redemander. On
      // suppose que OUI (même sens du doute que `permissionOutcome`) plutôt que
      // d'expédier le joueur dans les réglages pour rien.
      setIssue('retry');
    } finally {
      setBusy(false);
    }
  }, []);

  // ⚠️ `issue === null` tant que l'OS n'a pas répondu. L'écran ne SUPPOSE jamais
  // l'autorisation : il ne peint la suite qu'après la réponse, et la seule
  // chose qu'il montre entre-temps est `busy` (voir `Stage`).
  const refuse = issue === 'retry' || issue === 'settings';

  return (
    <Stage
      // LA PHOTO, conservée telle quelle. Elle reste AUSSI sur le refus : c'est
      // le même écran, et la faire disparaître produirait un clignotement noir
      // au moment précis où l'on annonce une mauvaise nouvelle. Ce qu'on ne
      // fait pas miroiter après un refus, c'est le TERRITOIRE — pas la course.
      photo={require('../../assets/onboarding/e01-crew.jpg')}
      // L'objet signature disparaît sur un refus : on ne fait pas miroiter ce
      // qu'on vient de dire inaccessible. Et il cède la place au texte dès que
      // les polices système passent en taille d'accessibilité.
      visual={
        refuse || fontScale >= ECHELLE_SANS_MARQUE ? undefined : <TerritoryMark size={MARQUE_PT} />
      }
      title={refuse ? t(C.obDeniedTitle) : t(C.obTitle)}
      body={refuse ? t(C.obDeniedBody) : t(C.obBody)}
      // LA DEMANDE, subordonnée au jeu — c'est tout l'ordre de L9. Elle
      // disparaît sur un refus : `obDeniedBody` porte alors déjà la raison, et
      // la répéter sous le message de refus la transformerait en insistance.
      note={refuse ? undefined : { label: t(C.obPrimingTitle), body: t(C.onboardingPriming) }}
      cta={{
        // Sur un refus REDEMANDABLE, le bon geste reste « Autoriser » : envoyer
        // aux réglages pour un dialogue qu'on peut rouvrir est une corvée.
        label: issue === 'settings' ? t(C.obDeniedCta) : t(C.obPrimingCta),
        busy,
        onPress: issue === 'settings' ? () => void Linking.openSettings() : () => void demander(),
      }}
      link={{
        // Le drapeau se pose AUSSI sur cette sortie : « voir la carte d'abord »
        // est une façon légitime de terminer l'onboarding, pas une évasion. Ne
        // pas le poser ferait revenir l'écran à chaque ouverture, à quelqu'un
        // qui a justement dit qu'il voulait passer.
        label: t(C.obSkip),
        onPress: () => {
          void markOnboardingSeen();
          router.replace(SANS_COMPTE);
        },
      }}
    />
  );
}
