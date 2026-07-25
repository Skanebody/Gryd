/**
 * GRYD — i18n : catalogue du domaine HISTORIQUE (liste /historique, page
 * /territoire, page d'état de /course/[id]). Parité 5 langues imposée par le
 * type Entry — une langue manquante = erreur TypeScript.
 *
 * Invariants jamais traduits : GRYD, GO, GRYD Verified/Verify, Crew, @handles,
 * noms propres (République, Bastille…), km, km². Chips/CTA courts dans TOUTES
 * les langues (§A — troncature interdite à 375 px). Les {placeholders} sont
 * identiques dans les 5 langues. Vocabulaire aligné sur les catalogues
 * existants : territoire→Gebiet, zones tenues→Zonen gehalten.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ DE CE CATALOGUE (25/07/2026) : 52 ENTRÉES ──────────
 * Une traduction qu'aucun écran ne rend est du code mort en cinq exemplaires :
 * elle divergera de la refonte sans que rien ne le signale. Ont disparu —
 *   · 31 entrées du CORPS de `/course/[id]` (effort héro, segments, motifs de
 *     refus, détail du calcul, CTA Partager/Signaler), soit ~500 lignes de
 *     rendu que `findRealRun()` n'a jamais exécutées : aucune lecture d'une
 *     course par identifiant n'existe (O1) ;
 *   · 14 entrées des sections VILLES / À DÉFENDRE / ROUTES OUVERTES / RECORDS
 *     de `/territoire`, supprimées avec leur démo le 21/07 — elles n'avaient
 *     plus AUCUN appelant depuis ;
 *   · 5 libellés de `/performance`, qui a son propre catalogue depuis ;
 *   · `filterRoute` (aucune colonne de `runs` ne reconnaît une boucle « ouverte
 *     mais fermable ») et `a11yFilter`, remplacé par un libellé de segment qui
 *     porte lui-même son compte.
 * Elles reviendront avec leur écran et leur donnée, pas avant.
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
  /**
   * Le sous-titre promettait « le tracé » — aucune vignette de parcours n'est
   * rendue, et `RealRunCard` explique pourquoi (`polyline_masked` n'est pas
   * décodé). Une promesse au-delà du code est la même faute qu'une donnée
   * fabriquée : le mot est retiré tant que la vignette n'existe pas.
   */
  historiqueSubtitle: {
    fr: 'Tous tes parcours : l’effort et ce qu’il a changé sur le terrain.',
    en: 'All your runs: the effort, and what it changed on the ground.',
    es: 'Todas tus carreras: el esfuerzo y lo que cambió sobre el terreno.',
    de: 'Alle deine Läufe: der Einsatz und was er am Boden verändert hat.',
    pt: 'Todas as suas corridas: o esforço e o que mudou no terreno.',
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
  filterStats: {
    fr: 'Stats seules',
    en: 'Stats only',
    es: 'Solo stats',
    de: 'Nur Stats',
    pt: 'Só stats',
  },
  /**
   * Le compte VIT DANS le libellé du segment : `Segmented` ne prend qu'un
   * label par choix, et son a11y est ce label. Deux Text côte à côte auraient
   * donné au lecteur d'écran « Conquêtes » puis « 3 » sans lien entre eux.
   * Format invariant (le chiffre suit le mot dans les cinq langues).
   */
  filterWithCount: {
    fr: '{label} {n}',
    en: '{label} {n}',
    es: '{label} {n}',
    de: '{label} {n}',
    pt: '{label} {n}',
  },
  a11yFilterGroup: {
    fr: 'Filtrer tes courses',
    en: 'Filter your runs',
    es: 'Filtrar tus carreras',
    de: 'Deine Läufe filtern',
    pt: 'Filtrar suas corridas',
  },

  // ─── /historique : compteur + états ────────────────────────────────────────
  /**
   * Kicker de comptage, rendu par `SectionLabel` — qui met LUI-MÊME en
   * capitales. Ces deux entrées restent donc en casse normale : des capitales
   * écrites en dur seraient ÉPELÉES lettre par lettre par un lecteur d'écran
   * (c'est la doctrine inscrite en tête de `src/ui/SectionLabel.tsx`). Rendu
   * visuel identique, énoncé correct.
   */
  countRunsOne: {
    fr: '{n} course',
    en: '{n} run',
    es: '{n} carrera',
    de: '{n} Lauf',
    pt: '{n} corrida',
  },
  countRunsMany: {
    fr: '{n} courses',
    en: '{n} runs',
    es: '{n} carreras',
    de: '{n} Läufe',
    pt: '{n} corridas',
  },
  /**
   * ÉTAT VIDE — le texte disait « après ta première CAPTURE », alors que la
   * liste montre TOUTES les courses : le filtre « Stats seules » existe
   * précisément pour les sorties sans capture. Un joueur qui court sans rien
   * prendre voyait sa course apparaître après avoir lu qu'elle n'y serait pas.
   */
  emptyRealUser: {
    fr: 'Tes courses apparaîtront ici après ta première course enregistrée. Lance-toi !',
    en: 'Your runs will show up here after your first recorded run. Get out there!',
    es: 'Tus carreras aparecerán aquí tras tu primera carrera registrada. ¡Lánzate!',
    de: 'Deine Läufe erscheinen hier nach deinem ersten aufgezeichneten Lauf. Leg los!',
    pt: 'Suas corridas vão aparecer aqui depois da primeira corrida registrada. Bora!',
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
  /**
   * CE QUI N'EXISTE PAS, DIT À SA PLACE (patron /qr) : en bas, en gris, APRÈS
   * la liste. Aucune card n'est cliquable — le joueur tapait une course et
   * rien ne se passait, sans que l'écran l'ait jamais annoncé.
   */
  detailPendingNote: {
    fr: 'Le détail d’une course n’est pas encore disponible : ces lignes ne s’ouvrent pas.',
    en: 'Run details aren’t available yet: these entries don’t open.',
    es: 'El detalle de una carrera aún no está disponible: estas líneas no se abren.',
    de: 'Die Detailansicht eines Laufs gibt es noch nicht: Diese Einträge öffnen sich nicht.',
    pt: 'O detalhe de uma corrida ainda não está disponível: estas linhas não abrem.',
  },

  // ─── Statuts GRYD Verify (pastilles de RealRunCard) ────────────────────────
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
  /** Effort d'une course, pour le lecteur d'écran (la ligne est visuelle). */
  a11yRunEffort: {
    fr: 'Course du {when} — {effort}',
    en: 'Run on {when} — {effort}',
    es: 'Carrera del {when} — {effort}',
    de: 'Lauf vom {when} — {effort}',
    pt: 'Corrida de {when} — {effort}',
  },

  // ─── /course/[id] : la page d'état, seule chose que l'écran sait rendre ────
  runFallbackTitle: { fr: 'Course', en: 'Run', es: 'Carrera', de: 'Lauf', pt: 'Corrida' },
  /**
   * ANCIEN TEXTE : « Cette course n'est pas dans ton historique. Tes courses
   * apparaîtront ici après ta première sortie enregistrée. » Servi tel quel à
   * un joueur qui a des dizaines de courses, il NIAIT son historique — alors
   * que la seule chose vraie est que GRYD ne sait pas encore ouvrir le détail
   * d'une course. On dit ça, et rien d'autre.
   */
  runDetailPendingTitle: {
    fr: 'Détail de course indisponible',
    en: 'Run details unavailable',
    es: 'Detalle de carrera no disponible',
    de: 'Laufdetails nicht verfügbar',
    pt: 'Detalhe da corrida indisponível',
  },
  runDetailPendingBody: {
    fr: 'GRYD ne sait pas encore ouvrir une course une par une. Tes courses, elles, sont bien là : retrouve-les dans l’historique.',
    en: 'GRYD can’t open a single run yet. Your runs are safe: find them in your history.',
    es: 'GRYD todavía no puede abrir una carrera concreta. Tus carreras siguen ahí: búscalas en el historial.',
    de: 'GRYD kann einen einzelnen Lauf noch nicht öffnen. Deine Läufe sind da: Du findest sie im Verlauf.',
    pt: 'A GRYD ainda não abre uma corrida específica. Suas corridas continuam lá: veja no histórico.',
  },
  runDetailPendingCta: {
    fr: 'Voir l’historique',
    en: 'See history',
    es: 'Ver historial',
    de: 'Verlauf öffnen',
    pt: 'Ver histórico',
  },

  // ─── /territoire (cohérent profil : territoire → Gebiet) ───────────────────
  territoryKicker: {
    fr: 'MON TERRITOIRE',
    en: 'MY TERRITORY',
    es: 'MI TERRITORIO',
    de: 'MEIN GEBIET',
    pt: 'MEU TERRITÓRIO',
  },
  /** Libellés du bloc de métriques (le chiffre est la valeur, pas la phrase). */
  metricArea: {
    fr: 'Surface contrôlée',
    en: 'Controlled area',
    es: 'Superficie controlada',
    de: 'Gehaltene Fläche',
    pt: 'Área controlada',
  },
  metricZones: {
    fr: 'Zones tenues',
    en: 'Zones held',
    es: 'Zonas tomadas',
    de: 'Zonen gehalten',
    pt: 'Zonas mantidas',
  },
  /**
   * Forme SINGULIER / PLURIEL — un joueur qui tient une seule zone lisait
   * « 1 zones tenues ». Le bloc de métriques affiche le chiffre sous un
   * libellé invariant ; ces deux entrées portent l'énoncé COMPLET du lecteur
   * d'écran, où la grammaire s'entend.
   */
  a11yZonesHeldOne: {
    fr: '{n} zone tenue',
    en: '{n} zone held',
    es: '{n} zona tomada',
    de: '{n} Zone gehalten',
    pt: '{n} zona mantida',
  },
  a11yZonesHeldMany: {
    fr: '{n} zones tenues',
    en: '{n} zones held',
    es: '{n} zonas tomadas',
    de: '{n} Zonen gehalten',
    pt: '{n} zonas mantidas',
  },
  a11yAreaHeld: {
    fr: '{value} de surface contrôlée',
    en: '{value} of controlled area',
    es: '{value} de superficie controlada',
    de: '{value} gehaltene Fläche',
    pt: '{value} de área controlada',
  },
  /** CTA carte — court partout (§A) : « Zur Karte » plutôt qu'une phrase. */
  seeOnMap: {
    fr: 'Voir sur la carte',
    en: 'See on the map',
    es: 'Ver en el mapa',
    de: 'Zur Karte',
    pt: 'Ver no mapa',
  },
  /**
   * SANS BACKEND — état distinct de « pas connecté » : ici, se connecter est
   * impossible (l'écran d'auth redirige aussitôt vers la carte). On dit la
   * cause, et l'unique CTA reste celui qui marche : ouvrir la carte.
   */
  territoryNoBackendTitle: {
    fr: 'Aucun serveur relié',
    en: 'No server connected',
    es: 'Sin servidor conectado',
    de: 'Kein Server verbunden',
    pt: 'Nenhum servidor ligado',
  },
  territoryNoBackendBody: {
    fr: 'Cet aperçu n’est relié à aucun serveur : personne ne peut encore tenir de zone.',
    en: 'This preview isn’t connected to a server: no zone can be held yet.',
    es: 'Esta vista previa no está conectada a ningún servidor: aún no se puede tomar ninguna zona.',
    de: 'Diese Vorschau ist mit keinem Server verbunden: Noch kann keine Zone gehalten werden.',
    pt: 'Esta prévia não está ligada a nenhum servidor: ainda não dá para manter zona.',
  },
  /** LECTURE EN COURS — une ligne grise, jamais un spinner plein écran. */
  territoryLoading: {
    fr: 'Lecture de tes zones…',
    en: 'Reading your zones…',
    es: 'Leyendo tus zonas…',
    de: 'Deine Zonen werden gelesen …',
    pt: 'Lendo suas zonas…',
  },
  /**
   * CE QUI N'EXISTE PAS, DIT À SA PLACE. Le bouton « Partager » de cette page
   * poussait vers /partage sans jamais armer de carte : il aboutissait TOUJOURS
   * à un écran vide. Il est retiré, et son absence est écrite.
   */
  territoryShareNote: {
    fr: 'Partager son territoire n’est pas encore possible : seule une course terminée peut devenir une carte de partage.',
    en: 'Sharing your territory isn’t possible yet: only a finished run can become a share card.',
    es: 'Compartir tu territorio aún no es posible: solo una carrera terminada puede convertirse en tarjeta.',
    de: 'Dein Gebiet lässt sich noch nicht teilen: Nur ein beendeter Lauf wird zur Teilen-Karte.',
    pt: 'Ainda não dá para compartilhar seu território: só uma corrida concluída vira card de compartilhamento.',
  },

  // ─── Commutateur Run / Bike (planche E14) ──────────────────────────────────
  // Les deux segments n'ont que des PICTOS : l'a11y porte tout le sens, et elle
  // nomme ce que la bascule change ICI — un historique, pas une carte.
  activityRunA11y: {
    fr: 'Historique à pied',
    en: 'Running history',
    es: 'Historial a pie',
    de: 'Lauf-Verlauf',
    pt: 'Histórico a pé',
  },
  activityBikeA11y: {
    fr: 'Historique vélo',
    en: 'Cycling history',
    es: 'Historial en bici',
    de: 'Rad-Verlauf',
    pt: 'Histórico de bike',
  },
  /**
   * LENTILLE BIKE — l'état vide NOMMÉ. On n'affiche jamais les courses à pied
   * sous une étiquette vélo (ce serait la donnée fabriquée que la charte
   * interdit) ; on dit ce qu'il n'y a pas, et pourquoi.
   */
  bikeEmptyTitle: {
    fr: 'Ton historique Bike commence ici',
    en: 'Your Bike history starts here',
    es: 'Tu historial Bike empieza aquí',
    de: 'Dein Bike-Verlauf beginnt hier',
    pt: 'Seu histórico Bike começa aqui',
  },
  bikeEmptyBody: {
    fr: 'GRYD ne chronomètre pas encore le vélo : aucune sortie n’est enregistrée.',
    en: 'GRYD doesn’t track cycling yet: no ride is recorded.',
    es: 'GRYD aún no cronometra la bici: no hay ninguna salida registrada.',
    de: 'GRYD misst Radfahren noch nicht: keine Ausfahrt aufgezeichnet.',
    pt: 'A GRYD ainda não cronometra bike: nenhum pedal registado.',
  },
  /** Rassurance FACTUELLE : rien n'est perdu côté course à pied. */
  bikeEmptyRunSafe: {
    fr: 'Tes courses à pied restent intactes.',
    en: 'Your runs stay untouched.',
    es: 'Tus carreras a pie siguen intactas.',
    de: 'Deine Läufe bleiben unberührt.',
    pt: 'Suas corridas a pé ficam intactas.',
  },
});
