/**
 * GRYD — CE QUE LA SORTIE DIT AU KILOMÈTRE (LOT R, 11/09/2026).
 *
 * ─── POURQUOI CE MODULE, ET PAS UN `say('Kilomètre ' + n)` ──────────────────
 * `say()` prend une `Entry` du catalogue, jamais une `string` : c'est L18 rendue
 * STRUCTURELLE (écrire du texte en dur y est une erreur de type, pas une revue
 * de code à faire). Une annonce chiffrée a pourtant besoin de nombres. La sortie
 * est de FABRIQUER une `Entry` à partir d'entrées du catalogue et de valeurs
 * calculées : le texte reste au catalogue dans ses cinq langues, le code
 * n'apporte que des nombres.
 *
 * ─── L'ALLURE SE DIT, ELLE NE S'ÉPELLE PAS ──────────────────────────────────
 * L'écran affiche « 5'28 ». Une synthèse vocale lirait ça « cinq apostrophe
 * vingt-huit ». On dit donc « 5 minutes 28 par kilomètre » — et « 24,4
 * kilomètres heure » au cycliste, parce que la voix suit la MÊME grandeur que
 * le bandeau (`effortRate`) : entendre une allure après avoir lu une vitesse
 * ferait douter des deux.
 *
 * ─── ET ON N'ANNONCE JAMAIS UN KILOMÈTRE QU'ON N'A PAS MESURÉ ───────────────
 * `kmAnnouncement2026` rend `null` quand l'allure du split n'est pas
 * exploitable. Mieux vaut se taire que dire un chiffre faux dans l'oreille de
 * quelqu'un qui court : il ne peut ni le vérifier ni le relire.
 *
 * PUR : aucun accès capteur, aucun stockage, aucune horloge. Le séparateur
 * décimal entre par paramètre (même contrat que `effortRate`/`liveRate`).
 */
import type { Activity } from '@klaim/shared';
import { C } from '../../../i18n/catalog/courseLive';
import { LOCALES, format, type Entry } from '../../../i18n/types';
import { effortRate, formatSpeedKmh } from '../effortRate';

/** Secondes par minute — unité, pas une règle de jeu. */
const S_PER_MIN = 60;

/**
 * Interpole une entrée du catalogue DANS LES CINQ LANGUES et rend une nouvelle
 * `Entry`. C'est le pont entre « le texte vit au catalogue » et « la voix dit un
 * nombre » : la phrase reste traduite, les valeurs viennent du code.
 *
 * Les cinq langues sont remplies d'un coup parce que `say()` choisit la sienne
 * AU MOMENT DE PARLER (`getLocale()`) : préparer la seule langue courante
 * ferait parler l'ancienne après une bascule de langue en pleine course.
 */
export function interpolatedEntry2026(
  entry: Entry,
  vars: Readonly<Record<string, string | number>>,
): Entry {
  const out = {} as Record<(typeof LOCALES)[number], string>;
  for (const locale of LOCALES) out[locale] = format(entry, vars, locale);
  return out;
}

/**
 * La GRANDEUR de l'effort, dite en toutes lettres pour cette discipline.
 * `null` quand l'allure n'est pas mesurable — l'annonce se tait alors.
 */
export function spokenRate2026(
  activity: Activity,
  paceSPerKm: number,
  decimalSep: string,
): Entry | null {
  const rate = effortRate(activity, paceSPerKm);
  if (rate === null) return null;
  if (rate.kind === 'speed') {
    return interpolatedEntry2026(C.voiceSpeedSpoken, {
      kmh: formatSpeedKmh(rate.kmh, decimalSep),
    });
  }
  const total = Math.round(rate.sPerKm);
  return interpolatedEntry2026(C.voicePaceSpoken, {
    min: Math.floor(total / S_PER_MIN),
    // Deux chiffres : « 5 minutes 8 » se lit mal, « 5 minutes 08 » se lit juste.
    sec: String(total % S_PER_MIN).padStart(2, '0'),
  });
}

/**
 * L'annonce du kilomètre `km`, ou `null` s'il n'y a rien d'honnête à dire.
 *
 * `paceSPerKm` est celle DU SPLIT (pas la moyenne de la sortie) : c'est ce qui
 * fait de l'annonce une information et pas une répétition. Elle vient de
 * `splitsFrom`, donc du même calcul que la liste affichée juste au-dessus et
 * que le détail relu le soir.
 */
export function kmAnnouncement2026(
  activity: Activity,
  km: number,
  paceSPerKm: number,
  decimalSep: string,
): Entry | null {
  if (!Number.isFinite(km) || km < 1) return null;
  const rate = spokenRate2026(activity, paceSPerKm, decimalSep);
  if (rate === null) return null;
  const out = {} as Record<(typeof LOCALES)[number], string>;
  for (const locale of LOCALES) {
    out[locale] = format(C.voiceKmSplit, { km: Math.round(km), rate: rate[locale] }, locale);
  }
  return out;
}
