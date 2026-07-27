/**
 * GRYD — copy PROPRE au partage (états d'honnêteté de la carte).
 *
 * Ces Entries respectent la règle i18n du projet (5 langues, parité forcée par
 * le type `Entry`) mais vivent ici plutôt que dans `i18n/catalog/result.ts` :
 * ce lot était produit en parallèle d'autres agents qui écrivaient dans ce
 * catalogue partagé.
 *
 * ─── CE QUI EST PARTI DANS LE CATALOGUE (26/07/2026) ────────────────────────
 * `traceUnavailableNote` est REMONTÉE dans `i18n/catalog/result.ts` (texte
 * inchangé) : elle NOMME l'effort (« le tracé de cette course »), il lui fallait
 * donc un jumeau vélo, et le servir depuis ici aurait exigé un SECOND aiguillage
 * par discipline à côté de `RESULT_COPY` — deux vérités à maintenir pour un même
 * écran. Ce qui reste ci-dessous ne nomme aucun effort : `traceUnavailable` est
 * déjà neutre dans les cinq langues, et les états vides ne DÉCRIVENT aucune
 * sortie (voir leur bloc plus bas).
 *
 * Elles couvrent le SEUL cas que le partage ne savait pas dire : « le tracé de
 * cette sortie n'est pas connu ». Avant, la carte de la card se contentait de ne
 * rien dessiner → un carré entièrement vide, sans explication (état vide ≠ écran
 * blanc). Ici la card dit ce qu'elle ne peut pas montrer, et garde ses chiffres.
 */
import { defineCatalog } from '../../i18n/types';

