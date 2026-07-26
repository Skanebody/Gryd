/**
 * GRYD — LA 3ᵉ MÉTRIQUE DU BANDEAU LIVE (E07), ET LE « 0 » QU'ELLE AFFICHAIT.
 *
 * ─── LE DÉFAUT, QUI TOUCHAIT AUSSI LES COUREURS ─────────────────────────────
 * L'écran de course rendait `formatPace(snapshot.paceSPerKm)` sous le libellé
 * « ALLURE /KM ». Or le tracker pose `paceSPerKm = 0` tant qu'aucun kilomètre
 * n'a été parcouru (`runPipeline.ts` : `km > 0 ? activeS / km : 0`) et
 * `formatPace` rend littéralement « 0'00 » pour une allure nulle ou non finie.
 * Résultat : pendant les premières dizaines de secondes de CHAQUE sortie — et
 * pendant toute une sortie où le GPS ne prend jamais —, l'écran affichait un
 * zéro nu sous un libellé de mesure. C'est la faute que la constitution nomme
 * explicitement : une valeur non mesurée DISPARAÎT, elle ne vaut pas zéro. Le
 * Résultat vient de la refermer (`effortRate` rend `null`, la case disparaît) ;
 * l'écran regardé pendant TOUTE la sortie la portait encore.
 *
 * ─── L'ARBITRAGE : LA CASE RESTE, LE CHIFFRE DISPARAÎT ──────────────────────
 * Au Résultat, la case entière disparaît — c'est possible parce que l'écran est
 * fixe et lu une fois. En course, non : le bandeau est une rangée de TROIS
 * métriques de largeur égale, sur la carte, lue en mouvement. La faire
 * disparaître aurait deux coûts qui, eux, ne sont pas cosmétiques :
 *   · la mise en page se réorganiserait au premier kilomètre mesuré, c'est-à-
 *     dire à un instant imprévisible, sous les yeux de quelqu'un qui court ;
 *   · le temps et la distance changeraient de position en pleine course, alors
 *     que la planche E07 promet un bandeau lisible « d'un coup d'œil » — on
 *     retrouve une information par sa PLACE avant de la lire.
 * On garde donc la case et son libellé (qui dit ce qui manque) et on remplace
 * le chiffre par un TIRET CADRATIN. Un tiret n'affirme rien : c'est la
 * convention typographique de la valeur absente, et il ne peut pas être lu
 * comme une performance nulle, contrairement à « 0'00 ». L'unité disparaît avec
 * le chiffre — « — KM/H » suggérerait une mesure en km/h qui n'existe pas.
 *
 * ─── ET L'UNITÉ : LE CYCLISTE LIT LA MÊME GRANDEUR DU DÉPART À L'ARRIVÉE ────
 * Le Résultat rend une VITESSE au cycliste et une ALLURE au coureur
 * (`features/run/effortRate.ts`, livré le 26/07). Le bandeau live, lui, rendait
 * des min/km à tout le monde : un cycliste lisait donc son effort dans deux
 * unités pour la même sortie, la seconde démentant la première trente secondes
 * après la ligne d'arrivée. Ce module réutilise le MÊME moteur — pas une
 * seconde conversion, qui finirait par diverger de la première.
 *
 * Module PUR : aucune dépendance React, aucun i18n, aucun accès au stockage. Le
 * séparateur décimal est passé par l'appelant (même contrat que `effortRate` et
 * `ui/numberFormat`) — sans `Intl`, pour un rendu identique iOS/Android/Deno.
 */
import type { Activity } from '@klaim/shared';
import { EFFORT_RATE_KIND, effortRate, formatSpeedKmh, type EffortRateKind } from '../effortRate';

/**
 * Ce qui remplace le chiffre quand rien n'a été mesuré : un TIRET CADRATIN
 * (U+2014), pas un tiret d'union ni trois points. Il est exporté pour que le
 * test parle de la même chose que l'écran, et pour qu'un jour où la convention
 * changerait, elle change à un seul endroit.
 */
export const NO_MEASURE = '—';

/** L'unité de la vitesse, INVARIANTE (jamais traduite — comme « KM » et « GRYD »). */
export const SPEED_UNIT = 'KM/H';

/** Le 3ᵉ chiffre du bandeau, prêt à peindre. */
export interface LiveRateDisplay {
  /**
   * La GRANDEUR de la discipline. Elle est connue MÊME quand la mesure ne l'est
   * pas : c'est ce qui permet à la case de garder son libellé (« ALLURE /KM » /
   * « VITESSE ») pendant qu'elle attend un premier kilomètre.
   */
  readonly kind: EffortRateKind;
  /** `false` ⇒ `value` vaut `NO_MEASURE` et `unit` vaut `null`. */
  readonly measured: boolean;
  /** Déjà mis en forme : « 5'28 », « 24,4 », ou le tiret. */
  readonly value: string;
  /** `null` quand l'unité est portée par le libellé (allure) ou quand rien n'est mesuré. */
  readonly unit: string | null;
}

/**
 * Allure « 5'28 » (s/km → min'sec) — le CŒUR PUR du formatage d'allure.
 *
 * Il vit ici, et non dans `features/run/simulation.ts` d'où il vient, pour une
 * raison mécanique : `simulation.ts` importe `ui/format`, donc le store i18n,
 * donc React — il n'est pas chargeable sous Deno, et son formateur n'a donc
 * jamais pu être testé. `simulation.formatPace` délègue désormais ici : une
 * seule vérité pour « ce qu'est une allure affichée », partagée par l'écran de
 * course, le Résultat et la carte de partage.
 *
 * PRÉCONDITION : `sPerKm` est fini et > 0. Les cas dégénérés ne sont pas gérés
 * ici mais AVANT, par `effortRate` — c'est tout l'objet de ce lot : ils ne
 * doivent pas produire un chiffre, quel qu'il soit.
 */
export function formatPaceMmSs(sPerKm: number): string {
  const s = Math.round(sPerKm);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}`;
}

/**
 * La 3ᵉ métrique du bandeau live pour CETTE discipline, à partir de la seule
 * allure mesurée par le tracker.
 */
export function liveRateDisplay(
  activity: Activity,
  paceSPerKm: number,
  decimalSep: string,
): LiveRateDisplay {
  const kind = EFFORT_RATE_KIND[activity];
  const rate = effortRate(activity, paceSPerKm);
  // Rien de mesurable : la case garde sa place et son libellé, jamais un zéro.
  if (rate === null) return { kind, measured: false, value: NO_MEASURE, unit: null };
  return rate.kind === 'speed'
    ? { kind, measured: true, value: formatSpeedKmh(rate.kmh, decimalSep), unit: SPEED_UNIT }
    : // L'unité de l'allure est portée par le libellé (« ALLURE /KM ») : la
      // répéter à côté du chiffre donnerait « 5'28 /KM » sous « ALLURE /KM ».
      { kind, measured: true, value: formatPaceMmSs(rate.sPerKm), unit: null };
}
