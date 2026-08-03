/**
 * GRYD — QUAND LE TÉLÉPHONE VIBRE. PUR (lot M9).
 *
 * ─── L6 : HAPTIQUE SUR CHAQUE ÉVÉNEMENT DE JEU ──────────────────────────────
 * « départ, quasi-fermeture, fermeture, capture, zone perdue ». C'est la loi la
 * plus facile à oublier parce qu'elle ne se voit pas sur une capture d'écran —
 * un `ux-gate` visuel la laisse passer, et le produit se retrouve muet dans la
 * main de quelqu'un qui court en regardant la route.
 *
 * ─── LE PIÈGE : VIBRER À CHAQUE RENDU ───────────────────────────────────────
 * La jauge est recalculée à chaque point GPS, donc environ une fois par
 * seconde. Brancher l'haptique sur son ÉTAT ferait vibrer le téléphone en
 * continu pendant tout le retour vers le point de départ — un supplice, et
 * l'information disparaîtrait dans le bruit exactement au moment où elle compte.
 *
 * L'haptique se déclenche donc sur une TRANSITION, jamais sur un état : ce
 * module compare l'avant et l'après, et ne dit rien quand rien n'a changé.
 *
 * ─── LA GRAMMAIRE EST GELÉE (doc §25, `lib/haptics.ts`) ─────────────────────
 * On ne l'invente pas ici, on s'y conforme :
 *   light   — bouton, capture simple ;
 *   medium  — zone contrôlée ;
 *   success — confirmation (course validée) ;
 *   error   — alerte fiabilité (signal GPS perdu).
 */

/** Les intensités du wrapper `lib/haptics.ts`. Aucune n'est inventée ici. */
export type HapticKind = 'light' | 'medium' | 'success' | 'error';

/** L'état de jauge tel que l'écran de course le connaît (`gauge.ts`). */
export type GaugePhase = 'silent' | 'closed' | 'almost' | 'missing';

/**
 * Retour haptique dû au passage `avant` → `apres`. PURE.
 *
 * `null` = on ne dit rien, et c'est le cas le plus fréquent — y compris quand
 * l'état est identique (voir l'en-tête).
 *
 * Seules les transitions VERS une bonne nouvelle parlent : on ne vibre pas pour
 * annoncer qu'on s'éloigne. Une alerte à chaque mètre perdu transformerait la
 * jauge en réprimande, ce que L19 interdit.
 */
export function gaugeHaptic(avant: GaugePhase, apres: GaugePhase): HapticKind | null {
  if (avant === apres) return null;
  // Fermée : le moment que le joueur attend. C'est « zone contrôlée ».
  if (apres === 'closed') return 'medium';
  // Quasi-fermée : GRYD refermera à sa place — une bonne nouvelle, plus discrète.
  if (apres === 'almost') return 'light';
  // `missing` et `silent` ne vibrent pas : s'éloigner n'est pas un événement,
  // c'est l'absence d'un événement.
  return null;
}

/**
 * Retour haptique dû à un changement de qualité du signal. PURE.
 *
 * UNIQUEMENT la PERTE, et uniquement depuis un signal qu'on avait vraiment :
 * `error` est réservé aux alertes de fiabilité (grammaire §25). Vibrer au
 * démarrage, quand le signal n'est pas encore arrivé, crierait à la panne
 * pendant les trois secondes normales de recherche.
 */
export function signalHaptic(
  avant: 'searching' | 'weak' | 'good',
  apres: 'searching' | 'weak' | 'good',
): HapticKind | null {
  return avant === 'good' && apres !== 'good' ? 'error' : null;
}

/**
 * Retour haptique de l'écran de résultat, selon ce qu'il annonce. PURE.
 *
 * La capture est le PIC ÉMOTIONNEL du jeu (L7, peak-end rule) : c'est le seul
 * endroit du MVP qui mérite `success`.
 *
 * Un refus ne vibre PAS. Faire vibrer un « non » ajouterait un coup de semonce
 * physique à une nouvelle déjà décevante — l'app n'accuse jamais (L19), et ça
 * vaut aussi pour ce qu'elle fait sentir.
 */
export function resultHaptic(kind: string): HapticKind | null {
  if (kind === 'captured') return 'success';
  if (kind === 'takenNoArea') return 'light';
  return null;
}
