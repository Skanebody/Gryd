/**
 * GRYD — i18n : catalogue du domaine « result-partage ».
 * Écran Résultat de course (app/course-result.tsx : héros, détails, calcul,
 * frontière crew ouverte/fermée), écran Partage (app/partage.tsx : formats,
 * styles, CTA, toasts, headlines) et templates de cards (share/templates.tsx).
 *
 * INVARIANTS (jamais traduits, donc PAS ici) : GRYD, GO, GRYD VERIFIED, Crew
 * (concept), War Room, Social Run (nom de mode), GPS, km, h, pts « /km »,
 * noms propres (République, Paris Est, KORO, LES FOULÉES 9³, PARIS LEAGUE),
 * « Routes » (famille de badges), « Story » (format social, identique partout).
 *
 * §A CONTRAIGNANT : chips/CTA/labels COURTS dans les 5 langues — l'allemand
 * est reformulé concis (Abwehr, Schleife zu, Als Story teilen…), jamais un
 * composé à rallonge qui risquerait la troncature à 375 px.
 */
import type { RejectReason } from '@klaim/shared';
import { defineCatalog } from '../types';
import type { Entry } from '../types';

export const C = defineCatalog({
  // ── AMENDEMENT-41 : LE RELAIS ─────────────────────────────────────────────
  coCapturedNote: {
    fr: '{n} zones courues à plusieurs — payées selon ton rang d’arrivée',
    en: '{n} zones run together — paid by your finishing rank',
    es: '{n} zonas corridas en grupo — pagadas según tu puesto',
    de: '{n} Zonen gemeinsam gelaufen — bezahlt nach deinem Rang',
    pt: '{n} zonas corridas em grupo — pagas pelo seu lugar',
  },
  // Crew réel 3/3 : la conséquence COLLECTIVE d'une capture — vraie depuis
  // l'union carte (2/3) : les zones du coureur sont chartreuse chez ses
  // coéquipiers. Deux entrées (1 / n) : l'interpolation ne conjugue pas.
  crewImpactOne: {
    fr: 'Capturées pour ton crew — ton coéquipier les voit sur sa carte',
    en: 'Captured for your crew — your teammate sees them on their map',
    es: 'Capturadas para tu crew — tu compañero las ve en su mapa',
    de: 'Für deine Crew erobert — dein Teamkollege sieht sie auf seiner Karte',
    pt: 'Capturadas para o seu crew — seu colega as vê no mapa dele',
  },
  crewImpactMany: {
    fr: 'Capturées pour ton crew — {n} coéquipiers les voient sur leur carte',
    en: 'Captured for your crew — {n} teammates see them on their maps',
    es: 'Capturadas para tu crew — {n} compañeros las ven en sus mapas',
    de: 'Für deine Crew erobert — {n} Teamkollegen sehen sie auf ihren Karten',
    pt: 'Capturadas para o seu crew — {n} colegas as veem em seus mapas',
  },
  // ── Résultat — barre + titres héros ──
  barKicker: {
    fr: 'RÉSULTAT DE COURSE',
    en: 'RUN RESULT',
    es: 'RESULTADO DE CARRERA',
    de: 'LAUF-ERGEBNIS',
    pt: 'RESULTADO DA CORRIDA',
  },
  heroPrivate: {
    fr: 'COURSE ENREGISTRÉE',
    en: 'RUN SAVED',
    es: 'CARRERA GUARDADA',
    de: 'LAUF GESPEICHERT',
    pt: 'CORRIDA SALVA',
  },
  heroDone: {
    fr: 'COURSE TERMINÉE',
    en: 'RUN COMPLETE',
    es: 'CARRERA TERMINADA',
    de: 'LAUF BEENDET',
    pt: 'CORRIDA CONCLUÍDA',
  },
  heroDefended: {
    fr: 'ZONE DÉFENDUE',
    en: 'ZONE DEFENDED',
    es: 'ZONA DEFENDIDA',
    de: 'ZONE VERTEIDIGT',
    pt: 'ZONA DEFENDIDA',
  },
  heroExtended: {
    fr: 'TERRITOIRE ÉTENDU',
    en: 'TERRITORY EXPANDED',
    es: 'TERRITORIO AMPLIADO',
    de: 'GEBIET ERWEITERT',
    pt: 'TERRITÓRIO EXPANDIDO',
  },
  // §11 honnêteté : le SERVEUR a jugé la capture invalide (status 'rejected').
  // Le titre le DIT — jamais « TERRITOIRE ÉTENDU » + « +0 zones » (qui laissait
  // croire à une prise). La raison précise vit dans REJECT_REASON_COPY (bas).
  heroRejected: {
    fr: 'CAPTURE REFUSÉE',
    en: 'CAPTURE REFUSED',
    es: 'CAPTURA RECHAZADA',
    de: 'EROBERUNG ABGELEHNT',
    pt: 'CAPTURA RECUSADA',
  },
  // §11 — course SIGNALÉE par GRYD Verify (trust trop bas) : non créditée, en
  // revue. Distincte d'un refus gameplay — pas de raison de gameplay ici.
  heroFlagged: {
    fr: 'COURSE À VÉRIFIER',
    en: 'RUN UNDER REVIEW',
    es: 'CARRERA POR VERIFICAR',
    de: 'LAUF ZU PRÜFEN',
    pt: 'CORRIDA A VERIFICAR',
  },
  flaggedWhy: {
    fr: 'GRYD Verify examine cette course — capture non créditée.',
    en: 'GRYD Verify is reviewing this run — capture not credited.',
    es: 'GRYD Verify está revisando esta carrera — captura no acreditada.',
    de: 'GRYD Verify prüft diesen Lauf — Eroberung nicht gutgeschrieben.',
    pt: 'O GRYD Verify está revisando esta corrida — captura não creditada.',
  },

  // ── Pills d'état (hors « GRYD VERIFIED », invariant) ──
  statsOnlyPill: {
    fr: 'Compte en stats',
    en: 'Counts as stats',
    es: 'Cuenta en stats',
    de: 'Zählt als Stats',
    pt: 'Conta nas stats',
  },
  statsSavedPill: {
    fr: 'Stats enregistrées',
    en: 'Stats saved',
    es: 'Stats guardadas',
    de: 'Stats gespeichert',
    pt: 'Stats salvas',
  },

  // ── KPI géant + le pourquoi ──
  zonesCaptured: {
    fr: 'ZONES CAPTURÉES',
    en: 'ZONES CAPTURED',
    es: 'ZONAS CAPTURADAS',
    de: 'ZONEN EROBERT',
    pt: 'ZONAS CAPTURADAS',
  },
  loopClosedBurst: {
    fr: "Boucle fermée · +{n} zones d'un coup",
    en: 'Loop closed · +{n} zones at once',
    es: 'Bucle cerrado · +{n} zonas de golpe',
    de: 'Schleife zu · +{n} Zonen auf einmal',
    pt: 'Loop fechado · +{n} zonas de uma vez',
  },
  almostClosed: {
    fr: 'Boucle presque fermée · Il manque {m} m',
    en: 'Loop almost closed · {m} m to go',
    es: 'Bucle casi cerrado · Faltan {m} m',
    de: 'Schleife fast zu · Noch {m} m',
    pt: 'Loop quase fechado · Faltam {m} m',
  },
  noZones: {
    fr: 'Aucune zone capturée — ferme une boucle pour prendre la zone.',
    en: 'No zones captured — close a loop to take the zone.',
    es: 'Ninguna zona capturada: cierra un bucle para tomar la zona.',
    de: 'Keine Zone erobert — schließ eine Schleife, um die Zone zu holen.',
    pt: 'Nenhuma zona capturada — feche um loop para tomar a zona.',
  },
  privateLine: {
    fr: 'Course privée · visible par toi seul',
    en: 'Private run · visible only to you',
    es: 'Carrera privada · solo la ves tú',
    de: 'Privater Lauf · nur du siehst ihn',
    pt: 'Corrida privada · só você vê',
  },
  socialRunLine: {
    fr: 'Social Run · {km} km',
    en: 'Social Run · {km} km',
    es: 'Social Run · {km} km',
    de: 'Social Run · {km} km',
    pt: 'Social Run · {km} km',
  },
  /** Nom de zone neutre quand aucun secteur réel n'est câblé (jamais un faux nom). */
  zoneFallback: {
    fr: 'Zone',
    en: 'Zone',
    es: 'Zona',
    de: 'Zone',
    pt: 'Zona',
  },

  // ── Badge (bandeau niveau 1 + section détails) ──
  badgeUnlockedBanner: {
    fr: 'Badge débloqué · {name}',
    en: 'Badge unlocked · {name}',
    es: 'Badge desbloqueado · {name}',
    de: 'Badge freigeschaltet · {name}',
    pt: 'Badge desbloqueado · {name}',
  },
  badgeUnlockedA11y: {
    fr: 'Badge débloqué : {name}. Voir le badge',
    en: 'Badge unlocked: {name}. View badge',
    es: 'Badge desbloqueado: {name}. Ver el badge',
    de: 'Badge freigeschaltet: {name}. Badge ansehen',
    pt: 'Badge desbloqueado: {name}. Ver o badge',
  },
  badgeUnlockedKicker: {
    fr: 'BADGE DÉBLOQUÉ',
    en: 'BADGE UNLOCKED',
    es: 'BADGE DESBLOQUEADO',
    de: 'BADGE FREIGESCHALTET',
    pt: 'BADGE DESBLOQUEADO',
  },
  /** « Routes » = famille de badges (invariant). */
  badgeReward: {
    fr: 'Cadre de profil Routes',
    en: 'Routes profile frame',
    es: 'Marco de perfil Routes',
    de: 'Routes-Profilrahmen',
    pt: 'Moldura de perfil Routes',
  },
  queuedNote: {
    fr: 'Envoi dès que possible.',
    en: 'Sending as soon as possible.',
    es: 'Se enviará en cuanto sea posible.',
    de: 'Wird gesendet, sobald es geht.',
    pt: 'Enviamos assim que possível.',
  },

  // ── Actions du Résultat ──
  share: {
    fr: 'Partager',
    en: 'Share',
    es: 'Compartir',
    de: 'Teilen',
    pt: 'Compartilhar',
  },
  seeTerritory: {
    fr: 'Voir mon territoire',
    en: 'See my territory',
    es: 'Ver mi territorio',
    de: 'Mein Gebiet ansehen',
    pt: 'Ver meu território',
  },
  hideDetails: {
    fr: 'Masquer les détails',
    en: 'Hide details',
    es: 'Ocultar detalles',
    de: 'Details ausblenden',
    pt: 'Ocultar detalhes',
  },
  howIWon: {
    fr: "Comment j'ai gagné ces zones",
    en: 'How I won these zones',
    es: 'Cómo gané estas zonas',
    de: 'So habe ich die Zonen geholt',
    pt: 'Como ganhei essas zonas',
  },
  seeMyStats: {
    fr: 'Voir mes stats',
    en: 'See my stats',
    es: 'Ver mis stats',
    de: 'Meine Stats ansehen',
    pt: 'Ver minhas stats',
  },

  // ── Détails : Impact / stats ──
  impactKicker: {
    fr: 'IMPACT',
    en: 'IMPACT',
    es: 'IMPACTO',
    de: 'IMPACT',
    pt: 'IMPACTO',
  },
  detailsKicker: {
    fr: 'DÉTAILS',
    en: 'DETAILS',
    es: 'DETALLES',
    de: 'DETAILS',
    pt: 'DETALHES',
  },
  totalLabel: {
    fr: 'TOTAL',
    en: 'TOTAL',
    es: 'TOTAL',
    de: 'GESAMT',
    pt: 'TOTAL',
  },
  ofWhichLoop: {
    fr: 'dont {n} en boucle',
    en: 'incl. {n} from the loop',
    es: '{n} de ellas en bucle',
    de: 'davon {n} per Schleife',
    pt: '{n} delas no loop',
  },
  timeLabel: {
    fr: 'TEMPS',
    en: 'TIME',
    es: 'TIEMPO',
    de: 'ZEIT',
    pt: 'TEMPO',
  },
  paceLabel: {
    fr: 'ALLURE',
    en: 'PACE',
    es: 'RITMO',
    de: 'PACE',
    pt: 'PACE',
  },
  privateNote: {
    fr: "Course privée — rien n'apparaît sur la carte ni dans le feed.",
    en: 'Private run — nothing shows on the map or in the feed.',
    es: 'Carrera privada: nada aparece en el mapa ni en el feed.',
    de: 'Privater Lauf — nichts erscheint auf der Karte oder im Feed.',
    pt: 'Corrida privada — nada aparece no mapa nem no feed.',
  },
  socialNote: {
    fr: 'Social Run — stats et badges comptent, aucune capture.',
    en: 'Social Run — stats and badges count, no capture.',
    es: 'Social Run: stats y badges cuentan, sin captura.',
    de: 'Social Run — Stats und Badges zählen, keine Eroberung.',
    pt: 'Social Run — stats e badges contam, sem captura.',
  },

  // ── Détails : analyse boucle ──
  analysisKicker: {
    fr: 'ANALYSE',
    en: 'ANALYSIS',
    es: 'ANÁLISIS',
    de: 'ANALYSE',
    pt: 'ANÁLISE',
  },
  loopGainNote: {
    fr: 'Boucle fermée : +{n} zones gagnées.',
    en: 'Loop closed: +{n} zones won.',
    es: 'Bucle cerrado: +{n} zonas ganadas.',
    de: 'Schleife zu: +{n} Zonen geholt.',
    pt: 'Loop fechado: +{n} zonas ganhas.',
  },
  loopMakesZoneTitle: {
    fr: 'LA BOUCLE FAIT LA ZONE',
    en: 'THE LOOP MAKES THE ZONE',
    es: 'EL BUCLE HACE LA ZONA',
    de: 'DIE SCHLEIFE MACHT DIE ZONE',
    pt: 'O LOOP FAZ A ZONA',
  },
  loopSideTrace: {
    fr: 'LE TRAIT',
    en: 'THE LINE',
    es: 'EL TRAZO',
    de: 'DIE LINIE',
    pt: 'O TRAÇO',
  },
  loopSideLoop: {
    fr: 'LA BOUCLE',
    en: 'THE LOOP',
    es: 'EL BUCLE',
    de: 'DIE SCHLEIFE',
    pt: 'O LOOP',
  },

  // ── Détails : « Comment est calculé ce résultat ? » (§B.4) ──
  calcQuestion: {
    fr: 'Comment est calculé ce résultat ?',
    en: 'How is this result calculated?',
    es: '¿Cómo se calcula este resultado?',
    de: 'Wie wird das berechnet?',
    pt: 'Como esse resultado é calculado?',
  },
  calcHideA11y: {
    fr: 'Masquer le calcul du résultat',
    en: 'Hide the result calculation',
    es: 'Ocultar el cálculo del resultado',
    de: 'Berechnung ausblenden',
    pt: 'Ocultar o cálculo do resultado',
  },
  traceOnly: {
    fr: 'Trace seule',
    en: 'Trace only',
    es: 'Solo el trazo',
    de: 'Nur die Spur',
    pt: 'Só o traço',
  },
  loopClosedRow: {
    fr: 'Boucle fermée',
    en: 'Loop closed',
    es: 'Bucle cerrado',
    de: 'Schleife zu',
    pt: 'Loop fechado',
  },
  loopGainRow: {
    fr: 'Gain de boucle',
    en: 'Loop gain',
    es: 'Extra de bucle',
    de: 'Schleifen-Bonus',
    pt: 'Ganho do loop',
  },
  defendedLabel: {
    fr: 'DÉFENDUES',
    en: 'DEFENDED',
    es: 'DEFENDIDAS',
    de: 'VERTEIDIGT',
    pt: 'DEFENDIDAS',
  },
  routesOpenedLabel: {
    fr: 'ROUTES OUVERTES',
    en: 'ROUTES OPENED',
    es: 'RUTAS ABIERTAS',
    de: 'NEUE ROUTEN',
    pt: 'ROTAS ABERTAS',
  },
  segmentsExcludedLabel: {
    fr: 'SEGMENTS EXCLUS',
    en: 'SEGMENTS EXCLUDED',
    es: 'SEGMENTOS FUERA',
    de: 'AUSGESCHLOSSEN',
    pt: 'SEGMENTOS FORA',
  },
  movementLabel: {
    fr: 'MOUVEMENT',
    en: 'MOTION',
    es: 'MOVIMIENTO',
    de: 'BEWEGUNG',
    pt: 'MOVIMENTO',
  },
  validLabel: {
    fr: 'VALIDÉ',
    en: 'VALID',
    es: 'VÁLIDO',
    de: 'GÜLTIG',
    pt: 'VÁLIDO',
  },
  /** Repère honnêteté §A : valeur de scénario, jamais une vraie mesure. */
  demoNote: {
    fr: 'démo',
    en: 'demo',
    es: 'demo',
    de: 'Demo',
    pt: 'demo',
  },
  verifyOk: {
    fr: 'GPS et mouvement fiables : capture pleine.',
    en: 'GPS and motion reliable: full capture.',
    es: 'GPS y movimiento fiables: captura completa.',
    de: 'GPS und Bewegung zuverlässig: volle Eroberung.',
    pt: 'GPS e movimento confiáveis: captura completa.',
  },
  verifyKo: {
    fr: 'GPS ou mouvement insuffisants : stats enregistrées, pas de capture.',
    en: 'GPS or motion too weak: stats saved, no capture.',
    es: 'GPS o movimiento insuficientes: stats guardadas, sin captura.',
    de: 'GPS oder Bewegung zu schwach: Stats gespeichert, keine Eroberung.',
    pt: 'GPS ou movimento insuficientes: stats salvas, sem captura.',
  },

  // ── Détails : frontière / secteur avant-après ──
  borderKicker: {
    fr: 'FRONTIÈRE',
    en: 'BORDER',
    es: 'FRONTERA',
    de: 'GRENZE',
    pt: 'FRONTEIRA',
  },
  sectorPushedTitle: {
    fr: '{zone} · FRONTIÈRE REPOUSSÉE',
    en: '{zone} · BORDER PUSHED',
    es: '{zone} · FRONTERA EMPUJADA',
    de: '{zone} · GRENZE VERSCHOBEN',
    pt: '{zone} · FRONTEIRA EMPURRADA',
  },
  beforeLabel: {
    fr: 'AVANT',
    en: 'BEFORE',
    es: 'ANTES',
    de: 'VORHER',
    pt: 'ANTES',
  },
  afterLabel: {
    fr: 'APRÈS',
    en: 'AFTER',
    es: 'DESPUÉS',
    de: 'NACHHER',
    pt: 'DEPOIS',
  },

  // ── Détails : contribution crew ──
  crewContribKicker: {
    fr: 'CONTRIBUTION CREW',
    en: 'CREW CONTRIBUTION',
    es: 'CONTRIBUCIÓN CREW',
    de: 'CREW-BEITRAG',
    pt: 'CONTRIBUIÇÃO CREW',
  },
  /** Préfixe avant le % stylé : « {zone} passe à <42 %> ». */
  crewRiseTo: {
    fr: '{zone} passe à',
    en: '{zone} climbs to',
    es: '{zone} sube a',
    de: '{zone} steigt auf',
    pt: '{zone} sobe para',
  },
  crewGainsRank: {
    fr: '{crew} gagne 1 rang.',
    en: '{crew} climbs 1 rank.',
    es: '{crew} sube 1 puesto.',
    de: '{crew} steigt 1 Rang.',
    pt: '{crew} sobe 1 posição.',
  },
  everyZoneCounts: {
    fr: 'chaque zone compte pour {crew}.',
    en: 'every zone counts for {crew}.',
    es: 'cada zona cuenta para {crew}.',
    de: 'jede Zone zählt für {crew}.',
    pt: 'cada zona conta para {crew}.',
  },

  // ── Détails : bonus appliqué (démo — en prod : IngestRunResponse) ──
  bonusAppliedKicker: {
    fr: 'BONUS APPLIQUÉ',
    en: 'BONUS APPLIED',
    es: 'BONUS APLICADO',
    de: 'BONUS AKTIV',
    pt: 'BÔNUS APLICADO',
  },
  bonusAppliedLine: {
    fr: 'Bonus appliqué · {effect}',
    en: 'Bonus applied · {effect}',
    es: 'Bonus aplicado · {effect}',
    de: 'Bonus aktiv · {effect}',
    pt: 'Bônus aplicado · {effect}',
  },
  demoBonusName: {
    fr: 'Bonus Finisher',
    en: 'Finisher Bonus',
    es: 'Bonus Finisher',
    de: 'Finisher-Bonus',
    pt: 'Bônus Finisher',
  },
  demoBonusEffect: {
    fr: '+25 % coffre crew',
    en: '+25% crew chest',
    es: '+25 % cofre crew',
    de: '+25 % Crew-Truhe',
    pt: '+25 % baú do crew',
  },

  // ── Frontière crew OUVERTE (AMENDEMENT-17 §CH2) ──
  runValidated: {
    fr: 'COURSE VALIDÉE',
    en: 'RUN VALIDATED',
    es: 'CARRERA VALIDADA',
    de: 'LAUF BESTÄTIGT',
    pt: 'CORRIDA VALIDADA',
  },
  openBoundaryKicker: {
    fr: 'FRONTIÈRE OUVERTE',
    en: 'OPEN BORDER',
    es: 'FRONTERA ABIERTA',
    de: 'OFFENE GRENZE',
    pt: 'FRONTEIRA ABERTA',
  },
  /** « Tu as tracé <3,1 km> autour de République. » — préfixe + suffixe autour du km stylé. */
  tracedPrefix: {
    fr: 'Tu as tracé',
    en: 'You traced',
    es: 'Trazaste',
    de: 'Du hast',
    pt: 'Você traçou',
  },
  tracedSuffix: {
    fr: 'autour de {zone}.',
    en: 'around {zone}.',
    es: 'alrededor de {zone}.',
    de: 'um {zone} gezogen.',
    pt: 'ao redor de {zone}.',
  },
  /** « Il manque <620 m> pour fermer la zone. » — préfixe + suffixe autour des mètres stylés. */
  missingPrefix: {
    fr: 'Il manque',
    en: 'You need',
    es: 'Faltan',
    de: 'Es fehlen',
    pt: 'Faltam',
  },
  missingSuffix: {
    fr: 'pour fermer la zone.',
    en: 'to close the zone.',
    es: 'para cerrar la zona.',
    de: 'zum Schließen der Zone.',
    pt: 'para fechar a zona.',
  },
  finishNow: {
    fr: 'Terminer maintenant',
    en: 'Finish now',
    es: 'Terminar ahora',
    de: 'Jetzt beenden',
    pt: 'Terminar agora',
  },
  askCrew: {
    fr: 'Demander au crew',
    en: 'Ask the crew',
    es: 'Pedir al crew',
    de: 'Crew fragen',
    pt: 'Pedir ao crew',
  },
  missionSentToast: {
    fr: 'Mission envoyée dans la War Room.',
    en: 'Mission sent to the War Room.',
    es: 'Misión enviada a la War Room.',
    de: 'Mission in den War Room geschickt.',
    pt: 'Missão enviada para a War Room.',
  },

  // ── Boucle crew FERMÉE ──
  crewLoopClosed: {
    fr: 'BOUCLE CREW FERMÉE',
    en: 'CREW LOOP CLOSED',
    es: 'BUCLE CREW CERRADO',
    de: 'CREW-SCHLEIFE ZU',
    pt: 'LOOP DO CREW FECHADO',
  },
  zoneCapturedLabel: {
    fr: 'ZONE CAPTURÉE',
    en: 'ZONE CAPTURED',
    es: 'ZONA CAPTURADA',
    de: 'ZONE EROBERT',
    pt: 'ZONA CAPTURADA',
  },
  crewPts: {
    fr: '+{n} pts',
    en: '+{n} pts',
    es: '+{n} pts',
    de: '+{n} Pkt.',
    pt: '+{n} pts',
  },
  shareConquest: {
    fr: 'Partager la conquête',
    en: 'Share the conquest',
    es: 'Compartir la conquista',
    de: 'Eroberung teilen',
    pt: 'Compartilhar a conquista',
  },

  // ── Partage : formats (chips courts §A) ──
  formatStory: {
    fr: 'Story',
    en: 'Story',
    es: 'Story',
    de: 'Story',
    pt: 'Story',
  },
  formatSquare: {
    fr: 'Carré',
    en: 'Square',
    es: 'Cuadrado',
    de: 'Quadrat',
    pt: 'Quadrado',
  },
  formatMapOnly: {
    fr: 'Carte seule',
    en: 'Map only',
    es: 'Solo mapa',
    de: 'Nur Karte',
    pt: 'Só o mapa',
  },

  // ── Partage : styles (chips courts §A — de reformulé concis) ──
  styleMap: {
    fr: 'Carte',
    en: 'Map',
    es: 'Mapa',
    de: 'Karte',
    pt: 'Mapa',
  },
  styleConquest: {
    fr: 'Conquête',
    en: 'Conquest',
    es: 'Conquista',
    de: 'Eroberung',
    pt: 'Conquista',
  },
  styleDefense: {
    fr: 'Défense',
    en: 'Defense',
    es: 'Defensa',
    de: 'Abwehr',
    pt: 'Defesa',
  },
  styleLoop: {
    fr: 'Boucle',
    en: 'Loop',
    es: 'Bucle',
    de: 'Schleife',
    pt: 'Loop',
  },
  styleCrew: {
    fr: 'Crew',
    en: 'Crew',
    es: 'Crew',
    de: 'Crew',
    pt: 'Crew',
  },
  styleRanking: {
    fr: 'Classement',
    en: 'Ranking',
    es: 'Ranking',
    de: 'Ranking',
    pt: 'Ranking',
  },
  styleBeforeAfter: {
    fr: 'Avant/Après',
    en: 'Before/After',
    es: 'Antes/Después',
    de: 'Vorher/Nachher',
    pt: 'Antes/Depois',
  },
  styleMap3d: {
    fr: 'Carte 3D',
    en: '3D Map',
    es: 'Mapa 3D',
    de: '3D-Karte',
    pt: 'Mapa 3D',
  },

  // ── Partage : écran ──
  privacyMasked: {
    fr: 'Départ et arrivée masqués',
    en: 'Start and finish hidden',
    es: 'Salida y llegada ocultas',
    de: 'Start und Ziel verborgen',
    pt: 'Largada e chegada ocultas',
  },
  shareUnavailable: {
    fr: 'Partage indisponible ici',
    en: 'Sharing unavailable here',
    es: 'No se puede compartir aquí',
    de: 'Teilen hier nicht möglich',
    pt: 'Compartilhar indisponível aqui',
  },
  stickerCopied: {
    fr: 'Sticker copié · colle-le sur ta story',
    en: 'Sticker copied · paste it on your story',
    es: 'Sticker copiado · pégalo en tu story',
    de: 'Sticker kopiert · füg ihn in deine Story ein',
    pt: 'Sticker copiado · cole no seu story',
  },
  stickerReady: {
    fr: 'Sticker prêt à partager',
    en: 'Sticker ready to share',
    es: 'Sticker listo para compartir',
    de: 'Sticker bereit zum Teilen',
    pt: 'Sticker pronto para compartilhar',
  },
  storyExported: {
    fr: 'Story exportée.',
    en: 'Story exported.',
    es: 'Story exportada.',
    de: 'Story exportiert.',
    pt: 'Story exportada.',
  },
  storyReady: {
    fr: 'Story prête.',
    en: 'Story ready.',
    es: 'Story lista.',
    de: 'Story bereit.',
    pt: 'Story pronto.',
  },
  stickerHeadDistance: {
    fr: '{km} km sur GRYD',
    en: '{km} km on GRYD',
    es: '{km} km en GRYD',
    de: '{km} km auf GRYD',
    pt: '{km} km no GRYD',
  },
  stickerHeadZones: {
    fr: '+{n} zones · {zone}',
    en: '+{n} zones · {zone}',
    es: '+{n} zonas · {zone}',
    de: '+{n} Zonen · {zone}',
    pt: '+{n} zonas · {zone}',
  },
  sharePreviewTitle: {
    fr: 'Aperçu du partage',
    en: 'Share preview',
    es: 'Vista previa',
    de: 'Vorschau',
    pt: 'Prévia do compartilhamento',
  },
  shareDefenseTitle: {
    fr: 'Partager ta défense',
    en: 'Share your defense',
    es: 'Comparte tu defensa',
    de: 'Teile deine Verteidigung',
    pt: 'Compartilhe sua defesa',
  },
  shareConquestTitle: {
    fr: 'Partager ta conquête',
    en: 'Share your conquest',
    es: 'Comparte tu conquista',
    de: 'Teile deine Eroberung',
    pt: 'Compartilhe sua conquista',
  },
  shareRunTitle: {
    fr: 'Partager ta course',
    en: 'Share your run',
    es: 'Comparte tu carrera',
    de: 'Teile deinen Lauf',
    pt: 'Compartilhe sua corrida',
  },
  shareSquareCta: {
    fr: 'Partager en carré',
    en: 'Share as square',
    es: 'Compartir en cuadrado',
    de: 'Als Quadrat teilen',
    pt: 'Compartilhar quadrado',
  },
  shareMapCta: {
    fr: 'Partager la carte',
    en: 'Share the map',
    es: 'Compartir el mapa',
    de: 'Karte teilen',
    pt: 'Compartilhar o mapa',
  },
  shareStoryCta: {
    fr: 'Partager en story',
    en: 'Share to story',
    es: 'Compartir en story',
    de: 'Als Story teilen',
    pt: 'Compartilhar no story',
  },
  backToResult: {
    fr: 'Résultat',
    en: 'Result',
    es: 'Resultado',
    de: 'Ergebnis',
    pt: 'Resultado',
  },
  backToResultA11y: {
    fr: 'Revenir au résultat',
    en: 'Back to the result',
    es: 'Volver al resultado',
    de: 'Zurück zum Ergebnis',
    pt: 'Voltar ao resultado',
  },
  exampleNote: {
    fr: 'Exemple — termine une course pour partager la tienne.',
    en: 'Example — finish a run to share yours.',
    es: 'Ejemplo: termina una carrera para compartir la tuya.',
    de: 'Beispiel — beende einen Lauf, um deinen zu teilen.',
    pt: 'Exemplo — termine uma corrida para compartilhar a sua.',
  },
  formatLabel: {
    fr: 'Format',
    en: 'Format',
    es: 'Formato',
    de: 'Format',
    pt: 'Formato',
  },
  formatA11y: {
    fr: 'Format de partage',
    en: 'Share format',
    es: 'Formato para compartir',
    de: 'Format zum Teilen',
    pt: 'Formato de compartilhamento',
  },
  styleLabel: {
    fr: 'Style',
    en: 'Style',
    es: 'Estilo',
    de: 'Stil',
    pt: 'Estilo',
  },
  styleA11y: {
    fr: 'Style de la carte',
    en: 'Card style',
    es: 'Estilo de la tarjeta',
    de: 'Stil der Karte',
    pt: 'Estilo do cartão',
  },
  moreStyles: {
    fr: 'Plus de styles',
    en: 'More styles',
    es: 'Más estilos',
    de: 'Mehr Stile',
    pt: 'Mais estilos',
  },
  moreStylesA11y: {
    fr: 'Afficher plus de styles',
    en: 'Show more styles',
    es: 'Mostrar más estilos',
    de: 'Mehr Stile anzeigen',
    pt: 'Mostrar mais estilos',
  },
  stickerAction: {
    fr: 'Sticker',
    en: 'Sticker',
    es: 'Sticker',
    de: 'Sticker',
    pt: 'Sticker',
  },
  replayAction: {
    fr: 'Rejouer',
    en: 'Replay',
    es: 'Repetir',
    de: 'Replay',
    pt: 'Repetir',
  },
  otherApp: {
    fr: 'Autre app',
    en: 'Other app',
    es: 'Otra app',
    de: 'Andere App',
    pt: 'Outro app',
  },
  stickerA11y: {
    fr: 'Copier le sticker à coller sur ta story',
    en: 'Copy the sticker to paste on your story',
    es: 'Copiar el sticker para pegarlo en tu story',
    de: 'Sticker kopieren und in deine Story einfügen',
    pt: 'Copiar o sticker para colar no seu story',
  },
  replayA11y: {
    fr: "Rejouer l'animation de conquête",
    en: 'Replay the conquest animation',
    es: 'Repetir la animación de conquista',
    de: 'Eroberungs-Animation erneut abspielen',
    pt: 'Repetir a animação de conquista',
  },
  otherAppA11y: {
    fr: 'Partager vers une autre app',
    en: 'Share to another app',
    es: 'Compartir en otra app',
    de: 'In einer anderen App teilen',
    pt: 'Compartilhar em outro app',
  },

  // ── Partage : headlines narratives (doc §6.1 — une conséquence, pas une perf) ──
  headlineStats: {
    fr: '{km} km sur GRYD. Chaque run change la carte.',
    en: '{km} km on GRYD. Every run changes the map.',
    es: '{km} km en GRYD. Cada carrera cambia el mapa.',
    de: '{km} km auf GRYD. Jeder Lauf verändert die Karte.',
    pt: '{km} km no GRYD. Cada corrida muda o mapa.',
  },
  headlineDefense: {
    fr: '{zone} tient encore. {n} zones défendues. #GRYD',
    en: '{zone} still holds. {n} zones defended. #GRYD',
    es: '{zone} sigue en pie. {n} zonas defendidas. #GRYD',
    de: '{zone} hält noch. {n} Zonen verteidigt. #GRYD',
    pt: '{zone} ainda resiste. {n} zonas defendidas. #GRYD',
  },
  headlineConquest: {
    fr: "J'ai pris {zone}. +{n} zones. #GRYD",
    en: 'I took {zone}. +{n} zones. #GRYD',
    es: 'Tomé {zone}. +{n} zonas. #GRYD',
    de: '{zone} ist meins. +{n} Zonen. #GRYD',
    pt: 'Tomei {zone}. +{n} zonas. #GRYD',
  },
  headlineDefault: {
    fr: '+{n} zones sur {zone}. #GRYD',
    en: '+{n} zones in {zone}. #GRYD',
    es: '+{n} zonas en {zone}. #GRYD',
    de: '+{n} Zonen in {zone}. #GRYD',
    pt: '+{n} zonas em {zone}. #GRYD',
  },

  // ── Templates de cards (share/templates.tsx) ──
  heldState: {
    fr: 'Tenue',
    en: 'Held',
    es: 'Mantenida',
    de: 'Gehalten',
    pt: 'Mantida',
  },
  distanceStat: {
    fr: 'Distance',
    en: 'Distance',
    es: 'Distancia',
    de: 'Distanz',
    pt: 'Distância',
  },
  paceStat: {
    fr: 'Allure',
    en: 'Pace',
    es: 'Ritmo',
    de: 'Pace',
    pt: 'Pace',
  },
  durationStat: {
    fr: 'Durée',
    en: 'Time',
    es: 'Tiempo',
    de: 'Zeit',
    pt: 'Tempo',
  },
  runValidatedLabel: {
    fr: 'Course validée',
    en: 'Run validated',
    es: 'Carrera validada',
    de: 'Lauf bestätigt',
    pt: 'Corrida validada',
  },
  /** Héros Conquête — {zone} arrive déjà en MAJUSCULES ({'\n'} dans l'entrée). */
  heroTook: {
    fr: "J'AI PRIS\n{zone}",
    en: 'I TOOK\n{zone}',
    es: 'TOMÉ\n{zone}',
    de: 'EROBERT:\n{zone}',
    pt: 'TOMEI\n{zone}',
  },
  challengeTakeIt: {
    fr: 'PRENDS-LA-MOI',
    en: 'COME TAKE IT',
    es: 'QUÍTAMELA',
    de: 'HOL SIE DIR',
    pt: 'VEM TOMAR',
  },
  zonesStatLabel: {
    fr: 'Zones',
    en: 'Zones',
    es: 'Zonas',
    de: 'Zonen',
    pt: 'Zonas',
  },
  zonesHeldLabel: {
    fr: '{n} zones tenues',
    en: '{n} zones held',
    es: '{n} zonas mantenidas',
    de: '{n} Zonen gehalten',
    pt: '{n} zonas mantidas',
  },
  borderGuarded: {
    fr: '{zone} · frontière gardée',
    en: '{zone} · border guarded',
    es: '{zone} · frontera protegida',
    de: '{zone} · Grenze bewacht',
    pt: '{zone} · fronteira protegida',
  },
  loopClosedKicker: {
    fr: 'BOUCLE FERMÉE',
    en: 'LOOP CLOSED',
    es: 'BUCLE CERRADO',
    de: 'SCHLEIFE ZU',
    pt: 'LOOP FECHADO',
  },
  bonusZonesLabel: {
    fr: 'Zones bonus',
    en: 'Bonus zones',
    es: 'Zonas bonus',
    de: 'Bonus-Zonen',
    pt: 'Zonas bônus',
  },
  loopMakesZoneSub: {
    fr: 'La boucle fait la zone',
    en: 'The loop makes the zone',
    es: 'El bucle hace la zona',
    de: 'Die Schleife macht die Zone',
    pt: 'O loop faz a zona',
  },
  forCrewKicker: {
    fr: 'POUR LE CREW',
    en: 'FOR THE CREW',
    es: 'PARA EL CREW',
    de: 'FÜR DIE CREW',
    pt: 'PELO CREW',
  },
  crewPointsLabel: {
    fr: 'Points crew',
    en: 'Crew points',
    es: 'Puntos crew',
    de: 'Crew-Punkte',
    pt: 'Pontos do crew',
  },
  liftedCrew: {
    fr: '{player} a fait monter {crew}',
    en: '{player} lifted {crew}',
    es: '{player} hizo subir a {crew}',
    de: '{player} hat {crew} hochgebracht',
    pt: '{player} fez o {crew} subir',
  },
  top10Kicker: {
    fr: 'TOP 10 {zone}',
    en: 'TOP 10 {zone}',
    es: 'TOP 10 {zone}',
    de: 'TOP 10 {zone}',
    pt: 'TOP 10 {zone}',
  },
  rankingKicker: {
    fr: 'CLASSEMENT',
    en: 'RANKING',
    es: 'RANKING',
    de: 'RANKING',
    pt: 'RANKING',
  },
  rankDeltaWeek: {
    fr: '{delta} cette semaine',
    en: '{delta} this week',
    es: '{delta} esta semana',
    de: '{delta} diese Woche',
    pt: '{delta} esta semana',
  },
  rankingSoonLabel: {
    fr: 'classement à venir',
    en: 'ranking coming soon',
    es: 'ranking en camino',
    de: 'Ranking folgt',
    pt: 'ranking em breve',
  },
  climbsTo: {
    fr: '{who} grimpe à {rank} sur {zone}',
    en: '{who} climbs to {rank} in {zone}',
    es: '{who} sube a {rank} en {zone}',
    de: '{who} klettert auf {rank} in {zone}',
    pt: '{who} sobe para {rank} em {zone}',
  },
  rankingOpensSeason: {
    fr: 'Le classement local ouvre avec la saison.',
    en: 'Local ranking opens with the season.',
    es: 'El ranking local abre con la temporada.',
    de: 'Das lokale Ranking startet mit der Saison.',
    pt: 'O ranking local abre com a temporada.',
  },
  beforeAfterKicker: {
    fr: 'AVANT · APRÈS',
    en: 'BEFORE · AFTER',
    es: 'ANTES · DESPUÉS',
    de: 'VORHER · NACHHER',
    pt: 'ANTES · DEPOIS',
  },
  zoneRetaken: {
    fr: '{zone} reprise',
    en: '{zone} retaken',
    es: '{zone} recuperada',
    de: '{zone} zurückgeholt',
    pt: '{zone} retomada',
  },
  sectorTakenKicker: {
    fr: 'SECTEUR PRIS',
    en: 'SECTOR TAKEN',
    es: 'SECTOR TOMADO',
    de: 'SEKTOR EROBERT',
    pt: 'SETOR TOMADO',
  },
  zonesOfZone: {
    fr: 'Zones · {zone}',
    en: 'Zones · {zone}',
    es: 'Zonas · {zone}',
    de: 'Zonen · {zone}',
    pt: 'Zonas · {zone}',
  },

  // ── Démo SHARE_DEMO — seuls champs de copy traduisible (noms propres exclus) ──
  demoRankDelta: {
    fr: '+3 places',
    en: '+3 spots',
    es: '+3 puestos',
    de: '+3 Plätze',
    pt: '+3 posições',
  },
  demoContested: {
    fr: 'Contestée',
    en: 'Contested',
    es: 'Disputada',
    de: 'Umkämpft',
    pt: 'Disputada',
  },

  // ─── AUCUN RÉSULTAT À MONTRER (état honnête, §A) ───────────────────────────
  // L'écran Résultat ouvert sans course mesurée (lien direct, retour arrière) :
  // plutôt que rejouer le scénario démo comme si c'était TA course, on le dit.
  noResultTitle: {
    fr: 'Aucune course à afficher',
    en: 'No run to show',
    es: 'Ninguna carrera que mostrar',
    de: 'Kein Lauf zum Anzeigen',
    pt: 'Nenhuma corrida para exibir',
  },
  noResultBody: {
    fr: 'Cet écran montre le résultat d’une course enregistrée. Aucune n’est arrivée jusqu’ici — on ne va pas t’en inventer une.',
    en: 'This screen shows the result of a recorded run. None made it here — and we won’t invent one for you.',
    es: 'Esta pantalla muestra el resultado de una carrera registrada. Ninguna llegó hasta aquí, y no vamos a inventarte una.',
    de: 'Dieser Bildschirm zeigt das Ergebnis eines aufgezeichneten Laufs. Hier ist keiner angekommen — und wir erfinden dir keinen.',
    pt: 'Esta tela mostra o resultado de uma corrida registrada. Nenhuma chegou aqui — e não vamos inventar uma para você.',
  },
  noResultCta: {
    fr: 'Retour à la carte',
    en: 'Back to map',
    es: 'Volver al mapa',
    de: 'Zurück zur Karte',
    pt: 'Voltar ao mapa',
  },
});

