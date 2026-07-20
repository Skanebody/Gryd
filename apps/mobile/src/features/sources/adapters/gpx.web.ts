/**
 * GRYD — variante WEB de l'adaptateur « Import GPX » (aperçu navigateur).
 * Metro résout `.web.ts` avant `.ts` : la version native (gpx.ts) charge
 * expo-document-picker / expo-file-system / lib/supabase, volontairement tenus
 * HORS du bundle web (même pattern que strava.web.ts, auth.web.ts).
 *
 * État HONNÊTE : l'import existe, mais il vit sur le téléphone (l'aperçu web n'a
 * ni sélecteur de fichier natif ni session réelle). On ne simule RIEN ici — pas
 * de faux « importé », pas d'échantillon rejoué. Même API que gpx.ts.
 */
import { C } from '../../../i18n/catalog/auth';
import type { SourceAdapter, SourceAdapterSnapshot } from './types';

const APP_ONLY: SourceAdapterSnapshot = {
  status: 'app_only',
  lastSync: null,
  detailEntry: C.gpxAppOnly,
};

export const gpxAdapter: SourceAdapter = {
  id: 'gpx',
  trustLevel: 'high', // le fichier .gpx est la source directe (catalog §6)
  status: () => Promise.resolve(APP_ONLY),
  connect: () => Promise.resolve(APP_ONLY),
  disconnect: () => Promise.resolve(APP_ONLY),
};
