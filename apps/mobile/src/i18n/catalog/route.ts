/**
 * GRYD — i18n : catalogue du domaine « planificateur de boucle » (/route-planner,
 * carte du planner, objectifs) + composants UI partagés à texte propre
 * (ErrorBoundary, StackScreen).
 * Parité 5 langues imposée par le type Entry — une langue manquante = erreur TS.
 *
 * INVARIANTS jamais traduits (restent en dur dans les composants) :
 * GRYD, GO, Crew, km, min, noms propres (Paris, République…).
 * §A CONTRAIGNANT : chips/CTA/boutons COURTS dans les 5 langues (l'allemand est
 * reformulé concis : EROBERN, SCHÜTZEN, « Neu erzeugen »… — jamais tronqué à 375px).
 *
 * ─── LA COPIE SUPPRIMÉE LE 25/07/2026, ET POURQUOI ────────────────────────────
 * Quatorze entrées sont parties parce qu'elles NOMMAIENT une chose qui n'existe
 * pas dans le code :
 *   · `summaryConquest` / `summaryDefense` / `ctaMicro` / `variantStats` /
 *     `variantMeta` portaient « +{zones} zones » et « +{pts} pts » — un gain
 *     territorial et un score annoncés AVANT la course, calculés côté client à
 *     partir de deux constantes inventées. Le serveur seul décide un claim, et
 *     seulement APRÈS la course ;
 *   · `shareToCrew` / `a11yShareCrew` / `shareToastText` / `justNow` habillaient
 *     un bouton qui n'écrivait nulle part — son propre toast avouait « (démo) »,
 *     et une fausse ligne de feed s'empilait « à l'instant ». Une étiquette
 *     « démo » ne rachète pas une action qui n'a pas lieu (AMENDEMENT-47) ;
 *   · `demoOriginLabel` / `hintGpsDemo` / `summaryDemoComputing` nommaient un
 *     repli « Démo · Paris » supprimé du code depuis le 21/07 — de la copie qui
 *     survivait à sa fonctionnalité, prête à être rebranchée par mégarde ;
 *   · `crewsTakenOne` / `crewsTakenMany` / `socialName*` / `sharedToCrewFeed`
 *     décrivaient un signal social (« 3 crews l'ont prise ») sans aucune source ;
 *   · `planMaxPoints` (« Max points ») et `planStatusZones` (« Plus de zones »)
 *     promettaient un rendement de jeu à un simple format de distance ;
 *   · `reasonRivalBorder` / `reasonHoldSector` affirmaient une frontière rivale
 *     et un secteur tenu que cet écran ne lit nulle part.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── UI partagée : ErrorBoundary (écran d'erreur brandé) ──────────────────
  //
  // ─── POURQUOI « SORTIE » ET NON « COURSE » (26/07/2026) ───────────────────
  // Ces textes-là NE PORTENT PAS la lentille : `ErrorBoundary` s'interpose
  // au-dessus de n'importe quel écran, y compris ceux du monde vélo, et il ne
  // reçoit AUCUNE discipline (`ui/ErrorBoundary.tsx` — pas une prop, pas un
  // paramètre d'URL). Il n'a donc aucun moyen de savoir quel effort la personne
  // préparait, et un jumeau par discipline y serait un texte sans surface :
  // rien ne pourrait le choisir.
  // Ce qui reste possible — et exigible — c'est de ne pas AFFIRMER l'effort :
  // un cycliste dont l'app plante lisait « Reprends ta course. », un verbe qui
  // décrit ce qu'il ne faisait pas. Le vocabulaire neutre du projet est celui
  // que `catalog/runGps.ts` emploie déjà pour la pill de la sortie en cours
  // (« Sortie enregistrée comme … » / outing / salida / Aktivität / atividade).
  // Verrouillé par `catalog/route.test.ts`.
  errorTitle: {
    fr: 'Reprends ta sortie.',
    en: 'Get back to your outing.',
    es: 'Retoma tu salida.',
    de: 'Zurück in deine Aktivität.',
    pt: 'Retome sua atividade.',
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

  // ── UI partagée : FRONTIÈRE D'ERREUR DE L'APP (AppErrorBoundary) ──────────
  // Le fondateur a vu « fonts is not defined » écrit en toutes lettres sur
  // l'app. Ces textes sont ce qui s'affiche à la place. Trois contraintes les
  // gouvernent, et elles sont vérifiées par `appErrorPolicy.test.ts` :
  //
  //  1. AUCUN TERME TECHNIQUE. Pas de nom de symbole, pas de fichier, pas de
  //     pile d'appel — et pas même le mot « erreur », qui ne dit rien à faire.
  //     On nomme le FAIT (« cet écran n'a pas pu s'afficher ») et la SUITE.
  //  2. RIEN SUR LES DONNÉES DU JOUEUR, sinon pour le rassurer avec ce qui est
  //     VRAI : un plantage de rendu côté client ne déplace pas ce que le
  //     serveur détient. On ne parle donc que des courses ENVOYÉES et des
  //     territoires — jamais d'une course en cours pas encore remontée, qui a
  //     son propre filet (`pendingUpload`) et qu'on n'a pas le droit de
  //     promettre ici.
  //  3. UNE SORTIE RÉELLE, pas un cul-de-sac : réessayer (l'écran se
  //     reconstruit) ou revenir à la carte (on repart de la racine du jeu).
  //
  // Deux familles seulement, parce que le joueur n'a que deux situations : sur
  // `network` il a une action à lui (son réseau), sur `display` il n'en a
  // aucune — et lui laisser croire le contraire serait lui faire porter un
  // défaut qui n'est pas le sien.
  crashTitleDisplay: {
    fr: "Cet écran n'a pas pu s'afficher.",
    en: 'This screen could not be displayed.',
    es: 'Esta pantalla no ha podido mostrarse.',
    de: 'Dieser Bildschirm konnte nicht angezeigt werden.',
    pt: 'Esta tela não pôde ser exibida.',
  },
  crashBodyDisplay: {
    fr: "C'est l'affichage qui a lâché, pas ton compte : tes sorties envoyées et tes territoires sont côté serveur, ils n'ont pas bougé.",
    en: 'The display gave out, not your account: your uploaded outings and your territories are on the server, and they have not moved.',
    es: 'Ha fallado la pantalla, no tu cuenta: tus salidas enviadas y tus territorios están en el servidor y no se han movido.',
    de: 'Die Anzeige hat ausgesetzt, nicht dein Konto: deine übertragenen Aktivitäten und deine Gebiete liegen auf dem Server und sind unverändert.',
    pt: 'Foi a exibição que falhou, não a sua conta: suas atividades enviadas e seus territórios estão no servidor e não se moveram.',
  },
  crashTitleNetwork: {
    fr: "GRYD n'a pas pu joindre le serveur.",
    en: 'GRYD could not reach the server.',
    es: 'GRYD no ha podido conectar con el servidor.',
    de: 'GRYD konnte den Server nicht erreichen.',
    pt: 'O GRYD não conseguiu acessar o servidor.',
  },
  crashBodyNetwork: {
    fr: "La connexion s'est coupée pendant le chargement. Rien n'est perdu : tes sorties envoyées et tes territoires restent côté serveur. Vérifie ton réseau, puis réessaie.",
    en: 'The connection dropped while loading. Nothing is lost: your uploaded outings and your territories stay on the server. Check your network, then try again.',
    es: 'La conexión se cortó durante la carga. No se pierde nada: tus salidas enviadas y tus territorios siguen en el servidor. Revisa tu red y reinténtalo.',
    de: 'Die Verbindung ist beim Laden abgebrochen. Nichts geht verloren: deine übertragenen Aktivitäten und deine Gebiete bleiben auf dem Server. Prüfe dein Netz und versuche es erneut.',
    pt: 'A conexão caiu durante o carregamento. Nada se perde: suas atividades enviadas e seus territórios continuam no servidor. Verifique sua rede e tente de novo.',
  },
  // §A — libellés COURTS, jamais tronqués à 375 px.
  crashRetry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  crashBackToMap: {
    fr: 'Revenir à la carte',
    en: 'Back to the map',
    es: 'Volver al mapa',
    de: 'Zurück zur Karte',
    pt: 'Voltar ao mapa',
  },
  /** Intitulé du bloc de détail — visible en DÉVELOPPEMENT uniquement. */
  crashDevKicker: {
    fr: 'Détail technique · dev',
    en: 'Technical detail · dev',
    es: 'Detalle técnico · dev',
    de: 'Technisches Detail · dev',
    pt: 'Detalhe técnico · dev',
  },

  // ── Filet FATAL : l'erreur précède tout arbre React (alerte native) ───────
  // Aucun écran ne peut être monté (module qui casse à l'évaluation, tâche
  // native). On garde la même honnêteté, avec la seule reprise qui existe
  // alors : relancer l'app.
  crashAlertTitle: {
    fr: "GRYD s'est interrompu",
    en: 'GRYD stopped',
    es: 'GRYD se ha interrumpido',
    de: 'GRYD wurde unterbrochen',
    pt: 'O GRYD foi interrompido',
  },
  crashAlertBody: {
    fr: "L'app s'est arrêtée avant d'avoir pu dessiner l'écran. Tes sorties envoyées et tes territoires sont côté serveur, intacts. Relance GRYD pour reprendre.",
    en: 'The app stopped before it could draw the screen. Your uploaded outings and your territories are on the server, untouched. Relaunch GRYD to pick up where you left off.',
    es: 'La app se detuvo antes de poder dibujar la pantalla. Tus salidas enviadas y tus territorios están en el servidor, intactos. Reinicia GRYD para continuar.',
    de: 'Die App hat gestoppt, bevor der Bildschirm gezeichnet werden konnte. Deine übertragenen Aktivitäten und deine Gebiete liegen unverändert auf dem Server. Starte GRYD neu, um weiterzumachen.',
    pt: 'O app parou antes de conseguir desenhar a tela. Suas atividades enviadas e seus territórios estão no servidor, intactos. Reinicie o GRYD para continuar.',
  },
  crashAlertOk: {
    fr: 'Compris',
    en: 'Got it',
    es: 'Entendido',
    de: 'Verstanden',
    pt: 'Entendi',
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
  // Zone carte, état `unasked` : elle disait « Position requise pour partir »,
  // mot pour mot la microcopie du bouton, elle-même sous une ligne d'en-tête qui
  // dit déjà la même chose. Trois fois la même phrase à trois hauteurs d'écran :
  // §A « compris en moins de 3 s » ne survit pas à la redondance. Cette zone dit
  // désormais ce qu'ELLE contiendra, et rien d'autre.
  mapPreviewEmpty: {
    fr: 'Le tracé s’affichera ici.',
    en: 'The route will appear here.',
    es: 'El trazado aparecerá aquí.',
    de: 'Die Route erscheint hier.',
    pt: 'O traçado aparecerá aqui.',
  },

  // ── Ligne de contexte de l'en-tête ───────────────────────────────────────
  // Ce qui remplace « ~26 min · +N zones · +N pts ». Il ne reste qu'une chose
  // vraie — la durée — et elle n'existe que si l'allure du joueur a été MESURÉE.
  // Sinon on documente l'absence en gris, comme partout ailleurs dans l'app.
  summaryDuration: {
    fr: '~{min} min à ton allure habituelle.',
    en: '~{min} min at your usual pace.',
    es: '~{min} min a tu ritmo habitual.',
    de: '~{min} min in deinem üblichen Tempo.',
    pt: '~{min} min no seu ritmo habitual.',
  },
  summaryNoPace: {
    fr: 'Durée non estimée — ton allure n’est pas connue.',
    en: 'No time estimate — your pace isn’t known.',
    es: 'Sin estimación de tiempo — no se conoce tu ritmo.',
    de: 'Keine Zeitschätzung — dein Tempo ist nicht bekannt.',
    pt: 'Sem estimativa de tempo — seu ritmo não é conhecido.',
  },

  // ── Microcopie sous le bouton unique (une phrase par geste, jamais « — ») ─
  ctaPositionRequired: {
    fr: 'Position requise pour partir',
    en: 'Location required to start',
    es: 'Posición necesaria para salir',
    de: 'Standort nötig zum Starten',
    pt: 'Posição necessária para começar',
  },
  ctaGpsAfterCountdown: {
    fr: 'Le GPS démarre après le décompte.',
    en: 'GPS starts after the countdown.',
    es: 'El GPS arranca tras la cuenta atrás.',
    de: 'Das GPS startet nach dem Countdown.',
    pt: 'O GPS começa após a contagem regressiva.',
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
  /** Bouton + a11y du filet d'échec GPS. */
  retryLocation: {
    fr: 'Réessayer la localisation',
    en: 'Retry location',
    es: 'Reintentar la ubicación',
    de: 'Ortung erneut versuchen',
    pt: 'Tentar a localização de novo',
  },
  retryRoute: {
    fr: 'Recalculer le tracé',
    en: 'Recompute the route',
    es: 'Recalcular el trazado',
    de: 'Route neu berechnen',
    pt: 'Recalcular o traçado',
  },
  a11yRecenter: {
    fr: 'Recentrer sur ma position',
    en: 'Recenter on my location',
    es: 'Recentrar en mi posición',
    de: 'Auf meinen Standort zentrieren',
    pt: 'Recentrar na minha posição',
  },

  // ── Kickers de section (mis en capitales par SectionLabel, pas par l'appelant) ──
  secStart: {
    fr: 'Départ',
    en: 'Start',
    es: 'Salida',
    de: 'Start',
    pt: 'Largada',
  },
  /**
   * ─── LES TROIS JUMEAUX DU PLANIFICATEUR (26/07/2026) ──────────────────────
   * `secWhy`, `adjustRun` et `a11yObjectiveGroup` NOMMENT l'effort, et l'écran
   * qui les rend PORTE la lentille : `/route-planner` relit sa discipline dans
   * l'URL (`parseStartActivity`, route-planner.tsx) et l'AFFICHE lui-même dans
   * son propre kicker (« CONQUÉRIR · BIKE · République »). Il est atteignable
   * en vélo par deux chemins qui transmettent la discipline —
   * `BattleMapOverlays.openPlanner` et l'écran Classement, tous deux via
   * `plannerHref(activity)`. Les rendre sans condition faisait donc dire à
   * l'écran, à quatre lignes d'intervalle, « BIKE » puis « cette course ».
   *
   * Un jumeau par discipline, PAS une neutralisation : ici le mot désigne
   * l'objet de l'écran lui-même (la sortie qu'on prépare, ici et maintenant),
   * pas un ailleurs. Le nommer précisément est possible et utile.
   * La sélection vit dans `features/route/plannerCopy.ts` (pure, testée).
   */
  secWhy: {
    fr: 'Pourquoi cette course',
    en: 'Why this run',
    es: 'Por qué esta carrera',
    de: 'Warum dieser Lauf',
    pt: 'Por que esta corrida',
  },
  secWhyBike: {
    fr: 'Pourquoi cette sortie vélo',
    en: 'Why this ride',
    es: 'Por qué esta salida en bici',
    de: 'Warum diese Radtour',
    pt: 'Por que esta pedalada',
  },
  secFormats: {
    fr: 'Formats',
    en: 'Formats',
    es: 'Formatos',
    de: 'Formate',
    pt: 'Formatos',
  },
  // Bloc à séparateurs des métriques : distance MESURÉE + durée si l'allure est
  // connue. Le gain en km² et la difficulté de la planche E05 n'ont aucune
  // source côté client — ils sont ABSENTS, pas remplis d'un chiffre plausible.
  estDistance: {
    fr: 'Distance',
    en: 'Distance',
    es: 'Distancia',
    de: 'Distanz',
    pt: 'Distância',
  },
  estDuration: {
    fr: 'Durée est.',
    en: 'Est. time',
    es: 'Tiempo est.',
    de: 'Dauer ca.',
    pt: 'Tempo est.',
  },
  secObjective: {
    fr: 'Objectif',
    en: 'Objective',
    es: 'Objetivo',
    de: 'Ziel',
    pt: 'Objetivo',
  },
  secExactDistance: {
    fr: 'Distance exacte',
    en: 'Exact distance',
    es: 'Distancia exacta',
    de: 'Genaue Distanz',
    pt: 'Distância exata',
  },
  secOtherLoops: {
    fr: 'Autres boucles',
    en: 'Other loops',
    es: 'Otros bucles',
    de: 'Andere Runden',
    pt: 'Outras voltas',
  },

  // ── Formats de distance (segmented défilant — libellés jamais tronqués) ───
  // « Max points » est parti : un format de distance ne rapporte rien tant que
  // le serveur n'a pas compté la course. Ces trois-là ne disent plus que ce
  // qu'ils sont — des longueurs.
  planRecommended: {
    fr: 'Recommandée',
    en: 'Recommended',
    es: 'Recomendada',
    de: 'Empfohlen',
    pt: 'Recomendada',
  },
  planShort: {
    fr: 'Courte',
    en: 'Short',
    es: 'Corta',
    de: 'Kurz',
    pt: 'Curta',
  },
  planLong: {
    fr: 'Longue',
    en: 'Long',
    es: 'Larga',
    de: 'Lang',
    pt: 'Longa',
  },
  /** Un segment = « libellé · 4,5 km » (le chiffre est déjà formaté). */
  planOption: {
    fr: '{label} · {km} km',
    en: '{label} · {km} km',
    es: '{label} · {km} km',
    de: '{label} · {km} km',
    pt: '{label} · {km} km',
  },
  a11yFormatsGroup: {
    fr: 'Format de la boucle',
    en: 'Loop format',
    es: 'Formato del bucle',
    de: 'Format der Runde',
    pt: 'Formato da volta',
  },

  // ── « Ajuster » : objectif, distance, variantes ──────────────────────────
  // `adjustRun` est à la fois le LIBELLÉ VISIBLE de l'accordéon et son libellé
  // d'accessibilité : sous lentille vélo il était donc lu à voix haute
  // « Ajuster la course » à quelqu'un qui prépare une sortie à vélo.
  adjustRun: {
    fr: 'Ajuster la course',
    en: 'Adjust the run',
    es: 'Ajustar la carrera',
    de: 'Lauf anpassen',
    pt: 'Ajustar a corrida',
  },
  adjustRunBike: {
    fr: 'Ajuster la sortie vélo',
    en: 'Adjust the ride',
    es: 'Ajustar la salida en bici',
    de: 'Radtour anpassen',
    pt: 'Ajustar a pedalada',
  },
  a11yObjectiveGroup: {
    fr: 'Objectif de la course',
    en: 'Run objective',
    es: 'Objetivo de la carrera',
    de: 'Ziel des Laufs',
    pt: 'Objetivo da corrida',
  },
  a11yObjectiveGroupBike: {
    fr: 'Objectif de la sortie vélo',
    en: 'Ride objective',
    es: 'Objetivo de la salida en bici',
    de: 'Ziel der Radtour',
    pt: 'Objetivo da pedalada',
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
  loopsComputing: {
    fr: 'Calcul des autres boucles…',
    en: 'Computing other loops…',
    es: 'Calculando otros bucles…',
    de: 'Andere Runden werden berechnet…',
    pt: 'Calculando outras voltas…',
  },
  loopsUnavailable: {
    fr: 'Autres boucles indisponibles — touche Régénérer.',
    en: 'Other loops unavailable — tap Regenerate.',
    es: 'Otros bucles no disponibles — toca Regenerar.',
    de: 'Keine anderen Runden verfügbar — auf Neu erzeugen tippen.',
    pt: 'Outras voltas indisponíveis — toque em Regenerar.',
  },
  /** Un segment de variante = « Variante 2 · 5,2 km ». */
  variantOption: {
    fr: 'Variante {n} · {km} km',
    en: 'Variant {n} · {km} km',
    es: 'Variante {n} · {km} km',
    de: 'Variante {n} · {km} km',
    pt: 'Variante {n} · {km} km',
  },
  a11yLoopsGroup: {
    fr: 'Autres boucles autour de toi',
    en: 'Other loops around you',
    es: 'Otros bucles a tu alrededor',
    de: 'Andere Runden in deiner Nähe',
    pt: 'Outras voltas perto de você',
  },
  a11yStart: {
    fr: '{verb} — démarrer',
    en: '{verb} — start',
    es: '{verb} — empezar',
    de: '{verb} — starten',
    pt: '{verb} — começar',
  },

  // ── Objectifs (verbes = segments + CTA, §A COURTS) ───────────────────────
  // Aligné sur nav.ts (bouton central) : de EROBERN / SCHÜTZEN, jamais de
  // composé à rallonge.
  intentConquer: {
    fr: 'Conquérir',
    en: 'Conquer',
    es: 'Conquistar',
    de: 'Erobern',
    pt: 'Conquistar',
  },
  intentDefend: {
    fr: 'Défendre',
    en: 'Defend',
    es: 'Defender',
    de: 'Schützen',
    pt: 'Defender',
  },

  // ── Puces « Pourquoi cette course » (COURTES, §A) ────────────────────────
  // Trois faits VÉRIFIABLES sur la boucle : elle part d'où tu es, elle fait
  // cette longueur-là, elle emprunte des rues. Rien sur le territoire.
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
  // habitudes » n'est autorisé QUE dans l'état `learned`. Les trois autres
  // états disent le défaut ET sa cause.
  //
  // ─── POURQUOI `whyLearned` ET `whyDefaultLearning` N'ONT PAS DE JUMEAU ────
  // Elles nomment des « courses » (« {n} courses analysées », « encore {n}
  // courses pour personnaliser ») et le balayage du 26/07/2026 les a relevées.
  // Elles restent pourtant TELLES QUELLES, et c'est un refus argumenté, pas un
  // oubli : sous lentille vélo, elles sont STRUCTURELLEMENT INATTEIGNABLES.
  //   · `useRouteSuggestion` calcule `habitsReadable =
  //     competitiveReadAllowed(activity, HABITS_SOURCE_IS_DISCIPLINED)` avec
  //     `HABITS_SOURCE_IS_DISCIPLINED = false` — la RPC `habits_inputs` (0055)
  //     lit `public.runs` SANS filtre `activity`, elle mélange les deux mondes ;
  //   · hors course à pied, `habitsReadable` est donc faux, la lecture est
  //     remplacée par `{ status: 'unavailable' }`, `routeDistancePrefsFrom`
  //     rend `learning: 'unknown'`, et `resolveRouteSuggestion` sort en
  //     `source: 'default'`, `cause: 'unavailable'`.
  // L'écran affiche alors `whyDefaultUnknown` (« rien d'appris pour l'instant »),
  // qui ne nomme aucun effort. Écrire les jumeaux aujourd'hui créerait deux
  // vérités à maintenir pour une surface qui n'existe pas.
  // ⚠️ LE JOUR OÙ `habits_inputs` PORTERA `activity` : passer
  // `HABITS_SOURCE_IS_DISCIPLINED` à `true` rend ces deux phrases atteignables
  // à vélo — elles devront alors recevoir leurs jumelles EN MÊME TEMPS.
  // `features/route/plannerCopy.test.ts` garde cette invariance sous test.
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
});