export const SHARE_COPY = defineCatalog({
  /**
   * Placeholder de la mini-carte quand le tracé de CE run est inconnu (le
   * Résultat arme `trace: []` pour une vraie course : ingest_run ne renvoie pas
   * encore la géométrie). Court — il s'affiche dans une card exportable.
   */
  traceUnavailable: {
    fr: 'Tracé indisponible',
    en: 'Route unavailable',
    es: 'Recorrido no disponible',
    de: 'Route nicht verfügbar',
    pt: 'Trajeto indisponível',
  },
  // La ligne d'explication sous l'aperçu (« Le tracé de cette course n'est pas
  // encore disponible… ») vit désormais dans `i18n/catalog/result.ts`, avec son
  // jumeau vélo — voir l'en-tête de ce fichier.

  /**
   * DÉFI de la carte REPRISE (récit `reprise` → style `avantApres`). La planche
   * E10 sépare le CTA par événement : une conquête neutre invite « PRENDS-LA-MOI »
   * (`challengeTakeIt`, catalogue partagé), mais une zone REPRISE à un rival se
   * nargue autrement — « REPRENDS-LA », le pendant exact du titre « J'AI REPRIS ».
   * L'EN/ES sont ceux validés par le fondateur (planche : « TAKE IT BACK /
   * QUÍTAMELO »). Il vit ICI, avec les autres copies propres au partage, et pas
   * dans `result.ts` : ce défi ne s'imprime que sur une card de partage, jamais
   * sur l'écran Résultat, et l'ajouter au catalogue partagé (multi-écrans) sortait
   * du périmètre de cet écran.
   */
  challengeRetake: {
    fr: 'REPRENDS-LA',
    en: 'TAKE IT BACK',
    es: 'QUÍTAMELO',
    de: 'HOL SIE DIR ZURÜCK',
    pt: 'VEM RETOMAR',
  },

  // ─── /partage SANS COURSE ARMÉE (21/07/2026) ──────────────────────────────
  // L'écran fabriquait une carte de partage COMPLÈTE (`shareRun?.card ??
  // demoCard`) : distance, allure, zones, tracé, rang — les chiffres d'un
  // persona de démonstration, prêts à partir sur Instagram sous le nom du
  // joueur. La note « Exemple » ne rachetait rien (« le bandeau n'y change
  // rien, c'est un run fabriqué à la place du sien »). Il n'y a donc plus de
  // carte du tout : trois états vides, trois copies distinctes.
  //
  // ─── POURQUOI CES TROIS-LÀ N'ONT PAS DE JUMEAU VÉLO (26/07/2026) ──────────
  // Elles disent « tes courses », « le partage part du résultat d'une course ».
  // Un jumeau vélo serait INSERVABLE : ces états ne s'affichent QUE lorsqu'aucune
  // sortie n'est armée — il n'y a alors aucune discipline à lire, et le seul
  // `activity` disponible viendrait d'une URL qui ne décrit aucune sortie. On ne
  // choisirait donc pas la bonne version : on tirerait à pile ou face. Elles
  // décrivent le PARCOURS PRODUIT, pas une sortie du joueur, et la discipline
  // déclarée du jeu reste la course à pied (`DEFAULT_ACTIVITY`).
  // C'est un écart ASSUMÉ et écrit, pas un oubli : le jour où l'app connaîtra la
  // discipline habituelle du joueur hors course, ces trois phrases pourront la
  // suivre. Tant qu'elle n'existe pas, on ne promet rien au-delà du code.

  /** Titre commun de l'écran quand aucune course n'est armée. */
  emptyTitle: {
    fr: 'Rien à partager pour l’instant',
    en: 'Nothing to share yet',
    es: 'Nada que compartir por ahora',
    de: 'Noch nichts zu teilen',
    pt: 'Nada para compartilhar ainda',
  },
  /** Cas 1 — pas connecté : on invite à se connecter. */
  emptySignedOutBody: {
    fr: 'Connecte-toi : tes courses et tes zones te suivent, et tu pourras les partager.',
    en: 'Sign in: your runs and zones follow you, and you’ll be able to share them.',
    es: 'Inicia sesión: tus carreras y zonas te siguen, y podrás compartirlas.',
    de: 'Melde dich an: Deine Läufe und Zonen folgen dir – dann kannst du sie teilen.',
    pt: 'Entre na sua conta: suas corridas e zonas seguem você, e dá para compartilhar.',
  },
  emptySignedOutCta: {
    fr: 'Me connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  /** Cas 2 — connecté, mais aucune course armée : on invite à l'action. */
  emptySignedInBody: {
    fr: 'Le partage part du résultat d’une course. Cours, puis partage-la depuis son écran de résultat.',
    en: 'Sharing starts from a run’s result. Go run, then share it from its result screen.',
    es: 'Compartir empieza en el resultado de una carrera. Corre y compártela desde su resultado.',
    de: 'Geteilt wird aus dem Ergebnis eines Laufs. Lauf los und teile ihn dann von dort.',
    pt: 'Compartilhar começa no resultado de uma corrida. Corra e compartilhe pela tela de resultado.',
  },
  emptySignedInCta: {
    fr: 'Retour à la carte',
    en: 'Back to the map',
    es: 'Volver al mapa',
    de: 'Zurück zur Karte',
    pt: 'Voltar ao mapa',
  },
  /**
   * Cas 3 — on ne SAIT pas encore (restauration de session en cours). Un
   * chargement n'est pas un état vide : on n'affirme rien sur le joueur tant
   * que la lecture n'a pas résolu.
   */
  emptyLoading: {
    fr: 'Chargement…',
    en: 'Loading…',
    es: 'Cargando…',
    de: 'Wird geladen…',
    pt: 'Carregando…',
  },
  /**
   * Retour de l'état vide. NEUTRE : « ← Résultat » (le libellé de l'aperçu)
   * mentirait ici, il n'y a aucun résultat derrière. C'est aussi la SEULE sortie
   * pendant le chargement, où l'écran ne propose volontairement aucun CTA.
   */
  emptyBack: {
    fr: 'Retour',
    en: 'Back',
    es: 'Volver',
    de: 'Zurück',
    pt: 'Voltar',
  },
  emptyBackA11y: {
    fr: 'Revenir en arrière',
    en: 'Go back',
    es: 'Volver atrás',
    de: 'Zurückgehen',
    pt: 'Voltar atrás',
  },

  // ─── ÉDITIONS CLUB + EXPORT HD (promesses Arsenal rendues vraies) ─────────
  // POURQUOI ICI ET PAS DANS `i18n/catalog/result.ts` : aucune de ces phrases
  // ne s'imprime sur l'écran Résultat — elles n'existent que dans le
  // compositeur et dans l'image qu'il produit. Et AUCUNE ne nomme l'effort :
  // c'est délibéré, pas un raccourci. Un titre de carte qui dirait « course »
  // exigerait un jumeau vélo (voir `resultCopy`), et ces deux-là sortent dans un
  // PNG que le crew du joueur lit sans pouvoir le corriger. « Sur le terrain »
  // et « le chrono » sont vrais à pied comme à vélo.

  /** Titre de l'édition AFFICHE — deux lignes display (le \n est la grammaire). */
  heroPoster: {
    fr: 'SUR LE\nTERRAIN',
    en: 'ON THE\nGROUND',
    es: 'SOBRE EL\nTERRENO',
    de: 'AUF DEM\nGELÄNDE',
    pt: 'NO\nTERRENO',
  },
  /** Titre de l'édition CHRONO — le temps est le fait principal. */
  heroChrono: {
    fr: 'LE\nCHRONO',
    en: 'THE\nCLOCK',
    es: 'EL\nCRONO',
    de: 'DIE\nUHR',
    pt: 'O\nCRONO',
  },

  /** Libellé du style AFFICHE dans la rangée de modes. */
  styleAffiche: { fr: 'Affiche', en: 'Poster', es: 'Póster', de: 'Poster', pt: 'Pôster' },
  /** Libellé du style CHRONO dans la rangée de modes. */
  styleChrono: { fr: 'Chrono', en: 'Clock', es: 'Crono', de: 'Uhr', pt: 'Crono' },

  /**
   * Qualités d'export. « HD » n'est PAS une promesse creuse : l'étage de rendu
   * produit réellement plus de pixels (voir clubExport.ts) — et l'app ne dit
   * « HD » que quand l'image l'est vraiment.
   */
  qualityStandard: { fr: 'Standard', en: 'Standard', es: 'Estándar', de: 'Standard', pt: 'Padrão' },
  qualityHd: { fr: 'HD', en: 'HD', es: 'HD', de: 'HD', pt: 'HD' },

  /**
   * Étiquette d'une fonction réservée au Club, posée sur le contrôle. Elle ne
   * dit pas « indisponible » : le contrôle MÈNE quelque part (voir le CTA).
   */
  clubOnly: { fr: 'Club', en: 'Club', es: 'Club', de: 'Club', pt: 'Club' },
  /** CTA d'invitation — un non-abonné part vers /premium, il ne rate rien. */
  clubInviteCta: {
    fr: 'Découvrir le Club',
    en: 'Discover Club',
    es: 'Descubrir el Club',
    de: 'Club entdecken',
    pt: 'Conhecer o Club',
  },
  /**
   * Statut Club en cours de LECTURE. On n'affirme rien sur l'abonnement du
   * joueur tant que la lecture n'a pas résolu (un chargement n'est pas un état).
   */
  clubChecking: {
    fr: 'Vérification de ton abonnement…',
    en: 'Checking your subscription…',
    es: 'Comprobando tu suscripción…',
    de: 'Abo wird geprüft…',
    pt: 'Verificando sua assinatura…',
  },
  /**
   * La lecture du statut a ÉCHOUÉ. On le DIT : proposer « Découvrir le Club » à
   * un membre serait un mensonge, exporter en HD sans savoir en serait un autre.
   */
  clubUnreadable: {
    fr: 'Statut d’abonnement non lu. Le partage standard reste disponible.',
    en: 'Subscription status unavailable. Standard sharing still works.',
    es: 'No se pudo leer tu suscripción. Compartir en estándar sigue disponible.',
    de: 'Abo-Status nicht lesbar. Standard-Teilen funktioniert weiterhin.',
    pt: 'Status da assinatura não lido. Compartilhar em padrão continua disponível.',
  },
  /** Toast : une image HD a RÉELLEMENT été produite (jamais dit autrement). */
  hdExported: {
    fr: 'Image HD exportée',
    en: 'HD image exported',
    es: 'Imagen HD exportada',
    de: 'HD-Bild exportiert',
    pt: 'Imagem HD exportada',
  },
});
