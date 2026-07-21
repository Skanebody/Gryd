/**
 * GRYD — i18n : catalogue du domaine HISTORIQUE (liste /historique, détail
 * /course/[id], /performance, /territoire). Parité 5 langues imposée par le
 * type Entry — une langue manquante = erreur TypeScript.
 *
 * Invariants jamais traduits : GRYD, GO, GRYD Verified/Verify, Crew, @handles,
 * noms propres (République, Bastille…), 2D/3D, km, min. Chips/CTA courts dans
 * TOUTES les langues (§A — troncature interdite à 375px). Les {placeholders}
 * sont identiques dans les 5 langues. Vocabulaire aligné sur les catalogues
 * existants : boucle→Schleife/bucle/loop, trace→Spur/trazo/traço,
 * territoire→Gebiet, ALLURE→PACE (de).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── /historique : en-tête ─────────────────────────────────────────────────
  historiqueTitle: {
    fr: 'Historique',
    en: 'History',
    es: 'Historial',
    de: 'Verlauf',
    pt: 'Histórico',
  },
  historiqueKicker: {
    fr: 'TES COURSES',
    en: 'YOUR RUNS',
    es: 'TUS CARRERAS',
    de: 'DEINE LÄUFE',
    pt: 'SUAS CORRIDAS',
  },
  historiqueSubtitle: {
    fr: 'Tous tes parcours : le tracé, l’effort et ce qu’il a changé sur le terrain.',
    en: 'All your routes: the trace, the effort, and what it changed on the ground.',
    es: 'Todos tus recorridos: el trazado, el esfuerzo y lo que cambió sobre el terreno.',
    de: 'Alle deine Läufe: die Spur, der Einsatz und was sie am Boden verändert haben.',
    pt: 'Todos os seus percursos: o traçado, o esforço e o que mudou no terreno.',
  },

  // ─── /historique : filtres (chips §A — courts dans TOUTES les langues) ─────
  filterAll: { fr: 'Tout', en: 'All', es: 'Todo', de: 'Alle', pt: 'Tudo' },
  filterConquest: {
    fr: 'Conquêtes',
    en: 'Conquests',
    es: 'Conquistas',
    de: 'Eroberungen',
    pt: 'Conquistas',
  },
  /** de « Abwehr » : mot du sport, bien plus court que « Verteidigungen ». */
  filterDefense: {
    fr: 'Défenses',
    en: 'Defenses',
    es: 'Defensas',
    de: 'Abwehr',
    pt: 'Defesas',
  },
  filterRoute: { fr: 'Routes', en: 'Routes', es: 'Rutas', de: 'Routen', pt: 'Rotas' },
  filterStats: {
    fr: 'Stats seules',
    en: 'Stats only',
    es: 'Solo stats',
    de: 'Nur Stats',
    pt: 'Só stats',
  },
  a11yFilter: {
    fr: 'Filtre {label}, {n} courses',
    en: 'Filter {label}, {n} runs',
    es: 'Filtro {label}, {n} carreras',
    de: 'Filter {label}, {n} Läufe',
    pt: 'Filtro {label}, {n} corridas',
  },

  // ─── /historique : compteur + états vides ──────────────────────────────────
  countRunsOne: {
    fr: '{n} COURSE',
    en: '{n} RUN',
    es: '{n} CARRERA',
    de: '{n} LAUF',
    pt: '{n} CORRIDA',
  },
  countRunsMany: {
    fr: '{n} COURSES',
    en: '{n} RUNS',
    es: '{n} CARRERAS',
    de: '{n} LÄUFE',
    pt: '{n} CORRIDAS',
  },
  emptyRealUser: {
    fr: 'Tes courses apparaîtront ici après ta première capture. Lance-toi !',
    en: 'Your runs will show up here after your first capture. Get out there!',
    es: 'Tus carreras aparecerán aquí tras tu primera captura. ¡Lánzate!',
    de: 'Deine Läufe erscheinen hier nach deiner ersten Eroberung. Leg los!',
    pt: 'Suas corridas vão aparecer aqui depois da sua primeira captura. Bora!',
  },
  emptyFilter: {
    fr: 'Aucune course dans ce filtre pour l’instant.',
    en: 'No runs in this filter yet.',
    es: 'Aún no hay carreras en este filtro.',
    de: 'Noch keine Läufe in diesem Filter.',
    pt: 'Ainda não há corridas neste filtro.',
  },
  /**
   * Pas connecté : l'historique vit sur le compte. On n'affiche NI courses
   * fabriquées ni écran blanc — on nomme ce qui manque + 1 CTA (§A).
   */
  emptySignedOut: {
    fr: 'Tes courses sont liées à ton compte. Connecte-toi pour les retrouver ici.',
    en: 'Your runs live on your account. Sign in to find them here.',
    es: 'Tus carreras están vinculadas a tu cuenta. Inicia sesión para verlas aquí.',
    de: 'Deine Läufe hängen an deinem Konto. Melde dich an, um sie hier zu sehen.',
    pt: 'Suas corridas estão ligadas à sua conta. Entre para encontrá-las aqui.',
  },
  emptySignedOutCta: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  a11ySignIn: {
    fr: 'Se connecter pour retrouver ses courses',
    en: 'Sign in to find your runs',
    es: 'Iniciar sesión para ver tus carreras',
    de: 'Anmelden, um deine Läufe zu sehen',
    pt: 'Entrar para ver suas corridas',
  },
  /** Course ouverte par un lien alors qu'aucune course réelle n'existe encore. */
  runNotYours: {
    fr: 'Cette course n’est pas dans ton historique. Tes courses apparaîtront ici après ta première sortie enregistrée.',
    en: 'This run isn’t in your history. Your runs will appear here after your first recorded outing.',
    es: 'Esta carrera no está en tu historial. Tus carreras aparecerán aquí tras tu primera salida registrada.',
    de: 'Dieser Lauf ist nicht in deinem Verlauf. Deine Läufe erscheinen hier nach deinem ersten aufgezeichneten Lauf.',
    pt: 'Esta corrida não está no seu histórico. Suas corridas aparecerão aqui após a primeira saída registrada.',
  },

  // ─── /course/[id] : introuvable ────────────────────────────────────────────
  runFallbackTitle: { fr: 'Course', en: 'Run', es: 'Carrera', de: 'Lauf', pt: 'Corrida' },
  runGone: {
    fr: 'Cette course n’est plus disponible.',
    en: 'This run is no longer available.',
    es: 'Esta carrera ya no está disponible.',
    de: 'Dieser Lauf ist nicht mehr verfügbar.',
    pt: 'Esta corrida não está mais disponível.',
  },

  // ─── /course/[id] : effort héro (MAJUSCULES conservées) ────────────────────
  statDistance: { fr: 'DISTANCE', en: 'DISTANCE', es: 'DISTANCIA', de: 'DISTANZ', pt: 'DISTÂNCIA' },
  statDuration: { fr: 'DURÉE', en: 'TIME', es: 'DURACIÓN', de: 'DAUER', pt: 'DURAÇÃO' },
  /** « Pace » est le mot des coureurs allemands (cohérent courseLive). */
  statPace: { fr: 'ALLURE', en: 'PACE', es: 'RITMO', de: 'PACE', pt: 'RITMO' },

  // ─── Statuts GRYD Verify (pastilles) ───────────────────────────────────────
  /** « GRYD Verified » = invariant de marque : identique dans les 5 langues. */
  verifyVerified: {
    fr: 'GRYD Verified',
    en: 'GRYD Verified',
    es: 'GRYD Verified',
    de: 'GRYD Verified',
    pt: 'GRYD Verified',
  },
  verifyPartial: {
    fr: 'Capture partielle',
    en: 'Partial capture',
    es: 'Captura parcial',
    de: 'Teil-Eroberung',
    pt: 'Captura parcial',
  },
  verifyStatsOnly: {
    fr: 'Stats seules',
    en: 'Stats only',
    es: 'Solo stats',
    de: 'Nur Stats',
    pt: 'Só stats',
  },
  verifyRejected: {
    fr: 'Refusé',
    en: 'Rejected',
    es: 'Rechazado',
    de: 'Abgelehnt',
    pt: 'Recusado',
  },

  // ─── États de segment (colonne droite des rangées) ─────────────────────────
  segValid: { fr: 'Validé', en: 'Valid', es: 'Válido', de: 'Gültig', pt: 'Válido' },
  segWeakGps: {
    fr: 'GPS faible · exclu',
    en: 'Weak GPS · excluded',
    es: 'GPS débil · excluido',
    de: 'GPS schwach · raus',
    pt: 'GPS fraco · excluído',
  },
  segPause: { fr: 'Pause', en: 'Pause', es: 'Pausa', de: 'Pause', pt: 'Pausa' },

  // ─── Motifs de refus honnêtes (bloc raison) ────────────────────────────────
  refusalLoopOpen: {
    fr: 'Boucle non fermée',
    en: 'Loop not closed',
    es: 'Bucle sin cerrar',
    de: 'Schleife nicht geschlossen',
    pt: 'Loop não fechado',
  },
  refusalZoneThin: {
    fr: 'Zone trop fine',
    en: 'Zone too thin',
    es: 'Zona demasiado fina',
    de: 'Zone zu schmal',
    pt: 'Zona fina demais',
  },
  refusalGpsUnstable: {
    fr: 'GPS instable → stats only',
    en: 'Unstable GPS → stats only',
    es: 'GPS inestable → solo stats',
    de: 'GPS instabil → nur Stats',
    pt: 'GPS instável → só stats',
  },
  refusalSpeed: {
    fr: 'Vitesse incohérente → refusé',
    en: 'Inconsistent speed → rejected',
    es: 'Velocidad incoherente → rechazado',
    de: 'Tempo unplausibel → abgelehnt',
    pt: 'Velocidade incoerente → recusado',
  },

  // ─── /course/[id] : scène Parcours (toggle 2D/3D invariant) ────────────────
  routeSection: {
    fr: 'LE PARCOURS',
    en: 'THE ROUTE',
    es: 'EL RECORRIDO',
    de: 'DIE STRECKE',
    pt: 'O PERCURSO',
  },
  a11yRouteToggle: {
    fr: 'Voir le parcours en 2D ou en 3D',
    en: 'View the route in 2D or 3D',
    es: 'Ver el recorrido en 2D o en 3D',
    de: 'Strecke in 2D oder 3D ansehen',
    pt: 'Ver o percurso em 2D ou 3D',
  },

  // ─── /course/[id] : détail du calcul (scène dépliable §B.5) ────────────────
  a11yCalcDetail: {
    fr: 'Détail du calcul de cette course',
    en: 'Calculation detail for this run',
    es: 'Detalle del cálculo de esta carrera',
    de: 'Berechnung dieses Laufs im Detail',
    pt: 'Detalhe do cálculo desta corrida',
  },
  calcTitle: {
    fr: 'Détail du calcul',
    en: 'Calculation detail',
    es: 'Detalle del cálculo',
    de: 'Berechnung im Detail',
    pt: 'Detalhe do cálculo',
  },
  calcSubOpen: {
    fr: 'Comment cette course a compté',
    en: 'How this run counted',
    es: 'Cómo contó esta carrera',
    de: 'So hat dieser Lauf gezählt',
    pt: 'Como esta corrida contou',
  },
  calcSubClosed: {
    fr: 'Voir comment cette course a compté',
    en: 'See how this run counted',
    es: 'Ver cómo contó esta carrera',
    de: 'Sehen, wie dieser Lauf gezählt hat',
    pt: 'Ver como esta corrida contou',
  },
  calcZonesTrace: {
    fr: 'Zones par la trace',
    en: 'Zones from the trace',
    es: 'Zonas por el trazo',
    de: 'Zonen durch die Spur',
    pt: 'Zonas pelo traço',
  },
  calcZonesLoop: {
    fr: 'Zones par la boucle',
    en: 'Zones from the loop',
    es: 'Zonas por el bucle',
    de: 'Zonen durch die Schleife',
    pt: 'Zonas pelo loop',
  },
  calcClosureGain: {
    fr: 'Gain de la fermeture',
    en: 'Gain from closing',
    es: 'Ganancia del cierre',
    de: 'Bonus fürs Schließen',
    pt: 'Ganho do fechamento',
  },
  calcExcludedSegments: {
    fr: 'Segments exclus',
    en: 'Excluded segments',
    es: 'Segmentos excluidos',
    de: 'Ausgeschlossene Segmente',
    pt: 'Segmentos excluídos',
  },
  /** Valeur de la rangée « Segments exclus » quand il n'y en a aucun. */
  calcNone: { fr: 'aucun', en: 'none', es: 'ninguno', de: 'keine', pt: 'nenhum' },
  a11ySchemaLoop: {
    fr: 'La trace seule capture le passage ; la boucle ajoute l’intérieur.',
    en: 'The trace alone captures your path; the loop adds the inside.',
    es: 'El trazo solo captura el paso; el bucle añade el interior.',
    de: 'Die Spur allein erfasst nur den Weg; die Schleife holt das Innere dazu.',
    pt: 'O traço sozinho captura a passagem; o loop adiciona o interior.',
  },
  calcLink: {
    fr: 'Comment GRYD calcule tes zones',
    en: 'How GRYD counts your zones',
    es: 'Cómo GRYD calcula tus zonas',
    de: 'Wie GRYD deine Zonen zählt',
    pt: 'Como o GRYD calcula suas zonas',
  },
  a11yOpenCalcPage: {
    fr: 'Ouvrir la page Comment GRYD calcule tes zones',
    en: 'Open the How GRYD counts your zones page',
    es: 'Abrir la página Cómo GRYD calcula tus zonas',
    de: 'Seite „Wie GRYD deine Zonen zählt“ öffnen',
    pt: 'Abrir a página Como o GRYD calcula suas zonas',
  },

  // ─── /course/[id] : sections + CTA ─────────────────────────────────────────
  impactSection: {
    fr: 'IMPACT SUR LE TERRAIN',
    en: 'IMPACT ON THE GROUND',
    es: 'IMPACTO EN EL TERRENO',
    de: 'IMPACT AM BODEN',
    pt: 'IMPACTO NO TERRENO',
  },
  segmentsSection: {
    fr: 'SEGMENTS',
    en: 'SEGMENTS',
    es: 'SEGMENTOS',
    de: 'SEGMENTE',
    pt: 'SEGMENTOS',
  },
  share: { fr: 'Partager', en: 'Share', es: 'Compartir', de: 'Teilen', pt: 'Compartilhar' },
  a11yShareRun: {
    fr: 'Partager cette course',
    en: 'Share this run',
    es: 'Compartir esta carrera',
    de: 'Diesen Lauf teilen',
    pt: 'Compartilhar esta corrida',
  },
  /** CTA carte — court partout (§A) : « Zur Karte » plutôt qu'une phrase. */
  seeOnMap: {
    fr: 'Voir sur la carte',
    en: 'See on the map',
    es: 'Ver en el mapa',
    de: 'Zur Karte',
    pt: 'Ver no mapa',
  },
  reportProblem: {
    fr: 'Signaler un problème',
    en: 'Report a problem',
    es: 'Informar de un problema',
    de: 'Problem melden',
    pt: 'Relatar um problema',
  },

  // ─── /performance ──────────────────────────────────────────────────────────
  perfTitle: {
    fr: 'Performance',
    en: 'Performance',
    es: 'Rendimiento',
    de: 'Leistung',
    pt: 'Desempenho',
  },
  perfKicker: {
    fr: 'TA FORME · TON IMPACT',
    en: 'YOUR FORM · YOUR IMPACT',
    es: 'TU FORMA · TU IMPACTO',
    de: 'DEINE FORM · DEIN IMPACT',
    pt: 'SUA FORMA · SEU IMPACTO',
  },
  perfDemoNote: {
    fr: 'Données de démonstration — pas encore tes vrais chiffres.',
    en: 'Demo data — not your real numbers yet.',
    es: 'Datos de demostración — aún no son tus cifras reales.',
    de: 'Demo-Daten — noch nicht deine echten Zahlen.',
    pt: 'Dados de demonstração — ainda não são seus números reais.',
  },
  perfVerifyLink: {
    fr: 'Voir GRYD Verify · sources connectées',
    en: 'See GRYD Verify · connected sources',
    es: 'Ver GRYD Verify · fuentes conectadas',
    de: 'GRYD Verify · verbundene Quellen',
    pt: 'Ver GRYD Verify · fontes conectadas',
  },
  a11yPerfVerifyLink: {
    fr: 'Voir GRYD Verify et les sources connectées',
    en: 'See GRYD Verify and connected sources',
    es: 'Ver GRYD Verify y las fuentes conectadas',
    de: 'GRYD Verify und verbundene Quellen ansehen',
    pt: 'Ver GRYD Verify e as fontes conectadas',
  },

  // ─── /territoire (cohérent profil : territoire → Gebiet) ───────────────────
  a11yBackProfile: {
    fr: 'Revenir au profil',
    en: 'Back to profile',
    es: 'Volver al perfil',
    de: 'Zurück zum Profil',
    pt: 'Voltar ao perfil',
  },
  territoryKicker: {
    fr: 'MON TERRITOIRE',
    en: 'MY TERRITORY',
    es: 'MI TERRITORIO',
    de: 'MEIN GEBIET',
    pt: 'MEU TERRITÓRIO',
  },
  territoryOf: {
    fr: 'Territoire de {name}',
    en: '{name}’s territory',
    es: 'Territorio de {name}',
    de: 'Gebiet von {name}',
    pt: 'Território de {name}',
  },
  zonesHeld: {
    fr: '{n} zones tenues',
    en: '{n} zones held',
    es: '{n} zonas controladas',
    de: '{n} Zonen gehalten',
    pt: '{n} zonas mantidas',
  },
  contestedBorders: {
    fr: '{n} frontières contestées',
    en: '{n} contested borders',
    es: '{n} fronteras disputadas',
    de: '{n} umkämpfte Grenzen',
    pt: '{n} fronteiras disputadas',
  },
  sectionCities: { fr: 'VILLES', en: 'CITIES', es: 'CIUDADES', de: 'STÄDTE', pt: 'CIDADES' },
  sectionDefend: {
    fr: 'À DÉFENDRE',
    en: 'TO DEFEND',
    es: 'A DEFENDER',
    de: 'ZU VERTEIDIGEN',
    pt: 'A DEFENDER',
  },
  sectionOpenRoutes: {
    fr: 'ROUTES OUVERTES',
    en: 'OPEN ROUTES',
    es: 'RUTAS ABIERTAS',
    de: 'OFFENE ROUTEN',
    pt: 'ROTAS ABERTAS',
  },
  sectionRecords: {
    fr: 'RECORDS TERRITOIRE',
    en: 'TERRITORY RECORDS',
    es: 'RÉCORDS DE TERRITORIO',
    de: 'GEBIETS-REKORDE',
    pt: 'RECORDES DE TERRITÓRIO',
  },
  seeAll: { fr: 'Voir tout', en: 'See all', es: 'Ver todo', de: 'Alle zeigen', pt: 'Ver tudo' },
  a11ySeeAll: {
    fr: 'Voir tout — {title}',
    en: 'See all — {title}',
    es: 'Ver todo — {title}',
    de: 'Alle zeigen — {title}',
    pt: 'Ver tudo — {title}',
  },
  zonesCount: {
    fr: '{n} zones',
    en: '{n} zones',
    es: '{n} zonas',
    de: '{n} Zonen',
    pt: '{n} zonas',
  },
  defend: {
    fr: 'Défendre',
    en: 'Defend',
    es: 'Defender',
    de: 'Verteidigen',
    pt: 'Defender',
  },
  a11yDefend: {
    fr: 'Défendre {name}',
    en: 'Defend {name}',
    es: 'Defender {name}',
    de: '{name} verteidigen',
    pt: 'Defender {name}',
  },
  a11yShareTerritory: {
    fr: 'Partager mon territoire',
    en: 'Share my territory',
    es: 'Compartir mi territorio',
    de: 'Mein Gebiet teilen',
    pt: 'Compartilhar meu território',
  },
});
