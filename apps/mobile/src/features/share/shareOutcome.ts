/**
 * GRYD — CE QU'ON A LE DROIT DE DIRE APRÈS UN PARTAGE (spec E37 « Partage
 * terminé », l.1463-1472).
 *
 * ═══ LE PROBLÈME QUE CE FICHIER RÉSOUT ═════════════════════════════════════
 * La spec veut un « toast ou petit écran de succès selon canal » avec trois
 * actions (retour au résultat · copier le lien · voir le profil public). Écrire
 * « Partage terminé » est trivial ; le faire SANS MENTIR ne l'est pas, parce
 * qu'une feuille de partage système ne rapporte pas toujours ce qui s'est passé :
 *
 *   · `expo-sharing.shareAsync()` (le canal IMAGE — story, post, sticker PNG)
 *     résout dès que la feuille se ferme, que l'utilisateur ait envoyé, choisi
 *     « Annuler », ou basculé sur une autre app. Elle ne renvoie AUCUN verdict.
 *     Donc : on ne sait pas. Sur iOS ET sur Android.
 *   · `Share.share()` de React Native distingue `sharedAction` de
 *     `dismissedAction` — mais SUR iOS SEULEMENT. Sur Android, l'`Intent`
 *     `ACTION_SEND` ne remonte pas l'issue au lanceur, et la promesse résout
 *     toujours en `sharedAction`. « Partagé » y est donc une déduction, pas une
 *     mesure.
 *   · `navigator.share()` (Web Share API) résout UNIQUEMENT en cas de succès et
 *     rejette (`AbortError`) sur une annulation — que `openShareSheet` traduit
 *     déjà en `{ ok: false, reason: 'dismissed' }`. Là, un `ok` est une vraie
 *     confirmation.
 *   · la COPIE presse-papiers, elle, est faite par l'app elle-même : c'est un
 *     fait certain — mais ce n'est pas un envoi, et le dire « partagé » serait
 *     une deuxième fabrication.
 *
 * D'où TROIS revendications distinctes et jamais confondues (`ShareDeliveryClaim`),
 * là où l'écran n'en connaissait qu'une (« c'est parti »). La constitution dit
 * « données RÉELLES ou VIDES » : ici la donnée réelle est parfois « je ne sais
 * pas », et c'est cette valeur-là qu'il faut pouvoir afficher.
 *
 * ═══ POURQUOI C'EST UN FICHIER PUR, SANS UN SEUL IMPORT ════════════════════
 * Règle projet : « toute logique de règle = fonction PURE + tests Deno (zéro
 * import React) ». Les types d'entrée sont donc REDÉCLARÉS ici plutôt
 * qu'importés de `shareActions.ts` (qui importe `react-native`), et
 * `partage.tsx` porte une garde de compilation qui casse le build si les deux
 * unions divergent — même dispositif que `narrative.ts` / `templates.tsx`.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. CE QUE LA PLATEFORME A RÉELLEMENT RAPPORTÉ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Le canal qui a effectivement servi — la valeur `via` d'un `ShareActionResult`
 * réussi (`features/share/shareActions.ts`). C'est le canal RÉEL, jamais celui
 * qu'on visait : `shareAsImage` retombe sur du texte quand la capture échoue, et
 * `shareStickerImage` retombe sur la copie sur le web.
 */
export type ShareVia = 'clipboard' | 'share' | 'webshare' | 'image';

/** Plateforme d'exécution — ce qui décide si une feuille sait rapporter l'issue. */
export type ShareOutcomePlatform = 'ios' | 'android' | 'web';

/** Raison d'un échec — mêmes valeurs que `ShareActionResult` (shareActions.ts). */
export type ShareFailureReason = 'dismissed' | 'unavailable';

/** Le résultat d'action, redéclaré sans dépendance (voir l'en-tête). */
export type ShareOutcomeResult =
  | { readonly ok: true; readonly via: ShareVia }
  | { readonly ok: false; readonly reason: ShareFailureReason };

