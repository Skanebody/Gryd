/**
 * GRYD — i18n : catalogue du domaine ONBOARDING.
 *
 * Source de vérité des 5 langues pour le stepper d'onboarding. La STRUCTURE
 * par étape (HOOK, AGE, …) reste dans features/onboarding/content.ts — qui
 * référence ces Entries ; les écrans résolvent via t() (i18n/store).
 *
 * Règles : tutoiement fr / « du » de / « tú » es / « você » pt informel ;
 * invariants jamais traduits (GRYD, Crew, km, « Chartreuse » = nom de la
 * couleur signature) ; CTA courts dans TOUTES les langues (§A : jamais tronqué
 * à 375 px) ; kickers en MAJUSCULES ; mêmes {placeholders} partout.
 *
 * ─── NETTOYAGE DU 21/07/2026 (refonte « trop de cliques ») ──────────────────
 * Ce fichier portait encore la copy de SEPT étapes, dont quatre supprimées avec
 * le mode vitrine (`choose` / `sync` / `run` / `capture`) et trois supprimées ou
 * fusionnées par la refonte (`city` fondue dans `learn`, `permission` déplacée
 * au premier GO, `crew` rendue à son onglet). Une Entry que plus aucun écran ne
 * lit est une promesse de texte sans écran derrière : elles sont RETIRÉES, pas
 * commentées. `content.ts` est le seul importeur du catalogue, donc le typage
 * signale immédiatement toute lecture oubliée.
 *
 * Le catalogue LOCAL `L` de content.ts (créé pour éviter les collisions entre
 * agents parallèles) est également REPLIÉ ICI : les copies d'onboarding vivent
 * de nouveau à un seul endroit.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Navigation du stepper ─────────────────────────────────────────────────
  /** Flèche retour discrète (accessibilityLabel — jamais visible à l'écran). */
  navBack: {
    fr: 'Revenir à l’étape précédente',
    en: 'Go back to the previous step',
    es: 'Volver al paso anterior',
    de: 'Zurück zum vorherigen Schritt',
    pt: 'Voltar à etapa anterior',
  },
  /**
   * Frise de progression, lue par les lecteurs d'écran : des points ne s'entendent
   * pas. Les DEUX nombres viennent du flow (`stepProgress`), jamais d'un littéral —
   * la frise a déjà annoncé cinq étapes pour un parcours de quatre.
   */
  stepProgressA11y: {
    fr: 'Étape {n} sur {total}',
    en: 'Step {n} of {total}',
    es: 'Paso {n} de {total}',
    de: 'Schritt {n} von {total}',
    pt: 'Etapa {n} de {total}',
  },
  /** Sortie douce partagée (« Plus tard ») — compte sans backend, notifications. */
  later: {
    fr: 'Plus tard',
    en: 'Later',
    es: 'Más tarde',
    de: 'Später',
    pt: 'Mais tarde',
  },
  /**
   * Chip d'honnêteté posée SUR les visuels : ce plateau enseigne, il n'est pas
   * la carte du joueur. (Anciennement `syncDemoTag`, du temps où l'import de
   * course était mis en scène — le mot n'a pas changé, son seul lecteur si.)
   */
  exampleTag: {
    fr: 'Exemple',
    en: 'Sample',
    es: 'Ejemplo',
    de: 'Beispiel',
    pt: 'Exemplo',
  },

  // ─── PORTE DE CONNEXION (ex-écran HOOK) ────────────────────────────────────
  //
  // ⚠️ CE QUI A ÉTÉ RETIRÉ ICI LE 22/07/2026, ET POURQUOI (refonte 3 cartes) :
  //   · `hookTitle` (« Prends ta ville. ») — l'écran splash n'existe plus ; la
  //     carte 1 ouvre désormais sur le GESTE, pas sur une promesse de ville ;
  //   · `hookTagline` (« Cours pour ton crew. Conquiers ta ville. ») — elle
  //     introduisait le CREW au tout premier écran, à quelqu'un qui ne sait pas
  //     encore ce qu'est un crew (diagnostic fondateur). Le crew entre à la
  //     carte 2, quand il répond à une question posée. ⚠️ Ce n'est PAS un
  //     abandon de la baseline de marque AMENDEMENT-42 : elle reste la phrase du
  //     produit (store, site, comms) — elle n'est simplement plus le premier mot
  //     dit à un inconnu ;
  //   · `hookCta` (« Découvrir ma ville ») — il promettait une ville qu'AUCUN
  //     écran ne faisait choisir. La promesse est maintenant tenue par l'écran
  //     ville, et le CTA nomme l'étape suivante.
  /**
   * LA PORTE DE CONNEXION (retour fondateur 21/07/2026). Dite à la 1re personne
   * et au PASSÉ — « j'ai déjà » — parce que c'est ainsi que la cherche celui qui
   * réinstalle ou change de téléphone. Volontairement DISCRÈTE (lien gris, pas
   * un 2e CTA : §A4) mais présente sur le tout premier écran.
   */
  hookSignIn: {
    fr: 'J’ai déjà un compte',
    en: 'I already have an account',
    es: 'Ya tengo una cuenta',
    de: 'Ich habe schon ein Konto',
    pt: 'Já tenho uma conta',
  },

  // ─── 1b AGE-GATE 16+ ───────────────────────────────────────────────────────
  ageKicker: {
    fr: 'AVANT DE COMMENCER',
    en: 'BEFORE YOU START',
    es: 'ANTES DE EMPEZAR',
    de: 'BEVOR DU LOSLEGST',
    pt: 'ANTES DE COMEÇAR',
  },
  /**
   * Variante quand le joueur vient de « J'ai déjà un compte » : il n'est pas en
   * train de découvrir le produit, il va se connecter. Le kicker le DIT, pour
   * qu'il comprenne que cet écran est une vérification légale sur SON chemin —
   * pas l'onboarding qui recommence.
   */
  ageKickerSignIn: {
    fr: 'AVANT DE TE CONNECTER',
    en: 'BEFORE YOU SIGN IN',
    es: 'ANTES DE INICIAR SESIÓN',
    de: 'BEVOR DU DICH ANMELDEST',
    pt: 'ANTES DE ENTRAR',
  },
  ageTitle: {
    fr: 'Tu as 16 ans ou plus ?',
    en: 'Are you 16 or older?',
    es: '¿Tienes 16 años o más?',
    de: 'Bist du 16 oder älter?',
    pt: 'Você tem 16 anos ou mais?',
  },
  ageTagline: {
    fr: 'GRYD utilise ta position et se joue en communauté. L’âge minimum est 16 ans.',
    en: 'GRYD uses your location and is played with others. The minimum age is 16.',
    es: 'GRYD usa tu ubicación y se juega en comunidad. La edad mínima es 16 años.',
    de: 'GRYD nutzt deinen Standort und wird gemeinsam gespielt. Mindestalter: 16 Jahre.',
    pt: 'O GRYD usa sua localização e é jogado em comunidade. A idade mínima é 16 anos.',
  },
  ageConfirm: {
    fr: 'Oui, j’ai 16 ans ou plus',
    en: 'Yes, I’m 16 or older',
    es: 'Sí, tengo 16 años o más',
    de: 'Ja, ich bin 16 oder älter',
    pt: 'Sim, tenho 16 anos ou mais',
  },
  /** a11y du CTA de confirmation (formulation directe, sans le « Oui »). */
  ageConfirmA11y: {
    fr: 'J’ai 16 ans ou plus',
    en: 'I am 16 or older',
    es: 'Tengo 16 años o más',
    de: 'Ich bin 16 oder älter',
    pt: 'Tenho 16 anos ou mais',
  },
  ageUnder: {
    fr: 'J’ai moins de 16 ans',
    en: 'I’m under 16',
    es: 'Tengo menos de 16 años',
    de: 'Ich bin unter 16',
    pt: 'Tenho menos de 16 anos',
  },
  ageBlockedTitle: {
    fr: 'Reviens à 16 ans.',
    en: 'Come back at 16.',
    es: 'Vuelve a los 16.',
    de: 'Komm mit 16 wieder.',
    pt: 'Volte aos 16.',
  },
  ageBlockedTagline: {
    fr: 'GRYD n’est pas accessible avant 16 ans. On garde ta ville au chaud pour toi.',
    en: 'GRYD isn’t available under 16. We’ll keep your city warm for you.',
    es: 'GRYD no está disponible antes de los 16. Te guardamos tu ciudad para cuando vuelvas.',
    de: 'GRYD ist erst ab 16 verfügbar. Wir halten dir deine Stadt warm.',
    pt: 'O GRYD não está disponível antes dos 16. Guardamos sua cidade para você.',
  },
  /**
   * SORTIE de la question d'âge posée EN PLACE devant l'écran ville (le raccourci
   * « utiliser ma position » la déclenche). Sans elle, répondre « moins de 16 »
   * rendait un écran terminal SANS pied : la seule issue était la flèche du
   * header, qui ramène à la rivalité — l'écran ville disparaissait sans que le
   * joueur l'ait décidé. Le choix MANUEL d'une ville n'est pas gaté par l'âge :
   * la porte se rouvre donc, et elle le DIT.
   */
  ageBackToCity: {
    fr: 'Revenir au choix de ma ville',
    en: 'Back to choosing my city',
    es: 'Volver a elegir mi ciudad',
    de: 'Zurück zur Stadtwahl',
    pt: 'Voltar à escolha da cidade',
  },

  // ─── ANCIEN ÉCRAN « LE TERRAIN + LA RÈGLE » — SUPPRIMÉ LE 22/07/2026 ───────
  //
  // `learnKicker` / `learnTitle` / `learnTagline` / `learnCta` sont RETIRÉS avec
  // l'écran `learn` : les cartes 1 (MÉCANIQUE) et 2 (RIVALITÉ) enseignent
  // séparément ce qu'il montrait en bloc, et une Entry que plus aucun écran ne
  // lit est une promesse de texte sans écran derrière.
  //
  // ⚠️ SA NOTE, ELLE, N'EST PAS MORTE — elle a changé de nom et d'écran. Elle
  // était TOUT ce qui restait de l'écran `permission` supprimé (« le GPS s'allume
  // au départ ») ; la perdre ferait tomber la boîte système de nulle part au
  // premier GO. Elle vit maintenant en `firstRunGpsNote`, sur l'écran profil —
  // le dernier avant la carte — sans son préfixe « Exemple. », qui désignait un
  // visuel qui n'y est plus.
  /**
   * ⚠️ « SORTIE », PLUS « COURSE » (26/07/2026 — le vélo est une discipline
   * RÉELLE). Cette note est lue AVANT que le joueur ait choisi quoi que ce soit :
   * l'onboarding ne porte AUCUNE lentille de discipline, donc il n'y a rien à
   * décliner — pas de twin `…Bike` ici, ce serait un texte sans surface. Le mot
   * doit simplement valoir pour les deux mondes. Le fait énoncé, lui, ne change
   * pas d'un monde à l'autre : le GPS s'allume au départ, quelle que soit la
   * discipline. La clé garde son nom (interne, jamais lu par un joueur).
   */
  firstRunGpsNote: {
    fr: 'Tes zones arrivent à ta première sortie — GPS allumé au départ.',
    en: 'Your zones come with your first outing — GPS on at the start.',
    es: 'Tus zonas llegan en tu primera salida: GPS activo al empezar.',
    de: 'Deine Zonen kommen mit der ersten Tour — GPS an beim Start.',
    pt: 'Suas zonas chegam na primeira saída — GPS ligado na largada.',
  },

  // ═════════════════════════════════════════════════════════════════════════
  // REFONTE 3 CARTES + COMPTE (demande fondateur 22/07/2026)
  //
  //   1. MÉCANIQUE  « Ferme une boucle. Prends la zone. »      → CONTINUER
  //   2. RIVALITÉ   « Ta zone peut être reprise. »             → CONTINUER
  //   3. VILLE      « Joue dans ta ville. À ton rythme. »      → CHOISIR MA VILLE
  //   puis PROFIL MINIMAL (pseudo + ville), puis la carte.
  //
  // ⚠️ LE VOCABULAIRE DE CTA A CHANGÉ, ET C'EST DÉLIBÉRÉ. La règle « CTA à
  // verbes contextuels, jamais “Continuer” » (§A4) est levée POUR CES TROIS
  // CARTES par arbitrage du fondateur : trois cartes qui s'enchaînent sont UN
  // parcours, et trois verbes différents y feraient croire à trois décisions
  // distinctes. Le CTA qui NOMME l'étape suivante revient dès qu'il y a une
  // vraie décision (« Choisir ma ville », « Continuer avec {city} », « Entrer
  // sur la carte »). Ne pas confondre avec l'override AMENDEMENT-38 : « GO »
  // est le bouton d'ACTION CENTRAL de l'app, il n'a rien à voir avec ces CTA.
  //
  // TENUE EN 2 LIGNES : les titres portent un `\n` explicite (la coupure est
  // typographique, pas laissée au hasard des largeurs). L'écran `learn` a déjà
  // débordé de ~70 px sur un 375×667 — il n'y a pas de ScrollView. Toute
  // rallonge se mesure avant d'être écrite.
  // ═════════════════════════════════════════════════════════════════════════

  // ─── Démonstrations animées (labels du 4e temps + a11y) ────────────────────
  //
  // ⚠️ `captureDemoLabel` (« Zone prise ») RETIRÉE le 25/07/2026 avec le composant
  // `CaptureDemo`, qui n'avait plus AUCUN importeur depuis que la carte 1 est
  // rendue par le hero plein cadre `E01Hero` : le hero n'a pas de 4e temps à
  // étiqueter. Une Entry que plus aucune surface ne rend est une promesse de texte
  // sans écran derrière — retirée, pas commentée en attente d'un jour meilleur.
  /** Label bref à la fin de la carte 2 — l'état, pas un score. */
  rivalryDemoLabel: {
    fr: 'Zone contestée',
    en: 'Zone contested',
    es: 'Zona disputada',
    de: 'Zone umkämpft',
    pt: 'Zona disputada',
  },
  /**
   * a11y du visuel tapable (« toucher pour relancer »). Jamais rendu en
   * mouvement réduit : l'image y est déjà à son état final, un bouton qui ne
   * montrerait rien serait un bouton mort.
   */
  demoReplay: {
    fr: 'Revoir l’exemple',
    en: 'Replay the sample',
    es: 'Ver el ejemplo otra vez',
    de: 'Beispiel noch einmal ansehen',
    pt: 'Ver o exemplo de novo',
  },

  // ─── CARTE 1 — MÉCANIQUE ───────────────────────────────────────────────────
  mechanicKicker: {
    fr: 'COMMENT ÇA MARCHE',
    en: 'HOW IT WORKS',
    es: 'CÓMO FUNCIONA',
    de: 'SO FUNKTIONIERT’S',
    pt: 'COMO FUNCIONA',
  },
  /**
   * LE TOUT PREMIER TEXTE DE L'APP — et il déclarait un jeu de COURSE À PIED
   * (« COURS. / PRENDS TA VILLE. », 26/07/2026). Depuis que le vélo est une
   * discipline RÉELLE, c'était le mensonge le plus en AMONT de tout le produit :
   * il tombait avant les CGU, avant le choix de la ville, avant tout.
   *
   * ─── POURQUOI NE NOMMER AUCUNE DISCIPLINE (et pas les nommer toutes) ──────
   * L'autre voie possible était « COURS. ROULE. / PRENDS TA VILLE. ». Elle est
   * écartée pour trois raisons, dans cet ordre :
   *   1. elle ÉNUMÈRE. Le premier mot dit à un inconnu deviendrait une liste de
   *      modes de transport, là où la promesse est un TERRITOIRE ;
   *   2. elle oblige à se ranger dans un camp (« je suis coureur ou cycliste ? »)
   *      avant même de savoir ce qu'est le jeu — or cette carte n'enseigne QUE
   *      le geste (content.ts : « le geste : ferme une boucle, prends la zone.
   *      Rien d'autre ») ;
   *   3. elle ment de nouveau le jour où une 3ᵉ discipline existe. Un titre qui doit être
   *      réécrit à chaque ajout n'est pas une promesse, c'est un changelog.
   * Le reste de la carte prouve que la neutralité ne coûte pas la force :
   * `mechanicKicker` (« COMMENT ÇA MARCHE »), `mechanicTagline` (« Chaque boucle
   * fermée peut devenir ton territoire. ») et la boucle animée `E01Route`
   * enseignent la mécanique SANS nommer un corps. Le titre était la seule ligne
   * hors du rang.
   *
   * Le verbe retenu est celui de la baseline de marque elle-même (AMENDEMENT-42,
   * « Cours pour ton crew. Conquiers ta ville. ») : on garde la moitié qui est
   * vraie dans les deux mondes, on laisse tomber celle qui nomme un corps.
   *
   * ─── LONGUEUR MESURÉE, PAS ESTIMÉE ───────────────────────────────────────
   * Rendu à 375 pt (E01Hero : 343 px utiles, InterTight_800ExtraBold 40 px,
   * interligne 44, letterSpacing -0,4), ligne la plus longue :
   *   fr 225,3 · en 217,5 · es 224,9 · de 257,9 · pt 281,9 — sur 343 px.
   * (La mesure pt porte sur « A TUA CIDADE. » ; le passage à « SUA CIDADE. »,
   * deux caractères de moins, n'a pas été REMESURÉ — il ne peut qu'aller dans
   * le bon sens, et le budget était déjà tenu avant lui.)
   * L'ANCIEN titre, lui, DÉBORDAIT : « TOMA TU CIUDAD. » 347,1 px,
   * « NIMM DEINE STADT. » 379,3 px, « TOMA A TUA CIDADE. » 402,6 px — trois
   * langues sur cinq passaient à 3 lignes, ce que le compte de CARACTÈRES de
   * copyFit.test.ts ne pouvait pas voir. Le budget du titre héros y est
   * désormais dérivé de cette mesure (14 caractères par ligne).
   */
  mechanicTitle: {
    fr: 'CONQUIERS\nTA VILLE.',
    en: 'CONQUER\nYOUR CITY.',
    es: 'CONQUISTA\nTU CIUDAD.',
    de: 'EROBERE\nDEINE STADT.',
    pt: 'CONQUISTA\nSUA CIDADE.',
  },
  /**
   * ⚠️ REGISTRE : LE CATALOGUE EN PORTAIT DEUX (tranché le 26/07/2026).
   *
   * L'en-tête de ce fichier déclare « você » en portugais et le tutoiement en
   * français. Cette carte — la PREMIÈRE de l'app — désobéissait aux deux, et
   * dans les deux cas sur DEUX LIGNES VOISINES :
   *   · pt : « A TUA CIDADE. » / « o TEU território » (tutoiement européen)
   *     juste au-dessus de `cityTagline` (« Você sai ») et de
   *     `firstRunGpsNote` (« Suas zonas ») — deux personnes grammaticales dans
   *     le même parcours, à trois écrans d'intervalle ;
   *   · fr : « votre territoire » sous un titre qui tutoie (« CONQUIERS TA
   *     VILLE. »). Le vouvoiement était l'unique occurrence du catalogue.
   * Un catalogue qui déclare un registre et en emploie un autre laisse le
   * suivant trancher au hasard : les deux lignes rejoignent leur carte.
   *
   * LE SENS DU TITRE N'EST PAS TOUCHÉ (il vient d'être arbitré et il est vrai
   * dans les deux disciplines) : seule la personne change. « SUA CIDADE. » fait
   * ONZE caractères contre treize — il perd un « A » et une espace, et échange
   * un T contre un S : la ligne ne s'allonge pas. Le budget mesuré du titre
   * héros (14 caractères par ligne, `copyFit.test.ts:38`, dérivé d'un rendu
   * réel à 343 px utiles) reste donc tenu avec de la marge.
   */
  mechanicTagline: {
    fr: 'Chaque boucle fermée peut devenir ton territoire.',
    en: 'Every closed loop can become your territory.',
    es: 'Cada bucle cerrado puede ser tu territorio.',
    de: 'Jede geschlossene Runde kann dein Gebiet werden.',
    pt: 'Cada circuito fechado pode tornar-se o seu território.',
  },
  // ⚠️ `mechanicStreet` (« VOTRE RUE ») RETIRÉE le 25/07/2026 : le label posé sur
  // la photo de la planche E01 a été remplacé par la BOUCLE ANIMÉE (`E01Route`),
  // qui enseigne la même chose en la montrant. Plus aucun écran ne le lisait.
  // « Passer » (haut à droite, planche E01) — saute l'onboarding.
  onbSkip: {
    fr: 'Passer',
    en: 'Skip',
    es: 'Saltar',
    de: 'Überspringen',
    pt: 'Pular',
  },

  // ─── CARTE 2 — RIVALITÉ ────────────────────────────────────────────────────
  // Le CREW entre ICI, et pas avant : sur la carte 1, un joueur qui découvre le
  // produit ne sait pas encore ce qu'est un crew. Il apparaît quand il répond à
  // une question qu'il vient de se poser — « on peut me la reprendre ? ».
  rivalryKicker: {
    fr: 'POURQUOI TU REVIENS',
    en: 'WHY YOU COME BACK',
    es: 'POR QUÉ VUELVES',
    de: 'WARUM DU WIEDERKOMMST',
    pt: 'POR QUE VOCÊ VOLTA',
  },
  rivalryTitle: {
    fr: 'Ta zone peut\nêtre reprise.',
    en: 'Your zone can\nbe taken back.',
    es: 'Tu zona puede\nser recuperada.',
    de: 'Deine Zone kann\nzurückerobert werden.',
    pt: 'Sua zona pode\nser retomada.',
  },
  /**
   * Le CREW entre par cette ligne — et elle disait « COURS seul » (26/07/2026).
   * Ce que la phrase doit poser, c'est le CHOIX (seul ou à plusieurs), pas la
   * façon de se déplacer : le verbe d'effort partait donc sans rien emporter.
   * « Défends-la » reprend le titre juste au-dessus (« Ta zone peut être
   * reprise. ») — la tagline répond à la question que le titre vient de poser.
   * Mesuré à 375 pt (327 px utiles, Inter 16) : 1 ligne dans les 5 langues,
   * max 290,4 px (de).
   */
  rivalryTagline: {
    fr: 'Défends-la seul, ou avec ton crew.',
    en: 'Defend it solo, or with your crew.',
    es: 'Defiéndela solo o con tu crew.',
    de: 'Verteidige sie allein — oder mit deiner Crew.',
    pt: 'Defenda-a sozinho ou com seu crew.',
  },

  // ─── CARTE 3 — VILLE (choix MANUEL, sans GPS) ──────────────────────────────
  // Personne n'est sommé d'autoriser sa localisation pour continuer : on peut
  // être assis dans un train, en vacances, ou loin de chez soi. La position est
  // un RACCOURCI facultatif, jamais la porte d'entrée.
  cityKicker: {
    fr: 'TON TERRAIN',
    en: 'YOUR GROUND',
    es: 'TU TERRENO',
    de: 'DEIN REVIER',
    pt: 'SEU TERRENO',
  },
  cityTitle: {
    fr: 'Joue dans ta ville.\nÀ ton rythme.',
    en: 'Play in your city.\nAt your own pace.',
    es: 'Juega en tu ciudad.\nA tu ritmo.',
    de: 'Spiel in deiner Stadt.\nIn deinem Tempo.',
    pt: 'Jogue na sua cidade.\nNo seu ritmo.',
  },
  /**
   * « Tu PARTIRAS », plus « tu courras » (26/07/2026). Le sens de la phrase est
   * le CONTRASTE « maintenant / quand tu voudras » — choisir sa ville n'engage
   * à aucun effort tout de suite. Ce contraste ne demande aucune discipline :
   * « partir » (set off / salir / losgehen / sair) le dit pour les deux mondes.
   * Mesuré à 375 pt (327 px utiles, Inter 16) : jamais plus de lignes qu'avant
   * (fr/de/pt 2 lignes comme avant, en/es 1 ligne comme avant), budget §A des
   * sous-titres (72 caractères) respecté dans les 5 langues.
   */
  cityTagline: {
    fr: 'Choisis ta ville maintenant. Tu partiras quand tu seras prêt.',
    en: 'Pick your city now. Set off when you’re ready.',
    es: 'Elige tu ciudad ahora. Saldrás cuando estés listo.',
    de: 'Wähl jetzt deine Stadt. Los geht’s, wenn du so weit bist.',
    pt: 'Escolha sua cidade agora. Você sai quando estiver pronto.',
  },
  citySearchPlaceholder: {
    fr: 'Chercher une ville',
    en: 'Search for a city',
    es: 'Buscar una ciudad',
    de: 'Stadt suchen',
    pt: 'Buscar uma cidade',
  },
  /**
   * Intitulé de la liste. « OUVERTES », pas « suggérées » : GRYD ouvre ville par
   * ville, et la liste vient du serveur (city_zones) — on ne fabrique aucune
   * ville, européenne ou non, pour faire nombre.
   */
  cityOpenList: {
    fr: 'VILLES OUVERTES',
    en: 'CITIES OPEN NOW',
    es: 'CIUDADES ABIERTAS',
    de: 'OFFENE STÄDTE',
    pt: 'CIDADES ABERTAS',
  },
  /** Raccourci FACULTATIF — action secondaire, jamais l'unique CTA (§A4). */
  cityUseLocation: {
    fr: 'Utiliser ma position',
    en: 'Use my location',
    es: 'Usar mi ubicación',
    de: 'Meinen Standort nutzen',
    pt: 'Usar minha localização',
  },
  /**
   * Pré-permission : la phrase qui précède la boîte SYSTÈME (elle ne doit jamais
   * tomber de nulle part). Dit l'usage exact — une lecture, pour trouver la
   * ville — et rappelle que le choix manuel reste ouvert.
   */
  cityLocationWhy: {
    fr: 'GRYD lit ta position une seule fois, pour trouver ta ville. Tu peux aussi la choisir à la main.',
    en: 'GRYD reads your location once, to find your city. You can also pick it by hand.',
    es: 'GRYD lee tu ubicación una sola vez, para encontrar tu ciudad. También puedes elegirla a mano.',
    de: 'GRYD liest deinen Standort einmal, um deine Stadt zu finden. Du kannst sie auch selbst wählen.',
    pt: 'O GRYD lê sua localização uma vez, para encontrar sua cidade. Você também pode escolher na mão.',
  },
  /**
   * Il y a PLUS de villes ouvertes que la liste n'en montre. La liste est bornée
   * pour que le CTA reste à l'écran (il n'y a pas de ScrollView dans
   * l'onboarding) : plutôt que de laisser croire que ces trois-là sont toutes,
   * on le dit et on renvoie à la recherche. Jamais affiché en Saison 0 — deux
   * villes tiennent dans la liste ; la phrase attend l'ouverture de l'Europe.
   */
  cityMore: {
    fr: 'D’autres villes sont ouvertes. Cherche la tienne.',
    en: 'More cities are open. Search for yours.',
    es: 'Hay más ciudades abiertas. Busca la tuya.',
    de: 'Es sind weitere Städte offen. Such deine.',
    pt: 'Há mais cidades abertas. Busque a sua.',
  },
  /** Recherche sans résultat : on le DIT, on ne propose pas un ersatz. */
  cityNoMatch: {
    fr: 'Aucune ville ouverte ne correspond. GRYD ouvre une ville à la fois.',
    en: 'No open city matches. GRYD opens one city at a time.',
    es: 'Ninguna ciudad abierta coincide. GRYD abre una ciudad a la vez.',
    de: 'Keine offene Stadt passt. GRYD öffnet eine Stadt nach der anderen.',
    pt: 'Nenhuma cidade aberta corresponde. O GRYD abre uma cidade por vez.',
  },
  /**
   * Position lue, mais hors de toute ville ouverte. JAMAIS de repli silencieux
   * sur une ville par défaut : le repli qui invente était le mensonge le plus
   * grave trouvé par AMENDEMENT-47.
   */
  cityLocationOutside: {
    fr: 'Tu n’es dans aucune ville ouverte. Choisis-en une dans la liste.',
    en: 'You’re not in an open city. Pick one from the list.',
    es: 'No estás en ninguna ciudad abierta. Elige una de la lista.',
    de: 'Du bist in keiner offenen Stadt. Wähl eine aus der Liste.',
    pt: 'Você não está em nenhuma cidade aberta. Escolha uma da lista.',
  },
  /**
   * Position REFUSÉE. Distincte de « indisponible » — même exigence que les cinq
   * états de la carte : on ne met pas sur le dos du joueur un capteur muet, et on
   * n'appelle pas « panne » une décision qu'il a prise. Aucune injonction : le
   * choix manuel est juste à côté, et il suffit.
   */
  cityLocationDenied: {
    fr: 'Position non autorisée. Choisis ta ville dans la liste.',
    en: 'Location not allowed. Pick your city from the list.',
    es: 'Ubicación no autorizada. Elige tu ciudad en la lista.',
    de: 'Standort nicht erlaubt. Wähl deine Stadt aus der Liste.',
    pt: 'Localização não autorizada. Escolha sua cidade na lista.',
  },
  /** Position indisponible (GPS coupé, capteur muet, timeout) — jamais un écran muet. */
  cityLocationFailed: {
    fr: 'Position indisponible. Choisis ta ville dans la liste.',
    en: 'Location unavailable. Pick your city from the list.',
    es: 'Ubicación no disponible. Elige tu ciudad en la lista.',
    de: 'Standort nicht verfügbar. Wähl deine Stadt aus der Liste.',
    pt: 'Localização indisponível. Escolha sua cidade na lista.',
  },

  // ─── CTA du parcours ───────────────────────────────────────────────────────
  /** Cartes 1 et 2 : le parcours avance, aucune décision n'est demandée. */
  ctaContinue: {
    fr: 'Continuer',
    en: 'Continue',
    es: 'Continuar',
    de: 'Weiter',
    pt: 'Continuar',
  },
  /** Fin de la carte 2 : le CTA NOMME l'étape suivante. */
  ctaChooseCity: {
    fr: 'Choisir ma ville',
    en: 'Choose my city',
    es: 'Elegir mi ciudad',
    de: 'Meine Stadt wählen',
    pt: 'Escolher minha cidade',
  },
  /** Une ville est sélectionnée : le CTA la NOMME (jamais « Continuer » nu). */
  cityContinueWith: {
    fr: 'Continuer avec {city}',
    en: 'Continue with {city}',
    es: 'Continuar con {city}',
    de: 'Weiter mit {city}',
    pt: 'Continuar com {city}',
  },

  // ─── PROFIL MINIMAL (pseudo + ville) ───────────────────────────────────────
  // Ce qui n'est PAS demandé, et ne doit jamais revenir ici : photo obligatoire,
  // niveau sportif, poids, taille, objectif kilométrique, fréquence, contacts,
  // notifications, HealthKit, Strava, crew.
  profileKicker: {
    fr: 'TON NOM DANS LE JEU',
    en: 'YOUR NAME IN THE GAME',
    es: 'TU NOMBRE EN EL JUEGO',
    de: 'DEIN NAME IM SPIEL',
    pt: 'SEU NOME NO JOGO',
  },
  profileTitle: {
    fr: 'Choisis ton nom.',
    en: 'Pick your name.',
    es: 'Elige tu nombre.',
    de: 'Wähl deinen Namen.',
    pt: 'Escolha seu nome.',
  },
  // ⚠️ `profileTagline` RETIRÉE le 23/07/2026 avec la fusion nom+entrée : l'écran
  // d'arrivée mène par `profileTitle` puis pose directement le champ pseudo, sans
  // sous-titre intermédiaire. Une Entry que plus aucun écran ne lit est une
  // promesse sans surface.
  profilePseudoLabel: {
    fr: 'Pseudo',
    en: 'Username',
    es: 'Usuario',
    de: 'Nutzername',
    pt: 'Nome de usuário',
  },
  profileCityLabel: {
    fr: 'Ville',
    en: 'City',
    es: 'Ciudad',
    de: 'Stadt',
    pt: 'Cidade',
  },
  /**
   * Confidentialité : cet écran NE PROMET RIEN qu'il ne tienne. Il dit ce qui
   * est vrai ici (rien n'est publié depuis cette étape) et où le réglage vit —
   * pas une garantie de partage qu'aucune ligne de code ne soutient encore.
   */
  profilePrivacyNote: {
    fr: 'Rien n’est publié ici. Tu règles ce que tu partages dans Confidentialité.',
    en: 'Nothing is published here. You set what you share in Privacy.',
    es: 'Aquí no se publica nada. Ajustas lo que compartes en Privacidad.',
    de: 'Hier wird nichts veröffentlicht. Was du teilst, stellst du unter Privatsphäre ein.',
    pt: 'Nada é publicado aqui. Você define o que compartilha em Privacidade.',
  },
  // ⚠️ `profileAvatarOptional` (« Photo (facultatif) ») RETIRÉE le 22/07/2026 :
  // aucun choix d'avatar n'est proposé dans le flow, parce qu'ouvrir la
  // photothèque est une PERMISSION et que l'onboarding n'en demande aucune.
  // « Facultatif » ne veut pas dire « proposé quand même » : l'avatar vit dans
  // l'écran Profil, après. Une Entry sans écran est une promesse sans surface.
  //
  // ⚠️ `profileCta` (« Entrer sur la carte ») RETIRÉE le 23/07/2026 : la fusion
  // nom+entrée fait porter la décision de sortie par le PIED de l'écran d'arrivée
  // (auth ou « plus tard »), plus par un CTA de profil. Même raison — pas d'Entry
  // sans surface.

  // ─── 3 ENTRÉE (pied de l'écran d'arrivée fusionné) ───────────────────────────
  // ⚠️ `accountKicker` / `accountTitle` / `accountTagline` RETIRÉS le 23/07/2026 :
  // depuis la fusion nom+entrée, l'écran MÈNE par l'identité (`profileKicker` +
  // `profileTitle` : « ton nom », vrai dans TOUS les cas), et l'entrée n'est plus
  // qu'un pied. Un titre « Crée ton compte » sur un écran qui, sans backend, ne
  // propose que « plus tard » aurait menti ; on ne le rend donc plus. Reste
  // `accountTaglineRequired`, en NOTE de contexte quand un backend exige une
  // session. Pas d'Entry sans surface.
  /**
   * Variante quand un backend est configuré : la carte EXIGE une session. Le
   * dire ici, c'est éviter que le joueur tape « Plus tard » et se cogne à une
   * porte fermée deux écrans plus loin (le cul-de-sac corrigé le 21/07/2026).
   */
  accountTaglineRequired: {
    fr: 'Un compte, un tap. Il est nécessaire pour entrer sur la carte et garder tes zones.',
    en: 'One account, one tap. It’s required to enter the map and keep your zones.',
    es: 'Una cuenta, un toque. Es necesaria para entrar al mapa y conservar tus zonas.',
    de: 'Ein Konto, ein Tap. Nötig, um auf die Karte zu kommen und deine Zonen zu behalten.',
    pt: 'Uma conta, um toque. Ela é necessária para entrar no mapa e manter suas zonas.',
  },
  accountApple: {
    fr: 'Se connecter avec Apple',
    en: 'Sign in with Apple',
    es: 'Iniciar sesión con Apple',
    de: 'Mit Apple anmelden',
    pt: 'Entrar com Apple',
  },
  accountGoogle: {
    fr: 'Se connecter avec Google',
    en: 'Sign in with Google',
    es: 'Iniciar sesión con Google',
    de: 'Mit Google anmelden',
    pt: 'Entrar com Google',
  },
  /**
   * Voie e-mail (code OTP). « Continuer avec un e-mail » ne disait pas si ça
   * CRÉAIT ou CONNECTAIT — le libellé reste neutre, et `accountEmailHint`
   * juste en dessous dit exactement ce que fait le code. On préfère l'écrire
   * que de laisser le joueur le deviner.
   */
  accountEmail: {
    fr: 'Continuer par e-mail',
    en: 'Continue with email',
    es: 'Continuar por correo',
    de: 'Mit E-Mail fortfahren',
    pt: 'Continuar por e-mail',
  },
  accountEmailHint: {
    fr: 'Un code à 6 chiffres : il te connecte si ton compte existe, il le crée sinon.',
    en: 'A 6-digit code: it signs you in if your account exists, and creates it if not.',
    es: 'Un código de 6 dígitos: te conecta si tu cuenta existe, y la crea si no.',
    de: 'Ein 6-stelliger Code: Er meldet dich an, wenn dein Konto existiert — sonst legt er es an.',
    pt: 'Um código de 6 dígitos: ele conecta você se a conta existir, e a cria se não.',
  },
  /** Échec honnête : on reste sur l'écran (jamais un faux succès). */
  accountError: {
    fr: 'Connexion impossible. Réessaie, ou passe par l’e-mail.',
    en: 'Sign-in failed. Try again, or use email instead.',
    es: 'No se pudo iniciar sesión. Reintenta o usa el correo.',
    de: 'Anmeldung fehlgeschlagen. Versuch es nochmal oder nimm die E-Mail.',
    pt: 'Não foi possível entrar. Tente de novo ou use o e-mail.',
  },

  // ─── NOTIFICATIONS (copy conservée — opt-in HORS onboarding) ───────────────
  notifKicker: {
    fr: 'RESTE DANS LA PARTIE',
    en: 'STAY IN THE GAME',
    es: 'SIGUE EN LA PARTIDA',
    de: 'BLEIB IM SPIEL',
    pt: 'FIQUE NO JOGO',
  },
  notifTitle: {
    fr: 'Sois prévenu quand on t’attaque.',
    en: 'Know when you’re under attack.',
    es: 'Entérate cuando te ataquen.',
    de: 'Erfahr es, wenn du angegriffen wirst.',
    pt: 'Saiba quando você for atacado.',
  },
  notifTagline: {
    fr: 'Une alerte quand ton territoire est menacé, quand ton crew a besoin de toi. Rien d’autre.',
    en: 'One alert when your territory is threatened, when your crew needs you. Nothing else.',
    es: 'Una alerta cuando tu territorio esté amenazado, cuando tu crew te necesite. Nada más.',
    de: 'Ein Alarm, wenn dein Territorium bedroht ist, wenn deine Crew dich braucht. Sonst nichts.',
    pt: 'Um alerta quando seu território estiver ameaçado, quando seu crew precisar de você. Nada mais.',
  },
  notifCta: {
    fr: 'Activer les alertes',
    en: 'Turn on alerts',
    es: 'Activar alertas',
    de: 'Alerts aktivieren',
    pt: 'Ativar alertas',
  },
});
