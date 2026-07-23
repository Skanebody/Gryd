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
  firstRunGpsNote: {
    fr: 'Tes zones arrivent à ta première course — GPS allumé au départ.',
    en: 'Your zones come with your first run — GPS on at the start.',
    es: 'Tus zonas llegan en tu primera carrera: GPS activo al salir.',
    de: 'Deine Zonen kommen mit dem ersten Lauf — GPS an beim Start.',
    pt: 'Suas zonas chegam na primeira corrida — GPS ligado na largada.',
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
  /** Label bref à la fin de la carte 1 — nomme le geste, ne célèbre RIEN. */
  captureDemoLabel: {
    fr: 'Zone prise',
    en: 'Zone taken',
    es: 'Zona tomada',
    de: 'Zone geholt',
    pt: 'Zona tomada',
  },
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
  mechanicTitle: {
    fr: 'Ferme une boucle.\nPrends la zone.',
    en: 'Close a loop.\nTake the zone.',
    es: 'Cierra un bucle.\nToma la zona.',
    de: 'Schließ die Runde.\nNimm die Zone.',
    pt: 'Feche um circuito.\nTome a zona.',
  },
  mechanicTagline: {
    fr: 'Chaque run change la carte.',
    en: 'Every run changes the map.',
    es: 'Cada carrera cambia el mapa.',
    de: 'Jeder Lauf verändert die Karte.',
    pt: 'Cada corrida muda o mapa.',
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
  rivalryTagline: {
    fr: 'Cours seul ou défends-la avec ton crew.',
    en: 'Run solo, or defend it with your crew.',
    es: 'Corre solo o defiéndela con tu crew.',
    de: 'Lauf allein — oder verteidige sie mit deiner Crew.',
    pt: 'Corra sozinho ou defenda-a com seu crew.',
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
  cityTagline: {
    fr: 'Choisis ta ville maintenant. Tu courras quand tu seras prêt.',
    en: 'Pick your city now. You’ll run when you’re ready.',
    es: 'Elige tu ciudad ahora. Correrás cuando estés listo.',
    de: 'Wähl jetzt deine Stadt. Laufen kannst du, wenn du so weit bist.',
    pt: 'Escolha sua cidade agora. Você corre quando estiver pronto.',
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
  /** ⚠️ Tenue en 2 lignes dans les 5 langues (test `copyFit`) — la version
   *  longue faisait 86 caractères en français, soit 3 lignes et un écran serré. */
  profileTagline: {
    fr: 'Il s’affiche sur les zones que tu prends. Modifiable plus tard.',
    en: 'It shows on the zones you take. You can change it later.',
    es: 'Aparece en las zonas que tomes. Puedes cambiarlo después.',
    de: 'Er steht auf den Zonen, die du holst. Später änderbar.',
    pt: 'Aparece nas zonas que você tomar. Dá para mudar depois.',
  },
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
  /** Dernier CTA du flow : il NOMME où l'on arrive. */
  profileCta: {
    fr: 'Entrer sur la carte',
    en: 'Enter the map',
    es: 'Entrar al mapa',
    de: 'Auf die Karte',
    pt: 'Entrar no mapa',
  },

  // ─── 3 COMPTE ──────────────────────────────────────────────────────────────
  accountKicker: {
    fr: 'AVANT DE COURIR',
    en: 'BEFORE YOU RUN',
    es: 'ANTES DE CORRER',
    de: 'BEVOR DU LOSLÄUFST',
    pt: 'ANTES DE CORRER',
  },
  /**
   * Le titre dit LES DEUX PORTES (retour fondateur 21/07/2026). « Crée ton
   * compte. » seul faisait de cet écran une impasse apparente pour qui en a
   * déjà un : il rebroussait chemin au lieu de taper sur une des voies, qui
   * toutes savent pourtant le connecter.
   */
  accountTitle: {
    fr: 'Crée ton compte, ou connecte-toi.',
    en: 'Create your account, or sign in.',
    es: 'Crea tu cuenta, o inicia sesión.',
    de: 'Erstell dein Konto — oder melde dich an.',
    pt: 'Crie sua conta, ou entre.',
  },
  /** Rien n'a encore été conquis : la copy parle au FUTUR, jamais au passé. */
  accountTagline: {
    fr: 'Un compte, un tap. Les zones que tu prendras te suivront sur tous tes appareils.',
    en: 'One account, one tap. The zones you take will follow you on every device.',
    es: 'Una cuenta, un toque. Las zonas que tomes te seguirán en todos tus dispositivos.',
    de: 'Ein Konto, ein Tap. Die Zonen, die du holst, folgen dir auf allen Geräten.',
    pt: 'Uma conta, um toque. As zonas que você tomar seguem você em todos os aparelhos.',
  },
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