/**
 * CE QU'ON A LE DROIT D'AFFIRMER. Trois valeurs, trois phrases différentes :
 *
 *   · `copied`      — l'app a copié elle-même : fait CERTAIN, mais ce n'est pas
 *                     un envoi. On dit « copié », jamais « partagé ».
 *   · `confirmed`   — la plateforme a rapporté un envoi abouti. Seul cas où
 *                     « Partage terminé » est une phrase vraie.
 *   · `handed_off`  — le média a été remis à la feuille système, qui ne dit pas
 *                     ce qu'il en est advenu. On décrit le geste qu'on a fait,
 *                     pas un résultat qu'on n'a pas mesuré.
 */
export type ShareDeliveryClaim = 'copied' | 'confirmed' | 'handed_off';

/**
 * La règle, canal par canal et plateforme par plateforme.
 *
 * ⚠ `via: 'share'` sur Android est délibérément `handed_off`, et c'est LE point
 * qui fait tout l'intérêt de cette fonction : `Share.share()` y résout toujours
 * en `sharedAction`, donc `openShareSheet` ne peut pas y distinguer un envoi
 * d'une annulation. Traiter les deux plateformes pareil ferait afficher
 * « Partage terminé » à un joueur Android qui vient d'annuler — exactement ce
 * que la constitution interdit. Le prix est une phrase moins flatteuse ; le
 * bénéfice est qu'elle est vraie.
 *
 * `via: 'image'` est `handed_off` PARTOUT : `expo-sharing` ne rapporte l'issue
 * sur aucune plateforme.
 */
