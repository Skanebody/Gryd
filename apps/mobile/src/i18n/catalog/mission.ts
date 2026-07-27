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
  /**
   * ─── LA PORTE D'E16, OUVERTE LE 27/07/2026 ────────────────────────────────
   * E16 (`/map/missions/:missionId`) et E17 (`/map/prepare`) étaient livrés,
   * typés et testés, mais leur SEULE porte du dépôt était `(tabs)/warroom.tsx`,
   * qui commence par `if (!flags.warRoom) return <Redirect href="/" />` —
   * `warRoom` valant `FULL_SURFACE`, donc FAUX dans le build par défaut. Aucun
   * geste de joueur n'atteignait ces deux écrans. `audit-routes.mjs` ne le
   * voyait pas : il lit les liens, pas les drapeaux.
   *
   * La ligne mission de la Carte est la porte JUSTE : elle affiche déjà la
   * mission réelle, et E16 en est l'écran entier (les quatre états, la raison
   * dérivée, l'aperçu du tracé, puis E17). Le lien vers `/route-planner` qu'elle
   * portait n'est pas perdu — cinq autres surfaces y mènent (`classement.tsx`).
   */
  missionOpen: {
    fr: 'Voir la mission',
    en: 'View mission',
    es: 'Ver la misión',
    de: 'Mission ansehen',
    pt: 'Ver a missão',
  },
  missionOpenA11y: {
    fr: 'Voir la mission — ouvrir l’écran de mission',
    en: 'View mission — open the mission screen',
    es: 'Ver la misión — abrir la pantalla de misión',
    de: 'Mission ansehen — den Missionsbildschirm öffnen',
    pt: 'Ver a missão — abrir a tela de missão',
  },

  // ══ E05 — BRIEFING DE MISSION ══════════════════════════════════════════════
  // Ouvert par le CTA « Reprendre » de E04. Il transforme une intention en
  // objectif SANS formulaire — et ne promet RIEN que l'écran suivant ne tienne.

  /**
   * Kicker de la sheet, chemin CONQUÊTE (couleur de rôle §C portée par le
   * composant). « REPRISE » (planche E05 -selection11) plutôt que « MISSION »
   * générique : l'unique porte d'entrée de ce chemin est le CTA « Reprendre »
   * de E04, et le titre juste dessous dit déjà « Reprendre {zone} ». La variante
   * DÉFENSE (E22) porte son propre kicker (`map.defenseBriefKicker`).
   */
  briefKicker: {
    fr: 'REPRISE',
    en: 'RETAKE',
    es: 'RECUPERACIÓN',
    de: 'RÜCKHOLUNG',
    pt: 'RETOMADA',
  },
  /** Titre quand la zone porte un VRAI nom de quartier (géocodage inverse). */
  briefTitleNamed: {
    fr: 'Reprendre {zone}',
    en: 'Take back {zone}',
    es: 'Recuperar {zone}',
    de: '{zone} zurückholen',
    pt: 'Retomar {zone}',
  },
  /** Titre sans nom réel : on ne fabrique aucun quartier. */
  briefTitle: {
    fr: 'Reprendre cette zone',
    en: 'Take this zone back',
    es: 'Recuperar esta zona',
    de: 'Diese Zone zurückholen',
    pt: 'Retomar esta zona',
  },
  briefCloseA11y: {
    fr: 'Fermer le briefing et revenir à la zone',
    en: 'Close the briefing and go back to the zone',
    es: 'Cerrar el briefing y volver a la zona',
    de: 'Briefing schließen und zur Zone zurück',
    pt: 'Fechar o briefing e voltar à zona',
  },

  // ── Les QUATRE états du tracé recommandé, jamais confondus ──
  /**
   * Position inconnue. On ne déclenche AUCUNE invite système ici : la demande
   * de localisation naît d'un GESTE (le planificateur), jamais de l'ouverture
   * d'un écran — défaut corrigé le 21/07, qu'on ne réintroduit pas.
   */
  briefRouteNoPosition: {
    fr: 'Position inconnue : aucun itinéraire ne peut être calculé.',
    en: 'Position unknown: no route can be computed.',
    es: 'Posición desconocida: no se puede calcular ninguna ruta.',
    de: 'Position unbekannt: keine Route berechenbar.',
    pt: 'Posição desconhecida: nenhuma rota pode ser calculada.',
  },
  briefRouteLoading: {
    fr: 'Calcul de l’itinéraire…',
    en: 'Computing the route…',
    es: 'Calculando la ruta…',
    de: 'Route wird berechnet…',
    pt: 'Calculando a rota…',
  },
  briefRouteFailed: {
    fr: 'Itinéraire non calculé : le service de tracé n’a pas répondu.',
    en: 'Route not computed: the routing service didn’t answer.',
    es: 'Ruta no calculada: el servicio de trazado no respondió.',
    de: 'Route nicht berechnet: der Routing-Dienst antwortete nicht.',
    pt: 'Rota não calculada: o serviço de traçado não respondeu.',
  },
  briefRetry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  /** Aperçu PRÊT : le tracé dessiné est le VRAI tracé OSRM, rue par rue. */
  briefRouteA11y: {
    fr: 'Aperçu du tracé recommandé, {km}',
    en: 'Preview of the suggested route, {km}',
    es: 'Vista previa de la ruta sugerida, {km}',
    de: 'Vorschau der vorgeschlagenen Route, {km}',
    pt: 'Prévia da rota sugerida, {km}',
  },
  /** Ouvre le planificateur (tracé réel, réglage de distance, GPS au geste). */
  briefAdjust: {
    fr: 'Ajuster',
    en: 'Adjust',
    es: 'Ajustar',
    de: 'Anpassen',
    pt: 'Ajustar',
  },
  briefAdjustA11y: {
    fr: 'Ajuster l’itinéraire — ouvrir le planificateur',
    en: 'Adjust the route — open the planner',
    es: 'Ajustar la ruta — abrir el planificador',
    de: 'Route anpassen — den Planer öffnen',
    pt: 'Ajustar a rota — abrir o planejador',
  },

  /** Seule métrique sourcée : la distance MESURÉE par OSRM sur le tracé rendu. */
  briefMetricDistance: {
    fr: 'Distance',
    en: 'Distance',
    es: 'Distancia',
    de: 'Distanz',
    pt: 'Distância',
  },

  /**
   * Phrase de valeur tactique — neutre, non dramatisée, et surtout VRAIE : la
   * planche proposait « cette boucle relie vos deux zones », qu'aucune analyse
   * d'adjacence ne sait produire. Ce qui est vrai, c'est la règle du jeu
   * elle-même : le serveur tranche sur la boucle réellement fermée.
   */
  briefTactical: {
    fr: 'La capture se calcule sur la boucle que tu fermes vraiment : l’itinéraire reste une suggestion.',
    en: 'Capture is computed from the loop you actually close: the route stays a suggestion.',
    es: 'La captura se calcula sobre el bucle que cierras de verdad: la ruta es solo una sugerencia.',
    de: 'Die Eroberung zählt die Schleife, die du wirklich schließt — die Route bleibt ein Vorschlag.',
    pt: 'A captura conta o loop que você fecha de verdade: a rota é só uma sugestão.',
  },

  briefStart: {
    fr: 'Commencer la mission',
    en: 'Start the mission',
    es: 'Empezar la misión',
    de: 'Mission starten',
    pt: 'Começar a missão',
  },
  // ─── `briefStartA11y` SUPPRIMÉ (26/07/2026) ────────────────────────────────
  // « Commencer la mission — démarrer une COURSE de conquête », dans les cinq
  // langues. Elle n'avait plus aucun appelant depuis que l'accessibilité du CTA
  // se compose de `briefStart` + `ACTIVITY_NAME[activity]`
  // (`features/map/MissionBriefingSheet.tsx`), justement pour nommer la
  // discipline réelle. La garder, c'était laisser dans le catalogue une phrase
  // fausse au mot près sous lentille vélo, prête à être re-consommée par le
  // premier écran qui chercherait un libellé accessible tout fait. Une clé
  // morte n'est pas neutre : c'est un piège en attente.
  /**
   * Microtexte CORRIGÉ. La planche dit « le GPS démarre après le compte à
   * rebours » : c'est l'inverse du code — la position est acquise AVANT
   * d'entrer en préflight, et c'est l'ENREGISTREMENT qui part au dernier palier.
   */
  briefStartMicro: {
    fr: 'L’enregistrement démarre après le compte à rebours.',
    en: 'Recording starts after the countdown.',
    es: 'La grabación empieza tras la cuenta atrás.',
    de: 'Die Aufzeichnung startet nach dem Countdown.',
    pt: 'A gravação começa depois da contagem regressiva.',
  },

  // ══ E16 — MISSION RECOMMANDÉE (`/map/missions/:missionId`, spec l.1009) ════
  // Ajouté le 27/07/2026. La spec décrit un ÉCRAN, là où le dépôt n'avait
  // qu'une FEUILLE (`MissionBriefingSheet`, bloc « briefing » ci-dessus, ouvert
  // depuis le CTA « Reprendre » d'une zone). Les clés ci-dessous complètent le
  // catalogue EXISTANT plutôt que d'en ouvrir un second : c'est le même domaine,
  // les mêmes règles, et deux catalogues pour un domaine finissent toujours par
  // diverger.
  //
  // ─── CE QUE CET ÉCRAN N'AFFICHERA PAS, ET CE N'EST PAS UN OUBLI ───────────
  // La spec liste quatre métriques (distance, durée, surface potentielle,
  // difficulté). UNE SEULE a une source, et cette décision est déjà prise et
  // TESTÉE : `features/map/zoneDecision.ts` (`briefMetricKeys`) ne rend que la
  // DISTANCE, celle que le routeur OSRM a réellement mesurée.
  //   · DURÉE            → supposerait une allure fixe. On ne connaît pas
  //                        l'allure du joueur du jour ;
  //   · SURFACE POTENTIELLE → c'est le SERVEUR qui tranche, APRÈS la course
  //                        (constitution §4). L'annoncer avant serait une
  //                        promesse que seul le verdict peut tenir ;
  //   · DIFFICULTÉ       → n'existe que par des seuils de kilomètres inventés.
  // Aucune clé de durée, de gain ni de difficulté n'est donc ajoutée ici. Un
  // libellé disponible finit toujours par être affiché.

  /** Titre de l'écran (barre). Court : il cohabite avec un retour à 44 px. */
  screenTitle: {
    fr: 'Mission',
    en: 'Mission',
    es: 'Misión',
    de: 'Mission',
    pt: 'Missão',
  },
  /** Kicker au-dessus de l'objectif. La mission est PROPOSÉE, jamais imposée. */
  recoKicker: {
    fr: 'MISSION PROPOSÉE',
    en: 'SUGGESTED MISSION',
    es: 'MISIÓN PROPUESTA',
    de: 'VORGESCHLAGENE MISSION',
    pt: 'MISSÃO SUGERIDA',
  },

  // ── « Raison » (spec l.1009) — DÉRIVÉE, jamais une urgence fabriquée ──────
  /** Pourquoi celle-ci : une zone à moi s'efface bientôt (hex_claims.decay_at). */
  recoReasonExpiring: {
    fr: 'Parce que cette zone s’efface dans {h} h si personne n’y court.',
    en: 'Because this zone fades in {h} h if nobody runs it.',
    es: 'Porque esta zona se borra en {h} h si nadie corre allí.',
    de: 'Weil diese Zone in {h} h verblasst, wenn niemand dort läuft.',
    pt: 'Porque esta zona some em {h} h se ninguém correr lá.',
  },
  /** Pourquoi celle-ci : elle borde ce que je tiens déjà. */
  recoReasonAdjacent: {
    fr: 'Parce qu’elle touche ce que tu tiens déjà.',
    en: 'Because it touches what you already hold.',
    es: 'Porque toca lo que ya retienes.',
    de: 'Weil sie an dein Gebiet grenzt.',
    pt: 'Porque encosta no que você já mantém.',
  },
  /** Pourquoi celle-ci : elle est la plus proche de la position connue. */
  recoReasonClosest: {
    fr: 'Parce que c’est la plus proche d’ici.',
    en: 'Because it’s the closest from here.',
    es: 'Porque es la más cercana desde aquí.',
    de: 'Weil sie von hier am nächsten liegt.',
    pt: 'Porque é a mais próxima daqui.',
  },
  /** Pourquoi celle-ci : personne ne la tient (zone libre). */
  recoReasonFree: {
    fr: 'Parce que personne ne la tient.',
    en: 'Because nobody holds it.',
    es: 'Porque nadie la retiene.',
    de: 'Weil sie niemand hält.',
    pt: 'Porque ninguém a mantém.',
  },

  // ── MÉTRIQUES RÉELLEMENT SOURCÉES (cf. le bloc ci-dessus) ────────────────
  // Trois au maximum, jamais quatre cards : la DISTANCE mesurée par le routeur
  // (label `briefMetricDistance`, partagé avec E05 — une seule façon de nommer
  // la même chose), et pour une mission de défense les deux faits que le serveur
  // a déjà tranchés.
  /** Heures avant l'échéance réelle de `hex_claims.decay_at`. Unité « h ». */
  recoMetricTimeLeft: {
    fr: 'Temps restant',
    en: 'Time left',
    es: 'Tiempo restante',
    de: 'Restzeit',
    pt: 'Tempo restante',
  },
  /** Aire RÉELLE de la zone qui s'efface (somme des cellules tenues). En km². */
  recoMetricAtRisk: {
    fr: 'Zone menacée',
    en: 'Zone at risk',
    es: 'Zona amenazada',
    de: 'Bedrohte Zone',
    pt: 'Zona ameaçada',
  },

  // ── CTA de l'écran (spec l.1009 : `PRÉPARER LA SORTIE`) ───────────────────
  /**
   * UNIQUE CTA chartreuse (§A4). DISTINCT de `briefStart` (« Commencer la
   * mission ») : celui-ci ne lance RIEN, il ouvre E17. Les fondre ferait croire
   * qu'un tap démarre l'enregistrement.
   */
  recoPrepareCta: {
    fr: 'PRÉPARER LA SORTIE',
    en: 'GET READY',
    es: 'PREPARAR LA SALIDA',
    de: 'AUSFLUG VORBEREITEN',
    pt: 'PREPARAR A SAÍDA',
  },
  recoPrepareA11y: {
    fr: 'Préparer la sortie — ouvrir l’écran de préparation',
    en: 'Get ready — open the preparation screen',
    es: 'Preparar la salida — abrir la pantalla de preparación',
    de: 'Ausflug vorbereiten — Vorbereitungsbildschirm öffnen',
    pt: 'Preparar a saída — abrir a tela de preparação',
  },

  // ── LECTURE EN COURS ─────────────────────────────────────────────────────
  /** Un chargement n'affirme RIEN sur l'existence d'une mission. */
  recoLoading: {
    fr: 'Lecture de la mission…',
    en: 'Loading the mission…',
    es: 'Cargando la misión…',
    de: 'Mission wird geladen…',
    pt: 'Carregando a missão…',
  },

  // ── VIDE HONNÊTE : rien à recommander (état FRÉQUENT, base neuve) ────────
  recoEmptyTitle: {
    fr: 'Aucune mission pour l’instant',
    en: 'No mission right now',
    es: 'Ninguna misión por ahora',
    de: 'Gerade keine Mission',
    pt: 'Nenhuma missão por enquanto',
  },
  /**
   * Le vide se DIT et il ouvre une porte. « Cours, et la carte se remplira »
   * est vrai : la première mission naît de la première capture, pas d'un stock
   * de missions fabriquées.
   */
  recoEmptyBody: {
    fr: 'Rien à défendre, rien de menacé. Cours où tu veux : la première zone prise fera naître la suivante.',
    en: 'Nothing to defend, nothing under threat. Run where you like: your first zone brings the next mission.',
    es: 'Nada que defender, nada amenazado. Corre donde quieras: la primera zona tomada traerá la siguiente.',
    de: 'Nichts zu verteidigen, nichts bedroht. Lauf, wo du willst: Die erste Zone bringt die nächste Mission.',
    pt: 'Nada a defender, nada ameaçado. Corra onde quiser: a primeira zona tomada traz a próxima.',
  },

  // ── ÉCHEC DE LECTURE (jamais déguisé en « aucune mission ») ───────────────
  recoFailedTitle: {
    fr: 'Lecture impossible',
    en: 'Couldn’t load',
    es: 'No se pudo leer',
    de: 'Laden fehlgeschlagen',
    pt: 'Não foi possível ler',
  },
  recoFailedBody: {
    fr: 'La mission n’a pas pu être lue. Rien n’est affirmé sur ton territoire tant que la lecture n’a pas abouti.',
    en: 'The mission couldn’t be read. Nothing is claimed about your territory until the read succeeds.',
    es: 'No se pudo leer la misión. No se afirma nada sobre tu territorio hasta que la lectura funcione.',
    de: 'Die Mission konnte nicht gelesen werden. Über dein Gebiet wird nichts behauptet, bis das Lesen klappt.',
    pt: 'Não foi possível ler a missão. Nada é afirmado sobre seu território até a leitura funcionar.',
  },
  recoRetry: {
    fr: 'Réessayer',
    en: 'Retry',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },

  // ── PAS CONNECTÉ ─────────────────────────────────────────────────────────
  recoSignedOut: {
    fr: 'Connecte-toi pour recevoir des missions sur ton vrai territoire.',
    en: 'Sign in to get missions on your real territory.',
    es: 'Inicia sesión para recibir misiones sobre tu territorio real.',
    de: 'Melde dich an, um Missionen für dein echtes Gebiet zu bekommen.',
    pt: 'Entre para receber missões no seu território real.',
  },

  // ── LA MISSION S'ÉTEINT (spec l.1009, mot pour mot) ──────────────────────
  // « Une mission devenue impossible disparaît proprement avec EXPLICATION. »
  // Elle ne se contente donc pas de disparaître : elle dit POURQUOI, avec le
  // motif RÉEL. C'est aussi ce que mesure l'event `mission_dropped`.
  droppedKicker: {
    fr: 'MISSION TERMINÉE',
    en: 'MISSION OVER',
    es: 'MISIÓN TERMINADA',
    de: 'MISSION BEENDET',
    pt: 'MISSÃO ENCERRADA',
  },
  /** Quelqu'un l'a prise pendant qu'on regardait. Un fait, pas un reproche. */
  droppedTaken: {
    fr: 'Cette zone vient de changer de mains. La mission n’a plus d’objet.',
    en: 'This zone just changed hands. The mission no longer applies.',
    es: 'Esta zona acaba de cambiar de manos. La misión ya no aplica.',
    de: 'Diese Zone hat gerade den Besitzer gewechselt. Die Mission entfällt.',
    pt: 'Esta zona acabou de mudar de dono. A missão não se aplica mais.',
  },
  /** La fenêtre de défense est passée (`MISSION_DEFEND_WINDOW_H`). */
  droppedExpired: {
    fr: 'La fenêtre de défense est passée. Cette zone s’est effacée.',
    en: 'The defence window has passed. This zone faded.',
    es: 'La ventana de defensa ha pasado. Esta zona se borró.',
    de: 'Das Verteidigungsfenster ist vorbei. Diese Zone ist verblasst.',
    pt: 'A janela de defesa passou. Esta zona sumiu.',
  },
  /** La carte s'est déplacée trop loin : la mission ne parlait plus d'ici. */
  droppedOutOfRange: {
    fr: 'Tu as trop bougé : cette mission ne concerne plus l’endroit où tu es.',
    en: 'You’ve moved too far: this mission no longer matches where you are.',
    es: 'Te has movido demasiado: esta misión ya no corresponde a donde estás.',
    de: 'Du bist zu weit weg: Diese Mission passt nicht mehr zu deinem Ort.',
    pt: 'Você se afastou demais: esta missão não corresponde mais a onde você está.',
  },
  /** La position qui fondait la recommandation a été perdue. */
  droppedNoPosition: {
    fr: 'La position a été perdue : cette mission ne peut plus être calculée.',
    en: 'Location was lost: this mission can no longer be computed.',
    es: 'Se perdió la ubicación: esta misión ya no se puede calcular.',
    de: 'Der Standort ging verloren: Diese Mission lässt sich nicht mehr berechnen.',
    pt: 'A localização foi perdida: esta missão não pode mais ser calculada.',
  },
  /** Après une mission éteinte : on repart de la carte, sans mission de repli. */
  droppedBackToMap: {
    fr: 'Revenir à la carte',
    en: 'Back to the map',
    es: 'Volver al mapa',
    de: 'Zurück zur Karte',
    pt: 'Voltar ao mapa',
  },
});
