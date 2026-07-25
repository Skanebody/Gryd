/**
 * GRYD — « OÙ EST LE JOUEUR », et surtout : QUE DIRE quand on ne le sait pas.
 *
 * ─── POURQUOI CE MODULE EXISTE (21/07/2026) ─────────────────────────────────
 * Les deux MapScreen (natif / web) portaient CHACUN leur propre séquence
 * permission → position, écrite deux fois à la main. Elles ont dérivé, et elles
 * partageaient le même cul-de-sac MUET :
 *
 *   const fix = await getCurrentPositionOnce();
 *   if (cancelled || !fix) return;        // ← sortie sans RIEN poser
 *
 * Permission ACCORDÉE + aucun fix (localisation coupée au niveau de l'OS, GPS
 * froid en intérieur, timeout) ⇒ pas de point « moi », pas de message, et un
 * bouton Recentrer qui ne produisait STRICTEMENT rien à l'écran. La carte
 * restait sur le globe entier sans une explication — exactement l'écran-blanc
 * déguisé que la règle « état vide ≠ écran blanc » interdit.
 *
 * Deuxième défaut réparé ici : le RÉSULTAT était réduit à un booléen
 * (`granted`). Tout échec non-permission se retrouvait donc étiqueté « refusé »
 * — un mensonge sur le dos de l'utilisateur, particulièrement sur Safari où
 * `navigator.permissions.query({name:'geolocation'})` n'existe pas et où l'état
 * réel est « je ne sais pas » (voir webGeolocation.ts).
 *
 * Ce module est la SEULE séquence, partagée par les deux variantes. Il ne
 * connaît ni expo-location ni `navigator.geolocation` : le provider lui est
 * passé (`../run/gps/provider` sur natif, `./webGeolocation` sur web), ce qui
 * garantit que localhost et l'iPhone suivent la même logique de décision, à la
 * seule différence des capteurs eux-mêmes.
 */
import type { LatLngPoint } from './realAnchors';

/**
 * Ce que la carte SAIT de la position, et donc ce qu'elle a le droit de dire :
 *  • `locating`    — recherche en cours. On n'affirme rien (chargement ≠ vide).
 *  • `denied`      — l'utilisateur (ou la politique du navigateur) a REFUSÉ.
 *  • `unavailable` — permission acquise ou inconnue, mais AUCUN fix : capteur
 *                    muet, localisation OS coupée, timeout. Ce n'est PAS un
 *                    refus, et l'écran ne doit pas l'appeler ainsi.
 *  • `ok`          — un vrai fix est arrivé ; le point « moi » est légitime.
 */
export type MapLocationState = 'locating' | 'denied' | 'unavailable' | 'ok';

/** État de permission, dans la forme commune aux deux providers. */
interface PermissionState {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
}

/**
 * Les trois fonctions consommées par la carte. Volontairement structurel (pas
 * d'import de provider ici) : le natif et le web branchent le leur.
 * `getCurrentPositionOnce` est typé au minimum utile — `RawFix` en porte plus,
 * mais la carte ne lit que la latitude et la longitude.
 */
export interface MapLocationProvider {
  checkForegroundPermission: () => Promise<PermissionState>;
  requestForegroundPermission: () => Promise<PermissionState>;
  getCurrentPositionOnce: () => Promise<{ lat: number; lng: number } | null>;
}

/** Issue d'une tentative : un état AFFIRMABLE, et le point s'il existe. */
export interface MapLocationOutcome {
  state: Exclude<MapLocationState, 'locating'>;
  point: LatLngPoint | null;
}

/**
 * Une tentative complète : lire la permission, la demander si c'est encore
 * possible, puis chercher un fix. Ne renvoie JAMAIS « rien » — chacune des trois
 * issues possibles a son état, donc sa phrase à l'écran.
 *
 * ⚠️ `undetermined` n'est PAS traité comme un refus. Safari n'expose pas l'état
 * de la permission géoloc : après une invite acceptée, `checkForegroundPermission`
 * y répond toujours `undetermined`. Conclure « refusé » fermerait la carte à un
 * joueur qui vient d'accepter. On TENTE donc la position, et c'est l'échec (ou
 * non) de cette tentative qui tranche.
 */
