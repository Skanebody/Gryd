/**
 * GRYD — ONBOARDING 2/2 : le PRIMING, puis seulement la demande OS (lot M2).
 *
 * ─── L9 : LA VALEUR AVANT LA PERMISSION ─────────────────────────────────────
 * Jamais de popup système à froid. Cet écran dit d'abord POURQUOI GRYD a besoin
 * de la position — « il dessine ton territoire à partir de ta course » — et
 * n'appelle l'OS qu'après un geste explicite. Une permission refusée par
 * surprise ne se redemande pas : c'est la seule erreur de cet écran qui soit
 * irréversible.
 *
 * ─── AUCUN CUL-DE-SAC, DANS AUCUNE DES TROIS ISSUES ─────────────────────────
 * La décision vit dans `permissionOutcome` (PUR, testé) : accordée → la carte ;
 * refusée mais redemandable → on repropose ; refusée définitivement → et
 * seulement là — les réglages système. Peindre « Ouvrir les réglages » sur un
 * refus redemandable enverrait chercher un interrupteur qui n'existe pas encore.
 *
 * Et « Voir la carte d'abord » reste TOUJOURS offert : refuser est un choix
 * légitime, la carte a un état vide honnête, et en faire une rançon serait un
 * dark pattern (L17).
 */
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
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
 * Là où mène la fin de l'onboarding — la carte, dans tous les cas.
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

export default function Position() {
  const t = useT();
  const [issue, setIssue] = useState<PermissionOutcome | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    screen('permission_primed');
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
        // Le drapeau se pose ICI, à la sortie de l'onboarding — pas à son
        // entrée. Le poser au montage marquerait « vu » quelqu'un qui a fermé
        // l'app au premier écran, et lui ferait manquer l'explication du jeu.
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

  const refuse = issue === 'retry' || issue === 'settings';

  return (
    <Stage
      // Le MÊME objet qu'à l'écran précédent : c'est ce que la permission sert
      // à dessiner. Il disparaît sur un refus — on ne fait pas miroiter ce
      // qu'on vient de dire inaccessible.
      visual={refuse ? undefined : <TerritoryMark size={160} />}
      title={refuse ? t(C.obDeniedTitle) : t(C.obPrimingTitle)}
      body={refuse ? t(C.obDeniedBody) : t(C.onboardingPriming)}
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
        // pas le poser ferait revenir les deux écrans à chaque ouverture, à
        // quelqu'un qui a justement dit qu'il voulait passer.
        label: t(C.obSkip),
        onPress: () => {
          void markOnboardingSeen();
          router.replace(SANS_COMPTE);
        },
      }}
    />
  );
}