export function shareDeliveryClaim(
  via: ShareVia,
  platform: ShareOutcomePlatform,
): ShareDeliveryClaim {
  switch (via) {
    case 'clipboard':
      return 'copied';
    case 'webshare':
      // Web Share API : résout au succès, rejette à l'annulation (déjà traduit
      // en `dismissed` en amont). Un `ok` ici est une confirmation réelle.
      return 'confirmed';
    case 'share':
      // RN `Share.share` : seul iOS distingue `dismissedAction`.
      return platform === 'ios' ? 'confirmed' : 'handed_off';
    case 'image':
      // `expo-sharing.shareAsync` : résout à la fermeture de la feuille, sans
      // verdict, sur toutes les plateformes.
      return 'handed_off';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. « TOAST OU PETIT ÉCRAN DE SUCCÈS SELON CANAL » (spec E37, Format)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * La surface de retour :
 *   · `none`  — on ne dit RIEN (l'utilisateur a fermé la feuille : une annulation
 *               n'est ni une erreur ni un succès, et surtout pas « terminé ») ;
 *   · `toast` — un bandeau bref, sans suite à proposer ;
 *   · `panel` — le « petit écran de succès » de la spec, avec ses actions.
 */
export type ShareOutcomeSurface = 'none' | 'toast' | 'panel';

export interface ShareOutcome {
  readonly surface: ShareOutcomeSurface;
  /** `null` quand rien n'est affirmé (annulation, ou canal indisponible). */
  readonly claim: ShareDeliveryClaim | null;
}

/**
 * L'AIGUILLAGE, dérivé du CANAL comme la spec le demande.
 *
 * ─── Pourquoi une copie ne mérite qu'un toast ───────────────────────────────
 * « Selon canal » ne veut pas dire « au hasard ». Une COPIE ne fait sortir le
 * média vers aucune application : il n'y a rien à faire ensuite, donc rien à
 * proposer — un panneau d'actions serait un obstacle posé sur un geste d'une
 * seconde. Un canal EXTERNE (feuille système, Web Share) est l'inverse : le
 * joueur revient dans GRYD après un aller-retour, et c'est précisément le
 * moment où « retour au résultat » a un sens. C'est le partage terminé qui
 * mérite un écran, pas le presse-papiers.
 *
 * ─── Une annulation ne dit rien du tout ─────────────────────────────────────
 * `dismissed` → `none`. Pas de toast « annulé » non plus : l'utilisateur sait
 * ce qu'il vient de faire, et le lui redire occupe la seule surface où un vrai
 * message compterait.
 */
export function shareOutcome(
  result: ShareOutcomeResult,
  platform: ShareOutcomePlatform,
): ShareOutcome {
  if (!result.ok) {
    // `unavailable` = aucun canal n'a pu servir. C'est un échec à DIRE (l'écran
    // affiche déjà `shareUnavailable`), mais il n'ouvre aucune suite.
    return { surface: result.reason === 'unavailable' ? 'toast' : 'none', claim: null };
  }
  const claim = shareDeliveryClaim(result.via, platform);
  return { surface: claim === 'copied' ? 'toast' : 'panel', claim };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LES ACTIONS DU PETIT ÉCRAN (spec E37, l.1470-1472)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les suites possibles. Les trois premières sont celles de la spec ;
 * `share_again` est la sortie neutre — fermer le panneau et retrouver le
 * compositeur derrière. Elle n'est pas décorative : sans elle, un joueur sans
 * historique de navigation n'aurait AUCUN geste à faire dans ce panneau.
 */
export type ShareDoneActionId =
  | 'back_to_result'
  | 'copy_link'
  | 'public_profile'
  | 'share_again';

/**
 * CE QUE L'APP PEUT VRAIMENT FAIRE ICI, MAINTENANT (constitution §2 : l'affichage
 * se dérive de la capacité RÉELLE). Aucune de ces trois valeurs n'est une
 * préférence de produit — chacune se mesure :
 *
 *   · `resultReachable`        — `router.canGoBack()`. Sans historique (deep
 *                                link), « retour au résultat » retomberait sur
 *                                les onglets : le libellé mentirait.
 *   · `linkAvailable`          — un lien de partage a été construit pour cette
 *                                sortie (`buildShareLink`) ET un presse-papiers
 *                                existe (`clipboardAvailable`). Sans le second,
 *                                `copyText` retomberait sur la feuille de
 *                                partage : le bouton marcherait, mais il ferait
 *                                autre chose que ce que son libellé promet.
 *   · `publicProfileReachable` — une route de profil public existe. Au
 *                                27/07/2026 elle N'EXISTE PAS (`apps/mobile/app/`
 *                                n'a ni `u/[handle]` ni équivalent ; la copie
 *                                `C.seePublicProfile` le dit déjà), donc l'écran
 *                                passe `false` et l'action n'est pas peinte.
 *                                Le jour où la page existe, seul ce booléen
 *                                change — pas cette fonction.
 */
export interface ShareDoneCapabilities {
  readonly resultReachable: boolean;
  readonly linkAvailable: boolean;
  readonly publicProfileReachable: boolean;
}

/**
 * UNE SEULE action principale (§A : un écran = un CTA chartreuse), le reste en
 * secondaire. `primary` n'est jamais `null` : `share_again` est toujours
 * disponible (fermer le panneau ne dépend de rien).
 */
export interface ShareDoneActions {
  readonly primary: ShareDoneActionId;
  readonly secondary: readonly ShareDoneActionId[];
}

/**
 * La spec liste « retour au résultat » EN PREMIER, et c'est aussi le trou que
 * l'écran avait : après un partage, rien ne ramenait au résultat. C'est donc le
 * CTA principal quand il est atteignable — sinon `share_again`, qui l'est
 * toujours. Une action n'apparaît jamais deux fois (le principal n'est pas
 * répété en secondaire) : deux contrôles pour un seul geste sont un contrôle de
 * trop (§A).
 */
export function shareDoneActions(caps: ShareDoneCapabilities): ShareDoneActions {
  const primary: ShareDoneActionId = caps.resultReachable ? 'back_to_result' : 'share_again';
  const secondary: ShareDoneActionId[] = [];
  if (caps.linkAvailable) secondary.push('copy_link');
  if (caps.publicProfileReachable) secondary.push('public_profile');
  if (primary !== 'share_again') secondary.push('share_again');
  return { primary, secondary };
}
