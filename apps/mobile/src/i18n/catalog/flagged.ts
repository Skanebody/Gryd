/**
 * GRYD — i18n : catalogue du domaine « flagged » (surfaces D8 hors MVP mais
 * expédiées derrière flags) : Saison (classement.tsx), Missions (warroom.tsx),
 * Arsenal (arsenal.tsx) et Collection de badges (badges.tsx — labels UI et
 * filtres uniquement, JAMAIS les noms du catalogue shared).
 *
 * INVARIANTS (jamais traduits, donc PAS ici) : GRYD, GO, Crew/Crews (concept —
 * gardé en Entry ×5 identiques pour l'onglet, comme RUN dans nav.ts), Éclats et
 * Foulées (monnaies du jeu, noms propres), Club, Co-Cap/Cap (rôles), Top 10,
 * pts/km/h/min/m (unités), noms propres (Paris, Lille, République…), pseudos,
 * noms de tiers/familles/skills venus de @klaim/shared, « max ».
 *
 * §A CONTRAIGNANT : chips/CTA/labels COURTS dans les 5 langues — l'allemand
 * est reformulé concis (SCHÜTZEN, ROUTE, SCHLEIFE BEENDEN, Truhe zeigen…),
 * jamais un composé à rallonge qui risquerait la troncature à 375 px.
 * Interpolation : mêmes {placeholders} dans les 5 langues.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ════════════════════════ SAISON (classement.tsx) ════════════════════════

  saisonKicker: {
    fr: 'SAISON 0 · SEMAINE {week}/{total} (DÉMO)',
    en: 'SEASON 0 · WEEK {week}/{total} (DEMO)',
    es: 'TEMPORADA 0 · SEMANA {week}/{total} (DEMO)',
    de: 'SAISON 0 · WOCHE {week}/{total} (DEMO)',
    pt: 'TEMPORADA 0 · SEMANA {week}/{total} (DEMO)',
  },
  saisonTitle: {
    fr: 'Saison',
    en: 'Season',
    es: 'Temporada',
    de: 'Saison',
    pt: 'Temporada',
  },

  // ── Onglets (Segmented) — « Crews » invariant, en Entry pour la parité ──
  tabJoueurs: {
    fr: 'Joueurs',
    en: 'Players',
    es: 'Jugadores',
    de: 'Spieler',
    pt: 'Jogadores',
  },
  tabCrews: {
    fr: 'Crews',
    en: 'Crews',
    es: 'Crews',
    de: 'Crews',
    pt: 'Crews',
  },
  tabVille: {
    fr: 'Ville',
    en: 'City',
    es: 'Ciudad',
    de: 'Stadt',
    pt: 'Cidade',
  },
  tabsA11y: {
    fr: 'Nature du classement',
    en: 'Leaderboard type',
    es: 'Tipo de clasificación',
    de: 'Art der Rangliste',
    pt: 'Tipo de ranking',
  },

  // ── Suffixe « toi » selon la nature du board (jamais de honte) ──
  suffixMoi: {
    fr: ' · toi',
    en: ' · you',
    es: ' · tú',
    de: ' · du',
    pt: ' · você',
  },
  suffixCrew: {
    fr: ' · ton crew',
    en: ' · your crew',
    es: ' · tu crew',
    de: ' · deine Crew',
    pt: ' · seu crew',
  },
  suffixVille: {
    fr: ' · ta ville',
    en: ' · your city',
    es: ' · tu ciudad',
    de: ' · deine Stadt',
    pt: ' · sua cidade',
  },

  // ── Bandeau mode discret (§10.3) ──
  discreetTitle: {
    fr: 'Mode discret actif',
    en: 'Discreet mode on',
    es: 'Modo discreto activo',
    de: 'Diskreter Modus aktiv',
    pt: 'Modo discreto ativo',
  },
  discreetText: {
    fr: "Ton rang n'apparaît pas dans les classements publics. Ta progression reste visible pour toi, dans ton profil.",
    en: "Your rank doesn't appear on public leaderboards. Your progress stays visible to you, in your profile.",
    es: 'Tu puesto no aparece en las clasificaciones públicas. Tu progreso sigue visible para ti, en tu perfil.',
    de: 'Dein Rang erscheint nicht in öffentlichen Ranglisten. Dein Fortschritt bleibt für dich sichtbar, in deinem Profil.',
    pt: 'Sua posição não aparece nos rankings públicos. Seu progresso continua visível para você, no seu perfil.',
  },

  // ── Bloc TOI : rang + écart + phrase-objectif + CTA ──
  enTete: {
    fr: 'en tête',
    en: 'in the lead',
    es: 'en cabeza',
    de: 'in Führung',
    pt: 'na liderança',
  },
  gapPts: {
    fr: '{pts} pts du #{rank}',
    en: '{pts} pts behind #{rank}',
    es: '{pts} pts del #{rank}',
    de: '{pts} Pkt. hinter #{rank}',
    pt: '{pts} pts do #{rank}',
  },
  toiHintLeader: {
    fr: 'Défends ton titre jusqu’à la fin de la saison.',
    en: 'Defend your title until the end of the season.',
    es: 'Defiende tu título hasta el final de la temporada.',
    de: 'Verteidige deinen Titel bis zum Saisonende.',
    pt: 'Defenda seu título até o fim da temporada.',
  },
  toiHintChase: {
    fr: '≈ {n} zones pour passer {name}.',
    en: '≈ {n} zones to pass {name}.',
    es: '≈ {n} zonas para superar a {name}.',
    de: '≈ {n} Zonen, um {name} zu überholen.',
    pt: '≈ {n} zonas para passar {name}.',
  },
  ctaDefendre: {
    fr: 'DÉFENDRE',
    en: 'DEFEND',
    es: 'DEFIENDE',
    de: 'SCHÜTZEN',
    pt: 'DEFENDER',
  },
  ctaMaRoute: {
    fr: 'MA ROUTE',
    en: 'MY ROUTE',
    es: 'MI RUTA',
    de: 'ROUTE',
    pt: 'MINHA ROTA',
  },

  // ── Note d'honnêteté + liste ──
  demoNote: {
    fr: 'Classement de démonstration — Saison 0 ouvre Paris et Lille, l’Europe suit.',
    en: 'Demo leaderboard — Season 0 opens Paris and Lille, Europe follows.',
    es: 'Clasificación de demostración — la Temporada 0 abre Paris y Lille, Europa sigue.',
    de: 'Demo-Rangliste — Saison 0 startet in Paris und Lille, Europa folgt.',
    pt: 'Ranking de demonstração — a Temporada 0 abre Paris e Lille, a Europa vem depois.',
  },
  seeAll: {
    fr: 'Voir tout',
    en: 'See all',
    es: 'Ver todo',
    de: 'Alle zeigen',
    pt: 'Ver tudo',
  },
  seeAllBoardA11y: {
    fr: 'Voir tout le classement',
    en: 'See the full leaderboard',
    es: 'Ver toda la clasificación',
    de: 'Die ganze Rangliste zeigen',
    pt: 'Ver o ranking completo',
  },

  // ── Récompenses Top 10 ──
  /** En-tête STATIQUE du catalogue des lots : montre CE QU'ON gagne, sans
   *  affirmer aucun timing. L'échéance réelle (« · J-n ») n'est suffixée à
   *  l'écran QUE si une saison serveur court (seasonActiveNow), dérivée de
   *  `season.endsAt` via seasonProgress — jamais de SEASON_DURATION_WEEKS. */
  rewardsLabelStatic: {
    fr: 'RÉCOMPENSES TOP 10',
    en: 'TOP 10 REWARDS',
    es: 'RECOMPENSAS TOP 10',
    de: 'TOP-10-BELOHNUNGEN',
    pt: 'RECOMPENSAS TOP 10',
  },
  /** Hint gris quand AUCUNE saison ne court : les lots sont un catalogue à
   *  débloquer, pas « jamais accessibles ». État 'none' du hook saison. */
  rewardsSeasonClosed: {
    fr: 'Saison pas encore ouverte',
    en: 'Season not open yet',
    es: 'Temporada aún no abierta',
    de: 'Saison noch nicht offen',
    pt: 'Temporada ainda não aberta',
  },
  /** …et l'échec de lecture de la saison (état 'error') : on dit l'échec, on
   *  n'affirme pas « aucune ». */
  rewardsSeasonError: {
    fr: 'Saison indisponible',
    en: 'Season unavailable',
    es: 'Temporada no disponible',
    de: 'Saison nicht verfügbar',
    pt: 'Temporada indisponível',
  },
  rewardHint: {
    fr: 'Tu es #{rank} — reste dans le Top 10 pour les débloquer.',
    en: 'You’re #{rank} — stay in the Top 10 to unlock them.',
    es: 'Eres #{rank} — quédate en el Top 10 para desbloquearlas.',
    de: 'Du bist #{rank} — bleib in den Top 10, um sie freizuschalten.',
    pt: 'Você é #{rank} — fique no Top 10 para desbloqueá-las.',
  },

  // ════════════════════════ MISSIONS (warroom.tsx) ═════════════════════════

  missionsTitle: {
    fr: 'Missions',
    en: 'Missions',
    es: 'Misiones',
    de: 'Missionen',
    pt: 'Missões',
  },
  missionsSubtitle: {
    fr: 'Ta prochaine mission, triée par urgence.',
    en: 'Your next mission, sorted by urgency.',
    es: 'Tu próxima misión, ordenada por urgencia.',
    de: 'Deine nächste Mission, nach Dringlichkeit sortiert.',
    pt: 'Sua próxima missão, em ordem de urgência.',
  },
  /** Compte à rebours du kicker HUD (« J-3 »). */
  jMinus: {
    fr: 'J-{n}',
    en: 'D-{n}',
    es: 'D-{n}',
    de: 'T-{n}',
    pt: 'D-{n}',
  },
  fenetreClose: {
    fr: 'Fenêtre close',
    en: 'Window closed',
    es: 'Ventana cerrada',
    de: 'Fenster zu',
    pt: 'Janela fechada',
  },

  // ── Natures de mission (kickers) ──
  kindDefense: {
    fr: 'DÉFENSE',
    en: 'DEFENSE',
    es: 'DEFENSA',
    de: 'ABWEHR',
    pt: 'DEFESA',
  },
  kindRevanche: {
    fr: 'REVANCHE',
    en: 'REVENGE',
    es: 'REVANCHA',
    de: 'REVANCHE',
    pt: 'REVANCHE',
  },
  kindRaid: {
    fr: 'RAID CREW',
    en: 'CREW RAID',
    es: 'RAID CREW',
    de: 'CREW-RAID',
    pt: 'RAID DO CREW',
  },
  kindConquete: {
    fr: 'CONQUÊTE CREW',
    en: 'CREW CONQUEST',
    es: 'CONQUISTA CREW',
    de: 'CREW-EROBERUNG',
    pt: 'CONQUISTA CREW',
  },
  kindBoucle: {
    fr: 'BOUCLE À TERMINER',
    en: 'LOOP TO FINISH',
    es: 'BUCLE POR CERRAR',
    de: 'SCHLEIFE OFFEN',
    pt: 'VOLTA POR FECHAR',
  },
  urgentKicker: {
    fr: 'URGENT · {kind}',
    en: 'URGENT · {kind}',
    es: 'URGENTE · {kind}',
    de: 'DRINGEND · {kind}',
    pt: 'URGENTE · {kind}',
  },
  prioKicker: {
    fr: '{kind} · PRIORITÉ 1',
    en: '{kind} · PRIORITY 1',
    es: '{kind} · PRIORIDAD 1',
    de: '{kind} · PRIORITÄT 1',
    pt: '{kind} · PRIORIDADE 1',
  },
  restant: {
    fr: 'restant',
    en: 'left',
    es: 'restante',
    de: 'übrig',
    pt: 'restante',
  },
  resteTime: {
    fr: 'reste {time}',
    en: '{time} left',
    es: 'quedan {time}',
    de: 'noch {time}',
    pt: 'faltam {time}',
  },
  heroDetailA11y: {
    fr: '{title} — voir le détail sur la carte',
    en: '{title} — view detail on the map',
    es: '{title} — ver el detalle en el mapa',
    de: '{title} — Detail auf der Karte zeigen',
    pt: '{title} — ver o detalhe no mapa',
  },
  boucleTitle: {
    fr: 'Boucle {zone}',
    en: '{zone} loop',
    es: 'Bucle {zone}',
    de: 'Schleife {zone}',
    pt: 'Volta {zone}',
  },

  // ── Métas (distance + enjeu chiffré) — gains toujours « ≈ » ──
  metaGainEst: {
    fr: '≈ +{pts} pts',
    en: '≈ +{pts} pts',
    es: '≈ +{pts} pts',
    de: '≈ +{pts} Pkt.',
    pt: '≈ +{pts} pts',
  },
  metaZonesReprendre: {
    fr: '{n} zones à reprendre',
    en: '{n} zones to take back',
    es: '{n} zonas por recuperar',
    de: '{n} Zonen zurückholen',
    pt: '{n} zonas a retomar',
  },
  metaZonesPrendre: {
    fr: '{n} zones à prendre',
    en: '{n} zones to take',
    es: '{n} zonas por tomar',
    de: '{n} Zonen zu holen',
    pt: '{n} zonas a tomar',
  },
  metaGainPerZone: {
    fr: '≈ +{pts} pts/zone',
    en: '≈ +{pts} pts/zone',
    es: '≈ +{pts} pts/zona',
    de: '≈ +{pts} Pkt./Zone',
    pt: '≈ +{pts} pts/zona',
  },
  metaResteM: {
    fr: 'reste {m} m à courir',
    en: '{m} m left to run',
    es: 'quedan {m} m por correr',
    de: 'noch {m} m zu laufen',
    pt: 'faltam {m} m de corrida',
  },

  // ── CTA pleins (hero) + verbes inline (lignes compactes) — COURTS (§A) ──
  actionDefendre: {
    fr: 'Défendre',
    en: 'Defend',
    es: 'Defiende',
    de: 'Schützen',
    pt: 'Defender',
  },
  ctaReprendre: {
    fr: 'REPRENDRE',
    en: 'TAKE BACK',
    es: 'RECUPERA',
    de: 'ZURÜCKHOLEN',
    pt: 'RETOMAR',
  },
  actionReprendre: {
    fr: 'Reprendre',
    en: 'Take back',
    es: 'Recupera',
    de: 'Zurückholen',
    pt: 'Retomar',
  },
  ctaCourirEncore: {
    fr: 'COURIR ENCORE',
    en: 'RUN AGAIN',
    es: 'CORRE OTRA VEZ',
    de: 'NOCHMAL LAUFEN',
    pt: 'CORRER DE NOVO',
  },
  actionCourirEncore: {
    fr: 'Courir encore',
    en: 'Run again',
    es: 'Corre otra vez',
    de: 'Nochmal laufen',
    pt: 'Correr de novo',
  },
  ctaRejoindreRaid: {
    fr: 'REJOINDRE LE RAID',
    en: 'JOIN THE RAID',
    es: 'ÚNETE AL RAID',
    de: 'RAID BEITRETEN',
    pt: 'ENTRAR NO RAID',
  },
  actionRejoindreRaid: {
    fr: 'Rejoindre le raid',
    en: 'Join the raid',
    es: 'Únete al raid',
    de: 'Raid beitreten',
    pt: 'Entrar no raid',
  },
  ctaConquerir: {
    fr: 'CONQUÉRIR',
    en: 'CONQUER',
    es: 'CONQUISTA',
    de: 'EROBERN',
    pt: 'CONQUISTAR',
  },
  actionConquerir: {
    fr: 'Conquérir',
    en: 'Conquer',
    es: 'Conquista',
    de: 'Erobern',
    pt: 'Conquistar',
  },
  ctaTerminerBoucle: {
    fr: 'TERMINER LA BOUCLE',
    en: 'FINISH THE LOOP',
    es: 'CIERRA EL BUCLE',
    de: 'SCHLEIFE BEENDEN',
    pt: 'FECHAR A VOLTA',
  },
  actionTerminer: {
    fr: 'Terminer',
    en: 'Finish',
    es: 'Cierra',
    de: 'Beenden',
    pt: 'Fechar',
  },
  ctaVoirRoute: {
    fr: 'VOIR LA ROUTE',
    en: 'VIEW ROUTE',
    es: 'VER LA RUTA',
    de: 'ROUTE ZEIGEN',
    pt: 'VER A ROTA',
  },
  actionVoirRoute: {
    fr: 'Voir la route',
    en: 'View route',
    es: 'Ver la ruta',
    de: 'Route zeigen',
    pt: 'Ver a rota',
  },

  // ── Toasts d'action (jamais de promesse serveur) ──
  toastDefense: {
    fr: 'Défense {zone} — choisis ta route',
    en: 'Defense {zone} — pick your route',
    es: 'Defensa {zone} — elige tu ruta',
    de: 'Abwehr {zone} — wähl deine Route',
    pt: 'Defesa {zone} — escolha sua rota',
  },
  toastRevanche: {
    fr: 'Cap sur {zone} — reprends tes zones',
    en: 'Head to {zone} — take back your zones',
    es: 'Rumbo a {zone} — recupera tus zonas',
    de: 'Auf nach {zone} — hol deine Zonen zurück',
    pt: 'Rumo a {zone} — retome suas zonas',
  },
  toastRaid: {
    fr: 'Raid rejoint — cap sur {zone}',
    en: 'Raid joined — head to {zone}',
    es: 'Te uniste al raid — rumbo a {zone}',
    de: 'Raid beigetreten — auf nach {zone}',
    pt: 'Você entrou no raid — rumo a {zone}',
  },
  toastConquete: {
    fr: 'Conquête collective rejointe — cap sur {zone}',
    en: 'Crew conquest joined — head to {zone}',
    es: 'Te uniste a la conquista — rumbo a {zone}',
    de: 'Eroberung beigetreten — auf nach {zone}',
    pt: 'Você entrou na conquista — rumo a {zone}',
  },
  toastBoucle: {
    fr: 'Cap sur {zone} — termine la boucle du crew',
    en: 'Head to {zone} — finish the crew’s loop',
    es: 'Rumbo a {zone} — cierra el bucle del crew',
    de: 'Auf nach {zone} — beende die Crew-Schleife',
    pt: 'Rumo a {zone} — feche a volta do crew',
  },
  toastCoffre: {
    fr: 'Cap sur le coffre — cours pour le remplir',
    en: 'Head for the chest — run to fill it',
    es: 'Rumbo al cofre — corre para llenarlo',
    de: 'Auf zur Truhe — lauf, um sie zu füllen',
    pt: 'Rumo ao baú — corra para enchê-lo',
  },
  toastPropose: {
    fr: 'Proposé (démo) — {pseudo} pour {mission}',
    en: 'Suggested (demo) — {pseudo} for {mission}',
    es: 'Propuesto (demo) — {pseudo} para {mission}',
    de: 'Vorgeschlagen (Demo) — {pseudo} für {mission}',
    pt: 'Sugerido (demo) — {pseudo} para {mission}',
  },
  emptyMissions: {
    fr: 'Aucune mission en cours — cours pour ouvrir le terrain, le crew suivra.',
    en: 'No missions right now — run to open ground, the crew will follow.',
    es: 'Ninguna misión en curso — corre para abrir terreno, el crew te seguirá.',
    de: 'Keine Mission gerade — lauf und öffne das Feld, die Crew folgt.',
    pt: 'Nenhuma missão no momento — corra para abrir terreno, o crew vai junto.',
  },
  sectionAutres: {
    fr: 'AUTRES MISSIONS',
    en: 'OTHER MISSIONS',
    es: 'OTRAS MISIONES',
    de: 'WEITERE MISSIONEN',
    pt: 'OUTRAS MISSÕES',
  },

  // ── Reco par skill (doc §29) — le nom du skill vient de shared (invariant) ──
  recoInfoPrefix: {
    fr: 'Recommandé : ',
    en: 'Recommended: ',
    es: 'Recomendado: ',
    de: 'Empfohlen: ',
    pt: 'Recomendado: ',
  },
  recoInfoA11y: {
    fr: 'Recommandé pour cette mission : {pseudo} · {skill}',
    en: 'Recommended for this mission: {pseudo} · {skill}',
    es: 'Recomendado para esta misión: {pseudo} · {skill}',
    de: 'Für diese Mission empfohlen: {pseudo} · {skill}',
    pt: 'Recomendado para esta missão: {pseudo} · {skill}',
  },
  recoProposePrefix: {
    fr: 'Proposer à ',
    en: 'Suggest to ',
    es: 'Proponer a ',
    de: 'Vorschlagen an ',
    pt: 'Sugerir a ',
  },
  recoProposeA11y: {
    fr: 'Proposer la mission à {pseudo} — {skill}',
    en: 'Suggest the mission to {pseudo} — {skill}',
    es: 'Proponer la misión a {pseudo} — {skill}',
    de: 'Die Mission {pseudo} vorschlagen — {skill}',
    pt: 'Sugerir a missão a {pseudo} — {skill}',
  },

  // ── Coffre crew : paliers (surface uniquement — clés moteur inchangées) ──
  tierBronze: {
    fr: 'Bronze',
    en: 'Bronze',
    es: 'Bronce',
    de: 'Bronze',
    pt: 'Bronze',
  },
  tierArgent: {
    fr: 'Argent',
    en: 'Silver',
    es: 'Plata',
    de: 'Silber',
    pt: 'Prata',
  },
  tierOr: {
    fr: 'Or',
    en: 'Gold',
    es: 'Oro',
    de: 'Gold',
    pt: 'Ouro',
  },
  tierCarbone: {
    fr: 'Carbone',
    en: 'Carbon',
    es: 'Carbono',
    de: 'Karbon',
    pt: 'Carbono',
  },
  tierElite: {
    fr: 'Élite',
    en: 'Elite',
    es: 'Élite',
    de: 'Elite',
    pt: 'Elite',
  },
  /** Repli si aucun palier nommé — identique partout, en Entry pour la parité. */
  tierMax: {
    fr: 'max',
    en: 'max',
    es: 'max',
    de: 'max',
    pt: 'max',
  },
  chestPhraseNext: {
    fr: '{pct} % — encore {pts} pts pour le palier {tier}.',
    en: '{pct}% — {pts} pts to the {tier} tier.',
    es: '{pct} % — faltan {pts} pts para el nivel {tier}.',
    de: '{pct} % — noch {pts} Pkt. bis Stufe {tier}.',
    pt: '{pct}% — faltam {pts} pts para o nível {tier}.',
  },
  chestPhraseMax: {
    fr: '{pct} % — palier {tier} atteint cette semaine.',
    en: '{pct}% — {tier} tier reached this week.',
    es: '{pct} % — nivel {tier} alcanzado esta semana.',
    de: '{pct} % — Stufe {tier} diese Woche erreicht.',
    pt: '{pct}% — nível {tier} alcançado esta semana.',
  },
  coffreTitle: {
    fr: 'Coffre du crew',
    en: 'Crew chest',
    es: 'Cofre del crew',
    de: 'Crew-Truhe',
    pt: 'Baú do crew',
  },
  coffreA11y: {
    fr: 'Coffre du crew — {phrase} Voir le coffre.',
    en: 'Crew chest — {phrase} View the chest.',
    es: 'Cofre del crew — {phrase} Ver el cofre.',
    de: 'Crew-Truhe — {phrase} Truhe zeigen.',
    pt: 'Baú do crew — {phrase} Ver o baú.',
  },
  voirCoffre: {
    fr: 'Voir le coffre',
    en: 'View chest',
    es: 'Ver el cofre',
    de: 'Truhe zeigen',
    pt: 'Ver o baú',
  },

  // ── Bonus crew actif (AMENDEMENT-19 §4) ──
  bonusKicker: {
    fr: 'BONUS CREW ACTIF',
    en: 'CREW BONUS ACTIVE',
    es: 'BONUS CREW ACTIVO',
    de: 'CREW-BONUS AKTIV',
    pt: 'BÔNUS DO CREW ATIVO',
  },
  bonusPendant: {
    fr: 'pendant {h} h',
    en: 'for {h} h',
    es: 'durante {h} h',
    de: 'für {h} h',
    pt: 'por {h} h',
  },

  // ── Demander au crew (AMENDEMENT-18 A.3) ──
  askCrewA11y: {
    fr: "Demander de l'aide au crew",
    en: 'Ask the crew for help',
    es: 'Pedir ayuda al crew',
    de: 'Die Crew um Hilfe bitten',
    pt: 'Pedir ajuda ao crew',
  },
  askCrewTitle: {
    fr: 'Demander au crew',
    en: 'Ask the crew',
    es: 'Pide al crew',
    de: 'Crew fragen',
    pt: 'Pedir ao crew',
  },
  askCrewSub: {
    fr: 'Défense · Terminer · Route · Scout',
    en: 'Defense · Finish · Route · Scout',
    es: 'Defensa · Cerrar · Ruta · Scout',
    de: 'Abwehr · Beenden · Route · Scout',
    pt: 'Defesa · Fechar · Rota · Scout',
  },

  // ── Sections repliées + toggles ──
  sectionObjectifs: {
    fr: 'OBJECTIFS',
    en: 'GOALS',
    es: 'OBJETIVOS',
    de: 'ZIELE',
    pt: 'OBJETIVOS',
  },
  sectionRoutes: {
    fr: 'ROUTES',
    en: 'ROUTES',
    es: 'RUTAS',
    de: 'ROUTEN',
    pt: 'ROTAS',
  },
  sectionScout: {
    fr: 'RAPPORTS SCOUT',
    en: 'SCOUT REPORTS',
    es: 'INFORMES SCOUT',
    de: 'SCOUT-BERICHTE',
    pt: 'RELATÓRIOS SCOUT',
  },
  sectionHistorique: {
    fr: 'HISTORIQUE',
    en: 'HISTORY',
    es: 'HISTORIAL',
    de: 'VERLAUF',
    pt: 'HISTÓRICO',
  },
  toggleOpenA11y: {
    fr: 'Déplier {label}',
    en: 'Expand {label}',
    es: 'Desplegar {label}',
    de: '{label} ausklappen',
    pt: 'Expandir {label}',
  },
  toggleCloseA11y: {
    fr: 'Replier {label}',
    en: 'Collapse {label}',
    es: 'Plegar {label}',
    de: '{label} einklappen',
    pt: 'Recolher {label}',
  },

  // ── Rôle + permissions (matrice §8 — Co-Cap/Cap invariants) ──
  roleLabel: {
    fr: 'Ton rôle : {role}',
    en: 'Your role: {role}',
    es: 'Tu rol: {role}',
    de: 'Deine Rolle: {role}',
    pt: 'Seu papel: {role}',
  },
  permCanLaunch: {
    fr: 'Peut lancer',
    en: 'Can launch',
    es: 'Puede lanzar',
    de: 'Darf starten',
    pt: 'Pode lançar',
  },
  permLaunchNo: {
    fr: 'Lancer : Co-Cap+',
    en: 'Launch: Co-Cap+',
    es: 'Lanzar: Co-Cap+',
    de: 'Starten: Co-Cap+',
    pt: 'Lançar: Co-Cap+',
  },
  permCanAssign: {
    fr: 'Peut assigner',
    en: 'Can assign',
    es: 'Puede asignar',
    de: 'Darf zuweisen',
    pt: 'Pode atribuir',
  },
  permAssignNo: {
    fr: 'Assigner : Cap+',
    en: 'Assign: Cap+',
    es: 'Asignar: Cap+',
    de: 'Zuweisen: Cap+',
    pt: 'Atribuir: Cap+',
  },

  // ── Chips motivation (cohérents avec le catalogue motivation) ──
  motivAujourdhui: {
    fr: "Aujourd'hui",
    en: 'Today',
    es: 'Hoy',
    de: 'Heute',
    pt: 'Hoje',
  },
  motivChallenges: {
    fr: 'Challenges',
    en: 'Challenges',
    es: 'Desafíos',
    de: 'Challenges',
    pt: 'Desafios',
  },
  motivMotivation: {
    fr: 'Motivation',
    en: 'Motivation',
    es: 'Motivación',
    de: 'Motivation',
    pt: 'Motivação',
  },

  // ── « Voir tout / Voir les N » ──
  seeAllObjectifs: {
    fr: 'Voir les {n} objectifs',
    en: 'See all {n} goals',
    es: 'Ver los {n} objetivos',
    de: 'Alle {n} Ziele zeigen',
    pt: 'Ver os {n} objetivos',
  },
  seeAllRoutes: {
    fr: 'Voir les {n} routes',
    en: 'See all {n} routes',
    es: 'Ver las {n} rutas',
    de: 'Alle {n} Routen zeigen',
    pt: 'Ver as {n} rotas',
  },
  seeAllHistory: {
    fr: "Voir tout l'historique",
    en: 'See full history',
    es: 'Ver todo el historial',
    de: 'Ganzen Verlauf zeigen',
    pt: 'Ver todo o histórico',
  },

  // ── Routes + scout ──
  routeA11y: {
    fr: 'Voir la route {label} sur la carte',
    en: 'View route {label} on the map',
    es: 'Ver la ruta {label} en el mapa',
    de: 'Route {label} auf der Karte zeigen',
    pt: 'Ver a rota {label} no mapa',
  },
  routeExpire: {
    fr: 'expire dans {h} h',
    en: 'expires in {h} h',
    es: 'caduca en {h} h',
    de: 'läuft in {h} h ab',
    pt: 'expira em {h} h',
  },
  routeOuverte: {
    fr: 'Ouverte',
    en: 'Open',
    es: 'Abierta',
    de: 'Offen',
    pt: 'Aberta',
  },
  routeADefendre: {
    fr: 'À défendre',
    en: 'To defend',
    es: 'Por defender',
    de: 'Zu schützen',
    pt: 'A defender',
  },
  scoutZone: {
    fr: '{zone} · scout {name}',
    en: '{zone} · scout {name}',
    es: '{zone} · scout {name}',
    de: '{zone} · Scout {name}',
    pt: '{zone} · scout {name}',
  },

  // ════════════════════════ ARSENAL (arsenal.tsx) ══════════════════════════
  // Éclats / Foulées / Club = monnaies et statut du jeu, invariants partout.

  arsenalTitle: {
    fr: 'Arsenal',
    en: 'Arsenal',
    es: 'Arsenal',
    de: 'Arsenal',
    pt: 'Arsenal',
  },
  arsenalKicker: {
    fr: 'ARSENAL · SAISON 0',
    en: 'ARSENAL · SEASON 0',
    es: 'ARSENAL · TEMPORADA 0',
    de: 'ARSENAL · SAISON 0',
    pt: 'ARSENAL · TEMPORADA 0',
  },
  clubActive: {
    fr: 'Club : actif',
    en: 'Club: active',
    es: 'Club: activo',
    de: 'Club: aktiv',
    pt: 'Club: ativo',
  },
  clubInactive: {
    fr: 'Club : inactif',
    en: 'Club: inactive',
    es: 'Club: inactivo',
    de: 'Club: inaktiv',
    pt: 'Club: inativo',
  },

  // ── Bannière anti-pay-to-win (copy §28) ──
  bannerStrong: {
    fr: "Le territoire ne s'achète pas.",
    en: 'Territory can’t be bought.',
    es: 'El territorio no se compra.',
    de: 'Gebiet kann man nicht kaufen.',
    pt: 'Território não se compra.',
  },
  bannerSoft: {
    fr: "Le style, le statut et l'organisation, oui.",
    en: 'Style, status and organization — yes.',
    es: 'El estilo, el estatus y la organización, sí.',
    de: 'Style, Status und Organisation schon.',
    pt: 'Estilo, status e organização, sim.',
  },

  // ── Reveal + statuts d'objet ──
  lootEquipped: {
    fr: 'Équipé',
    en: 'Equipped',
    es: 'Equipado',
    de: 'Ausgerüstet',
    pt: 'Equipado',
  },
  lootGifted: {
    fr: 'Offert au crew',
    en: 'Gifted to the crew',
    es: 'Regalado al crew',
    de: 'An die Crew verschenkt',
    pt: 'Presenteado ao crew',
  },
  lootOwnedSub: {
    fr: 'Dans ton arsenal',
    en: 'In your arsenal',
    es: 'En tu arsenal',
    de: 'In deinem Arsenal',
    pt: 'No seu arsenal',
  },
  possede: {
    fr: 'Possédé',
    en: 'Owned',
    es: 'Adquirido',
    de: 'Im Besitz',
    pt: 'Adquirido',
  },
  exclusifPack: {
    fr: 'Exclusif au pack',
    en: 'Pack exclusive',
    es: 'Exclusivo del pack',
    de: 'Nur im Pack',
    pt: 'Exclusivo do pack',
  },

  // ── Messages gifting + solde insuffisant (chiffré, jamais de nudge) ──
  giftFeedAnon: {
    fr: 'Un membre a offert {item} au crew. Message posté sans nom.',
    en: 'A member gifted {item} to the crew. Posted without a name.',
    es: 'Un miembro regaló {item} al crew. Mensaje publicado sin nombre.',
    de: 'Ein Mitglied hat {item} an die Crew verschenkt. Ohne Namen gepostet.',
    pt: 'Um membro presenteou {item} ao crew. Mensagem postada sem nome.',
  },
  giftFeedNamed: {
    fr: 'Tu as offert {item} au crew. Message posté au feed.',
    en: 'You gifted {item} to the crew. Posted to the feed.',
    es: 'Regalaste {item} al crew. Mensaje publicado en el feed.',
    de: 'Du hast {item} an die Crew verschenkt. Im Feed gepostet.',
    pt: 'Você presenteou {item} ao crew. Mensagem postada no feed.',
  },
  missingEclats: {
    fr: 'Il te manque {n} Éclats pour cet objet.',
    en: 'You’re {n} Éclats short for this item.',
    es: 'Te faltan {n} Éclats para este objeto.',
    de: 'Dir fehlen {n} Éclats für dieses Objekt.',
    pt: 'Faltam {n} Éclats para este item.',
  },

  // ── Exploration par besoin ──
  exploreLabel: {
    fr: 'EXPLORER PAR BESOIN',
    en: 'BROWSE BY NEED',
    es: 'EXPLORA POR NECESIDAD',
    de: 'NACH BEDARF STÖBERN',
    pt: 'EXPLORAR POR NECESSIDADE',
  },
  needA11y: {
    fr: 'Besoin Arsenal',
    en: 'Arsenal need',
    es: 'Necesidad Arsenal',
    de: 'Arsenal-Bedarf',
    pt: 'Necessidade Arsenal',
  },
  noteSorting: {
    fr: 'Tri en cours : carte, crew, série, partage et solde.',
    en: 'Sorting: map, crew, streak, sharing and balance.',
    es: 'Ordenando: mapa, crew, racha, compartir y saldo.',
    de: 'Sortierung läuft: Karte, Crew, Serie, Teilen und Guthaben.',
    pt: 'Ordenando: mapa, crew, sequência, compartilhar e saldo.',
  },
  noteSorted: {
    fr: 'Trié selon ton jeu : carte, crew, série, solde et objets possédés.',
    en: 'Sorted by your game: map, crew, streak, balance and owned items.',
    es: 'Ordenado según tu juego: mapa, crew, racha, saldo y objetos que ya tienes.',
    de: 'Sortiert nach deinem Spiel: Karte, Crew, Serie, Guthaben und Besitz.',
    pt: 'Ordenado pelo seu jogo: mapa, crew, sequência, saldo e itens que você tem.',
  },
  noteFiltered: {
    fr: 'Même catalogue, filtré par utilité immédiate. Le détail explique toujours la limite.',
    en: 'Same catalog, filtered by immediate use. The detail always explains the limit.',
    es: 'El mismo catálogo, filtrado por utilidad inmediata. El detalle siempre explica el límite.',
    de: 'Gleicher Katalog, nach Nutzen gefiltert. Das Detail erklärt immer das Limit.',
    pt: 'Mesmo catálogo, filtrado por utilidade imediata. O detalhe sempre explica o limite.',
  },
  footnote: {
    fr: 'Aucun objet ne vend des zones, des kilomètres, une victoire ou un rang de ligue — tout ça se gagne en courant. Les Éclats servent au style ; le confort reste capé.',
    en: 'No item sells zones, kilometers, a win or a league rank — all of that is earned by running. Éclats are for style; comfort stays capped.',
    es: 'Ningún objeto vende zonas, kilómetros, una victoria ni un puesto de liga — todo eso se gana corriendo. Los Éclats son para el estilo; la comodidad tiene tope.',
    de: 'Kein Objekt verkauft Zonen, Kilometer, Siege oder einen Liga-Rang — all das erläufst du dir. Éclats sind für den Style; Komfort bleibt gedeckelt.',
    pt: 'Nenhum item vende zonas, quilômetros, vitória ou posição de liga — tudo isso se ganha correndo. Os Éclats são para o estilo; o conforto tem teto.',
  },
  footnoteSub: {
    fr: 'Les Foulées se gagnent en courant — bientôt dépensables.',
    en: 'Foulées are earned by running — spendable soon.',
    es: 'Las Foulées se ganan corriendo — pronto podrás gastarlas.',
    de: 'Foulées verdienst du beim Laufen — bald einlösbar.',
    pt: 'As Foulées se ganham correndo — em breve você poderá gastá-las.',
  },

  // ── Advisor + cartes + CTA ──
  choisiPourToi: {
    fr: 'CHOISI POUR TOI',
    en: 'PICKED FOR YOU',
    es: 'ELEGIDO PARA TI',
    de: 'FÜR DICH GEWÄHLT',
    pt: 'ESCOLHIDO PARA VOCÊ',
  },
  voirDetails: {
    fr: 'Voir détails',
    en: 'See details',
    es: 'Ver detalles',
    de: 'Details zeigen',
    pt: 'Ver detalhes',
  },
  obtenir: {
    fr: 'Obtenir',
    en: 'Get',
    es: 'Obtener',
    de: 'Holen',
    pt: 'Obter',
  },
  obtenirPrice: {
    fr: 'Obtenir · {price}',
    en: 'Get · {price}',
    es: 'Obtener · {price}',
    de: 'Holen · {price}',
    pt: 'Obter · {price}',
  },
  equiper: {
    fr: 'Équiper',
    en: 'Equip',
    es: 'Equipar',
    de: 'Ausrüsten',
    pt: 'Equipar',
  },

  // ── Lignes d'explication (3 lignes max) — labels COURTS (colonne 80 px) ──
  labelSertA: {
    fr: 'Sert à',
    en: 'For',
    es: 'Para',
    de: 'Wofür',
    pt: 'Para quê',
  },
  labelLimite: {
    fr: 'Limite',
    en: 'Limit',
    es: 'Límite',
    de: 'Limit',
    pt: 'Limite',
  },
  labelPourquoi: {
    fr: 'Pourquoi',
    en: 'Why',
    es: 'Por qué',
    de: 'Warum',
    pt: 'Por quê',
  },
  labelComment: {
    fr: 'Comment',
    en: 'How',
    es: 'Cómo',
    de: 'Wie',
    pt: 'Como',
  },

  // ── Détail item (sheet §25) ──
  saison1Suffix: {
    fr: ' · Saison 1',
    en: ' · Season 1',
    es: ' · Temporada 1',
    de: ' · Saison 1',
    pt: ' · Temporada 1',
  },
  plafond: {
    fr: 'Plafond : {limit}',
    en: 'Cap: {limit}',
    es: 'Tope: {limit}',
    de: 'Limit: {limit}',
    pt: 'Teto: {limit}',
  },
  visibleCarte: {
    fr: 'Visible sur ta carte à la Saison 0.',
    en: 'Visible on your map in Season 0.',
    es: 'Visible en tu mapa en la Temporada 0.',
    de: 'In Saison 0 auf deiner Karte sichtbar.',
    pt: 'Visível no seu mapa na Temporada 0.',
  },
  deviseA11y: {
    fr: 'Devise de paiement',
    en: 'Payment currency',
    es: 'Moneda de pago',
    de: 'Zahlungswährung',
    pt: 'Moeda de pagamento',
  },
  bientotSaison1: {
    fr: 'Bientôt — Saison 1',
    en: 'Soon — Season 1',
    es: 'Pronto — Temporada 1',
    de: 'Bald — Saison 1',
    pt: 'Em breve — Temporada 1',
  },
  fermer: {
    fr: 'Fermer',
    en: 'Close',
    es: 'Cerrar',
    de: 'Schließen',
    pt: 'Fechar',
  },
  annuler: {
    fr: 'Annuler',
    en: 'Cancel',
    es: 'Cancelar',
    de: 'Abbrechen',
    pt: 'Cancelar',
  },

  // ── Gifting « Offrir au crew » (§14) ──
  offrirCrew: {
    fr: 'Offrir au crew',
    en: 'Gift to the crew',
    es: 'Regalar al crew',
    de: 'An die Crew verschenken',
    pt: 'Presentear o crew',
  },
  cadeauCosmetique: {
    fr: 'Cadeau cosmétique au crew',
    en: 'Cosmetic gift for the crew',
    es: 'Regalo cosmético para el crew',
    de: 'Kosmetik-Geschenk an die Crew',
    pt: 'Presente cosmético para o crew',
  },
  contribLine: {
    fr: 'Tous les runs comptent plus fort pour le coffre.',
    en: 'Every run counts harder toward the chest.',
    es: 'Todas las carreras cuentan más para el cofre.',
    de: 'Jeder Lauf zählt stärker für die Truhe.',
    pt: 'Toda corrida conta mais para o baú.',
  },
  contribStrong: {
    fr: 'Aucune obligation. La victoire reste sur la route.',
    en: 'No obligation. Victory stays on the road.',
    es: 'Sin obligación. La victoria sigue en la calle.',
    de: 'Keine Pflicht. Der Sieg bleibt auf der Straße.',
    pt: 'Nenhuma obrigação. A vitória continua na rua.',
  },
  offrirAnonyme: {
    fr: 'Offrir anonymement',
    en: 'Gift anonymously',
    es: 'Regalar de forma anónima',
    de: 'Anonym verschenken',
    pt: 'Presentear anonimamente',
  },
  anonymeSub: {
    fr: 'Le feed dira « Un membre a offert… » — jamais ton nom ni le montant.',
    en: 'The feed will say “A member gifted…” — never your name or the amount.',
    es: 'El feed dirá «Un miembro regaló…» — nunca tu nombre ni el importe.',
    de: 'Der Feed sagt „Ein Mitglied hat verschenkt…“ — nie dein Name, nie der Betrag.',
    pt: 'O feed dirá “Um membro presenteou…” — nunca seu nome nem o valor.',
  },
  giftCap: {
    fr: '{n} boost actif à la fois · tout le crew en profite · aucun montant affiché.',
    en: '{n} boost active at a time · the whole crew benefits · no amount shown.',
    es: '{n} boost activo a la vez · todo el crew se beneficia · ningún importe visible.',
    de: '{n} Boost gleichzeitig aktiv · die ganze Crew profitiert · kein Betrag sichtbar.',
    pt: '{n} boost ativo por vez · todo o crew aproveita · nenhum valor exibido.',
  },
  offrirPrice: {
    fr: 'Offrir · {price}',
    en: 'Gift · {price}',
    es: 'Regalar · {price}',
    de: 'Verschenken · {price}',
    pt: 'Presentear · {price}',
  },

  // ── BADGES : catalogue déménagé (21/07/2026) ──
  //
  // Les ~26 Entry du châssis de /badges (titre, filtres, états, a11y, sheet de
  // détail) vivaient ICI, orphelines : l'écran Collection était en français en
  // dur et n'en lisait aucune. Le chantier i18n leur a donné un catalogue dédié,
  // `src/i18n/catalog/badges.ts`, que l'écran consomme réellement — mais la
  // première copie était restée, si bien que DEUX catalogues définissaient les
  // mêmes libellés d'un même écran et que le prochain à éditer flagged.ts aurait
  // cru agir sur /badges. Cette copie a donc été supprimée : une seule source.
  //
  // ═══════════ ÉTATS VIDES DES SURFACES FLAGGÉES (21/07/2026) ═══════════
  //
  // Le mode vitrine est ABANDONNÉ (EXPO_PUBLIC_SHOWCASE supprimé).
  // Ces trois écrans (Saison · Missions · Arsenal) étaient PEUPLÉS de démo :
  // classements de joueurs inexistants, missions de crew fabriquées, solde de
  // 820 Éclats que personne n'a gagnés. Hors vitrine, ils affichent désormais ce
  // qui est vrai — c'est-à-dire souvent rien — et ces textes disent ce « rien »
  // sans laisser de trou : ce qui manque, et l'unique geste qui fait avancer.

  // ── Saison (classement.tsx) ──
  /** Kicker hors vitrine : aucune fenêtre de saison n'est lue du serveur, donc
   *  aucune semaine n'est annoncée (« SEMAINE 3/8 » était une valeur démo). */
  saisonKickerReal: {
    fr: 'SAISON 0',
    en: 'SEASON 0',
    es: 'TEMPORADA 0',
    de: 'SAISON 0',
    pt: 'TEMPORADA 0',
  },
  boardSignedOutTitle: {
    fr: 'Classement réservé aux comptes',
    en: 'Leaderboard needs an account',
    es: 'La clasificación necesita una cuenta',
    de: 'Rangliste braucht ein Konto',
    pt: 'O ranking precisa de uma conta',
  },
  boardSignedOutBody: {
    fr: 'Connecte-toi pour voir où tu te situes cette saison.',
    en: 'Sign in to see where you stand this season.',
    es: 'Conéctate para ver tu posición esta temporada.',
    de: 'Melde dich an und sieh, wo du diese Saison stehst.',
    pt: 'Entre para ver sua posição nesta temporada.',
  },
  boardSignIn: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Conectarse',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  /** Lu, et rien reçu — sans distinguer « personne n'a encore couru » d'un échec
   *  réseau, parce que la lecture ne le dit pas. On énonce le FAIT observable. */
  boardEmptyTitle: {
    fr: 'Rien à classer pour l’instant',
    en: 'Nothing to rank yet',
    es: 'Nada que clasificar aún',
    de: 'Noch nichts zu werten',
    pt: 'Nada para classificar ainda',
  },
  boardEmptyBody: {
    fr: 'Aucun score reçu pour cette saison. Un run compté, et ta ligne apparaît ici.',
    en: 'No scores received for this season. One counted run and your row shows up here.',
    es: 'No hay puntajes de esta temporada. Con una carrera contada, tu línea aparece aquí.',
    de: 'Keine Punkte für diese Saison empfangen. Ein gewerteter Lauf, und deine Zeile erscheint hier.',
    pt: 'Nenhuma pontuação recebida nesta temporada. Uma corrida contada e sua linha aparece aqui.',
  },
  boardEmptyCta: {
    fr: 'Trouver une route',
    en: 'Find a route',
    es: 'Buscar una ruta',
    de: 'Route finden',
    pt: 'Encontrar uma rota',
  },
  /** Crews et Villes n'ont AUCUNE source serveur : ce n'est pas « vide », c'est
   *  « pas encore construit ». Le dire évite de faire attendre pour rien. */
  boardNoSourceTitle: {
    fr: 'Pas encore ouvert',
    en: 'Not open yet',
    es: 'Aún no está abierto',
    de: 'Noch nicht offen',
    pt: 'Ainda não aberto',
  },
  boardNoSourceCrews: {
    fr: 'Le classement des crews ouvrira quand assez de crews joueront. Rien à afficher d’ici là — on préfère le vide au faux.',
    en: 'The crew leaderboard opens once enough crews are playing. Nothing to show until then — empty beats fake.',
    es: 'La clasificación de crews abrirá cuando haya suficientes crews jugando. Nada que mostrar hasta entonces — mejor vacío que falso.',
    de: 'Die Crew-Rangliste öffnet, sobald genug Crews spielen. Bis dahin nichts — lieber leer als erfunden.',
    pt: 'O ranking de crews abre quando houver crews suficientes jogando. Nada até lá — melhor vazio que falso.',
  },
  boardNoSourceVille: {
    fr: 'Le classement des villes ouvrira quand plusieurs villes seront jouées. Rien à afficher d’ici là — on préfère le vide au faux.',
    en: 'The city leaderboard opens once several cities are being played. Nothing to show until then — empty beats fake.',
    es: 'La clasificación de ciudades abrirá cuando se jueguen varias ciudades. Nada que mostrar hasta entonces — mejor vacío que falso.',
    de: 'Die Städte-Rangliste öffnet, sobald mehrere Städte gespielt werden. Bis dahin nichts — lieber leer als erfunden.',
    pt: 'O ranking de cidades abre quando várias cidades estiverem em jogo. Nada até lá — melhor vazio que falso.',
  },
  boardLoading: {
    fr: 'Lecture du classement…',
    en: 'Loading the leaderboard…',
    es: 'Cargando la clasificación…',
    de: 'Rangliste wird geladen…',
    pt: 'Carregando o ranking…',
  },

  // ── Missions / War Room (warroom.tsx) ──
  warNoDataTitle: {
    fr: 'Pas encore de missions',
    en: 'No missions yet',
    es: 'Aún no hay misiones',
    de: 'Noch keine Missionen',
    pt: 'Ainda sem missões',
  },
  warNoDataBody: {
    fr: 'Les missions naissent de zones réellement tenues et de frontières réellement ouvertes. Tant que rien n’a été couru près de toi, il n’y a rien à donner.',
    en: 'Missions come from ground actually held and borders actually open. Until something has been run near you, there is nothing to hand out.',
    es: 'Las misiones nacen de zonas realmente tomadas y fronteras realmente abiertas. Hasta que se corra algo cerca de ti, no hay nada que dar.',
    de: 'Missionen entstehen aus wirklich gehaltenem Gebiet und wirklich offenen Grenzen. Solange bei dir nichts gelaufen wurde, gibt es nichts zu vergeben.',
    pt: 'As missões nascem de zonas realmente tomadas e fronteiras realmente abertas. Enquanto nada for corrido perto de você, não há o que dar.',
  },
  warNoDataCta: {
    fr: 'Voir la carte',
    en: 'Open the map',
    es: 'Ver el mapa',
    de: 'Karte öffnen',
    pt: 'Ver o mapa',
  },

  // ── Arsenal (arsenal.tsx) ──
  /** Solde non lu : « 0 » nu laisserait croire à un compte vide plutôt qu'à une
   *  absence de lecture. Le tiret dit « inconnu », la note dit pourquoi. */
  walletUnknown: {
    fr: '—',
    en: '—',
    es: '—',
    de: '—',
    pt: '—',
  },
  walletSignedOutNote: {
    fr: 'Connecte-toi pour voir ton solde et ton inventaire. Rien n’est affiché tant qu’on ne l’a pas lu.',
    en: 'Sign in to see your balance and inventory. Nothing is shown until it has been read.',
    es: 'Conéctate para ver tu saldo y tu inventario. No se muestra nada hasta haberlo leído.',
    de: 'Melde dich an, um Guthaben und Inventar zu sehen. Nichts wird gezeigt, bevor es gelesen wurde.',
    pt: 'Entre para ver seu saldo e inventário. Nada aparece antes de ser lido.',
  },
  walletUnreadNote: {
    fr: 'Solde et inventaire non lus pour l’instant — on ne devine pas un compte.',
    en: 'Balance and inventory not loaded — we don’t guess an account.',
    es: 'Saldo e inventario sin cargar — no adivinamos una cuenta.',
    de: 'Guthaben und Inventar nicht geladen — wir raten kein Konto.',
    pt: 'Saldo e inventário não carregados — não adivinhamos uma conta.',
  },
});
