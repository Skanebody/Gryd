/**
 * GRYD — adaptateurs montres « Bientôt » (AMENDEMENT-15 §3).
 * Garmin / WHOOP / Polar / Coros / Suunto / Fitbit passent par des programmes
 * PARTENAIRES (comptes développeur à demander, délais — O-points documentés
 * dans DISCOVERY.md). État honnête `coming_soon`, non connectable, avec le
 * message VRAI et rassurant : ces activités arrivent déjà indirectement via
 * Strava ou Apple Health (la quasi-totalité de ces écosystèmes s'y synchronise).
 */
import type { SourceAdapter, SourceAdapterSnapshot } from './types';

/** Message affiché sous chaque montre « Bientôt » — vrai et rassurant. */
export const COMING_SOON_DETAIL = 'Tes courses arrivent déjà via Strava ou Apple Health';

const SNAPSHOT: SourceAdapterSnapshot = {
  status: 'coming_soon',
  lastSync: null,
  detail: COMING_SOON_DETAIL,
};

/** Fabrique un adaptateur « Bientôt » (aucune action possible, état stable). */
export function comingSoonAdapter(id: string): SourceAdapter {
  return {
    id,
    trustLevel: 'medium', // sera réévalué à l'ouverture du programme partenaire
    status: () => Promise.resolve(SNAPSHOT),
    connect: () => Promise.resolve(SNAPSHOT),
    disconnect: () => Promise.resolve(SNAPSHOT),
  };
}
