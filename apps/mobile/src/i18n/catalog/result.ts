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
  // Libellé accessible du tracé RÉEL qui se dessine sur le résultat (§25).
  a11yResultTrace: {
    fr: 'Le tracé de ta course',
    en: 'Your run’s route',
    es: 'El recorrido de tu carrera',
    de: 'Die Strecke deines Laufs',
    pt: 'O trajeto da tua corrida',
  },
  // PIONNIER — titre du hero quand cette course a OUVERT une commune vierge
  // (verdict serveur, nom réel geo.api.gouv.fr). {commune} = le nom réel.
  heroPioneer: {
    fr: 'TU AS OUVERT {commune}',
    en: 'YOU OPENED {commune}',
    es: 'HAS ABIERTO {commune}',
    de: 'DU HAST {commune} ERÖFFNET',
    pt: 'ABRISTE {commune}',
  },
  // Sous-titre du pionnier — statut rare, formulé sans genre (jamais « premier·ère »).
  heroPioneerSub: {
    fr: 'Personne n’avait couru ici avant toi',
    en: 'No one had run here before you',
    es: 'Nadie había corrido aquí antes que tú',
    de: 'Vor dir ist hier niemand gelaufen',
    pt: 'Ninguém tinha corrido aqui antes de ti',
  },
  // RENDEZ-VOUS local (rétention) — invitation à poser son propre rappel.
  rendezvousOffer: {
    fr: 'Me rappeler ma prochaine sortie',
    en: 'Remind me to run',
    es: 'Recordarme mi próxima salida',
    de: 'An meinen nächsten Lauf erinnern',
    pt: 'Lembrar-me da próxima corrida',
  },
  // {time} = heure au format 24 h (« 18:00 »), locale-neutre.
  rendezvousSet: {
    fr: 'Rappel quotidien · {time}',
    en: 'Daily reminder · {time}',
    es: 'Recordatorio diario · {time}',
    de: 'Tägliche Erinnerung · {time}',
    pt: 'Lembrete diário · {time}',
  },
  rendezvousCancel: {
    fr: 'Annuler',
    en: 'Cancel',
    es: 'Cancelar',
    de: 'Abbrechen',
    pt: 'Cancelar',
  },
  rendezvousDenied: {
    fr: 'Autorise les notifications pour ton rappel',
    en: 'Allow notifications for your reminder',
    es: 'Permite las notificaciones para tu recordatorio',
    de: 'Erlaube Mitteilungen für deine Erinnerung',
    pt: 'Permite as notificações para o teu lembrete',
  },
  // Titre de la notif — marque (identique aux 5 langues).
  rendezvousNotifTitle: {
    fr: 'GRYD',
    en: 'GRYD',
    es: 'GRYD',
    de: 'GRYD',
    pt: 'GRYD',
  },
  // Corps — anti-shame, ne promet QUE la course (jamais une conquête/un rival).
  rendezvousNotifBody: {
    fr: 'Ta prochaine sortie t’attend',
    en: 'Your next run is waiting',
    es: 'Tu próxima salida te espera',
    de: 'Dein nächster Lauf wartet',
    pt: 'A tua próxima corrida está à espera',
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
  // E09 (planche) — résumé sportif en UN bloc à séparateurs (distance · temps ·
  // allure), jamais 4 cards. La distance n'était visible NULLE PART après une
  // conquête (le KPI héros montre les zones) : ce bloc la ramène honnêtement.
  distanceLabel: {
    fr: 'DISTANCE',
    en: 'DISTANCE',
    es: 'DISTANCIA',
    de: 'DISTANZ',
    pt: 'DISTÂNCIA',
  },
  // E09 — CTA « Défier un rival » (dormant : n'apparaît que si le SERVEUR signale
  // une reprise réelle, cf. rivalChallenge.ts). Nomme le vrai crew rival.
  defyRival: {
    fr: 'Défier {crew}',
    en: 'Challenge {crew}',
    es: 'Desafiar a {crew}',
    de: '{crew} herausfordern',
    pt: 'Desafiar {crew}',
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
  // `demoNote` (« démo ») SUPPRIMÉ (25/07/2026) : il étiquetait des valeurs de
  // scénario dans la grille du calcul. Ces valeurs ont disparu avec le mode
  // vitrine (A-47) — plus rien à étiqueter, et une clé « démo » qui traîne dans
  // un catalogue est une invitation à en réafficher une.
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
  // `demoBonusName` / `demoBonusEffect` SUPPRIMÉS (25/07/2026) : un bonus
  // « Finisher · +25 % coffre crew » que le serveur n'a jamais accordé. Le bloc
  // BONUS ne lit plus que `IngestRunResponse.bonusApplied`.

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
  /**
   * ─── UN CONTRÔLE MAL ÉTIQUETÉ, CORRIGÉ (25/07/2026) ───────────────────────
   * Ce style s'appelait « Carte 3D ». `ShareMap3D` a été supprimée le 21/07
   * (elle montait une géométrie de DÉMO FIGÉE, incapable de suivre un vrai
   * tracé) et ce style rend depuis une carte SVG 2D en PLEIN CADRE. Le libellé,
   * lui, était resté : l'utilisateur choisissait une chose et exportait l'autre.
   * Un contrôle mal étiqueté ment autant qu'un bouton mort — le libellé dit
   * maintenant ce que le style fait. La CLÉ garde son nom : elle est lue par
   * app/partage.tsx (gelé ce tour-ci).
   */
  styleMap3d: {
    fr: 'Plein cadre',
    en: 'Full bleed',
    es: 'A sangre',
    de: 'Randlos',
    pt: 'Tela cheia',
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
  // `exampleNote` SUPPRIMÉ (25/07/2026) : c'était l'unique protection du « mode
  // exemple » de /partage — un bandeau posé sur une carte fabriquée. Le mode
  // exemple n'existe plus (A-47) ; garder sa copy aurait laissé croire qu'un
  // bandeau suffit à racheter une donnée inventée. Il ne suffit pas.
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
  //
  // VINGT CLÉS ONT DISPARU ICI LE 25/07/2026, et c'est le sujet du recalage E10.
  // Elles servaient la grammaire d'AMENDEMENT-20 — kicker + titre + KPI + rangée
  // de 3 stats + sous-titre — que sept des huit cards empilaient encore alors que
  // la planche n'en décrit qu'UNE (lieu · titre · carte · chiffre · contexte ·
  // défi · signature). Les cards passent toutes par la même composition : plus
  // aucun kicker (`sectorTakenKicker`, `loopClosedKicker`, `forCrewKicker`,
  // `beforeAfterKicker`, `top10Kicker`, `rankingKicker`), plus aucun sous-titre
  // (`borderGuarded`, `loopMakesZoneSub`, `liftedCrew`, `climbsTo`,
  // `zoneRetaken`, `zonesOfZone`, `rankingOpensSeason`), plus de rangée de stats
  // (`paceStat`, `runValidatedLabel`, `zonesHeldLabel`, `rankDeltaWeek`,
  // `rankingSoonLabel`, `bonusZonesLabel`, `crewPointsLabel`). Les garder aurait
  // laissé croire que ces mises en page existent encore.
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
  durationStat: {
    fr: 'Durée',
    en: 'Time',
    es: 'Tiempo',
    de: 'Zeit',
    pt: 'Tempo',
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

  // `demoRankDelta` / `demoContested` SUPPRIMÉS (25/07/2026) : derniers restes du
  // scénario SHARE_DEMO (« +3 places », « Contestée ») retiré le 21/07/2026. Le
  // rang vient de `rankDelta`, `null` tant qu'aucune saison ne l'alimente.

  // ═══ E09 — RECALAGE PLANCHE (25/07/2026) ═══════════════════════════════════
  // Ordre IMMUABLE de la planche : territoire → progression → statistiques →
  // partage. Ces clés arment ce qui manquait : le hero carte avec sa bascule, la
  // PROGRESSION (XP + contribution crew), la variante SANS CAPTURE, et la
  // hiérarchie de CTA (primaire / secondaire / tertiaire).

  /** Kicker de la section PROGRESSION (2ᵉ temps de la planche). */
  progressKicker: {
    fr: 'PROGRESSION',
    en: 'PROGRESS',
    es: 'PROGRESIÓN',
    de: 'FORTSCHRITT',
    pt: 'PROGRESSÃO',
  },
  /** XP RÉELLE créditée par cette course (IngestRunResponse.xpAwarded). */
  xpAwarded: {
    fr: '+{n} XP',
    en: '+{n} XP',
    es: '+{n} XP',
    de: '+{n} XP',
    pt: '+{n} XP',
  },
  /**
   * Contribution crew : le NOM du crew est réel (`useRealCrew`), l'XP crew est
   * décidée serveur (`crewXp`). Aucun km² — aucune aire n'existe côté serveur,
   * en fabriquer une serait un chiffre inventé (cf. crew/real.ts).
   */
  crewXpLine: {
    fr: '{crew} · +{n} XP crew',
    en: '{crew} · +{n} crew XP',
    es: '{crew} · +{n} XP de crew',
    de: '{crew} · +{n} Crew-XP',
    pt: '{crew} · +{n} XP de crew',
  },

  // ── E09 · variante SANS CAPTURE (planche : « jamais un ton d'échec ») ──
  /**
   * La ligne qui retourne le résultat : l'effort a compté, même sans capture.
   * Rendue AVEC l'XP réelle quand le serveur en a crédité une, seule sinon.
   */
  effortCounts: {
    fr: 'L’effort compte, même sans capture.',
    en: 'The effort counts, even without a capture.',
    es: 'El esfuerzo cuenta, aunque no captures.',
    de: 'Der Einsatz zählt, auch ohne Eroberung.',
    pt: 'O esforço conta, mesmo sem captura.',
  },
  /**
   * Échéance RÉELLE de la frontière laissée ouverte (openBoundary.expiresAt,
   * décidé serveur). Remplace la promesse « la boucle reste disponible dans vos
   * Missions » de la planche : aucune surface Missions n'accueille aujourd'hui
   * une frontière ouverte — on dit le fait, pas la destination.
   */
  boundaryOpenHours: {
    fr: 'Encore {h} h pour la refermer.',
    en: '{h} h left to close it.',
    es: 'Quedan {h} h para cerrarla.',
    de: 'Noch {h} h, um sie zu schließen.',
    pt: 'Faltam {h} h para fechá-la.',
  },
  /** Échéance passée / trop proche pour être dite en heures entières. */
  boundaryOpenSoon: {
    fr: 'Elle se referme bientôt.',
    en: 'It closes soon.',
    es: 'Se cierra pronto.',
    de: 'Sie schließt bald.',
    pt: 'Ela fecha em breve.',
  },
  /** KPI de la variante effort : les KM sont MESURÉS, eux. */
  kmLabel: {
    fr: 'KM',
    en: 'KM',
    es: 'KM',
    de: 'KM',
    pt: 'KM',
  },

  // ── E09 · hero carte + bascule « Avant ⇄ Après » ──
  /**
   * Caméra et zoom STRICTEMENT identiques entre les deux états (une seule bbox
   * calculée une fois) : sinon la comparaison ment. « Avant » ne montre QUE les
   * zones que le serveur dit déjà tenues (outcome `defended`) — jamais un état
   * antérieur inventé, que le serveur ne renvoie pas.
   */
  a11yHeroMapAfter: {
    fr: 'Territoire après cette course',
    en: 'Territory after this run',
    es: 'Territorio después de esta carrera',
    de: 'Gebiet nach diesem Lauf',
    pt: 'Território depois desta corrida',
  },
  a11yHeroMapBefore: {
    fr: 'Territoire avant cette course',
    en: 'Territory before this run',
    es: 'Territorio antes de esta carrera',
    de: 'Gebiet vor diesem Lauf',
    pt: 'Território antes desta corrida',
  },
  beforeAfterA11y: {
    fr: 'Maintenir pour voir l’avant',
    en: 'Hold to see the before',
    es: 'Mantén para ver el antes',
    de: 'Halten, um das Vorher zu sehen',
    pt: 'Segure para ver o antes',
  },

  // ── E09 · hiérarchie de CTA (primaire PARTAGER · secondaire DÉFIER · tertiaire) ──
  finishRun: {
    fr: 'Terminer',
    en: 'Finish',
    es: 'Terminar',
    de: 'Fertig',
    pt: 'Concluir',
  },
  /** Cible de SKIP de la séquence narrative (< 1,8 s, planche E09). */
  skipRevealA11y: {
    fr: 'Passer l’animation',
    en: 'Skip the animation',
    es: 'Saltar la animación',
    de: 'Animation überspringen',
    pt: 'Pular a animação',
  },

  // ── E09 · kickers d'intention (étaient en FRANÇAIS EN DUR dans intention.ts) ──
  kickerConquest: {
    fr: 'CONQUÊTE',
    en: 'CONQUEST',
    es: 'CONQUISTA',
    de: 'EROBERUNG',
    pt: 'CONQUISTA',
  },
  kickerDefense: {
    fr: 'DÉFENSE',
    en: 'DEFENSE',
    es: 'DEFENSA',
    de: 'ABWEHR',
    pt: 'DEFESA',
  },
  kickerFreeRun: {
    fr: 'RUN LIBRE',
    en: 'FREE RUN',
    es: 'RUN LIBRE',
    de: 'FREIER LAUF',
    pt: 'RUN LIVRE',
  },

  // ═══ E10 — RECALAGE PLANCHE (25/07/2026) ═══════════════════════════════════
  // « Le MOTEUR choisit le récit, l'utilisateur change le STYLE. » Auto = le
  // choix du moteur (features/share/narrative.ts), réversible ; la phrase
  // d'explication vient du MÊME moteur, pour que les deux ne divergent jamais.

  /** Mode narratif « Auto » — en tête de la rangée de styles. */
  styleAuto: {
    fr: 'Auto',
    en: 'Auto',
    es: 'Auto',
    de: 'Auto',
    pt: 'Auto',
  },
  whyThisStyle: {
    fr: 'Pourquoi ce style ? {reason}',
    en: 'Why this style? {reason}',
    es: '¿Por qué este estilo? {reason}',
    de: 'Warum dieser Stil? {reason}',
    pt: 'Por que este estilo? {reason}',
  },
  reasonCapture: {
    fr: 'Tu as capturé de nouvelles zones.',
    en: 'You captured new zones.',
    es: 'Capturaste zonas nuevas.',
    de: 'Du hast neue Zonen erobert.',
    pt: 'Você capturou novas zonas.',
  },
  reasonReprise: {
    fr: 'Tu as repris une zone à un crew rival.',
    en: 'You took a zone back from a rival crew.',
    es: 'Le quitaste una zona a un crew rival.',
    de: 'Du hast einer rivalisierenden Crew eine Zone abgenommen.',
    pt: 'Você retomou uma zona de um crew rival.',
  },
  reasonDefense: {
    fr: 'Tu as défendu tes zones.',
    en: 'You defended your zones.',
    es: 'Defendiste tus zonas.',
    de: 'Du hast deine Zonen verteidigt.',
    pt: 'Você defendeu suas zonas.',
  },
  reasonLoop: {
    fr: 'Tu as fermé ta boucle.',
    en: 'You closed your loop.',
    es: 'Cerraste tu bucle.',
    de: 'Du hast deine Schleife geschlossen.',
    pt: 'Você fechou seu loop.',
  },
  reasonCrew: {
    fr: 'Ta course a fait gagner ton crew.',
    en: 'Your run earned points for your crew.',
    es: 'Tu carrera hizo ganar a tu crew.',
    de: 'Dein Lauf hat deiner Crew gebracht.',
    pt: 'Sua corrida rendeu para o seu crew.',
  },
  reasonRanking: {
    fr: 'Ta course te fait bouger au classement.',
    en: 'Your run moves you in the ranking.',
    es: 'Tu carrera te mueve en la clasificación.',
    de: 'Dein Lauf bewegt dich im Ranking.',
    pt: 'Sua corrida te move no ranking.',
  },
  /**
   * Récit « record » : le moteur sait le produire, aucune source ne l'arme
   * aujourd'hui (aucun record personnel n'est mesuré jusqu'ici). La clé existe
   * pour que le branchement futur n'ait pas à réécrire la copy.
   */
  reasonRecord: {
    fr: 'Tu as battu ton record.',
    en: 'You beat your record.',
    es: 'Batiste tu récord.',
    de: 'Du hast deinen Rekord geknackt.',
    pt: 'Você bateu seu recorde.',
  },
  reasonEffort: {
    fr: 'Rien n’a été capturé : on partage la course, pas un territoire.',
    en: 'Nothing was captured: we share the run, not a territory.',
    es: 'No se capturó nada: compartimos la carrera, no un territorio.',
    de: 'Nichts erobert: Wir teilen den Lauf, kein Gebiet.',
    pt: 'Nada capturado: a gente compartilha a corrida, não um território.',
  },

  // ── E10 · format 4:5 imposé par la planche (9:16 · 4:5 · 1:1) ──
  formatFeed: {
    fr: 'Portrait',
    en: 'Portrait',
    es: 'Vertical',
    de: 'Hochformat',
    pt: 'Retrato',
  },
  shareFeedCta: {
    fr: 'Partager en portrait',
    en: 'Share as portrait',
    es: 'Compartir en vertical',
    de: 'Im Hochformat teilen',
    pt: 'Compartilhar em retrato',
  },

  // ── E10 · sticker PNG transparent (planche) ──
  /**
   * Distinct de `stickerCopied` (texte) et de `stickerReady` (feuille de
   * partage) : ne s'affiche QUE si une IMAGE a réellement été produite. Annoncer
   * « PNG » sur un partage texte serait mentir sur le canal.
   */
  stickerPngReady: {
    fr: 'Sticker PNG prêt à coller',
    en: 'PNG sticker ready to paste',
    es: 'Sticker PNG listo para pegar',
    de: 'PNG-Sticker bereit zum Einfügen',
    pt: 'Sticker PNG pronto para colar',
  },

  // ── E10 · badge « Protégé » PERMANENT sous l'aperçu (planche, non négociable) ──
  /**
   * Le mot de la planche. Ce qu'il couvre RÉELLEMENT aujourd'hui est dit juste à
   * côté par `privacyMasked` (départ/arrivée masqués) : le pipeline tient le trim
   * des extrémités et l'absence d'heure exacte, PAS l'exclusion des zones privées
   * ni la simplification. Le badge ne promet donc pas plus que ça.
   */
  protectedBadge: {
    fr: 'Protégé',
    en: 'Protected',
    es: 'Protegido',
    de: 'Geschützt',
    pt: 'Protegido',
  },

  // ═══ E10 — LA CARTE PARTAGÉE : UNE SEULE GRAMMAIRE (25/07/2026) ════════════
  // Retour fondateur : « le partage de conquête n'a rien de ressemblant à ce
  // qu'on a mis en place sur les nouveaux visuels ». L'écran avait été recalé,
  // pas les CARTES : sept mises en page cohabitaient (kicker + KPI + 3 stats +
  // #GRYD) avec une seule au format de la planche. Tous les modes passent
  // désormais par la MÊME composition — lieu · TITRE · CARTE · CHIFFRE ·
  // contexte · défi · signature — donc par les MÊMES clés de titre.
  //
  // Chaque titre tient sur DEUX lignes (display, planche E10) : le \n est dans
  // l'entrée, et il est le même dans les cinq langues.
  //
  // DEUX VARIANTES PAR RÉCIT, et ce n'est pas du confort : `zoneName` vaut
  // aujourd'hui le littéral `zoneFallback` (« Zone »), donc la carte imprimait
  // « J'AI PRIS ZONE » — le mot passe pour un nom de lieu. Tant qu'aucun secteur
  // réel n'est câblé, c'est la variante SANS lieu qui sort.

  /** Capture, lieu CONNU. Voir aussi `heroTook` (identique, conservée). */
  heroTookNoPlace: {
    fr: 'TERRITOIRE\nCONQUIS',
    en: 'TERRITORY\nTAKEN',
    es: 'TERRITORIO\nCONQUISTADO',
    de: 'GEBIET\nEROBERT',
    pt: 'TERRITÓRIO\nCONQUISTADO',
  },
  heroRetookPlace: {
    fr: "J'AI REPRIS\n{zone}",
    en: 'I TOOK BACK\n{zone}',
    es: 'RECUPERÉ\n{zone}',
    de: 'ZURÜCKGEHOLT:\n{zone}',
    pt: 'RETOMEI\n{zone}',
  },
  heroRetookNoPlace: {
    fr: 'ZONE\nREPRISE',
    en: 'ZONE\nTAKEN BACK',
    es: 'ZONA\nRECUPERADA',
    de: 'ZONE\nZURÜCKGEHOLT',
    pt: 'ZONA\nRETOMADA',
  },
  heroDefendedPlace: {
    fr: "J'AI TENU\n{zone}",
    en: 'I HELD\n{zone}',
    es: 'DEFENDÍ\n{zone}',
    de: 'GEHALTEN:\n{zone}',
    pt: 'SEGUREI\n{zone}',
  },
  heroDefendedNoPlace: {
    fr: 'FRONTIÈRE\nTENUE',
    en: 'BORDER\nHELD',
    es: 'FRONTERA\nDEFENDIDA',
    de: 'GRENZE\nGEHALTEN',
    pt: 'FRONTEIRA\nSEGURA',
  },
  heroLoopClosed: {
    fr: 'BOUCLE\nFERMÉE',
    en: 'LOOP\nCLOSED',
    es: 'BUCLE\nCERRADO',
    de: 'SCHLEIFE\nGESCHLOSSEN',
    pt: 'LOOP\nFECHADO',
  },
  heroForCrewNamed: {
    fr: 'COURU POUR\n{crew}',
    en: 'RUN FOR\n{crew}',
    es: 'CORRÍ POR\n{crew}',
    de: 'GELAUFEN FÜR\n{crew}',
    pt: 'CORRI POR\n{crew}',
  },
  heroForCrewNoName: {
    fr: 'COURU POUR\nLE CREW',
    en: 'RUN FOR\nTHE CREW',
    es: 'CORRÍ POR\nEL CREW',
    de: 'GELAUFEN FÜR\nDIE CREW',
    pt: 'CORRI PELO\nCREW',
  },
  /** Rang : « {rank} » arrive déjà formaté (« #8 ») — jamais fabriqué ici. */
  heroRankLine: {
    fr: 'JE SUIS\n{rank}',
    en: "I'M\n{rank}",
    es: 'ESTOY\n{rank}',
    de: 'ICH BIN\n{rank}',
    pt: 'ESTOU EM\n{rank}',
  },
  heroRunLogged: {
    fr: 'COURSE\nENREGISTRÉE',
    en: 'RUN\nLOGGED',
    es: 'CARRERA\nREGISTRADA',
    de: 'LAUF\nGESPEICHERT',
    pt: 'CORRIDA\nREGISTRADA',
  },

  /**
   * Défi de la carte DÉFENSE — le pendant de `challengeTakeIt`.
   * COURT dans les cinq langues, et c'est une contrainte de rendu, pas un goût :
   * la capsule fait la largeur d'une story (232 pt, soit ~192 utiles) et son
   * texte est composé en 16 pt gras + 2 d'approche — au-delà d'une douzaine de
   * caractères, il se fait couper, ce que §A.9 interdit.
   */
  challengeHoldTheLine: {
    fr: 'FRANCHIS-LA',
    en: 'CROSS IT',
    es: 'CRÚZALA',
    de: 'KOMM DURCH',
    pt: 'ATRAVESSA',
  },

  /**
   * Libellés du chiffre héros — un par grandeur AUTORISÉE (jamais une aire).
   * MÊME contrainte de longueur, en pire : ce libellé partage sa ligne avec le
   * chiffre composé en 64 pt. « +47 » mange déjà 110 pt des 192 disponibles, il
   * reste donc la place d'un mot COURT. C'est aussi pour ça que la distance ne
   * porte pas de libellé de mot mais son unité (voir templates.tsx).
   */
  heroLabelHeld: {
    fr: 'Tenues',
    en: 'Held',
    es: 'Retenidas',
    de: 'Gehalten',
    pt: 'Mantidas',
  },
  heroLabelBonus: {
    fr: 'Bonus',
    en: 'Bonus',
    es: 'Bonus',
    de: 'Bonus',
    pt: 'Bônus',
  },
  /** « Crew » est un invariant du projet — même mot dans les cinq langues. */
  heroLabelCrew: {
    fr: 'Crew',
    en: 'Crew',
    es: 'Crew',
    de: 'Crew',
    pt: 'Crew',
  },
  heroLabelRank: {
    fr: 'Rang',
    en: 'Rank',
    es: 'Puesto',
    de: 'Rang',
    pt: 'Posição',
  },
  /**
   * Rien de mesuré NI de jugé : la carte affiche « — » et le DIT. C'est le seul
   * substitut acceptable à un chiffre héros — « 0 » nu et « +0 » sont interdits,
   * a fortiori dans une image destinée à être publiée.
   */
  heroMetricUnavailable: {
    fr: 'Non mesurée',
    en: 'Not measured',
    es: 'Sin medir',
    de: 'Ohne Messung',
    pt: 'Sem medição',
  },

  // ═══ E10 — APERÇU DE FORMAT (livrable fondateur, 25/07/2026) ═══════════════
  // Le compositeur ne s'ouvre qu'avec une course terminée : sur localhost il n'y
  // en a jamais, donc personne ne peut juger le rendu des cartes. Cet aperçu
  // montre la MISE EN PAGE — et rien d'autre.
  //
  // GARDE-FOU TESTÉ : le bloc délimité ci-dessous ne doit contenir AUCUNE valeur
  // (chiffre, unité, rang, nom de lieu). `formatPreviewModel.isSlotLabelClean`
  // l'impose au rendu, et `formatPreviewModel.test.ts` relit CE fichier entre les
  // deux sentinelles pour le vérifier dans les cinq langues. Ne pas déplacer les
  // sentinelles sans déplacer le test.
  // GARDE-FOU:DEBUT apercu-de-format
  fpTitle: {
    fr: 'Aperçu de format',
    en: 'Layout preview',
    es: 'Vista de formato',
    de: 'Layout-Vorschau',
    pt: 'Prévia de formato',
  },
  /** Étiquette DANS le cadre — pas seulement autour (garde-fou 4). */
  fpBadge: {
    fr: 'APERÇU DE FORMAT',
    en: 'LAYOUT PREVIEW',
    es: 'VISTA DE FORMATO',
    de: 'LAYOUT-VORSCHAU',
    pt: 'PRÉVIA DE FORMATO',
  },
  fpIntro: {
    fr: 'Voici la mise en page des cartes GRYD : le cadre, la hiérarchie, la place de chaque élément. Chaque emplacement porte son nom — aucune valeur n’est affichée, parce qu’aucune course ne les a produites.',
    en: 'This is the layout of GRYD cards: the frame, the hierarchy, where each element sits. Every slot is named — no values are shown, because no run produced any.',
    es: 'Esta es la maquetación de las tarjetas GRYD: el marco, la jerarquía, el lugar de cada elemento. Cada espacio lleva su nombre — no se muestra ningún valor, porque ninguna carrera los ha producido.',
    de: 'So ist das Layout der GRYD-Karten aufgebaut: Rahmen, Hierarchie, Platz jedes Elements. Jeder Platzhalter trägt seinen Namen — es werden keine Werte gezeigt, denn kein Lauf hat welche erzeugt.',
    pt: 'Este é o layout dos cards GRYD: o quadro, a hierarquia, o lugar de cada elemento. Cada espaço leva seu nome — nenhum valor aparece, porque nenhuma corrida os produziu.',
  },
  fpNotShareable: {
    fr: 'Cet aperçu ne se partage pas. Une carte partageable naît d’une course réelle, jamais d’ici.',
    en: 'This preview cannot be shared. A shareable card comes from a real run, never from here.',
    es: 'Esta vista no se puede compartir. Una tarjeta compartible nace de una carrera real, nunca de aquí.',
    de: 'Diese Vorschau lässt sich nicht teilen. Eine teilbare Karte entsteht aus einem echten Lauf, nie hier.',
    pt: 'Esta prévia não pode ser compartilhada. Um card compartilhável nasce de uma corrida real, nunca daqui.',
  },
  /** Emplacement #1 — vide dans la vraie carte tant qu’aucun secteur n’est câblé. */
  fpSlotPlace: {
    fr: 'Lieu',
    en: 'Place',
    es: 'Lugar',
    de: 'Ort',
    pt: 'Local',
  },
  fpSlotEvent: {
    fr: 'Titre de l’événement',
    en: 'Event title',
    es: 'Título del evento',
    de: 'Titel des Ereignisses',
    pt: 'Título do evento',
  },
  fpSlotMap: {
    fr: 'Carte de la zone',
    en: 'Zone map',
    es: 'Mapa de la zona',
    de: 'Karte der Zone',
    pt: 'Mapa da zona',
  },
  fpSlotHero: {
    fr: 'Chiffre héros',
    en: 'Hero number',
    es: 'Cifra principal',
    de: 'Kernzahl',
    pt: 'Número principal',
  },
  fpSlotContext: {
    fr: 'Contexte',
    en: 'Context',
    es: 'Contexto',
    de: 'Kontext',
    pt: 'Contexto',
  },
  fpSlotChallenge: {
    fr: 'Défi',
    en: 'Challenge',
    es: 'Reto',
    de: 'Herausforderung',
    pt: 'Desafio',
  },
  fpSlotSignature: {
    fr: 'Signature',
    en: 'Signature',
    es: 'Firma',
    de: 'Signatur',
    pt: 'Assinatura',
  },
  /** Dit qu’un emplacement reste VIDE dans la vraie carte, faute de source. */
  fpSlotUnsourced: {
    fr: 'sans source aujourd’hui',
    en: 'no source yet',
    es: 'sin fuente por ahora',
    de: 'noch ohne Quelle',
    pt: 'ainda sem fonte',
  },
  /* L’aperçu montre ce que le CODE rend, pas l’idéal de la planche : ces trois
     états disent l’écart au lieu de le masquer. */
  fpStatusRendered: {
    fr: 'à sa place',
    en: 'in place',
    es: 'en su sitio',
    de: 'an seinem Platz',
    pt: 'no lugar',
  },
  fpStatusMissing: {
    fr: 'pas encore rendu',
    en: 'not rendered yet',
    es: 'aún no se muestra',
    de: 'noch nicht dargestellt',
    pt: 'ainda não exibido',
  },
  fpStatusMisplaced: {
    fr: 'rendu, mais en haut du cadre',
    en: 'rendered, but at the top of the frame',
    es: 'se muestra, pero arriba del marco',
    de: 'dargestellt, aber oben im Rahmen',
    pt: 'exibido, mas no topo do quadro',
  },
  fpFormatLabel: {
    fr: 'Format',
    en: 'Format',
    es: 'Formato',
    de: 'Format',
    pt: 'Formato',
  },
  fpSlotsLabel: {
    fr: 'Emplacements, dans l’ordre',
    en: 'Slots, in order',
    es: 'Espacios, en orden',
    de: 'Platzhalter, der Reihe nach',
    pt: 'Espaços, em ordem',
  },
  fpSticker: {
    fr: 'Sticker',
    en: 'Sticker',
    es: 'Sticker',
    de: 'Sticker',
    pt: 'Sticker',
  },
  fpBack: {
    fr: 'Retour',
    en: 'Back',
    es: 'Volver',
    de: 'Zurück',
    pt: 'Voltar',
  },
  fpBackA11y: {
    fr: 'Revenir en arrière',
    en: 'Go back',
    es: 'Volver atrás',
    de: 'Zurückgehen',
    pt: 'Voltar atrás',
  },
  // GARDE-FOU:FIN apercu-de-format

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
