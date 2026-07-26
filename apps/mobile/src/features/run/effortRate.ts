/**
 * GRYD — LA GRANDEUR DANS LAQUELLE CHAQUE DISCIPLINE LIT SON EFFORT (E14, vélo
 * réel — 26/07/2026).
 *
 * ─── LE PROBLÈME, ET POURQUOI CE N'EST PAS UN DÉTAIL DE LIBELLÉ ─────────────
 * La 3ᵉ statistique du Résultat était une ALLURE (min/km) pour tout le monde.
 * Sur une sortie vélo, elle n'est pas FAUSSE — c'est bien l'allure, et le
 * serveur la calcule — mais personne ne lit son effort ainsi en roulant : un
 * cycliste lit une VITESSE (km/h). Servir « 2'44/km » à un cycliste, ce n'est
 * donc pas mentir, c'est rendre illisible en une seconde ce que l'écran est
 * censé dire d'un coup d'œil (§A : comprendre l'écran en moins de 3 s).
 *
 * ─── L'ARBITRAGE : ON REND LA VITESSE, ET ON N'INVENTE RIEN ────────────────
 * Le chiffre affiché à vélo est une CONVERSION EXACTE de la mesure déjà
 * affichée dans le monde course : `km/h = 3600 / (s par km)`. C'est le point
 * important — on ne recalcule PAS une vitesse à partir de la distance et de la
 * durée. Ces deux voies donnent des nombres légèrement différents dès que le
 * serveur a jugé (son `avgPaceSKm` est l'autorité, il n'est pas forcément égal
 * à `durée / distance` du client), et deux voies pour une même grandeur, c'est
 * l'occasion garantie que le Résultat et le Partage finissent par se
 * contredire. Une seule source : l'allure mesurée.
 *
 * ─── ET LE CAS DÉGÉNÉRÉ, QUI EST TOUT L'ENJEU ──────────────────────────────
 * Une allure absente, non finie ou nulle (durée nulle, distance nulle, verdict
 * muet) ne produit JAMAIS un chiffre. Elle rend `null`, et l'écran fait
 * DISPARAÎTRE la statistique. C'est la règle du projet appliquée à la lettre :
 * un « 0'00/km » ou un « 0,0 km/h » se lit comme une mesure — c'est le « 0 nu »
 * interdit. Une case en moins n'affirme rien ; une case à zéro affirme du faux.
 * (Le rendu actuel affichait bien `0'00` : ce module referme ça aussi, pour les
 * deux disciplines, parce que la faute n'a jamais été propre au vélo.)
 *
 * Module PUR : aucune dépendance React, aucun accès au stockage, aucun i18n.
 * Le séparateur décimal est passé en argument par l'appelant (même contrat que
 * `ui/numberFormat.ts`) — sans Intl, pour un rendu identique iOS/Android/Deno.
 */
import type { Activity } from '@klaim/shared';

/**
 * Quelle GRANDEUR chaque discipline affiche pour son 3ᵉ chiffre.
 *
 * `Record<Activity, …>` EXHAUSTIF, et ce n'est pas de la coquetterie : le jour
 * où `ACTIVITIES` accueille une troisième discipline, ce fichier ne compile plus
 * tant que quelqu'un n'a pas tranché pour elle. Un `activity === 'bike' ? … : …`
 * lui aurait servi l'allure du coureur en silence — exactement le défaut qu'on
 * est en train de refermer.
 */
export const EFFORT_RATE_KIND: Readonly<Record<Activity, EffortRateKind>> = {
  run: 'pace',
  bike: 'speed',
};

export type EffortRateKind = 'pace' | 'speed';

/**
 * Le 3ᵉ chiffre du Résultat, dans sa grandeur. Deux formes DISTINCTES plutôt
 * qu'un `{ value: number; unit: string }` : l'unité ne se choisit pas au rendu,
 * elle est une conséquence du type — impossible d'afficher des km/h sous le
 * libellé « ALLURE ».
 */
export type EffortRate =
  | { readonly kind: 'pace'; readonly sPerKm: number }
  | { readonly kind: 'speed'; readonly kmh: number };

/** Secondes par heure — la constante de conversion, nommée plutôt qu'écrite. */
const S_PER_H = 3600;

/**
 * La grandeur à afficher pour CETTE discipline, à partir de la SEULE allure
 * mesurée. `null` = rien de mesurable : l'appelant n'affiche pas la case.
 */
export function effortRate(activity: Activity, paceSPerKm: number): EffortRate | null {
  // Une allure non finie ou nulle n'est pas « zéro » : c'est « on ne sait pas ».
  // Les confondre est précisément le mensonge que la charte interdit.
  if (!Number.isFinite(paceSPerKm) || paceSPerKm <= 0) return null;
  return EFFORT_RATE_KIND[activity] === 'speed'
    ? { kind: 'speed', kmh: S_PER_H / paceSPerKm }
    : { kind: 'pace', sPerKm: paceSPerKm };
}

/**
 * Vitesse en km/h, à UNE décimale, avec le séparateur de la langue :
 * 24.35 → « 24,4 » (fr/es/de/pt) · « 24.4 » (en).
 *
 * Une décimale et pas deux : à vélo, le dixième de km/h est déjà en dessous de
 * la précision d'un GPS de téléphone — en afficher deux donnerait à la mesure
 * une exactitude qu'elle n'a pas. Le rendu est SANS `Intl` (Hermes n'embarque
 * pas ICU) pour rester identique sur iOS, Android et sous Deno.
 */
export function formatSpeedKmh(kmh: number, decimalSep: string): string {
  return kmh.toFixed(1).replace('.', decimalSep);
}
