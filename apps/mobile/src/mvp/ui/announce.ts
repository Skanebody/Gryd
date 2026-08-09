/**
 * GRYD — ANNONCER UN CHANGEMENT D'ÉTAT AUX LECTEURS D'ÉCRAN, SUR iOS.
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * Les écrans posent `accessibilityLiveRegion="polite"` sur leurs textes de
 * statut. C'est le bon geste — mais **`accessibilityLiveRegion` est une prop
 * ANDROID** en React Native. Sur iOS elle ne fait STRICTEMENT RIEN.
 *
 * Autrement dit : la correction d'accessibilité la mieux documentée du lot ne
 * s'appliquait pas à la plateforme qu'on livre. Le défaut d'origine reste
 * entier sur iPhone — une lecture qui passe de « en cours » à « échec » change
 * le texte à l'écran sans qu'aucun lecteur ne l'apprenne, et quelqu'un qui
 * explore l'écran au doigt continue de croire que ça charge.
 *
 * L'équivalent iOS est `AccessibilityInfo.announceForAccessibility`, qui pousse
 * une annonce. Il n'existe pas de prop déclarative : il faut un effet.
 *
 * ─── POURQUOI ON N'ANNONCE PAS LA PREMIÈRE VALEUR ───────────────────────────
 * À l'ARRIVÉE sur un écran, VoiceOver lit déjà son contenu. Annoncer en plus le
 * texte de statut le ferait entendre DEUX FOIS, à la suite. On ne pousse donc
 * que les CHANGEMENTS — ce que « live region » veut dire, précisément.
 */
import { useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Annonce `texte` à chaque fois qu'il CHANGE, jamais à la première valeur.
 *
 * `null` = rien à dire : l'état ne porte aucun message (contenu chargé, par
 * exemple). Passer `null` ne réinitialise PAS la mémoire — revenir au même
 * texte qu'avant reste un changement seulement s'il a été autre chose entre-temps.
 */
export function useAnnonce(texte: string | null): void {
  /** `undefined` = on n'a encore rien vu ; c'est le montage. */
  const vu = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const premier = vu.current === undefined;
    if (texte === vu.current) return;
    vu.current = texte;
    // Au montage on MÉMORISE sans annoncer : VoiceOver vient de lire l'écran.
    if (premier || texte === null) return;
    AccessibilityInfo.announceForAccessibility(texte);
  }, [texte]);
}
