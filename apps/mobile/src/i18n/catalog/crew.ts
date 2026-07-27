/**
 * GRYD — catalogue i18n du domaine CREW (Crew HQ, édition, page publique,
 * découverte + labels UI des stores features/crew). Parité 5 langues imposée
 * par le type Entry (fr/en/es/de/pt) — une langue manquante = erreur TS.
 *
 * INVARIANTS jamais traduits : GRYD, GO, Crew (concept/onglet), CREW HQ,
 * @handles, noms propres (République, Bastille…), H3, km, min, h, XP,
 * vocabulaire de jeu assumé (War Active, Defense Active, Raid, Hold, Legend,
 * tiers Road…Legend). §A : chips/CTA courts dans TOUTES les langues.
 */
import type {
  CrewActivityStatus,
  CrewChestTier,
  CrewRecruitmentStatus,
  CrewRole,
} from '@klaim/shared';
import { defineCatalog, type Entry } from '../types';
import type { CrewSignalKey } from '../../features/crew/engine/crewSignals';

export const C = defineCatalog({
  // ── EmptyState (pas de crew) ────────────────────────────────────────────────
  /**
   * ⚠ LE SUFFIXE « · PARIS » A ÉTÉ RETIRÉ (recalage E13).
   *
   * Il était écrit EN DUR et s'affichait donc à un crew de Lille — et, depuis
   * l'ouverture des communes par présence, à un crew de n'importe quelle
   * commune ouverte. Un kicker qui nomme une ville que le lecteur n'habite pas
   * est un petit mensonge permanent, et il devient franchement contradictoire
   * dès que le hero du crew affiche sa VRAIE ville juste en dessous.
   *
   * Même arbitrage que `saisonKickerReal` de l'onglet Saison : on nomme la
   * saison, jamais une portée géographique plaquée (AMENDEMENT-35 Europe).
   */
  kickerSeason: {
    fr: 'SAISON 0',
    en: 'SEASON 0',
    es: 'TEMPORADA 0',
    de: 'SAISON 0',
    pt: 'TEMPORADA 0',
  },
  /**
   * NEUTRALISÉE (26/07/2026) — elle disait « pour RUN CLUBS ».
   *
   * Ce n'est PAS la baseline de marque (celle-ci vit dans `reglages.ts`,
   * `tagline`, et a le droit de nommer la course : la réécrire changerait le
   * produit). C'est le sous-titre de l'onglet Crew SANS CREW, c'est-à-dire
   * l'écran qui invite à en fonder un — et depuis que le vélo est une
   * discipline réelle, un crew peut être un crew de cyclistes. Nommer la seule
   * clientèle « run clubs » sur l'écran d'invitation excluait la moitié du jeu.
   */
  emptySubtitle: {
    fr: 'Le jeu de conquête de territoire, en équipe.',
    en: 'The territory conquest game, as a team.',
    es: 'El juego de conquista de territorio, en equipo.',
    de: 'Das Revier-Eroberungsspiel — im Team.',
    pt: 'O jogo de conquista de território, em equipe.',
  },
  emptyTitle: {
    fr: 'Personne ne tient un quartier seul.',
    en: 'No one holds a neighborhood alone.',
    es: 'Nadie mantiene un barrio solo.',
    de: 'Niemand hält ein Viertel allein.',
    pt: 'Ninguém segura um bairro sozinho.',
  },
  /**
   * NEUTRALISÉE (26/07/2026) — « le territoire de ses COUREURS ».
   *
   * C'est la promesse même du crew, et elle est FACTUELLEMENT plus large que ce
   * qu'elle disait : `crew_overview` (migrations 0044/0046) somme les hex du
   * crew SANS filtre de discipline. Le territoire cumulé inclut donc déjà les
   * zones prises à vélo — le mot « coureurs » décrivait mal le calcul lui-même.
   */
  emptyBody: {
    fr: 'Un crew cumule le territoire de ses membres — et le défend quand tu dors. Fonde le tien ou rejoins-en un en 1 tap.',
    en: 'A crew stacks the territory of its members — and defends it while you sleep. Found yours or join one in 1 tap.',
    es: 'Un crew suma el territorio de sus miembros — y lo defiende mientras duermes. Funda el tuyo o únete a uno en 1 toque.',
    de: 'Ein Crew bündelt das Revier seiner Mitglieder — und verteidigt es, während du schläfst. Gründe deins oder tritt mit 1 Tipp bei.',
    pt: 'Um crew soma o território dos seus membros — e o defende enquanto você dorme. Funde o seu ou entre em um com 1 toque.',
  },
  createMyCrew: {
    fr: 'Créer mon crew',
    en: 'Create my crew',
    es: 'Crear mi crew',
    de: 'Crew gründen',
    pt: 'Criar meu crew',
  },
  joinWithCodeN: {
    fr: 'Rejoindre avec un code ({n} caractères)',
    en: 'Join with a code ({n} characters)',
    es: 'Unirse con un código ({n} caracteres)',
    de: 'Mit Code beitreten ({n} Zeichen)',
    pt: 'Entrar com um código ({n} caracteres)',
  },
  exploreAroundMe: {
    fr: 'Explorer les crews autour de moi',
    en: 'Explore crews around me',
    es: 'Explorar crews cerca de mí',
    de: 'Crews in meiner Nähe entdecken',
    pt: 'Explorar crews perto de mim',
  },
  alertCreateBody: {
    fr: 'La création de crew arrive très bientôt. En attendant, explore les crews autour de toi et rejoins-en un en un tap.',
    en: 'Crew creation is coming very soon. Meanwhile, explore crews around you and join one in a tap.',
    es: 'La creación de crews llega muy pronto. Mientras tanto, explora los crews cerca de ti y únete a uno en un toque.',
    de: 'Crews gründen kommt sehr bald. Entdecke solange Crews in deiner Nähe und tritt einem mit einem Tipp bei.',
    pt: 'A criação de crew chega muito em breve. Enquanto isso, explore os crews perto de você e entre em um com um toque.',
  },
  alertJoinTitle: {
    fr: 'Rejoindre avec un code',
    en: 'Join with a code',
    es: 'Unirse con un código',
    de: 'Mit Code beitreten',
    pt: 'Entrar com um código',
  },
  alertJoinBody: {
    fr: 'Rejoindre un crew par code arrive très bientôt. En attendant, explore les crews autour de toi.',
    en: 'Joining a crew by code is coming very soon. Meanwhile, explore crews around you.',
    es: 'Unirse a un crew con código llega muy pronto. Mientras tanto, explora los crews cerca de ti.',
    de: 'Einem Crew per Code beitreten kommt sehr bald. Entdecke solange Crews in deiner Nähe.',
    pt: 'Entrar em um crew por código chega muito em breve. Enquanto isso, explore os crews perto de você.',
  },
  explore: {
    fr: 'Explorer',
    en: 'Explore',
    es: 'Explorar',
    de: 'Entdecken',
    pt: 'Explorar',
  },
  later: {
    fr: 'Plus tard',
    en: 'Later',
    es: 'Más tarde',
    de: 'Später',
    pt: 'Depois',
  },

  // ── CREW RÉEL (natif) — states honnêtes : réel ou vide, jamais la démo ──────
  rlSignedOutTitle: {
    fr: 'Connecte-toi pour rejoindre un crew',
    en: 'Sign in to join a crew',
    es: 'Inicia sesión para unirte a un crew',
    de: 'Melde dich an, um einem Crew beizutreten',
    pt: 'Entre para participar de um crew',
  },
  rlSignedOutBody: {
    fr: 'Un crew, ça se joue avec un compte : ton territoire, tes coéquipiers, ton code d’invite.',
    en: 'A crew needs an account: your territory, your teammates, your invite code.',
    es: 'Un crew necesita una cuenta: tu territorio, tus compañeros, tu código de invitación.',
    de: 'Ein Crew braucht ein Konto: dein Revier, deine Mitspieler, dein Einladungscode.',
    pt: 'Um crew precisa de uma conta: seu território, seus colegas, seu código de convite.',
  },
  rlSignIn: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  rlHaveCode: {
    fr: 'J’ai un code',
    en: 'I have a code',
    es: 'Tengo un código',
    de: 'Ich habe einen Code',
    pt: 'Tenho um código',
  },
  rlCreateTitle: {
    fr: 'Fonde ton crew',
    en: 'Found your crew',
    es: 'Funda tu crew',
    de: 'Gründe deinen Crew',
    pt: 'Funde seu crew',
  },
  rlNamePlaceholder: {
    fr: 'Nom du crew',
    en: 'Crew name',
    es: 'Nombre del crew',
    de: 'Crew-Name',
    pt: 'Nome do crew',
  },
  rlCityLabel: {
    fr: 'Ville',
    en: 'City',
    es: 'Ciudad',
    de: 'Stadt',
    pt: 'Cidade',
  },
  rlCreateCta: {
    fr: 'Créer le crew',
    en: 'Create crew',
    es: 'Crear crew',
    de: 'Crew erstellen',
    pt: 'Criar crew',
  },
  rlJoinTitle: {
    fr: 'Rejoindre un crew',
    en: 'Join a crew',
    es: 'Unirse a un crew',
    de: 'Einem Crew beitreten',
    pt: 'Entrar em um crew',
  },
  rlCodePlaceholder: {
    fr: 'Code à {n} caractères',
    en: '{n}-character code',
    es: 'Código de {n} caracteres',
    de: 'Code mit {n} Zeichen',
    pt: 'Código de {n} caracteres',
  },
  rlJoinCta: {
    fr: 'Rejoindre',
    en: 'Join',
    es: 'Unirse',
    de: 'Beitreten',
    pt: 'Entrar',
  },
  rlBack: {
    fr: 'Retour',
    en: 'Back',
    es: 'Atrás',
    de: 'Zurück',
    pt: 'Voltar',
  },
  rlMembersOf: {
    fr: '{count}/{max} membres',
    en: '{count}/{max} members',
    es: '{count}/{max} miembros',
    de: '{count}/{max} Mitglieder',
    pt: '{count}/{max} membros',
  },
  rlYouTag: {
    fr: 'toi',
    en: 'you',
    es: 'tú',
    de: 'du',
    pt: 'você',
  },
  // ── Bloc TERRITOIRE de l'écran crew natif (maillon 2 de la boucle A-43) ─────
  rlTerritoryLabel: {
    fr: 'TERRITOIRE',
    en: 'TERRITORY',
    es: 'TERRITORIO',
    de: 'REVIER',
    pt: 'TERRITÓRIO',
  },
  rlZonesHeldOne: {
    fr: '1 zone tenue',
    en: '1 zone held',
    es: '1 zona mantenida',
    de: '1 gehaltene Zone',
    pt: '1 zona mantida',
  },
  rlZonesHeldN: {
    fr: '{n} zones tenues',
    en: '{n} zones held',
    es: '{n} zonas mantenidas',
    de: '{n} gehaltene Zonen',
    pt: '{n} zonas mantidas',
  },
  /** Rang sans ordinal : « Rang 2 sur 7 » se traduit sans piège de genre/suffixe. */
  rlCityRank: {
    fr: 'Rang {rank} sur {total} crews de la ville',
    en: 'Rank {rank} of {total} crews in the city',
    es: 'Puesto {rank} de {total} crews de la ciudad',
    de: 'Platz {rank} von {total} Crews der Stadt',
    pt: 'Posição {rank} de {total} crews da cidade',
  },
  // ── NOTRE PRIORITÉ (A-43 §0 maillon 3) ─────────────────────────────────────
  // Une phrase + le manque CONCRET + une action. Chaque chiffre vient de la
  // base (engine/crewMission.ts) : aucun secteur, rival, distance ou délai n'est
  // inventé. Quand aucune mission n'est dérivable, on le DIT (cmNone*).
  cmLabel: {
    fr: 'NOTRE PRIORITÉ',
    en: 'OUR PRIORITY',
    es: 'NUESTRA PRIORIDAD',
    de: 'UNSERE PRIORITÄT',
    pt: 'NOSSA PRIORIDADE',
  },
  /** Défendre — avec le nom RÉEL du secteur (reverse-geocode). */
  cmDefendNamed: {
    fr: 'Défendre {sector}',
    en: 'Defend {sector}',
    es: 'Defender {sector}',
    de: '{sector} verteidigen',
    pt: 'Defender {sector}',
  },
  /** Défendre — secteur pas encore nommé : on ne fabrique pas de quartier. */
  cmDefend: {
    fr: 'Défendre notre territoire',
    en: 'Defend our territory',
    es: 'Defender nuestro territorio',
    de: 'Unser Revier verteidigen',
    pt: 'Defender nosso território',
  },
  cmDefendGapOne: {
    fr: '1 zone expire dans {h} h.',
    en: '1 zone expires in {h} h.',
    es: '1 zona expira en {h} h.',
    de: '1 Zone läuft in {h} h ab.',
    pt: '1 zona expira em {h} h.',
  },
  cmDefendGapN: {
    fr: '{n} zones expirent, la première dans {h} h.',
    en: '{n} zones expire, the first in {h} h.',
    es: '{n} zonas expiran, la primera en {h} h.',
    de: '{n} Zonen laufen ab, die erste in {h} h.',
    pt: '{n} zonas expiram, a primeira em {h} h.',
  },
  /** Moins d'une heure : on n'arrondit pas à « 0 h ». */
  cmDefendGapSoonOne: {
    fr: '1 zone expire dans moins d’une heure.',
    en: '1 zone expires in less than an hour.',
    es: '1 zona expira en menos de una hora.',
    de: '1 Zone läuft in weniger als einer Stunde ab.',
    pt: '1 zona expira em menos de uma hora.',
  },
  cmDefendGapSoonN: {
    fr: '{n} zones expirent, la première dans moins d’une heure.',
    en: '{n} zones expire, the first in less than an hour.',
    es: '{n} zonas expiran, la primera en menos de una hora.',
    de: '{n} Zonen laufen ab, die erste in weniger als einer Stunde.',
    pt: '{n} zonas expiram, a primeira em menos de uma hora.',
  },
  /** Reprendre — le crew adverse n'est JAMAIS nommé (rivaux non exposés). */
  cmReclaimNamed: {
    fr: 'Reprendre {sector}',
    en: 'Take {sector} back',
    es: 'Recuperar {sector}',
    de: '{sector} zurückholen',
    pt: 'Retomar {sector}',
  },
  cmReclaim: {
    fr: 'Reprendre ce qu’on a perdu',
    en: 'Take back what we lost',
    es: 'Recuperar lo que perdimos',
    de: 'Zurückholen, was wir verloren haben',
    pt: 'Retomar o que perdemos',
  },
  cmReclaimGapOneH: {
    fr: '1 zone perdue il y a {h} h.',
    en: '1 zone lost {h} h ago.',
    es: '1 zona perdida hace {h} h.',
    de: '1 Zone vor {h} h verloren.',
    pt: '1 zona perdida há {h} h.',
  },
  cmReclaimGapNH: {
    fr: '{n} zones perdues, la dernière il y a {h} h.',
    en: '{n} zones lost, the last one {h} h ago.',
    es: '{n} zonas perdidas, la última hace {h} h.',
    de: '{n} Zonen verloren, die letzte vor {h} h.',
    pt: '{n} zonas perdidas, a última há {h} h.',
  },
  cmReclaimGapOneD: {
    fr: '1 zone perdue il y a {d} j.',
    en: '1 zone lost {d} d ago.',
    es: '1 zona perdida hace {d} d.',
    de: '1 Zone vor {d} T verloren.',
    pt: '1 zona perdida há {d} d.',
  },
  cmReclaimGapND: {
    fr: '{n} zones perdues, la dernière il y a {d} j.',
    en: '{n} zones lost, the last one {d} d ago.',
    es: '{n} zonas perdidas, la última hace {d} d.',
    de: '{n} Zonen verloren, die letzte vor {d} T.',
    pt: '{n} zonas perdidas, a última há {d} d.',
  },
  /** Boucle ouverte par un membre : le manque en mètres vient du serveur. */
  cmLoopNamed: {
    fr: 'Fermer la boucle {name}',
    en: 'Close the {name} loop',
    es: 'Cerrar el bucle {name}',
    de: 'Die Schleife {name} schließen',
    pt: 'Fechar o circuito {name}',
  },
  cmLoop: {
    fr: 'Fermer la boucle ouverte',
    en: 'Close the open loop',
    es: 'Cerrar el bucle abierto',
    de: 'Die offene Schleife schließen',
    pt: 'Fechar o circuito aberto',
  },
  cmLoopGap: {
    fr: 'Il manque {m} m pour la refermer.',
    en: '{m} m left to close it.',
    es: 'Faltan {m} m para cerrarlo.',
    de: 'Es fehlen noch {m} m.',
    pt: 'Faltam {m} m para fechar.',
  },
  /** Capturer — « proche » = un secteur où le crew tient DÉJÀ du terrain. */
  cmCaptureNamed: {
    fr: 'Prendre du terrain à {sector}',
    en: 'Take ground in {sector}',
    es: 'Ganar terreno en {sector}',
    de: 'Gelände in {sector} erobern',
    pt: 'Ganhar terreno em {sector}',
  },
  /**
   * NEUTRALISÉE (26/07/2026) — « là où on COURT ».
   *
   * L'écran Crew ne porte AUCUN commutateur de discipline et ses sources ne
   * sont pas disciplinées (`crew_mission_inputs`, migration 0049 : les hex du
   * crew sont comptés toutes disciplines confondues). Un jumeau serait donc un
   * texte sans surface pour le choisir, et il inventerait deux missions là où
   * le moteur n'en calcule qu'une. Seule la NEUTRALISATION est honnête ici.
   */
  cmCapture: {
    fr: 'Prendre du terrain là où on passe',
    en: 'Take ground where we go',
    es: 'Ganar terreno por donde pasamos',
    de: 'Gelände erobern, wo wir unterwegs sind',
    pt: 'Ganhar terreno por onde passamos',
  },
  /**
   * `freeHexes` = cellules du secteur SANS capture vivante. C'est une BORNE
   * SUPÉRIEURE, pas un inventaire : elle inclut l'eau, le bâti et le privé,
   * physiquement incapturables. Annoncer « 340 zones libres » se lirait comme
   * une promesse. La copie dit donc « à prendre » (ce qui reste ouvert), sans
   * jamais quantifier ce qui est réellement atteignable.
   */
  cmCaptureGap: {
    fr: 'Du terrain reste à prendre là où votre crew passe déjà.',
    en: 'There is still ground to take where your crew already goes.',
    es: 'Queda terreno por tomar por donde tu crew ya pasa.',
    de: 'Dort, wo euer Crew schon unterwegs ist, ist noch Gelände zu holen.',
    pt: 'Ainda há terreno a tomar por onde seu crew já passa.',
  },
  /** Aucune mission — crew sans aucun fait exploitable. Honnête, pas un échec. */
  cmNoneNoData: {
    fr: 'Rien à défendre pour l’instant : la première zone prise donnera sa première priorité au crew.',
    en: 'Nothing to defend yet: the first zone taken will give the crew its first priority.',
    es: 'Nada que defender por ahora: la primera zona conquistada dará al crew su primera prioridad.',
    de: 'Noch nichts zu verteidigen: Die erste eroberte Zone gibt dem Crew seine erste Priorität.',
    pt: 'Nada a defender por enquanto: a primeira zona conquistada dará ao crew sua primeira prioridade.',
  },
  /** Aucune mission — on a lu, et tout va bien. On le dit aussi. */
  /** ⚠️ « Nichts LÄUFT AB » reste : c'est l'expiration, pas la course à pied. */
  cmNoneStable: {
    fr: 'Rien n’expire, rien n’a été perdu : tout est stable. Sortez pour agrandir le territoire.',
    en: 'Nothing expiring, nothing lost: all stable. Head out to grow the territory.',
    es: 'Nada expira, nada se perdió: todo estable. Salid para ampliar el territorio.',
    de: 'Nichts läuft ab, nichts ging verloren: alles stabil. Geht raus, um das Revier zu vergrößern.',
    pt: 'Nada expira, nada foi perdido: tudo estável. Saiam para ampliar o território.',
  },
  /** Action INLINE (§A : le seul CTA chartreuse de l'écran reste « Inviter »). */
  cmSeeOnMap: {
    fr: 'Voir sur la carte',
    en: 'See on the map',
    es: 'Ver en el mapa',
    de: 'Auf der Karte ansehen',
    pt: 'Ver no mapa',
  },
  // ── AMENDEMENT-44 A4/A5 — SIGNAUX CREW + PING DE ZONE ──────────────────────
  // Vocabulaire FIGÉ (le chat libre reste refusé, A-43 §9). Chaque libellé est
  // une INTENTION DE COURSE à la première personne : jamais un commentaire sur
  // quelqu'un, jamais un reproche — c'est ce qui rend ce vocabulaire utile sans
  // rien à modérer. §A : phrases COURTES, non tronquées dans les 5 langues.
  /** DÉFENSE — le crew tient du terrain qui expire bientôt. */
  sigDefendNow: {
    fr: 'J’y vais maintenant',
    en: 'Heading there now',
    es: 'Voy ahora',
    de: 'Ich gehe jetzt hin',
    pt: 'Vou agora',
  },
  sigDefendTonight: {
    fr: 'Je défends ce soir',
    en: 'I’ll defend tonight',
    es: 'Defiendo esta noche',
    de: 'Ich verteidige heute Abend',
    pt: 'Defendo hoje à noite',
  },
  sigDefendBackup: {
    fr: 'Il me faut du renfort',
    en: 'I need backup',
    es: 'Necesito refuerzos',
    de: 'Ich brauche Verstärkung',
    pt: 'Preciso de reforço',
  },
  /** Évite le gâchis le plus commun : trois personnes sur la même zone. */
  sigDefendCovered: {
    fr: 'C’est couvert, ne doublez pas',
    en: 'Covered — don’t double up',
    es: 'Está cubierto, no dupliquen',
    de: 'Ist abgedeckt, nicht doppeln',
    pt: 'Está coberto, não dupliquem',
  },
  /** ATTAQUE — reprendre ce qu’on a perdu, ou prendre du libre. */
  sigAttackNow: {
    fr: 'J’y vais maintenant',
    en: 'Heading there now',
    es: 'Voy ahora',
    de: 'Ich gehe jetzt hin',
    pt: 'Vou agora',
  },
  sigAttackTonight: {
    fr: 'J’y vais ce soir',
    en: 'I’ll go tonight',
    es: 'Voy esta noche',
    de: 'Ich gehe heute Abend',
    pt: 'Vou hoje à noite',
  },
  sigAttackBackup: {
    fr: 'Trop grand pour moi seul',
    en: 'Too big for me alone',
    es: 'Demasiado para mí solo',
    de: 'Allein zu groß für mich',
    pt: 'Grande demais sozinho',
  },
  sigAttackSplit: {
    fr: 'Je prends un côté, prenez l’autre',
    en: 'I take one side, take the other',
    es: 'Yo tomo un lado, tomen el otro',
    de: 'Ich nehme eine Seite, nehmt die andere',
    pt: 'Eu pego um lado, peguem o outro',
  },
  /** BOUCLE — une frontière ouverte, il manque des mètres. */
  sigLoopClosing: {
    fr: 'Je ferme la boucle',
    en: 'I’m closing the loop',
    es: 'Cierro el bucle',
    de: 'Ich schließe die Schleife',
    pt: 'Vou fechar o circuito',
  },
  sigLoopOpen: {
    fr: 'La boucle est ouverte — qui la ferme ?',
    en: 'The loop is open — who closes it?',
    es: 'El bucle está abierto — ¿quién lo cierra?',
    de: 'Die Schleife ist offen — wer schließt sie?',
    pt: 'O circuito está aberto — quem fecha?',
  },
  /** UNIVERSEL, situé. */
  sigWatch: {
    fr: 'Gardez un œil ici',
    en: 'Keep an eye here',
    es: 'Vigilen esta zona',
    de: 'Behaltet das hier im Auge',
    pt: 'Fiquem de olho aqui',
  },
  /**
   * RASSEMBLEMENT — pertinent dans TOUTES les situations.
   *
   * FUITE COLMATÉE DANS DEUX LANGUES SUR CINQ (26/07/2026) : fr/es/pt disaient
   * déjà « Sortie » / « Salida » / « Treino », l'anglais « Group RUN » et
   * l'allemand « LAUF » nommaient la course à pied. Ces trois signaux partent
   * dans le chat d'un crew qui peut rouler — un cycliste ne peut pas proposer
   * un rassemblement sans que l'app le corrige. On neutralise les DEUX langues
   * fautives ; on ne réécrit pas les trois déjà justes.
   */
  sigGatherTonight: {
    fr: 'Sortie ce soir ?',
    en: 'Group outing tonight?',
    es: '¿Salida esta noche?',
    de: 'Gemeinsam raus heute Abend?',
    pt: 'Treino hoje à noite?',
  },
  sigGatherTomorrow: {
    fr: 'Sortie demain matin ?',
    en: 'Group outing tomorrow morning?',
    es: '¿Salida mañana por la mañana?',
    de: 'Gemeinsam raus morgen früh?',
    pt: 'Treino amanhã de manhã?',
  },
  sigGatherWeekend: {
    fr: 'Sortie ce week-end ?',
    en: 'Group outing this weekend?',
    es: '¿Salida este fin de semana?',
    de: 'Gemeinsam raus am Wochenende?',
    pt: 'Treino neste fim de semana?',
  },
  /**
   * ANTI-SHAME : déclaratif et à propos de SOI. Sans lui, un membre indisponible
   * n'aurait aucun moyen de le dire — et le silence se lit comme un abandon.
   */
  sigGatherOut: {
    fr: 'Pas dispo aujourd’hui',
    en: 'Not available today',
    es: 'Hoy no puedo',
    de: 'Heute nicht dabei',
    pt: 'Hoje não posso',
  },
  /**
   * PHRASE DU PING, assemblée à l'écran (jamais en SQL) : pseudo RÉEL + nom de
   * secteur RÉEL + libellé de signal. « KORO · République — Je défends ce soir ».
   */
  pingLine: {
    fr: '{author} · {sector} — {signal}',
    en: '{author} · {sector} — {signal}',
    es: '{author} · {sector} — {signal}',
    de: '{author} · {sector} — {signal}',
    pt: '{author} · {sector} — {signal}',
  },
  /** Même phrase, pour un signal SANS lieu (« sortie ce soir ? »). */
  pingLineNoSector: {
    fr: '{author} — {signal}',
    en: '{author} — {signal}',
    es: '{author} — {signal}',
    de: '{author} — {signal}',
    pt: '{author} — {signal}',
  },
  pingLabel: {
    fr: 'SIGNAUX DU CREW',
    en: 'CREW SIGNALS',
    es: 'SEÑALES DEL CREW',
    de: 'CREW-SIGNALE',
    pt: 'SINAIS DO CREW',
  },
  /** Ouvre le choix du signal — action discrète, jamais un 2ᵉ CTA chartreuse. */
  pingOpen: {
    fr: 'Envoyer un signal',
    en: 'Send a signal',
    es: 'Enviar una señal',
    de: 'Signal senden',
    pt: 'Enviar um sinal',
  },
  pingChooseSignal: {
    fr: 'Choisis ton signal',
    en: 'Choose your signal',
    es: 'Elige tu señal',
    de: 'Wähle dein Signal',
    pt: 'Escolha seu sinal',
  },
  pingChooseSector: {
    fr: 'Sur quelle zone ?',
    en: 'Which zone?',
    es: '¿En qué zona?',
    de: 'Welche Zone?',
    pt: 'Em qual zona?',
  },
  pingCancel: {
    fr: 'Annuler',
    en: 'Cancel',
    es: 'Cancelar',
    de: 'Abbrechen',
    pt: 'Cancelar',
  },
  /** Le crew ne tient rien de nommé : on le DIT au lieu de proposer un lieu vide. */
  pingNoSector: {
    fr: 'Aucune zone à épingler pour l’instant — les signaux sans lieu restent possibles.',
    en: 'No zone to pin yet — signals without a place are still available.',
    es: 'Aún no hay zona que marcar — las señales sin lugar siguen disponibles.',
    de: 'Noch keine Zone zum Markieren — Signale ohne Ort bleiben möglich.',
    pt: 'Nenhuma zona para marcar ainda — sinais sem lugar continuam possíveis.',
  },
  /** Aucun ping vivant : état honnête, pas un fil vide décoré. */
  pingEmpty: {
    fr: 'Aucun signal en ce moment.',
    en: 'No signals right now.',
    es: 'Ninguna señal por ahora.',
    de: 'Gerade keine Signale.',
    pt: 'Nenhum sinal no momento.',
  },
  /** Prévenu AVANT l'envoi : sinon on croirait avoir posté deux signaux. */
  pingReplaceNotice: {
    fr: 'Ton signal précédent sera remplacé.',
    en: 'Your previous signal will be replaced.',
    es: 'Tu señal anterior será reemplazada.',
    de: 'Dein vorheriges Signal wird ersetzt.',
    pt: 'Seu sinal anterior será substituído.',
  },
  pingSent: {
    fr: 'Signal envoyé au crew.',
    en: 'Signal sent to the crew.',
    es: 'Señal enviada al crew.',
    de: 'Signal an den Crew gesendet.',
    pt: 'Sinal enviado ao crew.',
  },
  /** Refus nommés — jamais un « réessaie » opaque quand on sait pourquoi. */
  pingErrCooldown: {
    fr: 'Encore {s} s avant ton prochain signal.',
    en: '{s} s before your next signal.',
    es: 'Faltan {s} s para tu próxima señal.',
    de: 'Noch {s} s bis zum nächsten Signal.',
    pt: 'Faltam {s} s para o próximo sinal.',
  },
  pingErrSector: {
    fr: 'Cette zone n’est pas à ton crew.',
    en: 'That zone isn’t your crew’s.',
    es: 'Esa zona no es de tu crew.',
    de: 'Diese Zone gehört nicht deinem Crew.',
    pt: 'Essa zona não é do seu crew.',
  },
  pingErrContext: {
    fr: 'Ce signal ne correspond plus à la situation.',
    en: 'That signal no longer matches the situation.',
    es: 'Esa señal ya no corresponde a la situación.',
    de: 'Dieses Signal passt nicht mehr zur Lage.',
    pt: 'Esse sinal já não corresponde à situação.',
  },
  pingErrGeneric: {
    fr: 'Signal non envoyé. Réessaie.',
    en: 'Signal not sent. Try again.',
    es: 'Señal no enviada. Inténtalo de nuevo.',
    de: 'Signal nicht gesendet. Versuch es erneut.',
    pt: 'Sinal não enviado. Tente de novo.',
  },
  /** Crew sans aucun hex : on le DIT, on ne décore pas un zéro. */
  rlNoTerritory: {
    fr: 'Votre crew n’a pas encore de territoire — sortez pour en prendre.',
    en: 'Your crew holds no territory yet — head out and take some.',
    es: 'Tu crew aún no tiene territorio — sal a conquistarlo.',
    de: 'Euer Crew hält noch kein Revier — geht raus und erobert welches.',
    pt: 'Seu crew ainda não tem território — saia para conquistar.',
  },
  /** Part d'un membre dans le territoire du crew (maillon 4). */
  rlContributionPct: {
    fr: '{pct} %',
    en: '{pct}%',
    es: '{pct} %',
    de: '{pct} %',
    pt: '{pct} %',
  },
  rlShareCode: {
    fr: 'Inviter (partager le code)',
    en: 'Invite (share the code)',
    es: 'Invitar (compartir el código)',
    de: 'Einladen (Code teilen)',
    pt: 'Convidar (compartilhar o código)',
  },
  rlLeave: {
    fr: 'Quitter le crew',
    en: 'Leave crew',
    es: 'Salir del crew',
    de: 'Crew verlassen',
    pt: 'Sair do crew',
  },
  rlLeaveConfirmTitle: {
    fr: 'Quitter ce crew ?',
    en: 'Leave this crew?',
    es: '¿Salir de este crew?',
    de: 'Diesen Crew verlassen?',
    pt: 'Sair deste crew?',
  },
  rlLeaveConfirmBody: {
    fr: 'Tu ne pourras rejoindre un autre crew qu’après {days} jours.',
    en: 'You’ll only be able to join another crew after {days} days.',
    es: 'Solo podrás unirte a otro crew después de {days} días.',
    de: 'Einem anderen Crew kannst du erst nach {days} Tagen beitreten.',
    pt: 'Você só poderá entrar em outro crew após {days} dias.',
  },
  rlCancel: {
    fr: 'Annuler',
    en: 'Cancel',
    es: 'Cancelar',
    de: 'Abbrechen',
    pt: 'Cancelar',
  },
  rlWelcome: {
    fr: 'Bienvenue dans {name}',
    en: 'Welcome to {name}',
    es: 'Bienvenido a {name}',
    de: 'Willkommen bei {name}',
    pt: 'Bem-vindo ao {name}',
  },
  /** Flash juste après la fondation : « premiers membres » est exact — il n'y a
   *  encore que le fondateur, et un crew se remplit sans distinction de monde. */
  rlCreated: {
    fr: '{name} est fondé — invite tes premiers membres',
    en: '{name} is founded — invite your first members',
    es: '{name} está fundado — invita a tus primeros miembros',
    de: '{name} ist gegründet — lade deine ersten Mitglieder ein',
    pt: '{name} foi fundado — convide seus primeiros membros',
  },
  rlLeft: {
    fr: 'Tu as quitté le crew',
    en: 'You left the crew',
    es: 'Saliste del crew',
    de: 'Du hast den Crew verlassen',
    pt: 'Você saiu do crew',
  },
  rlErrCooldown: {
    fr: 'Changement de crew possible dans {days} j',
    en: 'You can switch crews in {days} d',
    es: 'Podrás cambiar de crew en {days} d',
    de: 'Crew-Wechsel in {days} T möglich',
    pt: 'Troca de crew possível em {days} d',
  },
  rlErrFull: {
    fr: 'Ce crew est complet.',
    en: 'This crew is full.',
    es: 'Este crew está completo.',
    de: 'Dieser Crew ist voll.',
    pt: 'Este crew está cheio.',
  },
  rlErrBadCode: {
    fr: 'Aucun crew ne correspond à ce code.',
    en: 'No crew matches this code.',
    es: 'Ningún crew coincide con este código.',
    de: 'Kein Crew passt zu diesem Code.',
    pt: 'Nenhum crew corresponde a este código.',
  },
  rlErrAlreadyInCrew: {
    fr: 'Tu es déjà dans un crew — quitte-le d’abord.',
    en: 'You’re already in a crew — leave it first.',
    es: 'Ya estás en un crew — sal de él primero.',
    de: 'Du bist schon in einem Crew — verlasse ihn zuerst.',
    pt: 'Você já está em um crew — saia dele primeiro.',
  },
  rlErrBadName: {
    fr: 'Choisis un nom pour ton crew.',
    en: 'Choose a name for your crew.',
    es: 'Elige un nombre para tu crew.',
    de: 'Wähle einen Namen für deinen Crew.',
    pt: 'Escolha um nome para seu crew.',
  },
  // Modération serveur du nom (0050). Le message dit CE QU'IL FAUT FAIRE, sans
  // jamais nommer la règle ni le mot reconnu : « le mot X est interdit » serait
  // un mode d'emploi du contournement. Même phrase pour une insulte, une marque
  // ou un caractère invisible — les cas sont indistinguables côté joueur.
  rlErrNameUnavailable: {
    fr: 'Ce nom n’est pas disponible. Choisis-en un autre.',
    en: 'That name isn’t available. Pick another one.',
    es: 'Ese nombre no está disponible. Elige otro.',
    de: 'Dieser Name ist nicht verfügbar. Wähle einen anderen.',
    pt: 'Esse nome não está disponível. Escolha outro.',
  },
  rlErrBadCity: {
    fr: 'Choisis une ville.',
    en: 'Choose a city.',
    es: 'Elige una ciudad.',
    de: 'Wähle eine Stadt.',
    pt: 'Escolha uma cidade.',
  },
  rlErrGeneric: {
    fr: 'Action impossible pour le moment.',
    en: 'That didn’t work — try again.',
    es: 'No se pudo — inténtalo de nuevo.',
    de: 'Hat nicht geklappt — versuch es erneut.',
    pt: 'Não deu certo — tente de novo.',
  },

  // ════ E13 CREW HOME — recalage planche « quartier général visuel » ═════════
  // Hero d'appartenance, segmented 3 vues, territoire, plan de démarrage.
  //
  // CE QUI N'EST PAS ICI, ET POURQUOI (chaque absence est une donnée qui
  // n'existe pas — pas un oubli de traduction) :
  //  · aucune clé « @tag » : `crews.tag` n'est écrite par aucune RPC (null à
  //    100 %) — l'afficher supposerait de la fabriquer depuis le nom ;
  //  · aucune clé « km² » ni « ▲ cette semaine » : `crew_overview` n'émet
  //    AUCUNE aire (choix n°1 de 0044) et aucune table ne conserve un solde
  //    hebdomadaire — une flèche affirme un net qu'on ne sait pas calculer ;
  //  · aucune clé « {n} % » de mission : aucune mission n'a de dénominateur
  //    (cf. cmCaptureGap), donc ni barre ni pourcentage ;
  //  · aucune clé « Éditer l'emblème » : `/crew-edit` est un redirect stub et
  //    aucune RPC d'édition rôle-gatée n'existe (bouton mort) ;
  //  · aucune clé « {n}/3 boucles » : `3` n'est dans aucune constante de
  //    game-rules et aucun compteur de boucles par crew n'est lu ;
  //  · aucune clé « Chat » : pas de backend ET chat libre refusé (A-43 §9).

  /** Segment « Aperçu » du crew (défaut). Court dans les 5 langues (§A). */
  segOverview: {
    fr: 'Aperçu',
    en: 'Overview',
    es: 'Resumen',
    de: 'Übersicht',
    pt: 'Resumo',
  },
  segMap: {
    fr: 'Carte',
    en: 'Map',
    es: 'Mapa',
    de: 'Karte',
    pt: 'Mapa',
  },
  /** Libellé a11y du GROUPE de segments (jamais lu à l'écran). */
  segA11y: {
    fr: 'Vue du crew',
    en: 'Crew view',
    es: 'Vista del crew',
    de: 'Crew-Ansicht',
    pt: 'Visão do crew',
  },
  /**
   * Rang COURT du hero — « Rang 2/7 ». La forme longue (`rlCityRank`) reste la
   * seule employée hors hero : ici la ligne meta enchaîne 3 segments, une
   * phrase entière la ferait déborder (§A : jamais de texte coupé).
   */
  heroRank: {
    fr: 'Rang {rank}/{total}',
    en: 'Rank {rank}/{total}',
    es: 'Puesto {rank}/{total}',
    de: 'Platz {rank}/{total}',
    pt: 'Posição {rank}/{total}',
  },
  /**
   * MA part — nommée « du territoire », pas « de la mission ».
   * `contributionPct` (0044) mesure ma part des hexes TENUS par le crew ; la
   * poser sans dire de quoi, dans la card de mission, la ferait lire comme une
   * part de la mission en cours — qui n'est mesurée nulle part.
   */
  myTerritoryShare: {
    fr: 'Votre part du territoire : {pct} %',
    en: 'Your share of the territory: {pct}%',
    es: 'Tu parte del territorio: {pct} %',
    de: 'Dein Anteil am Revier: {pct} %',
    pt: 'Sua parte do território: {pct} %',
  },
  /** Zones du crew dont l'échéance de decay tombe dans la fenêtre serveur. */
  vulnerableOne: {
    fr: '1 zone vulnérable',
    en: '1 vulnerable zone',
    es: '1 zona vulnerable',
    de: '1 gefährdete Zone',
    pt: '1 zona vulnerável',
  },
  vulnerableN: {
    fr: '{n} zones vulnérables',
    en: '{n} vulnerable zones',
    es: '{n} zonas vulnerables',
    de: '{n} gefährdete Zonen',
    pt: '{n} zonas vulneráveis',
  },
  /**
   * VUE CARTE, agrégat pas encore là. Deux états DISTINCTS, jamais confondus —
   * et surtout jamais rendus par une vue vide, qui n'affirme rien mais ressemble
   * à un écran cassé :
   *  · lecture EN COURS → on le dit, et on n'affirme rien sur le territoire ;
   *  · lecture qui n'a pas abouti → on le dit aussi, et on propose de réessayer.
   * Ni l'un ni l'autre ne devient « 0 zone » (CLAUDE.md, quatre états).
   */
  territoryReading: {
    fr: 'Lecture du territoire en cours…',
    en: 'Reading the territory…',
    es: 'Leyendo el territorio…',
    de: 'Revier wird gelesen…',
    pt: 'Lendo o território…',
  },
  territoryUnavailable: {
    fr: 'Territoire non lu — la lecture n’a pas abouti.',
    en: 'Territory not read — the request didn’t complete.',
    es: 'Territorio no leído — la lectura no se completó.',
    de: 'Revier nicht gelesen — die Abfrage kam nicht durch.',
    pt: 'Território não lido — a leitura não foi concluída.',
  },
  /** Reste des membres non montrés dans la rangée d'initiales. */
  membersMore: {
    fr: '+{n}',
    en: '+{n}',
    es: '+{n}',
    de: '+{n}',
    pt: '+{n}',
  },
  /**
   * CREW COMPLET — état RÉEL et dérivable (`memberCount >= CREW_MAX_MEMBERS`).
   * Il retire le CTA « Inviter » au lieu de le laisser échouer côté serveur
   * (`full`, 0050) : un bouton qui échoue toujours est un bouton mort.
   */
  crewFullNotice: {
    fr: 'Crew complet — plus aucune place pour l’instant.',
    en: 'Crew full — no spot left for now.',
    es: 'Crew completo — sin plazas por ahora.',
    de: 'Crew voll — derzeit kein Platz frei.',
    pt: 'Crew completo — sem vagas por ora.',
  },

  // ── ÉTAT « crew sans territoire » : un PLAN, jamais un tableau de bord vide ─
  firstTerritoryTitle: {
    fr: 'Votre premier territoire crew',
    en: 'Your first crew territory',
    es: 'Vuestro primer territorio de crew',
    de: 'Euer erstes Crew-Revier',
    pt: 'Seu primeiro território de crew',
  },
  /**
   * ⚠ LA PLANCHE DISAIT « Trois boucles fermées dans le même quartier créent
   * votre zone commune. » — reformulé, parce que ce « trois » n'existe dans
   * AUCUNE constante de game-rules : ce serait une règle de jeu inventée.
   * La phrase ci-dessous décrit ce que le serveur fait RÉELLEMENT
   * (`crew_overview` 0044 : le territoire du crew = les hexes vivants tenus par
   * ses membres actifs).
   */
  firstTerritoryBody: {
    fr: 'Le territoire du crew, c’est la somme des zones tenues par ses membres. Une boucle fermée par l’un compte pour tous.',
    en: 'A crew’s territory is the sum of the zones its members hold. One closed loop counts for everyone.',
    es: 'El territorio del crew es la suma de las zonas que mantienen sus miembros. Un bucle cerrado cuenta para todos.',
    de: 'Das Revier eines Crews ist die Summe der Zonen seiner Mitglieder. Eine geschlossene Schleife zählt für alle.',
    pt: 'O território do crew é a soma das zonas mantidas por seus membros. Um circuito fechado conta para todos.',
  },
  /**
   * L'UNIQUE CTA chartreuse de cet état (il remplace « Inviter », §A4). Il MÈNE
   * à la carte — l'écran mission (A-21) — et le libellé le dit : promettre
   * « lancer une mission » ouvrirait un écran de mission qui n'existe pas.
   */
  firstMissionCta: {
    fr: 'Trouver notre première zone',
    en: 'Find our first zone',
    es: 'Encontrar nuestra primera zona',
    de: 'Erste Zone finden',
    pt: 'Encontrar nossa primeira zona',
  },
  startWellKicker: {
    fr: 'POUR BIEN DÉMARRER',
    en: 'TO GET STARTED',
    es: 'PARA EMPEZAR BIEN',
    de: 'FÜR DEN START',
    pt: 'PARA COMEÇAR BEM',
  },
  stepInvite: {
    fr: 'Invitez des joueurs de votre quartier',
    en: 'Invite players from your neighborhood',
    es: 'Invita a jugadores de tu barrio',
    de: 'Lade Spieler aus eurem Viertel ein',
    pt: 'Convide jogadores do seu bairro',
  },
  /** Action de l'étape 1 — libellé COURT (allemand concis), jamais tronqué. */
  stepInviteAction: {
    fr: 'Inviter',
    en: 'Invite',
    es: 'Invitar',
    de: 'Einladen',
    pt: 'Convidar',
  },
  /** Compteur RÉEL : effectif lu / CREW_MIN_MEMBERS (game-rules). */
  stepInviteCount: {
    fr: '{count}/{min}',
    en: '{count}/{min}',
    es: '{count}/{min}',
    de: '{count}/{min}',
    pt: '{count}/{min}',
  },
  /**
   * Étape 2 — la RÈGLE, sans compteur : aucun compteur de boucles fermées par
   * crew n'est lu côté client (l'afficher voudrait dire l'inventer).
   */
  stepLoops: {
    fr: 'Fermez une boucle dans le même quartier',
    en: 'Close a loop in the same neighborhood',
    es: 'Cierra un bucle en el mismo barrio',
    de: 'Schließt eine Schleife im selben Viertel',
    pt: 'Feche um circuito no mesmo bairro',
  },

  // ── ÉCHEC DE CHARGEMENT (≠ « pas de crew ») ────────────────────────────────
  // Le troisième état, et le plus facile à rater : on n'a PAS PU lire. Le dire
  // franchement, ne rien affirmer sur le crew, ne proposer QUE de réessayer.
  // Surtout pas « Créer mon crew » : ce serait pousser un doublon à quelqu'un
  // qui a déjà un crew et se trouve juste dans un tunnel de métro.
  rlLoadFailedTitle: {
    fr: 'Impossible de charger ton crew',
    en: 'Couldn’t load your crew',
    es: 'No se pudo cargar tu crew',
    de: 'Dein Crew konnte nicht geladen werden',
    pt: 'Não foi possível carregar seu crew',
  },
  rlLoadFailedBody: {
    fr: 'On n’a pas pu joindre le serveur. Ton crew et ton territoire sont intacts — c’est l’affichage qui manque.',
    en: 'We couldn’t reach the server. Your crew and territory are intact — only the display is missing.',
    es: 'No pudimos contactar el servidor. Tu crew y tu territorio están intactos — solo falta mostrarlos.',
    de: 'Der Server war nicht erreichbar. Dein Crew und dein Revier sind unversehrt — nur die Anzeige fehlt.',
    pt: 'Não conseguimos falar com o servidor. Seu crew e seu território estão intactos — falta só a exibição.',
  },
  rlRetry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },

  // ── Onglets internes du HQ ─────────────────────────────────────────────────
  tabBase: { fr: 'Base', en: 'Base', es: 'Base', de: 'Basis', pt: 'Base' },
  tabChat: { fr: 'Chat', en: 'Chat', es: 'Chat', de: 'Chat', pt: 'Chat' },
  tabMembers: {
    fr: 'Membres',
    en: 'Members',
    es: 'Miembros',
    de: 'Mitglieder',
    pt: 'Membros',
  },

  // ── Paliers du coffre ──────────────────────────────────────────────────────
  tierBronze: { fr: 'Bronze', en: 'Bronze', es: 'Bronce', de: 'Bronze', pt: 'Bronze' },
  tierSilver: { fr: 'Argent', en: 'Silver', es: 'Plata', de: 'Silber', pt: 'Prata' },
  tierGold: { fr: 'Or', en: 'Gold', es: 'Oro', de: 'Gold', pt: 'Ouro' },
  tierCarbon: { fr: 'Carbone', en: 'Carbon', es: 'Carbono', de: 'Carbon', pt: 'Carbono' },
  tierElite: { fr: 'Élite', en: 'Elite', es: 'Élite', de: 'Elite', pt: 'Elite' },

  // ── Mission prioritaire (Base) ─────────────────────────────────────────────
  urgentDefense: {
    fr: 'DÉFENSE URGENTE',
    en: 'URGENT DEFENSE',
    es: 'DEFENSA URGENTE',
    de: 'DRINGENDE ABWEHR',
    pt: 'DEFESA URGENTE',
  },
  hoursLeft: {
    fr: '{h} h restantes',
    en: '{h} h left',
    es: '{h} h restantes',
    de: '{h} h übrig',
    pt: '{h} h restantes',
  },
  streetsToHold: {
    fr: '{n} rues à tenir avant la fin du délai',
    en: '{n} streets to hold before time runs out',
    es: '{n} calles que mantener antes del límite',
    de: '{n} Straßen halten, bevor die Zeit abläuft',
    pt: '{n} ruas para segurar antes do fim do prazo',
  },
  defendCta: {
    fr: 'DÉFENDRE',
    en: 'DEFEND',
    es: 'DEFENDER',
    de: 'SCHÜTZEN',
    pt: 'DEFENDER',
  },
  defendA11y: {
    fr: 'Défendre {sector} — il reste {h} heures',
    en: 'Defend {sector} — {h} hours left',
    es: 'Defender {sector} — quedan {h} horas',
    de: '{sector} schützen — noch {h} Stunden',
    pt: 'Defender {sector} — faltam {h} horas',
  },

  // ── Territoire crew ────────────────────────────────────────────────────────
  territoryKicker: {
    fr: 'TERRITOIRE CREW',
    en: 'CREW TERRITORY',
    es: 'TERRITORIO DEL CREW',
    de: 'CREW-REVIER',
    pt: 'TERRITÓRIO DO CREW',
  },
  territoryA11y: {
    fr: 'Territoire crew : {sector} {pct} % — ouvrir la carte',
    en: 'Crew territory: {sector} {pct}% — open the map',
    es: 'Territorio del crew: {sector} {pct} % — abrir el mapa',
    de: 'Crew-Revier: {sector} {pct} % — Karte öffnen',
    pt: 'Território do crew: {sector} {pct}% — abrir o mapa',
  },
  contestedDetail: {
    fr: 'frontières contestées · détail sur la carte',
    en: 'contested borders · details on the map',
    es: 'fronteras disputadas · detalle en el mapa',
    de: 'umkämpfte Grenzen · Details auf der Karte',
    pt: 'fronteiras disputadas · detalhes no mapa',
  },

  // ── Horodatage chat ────────────────────────────────────────────────────────
  justNow: {
    fr: "à l'instant",
    en: 'just now',
    es: 'ahora mismo',
    de: 'gerade eben',
    pt: 'agora mesmo',
  },
  yesterdayAt: {
    fr: 'hier {time}',
    en: 'yesterday {time}',
    es: 'ayer {time}',
    de: 'gestern {time}',
    pt: 'ontem {time}',
  },

  // ── Bulles de chat / RSVP ──────────────────────────────────────────────────
  maskedMessage: {
    fr: 'Message masqué (contenu signalé)',
    en: 'Message hidden (reported content)',
    es: 'Mensaje oculto (contenido denunciado)',
    de: 'Nachricht ausgeblendet (gemeldeter Inhalt)',
    pt: 'Mensagem oculta (conteúdo denunciado)',
  },
  reportMessageOf: {
    fr: 'Signaler le message de {author}',
    en: 'Report {author}’s message',
    es: 'Denunciar el mensaje de {author}',
    de: 'Nachricht von {author} melden',
    pt: 'Denunciar a mensagem de {author}',
  },
  messageLongPress: {
    fr: 'Message de {author}. Appui long pour signaler.',
    en: 'Message from {author}. Long press to report.',
    es: 'Mensaje de {author}. Mantén pulsado para denunciar.',
    de: 'Nachricht von {author}. Zum Melden lange drücken.',
    pt: 'Mensagem de {author}. Toque longo para denunciar.',
  },
  rsvpJoin: {
    fr: 'Je participe',
    en: 'I’m in',
    es: 'Me apunto',
    de: 'Bin dabei',
    pt: 'Eu topo',
  },
  rsvpMaybe: {
    fr: 'Peut-être',
    en: 'Maybe',
    es: 'Quizá',
    de: 'Vielleicht',
    pt: 'Talvez',
  },
  rsvpNo: {
    fr: 'Indispo',
    en: 'Can’t',
    es: 'No puedo',
    de: 'Kann nicht',
    pt: 'Não posso',
  },
  rsvpComing: {
    fr: 'Je viens',
    en: 'I’m in',
    es: 'Voy',
    de: 'Dabei',
    pt: 'Eu vou',
  },
  rsvpSent: {
    fr: 'Réponse envoyée au crew (démo)',
    en: 'Reply sent to the crew (demo)',
    es: 'Respuesta enviada al crew (demo)',
    de: 'Antwort ans Crew gesendet (Demo)',
    pt: 'Resposta enviada ao crew (demo)',
  },
  openMap: {
    fr: 'Ouvrir la carte',
    en: 'Open the map',
    es: 'Abrir el mapa',
    de: 'Karte öffnen',
    pt: 'Abrir o mapa',
  },

  // ── Dons / cadeaux ─────────────────────────────────────────────────────────
  aMember: {
    fr: 'Un membre',
    en: 'A member',
    es: 'Un miembro',
    de: 'Ein Mitglied',
    pt: 'Um membro',
  },
  thisMember: {
    fr: 'ce membre',
    en: 'this member',
    es: 'este miembro',
    de: 'dieses Mitglied',
    pt: 'este membro',
  },
  thanksOne: {
    fr: '1 membre a remercié {who}.',
    en: '1 member thanked {who}.',
    es: '1 miembro dio las gracias a {who}.',
    de: '1 Mitglied hat {who} gedankt.',
    pt: '1 membro agradeceu {who}.',
  },
  thanksMany: {
    fr: '{n} membres ont remercié {who}.',
    en: '{n} members thanked {who}.',
    es: '{n} miembros dieron las gracias a {who}.',
    de: '{n} Mitglieder haben {who} gedankt.',
    pt: '{n} membros agradeceram {who}.',
  },
  reactMerci: { fr: 'Merci', en: 'Thanks', es: 'Gracias', de: 'Danke', pt: 'Valeu' },
  reactRespect: {
    fr: 'Respect',
    en: 'Respect',
    es: 'Respeto',
    de: 'Respekt',
    pt: 'Respeito',
  },
  reactBienJoue: {
    fr: 'Bien joué',
    en: 'Well played',
    es: 'Bien hecho',
    de: 'Stark',
    pt: 'Mandou bem',
  },
  expired: {
    fr: 'Expiré',
    en: 'Expired',
    es: 'Caducado',
    de: 'Abgelaufen',
    pt: 'Expirado',
  },
  cadeauKicker: {
    fr: 'CADEAU CREW',
    en: 'CREW GIFT',
    es: 'REGALO DEL CREW',
    de: 'CREW-GESCHENK',
    pt: 'PRESENTE DO CREW',
  },
  offeredGift: {
    fr: 'a offert un {title}',
    en: 'gifted a {title}',
    es: 'ha regalado un {title}',
    de: 'hat ein {title} spendiert',
    pt: 'ofereceu um {title}',
  },
  alreadyClaimed: {
    fr: 'Déjà réclamé',
    en: 'Already claimed',
    es: 'Ya reclamado',
    de: 'Schon geholt',
    pt: 'Já resgatado',
  },
  offerExpired: {
    fr: 'Offre expirée',
    en: 'Offer expired',
    es: 'Oferta caducada',
    de: 'Angebot abgelaufen',
    pt: 'Oferta expirada',
  },
  allClaimed: {
    fr: 'Tout réclamé',
    en: 'All claimed',
    es: 'Todo reclamado',
    de: 'Alles vergeben',
    pt: 'Tudo resgatado',
  },
  claim: { fr: 'Réclamer', en: 'Claim', es: 'Reclamar', de: 'Abholen', pt: 'Resgatar' },
  rewardsOne: {
    fr: '1 récompense',
    en: '1 reward',
    es: '1 recompensa',
    de: '1 Belohnung',
    pt: '1 recompensa',
  },
  rewardsMany: {
    fr: '{n} récompenses',
    en: '{n} rewards',
    es: '{n} recompensas',
    de: '{n} Belohnungen',
    pt: '{n} recompensas',
  },
  cadeauMeta: {
    fr: '{rewards} · {c}/membre · expire {h} h',
    en: '{rewards} · {c}/member · expires {h} h',
    es: '{rewards} · {c}/miembro · caduca {h} h',
    de: '{rewards} · {c}/Mitglied · läuft in {h} h ab',
    pt: '{rewards} · {c}/membro · expira em {h} h',
  },

  // ── Sorties ────────────────────────────────────────────────────────────────
  objectiveDefense: {
    fr: 'Défense',
    en: 'Defense',
    es: 'Defensa',
    de: 'Abwehr',
    pt: 'Defesa',
  },
  objectiveConquete: {
    fr: 'Conquête',
    en: 'Conquest',
    es: 'Conquista',
    de: 'Eroberung',
    pt: 'Conquista',
  },
  goingOne: { fr: '1 vient', en: '1 going', es: '1 va', de: '1 dabei', pt: '1 vai' },
  goingMany: {
    fr: '{n} viennent',
    en: '{n} going',
    es: '{n} van',
    de: '{n} dabei',
    pt: '{n} vão',
  },
  yourOuting: {
    fr: 'Ta sortie',
    en: 'Your outing',
    es: 'Tu salida',
    de: 'Dein Run',
    pt: 'Sua saída',
  },
  byHost: { fr: 'Par {host}', en: 'By {host}', es: 'De {host}', de: 'Von {host}', pt: 'Por {host}' },
  outingsUpcoming: {
    fr: 'SORTIES À VENIR · {n}',
    en: 'UPCOMING OUTINGS · {n}',
    es: 'PRÓXIMAS SALIDAS · {n}',
    de: 'NÄCHSTE RUNS · {n}',
    pt: 'PRÓXIMAS SAÍDAS · {n}',
  },
  createOuting: {
    fr: 'Créer une sortie',
    en: 'Create an outing',
    es: 'Crear una salida',
    de: 'Run planen',
    pt: 'Criar uma saída',
  },
  createOutingA11y: {
    fr: 'Créer une sortie de crew',
    en: 'Create a crew outing',
    es: 'Crear una salida del crew',
    de: 'Crew-Run planen',
    pt: 'Criar uma saída do crew',
  },
  outingNote: {
    fr: 'Courir ensemble, c’est plus de terrain tenu. Aucune sortie ne donne de points (démo).',
    en: 'Running together means more ground held. No outing gives points (demo).',
    es: 'Correr juntos es más terreno defendido. Ninguna salida da puntos (demo).',
    de: 'Zusammen laufen heißt mehr gehaltenes Revier. Kein Run gibt Punkte (Demo).',
    pt: 'Correr juntos é mais terreno mantido. Nenhuma saída dá pontos (demo).',
  },
  outingSheetSub: {
    fr: 'Courir ensemble · aucune sortie ne donne de points ni de zones.',
    en: 'Run together · no outing gives points or zones.',
    es: 'Correr juntos · ninguna salida da puntos ni zonas.',
    de: 'Zusammen laufen · kein Run gibt Punkte oder Zonen.',
    pt: 'Correr juntos · nenhuma saída dá pontos nem zonas.',
  },
  fieldTitle: { fr: 'Titre', en: 'Title', es: 'Título', de: 'Titel', pt: 'Título' },
  fieldTime: { fr: 'Heure', en: 'Time', es: 'Hora', de: 'Uhrzeit', pt: 'Hora' },
  fieldMeetPoint: {
    fr: 'Lieu de rendez-vous',
    en: 'Meeting point',
    es: 'Punto de encuentro',
    de: 'Treffpunkt',
    pt: 'Ponto de encontro',
  },
  fieldTargetZone: {
    fr: 'Zone cible',
    en: 'Target zone',
    es: 'Zona objetivo',
    de: 'Zielzone',
    pt: 'Zona-alvo',
  },
  fieldObjective: {
    fr: 'Objectif',
    en: 'Objective',
    es: 'Objetivo',
    de: 'Ziel',
    pt: 'Objetivo',
  },
  outingTitlePh: {
    fr: 'Défense République',
    en: 'République defense',
    es: 'Defensa en République',
    de: 'République verteidigen',
    pt: 'Defesa République',
  },
  outingWhenPh: {
    fr: 'Ce soir · 19:00',
    en: 'Tonight · 19:00',
    es: 'Esta noche · 19:00',
    de: 'Heute Abend · 19:00',
    pt: 'Hoje à noite · 19:00',
  },
  outingPlacePh: {
    fr: 'Métro République, sortie Magenta',
    en: 'République metro, Magenta exit',
    es: 'Metro République, salida Magenta',
    de: 'Metro République, Ausgang Magenta',
    pt: 'Metrô République, saída Magenta',
  },
  a11yOutingTitle: {
    fr: 'Titre de la sortie',
    en: 'Outing title',
    es: 'Título de la salida',
    de: 'Titel des Runs',
    pt: 'Título da saída',
  },
  a11yOutingTime: {
    fr: 'Heure de la sortie',
    en: 'Outing time',
    es: 'Hora de la salida',
    de: 'Uhrzeit des Runs',
    pt: 'Hora da saída',
  },
  a11yOutingZone: {
    fr: 'Zone cible de la sortie',
    en: 'Outing target zone',
    es: 'Zona objetivo de la salida',
    de: 'Zielzone des Runs',
    pt: 'Zona-alvo da saída',
  },
  publishOuting: {
    fr: 'Publier la sortie',
    en: 'Publish outing',
    es: 'Publicar la salida',
    de: 'Run posten',
    pt: 'Publicar a saída',
  },
  publishOutingA11y: {
    fr: 'Publier la sortie au crew',
    en: 'Publish the outing to the crew',
    es: 'Publicar la salida al crew',
    de: 'Run ans Crew posten',
    pt: 'Publicar a saída para o crew',
  },
  outingCreated: {
    fr: 'Sortie créée — le crew la voit (démo)',
    en: 'Outing created — the crew can see it (demo)',
    es: 'Salida creada — el crew la ve (demo)',
    de: 'Run erstellt — das Crew sieht ihn (Demo)',
    pt: 'Saída criada — o crew já vê (demo)',
  },

  // ── Colle quotidienne (AUJOURD'HUI) ────────────────────────────────────────
  todayKicker: { fr: 'AUJOURD’HUI', en: 'TODAY', es: 'HOY', de: 'HEUTE', pt: 'HOJE' },
  glueProgress: {
    fr: '{done}/4 · +{xp} XP',
    en: '{done}/4 · +{xp} XP',
    es: '{done}/4 · +{xp} XP',
    de: '{done}/4 · +{xp} XP',
    pt: '{done}/4 · +{xp} XP',
  },
  glueLead: {
    fr: 'Pas de run aujourd’hui ? Garde le crew vivant en 4 gestes.',
    en: 'No run today? Keep the crew alive in 4 moves.',
    es: '¿Hoy no corres? Mantén vivo el crew con 4 gestos.',
    de: 'Heute kein Run? Halte das Crew mit 4 Gesten am Leben.',
    pt: 'Sem corrida hoje? Mantenha o crew vivo com 4 gestos.',
  },
  glueEncourage: {
    fr: 'Encourager un runner',
    en: 'Cheer a runner',
    es: 'Animar a un runner',
    de: 'Runner anfeuern',
    pt: 'Incentivar um runner',
  },
  glueEncourageSub: {
    fr: 'Envoie un boost de moral à celui qui part défendre.',
    en: 'Send a morale boost to whoever heads out to defend.',
    es: 'Envía un chute de moral a quien sale a defender.',
    de: 'Schick einen Moralschub an den, der verteidigen geht.',
    pt: 'Envie um gás de moral para quem sai para defender.',
  },
  glueVote: {
    fr: 'Voter une cible',
    en: 'Vote a target',
    es: 'Votar un objetivo',
    de: 'Ziel wählen',
    pt: 'Votar um alvo',
  },
  glueVoteSub: {
    fr: 'Choisis la zone que le crew devrait viser en priorité.',
    en: 'Pick the zone the crew should target first.',
    es: 'Elige la zona que el crew debería priorizar.',
    de: 'Wähle die Zone, die das Crew zuerst angehen sollte.',
    pt: 'Escolha a zona que o crew deveria mirar primeiro.',
  },
  glueSignal: {
    fr: 'Signaler une zone faible',
    en: 'Flag a weak zone',
    es: 'Señalar una zona débil',
    de: 'Schwache Zone melden',
    pt: 'Sinalizar uma zona fraca',
  },
  glueSignalSub: {
    fr: 'Préviens le crew d’un secteur qui risque de tomber.',
    en: 'Warn the crew about a sector at risk of falling.',
    es: 'Avisa al crew de un sector que puede caer.',
    de: 'Warne das Crew vor einem Sektor, der fallen könnte.',
    pt: 'Avise o crew sobre um setor que pode cair.',
  },
  glueBoost: {
    fr: 'Boost coffre gratuit',
    en: 'Free chest boost',
    es: 'Boost de cofre gratis',
    de: 'Gratis-Truhenboost',
    pt: 'Boost de baú grátis',
  },
  glueBoostSub: {
    fr: 'Un petit coup de pouce au coffre crew. Gratuit, 1×/jour.',
    en: 'A little push for the crew chest. Free, once a day.',
    es: 'Un empujoncito al cofre del crew. Gratis, 1×/día.',
    de: 'Ein kleiner Schub für die Crew-Truhe. Gratis, 1×/Tag.',
    pt: 'Um empurrãozinho no baú do crew. Grátis, 1×/dia.',
  },
  xpPlus: {
    fr: '+{n} XP',
    en: '+{n} XP',
    es: '+{n} XP',
    de: '+{n} XP',
    pt: '+{n} XP',
  },
  used: { fr: 'Utilisé', en: 'Used', es: 'Usado', de: 'Benutzt', pt: 'Usado' },
  glueNote: {
    fr: 'Ces gestes nourrissent le crew et le coffre — jamais de territoire ni de points.',
    en: 'These moves feed the crew and the chest — never territory or points.',
    es: 'Estos gestos alimentan el crew y el cofre — nunca territorio ni puntos.',
    de: 'Diese Gesten stärken Crew und Truhe — nie Revier oder Punkte.',
    pt: 'Esses gestos alimentam o crew e o baú — nunca território nem pontos.',
  },

  // ── Sections / anti-scroll ─────────────────────────────────────────────────
  collapse: {
    fr: 'Réduire',
    en: 'Collapse',
    es: 'Plegar',
    de: 'Einklappen',
    pt: 'Recolher',
  },
  seeAllN: {
    fr: 'Voir tout ({n})',
    en: 'See all ({n})',
    es: 'Ver todo ({n})',
    de: 'Alle ({n})',
    pt: 'Ver tudo ({n})',
  },

  // ── Header HQ ──────────────────────────────────────────────────────────────
  statusDormant: {
    fr: 'En sommeil',
    en: 'Dormant',
    es: 'En pausa',
    de: 'Schlafend',
    pt: 'Adormecido',
  },
  statusCasual: {
    fr: 'Tranquille',
    en: 'Casual',
    es: 'Tranquilo',
    de: 'Locker',
    pt: 'De boa',
  },
  statusActive: { fr: 'Actif', en: 'Active', es: 'Activo', de: 'Aktiv', pt: 'Ativo' },
  statusCompetitive: {
    fr: 'Compétitif',
    en: 'Competitive',
    es: 'Competitivo',
    de: 'Kompetitiv',
    pt: 'Competitivo',
  },
  statusWarReady: {
    fr: 'Prêt guerre',
    en: 'War-ready',
    es: 'Listo guerra',
    de: 'Kriegsbereit',
    pt: 'Pronto p/ guerra',
  },
  headerDetailA11y: {
    fr: 'Détails du crew : niveau et rang dans la ville',
    en: 'Crew details: level and city rank',
    es: 'Detalles del crew: nivel y rango en la ciudad',
    de: 'Crew-Details: Level und Stadtrang',
    pt: 'Detalhes do crew: nível e rank na cidade',
  },
  activesCount: {
    fr: '{n}/{max} actifs',
    en: '{n}/{max} active',
    es: '{n}/{max} activos',
    de: '{n}/{max} aktiv',
    pt: '{n}/{max} ativos',
  },
  xpToNext: {
    fr: '{xp} XP vers niv. {lvl}',
    en: '{xp} XP to lv. {lvl}',
    es: '{xp} XP para niv. {lvl}',
    de: '{xp} XP bis Lv. {lvl}',
    pt: '{xp} XP para nív. {lvl}',
  },
  levelMax: {
    fr: 'Niveau max atteint',
    en: 'Max level reached',
    es: 'Nivel máx. alcanzado',
    de: 'Max-Level erreicht',
    pt: 'Nível máx. atingido',
  },
  headerDetailLine: {
    fr: 'Niveau {lvl} · #{rank} {city}',
    en: 'Level {lvl} · #{rank} {city}',
    es: 'Nivel {lvl} · #{rank} {city}',
    de: 'Level {lvl} · #{rank} {city}',
    pt: 'Nível {lvl} · #{rank} {city}',
  },
  inviteRunner: {
    fr: 'Inviter un coureur',
    en: 'Invite a runner',
    es: 'Invitar a un runner',
    de: 'Läufer einladen',
    pt: 'Convidar um corredor',
  },
  editCrew: {
    fr: 'Modifier le crew',
    en: 'Edit crew',
    es: 'Editar el crew',
    de: 'Crew bearbeiten',
    pt: 'Editar o crew',
  },
  inviteCopied: {
    fr: 'Lien d’invitation copié — {link}',
    en: 'Invite link copied — {link}',
    es: 'Enlace de invitación copiado — {link}',
    de: 'Einladungslink kopiert — {link}',
    pt: 'Link de convite copiado — {link}',
  },
  inviteShared: {
    fr: 'Invitation partagée — {link}',
    en: 'Invite shared — {link}',
    es: 'Invitación compartida — {link}',
    de: 'Einladung geteilt — {link}',
    pt: 'Convite compartilhado — {link}',
  },
  inviteLinkIs: {
    fr: 'Lien d’invitation : {link}',
    en: 'Invite link: {link}',
    es: 'Enlace de invitación: {link}',
    de: 'Einladungslink: {link}',
    pt: 'Link de convite: {link}',
  },
  crewSectionsA11y: {
    fr: 'Sections du crew',
    en: 'Crew sections',
    es: 'Secciones del crew',
    de: 'Crew-Bereiche',
    pt: 'Seções do crew',
  },
  closeNoticeA11y: {
    fr: 'Fermer la notification',
    en: 'Dismiss notification',
    es: 'Cerrar la notificación',
    de: 'Mitteilung schließen',
    pt: 'Fechar a notificação',
  },
  allMissionsA11y: {
    fr: 'Voir toutes les missions du crew',
    en: 'See all crew missions',
    es: 'Ver todas las misiones del crew',
    de: 'Alle Crew-Missionen ansehen',
    pt: 'Ver todas as missões do crew',
  },
  allMissions: {
    fr: 'Toutes les missions du crew',
    en: 'All crew missions',
    es: 'Todas las misiones del crew',
    de: 'Alle Crew-Missionen',
    pt: 'Todas as missões do crew',
  },

  // ── Tuiles de la Base ──────────────────────────────────────────────────────
  tileTerritory: {
    fr: 'Territoire',
    en: 'Territory',
    es: 'Territorio',
    de: 'Revier',
    pt: 'Território',
  },
  zonesCount: {
    fr: '{n} zones',
    en: '{n} zones',
    es: '{n} zonas',
    de: '{n} Zonen',
    pt: '{n} zonas',
  },
  contestedBordersCount: {
    fr: '{n} frontières contestées',
    en: '{n} contested borders',
    es: '{n} fronteras disputadas',
    de: '{n} umkämpfte Grenzen',
    pt: '{n} fronteiras disputadas',
  },
  tileChest: { fr: 'Coffre', en: 'Chest', es: 'Cofre', de: 'Truhe', pt: 'Baú' },
  toClaim: {
    fr: 'À récupérer',
    en: 'Ready to claim',
    es: 'Para reclamar',
    de: 'Abholbereit',
    pt: 'Para resgatar',
  },
  nextTierAt: {
    fr: 'Prochain palier à {pct} %',
    en: 'Next tier at {pct}%',
    es: 'Siguiente nivel al {pct} %',
    de: 'Nächste Stufe bei {pct} %',
    pt: 'Próximo nível em {pct}%',
  },
  tierMaxReached: {
    fr: 'Palier max atteint',
    en: 'Max tier reached',
    es: 'Nivel máx. alcanzado',
    de: 'Max-Stufe erreicht',
    pt: 'Nível máx. atingido',
  },
  openSpots: {
    fr: '{n} places ouvertes',
    en: '{n} open spots',
    es: '{n} plazas libres',
    de: '{n} freie Plätze',
    pt: '{n} vagas abertas',
  },
  tilePerks: {
    fr: 'Avantages',
    en: 'Perks',
    es: 'Ventajas',
    de: 'Perks',
    pt: 'Vantagens',
  },
  unlockedCount: {
    fr: '{n} débloqués',
    en: '{n} unlocked',
    es: '{n} desbloqueadas',
    de: '{n} freigeschaltet',
    pt: '{n} desbloqueadas',
  },
  nextAtLevel: {
    fr: 'Prochain au niveau {n}',
    en: 'Next at level {n}',
    es: 'Siguiente en nivel {n}',
    de: 'Nächster ab Level {n}',
    pt: 'Próxima no nível {n}',
  },
  allUnlocked: {
    fr: 'Tous débloqués',
    en: 'All unlocked',
    es: 'Todas desbloqueadas',
    de: 'Alle freigeschaltet',
    pt: 'Todas desbloqueadas',
  },

  // ── Coffre hebdo (détail) ──────────────────────────────────────────────────
  weeklyChestKicker: {
    fr: 'COFFRE HEBDO',
    en: 'WEEKLY CHEST',
    es: 'COFRE SEMANAL',
    de: 'WOCHENTRUHE',
    pt: 'BAÚ SEMANAL',
  },
  weeklyChestCard: {
    fr: 'Coffre crew hebdo',
    en: 'Weekly crew chest',
    es: 'Cofre semanal del crew',
    de: 'Wöchentliche Crew-Truhe',
    pt: 'Baú semanal do crew',
  },
  nextTierLabel: {
    fr: 'Prochain palier : {tier} · {pct} %',
    en: 'Next tier: {tier} · {pct}%',
    es: 'Siguiente nivel: {tier} · {pct} %',
    de: 'Nächste Stufe: {tier} · {pct} %',
    pt: 'Próximo nível: {tier} · {pct}%',
  },
  tierOpened: {
    fr: 'Palier {tier} ouvert — récompenses au crew (démo)',
    en: '{tier} tier opened — rewards to the crew (demo)',
    es: 'Nivel {tier} abierto — recompensas para el crew (demo)',
    de: 'Stufe {tier} geöffnet — Belohnungen fürs Crew (Demo)',
    pt: 'Nível {tier} aberto — recompensas para o crew (demo)',
  },
  collectivePoints: {
    fr: '{a} / {b} points collectifs',
    en: '{a} / {b} collective points',
    es: '{a} / {b} puntos colectivos',
    de: '{a} / {b} gemeinsame Punkte',
    pt: '{a} / {b} pontos coletivos',
  },
  rewardsTierSection: {
    fr: 'RÉCOMPENSES · PALIER {tier}',
    en: 'REWARDS · {tier} TIER',
    es: 'RECOMPENSAS · NIVEL {tier}',
    de: 'BELOHNUNGEN · STUFE {tier}',
    pt: 'RECOMPENSAS · NÍVEL {tier}',
  },
  chestTiers: {
    fr: 'Paliers du coffre',
    en: 'Chest tiers',
    es: 'Niveles del cofre',
    de: 'Truhenstufen',
    pt: 'Níveis do baú',
  },
  memberContribs: {
    fr: 'CONTRIBUTIONS DES MEMBRES',
    en: 'MEMBER CONTRIBUTIONS',
    es: 'CONTRIBUCIONES DE MIEMBROS',
    de: 'BEITRÄGE DER MITGLIEDER',
    pt: 'CONTRIBUIÇÕES DOS MEMBROS',
  },

  // ── Perks (détail) ─────────────────────────────────────────────────────────
  perkNote: {
    fr: "Cosmétique et organisation — jamais d'avantage territorial.",
    en: 'Cosmetics and organization — never a territorial advantage.',
    es: 'Cosmética y organización — nunca ventaja territorial.',
    de: 'Kosmetik und Orga — nie ein Reviervorteil.',
    pt: 'Cosmético e organização — nunca vantagem territorial.',
  },
  perksUnlocked: {
    fr: 'AVANTAGES DÉBLOQUÉS · {n}',
    en: 'UNLOCKED PERKS · {n}',
    es: 'VENTAJAS DESBLOQUEADAS · {n}',
    de: 'FREIGESCHALTETE PERKS · {n}',
    pt: 'VANTAGENS DESBLOQUEADAS · {n}',
  },
  nextPerkKicker: {
    fr: 'PROCHAIN AVANTAGE',
    en: 'NEXT PERK',
    es: 'SIGUIENTE VENTAJA',
    de: 'NÄCHSTER PERK',
    pt: 'PRÓXIMA VANTAGEM',
  },
  upcomingKicker: {
    fr: 'À VENIR',
    en: 'COMING UP',
    es: 'PRÓXIMAMENTE',
    de: 'BALD',
    pt: 'EM BREVE',
  },
  levelN: {
    fr: 'Niveau {n}',
    en: 'Level {n}',
    es: 'Nivel {n}',
    de: 'Level {n}',
    pt: 'Nível {n}',
  },

  // ── Contribution & boost ───────────────────────────────────────────────────
  contribToggle: {
    fr: 'Contribution & boost',
    en: 'Contribution & boost',
    es: 'Contribución y boost',
    de: 'Beitrag & Boost',
    pt: 'Contribuição e boost',
  },
  activeSuffix: {
    fr: '· actif',
    en: '· active',
    es: '· activo',
    de: '· aktiv',
    pt: '· ativo',
  },
  boostActiveTitle: {
    fr: 'Boost actif',
    en: 'Boost active',
    es: 'Boost activo',
    de: 'Boost aktiv',
    pt: 'Boost ativo',
  },
  boostedBy: {
    fr: '{name} a boosté le crew',
    en: '{name} boosted the crew',
    es: '{name} ha dado un boost al crew',
    de: '{name} hat das Crew geboostet',
    pt: '{name} deu um boost no crew',
  },
  memberBoosted: {
    fr: 'Un membre a boosté le crew',
    en: 'A member boosted the crew',
    es: 'Un miembro ha dado un boost al crew',
    de: 'Ein Mitglied hat das Crew geboostet',
    pt: 'Um membro deu um boost no crew',
  },
  boostNote: {
    fr: 'Accélère la progression du coffre. Jamais de points ni de zones.',
    en: 'Speeds up chest progress. Never points or zones.',
    es: 'Acelera el progreso del cofre. Nunca puntos ni zonas.',
    de: 'Beschleunigt die Truhe. Nie Punkte oder Zonen.',
    pt: 'Acelera o progresso do baú. Nunca pontos nem zonas.',
  },
  contribLead: {
    fr: 'Offre un boost à ton crew.',
    en: 'Gift your crew a boost.',
    es: 'Regala un boost a tu crew.',
    de: 'Schenk deinem Crew einen Boost.',
    pt: 'Dê um boost para o seu crew.',
  },
  contribBody: {
    fr: 'Tous les runs comptent plus fort pour le coffre.',
    en: 'Every run counts harder toward the chest.',
    es: 'Todos los runs cuentan más para el cofre.',
    de: 'Jeder Run zählt stärker für die Truhe.',
    pt: 'Todas as corridas contam mais para o baú.',
  },
  contribStrong: {
    fr: 'Aucune obligation. La victoire reste sur la route.',
    en: 'No obligation. Victory stays on the road.',
    es: 'Sin obligación. La victoria sigue en la calle.',
    de: 'Keine Pflicht. Der Sieg bleibt auf der Straße.',
    pt: 'Nenhuma obrigação. A vitória continua na rua.',
  },
  showWall: {
    fr: 'Afficher le Mur du crew',
    en: 'Show the Crew Wall',
    es: 'Mostrar el Muro del crew',
    de: 'Crew-Wall anzeigen',
    pt: 'Mostrar o Mural do crew',
  },
  wallSub: {
    fr: 'Supporters de la saison — sans montant, offrande anonyme respectée.',
    en: 'Season supporters — no amounts, anonymous gifts respected.',
    es: 'Seguidores de la temporada — sin importes, donación anónima respetada.',
    de: 'Supporter der Saison — ohne Beträge, anonyme Spenden bleiben anonym.',
    pt: 'Apoiadores da temporada — sem valores, doação anônima respeitada.',
  },
  wallTitle: {
    fr: 'Supporters de la saison',
    en: 'Season supporters',
    es: 'Seguidores de la temporada',
    de: 'Supporter der Saison',
    pt: 'Apoiadores da temporada',
  },
  wallFootnote: {
    fr: 'Aucun montant. Aucun classement par dépense.',
    en: 'No amounts. No spending leaderboard.',
    es: 'Sin importes. Sin ranking por gasto.',
    de: 'Keine Beträge. Kein Ranking nach Ausgaben.',
    pt: 'Sem valores. Sem ranking por gasto.',
  },
  seeArsenal: {
    fr: 'Voir l’Arsenal',
    en: 'See the Arsenal',
    es: 'Ver el Arsenal',
    de: 'Zum Arsenal',
    pt: 'Ver o Arsenal',
  },

  // ── Membres ────────────────────────────────────────────────────────────────
  membersCount: {
    fr: 'MEMBRES · {n}/{max}',
    en: 'MEMBERS · {n}/{max}',
    es: 'MIEMBROS · {n}/{max}',
    de: 'MITGLIEDER · {n}/{max}',
    pt: 'MEMBROS · {n}/{max}',
  },
  roleTrialSuffix: {
    fr: ' · essai — {n} j restants',
    en: ' · trial — {n} d left',
    es: ' · prueba — {n} d restantes',
    de: ' · Probe — noch {n} T.',
    pt: ' · teste — faltam {n} d',
  },
  weekPoints: {
    fr: '{n} pts cette semaine',
    en: '{n} pts this week',
    es: '{n} pts esta semana',
    de: '{n} Pkt. diese Woche',
    pt: '{n} pts esta semana',
  },
  actionAssignMission: {
    fr: 'Assigner mission',
    en: 'Assign mission',
    es: 'Asignar misión',
    de: 'Mission zuweisen',
    pt: 'Atribuir missão',
  },
  actionInviteOuting: {
    fr: 'Inviter sortie',
    en: 'Invite to outing',
    es: 'Invitar a salida',
    de: 'Zum Run einladen',
    pt: 'Convidar p/ saída',
  },
  actionPromote: {
    fr: 'Promouvoir',
    en: 'Promote',
    es: 'Ascender',
    de: 'Befördern',
    pt: 'Promover',
  },
  actionViewProfile: {
    fr: 'Voir profil',
    en: 'View profile',
    es: 'Ver perfil',
    de: 'Profil ansehen',
    pt: 'Ver perfil',
  },
  reportMemberLabel: {
    fr: 'Signaler ce membre',
    en: 'Report this member',
    es: 'Denunciar a este miembro',
    de: 'Mitglied melden',
    pt: 'Denunciar este membro',
  },
  unblockMemberLabel: {
    fr: 'Débloquer ce membre',
    en: 'Unblock this member',
    es: 'Desbloquear a este miembro',
    de: 'Mitglied entsperren',
    pt: 'Desbloquear este membro',
  },
  blockMemberLabel: {
    fr: 'Bloquer ce membre',
    en: 'Block this member',
    es: 'Bloquear a este miembro',
    de: 'Mitglied blockieren',
    pt: 'Bloquear este membro',
  },
  reportUserA11y: {
    fr: 'Signaler {name}',
    en: 'Report {name}',
    es: 'Denunciar a {name}',
    de: '{name} melden',
    pt: 'Denunciar {name}',
  },
  unblockUserA11y: {
    fr: 'Débloquer {name}',
    en: 'Unblock {name}',
    es: 'Desbloquear a {name}',
    de: '{name} entsperren',
    pt: 'Desbloquear {name}',
  },
  blockUserA11y: {
    fr: 'Bloquer {name}',
    en: 'Block {name}',
    es: 'Bloquear a {name}',
    de: '{name} blockieren',
    pt: 'Bloquear {name}',
  },
  memberActionSent: {
    fr: '{action} · {name} — envoyé au crew (démo)',
    en: '{action} · {name} — sent to the crew (demo)',
    es: '{action} · {name} — enviado al crew (demo)',
    de: '{action} · {name} — ans Crew gesendet (Demo)',
    pt: '{action} · {name} — enviado ao crew (demo)',
  },

  // ══════════ MODÉRATION D'UN JOUEUR (Guideline 1.2) ══════════════════════════
  // Ces clés vivent dans le catalogue « crew » parce que la modération vit dans
  // `features/crew/` (moderation.ts, blocklist.ts, PlayerModerationSheet.tsx) —
  // et elles sont partagées par les DEUX surfaces qui affichent le pseudo d'un
  // tiers : le roster de crew ET le classement de saison. Une seule source de
  // copie pour un seul comportement (dupliquer dans `saison.ts` aurait laissé
  // les deux écrans se contredire au premier correctif).

  /**
   * Ce qui REMPLACE le pseudo d'un joueur bloqué. La ligne, elle, garde sa
   * place et sa valeur : la retirer d'un classement décalerait tous les rangs
   * en dessous et ferait passer une décision du joueur pour un bug.
   */
  blockedPlayerRow: {
    fr: 'Joueur bloqué',
    en: 'Blocked player',
    es: 'Jugador bloqueado',
    de: 'Blockierter Spieler',
    pt: 'Jogador bloqueado',
  },
  /** L'affordance « … » de la ligne — discrète, grise, jamais un 2ᵉ CTA (§A4). */
  playerActionsA11y: {
    fr: 'Actions pour {name}',
    en: 'Actions for {name}',
    es: 'Acciones para {name}',
    de: 'Aktionen für {name}',
    pt: 'Ações para {name}',
  },
  /** Titre de la feuille : elle est PRÉ-REMPLIE avec le joueur de la ligne. */
  playerSheetTitle: {
    fr: 'Ce joueur',
    en: 'This player',
    es: 'Este jugador',
    de: 'Dieser Spieler',
    pt: 'Este jogador',
  },
  /** Étape 2 : le motif. Le geste reste à 2 pas maximum. */
  reportReasonStep: {
    fr: 'Pourquoi ce signalement ?',
    en: 'Why are you reporting?',
    es: '¿Por qué lo denuncias?',
    de: 'Warum meldest du?',
    pt: 'Por que a denúncia?',
  },
  /** Confirmation du signalement (l'action, pas une promesse de sanction). */
  reportSendCta: {
    fr: 'Envoyer le signalement',
    en: 'Send report',
    es: 'Enviar la denuncia',
    de: 'Meldung senden',
    pt: 'Enviar denúncia',
  },
  sheetCancel: {
    fr: 'Annuler',
    en: 'Cancel',
    es: 'Cancelar',
    de: 'Abbrechen',
    pt: 'Cancelar',
  },
  sheetCloseA11y: {
    fr: 'Fermer',
    en: 'Close',
    es: 'Cerrar',
    de: 'Schließen',
    pt: 'Fechar',
  },
  /**
   * Ce que bloquer fait EXACTEMENT sur ces deux surfaces — écrit ici parce que
   * la feuille est le dernier endroit où l'on peut encore renoncer. Aucune
   * promesse au-delà du code : le pseudo est remplacé, la ligne reste.
   */
  blockSheetNote: {
    fr: 'Son pseudo devient « Joueur bloqué » dans ton crew et au classement. Il n’est jamais prévenu.',
    en: 'Their name becomes “Blocked player” in your crew and the leaderboard. They are never notified.',
    es: 'Su nombre pasa a ser «Jugador bloqueado» en tu crew y en la clasificación. Nunca se le avisa.',
    de: 'Sein Name wird in deinem Crew und der Rangliste zu „Blockierter Spieler“. Er erfährt nie davon.',
    pt: 'O nome dele vira “Jogador bloqueado” no seu crew e no ranking. Ele nunca é avisado.',
  },

  // ── Rôles crew ─────────────────────────────────────────────────────────────
  roleFounder: {
    fr: 'Fondateur',
    en: 'Founder',
    es: 'Fundador',
    de: 'Gründer',
    pt: 'Fundador',
  },
  roleCoCaptain: {
    fr: 'Co-Capitaine',
    en: 'Co-captain',
    es: 'Cocapitán',
    de: 'Co-Captain',
    pt: 'Cocapitão',
  },
  roleCaptain: {
    fr: 'Capitaine',
    en: 'Captain',
    es: 'Capitán',
    de: 'Captain',
    pt: 'Capitão',
  },
  roleStrategist: {
    fr: 'Stratège',
    en: 'Strategist',
    es: 'Estratega',
    de: 'Stratege',
    pt: 'Estrategista',
  },
  roleScout: {
    fr: 'Éclaireur',
    en: 'Scout',
    es: 'Explorador',
    de: 'Scout',
    pt: 'Batedor',
  },
  roleRunner: { fr: 'Runner', en: 'Runner', es: 'Runner', de: 'Runner', pt: 'Runner' },
  roleRookie: { fr: 'Rookie', en: 'Rookie', es: 'Rookie', de: 'Rookie', pt: 'Rookie' },

  // ── Chat actionnable ───────────────────────────────────────────────────────
  filterChatA11y: {
    fr: 'Filtrer le chat du crew',
    en: 'Filter the crew chat',
    es: 'Filtrar el chat del crew',
    de: 'Crew-Chat filtern',
    pt: 'Filtrar o chat do crew',
  },
  filterAll: { fr: 'Tout', en: 'All', es: 'Todo', de: 'Alles', pt: 'Tudo' },
  filterRequests: {
    fr: 'Demandes',
    en: 'Requests',
    es: 'Peticiones',
    de: 'Anfragen',
    pt: 'Pedidos',
  },
  filterMissions: {
    fr: 'Missions',
    en: 'Missions',
    es: 'Misiones',
    de: 'Missionen',
    pt: 'Missões',
  },
  filterGifts: {
    fr: 'Dons',
    en: 'Gifts',
    es: 'Regalos',
    de: 'Geschenke',
    pt: 'Presentes',
  },
  filterResults: {
    fr: 'Résultats',
    en: 'Results',
    es: 'Resultados',
    de: 'Ergebnisse',
    pt: 'Resultados',
  },
  askHelpA11y: {
    fr: "Demander de l'aide au crew",
    en: 'Ask the crew for help',
    es: 'Pedir ayuda al crew',
    de: 'Crew um Hilfe bitten',
    pt: 'Pedir ajuda ao crew',
  },
  askHelp: {
    fr: "Demander de l'aide",
    en: 'Ask for help',
    es: 'Pedir ayuda',
    de: 'Hilfe anfragen',
    pt: 'Pedir ajuda',
  },
  offerToCrewA11y: {
    fr: 'Offrir un cadeau au crew',
    en: 'Gift the crew something',
    es: 'Regalar algo al crew',
    de: 'Dem Crew etwas schenken',
    pt: 'Presentear o crew',
  },
  offerToCrew: {
    fr: 'Offrir au crew',
    en: 'Gift the crew',
    es: 'Regalar al crew',
    de: 'Crew beschenken',
    pt: 'Presentear o crew',
  },
  sectionTodo: { fr: 'À FAIRE', en: 'TO DO', es: 'POR HACER', de: 'ZU TUN', pt: 'A FAZER' },
  sectionMessages: {
    fr: 'MESSAGES',
    en: 'MESSAGES',
    es: 'MENSAJES',
    de: 'NACHRICHTEN',
    pt: 'MENSAGENS',
  },
  sectionGifts: {
    fr: 'DONS',
    en: 'GIFTS',
    es: 'REGALOS',
    de: 'GESCHENKE',
    pt: 'PRESENTES',
  },
  sectionResults: {
    fr: 'RÉSULTATS',
    en: 'RESULTS',
    es: 'RESULTADOS',
    de: 'ERGEBNISSE',
    pt: 'RESULTADOS',
  },
  codeOfConduct: {
    fr: 'Code de conduite',
    en: 'Code of conduct',
    es: 'Código de conducta',
    de: 'Verhaltenskodex',
    pt: 'Código de conduta',
  },
  codeOfConductA11y: {
    fr: 'Lire le code de conduite',
    en: 'Read the code of conduct',
    es: 'Leer el código de conducta',
    de: 'Verhaltenskodex lesen',
    pt: 'Ler o código de conduta',
  },
  manageBlockedA11y: {
    fr: 'Gérer les membres bloqués ({n})',
    en: 'Manage blocked members ({n})',
    es: 'Gestionar miembros bloqueados ({n})',
    de: 'Blockierte Mitglieder verwalten ({n})',
    pt: 'Gerenciar membros bloqueados ({n})',
  },
  blockedCount: {
    fr: 'Bloqués ({n})',
    en: 'Blocked ({n})',
    es: 'Bloqueados ({n})',
    de: 'Blockiert ({n})',
    pt: 'Bloqueados ({n})',
  },
  composerPh: {
    fr: 'Écris au crew…',
    en: 'Write to the crew…',
    es: 'Escribe al crew…',
    de: 'Schreib ans Crew…',
    pt: 'Escreva para o crew…',
  },
  composerA11y: {
    fr: 'Écris un message au crew',
    en: 'Write a message to the crew',
    es: 'Escribe un mensaje al crew',
    de: 'Nachricht ans Crew schreiben',
    pt: 'Escreva uma mensagem para o crew',
  },
  sendMessageA11y: {
    fr: 'Envoyer le message',
    en: 'Send message',
    es: 'Enviar el mensaje',
    de: 'Nachricht senden',
    pt: 'Enviar a mensagem',
  },
  chatNote: {
    fr: 'Le crew agit ici. Pas de messages privés (démo).',
    en: 'The crew acts here. No private messages (demo).',
    es: 'El crew actúa aquí. Sin mensajes privados (demo).',
    de: 'Hier handelt das Crew. Keine Privatnachrichten (Demo).',
    pt: 'O crew age aqui. Sem mensagens privadas (demo).',
  },
  exploreOtherCrews: {
    fr: "Explorer d'autres crews",
    en: 'Explore other crews',
    es: 'Explorar otros crews',
    de: 'Andere Crews entdecken',
    pt: 'Explorar outros crews',
  },

  // ── Feuille « Demander » ───────────────────────────────────────────────────
  close: { fr: 'Fermer', en: 'Close', es: 'Cerrar', de: 'Schließen', pt: 'Fechar' },
  askSheetTitle: {
    fr: 'Demander au crew',
    en: 'Ask the crew',
    es: 'Pedir al crew',
    de: 'Das Crew fragen',
    pt: 'Pedir ao crew',
  },
  askSheetSub: {
    fr: 'Quelqu’un aide · le crew progresse · tout le monde le voit.',
    en: 'Someone helps · the crew moves up · everyone sees it.',
    es: 'Alguien ayuda · el crew progresa · todos lo ven.',
    de: 'Jemand hilft · das Crew kommt voran · alle sehen es.',
    pt: 'Alguém ajuda · o crew progride · todos veem.',
  },
  reqDefense: {
    fr: 'Défense',
    en: 'Defense',
    es: 'Defensa',
    de: 'Abwehr',
    pt: 'Defesa',
  },
  reqDefenseHint: {
    fr: 'Un secteur à tenir',
    en: 'A sector to hold',
    es: 'Un sector que mantener',
    de: 'Ein Sektor zum Halten',
    pt: 'Um setor para segurar',
  },
  reqFinish: {
    fr: 'Terminer une boucle',
    en: 'Finish a loop',
    es: 'Terminar un circuito',
    de: 'Loop beenden',
    pt: 'Terminar um circuito',
  },
  reqFinishHint: {
    fr: 'Il manque quelques mètres',
    en: 'Just a few meters missing',
    es: 'Faltan unos metros',
    de: 'Nur ein paar Meter fehlen',
    pt: 'Faltam alguns metros',
  },
  reqRoute: { fr: 'Route', en: 'Route', es: 'Ruta', de: 'Route', pt: 'Rota' },
  reqRouteHint: {
    fr: 'Une boucle à proposer',
    en: 'A loop to suggest',
    es: 'Un circuito que proponer',
    de: 'Ein Loop zum Vorschlagen',
    pt: 'Um circuito para sugerir',
  },
  reqScout: { fr: 'Scout', en: 'Scout', es: 'Scout', de: 'Scout', pt: 'Scout' },
  reqScoutHint: {
    fr: 'Repérer une zone rivale',
    en: 'Scope out a rival zone',
    es: 'Explorar una zona rival',
    de: 'Rivalen-Zone auskundschaften',
    pt: 'Observar uma zona rival',
  },
  reqOuting: { fr: 'Sortie', en: 'Outing', es: 'Salida', de: 'Run', pt: 'Saída' },
  reqOutingHint: {
    fr: 'Courir ensemble',
    en: 'Run together',
    es: 'Correr juntos',
    de: 'Zusammen laufen',
    pt: 'Correr juntos',
  },
  reqBoost: {
    fr: 'Proposer un boost',
    en: 'Suggest a boost',
    es: 'Proponer un boost',
    de: 'Boost vorschlagen',
    pt: 'Sugerir um boost',
  },
  reqBoostHint: {
    fr: 'Optionnel · accélère le coffre',
    en: 'Optional · speeds up the chest',
    es: 'Opcional · acelera el cofre',
    de: 'Optional · beschleunigt die Truhe',
    pt: 'Opcional · acelera o baú',
  },
  boostProposedNotice: {
    fr: 'Boost proposé au crew — 100 % optionnel, aucune obligation (démo)',
    en: 'Boost suggested to the crew — 100% optional, no obligation (demo)',
    es: 'Boost propuesto al crew — 100 % opcional, sin obligación (demo)',
    de: 'Boost dem Crew vorgeschlagen — 100 % optional, keine Pflicht (Demo)',
    pt: 'Boost sugerido ao crew — 100% opcional, sem obrigação (demo)',
  },
  requestSentNotice: {
    fr: 'Demande envoyée au crew · {label} (démo)',
    en: 'Request sent to the crew · {label} (demo)',
    es: 'Petición enviada al crew · {label} (demo)',
    de: 'Anfrage ans Crew gesendet · {label} (Demo)',
    pt: 'Pedido enviado ao crew · {label} (demo)',
  },

  // ── Feuille « Offrir au crew » ─────────────────────────────────────────────
  giftSheetSub: {
    fr: 'Un geste, pas un avantage · {c} réclamation/membre · expire {h} h · jamais de points.',
    en: 'A gesture, not an advantage · {c} claim/member · expires {h} h · never points.',
    es: 'Un gesto, no una ventaja · {c} reclamo/miembro · caduca {h} h · nunca puntos.',
    de: 'Eine Geste, kein Vorteil · {c} Abruf/Mitglied · läuft in {h} h ab · nie Punkte.',
    pt: 'Um gesto, não uma vantagem · {c} resgate/membro · expira em {h} h · nunca pontos.',
  },
  boostCrew24: {
    fr: 'Boost crew 24 h',
    en: 'Crew boost 24 h',
    es: 'Boost de crew 24 h',
    de: 'Crew-Boost 24 h',
    pt: 'Boost de crew 24 h',
  },
  offerBoostA11y: {
    fr: 'Offrir un Boost crew 24 h',
    en: 'Gift a 24 h crew boost',
    es: 'Regalar un boost de crew 24 h',
    de: 'Einen Crew-Boost 24 h schenken',
    pt: 'Presentear um boost de crew 24 h',
  },
  boostHint: {
    fr: 'Accélère le coffre · jamais de territoire',
    en: 'Speeds up the chest · never territory',
    es: 'Acelera el cofre · nunca territorio',
    de: 'Beschleunigt die Truhe · nie Revier',
    pt: 'Acelera o baú · nunca território',
  },
  cosmeticChest: {
    fr: 'Coffre cosmétique',
    en: 'Cosmetic chest',
    es: 'Cofre cosmético',
    de: 'Kosmetik-Truhe',
    pt: 'Baú cosmético',
  },
  offerChestA11y: {
    fr: 'Offrir un Coffre cosmétique',
    en: 'Gift a cosmetic chest',
    es: 'Regalar un cofre cosmético',
    de: 'Eine Kosmetik-Truhe schenken',
    pt: 'Presentear um baú cosmético',
  },
  chestHint: {
    fr: '{n} récompenses cosmétiques à réclamer',
    en: '{n} cosmetic rewards to claim',
    es: '{n} recompensas cosméticas para reclamar',
    de: '{n} Kosmetik-Belohnungen zum Abholen',
    pt: '{n} recompensas cosméticas para resgatar',
  },
  offerChestAnonA11y: {
    fr: 'Offrir un Coffre cosmétique anonymement',
    en: 'Gift a cosmetic chest anonymously',
    es: 'Regalar un cofre cosmético de forma anónima',
    de: 'Kosmetik-Truhe anonym schenken',
    pt: 'Presentear um baú cosmético anonimamente',
  },
  chestAnon: {
    fr: 'Coffre · offrande anonyme',
    en: 'Chest · anonymous gift',
    es: 'Cofre · donación anónima',
    de: 'Truhe · anonyme Gabe',
    pt: 'Baú · doação anônima',
  },
  chestAnonHint: {
    fr: 'Ton nom n’apparaît pas · aucun classement',
    en: 'Your name never shows · no leaderboard',
    es: 'Tu nombre no aparece · sin ranking',
    de: 'Dein Name erscheint nicht · kein Ranking',
    pt: 'Seu nome não aparece · sem ranking',
  },
  giftOfferedNotice: {
    fr: 'Cadeau offert au crew — à réclamer sous {h} h (démo)',
    en: 'Gift offered to the crew — claim within {h} h (demo)',
    es: 'Regalo ofrecido al crew — para reclamar en {h} h (demo)',
    de: 'Geschenk ans Crew — innerhalb von {h} h abholen (Demo)',
    pt: 'Presente oferecido ao crew — resgate em {h} h (demo)',
  },
  rewardClaimedNotice: {
    fr: 'Récompense réclamée · {title} (démo)',
    en: 'Reward claimed · {title} (demo)',
    es: 'Recompensa reclamada · {title} (demo)',
    de: 'Belohnung geholt · {title} (Demo)',
    pt: 'Recompensa resgatada · {title} (demo)',
  },

  // ── Notices colle quotidienne / actions ────────────────────────────────────
  alreadyDoneToday: {
    fr: 'Déjà fait aujourd’hui — reviens demain (démo)',
    en: 'Already done today — come back tomorrow (demo)',
    es: 'Ya hecho hoy — vuelve mañana (demo)',
    de: 'Heute schon erledigt — komm morgen wieder (Demo)',
    pt: 'Já feito hoje — volte amanhã (demo)',
  },
  encourageSent: {
    fr: 'Encouragement envoyé au runner',
    en: 'Cheer sent to the runner',
    es: 'Ánimo enviado al runner',
    de: 'Anfeuerung an den Runner gesendet',
    pt: 'Incentivo enviado ao runner',
  },
  voteRecorded: {
    fr: 'Vote de cible enregistré',
    en: 'Target vote recorded',
    es: 'Voto de objetivo registrado',
    de: 'Zielstimme gespeichert',
    pt: 'Voto de alvo registrado',
  },
  weakZoneSignaled: {
    fr: 'Zone faible signalée au crew',
    en: 'Weak zone flagged to the crew',
    es: 'Zona débil señalada al crew',
    de: 'Schwache Zone ans Crew gemeldet',
    pt: 'Zona fraca sinalizada ao crew',
  },
  socialXpNotice: {
    fr: '{label} · +{n} XP social (démo)',
    en: '{label} · +{n} social XP (demo)',
    es: '{label} · +{n} XP social (demo)',
    de: '{label} · +{n} Sozial-XP (Demo)',
    pt: '{label} · +{n} XP social (demo)',
  },
  boostUsedToday: {
    fr: 'Boost coffre déjà utilisé aujourd’hui — 1×/jour (démo)',
    en: 'Chest boost already used today — 1×/day (demo)',
    es: 'Boost de cofre ya usado hoy — 1×/día (demo)',
    de: 'Truhenboost heute schon benutzt — 1×/Tag (Demo)',
    pt: 'Boost de baú já usado hoje — 1×/dia (demo)',
  },
  boostGiven: {
    fr: 'Boost coffre offert — le coffre crew avance un peu (démo)',
    en: 'Chest boost given — the crew chest inches forward (demo)',
    es: 'Boost de cofre dado — el cofre del crew avanza un poco (demo)',
    de: 'Truhenboost gesetzt — die Crew-Truhe rückt etwas vor (Demo)',
    pt: 'Boost de baú dado — o baú do crew avança um pouco (demo)',
  },
  donationRecorded: {
    fr: '{cta} · {zone} — don enregistré, le crew le voit (démo)',
    en: '{cta} · {zone} — donation recorded, the crew sees it (demo)',
    es: '{cta} · {zone} — aporte registrado, el crew lo ve (demo)',
    de: '{cta} · {zone} — Gabe gespeichert, das Crew sieht sie (Demo)',
    pt: '{cta} · {zone} — doação registrada, o crew vê (demo)',
  },
  sentToCrewNotice: {
    fr: '{cta} · {zone} — envoyé au crew (démo)',
    en: '{cta} · {zone} — sent to the crew (demo)',
    es: '{cta} · {zone} — enviado al crew (demo)',
    de: '{cta} · {zone} — ans Crew gesendet (Demo)',
    pt: '{cta} · {zone} — enviado ao crew (demo)',
  },
  bonusDemoNotice: {
    fr: '{cta} · {title} (démo)',
    en: '{cta} · {title} (demo)',
    es: '{cta} · {title} (demo)',
    de: '{cta} · {title} (Demo)',
    pt: '{cta} · {title} (demo)',
  },

  // ── Signalement / modération ───────────────────────────────────────────────
  reportThisMessage: {
    fr: 'Signaler ce message',
    en: 'Report this message',
    es: 'Denunciar este mensaje',
    de: 'Nachricht melden',
    pt: 'Denunciar esta mensagem',
  },
  reportSheetSub: {
    fr: 'Choisis un motif. Une personne l’examine sous {h} h. Le signalement reste confidentiel.',
    en: 'Pick a reason. A person reviews it within {h} h. Reports stay confidential.',
    es: 'Elige un motivo. Una persona lo revisa en {h} h. La denuncia es confidencial.',
    de: 'Wähle einen Grund. Ein Mensch prüft ihn innerhalb von {h} h. Die Meldung bleibt vertraulich.',
    pt: 'Escolha um motivo. Uma pessoa analisa em {h} h. A denúncia fica confidencial.',
  },
  reasonSpam: { fr: 'Spam', en: 'Spam', es: 'Spam', de: 'Spam', pt: 'Spam' },
  reasonSpamHint: {
    fr: 'Pub, arnaque, message répété.',
    en: 'Ads, scams, repeated messages.',
    es: 'Publicidad, estafa, mensaje repetido.',
    de: 'Werbung, Betrug, Spam-Nachrichten.',
    pt: 'Propaganda, golpe, mensagem repetida.',
  },
  reasonHate: { fr: 'Haine', en: 'Hate', es: 'Odio', de: 'Hass', pt: 'Ódio' },
  reasonHateHint: {
    fr: 'Racisme, insulte, contenu haineux.',
    en: 'Racism, insults, hateful content.',
    es: 'Racismo, insultos, contenido de odio.',
    de: 'Rassismus, Beleidigung, Hassinhalte.',
    pt: 'Racismo, insulto, conteúdo de ódio.',
  },
  reasonHarassment: {
    fr: 'Harcèlement',
    en: 'Harassment',
    es: 'Acoso',
    de: 'Belästigung',
    pt: 'Assédio',
  },
  reasonHarassmentHint: {
    fr: 'Intimidation, menaces, acharnement.',
    en: 'Intimidation, threats, pile-ons.',
    es: 'Intimidación, amenazas, ensañamiento.',
    de: 'Einschüchterung, Drohungen, Mobbing.',
    pt: 'Intimidação, ameaças, perseguição.',
  },
  reasonOther: { fr: 'Autre', en: 'Other', es: 'Otro', de: 'Anderes', pt: 'Outro' },
  reasonOtherHint: {
    fr: 'Un autre problème à examiner.',
    en: 'Another issue to review.',
    es: 'Otro problema que revisar.',
    de: 'Ein anderes Problem zum Prüfen.',
    pt: 'Outro problema para analisar.',
  },
  reportSentNotice: {
    fr: 'Signalement envoyé, examiné sous {h} h. Merci (démo).',
    en: 'Report sent, reviewed within {h} h. Thanks (demo).',
    es: 'Denuncia enviada, se revisa en {h} h. Gracias (demo).',
    de: 'Meldung gesendet, Prüfung innerhalb von {h} h. Danke (Demo).',
    pt: 'Denúncia enviada, análise em {h} h. Obrigado (demo).',
  },
  memberBlockedNotice: {
    fr: '{name} bloqué. Ses messages sont masqués (démo).',
    en: '{name} blocked. Their messages are hidden (demo).',
    es: '{name} bloqueado. Sus mensajes quedan ocultos (demo).',
    de: '{name} blockiert. Nachrichten werden ausgeblendet (Demo).',
    pt: '{name} bloqueado. As mensagens dele ficam ocultas (demo).',
  },
  memberUnblockedNotice: {
    fr: '{name} débloqué. Ses messages réapparaissent (démo).',
    en: '{name} unblocked. Their messages are back (demo).',
    es: '{name} desbloqueado. Sus mensajes reaparecen (demo).',
    de: '{name} entsperrt. Nachrichten sind wieder sichtbar (Demo).',
    pt: '{name} desbloqueado. As mensagens dele reaparecem (demo).',
  },
  blockedMembers: {
    fr: 'Membres bloqués',
    en: 'Blocked members',
    es: 'Miembros bloqueados',
    de: 'Blockierte Mitglieder',
    pt: 'Membros bloqueados',
  },
  blockedSheetSub: {
    fr: 'Leurs messages te sont masqués. Débloque quand tu veux.',
    en: 'Their messages are hidden from you. Unblock anytime.',
    es: 'Sus mensajes quedan ocultos para ti. Desbloquea cuando quieras.',
    de: 'Ihre Nachrichten sind für dich ausgeblendet. Entsperre jederzeit.',
    pt: 'As mensagens deles ficam ocultas para você. Desbloqueie quando quiser.',
  },
  noOneBlocked: {
    fr: 'Personne n’est bloqué.',
    en: 'No one is blocked.',
    es: 'No hay nadie bloqueado.',
    de: 'Niemand ist blockiert.',
    pt: 'Ninguém está bloqueado.',
  },
  unblock: {
    fr: 'Débloquer',
    en: 'Unblock',
    es: 'Desbloquear',
    de: 'Entsperren',
    pt: 'Desbloquear',
  },

  // ── Réactions War Log (feed) ───────────────────────────────────────────────
  reactRaid: { fr: 'Raid', en: 'Raid', es: 'Raid', de: 'Raid', pt: 'Raid' },
  reactDefenseWord: {
    fr: 'Défense',
    en: 'Defense',
    es: 'Defensa',
    de: 'Abwehr',
    pt: 'Defesa',
  },
  reactClean: { fr: 'Clean', en: 'Clean', es: 'Clean', de: 'Clean', pt: 'Clean' },
  reactFast: { fr: 'Fast', en: 'Fast', es: 'Fast', de: 'Fast', pt: 'Fast' },
  reactRankup: {
    fr: 'Rank up',
    en: 'Rank up',
    es: 'Rank up',
    de: 'Rank up',
    pt: 'Rank up',
  },
  reactHold: { fr: 'Hold', en: 'Hold', es: 'Hold', de: 'Hold', pt: 'Hold' },
  reactLegend: {
    fr: 'Legend',
    en: 'Legend',
    es: 'Legend',
    de: 'Legend',
    pt: 'Legend',
  },
  reactionA11y: {
    fr: 'Réaction {label}',
    en: '{label} reaction',
    es: 'Reacción {label}',
    de: 'Reaktion {label}',
    pt: 'Reação {label}',
  },
  addReaction: {
    fr: 'Ajouter une réaction',
    en: 'Add a reaction',
    es: 'Añadir una reacción',
    de: 'Reaktion hinzufügen',
    pt: 'Adicionar uma reação',
  },

  // ── Carte BONUS (feed) ─────────────────────────────────────────────────────
  bonusTitleFinisher: {
    fr: 'BONUS FINISHER',
    en: 'FINISHER BONUS',
    es: 'BONUS FINISHER',
    de: 'FINISHER-BONUS',
    pt: 'BÔNUS FINISHER',
  },
  bonusTitleDefense: {
    fr: 'BONUS DÉFENSE',
    en: 'DEFENSE BONUS',
    es: 'BONUS DEFENSA',
    de: 'DEFENSE-BONUS',
    pt: 'BÔNUS DEFESA',
  },
  bonusTitleCrewChest: {
    fr: 'BONUS COFFRE CREW',
    en: 'CREW CHEST BONUS',
    es: 'BONUS COFRE CREW',
    de: 'CREW-TRUHEN-BONUS',
    pt: 'BÔNUS BAÚ DO CREW',
  },
  bonusTitleReturn: {
    fr: 'BONUS RETOUR',
    en: 'COMEBACK BONUS',
    es: 'BONUS REGRESO',
    de: 'COMEBACK-BONUS',
    pt: 'BÔNUS RETORNO',
  },
  bonusTitleExploration: {
    fr: 'BONUS EXPLORATION',
    en: 'EXPLORATION BONUS',
    es: 'BONUS EXPLORACIÓN',
    de: 'EXPLORATIONS-BONUS',
    pt: 'BÔNUS EXPLORAÇÃO',
  },
  bonusTitleCleanLoop: {
    fr: 'BONUS BOUCLE PROPRE',
    en: 'CLEAN LOOP BONUS',
    es: 'BONUS BUCLE LIMPIO',
    de: 'CLEAN-LOOP-BONUS',
    pt: 'BÔNUS CIRCUITO LIMPO',
  },
  bonusDetailFinisher: {
    fr: 'Il manque {m} m pour capturer {zone}',
    en: '{m} m left to capture {zone}',
    es: 'Faltan {m} m para capturar {zone}',
    de: 'Noch {m} m bis {zone} erobert ist',
    pt: 'Faltam {m} m para capturar {zone}',
  },
  bonusDetailFinisherNoZone: {
    fr: 'Il manque {m} m pour capturer la zone',
    en: '{m} m left to capture the zone',
    es: 'Faltan {m} m para capturar la zona',
    de: 'Noch {m} m, um die Zone zu erobern',
    pt: 'Faltam {m} m para capturar a zona',
  },
  bonusDetailDefense: {
    fr: '{zone} s’efface dans {h} h — défends-la',
    en: '{zone} fades in {h} h — defend it',
    es: '{zone} se borra en {h} h — defiéndela',
    de: '{zone} verblasst in {h} h — verteidige sie',
    pt: '{zone} apaga em {h} h — defenda',
  },
  bonusDetailDefenseNoZone: {
    fr: 'Une zone s’efface dans {h} h — défends-la',
    en: 'A zone fades in {h} h — defend it',
    es: 'Una zona se borra en {h} h — defiéndela',
    de: 'Eine Zone verblasst in {h} h — verteidige sie',
    pt: 'Uma zona apaga em {h} h — defenda',
  },
  bonusDetailChest: {
    fr: 'Coffre à {pct} % — chaque sortie compte',
    en: 'Chest at {pct}% — every run counts',
    es: 'Cofre al {pct} % — cada salida cuenta',
    de: 'Truhe bei {pct} % — jeder Run zählt',
    pt: 'Baú em {pct}% — cada corrida conta',
  },
  effectChestPct: {
    fr: '+{p} % coffre crew',
    en: '+{p}% crew chest',
    es: '+{p} % cofre crew',
    de: '+{p} % Crew-Truhe',
    pt: '+{p}% baú do crew',
  },
  effectXpPct: {
    fr: '+{p} % XP',
    en: '+{p}% XP',
    es: '+{p} % XP',
    de: '+{p} % XP',
    pt: '+{p}% XP',
  },
  effectProtection: {
    fr: '+{h} h de protection',
    en: '+{h} h protection',
    es: '+{h} h de protección',
    de: '+{h} h Schutz',
    pt: '+{h} h de proteção',
  },
  effectBadgeProgress: {
    fr: 'Progrès badge',
    en: 'Badge progress',
    es: 'Progreso de insignia',
    de: 'Badge-Fortschritt',
    pt: 'Progresso de badge',
  },
  effectCosmetic: {
    fr: 'Cosmétique débloqué',
    en: 'Cosmetic unlocked',
    es: 'Cosmético desbloqueado',
    de: 'Kosmetik freigeschaltet',
    pt: 'Cosmético desbloqueado',
  },

  // ── Invite (message de partage) ────────────────────────────────────────────
  inviteMessage: {
    fr: 'Je prends mon quartier sur GRYD. Rejoins mon crew, on le tient à plusieurs : {link}',
    en: 'I’m claiming my neighborhood on GRYD. Join my crew, we hold it together: {link}',
    es: 'Estoy tomando mi barrio en GRYD. Únete a mi crew, lo defendemos juntos: {link}',
    de: 'Ich hole mir mein Viertel auf GRYD. Komm in mein Crew, gemeinsam halten wir es: {link}',
    pt: 'Estou tomando meu bairro no GRYD. Entre no meu crew, a gente segura junto: {link}',
  },

  // ── Page publique crew ─────────────────────────────────────────────────────
  levelShort: {
    fr: 'Niv. {n}',
    en: 'Lv. {n}',
    es: 'Niv. {n}',
    de: 'Lv. {n}',
    pt: 'Nív. {n}',
  },
  statMembers: {
    fr: 'membres',
    en: 'members',
    es: 'miembros',
    de: 'Mitglieder',
    pt: 'membros',
  },
  statRunsWeek: {
    fr: 'runs/sem',
    en: 'runs/wk',
    es: 'runs/sem',
    de: 'Runs/Wo.',
    pt: 'corridas/sem',
  },
  statZonesHeld: {
    fr: 'zones tenues',
    en: 'zones held',
    es: 'zonas mantenidas',
    de: 'gehaltene Zonen',
    pt: 'zonas mantidas',
  },
  statLanguage: {
    fr: 'langue',
    en: 'language',
    es: 'idioma',
    de: 'Sprache',
    pt: 'idioma',
  },
  recruitmentKicker: {
    fr: 'RECRUTEMENT',
    en: 'RECRUITMENT',
    es: 'RECLUTAMIENTO',
    de: 'RECRUITING',
    pt: 'RECRUTAMENTO',
  },
  recruitOpen: {
    fr: 'Ouvert à tous',
    en: 'Open to all',
    es: 'Abierto a todos',
    de: 'Offen für alle',
    pt: 'Aberto a todos',
  },
  recruitOnRequest: {
    fr: 'Sur demande',
    en: 'On request',
    es: 'Con solicitud',
    de: 'Auf Anfrage',
    pt: 'A pedido',
  },
  recruitInviteOnly: {
    fr: 'Sur invitation',
    en: 'Invite only',
    es: 'Solo invitación',
    de: 'Nur auf Einladung',
    pt: 'Só por convite',
  },
  recruitClosed: {
    fr: 'Fermé',
    en: 'Closed',
    es: 'Cerrado',
    de: 'Geschlossen',
    pt: 'Fechado',
  },
  fullLabel: { fr: 'Complet', en: 'Full', es: 'Completo', de: 'Voll', pt: 'Lotado' },
  placesLeftOne: {
    fr: '1 place restante',
    en: '1 spot left',
    es: '1 plaza libre',
    de: '1 Platz frei',
    pt: '1 vaga restante',
  },
  placesLeftMany: {
    fr: '{n} places restantes',
    en: '{n} spots left',
    es: '{n} plazas libres',
    de: '{n} Plätze frei',
    pt: '{n} vagas restantes',
  },
  seekingKicker: {
    fr: 'RECHERCHE',
    en: 'LOOKING FOR',
    es: 'SE BUSCA',
    de: 'GESUCHT',
    pt: 'PROCURA-SE',
  },
  ctaJoin: { fr: 'Rejoindre', en: 'Join', es: 'Unirse', de: 'Beitreten', pt: 'Entrar' },
  ctaAskJoin: {
    fr: 'Demander à rejoindre',
    en: 'Request to join',
    es: 'Pedir unirse',
    de: 'Beitritt anfragen',
    pt: 'Pedir para entrar',
  },
  ctaInviteOnly: {
    fr: 'Sur invitation uniquement',
    en: 'Invite only',
    es: 'Solo con invitación',
    de: 'Nur auf Einladung',
    pt: 'Somente por convite',
  },
  ctaClosed: {
    fr: 'Recrutement fermé',
    en: 'Recruitment closed',
    es: 'Reclutamiento cerrado',
    de: 'Recruiting geschlossen',
    pt: 'Recrutamento fechado',
  },
  welcomeCrew: {
    fr: 'Bienvenue dans le crew (démo)',
    en: 'Welcome to the crew (demo)',
    es: 'Bienvenido al crew (demo)',
    de: 'Willkommen im Crew (Demo)',
    pt: 'Bem-vindo ao crew (demo)',
  },
  requestSentShort: {
    fr: 'Demande envoyée (démo)',
    en: 'Request sent (demo)',
    es: 'Solicitud enviada (demo)',
    de: 'Anfrage gesendet (Demo)',
    pt: 'Pedido enviado (demo)',
  },
  shareJoinMsg: {
    fr: 'Rejoins {name} sur GRYD\n{link}',
    en: 'Join {name} on GRYD\n{link}',
    es: 'Únete a {name} en GRYD\n{link}',
    de: 'Tritt {name} auf GRYD bei\n{link}',
    pt: 'Entre no {name} no GRYD\n{link}',
  },
  share: {
    fr: 'Partager',
    en: 'Share',
    es: 'Compartir',
    de: 'Teilen',
    pt: 'Compartilhar',
  },
  sheetShared: {
    fr: 'Fiche partagée',
    en: 'Profile shared',
    es: 'Ficha compartida',
    de: 'Profil geteilt',
    pt: 'Perfil compartilhado',
  },
  copyLink: {
    fr: 'Copier le lien',
    en: 'Copy link',
    es: 'Copiar enlace',
    de: 'Link kopieren',
    pt: 'Copiar link',
  },
  linkCopied: {
    fr: 'Lien copié',
    en: 'Link copied',
    es: 'Enlace copiado',
    de: 'Link kopiert',
    pt: 'Link copiado',
  },
  copyUnavailable: {
    fr: 'Copie indisponible',
    en: 'Copy unavailable',
    es: 'Copia no disponible',
    de: 'Kopieren nicht verfügbar',
    pt: 'Cópia indisponível',
  },
  publicFootnote: {
    fr: "Les signaux d'activité sont agrégés au niveau du crew. Aucune position live n'est exposée.",
    en: 'Activity signals are aggregated at crew level. No live position is ever exposed.',
    es: 'Las señales de actividad se agregan a nivel de crew. Nunca se expone una posición en vivo.',
    de: 'Aktivitätssignale werden auf Crew-Ebene aggregiert. Keine Live-Position wird gezeigt.',
    pt: 'Os sinais de atividade são agregados no nível do crew. Nenhuma posição ao vivo é exposta.',
  },

  // ── Crew Discovery ─────────────────────────────────────────────────────────
  discoverTitle: {
    fr: 'Explorer les crews',
    en: 'Explore crews',
    es: 'Explorar crews',
    de: 'Crews entdecken',
    pt: 'Explorar crews',
  },
  discoverSubtitle: {
    fr: 'Rejoins un crew vivant — les tags te disent lesquels attaquent et défendent vraiment.',
    en: 'Join a living crew — the tags tell you which ones really attack and defend.',
    es: 'Únete a un crew vivo — los tags te dicen cuáles atacan y defienden de verdad.',
    de: 'Tritt einem lebendigen Crew bei — die Tags zeigen dir, wer wirklich angreift und verteidigt.',
    pt: 'Entre em um crew vivo — as tags mostram quais realmente atacam e defendem.',
  },
  filterAllCrews: { fr: 'Tous', en: 'All', es: 'Todos', de: 'Alle', pt: 'Todos' },
  filterOpenCrews: {
    fr: 'Ouverts',
    en: 'Open',
    es: 'Abiertos',
    de: 'Offen',
    pt: 'Abertos',
  },
  filterBeginner: {
    fr: 'Débutant OK',
    en: 'Beginner OK',
    es: 'Principiante OK',
    de: 'Anfänger OK',
    pt: 'Iniciante OK',
  },
  filterPioneers: {
    fr: 'Pionniers',
    en: 'Pioneers',
    es: 'Pioneros',
    de: 'Pioniere',
    pt: 'Pioneiros',
  },
  filterA11y: {
    fr: 'Filtrer : {label}',
    en: 'Filter: {label}',
    es: 'Filtrar: {label}',
    de: 'Filter: {label}',
    pt: 'Filtrar: {label}',
  },
  welcomeAt: {
    fr: 'Bienvenue chez {name} (démo)',
    en: 'Welcome to {name} (demo)',
    es: 'Bienvenido a {name} (demo)',
    de: 'Willkommen bei {name} (Demo)',
    pt: 'Bem-vindo ao {name} (demo)',
  },
  requestSentTo: {
    fr: 'Demande envoyée à {name} (démo)',
    en: 'Request sent to {name} (demo)',
    es: 'Solicitud enviada a {name} (demo)',
    de: 'Anfrage an {name} gesendet (Demo)',
    pt: 'Pedido enviado a {name} (demo)',
  },
  inviteOnlyCrew: {
    fr: '{name} recrute sur invitation uniquement',
    en: '{name} recruits by invite only',
    es: '{name} recluta solo con invitación',
    de: '{name} nimmt nur auf Einladung auf',
    pt: '{name} recruta somente por convite',
  },
  noCrewMatch: {
    fr: "Aucun crew ne correspond à ce filtre pour l'instant.",
    en: 'No crew matches this filter yet.',
    es: 'Ningún crew coincide con este filtro por ahora.',
    de: 'Noch kein Crew passt zu diesem Filter.',
    pt: 'Nenhum crew corresponde a esse filtro por enquanto.',
  },
  discoveryFootnote: {
    fr: "Aucun signal ne montre de position live. Les tags viennent de l'activité agrégée du crew (§37.3).",
    en: 'No signal shows a live position. Tags come from the crew’s aggregated activity (§37.3).',
    es: 'Ninguna señal muestra posición en vivo. Los tags vienen de la actividad agregada del crew (§37.3).',
    de: 'Kein Signal zeigt eine Live-Position. Tags stammen aus der aggregierten Crew-Aktivität (§37.3).',
    pt: 'Nenhum sinal mostra posição ao vivo. As tags vêm da atividade agregada do crew (§37.3).',
  },

  // ── Édition du crew (founder) ──────────────────────────────────────────────
  editKicker: {
    fr: 'FONDATEUR · IDENTITÉ DU CREW',
    en: 'FOUNDER · CREW IDENTITY',
    es: 'FUNDADOR · IDENTIDAD DEL CREW',
    de: 'GRÜNDER · CREW-IDENTITÄT',
    pt: 'FUNDADOR · IDENTIDADE DO CREW',
  },
  founderOnlyGate: {
    fr: 'Seul le fondateur peut modifier le nom, le blason et le recrutement du crew.',
    en: 'Only the founder can edit the crew name, crest and recruitment.',
    es: 'Solo el fundador puede editar el nombre, el escudo y el reclutamiento del crew.',
    de: 'Nur der Gründer kann Name, Wappen und Recruiting des Crews ändern.',
    pt: 'Só o fundador pode editar o nome, o brasão e o recrutamento do crew.',
  },
  identityKicker: {
    fr: 'IDENTITÉ',
    en: 'IDENTITY',
    es: 'IDENTIDAD',
    de: 'IDENTITÄT',
    pt: 'IDENTIDADE',
  },
  crewNameField: {
    fr: 'Nom du crew',
    en: 'Crew name',
    es: 'Nombre del crew',
    de: 'Crew-Name',
    pt: 'Nome do crew',
  },
  nameEmpty: {
    fr: 'Le nom ne peut pas être vide.',
    en: 'The name can’t be empty.',
    es: 'El nombre no puede estar vacío.',
    de: 'Der Name darf nicht leer sein.',
    pt: 'O nome não pode ficar vazio.',
  },
  tagField: {
    fr: 'Tag (abréviation)',
    en: 'Tag (short code)',
    es: 'Tag (abreviatura)',
    de: 'Tag (Kürzel)',
    pt: 'Tag (abreviação)',
  },
  tagEmpty: {
    fr: 'Le tag ne peut pas être vide.',
    en: 'The tag can’t be empty.',
    es: 'El tag no puede estar vacío.',
    de: 'Der Tag darf nicht leer sein.',
    pt: 'A tag não pode ficar vazia.',
  },
  arsenalCrestA11y: {
    fr: "Ouvrir l'Arsenal pour le blason du crew",
    en: 'Open the Arsenal for the crew crest',
    es: 'Abrir el Arsenal para el escudo del crew',
    de: 'Arsenal für das Crew-Wappen öffnen',
    pt: 'Abrir o Arsenal para o brasão do crew',
  },
  crestArsenalLink: {
    fr: 'Blason & cosmétiques — Arsenal',
    en: 'Crest & cosmetics — Arsenal',
    es: 'Escudo y cosméticos — Arsenal',
    de: 'Wappen & Kosmetik — Arsenal',
    pt: 'Brasão e cosméticos — Arsenal',
  },
  descriptionKicker: {
    fr: 'DESCRIPTION',
    en: 'DESCRIPTION',
    es: 'DESCRIPCIÓN',
    de: 'BESCHREIBUNG',
    pt: 'DESCRIÇÃO',
  },
  descriptionPh: {
    fr: 'Présente ton crew en une phrase (visible en découverte).',
    en: 'Introduce your crew in one sentence (shown in discovery).',
    es: 'Presenta tu crew en una frase (visible en descubrimiento).',
    de: 'Stell dein Crew in einem Satz vor (sichtbar in der Entdeckung).',
    pt: 'Apresente seu crew em uma frase (visível na descoberta).',
  },
  styleKicker: {
    fr: 'STYLE DU CREW · {n}',
    en: 'CREW STYLE · {n}',
    es: 'ESTILO DEL CREW · {n}',
    de: 'CREW-STIL · {n}',
    pt: 'ESTILO DO CREW · {n}',
  },
  savedNotice: {
    fr: 'Enregistré — le crew est à jour.',
    en: 'Saved — the crew is up to date.',
    es: 'Guardado — el crew está al día.',
    de: 'Gespeichert — das Crew ist aktuell.',
    pt: 'Salvo — o crew está atualizado.',
  },
  saveCta: {
    fr: 'ENREGISTRER',
    en: 'SAVE',
    es: 'GUARDAR',
    de: 'SPEICHERN',
    pt: 'SALVAR',
  },
  resetA11y: {
    fr: 'Réinitialiser les modifications',
    en: 'Reset changes',
    es: 'Restablecer los cambios',
    de: 'Änderungen zurücksetzen',
    pt: 'Redefinir as alterações',
  },
  reset: {
    fr: 'Réinitialiser',
    en: 'Reset',
    es: 'Restablecer',
    de: 'Zurücksetzen',
    pt: 'Redefinir',
  },

  // ── Écran INVITER (QR de recrutement — demande fondateur 21/07) ─────────────
  qrKicker: {
    fr: 'INVITER',
    en: 'INVITE',
    es: 'INVITAR',
    de: 'EINLADEN',
    pt: 'CONVIDAR',
  },
  qrHowTo: {
    fr: 'Fais scanner ce QR code. Sans scan, le code ci-dessous se tape dans « J’ai un code ».',
    en: 'Have this QR code scanned. No scanner? The code below can be typed under “I have a code”.',
    es: 'Haz que escaneen este código QR. Sin escáner, el código de abajo se escribe en «Tengo un código».',
    de: 'Lass diesen QR-Code scannen. Ohne Scan: Der Code unten wird unter „Ich habe einen Code“ eingetippt.',
    pt: 'Peça para escanearem este QR code. Sem escanear, o código abaixo se digita em “Tenho um código”.',
  },
  qrCodeLabel: {
    fr: 'CODE DU CREW',
    en: 'CREW CODE',
    es: 'CÓDIGO DEL CREW',
    de: 'CREW-CODE',
    pt: 'CÓDIGO DO CREW',
  },
  qrA11yImage: {
    fr: 'QR code d’invitation du crew {name}',
    en: 'Invite QR code for crew {name}',
    es: 'Código QR de invitación del crew {name}',
    de: 'Einladungs-QR-Code des Crews {name}',
    pt: 'QR code de convite do crew {name}',
  },
  qrShare: {
    fr: 'Partager l’invitation',
    en: 'Share the invite',
    es: 'Compartir la invitación',
    de: 'Einladung teilen',
    pt: 'Compartilhar o convite',
  },
  qrCopyCode: {
    fr: 'Copier le code',
    en: 'Copy the code',
    es: 'Copiar el código',
    de: 'Code kopieren',
    pt: 'Copiar o código',
  },
  qrCopied: {
    fr: 'Code copié.',
    en: 'Code copied.',
    es: 'Código copiado.',
    de: 'Code kopiert.',
    pt: 'Código copiado.',
  },
  qrShared: {
    fr: 'Invitation partagée.',
    en: 'Invite shared.',
    es: 'Invitación compartida.',
    de: 'Einladung geteilt.',
    pt: 'Convite compartilhado.',
  },
  qrShareUnavailable: {
    fr: 'Partage indisponible sur cet appareil.',
    en: 'Sharing is unavailable on this device.',
    es: 'Compartir no está disponible en este dispositivo.',
    de: 'Teilen ist auf diesem Gerät nicht verfügbar.',
    pt: 'Compartilhamento indisponível neste aparelho.',
  },
  qrLoading: {
    fr: 'Récupération du code du crew…',
    en: 'Fetching the crew code…',
    es: 'Obteniendo el código del crew…',
    de: 'Crew-Code wird geladen…',
    pt: 'Buscando o código do crew…',
  },
  qrErrTitle: {
    fr: 'Code indisponible',
    en: 'Code unavailable',
    es: 'Código no disponible',
    de: 'Code nicht verfügbar',
    pt: 'Código indisponível',
  },
  qrErrBody: {
    fr: 'Impossible de récupérer le code du crew. Sans lui, pas de QR : vérifie ta connexion et réessaie.',
    en: 'The crew code could not be fetched. No code means no QR: check your connection and try again.',
    es: 'No se pudo obtener el código del crew. Sin él no hay QR: revisa tu conexión e inténtalo de nuevo.',
    de: 'Der Crew-Code konnte nicht geladen werden. Ohne ihn kein QR: Verbindung prüfen und erneut versuchen.',
    pt: 'Não foi possível buscar o código do crew. Sem ele não há QR: verifique sua conexão e tente de novo.',
  },
  qrRetry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },

  // ── Atterrissage d'une invitation (app/c/[code].tsx) ────────────────────────
  // Les REFUS réutilisent les entrées rlErr* : une seule vérité par situation.
  // Le NOM du crew n'apparaît qu'APRÈS l'adhésion (rlWelcome) — avant, l'app ne
  // le connaît pas et n'en invente pas.
  cInviteTitle: {
    fr: 'Invitation',
    en: 'Invitation',
    es: 'Invitación',
    de: 'Einladung',
    pt: 'Convite',
  },
  cInviteJoinTitle: {
    fr: 'Rejoindre ce crew',
    en: 'Join this crew',
    es: 'Unirte a este crew',
    de: 'Diesem Crew beitreten',
    pt: 'Entrar neste crew',
  },
  /**
   * ⚠ CETTE COPIE PROMETTAIT UNE ENTRÉE AVANT TOUTE VÉRIFICATION.
   *
   * Elle disait « Ce code t'ouvre le crew. Tu cours pour lui dès ta prochaine
   * sortie. » — au FUTUR CERTAIN, et affichée AVANT le moindre appel serveur.
   * Or aucune RPC publique ne résout un code en crew (la colonne `code` est
   * secrète depuis 0036) : à cet instant l'app ignore si le code existe, si le
   * crew est complet, et si le joueur est en cooldown de 7 jours. Trois refus
   * typés que `join_crew_by_code` peut rendre juste après cette phrase.
   *
   * La règle : on décrit ce que le geste DEMANDE, jamais ce qu'il obtiendra.
   */
  cInviteJoinBody: {
    fr: 'Ce code demande l’entrée dans un crew. C’est le serveur qui répond — et le nom du crew n’apparaît qu’une fois l’entrée accordée.',
    en: 'This code requests entry into a crew. The server decides — and the crew’s name only appears once entry is granted.',
    es: 'Este código pide la entrada en un crew. El servidor responde — y el nombre del crew solo aparece cuando se concede la entrada.',
    de: 'Dieser Code beantragt den Eintritt in einen Crew. Der Server entscheidet — und der Name des Crews erscheint erst nach der Zusage.',
    pt: 'Este código pede entrada em um crew. Quem responde é o servidor — e o nome do crew só aparece depois que a entrada é concedida.',
  },
  cInviteSignedOutTitle: {
    fr: 'Crée ton compte pour rejoindre',
    en: 'Create your account to join',
    es: 'Crea tu cuenta para unirte',
    de: 'Erstelle dein Konto zum Beitreten',
    pt: 'Crie sua conta para entrar',
  },
  cInviteSignedOutBody: {
    fr: 'On garde cette invitation : dès que ton compte existe, tu entres dans le crew.',
    en: 'We keep this invitation: as soon as your account exists, you join the crew.',
    es: 'Guardamos esta invitación: en cuanto exista tu cuenta, entras en el crew.',
    de: 'Wir behalten diese Einladung: sobald dein Konto existiert, kommst du in den Crew.',
    pt: 'Guardamos este convite: assim que sua conta existir, você entra no crew.',
  },
  cInviteAlreadyMine: {
    fr: 'Tu es déjà dans ce crew.',
    en: 'You’re already in this crew.',
    es: 'Ya estás en este crew.',
    de: 'Du bist schon in diesem Crew.',
    pt: 'Você já está neste crew.',
  },
  cInviteBadLink: {
    fr: 'Ce lien d’invitation est incomplet',
    en: 'This invitation link is incomplete',
    es: 'Este enlace de invitación está incompleto',
    de: 'Dieser Einladungslink ist unvollständig',
    pt: 'Este link de convite está incompleto',
  },
  cInviteBadLinkBody: {
    fr: 'Demande le code à la personne qui t’invite : il se saisit à la main dans Crew.',
    en: 'Ask the person inviting you for the code: you can type it by hand in Crew.',
    es: 'Pide el código a quien te invita: puedes escribirlo a mano en Crew.',
    de: 'Frag die einladende Person nach dem Code: Du kannst ihn in Crew eintippen.',
    pt: 'Peça o código a quem te convidou: dá para digitá-lo na aba Crew.',
  },
  cInviteSeeCrew: {
    fr: 'Voir mon crew',
    en: 'See my crew',
    es: 'Ver mi crew',
    de: 'Meinen Crew ansehen',
    pt: 'Ver meu crew',
  },

  /**
   * ⚠ LE KICKER DE CET ÉCRAN N'EST PLUS « SAISON 0 » (recalage Vague 1, 25/07/2026).
   *
   * Il consommait `kickerSeason`, une CONSTANTE en dur — jamais une lecture de
   * `useActiveSeason`. Deux écrans disaient donc deux vérités dans le même
   * build : `arsenal.tsx` affiche le VRAI numéro de saison, et `performance.tsx`
   * REFUSE d'afficher le segment « Saison » précisément parce qu'aucune saison
   * n'est ouverte. Affirmer « SAISON 0 » à un nouveau recruté, c'est inventer un
   * fait de jeu sur le premier écran qu'il voit.
   *
   * Un sur-titre nomme le CONTEXTE de l'écran ; il n'a jamais eu à porter un
   * chiffre de saison que cet écran ne lit pas.
   */
  cInviteKicker: {
    fr: 'INVITATION CREW',
    en: 'CREW INVITATION',
    es: 'INVITACIÓN CREW',
    de: 'CREW-EINLADUNG',
    pt: 'CONVITE CREW',
  },
  /** ④ Session en cours de restauration — une LIGNE, jamais un écran noir. */
  cInviteSessionReading: {
    fr: 'Reprise de ta session…',
    en: 'Restoring your session…',
    es: 'Restaurando tu sesión…',
    de: 'Deine Sitzung wird wiederhergestellt…',
    pt: 'Retomando sua sessão…',
  },
  /** ④ On lit l'adhésion : on ne propose encore RIEN. */
  cInviteMemberReading: {
    fr: 'Vérification de ton adhésion…',
    en: 'Checking your membership…',
    es: 'Comprobando tu afiliación…',
    de: 'Deine Mitgliedschaft wird geprüft…',
    pt: 'Verificando sua afiliação…',
  },
  /** ③ ÉCHEC DE LECTURE — distinct du vide, et jamais rendu comme « rejoins ». */
  cInviteUnknownTitle: {
    fr: 'Impossible de vérifier ton adhésion',
    en: 'Your membership could not be checked',
    es: 'No se pudo comprobar tu afiliación',
    de: 'Deine Mitgliedschaft konnte nicht geprüft werden',
    pt: 'Não foi possível verificar sua afiliação',
  },
  cInviteUnknownBody: {
    fr: 'On n’a pas pu lire si tu es déjà dans un crew. Ce n’est pas une réponse, c’est une lecture qui a échoué : vérifie ta connexion et réessaie.',
    en: 'We could not read whether you are already in a crew. That is not an answer, it is a failed read: check your connection and try again.',
    es: 'No pudimos leer si ya estás en un crew. Eso no es una respuesta, es una lectura fallida: revisa tu conexión e inténtalo de nuevo.',
    de: 'Wir konnten nicht lesen, ob du schon in einem Crew bist. Das ist keine Antwort, sondern ein fehlgeschlagener Lesevorgang: Verbindung prüfen und erneut versuchen.',
    pt: 'Não conseguimos ler se você já está em um crew. Isso não é uma resposta, é uma leitura que falhou: verifique sua conexão e tente de novo.',
  },
  /**
   * (b′) MEMBRE D'UN AUTRE CREW — le serveur fait un SWITCH, pas une addition.
   * `join_crew_by_code` (0042 §2, réécrite 0043 §3) clôt l'adhésion active
   * (`left_at = now()`) avant d'insérer la nouvelle. C'est un effet destructif :
   * il se dit AVANT le tap, pas après.
   */
  cInviteSwitchTitle: {
    fr: 'Changer de crew',
    en: 'Switch crew',
    es: 'Cambiar de crew',
    de: 'Crew wechseln',
    pt: 'Trocar de crew',
  },
  cInviteSwitchNote: {
    fr: 'Tu es déjà dans un autre crew : entrer avec ce code t’en fait sortir.',
    en: 'You are already in another crew: entering with this code takes you out of it.',
    es: 'Ya estás en otro crew: entrar con este código te saca de él.',
    de: 'Du bist schon in einem anderen Crew: Mit diesem Code einzutreten führt dich dort hinaus.',
    pt: 'Você já está em outro crew: entrar com este código faz você sair dele.',
  },

  // ══ E38/E39/E40 — DÉCOUVERTE RÉELLE (LOT 7, migration 0083) ═══════════════
  // ⚠ NE PAS confondre avec les clés `welcomeAt` / `requestSentTo` /
  // `noCrewMatch` / `discoveryFootnote` plus haut : elles portent « (démo) » et
  // servaient l'ancienne vitrine de crews INVENTÉS (supprimée, A-47). Les clés
  // ci-dessous décrivent des données SERVEUR. Aucune ne parle au conditionnel.

  // ── E38 : l'état sans crew devient DÉCOUVERTE-FIRST ──────────────────────
  dHeroTitle: {
    fr: 'Trouvez votre crew',
    en: 'Find your crew',
    es: 'Encuentra tu crew',
    de: 'Finde dein Crew',
    pt: 'Encontre seu crew',
  },
  /**
   * ⚠ COPIE VOLONTAIREMENT NEUTRE EN DISCIPLINE (E14, garde `crew.test.ts`).
   * La première rédaction disait « qui COURT déjà près de chez vous » — or cet
   * écran mène à une liste qui mélange crews à pied ET à vélo, et aucun de ses
   * écrans ne lit une discipline. Nommer la course y aurait rendu les crews
   * cyclistes invisibles dans la promesse. On parle donc de TERRAIN TENU, qui
   * est vrai dans les deux mondes.
   */
  dHeroBody: {
    fr: 'Un crew tient un quartier à plusieurs. Regardez qui tient déjà du terrain près de chez vous, puis rejoignez — ou fondez le vôtre.',
    en: 'A crew holds a neighbourhood together. See who already holds ground near you, then join — or found your own.',
    es: 'Un crew defiende un barrio en grupo. Mira quién ya tiene terreno cerca de ti y únete — o funda el tuyo.',
    de: 'Ein Crew hält ein Viertel gemeinsam. Sieh, wer in deiner Nähe schon Gebiet hält, und tritt bei — oder gründe dein eigenes.',
    pt: 'Um crew segura um bairro em grupo. Veja quem já tem terreno perto de você e entre — ou funde o seu.',
  },
  dDiscoverCta: {
    fr: 'DÉCOUVRIR LES CREWS',
    en: 'DISCOVER CREWS',
    es: 'DESCUBRIR CREWS',
    de: 'CREWS ENTDECKEN',
    pt: 'DESCOBRIR CREWS',
  },
  dCreateSecondary: {
    fr: 'Créer un crew',
    en: 'Create a crew',
    es: 'Crear un crew',
    de: 'Crew erstellen',
    pt: 'Criar um crew',
  },

  // ── E39 : l'écran de découverte ──────────────────────────────────────────
  dTitle: {
    fr: 'Découvrir',
    en: 'Discover',
    es: 'Descubrir',
    de: 'Entdecken',
    pt: 'Descobrir',
  },
  dSearchPh: {
    fr: 'Nom ou tag d’un crew',
    en: 'Crew name or tag',
    es: 'Nombre o tag de un crew',
    de: 'Crew-Name oder Tag',
    pt: 'Nome ou tag de um crew',
  },
  dFilterAll: { fr: 'Tous', en: 'All', es: 'Todos', de: 'Alle', pt: 'Todos' },
  dFilterFriends: { fr: 'Amis', en: 'Friends', es: 'Amigos', de: 'Freunde', pt: 'Amigos' },
  dFilterOpen: { fr: 'Ouverts', en: 'Open', es: 'Abiertos', de: 'Offen', pt: 'Abertos' },
  /** La portée est DITE, pour qu'on ne croie pas à un annuaire mondial (§E38). */
  dScope: {
    fr: 'Crews de {city}',
    en: 'Crews in {city}',
    es: 'Crews de {city}',
    de: 'Crews in {city}',
    pt: 'Crews de {city}',
  },
  /** Aucune ville connue : on DEMANDE, on ne devine pas (jamais « près de chez vous »). */
  dNoCityTitle: {
    fr: 'Quelle ville ?',
    en: 'Which city?',
    es: '¿Qué ciudad?',
    de: 'Welche Stadt?',
    pt: 'Qual cidade?',
  },
  /** Neutre en discipline (E14) : la liste mélange les deux mondes. */
  dNoCityBody: {
    fr: 'GRYD ne connaît pas encore votre ville. Choisissez-la pour voir les crews qui y jouent.',
    en: 'GRYD doesn’t know your city yet. Pick it to see the crews playing there.',
    es: 'GRYD aún no conoce tu ciudad. Elígela para ver los crews que juegan allí.',
    de: 'GRYD kennt deine Stadt noch nicht. Wähle sie, um die Crews dort zu sehen.',
    pt: 'A GRYD ainda não conhece sua cidade. Escolha-a para ver os crews que jogam ali.',
  },
  /** Réponse LUE et vide : une affirmation vraie, distincte d'un échec. */
  dEmptyTitle: {
    fr: 'Aucun crew ici pour l’instant',
    en: 'No crew here yet',
    es: 'Ningún crew aquí por ahora',
    de: 'Noch kein Crew hier',
    pt: 'Nenhum crew aqui por enquanto',
  },
  dEmptyBody: {
    fr: 'Personne n’a encore fondé de crew dans cette ville. Le premier tient le premier quartier.',
    en: 'Nobody has founded a crew in this city yet. The first one takes the first neighbourhood.',
    es: 'Nadie ha fundado un crew en esta ciudad todavía. El primero se queda el primer barrio.',
    de: 'Hier hat noch niemand ein Crew gegründet. Das erste nimmt das erste Viertel.',
    pt: 'Ninguém fundou um crew nesta cidade ainda. O primeiro fica com o primeiro bairro.',
  },
  dEmptySearch: {
    fr: 'Aucun crew ne porte ce nom dans cette ville.',
    en: 'No crew by that name in this city.',
    es: 'Ningún crew con ese nombre en esta ciudad.',
    de: 'Kein Crew mit diesem Namen in dieser Stadt.',
    pt: 'Nenhum crew com esse nome nesta cidade.',
  },
  /** Échec de LECTURE : on ne le déguise jamais en « aucun crew ». */
  dFailedTitle: {
    fr: 'Lecture impossible',
    en: 'Couldn’t load',
    es: 'No se pudo leer',
    de: 'Laden fehlgeschlagen',
    pt: 'Não foi possível ler',
  },
  dFailedBody: {
    fr: 'Les crews n’ont pas pu être lus. Rien n’est affirmé sur cette ville tant que la lecture n’a pas abouti.',
    en: 'Crews couldn’t be read. Nothing is claimed about this city until the read succeeds.',
    es: 'No se pudieron leer los crews. No se afirma nada sobre esta ciudad hasta que la lectura funcione.',
    de: 'Crews konnten nicht gelesen werden. Über diese Stadt wird nichts behauptet, bis das Lesen klappt.',
    pt: 'Não foi possível ler os crews. Nada é afirmado sobre esta cidade até a leitura funcionar.',
  },
  dSignedOut: {
    fr: 'Connectez-vous pour voir les crews de votre ville.',
    en: 'Sign in to see the crews in your city.',
    es: 'Inicia sesión para ver los crews de tu ciudad.',
    de: 'Melde dich an, um die Crews deiner Stadt zu sehen.',
    pt: 'Entre para ver os crews da sua cidade.',
  },

  // ── Une ligne de crew : des FAITS, jamais un décor ───────────────────────
  dMembers: {
    fr: '{n} membres',
    en: '{n} members',
    es: '{n} miembros',
    de: '{n} Mitglieder',
    pt: '{n} membros',
  },
  dZonesHeld: {
    fr: '{n} zones tenues',
    en: '{n} zones held',
    es: '{n} zonas retenidas',
    de: '{n} Zonen gehalten',
    pt: '{n} zonas mantidas',
  },
  /** Emprise NULLE : on le dit en clair, jamais un « 0 » nu. */
  dNoZones: {
    fr: 'Aucune zone tenue',
    en: 'No zone held',
    es: 'Ninguna zona retenida',
    de: 'Keine Zone gehalten',
    pt: 'Nenhuma zona mantida',
  },
  dFriendsInside: {
    fr: '{n} de vos amis',
    en: '{n} of your friends',
    es: '{n} de tus amigos',
    de: '{n} deiner Freunde',
    pt: '{n} dos seus amigos',
  },
  dSeatsLeft: {
    fr: '{n} places',
    en: '{n} seats',
    es: '{n} plazas',
    de: '{n} Plätze',
    pt: '{n} vagas',
  },
  dNoSeats: {
    fr: 'Complet',
    en: 'Full',
    es: 'Completo',
    de: 'Voll',
    pt: 'Lotado',
  },
  dLastActive: {
    fr: 'Actif il y a {d} j',
    en: 'Active {d} d ago',
    es: 'Activo hace {d} d',
    de: 'Aktiv vor {d} T',
    pt: 'Ativo há {d} d',
  },
  dActiveToday: {
    fr: 'Actif aujourd’hui',
    en: 'Active today',
    es: 'Activo hoy',
    de: 'Heute aktiv',
    pt: 'Ativo hoje',
  },
  dNeverActive: {
    fr: 'Aucune capture',
    en: 'No capture yet',
    es: 'Ninguna captura',
    de: 'Noch keine Eroberung',
    pt: 'Nenhuma captura',
  },

  // ── Adhésion (E40) ───────────────────────────────────────────────────────
  dJoinCta: { fr: 'REJOINDRE', en: 'JOIN', es: 'UNIRME', de: 'BEITRETEN', pt: 'ENTRAR' },
  dRequestCta: {
    fr: 'DEMANDER À REJOINDRE',
    en: 'ASK TO JOIN',
    es: 'PEDIR UNIRME',
    de: 'BEITRITT ANFRAGEN',
    pt: 'PEDIR PARA ENTRAR',
  },
  dRequestPending: {
    fr: 'Demande envoyée — en attente du crew.',
    en: 'Request sent — waiting for the crew.',
    es: 'Solicitud enviada — esperando al crew.',
    de: 'Anfrage gesendet — das Crew entscheidet.',
    pt: 'Pedido enviado — aguardando o crew.',
  },
  /**
   * ⚠ Le texte NE PROMET PAS de notification : aucune n'existe (0083 § suspens).
   * Écrire « vous serez prévenu » serait une garantie que le code ne tient pas.
   */
  dRequestNoNotice: {
    fr: 'Aucune notification n’est envoyée : revenez ici pour voir la réponse.',
    en: 'No notification is sent: come back here to see the answer.',
    es: 'No se envía ninguna notificación: vuelve aquí para ver la respuesta.',
    de: 'Es wird keine Benachrichtigung gesendet: Komm für die Antwort hierher zurück.',
    pt: 'Nenhuma notificação é enviada: volte aqui para ver a resposta.',
  },
  dJoined: {
    fr: 'Vous êtes dans le crew.',
    en: 'You’re in the crew.',
    es: 'Ya estás en el crew.',
    de: 'Du bist im Crew.',
    pt: 'Você está no crew.',
  },
  dClosedNote: {
    fr: 'Ce crew ne recrute pas ici — il faut un code d’invitation.',
    en: 'This crew isn’t recruiting here — an invite code is required.',
    es: 'Este crew no recluta aquí — hace falta un código de invitación.',
    de: 'Dieses Crew rekrutiert hier nicht — es braucht einen Einladungscode.',
    pt: 'Este crew não recruta aqui — é preciso um código de convite.',
  },
  dAlreadyMember: {
    fr: 'C’est votre crew.',
    en: 'This is your crew.',
    es: 'Este es tu crew.',
    de: 'Das ist dein Crew.',
    pt: 'Este é o seu crew.',
  },
  dInOtherCrew: {
    fr: 'Vous êtes déjà dans un crew. Quittez-le depuis l’onglet Crew pour en rejoindre un autre.',
    en: 'You’re already in a crew. Leave it from the Crew tab to join another.',
    es: 'Ya estás en un crew. Sal desde la pestaña Crew para unirte a otro.',
    de: 'Du bist schon in einem Crew. Verlasse es im Crew-Tab, um einem anderen beizutreten.',
    pt: 'Você já está em um crew. Saia pela aba Crew para entrar em outro.',
  },

  // ── E40 : fiche publique ─────────────────────────────────────────────────
  dPublicTitle: {
    fr: 'Fiche du crew',
    en: 'Crew profile',
    es: 'Ficha del crew',
    de: 'Crew-Profil',
    pt: 'Ficha do crew',
  },
  dCityRank: {
    fr: '{rank}ᵉ sur {total} à {city}',
    en: '#{rank} of {total} in {city}',
    es: '{rank}º de {total} en {city}',
    de: 'Platz {rank} von {total} in {city}',
    pt: '{rank}º de {total} em {city}',
  },
  /** Aucun rang : un crew neuf n'est pas « dernier », il n'est pas classé. */
  dNoRank: {
    fr: 'Pas encore classé — ce crew ne tient aucune zone.',
    en: 'Not ranked yet — this crew holds no zone.',
    es: 'Aún sin clasificar — este crew no retiene ninguna zona.',
    de: 'Noch nicht platziert — dieses Crew hält keine Zone.',
    pt: 'Ainda sem classificação — este crew não mantém nenhuma zona.',
  },
  /** §E40 : rien de privé avant d'entrer. On le DIT, pour que l'absence se lise. */
  dPrivacyNote: {
    fr: 'Avant d’entrer, un crew ne montre que ses totaux : ni membres, ni messages, ni tracés.',
    en: 'Before joining, a crew only shows totals: no members, no messages, no routes.',
    es: 'Antes de entrar, un crew solo muestra sus totales: ni miembros, ni mensajes, ni recorridos.',
    de: 'Vor dem Beitritt zeigt ein Crew nur Summen: keine Mitglieder, keine Nachrichten, keine Strecken.',
    pt: 'Antes de entrar, um crew mostra apenas totais: nem membros, nem mensagens, nem percursos.',
  },
  dNotFound: {
    fr: 'Ce crew n’existe pas ou n’est plus visible.',
    en: 'This crew doesn’t exist or is no longer visible.',
    es: 'Este crew no existe o ya no es visible.',
    de: 'Dieses Crew existiert nicht oder ist nicht mehr sichtbar.',
    pt: 'Este crew não existe ou não está mais visível.',
  },

  // ── Candidatures reçues (contrepartie obligatoire de la demande) ─────────
  dRequestsKicker: {
    fr: 'DEMANDES REÇUES',
    en: 'JOIN REQUESTS',
    es: 'SOLICITUDES RECIBIDAS',
    de: 'BEITRITTSANFRAGEN',
    pt: 'PEDIDOS RECEBIDOS',
  },
  dAcceptCta: { fr: 'Accepter', en: 'Accept', es: 'Aceptar', de: 'Annehmen', pt: 'Aceitar' },
  dRejectCta: { fr: 'Refuser', en: 'Decline', es: 'Rechazar', de: 'Ablehnen', pt: 'Recusar' },
});

