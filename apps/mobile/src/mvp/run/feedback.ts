/**
 * GRYD — QUAND LE TÉLÉPHONE VIBRE, ET QUAND IL PARLE. PUR (lot M9).
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

// ══════════ LA VOIX — le seul canal qui atteint un téléphone en poche ═══════
//
// ─── POURQUOI ELLE EXISTE ───────────────────────────────────────────────────
// L'haptique ci-dessus et la jauge à l'écran partagent le même angle mort :
// elles supposent une main sur le téléphone ou un œil dessus. Or on court le
// bras ballant, écran éteint, appareil au brassard ou dans une poche. La voix
// est le seul canal qui traverse ça.
//
// ─── ET POURQUOI ELLE SE TAIT ───────────────────────────────────────────────
// Exactement parce qu'elle traverse tout : ce qui atteint quelqu'un qui ne
// regarde pas peut aussi le harceler. TROIS phrases par course, jamais un flux.
// `runMetersLeft` n'est délibérément PAS de la partie : « 180 m restants » lu à
// chaque relevé GPS serait la version sonore du supplice décrit en tête de
// fichier, et un coureur qui court n'a pas à être commenté.

/**
 * Ce que la voix peut dire — des CLÉS du catalogue, jamais du texte (L18).
 *
 * Les trois moments, et c'est TOUT : le départ, la boucle devenue fermable, la
 * boucle fermée.
 */
export type VoiceCue = 'voiceStart' | 'runLoopAlmost' | 'runLoopClosed';

/** Les deux que la JAUGE peut dire — le départ n'est pas une transition. */
export type GaugeVoiceCue = Exclude<VoiceCue, 'voiceStart'>;

/**
 * La phrase de DÉPART, ou rien. PURE.
 *
 * Une REPRISE ne s'annonce pas « C'est parti » : la course avait déjà commencé,
 * parfois des kilomètres plus tôt. Le dire démentirait à voix haute ce que
 * l'écran affirme au même instant (`runResumed`), et l'app ne se contredit pas
 * d'un canal à l'autre.
 */
export function startVoice(reprise: boolean): Extract<VoiceCue, 'voiceStart'> | null {
  return reprise ? null : 'voiceStart';
}

/**
 * La phrase due au passage `avant` → `apres`, sachant ce qui a DÉJÀ été dit. PURE.
 *
 * ─── LA TRANSITION NE SUFFIT PAS ICI (contrairement à l'haptique) ───────────
 * `gauge()` n'a AUCUNE hystérésis : `closed` et `almost` sortent tels quels du
 * verdict (`gauge.ts`). À trois mètres du seuil, le bruit normal du GPS fait
 * donc basculer l'état plusieurs fois en dix secondes. Une pulsation survit à
 * ça — elle dure vingt millisecondes. Une voix, non : elle bégaierait
 * « Boucle fermée / presque fermée / fermée » sur le dernier virage.
 *
 * D'où le troisième argument : chaque phrase est dite AU PLUS UNE FOIS par
 * course. C'est la mémoire qui rend la règle tenable, pas la transition seule.
 *
 * ─── ET ON NE RÉTROGRADE JAMAIS À VOIX HAUTE ────────────────────────────────
 * Après « Boucle fermée », « Boucle presque fermée » serait une correction
 * dite dans l'oreille de quelqu'un qui vient d'entendre une bonne nouvelle —
 * un reproche que L19 interdit. `missing` et `silent` ne parlent pas non plus :
 * s'éloigner n'est pas un événement, et une voix qui annonce un problème
 * pendant l'effort est une semonce.
 */
export function gaugeVoice(
  avant: GaugePhase,
  apres: GaugePhase,
  dejaDit: GaugeVoiceCue | null,
): GaugeVoiceCue | null {
  // Un état stable ne parle pas : la jauge est recalculée à chaque point GPS.
  if (avant === apres) return null;
  if (apres === 'closed') return dejaDit === 'runLoopClosed' ? null : 'runLoopClosed';
  if (apres === 'almost') return dejaDit === null ? 'runLoopAlmost' : null;
  return null;
}
