/**
 * GRYD — i18n : catalogue du domaine « route-planner-ui » (planificateur
 * d'itinéraire /route-planner, carte du planner, intentions du générateur)
 * + composants UI partagés à texte propre (ErrorBoundary, StackScreen).
 * Parité 5 langues imposée par le type Entry — une langue manquante = erreur TS.
 *
 * INVARIANTS jamais traduits (restent en dur dans les composants) :
 * GRYD, GO, Crew (section « CREW »), km, min, pts (sauf de « Pkt. »), noms
 * propres (Paris, République…), « — » placeholder.
 * §A CONTRAIGNANT : chips/CTA/boutons COURTS dans les 5 langues (l'allemand est
 * reformulé concis : EROBERN, SCHÜTZEN, « Neu erzeugen »… — jamais tronqué à 375px).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── UI partagée : ErrorBoundary (écran d'erreur brandé) ──────────────────
  errorTitle: {
    fr: 'Reprends ta course.',
    en: 'Get back to your run.',
    es: 'Retoma tu carrera.',
    de: 'Zurück in deinen Lauf.',
    pt: 'Retome sua corrida.',
  },
  errorSubtitle: {
    fr: "Un accroc technique a coupé la scène. Ton territoire, lui, n'a pas bougé.",
    en: "A technical hiccup cut the scene. Your territory hasn't moved.",
    es: 'Un fallo técnico cortó la escena. Tu territorio no se ha movido.',
    de: 'Ein technischer Aussetzer hat die Szene unterbrochen. Dein Gebiet ist unverändert.',
    pt: 'Um tropeço técnico cortou a cena. Seu território não se moveu.',
  },
  errorReload: {
    fr: 'Recharger',
    en: 'Reload',
    es: 'Recargar',
    de: 'Neu laden',
    pt: 'Recarregar',
  },

  // ── UI partagée : retour (StackScreen + header du planner) ───────────────
  back: {
    fr: 'Retour',
    en: 'Back',
    es: 'Atrás',
    de: 'Zurück',
    pt: 'Voltar',
  },

  // ── Origine / états GPS (jamais de mensonge de position) ─────────────────
  demoOriginLabel: {
    fr: 'Démo · Paris',
    en: 'Demo · Paris',
    es: 'Demo · París',
    de: 'Demo · Paris',
    pt: 'Demo · Paris',
  },
  myPosition: {
    fr: 'Ma position',
    en: 'My location',
    es: 'Mi posición',
    de: 'Mein Standort',
    pt: 'Minha posição',
  },
  locating: {
    fr: 'Localisation…',
    en: 'Locating…',
    es: 'Localizando…',
    de: 'Ortung läuft…',
    pt: 'Localizando…',
  },
  positionNotFound: {
    fr: 'Position introuvable',
    en: 'Location not found',
    es: 'Posición no encontrada',
    de: 'Standort nicht gefunden',
    pt: 'Posição não encontrada',
  },
  hintGpsOk: {
    fr: 'Départ = ta position actuelle (touche pour recentrer).',
    en: 'Start = your current location (tap to recenter).',
    es: 'Salida = tu posición actual (toca para recentrar).',
    de: 'Start = dein aktueller Standort (zum Zentrieren tippen).',
    pt: 'Largada = sua posição atual (toque para recentrar).',
  },
  hintGpsDemo: {
    fr: 'Géolocalisation indisponible ici — tracé démo autour de Paris.',
    en: 'Geolocation unavailable here — demo route around Paris.',
    es: 'Geolocalización no disponible aquí — trazado demo alrededor de París.',
    de: 'Ortung hier nicht verfügbar — Demo-Strecke um Paris.',
    pt: 'Geolocalização indisponível aqui — traçado demo ao redor de Paris.',
  },
  hintGpsError: {
    fr: 'Position introuvable — active la localisation pour partir.',
    en: 'Location not found — turn on location to start.',
    es: 'Posición no encontrada — activa la ubicación para salir.',
    de: 'Standort nicht gefunden — zum Starten die Ortung aktivieren.',
    pt: 'Posição não encontrada — ative a localização para começar.',
  },
  hintGpsLocating: {
    fr: 'Le départ sera calé sur ta position réelle.',
    en: 'The start will be set to your real location.',
    es: 'La salida se fijará en tu posición real.',
    de: 'Der Start wird auf deinen echten Standort gelegt.',
    pt: 'A largada será fixada na sua posição real.',
  },
  summaryGpsError: {
    fr: 'Active la localisation pour préparer ta boucle.',
    en: 'Turn on location to prepare your loop.',
    es: 'Activa la ubicación para preparar tu bucle.',
    de: 'Aktiviere die Ortung, um deine Runde zu planen.',
    pt: 'Ative a localização para preparar sua volta.',
  },
  summaryDemoComputing: {
    fr: 'Boucle démo en calcul autour de Paris.',
    en: 'Demo loop being computed around Paris.',
    es: 'Bucle demo en cálculo alrededor de París.',
    de: 'Demo-Runde um Paris wird berechnet.',
    pt: 'Volta demo em cálculo ao redor de Paris.',
  },
  summaryWaitingPosition: {
    fr: 'Ta boucle arrive dès que ta position est confirmée.',
    en: 'Your loop arrives as soon as your location is confirmed.',
    es: 'Tu bucle llega en cuanto se confirme tu posición.',
    de: 'Deine Runde kommt, sobald dein Standort bestätigt ist.',
    pt: 'Sua volta chega assim que sua posição for confirmada.',
  },
  mapComputing: {
    fr: 'Calcul de l’itinéraire…',
    en: 'Computing the route…',
    es: 'Calculando la ruta…',
    de: 'Route wird berechnet…',
    pt: 'Calculando a rota…',
  },

  // ── Résumé header + microcopy CTA (minutes toujours estimées « ~ ») ──────
  summaryDefense: {
    fr: '{dur} · +{zones} zones · {streets} rues à défendre',
    en: '{dur} · +{zones} zones · {streets} streets to defend',
    es: '{dur} · +{zones} zonas · {streets} calles por defender',
    de: '{dur} · +{zones} Zonen · {streets} Straßen zu halten',
    pt: '{dur} · +{zones} zonas · {streets} ruas a defender',
  },
  summaryConquest: {
    fr: '{dur} · +{zones} zones · +{pts} pts',
    en: '{dur} · +{zones} zones · +{pts} pts',
    es: '{dur} · +{zones} zonas · +{pts} pts',
    de: '{dur} · +{zones} Zonen · +{pts} Pkt.',
    pt: '{dur} · +{zones} zonas · +{pts} pts',
  },
  ctaMicro: {
    fr: '{km} km · ~{min} min · +{pts} pts',
    en: '{km} km · ~{min} min · +{pts} pts',
    es: '{km} km · ~{min} min · +{pts} pts',
    de: '{km} km · ~{min} min · +{pts} Pkt.',
    pt: '{km} km · ~{min} min · +{pts} pts',
  },
  ctaPositionRequired: {
    fr: 'Position requise pour partir',
    en: 'Location required to start',
    es: 'Posición necesaria para salir',
    de: 'Standort nötig zum Starten',
    pt: 'Posição necessária para começar',
  },

  // ── Toasts (honnêtes, re-tentables) ──────────────────────────────────────
  toastRouteUnavailable: {
    fr: 'Parcours indisponible — réessaie dans un instant',
    en: 'Route unavailable — try again in a moment',
    es: 'Ruta no disponible — reintenta en un momento',
    de: 'Route nicht verfügbar — gleich noch mal versuchen',
    pt: 'Rota indisponível — tente de novo em instantes',
  },
  toastPositionNotFound: {
    fr: 'Position introuvable — active la localisation',
    en: 'Location not found — turn on location',
    es: 'Posición no encontrada — activa la ubicación',
    de: 'Standort nicht gefunden — Ortung aktivieren',
    pt: 'Posição não encontrada — ative a localização',
  },
  /** Bouton + a11y du filet d'échec GPS natif. */
  retryLocation: {
    fr: 'Réessayer la localisation',
    en: 'Retry location',
    es: 'Reintentar la ubicación',
    de: 'Ortung erneut versuchen',
    pt: 'Tentar a localização de novo',
  },
  a11yRecenter: {
    fr: 'Recentrer sur ma position',
    en: 'Recenter on my location',
    es: 'Recentrar en mi posición',
    de: 'Auf meinen Standort zentrieren',
    pt: 'Recentrar na minha posição',
  },

  // ── Kickers de section (MAJUSCULES conservées ; « CREW » invariant) ──────
  secStart: {
    fr: 'DÉPART',
    en: 'START',
    es: 'SALIDA',
    de: 'START',
    pt: 'LARGADA',
  },
  secWhy: {
    fr: 'POURQUOI CETTE COURSE',
    en: 'WHY THIS RUN',
    es: 'POR QUÉ ESTA CARRERA',
    de: 'WARUM DIESER LAUF',
    pt: 'POR QUE ESTA CORRIDA',
  },
  secPlans: {
    fr: 'PLANS',
    en: 'PLANS',
    es: 'PLANES',
    de: 'PLÄNE',
    pt: 'PLANOS',
  },
  secObjective: {
    fr: 'OBJECTIF',
    en: 'OBJECTIVE',
    es: 'OBJETIVO',
    de: 'ZIEL',
    pt: 'OBJETIVO',
  },
  secExactDistance: {
    fr: 'DISTANCE EXACTE',
    en: 'EXACT DISTANCE',
    es: 'DISTANCIA EXACTA',
    de: 'GENAUE DISTANZ',
    pt: 'DISTÂNCIA EXATA',
  },
  secOtherLoops: {
    fr: 'AUTRES BOUCLES',
    en: 'OTHER LOOPS',
    es: 'OTROS BUCLES',
    de: 'ANDERE RUNDEN',
    pt: 'OUTRAS VOLTAS',
  },

  // ── Plans (3 chips 1/3 d'écran — COURTS, §A) ─────────────────────────────
  planRecommended: {
    fr: 'Recommandée',
    en: 'Recommended',
    es: 'Recomendada',
    de: 'Empfohlen',
    pt: 'Recomendada',
  },
  planFast: {
    fr: 'Rapide',
    en: 'Fast',
    es: 'Rápida',
    de: 'Schnell',
    pt: 'Rápida',
  },
  planMaxPoints: {
    fr: 'Max points',
    en: 'Max points',
    es: 'Máx. puntos',
    de: 'Max. Punkte',
    pt: 'Máx. pontos',
  },
  planStatusBalance: {
    fr: 'Meilleur équilibre',
    en: 'Best balance',
    es: 'Mejor equilibrio',
    de: 'Beste Balance',
    pt: 'Melhor equilíbrio',
  },
  planStatusSimple: {
    fr: 'Simple et proche',
    en: 'Simple and close',
    es: 'Simple y cercana',
    de: 'Einfach und nah',
    pt: 'Simples e perto',
  },
  planStatusZones: {
    fr: 'Plus de zones',
    en: 'More zones',
    es: 'Más zonas',
    de: 'Mehr Zonen',
    pt: 'Mais zonas',
  },
  planChosen: {
    fr: 'Choisi',
    en: 'Chosen',
    es: 'Elegido',
    de: 'Gewählt',
    pt: 'Escolhido',
  },
  a11yPlan: {
    fr: 'Plan {label}, {km} kilomètres',
    en: 'Plan {label}, {km} kilometers',
    es: 'Plan {label}, {km} kilómetros',
    de: 'Plan {label}, {km} Kilometer',
    pt: 'Plano {label}, {km} quilômetros',
  },

  // ── « Ajuster » : objectif, distance, variantes, partage crew ────────────
  adjustRun: {
    fr: 'Ajuster la course',
    en: 'Adjust the run',
    es: 'Ajustar la carrera',
    de: 'Lauf anpassen',
    pt: 'Ajustar a corrida',
  },
  a11yObjective: {
    fr: 'Objectif {label}',
    en: 'Objective {label}',
    es: 'Objetivo {label}',
    de: 'Ziel {label}',
    pt: 'Objetivo {label}',
  },
  a11yDecreaseDistance: {
    fr: 'Diminuer la distance',
    en: 'Decrease distance',
    es: 'Reducir la distancia',
    de: 'Distanz verringern',
    pt: 'Diminuir a distância',
  },
  a11yIncreaseDistance: {
    fr: 'Augmenter la distance',
    en: 'Increase distance',
    es: 'Aumentar la distancia',
    de: 'Distanz erhöhen',
    pt: 'Aumentar a distância',
  },
  a11yDistanceKm: {
    fr: 'Distance en kilomètres',
    en: 'Distance in kilometers',
    es: 'Distancia en kilómetros',
    de: 'Distanz in Kilometern',
    pt: 'Distância em quilômetros',
  },
  distanceRangeHint: {
    fr: '{min} à {max} km — le tracé suit les rues.',
    en: '{min} to {max} km — the route follows the streets.',
    es: '{min} a {max} km — el trazado sigue las calles.',
    de: '{min} bis {max} km — die Route folgt den Straßen.',
    pt: '{min} a {max} km — o traçado segue as ruas.',
  },
  // §A : chip courte — « Regenerieren » passerait, « Neu erzeugen » est plus net.
  regenerate: {
    fr: 'Régénérer',
    en: 'Regenerate',
    es: 'Regenerar',
    de: 'Neu erzeugen',
    pt: 'Regenerar',
  },
  a11yRegenerate: {
    fr: "Régénérer d'autres boucles",
    en: 'Regenerate other loops',
    es: 'Regenerar otros bucles',
    de: 'Andere Runden neu erzeugen',
    pt: 'Gerar outras voltas',
  },
  loopsUnavailable: {
    fr: 'Autres boucles indisponibles',
    en: 'Other loops unavailable',
    es: 'Otros bucles no disponibles',
    de: 'Keine anderen Runden verfügbar',
    pt: 'Outras voltas indisponíveis',
  },
  variantN: {
    fr: 'Variante {n}',
    en: 'Variant {n}',
    es: 'Variante {n}',
    de: 'Variante {n}',
    pt: 'Variante {n}',
  },
  a11yVariant: {
    fr: 'Variante {n}, {km} km',
    en: 'Variant {n}, {km} km',
    es: 'Variante {n}, {km} km',
    de: 'Variante {n}, {km} km',
    pt: 'Variante {n}, {km} km',
  },
  variantStats: {
    fr: '{km} km · +{zones} zones',
    en: '{km} km · +{zones} zones',
    es: '{km} km · +{zones} zonas',
    de: '{km} km · +{zones} Zonen',
    pt: '{km} km · +{zones} zonas',
  },
  variantMeta: {
    fr: '~{min} min · +{pts} pts',
    en: '~{min} min · +{pts} pts',
    es: '~{min} min · +{pts} pts',
    de: '~{min} min · +{pts} Pkt.',
    pt: '~{min} min · +{pts} pts',
  },
  shareToCrew: {
    fr: 'Partager au crew',
    en: 'Share with crew',
    es: 'Compartir con el crew',
    de: 'Mit Crew teilen',
    pt: 'Compartilhar com o crew',
  },
  a11yShareCrew: {
    fr: 'Partager cette route au crew',
    en: 'Share this route with the crew',
    es: 'Compartir esta ruta con el crew',
    de: 'Diese Route mit der Crew teilen',
    pt: 'Compartilhar esta rota com o crew',
  },
  shareToastText: {
    fr: 'Boucle {km} km autour de {place} ajoutée à ton plan de crew (démo)',
    en: '{km} km loop around {place} added to your crew plan (demo)',
    es: 'Bucle de {km} km alrededor de {place} añadido a tu plan de crew (demo)',
    de: '{km}-km-Runde um {place} zu deinem Crew-Plan hinzugefügt (Demo)',
    pt: 'Volta de {km} km ao redor de {place} adicionada ao seu plano de crew (demo)',
  },
  justNow: {
    fr: "à l'instant",
    en: 'just now',
    es: 'ahora mismo',
    de: 'gerade eben',
    pt: 'agora mesmo',
  },
  a11yStart: {
    fr: '{verb} — démarrer',
    en: '{verb} — start',
    es: '{verb} — empezar',
    de: '{verb} — starten',
    pt: '{verb} — começar',
  },

  // ── Intentions du générateur (verbes = chips + CTA, §A COURTS) ───────────
  // Aligné sur nav.ts (bouton central) : de EROBERN / SCHÜTZEN, jamais de
  // composé à rallonge.
  intentConquer: {
    fr: 'Conquérir',
    en: 'Conquer',
    es: 'Conquistar',
    de: 'Erobern',
    pt: 'Conquistar',
  },
  intentAttack: {
    fr: 'Attaquer',
    en: 'Attack',
    es: 'Atacar',
    de: 'Angreifen',
    pt: 'Atacar',
  },
  intentDefend: {
    fr: 'Défendre',
    en: 'Defend',
    es: 'Defender',
    de: 'Schützen',
    pt: 'Defender',
  },
  intentStatusConquer: {
    fr: 'Conquête recommandée',
    en: 'Conquest recommended',
    es: 'Conquista recomendada',
    de: 'Eroberung empfohlen',
    pt: 'Conquista recomendada',
  },
  intentStatusAttack: {
    fr: 'Raid sur la frontière rivale',
    en: 'Raid on the rival border',
    es: 'Raid en la frontera rival',
    de: 'Raid an der Rivalen-Grenze',
    pt: 'Raid na fronteira rival',
  },
  intentStatusDefend: {
    fr: 'Défends ton secteur',
    en: 'Defend your sector',
    es: 'Defiende tu sector',
    de: 'Schütze deinen Sektor',
    pt: 'Defenda seu setor',
  },

  // ── Chips « Pourquoi cette course » (COURTES, §A) ────────────────────────
  reasonRivalBorder: {
    fr: 'Frontière rivale',
    en: 'Rival border',
    es: 'Frontera rival',
    de: 'Rivalen-Grenze',
    pt: 'Fronteira rival',
  },
  reasonHoldSector: {
    fr: 'Secteur à tenir',
    en: 'Sector to hold',
    es: 'Sector por defender',
    de: 'Sektor halten',
    pt: 'Setor a defender',
  },
  reasonAtYourDoor: {
    fr: 'À ta porte',
    en: 'At your door',
    es: 'En tu puerta',
    de: 'Vor deiner Tür',
    pt: 'Na sua porta',
  },
  reasonShortFormat: {
    fr: 'Format court',
    en: 'Short format',
    es: 'Formato corto',
    de: 'Kurzes Format',
    pt: 'Formato curto',
  },
  reasonMediumFormat: {
    fr: 'Format moyen',
    en: 'Medium format',
    es: 'Formato medio',
    de: 'Mittleres Format',
    pt: 'Formato médio',
  },
  reasonLongLoop: {
    fr: 'Grande boucle',
    en: 'Big loop',
    es: 'Gran bucle',
    de: 'Große Runde',
    pt: 'Volta grande',
  },
  reasonFollowsStreets: {
    fr: 'Suit les rues',
    en: 'Follows streets',
    es: 'Sigue las calles',
    de: 'Folgt den Straßen',
    pt: 'Segue as ruas',
  },

  // ── D'OÙ VIENT LA DISTANCE PROPOSÉE (features/route/suggestion.ts) ────────
  // UNE phrase, sous les puces « Pourquoi cette course » — le coureur doit
  // toujours pouvoir savoir POURQUOI on lui propose ça. « Adapté à tes
  // habitudes » n'est autorisé QUE dans l'état `learned` : c'est le mensonge
  // que ce chantier supprime (l'ex-puce de demo.ts l'affichait sans rien
  // apprendre). Les trois autres états disent le défaut ET sa cause.
  whyLearned: {
    fr: 'Adapté à tes habitudes : ~{km} km · {n} courses analysées',
    en: 'Matched to your habits: ~{km} km · {n} runs analysed',
    es: 'Ajustado a tus hábitos: ~{km} km · {n} carreras analizadas',
    de: 'An deine Gewohnheiten angepasst: ~{km} km · {n} Läufe ausgewertet',
    pt: 'Ajustado aos seus hábitos: ~{km} km · {n} corridas analisadas',
  },
  whyManual: {
    fr: 'Ta distance réglée : ~{km} km · elle prime sur l’apprentissage',
    en: 'Your set distance: ~{km} km · it overrides learning',
    es: 'Tu distancia fijada: ~{km} km · manda sobre el aprendizaje',
    de: 'Deine eingestellte Distanz: ~{km} km · sie geht vor dem Lernen',
    pt: 'Sua distância definida: ~{km} km · vem antes do aprendizado',
  },
  whyDefaultLearning: {
    fr: 'Distance par défaut : ~{km} km · encore {n} courses pour personnaliser',
    en: 'Default distance: ~{km} km · {n} more runs to personalise',
    es: 'Distancia por defecto: ~{km} km · faltan {n} carreras para personalizar',
    de: 'Standarddistanz: ~{km} km · noch {n} Läufe zum Personalisieren',
    pt: 'Distância padrão: ~{km} km · faltam {n} corridas para personalizar',
  },
  whyDefaultOff: {
    fr: 'Distance par défaut : ~{km} km · apprentissage désactivé',
    en: 'Default distance: ~{km} km · learning turned off',
    es: 'Distancia por defecto: ~{km} km · aprendizaje desactivado',
    de: 'Standarddistanz: ~{km} km · Lernen deaktiviert',
    pt: 'Distância padrão: ~{km} km · aprendizado desativado',
  },
  whyDefaultUnknown: {
    fr: 'Distance par défaut : ~{km} km · rien d’appris pour l’instant',
    en: 'Default distance: ~{km} km · nothing learned yet',
    es: 'Distancia por defecto: ~{km} km · nada aprendido aún',
    de: 'Standarddistanz: ~{km} km · noch nichts gelernt',
    pt: 'Distância padrão: ~{km} km · nada aprendido ainda',
  },

  // ── Marqueurs de la carte du planner (labels COURTS sur tuiles) ──────────
  mapStart: {
    fr: 'DÉPART',
    en: 'START',
    es: 'SALIDA',
    de: 'START',
    pt: 'LARGADA',
  },
  mapStartReturn: {
    fr: 'DÉPART · RETOUR',
    en: 'START · FINISH',
    es: 'SALIDA · VUELTA',
    de: 'START · ZIEL',
    pt: 'LARGADA · VOLTA',
  },

  // ── Route = objet social (demo.ts, consommé par Aujourd'hui) ─────────────
  socialNameConquest: {
    fr: 'Route conquête {zone}',
    en: 'Conquest route {zone}',
    es: 'Ruta conquista {zone}',
    de: 'Eroberungsroute {zone}',
    pt: 'Rota conquista {zone}',
  },
  socialNameDefense: {
    fr: 'Route défense {zone}',
    en: 'Defense route {zone}',
    es: 'Ruta defensa {zone}',
    de: 'Verteidigungsroute {zone}',
    pt: 'Rota defesa {zone}',
  },
  sharedToCrewFeed: {
    fr: '{name} partagée au crew',
    en: '{name} shared with the crew',
    es: '{name} compartida con el crew',
    de: '{name} mit der Crew geteilt',
    pt: '{name} compartilhada com o crew',
  },

  // ── Itinéraires populaires (signal social, accord sing./plur.) ───────────
  crewsTakenOne: {
    fr: "{n} crew l'a prise",
    en: '{n} crew took it',
    es: '{n} crew la ha tomado',
    de: '{n} Crew ist sie gelaufen',
    pt: '{n} crew fez essa',
  },
  crewsTakenMany: {
    fr: "{n} crews l'ont prise",
    en: '{n} crews took it',
    es: '{n} crews la han tomado',
    de: '{n} Crews sind sie gelaufen',
    pt: '{n} crews fizeram essa',
  },
});