// ─── Lookups par clé de jeu (Entries dérivées du catalogue — parité garantie) ──

/** Statut d'activité crew (§45) → Entry localisée. */
export const CREW_STATUS_E: Readonly<Record<CrewActivityStatus, Entry>> = {
  dormant: C.statusDormant,
  casual: C.statusCasual,
  active: C.statusActive,
  competitive: C.statusCompetitive,
  war_ready: C.statusWarReady,
};

/** Rôle crew (§8) → Entry localisée (le suffixe d'essai rookie est séparé). */
export const CREW_ROLE_E: Readonly<Record<CrewRole, Entry>> = {
  founder: C.roleFounder,
  co_captain: C.roleCoCaptain,
  captain: C.roleCaptain,
  strategist: C.roleStrategist,
  scout: C.roleScout,
  runner: C.roleRunner,
  rookie: C.roleRookie,
};

/** Statut de recrutement (§9) → Entry localisée. */
export const RECRUITMENT_E: Readonly<Record<CrewRecruitmentStatus, Entry>> = {
  open: C.recruitOpen,
  on_request: C.recruitOnRequest,
  invite_only: C.recruitInviteOnly,
  closed: C.recruitClosed,
};

/** Palier de coffre (§39.2) → Entry localisée. */
export const TIER_E: Readonly<Record<CrewChestTier, Entry>> = {
  bronze: C.tierBronze,
  silver: C.tierSilver,
  gold: C.tierGold,
  carbon: C.tierCarbon,
  elite: C.tierElite,
};

