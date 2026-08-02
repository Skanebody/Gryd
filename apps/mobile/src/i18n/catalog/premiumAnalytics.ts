/**
 * GRYD — i18n : catalogue de l'écran E66 « Analyse territoriale » (`/premium-analytics`).
 *
 * ── CE CATALOGUE NE PROMET QUE CE QUE LE CALCUL SAIT FAIRE ─────────────────
 * Le catalogue Arsenal vend au Club « stats avancées + heatmap ». Les textes
 * ci-dessous décrivent ce que `features/premium/analytics/derive.ts` calcule
 * RÉELLEMENT le 27/07/2026 — durée de contrôle, surface tenue, défenses
 * repoussées, gains sur la fenêtre, frontières sous contestation — et rien de
 * plus. En particulier `lossesUnavailable` DIT que les pertes de territoire ne
 * sont pas mesurables (le transfert de propriété n'est pas historisé, et
 * l'ancien propriétaire perd la visibilité de la contestation qui l'a
 * dépossédé) : c'est écrit à l'écran plutôt que comblé par un « 0 » flatteur.
 *
 * ── ANTI PAY-TO-WIN (§1.6) ─────────────────────────────────────────────────
 * `antiP2w` n'est pas un argument marketing : c'est la règle constitutionnelle
 * rendue visible là où la fonctionnalité est vendue. Cette analyse ne donne ni
 * territoire, ni points, ni protection, ni priorité — elle explique, elle
 * n'avantage pas.
 *
 * ── §12 / E66 : « pas pour espionner » ─────────────────────────────────────
 * `privacyNote` n'est pas une mention légale : c'est la description exacte de
 * ce que le SQL fait (lecture bornée à `owner_id = moi`, aucune colonne
 * d'assaillant demandée). La copie et le code disent la même chose.
 *
 * §A CONTRAIGNANT : libellés d'action COURTS dans les 5 langues (rien qui
 * tronque à 375 px), un seul CTA chartreuse par écran — et il n'existe que dans
 * l'état où il peut aboutir.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── En-tête ────────────────────────────────────────────────────────────────
  title: {
    fr: 'Analyse territoriale',
    en: 'Territory analysis',
    es: 'Análisis territorial',
    de: 'Gebietsanalyse',
    pt: 'Análise territorial',
  },
  kicker: {
    fr: 'CLUB',
    en: 'CLUB',
    es: 'CLUB',
    de: 'CLUB',
    pt: 'CLUB',
  },
  promise: {
    fr: 'Comprends ton territoire. Jamais un avantage de capture.',
    en: 'Understand your territory. Never a capture advantage.',
    es: 'Entiende tu territorio. Nunca una ventaja de captura.',
    de: 'Versteh dein Gebiet. Niemals ein Eroberungsvorteil.',
    pt: 'Entenda seu território. Nunca uma vantagem de captura.',
  },

  // ── Lecture en cours ───────────────────────────────────────────────────────
  loading: {
    fr: 'Lecture de ton territoire…',
    en: 'Reading your territory…',
    es: 'Leyendo tu territorio…',
    de: 'Dein Gebiet wird gelesen…',
    pt: 'Lendo seu território…',
  },

  // ── Pas connecté ───────────────────────────────────────────────────────────
  signedOutTitle: {
    fr: 'Pas connecté',
    en: 'Not signed in',
    es: 'Sin sesión',
    de: 'Nicht angemeldet',
    pt: 'Sem sessão',
  },
  signedOutBody: {
    fr: 'Ton territoire est lié à ton compte. Sans compte, il n’y a rien à analyser.',
    en: 'Your territory is tied to your account. Without one, there is nothing to analyse.',
    es: 'Tu territorio está ligado a tu cuenta. Sin cuenta, no hay nada que analizar.',
    de: 'Dein Gebiet hängt an deinem Konto. Ohne Konto gibt es nichts zu analysieren.',
    pt: 'Seu território está ligado à sua conta. Sem conta, não há nada para analisar.',
  },
  ctaSignIn: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Entrar',
    de: 'Anmelden',
    pt: 'Entrar',
  },

  // ── Échec de lecture ───────────────────────────────────────────────────────
  failedTitle: {
    fr: 'Lecture impossible',
    en: 'Could not load',
    es: 'No se pudo leer',
    de: 'Laden fehlgeschlagen',
    pt: 'Não foi possível ler',
  },
  failedBody: {
    fr: 'Ton territoire existe, on n’a pas réussi à le lire. Rien n’est perdu.',
    en: 'Your territory exists, we just could not read it. Nothing is lost.',
    es: 'Tu territorio existe, no hemos podido leerlo. No se ha perdido nada.',
    de: 'Dein Gebiet existiert, wir konnten es nur nicht laden. Nichts ist verloren.',
    pt: 'Seu território existe, não conseguimos lê-lo. Nada se perdeu.',
  },
  ctaRetry: {
    fr: 'Réessayer',
    en: 'Retry',
    es: 'Reintentar',
    de: 'Erneut',
    pt: 'Tentar',
  },

  // ── Pas encore Club : un APERÇU honnête, jamais une donnée floutée ────────
  lockedTitle: {
    fr: 'Réservé au Club',
    en: 'Club members only',
    es: 'Solo para Club',
    de: 'Nur für Club',
    pt: 'Só para Club',
  },
  lockedBody: {
    fr: 'Voici ce que cette page calcule sur TON territoire — rien n’est flouté, elle n’est simplement pas encore ouverte pour toi.',
    en: 'Here is what this page computes on YOUR territory — nothing is blurred, it is simply not open to you yet.',
    es: 'Esto es lo que esta página calcula sobre TU territorio: nada está difuminado, solo aún no está abierta para ti.',
    de: 'Das berechnet diese Seite über DEIN Gebiet — nichts ist verschwommen, sie ist für dich nur noch nicht offen.',
    pt: 'Eis o que esta página calcula sobre O SEU território — nada está desfocado, apenas ainda não está aberta para você.',
  },
  lockedPoint1: {
    fr: 'Depuis combien de temps tu tiens chaque zone.',
    en: 'How long you have held each zone.',
    es: 'Cuánto tiempo llevas manteniendo cada zona.',
    de: 'Wie lange du jede Zone schon hältst.',
    pt: 'Há quanto tempo você mantém cada zona.',
  },
  lockedPoint2: {
    fr: 'Une carte de tes zones colorée par cette durée réelle.',
    en: 'A map of your zones coloured by that real duration.',
    es: 'Un mapa de tus zonas coloreado por esa duración real.',
    de: 'Eine Karte deiner Zonen, eingefärbt nach dieser echten Dauer.',
    pt: 'Um mapa das suas zonas colorido por essa duração real.',
  },
  lockedPoint3: {
    fr: 'Les frontières sous contestation, la plus urgente d’abord.',
    en: 'Borders under contest, the most urgent first.',
    es: 'Las fronteras en disputa, la más urgente primero.',
    de: 'Umkämpfte Grenzen, die dringendste zuerst.',
    pt: 'As fronteiras em disputa, a mais urgente primeiro.',
  },
  ctaSeePremium: {
    fr: 'Voir GRYD Premium',
    en: 'See GRYD Premium',
    es: 'Ver GRYD Premium',
    de: 'GRYD Premium ansehen',
    pt: 'Ver GRYD Premium',
  },

  // ── Club, et RIEN encore (le cas réel aujourd’hui : la base est vide) ─────
  emptyTitle: {
    fr: 'Pas encore de territoire',
    en: 'No territory yet',
    es: 'Aún sin territorio',
    de: 'Noch kein Gebiet',
    pt: 'Ainda sem território',
  },
  emptyBody: {
    fr: 'Aucune zone à ton nom pour l’instant. Une sortie qui boucle en crée une, et cette page se remplit toute seule.',
    en: 'No zone under your name yet. One looped outing creates one, and this page fills itself.',
    es: 'Aún no hay ninguna zona a tu nombre. Una salida cerrada crea una y esta página se llena sola.',
    de: 'Noch keine Zone auf deinen Namen. Eine geschlossene Runde erzeugt eine, und diese Seite füllt sich von selbst.',
    pt: 'Ainda não há nenhuma zona em seu nome. Uma saída que fecha cria uma e esta página se preenche sozinha.',
  },
  emptyNote: {
    fr: 'Aucun chiffre n’est inventé en attendant : une page vide vaut mieux qu’une fausse.',
    en: 'No number is made up meanwhile: an empty page beats a false one.',
    es: 'Mientras tanto no se inventa ninguna cifra: mejor una página vacía que una falsa.',
    de: 'Bis dahin wird keine Zahl erfunden: eine leere Seite ist besser als eine falsche.',
    pt: 'Entretanto nenhum número é inventado: uma página vazia vale mais do que uma falsa.',
  },
  ctaStart: {
    fr: 'Lancer une sortie',
    en: 'Start an outing',
    es: 'Empezar salida',
    de: 'Runde starten',
    pt: 'Iniciar saída',
  },

  // ── Carte de chaleur ───────────────────────────────────────────────────────
  heatLabel: {
    fr: 'DURÉE DE CONTRÔLE',
    en: 'TIME UNDER CONTROL',
    es: 'TIEMPO DE CONTROL',
    de: 'KONTROLLDAUER',
    pt: 'TEMPO DE CONTROLE',
  },
  heatCaption: {
    fr: 'Tes zones, colorées par le temps où tu les tiens. Plus c’est vif, plus c’est ancien.',
    en: 'Your zones, coloured by how long you have held them. Brighter means older.',
    es: 'Tus zonas, coloreadas por el tiempo que llevas manteniéndolas. Más vivo, más antiguo.',
    de: 'Deine Zonen, eingefärbt nach Haltedauer. Kräftiger heißt älter.',
    pt: 'Suas zonas, coloridas pelo tempo que você as mantém. Mais vivo, mais antigo.',
  },
  heatLegendNew: {
    fr: 'Récente',
    en: 'Recent',
    es: 'Reciente',
    de: 'Neu',
    pt: 'Recente',
  },
  heatLegendOld: {
    fr: 'Ancienne',
    en: 'Long-held',
    es: 'Antigua',
    de: 'Alt',
    pt: 'Antiga',
  },
  heatNoScale: {
    fr: 'Toutes tes zones viennent d’être prises : il n’y a pas encore d’écart à colorier.',
    en: 'All your zones were just taken: there is no gap to colour yet.',
    es: 'Todas tus zonas acaban de ser tomadas: aún no hay diferencia que colorear.',
    de: 'Alle deine Zonen wurden gerade erst erobert: es gibt noch keinen Unterschied zum Einfärben.',
    pt: 'Todas as suas zonas acabaram de ser tomadas: ainda não há diferença para colorir.',
  },
  heatNoGeometry: {
    fr: 'Aucune de tes zones n’a encore de contour exploitable — les chiffres ci-dessous restent justes.',
    en: 'None of your zones has a usable outline yet — the figures below still hold.',
    es: 'Ninguna de tus zonas tiene aún un contorno utilizable; las cifras de abajo siguen siendo exactas.',
    de: 'Keine deiner Zonen hat schon eine brauchbare Kontur — die Zahlen unten stimmen trotzdem.',
    pt: 'Nenhuma das suas zonas tem ainda um contorno utilizável — os números abaixo continuam certos.',
  },

  // ── Les chiffres ───────────────────────────────────────────────────────────
  statsLabel: {
    fr: 'TON TERRITOIRE',
    en: 'YOUR TERRITORY',
    es: 'TU TERRITORIO',
    de: 'DEIN GEBIET',
    pt: 'SEU TERRITÓRIO',
  },
  statZones: {
    fr: 'Zones tenues',
    en: 'Zones held',
    es: 'Zonas mantenidas',
    de: 'Gehaltene Zonen',
    pt: 'Zonas mantidas',
  },
  statArea: {
    fr: 'Surface tenue',
    en: 'Area held',
    es: 'Superficie',
    de: 'Gehaltene Fläche',
    pt: 'Superfície',
  },
  statOldest: {
    fr: 'Tenue depuis',
    en: 'Held for',
    es: 'Mantenida desde',
    de: 'Gehalten seit',
    pt: 'Mantida há',
  },
  statMostDefended: {
    fr: 'Zone la plus défendue',
    en: 'Most defended zone',
    es: 'Zona más defendida',
    de: 'Meistverteidigte Zone',
    pt: 'Zona mais defendida',
  },
  defensesCount: {
    fr: '{n} défense(s) repoussée(s)',
    en: '{n} attack(s) repelled',
    es: '{n} ataque(s) repelido(s)',
    de: '{n} Angriff(e) abgewehrt',
    pt: '{n} ataque(s) repelido(s)',
  },
  mostDefendedNone: {
    fr: 'Aucune zone n’a encore eu à se défendre.',
    en: 'No zone has had to defend itself yet.',
    es: 'Ninguna zona ha tenido que defenderse todavía.',
    de: 'Noch musste sich keine Zone verteidigen.',
    pt: 'Nenhuma zona teve ainda de se defender.',
  },
  oldestNone: {
    fr: 'Aucune de tes zones n’est datée : la durée de contrôle reste inconnue.',
    en: 'None of your zones is dated: time under control is unknown.',
    es: 'Ninguna de tus zonas está fechada: el tiempo de control es desconocido.',
    de: 'Keine deiner Zonen ist datiert: die Kontrolldauer ist unbekannt.',
    pt: 'Nenhuma das suas zonas está datada: o tempo de controle é desconhecido.',
  },
  deadZones: {
    fr: '{n} zone(s) éteinte(s) ne comptent plus dans ces chiffres.',
    en: '{n} extinct zone(s) no longer count in these figures.',
    es: '{n} zona(s) extinta(s) ya no cuentan en estas cifras.',
    de: '{n} erloschene Zone(n) zählen hier nicht mehr mit.',
    pt: '{n} zona(s) extinta(s) já não contam nestes números.',
  },

  // ── La fenêtre ─────────────────────────────────────────────────────────────
  windowLabel: {
    fr: 'SUR {days} JOURS',
    en: 'OVER {days} DAYS',
    es: 'EN {days} DÍAS',
    de: 'ÜBER {days} TAGE',
    pt: 'EM {days} DIAS',
  },
  windowGained: {
    fr: 'Zones prises',
    en: 'Zones taken',
    es: 'Zonas tomadas',
    de: 'Erobert',
    pt: 'Zonas tomadas',
  },
  windowGainedArea: {
    fr: 'Surface gagnée',
    en: 'Area gained',
    es: 'Superficie ganada',
    de: 'Gewonnene Fläche',
    pt: 'Superfície ganha',
  },
  windowDefenses: {
    fr: 'Défenses gagnées',
    en: 'Defences won',
    es: 'Defensas ganadas',
    de: 'Verteidigungen',
    pt: 'Defesas ganhas',
  },
  lossesUnavailable: {
    fr: 'Les pertes ne sont pas mesurables : quand une zone change de mains, rien ne conserve qu’elle a été à toi. On ne peut donc pas écrire « 0 perte » — ce serait faux.',
    en: 'Losses cannot be measured: when a zone changes hands, nothing records that it was yours. So we cannot write “0 lost” — that would be false.',
    es: 'Las pérdidas no son medibles: cuando una zona cambia de manos, nada guarda que fue tuya. No podemos escribir «0 pérdidas»: sería falso.',
    de: 'Verluste sind nicht messbar: wechselt eine Zone den Besitzer, hält nichts fest, dass sie dir gehörte. „0 Verluste“ wäre schlicht falsch.',
    pt: 'As perdas não são mensuráveis: quando uma zona muda de mãos, nada guarda que foi sua. Não podemos escrever «0 perdas» — seria falso.',
  },

  // ── Frontières à surveiller ────────────────────────────────────────────────
  watchLabel: {
    fr: 'FRONTIÈRES À SURVEILLER',
    en: 'BORDERS TO WATCH',
    es: 'FRONTERAS A VIGILAR',
    de: 'GRENZEN IM BLICK',
    pt: 'FRONTEIRAS A VIGIAR',
  },
  watchNone: {
    fr: 'Aucune de tes zones n’est contestée en ce moment.',
    en: 'None of your zones is under contest right now.',
    es: 'Ninguna de tus zonas está en disputa ahora mismo.',
    de: 'Keine deiner Zonen wird gerade umkämpft.',
    pt: 'Nenhuma das suas zonas está em disputa neste momento.',
  },
  watchZone: {
    fr: 'Zone de {area} ha',
    en: '{area} ha zone',
    es: 'Zona de {area} ha',
    de: 'Zone mit {area} ha',
    pt: 'Zona de {area} ha',
  },
  watchDeadlineHours: {
    fr: 'À défendre sous {h} h',
    en: 'Defend within {h} h',
    es: 'Defender en {h} h',
    de: 'In {h} Std. verteidigen',
    pt: 'Defender em {h} h',
  },
  watchDeadlineSoon: {
    fr: 'À défendre maintenant',
    en: 'Defend now',
    es: 'Defender ahora',
    de: 'Jetzt verteidigen',
    pt: 'Defender agora',
  },
  watchDeadlinePassed: {
    fr: 'Échéance dépassée — la résolution est côté serveur',
    en: 'Deadline passed — the server decides',
    es: 'Plazo vencido: lo resuelve el servidor',
    de: 'Frist abgelaufen — der Server entscheidet',
    pt: 'Prazo terminado — o servidor resolve',
  },

  // ── Bas de page : portée, horodatage, règles ───────────────────────────────
  // ══════════ MÉMOIRE DU TERRITOIRE (0109/0110) ══════════════════════════════
  // « Ce quartier était à toi de mars à septembre. » C'est la phrase du produit,
  // et elle ne s'écrit QUE si un règne est réellement TERMINÉ — on ne raconte
  // pas une fin qui n'a pas eu lieu.
  historyLabel: {
    fr: 'TON HISTOIRE',
    en: 'YOUR HISTORY',
    es: 'TU HISTORIA',
    de: 'DEINE GESCHICHTE',
    pt: 'SUA HISTÓRIA',
  },
  historyCaption: {
    fr: 'Depuis quand tu tiens, et ce que tu as tenu avant.',
    en: 'How long you have held, and what you held before.',
    es: 'Desde cuándo mantienes, y lo que mantuviste antes.',
    de: 'Seit wann du hältst — und was du vorher gehalten hast.',
    pt: 'Há quanto tempo você mantém, e o que manteve antes.',
  },
  // L'histoire NE REMONTE PAS avant la migration : le dire est la seule façon
  // de ne pas laisser croire qu'un joueur n'a rien tenu avant cette date.
  historySince: {
    fr: 'GRYD se souvient depuis le {date}.',
    en: 'GRYD remembers since {date}.',
    es: 'GRYD recuerda desde el {date}.',
    de: 'GRYD erinnert sich seit dem {date}.',
    pt: 'O GRYD lembra desde {date}.',
  },
  historyEmpty: {
    fr: 'Rien à raconter pour l’instant : ton histoire commence à ta première zone tenue.',
    en: 'Nothing to tell yet: your history starts with your first held zone.',
    es: 'Nada que contar aún: tu historia empieza con tu primera zona mantenida.',
    de: 'Noch nichts zu erzählen: Deine Geschichte beginnt mit deiner ersten Zone.',
    pt: 'Nada a contar ainda: sua história começa na sua primeira zona mantida.',
  },
  // Le serveur n'a pas rendu d'histoire — DISTINCT de « tu n'as rien tenu ».
  historyUnavailable: {
    fr: 'Ton histoire n’a pas pu être lue. Elle n’est pas perdue.',
    en: 'Your history could not be read. It is not lost.',
    es: 'No se pudo leer tu historia. No se ha perdido.',
    de: 'Deine Geschichte konnte nicht gelesen werden. Sie ist nicht verloren.',
    pt: 'Não foi possível ler sua história. Ela não se perdeu.',
  },
  historyHolding: {
    fr: 'Zones tenues en ce moment',
    en: 'Zones held right now',
    es: 'Zonas mantenidas ahora',
    de: 'Aktuell gehaltene Zonen',
    pt: 'Zonas mantidas agora',
  },
  historyLost: {
    fr: 'Zones reprises par quelqu’un',
    en: 'Zones taken by someone',
    es: 'Zonas tomadas por alguien',
    de: 'Von jemandem übernommene Zonen',
    pt: 'Zonas tomadas por alguém',
  },
  historyLongest: {
    fr: 'Plus longue tenue',
    en: 'Longest held',
    es: 'Más tiempo mantenida',
    de: 'Am längsten gehalten',
    pt: 'Mantida por mais tempo',
  },
  historyDays: {
    fr: '{n} j',
    en: '{n} d',
    es: '{n} d',
    de: '{n} T',
    pt: '{n} d',
  },
  // LA phrase. `{from}` et `{to}` sont des dates RÉELLES du registre.
  historyStory: {
    fr: 'Ce territoire était à toi du {from} au {to}.',
    en: 'This ground was yours from {from} to {to}.',
    es: 'Este territorio fue tuyo del {from} al {to}.',
    de: 'Dieses Gebiet gehörte dir vom {from} bis zum {to}.',
    pt: 'Este território foi seu de {from} a {to}.',
  },
  scopeNote: {
    fr: 'Cette page ne lit que TON territoire personnel, dans la discipline affichée.',
    en: 'This page reads only YOUR personal territory, in the discipline shown.',
    es: 'Esta página solo lee TU territorio personal, en la disciplina mostrada.',
    de: 'Diese Seite liest nur DEIN persönliches Gebiet, in der gezeigten Disziplin.',
    pt: 'Esta página lê apenas O SEU território pessoal, na disciplina mostrada.',
  },
  privacyNote: {
    fr: 'Aucune information sur les rivaux : ni qui t’attaque, ni où ni quand ils courent. Le Premium aide à comprendre son territoire, pas à espionner.',
    en: 'No information about rivals: not who attacks you, nor where or when they run. Premium helps you understand your territory, not spy.',
    es: 'Ninguna información sobre los rivales: ni quién te ataca, ni dónde ni cuándo corren. El Premium ayuda a entender tu territorio, no a espiar.',
    de: 'Keine Informationen über Rivalen: weder wer dich angreift, noch wo oder wann sie laufen. Premium hilft, das eigene Gebiet zu verstehen — nicht zu spionieren.',
    pt: 'Nenhuma informação sobre rivais: nem quem te ataca, nem onde ou quando correm. O Premium ajuda a entender o seu território, não a espionar.',
  },
  antiP2w: {
    fr: 'Cette analyse ne donne aucun avantage de jeu : ni territoire, ni points, ni protection, ni priorité de classement.',
    en: 'This analysis grants no gameplay advantage: no territory, points, protection or ranking priority.',
    es: 'Este análisis no da ninguna ventaja de juego: ni territorio, ni puntos, ni protección, ni prioridad de clasificación.',
    de: 'Diese Analyse verschafft keinen Spielvorteil: kein Gebiet, keine Punkte, kein Schutz, keine Ranglisten-Priorität.',
    pt: 'Esta análise não dá qualquer vantagem de jogo: nem território, nem pontos, nem proteção, nem prioridade de classificação.',
  },
  computedAt: {
    fr: 'Calculé à {time}',
    en: 'Computed at {time}',
    es: 'Calculado a las {time}',
    de: 'Berechnet um {time}',
    pt: 'Calculado às {time}',
  },

  // ── L'ENTRÉE depuis E18 « Statistiques » ──────────────────────────────────
  // Libellés COURTS (§A : jamais de texte d'action tronqué à 375 px). Ils vivent
  // ICI et non dans le catalogue `performance` : la ligne appartient à cette
  // fonctionnalité, et le jour où E66 change de nom, un seul fichier bouge.
  entryRow: {
    fr: 'Analyse territoriale',
    en: 'Territory analysis',
    es: 'Análisis territorial',
    de: 'Gebietsanalyse',
    pt: 'Análise territorial',
  },
  entryCta: {
    fr: 'Club',
    en: 'Club',
    es: 'Club',
    de: 'Club',
    pt: 'Club',
  },
  entryA11y: {
    fr: 'Ouvrir l’analyse territoriale, réservée au Club',
    en: 'Open territory analysis, for Club members',
    es: 'Abrir el análisis territorial, solo para Club',
    de: 'Gebietsanalyse öffnen, nur für Club',
    pt: 'Abrir a análise territorial, só para Club',
  },

  // ── Unités & accessibilité ────────────────────────────────────────────────
  unitDays: {
    fr: 'j',
    en: 'd',
    es: 'd',
    de: 'T',
    pt: 'd',
  },
  underADay: {
    fr: 'moins d’un jour',
    en: 'less than a day',
    es: 'menos de un día',
    de: 'weniger als ein Tag',
    pt: 'menos de um dia',
  },
  heatA11y: {
    fr: 'Carte de tes zones, colorée par la durée de contrôle',
    en: 'Map of your zones, coloured by time under control',
    es: 'Mapa de tus zonas, coloreado por el tiempo de control',
    de: 'Karte deiner Zonen, eingefärbt nach Kontrolldauer',
    pt: 'Mapa das suas zonas, colorido pelo tempo de controle',
  },
  activityRunA11y: {
    fr: 'Voir la course à pied',
    en: 'Show running',
    es: 'Ver carrera a pie',
    de: 'Laufen anzeigen',
    pt: 'Ver corrida',
  },
  activityBikeA11y: {
    fr: 'Voir le vélo',
    en: 'Show cycling',
    es: 'Ver ciclismo',
    de: 'Radfahren anzeigen',
    pt: 'Ver ciclismo',
  },
});
