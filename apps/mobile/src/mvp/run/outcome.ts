/**
 * GRYD — CE QUE L'ÉCRAN DE RÉSULTAT A LE DROIT DE DIRE. PUR (lot M7).
 *
 * ─── LES DEUX LOIS QUI GOUVERNENT CE MODULE ─────────────────────────────────
 * L19 — L'APP N'ACCUSE JAMAIS, et les stats sont TOUJOURS préservées. Un refus
 * nomme un fait, donne le manque en mètres quand il existe, et rappelle ce qui
 * reste. « Raté » n'est pas une phrase que GRYD prononce.
 *
 * « L'app ne ment jamais » — et c'est ici que le mensonge serait le plus
 * tentant. Une course ENVOYÉE PLUS TARD (hors ligne) n'a pas de verdict : dire
 * « aucun territoire » serait affirmer un refus que personne n'a prononcé.
 * L'attente est donc une issue À PART ENTIÈRE, jamais un échec par défaut.
 *
 * Il y a DEUX attentes, et elles ne disent pas la même chose : la course qui
 * dort dans la file faute de réseau (`pending`) et celle qui est PARTIE et dont
 * la réponse n'est pas revenue (`sending`). Les confondre reviendrait à
 * promettre un envoi « dès que possible » alors qu'il a déjà lieu.
 *
 * ─── CE QUI EST TOUJOURS VRAI, QUOI QU'AIT DIT LE SERVEUR ───────────────────
 * La distance et la durée viennent de la trace LOCALE. Elles existent avant
 * l'envoi, elles survivent à un refus, elles survivent à l'absence de réseau.
 * C'est exactement ce que L19 appelle « tes stats restent disponibles » : elles
 * ne sont pas une consolation, elles sont un fait mesuré.
 */
import type { RejectReason } from '@klaim/shared';

/**
 * La réponse d'`ingest_run`, réduite à ce que le résultat en lit.
 *
 * Structurelle et PARTIELLE à dessein : ce module ne doit dépendre que des
 * champs qu'il utilise, sinon toute évolution de la réponse le casserait sans
 * qu'aucun comportement n'ait changé.
 */
export interface ServerVerdict {
  readonly status: 'valid' | 'partial' | 'rejected' | 'flagged';
  readonly rejectReason?: RejectReason;
  readonly loopClosed?: boolean;
  readonly loopAssisted?: true;
  readonly loopMissingM?: number;
  readonly loopRejectedReason?: 'narrow';
  /** Aire de l'anneau. Absente = aucun territoire écrit (voir `interiorPartial`). */
  readonly loopAreaM2?: number;
  /** Vrai = `loopAreaM2` SURESTIME le gain : elle ne doit pas être annoncée. */
  readonly interiorPartial?: boolean;
  readonly capReached?: boolean;
}

/** Ce qu'on a pu faire de la course, avant même de parler de territoire. */
export type SendResult =
  | { readonly kind: 'answered'; readonly verdict: ServerVerdict }
  /** Envoi impossible : la course est EN FILE, elle partira. Pas un échec. */
  | { readonly kind: 'queued' }
  /** Même la mise en file a échoué (stockage plein). Le seul vrai échec. */
  | { readonly kind: 'lost' };

/**
 * L'envoi TEL QUE L'ÉCRAN LE VIT : résolu, ou encore en route.
 *
 * ─── POURQUOI UN TYPE DE PLUS, ET PAS UNE VARIANTE DE `SendResult` ──────────
 * `SendResult` répond à « qu'est-ce que la course est devenue ? » — c'est ce
 * que `sendRun` RÉSOUT, et chacune de ses trois valeurs est un fait acquis.
 * « Parti, pas encore revenu » n'est pas un fait acquis : c'est un moment. Le
 * glisser dans `SendResult` obligerait chaque lecteur de ce type (la file
 * d'envoi, l'écran, les tests) à traiter une valeur que `sendRun` ne rend
 * jamais.
 *
 * ─── POURQUOI CET ÉTAT EXISTE ───────────────────────────────────────────────
 * L'écran de course ATTENDAIT `sendRun` avant de naviguer : sur un réseau lent,
 * un coureur à bout de souffle restait devant un bouton grisé, sans borne ni
 * indicateur. Il navigue désormais IMMÉDIATEMENT, et c'est l'écran de résultat
 * qui attend la réponse — en le disant. Cet état est ce qu'il peint pendant ce
 * temps-là : la course est finie, ses stats sont vraies, le verdict n'est pas
 * connu. Rien de plus.
 */
export type SendState = { readonly kind: 'sending' } | SendResult;