export async function resolveLocation(
  provider: MapLocationProvider,
): Promise<MapLocationOutcome> {
  const current = await provider.checkForegroundPermission();
  const permission =
    current.status !== 'granted' && current.canAskAgain
      ? await provider.requestForegroundPermission()
      : current;

  // Seul un refus EXPLICITE ferme la porte (et il reste réouvrable par les
  // réglages système — d'où le message dédié plutôt qu'un silence).
  if (permission.status === 'denied') return { state: 'denied', point: null };

  const fix = await provider.getCurrentPositionOnce();
  if (!fix) return { state: 'unavailable', point: null };
  return { state: 'ok', point: { lat: fix.lat, lng: fix.lng } };
}

// ═══════════════════════════════════════════════════════════════════════════
// LA MATRICE : UN SEUL RÉCIT DOMINANT PAR ÉTAT (retour fondateur 25/07/2026)
//
// « Pas de next best action clair », « aucun focus produit fort », « jamais
// plusieurs récits concurrents ». Le défaut n'était pas une phrase ratée, c'était
// une ABSENCE D'ARBITRAGE : la carte pouvait simultanément dire « active la
// localisation » (pill du bas), « pas encore connecté » (peek) et proposer GO —
// trois histoires pour une seule situation, et aucune désignée comme LA suivante.
//
// Cette fonction tranche, une fois, pour toutes les surfaces. Elle est PURE (ni
// React ni capteur : c'est ce qui la rend testable en Deno et vérifiable sans
// device), et elle prend les trois axes qui décrivent réellement l'écran :
//   · ACCÈS   — ce que l'app sait de la position (six états DISTINCTS) ;
//   · LENTILLE— Run ou Bike (E14) : une lentille où rien n'est enregistré ne
//               peut pas emprunter les récits de la course à pied ;
//   · DONNÉES — ce que la lecture du territoire a rendu (quatre états + vide).
//
// CE QU'ELLE N'A PAS LE DROIT DE FAIRE, et que les tests verrouillent :
//   1. rendre DEUX récits (le champ `narrative` est unique par construction) ;
//   2. répéter dans la barre haute le récit que la sheet porte déjà (deux fois
//      le même message pour une seule situation = §A) ;
//   3. peindre une barre d'alerte SANS action réelle derrière — ce serait
//      rejouer exactement le défaut corrigé ici (« l'utilisateur n'a pas besoin
//      d'une phrase, il a besoin d'une action dirigée ») ;
//   4. proposer « ouvrir les réglages » là où la plateforme n'en a pas (web) :
//      un bouton qui échoue à coup sûr est un bouton mort.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ce que l'ÉCRAN sait de la position — les quatre états de `MapLocationState`,
 * plus les deux que seule une surface peut connaître :
 *  • `unknown` — la permission n'a même pas encore été LUE. On n'affirme rien,
 *                pas même « on ne t'a rien demandé » ;
 *  • `unasked` — lue, et jamais demandée. Ce n'est PAS un refus : elle se règle
 *                par UN geste dans l'app, là où `denied` passe par les réglages.
 */
export type MapAccessState = MapLocationState | 'unasked' | 'unknown';

/** Lentille de la carte (planche E14). */
export type MapLens = 'run' | 'bike';

/**
 * Ce que la lecture du territoire a rendu. Les quatre états distincts de la
 * constitution (`loading` ≠ `signed-out` ≠ `failed` ≠ vide), plus `territory`
 * quand il y a réellement quelque chose à raconter.
 */
export type MapDataState = 'loading' | 'signed-out' | 'failed' | 'empty' | 'territory';

