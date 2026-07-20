/**
 * GRYD — i18n : catalogue du domaine ONBOARDING (copy AMENDEMENT-30).
 *
 * Source de vérité des 5 langues pour le stepper d'onboarding. La STRUCTURE
 * par étape (HOOK, AGE, …) reste dans features/onboarding/content.ts — qui
 * référence ces Entries ; les écrans résolvent via t() (i18n/store).
 *
 * Règles : tutoiement fr / « du » de / « tú » es / « você » pt informel ;
 * invariants jamais traduits (GRYD, Crew, km, noms de produits Apple Health /
 * Strava / Garmin, « Chartreuse » = nom de la couleur signature) ; CTA courts
 * dans TOUTES les langues (§A : jamais tronqué à 375 px) ; kickers en
 * MAJUSCULES ; mêmes {placeholders} partout.
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
  /** Sortie douce partagée (« Plus tard ») — permission, compte, crew, notifs. */
  later: {
    fr: 'Plus tard',
    en: 'Later',
    es: 'Más tarde',
    de: 'Später',
    pt: 'Mais tarde',
  },

  // ─── 1 HOOK ────────────────────────────────────────────────────────────────
  hookTitle: {
    fr: 'Prends ta ville.',
    en: 'Take your city.',
    es: 'Toma tu ciudad.',
    de: 'Hol dir deine Stadt.',
    pt: 'Tome sua cidade.',
  },
  hookTagline: {
    fr: 'Cours pour ton crew. Conquiers ta ville.',
    en: 'Run for your crew. Conquer your city.',
    es: 'Corre por tu crew. Conquista tu ciudad.',
    de: 'Lauf für deine Crew. Erobere deine Stadt.',
    pt: 'Corra pelo seu crew. Conquiste sua cidade.',
  },
  hookCta: {
    fr: 'Découvrir ma ville',
    en: 'Explore my city',
    es: 'Descubrir mi ciudad',
    de: 'Meine Stadt entdecken',
    pt: 'Descobrir minha cidade',
  },

  // ─── 1b AGE-GATE 16+ ───────────────────────────────────────────────────────
  ageKicker: {
    fr: 'AVANT DE COMMENCER',
    en: 'BEFORE YOU START',
    es: 'ANTES DE EMPEZAR',
    de: 'BEVOR DU LOSLEGST',
    pt: 'ANTES DE COMEÇAR',
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

  // ─── 2 LE TERRAIN DE JEU ───────────────────────────────────────────────────
  cityKicker: {
    fr: 'LA VILLE · MAINTENANT',
    en: 'THE CITY · RIGHT NOW',
    es: 'LA CIUDAD · AHORA',
    de: 'DIE STADT · JETZT',
    pt: 'A CIDADE · AGORA',
  },
  cityTitle: {
    fr: 'Voilà le terrain de jeu. À prendre.',
    en: 'This is the playing field. Up for grabs.',
    es: 'Este es el terreno de juego. Por conquistar.',
    de: 'Das ist das Spielfeld. Zu erobern.',
    pt: 'Este é o campo de jogo. Para tomar.',
  },
  cityTagline: {
    fr: 'Chaque zone se gagne en courant. Chartreuse = à toi, violet = contestée, orange = à un crew rival.',
    en: 'Every zone is won by running. Chartreuse = yours, purple = contested, orange = a rival crew’s.',
    es: 'Cada zona se gana corriendo. Chartreuse = tuya, violeta = disputada, naranja = de un crew rival.',
    de: 'Jede Zone gewinnst du beim Laufen. Chartreuse = deine, Violett = umkämpft, Orange = Rivalen-Crew.',
    pt: 'Cada zona se ganha correndo. Chartreuse = sua, violeta = disputada, laranja = de um crew rival.',
  },
  cityCta: {
    fr: 'Prendre ce terrain',
    en: 'Take this ground',
    es: 'Tomar este terreno',
    de: 'Terrain erobern',
    pt: 'Tomar este terreno',
  },

  // ─── 3b PERMISSION GPS (branche « run » uniquement) ────────────────────────
  permissionKicker: {
    fr: 'UNE SEULE CHOSE',
    en: 'ONE THING ONLY',
    es: 'UNA SOLA COSA',
    de: 'NUR EINE SACHE',
    pt: 'SÓ UMA COISA',
  },
  permissionTitle: {
    fr: 'Le GPS dessine ton territoire.',
    en: 'GPS draws your territory.',
    es: 'El GPS dibuja tu territorio.',
    de: 'GPS zeichnet dein Territorium.',
    pt: 'O GPS desenha seu território.',
  },
  permissionTagline: {
    fr: 'GRYD suit ta trace pendant la course pour transformer tes rues en zones. Rien n’est partagé en direct.',
    en: 'GRYD tracks your route while you run to turn your streets into zones. Nothing is shared live.',
    es: 'GRYD sigue tu recorrido mientras corres para convertir tus calles en zonas. Nada se comparte en directo.',
    de: 'GRYD folgt deiner Spur beim Laufen und macht aus deinen Straßen Zonen. Nichts wird live geteilt.',
    pt: 'O GRYD segue seu trajeto durante a corrida para transformar suas ruas em zonas. Nada é compartilhado ao vivo.',
  },
  permissionCta: {
    fr: 'Utiliser le GPS',
    en: 'Use GPS',
    es: 'Usar el GPS',
    de: 'GPS nutzen',
    pt: 'Usar o GPS',
  },

  // ─── 3 CHOIX DU CHEMIN ─────────────────────────────────────────────────────
  chooseKicker: {
    fr: 'DEUX FAÇONS DE COMMENCER',
    en: 'TWO WAYS TO START',
    es: 'DOS FORMAS DE EMPEZAR',
    de: 'ZWEI WEGE ZUM START',
    pt: 'DUAS FORMAS DE COMEÇAR',
  },
  chooseTitle: {
    fr: 'On capture ta première zone ?',
    en: 'Ready to capture your first zone?',
    es: '¿Capturamos tu primera zona?',
    de: 'Holen wir deine erste Zone?',
    pt: 'Vamos capturar sua primeira zona?',
  },
  chooseTagline: {
    fr: 'Choisis ton point de départ — les deux mènent à ta première capture.',
    en: 'Pick your starting point — both lead to your first capture.',
    es: 'Elige tu punto de partida: los dos caminos llevan a tu primera captura.',
    de: 'Wähl deinen Startpunkt — beide führen zu deiner ersten Eroberung.',
    pt: 'Escolha seu ponto de partida — os dois levam à sua primeira captura.',
  },
  chooseSyncTitle: {
    fr: 'J’ai déjà des runs',
    en: 'I already have runs',
    es: 'Ya tengo carreras',
    de: 'Ich habe schon Läufe',
    pt: 'Já tenho corridas',
  },
  chooseSyncSubtitle: {
    fr: 'Apple Health, Strava — on transforme ta dernière course.',
    en: 'Apple Health, Strava — we transform your latest run.',
    es: 'Apple Health, Strava: transformamos tu última carrera.',
    de: 'Apple Health, Strava — wir verwandeln deinen letzten Lauf.',
    pt: 'Apple Health, Strava — transformamos sua última corrida.',
  },
  chooseRunTitle: {
    fr: 'Je vais courir',
    en: 'I’m going for a run',
    es: 'Voy a correr',
    de: 'Ich gehe laufen',
    pt: 'Vou correr',
  },
  chooseRunSubtitle: {
    fr: 'Un run tout simple, zéro réglage. Ferme une boucle.',
    en: 'One simple run, zero setup. Close a loop.',
    es: 'Una carrera sencilla, cero ajustes. Cierra un bucle.',
    de: 'Ein einfacher Lauf, null Einstellungen. Schließ eine Runde.',
    pt: 'Uma corrida simples, zero ajustes. Feche um circuito.',
  },

  // ─── 3a SYNC (démo) ────────────────────────────────────────────────────────
  syncKicker: {
    fr: 'CAPTURE DEPUIS TES RUNS',
    en: 'CAPTURE FROM YOUR RUNS',
    es: 'CAPTURA DESDE TUS CARRERAS',
    de: 'ZONEN AUS DEINEN LÄUFEN',
    pt: 'CAPTURA DAS SUAS CORRIDAS',
  },
  syncTitle: {
    fr: 'Ta course devient une conquête.',
    en: 'Your run becomes a conquest.',
    es: 'Tu carrera se vuelve conquista.',
    de: 'Dein Lauf wird zur Eroberung.',
    pt: 'Sua corrida vira conquista.',
  },
  syncTagline: {
    fr: 'Cours comme tu veux — Apple Watch, Garmin, Strava. GRYD fait le reste. Choisis une source :',
    en: 'Run however you like — Apple Watch, Garmin, Strava. GRYD does the rest. Pick a source:',
    es: 'Corre como quieras: Apple Watch, Garmin, Strava. GRYD hace el resto. Elige una fuente:',
    de: 'Lauf, wie du willst — Apple Watch, Garmin, Strava. GRYD macht den Rest. Wähl eine Quelle:',
    pt: 'Corra como quiser — Apple Watch, Garmin, Strava. O GRYD faz o resto. Escolha uma fonte:',
  },
  /** Méta du run détecté (« 6,4 km · une boucle »). */
  syncLoopMeta: {
    fr: 'une boucle',
    en: 'one loop',
    es: 'un bucle',
    de: 'eine Runde',
    pt: 'um circuito',
  },
  /** Hint pendant le déroulé (l'écran appose « … »). */
  syncRunning: {
    fr: 'Import en cours',
    en: 'Importing',
    es: 'Importando',
    de: 'Import läuft',
    pt: 'Importando',
  },
  /** Tag d'honnêteté sur le run détecté (chip courte — jamais tronquée). */
  syncDemoTag: {
    fr: 'Exemple',
    en: 'Sample',
    es: 'Ejemplo',
    de: 'Beispiel',
    pt: 'Exemplo',
  },

  // ─── 3b PREMIER RUN ────────────────────────────────────────────────────────
  runKicker: {
    fr: 'TON PREMIER RUN',
    en: 'YOUR FIRST RUN',
    es: 'TU PRIMERA CARRERA',
    de: 'DEIN ERSTER LAUF',
    pt: 'SUA PRIMEIRA CORRIDA',
  },
  runTitle: {
    fr: 'Un objectif. Ferme une boucle.',
    en: 'One goal. Close a loop.',
    es: 'Un objetivo. Cierra un bucle.',
    de: 'Ein Ziel. Schließ eine Runde.',
    pt: 'Um objetivo. Feche um circuito.',
  },
  runTagline: {
    fr: 'Cours tout droit : tu prends les rues. Ferme la boucle : toute la zone est à toi.',
    en: 'Run straight: you take the streets. Close the loop: the whole zone is yours.',
    es: 'Corre en línea recta: tomas las calles. Cierra el bucle: toda la zona es tuya.',
    de: 'Lauf geradeaus: Du nimmst die Straßen. Schließ die Runde: Die ganze Zone gehört dir.',
    pt: 'Corra em linha reta: você toma as ruas. Feche o circuito: a zona inteira é sua.',
  },
  runObjective: {
    fr: 'Ferme une boucle. La zone est à toi.',
    en: 'Close a loop. The zone is yours.',
    es: 'Cierra un bucle. La zona es tuya.',
    de: 'Schließ eine Runde. Die Zone gehört dir.',
    pt: 'Feche um circuito. A zona é sua.',
  },
  runCta: {
    fr: 'Lancer le run',
    en: 'Start the run',
    es: 'Empezar la carrera',
    de: 'Lauf starten',
    pt: 'Iniciar corrida',
  },
  /** Hint pendant le run démo (l'écran appose « … »). */
  runRunning: {
    fr: 'Run en cours',
    en: 'Run in progress',
    es: 'Carrera en curso',
    de: 'Lauf aktiv',
    pt: 'Corrida em andamento',
  },

  // ─── 4 PREMIÈRE CAPTURE (moment signature) ─────────────────────────────────
  captureKicker: {
    fr: 'PREMIÈRE CAPTURE',
    en: 'FIRST CAPTURE',
    es: 'PRIMERA CAPTURA',
    de: 'ERSTE EROBERUNG',
    pt: 'PRIMEIRA CAPTURA',
  },
  captureTitle: {
    fr: 'Première zone prise.',
    en: 'First zone taken.',
    es: 'Primera zona tomada.',
    de: 'Erste Zone erobert.',
    pt: 'Primeira zona tomada.',
  },
  captureZonesLabel: {
    fr: 'zones capturées',
    en: 'zones captured',
    es: 'zonas capturadas',
    de: 'Zonen erobert',
    pt: 'zonas capturadas',
  },
  /**
   * Sous-ligne du reveal : « dont {n} en boucle · autour de toi ». Une seule
   * Entry (l'ordre des mots varie par langue) ; localisation HONNÊTE — aucun
   * GPS encore, jamais un nom de lieu.
   */
  captureSub: {
    fr: 'dont {n} en boucle · autour de toi',
    en: 'incl. {n} in the loop · around you',
    es: 'con {n} en el bucle · a tu alrededor',
    de: 'davon {n} in der Runde · um dich herum',
    pt: 'sendo {n} no circuito · ao seu redor',
  },
  /** Copy conservée (le partage réel vit dans /partage, après le compte). */
  captureShare: {
    fr: 'Partager',
    en: 'Share',
    es: 'Compartir',
    de: 'Teilen',
    pt: 'Compartilhar',
  },
  captureCta: {
    fr: 'Défendre ma zone',
    en: 'Defend my zone',
    es: 'Defender mi zona',
    de: 'Zone verteidigen',
    pt: 'Defender minha zona',
  },

  // ─── 5 COMPTE APRÈS LA VALEUR ──────────────────────────────────────────────
  accountKicker: {
    fr: 'GARDE TES ZONES',
    en: 'KEEP YOUR ZONES',
    es: 'CONSERVA TUS ZONAS',
    de: 'SICHERE DEINE ZONEN',
    pt: 'GUARDE SUAS ZONAS',
  },
  accountTitle: {
    fr: 'Sauvegarde ta conquête.',
    en: 'Save your conquest.',
    es: 'Guarda tu conquista.',
    de: 'Speichere deine Eroberung.',
    pt: 'Salve sua conquista.',
  },
  accountTagline: {
    fr: 'Un compte, un tap. Tes zones te suivent sur tous tes appareils.',
    en: 'One account, one tap. Your zones follow you on every device.',
    es: 'Una cuenta, un toque. Tus zonas te siguen en todos tus dispositivos.',
    de: 'Ein Konto, ein Tap. Deine Zonen folgen dir auf allen Geräten.',
    pt: 'Uma conta, um toque. Suas zonas seguem você em todos os aparelhos.',
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
  /** Échec d'auth honnête : on reste sur l'écran, « Plus tard » laisse passer. */
  accountError: {
    fr: 'Connexion impossible. Réessaie, ou passe cette étape.',
    en: 'Sign-in failed. Try again, or skip this step.',
    es: 'No se pudo iniciar sesión. Reintenta o salta este paso.',
    de: 'Anmeldung fehlgeschlagen. Versuch es nochmal oder überspring diesen Schritt.',
    pt: 'Não foi possível entrar. Tente de novo ou pule esta etapa.',
  },

  // ─── 6 CREW ────────────────────────────────────────────────────────────────
  crewKicker: {
    fr: 'TU N’ES PAS SEUL',
    en: 'YOU’RE NOT ALONE',
    es: 'NO ESTÁS SOLO',
    de: 'DU BIST NICHT ALLEIN',
    pt: 'VOCÊ NÃO ESTÁ SOZINHO',
  },
  crewTitle: {
    fr: 'Rejoins un crew. Prends la ville.',
    en: 'Join a crew. Take the city.',
    es: 'Únete a un crew. Toma la ciudad.',
    de: 'Tritt einer Crew bei. Hol dir die Stadt.',
    pt: 'Entre em um crew. Tome a cidade.',
  },
  crewTagline: {
    fr: 'Seul tu prends des rues. En crew, tu tiens le quartier. Rien n’est bloqué.',
    en: 'Alone, you take streets. In a crew, you hold the neighborhood. Nothing is locked.',
    es: 'Solo, tomas calles. En crew, dominas el barrio. Nada está bloqueado.',
    de: 'Allein nimmst du Straßen. In der Crew hältst du das Viertel. Nichts ist gesperrt.',
    pt: 'Sozinho você toma ruas. Em crew, você segura o bairro. Nada fica bloqueado.',
  },
  crewJoin: {
    fr: 'Rejoindre un crew proche',
    en: 'Join a nearby crew',
    es: 'Unirme a un crew cercano',
    de: 'Crew in der Nähe beitreten',
    pt: 'Entrar em um crew próximo',
  },
  crewCreate: {
    fr: 'Créer mon crew',
    en: 'Create my crew',
    es: 'Crear mi crew',
    de: 'Meine Crew gründen',
    pt: 'Criar meu crew',
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
