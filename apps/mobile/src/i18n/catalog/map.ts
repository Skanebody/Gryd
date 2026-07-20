/**
 * GRYD — i18n : catalogue du domaine « map-ui ».
 * Overlays de la Battle Map (BattleMapOverlays.tsx : menu Outils/Calques, peek
 * mission, sheet de zone, blocs Parcours/Équipe/Détails), note de source de la
 * carte (territoryBuild.ts : dataNote) et widget « Mon territoire »
 * (territoryWidget.ts : copie des 8 états).
 *
 * INVARIANTS (jamais traduits) : GRYD, GO, Crew (concept + calque), War Room,
 * km, min, m, pts (sauf de « Pkt. » assumé), H3, noms propres (République…),
 * « runs » (jargon maison identique partout).
 *
 * §A CONTRAIGNANT : chips/CTA/labels COURTS dans les 5 langues — l'allemand est
 * reformulé concis (ABWEHREN, Bald, GRUNDKARTE…), jamais un composé à rallonge
 * qui risquerait la troncature à 375 px.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Calques de lecture (libellés AFFICHÉS — la clé interne ne change pas) ──
  modeTerritoire: {
    fr: 'Territoire',
    en: 'Territory',
    es: 'Territorio',
    de: 'Gebiet',
    pt: 'Território',
  },
  modeRoute: {
    fr: 'Route',
    en: 'Route',
    es: 'Ruta',
    de: 'Route',
    pt: 'Rota',
  },
  modeDefense: {
    fr: 'Défense',
    en: 'Defense',
    es: 'Defensa',
    de: 'Abwehr',
    pt: 'Defesa',
  },
  /** Clé interne `raid` — affichée « Rival » (AMENDEMENT-12 §A). */
  modeRival: {
    fr: 'Rival',
    en: 'Rival',
    es: 'Rival',
    de: 'Rivale',
    pt: 'Rival',
  },
  modeExploration: {
    fr: 'Exploration',
    en: 'Exploration',
    es: 'Exploración',
    de: 'Erkundung',
    pt: 'Exploração',
  },
  /** « Crew » = invariant — présent pour la complétude du Record<MapMode, Entry>. */
  modeCrew: {
    fr: 'Crew',
    en: 'Crew',
    es: 'Crew',
    de: 'Crew',
    pt: 'Crew',
  },

  // ── Fonds de carte (AMENDEMENT-28 — libellés courts non tronqués) ──
  basemapDark: {
    fr: 'Sombre',
    en: 'Dark',
    es: 'Oscuro',
    de: 'Dunkel',
    pt: 'Escuro',
  },
  basemapLight: {
    fr: 'Clair',
    en: 'Light',
    es: 'Claro',
    de: 'Hell',
    pt: 'Claro',
  },
  basemapSatellite: {
    fr: 'Satellite',
    en: 'Satellite',
    es: 'Satélite',
    de: 'Satellit',
    pt: 'Satélite',
  },

  // ── Kickers du menu Calques ──
  headingBasemap: {
    fr: 'FOND',
    en: 'BASEMAP',
    es: 'FONDO',
    de: 'GRUNDKARTE',
    pt: 'FUNDO',
  },
  headingView: {
    fr: 'VUE',
    en: 'VIEW',
    es: 'VISTA',
    de: 'ANSICHT',
    pt: 'VISTA',
  },
  headingLayers: {
    fr: 'CALQUES',
    en: 'LAYERS',
    es: 'CAPAS',
    de: 'EBENEN',
    pt: 'CAMADAS',
  },

  // ── FABs / menu Outils (a11y) ──
  layersFabA11y: {
    fr: 'Calques et fond de carte',
    en: 'Layers and basemap',
    es: 'Capas y fondo de mapa',
    de: 'Ebenen und Grundkarte',
    pt: 'Camadas e fundo do mapa',
  },
  recenterA11y: {
    fr: 'Recentrer sur moi',
    en: 'Recenter on me',
    es: 'Centrar en mí',
    de: 'Auf mich zentrieren',
    pt: 'Centralizar em mim',
  },
  hudShowA11y: {
    fr: 'Afficher les infos de la carte',
    en: 'Show map info',
    es: 'Mostrar la info del mapa',
    de: 'Karten-Infos einblenden',
    pt: 'Mostrar infos do mapa',
  },
  hudHideA11y: {
    fr: 'Masquer les infos — carte plein écran',
    en: 'Hide info — full-screen map',
    es: 'Ocultar la info: mapa a pantalla completa',
    de: 'Infos ausblenden — Karte im Vollbild',
    pt: 'Ocultar infos — mapa em tela cheia',
  },
  toolsOpenA11y: {
    fr: 'Outils de la carte',
    en: 'Map tools',
    es: 'Herramientas del mapa',
    de: 'Karten-Werkzeuge',
    pt: 'Ferramentas do mapa',
  },
  toolsCloseA11y: {
    fr: 'Fermer les outils de la carte',
    en: 'Close map tools',
    es: 'Cerrar las herramientas del mapa',
    de: 'Karten-Werkzeuge schließen',
    pt: 'Fechar as ferramentas do mapa',
  },
  basemapA11y: {
    fr: 'Fond de carte {label}',
    en: 'Basemap {label}',
    es: 'Fondo de mapa {label}',
    de: 'Grundkarte {label}',
    pt: 'Fundo de mapa {label}',
  },
  layerA11y: {
    fr: 'Calque {label}',
    en: 'Layer {label}',
    es: 'Capa {label}',
    de: 'Ebene {label}',
    pt: 'Camada {label}',
  },

  // ── Peek MISSION (§8/§6.3) ──
  underPressure: {
    fr: '{zone} sous pression',
    en: '{zone} under pressure',
    es: '{zone} bajo presión',
    de: '{zone} unter Druck',
    pt: '{zone} sob pressão',
  },
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
  optionsA11y: {
    fr: 'Voir les options — parcours, équipe et détails',
    en: 'See options — routes, team and details',
    es: 'Ver opciones: rutas, equipo y detalles',
    de: 'Optionen ansehen — Routen, Team und Details',
    pt: 'Ver opções — rotas, equipe e detalhes',
  },

  // ── État OUVERT du peek mission : Situation / Parcours / Équipe / Détails ──
  yourCrewPct: {
    fr: 'Ton crew {pct} %',
    en: 'Your crew {pct}%',
    es: 'Tu crew {pct} %',
    de: 'Dein Crew {pct} %',
    pt: 'Seu crew {pct} %',
  },
  plusPts: {
    fr: '+{n} pts',
    en: '+{n} pts',
    es: '+{n} pts',
    de: '+{n} Pkt.',
    pt: '+{n} pts',
  },
  sectionRoutes: {
    fr: 'PARCOURS',
    en: 'ROUTES',
    es: 'RUTAS',
    de: 'ROUTEN',
    pt: 'ROTAS',
  },
  routeA11y: {
    fr: 'Parcours {name}, {km}',
    en: 'Route {name}, {km}',
    es: 'Ruta {name}, {km}',
    de: 'Route {name}, {km}',
    pt: 'Rota {name}, {km}',
  },
  onMapTag: {
    fr: 'SUR LA CARTE',
    en: 'ON THE MAP',
    es: 'EN EL MAPA',
    de: 'AUF DER KARTE',
    pt: 'NO MAPA',
  },
  sectionTeam: {
    fr: 'ÉQUIPE',
    en: 'TEAM',
    es: 'EQUIPO',
    de: 'TEAM',
    pt: 'EQUIPE',
  },
  alliesNearby: {
    fr: '{n} alliés proches',
    en: '{n} allies nearby',
    es: '{n} aliados cerca',
    de: '{n} Verbündete nah',
    pt: '{n} aliados por perto',
  },
  soonBadge: {
    fr: 'Bientôt',
    en: 'Soon',
    es: 'Pronto',
    de: 'Bald',
    pt: 'Em breve',
  },
  soonA11y: {
    fr: 'Courir ensemble avec les alliés proches : bientôt disponible',
    en: 'Run together with nearby allies: coming soon',
    es: 'Correr junto a los aliados cercanos: muy pronto',
    de: 'Gemeinsam mit Verbündeten laufen: bald verfügbar',
    pt: 'Correr junto com aliados próximos: em breve',
  },
  sectionDetails: {
    fr: 'DÉTAILS',
    en: 'DETAILS',
    es: 'DETALLES',
    de: 'DETAILS',
    pt: 'DETALHES',
  },
  missionA11y: {
    fr: 'Mission {label} — ouvrir la War Room',
    en: 'Mission {label} — open the War Room',
    es: 'Misión {label}: abrir la War Room',
    de: 'Mission {label} — War Room öffnen',
    pt: 'Missão {label} — abrir a War Room',
  },
  missionOfDay: {
    fr: '{progress}/{target} · mission du jour',
    en: '{progress}/{target} · daily mission',
    es: '{progress}/{target} · misión del día',
    de: '{progress}/{target} · Tagesmission',
    pt: '{progress}/{target} · missão do dia',
  },
  historyA11y: {
    fr: 'Historique de mes courses',
    en: 'My run history',
    es: 'Historial de mis carreras',
    de: 'Verlauf meiner Läufe',
    pt: 'Histórico das minhas corridas',
  },
  myHistory: {
    fr: 'Mon historique',
    en: 'My history',
    es: 'Mi historial',
    de: 'Mein Verlauf',
    pt: 'Meu histórico',
  },
  pastRuns: {
    fr: 'Tes courses passées',
    en: 'Your past runs',
    es: 'Tus carreras pasadas',
    de: 'Deine bisherigen Läufe',
    pt: 'Suas corridas passadas',
  },

  // ── Sheet de ZONE (§3/§10 — 1er niveau) ──
  heldBy: {
    fr: 'Détenu par {name}',
    en: 'Held by {name}',
    es: 'En manos de {name}',
    de: 'Gehalten von {name}',
    pt: 'Nas mãos de {name}',
  },
  closeLabel: {
    fr: 'Fermer',
    en: 'Close',
    es: 'Cerrar',
    de: 'Schließen',
    pt: 'Fechar',
  },
  closeZoneA11y: {
    fr: 'Fermer la zone — revenir à la carte',
    en: 'Close the zone — back to the map',
    es: 'Cerrar la zona: volver al mapa',
    de: 'Zone schließen — zurück zur Karte',
    pt: 'Fechar a zona — voltar ao mapa',
  },
  controlPct: {
    fr: 'Contrôle {pct} %',
    en: 'Control {pct}%',
    es: 'Control {pct} %',
    de: 'Kontrolle {pct} %',
    pt: 'Controle {pct} %',
  },
  moreLabel: {
    fr: 'Plus',
    en: 'More',
    es: 'Más',
    de: 'Mehr',
    pt: 'Mais',
  },
  moreA11y: {
    fr: 'Plus — détail de la zone : surface, tenue, pression et activité',
    en: 'More — zone details: area, hold, pressure and activity',
    es: 'Más: detalle de la zona (superficie, control, presión y actividad)',
    de: 'Mehr — Zonen-Detail: Fläche, Halten, Druck und Aktivität',
    pt: 'Mais — detalhes da zona: área, posse, pressão e atividade',
  },

  // ── Détail de zone (état OUVERT « Plus ») ──
  heldSinceArea: {
    fr: 'Tenue {held} · {area}',
    en: 'Held {held} · {area}',
    es: 'Mantenida {held} · {area}',
    de: 'Gehalten {held} · {area}',
    pt: 'Mantida {held} · {area}',
  },
  defendedAgo: {
    fr: 'Défendue {ago}',
    en: 'Defended {ago}',
    es: 'Defendida {ago}',
    de: 'Verteidigt {ago}',
    pt: 'Defendida {ago}',
  },
  sectionPressure: {
    fr: 'PRESSION',
    en: 'PRESSURE',
    es: 'PRESIÓN',
    de: 'DRUCK',
    pt: 'PRESSÃO',
  },
  pressureLine: {
    fr: '{rival} {rivalPct} % · Neutre {neutralPct} %',
    en: '{rival} {rivalPct}% · Neutral {neutralPct}%',
    es: '{rival} {rivalPct} % · Neutral {neutralPct} %',
    de: '{rival} {rivalPct} % · Neutral {neutralPct} %',
    pt: '{rival} {rivalPct} % · Neutro {neutralPct} %',
  },
  sectionActivity: {
    fr: 'ACTIVITÉ 24 H',
    en: '24 H ACTIVITY',
    es: 'ACTIVIDAD 24 H',
    de: 'AKTIVITÄT 24 H',
    pt: 'ATIVIDADE 24 H',
  },
  /** « runs » = jargon maison (invariant) ; alliés/rivaux se traduisent. */
  activityLine: {
    fr: '{runs} runs · {allies} alliés · {rivals} rivaux',
    en: '{runs} runs · {allies} allies · {rivals} rivals',
    es: '{runs} runs · {allies} aliados · {rivals} rivales',
    de: '{runs} Runs · {allies} Verbündete · {rivals} Rivalen',
    pt: '{runs} runs · {allies} aliados · {rivals} rivais',
  },
  historyLinkA11y: {
    fr: "Voir l'historique",
    en: 'See history',
    es: 'Ver el historial',
    de: 'Verlauf ansehen',
    pt: 'Ver o histórico',
  },
  zoneHistoryTitle: {
    fr: 'Historique de la zone',
    en: 'Zone history',
    es: 'Historial de la zona',
    de: 'Verlauf der Zone',
    pt: 'Histórico da zona',
  },
  zoneHistoryMeta: {
    fr: 'Conquêtes et défenses passées',
    en: 'Past conquests and defenses',
    es: 'Conquistas y defensas pasadas',
    de: 'Frühere Eroberungen und Abwehr',
    pt: 'Conquistas e defesas passadas',
  },

  // ── Note de SOURCE de la carte (territoryBuild.dataNote — 3 cas distincts) ──
  dataNoteFailed: {
    fr: 'Territoires non chargés',
    en: 'Territories didn’t load',
    es: 'Territorios no cargados',
    de: 'Gebiete nicht geladen',
    pt: 'Territórios não carregados',
  },
  dataNoteDemo: {
    fr: 'Territoires de démonstration',
    en: 'Demo territories',
    es: 'Territorios de demostración',
    de: 'Demo-Gebiete',
    pt: 'Territórios de demonstração',
  },
  dataNoteEmpty: {
    fr: 'Cours pour prendre ta première zone',
    en: 'Run to take your first zone',
    es: 'Corre y toma tu primera zona',
    de: 'Lauf los, hol dir deine erste Zone',
    pt: 'Corra para tomar sua primeira zona',
  },

  // ── Widget « Mon territoire » (8 états — territoryWidget.ts) ──
  /** Nom de zone neutre quand aucun secteur réel n'est câblé (jamais inventé). */
  zoneFallback: {
    fr: 'Zone',
    en: 'Zone',
    es: 'Zona',
    de: 'Zone',
    pt: 'Zona',
  },
  wFirstTitle: {
    fr: 'PRENDS TA PREMIÈRE ZONE',
    en: 'TAKE YOUR FIRST ZONE',
    es: 'TOMA TU PRIMERA ZONA',
    de: 'HOL DIR DEINE ERSTE ZONE',
    pt: 'TOME SUA PRIMEIRA ZONA',
  },
  wFirstLine: {
    fr: 'Ferme une boucle près de toi.',
    en: 'Close a loop near you.',
    es: 'Cierra un bucle cerca de ti.',
    de: 'Schließ eine Schleife in deiner Nähe.',
    pt: 'Feche um loop perto de você.',
  },
  /** {km} arrive déjà formaté (« 3,2 km »). */
  wKmEstimated: {
    fr: '{km} estimés',
    en: '{km} estimated',
    es: '{km} estimados',
    de: '{km} geschätzt',
    pt: '{km} estimados',
  },
  /** {rival} et {zone} arrivent déjà en MAJUSCULES. */
  wLostTitleRival: {
    fr: '{rival} A REPRIS {zone}',
    en: '{rival} TOOK BACK {zone}',
    es: '{rival} RECUPERÓ {zone}',
    de: '{rival} HAT {zone} ZURÜCK',
    pt: '{rival} RETOMOU {zone}',
  },
  wLostTitle: {
    fr: '{zone} A ÉTÉ REPRISE',
    en: '{zone} WAS RETAKEN',
    es: '{zone} FUE RECUPERADA',
    de: '{zone} WURDE ZURÜCKGEHOLT',
    pt: '{zone} FOI RETOMADA',
  },
  wLostAgo: {
    fr: 'Perdue il y a {min} min',
    en: 'Lost {min} min ago',
    es: 'Perdida hace {min} min',
    de: 'Vor {min} min verloren',
    pt: 'Perdida há {min} min',
  },
  wLostCta: {
    fr: 'LA REPRENDRE',
    en: 'TAKE IT BACK',
    es: 'RECUPERARLA',
    de: 'ZURÜCKHOLEN',
    pt: 'RETOMAR',
  },
  /** {zone} arrive déjà en MAJUSCULES. */
  wAttackTitle: {
    fr: '{zone} SOUS PRESSION',
    en: '{zone} UNDER PRESSURE',
    es: '{zone} BAJO PRESIÓN',
    de: '{zone} UNTER DRUCK',
    pt: '{zone} SOB PRESSÃO',
  },
  /** {area} arrive déjà formaté (« 0,14 km² »). */
  wAttackThreatened: {
    fr: '{area} menacés',
    en: '{area} at risk',
    es: '{area} en riesgo',
    de: '{area} bedroht',
    pt: '{area} ameaçados',
  },
  wAttackContested: {
    fr: 'Ta zone est contestée.',
    en: 'Your zone is contested.',
    es: 'Tu zona está disputada.',
    de: 'Deine Zone ist umkämpft.',
    pt: 'Sua zona está disputada.',
  },
  wAttackKmToDefend: {
    fr: '{km} pour défendre',
    en: '{km} to defend',
    es: '{km} para defender',
    de: '{km} zum Verteidigen',
    pt: '{km} para defender',
  },
  wAttackCta: {
    fr: 'DÉFENDRE',
    en: 'DEFEND',
    es: 'DEFENDER',
    de: 'ABWEHREN',
    pt: 'DEFENDER',
  },
  wLoopTitle: {
    fr: 'BOUCLE PRESQUE FERMÉE',
    en: 'LOOP ALMOST CLOSED',
    es: 'BUCLE CASI CERRADO',
    de: 'SCHLEIFE FAST ZU',
    pt: 'LOOP QUASE FECHADO',
  },
  wLoopMissing: {
    fr: 'Il manque {m} m à {zone}.',
    en: '{zone} needs {m} m more.',
    es: 'Faltan {m} m para {zone}.',
    de: 'Noch {m} m bis {zone}.',
    pt: 'Faltam {m} m para {zone}.',
  },
  wLoopMissingFew: {
    fr: 'Il manque quelques mètres à {zone}.',
    en: '{zone} needs a few more meters.',
    es: 'Faltan unos metros para {zone}.',
    de: 'Noch ein paar Meter bis {zone}.',
    pt: 'Faltam alguns metros para {zone}.',
  },
  wLoopCta: {
    fr: 'TERMINER',
    en: 'FINISH',
    es: 'TERMINAR',
    de: 'BEENDEN',
    pt: 'TERMINAR',
  },
  wCrewTitle: {
    fr: 'TON CREW A BESOIN DE TOI',
    en: 'YOUR CREW NEEDS YOU',
    es: 'TU CREW TE NECESITA',
    de: 'DEIN CREW BRAUCHT DICH',
    pt: 'SEU CREW PRECISA DE VOCÊ',
  },
  wCrewMissing: {
    fr: 'Il manque {m} m pour fermer {zone}.',
    en: '{m} m left to close {zone}.',
    es: 'Faltan {m} m para cerrar {zone}.',
    de: 'Noch {m} m, um {zone} zu schließen.',
    pt: 'Faltam {m} m para fechar {zone}.',
  },
  wCrewHelp: {
    fr: 'Aide ton crew à fermer {zone}.',
    en: 'Help your crew close {zone}.',
    es: 'Ayuda a tu crew a cerrar {zone}.',
    de: 'Hilf deinem Crew, {zone} zu schließen.',
    pt: 'Ajude seu crew a fechar {zone}.',
  },
  wCrewCta: {
    fr: 'AIDER',
    en: 'HELP',
    es: 'AYUDAR',
    de: 'HELFEN',
    pt: 'AJUDAR',
  },
  /** {zone} arrive déjà en MAJUSCULES. */
  wShareTitle: {
    fr: '{zone} EST À TOI',
    en: '{zone} IS YOURS',
    es: '{zone} ES TUYA',
    de: '{zone} GEHÖRT DIR',
    pt: '{zone} É SUA',
  },
  wShareCapturedAgo: {
    fr: 'Capturée il y a {min} min',
    en: 'Captured {min} min ago',
    es: 'Capturada hace {min} min',
    de: 'Vor {min} min erobert',
    pt: 'Capturada há {min} min',
  },
  wShareCta: {
    fr: 'PARTAGER',
    en: 'SHARE',
    es: 'COMPARTIR',
    de: 'TEILEN',
    pt: 'COMPARTILHAR',
  },
  wRankTitle: {
    fr: 'PLUS QU’UNE PLACE',
    en: 'ONE SPOT TO GO',
    es: 'A UN PUESTO',
    de: 'NOCH EIN PLATZ',
    pt: 'FALTA UMA POSIÇÃO',
  },
  /** {area} arrive déjà formaté (« 0,14 km² »). */
  wRankToPass: {
    fr: '{area} pour passer #{rank}',
    en: '{area} to reach #{rank}',
    es: '{area} para ser #{rank}',
    de: '{area} bis #{rank}',
    pt: '{area} para virar #{rank}',
  },
  wRankCta: {
    fr: 'CONQUÉRIR',
    en: 'CONQUER',
    es: 'CONQUISTAR',
    de: 'EROBERN',
    pt: 'CONQUISTAR',
  },
  wStableTitle: {
    fr: 'TON TERRITOIRE TIENT',
    en: 'YOUR TERRITORY HOLDS',
    es: 'TU TERRITORIO AGUANTA',
    de: 'DEIN GEBIET HÄLT',
    pt: 'SEU TERRITÓRIO RESISTE',
  },
  wStableCta: {
    fr: 'VOIR LA CARTE',
    en: 'SEE THE MAP',
    es: 'VER EL MAPA',
    de: 'KARTE ANSEHEN',
    pt: 'VER O MAPA',
  },
});