/**
 * RSVP défense (feed.ts) — les CLÉS restent les valeurs historiques (état
 * local/persisté), seule la présentation est localisée.
 */
export const DEFENSE_RSVP_E: Readonly<Record<string, Entry>> = {
  'Je participe': C.rsvpJoin,
  'Peut-être': C.rsvpMaybe,
  Indispo: C.rsvpNo,
};

/** RSVP sortie (events.ts) — mêmes clés persistées, présentation localisée. */
export const OUTING_RSVP_E: Readonly<Record<string, Entry>> = {
  'Je viens': C.rsvpComing,
  'Peut-être': C.rsvpMaybe,
  Indispo: C.rsvpNo,
};

/**
 * Signal crew (AMENDEMENT-44 A4) → libellé localisé.
 *
 * Le `Record<CrewSignalKey, Entry>` est le VERROU du lot : ajouter une clé au
 * catalogue moteur (`CREW_SIGNALS`) sans ses 5 traductions ne compile plus. Un
 * signal ne peut donc jamais s'afficher en clé technique, ni dans une seule
 * langue — le vocabulaire figé reste figé dans les 5.
 */
export const CREW_SIGNAL_E: Readonly<Record<CrewSignalKey, Entry>> = {
  defend_now: C.sigDefendNow,
  defend_tonight: C.sigDefendTonight,
  defend_backup: C.sigDefendBackup,
  defend_covered: C.sigDefendCovered,
  attack_now: C.sigAttackNow,
  attack_tonight: C.sigAttackTonight,
  attack_backup: C.sigAttackBackup,
  attack_split: C.sigAttackSplit,
  loop_closing: C.sigLoopClosing,
  loop_open: C.sigLoopOpen,
  watch: C.sigWatch,
  gather_tonight: C.sigGatherTonight,
  gather_tomorrow: C.sigGatherTomorrow,
  gather_weekend: C.sigGatherWeekend,
  gather_out: C.sigGatherOut,
};

/** Motifs de signalement (moderation.ts, clés inchangées hors périmètre). */
export const REPORT_REASON_E: Readonly<
  Record<'spam' | 'haine' | 'harcelement' | 'autre', { label: Entry; hint: Entry }>
> = {
  spam: { label: C.reasonSpam, hint: C.reasonSpamHint },
  haine: { label: C.reasonHate, hint: C.reasonHateHint },
  harcelement: { label: C.reasonHarassment, hint: C.reasonHarassmentHint },
  autre: { label: C.reasonOther, hint: C.reasonOtherHint },
};