/**
 * LE récit de la sheet. Un seul à la fois — c'est tout l'objet de la matrice.
 *  • `skeleton`        — lecture en cours : la sheet n'affirme RIEN (E02 :
 *                        « skeleton dans la sheet, aucun spinner plein écran ») ;
 *  • `bike`            — lentille vélo (E14) ;
 *  • `grant-location`  — position jamais demandée ;
 *  • `denied-location` — refus explicite (pédagogie + réglages) ;
 *  • `retry-location`  — permission acquise, aucun fix ;
 *  • `sign-in` / `retry-data` / `first-capture` / `territory` — les états côté
 *                        données, inchangés.
 */
export type MapNarrative =
  | 'skeleton'
  | 'bike'
  | 'grant-location'
  | 'denied-location'
  | 'retry-location'
  | 'sign-in'
  | 'retry-data'
  | 'first-capture'
  | 'territory';

/**
 * Les actions RÉELLES de l'écran — chacune a une cible qui existe aujourd'hui :
 *  • `locate`        → `resolveLocation` (demande la permission au GESTE, puis
 *                      cherche un fix) — commun à « Activer » et « Réessayer » :
 *                      c'est le MÊME appel, seul le libellé change ;
 *  • `open-settings` → réglages système de l'app (natif uniquement) ;
 *  • `sign-in` / `retry-data` → les deux actions d'état vide déjà câblées ;
 *  • `switch-to-run` → repasse la lentille en Run (préférence `gryd.mapactivity`) ;
 *  • `widget`        → l'action portée par le widget « Mon territoire ».
 */
export type MapAction =
  | 'none'
  | 'locate'
  | 'open-settings'
  | 'sign-in'
  | 'retry-data'
  | 'switch-to-run'
  | 'widget';

export interface MapPlanInput {
  access: MapAccessState;
  lens: MapLens;
  data: MapDataState;
  /**
   * La plateforme peut-elle ouvrir les réglages système ? Injecté (jamais
   * deviné ici) : `false` sur web, où aucune API ne mène aux réglages du
   * navigateur — l'affichage se dérive de la capacité RÉELLE.
   */
  canOpenSettings: boolean;
}

export interface MapPlan {
  /** LE récit de la sheet. Unique par construction. */
  narrative: MapNarrative;
  /** L'action DOMINANTE de ce récit ('none' = le récit n'en porte pas). */
  action: MapAction;
  /** Action secondaire, rendue en LIEN — jamais un 2ᵉ bouton (§A.4). */
  secondary: MapAction;
  /** Barre haute ambre NON BLOQUANTE (E02) — jamais un doublon du récit. */
  banner: 'none' | 'location';
  /** Action de la barre. Invariant : `banner !== 'none'` ⇒ action réelle. */
  bannerAction: MapAction;
  /** Le CTA chartreuse GO est-il légitime dans cet état ? */
  go: boolean;
}

/**
 * L'ARBITRAGE, dans l'ordre — chaque marche est une décision de produit :
 *
 * 1. LA LENTILLE PRIME. En Bike, rien de la course à pied ne s'applique : ni
 *    territoire, ni mission, ni classement, ni GO (qui enregistrerait une sortie
 *    vélo comme une course à pied). La seule action vraie est de revenir en Run,
 *    et elle est dite positivement.
 *
 * 2. CE QUI EMPÊCHE DE LIRE PASSE DEVANT LA POSITION. Pas de session, ou lecture
 *    en échec : aucune position ne rendra la carte utile tant que ça dure. Ces
 *    récits gardent donc la sheet, et l'état de position descend dans la barre.
 *
 * 3. SINON, LA POSITION EST LE PREMIER BESOIN. « Où suis-je » précède « que
 *    faire » : un joueur qui ne se voit pas sur sa carte n'a aucune décision à
 *    prendre. Quand le territoire n'a rien d'urgent à dire (vide, ou widget), la
 *    sheet porte donc l'action de localisation — la place est libre, et une
 *    action dirigée y vaut mieux qu'un constat.
 *
 * 4. LA BARRE NE PARLE QUE SI ELLE AGIT. Elle ne double jamais le récit, et elle
 *    n'existe pas quand la plateforme n'a aucune action à offrir (refus sur web).
 *
 * NOTE SUR `go` : il reste VRAI même position refusée. GO n'est pas un bouton
 * mort dans ce cas — le préflight de course demande la permission et explique un
 * refus (`features/run/gps`). Le peindre « indisponible » serait un mensonge
 * dans l'autre sens. Il ne tombe que dans la lentille Bike, où aucun moteur ne
 * porte l'effort. (La sheet de ZONE ouverte retire GO à son tour, mais c'est un
 * calque orthogonal — `useZoneSheetOpen` — pas un état de cette matrice.)
 */
