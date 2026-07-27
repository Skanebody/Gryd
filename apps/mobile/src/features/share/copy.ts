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
    // « HOL SIE DIR ZURÜCK » (18 signes) DÉBORDAIT la capsule (voir le bloc
    // LONGUEUR ci-dessous) : la capsule est en `numberOfLines={1}` sans
    // `ellipsizeMode`, donc le défaut « tail » l'aurait coupé en « …ZURÜ… » dans
    // le PNG exporté — exactement le texte d'action tronqué que §A.9 interdit.
    // Le datif « dir » est facultatif en allemand : le sens est intact.
    de: 'HOL SIE ZURÜCK',
    pt: 'VEM RETOMAR',
  },

  // ═══ LES SIX CTA DE DÉFI DE LA PLANCHE E10 ════════════════════════════════
  // « CTA par événement : Prends-la-moi / Reprends-la / Viens l'attaquer /
  //   Rejoins le crew / Ferme la tienne / Rattrape-nous — un seul par média. »
  //   (docs/design/vague-1/ANNOTATIONS-E10-E26.md:45-47)
  //
  // ─── LA CORRESPONDANCE, ÉTABLIE SUR LE MOTEUR ET NON SUR L'ORDRE DE LA LISTE
  // `styleForNarrative()` (narrative.ts:137-155) associe SIX récits territoriaux
  // à six templates, plus un septième récit — `effort`/`record` → `simple` — qui
  // n'a rien pris à personne. Six CTA, six récits : la correspondance est donc
  // exacte, et elle se lit sur le SENS, pas sur l'ordre de la phrase (la liste de
  // la planche n'est pas parallèle à son propre ordre de priorité « capture >
  // reprise > défense > boucle > crew > classement ») :
  //
  //   capture    → conquete    · « Prends-la-moi »   (C.challengeTakeIt)
  //   reprise    → avantApres  · « Reprends-la »     (challengeRetake, ci-dessus)
  //   défense    → defense     · « Viens l'attaquer » → voir l'ARBITRAGE plus bas
  //   boucle     → boucle      · « Ferme la tienne » (challengeCloseYours)
  //   crew       → crew        · « Rejoins le crew » (challengeJoinCrew)
  //   classement → classement  · « Rattrape-… »      (challengeCatchMe)
  //
  // ⚠️ « Ferme la tienne » va à la BOUCLE, pas à la défense : on ne « ferme »
  // pas une frontière tenue, on ferme SA boucle — et c'est le seul des six qui
  // reste sans preneur si on l'attribue ailleurs. Le template `simple` (récit
  // `effort`) n'en reçoit AUCUN, et c'est la règle d'honnêteté, pas un oubli :
  // les six CTA désignent tous un territoire (« -la », « la tienne », « -moi »)
  // qu'une sortie sans capture ne possède pas. Un défi y serait une capsule sans
  // référent, exportée en PNG.
  //
  // ─── ARBITRAGE : LA DÉFENSE GARDE « FRANCHIS-LA » (C.challengeHoldTheLine) ──
  // Deux raisons, dans cet ordre :
  //  1. MÊME ACTE DE LANGAGE. « Viens l'attaquer » et « FRANCHIS-LA » sont le
  //     même défi lancé au même rival sur le même objet — la ligne que le joueur
  //     vient de tenir (`heroDefendedPlace`, hero `defended` = zones réellement
  //     défendues). Ce n'est pas une mécanique différente : c'est la même image.
  //  2. LA LONGUEUR TRANCHE. « VIENS L'ATTAQUER » fait 16 signes → ~196 pt de
  //     large, soit PLUS que les 189 pt utiles de la capsule : il sortirait
  //     tronqué. « FRANCHIS-LA » (11) tient. Renommer aurait donc échangé un
  //     synonyme contre un texte coupé — §A.9 l'interdit.
  // Rien n'est renommé côté `result.ts` : cette entrée-là est servie aussi par
  // l'écran Résultat et ne m'appartient pas.
  //
  // ─── LONGUEUR : LA BORNE EST MESURÉE, PAS ESTIMÉE ──────────────────────────
  // La capsule (`ShareCard.tsx:266-272`, style `challengePill`:466-473) est
  // `alignSelf: 'stretch'` dans un contenu de `spacing.cardPadding` (20) de
  // marge, sur la preview la PLUS ÉTROITE — le format story, 232 pt
  // (`app/partage.tsx:237`) : 232 − 2×20 − 2×1,5 (bordure) = 189 pt utiles. Le
  // texte est composé en `fontSizes.md` (16), graisse 800, `letterSpacing: 2`.
  // Avec la chasse moyenne que ShareCard emploie déjà pour ses capitales grasses
  // (0,64 em, cf. `HeroTitleLines`), une capitale coûte 16 × 0,64 + 2 = 12,24 pt
  // → 15 signes au maximum. La preview EST le média exporté (planche E10), donc
  // ce qui déborde ici déborde dans le PNG publié. `challengeCta.test.ts`
  // reproduit ce calcul sur les SIX entrées, et confronte ses constantes à la
  // source de ShareCard pour qu'il tombe au lieu de mentir quand elle bouge.

  /**
   * DÉFI de la carte CREW (récit `crew` → template `crew`). Planche : « Rejoins
   * le crew ». Le genre du mot « crew » suit celui du catalogue Résultat
   * (`heroForCrewNoName` : « LE crew » fr, « EL crew » es, « DIE Crew » de,
   * « pelo crew » pt) — deux cartes qui se contrediraient sur le même mot dans
   * la même image seraient une faute de plus qu'une faute de style.
   *
   * Il reste juste quand `crewName` est vide : la carte titre alors « COURU POUR
   * LE CREW » sans le nommer — le crew existe, il n'est pas identifié.
   */
  challengeJoinCrew: {
    fr: 'REJOINS LE CREW',
    en: 'JOIN THE CREW',
    es: 'ÚNETE AL CREW',
    de: 'KOMM ZUR CREW',
    pt: 'VEM PRO CREW',
  },

  /**
   * DÉFI de la carte BOUCLE (récit `boucle` → template `boucle`). Planche :
   * « Ferme la tienne » — le pendant exact du titre « BOUCLE FERMÉE », et le
   * seul des six qui parle d'un geste que le lecteur peut refaire chez lui.
   *
   * Le pronom suit le GENRE du mot « boucle » dans chaque langue, tel que
   * `heroLoopClosed` l'écrit : « la boucle » (fr, f.), « el bucle » (es, m.),
   * « die Schleife » (de, f.), « o loop » (pt, m.). Traduire « la tienne » mot à
   * mot aurait produit « CIERRA LA TUYA » sous un titre « BUCLE CERRADO ».
   */
  challengeCloseYours: {
    fr: 'FERME LA TIENNE',
    en: 'CLOSE YOURS',
    es: 'CIERRA EL TUYO',
    de: 'SCHLIESS DEINE',
    pt: 'FECHA O TEU',
  },

  /**
   * DÉFI de la carte CLASSEMENT (récit `classement` → template `classement`).
   *
   * ─── ÉCART ASSUMÉ AVEC LA PLANCHE : « -MOI », PAS « -NOUS » ────────────────
   * La planche écrit « Rattrape-nous », en cohérence avec SA composition, qui
   * montre un rang de CREW (« NIGHT OWLS passent #2 »). Le code, lui, ne porte
   * qu'un rang PERSONNEL : le titre de cette carte est `C.heroRankLine` =
   * « JE SUIS {rank} » (result.ts:1926-1932) et `rankLabel` est un rang de
   * joueur (`ShareDemoData.rankLabel`, `null` tant qu'aucune `season_scores`
   * n'est lue — shareRun.ts:98, course-result.tsx:864). Aucun rang de crew
   * n'existe nulle part dans le pipeline.
   * « JE SUIS #8 · RATTRAPE-NOUS » ferait donc dire à l'image une position
   * COLLECTIVE que la carte ne détient pas — dans un PNG que le crew lit sans
   * pouvoir le corriger. On garde le sens de la planche (« viens me chercher au
   * classement ») et on aligne la personne sur le fait réellement affiché.
   * Le jour où un rang de crew existera, « -nous » redeviendra le mot juste.
   */
  challengeCatchMe: {
    fr: 'RATTRAPE-MOI',
    en: 'CATCH ME',
    es: 'ALCÁNZAME',
    de: 'HOL MICH EIN',
    pt: 'VEM ME ALCANÇAR',
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

  // ═══ E35 · RACCOURCIS RÉSEAU (planche « Partager ») ═══════════════════════
  // La spec liste « Instagram, TikTok, WhatsApp, Plus ». Les trois premiers sont
  // des MARQUES : jamais traduites, donc pas d'Entry pour leur libellé — l'écran
  // les affiche tels quels. Seul « Plus » est du français, et seuls les noms
  // ACCESSIBLES ont besoin des cinq langues (VoiceOver lit une action, pas une
  // icône : §15 « labels qui décrivent l'action et l'état »).
  //
  // ⚠️ CONSTITUTION §2 — un raccourci ne se peint QUE si la cible est réellement
  // atteignable sur la plateforme courante (app installée / schéma d'URL ouvrable
  // / partage natif présent). Là où elle ne l'est pas, le bouton n'est pas rendu,
  // et si l'app doit s'expliquer, elle le fait avec `channelUnavailable*` plus
  // bas. Un raccourci Instagram qui échoue toujours serait exactement le bouton
  // mort que la charte interdit.

  /** Le quatrième raccourci : la feuille de partage native du système. */
  channelMore: {
    fr: 'Plus',
    en: 'More',
    es: 'Más',
    de: 'Mehr',
    pt: 'Mais',
  },
  /** a11y d'un raccourci NOMMÉ. {name} = Instagram | TikTok | WhatsApp (invariants). */
  channelA11y: {
    fr: 'Partager sur {name}',
    en: 'Share on {name}',
    es: 'Compartir en {name}',
    de: 'Auf {name} teilen',
    pt: 'Compartilhar no {name}',
  },
  /** a11y du raccourci « Plus » — il n'ouvre pas un réseau, il ouvre un choix. */
  channelMoreA11y: {
    fr: 'Choisir une autre destination',
    en: 'Pick another destination',
    es: 'Elegir otro destino',
    de: 'Ein anderes Ziel wählen',
    pt: 'Escolher outro destino',
  },

  // ─── Indisponibilités (dites, jamais peintes en bouton qui échoue) ─────────
  /**
   * L'app cible n'est pas installée. On le DIT au lieu d'ouvrir un store en
   * douce : le joueur voulait partager, pas installer quelque chose.
   * {name} = nom de la marque.
   */
  channelUnavailableApp: {
    fr: '{name} n’est pas installé sur cet appareil.',
    en: '{name} isn’t installed on this device.',
    es: '{name} no está instalado en este dispositivo.',
    de: '{name} ist auf diesem Gerät nicht installiert.',
    pt: '{name} não está instalado neste aparelho.',
  },
  /** Aperçu web / plateforme sans partage natif : la fonction vit sur le téléphone. */
  channelUnavailablePlatform: {
    fr: 'Le partage direct vit dans l’app sur téléphone.',
    en: 'Direct sharing lives in the phone app.',
    es: 'Compartir directo vive en la app del móvil.',
    de: 'Direktes Teilen lebt in der Handy-App.',
    pt: 'O compartilhamento direto vive no app do celular.',
  },
  /** La remise à l'app tierce a échoué — on ne prétend jamais que c'est parti. */
  channelHandoffFailed: {
    fr: 'Partage impossible pour l’instant. Ton image est prête, réessaie.',
    en: 'Sharing failed for now. Your image is ready, try again.',
    es: 'No se pudo compartir ahora. Tu imagen está lista, reinténtalo.',
    de: 'Teilen hat gerade nicht geklappt. Dein Bild ist fertig, versuch es nochmal.',
    pt: 'Não deu para compartilhar agora. Sua imagem está pronta, tente de novo.',
  },
  /** L'image n'a pas pu être produite : il n'y a alors RIEN à remettre. */
  exportFailed: {
    fr: 'L’image n’a pas pu être produite. Rien n’a été partagé.',
    en: 'The image couldn’t be produced. Nothing was shared.',
    es: 'No se pudo generar la imagen. No se ha compartido nada.',
    de: 'Das Bild konnte nicht erzeugt werden. Es wurde nichts geteilt.',
    pt: 'Não foi possível gerar a imagem. Nada foi compartilhado.',
  },
  /** Rendu EN COURS : un chargement n'affirme pas qu'un partage a eu lieu. */
  exporting: {
    fr: 'Préparation de l’image…',
    en: 'Preparing the image…',
    es: 'Preparando la imagen…',
    de: 'Bild wird vorbereitet…',
    pt: 'Preparando a imagem…',
  },

  // ═══ E36 · LE SHEET « PERSONNALISER » ═════════════════════════════════════
  // Spec E35 : « lien Personnaliser » ; E36 : « éditeur simple — aperçu, onglet
  // actif, 3 à 6 choix maximum, CTA APPLIQUER. Aucun éditeur de design libre
  // complexe. » Et E35 « Personnalisation » énumère les cinq onglets, avec la
  // contrainte forte : « une seule option à la fois ».

  /** Le lien qui ouvre le sheet, sur E35. */
  customizeLink: {
    fr: 'Personnaliser',
    en: 'Customise',
    es: 'Personalizar',
    de: 'Anpassen',
    pt: 'Personalizar',
  },
  /** Titre du sheet. */
  customizeTitle: {
    fr: 'Personnaliser',
    en: 'Customise',
    es: 'Personalizar',
    de: 'Anpassen',
    pt: 'Personalizar',
  },
  /** Le rappel de la règle : un onglet à la fois, jamais cinq réglages ouverts. */
  customizeHint: {
    fr: 'Une chose à la fois. L’aperçu suit.',
    en: 'One thing at a time. The preview follows.',
    es: 'Una cosa a la vez. La vista previa sigue.',
    de: 'Eins nach dem anderen. Die Vorschau zieht mit.',
    pt: 'Uma coisa de cada vez. A prévia acompanha.',
  },
  /** Fermeture du sheet sans rien appliquer — a11y (le contrôle est une croix). */
  customizeCloseA11y: {
    fr: 'Fermer sans appliquer',
    en: 'Close without applying',
    es: 'Cerrar sin aplicar',
    de: 'Schließen, ohne zu übernehmen',
    pt: 'Fechar sem aplicar',
  },

  // ─── Les cinq onglets (E35 « Personnalisation ») ──────────────────────────
  customizeTabStyle: {
    fr: 'Style',
    en: 'Style',
    es: 'Estilo',
    de: 'Stil',
    pt: 'Estilo',
  },
  customizeTabFormat: {
    fr: 'Format',
    en: 'Format',
    es: 'Formato',
    de: 'Format',
    pt: 'Formato',
  },
  customizeTabMedia: {
    fr: 'Média',
    en: 'Media',
    es: 'Medio',
    de: 'Medium',
    pt: 'Mídia',
  },
  customizeTabText: {
    fr: 'Texte',
    en: 'Text',
    es: 'Texto',
    de: 'Text',
    pt: 'Texto',
  },
  /**
   * La sixième section de la planche E10 (« Format · Style · Photo · Donnée ·
   * Texte · Confidentialité »), absente de la liste E35. C'est elle qui décide
   * QUEL chiffre la carte met en géant — la surface quand `territories.area_m2`
   * a été lue, sinon les zones, la distance, la durée… Elle ne propose QUE des
   * grandeurs que `heroMetricAvailable` (cardModel.ts) déclare disponibles :
   * une grandeur absente n'est pas grisée, elle n'est pas peinte.
   *
   * `customizeTabMedia` (« Média » / la Photo) reste, lui, NON PEINT :
   * `apps/mobile/app.json` déclare `NSPhotoLibraryUsageDescription` pour un
   * usage photo de PROFIL uniquement — voir composerModel.ts.
   */
  customizeTabData: {
    fr: 'Donnée',
    en: 'Data',
    es: 'Dato',
    de: 'Wert',
    pt: 'Dado',
  },
  customizeTabPrivacy: {
    fr: 'Confidentialité',
    en: 'Privacy',
    es: 'Privacidad',
    de: 'Privatsphäre',
    pt: 'Privacidade',
  },
  /** a11y de l'onglet actif — l'état ne tient jamais à la seule couleur (§15). */
  customizeTabA11ySelected: {
    fr: '{name}, onglet actif',
    en: '{name}, active tab',
    es: '{name}, pestaña activa',
    de: '{name}, aktiver Tab',
    pt: '{name}, aba ativa',
  },

  /** CTA du sheet (spec E36, mot pour mot). */
  customizeApply: {
    fr: 'APPLIQUER',
    en: 'APPLY',
    es: 'APLICAR',
    de: 'ÜBERNEHMEN',
    pt: 'APLICAR',
  },
  /**
   * Un onglet peut n'avoir aucun choix à offrir sur CETTE card (pas de photo
   * jointe → onglet Média vide ; pas de tracé connu → certains styles tombent).
   * On le dit plutôt que d'afficher une rangée vide.
   */
  customizeTabEmpty: {
    fr: 'Rien à régler ici pour cette carte.',
    en: 'Nothing to adjust here for this card.',
    es: 'Nada que ajustar aquí para esta tarjeta.',
    de: 'Für diese Karte gibt es hier nichts einzustellen.',
    pt: 'Nada para ajustar aqui nesta carta.',
  },

  // ─── Section « Donnée » : les grandeurs qui n'ont pas déjà un libellé ──────
  // Les autres réutilisent les libellés du chiffre héros du catalogue partagé
  // (`C.zonesStatLabel`, `C.heroLabelHeld`, `heroLabelBonus`, `heroLabelCrew`,
  // `heroLabelRank`) : le chip et la carte doivent nommer la MÊME grandeur du
  // même mot. Trois manquaient, parce que sur la carte elles ne portent pas un
  // mot mais une unité (« km », « m² ») ou rien du tout (une durée se lit
  // seule) — un chip, lui, doit être nommé.
  heroPickSurface: {
    fr: 'Surface',
    en: 'Area',
    es: 'Superficie',
    de: 'Fläche',
    pt: 'Área',
  },
  heroPickDistance: {
    fr: 'Distance',
    en: 'Distance',
    es: 'Distancia',
    de: 'Distanz',
    pt: 'Distância',
  },
  heroPickDuration: {
    fr: 'Durée',
    en: 'Duration',
    es: 'Duración',
    de: 'Dauer',
    pt: 'Duração',
  },

  // ─── Section « Texte » : les deux textes OPTIONNELS de la carte ────────────
  // On n'ajoute JAMAIS de texte ici — on choisit d'imprimer ou non ceux que le
  // template a déjà produits (la capsule de défi, la ligne de contexte). Retirer
  // une information vraie n'est pas un mensonge ; en inventer une le serait.
  textPartChallenge: {
    fr: 'Défi',
    en: 'Challenge',
    es: 'Reto',
    de: 'Challenge',
    pt: 'Desafio',
  },
  textPartContext: {
    fr: 'Contexte',
    en: 'Context',
    es: 'Contexto',
    de: 'Kontext',
    pt: 'Contexto',
  },
  /** Résumé de section quand les deux textes sont retirés. */
  textPartNone: {
    fr: 'Aucun',
    en: 'None',
    es: 'Ninguno',
    de: 'Keiner',
    pt: 'Nenhum',
  },

  // ─── Section « Confidentialité » du sheet ─────────────────────────────────
  privacyEndpointsLabel: {
    fr: 'Départ et arrivée',
    en: 'Start and finish',
    es: 'Salida y llegada',
    de: 'Start und Ziel',
    pt: 'Largada e chegada',
  },
  privacyEndpointsHidden: {
    fr: 'Masqués',
    en: 'Hidden',
    es: 'Ocultos',
    de: 'Verborgen',
    pt: 'Ocultos',
  },
  privacyEndpointsVisible: {
    fr: 'Visibles',
    en: 'Visible',
    es: 'Visibles',
    de: 'Sichtbar',
    pt: 'Visíveis',
  },
  /**
   * Ce réglage n'est PAS local au partage : c'est le même `maskEndpoints` que
   * l'écran Confidentialité (features/privacy/prefs.ts), persisté pour toutes
   * les cartes suivantes. Le taire ferait croire à un réglage jetable.
   */
  privacyEndpointsGlobal: {
    fr: 'Ce réglage est celui de l’écran Confidentialité : il vaut pour tous tes partages.',
    en: 'This is the setting from the Privacy screen: it applies to all your shares.',
    es: 'Es el ajuste de la pantalla Privacidad: se aplica a todo lo que compartas.',
    de: 'Das ist die Einstellung aus dem Privatsphäre-Bildschirm – sie gilt für alle Beiträge.',
    pt: 'É o ajuste da tela Privacidade: vale para tudo o que você compartilhar.',
  },

  // ═══ E10 · BADGE « PROTÉGÉ » PERMANENT, DÉTAIL AU TAP ═════════════════════
  // La planche : « Badge 🛡 Protégé permanent, détail au tap. » Permanent oblige
  // à ne PAS figer une phrase : ce qui est protégé dépend de l'état réel du
  // pipeline. Ces lignes sont donc dérivées de `protectionLines()`
  // (composerModel.ts), une par situation RÉELLEMENT tenue par le code — jamais
  // une promesse de plus que `applySharePrivacy`.
  /** a11y du badge (le badge lui-même n'affiche que le mot « Protégé »). */
  protectedDetailA11y: {
    fr: 'Protégé — voir ce qui est protégé',
    en: 'Protected — see what’s protected',
    es: 'Protegido: ver qué está protegido',
    de: 'Geschützt – ansehen, was geschützt ist',
    pt: 'Protegido — ver o que está protegido',
  },
  protectedDetailTitle: {
    fr: 'Ce qui est protégé',
    en: 'What’s protected',
    es: 'Lo que está protegido',
    de: 'Was geschützt ist',
    pt: 'O que está protegido',
  },
  protectedDetailClose: {
    fr: 'Fermer',
    en: 'Close',
    es: 'Cerrar',
    de: 'Schließen',
    pt: 'Fechar',
  },
  /** Aucun tracé publié : la protection la plus forte, et la seule à dire. */
  protectionNoRoute: {
    fr: 'Aucun tracé n’est publié sur cette carte.',
    en: 'No route is published on this card.',
    es: 'Esta tarjeta no publica ningún recorrido.',
    de: 'Auf dieser Karte wird keine Strecke veröffentlicht.',
    pt: 'Nenhum trajeto é publicado neste cartão.',
  },
  /** {m} = SHARE_TRIM_M, la valeur RÉELLEMENT appliquée (game-rules). */
  protectionEndpoints: {
    fr: 'Départ et arrivée coupés sur {m} m.',
    en: 'Start and finish trimmed by {m} m.',
    es: 'Salida y llegada recortadas {m} m.',
    de: 'Start und Ziel um {m} m gekürzt.',
    pt: 'Largada e chegada cortadas em {m} m.',
  },
  /**
   * {m} = SHARE_SIMPLIFY_EPSILON_M. Non désactivable : c'est une règle.
   *
   * ⚠️ CORRIGÉ LE 27/07/2026 — LA PHRASE PROMETTAIT UN FLOUTAGE QUI N'EXISTE
   * PAS. Elle disait « jamais le trottoir exact » (« never the exact
   * sidewalk »). Or le pipeline appelle `simplifyPolyline`
   * (packages/engine/src/polygon.ts:711), un Douglas-Peucker qui ne fait que
   * SUPPRIMER des sommets : son docblock garantit une « SOUS-SUITE STRICTE …
   * les OBJETS d'origine (aucune coordonnée recalculée) », et le corps le
   * confirme (`douglasPeuckerKeep(xy, toleranceM).map((i) => points[i]!)`).
   * Chaque sommet PUBLIÉ est donc une position GPS EXACTE, non déplacée ; les
   * {m} m ne bornent que l'écart des points RETIRÉS à la corde qui les
   * remplace. Promettre un déplacement spatial dans l'écran même qui sert à
   * rassurer avant publication est la faute la plus chère du lot.
   * La phrase dit maintenant ce que le code fait : moins de points, donc moins
   * de détail — et elle ne prétend plus déplacer quoi que ce soit.
   */
  protectionSimplify: {
    fr: 'Tracé allégé : les détails sous {m} m sont retirés (les points gardés, eux, ne sont pas déplacés).',
    en: 'Route thinned out: detail under {m} m is dropped (the points kept are not moved).',
    es: 'Recorrido aligerado: se quitan los detalles por debajo de {m} m (los puntos conservados no se desplazan).',
    de: 'Strecke ausgedünnt: Details unter {m} m entfallen (die behaltenen Punkte werden nicht verschoben).',
    pt: 'Trajeto aliviado: os detalhes abaixo de {m} m são removidos (os pontos mantidos não são deslocados).',
  },
  /** {n} = zones RÉELLEMENT lues en base pour ce joueur. */
  protectionZonesApplied: {
    fr: 'Tes zones privées sont retirées du tracé ({n}).',
    en: 'Your private zones are removed from the route ({n}).',
    es: 'Tus zonas privadas se quitan del recorrido ({n}).',
    de: 'Deine privaten Zonen werden aus der Strecke entfernt ({n}).',
    pt: 'Suas zonas privadas são removidas do trajeto ({n}).',
  },
  /**
   * L'AVEU, et il compte autant que les protections : le pipeline sait exclure
   * des zones privées, mais aucun écran ne permet encore d'en déclarer une
   * (features/privacy/zonesStore.ts lit une table que rien n'écrit). Annoncer
   * « zones exclues » ici promettrait une protection que le joueur ne peut pas
   * armer.
   */
  protectionZonesNone: {
    fr: 'Zones privées : aucune déclarée — l’app ne permet pas encore d’en créer.',
    en: 'Private zones: none set — the app can’t create them yet.',
    es: 'Zonas privadas: ninguna — la app aún no permite crearlas.',
    de: 'Private Zonen: keine – die App kann sie noch nicht anlegen.',
    pt: 'Zonas privadas: nenhuma — o app ainda não permite criá-las.',
  },
  protectionNoClock: {
    fr: 'Aucune heure de sortie sur la carte, seulement une durée.',
    en: 'No time of day on the card, only a duration.',
    es: 'Ninguna hora del día en la tarjeta, solo una duración.',
    de: 'Keine Uhrzeit auf der Karte, nur eine Dauer.',
    pt: 'Nenhum horário no cartão, apenas uma duração.',
  },

  // ═══ E37 — PARTAGE TERMINÉ (spec l.1463-1472) ═════════════════════════════
  // « Format : toast ou petit écran de succès selon canal. Actions : retour au
  //   résultat ; copier le lien ; voir le profil public. »
  //
  // ─── DEUX TITRES, PARCE QU'IL Y A DEUX VÉRITÉS ─────────────────────────────
  // `shareDeliveryClaim()` (features/share/shareOutcome.ts, pur et testé) sépare
  // ce que la plateforme a RAPPORTÉ de ce qu'on aimerait dire. « Partage
  // terminé » n'est vrai que sur `confirmed` (iOS `Share.share`, Web Share API).
  // Sur `handed_off` — le cas de TOUS les partages d'image (`expo-sharing` ne
  // rend aucun verdict) et de tout Android (`ACTION_SEND` ne remonte pas
  // l'issue) — l'app ne sait pas si l'envoi a été validé, et elle le dit.
  // Écrire « Partage terminé » là serait la même faute qu'une donnée fabriquée :
  // une affirmation sans mesure.
  //
  // Ces libellés vivent ICI et pas dans `i18n/catalog/result.ts` parce qu'ils ne
  // NOMMENT aucun effort (ni « course » ni « sortie ») : ils n'ont donc pas de
  // jumeau vélo à maintenir, et le catalogue partagé n'a rien à en faire.

  /** Titre du panneau quand la plateforme a CONFIRMÉ l'envoi. */
  doneTitleConfirmed: {
    fr: 'Partage terminé',
    en: 'Share complete',
    es: 'Compartido',
    de: 'Geteilt',
    pt: 'Compartilhado',
  },
  doneBodyConfirmed: {
    fr: 'C’est envoyé. Tu peux revenir à ton résultat.',
    en: 'It’s sent. You can go back to your result.',
    es: 'Enviado. Puedes volver a tu resultado.',
    de: 'Gesendet. Du kannst zu deinem Ergebnis zurückkehren.',
    pt: 'Enviado. Você pode voltar ao seu resultado.',
  },

  /**
   * Titre du panneau quand la feuille système ne dit RIEN de l'issue. Il décrit
   * le geste qu'on a réellement fait — remettre le média — et pas un résultat
   * qu'on n'a pas mesuré.
   */
  doneTitleHandedOff: {
    fr: 'Média remis au partage',
    en: 'Handed to the share sheet',
    es: 'Entregado al menú de compartir',
    de: 'An die Teilen-Ansicht übergeben',
    pt: 'Entregue ao menu de compartilhamento',
  },
  /**
   * L'AVEU, en une phrase : la feuille système ne rapporte pas si l'envoi a été
   * validé. Le joueur, lui, le sait — l'app n'a pas à faire semblant.
   */
  doneBodyHandedOff: {
    fr: 'GRYD ne sait pas si tu as validé l’envoi : la feuille de partage ne le dit pas.',
    en: 'GRYD can’t tell whether you confirmed the send: the share sheet doesn’t report it.',
    es: 'GRYD no sabe si confirmaste el envío: el menú de compartir no lo informa.',
    de: 'GRYD weiß nicht, ob du das Senden bestätigt hast – die Teilen-Ansicht meldet es nicht.',
    pt: 'O GRYD não sabe se você confirmou o envio: o menu de compartilhamento não informa.',
  },

  /**
   * CTA principal — la suite que la spec liste en premier, et le trou exact de
   * l'écran : après un partage, rien ne ramenait au résultat. Majuscules comme
   * les autres CTA pleins de ce parcours (`customizeApply`).
   */
  doneBackToResult: {
    fr: 'Revenir au résultat',
    en: 'Back to the result',
    es: 'Volver al resultado',
    de: 'Zurück zum Ergebnis',
    pt: 'Voltar ao resultado',
  },
  /**
   * Action neutre : refermer le panneau et retrouver le compositeur intact
   * derrière. C'est aussi le CTA principal quand il n'y a AUCUN historique de
   * navigation (deep link) — « retour au résultat » n'aurait alors nulle part
   * où aller, et un CTA qui retombe sur les onglets sous ce libellé mentirait.
   */
  doneShareAgain: {
    fr: 'Partager ailleurs',
    en: 'Share somewhere else',
    es: 'Compartir en otro sitio',
    de: 'Woanders teilen',
    pt: 'Compartilhar em outro lugar',
  },
  doneCloseA11y: {
    fr: 'Fermer et revenir au partage',
    en: 'Close and go back to sharing',
    es: 'Cerrar y volver a compartir',
    de: 'Schließen und zurück zum Teilen',
    pt: 'Fechar e voltar para o compartilhamento',
  },
});
