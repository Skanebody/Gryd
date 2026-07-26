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
    pt: 'A tua posição na classificação',
  },
  /** Écart EXPLICITE, dans l'unité RÉELLE du board (points, jamais des km²). */
  gapPourPasser: {
    fr: '{pts} pts pour passer #{rank}',
    en: '{pts} pts to pass #{rank}',
    es: '{pts} pts para pasar a #{rank}',
    de: '{pts} Pkt. bis #{rank}',
    pt: '{pts} pts para passar #{rank}',
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
    pt: 'Ainda não apareces nesta classificação.',
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
    pt: 'O teu posto local aparece após a primeira corrida contada.',
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
    pt: 'Termina no top {n} local.',
  },
  conditionPremier: {
    fr: 'Termine #1 local.',
    en: 'Finish local #1.',
    es: 'Termina #1 local.',
    de: 'Beende als lokale Nr. 1.',
    pt: 'Termina em #1 local.',
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
    pt: 'A carregar as tuas recompensas…',
  },
  badgesConnexion: {
    fr: 'Connecte-toi pour voir ce que tu as déjà obtenu.',
    en: 'Sign in to see what you’ve already earned.',
    es: 'Inicia sesión para ver lo que ya has obtenido.',
    de: 'Melde dich an, um deine Erfolge zu sehen.',
    pt: 'Entra para ver o que já obtiveste.',
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
    pt: 'Ninguém está classificado de bike na tua cidade nesta temporada.',
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
});
