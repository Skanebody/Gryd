/**
 * GRYD — OUVRIR UNE VILLE, la partie PURE (aucune I/O, donc testable).
 *
 * « Dans la création de crew on doit pouvoir choisir n'importe quelle ville. »
 * Le référentiel en propose 7 870 ; le serveur n'en avait ouvert que 2. Entre
 * les deux il manquait UN GESTE : chercher « Zurich » affichait la ville avec
 * une puce « Pas encore ouverte » et aucun moyen d'en faire un terrain de jeu.
 * L'Edge Function `open_city` existait et n'avait AUCUN appelant.
 *
 * ─── CE QUE CE MODULE FAIT, ET RIEN D'AUTRE ────────────────────────────────
 * Il traduit la réponse du serveur en quelque chose que l'écran peut DIRE. Il
 * ne décide rien : ce qui est ouvert est décidé et relu par le serveur
 * (`provision_city`, migration 0066), jamais par le client.
 *
 * ─── CE QUE L'ÉCRAN A LE DROIT D'AFFIRMER APRÈS UN SUCCÈS ──────────────────
 * Exactement ce que la fonction répond, et pas un mot de plus :
 *  · une AIRE DE JEU APPROXIMATIVE a été créée — un disque de `radiusM` autour
 *    du point du référentiel (`area: 'approximate_disc'`). Ce n'est PAS le
 *    contour de la ville, et l'écran ne doit jamais laisser croire l'inverse ;
 *  · une saison a démarré, ou il y en avait déjà une (`seasonCreated`) ;
 *  · `status: 'wild'` = AUCUNE densité mesurée. C'est une absence de donnée,
 *    pas un niveau, pas une promesse — ce module ne le rend donc PAS à l'écran.
 *    Il est lu, et volontairement jeté : le seul chiffre d'activité qu'un client
 *    peut lire honnêtement reste le comptage de crews (`useCityActivity`).
 *
 * ─── ET QUAND ÇA ÉCHOUE ────────────────────────────────────────────────────
 * Un échec se DIT et se réessaie. Il ne se confond ni avec « pas encore
 * ouverte » (l'état d'avant, qui reste vrai) ni avec un succès. Chaque motif
 * nommé par le serveur a sa phrase ; l'inconnu a la sienne, honnête : « ça n'a
 * pas abouti », jamais un faux diagnostic.
 */
import { C } from '../../i18n/catalog/city';
import type { Entry } from '../../i18n/types';

/**
 * Ce que le serveur répond quand il a ouvert (ou retrouvé) la ville. Sous-
 * ensemble STRICT de la réponse de `open_city/index.ts` : on ne déclare que ce
 * dont l'écran se sert, pour qu'aucun champ non lu ne finisse affiché.
 */
export interface OpenCitySuccess {
  readonly cityId: string;
  /** Nom RELU en base — celui du serveur, pas celui qu'on a proposé. */
  readonly name: string;
  /** `true` : le disque approximatif vient d'être créé. `false` : la zone existait. */
  readonly zoneCreated: boolean;
  /** `true` : une saison vient de démarrer. `false` : il y en avait déjà une. */
  readonly seasonCreated: boolean;
  /** Rayon du disque créé, en mètres — absent quand la zone existait déjà. */
  readonly radiusM: number | null;
}

export type OpenCityOutcome =
  | { readonly ok: true; readonly value: OpenCitySuccess }
  | { readonly ok: false; readonly reason: string };

/**
 * Lit la réponse de `open_city`. Toute forme inattendue est un ÉCHEC, jamais un
 * succès partiel : afficher « ville ouverte » sur une réponse qu'on n'a pas
 * comprise serait exactement l'affirmation non lue qu'AMENDEMENT-47 interdit.
 */
export function readOpenCityResponse(raw: unknown): OpenCityOutcome {
  if (typeof raw !== 'object' || raw === null) return { ok: false, reason: 'unreadable_response' };
  const body = raw as Record<string, unknown>;
  if (body.ok !== true) {
    const reason = typeof body.error === 'string' && body.error.length > 0 ? body.error : 'refused';
    return { ok: false, reason };
  }
  const cityId = body.cityId;
  const name = body.name;
  if (typeof cityId !== 'string' || cityId.length === 0) {
    return { ok: false, reason: 'unreadable_response' };
  }
  if (typeof name !== 'string' || name.length === 0) {
    return { ok: false, reason: 'unreadable_response' };
  }
  return {
    ok: true,
    value: {
      cityId,
      name,
      zoneCreated: body.zoneCreated === true,
      seasonCreated: body.seasonCreated === true,
      radiusM: typeof body.radiusM === 'number' && Number.isFinite(body.radiusM)
        ? body.radiusM
        : null,
    },
  };
}

/**
 * Motif de refus → phrase affichée. Trois cas se distinguent parce qu'ils
 * appellent trois gestes DIFFÉRENTS de la part du joueur :
 *  · se connecter (le serveur exige un compte pour écrire) ;
 *  · abandonner cette ville (le serveur ne la connaît pas — inutile d'insister) ;
 *  · réessayer (tout le reste : réseau, configuration, panne).
 *
 * ⚠️ Le défaut est « réessaie », pas un diagnostic inventé : un motif qu'on ne
 * connaît pas ne doit pas devenir une explication qu'on fabrique.
 */
export function openCityFailureEntry(reason: string): Entry {
  if (reason === 'missing_authorization' || reason === 'invalid_token') return C.openFailedAuth;
  if (reason === 'unknown_city' || reason === 'bad_city_id' || reason === 'missing_city_id') {
    return C.openFailedUnknown;
  }
  // Le plafond est une cause CONNUE, renvoyée nommément par le serveur (429).
  // La laisser tomber dans le défaut « réessaie » invitait à recommencer une
  // action qui échouera toujours — un bouton mort déguisé en incident réseau.
  if (reason === 'open_quota_reached') return C.openFailedQuota;
  return C.openFailed;
}

/**
 * Un « Réessayer » a-t-il la moindre chance d'aboutir ?
 *
 * Trois refus sont DÉFINITIFS pour cette ville-ci : le serveur ne la connaît
 * pas, ou le joueur a atteint son plafond d'ouvertures. Repeindre « Réessayer »
 * dessus, c'est peindre une action qui échouera à tous les coups — exactement le
 * bouton mort que CLAUDE.md interdit. Tout le reste (réseau, panne, session)
 * peut changer d'une seconde à l'autre : le bouton reste.
 */
export function openCityFailureIsFinal(reason: string): boolean {
  return (
    reason === 'open_quota_reached' ||
    reason === 'unknown_city' ||
    reason === 'bad_city_id' ||
    reason === 'missing_city_id'
  );
}
