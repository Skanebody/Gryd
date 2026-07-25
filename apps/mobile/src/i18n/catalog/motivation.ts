/**
 * GRYD — i18n : catalogue du domaine « motivation » (Aujourd'hui, Challenges,
 * Motivation Settings, labels §17/§21). Parité 5 langues imposée par le type.
 * Ton : tutoiement fr · « du » de · « tú » es · « você » pt informel · en direct.
 * INVARIANTS jamais traduits : GRYD, GO, Crew (concept), War Room, H3, km, min,
 * XP, noms de styles (« Focus Solo », « Crew War », « Social Run »).
 * Copie ANTI-SHAME partout (§11) : jamais « lent / dernier / tu fais perdre ».
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Aujourd'hui — porte d'entrée quotidienne ─────────────────────────────
  todayTitle: {
    fr: "Aujourd'hui",
    en: 'Today',
    es: 'Hoy',
    de: 'Heute',
    pt: 'Hoje',
  },
  todayKicker: {
    fr: 'TA JOURNÉE GRYD',
    en: 'YOUR GRYD DAY',
    es: 'TU DÍA GRYD',
    de: 'DEIN GRYD-TAG',
    pt: 'SEU DIA GRYD',
  },
  todayGreeting: {
    fr: 'BONJOUR {name}',
    en: 'HELLO {name}',
    es: 'HOLA {name}',
    de: 'HALLO {name}',
    pt: 'OLÁ {name}',
  },

  // ─── Aujourd'hui — ÉTATS VIDES HONNÊTES (« l'app ne ment jamais ») ─────────
  // Hors vitrine, l'écran n'a le droit d'afficher NI un prénom inventé, NI un
  // quartier inventé, NI une route de démo. Les trois situations ont chacune
  // leur copie : pas de compte · compte mais rien à montrer · serveur injoignable.
  // Aucune ne laisse un trou : la décision du jour (partir courir) reste offerte.
  todayGreetingAnon: {
    fr: 'BONJOUR',
    en: 'HELLO',
    es: 'HOLA',
    de: 'HALLO',
    pt: 'OLÁ',
  },
  todaySignedOutSituation: {
    fr: 'Connecte-toi pour retrouver ton territoire et ta série.',
    en: 'Sign in to get your territory and your streak back.',
    es: 'Inicia sesión para recuperar tu territorio y tu racha.',
    de: 'Melde dich an, um dein Revier und deine Serie wiederzufinden.',
    pt: 'Entre para recuperar seu território e sua sequência.',
  },
  todayOfflineSituation: {
    fr: 'GRYD n’arrive pas à joindre son serveur. Tes courses ne seront pas enregistrées tant que la connexion n’est pas rétablie.',
    en: 'GRYD can’t reach its server. Your runs won’t be saved until the connection is back.',
    es: 'GRYD no consigue contactar con su servidor. Tus carreras no se guardarán hasta que vuelva la conexión.',
    de: 'GRYD erreicht seinen Server nicht. Deine Läufe werden erst gespeichert, wenn die Verbindung wieder steht.',
    pt: 'O GRYD não consegue alcançar seu servidor. Suas corridas não serão salvas enquanto a conexão não voltar.',
  },
  todaySignIn: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  // Les 2 verbes joueur (AMENDEMENT-12 §A) — CTA + kicker : COURTS (§A).
  // de : « HALTEN » plutôt que « VERTEIDIGEN » (§A, reformulation concise).
  objectiveConquer: {
    fr: 'CONQUÉRIR',
    en: 'CONQUER',
    es: 'CONQUISTAR',
    de: 'EROBERN',
    pt: 'CONQUISTAR',
  },
  objectiveDefend: {
    fr: 'DÉFENDRE',
    en: 'DEFEND',
    es: 'DEFENDER',
    de: 'HALTEN',
    pt: 'DEFENDER',
  },
  todayCtaA11y: {
    fr: '{objective} — départ immédiat sur le plan du jour',
    en: '{objective} — start now on today’s plan',
    es: '{objective} — salida inmediata con el plan del día',
    de: '{objective} — sofort mit dem Tagesplan starten',
    pt: '{objective} — partida imediata no plano do dia',
  },
  todayNextBadge: {
    fr: 'PROCHAIN BADGE',
    en: 'NEXT BADGE',
    es: 'PRÓXIMO BADGE',
    de: 'NÄCHSTES BADGE',
    pt: 'PRÓXIMO BADGE',
  },
  todayMyChallenges: {
    fr: 'Mes challenges',
    en: 'My challenges',
    es: 'Mis desafíos',
    de: 'Meine Challenges',
    pt: 'Meus desafios',
  },
  todayMyChallengesA11y: {
    fr: 'Voir mes challenges',
    en: 'View my challenges',
    es: 'Ver mis desafíos',
    de: 'Meine Challenges öffnen',
    pt: 'Ver meus desafios',
  },
  todayWarRoomA11y: {
    fr: 'Ouvrir la War Room',
    en: 'Open the War Room',
    es: 'Abrir la War Room',
    de: 'War Room öffnen',
    pt: 'Abrir a War Room',
  },

  // ─── Challenges — liste ───────────────────────────────────────────────────
  challengesTitle: {
    fr: 'Challenges',
    en: 'Challenges',
    es: 'Desafíos',
    de: 'Challenges',
    pt: 'Desafios',
  },
  // 25/07/2026 — CETTE PHRASE DISAIT « Des objectifs CHOISIS ». Le joueur ne
  // choisit rien : la liste est celle des défis ACTIFS du serveur, sans opt-in
  // ni sélection, et sa progression est écrite par `ingest_run`. Une copie qui
  // promet un contrôle inexistant est un mensonge, même bienveillant.
  challengesSubtitle: {
    fr: 'Les défis en cours dans GRYD. Ta progression vient de tes courses, à ton rythme.',
    en: 'The challenges running in GRYD right now. Your progress comes from your runs, at your own pace.',
    es: 'Los desafíos en curso en GRYD. Tu progreso viene de tus carreras, a tu ritmo.',
    de: 'Die Challenges, die gerade in GRYD laufen. Dein Fortschritt kommt aus deinen Läufen, in deinem Tempo.',
    pt: 'Os desafios em andamento no GRYD. Seu progresso vem das suas corridas, no seu ritmo.',
  },
  challengesKicker: {
    fr: 'CE QUI COURT CETTE SEMAINE',
    en: 'RUNNING THIS WEEK',
    es: 'LO QUE ESTÁ EN CURSO',
    de: 'DIESE WOCHE AKTIV',
    pt: 'O QUE ESTÁ EM ANDAMENTO',
  },
  // ÉTAT ④ « lecture en cours » — une LIGNE grise non tapable remplace le
  // spinner centré : un chargement n'affirme rien, et il ne prend pas l'écran.
  challengesReading: {
    fr: 'Lecture de tes défis…',
    en: 'Reading your challenges…',
    es: 'Leyendo tus desafíos…',
    de: 'Deine Challenges werden gelesen…',
    pt: 'Lendo seus desafios…',
  },

  // ─── Choix avancés de course — panneau « Défendre » ───────────────────────
  // La liste des zones à défendre n'est PAS câblée au réel : hors vitrine on ne
  // peut donc nommer aucun quartier. On le dit, et on propose l'action qui, elle,
  // marche vraiment : partir avec l'intention Défendre (le tracé réel décide).
  defenseNoZonesKicker: {
    fr: 'PAS ENCORE DE ZONE À DÉFENDRE',
    en: 'NO ZONE TO DEFEND YET',
    es: 'AÚN SIN ZONA QUE DEFENDER',
    de: 'NOCH KEINE ZONE ZU HALTEN',
    pt: 'AINDA SEM ZONA PARA DEFENDER',
  },
  defenseNoZonesBody: {
    fr: 'GRYD ne connaît pas encore les zones que tu tiens. Cours : ton tracé réel décide de ce que tu défends.',
    en: 'GRYD doesn’t know which zones you hold yet. Just run: your actual track decides what you defend.',
    es: 'GRYD todavía no sabe qué zonas mantienes. Sal a correr: tu trazado real decide lo que defiendes.',
    de: 'GRYD weiß noch nicht, welche Zonen du hältst. Lauf los: Deine echte Strecke entscheidet, was du verteidigst.',
    pt: 'O GRYD ainda não sabe quais zonas você mantém. Corra: seu traçado real decide o que você defende.',
  },
  defenseRunFreely: {
    fr: 'Courir librement',
    en: 'Run freely',
    es: 'Correr libremente',
    de: 'Frei laufen',
    pt: 'Correr livremente',
  },

  // ─── Challenges — ÉTATS VIDES HONNÊTES ────────────────────────────────────
  // Hors vitrine, la liste ne montre QUE le catalogue légitime (objectifs issus
  // des seeds), progression à 0. Aucun crew rival ni sponsor inventé. Quand il
  // ne reste rien à montrer, on dit POURQUOI — jamais une liste vide muette.
  challengesEmptySignedOutTitle: {
    fr: 'Tes défis arrivent avec ton compte.',
    en: 'Your challenges come with your account.',
    es: 'Tus desafíos llegan con tu cuenta.',
    de: 'Deine Challenges kommen mit deinem Konto.',
    pt: 'Seus desafios vêm com sua conta.',
  },
  challengesEmptySignedOutBody: {
    fr: 'Connecte-toi pour suivre ta progression sur les défis GRYD, sortie après sortie.',
    en: 'Sign in to track your progress on GRYD challenges, run after run.',
    es: 'Inicia sesión para seguir tu progreso en los desafíos GRYD, salida tras salida.',
    de: 'Melde dich an, um deinen Fortschritt bei den GRYD-Challenges Lauf für Lauf zu verfolgen.',
    pt: 'Entre para acompanhar seu progresso nos desafios GRYD, corrida após corrida.',
  },
  challengesEmptyOfflineTitle: {
    fr: 'Défis indisponibles.',
    en: 'Challenges unavailable.',
    es: 'Desafíos no disponibles.',
    de: 'Challenges nicht verfügbar.',
    pt: 'Desafios indisponíveis.',
  },
  challengesEmptyOfflineBody: {
    fr: 'GRYD n’arrive pas à joindre son serveur. Tes défis réapparaîtront dès que la connexion sera rétablie.',
    en: 'GRYD can’t reach its server. Your challenges will be back as soon as the connection is.',
    es: 'GRYD no consigue contactar con su servidor. Tus desafíos volverán en cuanto se restablezca la conexión.',
    de: 'GRYD erreicht seinen Server nicht. Deine Challenges sind zurück, sobald die Verbindung wieder steht.',
    pt: 'O GRYD não consegue alcançar seu servidor. Seus desafios voltam assim que a conexão voltar.',
  },
  // Unités d'affichage des challenges (le seed fournit la clé, pas le libellé).
  unitCourses: {
    fr: 'courses',
    en: 'runs',
    es: 'carreras',
    de: 'Läufe',
    pt: 'corridas',
  },
  unitZones: {
    fr: 'zones',
    en: 'zones',
    es: 'zonas',
    de: 'Zonen',
    pt: 'zonas',
  },

  // ─── CONTENU DU CATALOGUE DE CHALLENGES (promesse + récompense) ───────────
  // 25/07/2026 — CES TEXTES ÉTAIENT EN FRANÇAIS EN DUR dans
  // `features/motivation/catalog.ts`, et rendus BRUTS par les deux écrans : un
  // joueur en EN/ES/DE/PT lisait « 3 courses cette semaine, à ton rythme. » et
  // « Coffre crew · palier Or ». La règle 17 vaut pour le contenu produit comme
  // pour la copie d'interface. Les NOMS des défis (« Consistency II »,
  // « Distance », « Defense ») restent des INVARIANTS : ce sont des noms propres
  // GRYD, au même titre que « Focus Solo » — ils ne se traduisent pas.
  chConsistencyBlurb: {
    fr: '3 courses cette semaine, à ton rythme. La régularité prime, pas la vitesse.',
    en: '3 runs this week, at your own pace. Consistency matters, not speed.',
    es: '3 carreras esta semana, a tu ritmo. Manda la constancia, no la velocidad.',
    de: '3 Läufe diese Woche, in deinem Tempo. Konstanz zählt, nicht Tempo.',
    pt: '3 corridas esta semana, no seu ritmo. Vale a regularidade, não a velocidade.',
  },
  chConsistencyReward: {
    fr: 'Badge Consistency',
    en: 'Consistency badge',
    es: 'Badge Consistency',
    de: 'Consistency-Badge',
    pt: 'Badge Consistency',
  },
  chDistanceBlurb: {
    fr: '10 km cumulés sur la semaine. En une fois ou en plusieurs, comme tu veux.',
    en: '10 km total over the week. In one go or in several, however you like.',
    es: '10 km acumulados en la semana. De una vez o en varias, como quieras.',
    de: '10 km über die Woche. Am Stück oder verteilt, ganz wie du willst.',
    pt: '10 km acumulados na semana. De uma vez ou em várias, como você quiser.',
  },
  chDistanceReward: {
    fr: 'Badge Distance',
    en: 'Distance badge',
    es: 'Badge Distance',
    de: 'Distance-Badge',
    pt: 'Badge Distance',
  },
  chDefenseBlurb: {
    fr: '30 zones défendues. Tenir le quartier compte autant que conquérir.',
    en: '30 zones defended. Holding the neighborhood counts as much as taking it.',
    es: '30 zonas defendidas. Mantener el barrio cuenta tanto como conquistarlo.',
    de: '30 verteidigte Zonen. Das Viertel zu halten zählt so viel wie es zu erobern.',
    pt: '30 zonas defendidas. Segurar o bairro conta tanto quanto conquistar.',
  },
  chDefenseReward: {
    fr: 'Badge Defender',
    en: 'Defender badge',
    es: 'Badge Defender',
    de: 'Defender-Badge',
    pt: 'Badge Defender',
  },
  chCrewDefenseBlurb: {
    fr: 'Objectif collectif du crew. Chaque zone défendue compte pour le coffre.',
    en: 'A collective crew goal. Every defended zone counts toward the chest.',
    es: 'Objetivo colectivo del crew. Cada zona defendida cuenta para el cofre.',
    de: 'Gemeinsames Crew-Ziel. Jede verteidigte Zone zählt für die Truhe.',
    pt: 'Objetivo coletivo do crew. Cada zona defendida conta para o baú.',
  },
  chCrewDefenseReward: {
    fr: 'Coffre crew · palier Or',
    en: 'Crew chest · Gold tier',
    es: 'Cofre crew · nivel Oro',
    de: 'Crew-Truhe · Stufe Gold',
    pt: 'Baú do crew · nível Ouro',
  },

  // ─── Challenge — détail ───────────────────────────────────────────────────
  challengeTitle: {
    fr: 'Challenge',
    en: 'Challenge',
    es: 'Desafío',
    de: 'Challenge',
    pt: 'Desafio',
  },
  // ⚠️ « Plus disponible » est une CONCLUSION SUR LE JEU. Elle ne vaut que pour
  // une carte réellement absente d'une liste effectivement LUE — jamais pour un
  // joueur déconnecté ni pour un serveur injoignable, qui ont chacun leur copie
  // ci-dessous. C'est le mensonge corrigé le 25/07/2026 : les quatre causes
  // partageaient cette phrase.
  challengeUnavailable: {
    fr: "Ce challenge n'est plus disponible.",
    en: 'This challenge is no longer available.',
    es: 'Este desafío ya no está disponible.',
    de: 'Diese Challenge ist nicht mehr verfügbar.',
    pt: 'Este desafio não está mais disponível.',
  },
  challengeUnavailableBody: {
    fr: 'Il a pu se terminer depuis que tu as ouvert la liste. Les défis en cours sont sur la page Challenges.',
    en: 'It may have ended since you opened the list. The running challenges are on the Challenges page.',
    es: 'Puede haber terminado desde que abriste la lista. Los desafíos en curso están en la página Desafíos.',
    de: 'Sie kann geendet haben, seit du die Liste geöffnet hast. Die laufenden Challenges stehen auf der Challenges-Seite.',
    pt: 'Ele pode ter terminado desde que você abriu a lista. Os desafios em andamento estão na página Desafios.',
  },
  challengeReading: {
    fr: 'Lecture de ce défi…',
    en: 'Reading this challenge…',
    es: 'Leyendo este desafío…',
    de: 'Diese Challenge wird gelesen…',
    pt: 'Lendo este desafio…',
  },
  challengeRewardKicker: {
    fr: 'RÉCOMPENSE',
    en: 'REWARD',
    es: 'RECOMPENSA',
    de: 'BELOHNUNG',
    pt: 'RECOMPENSA',
  },
  progressKicker: {
    fr: 'PROGRESSION',
    en: 'PROGRESS',
    es: 'PROGRESO',
    de: 'FORTSCHRITT',
    pt: 'PROGRESSO',
  },
  // Anti-shame §11 : chemin parcouru/restant, jamais de rang négatif.
  goalReached: {
    fr: 'Objectif atteint. Beau travail.',
    en: 'Goal reached. Nice work.',
    es: 'Objetivo cumplido. Buen trabajo.',
    de: 'Ziel erreicht. Stark gemacht.',
    pt: 'Objetivo alcançado. Bom trabalho.',
  },
  almostThere: {
    fr: 'Plus que {remaining} — tu y es presque.',
    en: 'Only {remaining} to go — you’re almost there.',
    es: 'Te quedan {remaining} — ya casi lo tienes.',
    de: 'Nur noch {remaining} — fast geschafft.',
    pt: 'Faltam {remaining} — você está quase lá.',
  },
  // ─── CE QUI A ÉTÉ RETIRÉ ICI LE 25/07/2026 ────────────────────────────────
  // Sept entrées servaient EXCLUSIVEMENT des blocs que rien ne pouvait rendre :
  // `bothSidesKicker` / `rivalryFairPlay` / `yourCrew` / `sponsorLine`
  // (rivalité), `contributionKicker` / `crewContrib` / `teamMinimum` (coffre
  // crew), `offeredByKicker` / `sponsorGuard` (sponsor). `challengeState`
  // ne sert que le type `solo` — la contribution personnelle n'est ventilée par
  // membre NULLE PART côté serveur, et aucun sponsor n'existe. Garder la copie
  // d'un écran qu'on ne peut pas peindre, c'est laisser croire au prochain
  // lecteur que ces sections sont vivantes. Elles reviendront AVEC leur source.

  // ─── Motivation Settings ──────────────────────────────────────────────────
  motivationTitle: {
    fr: 'Motivation',
    en: 'Motivation',
    es: 'Motivación',
    de: 'Motivation',
    pt: 'Motivação',
  },
  motivationSubtitle: {
    fr: "Comment GRYD s'adapte à toi.",
    en: 'How GRYD adapts to you.',
    es: 'Cómo GRYD se adapta a ti.',
    de: 'Wie GRYD sich dir anpasst.',
    pt: 'Como o GRYD se adapta a você.',
  },
  sectionPlayStyle: {
    fr: 'STYLE DE JEU',
    en: 'PLAY STYLE',
    es: 'ESTILO DE JUEGO',
    de: 'SPIELSTIL',
    pt: 'ESTILO DE JOGO',
  },
  // ─── CE QUE LE STYLE OUVRE — une RÈGLE, jamais un état ────────────────────
  // Le kicker disait « CLASSEMENTS VISIBLES », ce qui se lit « voilà où tu
  // apparais ». `LEADERBOARD_DEFAULT_VISIBILITY` est une règle de visibilité par
  // défaut, et GRYD n'ouvre à ce jour aucun classement région / France / global.
  // Le titre dit donc maintenant ce que la donnée dit vraiment.
  sectionLeaderboards: {
    fr: 'CE QUE TON STYLE OUVRE',
    en: 'WHAT YOUR STYLE OPENS',
    es: 'LO QUE ABRE TU ESTILO',
    de: 'WAS DEIN STIL ÖFFNET',
    pt: 'O QUE SEU ESTILO ABRE',
  },
  leaderboardsNote: {
    fr: 'Règle de visibilité, pas un état : ton style décide des classements où GRYD peut te faire apparaître.',
    en: 'A visibility rule, not a status: your style decides which leaderboards GRYD may show you on.',
    es: 'Una regla de visibilidad, no un estado: tu estilo decide en qué rankings GRYD puede mostrarte.',
    de: 'Eine Sichtbarkeitsregel, kein Status: Dein Stil entscheidet, auf welchen Rankings GRYD dich zeigen darf.',
    pt: 'Uma regra de visibilidade, não um estado: seu estilo decide em quais rankings o GRYD pode te mostrar.',
  },
  // « Masqué » se dit par le TEXTE. L'ancienne version le disait par une
  // `opacity: 0.5` sur du gris — sous le plancher de lisibilité, et invisible
  // pour qui ne distingue pas les nuances.
  leaderboardsClosed: {
    fr: 'Fermés par ton style : {levels}.',
    en: 'Closed by your style: {levels}.',
    es: 'Cerrados por tu estilo: {levels}.',
    de: 'Von deinem Stil geschlossen: {levels}.',
    pt: 'Fechados pelo seu estilo: {levels}.',
  },
  leaderboardsNotOpenYet: {
    fr: "Tous ces niveaux n'existent pas encore dans GRYD. L'onglet Classement montre ceux qui sont ouverts aujourd'hui.",
    en: 'Not all of these levels exist in GRYD yet. The Leaderboard tab shows the ones that are open today.',
    es: 'Todavía no existen todos estos niveles en GRYD. La pestaña Clasificación muestra los que están abiertos hoy.',
    de: 'Es gibt noch nicht alle diese Ebenen in GRYD. Der Ranking-Tab zeigt die, die heute offen sind.',
    pt: 'Nem todos esses níveis existem ainda no GRYD. A aba Classificação mostra os que estão abertos hoje.',
  },
  // ─── LA VISIBILITÉ N'A QU'UN SEUL ENDROIT (E21) ───────────────────────────
  // Cet écran proposait « Profil visible par », « Partage d'activité » et
  // « Trace sur la carte » — qui écrivaient dans `motivation/store`, alors que
  // le Profil et l'édition de profil LISENT `privacy/store`. Régler « Moi seul »
  // ici ne changeait rien à ce que le Profil affichait. La ligne ci-dessous
  // renvoie à l'écran qui décide vraiment, au lieu d'un second réglage inerte.
  visibilityRowLabel: {
    fr: 'Visibilité et partage',
    en: 'Visibility & sharing',
    es: 'Visibilidad y compartir',
    de: 'Sichtbarkeit & Teilen',
    pt: 'Visibilidade e compartilhamento',
  },
  visibilityRowSublabel: {
    fr: 'Qui voit ton profil, tes courses et ta trace — dans Confidentialité.',
    en: 'Who sees your profile, your runs and your trace — in Privacy.',
    es: 'Quién ve tu perfil, tus carreras y tu trazado — en Privacidad.',
    de: 'Wer dein Profil, deine Läufe und deine Spur sieht — unter Privatsphäre.',
    pt: 'Quem vê seu perfil, suas corridas e seu traçado — em Privacidade.',
  },
  sectionDiscreet: {
    fr: 'MODE DISCRET',
    en: 'QUIET MODE',
    es: 'MODO DISCRETO',
    de: 'DISKRET-MODUS',
    pt: 'MODO DISCRETO',
  },
  // Anti-shame : un droit, pas un aveu de faiblesse.
  discreetTitle: {
    fr: 'Rester discret',
    en: 'Stay low-key',
    es: 'Mantenerte discreto',
    de: 'Diskret bleiben',
    pt: 'Ficar discreto',
  },
  discreetSubtitle: {
    fr: 'Hors des classements globaux, profil limité, partage au choix. Un droit, pas un recul.',
    en: 'Out of global leaderboards, limited profile, sharing on your terms. A right, not a retreat.',
    es: 'Fuera de los rankings globales, perfil limitado, compartir a tu manera. Un derecho, no un retroceso.',
    de: 'Raus aus globalen Rankings, begrenztes Profil, Teilen nach Wahl. Ein Recht, kein Rückzug.',
    pt: 'Fora dos rankings globais, perfil limitado, compartilhamento do seu jeito. Um direito, não um recuo.',
  },

  // ─── Labels — style de jeu (§2, titres de style = noms propres GRYD) ──────
  playStyleFocusSoloTitle: {
    fr: 'Focus Solo',
    en: 'Focus Solo',
    es: 'Focus Solo',
    de: 'Focus Solo',
    pt: 'Focus Solo',
  },
  playStyleFocusSoloSubtitle: {
    fr: 'Ta forme, tes objectifs, à ton rythme. Le territoire en bonus.',
    en: 'Your fitness, your goals, your pace. Territory as a bonus.',
    es: 'Tu forma, tus objetivos, a tu ritmo. El territorio como bonus.',
    de: 'Deine Form, deine Ziele, dein Tempo. Gebiet als Bonus.',
    pt: 'Sua forma, seus objetivos, seu ritmo. Território de bônus.',
  },
  playStyleMixteTitle: {
    fr: 'Mixte',
    en: 'Mixed',
    es: 'Mixto',
    de: 'Mix',
    pt: 'Misto',
  },
  playStyleMixteSubtitle: {
    fr: 'Un peu de tout : progression perso et vie de crew, sans pression.',
    en: 'A bit of everything: personal progress and crew life, no pressure.',
    es: 'Un poco de todo: progreso personal y vida de crew, sin presión.',
    de: 'Von allem etwas: eigener Fortschritt und Crew-Leben, ohne Druck.',
    pt: 'Um pouco de tudo: progresso pessoal e vida de crew, sem pressão.',
  },
  playStyleCrewWarTitle: {
    fr: 'Crew War',
    en: 'Crew War',
    es: 'Crew War',
    de: 'Crew War',
    pt: 'Crew War',
  },
  playStyleCrewWarSubtitle: {
    fr: 'Conquête, défense, classements. Tu joues pour ton crew.',
    en: 'Conquest, defense, leaderboards. You play for your crew.',
    es: 'Conquista, defensa, rankings. Juegas para tu crew.',
    de: 'Erobern, verteidigen, Rankings. Du spielst für deine Crew.',
    pt: 'Conquista, defesa, rankings. Você joga pelo seu crew.',
  },

  // ─── CE QUI A ÉTÉ RETIRÉ ICI LE 25/07/2026 ────────────────────────────────
  // Les dix libellés de visibilité / partage d'activité / trace sur la carte
  // (`visPrivate`…`mapNone`) ne servaient QUE `settings-motivation`, qui les
  // écrivait dans `motivation/store` — un magasin que ni le Profil ni l'édition
  // de profil ne lisent. La visibilité n'a désormais qu'un seul écran
  // (Confidentialité) et qu'un seul jeu de libellés (domaine `features/privacy`).
  // Deux vocabulaires pour un même concept, c'était déjà deux vérités.

  // ─── Labels — modes de course au départ (§2/§8) ───────────────────────────
  runModeConqueteTitle: {
    fr: 'Conquête',
    en: 'Conquest',
    es: 'Conquista',
    de: 'Eroberung',
    pt: 'Conquista',
  },
  runModeConqueteSubtitle: {
    fr: 'Capture et défends des zones. Le mode complet.',
    en: 'Capture and defend zones. The full mode.',
    es: 'Captura y defiende zonas. El modo completo.',
    de: 'Erobere und halte Zonen. Der volle Modus.',
    pt: 'Capture e defenda zonas. O modo completo.',
  },
  runModeSocialTitle: {
    fr: 'Social Run',
    en: 'Social Run',
    es: 'Social Run',
    de: 'Social Run',
    pt: 'Social Run',
  },
  runModeSocialSubtitle: {
    fr: 'Cours en groupe pour le plaisir : stats, badges et XP, sans capture.',
    en: 'Run together for fun: stats, badges and XP, no capturing.',
    es: 'Corre en grupo por placer: stats, badges y XP, sin captura.',
    de: 'Gemeinsam laufen zum Spaß: Stats, Badges und XP, ohne Erobern.',
    pt: 'Corra em grupo pelo prazer: stats, badges e XP, sem captura.',
  },
  runModePriveeTitle: {
    fr: 'Course privée',
    en: 'Private run',
    es: 'Carrera privada',
    de: 'Privater Lauf',
    pt: 'Corrida privada',
  },
  runModePriveeSubtitle: {
    fr: 'Juste pour toi : stats perso, rien de partagé, rien sur la carte.',
    en: 'Just for you: personal stats, nothing shared, nothing on the map.',
    es: 'Solo para ti: stats personales, nada compartido, nada en el mapa.',
    de: 'Nur für dich: eigene Stats, nichts geteilt, nichts auf der Karte.',
    pt: 'Só para você: stats pessoais, nada compartilhado, nada no mapa.',
  },

  // ─── Labels — niveaux de classement (§10, chips lecture seule) ────────────
  lbPersonnel: {
    fr: 'Personnel',
    en: 'Personal',
    es: 'Personal',
    de: 'Persönlich',
    pt: 'Pessoal',
  },
  lbCrew: {
    fr: 'Crew',
    en: 'Crew',
    es: 'Crew',
    de: 'Crew',
    pt: 'Crew',
  },
  lbAmis: {
    fr: 'Amis',
    en: 'Friends',
    es: 'Amigos',
    de: 'Freunde',
    pt: 'Amigos',
  },
  lbLocal: {
    fr: 'Local',
    en: 'Local',
    es: 'Local',
    de: 'Lokal',
    pt: 'Local',
  },
  lbVille: {
    fr: 'Ville',
    en: 'City',
    es: 'Ciudad',
    de: 'Stadt',
    pt: 'Cidade',
  },
  lbRegion: {
    fr: 'Région',
    en: 'Region',
    es: 'Región',
    de: 'Region',
    pt: 'Região',
  },
  lbFrance: {
    fr: 'France',
    en: 'France',
    es: 'Francia',
    de: 'Frankreich',
    pt: 'França',
  },
  lbGlobal: {
    fr: 'Tous',
    en: 'Everyone',
    es: 'Todos',
    de: 'Alle',
    pt: 'Todos',
  },

  // ─── Labels — canaux de notification (§21, titres sur pastilles : COURTS) ─
  notifSoloTitle: {
    fr: 'Solo',
    en: 'Solo',
    es: 'Solo',
    de: 'Solo',
    pt: 'Solo',
  },
  notifSoloSubtitle: {
    fr: 'Objectif du jour, records, séries.',
    en: 'Daily goal, records, streaks.',
    es: 'Objetivo del día, récords, rachas.',
    de: 'Tagesziel, Rekorde, Serien.',
    pt: 'Objetivo do dia, recordes, sequências.',
  },
  notifCrewTitle: {
    fr: 'Crew',
    en: 'Crew',
    es: 'Crew',
    de: 'Crew',
    pt: 'Crew',
  },
  notifCrewSubtitle: {
    fr: 'Coffre, défense, activité du crew.',
    en: 'Chest, defense, crew activity.',
    es: 'Cofre, defensa, actividad del crew.',
    de: 'Truhe, Verteidigung, Crew-Aktivität.',
    pt: 'Baú, defesa, atividade do crew.',
  },
  notifCompetitionTitle: {
    fr: 'Compétition',
    en: 'Competition',
    es: 'Competición',
    de: 'Wettkampf',
    pt: 'Competição',
  },
  notifCompetitionSubtitle: {
    fr: 'Rivalités, classements, offensives.',
    en: 'Rivalries, leaderboards, attacks.',
    es: 'Rivalidades, rankings, ofensivas.',
    de: 'Rivalitäten, Rankings, Angriffe.',
    pt: 'Rivalidades, rankings, ofensivas.',
  },
  notifOffTitle: {
    fr: 'Silence',
    en: 'Silence',
    es: 'Silencio',
    de: 'Stille',
    pt: 'Silêncio',
  },
  notifOffSubtitle: {
    fr: 'Aucune notification. Tu ouvres quand tu veux.',
    en: 'No notifications. You open the app when you want.',
    es: 'Ninguna notificación. Abres cuando quieras.',
    de: 'Keine Mitteilungen. Du öffnest, wann du willst.',
    pt: 'Nenhuma notificação. Você abre quando quiser.',
  },

  // ─── Labels — type de challenge (§17, étiquettes courtes) ─────────────────
  chTypeSolo: {
    fr: 'Solo',
    en: 'Solo',
    es: 'Solo',
    de: 'Solo',
    pt: 'Solo',
  },
  chTypeCrew: {
    fr: 'Crew',
    en: 'Crew',
    es: 'Crew',
    de: 'Crew',
    pt: 'Crew',
  },
  chTypeRivalry: {
    fr: 'Rivalité',
    en: 'Rivalry',
    es: 'Rivalidad',
    de: 'Rivalität',
    pt: 'Rivalidade',
  },
  chTypeEvent: {
    fr: 'Événement',
    en: 'Event',
    es: 'Evento',
    de: 'Event',
    pt: 'Evento',
  },
  chTypeSeason: {
    fr: 'Saison',
    en: 'Season',
    es: 'Temporada',
    de: 'Saison',
    pt: 'Temporada',
  },

  // ─── Labels — difficulté (§16, étiquettes DOUCES, jamais culpabilisantes) ─
  chDiffChill: {
    fr: 'Tranquille',
    en: 'Easygoing',
    es: 'Tranquilo',
    de: 'Entspannt',
    pt: 'Tranquilo',
  },
  chDiffStandard: {
    fr: 'Régulier',
    en: 'Steady',
    es: 'Constante',
    de: 'Regelmäßig',
    pt: 'Regular',
  },
  chDiffIntense: {
    fr: 'Ambitieux',
    en: 'Ambitious',
    es: 'Ambicioso',
    de: 'Ehrgeizig',
    pt: 'Ambicioso',
  },
});
