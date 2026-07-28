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
   * ⚠️ `detailPendingNote` / `detailPendingNoteBike` ONT ÉTÉ RETIRÉS le
   * 28/07/2026. Ils disaient, en pied de liste : « Le détail d'une course n'est
   * pas encore disponible : ces lignes ne s'ouvrent pas. » C'était l'aveu juste
   * tant qu'aucune ligne n'était tapable ; les lignes s'ouvrent maintenant
   * (E68, `app/course/[id].tsx`), et servir cet aveu serait devenu le mensonge
   * symétrique — annoncer mort un écran qui répond.
   *
   * Ils ne sont pas « laissés au cas où » : une entrée qu'aucun écran ne rend
   * est du code mort en cinq exemplaires, qui divergera sans que rien ne le
   * signale (doctrine de nettoyage de ce catalogue, 25/07/2026).
   */

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

  // ─── /course/[id] — E68 « DÉTAIL HISTORIQUE » ─────────────────────────────
  /**
   * ─── CE BLOC A CHANGÉ DE NATURE LE 28/07/2026 ─────────────────────────────
   * Il portait la PAGE D'ÉTAT d'un écran qui ne savait rien rendre (« GRYD ne
   * sait pas encore ouvrir une sortie une par une »), et le commentaire au
   * dessus expliquait pourquoi ses libellés étaient NEUTRALISÉS plutôt que
   * jumelés : « `/course/[id]` ne porte AUCUNE lentille : il n'existe aucune
   * lecture d'une course par identifiant (O1) […] il ne peut donc RIEN savoir
   * de la discipline dont on lui parle ».
   *
   * LA PRÉMISSE EST TOMBÉE. La lecture existe (`features/history/detailRead.ts`,
   * policy `runs_select_own` — aucun droit neuf n'a été ouvert), et elle lit
   * `runs.activity` : l'écran SAIT désormais de quelle discipline on lui parle,
   * pour chaque sortie, sans rien deviner. Les libellés qui NOMMENT l'effort
   * reçoivent donc leur jumeau `Bike`, comme partout ailleurs dans ce fichier.
   *
   * Ce qui reste NEUTRE l'est pour la bonne raison, pas par défaut : « Détail »,
   * « Effort », « Impact territorial », les noms de compteurs de zones et les
   * pastilles Verify nomment l'ACTE DE JEU, pas le sport. En dupliquer un à
   * l'identique ferait deux vérités à maintenir.
   */
  runFallbackTitle: { fr: 'Sortie', en: 'Activity', es: 'Salida', de: 'Aktivität', pt: 'Saída' },
  detailTitle: { fr: 'Détail', en: 'Details', es: 'Detalle', de: 'Details', pt: 'Detalhe' },
  detailKicker: {
    fr: 'TA COURSE',
    en: 'YOUR RUN',
    es: 'TU CARRERA',
    de: 'DEIN LAUF',
    pt: 'SUA CORRIDA',
  },
  detailKickerBike: {
    fr: 'TA SORTIE VÉLO',
    en: 'YOUR RIDE',
    es: 'TU SALIDA EN BICI',
    de: 'DEINE AUSFAHRT',
    pt: 'SEU PEDAL',
  },
  /**
   * ⚠️ LES QUATRE ÉTATS D'AVANT LA LECTURE SONT NEUTRES, ET C'EST UNE RÈGLE, PAS
   * UN OUBLI DE JUMELAGE. Chargement, pas connecté, sans serveur, échec : dans
   * ces quatre cas la ligne n'a PAS été lue, donc `runs.activity` est inconnue —
   * l'écran ne sait pas de quelle discipline on lui parle. Un jumeau vélo y
   * serait un texte que rien ne saurait choisir, et le libellé coureur y serait
   * une supposition sur le sport de quelqu'un.
   *
   * C'est l'écart EXACT avec `/performance` et `/historique`, où le commutateur
   * E14 vit dans la barre : là, le monde regardé est AFFICHÉ pendant ces mêmes
   * états, donc la copie doit le suivre. Ici, rien à l'écran ne revendique un
   * monde — le silence est la seule chose vraie.
   *
   * Vocabulaire neutre du fichier : fr « sortie » · en « activity » · es
   * « salida » · de « Aktivität » · pt « saída ».
   */
  detailLoading: {
    fr: 'Lecture de ta sortie…',
    en: 'Loading your activity…',
    es: 'Leyendo tu salida…',
    de: 'Deine Aktivität wird geladen…',
    pt: 'Carregando sua saída…',
  },
  detailSignedOutBody: {
    fr: 'Une sortie est rattachée à ton compte : connecte-toi pour l’ouvrir.',
    en: 'An activity belongs to your account: sign in to open it.',
    es: 'Una salida está vinculada a tu cuenta: inicia sesión para abrirla.',
    de: 'Eine Aktivität gehört zu deinem Konto: Melde dich an, um sie zu öffnen.',
    pt: 'Uma saída pertence à sua conta: entre para abri-la.',
  },
  detailNoBackendTitle: {
    fr: 'Tes sorties arrivent avec ton compte.',
    en: 'Your activities come with your account.',
    es: 'Tus salidas llegan con tu cuenta.',
    de: 'Deine Aktivitäten kommen mit deinem Konto.',
    pt: 'Suas saídas vêm com sua conta.',
  },
  detailFailedTitle: {
    fr: 'On n’a pas pu charger cette sortie.',
    en: 'We couldn’t load this activity.',
    es: 'No pudimos cargar esta salida.',
    de: 'Wir konnten diese Aktivität nicht laden.',
    pt: 'Não conseguimos carregar esta saída.',
  },
  /**
   * LU, ET AUCUNE LIGNE. C'est un FAIT sur SON historique — et l'énoncé vaut
   * pour les DEUX causes possibles (identifiant inconnu / sortie d'autrui), que
   * la RLS rend volontairement indistinguables : dire « elle existe mais elle
   * n'est pas à toi » serait un oracle d'existence sur la donnée d'autrui (§12).
   *
   * ⚠ Il ne se sert JAMAIS pendant un échec de lecture : là, ses sorties
   * existent et c'est GRYD qui n'a pas su lire. Deux états, deux textes.
   */
  detailNotFoundTitle: {
    fr: 'Sortie introuvable',
    en: 'Activity not found',
    es: 'Salida no encontrada',
    de: 'Aktivität nicht gefunden',
    pt: 'Saída não encontrada',
  },
  detailNotFoundBody: {
    fr: 'Cette sortie n’est pas dans ton historique. Le lien vient peut-être d’un autre compte, ou la sortie a été supprimée.',
    en: 'This activity isn’t in your history. The link may come from another account, or the activity was deleted.',
    es: 'Esta salida no está en tu historial. El enlace puede ser de otra cuenta, o la salida se borró.',
    de: 'Diese Aktivität ist nicht in deinem Verlauf. Der Link gehört vielleicht zu einem anderen Konto, oder die Aktivität wurde gelöscht.',
    pt: 'Esta saída não está no seu histórico. O link pode ser de outra conta, ou a saída foi apagada.',
  },
  /** Retour vers l'endroit où ses sorties SONT réellement. */
  runDetailPendingCta: {
    fr: 'Voir l’historique',
    en: 'See history',
    es: 'Ver historial',
    de: 'Verlauf öffnen',
    pt: 'Ver histórico',
  },
  /** LU À VOIX HAUTE sur une ligne d'historique : elle S'OUVRE, dis-le. */
  a11yOpenRun: {
    fr: '{line}. Ouvrir le détail',
    en: '{line}. Open details',
    es: '{line}. Abrir el detalle',
    de: '{line}. Details öffnen',
    pt: '{line}. Abrir o detalhe',
  },

  // ─── E68 : les trois sections du corps ────────────────────────────────────
  detailEffortLabel: { fr: 'Effort', en: 'Effort', es: 'Esfuerzo', de: 'Aufwand', pt: 'Esforço' },
  detailImpactLabel: {
    fr: 'Impact territorial',
    en: 'Territory impact',
    es: 'Impacto territorial',
    de: 'Gebiets-Wirkung',
    pt: 'Impacto territorial',
  },
  detailVerdictLabel: {
    fr: 'Ce que GRYD a retenu',
    en: 'What GRYD kept',
    es: 'Lo que GRYD contabilizó',
    de: 'Was GRYD gewertet hat',
    pt: 'O que a GRYD considerou',
  },
  /** Libellés de métriques — neutres aux deux mondes (ils nomment la mesure). */
  detailDistance: {
    fr: 'Distance',
    en: 'Distance',
    es: 'Distancia',
    de: 'Distanz',
    pt: 'Distância',
  },
  detailDuration: { fr: 'Durée', en: 'Duration', es: 'Duración', de: 'Dauer', pt: 'Duração' },
  detailPace: { fr: 'Allure', en: 'Pace', es: 'Ritmo', de: 'Pace', pt: 'Ritmo' },
  /**
   * Les six compteurs de zones du payload serveur. Chacun n'est RENDU que s'il
   * est lisible : un compteur absent disparaît, il ne devient jamais « 0 ».
   */
  detailZonesNew: { fr: 'Neuves', en: 'New', es: 'Nuevas', de: 'Neu', pt: 'Novas' },
  detailZonesStolen: {
    fr: 'Arrachées',
    en: 'Taken',
    es: 'Arrebatadas',
    de: 'Abgenommen',
    pt: 'Tomadas',
  },
  detailZonesPioneer: {
    fr: 'Pionnier',
    en: 'Pioneer',
    es: 'Pionero',
    de: 'Pionier',
    pt: 'Pioneiro',
  },
  detailZonesDefended: {
    fr: 'Défendues',
    en: 'Defended',
    es: 'Defendidas',
    de: 'Verteidigt',
    pt: 'Defendidas',
  },
  detailZonesBlocked: {
    fr: 'Bloquées',
    en: 'Blocked',
    es: 'Bloqueadas',
    de: 'Blockiert',
    pt: 'Bloqueadas',
  },
  /** A-41 « LE RELAIS » : zones co-courues, payées 1/rang. */
  detailZonesRelay: { fr: 'Relais', en: 'Relay', es: 'Relevo', de: 'Staffel', pt: 'Revezamento' },
  detailZonesTotal: {
    fr: 'Zones prises',
    en: 'Zones taken',
    es: 'Zonas tomadas',
    de: 'Zonen genommen',
    pt: 'Zonas tomadas',
  },
  detailPoints: { fr: 'Points', en: 'Points', es: 'Puntos', de: 'Punkte', pt: 'Pontos' },
  /** « XP » est un invariant de jeu : identique dans les 5 langues. */
  detailXp: { fr: 'XP', en: 'XP', es: 'XP', de: 'XP', pt: 'XP' },
  /**
   * PAYLOAD ILLISIBLE. On ne rend alors AUCUN compteur — et on dit pourquoi,
   * plutôt que de laisser une section vide qui se lirait comme un échec sportif.
   */
  detailImpactUnknown: {
    fr: 'GRYD n’a pas gardé le détail de ce que cette sortie a pris. Les points ci-dessus, eux, sont ceux que le serveur a crédités.',
    en: 'GRYD didn’t keep the breakdown of what this activity took. The points above are the ones the server credited.',
    es: 'GRYD no guardó el desglose de lo que tomó esta salida. Los puntos de arriba sí son los que acreditó el servidor.',
    de: 'GRYD hat die Aufschlüsselung dieser Aktivität nicht behalten. Die Punkte oben sind die, die der Server gutgeschrieben hat.',
    pt: 'A GRYD não guardou o detalhe do que esta saída tomou. Os pontos acima são os que o servidor creditou.',
  },
  /** Zone traversée mais non créditée : la raison est PLURIELLE, on l'énonce. */
  detailBlockedNote: {
    fr: 'Une zone bloquée a été traversée sans être créditée : verrou de 24 h, protection d’une capture fraîche, bouclier, zone privée ou non capturable.',
    en: 'A blocked zone was crossed without being credited: 24 h lock, fresh-capture protection, shield, private or non-capturable area.',
    es: 'Una zona bloqueada se cruzó sin acreditarse: bloqueo de 24 h, protección de captura reciente, escudo, zona privada o no capturable.',
    de: 'Eine blockierte Zone wurde durchquert, ohne gewertet zu werden: 24-h-Sperre, Schutz einer frischen Eroberung, Schild, private oder nicht eroberbare Zone.',
    pt: 'Uma zona bloqueada foi atravessada sem ser creditada: bloqueio de 24 h, proteção de captura recente, escudo, zona privada ou não capturável.',
  },

  // ─── E68 : « explication d'une invalidation » (spec) ──────────────────────
  /** `partial` — une PARTIE de la trace écartée, le reste a capturé. */
  detailVerdictPartial: {
    fr: 'Une partie de ta trace a été écartée (signal GPS douteux). Le reste a compté normalement.',
    en: 'Part of your trace was set aside (unreliable GPS). The rest counted normally.',
    es: 'Una parte de tu trazado se descartó (GPS dudoso). El resto contó con normalidad.',
    de: 'Ein Teil deiner Aufzeichnung wurde verworfen (unsicheres GPS). Der Rest zählte normal.',
    pt: 'Uma parte do seu traçado foi descartada (GPS duvidoso). O resto contou normalmente.',
  },
  /** `flagged` — l'effort compte, la capture non. Anti-shame : factuel. */
  detailVerdictFlagged: {
    fr: 'Cette course compte comme effort, pas comme capture : aucune zone ne t’a été attribuée.',
    en: 'This run counts as effort, not as a capture: no zone was credited to you.',
    es: 'Esta carrera cuenta como esfuerzo, no como captura: no se te atribuyó ninguna zona.',
    de: 'Dieser Lauf zählt als Aufwand, nicht als Eroberung: Dir wurde keine Zone gutgeschrieben.',
    pt: 'Esta corrida conta como esforço, não como captura: nenhuma zona foi creditada a você.',
  },
  detailVerdictFlaggedBike: {
    fr: 'Cette sortie compte comme effort, pas comme capture : aucune zone ne t’a été attribuée.',
    en: 'This ride counts as effort, not as a capture: no zone was credited to you.',
    es: 'Esta salida cuenta como esfuerzo, no como captura: no se te atribuyó ninguna zona.',
    de: 'Diese Ausfahrt zählt als Aufwand, nicht als Eroberung: Dir wurde keine Zone gutgeschrieben.',
    pt: 'Este pedal conta como esforço, não como captura: nenhuma zona foi creditada a você.',
  },
  /** `rejected` — l'en-tête ; la CAUSE vient de `REJECT_REASON_COPY_BY_ACTIVITY`. */
  detailVerdictRejected: {
    fr: 'Cette course n’a pas été retenue.',
    en: 'This run wasn’t counted.',
    es: 'Esta carrera no se contabilizó.',
    de: 'Dieser Lauf wurde nicht gewertet.',
    pt: 'Esta corrida não foi considerada.',
  },
  detailVerdictRejectedBike: {
    fr: 'Cette sortie n’a pas été retenue.',
    en: 'This ride wasn’t counted.',
    es: 'Esta salida no se contabilizó.',
    de: 'Diese Ausfahrt wurde nicht gewertet.',
    pt: 'Este pedal não foi considerado.',
  },
  /**
   * MOTIF ABSENT OU INCONNU. On ne déduit RIEN : une explication fausse est pire
   * qu'une explication manquante, parce qu'elle se défend toute seule.
   */
  detailVerdictRejectedNoReason: {
    fr: 'GRYD n’a pas gardé la raison de ce refus.',
    en: 'GRYD didn’t keep the reason for this rejection.',
    es: 'GRYD no guardó el motivo de este rechazo.',
    de: 'GRYD hat den Grund für diese Ablehnung nicht behalten.',
    pt: 'A GRYD não guardou o motivo desta recusa.',
  },

  // ─── E68 : ce que l'écran NE MONTRE PAS, dit à sa place ───────────────────
  /**
   * LE TRACÉ. La spec E68 demande « carte · trace protégée » ; GRYD n'archive
   * AUCUN tracé : `ingest_run` n'écrit jamais `runs.polyline_masked` (il ne
   * garde qu'un SHA-256, irréversible), et la seule trace côté client meurt au
   * départ de la sortie suivante. Une polyligne générique serait un FAUX tracé.
   */
  detailTraceNote: {
    fr: 'Pas de carte ici : GRYD ne conserve pas le tracé d’une sortie passée. Seule la sortie en cours a le sien.',
    en: 'No map here: GRYD doesn’t keep the route of a past activity. Only the one in progress has its own.',
    es: 'Aquí no hay mapa: GRYD no conserva el trazado de una salida pasada. Solo la salida en curso tiene el suyo.',
    de: 'Keine Karte hier: GRYD speichert die Route einer vergangenen Aktivität nicht. Nur die aktuelle Aktivität hat ihre eigene.',
    pt: 'Sem mapa aqui: a GRYD não guarda o traçado de uma saída passada. Só a saída em andamento tem o dela.',
  },
  /** Le partage rétroactif attend ce tracé — on le dit, on ne peint pas le bouton. */
  detailShareNote: {
    fr: 'Le partage rétroactif attend ce tracé : sans lui, la carte de partage n’aurait rien à montrer.',
    en: 'Sharing after the fact is waiting on that route: without it, the share card would have nothing to show.',
    es: 'El compartir a posteriori espera ese trazado: sin él, la tarjeta de compartir no tendría nada que mostrar.',
    de: 'Das nachträgliche Teilen wartet auf diese Route: ohne sie hätte die Share-Karte nichts zu zeigen.',
    pt: 'O compartilhamento retroativo espera esse traçado: sem ele, o card de compartilhar não teria o que mostrar.',
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
    a11yEffort: C.a11yRunEffortBike,
  },
};

