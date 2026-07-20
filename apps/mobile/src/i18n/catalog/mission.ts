/**
 * GRYD — i18n : catalogue du domaine « mission-first » (ligne mission RÉELLE de
 * la Carte, dérivée de deriveMission.ts : défendre une zone qui decay / agrandir
 * son territoire). Aucun texte de rival ni de menace fabriquée ici — la mission
 * ne consomme QUE mes vraies captures + ma position (règle zéro-mensonge).
 *
 * INVARIANTS (jamais traduits) : GRYD, km, h (heures — unité compacte),
 * noms propres. La parité 5 langues est imposée PAR LE TYPE (Entry).
 *
 * §A CONTRAIGNANT : ces libellés vivent dans la ligne mission compacte (375 px,
 * plancher a11y 12 px) — ils restent COURTS dans les 5 langues et ne se
 * tronquent JAMAIS. L'allemand est reformulé concis (« Zone verteidigen »,
 * « Gebiet erweitern ») plutôt qu'un composé à rallonge.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Défendre une zone dont le decay approche (kind: defend_expiring) ──
  /** Ligne compacte quand la distance est inconnue (pas de fix GPS). */
  missionDefend: {
    fr: 'Défends ta zone · expire dans {h} h',
    en: 'Defend your zone · expires in {h} h',
    es: 'Defiende tu zona · caduca en {h} h',
    de: 'Zone verteidigen · noch {h} h',
    pt: 'Defenda sua zona · expira em {h} h',
  },
  /** Ligne compacte + distance (fix GPS présent) — aussi servie en détail/tap. */
  missionDefendFar: {
    fr: 'Défends ta zone · à {km} · {h} h restantes',
    en: 'Defend your zone · {km} away · {h} h left',
    es: 'Defiende tu zona · a {km} · quedan {h} h',
    de: 'Zone verteidigen · in {km} · noch {h} h',
    pt: 'Defenda sua zona · a {km} · faltam {h} h',
  },

  // ── Agrandir son territoire, rien n'expire (kind: expand) ──
  missionExpand: {
    fr: 'Agrandis ton territoire',
    en: 'Grow your territory',
    es: 'Amplía tu territorio',
    de: 'Gebiet erweitern',
    pt: 'Amplie seu território',
  },
  missionExpandFar: {
    fr: 'Agrandis ton territoire · à {km}',
    en: 'Grow your territory · {km} away',
    es: 'Amplía tu territorio · a {km}',
    de: 'Gebiet erweitern · in {km}',
    pt: 'Amplie seu território · a {km}',
  },

  // ── Entrée vers le Route Planner (détail au tap — jamais un 2ᵉ CTA plein) ──
  missionPlan: {
    fr: 'Planifier ce parcours',
    en: 'Plan this route',
    es: 'Planificar esta ruta',
    de: 'Route planen',
    pt: 'Planejar esta rota',
  },
  missionPlanA11y: {
    fr: 'Planifier ce parcours — ouvrir le planificateur d’itinéraire',
    en: 'Plan this route — open the route planner',
    es: 'Planificar esta ruta — abrir el planificador de rutas',
    de: 'Route planen — den Routenplaner öffnen',
    pt: 'Planejar esta rota — abrir o planejador de rotas',
  },
});
