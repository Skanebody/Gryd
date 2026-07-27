/**
 * GRYD — PREMIUM : le choix des LIBELLÉS, sorti du rendu et donc testable.
 *
 * Deux décisions y vivent, toutes deux faciles à casser en silence dans un JSX :
 *   · quelle entrée de catalogue nomme une période d'offre ;
 *   · quelle FORME (singulier / pluriel) nomme une durée d'essai — « 1 jours »
 *     ou « 7 jour » sur un écran de paiement, dans une app en 5 langues, c'est
 *     le genre de détail que personne ne relit et que tout le monde voit.
 *
 * PUR : ces fonctions rendent des `Entry` (les 5 langues), jamais des chaînes
 * déjà résolues — la langue reste choisie au rendu par `useT`.
 */
import type { Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/premium';
import type { FreeTrial, OfferPeriod } from './offerings';

/** Le nom d'une formule (E74 n'en présente que trois). */
export function offerLabelEntry(period: OfferPeriod): Entry {
  switch (period) {
    case 'lifetime':
      return C.offerLifetime;
    case 'yearly':
      return C.offerYearly;
    case 'monthly':
      return C.offerMonthly;
  }
}

/**
 * La durée d'un essai — forme accordée. Le pluriel se déclenche à `n > 1` :
 * c'est la règle commune aux cinq langues du catalogue pour ces unités (jour /
 * jours, day / days, día / días, Tag / Tage, dia / dias). Le cas `0` n'existe
 * pas ici : `freeTrialOf` refuse déjà une durée nulle.
 */
export function trialUnitEntry(trial: FreeTrial): Entry {
  const plural = trial.units > 1;
  switch (trial.unit) {
    case 'day':
      return plural ? C.trialUnitDays : C.trialUnitDay;
    case 'week':
      return plural ? C.trialUnitWeeks : C.trialUnitWeek;
    case 'month':
      return plural ? C.trialUnitMonths : C.trialUnitMonth;
    case 'year':
      return plural ? C.trialUnitYears : C.trialUnitYear;
  }
}