/**
 * E68 « DÉTAIL HISTORIQUE » — les libellés du monde de LA SORTIE OUVERTE.
 *
 * Un `Record<Activity, …>` séparé de `HISTORY_COPY`, et ce n'est pas une
 * commodité : la LISTE choisit son monde par la LENTILLE (ce que le joueur a
 * demandé de voir), le DÉTAIL le lit dans `runs.activity` (ce que la sortie EST).
 * Les deux sources coïncident quand on ouvre une ligne depuis l'historique, et
 * PAS quand on arrive par lien profond — les fondre laisserait un cycliste lire
 * « TA COURSE » au-dessus d'une sortie vélo ouverte depuis un lien.
 *
 * ⚠️ IL NE CONTIENT QUE DES LIBELLÉS SERVIS *APRÈS* LA LECTURE. Les états qui
 * précèdent (chargement, pas connecté, sans serveur, échec) sont NEUTRES et ne
 * passent pas par ici : la discipline y est inconnue, et un `Record<Activity>`
 * les forcerait à choisir un monde qu'on n'a pas lu (cf. le bloc E68 plus haut).
 */
export interface RunDetailActivityCopy {
  /** Sur-titre de l'écran — il NOMME la sortie ouverte. */
  kicker: Entry;
  /** `flagged` — l'effort compte, la capture non. */
  verdictFlagged: Entry;
  /** `rejected` — l'en-tête ; la CAUSE vient de `REJECT_REASON_COPY_BY_ACTIVITY`. */
  verdictRejected: Entry;
}

export const RUN_DETAIL_COPY: Readonly<Record<Activity, RunDetailActivityCopy>> = {
  run: {
    kicker: C.detailKicker,
    verdictFlagged: C.detailVerdictFlagged,
    verdictRejected: C.detailVerdictRejected,
  },
  bike: {
    kicker: C.detailKickerBike,
    verdictFlagged: C.detailVerdictFlaggedBike,
    verdictRejected: C.detailVerdictRejectedBike,
  },
};

/**
 * Le jeu de libellés de la sortie OUVERTE. Le défaut est `DEFAULT_ACTIVITY`,
 * comme partout : une discipline illisible retombe sur le monde d'avant le vélo,
 * jamais sur une troisième discipline inventée.
 *
 * ⚠️ N'APPELER QUE SUR UNE SORTIE RÉELLEMENT LUE. Avant la lecture, il n'y a
 * aucune discipline à passer, et le défaut deviendrait une affirmation.
 */
export function runDetailCopy(activity: Activity = DEFAULT_ACTIVITY): RunDetailActivityCopy {
  return RUN_DETAIL_COPY[activity];
}

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
