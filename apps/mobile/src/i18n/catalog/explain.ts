/**
 * GRYD — i18n : catalogue du domaine EXPLAIN (explicabilité, AMENDEMENT-23 §B).
 * Couvre : la page « Calcul des zones » (6 scènes), la FAQ « Calculs & règles »
 * (20 Q/R §33 + FAQ courte post-run §34) et les libellés par défaut des 6
 * schémas SVG pédagogiques (§31).
 *
 * Source de vérité des 5 langues. Les textes FR reprennent la copie AFFICHÉE
 * aujourd'hui (réécritures zéro-friction incluses : « compte en stats », Q3 en
 * liste, total additif 214 + 33 = 247, préfixe « Exemple : » systématique) —
 * les anciens overrides d'écran sont donc fondus ici.
 *
 * Règles : tutoiement fr / « du » de / « tú » es / « você » pt informel ;
 * invariants jamais traduits (GRYD, GRYD Verify, Crew, KORO, LENA, République,
 * Finisher, GPS, XP, km, m, min, h) ; mêmes {placeholders} dans les 5 langues ;
 * aucun nombre de règle en dur — les valeurs arrivent par placeholders depuis
 * labels.ts (dérivées de game-rules.ts). §A : libellés courts partout (les
 * variantes de/pt sont volontairement condensées pour les zones étroites des
 * schémas SVG).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── AMENDEMENT-41 : LE RELAIS (sorties de groupe) ─────────────────────────
  qRelayQ: {
    fr: 'On a couru à plusieurs — qui prend la zone ?',
    en: 'We ran together — who takes the zone?',
    es: 'Corrimos juntos — ¿quién toma la zona?',
    de: 'Wir sind zusammen gelaufen — wer bekommt die Zone?',
    pt: 'Corremos juntos — quem fica com a zona?',
  },
  /** §A : 4 phrases courtes, une règle par phrase. */
  qRelayA: {
    fr: 'La zone va au premier arrivé. Les autres sont payés quand même. Ta part : 1 divisé par ton rang. Le 2ᵉ touche la moitié des points, le 3ᵉ le tiers, le 30ᵉ le trentième.',
    en: 'The zone goes to whoever finishes first. The others still get paid. Your share: 1 divided by your rank. 2nd gets half the points, 3rd a third, 30th a thirtieth.',
    es: 'La zona es del primero en llegar. Los demás cobran igual. Tu parte: 1 dividido por tu puesto. El 2.º recibe la mitad de los puntos, el 3.º un tercio, el 30.º una trigésima parte.',
    de: 'Die Zone geht an den, der zuerst fertig ist. Die anderen werden trotzdem bezahlt. Dein Anteil: 1 geteilt durch deinen Rang. Der 2. bekommt die Hälfte der Punkte, der 3. ein Drittel, der 30. ein Dreißigstel.',
    pt: 'A zona vai para quem chega primeiro. Os outros recebem mesmo assim. Sua parte: 1 dividido pelo seu lugar. O 2.º recebe metade dos pontos, o 3.º um terço, o 30.º um trigésimo.',
  },
  // ─── Fragments partagés (labels.ts les remplit avec les constantes) ────────
  /** « 14 jours » — durées en jours. */
  nDays: {
    fr: '{n} jours',
    en: '{n} days',
    es: '{n} días',
    de: '{n} Tage',
    pt: '{n} dias',
  },
  /** « 10 pts » — valeur d'une zone (dérivée de POINTS_BASE_PER_ZONE × coeff). */
  nPoints: {
    fr: '{n} pts',
    en: '{n} pts',
    es: '{n} pts',
    de: '{n} Pkt',
    pt: '{n} pts',
  },
  /** « 1 200 zones » — plafond quotidien. */
  nZones: {
    fr: '{n} zones',
    en: '{n} zones',
    es: '{n} zonas',
    de: '{n} Zonen',
    pt: '{n} zonas',
  },
  /** Fenêtre « fragile » du cycle de vie : « jours 8 à 14 ». */
  lifecycleFragile: {
    fr: 'jours {a} à {b}',
    en: 'days {a} to {b}',
    es: 'días {a} a {b}',
    de: 'Tag {a} bis {b}',
    pt: 'dias {a} a {b}',
  },
  /** Fenêtre « à défendre » : « dernières 48 h ». */
  lifecycleDefend: {
    fr: 'dernières {h} h',
    en: 'last {h} h',
    es: 'últimas {h} h',
    de: 'letzten {h} h',
    pt: 'últimas {h} h',
  },
  /** Fenêtre « expirée » : « après 14 jours ». */
  lifecycleDecay: {
    fr: 'après {n} jours',
    en: 'after {n} days',
    es: 'tras {n} días',
    de: 'nach {n} Tagen',
    pt: 'após {n} dias',
  },
  /** Contribution minimale du finisher : « 400 m ou 15 % » (typo % par langue). */
  finisherMin: {
    fr: '{m} ou {pct} %',
    en: '{m} or {pct}%',
    es: '{m} o {pct} %',
    de: '{m} oder {pct} %',
    pt: '{m} ou {pct}%',
  },
  /** Cap total des bonus : « +35 % ». */
  bonusCap: {
    fr: '+{pct} %',
    en: '+{pct}%',
    es: '+{pct} %',
    de: '+{pct} %',
    pt: '+{pct}%',
  },
  /** Phrase des 3 issues verify ({full}=80, {partial}=60). */
  verifyTiers: {
    fr: '{full}+ : capture pleine · {partial}-{full} : capture partielle · < {partial} : compte en stats',
    en: '{full}+: full capture · {partial}-{full}: partial capture · < {partial}: stats only',
    es: '{full}+: captura completa · {partial}-{full}: captura parcial · < {partial}: solo stats',
    de: '{full}+: volle Eroberung · {partial}-{full}: teilweise · < {partial}: nur Stats',
    pt: '{full}+: captura completa · {partial}-{full}: captura parcial · < {partial}: só stats',
  },
  /** Préfixe d'honnêteté sur un contenu injecté ({text} = phrase complète). */
  examplePrefixed: {
    fr: 'Exemple : {text}',
    en: 'Example: {text}',
    es: 'Ejemplo: {text}',
    de: 'Beispiel: {text}',
    pt: 'Exemplo: {text}',
  },

  // ─── Écran « Calcul des zones » (visite guidée) ────────────────────────────
  calcTitle: {
    fr: 'Calcul des zones',
    en: 'Zone calculation',
    es: 'Cálculo de zonas',
    de: 'Zonen-Berechnung',
    pt: 'Cálculo de zonas',
  },
  /** Kicker MAJUSCULES ({n} = nombre d'étapes). */
  calcKicker: {
    fr: 'VISITE GUIDÉE · {n} ÉTAPES',
    en: 'GUIDED TOUR · {n} STEPS',
    es: 'VISITA GUIADA · {n} PASOS',
    de: 'GEFÜHRTE TOUR · {n} SCHRITTE',
    pt: 'TOUR GUIADO · {n} ETAPAS',
  },
  calcSubtitle: {
    fr: 'Chaque zone gagnée s’explique — chaque zone refusée aussi.',
    en: 'Every zone you win has a reason — every zone refused too.',
    es: 'Cada zona ganada se explica — y cada zona rechazada también.',
    de: 'Jede gewonnene Zone lässt sich erklären — jede abgelehnte auch.',
    pt: 'Cada zona ganha se explica — cada zona recusada também.',
  },
  /** Lien de pied vers la FAQ (texte + a11y — verbe + objet, §A court). */
  calcSeeAllQuestions: {
    fr: 'Voir toutes les questions',
    en: 'See all questions',
    es: 'Ver todas las preguntas',
    de: 'Alle Fragen ansehen',
    pt: 'Ver todas as perguntas',
  },
  /** Libellé du palier validé injecté au schéma verify ({n} = seuil complet). */
  verifyValidWithTier: {
    fr: 'Capture validée · {n}+',
    en: 'Valid capture · {n}+',
    es: 'Captura válida · {n}+',
    de: 'Gültig · {n}+',
    pt: 'Captura válida · {n}+',
  },
  /** Libellé du palier exclu injecté au schéma verify ({n} = seuil partiel). */
  verifyExcludedWithTier: {
    fr: 'Segment exclu · < {n}',
    en: 'Excluded · < {n}',
    es: 'Excluido · < {n}',
    de: 'Gestrichen · < {n}',
    pt: 'Excluído · < {n}',
  },

  // ─── Les 6 scènes (§32) : titre + phrase + exemple ─────────────────────────
  secLigneTitle: {
    fr: 'La ligne prend les rues',
    en: 'A line takes the streets',
    es: 'La línea toma las calles',
    de: 'Die Linie nimmt die Straßen',
    pt: 'A linha toma as ruas',
  },
  secLigneLine: {
    fr: 'Une course qui ne se referme pas prend les rues qu’elle traverse — elles sont à toi. Pas de zone pleine : ferme la boucle pour l’intérieur.',
    en: 'A run that doesn’t close still takes the streets it crosses — they’re yours. No full zone though: close the loop to claim the inside.',
    es: 'Una carrera que no se cierra toma las calles que recorre: son tuyas. Pero sin zona completa: cierra el bucle para ganar el interior.',
    de: 'Ein Lauf, der sich nicht schließt, nimmt die Straßen, die du läufst — sie gehören dir. Aber keine volle Zone: Schließ den Loop für das Innere.',
    pt: 'Uma corrida que não se fecha toma as ruas por onde você passa — elas são suas. Mas sem zona cheia: feche o loop para ganhar o interior.',
  },
  secLigneExample: {
    fr: 'Exemple : Base → République, 4,2 km : les rues courues sont à toi, mais pas de zone pleine.',
    en: 'Example: Base → République, 4.2 km: the streets you ran are yours, but no full zone.',
    es: 'Ejemplo: Base → République, 4,2 km: las calles corridas son tuyas, pero sin zona completa.',
    de: 'Beispiel: Base → République, 4,2 km: die gelaufenen Straßen gehören dir, aber keine volle Zone.',
    pt: 'Exemplo: Base → République, 4,2 km: as ruas corridas são suas, mas sem zona cheia.',
  },
  secBoucleTitle: {
    fr: 'La boucle crée une zone',
    en: 'The loop makes a zone',
    es: 'El bucle crea una zona',
    de: 'Der Loop macht die Zone',
    pt: 'O loop cria uma zona',
  },
  secBoucleLine: {
    fr: 'Quand ton tracé revient à son départ, GRYD remplit l’intérieur : c’est ta zone.',
    en: 'When your route returns to its start, GRYD fills the inside: that’s your zone.',
    es: 'Cuando tu recorrido vuelve a su inicio, GRYD rellena el interior: es tu zona.',
    de: 'Kehrt deine Route zum Start zurück, füllt GRYD das Innere: Das ist deine Zone.',
    pt: 'Quando seu trajeto volta ao ponto de partida, o GRYD preenche o interior: é a sua zona.',
  },
  /** Exemple ADDITIF avec unité nommée (zéro-friction) — chiffres démo. */
  secBoucleExample: {
    fr: 'Exemple : trace seule +214 zones · fermeture de la boucle +33 = 247 zones.',
    en: 'Example: trace alone +214 zones · closing the loop +33 = 247 zones.',
    es: 'Ejemplo: solo el trazado +214 zonas · cerrar el bucle +33 = 247 zonas.',
    de: 'Beispiel: Spur allein +214 Zonen · Loop geschlossen +33 = 247 Zonen.',
    pt: 'Exemplo: só o traçado +214 zonas · fechar o loop +33 = 247 zonas.',
  },
  // ── Scène « Ce que vaut une zone » (formule §23, valeurs game-rules) ───────
  secValeurTitle: {
    fr: 'Une zone vaut des points',
    en: 'A zone is worth points',
    es: 'Una zona vale puntos',
    de: 'Eine Zone bringt Punkte',
    pt: 'Uma zona vale pontos',
  },
  secValeurLine: {
    fr: 'Chaque zone rapporte. Une zone libre vaut sa valeur de base. Défendre la tienne rapporte un peu plus. La prendre à un rival rapporte le plus.',
    en: 'Every zone pays. A free zone is worth the base value. Defending yours pays a little more. Taking one from a rival pays the most.',
    es: 'Cada zona da puntos. Una zona libre vale el valor base. Defender la tuya da un poco más. Quitársela a un rival da lo máximo.',
    de: 'Jede Zone bringt Punkte. Eine freie Zone bringt den Grundwert. Deine eigene zu verteidigen bringt etwas mehr. Einem Rivalen eine abzunehmen bringt am meisten.',
    pt: 'Cada zona rende. Uma zona livre vale o valor base. Defender a sua rende um pouco mais. Tirar de um rival rende o máximo.',
  },
  /** {bonus} = bonus pionnier max (dérivé de POINTS_PIONEER_BONUS_BY_DENSITY). */
  secValeurExample: {
    fr: 'Personne n’était jamais passé là ? Tu es pionnier : jusqu’à {bonus} en plus sur la zone.',
    en: 'Nobody ever ran there? You’re the pioneer: up to {bonus} extra on that zone.',
    es: '¿Nadie había pasado nunca por ahí? Eres pionero: hasta {bonus} extra en la zona.',
    de: 'Da war noch nie jemand? Du bist Pionier: bis zu {bonus} extra auf die Zone.',
    pt: 'Ninguém nunca passou por ali? Você é pioneiro: até {bonus} a mais na zona.',
  },

  // ── Scène « Plusieurs sur la même zone » (LE RELAIS, A-41) ────────────────
  secRelaisTitle: {
    fr: 'Plusieurs sur la zone',
    en: 'Several on one zone',
    es: 'Varios en la misma zona',
    de: 'Mehrere auf einer Zone',
    pt: 'Vários na mesma zona',
  },
  secRelaisLine: {
    fr: 'Vous courez la même boucle à plusieurs ? La zone va au premier arrivé. Tous les autres touchent des points : 1 divisé par leur rang.',
    en: 'Running the same loop together? The zone goes to whoever finishes first. Everyone else earns points: 1 divided by their rank.',
    es: '¿Corréis el mismo bucle varios? La zona es del primero en llegar. Todos los demás ganan puntos: 1 dividido por su puesto.',
    de: 'Ihr lauft denselben Loop zu mehreren? Die Zone geht an den Ersten. Alle anderen bekommen Punkte: 1 geteilt durch ihren Rang.',
    pt: 'Correram o mesmo loop juntos? A zona vai para o primeiro. Todos os outros ganham pontos: 1 dividido pelo lugar deles.',
  },
  /** {bonus} = allongement max du verrou en groupe (GROUP_CAPTURE_BONUS_MAX_PCT). */
  secRelaisExample: {
    fr: 'Personne ne court pour rien. Et à plusieurs, la zone tient jusqu’à {bonus} plus longtemps.',
    en: 'Nobody runs for nothing. And together, the zone holds up to {bonus} longer.',
    es: 'Nadie corre en vano. Y juntos, la zona aguanta hasta {bonus} más.',
    de: 'Niemand läuft umsonst. Und gemeinsam hält die Zone bis zu {bonus} länger.',
    pt: 'Ninguém corre à toa. E juntos, a zona dura até {bonus} mais.',
  },

  // ── Scène « Une zone s'use » (decay + statuts) ─────────────────────────────
  secVieTitle: {
    fr: 'Une zone s’use',
    en: 'A zone wears out',
    es: 'Una zona se desgasta',
    de: 'Eine Zone nutzt sich ab',
    pt: 'Uma zona se desgasta',
  },
  /** {stable} = « 7 jours », {decay} = « 14 jours » (game-rules). */
  secVieLine: {
    fr: 'Une zone que tu ne recours pas s’affaiblit. Elle reste solide {stable}. Ensuite elle devient fragile. Elle redevient libre {decay}.',
    en: 'A zone you don’t run again gets weaker. It stays solid for {stable}. Then it turns fragile. It goes free again {decay}.',
    es: 'Una zona que no vuelves a correr se debilita. Aguanta firme {stable}. Después se vuelve frágil. Vuelve a estar libre {decay}.',
    de: 'Eine Zone, die du nicht erneut läufst, wird schwächer. Sie bleibt {stable} stabil. Dann wird sie fragil. {decay} ist sie wieder frei.',
    pt: 'Uma zona que você não corre de novo enfraquece. Ela fica firme {stable}. Depois fica frágil. Volta a ficar livre {decay}.',
  },
  /** N'AJOUTE rien au schema en le repetant : dit ce que le schema ne dit pas. */
  secVieExample: {
    fr: 'Tu ne perds jamais une zone par surprise : GRYD te prévient avant qu’elle tombe.',
    en: 'You never lose a zone by surprise: GRYD warns you before it falls.',
    es: 'Nunca pierdes una zona por sorpresa: GRYD te avisa antes de que caiga.',
    de: 'Du verlierst nie überraschend eine Zone: GRYD warnt dich, bevor sie fällt.',
    pt: 'Você nunca perde uma zona de surpresa: o GRYD te avisa antes de ela cair.',
  },

  secDefenseTitle: {
    fr: 'La défense protège',
    en: 'Defense protects',
    es: 'La defensa protege',
    de: 'Verteidigung schützt',
    pt: 'A defesa protege',
  },
  secDefenseLine: {
    fr: 'Repasser sur ta frontière prolonge ta zone : plus tu la couvres, plus elle tient.',
    en: 'Running your border again extends your zone: the more you cover, the longer it holds.',
    es: 'Volver a correr tu frontera prolonga tu zona: cuanto más la cubres, más aguanta.',
    de: 'Läufst du deine Grenze erneut, hält deine Zone länger: Je mehr du abdeckst, desto länger bleibt sie.',
    pt: 'Repassar sua fronteira prolonga sua zona: quanto mais você cobre, mais ela dura.',
  },
  /** {traverse}/{longe}/{cover} = « +24 h » etc., dérivés de game-rules. */
  secDefenseExample: {
    fr: 'Exemple : Traverser {traverse} · longer {longe} · couvrir {cover}.',
    en: 'Example: cross {traverse} · follow {longe} · cover {cover}.',
    es: 'Ejemplo: cruzar {traverse} · bordear {longe} · cubrir {cover}.',
    de: 'Beispiel: queren {traverse} · entlanglaufen {longe} · abdecken {cover}.',
    pt: 'Exemplo: cruzar {traverse} · margear {longe} · cobrir {cover}.',
  },
  secCrewTitle: {
    fr: 'Le crew ferme ensemble',
    en: 'The crew closes together',
    es: 'El crew cierra en equipo',
    de: 'Die Crew schließt gemeinsam',
    pt: 'O crew fecha junto',
  },
  /** Vérité moteur : une zone appartient TOUJOURS à un joueur, jamais au crew. */
  secCrewLine: {
    fr: 'Tu ouvres une frontière, un membre du crew la referme. La zone revient à celui qui a fermé. Elle agrandit le territoire du crew.',
    en: 'You open a border, a crew member closes it. The zone goes to whoever closed it. It grows your crew’s territory.',
    es: 'Tú abres una frontera y otro del crew la cierra. La zona es de quien la cerró. Y agranda el territorio del crew.',
    de: 'Du öffnest eine Grenze, ein Crew-Mitglied schließt sie. Die Zone gehört dem, der geschlossen hat. Sie vergrößert das Gebiet der Crew.',
    pt: 'Você abre uma fronteira, alguém do crew fecha. A zona fica com quem fechou. E aumenta o território do crew.',
  },
  secCrewExample: {
    fr: 'Exemple : KORO ouvre 79 %, LENA ferme 21 % : la zone est à LENA, le crew grandit.',
    en: 'Example: KORO opens 79%, LENA closes 21%: the zone is LENA’s, the crew grows.',
    es: 'Ejemplo: KORO abre el 79 %, LENA cierra el 21 %: la zona es de LENA, el crew crece.',
    de: 'Beispiel: KORO öffnet 79 %, LENA schließt 21 %: Die Zone gehört LENA, die Crew wächst.',
    pt: 'Exemplo: KORO abre 79%, LENA fecha 21%: a zona é da LENA, o crew cresce.',
  },
  secBonusTitle: {
    fr: 'Les bonus sont ciblés',
    en: 'Bonuses are targeted',
    es: 'Bonus bien dirigidos',
    de: 'Boni sind gezielt',
    pt: 'Os bônus são certeiros',
  },
  secBonusLine: {
    fr: 'Les bonus visent le bon moment (boucle presque fermée, zone qui expire), jamais du territoire.',
    en: 'Bonuses target the right moment (a loop almost closed, a zone about to expire) — never territory.',
    es: 'Los bonus apuntan al momento justo (bucle casi cerrado, zona por expirar), nunca al territorio.',
    de: 'Boni zielen auf den richtigen Moment (fast geschlossener Loop, ablaufende Zone) — nie auf Territorium.',
    pt: 'Os bônus miram o momento certo (loop quase fechado, zona expirando), nunca território.',
  },
  secBonusExample: {
    fr: 'Exemple : Il reste 620 m à fermer : bonus Finisher actif.',
    en: 'Example: 620 m left to close: Finisher bonus active.',
    es: 'Ejemplo: quedan 620 m para cerrar: bonus Finisher activo.',
    de: 'Beispiel: Noch 620 m bis zum Schluss: Finisher-Bonus aktiv.',
    pt: 'Exemplo: faltam 620 m para fechar: bônus Finisher ativo.',
  },
  secVerifyTitle: {
    fr: 'GRYD Verify valide',
    en: 'GRYD Verify validates',
    es: 'GRYD Verify valida',
    de: 'GRYD Verify prüft',
    pt: 'O GRYD Verify valida',
  },
  secVerifyLine: {
    fr: 'GRYD vérifie GPS et mouvement : une course fiable capture, une course douteuse compte en stats.',
    en: 'GRYD checks GPS and motion: a reliable run captures, a doubtful one counts as stats.',
    es: 'GRYD revisa GPS y movimiento: una carrera fiable captura, una dudosa cuenta como stats.',
    de: 'GRYD prüft GPS und Bewegung: Ein sauberer Lauf erobert, ein zweifelhafter zählt nur als Stats.',
    pt: 'O GRYD verifica GPS e movimento: corrida confiável captura, corrida duvidosa conta como stats.',
  },

  // ─── Écran FAQ « Calculs & règles » ────────────────────────────────────────
  faqTitle: {
    fr: 'Calculs & règles',
    en: 'Rules & math',
    es: 'Cálculos y reglas',
    de: 'Regeln & Berechnung',
    pt: 'Cálculos e regras',
  },
  faqKicker: {
    fr: 'QUESTIONS & RÉPONSES',
    en: 'QUESTIONS & ANSWERS',
    es: 'PREGUNTAS Y RESPUESTAS',
    de: 'FRAGEN & ANTWORTEN',
    pt: 'PERGUNTAS E RESPOSTAS',
  },
  faqSubtitle: {
    fr: 'Toutes les réponses, détails au tap. Chaque capture — ou refus — s’explique.',
    en: 'Every answer, details on tap. Every capture — or refusal — has a reason.',
    es: 'Todas las respuestas, detalles al tocar. Cada captura — o rechazo — se explica.',
    de: 'Alle Antworten, Details per Tipp. Jede Eroberung — oder Ablehnung — lässt sich erklären.',
    pt: 'Todas as respostas, detalhes ao tocar. Cada captura — ou recusa — se explica.',
  },
  /** Segmented control (§A : mots courts, jamais tronqués à 375 px). */
  faqSimple: {
    fr: 'Simple',
    en: 'Simple',
    es: 'Simple',
    de: 'Einfach',
    pt: 'Simples',
  },
  faqAdvanced: {
    fr: 'Avancé',
    en: 'Advanced',
    es: 'Avanzado',
    de: 'Erweitert',
    pt: 'Avançado',
  },
  faqSimpleA11y: {
    fr: 'Réponses simples',
    en: 'Simple answers',
    es: 'Respuestas simples',
    de: 'Einfache Antworten',
    pt: 'Respostas simples',
  },
  faqAdvancedA11y: {
    fr: 'Réponses avancées',
    en: 'Advanced answers',
    es: 'Respuestas avanzadas',
    de: 'Erweiterte Antworten',
    pt: 'Respostas avançadas',
  },
  /** En-tête de la FAQ courte post-run (§34). */
  faqPostRunGroup: {
    fr: 'Après une course',
    en: 'After a run',
    es: 'Después de una carrera',
    de: 'Nach einem Lauf',
    pt: 'Depois de uma corrida',
  },
  faqFootnote: {
    fr: 'Une question sans réponse ici ? L’aide GRYD reprend chaque cas, et une personne lit chaque demande.',
    en: 'A question without an answer here? GRYD support covers every case, and a human reads every request.',
    es: '¿Una pregunta sin respuesta aquí? La ayuda de GRYD cubre cada caso, y una persona lee cada solicitud.',
    de: 'Eine Frage ohne Antwort hier? Der GRYD-Support deckt jeden Fall ab, und ein Mensch liest jede Anfrage.',
    pt: 'Uma pergunta sem resposta aqui? A ajuda do GRYD cobre cada caso, e uma pessoa lê cada pedido.',
  },

  // ─── Libellés des catégories FAQ ───────────────────────────────────────────
  catZones: {
    fr: 'Zones & boucles',
    en: 'Zones & loops',
    es: 'Zonas y bucles',
    de: 'Zonen & Loops',
    pt: 'Zonas e loops',
  },
  catDefense: {
    fr: 'Défense & durée',
    en: 'Defense & duration',
    es: 'Defensa y duración',
    de: 'Verteidigung & Dauer',
    pt: 'Defesa e duração',
  },
  catCrew: {
    fr: 'Crew',
    en: 'Crew',
    es: 'Crew',
    de: 'Crew',
    pt: 'Crew',
  },
  catVerify: {
    fr: 'GRYD Verify',
    en: 'GRYD Verify',
    es: 'GRYD Verify',
    de: 'GRYD Verify',
    pt: 'GRYD Verify',
  },
  catEconomie: {
    fr: 'Points & bonus',
    en: 'Points & bonuses',
    es: 'Puntos y bonus',
    de: 'Punkte & Boni',
    pt: 'Pontos e bônus',
  },

  // ─── Les 20 Q/R (§33) ──────────────────────────────────────────────────────
  q1Q: {
    fr: 'Comment GRYD calcule une zone ?',
    en: 'How does GRYD compute a zone?',
    es: '¿Cómo calcula GRYD una zona?',
    de: 'Wie berechnet GRYD eine Zone?',
    pt: 'Como o GRYD calcula uma zona?',
  },
  q1A: {
    fr: 'GRYD analyse ton tracé GPS. Si ton parcours forme une boucle valide, l’intérieur devient ta zone.',
    en: 'GRYD analyzes your GPS trace. If your route forms a valid loop, the inside becomes your zone.',
    es: 'GRYD analiza tu trazado GPS. Si tu recorrido forma un bucle válido, el interior se convierte en tu zona.',
    de: 'GRYD analysiert deine GPS-Spur. Bildet deine Route einen gültigen Loop, wird das Innere zu deiner Zone.',
    pt: 'O GRYD analisa seu traçado GPS. Se o percurso forma um loop válido, o interior vira sua zona.',
  },
  q2Q: {
    fr: 'Courir tout droit, ça capture quelque chose ?',
    en: 'Does running in a straight line capture anything?',
    es: 'Correr en línea recta, ¿captura algo?',
    de: 'Bringt Geradeauslaufen überhaupt etwas?',
    pt: 'Correr em linha reta captura alguma coisa?',
  },
  q2A: {
    fr: 'Oui : les rues que tu traverses deviennent à toi. Ça n’ouvre pas une ZONE pleine (l’intérieur) — pour ça, ferme une boucle.',
    en: 'Yes: the streets you cross become yours. It doesn’t open a full ZONE (the inside) — for that, close a loop.',
    es: 'Sí: las calles que recorres pasan a ser tuyas. No abre una ZONA completa (el interior); para eso, cierra un bucle.',
    de: 'Ja: Die Straßen, die du läufst, gehören dir. Eine volle ZONE (das Innere) gibt es so nicht — dafür schließt du einen Loop.',
    pt: 'Sim: as ruas por onde você passa ficam suas. Isso não abre uma ZONA cheia (o interior) — para isso, feche um loop.',
  },
  q3Q: {
    fr: 'Pourquoi ma boucle n’a pas créé de zone ?',
    en: 'Why didn’t my loop create a zone?',
    es: '¿Por qué mi bucle no creó una zona?',
    de: 'Warum hat mein Loop keine Zone erzeugt?',
    pt: 'Por que meu loop não criou uma zona?',
  },
  /** UNE raison de refus par ligne, chaque seuil étiqueté (zéro-friction). */
  q3A: {
    fr: '· Boucle non refermée : écart départ-arrivée > {close}.\n· Signal GPS trop faible : indice sous {gps}.\n· Tracé trop étroit : moins de {width} de large.\n· Surface trop petite, ou au-dessus du plafond.\n· Course trop courte : moins de {dist} ou {dur}.',
    en: '· Loop not closed: start-finish gap > {close}.\n· GPS signal too weak: score under {gps}.\n· Route too narrow: less than {width} wide.\n· Area too small, or above the cap.\n· Run too short: under {dist} or {dur}.',
    es: '· Bucle sin cerrar: distancia inicio-final > {close}.\n· Señal GPS muy débil: índice bajo {gps}.\n· Trazado muy estrecho: menos de {width} de ancho.\n· Superficie muy pequeña, o por encima del tope.\n· Carrera muy corta: menos de {dist} o {dur}.',
    de: '· Loop nicht geschlossen: Lücke Start-Ziel > {close}.\n· GPS-Signal zu schwach: Wert unter {gps}.\n· Route zu schmal: weniger als {width} breit.\n· Fläche zu klein oder über dem Limit.\n· Lauf zu kurz: unter {dist} oder {dur}.',
    pt: '· Loop não fechado: distância início-fim > {close}.\n· Sinal GPS fraco demais: índice abaixo de {gps}.\n· Traçado estreito demais: menos de {width} de largura.\n· Área pequena demais, ou acima do teto.\n· Corrida curta demais: menos de {dist} ou {dur}.',
  },
  q4Q: {
    fr: 'Que veut dire « frontière couverte » ?',
    en: 'What does “covered border” mean?',
    es: '¿Qué significa «frontera cubierta»?',
    de: 'Was heißt „abgedeckte Grenze“?',
    pt: 'O que significa “fronteira coberta”?',
  },
  q4A: {
    fr: 'La portion de ta frontière que tu as vraiment courue. GRYD mesure ce qui passe à moins de {buffer} de ton tracé.',
    en: 'The share of your border you actually ran. GRYD measures what passes within {buffer} of your trace.',
    es: 'La parte de tu frontera que corriste de verdad. GRYD mide lo que pasa a menos de {buffer} de tu trazado.',
    de: 'Der Teil deiner Grenze, den du wirklich gelaufen bist. GRYD misst, was näher als {buffer} an deiner Spur liegt.',
    pt: 'A parte da sua fronteira que você realmente correu. O GRYD mede o que passa a menos de {buffer} do seu traçado.',
  },
  q5Q: {
    fr: 'Un membre du crew peut-il finir ma boucle ?',
    en: 'Can a crew member finish my loop?',
    es: '¿Puede un miembro del crew terminar mi bucle?',
    de: 'Kann jemand aus der Crew meinen Loop beenden?',
    pt: 'Alguém do crew pode terminar meu loop?',
  },
  q5A: {
    fr: 'Oui. Si tu ouvres une frontière et qu’il manque un segment, ton crew a {window} pour la refermer (contribution mini {min}).',
    en: 'Yes. If you open a border and a segment is missing, your crew has {window} to close it (minimum contribution {min}).',
    es: 'Sí. Si abres una frontera y falta un segmento, tu crew tiene {window} para cerrarla (contribución mínima {min}).',
    de: 'Ja. Öffnest du eine Grenze und ein Segment fehlt, hat deine Crew {window}, um sie zu schließen (Mindestbeitrag {min}).',
    pt: 'Sim. Se você abre uma fronteira e falta um segmento, seu crew tem {window} para fechá-la (contribuição mínima {min}).',
  },
  q6Q: {
    fr: 'Un rival peut-il finir ma boucle ?',
    en: 'Can a rival finish my loop?',
    es: '¿Puede un rival terminar mi bucle?',
    de: 'Kann ein Rivale meinen Loop beenden?',
    pt: 'Um rival pode terminar meu loop?',
  },
  q6A: {
    fr: 'Non. Un rival peut contester la zone, jamais fermer ta boucle. En revanche, s’il a couru la même boucle que toi, il touche sa part comme tout le monde.',
    en: 'No. A rival can contest the zone, never close your loop. But if they ran the same loop as you, they get their share like everyone else.',
    es: 'No. Un rival puede disputar la zona, nunca cerrar tu bucle. Eso sí, si corrió el mismo bucle que tú, cobra su parte como todos.',
    de: 'Nein. Ein Rivale kann die Zone umkämpfen, aber nie deinen Loop schließen. Ist er denselben Loop gelaufen, bekommt er aber seinen Anteil wie alle.',
    pt: 'Não. Um rival pode disputar a zona, nunca fechar seu loop. Mas se ele correu o mesmo loop que você, recebe a parte dele como todo mundo.',
  },
  q7Q: {
    fr: 'Comment GRYD calcule les zones reprises à un rival ?',
    en: 'How does GRYD count zones taken from a rival?',
    es: '¿Cómo calcula GRYD las zonas quitadas a un rival?',
    de: 'Wie berechnet GRYD von Rivalen eroberte Zonen?',
    pt: 'Como o GRYD calcula zonas tomadas de um rival?',
  },
  /** {steal} = valeur d'une zone volée (game-rules), {n} = valeur de base. */
  q7A: {
    fr: 'Ta boucle passe sur son territoire, tu le prends. Une zone reprise rapporte plus qu’une zone libre : {steal} au lieu de {base}. Sauf si elle est protégée — voir « Pourquoi je n’ai pas pu prendre cette zone ? ».',
    en: 'Your loop runs over their territory, you take it. A retaken zone pays more than a free one: {steal} instead of {base}. Unless it’s protected — see “Why couldn’t I take that zone?”.',
    es: 'Tu bucle pasa por su territorio y se lo quitas. Una zona recuperada da más que una libre: {steal} en vez de {base}. Salvo que esté protegida — mira «¿Por qué no pude tomar esa zona?».',
    de: 'Dein Loop läuft über sein Gebiet, du nimmst es. Eine zurückeroberte Zone bringt mehr als eine freie: {steal} statt {base}. Außer sie ist geschützt — siehe „Warum konnte ich diese Zone nicht nehmen?“.',
    pt: 'Seu loop passa pelo território dele, você toma. Uma zona retomada rende mais que uma livre: {steal} em vez de {base}. A não ser que esteja protegida — veja “Por que não consegui pegar essa zona?”.',
  },
  q8Q: {
    fr: 'Pourquoi une partie de ma course est « segment exclu » ?',
    en: 'Why is part of my run an “excluded segment”?',
    es: '¿Por qué parte de mi carrera es «segmento excluido»?',
    de: 'Warum ist ein Teil meines Laufs „gestrichen“?',
    pt: 'Por que parte da minha corrida é “segmento excluído”?',
  },
  q8A: {
    fr: 'GPS faible, vitesse incohérente, saut GPS ou mouvement suspect. La course reste valide sportivement, mais ce segment ne capture pas.',
    en: 'Weak GPS, inconsistent speed, a GPS jump or suspicious motion. The run still counts as sport, but that segment doesn’t capture.',
    es: 'GPS débil, velocidad incoherente, salto de GPS o movimiento sospechoso. La carrera sigue valiendo como deporte, pero ese segmento no captura.',
    de: 'Schwaches GPS, unplausibles Tempo, GPS-Sprung oder verdächtige Bewegung. Der Lauf zählt sportlich weiter, aber dieses Segment erobert nichts.',
    pt: 'GPS fraco, velocidade incoerente, salto de GPS ou movimento suspeito. A corrida continua valendo como esporte, mas esse segmento não captura.',
  },
  q9Q: {
    fr: 'C’est quoi GRYD Verify ?',
    en: 'What is GRYD Verify?',
    es: '¿Qué es GRYD Verify?',
    de: 'Was ist GRYD Verify?',
    pt: 'O que é o GRYD Verify?',
  },
  /** {sentence} = phrase des paliers verify (fragment verifyTiers rempli). */
  q9A: {
    fr: 'Un contrôle de fiabilité (GPS, vitesse, mouvement, source). {sentence}',
    en: 'A reliability check (GPS, speed, motion, source). {sentence}',
    es: 'Un control de fiabilidad (GPS, velocidad, movimiento, fuente). {sentence}',
    de: 'Ein Zuverlässigkeits-Check (GPS, Tempo, Bewegung, Quelle). {sentence}',
    pt: 'Um controle de confiabilidade (GPS, velocidade, movimento, fonte). {sentence}',
  },
  q10Q: {
    fr: 'Pourquoi ma course compte seulement en stats ?',
    en: 'Why does my run only count as stats?',
    es: '¿Por qué mi carrera solo cuenta como stats?',
    de: 'Warum zählt mein Lauf nur als Stats?',
    pt: 'Por que minha corrida conta só como stats?',
  },
  q10A: {
    fr: 'Elle compte pour tes stats mais pas pour la capture : pas de boucle, GPS sous {partial}, source non éligible ou zone interdite.',
    en: 'It counts for your stats but not for capture: no loop, GPS under {partial}, ineligible source or forbidden area.',
    es: 'Cuenta para tus stats pero no para la captura: sin bucle, GPS bajo {partial}, fuente no válida o zona prohibida.',
    de: 'Er zählt für deine Stats, aber nicht für die Eroberung: kein Loop, GPS unter {partial}, Quelle nicht zulässig oder Sperrgebiet.',
    pt: 'Ela conta para suas stats, mas não para captura: sem loop, GPS abaixo de {partial}, fonte não elegível ou área proibida.',
  },
  q11Q: {
    fr: 'Comment fonctionne la défense ?',
    en: 'How does defense work?',
    es: '¿Cómo funciona la defensa?',
    de: 'Wie funktioniert die Verteidigung?',
    pt: 'Como funciona a defesa?',
  },
  q11A: {
    fr: 'Traverser, longer ou refermer ta frontière. Plus tu la couvres, plus la zone tient : {traverse}, {longe} ou {cover}.',
    en: 'Cross, follow or close your border again. The more you cover, the longer the zone holds: {traverse}, {longe} or {cover}.',
    es: 'Cruza, bordea o vuelve a cerrar tu frontera. Cuanto más la cubres, más aguanta la zona: {traverse}, {longe} o {cover}.',
    de: 'Grenze queren, entlanglaufen oder wieder schließen. Je mehr du abdeckst, desto länger hält die Zone: {traverse}, {longe} oder {cover}.',
    pt: 'Cruzar, margear ou fechar de novo sua fronteira. Quanto mais você cobre, mais a zona dura: {traverse}, {longe} ou {cover}.',
  },
  q12Q: {
    fr: 'Combien de temps une zone reste à nous ?',
    en: 'How long does a zone stay ours?',
    es: '¿Cuánto tiempo sigue siendo nuestra una zona?',
    de: 'Wie lange gehört uns eine Zone?',
    pt: 'Por quanto tempo uma zona continua nossa?',
  },
  /** {stable}/{fragile}/{defend}/{decay} = fenêtres du cycle de vie (fragments). */
  q12A: {
    fr: 'Une zone tient {stable}. Après, elle devient fragile ({fragile}). Les {defend} avant la fin, GRYD te prévient. Sans y repasser, elle est libre {decay}.',
    en: 'A zone holds for {stable}. After that it turns fragile ({fragile}). In the {defend} before the end, GRYD warns you. Without running it again, it goes free {decay}.',
    es: 'Una zona aguanta {stable}. Después se vuelve frágil ({fragile}). En las {defend} antes del final, GRYD te avisa. Sin volver a pasar, queda libre {decay}.',
    de: 'Eine Zone hält {stable}. Danach wird sie fragil ({fragile}). In den {defend} vor Schluss warnt GRYD dich. Ohne erneuten Lauf ist sie {decay} frei.',
    pt: 'Uma zona dura {stable}. Depois fica frágil ({fragile}). Nas {defend} antes do fim, o GRYD te avisa. Sem passar de novo, ela fica livre {decay}.',
  },
  q13Q: {
    fr: 'Les zones expirent-elles ?',
    en: 'Do zones expire?',
    es: '¿Las zonas expiran?',
    de: 'Laufen Zonen ab?',
    pt: 'As zonas expiram?',
  },
  /** {days} = ZONE_DECAY_DAYS. L'ordre compte : fragile AVANT la fin, libre APRÈS. */
  q13A: {
    fr: 'Oui. Une zone s’affaiblit d’abord, puis redevient libre {days} sans que tu y repasses. Un seul passage remet le compte à zéro.',
    en: 'Yes. A zone weakens first, then goes free {days} without you running it again. A single pass resets the count to zero.',
    es: 'Sí. Una zona se debilita primero y luego queda libre {days} sin que vuelvas a pasar. Un solo paso pone la cuenta a cero.',
    de: 'Ja. Eine Zone wird erst schwächer und ist {days} ohne erneuten Lauf wieder frei. Ein einziger Durchlauf setzt die Uhr zurück.',
    pt: 'Sim. Uma zona enfraquece primeiro e depois fica livre {days} sem você passar de novo. Uma única passagem zera a contagem.',
  },
  q14Q: {
    fr: 'Les bonus sont-ils aléatoires ?',
    en: 'Are bonuses random?',
    es: '¿Los bonus son aleatorios?',
    de: 'Sind Boni zufällig?',
    pt: 'Os bônus são aleatórios?',
  },
  q14A: {
    fr: 'Partiellement : aléatoires dans l’apparition, ciblés dans la pertinence (ta position, ton crew, les zones faibles, les boucles ouvertes).',
    en: 'Partly: random in when they appear, targeted in relevance (your position, your crew, weak zones, open loops).',
    es: 'En parte: aleatorios en su aparición, dirigidos en su relevancia (tu posición, tu crew, las zonas débiles, los bucles abiertos).',
    de: 'Teilweise: zufällig im Auftauchen, gezielt in der Relevanz (deine Position, deine Crew, schwache Zonen, offene Loops).',
    pt: 'Em parte: aleatórios no aparecimento, certeiros na relevância (sua posição, seu crew, as zonas fracas, os loops abertos).',
  },
  q15Q: {
    fr: 'Peut-on acheter une zone ?',
    en: 'Can you buy a zone?',
    es: '¿Se puede comprar una zona?',
    de: 'Kann man eine Zone kaufen?',
    pt: 'Dá para comprar uma zona?',
  },
  q15A: {
    fr: 'Non. Le territoire ne s’achète jamais, il se gagne en courant. Les achats servent au style, au confort et au coffre crew.',
    en: 'No. Territory is never bought, it’s earned by running. Purchases are for style, comfort and the crew chest.',
    es: 'No. El territorio nunca se compra, se gana corriendo. Las compras son para estilo, comodidad y el cofre del crew.',
    de: 'Nein. Territorium kauft man nie, man erläuft es. Käufe sind für Style, Komfort und die Crew-Truhe.',
    pt: 'Não. Território nunca se compra, se ganha correndo. As compras servem para estilo, conforto e o baú do crew.',
  },
  q16Q: {
    fr: 'Les bonus payants font-ils gagner ?',
    en: 'Do paid bonuses make you win?',
    es: '¿Los bonus de pago hacen ganar?',
    de: 'Gewinnt man mit bezahlten Boni?',
    pt: 'Bônus pagos fazem ganhar?',
  },
  q16A: {
    fr: 'Non : aucun bonus ne donne de territoire ni de victoire. Pas de cumul, total capé à {cap}, impact sur coffre, XP et cosmétiques seulement.',
    en: 'No: no bonus grants territory or victory. No stacking, total capped at {cap}, impact on chest, XP and cosmetics only.',
    es: 'No: ningún bonus da territorio ni victoria. Sin acumulación, total limitado a {cap}, impacto solo en cofre, XP y cosméticos.',
    de: 'Nein: Kein Bonus bringt Territorium oder Sieg. Kein Stapeln, Gesamtlimit {cap}, wirkt nur auf Truhe, XP und Kosmetik.',
    pt: 'Não: nenhum bônus dá território nem vitória. Sem acúmulo, total limitado a {cap}, impacto só em baú, XP e cosméticos.',
  },
  q17Q: {
    fr: 'Pourquoi mes zones ne collent pas exactement à ma trace ?',
    en: 'Why don’t my zones match my trace exactly?',
    es: '¿Por qué mis zonas no coinciden exactamente con mi trazado?',
    de: 'Warum passen meine Zonen nicht exakt zu meiner Spur?',
    pt: 'Por que minhas zonas não batem exatamente com meu traçado?',
  },
  q17A: {
    fr: 'GRYD transforme ton tracé en zone propre et lissée. Le calcul reste précis en arrière-plan, l’affichage est simplifié.',
    en: 'GRYD turns your trace into a clean, smoothed zone. The math stays precise in the background; the display is simplified.',
    es: 'GRYD convierte tu trazado en una zona limpia y suavizada. El cálculo sigue siendo preciso de fondo; la visualización se simplifica.',
    de: 'GRYD macht aus deiner Spur eine saubere, geglättete Zone. Die Berechnung bleibt im Hintergrund präzise, die Anzeige ist vereinfacht.',
    pt: 'O GRYD transforma seu traçado em uma zona limpa e suavizada. O cálculo continua preciso nos bastidores; a exibição é simplificada.',
  },
  q18Q: {
    fr: 'Pourquoi GRYD n’affiche pas les cellules techniques ?',
    en: 'Why doesn’t GRYD show the technical cells?',
    es: '¿Por qué GRYD no muestra las celdas técnicas?',
    de: 'Warum zeigt GRYD die technischen Zellen nicht?',
    pt: 'Por que o GRYD não mostra as células técnicas?',
  },
  q18A: {
    fr: 'Trop complexe à l’œil. Tu vois des territoires lisibles ; le calcul par micro-cellules reste précis en coulisses.',
    en: 'Too complex to the eye. You see readable territories; the micro-cell math stays precise behind the scenes.',
    es: 'Demasiado complejo a la vista. Ves territorios legibles; el cálculo por microceldas sigue siendo preciso entre bastidores.',
    de: 'Zu komplex fürs Auge. Du siehst lesbare Territorien; die Mikrozellen-Berechnung bleibt hinter den Kulissen präzise.',
    pt: 'Complexo demais para o olho. Você vê territórios legíveis; o cálculo por microcélulas continua preciso nos bastidores.',
  },
  q19Q: {
    fr: 'Comment fonctionne une route ouverte ?',
    en: 'How does an open route work?',
    es: '¿Cómo funciona una ruta abierta?',
    de: 'Wie funktioniert eine offene Route?',
    pt: 'Como funciona uma rota aberta?',
  },
  q19A: {
    fr: 'Une course sans boucle prend déjà les rues courues. Elle ouvre aussi une route : de quoi relier deux secteurs, préparer une conquête, ou proposer un itinéraire à ton crew.',
    en: 'A run without a loop already takes the streets you ran. It also opens a route: a way to link two sectors, prepare a conquest, or suggest a course to your crew.',
    es: 'Una carrera sin bucle ya toma las calles corridas. También abre una ruta: sirve para unir dos sectores, preparar una conquista o proponer un itinerario a tu crew.',
    de: 'Ein Lauf ohne Loop nimmt schon die gelaufenen Straßen. Er öffnet außerdem eine Route: um zwei Sektoren zu verbinden, eine Eroberung vorzubereiten oder deiner Crew eine Strecke vorzuschlagen.',
    pt: 'Uma corrida sem loop já toma as ruas corridas. Ela também abre uma rota: serve para ligar dois setores, preparar uma conquista ou propor um trajeto ao seu crew.',
  },
  q20Q: {
    fr: 'Comment sont calculées les contributions dans une boucle collective ?',
    en: 'How are contributions counted in a collective loop?',
    es: '¿Cómo se calculan las contribuciones en un bucle colectivo?',
    de: 'Wie werden Beiträge in einem Gemeinschafts-Loop berechnet?',
    pt: 'Como são calculadas as contribuições em um loop coletivo?',
  },
  /** Vérité moteur : le hex va au FINISHER ; le crew grandit par l'union. */
  q20A: {
    fr: 'Chacun est crédité de la longueur de frontière qu’il a courue. Exemple : KORO 79 %, LENA 21 %. La zone revient à celui qui a fermé, et le territoire du crew grandit d’autant.',
    en: 'Each runner is credited for the border length they ran. Example: KORO 79%, LENA 21%. The zone goes to whoever closed it, and the crew’s territory grows by the same amount.',
    es: 'Cada uno recibe crédito por la longitud de frontera que corrió. Ejemplo: KORO 79 %, LENA 21 %. La zona es de quien la cerró, y el territorio del crew crece otro tanto.',
    de: 'Jede Person wird für die gelaufene Grenzlänge gutgeschrieben. Beispiel: KORO 79 %, LENA 21 %. Die Zone gehört dem, der geschlossen hat, und das Crew-Gebiet wächst genauso.',
    pt: 'Cada um recebe crédito pela extensão de fronteira que correu. Exemplo: KORO 79%, LENA 21%. A zona fica com quem fechou, e o território do crew cresce na mesma medida.',
  },

  // ─── Q/R AJOUTÉES : les refus du moteur, le cooldown, la valeur, le groupe ──
  /** Couvre blocked_fresh_protection / blocked_lock / blocked_new_player / cap. */
  qBlockedQ: {
    fr: 'Pourquoi je n’ai pas pu prendre cette zone ?',
    en: 'Why couldn’t I take that zone?',
    es: '¿Por qué no pude tomar esa zona?',
    de: 'Warum konnte ich diese Zone nicht nehmen?',
    pt: 'Por que não consegui pegar essa zona?',
  },
  /** UNE protection par ligne. {fresh}/{lock}/{newbie}/{cap} = game-rules. */
  qBlockedA: {
    fr: '· Elle vient d’être prise : on laisse {fresh} à son propriétaire.\n· Elle est encore verrouillée : {lock} après une capture.\n· Elle est à un nouveau joueur : ses zones sont intouchables pendant {newbie}.\n· Tu as atteint le maximum du jour : {cap}.\nDans tous les cas, ta course compte quand même en stats.',
    en: '· It was just taken: the owner gets {fresh}.\n· It’s still locked: {lock} after a capture.\n· It belongs to a new player: their zones are untouchable for {newbie}.\n· You hit today’s maximum: {cap}.\nEither way, your run still counts in your stats.',
    es: '· Acaba de ser tomada: se le dejan {fresh} a su dueño.\n· Sigue bloqueada: {lock} tras una captura.\n· Es de un jugador nuevo: sus zonas son intocables durante {newbie}.\n· Llegaste al máximo del día: {cap}.\nEn todos los casos, tu carrera cuenta igual en stats.',
    de: '· Sie wurde gerade erobert: Der Besitzer bekommt {fresh}.\n· Sie ist noch gesperrt: {lock} nach einer Eroberung.\n· Sie gehört einem neuen Spieler: Seine Zonen sind {newbie} lang unantastbar.\n· Du hast das Tagesmaximum erreicht: {cap}.\nIn jedem Fall zählt dein Lauf weiter in den Stats.',
    pt: '· Ela acabou de ser tomada: deixamos {fresh} para o dono.\n· Ainda está trancada: {lock} depois de uma captura.\n· É de um jogador novo: as zonas dele ficam intocáveis por {newbie}.\n· Você chegou ao máximo do dia: {cap}.\nEm todos os casos, sua corrida conta em stats assim mesmo.',
  },
  /** already_owned_cooldown / co_captured_cooldown — le piège du double run. */
  qCooldownQ: {
    fr: 'J’ai couru deux fois la même boucle aujourd’hui, pourquoi 0 point ?',
    en: 'I ran the same loop twice today — why 0 points?',
    es: 'Corrí el mismo bucle dos veces hoy, ¿por qué 0 puntos?',
    de: 'Ich bin denselben Loop heute zweimal gelaufen — warum 0 Punkte?',
    pt: 'Corri o mesmo loop duas vezes hoje, por que 0 ponto?',
  },
  /** {cooldown} = DEFEND_COOLDOWN_HOURS. */
  qCooldownA: {
    fr: 'Une même zone ne te paie qu’une fois toutes les {cooldown}. Le deuxième passage la garde bien à toi, mais ne rapporte plus de points. Cours ailleurs : le territoire neuf paie toujours.',
    en: 'The same zone only pays you once every {cooldown}. The second pass still keeps it yours, but earns no more points. Run elsewhere: new territory always pays.',
    es: 'Una misma zona solo te paga una vez cada {cooldown}. El segundo paso la mantiene tuya, pero ya no da puntos. Corre en otro sitio: el territorio nuevo siempre paga.',
    de: 'Dieselbe Zone zahlt dir nur einmal alle {cooldown}. Der zweite Durchlauf hält sie weiter bei dir, bringt aber keine Punkte mehr. Lauf woanders: Neues Gebiet zahlt immer.',
    pt: 'Uma mesma zona só te paga uma vez a cada {cooldown}. A segunda passagem mantém ela sua, mas não rende mais pontos. Corra em outro lugar: território novo sempre rende.',
  },
  /** La formule §23 en clair — la question « ce qu'on gagne ». */
  qPointsQ: {
    fr: 'Combien rapporte une zone ?',
    en: 'How much is a zone worth?',
    es: '¿Cuánto da una zona?',
    de: 'Wie viel bringt eine Zone?',
    pt: 'Quanto rende uma zona?',
  },
  /** {base}/{defense}/{steal}/{pioneer} = POINTS_BASE_PER_ZONE × ACTION_COEFF. */
  qPointsA: {
    fr: 'Une zone libre : {base}. Une zone à toi que tu défends : {defense}. Une zone prise à un rival : {steal}. Si personne n’était jamais passé là, tu es pionnier : jusqu’à {pioneer} en plus. Une zone disputée rapporte davantage.',
    en: 'A free zone: {base}. One of yours that you defend: {defense}. One taken from a rival: {steal}. If nobody had ever run there, you’re the pioneer: up to {pioneer} extra. A contested zone pays more.',
    es: 'Una zona libre: {base}. Una tuya que defiendes: {defense}. Una quitada a un rival: {steal}. Si nadie había pasado nunca, eres pionero: hasta {pioneer} extra. Una zona disputada da más.',
    de: 'Eine freie Zone: {base}. Eine eigene, die du verteidigst: {defense}. Eine einem Rivalen abgenommene: {steal}. War da noch nie jemand, bist du Pionier: bis zu {pioneer} extra. Eine umkämpfte Zone bringt mehr.',
    pt: 'Uma zona livre: {base}. Uma sua que você defende: {defense}. Uma tomada de um rival: {steal}. Se ninguém nunca passou ali, você é pioneiro: até {pioneer} a mais. Uma zona disputada rende mais.',
  },
  /** « Ensemble ça tient » — groupCaptureBonusPct, absent des pages jusqu'ici. */
  qGroupLockQ: {
    fr: 'Courir à plusieurs, ça sert à quoi ?',
    en: 'What’s the point of running together?',
    es: 'Correr en grupo, ¿para qué sirve?',
    de: 'Was bringt es, zusammen zu laufen?',
    pt: 'Correr em grupo serve para quê?',
  },
  /** {bonus} = GROUP_CAPTURE_BONUS_MAX_PCT. */
  qGroupLockA: {
    fr: 'La zone tient plus longtemps. Plus vous êtes nombreux à l’avoir courue, plus elle reste verrouillée : jusqu’à {bonus} de durée. Et chacun touche sa part de points.',
    en: 'The zone holds longer. The more of you ran it, the longer it stays locked: up to {bonus} more time. And everyone gets their share of points.',
    es: 'La zona aguanta más. Cuantos más la hayáis corrido, más tiempo sigue bloqueada: hasta {bonus} más. Y cada uno cobra su parte de puntos.',
    de: 'Die Zone hält länger. Je mehr ihr sie gelaufen seid, desto länger bleibt sie gesperrt: bis zu {bonus} mehr Zeit. Und jede Person bekommt ihren Punkteanteil.',
    pt: 'A zona dura mais. Quanto mais gente correu, mais tempo ela fica trancada: até {bonus} a mais. E cada um recebe sua parte dos pontos.',
  },

  // ─── FAQ courte post-run (§34) ─────────────────────────────────────────────
  postRunZonesQ: {
    fr: 'Pourquoi +247 zones ?',
    en: 'Why +247 zones?',
    es: '¿Por qué +247 zonas?',
    de: 'Warum +247 Zonen?',
    pt: 'Por que +247 zonas?',
  },
  /** Total ADDITIF avec unité nommée, signalé comme exemple (zéro-friction). */
  postRunZonesA: {
    fr: 'Exemple : la trace couvre +214 zones, la fermeture de la boucle en ajoute +33. Total : +247 zones.',
    en: 'Example: the trace covers +214 zones, closing the loop adds +33. Total: +247 zones.',
    es: 'Ejemplo: el trazado cubre +214 zonas, cerrar el bucle añade +33. Total: +247 zonas.',
    de: 'Beispiel: Die Spur deckt +214 Zonen ab, der Loop-Schluss bringt +33 dazu. Gesamt: +247 Zonen.',
    pt: 'Exemplo: o traçado cobre +214 zonas, fechar o loop adiciona +33. Total: +247 zonas.',
  },
  postRunSegmentQ: {
    fr: 'Pourquoi un segment exclu ?',
    en: 'Why an excluded segment?',
    es: '¿Por qué un segmento excluido?',
    de: 'Warum ein gestrichenes Segment?',
    pt: 'Por que um segmento excluído?',
  },
  postRunSegmentA: {
    fr: 'Une partie du GPS était trop faible. La course reste validée, mais ce segment ne capture pas.',
    en: 'Part of the GPS was too weak. The run is still valid, but that segment doesn’t capture.',
    es: 'Parte del GPS era demasiado débil. La carrera sigue validada, pero ese segmento no captura.',
    de: 'Ein Teil des GPS war zu schwach. Der Lauf bleibt gültig, aber dieses Segment erobert nichts.',
    pt: 'Parte do GPS estava fraca demais. A corrida continua validada, mas esse segmento não captura.',
  },
  /** Aligné sur la pill du Résultat de course (« compte en stats »). */
  postRunStatsQ: {
    fr: 'Pourquoi « compte en stats » ?',
    en: 'Why “stats only”?',
    es: '¿Por qué «solo stats»?',
    de: 'Warum „nur Stats“?',
    pt: 'Por que “só stats”?',
  },
  postRunStatsA: {
    fr: 'Ta course compte sportivement, mais ne remplit pas les conditions de capture.',
    en: 'Your run counts as sport, but doesn’t meet the capture conditions.',
    es: 'Tu carrera cuenta como deporte, pero no cumple las condiciones de captura.',
    de: 'Dein Lauf zählt sportlich, erfüllt aber die Bedingungen für eine Eroberung nicht.',
    pt: 'Sua corrida conta como esporte, mas não cumpre as condições de captura.',
  },
  postRunFrontiereQ: {
    fr: 'Pourquoi « frontière ouverte » ?',
    en: 'Why “open border”?',
    es: '¿Por qué «frontera abierta»?',
    de: 'Warum „offene Grenze“?',
    pt: 'Por que “fronteira aberta”?',
  },
  postRunFrontiereA: {
    fr: 'Tu as presque fermé une zone. Il manque un segment que toi ou ton crew pouvez terminer.',
    en: 'You almost closed a zone. One segment is missing — you or your crew can finish it.',
    es: 'Casi cerraste una zona. Falta un segmento que puedes terminar tú o tu crew.',
    de: 'Du hast eine Zone fast geschlossen. Ein Segment fehlt — du oder deine Crew können es beenden.',
    pt: 'Você quase fechou uma zona. Falta um segmento que você ou seu crew podem terminar.',
  },

  // ─── Schémas SVG (§31) : défauts visibles + accessibilité ──────────────────
  // §A : ces libellés vivent dans des zones SVG étroites — variantes COURTES.
  schemaStreetsTaken: {
    fr: 'Rues prises',
    en: 'Streets taken',
    es: 'Calles tomadas',
    de: 'Straßen erobert',
    pt: 'Ruas tomadas',
  },
  schemaZoneTaken: {
    fr: 'Zone prise',
    en: 'Zone taken',
    es: 'Zona tomada',
    de: 'Zone erobert',
    pt: 'Zona tomada',
  },
  schemaLigneA11y: {
    fr: 'Une ligne prend les rues courues, une boucle fermée prend toute la zone.',
    en: 'A line takes the streets you ran; a closed loop takes the whole zone.',
    es: 'Una línea toma las calles corridas; un bucle cerrado toma toda la zona.',
    de: 'Eine Linie nimmt die gelaufenen Straßen, ein geschlossener Loop die ganze Zone.',
    pt: 'Uma linha toma as ruas corridas; um loop fechado toma a zona inteira.',
  },
  schemaTraceAlone: {
    fr: 'Trace seule',
    en: 'Trace alone',
    es: 'Solo el trazado',
    de: 'Nur die Spur',
    pt: 'Só o traçado',
  },
  schemaLoopClosed: {
    fr: 'Boucle fermée',
    en: 'Loop closed',
    es: 'Bucle cerrado',
    de: 'Loop geschlossen',
    pt: 'Loop fechado',
  },
  /** Gain apporté par la fermeture ({n} = zones gagnées, scénario démo). */
  schemaLoopGain: {
    fr: '+{n} par la boucle',
    en: '+{n} from the loop',
    es: '+{n} por el bucle',
    de: '+{n} durch den Loop',
    pt: '+{n} pelo loop',
  },
  schemaBoucleFaitA11y: {
    fr: 'La trace seule capture le passage ; la boucle fermée ajoute l’intérieur.',
    en: 'The trace alone captures your path; the closed loop adds the inside.',
    es: 'El trazado solo captura el paso; el bucle cerrado añade el interior.',
    de: 'Die Spur allein erobert den Weg; der geschlossene Loop bringt das Innere dazu.',
    pt: 'O traçado sozinho captura a passagem; o loop fechado adiciona o interior.',
  },
  /** Les 3 gestes de défense (titres des mini-cartes). */
  schemaCross: {
    fr: 'Traverser',
    en: 'Cross',
    es: 'Cruzar',
    de: 'Queren',
    pt: 'Cruzar',
  },
  schemaFollow: {
    fr: 'Longer',
    en: 'Follow',
    es: 'Bordear',
    de: 'Entlang',
    pt: 'Margear',
  },
  schemaClose: {
    fr: 'Fermer',
    en: 'Close',
    es: 'Cerrar',
    de: 'Schließen',
    pt: 'Fechar',
  },
  schemaDefenseA11y: {
    fr: 'Plus ton tracé couvre la frontière, plus la défense est longue.',
    en: 'The more your trace covers the border, the longer the defense lasts.',
    es: 'Cuanto más cubre tu trazado la frontera, más dura la defensa.',
    de: 'Je mehr deine Spur die Grenze abdeckt, desto länger hält die Verteidigung.',
    pt: 'Quanto mais seu traçado cobre a fronteira, mais longa é a defesa.',
  },
  /** Le hex va au FINISHER (celui qui referme), pas au crew (A-41 §1). */
  schemaZoneToCrew: {
    fr: 'Zone au Finisher',
    en: 'Zone to Finisher',
    es: 'Zona al Finisher',
    de: 'Zone an Finisher',
    pt: 'Zona ao Finisher',
  },
  schemaCollectiveA11y: {
    fr: 'Deux membres du crew ferment une boucle ; la zone va à celui qui referme, contributions au prorata.',
    en: 'Two crew members close one loop; the zone goes to whoever closes it, contributions pro rata.',
    es: 'Dos miembros del crew cierran un bucle; la zona es de quien la cierra, contribuciones a prorrata.',
    de: 'Zwei Crew-Mitglieder schließen einen Loop; die Zone gehört dem, der schließt, Beiträge anteilig.',
    pt: 'Dois membros do crew fecham um loop; a zona vai para quem fecha, contribuições proporcionais.',
  },
  /** Pourcentage de contribution ({n} entier) — typo % par langue. */
  pctShare: {
    fr: '{n} %',
    en: '{n}%',
    es: '{n} %',
    de: '{n} %',
    pt: '{n}%',
  },
  /** CTA du schéma bonus (§A : COURT dans les 5 langues, pill SVG étroite). */
  schemaFinishLoopCta: {
    fr: 'Termine la boucle',
    en: 'Close the loop',
    es: 'Cierra el bucle',
    de: 'Schließ den Loop',
    pt: 'Feche o loop',
  },
  schemaFinisherBonus: {
    fr: 'Bonus Finisher',
    en: 'Finisher bonus',
    es: 'Bonus Finisher',
    de: 'Finisher-Bonus',
    pt: 'Bônus Finisher',
  },
  schemaBonusA11y: {
    fr: 'Il reste un segment à courir ; un bonus ciblé t’invite à fermer la boucle.',
    en: 'One segment left to run; a targeted bonus invites you to close the loop.',
    es: 'Queda un segmento por correr; un bonus dirigido te invita a cerrar el bucle.',
    de: 'Ein Segment fehlt noch; ein gezielter Bonus lädt dich ein, den Loop zu schließen.',
    pt: 'Falta um segmento para correr; um bônus certeiro convida você a fechar o loop.',
  },
  schemaCaptureValid: {
    fr: 'Capture validée',
    en: 'Valid capture',
    es: 'Captura válida',
    de: 'Gültige Eroberung',
    pt: 'Captura válida',
  },
  schemaSegmentExcluded: {
    fr: 'Segment exclu',
    en: 'Excluded segment',
    es: 'Segmento excluido',
    de: 'Segment gestrichen',
    pt: 'Segmento excluído',
  },
  // ── Schéma « LE RELAIS » : la zone à un seul, les points à tous ────────────
  schemaTheZone: {
    fr: 'LA ZONE',
    en: 'THE ZONE',
    es: 'LA ZONA',
    de: 'DIE ZONE',
    pt: 'A ZONA',
  },
  schemaThePoints: {
    fr: 'LES POINTS',
    en: 'THE POINTS',
    es: 'LOS PUNTOS',
    de: 'DIE PUNKTE',
    pt: 'OS PONTOS',
  },
  schemaRank1: { fr: '1ᵉʳ', en: '1st', es: '1.º', de: '1.', pt: '1.º' },
  schemaRank2: { fr: '2ᵉ', en: '2nd', es: '2.º', de: '2.', pt: '2.º' },
  schemaRank3: { fr: '3ᵉ', en: '3rd', es: '3.º', de: '3.', pt: '3.º' },
  /** Qui possède la zone, dans le schéma relais (zone étroite : très court). */
  schemaOwnerOnly: {
    fr: 'au 1ᵉʳ',
    en: 'to 1st',
    es: 'al 1.º',
    de: 'an den 1.',
    pt: 'ao 1.º',
  },
  schemaRelaisA11y: {
    fr: 'La zone va au premier arrivé ; les points se partagent, 1 divisé par le rang.',
    en: 'The zone goes to whoever finishes first; points are shared, 1 divided by rank.',
    es: 'La zona es del primero en llegar; los puntos se reparten, 1 dividido por el puesto.',
    de: 'Die Zone geht an den Ersten; die Punkte werden geteilt, 1 geteilt durch den Rang.',
    pt: 'A zona vai para o primeiro; os pontos são divididos, 1 dividido pelo lugar.',
  },

  // ── Schéma « Une zone s'use » : la ligne de vie d'une zone ─────────────────
  schemaZoneCapture: {
    fr: 'Capture',
    en: 'Capture',
    es: 'Captura',
    de: 'Eroberung',
    pt: 'Captura',
  },
  schemaZoneFree: {
    fr: 'Libre',
    en: 'Free',
    es: 'Libre',
    de: 'Frei',
    pt: 'Livre',
  },
  schemaZoneSolid: {
    fr: 'Solide',
    en: 'Solid',
    es: 'Firme',
    de: 'Stabil',
    pt: 'Firme',
  },
  schemaZoneFragile: {
    fr: 'Fragile',
    en: 'Fragile',
    es: 'Frágil',
    de: 'Fragil',
    pt: 'Frágil',
  },
  schemaZoneDefendWindow: {
    fr: 'à défendre',
    en: 'defend now',
    es: 'a defender',
    de: 'verteidigen',
    pt: 'a defender',
  },
  schemaZoneReset: {
    fr: 'Tu y repasses : le compte repart à zéro',
    en: 'Run it again: the count restarts',
    es: 'Vuelves a pasar: la cuenta se reinicia',
    de: 'Nochmal laufen: Die Uhr startet neu',
    pt: 'Passa de novo: a contagem reinicia',
  },
  schemaVieZoneA11y: {
    fr: 'Une zone reste solide, devient fragile, puis redevient libre ; y repasser remet le compte à zéro.',
    en: 'A zone stays solid, turns fragile, then goes free again; running it resets the count.',
    es: 'Una zona sigue firme, se vuelve frágil y luego queda libre; volver a pasar reinicia la cuenta.',
    de: 'Eine Zone bleibt stabil, wird fragil und dann wieder frei; erneut laufen setzt die Uhr zurück.',
    pt: 'Uma zona fica firme, torna-se frágil e depois volta a livre; passar de novo zera a contagem.',
  },

  // ── Schéma « Ce que vaut une zone » : 3 barres comparables ─────────────────
  schemaValueFree: {
    fr: 'Zone libre',
    en: 'Free zone',
    es: 'Zona libre',
    de: 'Freie Zone',
    pt: 'Zona livre',
  },
  schemaValueDefend: {
    fr: 'Ta zone, défendue',
    en: 'Your zone, defended',
    es: 'Tu zona, defendida',
    de: 'Deine Zone, verteidigt',
    pt: 'Sua zona, defendida',
  },
  schemaValueSteal: {
    fr: 'Zone prise à un rival',
    en: 'Zone taken from a rival',
    es: 'Zona quitada a un rival',
    de: 'Zone vom Rivalen',
    pt: 'Zona tomada de um rival',
  },
  schemaValueA11y: {
    fr: 'Une zone libre rapporte la valeur de base, la défendre un peu plus, la prendre à un rival le plus.',
    en: 'A free zone pays the base value, defending pays a bit more, taking one from a rival pays most.',
    es: 'Una zona libre da el valor base, defenderla un poco más, quitársela a un rival lo máximo.',
    de: 'Eine freie Zone bringt den Grundwert, Verteidigen etwas mehr, einem Rivalen abnehmen am meisten.',
    pt: 'Uma zona livre rende o valor base, defender rende um pouco mais, tomar de um rival rende o máximo.',
  },

  schemaVerifyA11y: {
    fr: 'Un GPS propre valide la capture ; un segment faible est exclu.',
    en: 'Clean GPS validates the capture; a weak segment is excluded.',
    es: 'Un GPS limpio valida la captura; un segmento débil queda excluido.',
    de: 'Sauberes GPS bestätigt die Eroberung; ein schwaches Segment wird gestrichen.',
    pt: 'Um GPS limpo valida a captura; um segmento fraco é excluído.',
  },
});
