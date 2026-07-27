/**
 * GRYD — E25 « SÉCURITÉ » : CE QUE LE PANNEAU A LE DROIT DE PEINDRE.
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, l.1219-1232.)
 *
 * ═══ ICI, « AUCUN BOUTON MORT » N'EST PAS UNE RÈGLE DE STYLE ════════════════
 * Sur tous les autres écrans, un bouton qui échoue coûte une frustration. Sur
 * celui-ci il coûte les secondes pendant lesquelles quelqu'un de blessé tape sur
 * un bouton qui ne fait rien. Ce module est donc écrit à l'envers de l'habitude :
 * il part des CAPACITÉS RÉELLEMENT PROUVÉES (l'appareil sait-il téléphoner ?
 * sait-on dans quel pays on est ?) et n'autorise un bouton que quand la réponse
 * est oui. Toutes les inconnues tombent du côté « ne pas peindre ».
 *
 * ═══ LE NUMÉRO NE SE DEVINE JAMAIS ══════════════════════════════════════════
 * `EMERGENCY_NUMBER_EUROPE` (112, game-rules) n'est pré-rempli QUE si le pays
 * est CONNU et fait partie de la table ci-dessous. Un pays inconnu — position
 * non résolue, hors ligne, hors Europe — ne donne PAS 112 « par défaut » : dans
 * une bonne partie du monde ce numéro ne joint personne, et un numéro de secours
 * faux est le seul mensonge de cette application dont le coût ne se mesure pas
 * en rétention. On ouvre alors le composeur NU, et on dit pourquoi
 * (`emergencyNoNumber`, i18n/catalog/securite.ts).
 *
 * PURE : aucune I/O, aucun React. La détection du pays (réseau) vit dans
 * `country.ts`, les capacités de la plateforme dans `SafetyPanel.tsx`.
 */
import { EMERGENCY_NUMBER_EUROPE } from '@klaim/shared';

/**
 * Pays où le 112 est le numéro d'urgence unique JOIGNABLE — UE, EEE, Suisse et
 * Royaume-Uni. Ce n'est pas une règle de jeu (elle ne décide ni claim, ni point,
 * ni protection) mais un FAIT réglementaire : c'est pourquoi la table vit ici,
 * à côté de son unique usage, et non dans `game-rules.ts`.
 *
 * La liste est volontairement RESTRICTIVE. Le 112 fonctionne au-delà (le GSM le
 * route vers l'urgence locale dans beaucoup de réseaux), mais « beaucoup » n'est
 * pas « partout », et ce module ne peint que ce qu'il peut affirmer. Un pays
 * absent de cette table n'est pas un pays sans secours : c'est un pays dont
 * GRYD ne connaît pas le numéro, et il le dit.
 *
 * ISO 3166-1 alpha-2, MAJUSCULES (l'appelant normalise).
 */
export const EMERGENCY_112_COUNTRIES: ReadonlySet<string> = new Set([
  // Union européenne
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR',
  'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI',
  'SK',
  // Espace économique européen + Suisse + Royaume-Uni
  'CH', 'GB', 'IS', 'LI', 'NO',
]);

/**
 * Ce que la plateforme sait FAIRE, mesuré et non supposé. Les deux drapeaux
 * viennent de `Linking.canOpenURL` sur l'appareil réel — jamais d'un
 * `Platform.OS === 'ios'` qui parierait sur le comportement d'un simulateur.
 */
export interface DialCapabilities {
  /** L'appareil sait ouvrir `tel:<numéro>` — donc composer un numéro pré-rempli. */
  readonly canDialNumber: boolean;
  /** L'appareil sait ouvrir le composeur NU (`tel:`), sans numéro. */
  readonly canOpenDialer: boolean;
}

/** Ce que le bloc « appeler les secours » rend à l'écran. */
export type EmergencyPlan =
  /** Numéro CONNU pour ce pays : bouton « Composer le {number} ». */
  | { readonly kind: 'dial'; readonly number: string }
  /** Pays inconnu ou hors table : composeur nu, aucun numéro pré-rempli. */
  | { readonly kind: 'no-number' }
  /** L'appareil ne téléphone pas : AUCUN bouton, seulement la phrase qui le dit. */
  | { readonly kind: 'unavailable' };

/**
 * `countryIso` : code pays RÉSOLU depuis la position réelle (`country.ts`), ou
 * `null` quand la résolution a échoué / n'a pas eu lieu. `null` ⇒ jamais 112.
 */
export function emergencyPlan(
  countryIso: string | null,
  capabilities: DialCapabilities,
): EmergencyPlan {
  const iso = typeof countryIso === 'string' ? countryIso.trim().toUpperCase() : '';
  if (iso.length === 2 && EMERGENCY_112_COUNTRIES.has(iso) && capabilities.canDialNumber) {
    return { kind: 'dial', number: EMERGENCY_NUMBER_EUROPE };
  }
  if (capabilities.canOpenDialer) return { kind: 'no-number' };
  return { kind: 'unavailable' };
}

/** L'URL réellement ouverte pour un plan donné — `null` quand aucun bouton n'existe. */
export function emergencyUrl(plan: EmergencyPlan): string | null {
  if (plan.kind === 'dial') return `tel:${plan.number}`;
  if (plan.kind === 'no-number') return 'tel:';
  return null;
}