/**
 * §11 — la RAISON précise d'un refus serveur (IngestRunResponse.status
 * 'rejected'). Phrasée SANS seuil chiffré : les seuils vivent dans game-rules,
 * les répéter ici serait un nombre magique en dur (et se désynchroniserait).
 * Record EXHAUSTIF typé par RejectReason → toute nouvelle raison force sa
 * traduction 5 langues (type Entry). Le serveur reste seul juge ; on ne fait
 * que DIRE honnêtement son verdict.
 */
export const REJECT_REASON_COPY: Record<RejectReason, Entry> = {
  too_short: {
    fr: 'Distance trop courte pour valider une capture.',
    en: 'Distance too short to validate a capture.',
    es: 'Distancia demasiado corta para validar una captura.',
    de: 'Distanz zu kurz, um eine Eroberung zu bestätigen.',
    pt: 'Distância curta demais para validar uma captura.',
  },
  too_brief: {
    fr: 'Durée trop brève pour valider une capture.',
    en: 'Duration too brief to validate a capture.',
    es: 'Duración demasiado breve para validar una captura.',
    de: 'Dauer zu kurz, um eine Eroberung zu bestätigen.',
    pt: 'Duração breve demais para validar uma captura.',
  },
  pace_too_fast: {
    fr: 'Allure trop rapide pour une course à pied.',
    en: 'Pace too fast for a run.',
    es: 'Ritmo demasiado rápido para una carrera.',
    de: 'Tempo zu schnell für einen Lauf.',
    pt: 'Ritmo rápido demais para uma corrida.',
  },
  pace_too_slow: {
    fr: 'Allure trop lente pour valider une course.',
    en: 'Pace too slow to validate a run.',
    es: 'Ritmo demasiado lento para validar una carrera.',
    de: 'Tempo zu langsam, um einen Lauf zu bestätigen.',
    pt: 'Ritmo lento demais para validar uma corrida.',
  },
  too_far: {
    fr: 'Points GPS trop éloignés — trace peu fiable.',
    en: 'GPS points too far apart — unreliable trace.',
    es: 'Puntos GPS demasiado separados — traza poco fiable.',
    de: 'GPS-Punkte zu weit auseinander — Spur unzuverlässig.',
    pt: 'Pontos de GPS distantes demais — traço não confiável.',
  },
  no_valid_points: {
    fr: 'Trop peu de points GPS valides.',
    en: 'Too few valid GPS points.',
    es: 'Muy pocos puntos GPS válidos.',
    de: 'Zu wenige gültige GPS-Punkte.',
    pt: 'Poucos pontos de GPS válidos.',
  },
};
