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
});
