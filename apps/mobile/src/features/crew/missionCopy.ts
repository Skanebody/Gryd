/**
 * GRYD — LA MISSION DU CREW, DITE EN MOTS. Source UNIQUE de la copie de mission,
 * partagée par la card « NOTRE PRIORITÉ » du QG (E43, `RealCrewScreen`) et par
 * l'écran dédié E45 (`app/crew-mission.tsx`).
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * Ces deux fonctions vivaient dans `RealCrewScreen`. L'écran E45 en avait besoin
 * mot pour mot : les recopier aurait créé DEUX phrases pour la même mission, qui
 * divergent au premier correctif appliqué d'un seul côté — le joueur lirait
 * « dans 5 h » sur un écran et « dans 6 h » sur l'autre pour la même échéance.
 * Une seule vérité, un seul arrondi, un seul fichier.
 *
 * ═══ CE QUE CE MODULE NE FAIT PAS ═══════════════════════════════════════════
 * Il ne DÉCIDE rien : `chooseCrewMission` (moteur pur, engine/crewMission.ts)
 * reste le seul juge de la mission. Ici on ne fait que traduire des faits déjà
 * dérivés — aucun chiffre ajouté, aucune urgence ajoutée, aucun nom de lieu
 * inventé. Le crew adverse n'est JAMAIS nommé : la doctrine bannit les rivaux
 * fabriqués, et exposer un vrai crew ici en ferait une cible.
 */
import type { IconName } from '@klaim/shared';
import { C } from '../../i18n/catalog/crew';
import type { Entry } from '../../i18n/types';
import type { CrewMission } from './engine/crewMission';

/** Une phrase à traduire, avec ses variables. */
export interface MissionLine {
  entry: Entry;
  vars?: Record<string, string | number>;
}

/**
 * Copie d'une mission : un TITRE (ce qu'on fait) + le MANQUE concret (combien,
 * dans combien de temps), ou une NOTE quand il n'y a pas de mission.
 */
export type MissionCopy = { title: MissionLine; gap: MissionLine } | { note: Entry } | null;

/**
 * MISSION → copie affichable (A-43 §0 maillon 3, format doctrine : une phrase +
 * le manque CONCRET + une action).
 *
 * Les délais sont recalculés depuis les VRAIES échéances de la base et arrondis
 * VERS LE BAS (« dans 5 h » quand il reste 5 h 50 : sous-estimer une marge est
 * honnête, la sur-estimer ment) ; sous une heure, on le dit en toutes lettres
 * plutôt que d'afficher « 0 h ».
 */
export function missionCopy(m: CrewMission, nowMs: number): MissionCopy {
  const H = 3_600_000;
  switch (m.kind) {
    case 'defend': {
      const hours = Math.floor(Math.max(0, m.deadlineAt - nowMs) / H);
      const soon = hours < 1;
      return {
        title: m.sectorName
          ? { entry: C.cmDefendNamed, vars: { sector: m.sectorName } }
          : { entry: C.cmDefend },
        gap: {
          entry: m.zones === 1
            ? (soon ? C.cmDefendGapSoonOne : C.cmDefendGapOne)
            : (soon ? C.cmDefendGapSoonN : C.cmDefendGapN),
          vars: { n: m.zones, h: hours },
        },
      };
    }
    case 'reclaim': {
      const hours = Math.floor(Math.max(0, nowMs - m.lastLostAt) / H);
      // Au-delà d'un jour, « il y a 53 h » ne parle à personne.
      const useDays = hours >= 24;
      const days = Math.floor(hours / 24);
      return {
        title: m.sectorName
          ? { entry: C.cmReclaimNamed, vars: { sector: m.sectorName } }
          : { entry: C.cmReclaim },
        gap: {
          entry: m.zones === 1
            ? (useDays ? C.cmReclaimGapOneD : C.cmReclaimGapOneH)
            : (useDays ? C.cmReclaimGapND : C.cmReclaimGapNH),
          vars: { n: m.zones, h: hours, d: days },
        },
      };
    }
    case 'close_loop':
      return {
        title: m.name
          ? { entry: C.cmLoopNamed, vars: { name: m.name } }
          : { entry: C.cmLoop },
        // Mètres arrondis au plus PROCHE : c'est une distance mesurée, pas une
        // marge de sécurité — et jamais en dessous de 1 m tant qu'il en reste.
        gap: { entry: C.cmLoopGap, vars: { m: Math.max(1, Math.round(m.missingM)) } },
      };
    case 'capture':
      return {
        title: m.sectorName
          ? { entry: C.cmCaptureNamed, vars: { sector: m.sectorName } }
          : { entry: C.cmCapture },
        // Plus de {n} : freeZones est une borne supérieure (eau, bâti, privé
        // inclus), l'annoncer comme un compte serait une promesse fausse.
        gap: { entry: C.cmCaptureGap },
      };
    case 'none':
      return { note: m.reason === 'no_data' ? C.cmNoneNoData : C.cmNoneStable };
    default:
      return null;
  }
}

/**
 * PASTILLE D'ÉTAT de la mission — elle REMPLACE la mini-carte de secteur des
 * planches. Aucune géométrie de secteur ne descend jusqu'au client (0015 garde
 * `segments`/`opener_ring` côté serveur ; `missionSectors` ne porte qu'un nom et
 * des compteurs) : une vignette carto ne montrerait qu'un fond générique, donc
 * un décor qui ferait croire à une localisation. Une icône de NATURE de mission
 * dit la même chose sans rien affirmer sur un lieu.
 */
export function missionIcon(kind: CrewMission['kind']): IconName {
  switch (kind) {
    case 'defend':
      return 'bouclier';
    case 'reclaim':
      return 'cible';
    case 'close_loop':
      return 'boucle_fermee';
    default:
      return 'conquete';
  }
}
