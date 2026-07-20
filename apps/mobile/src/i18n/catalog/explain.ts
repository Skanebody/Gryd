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
  qRelayA: {
    fr: 'Une zone ne se prend qu’une fois : le premier arrivé la possède. Mais personne ne court pour rien — chaque co-coureur est payé selon son rang : le 2ᵉ touche la moitié des points, le 3ᵉ le tiers, le 30ᵉ le trentième. La zone du propriétaire n’est jamais affaiblie par un relais.',
    en: 'A zone is only taken once: the first to finish owns it. But nobody runs for nothing — every co-runner is paid by rank: 2nd gets half the points, 3rd a third, 30th a thirtieth. The owner’s zone is never weakened by a relay.',
    es: 'Una zona solo se toma una vez: el primero en llegar la posee. Pero nadie corre en vano — cada corredor cobra según su puesto: el 2.º la mitad, el 3.º un tercio, el 30.º una trigésima parte. La zona del dueño nunca se debilita por un relevo.',
    de: 'Eine Zone wird nur einmal erobert: Wer zuerst fertig ist, besitzt sie. Aber niemand läuft umsonst — jeder Mitläufer wird nach Rang bezahlt: der 2. bekommt die Hälfte, der 3. ein Drittel, der 30. ein Dreißigstel. Die Zone des Besitzers wird durch ein Relais nie geschwächt.',
    pt: 'Uma zona só é tomada uma vez: o primeiro a chegar fica com ela. Mas ninguém corre à toa — cada corredor recebe pelo seu lugar: o 2.º ganha metade, o 3.º um terço, o 30.º um trigésimo. A zona do dono nunca é enfraquecida por um revezamento.',
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
  /** Fenêtre « fragile » du cycle de vie : « jours 36 à 42 ». */
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
  secCrewLine: {
    fr: 'Tu ouvres une frontière, un membre du crew la referme : la zone est au crew.',
    en: 'You open a border, a crew member closes it: the zone belongs to the crew.',
    es: 'Tú abres una frontera y otro miembro del crew la cierra: la zona es del crew.',
    de: 'Du öffnest eine Grenze, ein Crew-Mitglied schließt sie: Die Zone gehört der Crew.',
    pt: 'Você abre uma fronteira, alguém do crew fecha: a zona é do crew.',
  },
  secCrewExample: {
    fr: 'Exemple : KORO ouvre 79 %, LENA ferme 21 % : zone crew capturée.',
    en: 'Example: KORO opens 79%, LENA closes 21%: crew zone captured.',
    es: 'Ejemplo: KORO abre el 79 %, LENA cierra el 21 %: zona del crew capturada.',
    de: 'Beispiel: KORO öffnet 79 %, LENA schließt 21 %: Crew-Zone erobert.',
    pt: 'Exemplo: KORO abre 79%, LENA fecha 21%: zona do crew capturada.',
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
    fr: 'Non. Un rival peut contester la zone, mais jamais compléter une boucle pour ton crew.',
    en: 'No. A rival can contest the zone, but never complete a loop for your crew.',
    es: 'No. Un rival puede disputar la zona, pero nunca completar un bucle para tu crew.',
    de: 'Nein. Ein Rivale kann die Zone umkämpfen, aber nie einen Loop für deine Crew schließen.',
    pt: 'Não. Um rival pode disputar a zona, mas nunca completar um loop para o seu crew.',
  },
  q7Q: {
    fr: 'Comment GRYD calcule les zones reprises à un rival ?',
    en: 'How does GRYD count zones taken from a rival?',
    es: '¿Cómo calcula GRYD las zonas quitadas a un rival?',
    de: 'Wie berechnet GRYD von Rivalen eroberte Zonen?',
    pt: 'Como o GRYD calcula zonas tomadas de um rival?',
  },
  q7A: {
    fr: 'Si ta boucle recouvre un territoire rival, GRYD recalcule les cellules à l’intérieur et met à jour le contrôle du secteur.',
    en: 'If your loop covers rival territory, GRYD recalculates the cells inside and updates control of the sector.',
    es: 'Si tu bucle cubre territorio rival, GRYD recalcula las celdas del interior y actualiza el control del sector.',
    de: 'Überdeckt dein Loop gegnerisches Gebiet, berechnet GRYD die Zellen im Inneren neu und aktualisiert die Sektor-Kontrolle.',
    pt: 'Se o seu loop cobre território rival, o GRYD recalcula as células do interior e atualiza o controle do setor.',
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
    fr: 'Stable {stable}, fragile {fragile}, à défendre les {defend}, expirée {decay}.',
    en: 'Stable {stable}, fragile {fragile}, defend in the {defend}, expired {decay}.',
    es: 'Estable {stable}, frágil {fragile}, a defender en las {defend}, expirada {decay}.',
    de: 'Stabil {stable}, fragil {fragile}, zu verteidigen in den {defend}, abgelaufen {decay}.',
    pt: 'Estável {stable}, frágil {fragile}, a defender nas {defend}, expirada {decay}.',
  },
  q13Q: {
    fr: 'Les zones expirent-elles ?',
    en: 'Do zones expire?',
    es: '¿Las zonas expiran?',
    de: 'Laufen Zonen ab?',
    pt: 'As zonas expiram?',
  },
  q13A: {
    fr: 'Oui. Sans défense pendant {days}, une zone devient fragile puis repasse neutre — plus facile à reprendre.',
    en: 'Yes. Without defense for {days}, a zone turns fragile then goes neutral again — easier to retake.',
    es: 'Sí. Sin defensa durante {days}, una zona se vuelve frágil y luego vuelve a ser neutral: más fácil de recuperar.',
    de: 'Ja. Ohne Verteidigung über {days} wird eine Zone fragil und dann wieder neutral — leichter zurückzuerobern.',
    pt: 'Sim. Sem defesa por {days}, uma zona fica frágil e depois volta a ser neutra — mais fácil de retomar.',
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
    fr: 'Une course sans boucle prend déjà les rues courues, et ouvre une route : relier deux secteurs, préparer une conquête ou une défense, proposer un itinéraire crew.',
    en: 'A run without a loop already takes the streets you ran, and opens a route: link two sectors, set up a conquest or a defense, suggest a crew route.',
    es: 'Una carrera sin bucle ya toma las calles corridas y abre una ruta: unir dos sectores, preparar una conquista o una defensa, proponer un itinerario para el crew.',
    de: 'Ein Lauf ohne Loop nimmt schon die gelaufenen Straßen und öffnet eine Route: zwei Sektoren verbinden, eine Eroberung oder Verteidigung vorbereiten, eine Crew-Route vorschlagen.',
    pt: 'Uma corrida sem loop já toma as ruas corridas e abre uma rota: ligar dois setores, preparar uma conquista ou defesa, propor um trajeto para o crew.',
  },
  q20Q: {
    fr: 'Comment sont calculées les contributions dans une boucle collective ?',
    en: 'How are contributions counted in a collective loop?',
    es: '¿Cómo se calculan las contribuciones en un bucle colectivo?',
    de: 'Wie werden Beiträge in einem Gemeinschafts-Loop berechnet?',
    pt: 'Como são calculadas as contribuições em um loop coletivo?',
  },
  q20A: {
    fr: 'Chaque membre est crédité selon la longueur de frontière qu’il a validée. Exemple : KORO 79 %, LENA 21 %. La zone appartient au crew.',
    en: 'Each member is credited for the border length they validated. Example: KORO 79%, LENA 21%. The zone belongs to the crew.',
    es: 'Cada miembro recibe crédito según la longitud de frontera que validó. Ejemplo: KORO 79 %, LENA 21 %. La zona pertenece al crew.',
    de: 'Jedes Mitglied wird nach der validierten Grenzlänge gutgeschrieben. Beispiel: KORO 79 %, LENA 21 %. Die Zone gehört der Crew.',
    pt: 'Cada membro recebe crédito pela extensão de fronteira que validou. Exemplo: KORO 79%, LENA 21%. A zona pertence ao crew.',
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
  schemaZoneToCrew: {
    fr: 'Zone au crew',
    en: 'Crew zone',
    es: 'Zona del crew',
    de: 'Zone der Crew',
    pt: 'Zona do crew',
  },
  schemaCollectiveA11y: {
    fr: 'Deux membres du crew ferment une boucle ; la zone est au crew, contributions au prorata.',
    en: 'Two crew members close one loop; the zone goes to the crew, contributions pro rata.',
    es: 'Dos miembros del crew cierran un bucle; la zona es del crew, contribuciones a prorrata.',
    de: 'Zwei Crew-Mitglieder schließen einen Loop; die Zone gehört der Crew, Beiträge anteilig.',
    pt: 'Dois membros do crew fecham um loop; a zona é do crew, contribuições proporcionais.',
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
  schemaVerifyA11y: {
    fr: 'Un GPS propre valide la capture ; un segment faible est exclu.',
    en: 'Clean GPS validates the capture; a weak segment is excluded.',
    es: 'Un GPS limpio valida la captura; un segmento débil queda excluido.',
    de: 'Sauberes GPS bestätigt die Eroberung; ein schwaches Segment wird gestrichen.',
    pt: 'Um GPS limpo valida a captura; um segmento fraco é excluído.',
  },
});
