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

  // ── FABs / menu Calques (a11y) ──
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
  /** Libellé AFFICHÉ de la rangée « Carte nue » du menu Calques (option
   *  d'affichage — masque tout le HUD). Court dans les 5 langues (§A, jamais
   *  tronqué à 375 px), l'état actif porte le sens « bare mode ON ». */
  hudRowLabel: {
    fr: 'Carte nue',
    en: 'Clean map',
    es: 'Mapa limpio',
    de: 'Nur Karte',
    pt: 'Mapa limpo',
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
  // ═══════════════════════════════════════════════════════════════════════════
  // LIEN « MON HISTORIQUE » DU PEEK MISSION — NEUTRALISÉ, PAS TWINÉ (26/07/2026)
  //
  // LE DÉFAUT. Ces deux textes étaient rendus SANS CONDITION par
  // `BattleMapOverlays`, un fichier qui reçoit `activity` en prop et commute
  // déjà dessus quatre-vingts lignes plus bas (`emptyBikeTitle`). Un cycliste
  // dépliait donc sa sheet et lisait « Tes courses passées » — et son lecteur
  // d'écran annonçait « Historique de mes courses ».
  //
  // POURQUOI PAS UN JUMEAU, ICI. La règle du projet est « écran qui porte la
  // lentille ⇒ jumeau ». Elle ne s'applique pas à CE lien, pour une raison de
  // fait et non de style : il ne décrit pas la carte, il décrit L'ÉCRAN OÙ IL
  // MÈNE. Or `/historique` a sa PROPRE lentille, mémorisée sous sa propre clé
  // (`gryd.activity.historique`, `ui/activityLens.ts`) et lue par
  // `useActivityLens('historique')` — la préférence de la Carte n'y voyage pas,
  // et ce lien ne transmet aucun paramètre. Écrire « Tes sorties vélo passées »
  // promettrait donc un filtrage que la destination n'applique pas forcément :
  // on remplacerait un mensonge par un autre, mieux habillé.
  // Le seul texte VRAI dans les deux mondes est celui qui ne nomme aucun effort.
  // Verrouillé par `catalog/map.test.ts` — dans les deux sens : il tombe si la
  // course revient, et il tombe si quelqu'un fabrique un jumeau de réflexe.
  // ═══════════════════════════════════════════════════════════════════════════
  historyA11y: {
    fr: 'Historique de mes sorties',
    en: 'My outing history',
    es: 'Historial de mis salidas',
    de: 'Verlauf meiner Aktivitäten',
    pt: 'Histórico das minhas atividades',
  },
  myHistory: {
    fr: 'Mon historique',
    en: 'My history',
    es: 'Mi historial',
    de: 'Mein Verlauf',
    pt: 'Meu histórico',
  },
  /** Clé historiquement nommée `pastRuns` — son texte, lui, ne l'est plus. */
  pastRuns: {
    fr: 'Tes sorties passées',
    en: 'Your past outings',
    es: 'Tus salidas pasadas',
    de: 'Deine bisherigen Aktivitäten',
    pt: 'Suas atividades passadas',
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

  // ── SECTEURS §C (sector_snapshot) : badges de statut + note d'échec ─────────
  /**
   * Badges de statut de secteur, niveaux ≥ contesté (§C). Le français est
   * IDENTIQUE au wording de spec `SECTOR_BADGE_LABELS` (allTerritories) — ce
   * sont les mêmes trois étiquettes, ici traduites. Courtes dans les 5 langues :
   * un badge de carte ne se tronque jamais (§A9).
   * Les niveaux `stable` et `pression` n'ont PAS de badge (§C) : rien à traduire.
   */
  sectorBadgeContested: {
    fr: 'Zone contestée',
    en: 'Contested zone',
    es: 'Zona disputada',
    de: 'Umkämpfte Zone',
    pt: 'Zona disputada',
  },
  sectorBadgeAttack: {
    fr: 'Attaque en cours',
    en: 'Under attack',
    es: 'Bajo ataque',
    de: 'Unter Angriff',
    pt: 'Sob ataque',
  },
  sectorBadgeUrgent: {
    fr: 'À sauver',
    en: 'Save it',
    es: 'Por salvar',
    de: 'Zu retten',
    pt: 'A salvar',
  },
  /**
   * ÉCHEC de lecture des secteurs — distinct de « aucun secteur ». Un secteur
   * non chargé n'est pas un secteur neutre : se taire laisserait croire que
   * personne ne tient rien. Dernière priorité de la pill de bas de carte (§A :
   * une seule phrase) — elle ne parle que si la localisation et les territoires
   * n'ont rien à dire.
   */
  sectorNoteFailed: {
    fr: 'Secteurs non chargés',
    en: 'Sectors didn’t load',
    es: 'Sectores no cargados',
    de: 'Sektoren nicht geladen',
    pt: 'Setores não carregados',
  },

  // ── Note de SOURCE de la carte (territoryBuild.dataNote — 3 cas distincts) ──
  dataNoteFailed: {
    fr: 'Territoires non chargés',
    en: 'Territories didn’t load',
    es: 'Territorios no cargados',
    de: 'Gebiete nicht geladen',
    pt: 'Territórios não carregados',
  },
  // `dataNoteDemo` (« Territoires de démonstration ») a été SUPPRIMÉ le
  // 21/07/2026 : aucune surface ne peint plus de démo, donc plus rien à
  // étiqueter. Décision fondateur : « le bandeau n'y change rien, c'est un run
  // fabriqué à la place du sien » — l'étiquette ne rachetait pas la donnée.
  dataNoteEmpty: {
    fr: 'Cours pour prendre ta première zone',
    en: 'Run to take your first zone',
    es: 'Corre y toma tu primera zona',
    de: 'Lauf los, hol dir deine erste Zone',
    pt: 'Corra para tomar sua primeira zona',
  },
  /**
   * LE MÊME FAIT, SOUS LA LENTILLE VÉLO (26/07/2026). Ce n'est pas une
   * traduction de politesse : la note ci-dessus dit « COURS », un verbe qui
   * décrit un autre effort que celui du joueur qui regarde sa carte vélo. La
   * servir telle quelle sous une étiquette vélo serait une instruction fausse —
   * et le joueur qui la suivrait capturerait dans l'autre monde.
   */
  dataNoteEmptyBike: {
    fr: 'Roule pour prendre ta première zone',
    en: 'Ride to take your first zone',
    es: 'Rueda y toma tu primera zona',
    de: 'Fahr los, hol dir deine erste Zone',
    pt: 'Pedale para tomar sua primeira zona',
  },

  /**
   * Natif sans compte : on ne peint AUCUNE démo, donc « démonstration » serait
   * faux — le vrai état est « pas connecté ». Était une string FRANÇAISE EN DUR
   * dans le JSX (relevé par la vérification adversariale) : un joueur en
   * de/es/pt/en lisait du français.
   */
  dataNoteSignedOut: {
    fr: 'Connecte-toi pour capturer',
    en: 'Sign in to capture',
    es: 'Inicia sesión para capturar',
    de: 'Melde dich an zum Erobern',
    pt: 'Entre para capturar',
  },
  /**
   * REFUS EXPLICITE. Le joueur a dit non — la porte se rouvre par les RÉGLAGES
   * système, pas par un tap dans l'app : d'où « Active la localisation », qui
   * désigne le bon endroit. Sans ce message la carte restait sur le globe
   * entier, sans point « moi » et sans explication — un cul-de-sac muet.
   */
  dataNoteLocationDenied: {
    fr: 'Active la localisation pour te voir',
    en: 'Turn on location to see yourself',
    es: 'Activa la ubicación para verte',
    de: 'Standort aktivieren, um dich zu sehen',
    pt: 'Ative a localização para se ver',
  },
  /**
   * ON NE T'A RIEN DEMANDÉ (état `unasked` des deux MapScreen) : depuis que
   * l'ouverture de la carte ne DEMANDE plus la permission (elle se contente de
   * la lire), il existe un état où personne n'a rien refusé et où rien n'est en
   * cours. Il partageait la phrase de `denied` — « Active la localisation pour
   * te voir » — ce qui imputait au joueur un refus qu'il n'a jamais prononcé :
   * exactement la confusion d'états que CLAUDE.md interdit (« pas connecté » ≠
   * « vide » ≠ « échec » ≠ « en cours », et ici « jamais demandé » ≠ « refusé »).
   *
   * Différence de FOND, pas de formulation : `denied` renvoie aux réglages
   * système, `unasked` se règle par UN geste dans l'app (le bouton Recentrer, ou
   * le premier GO). La phrase est donc une demande adressée au joueur.
   * Budget §A : ≤ 38 caractères dans les 5 langues, comme les 4 autres.
   */
  dataNoteLocationUnasked: {
    fr: 'Demande ta position pour te voir',
    en: 'Get your position to see yourself',
    es: 'Pide tu posición para verte',
    de: 'Standort abrufen, um dich zu sehen',
    pt: 'Peça sua posição para se ver',
  },
  /**
   * RECHERCHE EN COURS. Un état de CHARGEMENT n'est pas un état vide : tant que
   * le fix n'est pas arrivé (jusqu'à 10 s), la carte dit qu'elle CHERCHE — elle
   * n'affirme ni « refusé », ni « introuvable ». Sans ça, l'ouverture à froid
   * montrait le globe entier sans un mot pendant toute l'acquisition GPS.
   */
  dataNoteLocating: {
    fr: 'Recherche de ta position…',
    en: 'Finding your position…',
    es: 'Buscando tu posición…',
    de: 'Standort wird gesucht…',
    pt: 'Procurando sua posição…',
  },
  /**
   * PERMISSION ACCORDÉE mais AUCUN FIX (localisation OS coupée, capteur muet,
   * timeout). C'était le cul-de-sac MUET n°1 de la carte : `if (!fix) return`
   * sortait sans rien poser — pas de point « moi », pas de note, et un bouton
   * Recentrer qui ne produisait STRICTEMENT rien à l'écran. On nomme donc l'état
   * ET l'issue : « réessaie » renvoie au bouton Recentrer, qui relance
   * l'acquisition — et qui n'est plus un bouton mort.
   * Budget §A : ≤ 38 caractères dans les 5 langues (même plafond que dataNote,
   * la pill fait ~86 % de 375 px) — verrouillé par locationState.test.ts.
   */
  dataNoteLocationUnavailable: {
    fr: 'Position introuvable, réessaie',
    en: 'Position not found, try again',
    es: 'Ubicación no encontrada',
    de: 'Standort nicht gefunden',
    pt: 'Posição não encontrada',
  },
  /**
   * Recentrer a échoué ALORS QU'on connaît déjà une position : on a volé vers la
   * dernière connue. Le dire évite de laisser croire que le point affiché est
   * frais — et évite l'autre extrême (« introuvable ») qui serait faux.
   */
  dataNoteLocationStale: {
    fr: 'Dernière position connue',
    en: 'Last known position',
    es: 'Última posición conocida',
    de: 'Letzter bekannter Standort',
    pt: 'Última posição conhecida',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ÉTATS VIDES DES SURFACES CARTE (décision fondateur 21/07/2026 — la vitrine
  // devient un flag ENV explicite, défaut OFF : tout ce que la démo remplissait
  // disparaît de l'app installée ET de localhost). « Retirer la démo ne veut PAS
  // dire laisser un trou » : chaque surface vidée dit ce qu'il n'y a pas encore
  // et propose LA seule action qui fait avancer.
  //
  // TROIS cas, jamais confondus (même discipline que dataNote*) :
  //   • pas connecté   → invite à se connecter ;
  //   • connecté, vide → invite à l'action (courir) — SANS CTA : le bouton GO
  //     flottant EST déjà l'unique CTA chartreuse de l'écran (§A.4) ;
  //   • échec réseau   → le dit, et propose de réessayer.
  // Titres courts (≤ ~28 car. dans les 5 langues) : ils vivent dans un peek de
  // carte sur 375 px, jamais tronqués.
  // ═══════════════════════════════════════════════════════════════════════════
  /**
   * Titre de la page /territoire HORS VITRINE. La page s'intitulait « Territoire
   * de KORO » — un pseudo FABRIQUÉ, affiché à un joueur qui n'a pas de compte et
   * ne s'appelle pas KORO. Rien dans la session ne porte de pseudo aujourd'hui :
   * plutôt qu'en inventer un, la page parle à la 1ʳᵉ personne. Le jour où un
   * profil réel existe, `territoryOf` (catalogue historique) reprend sa place.
   */
  territoryPageTitle: {
    fr: 'Mon territoire',
    en: 'My territory',
    es: 'Mi territorio',
    de: 'Mein Gebiet',
    pt: 'Meu território',
  },
  emptySignedOutTitle: {
    fr: 'Pas encore connecté',
    en: 'Not signed in',
    es: 'Sin sesión iniciada',
    de: 'Nicht angemeldet',
    pt: 'Não conectado',
  },
  emptySignedOutLine: {
    fr: 'Connecte-toi pour capturer des zones.',
    en: 'Sign in to start capturing zones.',
    es: 'Inicia sesión para capturar zonas.',
    de: 'Melde dich an, um Zonen zu erobern.',
    pt: 'Entre para capturar zonas.',
  },
  emptySignedOutCta: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  emptyNoneTitle: {
    fr: 'Aucune zone capturée',
    en: 'No zone captured yet',
    es: 'Ninguna zona capturada',
    de: 'Noch keine Zone erobert',
    pt: 'Nenhuma zona capturada',
  },
  /**
   * NEUTRALISÉE (26/07/2026) — elle disait « EN COURANT ».
   *
   * Sur la Carte, cette ligne est déjà la branche « course » d'un couple
   * jumelé (`emptyBikeTitle`/`emptyBikeLine`, BattleMapOverlays.tsx:1265-1272) :
   * la lentille y est connue, l'ancienne formulation n'y mentait pas.
   *
   * Mais elle a un SECOND consommateur, et lui n'a pas de lentille à l'écran :
   * `/territoire` (app/territoire.tsx:246) et `TerritoryFranceMap.tsx:187` la
   * rendent dans l'état VIDE — or la ligne de portée (« MON TERRITOIRE ·
   * COURSE / À VÉLO ») n'est montée que si `metricKeys.length > 0`, donc JAMAIS
   * quand il n'y a rien à afficher (features/territory/pageState.ts:91-99). Un
   * cycliste sans aucune zone lisait donc « ferme une boucle EN COURANT » sans
   * qu'aucun mot d'écran ne lui dise de quel monde on parle : une consigne
   * incomplète, pas un mensonge — d'où une DETTE, pas un blocage.
   *
   * Neutralisation plutôt que jumeau : ajouter un `emptyNoneLineBike` ici
   * n'aiderait pas /territoire, qui n'a précisément pas de quoi choisir dans
   * cet état. Le couple de la Carte, lui, reste intact et toujours plus
   * précis — c'est le sens du jumeau : dire PLUS quand on sait.
   */
  emptyNoneLine: {
    fr: 'Ferme une boucle pendant une sortie : elle devient ta zone.',
    en: 'Close a loop during an activity: it becomes your zone.',
    es: 'Cierra un bucle durante una actividad: será tu zona.',
    de: 'Schließe während einer Aktivität eine Schleife – sie wird deine Zone.',
    pt: 'Feche um circuito durante uma atividade: ele vira sua zona.',
  },

  /**
   * ÉTAT VIDE DU MONDE VÉLO (26/07/2026) — le pendant exact de `emptyNone`.
   *
   * Ces deux entrées remplacent l'ancien peek « Le vélo n'est pas encore
   * chronométré », qui parlait du PRODUIT (une fonctionnalité manquante). Le
   * vélo enregistre désormais : ce qui est vide, c'est le territoire DE CE
   * JOUEUR, exactement comme chez un nouveau venu à pied. La copie dit donc un
   * COMMENCEMENT, pas une absence, et elle ne promet rien qu'un GO ne tienne.
   *
   * Elles restent DISTINCTES de `emptyNone` pour une raison factuelle, pas
   * cosmétique : l'action n'est pas la même. « Ferme une boucle en courant » et
   * « ferme une boucle à vélo » ne décrivent pas le même effort, et l'échelle
   * non plus (une boucle vélo suggérée fait ~5 × la distance d'une boucle à
   * pied — ACTIVITY_ROUTING, game-rules). Réutiliser la phrase de la course
   * enverrait le cycliste chercher une zone à 900 m.
   */
  emptyBikeTitle: {
    fr: 'Ton territoire vélo commence ici',
    en: 'Your cycling turf starts here',
    es: 'Tu territorio en bici empieza aquí',
    de: 'Dein Rad-Gebiet beginnt hier',
    pt: 'Seu território de bike começa aqui',
  },
  emptyBikeLine: {
    fr: 'Ferme une boucle à vélo : elle devient ta zone, à part de tes zones à pied.',
    en: 'Close a loop on your bike: it becomes your zone, separate from your running ones.',
    es: 'Cierra un bucle en bici: será tu zona, aparte de las que ganas a pie.',
    de: 'Schließe eine Schleife auf dem Rad – sie wird deine Zone, getrennt von den Laufzonen.',
    pt: 'Feche um circuito de bike: vira sua zona, separada das que você ganha a pé.',
  },
  emptyFailedTitle: {
    fr: 'Territoire non chargé',
    en: 'Territory didn’t load',
    es: 'Territorio no cargado',
    de: 'Gebiet nicht geladen',
    pt: 'Território não carregado',
  },
  emptyFailedLine: {
    fr: 'On n’a pas pu lire tes zones.',
    en: 'We couldn’t read your zones.',
    es: 'No pudimos leer tus zonas.',
    de: 'Wir konnten deine Zonen nicht lesen.',
    pt: 'Não conseguimos ler suas zonas.',
  },
  emptyFailedCta: {
    fr: 'Réessayer',
    en: 'Retry',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },

  // ── Sheet ANCRÉE de la Carte (planche E02) : poignée tirable. Le libellé dit
  //    LA SHEET (territoire), pas « panneau de course », et il annonce les DEUX
  //    chemins — glisser OU toucher : le geste n'est jamais le seul moyen. ──
  sheetHandleOpenA11y: {
    fr: 'Panneau territoire — glisse ou touche pour déployer',
    en: 'Territory panel — drag or tap to expand',
    es: 'Panel de territorio — desliza o toca para desplegar',
    de: 'Gebietsleiste – ziehen oder tippen zum Öffnen',
    pt: 'Painel de território — arraste ou toque para abrir',
  },
  sheetHandleCloseA11y: {
    fr: 'Panneau territoire — glisse ou touche pour replier',
    en: 'Territory panel — drag or tap to collapse',
    es: 'Panel de territorio — desliza o toca para plegar',
    de: 'Gebietsleiste – ziehen oder tippen zum Schließen',
    pt: 'Painel de território — arraste ou toque para fechar',
  },

  // ── Commutateur Run / Bike (planche E14, révisé 26/07/2026) ───────────────
  //    Les segments portent désormais un LIBELLÉ VISIBLE (« RUN » / « BIKE »,
  //    invariants, cf. `ui/activityLens.ts`). Ces deux entrées restent l'a11y :
  //    elles nomment ce que la bascule change CHEZ CETTE SURFACE — « Carte
  //    vélo » n'a rien à dire sur l'écran Historique, et le libellé visible, lui,
  //    ne le dit nulle part. ──
  activityRunA11y: {
    fr: 'Carte à pied',
    en: 'Running map',
    es: 'Mapa a pie',
    de: 'Laufkarte',
    pt: 'Mapa a pé',
  },
  activityBikeA11y: {
    fr: 'Carte vélo',
    en: 'Cycling map',
    es: 'Mapa en bici',
    de: 'Radkarte',
    pt: 'Mapa de bike',
  },
  // ── RETIRÉES LE 26/07/2026 (« le vélo devient réel », décision fondateur) ──
  //    Cinq entrées ont disparu d'ici, et il vaut mieux dire lesquelles que
  //    laisser un trou :
  //      · `activityBikeMark` / `activityBikeMarkA11y` — la marque « PAS ENCORE »
  //        du segment Bike. Elle affirmait une propriété de la DISCIPLINE
  //        (« rien ne peut être enregistré à vélo ») qui est devenue fausse ;
  //      · `bikeStartTitle` / `bikeStartLine` / `bikeStartRunSafe` — le peek
  //        « Le vélo n'est pas encore chronométré ». Il parlait du PRODUIT ;
  //        ce qui est vide désormais, c'est le territoire DE CE JOUEUR, et
  //        `emptyBikeTitle` / `emptyBikeLine` (plus haut) le disent comme un
  //        début.
  //    Elles ne sont pas « en attente de retour » : leur cause a disparu. Les
  //    ressusciter demanderait de rendre le vélo non enregistrable à nouveau.

  // ── Sheet d'une VRAIE zone tapée (hex_claims) — couleur par RÔLE, jamais par
  //    crew. Aucun nom de crew n'est affiché ici : la table ne le porte pas, et
  //    inventer « Canal Crew » serait exactement le mensonge qu'on retire. ──
  zoneOwnerMine: {
    fr: 'À toi',
    en: 'Yours',
    es: 'Tuya',
    de: 'Deine',
    pt: 'Sua',
  },
  zoneOwnerRival: {
    fr: 'À un rival',
    en: 'A rival’s',
    es: 'De un rival',
    de: 'Von einem Rivalen',
    pt: 'De um rival',
  },
  // ── E04 (planche) : sheet de décision d'une zone tapée ──
  /** Kicker de rôle en tête de sheet (couleur du rôle §C). */
  zoneKickerRival: {
    fr: 'ZONE RIVALE',
    en: 'RIVAL ZONE',
    es: 'ZONA RIVAL',
    de: 'RIVALENZONE',
    pt: 'ZONA RIVAL',
  },
  zoneKickerMine: {
    fr: 'TON TERRITOIRE',
    en: 'YOUR TURF',
    es: 'TU TERRITORIO',
    de: 'DEIN GEBIET',
    pt: 'SEU TERRITÓRIO',
  },
  /** CTA primaire — planifier un parcours pour reprendre une zone rivale
   *  (route-planner réel ; la reprise reste décidée serveur). ≤ 10 car. ✓ */
  zoneReprendre: {
    fr: 'Reprendre',
    en: 'Take back',
    es: 'Recuperar',
    de: 'Zurückholen',
    pt: 'Retomar',
  },
  /**
   * Kicker CONTESTÉE (violet §C) — dérivé de `sector_snapshot.contested`, un
   * booléen RÉEL déjà chargé par la carte. Pas de CTA « Voir la mission » en
   * face : aucun objet mission de secteur n'existe, et un bouton sans cible
   * serait un bouton mort.
   */
  zoneKickerContested: {
    fr: 'ZONE CONTESTÉE',
    en: 'CONTESTED ZONE',
    es: 'ZONA EN DISPUTA',
    de: 'UMKÄMPFTE ZONE',
    pt: 'ZONA DISPUTADA',
  },
  // ── E04 : les 3 métriques à séparateurs. Libellés COURTS (une rangée de 3
  //    cellules sur 375 px, plancher a11y 11 px, jamais tronqué §A9). ──
  /** Surface = somme EXACTE des aires H3 des cellules possédées. */
  zoneMetricArea: {
    fr: 'Surface',
    en: 'Area',
    es: 'Superficie',
    de: 'Fläche',
    pt: 'Área',
  },
  zoneMetricZones: {
    fr: 'Zones',
    en: 'Zones',
    es: 'Zonas',
    de: 'Zonen',
    pt: 'Zonas',
  },
  /**
   * « Dernière prise » et NON « tenu depuis » : `capturedAt` est le claim le
   * plus RÉCENT du territoire, pas le début de la possession. « Tenu depuis
   * 6 jours » serait faux dès qu'un seul hex a changé de main entre-temps.
   */
  zoneMetricLastCapture: {
    fr: 'Dernière prise',
    en: 'Last taken',
    es: 'Última toma',
    de: 'Zuletzt geholt',
    pt: 'Última tomada',
  },
  /** Valeur compacte de la métrique temporelle (« 6 j »), le libellé dit le reste. */
  zoneAgoDays: {
    fr: '{n} j',
    en: '{n} d',
    es: '{n} d',
    de: '{n} T',
    pt: '{n} d',
  },
  zoneAgoToday: {
    fr: 'Aujourd’hui',
    en: 'Today',
    es: 'Hoy',
    de: 'Heute',
    pt: 'Hoje',
  },
  /** Action TERTIAIRE de E04 : un LIEN, jamais un 2ᵉ bouton plein (§A.4). */
  zonePlanLater: {
    fr: 'Planifier pour plus tard',
    en: 'Plan it for later',
    es: 'Planificar para después',
    de: 'Später planen',
    pt: 'Planejar para depois',
  },
  zonePlanLaterA11y: {
    fr: 'Planifier pour plus tard — ouvrir le planificateur d’itinéraire',
    en: 'Plan it for later — open the route planner',
    es: 'Planificar para después — abrir el planificador de rutas',
    de: 'Später planen — den Routenplaner öffnen',
    pt: 'Planejar para depois — abrir o planejador de rotas',
  },

  // ══ E22 — DÉFENSE · Zone attaquée ══════════════════════════════════════════
  //  Ma zone (mon crew) est CONTESTÉE : « Se faire reprendre → Revenir ». Urgence
  //  MAÎTRISÉE — des faits, une échéance, une décision (DÉFENDRE), jamais une
  //  alarme anxiogène. Ton NEUTRE : « un rival gagne du terrain », JAMAIS « Nina
  //  t'attaque ! ». Aucune donnée privée du rival (pseudo, heure, tracé) : seule
  //  la couverture APPROXIMATIVE (part agrégée de secteur) est montrable.
  /** Kicker VIOLET §C (contesté) en tête de la sheet de défense. Tutoiement app. */
  defenseKicker: {
    fr: 'TA ZONE EST CONTESTÉE',
    en: 'YOUR ZONE IS CONTESTED',
    es: 'TU ZONA ESTÁ EN DISPUTA',
    de: 'DEINE ZONE IST UMKÄMPFT',
    pt: 'SUA ZONA ESTÁ DISPUTADA',
  },
  /**
   * Ligne de couverture APPROXIMATIVE : `rivalPercent`, la part AGRÉGÉE que le
   * rival tient du secteur (`sector_snapshot`) — jamais son tracé ni « il y a 2 h »
   * (RLS `runs_select_own`). « ~ » assume l'approximation, sans fausse précision.
   */
  defenseCoverageRival: {
    fr: 'Un rival tient ~{pct} % de ce secteur.',
    en: 'A rival holds ~{pct}% of this sector.',
    es: 'Un rival controla ~{pct} % de este sector.',
    de: 'Ein Rivale hält ~{pct} % dieses Sektors.',
    pt: 'Um rival controla ~{pct}% deste setor.',
  },
  /** Repli NEUTRE quand aucune part rivale n'a de source : le seul fait contesté. */
  defenseCoverageNeutral: {
    fr: 'Ce secteur est disputé.',
    en: 'This sector is being contested.',
    es: 'Este sector está en disputa.',
    de: 'Dieser Sektor ist umkämpft.',
    pt: 'Este setor está em disputa.',
  },
  /** Note OR (état imminent, échéance < 2 h) — jamais rouge. Portée par le TEXTE. */
  defenseUrgencyNote: {
    fr: 'Échéance imminente.',
    en: 'Deadline is close.',
    es: 'Plazo inminente.',
    de: 'Frist steht kurz bevor.',
    pt: 'Prazo iminente.',
  },
  /** Unité du compte à rebours — en HEURES (planche : « 18 H »), jamais des secondes. */
  defenseHourUnit: {
    fr: 'h',
    en: 'h',
    es: 'h',
    de: 'Std',
    pt: 'h',
  },
  /** Libellé de la métrique échéance (sous le gros nombre d'heures). */
  defenseMetricDeadline: {
    fr: 'pour défendre',
    en: 'to defend',
    es: 'para defender',
    de: 'zum Verteidigen',
    pt: 'para defender',
  },
  /** Libellé de la métrique surface (sous le « 0,42 km² »). */
  defenseMetricArea: {
    fr: 'en jeu',
    en: 'at stake',
    es: 'en juego',
    de: 'im Spiel',
    pt: 'em jogo',
  },
  /** Phrase tactique NEUTRE (vaut Run ET Bike : « boucle », jamais « en courant »). */
  defenseTactical: {
    fr: 'Referme une boucle dans ta zone avant l’échéance pour la garder.',
    en: 'Close a loop inside your zone before the deadline to keep it.',
    es: 'Cierra un bucle en tu zona antes del plazo para conservarla.',
    de: 'Schließe vor Ablauf eine Schleife in deiner Zone, um sie zu behalten.',
    pt: 'Feche um laço na sua zona antes do prazo para mantê-la.',
  },
  /** CTA UNIQUE chartreuse de E22 (planche : DÉFENDRE / DEFEND / DEFENDER). */
  defendCta: {
    fr: 'Défendre',
    en: 'Defend',
    es: 'Defender',
    de: 'Verteidigen',
    pt: 'Defender',
  },
  defendCtaA11y: {
    fr: 'Défendre — préparer une boucle de défense sur cette zone',
    en: 'Defend — set up a defense loop on this zone',
    es: 'Defender — preparar un bucle de defensa en esta zona',
    de: 'Verteidigen — eine Verteidigungsschleife für diese Zone vorbereiten',
    pt: 'Defender — preparar um laço de defesa nesta zona',
  },
  /** Action SECONDAIRE (lien tertiaire, §A.4) — un signal de crew RÉEL (crew_ping_zone). */
  defenseAlertCrew: {
    fr: 'Alerter le crew',
    en: 'Alert the crew',
    es: 'Alertar al crew',
    de: 'Crew alarmieren',
    pt: 'Alertar o crew',
  },
  defenseAlertCrewA11y: {
    fr: 'Alerter le crew — envoyer un signal de renfort sur cette zone',
    en: 'Alert the crew — send a backup signal on this zone',
    es: 'Alertar al crew — enviar una señal de refuerzo en esta zona',
    de: 'Crew alarmieren — ein Verstärkungssignal für diese Zone senden',
    pt: 'Alertar o crew — enviar um sinal de reforço nesta zona',
  },
  // ── Toasts d'issue de « Alerter le crew » : chaque verdict serveur a le sien,
  //    jamais un toast muet ni un faux succès (le ping n'est PAS un repli local). ──
  defenseAlertSent: {
    fr: 'Crew alerté',
    en: 'Crew alerted',
    es: 'Crew alertado',
    de: 'Crew alarmiert',
    pt: 'Crew alertado',
  },
  defenseAlertNoCrew: {
    fr: 'Rejoins un crew pour l’alerter',
    en: 'Join a crew to alert it',
    es: 'Únete a un crew para alertarlo',
    de: 'Tritt einem Crew bei, um es zu alarmieren',
    pt: 'Entre num crew para alertá-lo',
  },
  defenseAlertCooldown: {
    fr: 'Déjà alerté — patiente un peu',
    en: 'Already alerted — hold on',
    es: 'Ya alertado — espera un poco',
    de: 'Bereits alarmiert — kurz warten',
    pt: 'Já alertado — aguarde um pouco',
  },
  defenseAlertNotSector: {
    fr: 'Cette zone n’est pas un secteur de crew',
    en: 'This zone isn’t a crew sector',
    es: 'Esta zona no es un sector de crew',
    de: 'Diese Zone ist kein Crew-Sektor',
    pt: 'Esta zona não é um setor de crew',
  },
  defenseAlertSignedOut: {
    fr: 'Connecte-toi pour alerter ton crew',
    en: 'Sign in to alert your crew',
    es: 'Inicia sesión para alertar a tu crew',
    de: 'Melde dich an, um dein Crew zu alarmieren',
    pt: 'Entre para alertar seu crew',
  },
  defenseAlertFailed: {
    fr: 'Impossible d’alerter — réessaie',
    en: 'Couldn’t alert — try again',
    es: 'No se pudo alertar — inténtalo de nuevo',
    de: 'Alarmieren fehlgeschlagen — erneut versuchen',
    pt: 'Não deu para alertar — tenta de novo',
  },
  /** Kicker du briefing E05 quand on y arrive par DÉFENDRE (label DÉFENSE). */
  defenseBriefKicker: {
    fr: 'DÉFENSE',
    en: 'DEFENSE',
    es: 'DEFENSA',
    de: 'VERTEIDIGUNG',
    pt: 'DEFESA',
  },
  /** Phrase tactique du briefing DÉFENSE — la course reste libre, le serveur valide après. */
  defenseBriefTactical: {
    fr: 'La sortie qui démarre est libre. Referme ta boucle dans la zone ; le serveur valide la défense après.',
    en: 'The activity that starts is free-form. Close your loop in the zone; the server confirms the defense afterward.',
    es: 'La actividad que empieza es libre. Cierra tu bucle en la zona; el servidor valida la defensa después.',
    de: 'Die startende Aktivität ist frei. Schließe deine Schleife in der Zone; der Server bestätigt die Verteidigung danach.',
    pt: 'A atividade que começa é livre. Feche seu laço na zona; o servidor valida a defesa depois.',
  },

  // ── Classement de zone (ZoneLeaderboard) : aucun palmarès réel n'existe tant
  //    que personne n'a couru la zone — on le DIT au lieu d'afficher des noms
  //    de coureurs fabriqués. ──
  zoneBoardTitle: {
    fr: 'CLASSEMENT DE ZONE',
    en: 'ZONE LEADERBOARD',
    es: 'RANKING DE ZONA',
    de: 'ZONEN-RANGLISTE',
    pt: 'RANKING DA ZONA',
  },
  zoneBoardEmpty: {
    fr: 'Aucun classement tant que personne n’a couru ici.',
    en: 'No leaderboard until someone runs here.',
    es: 'Sin ranking hasta que alguien corra aquí.',
    de: 'Keine Rangliste, bis hier jemand läuft.',
    pt: 'Sem ranking até alguém correr aqui.',
  },
  /**
   * LE MÊME FAIT, SOUS LA LENTILLE VÉLO (26/07/2026) — même raison que
   * `dataNoteEmptyBike` : la phrase ci-dessus porte un VERBE (« a couru »), et
   * `/territoire` la rendait SANS CONDITION alors que l'écran porte le
   * commutateur de discipline et affiche « À vélo » quatre blocs plus haut. La
   * page se contredisait donc elle-même : « à vélo » en en-tête, « personne n'a
   * couru ici » en pied de page.
   * Le classement lui-même est SÉPARÉ par monde (décision fondateur 26/07) :
   * ce n'est pas une politesse de traduction, c'est le bon fait.
   * Court dans les 5 langues — la ligne vit sous un titre de section, jamais
   * tronquée (§A).
   */
  zoneBoardEmptyBike: {
    fr: 'Aucun classement tant que personne n’a roulé ici.',
    en: 'No leaderboard until someone rides here.',
    es: 'Sin ranking hasta que alguien ruede aquí.',
    de: 'Keine Rangliste, bis hier jemand fährt.',
    pt: 'Sem ranking até alguém pedalar aqui.',
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

  // ═══════════════════════════════════════════════════════════════════════════
  // E14 — DÉTAIL D'UN TERRITOIRE (`/map/zone/:zoneId`), spec produit l.943-985.
  // Ajouté le 27/07/2026.
  //
  // ⚠ NUMÉROTATION : E14 = la NOUVELLE spec (ARBITRAGES A4). Le « E14 » cité
  // ailleurs dans le dépôt (commutateur Run/Bike) est la planche Vague 1, à
  // citer `V1-E14`.
  //
  // POURQUOI ICI ET PAS DANS UN CATALOGUE NEUF : la feuille de zone EXISTE
  // (`features/map/zoneSelection.ts` + les sheets de `BattleMapOverlays.tsx` /
  // `MapScreen*.tsx`) et lit CE catalogue. Les clés `zoneKickerMine`,
  // `zoneKickerRival`, `zoneKickerContested`, `zoneReprendre`, `zoneMetric*`
  // et tout le bloc `defense*` couvrent DÉJÀ trois des cinq variantes de la
  // spec (rivale, contestée, et le tronc commun de la personnelle) : elles ne
  // sont pas recréées ici.
  //
  // CE QUI MANQUAIT VRAIMENT, et que ce bloc ajoute :
  //   · la variante ZONE LIBRE — `selectZoneView` ne rend aujourd'hui que
  //     'mine' | 'rival' (une zone libre n'a aucune ligne `hex_claims`) ;
  //   · la variante ZONE CREW, aujourd'hui FONDUE dans « à toi » (`role: 'mine'`
  //     dès que `status === 'crew'`), alors que la spec en fait deux écrans
  //     avec deux contenus ;
  //   · le niveau de protection et le CTA `RENFORCER` de la zone personnelle.
  //
  // ⚠ CONTRAT POUR L'ÉCRAN QUI CONSOMMERA CES CLÉS : chacune suppose une SOURCE
  // RÉELLE. Tant qu'une donnée n'est pas lue (contribution crew, événements
  // récents, niveau de protection), la ligne ne se peint pas — l'absence est un
  // état, pas un trou à combler. Et aucune de ces clés ne nomme un joueur : la
  // spec ferme le sujet (l.983 : « Aucun départ, arrivée, horaire précis ou
  // trace brute d'un tiers »).
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Variante 1 : ZONE LIBRE ───────────────────────────────────────────────
  zoneKickerFree: {
    fr: 'ZONE LIBRE',
    en: 'FREE ZONE',
    es: 'ZONA LIBRE',
    de: 'FREIE ZONE',
    pt: 'ZONA LIVRE',
  },
  /** Surface ESTIMÉE (spec l.952) — le mot « estimée » est dans le libellé. */
  zoneMetricAreaEstimated: {
    fr: 'Surface estimée',
    en: 'Estimated area',
    es: 'Superficie estimada',
    de: 'Geschätzte Fläche',
    pt: 'Área estimada',
  },
  /**
   * « Meilleure boucle suggérée » (spec l.953) — une SUGGESTION du planificateur,
   * jamais une promesse de capture. Le mot « suggérée » n'est pas décoratif.
   */
  zoneSuggestedLoop: {
    fr: 'Boucle suggérée',
    en: 'Suggested loop',
    es: 'Bucle sugerido',
    de: 'Vorgeschlagene Schleife',
    pt: 'Circuito sugerido',
  },
  /** Aucune boucle calculable ici : on le dit plutôt que d'en inventer une. */
  zoneSuggestedLoopNone: {
    fr: 'Aucune boucle proposée ici pour l’instant',
    en: 'No loop suggested here for now',
    es: 'Ningún bucle propuesto aquí por ahora',
    de: 'Hier vorerst keine Schleife vorgeschlagen',
    pt: 'Nenhum circuito sugerido aqui por enquanto',
  },
  /** CTA de la zone libre (spec l.954). */
  zoneConquerCta: {
    fr: 'CONQUÉRIR',
    en: 'CONQUER',
    es: 'CONQUISTAR',
    de: 'EROBERN',
    pt: 'CONQUISTAR',
  },

  // ── Variante 2 : ZONE PERSONNELLE ─────────────────────────────────────────
  /**
   * « Durée de contrôle » (spec l.959). DISTINCT de `zoneMetricLastCapture` :
   * celle-ci dit depuis quand la zone est tenue SANS INTERRUPTION, et ne
   * s'affiche donc que si le serveur porte cette durée. Sans elle, on garde
   * « Dernière prise », qui est mesurable.
   */
  zoneMetricHeldFor: {
    fr: 'Tenue depuis',
    en: 'Held for',
    es: 'En tu poder desde',
    de: 'Gehalten seit',
    pt: 'Mantida há',
  },
  /** « Niveau de protection » (spec l.960) — jamais un « 0 » nu (voir ci-dessous). */
  zoneMetricProtection: {
    fr: 'Protection',
    en: 'Protection',
    es: 'Protección',
    de: 'Schutz',
    pt: 'Proteção',
  },
  /**
   * `defense_level` vaut 0 sur un territoire jamais fortifié : ce n'est pas
   * « niveau 0 », c'est « aucune fortification ». Même règle que
   * `displayableProtection()` côté Résultat — une seule vérité dans l'app.
   */
  zoneProtectionNone: {
    fr: 'Aucune fortification',
    en: 'No fortification',
    es: 'Sin fortificación',
    de: 'Keine Befestigung',
    pt: 'Sem fortificação',
  },
  zoneProtectionLevel: {
    fr: 'Niveau {n}',
    en: 'Level {n}',
    es: 'Nivel {n}',
    de: 'Stufe {n}',
    pt: 'Nível {n}',
  },
  /** CTA « RENFORCER » (spec l.962), servi seulement s'il y a de quoi renforcer. */
  zoneReinforceCta: {
    fr: 'RENFORCER',
    en: 'REINFORCE',
    es: 'REFORZAR',
    de: 'VERSTÄRKEN',
    pt: 'REFORÇAR',
  },
  /**
   * CTA de la zone personnelle / crew (spec l.962). La spec l'écrit en
   * capitales ; il est rendu en CASSE DE PHRASE comme `zoneReprendre`, parce que
   * les deux occupent le MÊME bouton de la MÊME feuille : deux casses pour un
   * seul emplacement se lirait comme deux composants différents.
   *
   * « RENFORCER » (l.962, premier choix de la spec) n'est volontairement PAS
   * servi : `defense_level` ne monte que lorsqu'une contestation active est
   * repoussée (ingest_run/index.ts:3604), donc rien dans le jeu ne renforce une
   * zone tranquille — ce serait un bouton mort (constitution §2).
   */
  zonePlanOutingCta: {
    fr: 'Planifier une sortie',
    en: 'Plan an outing',
    es: 'Planificar una salida',
    de: 'Aktivität planen',
    pt: 'Planejar uma atividade',
  },

  // ── Variante 3 : ZONE CREW ────────────────────────────────────────────────
  zoneKickerCrew: {
    fr: 'ZONE DU CREW',
    en: 'CREW ZONE',
    es: 'ZONA DEL CREW',
    de: 'CREW-ZONE',
    pt: 'ZONA DO CREW',
  },
  /**
   * « Contribution de l'utilisateur » (spec l.968) — MA part, en pourcentage
   * entier. Aucun classement interne, aucun nom de coéquipier : le mérite se
   * dispute vite, et la spec ne demande que ma part.
   */
  zoneCrewContribution: {
    fr: 'Ta part : {pct} %',
    en: 'Your share: {pct}%',
    es: 'Tu parte: {pct} %',
    de: 'Dein Anteil: {pct} %',
    pt: 'Sua parte: {pct}%',
  },
  /** Ma part n'est pas lisible : on n'affiche pas « 0 % », qui serait faux. */
  zoneCrewContributionUnknown: {
    fr: 'Ta part n’est pas encore mesurable',
    en: 'Your share isn’t measurable yet',
    es: 'Tu parte aún no se puede medir',
    de: 'Dein Anteil ist noch nicht messbar',
    pt: 'Sua parte ainda não é mensurável',
  },
  /**
   * Ligne de propriétaire de la variante CREW — pendant de `zoneOwnerMine` /
   * `zoneOwnerRival`. Aucun NOM de crew : `territories` ne le porte pas dans la
   * lecture de la carte, et l'inventer serait exactement le mensonge que §C
   * évite en peignant par RÔLE plutôt que par identité.
   */
  zoneOwnerCrew: {
    fr: 'À ton crew',
    en: 'Your crew’s',
    es: 'De tu crew',
    de: 'Von deinem Crew',
    pt: 'Do seu crew',
  },

  // ── Variante 4 : ZONE RIVALE — « frontière » (spec l.975) ─────────────────
  //
  // CE QUE MONTRE LE CONTOUR PEINT, dit en toutes lettres. Trois cas RÉELS,
  // dérivés de `precision` (§12.3) et de `geometrySource` — jamais devinés :
  // c'est la seule ligne de l'app qui empêche de prendre une forme approchée
  // pour la trace d'une course.
  zoneBorderLabel: {
    fr: 'Frontière',
    en: 'Border',
    es: 'Frontera',
    de: 'Grenze',
    pt: 'Fronteira',
  },
  /** Ma propre trace, telle que le moteur l'a produite. */
  zoneBorderExact: {
    fr: 'Ton tracé exact',
    en: 'Your exact route',
    es: 'Tu trazado exacto',
    de: 'Deine exakte Strecke',
    pt: 'Seu traçado exato',
  },
  /** Version publique d'un territoire d'autrui (§12.3) — vraie, mais grossie. */
  zoneBorderGeneralized: {
    fr: 'Contour public simplifié',
    en: 'Simplified public outline',
    es: 'Contorno público simplificado',
    de: 'Vereinfachte öffentliche Kontur',
    pt: 'Contorno público simplificado',
  },
  /**
   * Aucun polygone n'existe encore pour ces captures : ce qui est peint est un
   * contour de cellules adouci. La spec §1.4 interdit l'hexagone à l'écran ; la
   * transition en laisse trois cas (territoriesSource.ts §5) et les TAIRE serait
   * pire que les dire — le joueur croirait regarder son tracé.
   */
  zoneBorderApprox: {
    fr: 'Contour approximatif (tracé pas encore disponible)',
    en: 'Approximate outline (route not available yet)',
    es: 'Contorno aproximado (trazado aún no disponible)',
    de: 'Ungefähre Kontur (Strecke noch nicht verfügbar)',
    pt: 'Contorno aproximado (traçado ainda indisponível)',
  },

  /** « Derniers événements » (spec l.969) — en-tête de la liste. */
  zoneCrewEvents: {
    fr: 'Derniers événements',
    en: 'Latest events',
    es: 'Últimos eventos',
    de: 'Letzte Ereignisse',
    pt: 'Últimos eventos',
  },
  /** Aucun événement lisible : état VIDE explicite, jamais une ligne inventée. */
  zoneCrewEventsEmpty: {
    fr: 'Rien à signaler sur cette zone',
    en: 'Nothing to report on this zone',
    es: 'Nada que señalar en esta zona',
    de: 'Nichts zu dieser Zone zu melden',
    pt: 'Nada a relatar nesta zona',
  },

  // ── États de lecture de la feuille (les quatre, jamais confondus) ─────────
  /** LECTURE EN COURS — n'affirme rien sur la zone. */
  zoneLoading: {
    fr: 'Lecture de la zone…',
    en: 'Reading the zone…',
    es: 'Leyendo la zona…',
    de: 'Zone wird gelesen…',
    pt: 'Lendo a zona…',
  },
  /** ÉCHEC de lecture — distinct du vide, avec une vraie reprise. */
  zoneFailed: {
    fr: 'Zone illisible pour l’instant',
    en: 'Zone unreadable for now',
    es: 'Zona ilegible por ahora',
    de: 'Zone derzeit nicht lesbar',
    pt: 'Zona ilegível por enquanto',
  },
  zoneRetry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  /**
   * La confidentialité de la spec (l.983), dite à l'écran quand la feuille
   * montre une zone qui n'est pas la mienne : personne ne lira ici un départ,
   * une arrivée, un horaire ni un tracé.
   */
  zonePrivacyNote: {
    fr: 'Ni départ, ni arrivée, ni horaire : seule la zone publique est montrée.',
    en: 'No start, no finish, no times: only the public zone is shown.',
    es: 'Ni salida, ni llegada, ni horarios: solo se muestra la zona pública.',
    de: 'Kein Start, kein Ziel, keine Zeiten: nur die öffentliche Zone wird gezeigt.',
    pt: 'Sem partida, sem chegada, sem horários: só a zona pública é mostrada.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // E12 — COUCHES ET FILTRES DE CARTE (spec produit l.902-930), 28/07/2026.
  //
  // Le dépôt avait déjà un menu « CALQUES » (`headingLayers`), mais il choisit
  // une LENTILLE parmi six (Territoire / Route / Défense / Rival / Exploration
  // / Crew — les `MapMode`). E12 demande autre chose : SEPT INTERRUPTEURS
  // indépendants, mémorisés PAR DISCIPLINE. Les deux cohabitent sans se
  // remplacer — la lentille dit CE QU'ON REGARDE, le filtre CE QU'ON MASQUE —
  // et les libellés ci-dessous sont donc NEUFS, jamais des synonymes des
  // `mode*` du haut de ce fichier (`modeCrew` = la lentille Crew ;
  // `layerCrew` = l'interrupteur du territoire de mon crew).
  //
  // §A CONTRAIGNANT : sept rangées lues d'un coup d'œil ⇒ un ou deux mots par
  // libellé, dans les CINQ langues. L'allemand est reformulé court (« Rivalen »
  // et pas « Rivalisierende Gebiete »).
  // ══════════════════════════════════════════════════════════════════════════
  /** Titre de la feuille (jamais un écran plein — spec l.906-908). */
  filtersTitle: {
    fr: 'COUCHES ET FILTRES',
    en: 'LAYERS AND FILTERS',
    es: 'CAPAS Y FILTROS',
    de: 'EBENEN UND FILTER',
    pt: 'CAMADAS E FILTROS',
  },
  /** Couche `mine` — mes territoires (spec l.912). */
  layerMine: {
    fr: 'Mes territoires',
    en: 'My territory',
    es: 'Mis territorios',
    de: 'Mein Gebiet',
    pt: 'Meus territórios',
  },
  /** Couche `crew` — le territoire du crew (spec l.913). */
  layerCrew: {
    fr: 'Crew',
    en: 'Crew',
    es: 'Crew',
    de: 'Crew',
    pt: 'Crew',
  },
  /** Couche `rivals` — les territoires rivaux (spec l.914). */
  layerRivals: {
    fr: 'Rivaux',
    en: 'Rivals',
    es: 'Rivales',
    de: 'Rivalen',
    pt: 'Rivais',
  },
  /** Couche `contested` — les zones contestées (spec l.915). */
  layerContested: {
    fr: 'Contestées',
    en: 'Contested',
    es: 'Disputadas',
    de: 'Umkämpft',
    pt: 'Disputadas',
  },
  /** Couche `missions` — les missions posées sur la carte (spec l.916). */
  layerMissions: {
    fr: 'Missions',
    en: 'Missions',
    es: 'Misiones',
    de: 'Missionen',
    pt: 'Missões',
  },
  /** Couche `private_zones` — MES zones privées (spec l.917). */
  layerPrivateZones: {
    fr: 'Zones privées',
    en: 'Private zones',
    es: 'Zonas privadas',
    de: 'Private Zonen',
    pt: 'Zonas privadas',
  },
  /** Couche `labels` — les étiquettes de secteur (spec l.918). */
  layerLabels: {
    fr: 'Étiquettes',
    en: 'Labels',
    es: 'Etiquetas',
    de: 'Beschriftungen',
    pt: 'Rótulos',
  },
  /**
   * LA PHRASE QUI DIT QUE LE FILTRE A UNE LIMITE (spec l.922 : « Le filtre ne
   * peut pas masquer une menace urgente concernant l'utilisateur »). Elle est
   * écrite AVANT qu'on éteigne quoi que ce soit : découvrir un marqueur qu'on
   * croyait avoir masqué ressemblerait sinon à un bug.
   */
  filtersUrgentNote: {
    fr: 'Une menace urgente sur tes zones reste visible, même filtrée.',
    en: 'An urgent threat on your zones stays visible, even when filtered out.',
    es: 'Una amenaza urgente en tus zonas sigue visible, aunque la filtres.',
    de: 'Eine dringende Bedrohung deiner Zonen bleibt sichtbar, auch gefiltert.',
    pt: 'Uma ameaça urgente nas suas zonas continua visível, mesmo filtrada.',
  },
  /**
   * Portée du réglage, DISCIPLINE PAR DISCIPLINE (spec l.922 : « Les réglages
   * persistent par activité » ; `ACTIVITY_SCOPE.mapLayers`). Deux clés plutôt
   * qu'une avec un jeton `{activity}` : le nom de la discipline se traduit, et
   * l'injecter en clair produirait « mémorisés pour Run » en allemand.
   */
  filtersScopeRun: {
    fr: 'Ces filtres sont mémorisés pour la course.',
    en: 'These filters are saved for running.',
    es: 'Estos filtros se guardan para carrera.',
    de: 'Diese Filter gelten fürs Laufen.',
    pt: 'Estes filtros ficam salvos para corrida.',
  },
  filtersScopeBike: {
    fr: 'Ces filtres sont mémorisés pour le vélo.',
    en: 'These filters are saved for cycling.',
    es: 'Estos filtros se guardan para bici.',
    de: 'Diese Filter gelten fürs Radfahren.',
    pt: 'Estes filtros ficam salvos para bike.',
  },
  /** Remise à l'état par défaut (`MAP_LAYER_DEFAULT_VISIBLE` : tout visible). */
  filtersResetAll: {
    fr: 'Tout réafficher',
    en: 'Show everything',
    es: 'Mostrar todo',
    de: 'Alles anzeigen',
    pt: 'Mostrar tudo',
  },
  /** a11y — état d'un interrupteur, lu APRÈS le libellé de la couche. */
  filterOnA11y: {
    fr: 'affiché',
    en: 'shown',
    es: 'visible',
    de: 'sichtbar',
    pt: 'visível',
  },
  filterOffA11y: {
    fr: 'masqué',
    en: 'hidden',
    es: 'oculto',
    de: 'ausgeblendet',
    pt: 'oculto',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // E11 — LES DEUX ÉTATS DE CARTE QUI N'AVAIENT AUCUNE COPIE (spec l.889-894),
  // 28/07/2026. Les autres états de la spec sont DÉJÀ écrits plus haut :
  // localisation refusée (`dataNoteLocationDenied`), GPS faible/imprécis
  // (`dataNoteLocationStale`), aucune zone (`emptyNone*`), échec de lecture
  // (`emptyFailed*`). Il en manquait deux, et pas des moindres : les deux qui
  // parlent quand le produit ne peut PLUS rien affirmer.
  // ══════════════════════════════════════════════════════════════════════════
  /**
   * HORS LIGNE (spec l.892). Dit exactement deux choses vraies : ce qu'on voit
   * date d'avant, et courir reste possible — le GPS n'a jamais eu besoin du
   * réseau. Ne promet PAS que la capture sera validée : c'est le serveur qui
   * tranche, et il le fera au retour du réseau (`activity_upload_queued`).
   */
  offlineNote: {
    fr: 'Hors ligne — carte en mémoire. Tu peux courir : ta sortie partira au retour du réseau.',
    en: 'Offline — cached map. You can still run: your activity uploads when the network is back.',
    es: 'Sin conexión: mapa en caché. Puedes correr, tu salida se enviará al volver la red.',
    de: 'Offline — Karte aus dem Cache. Du kannst laufen: Deine Aktivität geht raus, sobald das Netz da ist.',
    pt: 'Offline — mapa em cache. Você pode correr: sua atividade sobe quando a rede voltar.',
  },
  /**
   * ACTIVITÉ INTERROMPUE retrouvée (spec l.894 : bandeau « Reprendre
   * l'activité »). Le bandeau de la CARTE, pas la feuille de reprise de l'écran
   * de course (`runGps.restoreTitle`) : ici on ne sait rien de plus que « il y
   * en a une », et on ne l'affirme pas autrement.
   */
  resumeActivityBanner: {
    fr: 'Une sortie est restée en cours',
    en: 'An activity is still running',
    es: 'Una salida sigue en curso',
    de: 'Eine Aktivität läuft noch',
    pt: 'Uma atividade continua em andamento',
  },
  resumeActivityCta: {
    fr: 'Reprendre',
    en: 'Resume',
    es: 'Reanudar',
    de: 'Fortsetzen',
    pt: 'Retomar',
  },
  resumeActivityA11y: {
    fr: 'Reprendre la sortie restée en cours',
    en: 'Resume the activity still running',
    es: 'Reanudar la salida que sigue en curso',
    de: 'Die noch laufende Aktivität fortsetzen',
    pt: 'Retomar a atividade que continua em andamento',
  },
});
