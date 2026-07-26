/**
 * GRYD — i18n : catalogue du domaine « mes parcours » (demande fondateur 21/07).
 * L'écran de personnalisation des propositions de parcours + son bloc de
 * transparence (« ce que GRYD a déduit »).
 *
 * TON : franc, jamais anxiogène, jamais vendeur. On dit ce qui est LU, ce qui
 * n'est PAS lu, et ce qui se passe quand on coupe l'apprentissage. Aucune phrase
 * ne promet un avantage de jeu — une proposition de parcours ne donne ni point,
 * ni territoire (anti pay-to-win).
 *
 * INVARIANTS (jamais traduits) : GRYD, km, min, les allures (5'40 /km).
 *
 * §A CONTRAIGNANT : labels de pastilles et de lignes COURTS dans les 5 langues.
 * L'allemand est reformulé concis (« Steigungen meiden », « Zurücksetzen ») —
 * jamais un composé à rallonge qui tronque à 375 px.
 *
 * ─── L'APPRENTISSAGE NE SÉPARE PAS LES DISCIPLINES (E14, 26/07/2026) ────────
 * `/mes-parcours` n'a PAS de commutateur run/bike, et la RPC qui l'alimente —
 * `habits_inputs` (migration 0055) — n'a AUCUNE colonne `activity` : les sorties
 * vélo entrent dans l'échantillon d'habitudes exactement comme les courses. Le
 * bloc de transparence disait pourtant « Déduit de {n} courses » et « Apprendre
 * de mes courses » : il décrivait FAUSSEMENT ce que GRYD lit, sur l'écran dont
 * le seul objet est justement de le dire honnêtement.
 *
 * Remède : NEUTRALISATION, pas de jumeau `…Bike`. Un jumeau promettrait deux
 * apprentissages séparés que la RPC ne sait pas produire — ce serait remplacer
 * un mensonge de vocabulaire par un mensonge de mécanique. La séparation réelle
 * reste un chantier SQL ouvert (inscrit en suspens dans game-rules.ts).
 * Verrouillé par `parcours.test.ts`.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── En-tête + entrée depuis Paramètres ────────────────────────────────────
  title: {
    fr: 'Mes parcours',
    en: 'My routes',
    es: 'Mis rutas',
    de: 'Meine Routen',
    pt: 'Minhas rotas',
  },
  kicker: {
    fr: 'RÉGLAGES · MES PARCOURS',
    en: 'SETTINGS · MY ROUTES',
    es: 'AJUSTES · MIS RUTAS',
    de: 'EINSTELLUNGEN · MEINE ROUTEN',
    pt: 'AJUSTES · MINHAS ROTAS',
  },
  subtitle: {
    fr: 'Ce que GRYD te propose pour ta prochaine sortie. Un parcours proposé ne donne jamais de points ni de territoire — il suggère.',
    // fr et es disaient déjà « sortie » / « salida » : seules les trois langues
    // qui fuyaient sont retouchées — on ne réécrit pas ce qui est déjà juste.
    en: 'What GRYD suggests for your next outing. A suggested route never grants points or territory — it only suggests.',
    es: 'Lo que GRYD te propone para tu próxima salida. Una ruta sugerida nunca da puntos ni territorio: solo sugiere.',
    de: 'Was GRYD dir für deine nächste Aktivität vorschlägt. Eine Route bringt nie Punkte oder Gebiet — sie schlägt nur vor.',
    pt: 'O que o GRYD propõe para a sua próxima atividade. Uma rota sugerida nunca dá pontos nem território — só sugere.',
  },
  rowDetail: {
    fr: 'Distance visée, apprentissage',
    en: 'Target distance, learning',
    es: 'Distancia objetivo, aprendizaje',
    de: 'Zieldistanz, Lernen',
    pt: 'Distância alvo, aprendizado',
  },
  secParcours: {
    fr: 'PARCOURS',
    en: 'ROUTES',
    es: 'RUTAS',
    de: 'ROUTEN',
    pt: 'ROTAS',
  },

  // ── Bloc transparence ─────────────────────────────────────────────────────
  secDeduit: {
    fr: 'CE QUE GRYD A DÉDUIT',
    en: 'WHAT GRYD FIGURED OUT',
    es: 'LO QUE GRYD HA DEDUCIDO',
    de: 'WAS GRYD ABGELEITET HAT',
    pt: 'O QUE O GRYD DEDUZIU',
  },
  habitsTitle: {
    fr: 'Tes habitudes',
    en: 'Your habits',
    es: 'Tus hábitos',
    de: 'Deine Gewohnheiten',
    pt: 'Seus hábitos',
  },
  habitsUnknown: {
    fr: 'Pas encore assez de sorties pour en déduire quoi que ce soit. GRYD ne devine rien.',
    en: 'Not enough outings yet to figure anything out. GRYD does not guess.',
    es: 'Aún no hay salidas suficientes para deducir nada. GRYD no adivina.',
    de: 'Noch zu wenige Aktivitäten, um etwas abzuleiten. GRYD rät nicht.',
    pt: 'Ainda não há atividades suficientes para deduzir nada. O GRYD não adivinha.',
  },
  habitsUnavailable: {
    fr: 'GRYD ne peut pas lire tes habitudes pour l’instant.',
    en: 'GRYD can’t read your habits right now.',
    es: 'GRYD no puede leer tus hábitos ahora mismo.',
    de: 'GRYD kann deine Gewohnheiten gerade nicht lesen.',
    pt: 'O GRYD não consegue ler seus hábitos agora.',
  },
  habitsOff: {
    fr: 'Apprentissage désactivé. GRYD n’utilise pas tes sorties.',
    en: 'Learning is off. GRYD does not use your outings.',
    es: 'Aprendizaje desactivado. GRYD no usa tus salidas.',
    de: 'Lernen ist aus. GRYD nutzt deine Aktivitäten nicht.',
    pt: 'Aprendizado desativado. O GRYD não usa suas atividades.',
  },
  habitsDistance: {
    fr: 'Distance habituelle',
    en: 'Usual distance',
    es: 'Distancia habitual',
    de: 'Übliche Distanz',
    pt: 'Distância habitual',
  },
  habitsPace: {
    fr: 'Allure habituelle',
    en: 'Usual pace',
    es: 'Ritmo habitual',
    de: 'Übliches Tempo',
    pt: 'Ritmo habitual',
  },
  habitsSlot: {
    fr: 'Créneau',
    en: 'Time of day',
    es: 'Franja horaria',
    de: 'Tageszeit',
    pt: 'Faixa horária',
  },
  // Le nom de clé `habitsRuns` est lu par `app/mes-parcours.tsx` : le renommer
  // sortirait de ce catalogue. Ce qui devait changer est le TEXTE — le nombre
  // qu'il annonce compte les sorties de TOUTES les disciplines.
  habitsRuns: {
    fr: 'Déduit de {n} sorties.',
    en: 'Based on {n} outings.',
    es: 'Deducido de {n} salidas.',
    de: 'Aus {n} Aktivitäten abgeleitet.',
    pt: 'Deduzido de {n} atividades.',
  },
  // Clés ALIGNÉES sur HABITS_SLOTS (game-rules) : dawn / day / evening / night.
  // Les bornes sont celles du moteur (5 h, 10 h, 17 h, 21 h) — on nomme des
  // moments de vie, jamais une heure précise (« 6 h 40 » dirait quand le
  // logement est vide).
  slotDawn: {
    fr: 'Petit matin',
    en: 'Early morning',
    es: 'Primera hora',
    de: 'Früh am Morgen',
    pt: 'Bem cedo',
  },
  slotDay: {
    fr: 'Journée',
    en: 'Daytime',
    es: 'Durante el día',
    de: 'Tagsüber',
    pt: 'Durante o dia',
  },
  slotEvening: {
    fr: 'Soir',
    en: 'Evening',
    es: 'Tarde',
    de: 'Abends',
    pt: 'Noite',
  },
  slotNight: {
    fr: 'Nuit',
    en: 'Night',
    es: 'Noche',
    de: 'Nachts',
    pt: 'Madrugada',
  },

  // ── Réglages manuels ──────────────────────────────────────────────────────
  secReglages: {
    fr: 'MES RÉGLAGES',
    en: 'MY SETTINGS',
    es: 'MIS AJUSTES',
    de: 'MEINE EINSTELLUNGEN',
    pt: 'MEUS AJUSTES',
  },
  distTitle: {
    fr: 'Distance visée',
    en: 'Target distance',
    es: 'Distancia objetivo',
    de: 'Zieldistanz',
    pt: 'Distância alvo',
  },
  distAuto: {
    fr: 'Auto',
    en: 'Auto',
    es: 'Auto',
    de: 'Auto',
    pt: 'Auto',
  },
  distNoteAuto: {
    fr: 'GRYD choisit d’après tes habitudes.',
    en: 'GRYD picks it from your habits.',
    es: 'GRYD la elige según tus hábitos.',
    de: 'GRYD wählt sie nach deinen Gewohnheiten.',
    pt: 'O GRYD escolhe pelos seus hábitos.',
  },
  distNoteAutoOff: {
    fr: 'Apprentissage coupé : GRYD utilise une distance par défaut.',
    en: 'Learning is off: GRYD uses a default distance.',
    es: 'Aprendizaje apagado: GRYD usa una distancia por defecto.',
    de: 'Lernen aus: GRYD nutzt eine Standarddistanz.',
    pt: 'Aprendizado desligado: o GRYD usa uma distância padrão.',
  },
  distNoteManual: {
    fr: 'Ton réglage prime toujours sur l’apprentissage.',
    en: 'Your setting always wins over learning.',
    es: 'Tu ajuste siempre gana al aprendizaje.',
    de: 'Deine Einstellung schlägt immer das Lernen.',
    pt: 'Seu ajuste sempre vence o aprendizado.',
  },
  shapeTitle: {
    fr: 'Forme du parcours',
    en: 'Route shape',
    es: 'Forma de la ruta',
    de: 'Routenform',
    pt: 'Formato da rota',
  },
  shapeAny: {
    fr: 'Peu importe',
    en: 'Any',
    es: 'Cualquiera',
    de: 'Egal',
    pt: 'Tanto faz',
  },
  shapeLoop: {
    fr: 'Boucle',
    en: 'Loop',
    es: 'Bucle',
    de: 'Runde',
    pt: 'Volta',
  },
  shapeOutAndBack: {
    fr: 'Aller-retour',
    en: 'Out and back',
    es: 'Ida y vuelta',
    de: 'Hin und zurück',
    pt: 'Ida e volta',
  },
  hillsTitle: {
    fr: 'Éviter les côtes',
    en: 'Avoid hills',
    es: 'Evitar cuestas',
    de: 'Steigungen meiden',
    pt: 'Evitar subidas',
  },

  // ── Apprentissage ─────────────────────────────────────────────────────────
  secApprentissage: {
    fr: 'APPRENTISSAGE',
    en: 'LEARNING',
    es: 'APRENDIZAJE',
    de: 'LERNEN',
    pt: 'APRENDIZADO',
  },
  learnTitle: {
    fr: 'Apprendre de mes sorties',
    en: 'Learn from my outings',
    es: 'Aprender de mis salidas',
    de: 'Aus meinen Aktivitäten lernen',
    pt: 'Aprender com minhas atividades',
  },
  learnHint: {
    fr: 'GRYD regarde tes distances, tes allures et tes horaires — les tiens seulement, jamais ceux des autres. Aucun point de départ n’est enregistré.',
    en: 'GRYD looks at your distances, paces and times — yours only, never anyone else’s. No start point is stored.',
    es: 'GRYD mira tus distancias, ritmos y horarios: solo los tuyos, nunca los de otros. No se guarda ningún punto de salida.',
    de: 'GRYD schaut auf deine Distanzen, Tempi und Zeiten — nur deine, nie die anderer. Kein Startpunkt wird gespeichert.',
    pt: 'O GRYD olha suas distâncias, ritmos e horários — só os seus, nunca os de outros. Nenhum ponto de partida é guardado.',
  },
  learnOffHint: {
    fr: 'GRYD n’utilise plus tes habitudes. Les propositions suivent ton réglage manuel, ou un défaut.',
    en: 'GRYD no longer uses your habits. Suggestions follow your manual setting, or a default.',
    es: 'GRYD ya no usa tus hábitos. Las sugerencias siguen tu ajuste manual, o un valor por defecto.',
    de: 'GRYD nutzt deine Gewohnheiten nicht mehr. Vorschläge folgen deiner Einstellung oder einem Standard.',
    pt: 'O GRYD não usa mais seus hábitos. As sugestões seguem seu ajuste manual, ou um padrão.',
  },
  forgetLabel: {
    fr: 'Oublier ce que GRYD a appris',
    en: 'Forget what GRYD learned',
    es: 'Olvidar lo que GRYD aprendió',
    de: 'Gelerntes zurücksetzen',
    pt: 'Esquecer o que o GRYD aprendeu',
  },
  forgetDetail: {
    fr: 'Repartir de zéro',
    en: 'Start over',
    es: 'Empezar de cero',
    de: 'Neu beginnen',
    pt: 'Começar do zero',
  },
  forgetConfirmTitle: {
    fr: 'Tout oublier ?',
    en: 'Forget everything?',
    es: '¿Olvidar todo?',
    de: 'Alles vergessen?',
    pt: 'Esquecer tudo?',
  },
  forgetConfirmBody: {
    fr: 'GRYD repartira de zéro pour tes prochaines propositions. Tes sorties, elles, ne sont pas touchées.',
    en: 'GRYD will start from scratch for your next suggestions. Your outings are not touched.',
    es: 'GRYD empezará de cero para tus próximas sugerencias. Tus salidas no se tocan.',
    de: 'GRYD startet bei null für die nächsten Vorschläge. Deine Aktivitäten bleiben unangetastet.',
    pt: 'O GRYD vai começar do zero nas próximas sugestões. Suas atividades não são tocadas.',
  },
  forgetConfirmCta: {
    fr: 'Oublier',
    en: 'Forget',
    es: 'Olvidar',
    de: 'Vergessen',
    pt: 'Esquecer',
  },
  forgetDone: {
    fr: 'C’est oublié. GRYD repart de zéro.',
    en: 'Forgotten. GRYD starts over.',
    es: 'Olvidado. GRYD empieza de cero.',
    de: 'Vergessen. GRYD fängt neu an.',
    pt: 'Esquecido. O GRYD começa do zero.',
  },
  cancel: {
    fr: 'Annuler',
    en: 'Cancel',
    es: 'Cancelar',
    de: 'Abbrechen',
    pt: 'Cancelar',
  },

  // ── États d'erreur / hors session ─────────────────────────────────────────
  /**
   * ÉCHEC SANS SORTIE. La page affichait cette phrase — et RIEN d'autre : pas de
   * « Réessayer », pas de retour, un cul-de-sac. Elle devient le CORPS d'un état
   * d'échec qui, lui, porte une action.
   */
  loadFailedTitle: {
    fr: 'Réglages illisibles',
    en: 'Settings unreadable',
    es: 'Ajustes ilegibles',
    de: 'Einstellungen nicht lesbar',
    pt: 'Ajustes ilegíveis',
  },
  prefsUnavailable: {
    fr: 'GRYD n’a pas pu lire tes réglages de parcours. Rien n’a été modifié — un réseau qui lâche n’efface aucune préférence.',
    en: 'GRYD could not read your route settings. Nothing was changed — a network that drops erases no preference.',
    es: 'GRYD no pudo leer tus ajustes de rutas. No se cambió nada — una red que falla no borra ninguna preferencia.',
    de: 'GRYD konnte deine Routen-Einstellungen nicht lesen. Es wurde nichts geändert — ein abbrechendes Netz löscht keine Präferenz.',
    pt: 'O GRYD não conseguiu ler seus ajustes de rotas. Nada foi alterado — uma rede que cai não apaga nenhuma preferência.',
  },
  retry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  /** Lecture EN COURS — une ligne, jamais un spinner plein écran. */
  loadingLine: {
    fr: 'Lecture de tes réglages…',
    en: 'Reading your settings…',
    es: 'Leyendo tus ajustes…',
    de: 'Einstellungen werden gelesen…',
    pt: 'Lendo seus ajustes…',
  },
  habitsLoadingLine: {
    fr: 'Lecture de tes habitudes…',
    en: 'Reading your habits…',
    es: 'Leyendo tus hábitos…',
    de: 'Gewohnheiten werden gelesen…',
    pt: 'Lendo seus hábitos…',
  },
  saveError: {
    fr: 'Réglage non enregistré. Réessaie.',
    en: 'Setting not saved. Try again.',
    es: 'Ajuste no guardado. Inténtalo de nuevo.',
    de: 'Nicht gespeichert. Versuch es erneut.',
    pt: 'Ajuste não salvo. Tente de novo.',
  },
  signedOut: {
    fr: 'Connecte-toi pour personnaliser tes parcours. Ces réglages vivent sur ton compte, pas sur ce téléphone.',
    en: 'Sign in to personalise your routes. These settings live on your account, not on this phone.',
    es: 'Inicia sesión para personalizar tus rutas. Estos ajustes viven en tu cuenta, no en este teléfono.',
    de: 'Melde dich an, um deine Routen anzupassen. Diese Einstellungen liegen im Konto, nicht auf dem Handy.',
    pt: 'Entre para personalizar suas rotas. Estes ajustes ficam na sua conta, não neste telefone.',
  },
  footerNote: {
    fr: 'Enregistré sur ton compte : tu retrouves tes réglages sur un nouveau téléphone. Personne d’autre ne les voit.',
    en: 'Saved to your account: you keep your settings on a new phone. Nobody else can see them.',
    es: 'Guardado en tu cuenta: conservas tus ajustes en un teléfono nuevo. Nadie más los ve.',
    de: 'Im Konto gespeichert: Einstellungen bleiben auch auf einem neuen Handy. Niemand sonst sieht sie.',
    pt: 'Salvo na sua conta: você mantém os ajustes em um novo telefone. Mais ninguém os vê.',
  },
});
