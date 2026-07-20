/**
 * GRYD — i18n : catalogue du domaine « nav-tabs ».
 * Onglets (layout tabs), départ glissé (SlideToStart), verbes du bouton
 * d'action contextuel (contextualAction) et ligne mission de la Carte (index).
 *
 * INVARIANTS (jamais traduits, donc PAS ici) : GRYD, GO, Crew (onglet et
 * concept), noms propres (République…), km, min. « RUN » est le verbe produit
 * de la course libre (AMENDEMENT-29) : identique dans les 5 langues, mais
 * gardé en Entry pour la parité et un éventuel arbitrage futur.
 *
 * §A CONTRAIGNANT : les verbes du bouton central et les libellés d'action
 * restent COURTS dans toutes les langues (l'allemand est reformulé concis :
 * SCHÜTZEN, EROBERN, BEENDEN — jamais de mot composé à rallonge).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Onglets (layout tabs) — « Crew » reste invariant, hors catalogue ──
  tabCarte: {
    fr: 'Carte',
    en: 'Map',
    es: 'Mapa',
    de: 'Karte',
    pt: 'Mapa',
  },
  tabMissions: {
    fr: 'Missions',
    en: 'Missions',
    es: 'Misiones',
    de: 'Missionen',
    pt: 'Missões',
  },
  tabSaison: {
    fr: 'Saison',
    en: 'Season',
    es: 'Temporada',
    de: 'Saison',
    pt: 'Temporada',
  },
  tabMoi: {
    fr: 'Moi',
    en: 'Me',
    es: 'Yo',
    de: 'Ich',
    pt: 'Eu',
  },

  // ── SlideToStart — libellé lecteur d'écran du départ glissé ──
  slideToStartA11y: {
    fr: '{label} — glisse pour lancer la course',
    en: '{label} — slide to start the run',
    es: '{label} — desliza para empezar la carrera',
    de: '{label} — schieb, um den Lauf zu starten',
    pt: '{label} — deslize para começar a corrida',
  },

  // ── Verbes du bouton central (contextualAction) — COURTS partout (§A) ──
  actionRun: {
    fr: 'RUN',
    en: 'RUN',
    es: 'RUN',
    de: 'RUN',
    pt: 'RUN',
  },
  actionDefendre: {
    fr: 'DÉFENDRE',
    en: 'DEFEND',
    es: 'DEFIENDE',
    de: 'SCHÜTZEN',
    pt: 'DEFENDER',
  },
  actionConquerir: {
    fr: 'CONQUÉRIR',
    en: 'CONQUER',
    es: 'CONQUISTA',
    de: 'EROBERN',
    pt: 'CONQUISTAR',
  },
  actionTerminer: {
    fr: 'TERMINER',
    en: 'FINISH',
    es: 'TERMINA',
    de: 'BEENDEN',
    pt: 'TERMINAR',
  },
  actionRejoindre: {
    fr: 'REJOINDRE',
    en: 'JOIN',
    es: 'ÚNETE',
    de: 'MITLAUFEN',
    pt: 'ENTRAR',
  },

  // ── Contexte lecteur d'écran des actions (verbe + pourquoi) ──
  a11yRun: {
    fr: 'Lancer une course libre',
    en: 'Start a free run',
    es: 'Inicia una carrera libre',
    de: 'Freien Lauf starten',
    pt: 'Começar uma corrida livre',
  },
  a11yDefendre: {
    fr: 'Défendre {zone} — lancer la course de défense',
    en: 'Defend {zone} — start the defense run',
    es: 'Defiende {zone} — inicia la carrera de defensa',
    de: '{zone} schützen — Verteidigungslauf starten',
    pt: 'Defender {zone} — começar a corrida de defesa',
  },
  a11yConquerir: {
    fr: 'Conquérir {zone} — lancer la course de conquête',
    en: 'Conquer {zone} — start the conquest run',
    es: 'Conquista {zone} — inicia la carrera de conquista',
    de: '{zone} erobern — Eroberungslauf starten',
    pt: 'Conquistar {zone} — começar a corrida de conquista',
  },
  a11yTerminer: {
    fr: 'Terminer {zone} — refermer la boucle du crew',
    en: 'Finish {zone} — close the crew loop',
    es: 'Termina {zone} — cierra el circuito del crew',
    de: '{zone} beenden — die Crew-Runde schließen',
    pt: 'Terminar {zone} — fechar o circuito do crew',
  },
  a11yRejoindre: {
    fr: 'Rejoindre la mission du crew — {mission}',
    en: 'Join the crew mission — {mission}',
    es: 'Únete a la misión del crew — {mission}',
    de: 'Der Crew-Mission beitreten — {mission}',
    pt: 'Entrar na missão do crew — {mission}',
  },

  // ── Désignations de zone injectées dans les a11y ci-dessus ──
  zoneThis: {
    fr: 'cette zone',
    en: 'this zone',
    es: 'esta zona',
    de: 'diese Zone',
    pt: 'esta zona',
  },
  zoneYours: {
    fr: 'ta zone',
    en: 'your zone',
    es: 'tu zona',
    de: 'deine Zone',
    pt: 'sua zona',
  },
  crewMissionFallback: {
    fr: 'mission crew',
    en: 'crew mission',
    es: 'misión del crew',
    de: 'Crew-Mission',
    pt: 'missão do crew',
  },

  // ── Ligne mission de la Carte (index) ──
  zonesOne: {
    fr: '{n} zone',
    en: '{n} zone',
    es: '{n} zona',
    de: '{n} Zone',
    pt: '{n} zona',
  },
  zonesMany: {
    fr: '{n} zones',
    en: '{n} zones',
    es: '{n} zonas',
    de: '{n} Zonen',
    pt: '{n} zonas',
  },
  missionDetailMeta: {
    fr: '{km} · +{pts} pts crew',
    en: '{km} · +{pts} crew pts',
    es: '{km} · +{pts} pts crew',
    de: '{km} · +{pts} Crew-Pkt.',
    pt: '{km} · +{pts} pts crew',
  },
  rivalShare: {
    fr: '{name} · {pct} %',
    en: '{name} · {pct}%',
    es: '{name} · {pct} %',
    de: '{name} · {pct} %',
    pt: '{name} · {pct}%',
  },
  sectorHeadA11y: {
    fr: 'Secteur {sector}, données {freshness}. Rival principal {rival}, {pct} pour cent.',
    en: 'Sector {sector}, data {freshness}. Main rival {rival}, {pct} percent.',
    es: 'Sector {sector}, datos {freshness}. Rival principal {rival}, {pct} por ciento.',
    de: 'Sektor {sector}, Daten {freshness}. Hauptrivale {rival}, {pct} Prozent.',
    pt: 'Setor {sector}, dados {freshness}. Rival principal {rival}, {pct} por cento.',
  },
  missionDetailOpenA11y: {
    fr: 'voir le détail de la mission',
    en: 'view mission details',
    es: 'ver el detalle de la misión',
    de: 'Missionsdetails anzeigen',
    pt: 'ver os detalhes da missão',
  },
  missionDetailCloseA11y: {
    fr: 'fermer le détail de la mission',
    en: 'close mission details',
    es: 'cerrar el detalle de la misión',
    de: 'Missionsdetails schließen',
    pt: 'fechar os detalhes da missão',
  },
  planRoute: {
    fr: 'Planifier un parcours',
    en: 'Plan a route',
    es: 'Planificar una ruta',
    de: 'Route planen',
    pt: 'Planejar uma rota',
  },
  planRouteA11y: {
    fr: "Planifier un parcours — ouvrir le planificateur d'itinéraire",
    en: 'Plan a route — open the route planner',
    es: 'Planificar una ruta — abrir el planificador de rutas',
    de: 'Route planen — den Routenplaner öffnen',
    pt: 'Planejar uma rota — abrir o planejador de rotas',
  },
  // « Où est mon run » (fiabilité 21/07) : le slot pendingUpload rendu VISIBLE.
  pendingRunNote: {
    fr: '1 course à synchroniser — toucher pour envoyer',
    en: '1 run to sync — tap to send',
    es: '1 carrera por sincronizar — toca para enviar',
    de: '1 Lauf zu synchronisieren — tippen zum Senden',
    pt: '1 corrida para sincronizar — toque para enviar',
  },
});