/**
 * Ce que l'écran affiche.
 *
 *   · `captured`  — territoire pris, avec son aire. Le pic émotionnel (L7).
 *   · `takenNoArea` — pris, mais l'aire ne décrit PAS le gain (`interiorPartial`)
 *     ou n'a pas été écrite. On dit la prise, on n'invente pas le chiffre.
 *   · `missing`   — la boucle ne s'est pas refermée, et on sait de combien.
 *   · `noLoop`    — pas de boucle, et aucun manque chiffrable. Aucun reproche.
 *   · `refused`   — la course elle-même n'a pas été retenue (allure, durée…).
 *   · `sending`   — la course EST PARTIE, la réponse n'est pas revenue. Aucun
 *     verdict, aucune célébration en avance : la course est finie, ses stats
 *     sont là, le territoire n'est pas encore une question tranchée.
 *   · `pending`   — pas encore envoyée. AUCUN verdict : on ne dit rien du
 *     territoire, parce qu'on ne sait rien.
 *   · `lost`      — on n'a même pas pu la mettre en file. On le DIT.
 */
export type ResultView =
  | { readonly kind: 'captured'; readonly areaM2: number; readonly assisted: boolean }
  | { readonly kind: 'takenNoArea' }
  | { readonly kind: 'missing'; readonly missingM: number }
  | { readonly kind: 'noLoop' }
  | { readonly kind: 'refused'; readonly reason: RejectReason | 'narrow' | 'unknown' }
  | { readonly kind: 'sending' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'lost' };

/**
 * Issue de l'envoi → ce que l'écran dit du TERRITOIRE. PURE.
 *
 * ⚠️ L'ORDRE est le fond du sujet, comme pour la carte : chaque cas écarte une
 * raison de ne pas savoir, et aucun verdict négatif n'est prononcé tant qu'un
 * serveur ne l'a pas réellement dit.
 */
export function resultView(send: SendState): ResultView {
  // EN PREMIER, avant tout ce qui juge : tant que la réponse n'est pas revenue,
  // aucune des branches ci-dessous n'a de matière. Se replier ici sur `lost` ou
  // sur « aucun territoire » annoncerait une décision que personne n'a prise —
  // la faute n°1 de cet écran.
  if (send.kind === 'sending') return { kind: 'sending' };
  if (send.kind === 'lost') return { kind: 'lost' };
  if (send.kind === 'queued') return { kind: 'pending' };

  const v = send.verdict;

  // La course elle-même refusée (trop courte, allure hors bornes…) : il n'y a
  // pas de territoire à discuter, et le motif est NOMMÉ — un refus sans raison
  // se lit comme une accusation.
  if (v.status === 'rejected') {
    return { kind: 'refused', reason: v.rejectReason ?? 'unknown' };
  }

  // Boucle fermée ET territoire écrit : le seul cas où un chiffre s'affiche.
  if (v.loopClosed === true) {
    // `interiorPartial` : l'aire de l'anneau SURESTIME ce qui a été obtenu.
    // L'annoncer serait un mensonge chiffré — le pire, parce que le joueur le
    // retient et le partage.
    if (v.loopAreaM2 !== undefined && v.loopAreaM2 > 0 && v.interiorPartial !== true) {
      return { kind: 'captured', areaM2: v.loopAreaM2, assisted: v.loopAssisted === true };
    }
    return { kind: 'takenNoArea' };
  }

  // Forme refusée par le moteur : un fait de géométrie, pas une faute.
  if (v.loopRejectedReason === 'narrow') return { kind: 'refused', reason: 'narrow' };

  // Pas de boucle. Si le serveur sait de combien il manquait, on le dit — c'est
  // toute la différence entre « raté » et « il te manquait 23 m ».
  if (v.loopMissingM !== undefined && v.loopMissingM > 0) {
    return { kind: 'missing', missingM: v.loopMissingM };
  }
  return { kind: 'noLoop' };
}

/**
 * Un chiffre héros de territoire est-il affichable ? PURE.
 *
 * Séparé de la vue pour que l'invariant soit testable seul : aucun m² ne sort
 * d'un état qui ne sait pas — ni pendant l'attente, ni après un refus, ni quand
 * l'aire surestime le gain.
 */
export function resultAreaM2(view: ResultView): number | null {
  return view.kind === 'captured' ? view.areaM2 : null;
}

/**
 * Les stats locales sont-elles affichées ? TOUJOURS OUI (L19).
 *
 * Cette fonction existe pour que la loi soit un test plutôt qu'une intention :
 * il n'y a aucun chemin, dans aucune issue, où la distance et la durée d'une
 * course réellement parcourue disparaissent de l'écran.
 */
export function showsLocalStats(_view: ResultView): boolean {
  return true;
}
