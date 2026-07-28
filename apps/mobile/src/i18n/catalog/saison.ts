/**
 * GRYD — i18n : catalogue DÉDIÉ à l'onglet Saison (app/(tabs)/classement.tsx),
 * créé au recalage des planches E11 « Classement local » + E12 « Saison & rang »
 * (25/07/2026).
 *
 * POURQUOI UN CATALOGUE À PART : `flagged.ts` porte déjà les chaînes historiques
 * de cet écran, MAIS il est partagé avec arsenal.tsx, (tabs)/warroom.tsx et
 * features/arsenal/recommendations.ts — deux chantiers parallèles peuvent l'ouvrir
 * en même temps. Les clés NOUVELLES vivent donc ici ; les anciennes restent lues
 * depuis `flagged.ts` (aucune duplication, aucune édition croisée).
 *
 * INVARIANTS (jamais traduits, donc PAS ici) : GRYD, pts (unité), les noms de
 * badges du catalogue @klaim/shared (« Season Rank III »), les pseudos et les
 * noms de ville lus en base.
 *
 * §A CONTRAIGNANT : libellés COURTS dans les 5 langues (l'allemand est reformulé
 * concis — « Endet in {n} T », « {n} Plätze aufholen ») pour ne JAMAIS tronquer à
 * 375 px. Mêmes {placeholders} dans les 5 langues (le typage force la parité).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ══════════════ E12-1 · En-tête : saison RÉELLE + décompte RÉEL ══════════════
  // Le numéro vient de `season.number` (RPC season_current), plus jamais d'une
  // chaîne « SAISON 0 » figée dans l'i18n.
  kickerSaison: {
    fr: 'SAISON {n}',
    en: 'SEASON {n}',
    es: 'TEMPORADA {n}',
    de: 'SAISON {n}',
    pt: 'TEMPORADA {n}',
  },
  /** Lu, et il n'y a aucune saison ouverte — état DISTINCT d'un échec. */
  kickerPasOuverte: {
    fr: 'SAISON PAS ENCORE OUVERTE',
    en: 'SEASON NOT OPEN YET',
    es: 'TEMPORADA AÚN NO ABIERTA',
    de: 'SAISON NOCH NICHT OFFEN',
    pt: 'TEMPORADA AINDA NÃO ABERTA',
  },
  /** La lecture a ÉCHOUÉ : on ne sait pas — on ne dit pas « aucune saison ». */
  kickerIndispo: {
    fr: 'SAISON INDISPONIBLE',
    en: 'SEASON UNAVAILABLE',
    es: 'TEMPORADA NO DISPONIBLE',
    de: 'SAISON NICHT VERFÜGBAR',
    pt: 'TEMPORADA INDISPONÍVEL',
  },
  finDansJours: {
    fr: 'Se termine dans {n} j',
    en: 'Ends in {n} d',
    es: 'Termina en {n} d',
    de: 'Endet in {n} T',
    pt: 'Termina em {n} d',
  },
  finAujourdhui: {
    fr: 'Se termine aujourd’hui',
    en: 'Ends today',
    es: 'Termina hoy',
    de: 'Endet heute',
    pt: 'Termina hoje',
  },
  /** E11-14 · Saison finie, clôture serveur pas encore repassée (phase 'ended'). */
  classementGele: {
    fr: 'Classement gelé · résultats en calcul',
    en: 'Leaderboard frozen · results pending',
    es: 'Clasificación congelada · resultados en cálculo',
    de: 'Rangliste eingefroren · Ergebnisse folgen',
    pt: 'Classificação congelada · resultados em cálculo',
  },

  // ══════════════════ E11-3/4 · Chips de PROXIMITÉ (scrollables) ═══════════════
  /** L'ancien onglet « Joueurs » : c'est le classement de MA ville, on le dit. */
  tabMaVille: {
    fr: 'Ma ville',
    en: 'My city',
    es: 'Mi ciudad',
    de: 'Meine Stadt',
    pt: 'Minha cidade',
  },

  // ═════════════ E11-8/9/10 · MA LIGNE ancrée (rang + barre + écart) ═══════════
  maLigneA11y: {
    fr: 'Ta position au classement',
    en: 'Your leaderboard position',
    es: 'Tu posición en la clasificación',
    de: 'Deine Platzierung',
    pt: 'Sua posição na classificação',
  },
  /** Écart EXPLICITE, dans l'unité RÉELLE du board (points, jamais des km²). */
  gapPourPasser: {
    fr: '{pts} pts pour passer #{rank}',
    en: '{pts} pts to pass #{rank}',
    es: '{pts} pts para pasar a #{rank}',
    de: '{pts} Pkt. bis #{rank}',
    pt: '{pts} pts para passar #{rank}',
  },
  /**
   * E53 §10.1 — LE MÊME ÉCART, mais dans l'unité de l'axe RÉEL : la SURFACE.
   * `{surface}` arrive déjà formaté ET suffixé de son unité (« 0,04 km² ») par
   * `surfaceBoard.ts` : l'unité n'est pas écrite dans la phrase, sinon un
   * tableau en m² afficherait un libellé en km². Symbole SI, identique partout.
   */
  gapSurfacePourPasser: {
    fr: '{surface} pour passer #{rank}',
    en: '{surface} to pass #{rank}',
    es: '{surface} para pasar a #{rank}',
    de: '{surface} bis #{rank}',
    pt: '{surface} para passar #{rank}',
  },
  /**
   * ── L'ÉCART NUL A SA PROPRE PHRASE (28/07/2026) ───────────────────────────
   * §10.2 départage en TROIS temps : surface tenue, puis défenses gagnées, puis
   * surface conquise. `surfaceTieKey` en tire la conséquence — deux joueurs à
   * surface ÉGALE que leurs défenses séparent ne sont PAS ex æquo, ils ont deux
   * rangs. L'écart de surface entre eux vaut alors exactement 0, et la phrase
   * générique donnait « 0,00 km² pour passer #3 » : un objectif littéralement
   * inatteignable, garanti par construction et non hypothétique. On dit donc ce
   * qui est vrai — la surface ne les sépare pas, un autre critère le fait.
   */
  gapSurfaceEgalite: {
    fr: 'Même surface que #{rank} : ce sont les défenses et la conquête qui départagent',
    en: 'Same area as #{rank}: defenses and conquest break the tie',
    es: 'Misma superficie que #{rank}: las defensas y la conquista deciden',
    de: 'Gleiche Fläche wie #{rank}: Verteidigungen und Eroberung entscheiden',
    pt: 'Mesma área que #{rank}: as defesas e a conquista decidem',
  },
  /**
   * Phrase-objectif du CTA, en SURFACE. Elle a remplacé « ≈ n zones pour passer
   * X » : cette conversion divisait un écart de POINTS par POINTS_NEUTRAL_HEX,
   * arithmétique qui n'a plus de sens sur un écart en m² — et estimer un nombre
   * de zones depuis une surface exigerait une aire de zone MOYENNE que rien ne
   * mesure. On dit l'écart tel qu'il est plutôt que de l'habiller.
   */
  goalSurfaceChase: {
    fr: '{surface} pour passer {name}.',
    en: '{surface} to pass {name}.',
    es: '{surface} para superar a {name}.',
    de: '{surface} bis {name}.',
    // pt = BRÉSILIEN (CLAUDE.md) : formulation neutre, aucun « teu/tua ».
    pt: '{surface} para passar {name}.',
  },
  /** Même cas que `gapSurfaceEgalite`, côté phrase-objectif du CTA. */
  goalSurfaceEgalite: {
    fr: 'Même surface que {name} : ce sont les défenses et la conquête qui départagent.',
    en: 'Same area as {name}: defenses and conquest break the tie.',
    es: 'Misma superficie que {name}: las defensas y la conquista deciden.',
    de: 'Gleiche Fläche wie {name}: Verteidigungen und Eroberung entscheiden.',
    pt: 'Mesma área que {name}: as defesas e a conquista decidem.',
  },

  // ══════════════════════════ E11-12 · Égalité (rang 1224) ═════════════════════
  /** Deux lignes à points égaux partagent le rang — comme le moteur serveur. */
  exAequo: {
    fr: 'ex æquo',
    en: 'tied',
    es: 'empate',
    de: 'gleichauf',
    pt: 'empate',
  },

  // ═══════════════ E11-15 · Nouveau joueur : jamais de podium géant ════════════
  pasClasse: {
    fr: 'Tu n’apparais pas encore dans ce classement.',
    en: 'You’re not in this leaderboard yet.',
    es: 'Aún no apareces en esta clasificación.',
    de: 'Du bist noch nicht in dieser Rangliste.',
    // pt = BRÉSILIEN (CLAUDE.md) : « você aparece », jamais « (tu) apareces ».
    pt: 'Você ainda não aparece nesta classificação.',
  },

  // ══════════════════ E12-2 · Card RANG (paliers RÉELS de clôture) ═════════════
  rangSectionLabel: {
    fr: 'RANG LOCAL',
    en: 'LOCAL RANK',
    es: 'RANGO LOCAL',
    de: 'LOKALER RANG',
    pt: 'POSTO LOCAL',
  },
  /** Le palier tenu est PROVISOIRE : il n'est décerné qu'à la clôture. */
  standingKicker: {
    fr: 'Si la saison fermait maintenant',
    en: 'If the season closed now',
    es: 'Si la temporada cerrara ahora',
    de: 'Wenn die Saison jetzt endete',
    pt: 'Se a temporada fechasse agora',
  },
  palierTopN: {
    fr: 'Top {n} local',
    en: 'Local top {n}',
    es: 'Top {n} local',
    de: 'Lokale Top {n}',
    pt: 'Top {n} local',
  },
  palierPremier: {
    fr: '#1 local',
    en: 'Local #1',
    es: '#1 local',
    de: 'Lokal #1',
    pt: '#1 local',
  },
  palierVainqueur: {
    fr: 'Vainqueur local',
    en: 'Local winner',
    es: 'Ganador local',
    de: 'Lokaler Sieger',
    pt: 'Vencedor local',
  },
  prochainPalier: {
    fr: 'Prochain palier : {palier}',
    en: 'Next tier: {palier}',
    es: 'Siguiente nivel: {palier}',
    de: 'Nächste Stufe: {palier}',
    pt: 'Próximo nível: {palier}',
  },
  placesAGagner: {
    fr: '{n} places à gagner',
    en: '{n} places to gain',
    es: '{n} puestos por ganar',
    de: '{n} Plätze aufholen',
    pt: '{n} lugares a ganhar',
  },
  placeAGagner: {
    fr: '1 place à gagner',
    en: '1 place to gain',
    es: '1 puesto por ganar',
    de: '1 Platz aufholen',
    pt: '1 lugar a ganhar',
  },
  rangPasClasse: {
    fr: 'Pas encore classé',
    en: 'Not ranked yet',
    es: 'Aún sin clasificar',
    de: 'Noch nicht platziert',
    pt: 'Ainda sem classificação',
  },
  rangPasClasseBody: {
    fr: 'Ton rang local apparaît après ta première course comptée.',
    en: 'Your local rank appears after your first counted run.',
    es: 'Tu rango local aparece tras tu primera carrera contada.',
    de: 'Dein lokaler Rang erscheint nach deinem ersten gewerteten Lauf.',
    pt: 'Sua posição local aparece após a primeira corrida contada.',
  },

  // ═════════════ E12-4 · Frise VERTICALE des paliers RÉELS de saison ═══════════
  recompensesSaison: {
    fr: 'RÉCOMPENSES DE SAISON',
    en: 'SEASON REWARDS',
    es: 'RECOMPENSAS DE TEMPORADA',
    de: 'SAISON-BELOHNUNGEN',
    pt: 'RECOMPENSAS DA TEMPORADA',
  },
  // Conditions RETRADUITES depuis packages/shared/src/badges.ts (rédigées en
  // français en dur là-bas) — le catalogue shared n'est PAS édité d'ici.
  conditionTopN: {
    fr: 'Termine dans le top {n} local.',
    en: 'Finish in the local top {n}.',
    es: 'Termina en el top {n} local.',
    de: 'Beende in den lokalen Top {n}.',
    pt: 'Termine no top {n} local.',
  },
  conditionPremier: {
    fr: 'Termine #1 local.',
    en: 'Finish local #1.',
    es: 'Termina #1 local.',
    de: 'Beende als lokale Nr. 1.',
    pt: 'Termine em #1 local.',
  },
  conditionVainqueur: {
    fr: 'Remporte la saison locale.',
    en: 'Win the local season.',
    es: 'Gana la temporada local.',
    de: 'Gewinne die lokale Saison.',
    pt: 'Vence a temporada local.',
  },
  statutObtenu: {
    fr: 'Obtenu',
    en: 'Earned',
    es: 'Obtenido',
    de: 'Erhalten',
    pt: 'Obtido',
  },
  statutVerrouille: {
    fr: 'Verrouillé',
    en: 'Locked',
    es: 'Bloqueado',
    de: 'Gesperrt',
    pt: 'Bloqueado',
  },
  // Les QUATRE états de la lecture `user_badges`, jamais confondus : un « rien
  // obtenu » après panne se lirait « tu n'as rien gagné ».
  badgesLecture: {
    fr: 'Lecture de tes récompenses…',
    en: 'Loading your rewards…',
    es: 'Cargando tus recompensas…',
    de: 'Belohnungen werden geladen…',
    pt: 'Carregando suas recompensas…',
  },
  badgesConnexion: {
    fr: 'Connecte-toi pour voir ce que tu as déjà obtenu.',
    en: 'Sign in to see what you’ve already earned.',
    es: 'Inicia sesión para ver lo que ya has obtenido.',
    de: 'Melde dich an, um deine Erfolge zu sehen.',
    // pt = BRÉSILIEN (CLAUDE.md) : « você conquistou », jamais « (tu) obtiveste ».
    pt: 'Entre para ver o que você já conquistou.',
  },
  badgesEchec: {
    fr: 'Récompenses non chargées.',
    en: 'Rewards not loaded.',
    es: 'Recompensas no cargadas.',
    de: 'Belohnungen nicht geladen.',
    pt: 'Recompensas não carregadas.',
  },

  // ═══════════ E12-5 · Règles du reset — CONFORMES au moteur, pas à la planche ═
  // La planche promet « vos territoires restent acquis » : c'est FAUX
  // (season_close phase 2 = wipe des hex_claims + boucliers). On écrit le vrai.
  resetLigne1: {
    fr: 'Au reset : la carte repart à zéro (les zones capturées sont libérées). Ton compte, tes badges et tes récompenses restent acquis ; le rang repart de zéro.',
    en: 'At reset: the map starts over (captured zones are released). Your account, badges and rewards are kept; the rank restarts from zero.',
    es: 'En el reinicio: el mapa vuelve a cero (las zonas capturadas se liberan). Tu cuenta, tus insignias y tus recompensas se conservan; el rango vuelve a empezar.',
    de: 'Beim Reset: Die Karte startet neu (eroberte Zonen werden frei). Konto, Abzeichen und Belohnungen bleiben; der Rang beginnt bei null.',
    pt: 'No reset: o mapa recomeça (as zonas capturadas são libertadas). A conta, os emblemas e as recompensas ficam; o posto recomeça do zero.',
  },
  resetLigne2: {
    fr: 'Les récompenses sont cosmétiques — jamais un avantage de capture.',
    en: 'Rewards are cosmetic — never a capture advantage.',
    es: 'Las recompensas son cosméticas — nunca una ventaja de captura.',
    de: 'Belohnungen sind kosmetisch — nie ein Eroberungsvorteil.',
    pt: 'As recompensas são cosméticas — nunca uma vantagem de captura.',
  },

  // ─── Commutateur Run / Bike (planche E14) ──────────────────────────────────
  // Segments à picto seul : l'a11y porte tout le sens, et elle nomme ce que la
  // bascule change ICI — un classement, pas une carte.
  activityRunA11y: {
    fr: 'Classement à pied',
    en: 'Running leaderboard',
    es: 'Clasificación a pie',
    de: 'Lauf-Rangliste',
    pt: 'Classificação a pé',
  },
  activityBikeA11y: {
    fr: 'Classement vélo',
    en: 'Cycling leaderboard',
    es: 'Clasificación en bici',
    de: 'Rad-Rangliste',
    pt: 'Classificação de bike',
  },
  /**
   * ÉTAT VIDE DU CLASSEMENT VÉLO — RÉÉCRIT LE 26/07/2026.
   *
   * Le corps disait « GRYD ne chronomètre pas encore le vélo : personne n'a de
   * points vélo, ici ni ailleurs ». Deux fautes désormais : c'est faux (le vélo
   * enregistre, `season_scores` est clé par `(season_id, user_id, activity)`), et
   * « ni ailleurs » affirmait quelque chose sur le monde ENTIER que la lecture
   * ne dit pas — elle ne lit que la saison de MA ville.
   *
   * La nouvelle copie ne dit QUE ce que la lecture a rendu : aucune ligne dans
   * CE classement. Elle reste distincte du vide à pied parce que l'action ne
   * l'est pas (« lance une sortie vélo », pas « cours »), et elle garde la
   * mention de séparation stricte, qui explique pourquoi ce tableau est vide
   * alors que le tableau à pied ne l'est peut-être pas.
   */
  bikeBoardTitle: {
    fr: 'Le classement Bike commence ici',
    en: 'The Bike leaderboard starts here',
    es: 'La clasificación Bike empieza aquí',
    de: 'Die Bike-Rangliste beginnt hier',
    pt: 'A classificação Bike começa aqui',
  },
  bikeBoardBody: {
    fr: 'Personne n’est encore classé en vélo dans ta ville cette saison.',
    en: 'Nobody is ranked on a bike in your city this season yet.',
    es: 'Nadie está clasificado en bici en tu ciudad esta temporada.',
    de: 'In deiner Stadt ist diese Saison noch niemand auf dem Rad platziert.',
    pt: 'Ninguém está classificado de bike na sua cidade nesta temporada.',
  },
  /** SÉPARATION STRICTE (planche E14) : deux mondes, jamais une somme. */
  bikeBoardSeparate: {
    fr: 'Les rangs à pied et vélo sont séparés : jamais mélangés, jamais additionnés.',
    en: 'Running and Bike ranks stay separate: never mixed, never summed.',
    es: 'Los rangos a pie y en bici están separados: nunca se mezclan ni se suman.',
    de: 'Lauf- und Rad-Ränge bleiben getrennt: nie gemischt, nie addiert.',
    pt: 'Os postos a pé e de bike ficam separados: nunca misturados, nunca somados.',
  },
  /** CTA de l'état vide vélo — la sortie est DÉCLARÉE vélo, pas devinée. */
  bikeBoardCta: {
    fr: 'Lancer une sortie vélo',
    en: 'Start a bike ride',
    es: 'Empezar una salida en bici',
    de: 'Radausfahrt starten',
    pt: 'Começar um pedal',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // E59 · L'ÉCRAN SAISON DÉDIÉ (`/season`) — ajouté le 27/07/2026.
  //
  // Arbitrage A2 : Saison sort de la barre d'onglets et s'atteint depuis le
  // Profil (E55 → progression de rang → `/season`). Les clés ci-dessus servent
  // le bloc E12 de l'onglet Classement ; celles-ci complètent ce que la spéc
  // E59 ajoute et qui manquait : XP, prochain jalon, règles, saison précédente.
  //
  // ⚠ AUCUNE DONNÉE FABRIQUÉE. La base est VIDE : « saison précédente » n'existe
  // pour personne aujourd'hui, et `histoAucune` est donc l'état NORMAL, pas un
  // repli. Ne jamais peindre un historique d'illustration.
  // ══════════════════════════════════════════════════════════════════════════

  ecranTitre: {
    fr: 'Saison',
    en: 'Season',
    es: 'Temporada',
    de: 'Saison',
    pt: 'Temporada',
  },

  // ── XP et prochain jalon ──────────────────────────────────────────────────
  sectionXp: {
    fr: 'Ta progression',
    en: 'Your progress',
    es: 'Tu progreso',
    de: 'Dein Fortschritt',
    pt: 'Seu progresso',
  },
  /** `{n}`/`{max}` = XP RÉELS lus en base. Jamais une barre sans dénominateur. */
  xpVersNiveau: {
    fr: '{n} / {max} XP vers le niveau {level}',
    en: '{n} / {max} XP to level {level}',
    es: '{n} / {max} XP hacia el nivel {level}',
    de: '{n} / {max} XP bis Level {level}',
    pt: '{n} / {max} XP para o nível {level}',
  },
  /** L'XP est PERMANENT : il survit au reset. C'est la promesse à tenir. */
  xpPermanent: {
    fr: 'L’XP ne se remet jamais à zéro, et ne s’achète pas.',
    en: 'XP never resets, and cannot be bought.',
    es: 'La XP nunca se reinicia y no se puede comprar.',
    de: 'XP wird nie zurückgesetzt und ist nicht käuflich.',
    pt: 'O XP nunca zera e não pode ser comprado.',
  },
  prochainJalon: {
    fr: 'Prochain jalon',
    en: 'Next milestone',
    es: 'Próximo hito',
    de: 'Nächster Meilenstein',
    pt: 'Próximo marco',
  },
  /** `{rank}` = nom de rang résolu depuis `rang.ts`, jamais écrit ici. */
  prochainJalonRang: {
    fr: '{rank} au niveau {level}',
    en: '{rank} at level {level}',
    es: '{rank} en el nivel {level}',
    de: '{rank} ab Level {level}',
    pt: '{rank} no nível {level}',
  },
  /** Dernier palier atteint : on ne fabrique pas un jalon qui n'existe pas. */
  prochainJalonAucun: {
    fr: 'Tu tiens le dernier rang. Il n’y a rien au-dessus.',
    en: 'You hold the top rank. There is nothing above it.',
    es: 'Tienes el rango máximo. No hay nada por encima.',
    de: 'Du hast den höchsten Rang. Darüber kommt nichts.',
    pt: 'Você está na patente máxima. Não existe nada acima.',
  },

  // ── Règles de la saison (E59 « Règles ») ──────────────────────────────────
  sectionRegles: {
    fr: 'Les règles de la saison',
    en: 'Season rules',
    es: 'Reglas de la temporada',
    de: 'Saisonregeln',
    pt: 'Regras da temporada',
  },
  regleRangsSepares: {
    fr: 'Les rangs à pied et vélo sont séparés — deux mondes, jamais additionnés.',
    en: 'Running and Bike ranks are separate — two worlds, never summed.',
    es: 'Los rangos a pie y en bici están separados: dos mundos, nunca sumados.',
    de: 'Lauf- und Rad-Ränge sind getrennt — zwei Welten, nie addiert.',
    pt: 'As posições a pé e de bike são separadas — dois mundos, nunca somados.',
  },
  regleDuree: {
    fr: 'Une saison dure {weeks} semaines, suivie de {days} jours d’intersaison.',
    en: 'A season runs {weeks} weeks, then {days} days between seasons.',
    es: 'Una temporada dura {weeks} semanas, seguidas de {days} días de intertemporada.',
    de: 'Eine Saison dauert {weeks} Wochen, danach {days} Tage Pause.',
    pt: 'Uma temporada dura {weeks} semanas, seguidas de {days} dias de intervalo.',
  },
  regleRecompensesCosmetiques: {
    fr: 'Les récompenses sont cosmétiques : aucune capacité compétitive, jamais achetable.',
    en: 'Rewards are cosmetic: no competitive ability, never purchasable.',
    es: 'Las recompensas son cosméticas: ninguna ventaja competitiva, nunca comprables.',
    de: 'Belohnungen sind kosmetisch: kein Wettbewerbsvorteil, nie käuflich.',
    pt: 'As recompensas são cosméticas: nenhuma vantagem competitiva, nunca compráveis.',
  },

  // ── Saison précédente (E59 « historique saison précédente ») ──────────────
  sectionHistorique: {
    fr: 'Saison précédente',
    en: 'Previous season',
    es: 'Temporada anterior',
    de: 'Vorherige Saison',
    pt: 'Temporada anterior',
  },
  histoLigne: {
    fr: 'Saison {n} · #{rank}',
    en: 'Season {n} · #{rank}',
    es: 'Temporada {n} · #{rank}',
    de: 'Saison {n} · #{rank}',
    pt: 'Temporada {n} · #{rank}',
  },
  /**
   * La saison est bien terminée, mais AUCUN rang final ne me concerne : soit je
   * n'y ai pas couru, soit `season_close` n'a pas encore gelé `rank_cache`.
   * On dit l'absence — inventer un rang sur une saison close serait le pire des
   * mensonges (il n'est même plus rattrapable).
   */
  histoSansRang: {
    fr: 'Saison {n} · pas de rang final pour toi',
    en: 'Season {n} · no final rank for you',
    es: 'Temporada {n} · sin rango final para ti',
    de: 'Saison {n} · kein Endrang für dich',
    pt: 'Temporada {n} · sem posição final para você',
  },
  /** Vers E61. N'apparaît QUE si une saison est réellement terminée. */
  histoVoirBilan: {
    fr: 'Voir le bilan',
    en: 'View the recap',
    es: 'Ver el balance',
    de: 'Bilanz ansehen',
    pt: 'Ver o balanço',
  },
  /** L'ÉTAT DOMINANT aujourd'hui : aucune saison n'est encore close. */
  histoAucune: {
    fr: 'Aucune saison terminée pour l’instant. La première fera ton historique.',
    en: 'No season has ended yet. The first one will start your history.',
    es: 'Ninguna temporada ha terminado todavía. La primera creará tu historial.',
    de: 'Noch keine Saison beendet. Die erste beginnt deine Historie.',
    pt: 'Nenhuma temporada terminou ainda. A primeira vai começar seu histórico.',
  },
  histoEchec: {
    fr: 'Historique non chargé.',
    en: 'History not loaded.',
    es: 'Historial no cargado.',
    de: 'Historie nicht geladen.',
    pt: 'Histórico não carregado.',
  },

  // ── Les quatre états de l'écran, jamais confondus ─────────────────────────
  ecranChargement: {
    fr: 'Lecture de la saison…',
    en: 'Loading the season…',
    es: 'Cargando la temporada…',
    de: 'Saison wird geladen …',
    pt: 'Carregando a temporada…',
  },
  ecranDeconnecteTitre: {
    fr: 'Connecte-toi pour suivre ta saison',
    en: 'Sign in to follow your season',
    es: 'Inicia sesión para seguir tu temporada',
    de: 'Melde dich an für deine Saison',
    pt: 'Entre para acompanhar sua temporada',
  },
  ecranDeconnecteCorps: {
    fr: 'Rang, XP et récompenses appartiennent à un compte.',
    en: 'Rank, XP and rewards belong to an account.',
    es: 'Rango, XP y recompensas pertenecen a una cuenta.',
    de: 'Rang, XP und Belohnungen gehören zu einem Konto.',
    pt: 'Posição, XP e recompensas pertencem a uma conta.',
  },
  /** Lu, et il n'y a AUCUNE saison ouverte — distinct d'un échec. */
  ecranAucuneSaisonTitre: {
    fr: 'Aucune saison ouverte',
    en: 'No season open',
    es: 'Ninguna temporada abierta',
    de: 'Keine Saison offen',
    pt: 'Nenhuma temporada aberta',
  },
  ecranAucuneSaisonCorps: {
    fr: 'Ta ville n’a pas encore de saison en cours. Tes zones et ton XP, eux, ne bougent pas.',
    en: 'Your city has no running season yet. Your zones and XP stay put.',
    es: 'Tu ciudad aún no tiene temporada en curso. Tus zonas y tu XP no se mueven.',
    de: 'In deiner Stadt läuft noch keine Saison. Zonen und XP bleiben unberührt.',
    pt: 'Sua cidade ainda não tem temporada em andamento. Suas zonas e seu XP não mudam.',
  },
  ecranEchecTitre: {
    fr: 'Saison indisponible',
    en: 'Season unavailable',
    es: 'Temporada no disponible',
    de: 'Saison nicht verfügbar',
    pt: 'Temporada indisponível',
  },
  ecranEchecCorps: {
    fr: 'La lecture a échoué. On ne sait pas où en est la saison — on ne devine pas.',
    en: 'The read failed. We do not know where the season stands — we do not guess.',
    es: 'La lectura falló. No sabemos en qué punto está la temporada, y no lo adivinamos.',
    de: 'Das Laden schlug fehl. Wo die Saison steht, ist unbekannt — wir raten nicht.',
    pt: 'A leitura falhou. Não sabemos em que ponto está a temporada — e não adivinhamos.',
  },
  /**
   * ── LE BLOC XP A SES PROPRES QUATRE ÉTATS (28/07/2026) ────────────────────
   * `users.xp` se lit par un chemin INDÉPENDANT de la saison
   * (`useMyEconomy` vs la RPC `season_current`) : l'un peut échouer pendant que
   * l'autre réussit. La carte de rang disparaissait alors SANS UN MOT, et
   * l'écran attribuait la disparition à une absence de compte. Ces trois clés
   * donnent au bloc XP la voix qui lui manquait.
   */
  xpLecture: {
    fr: 'Lecture de ton XP…',
    en: 'Loading your XP…',
    es: 'Cargando tu XP…',
    de: 'Dein XP wird geladen …',
    pt: 'Carregando seu XP…',
  },
  xpEchecTitre: {
    fr: 'XP indisponible',
    en: 'XP unavailable',
    es: 'XP no disponible',
    de: 'XP nicht verfügbar',
    pt: 'XP indisponível',
  },
  xpEchecCorps: {
    fr: 'La lecture de ta progression a échoué. Ton XP n’a pas bougé — c’est l’affichage qui manque, pas les points.',
    en: 'Reading your progress failed. Your XP hasn’t moved — it’s the display that’s missing, not the points.',
    es: 'Falló la lectura de tu progreso. Tu XP no se movió: falta la vista, no los puntos.',
    de: 'Deine Fortschrittsdaten konnten nicht geladen werden. Dein XP ist unverändert — es fehlt die Anzeige, nicht die Punkte.',
    pt: 'A leitura do seu progresso falhou. Seu XP não mudou — o que falta é a exibição, não os pontos.',
  },
  ecranReessayer: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
});