export function mapPlan(input: MapPlanInput): MapPlan {
  const { access, lens, data, canOpenSettings } = input;

  // 1. Lentille Bike : un récit à elle, aucun CTA chartreuse, aucune barre.
  if (lens === 'bike') {
    return {
      narrative: 'bike',
      action: 'switch-to-run',
      secondary: 'none',
      banner: 'none',
      bannerAction: 'none',
      go: false,
    };
  }

  // `unknown`, `locating` et `ok` n'APPELLENT AUCUNE ACTION : on ne sait pas
  // encore / on cherche / tout va bien. Les trois autres, si — et chacun la
  // sienne : demander ≠ rouvrir par les réglages ≠ réessayer.
  const locNarrative: MapNarrative | null =
    access === 'unasked'
      ? 'grant-location'
      : access === 'denied'
        ? 'denied-location'
        : access === 'unavailable'
          ? 'retry-location'
          : null;

  const locAction: MapAction =
    locNarrative === 'grant-location' || locNarrative === 'retry-location'
      ? 'locate'
      : locNarrative === 'denied-location' && canOpenSettings
        ? 'open-settings'
        : 'none';

  // 2/3. Le récit de la sheet.
  const base: { narrative: MapNarrative; action: MapAction } =
    data === 'loading'
      ? { narrative: 'skeleton', action: 'none' }
      : data === 'signed-out'
        ? { narrative: 'sign-in', action: 'sign-in' }
        : data === 'failed'
          ? { narrative: 'retry-data', action: 'retry-data' }
          : locNarrative !== null
            ? { narrative: locNarrative, action: locAction }
            : data === 'empty'
              ? // Courir EST l'action, et le bouton GO la porte déjà (§A.4).
                { narrative: 'first-capture', action: 'none' }
              : { narrative: 'territory', action: 'widget' };

  // 4. La barre : ni doublon du récit, ni alerte sans issue.
  const showBanner = locNarrative !== null && base.narrative !== locNarrative && locAction !== 'none';

  return {
    narrative: base.narrative,
    action: base.action,
    // « Position introuvable » a DEUX issues réelles quand la plateforme les a :
    // réessayer (le capteur peut répondre cette fois) et les réglages (la
    // localisation système peut être coupée). La seconde est un LIEN.
    secondary:
      base.narrative === 'retry-location' && canOpenSettings ? 'open-settings' : 'none',
    banner: showBanner ? 'location' : 'none',
    bannerAction: showBanner ? locAction : 'none',
    go: true,
  };
}

/** Tous les états d'accès — utilitaire d'exhaustivité (matrice, tests, revues). */
export const MAP_ACCESS_STATES: readonly MapAccessState[] = [
  'unknown',
  'unasked',
  'locating',
  'denied',
  'unavailable',
  'ok',
];

/** Tous les états de données. */
export const MAP_DATA_STATES: readonly MapDataState[] = [
  'loading',
  'signed-out',
  'failed',
  'empty',
  'territory',
];
