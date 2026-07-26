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
 *
 * ─── 26/07/2026 : L'ÉCRAN LIT PAR DISCIPLINE, IL DOIT PARLER PAR DISCIPLINE ──
 * `/historique` lit `runs` bornée par `.eq('activity', …)` (features/history/real)
 * et AFFICHE lui-même la discipline (commutateur E14 en `headerRight`). Sa copie,
 * elle, était restée mono-monde : un cycliste qui A des sorties lisait « TES
 * COURSES » en titre de page, « {n} courses » au-dessus de sa liste, et
 * s'entendait proposer « Filtrer tes courses ». La branche vélo de l'écran ne
 * couvrait que l'ÉTAT VIDE — donc le seul cas où le cycliste n'a rien.
 *
 * MÊME MÉTHODE QUE `result.ts`, ET POUR LES MÊMES RAISONS :
 *  · les clés HISTORIQUES ne sont NI renommées NI retouchées : elles sont, et
 *    restent, la version `run` ;
 *  · chaque libellé qui NOMME l'effort reçoit un jumeau suffixé `Bike`, placé
 *    juste en dessous pour qu'ils ne dérivent pas ;
 *  · le couple est indexé par `Activity` dans `HISTORY_COPY` (bas de fichier).
 *    C'est LUI que l'écran lit : un `Record<Activity, …>` exhaustif fait échouer
 *    la compilation le jour d'une 3ᵉ discipline, là où un `bike ? … : …` sortirait
 *    silencieusement le libellé du coureur ;
 *  · les libellés DÉJÀ NEUTRES (« Historique », « Conquêtes », « Zones tenues »,
 *    « Voir sur la carte », les pastilles Verify) n'ont PAS de jumeau : en
 *    dupliquer un à l'identique ferait deux vérités à maintenir au lieu d'une.
 *
 * L'EXCEPTION, ET SA RAISON : `/course/[id]` n'a AUCUNE lentille — il n'existe
 * aucune lecture d'une course par identifiant (O1), donc l'écran ne sait pas, et
 * ne peut pas savoir, de quelle discipline on lui parle. Un jumeau y serait un
 * texte que rien ne saurait choisir : ses quatre libellés sont donc NEUTRALISÉS
 * (« sortie » / « outing » / « salida » / « Aktivität » / « saída »), pas jumelés.
 *
 * VOCABULAIRE VÉLO, aligné sur `result.ts` et sur les états vides déjà écrits ici :
 * fr « sortie (vélo) » · en « ride » · es « salida (en bici) » · de « Ausfahrt »
 * · pt « pedal ». Vocabulaire NEUTRE (les deux mondes) : fr « sortie » · en
 * « outing » · es « salida » · de « Aktivität » · pt « saída ».
 */
import { DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import { defineCatalog } from '../types';
import type { Entry } from '../types';

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
   * Le kicker est rendu HORS de toute branche d'état : c'est le titre de la
   * page, il s'affiche aussi bien au-dessus d'une liste peuplée que d'un état
   * vide. En lentille vélo, il annonçait donc « TES COURSES » juste au-dessus
   * du texte qui explique que les sorties vélo sont comptées à part.
   */
  historiqueKickerBike: {
    fr: 'TES SORTIES VÉLO',
    en: 'YOUR RIDES',
    es: 'TUS SALIDAS EN BICI',
    de: 'DEINE AUSFAHRTEN',
    pt: 'SEUS PEDAIS',
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
  /** Même promesse, même retenue sur la vignette — l'autre monde. */
  historiqueSubtitleBike: {
    fr: 'Toutes tes sorties vélo : l’effort et ce qu’il a changé sur le terrain.',
    en: 'All your rides: the effort, and what it changed on the ground.',
    es: 'Todas tus salidas en bici: el esfuerzo y lo que cambió sobre el terreno.',
    de: 'Alle deine Ausfahrten: der Einsatz und was er am Boden verändert hat.',
    pt: 'Todos os seus pedais: o esforço e o que mudou no terreno.',
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
  /** LU À VOIX HAUTE : le groupe de filtres surplombe une liste de sorties vélo. */
  a11yFilterGroupBike: {
    fr: 'Filtrer tes sorties vélo',
    en: 'Filter your rides',
    es: 'Filtrar tus salidas en bici',
    de: 'Deine Ausfahrten filtern',
    pt: 'Filtrar seus pedais',
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
   * Le comptage du monde vélo. Il coiffe la liste PEUPLÉE — exactement le cas
   * que la branche `bike` de l'écran ne couvrait pas, puisqu'elle était imbriquée
   * dans « lu ET zéro sortie ».
   */
  countRunsOneBike: {
    fr: '{n} sortie',
    en: '{n} ride',
    es: '{n} salida',
    de: '{n} Ausfahrt',
    pt: '{n} pedal',
  },
  countRunsManyBike: {
    fr: '{n} sorties',
    en: '{n} rides',
    es: '{n} salidas',
    de: '{n} Ausfahrten',
    pt: '{n} pedais',
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
  /** Absence LOCALE dans le monde vélo — le joueur a des sorties, pas ici. */
  emptyFilterBike: {
    fr: 'Aucune sortie dans ce filtre pour l’instant.',
    en: 'No rides in this filter yet.',
    es: 'Aún no hay salidas en este filtro.',
    de: 'Noch keine Ausfahrten in diesem Filter.',
    pt: 'Ainda não há pedais neste filtro.',
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
  /**
   * Le commutateur E14 et le kicker sont rendus HORS de l'état de lecture : un
   * joueur déconnecté peut donc être en lentille vélo, et l'écran le lui dit.
   * La card d'état doit parler du même monde que le titre qui la surplombe.
   */
  emptySignedOutBike: {
    fr: 'Tes sorties vélo sont liées à ton compte. Connecte-toi pour les retrouver ici.',
    en: 'Your rides live on your account. Sign in to find them here.',
    es: 'Tus salidas en bici están vinculadas a tu cuenta. Inicia sesión para verlas aquí.',
    de: 'Deine Ausfahrten hängen an deinem Konto. Melde dich an, um sie hier zu sehen.',
    pt: 'Seus pedais estão ligados à sua conta. Entre para encontrá-los aqui.',
  },
  /** CTA COURT et neutre dans les 5 langues : rien à décliner (§A). */
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
  /** LU À VOIX HAUTE : le bouton promet de retrouver le monde REGARDÉ. */
  a11ySignInBike: {
    fr: 'Se connecter pour retrouver ses sorties vélo',
    en: 'Sign in to find your rides',
    es: 'Iniciar sesión para ver tus salidas en bici',
    de: 'Anmelden, um deine Ausfahrten zu sehen',
    pt: 'Entrar para ver seus pedais',
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
  /** Même aveu, sous la liste de l'autre monde (rendue, elle aussi, peuplée). */
  detailPendingNoteBike: {
    fr: 'Le détail d’une sortie n’est pas encore disponible : ces lignes ne s’ouvrent pas.',
    en: 'Ride details aren’t available yet: these entries don’t open.',
    es: 'El detalle de una salida aún no está disponible: estas líneas no se abren.',
    de: 'Die Detailansicht einer Ausfahrt gibt es noch nicht: Diese Einträge öffnen sich nicht.',
    pt: 'O detalhe de um pedal ainda não está disponível: estas linhas não abrem.',
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
  /**
   * Le même énoncé pour une ligne du monde vélo. La liste est filtrée en SQL par
   * discipline : sous la lentille vélo, CHAQUE ligne est une sortie vélo, et
   * VoiceOver annonçait « Course du 12 juillet ».
   * ⚠ PAS ENCORE CÂBLÉ : son unique appelant est `features/history/RealRunCard.tsx`
   * (ligne 150), qui appartient à un autre périmètre. `RUN_EFFORT_A11Y` (bas de
   * fichier) lui donne la dérivation toute faite — il ne reste qu'à lui passer la
   * discipline de la ligne. Inscrit en suspens plutôt que corrigé de force.
   */
  a11yRunEffortBike: {
    fr: 'Sortie vélo du {when} — {effort}',
    en: 'Ride on {when} — {effort}',
    es: 'Salida en bici del {when} — {effort}',
    de: 'Ausfahrt vom {when} — {effort}',
    pt: 'Pedal de {when} — {effort}',
  },

  // ─── /course/[id] : la page d'état, seule chose que l'écran sait rendre ────
  /**
   * NEUTRALISÉS le 26/07/2026, PAS jumelés — et c'est une décision, pas un
   * raccourci. `/course/[id]` ne porte AUCUNE lentille : il n'existe aucune
   * lecture d'une course par identifiant (O1), l'écran n'est atteignable que par
   * deep link, et il ne peut donc RIEN savoir de la discipline dont on lui parle.
   * Un jumeau vélo y serait un texte que rien ne saurait choisir : on tirerait à
   * pile ou face (même arbitrage que les états vides de `features/share/copy.ts`).
   * Le vocabulaire y devient donc NEUTRE aux deux mondes — un cycliste qui ouvre
   * le lien de sa sortie ne lit plus « Détail de course indisponible ».
   */
  runFallbackTitle: { fr: 'Sortie', en: 'Activity', es: 'Salida', de: 'Aktivität', pt: 'Saída' },
  /**
   * ANCIEN TEXTE : « Cette course n'est pas dans ton historique. Tes courses
   * apparaîtront ici après ta première sortie enregistrée. » Servi tel quel à
   * un joueur qui a des dizaines de courses, il NIAIT son historique — alors
   * que la seule chose vraie est que GRYD ne sait pas encore ouvrir le détail
   * d'une sortie. On dit ça, et rien d'autre.
   */
  runDetailPendingTitle: {
    fr: 'Détail indisponible',
    en: 'Details unavailable',
    es: 'Detalle no disponible',
    de: 'Details nicht verfügbar',
    pt: 'Detalhe indisponível',
  },
  runDetailPendingBody: {
    fr: 'GRYD ne sait pas encore ouvrir une sortie une par une. Les tiennes sont bien là : retrouve-les dans l’historique.',
    en: 'GRYD can’t open a single activity yet. Yours are safe: find them in your history.',
    es: 'GRYD todavía no puede abrir una salida concreta. Las tuyas siguen ahí: búscalas en el historial.',
    de: 'GRYD kann eine einzelne Aktivität noch nicht öffnen. Deine sind da: Du findest sie im Verlauf.',
    pt: 'A GRYD ainda não abre uma saída específica. As suas continuam lá: veja no histórico.',
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
  /**
   * LA MÊME NOTE, DANS L'AUTRE MONDE (26/07/2026). `/territoire` monte cette
   * ligne sous `pageState === 'held'` — l'état où il NOMME la discipline montrée
   * quatre lignes plus haut (« À vélo ») et peint la carte de ce monde. La note
   * de bas de page, elle, était restée au singulier du coureur : l'écran se
   * contredisait sur lui-même, exactement le défaut que le commentaire de son
   * `ZoneLeaderboard` décrit mot pour mot comme la raison de l'avoir corrigé.
   * Le FAIT énoncé, lui, est le même dans les deux mondes : aucune carte de
   * partage territoriale n'existe, seule une sortie terminée en produit une.
   */
  territoryShareNoteBike: {
    fr: 'Partager son territoire n’est pas encore possible : seule une sortie vélo terminée peut devenir une carte de partage.',
    en: 'Sharing your territory isn’t possible yet: only a finished ride can become a share card.',
    es: 'Compartir tu territorio aún no es posible: solo una salida en bici terminada puede convertirse en tarjeta.',
    de: 'Dein Gebiet lässt sich noch nicht teilen: Nur eine beendete Ausfahrt wird zur Teilen-Karte.',
    pt: 'Ainda não dá para compartilhar seu território: só um pedal concluído vira card de compartilhamento.',
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
   * ÉTAT VIDE DU MONDE VÉLO — RÉÉCRIT LE 26/07/2026.
   *
   * Le corps disait « GRYD ne chronomètre pas encore le vélo : aucune sortie
   * n'est enregistrée ». C'était vrai le 25 et c'est FAUX depuis que le vélo
   * enregistre (décision fondateur ; `runs.activity`, migration 0070 appliquée ;
   * lecture bornée par `.eq('activity', …)` dans `features/history/real.ts`).
   * Le garder aurait été le mensonge symétrique de celui qu'on venait de
   * retirer : affirmer que l'app ne mesure pas ce qu'elle mesure.
   *
   * Ce qui est vide maintenant, c'est l'historique DE CE JOUEUR dans cette
   * discipline — exactement comme celui d'un nouveau venu à pied. La copie dit
   * donc ce que la page CONTIENDRA et le geste qui la remplit, et le CTA fait
   * ce qu'il annonce : il lance une sortie DÉCLARÉE `bike`
   * (`startSortieHref('bike')`), jamais une course à pied déguisée.
   */
  bikeEmptyTitle: {
    fr: 'Ton historique Bike commence ici',
    en: 'Your Bike history starts here',
    es: 'Tu historial Bike empieza aquí',
    de: 'Dein Bike-Verlauf beginnt hier',
    pt: 'Seu histórico Bike começa aqui',
  },
  bikeEmptyBody: {
    fr: 'Chaque sortie vélo comptée s’ajoutera à cette liste.',
    en: 'Every counted ride will be added to this list.',
    es: 'Cada salida en bici contada se añadirá a esta lista.',
    de: 'Jede gezählte Ausfahrt landet in dieser Liste.',
    pt: 'Cada pedal contado entra nesta lista.',
  },
  /** SÉPARATION STRICTE (E14) : deux mondes, jamais une somme. Un FAIT. */
  bikeEmptyRunSafe: {
    fr: 'Tes courses à pied gardent leur propre historique.',
    en: 'Your runs keep their own history.',
    es: 'Tus carreras a pie mantienen su propio historial.',
    de: 'Deine Läufe behalten ihren eigenen Verlauf.',
    pt: 'Suas corridas a pé mantêm o próprio histórico.',
  },
  /** CTA de l'état vide vélo — la sortie est DÉCLARÉE vélo, pas devinée. */
  bikeEmptyCta: {
    fr: 'Lancer une sortie vélo',
    en: 'Start a bike ride',
    es: 'Empezar una salida en bici',
    de: 'Radausfahrt starten',
    pt: 'Começar um pedal',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // E24 — JOURNAL DE CONQUÊTE : bandeau, semaines, TYPES colorés, impact.
  //
  // ⚠ TOUTES NEUTRES AUX DEUX MONDES (course ET vélo). Ces libellés sont rendus
  // par ligne SANS connaître la discipline (RealRunCard n'a pas la lentille) :
  // ils décrivent l'ACTE DE JEU (capture, reprise, défense, zones), jamais le
  // sport. Un seul mot de discipline ici exclurait la moitié des joueurs — et
  // ferait échouer le balayage de `historique.test.ts` (le garde-fou
  // `disciplineVocabulary`). C'est pourquoi « libre » devient « Sans capture » et
  // « courses » devient « sorties ».
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Bandeau de synthèse (planche E24 : « 38 · 247 km · 14 captures · 9 défenses ») ──
  /** Label du compte de sorties — NEUTRE (« sorties », pas « courses »). */
  summaryRuns: { fr: 'sorties', en: 'activities', es: 'salidas', de: 'Aktivitäten', pt: 'saídas' },
  summaryDistance: {
    fr: 'distance',
    en: 'distance',
    es: 'distancia',
    de: 'Distanz',
    pt: 'distância',
  },
  summaryKmUnit: { fr: 'km', en: 'km', es: 'km', de: 'km', pt: 'km' },
  summaryCaptures: {
    fr: 'captures',
    en: 'captures',
    es: 'capturas',
    de: 'Eroberungen',
    pt: 'capturas',
  },
  summaryDefenses: {
    fr: 'défenses',
    en: 'defenses',
    es: 'defensas',
    de: 'Abwehr',
    pt: 'defesas',
  },

  // ── Titres de groupe par SEMAINE (rendus par SectionLabel, casse normale) ──
  weekThis: {
    fr: 'Cette semaine',
    en: 'This week',
    es: 'Esta semana',
    de: 'Diese Woche',
    pt: 'Esta semana',
  },
  weekLast: {
    fr: 'Semaine dernière',
    en: 'Last week',
    es: 'Semana pasada',
    de: 'Letzte Woche',
    pt: 'Semana passada',
  },
  /** Semaine plus ancienne, datée de son lundi. {date} formaté par l'écran. */
  weekOlder: {
    fr: 'Semaine du {date}',
    en: 'Week of {date}',
    es: 'Semana del {date}',
    de: 'Woche vom {date}',
    pt: 'Semana de {date}',
  },

  // ── TYPES colorés d'une ligne (planche E24). Couleurs PAR RÔLE côté composant. ──
  /** Capture (chartreuse = moi) : zones neuves prises. */
  typeCapture: { fr: 'Capture', en: 'Capture', es: 'Captura', de: 'Eroberung', pt: 'Captura' },
  /** Reprise (orange) : zones ARRACHÉES à un adversaire. */
  typeReprise: {
    fr: 'Reprise',
    en: 'Retake',
    es: 'Reconquista',
    de: 'Rückeroberung',
    pt: 'Retomada',
  },
  /** Défense (bleu) : zones tenues face à une attaque. */
  typeDefense: {
    fr: 'Défense',
    en: 'Defense',
    es: 'Defensa',
    de: 'Verteidigung',
    pt: 'Defesa',
  },
  /** « Sans capture » (neutre) : le serveur a dit 0 pris — un FAIT, pas un trou. */
  typeFree: {
    fr: 'Sans capture',
    en: 'No capture',
    es: 'Sin captura',
    de: 'Ohne Eroberung',
    pt: 'Sem captura',
  },
  /** Impact INCONNU (pas de payload serveur) : on ne nomme rien, on n'affirme rien. */
  typeUnknown: { fr: 'Sortie', en: 'Activity', es: 'Salida', de: 'Aktivität', pt: 'Saída' },

  // ── IMPACT dominant en toutes lettres (singulier / pluriel — un « 1 zones »
  //    trahit le texte fabriqué). Le chiffre {n} vient TOUJOURS du serveur. ──
  impactCapturedOne: { fr: '+{n} zone', en: '+{n} zone', es: '+{n} zona', de: '+{n} Zone', pt: '+{n} zona' },
  impactCapturedMany: {
    fr: '+{n} zones',
    en: '+{n} zones',
    es: '+{n} zonas',
    de: '+{n} Zonen',
    pt: '+{n} zonas',
  },
  impactRetakenOne: {
    fr: '{n} zone reprise',
    en: '{n} zone retaken',
    es: '{n} zona recuperada',
    de: '{n} Zone zurückerobert',
    pt: '{n} zona retomada',
  },
  impactRetakenMany: {
    fr: '{n} zones reprises',
    en: '{n} zones retaken',
    es: '{n} zonas recuperadas',
    de: '{n} Zonen zurückerobert',
    pt: '{n} zonas retomadas',
  },
  impactDefendedOne: {
    fr: '{n} zone conservée',
    en: '{n} zone held',
    es: '{n} zona conservada',
    de: '{n} Zone gehalten',
    pt: '{n} zona mantida',
  },
  impactDefendedMany: {
    fr: '{n} zones conservées',
    en: '{n} zones held',
    es: '{n} zonas conservadas',
    de: '{n} Zonen gehalten',
    pt: '{n} zonas mantidas',
  },
  /** a11y : quand une ligne n'a pas d'impact chiffré (free / inconnu). */
  impactNone: {
    fr: 'sans impact territorial',
    en: 'no territorial impact',
    es: 'sin impacto territorial',
    de: 'kein Gebietseinfluss',
    pt: 'sem impacto territorial',
  },
  /** VoiceOver d'une ligne complète (type, impact, effort, date) — neutre. */
  a11yRunLine: {
    fr: '{type} — {impact} · {effort} · {when}',
    en: '{type} — {impact} · {effort} · {when}',
    es: '{type} — {impact} · {effort} · {when}',
    de: '{type} — {impact} · {effort} · {when}',
    pt: '{type} — {impact} · {effort} · {when}',
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// LA DÉRIVATION PAR DISCIPLINE — ce que les écrans lisent (26/07/2026).
//
// Pourquoi un `Record<Activity, …>` et pas un ternaire à l'écran : le Record est
// EXHAUSTIF par construction. Le jour d'une 3ᵉ discipline, la compilation
// échoue ici ; un `bike ? … : …` disséminé dans le JSX servirait, lui, le
// libellé du coureur sans qu'aucun test ne le remarque. C'est le patron déjà
// retenu par `RESULT_COPY` (i18n/catalog/result.ts) et par les Records de
// `profil.ts` (WORLD_SCOPE, SECTION_TERRITORY).
//
// Ne figurent ici QUE les libellés qui NOMMENT l'effort. « Historique »,
// « Conquêtes », « Zones tenues », « Voir sur la carte », les pastilles Verify
// et les états vides déjà propres à leur monde (`bikeEmpty*`) n'y sont pas :
// les dupliquer à l'identique créerait deux vérités à maintenir.
// ═════════════════════════════════════════════════════════════════════════════

/** Les libellés de `/historique` qui changent avec le monde regardé. */
export interface HistoryActivityCopy {
  /** Kicker de page — rendu HORS de tout état, donc toujours visible. */
  kicker: Entry;
  subtitle: Entry;
  /** LU À VOIX HAUTE (groupe de filtres). */
  a11yFilterGroup: Entry;
  countOne: Entry;
  countMany: Entry;
  emptyFilter: Entry;
  emptySignedOut: Entry;
  /** LU À VOIX HAUTE (bouton « Se connecter »). */
  a11ySignIn: Entry;
  detailPendingNote: Entry;
  /**
   * LU À VOIX HAUTE, une ligne de course. Sa surface (`RealRunCard`) appartient
   * à un autre périmètre : la dérivation existe, le câblage reste EN SUSPENS.
   */
  a11yEffort: Entry;
}

export const HISTORY_COPY: Readonly<Record<Activity, HistoryActivityCopy>> = {
  run: {
    kicker: C.historiqueKicker,
    subtitle: C.historiqueSubtitle,
    a11yFilterGroup: C.a11yFilterGroup,
    countOne: C.countRunsOne,
    countMany: C.countRunsMany,
    emptyFilter: C.emptyFilter,
    emptySignedOut: C.emptySignedOut,
    a11ySignIn: C.a11ySignIn,
    detailPendingNote: C.detailPendingNote,
    a11yEffort: C.a11yRunEffort,
  },
  bike: {
    kicker: C.historiqueKickerBike,
    subtitle: C.historiqueSubtitleBike,
    a11yFilterGroup: C.a11yFilterGroupBike,
    countOne: C.countRunsOneBike,
    countMany: C.countRunsManyBike,
    emptyFilter: C.emptyFilterBike,
    emptySignedOut: C.emptySignedOutBike,
    a11ySignIn: C.a11ySignInBike,
    detailPendingNote: C.detailPendingNoteBike,
    a11yEffort: C.a11yRunEffortBike,
  },
};

/**
 * Le jeu de libellés du monde regardé. Le DÉFAUT est `DEFAULT_ACTIVITY` : un
 * appelant qui ignore encore la notion de discipline obtient EXACTEMENT les
 * textes d'avant le vélo — aucun chemin existant ne change de sens.
 */
export function historyCopy(activity: Activity = DEFAULT_ACTIVITY): HistoryActivityCopy {
  return HISTORY_COPY[activity];
}

/**
 * `/territoire` — la note de bas de page du monde MONTRÉ. Un Record d'`Entry`
 * plutôt qu'un objet : c'est la seule ligne de cette page qui nomme l'effort
 * (le kicker, les métriques et le CTA carte sont déjà neutres).
 */
export const TERRITORY_SHARE_NOTE: Readonly<Record<Activity, Entry>> = {
  run: C.territoryShareNote,
  bike: C.territoryShareNoteBike,
};

/**
 * L'énoncé VoiceOver d'une ligne de sortie, par discipline. Exposé DÈS
 * MAINTENANT pour que son appelant (`features/history/RealRunCard.tsx`) n'ait
 * qu'à passer la discipline de la ligne le jour où son périmètre s'ouvre —
 * plutôt que de réinventer le choix sur place.
 */
export const RUN_EFFORT_A11Y: Readonly<Record<Activity, Entry>> = {
  run: C.a11yRunEffort,
  bike: C.a11yRunEffortBike,
};
