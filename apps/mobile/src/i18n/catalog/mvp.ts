/**
 * GRYD — MICROCOPY MVP : la boucle cœur, mot pour mot (MASTER Annexe C, lot M1).
 *
 * ─── CE QUE CE CATALOGUE EST ────────────────────────────────────────────────
 * Les textes de la SEULE boucle du MVP : voir → courir → fermer → prendre →
 * partager. Ils sont la base de départ de l'Annexe C, complétée des phrases que
 * le moteur sait désormais tenir (fermeture assistée, mètres manquants — lots
 * G1b/G1c) et qui n'existaient nulle part.
 *
 * ─── POURQUOI PAS `locales/fr.json` COMME LE DEMANDE LE MASTER (§Annexe E) ──
 * Parce que le système en place est PLUS SÛR que ce qu'il propose. Ici, une
 * `Entry` est un `Record<Locale, string>` COMPLET : ajouter un texte sans ses
 * cinq langues est une erreur TypeScript, donc un gate rouge. Un JSON ne peut
 * pas offrir ça — une clé manquante ne se voit qu'à l'exécution, chez le joueur,
 * dans la langue qu'on ne teste jamais. L18 exige « aucun texte en dur, parité
 * FR/EN, pluriels gérés » : c'est tenu, et mieux. Le format n'était pas la règle.
 *
 * Les cinq langues sont donc écrites ici bien que le MVP n'en EXPOSE que deux :
 * restreindre l'offre se fait au SÉLECTEUR de langue, jamais en amputant un
 * catalogue — une chaîne absente ne se dégrade pas, elle affiche une clé brute.
 *
 * ─── LES DEUX LOIS QUI GOUVERNENT CE FICHIER ────────────────────────────────
 * L5 — tout message affiché PENDANT une course tient en ≤ 8 mots (idéal ≤ 4) :
 *      on le lit en courant, à bout de souffle, en une fraction de seconde.
 * L19 — l'app n'accuse JAMAIS. Aucun refus n'est un reproche : il nomme un
 *      fait, donne le manque en mètres, et rappelle ce qui est conservé.
 * `mvp.test.ts` vérifie les deux — sur TOUTES les langues, pas seulement le
 * français, parce qu'une traduction est exactement l'endroit où un ton dérape.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ══════════ CTA — impératif court (Annexe C) ═══════════════════════════════
  // « GO » est INVARIANT (override fondateur A-38) : il n'est pas traduit, il
  // est la marque du départ. Les autres sont des verbes, jamais des noms.
  ctaGo: { fr: 'GO', en: 'GO', es: 'GO', de: 'GO', pt: 'GO' },
  ctaRetake: { fr: 'REPRENDRE', en: 'TAKE BACK', es: 'RECUPERAR', de: 'ZURÜCKHOLEN', pt: 'RETOMAR' },
  ctaDefend: { fr: 'DÉFENDRE', en: 'DEFEND', es: 'DEFENDER', de: 'VERTEIDIGEN', pt: 'DEFENDER' },
  ctaShare: { fr: 'PARTAGER', en: 'SHARE', es: 'COMPARTIR', de: 'TEILEN', pt: 'PARTILHAR' },
  ctaCloseLoop: {
    fr: 'FERMER MA BOUCLE',
    en: 'CLOSE MY LOOP',
    es: 'CERRAR MI BUCLE',
    de: 'SCHLEIFE SCHLIESSEN',
    pt: 'FECHAR MEU CIRCUITO',
  },

  // ══════════ PENDANT LA COURSE — L5 : ≤ 8 mots, lisibles à bout de souffle ══
  runMetersLeft: {
    fr: '{m} m restants',
    en: '{m} m to go',
    es: 'faltan {m} m',
    de: 'noch {m} m',
    pt: 'faltam {m} m',
  },
  runLoopAlmost: {
    fr: 'Boucle presque fermée',
    en: 'Loop almost closed',
    es: 'Bucle casi cerrado',
    de: 'Schleife fast geschlossen',
    pt: 'Circuito quase fechado',
  },
  runLoopClosed: {
    fr: 'Boucle fermée',
    en: 'Loop closed',
    es: 'Bucle cerrado',
    de: 'Schleife geschlossen',
    pt: 'Circuito fechado',
  },
  runGpsWeak: {
    fr: 'Signal GPS faible',
    en: 'Weak GPS signal',
    es: 'Señal GPS débil',
    de: 'Schwaches GPS-Signal',
    pt: 'Sinal GPS fraco',
  },
  runPaused: { fr: 'Pause', en: 'Paused', es: 'Pausa', de: 'Pause', pt: 'Pausa' },

  // ══════════ LA CAPTURE — le pic émotionnel (L7) ═══════════════════════════
  captureTitle: {
    fr: 'Territoire pris',
    en: 'Ground taken',
    es: 'Territorio tomado',
    de: 'Gebiet erobert',
    pt: 'Território tomado',
  },
  captureGain: { fr: '+{m2} m²', en: '+{m2} m²', es: '+{m2} m²', de: '+{m2} m²', pt: '+{m2} m²' },
  captureFirst: {
    fr: 'Ta première conquête',
    en: 'Your first conquest',
    es: 'Tu primera conquista',
    de: 'Deine erste Eroberung',
    pt: 'Sua primeira conquista',
  },
  /**
   * FERMETURE ASSISTÉE (lot G1b) — le produit DIT ce qu'il a donné.
   * Ton : constat chaleureux, jamais une faveur condescendante. Le joueur a
   * fait le tour ; c'est un trottoir qui manquait, pas un effort.
   */
  captureAssisted: {
    fr: 'On a refermé les derniers mètres pour toi.',
    en: 'We closed the last few metres for you.',
    es: 'Hemos cerrado los últimos metros por ti.',
    de: 'Wir haben die letzten Meter für dich geschlossen.',
    pt: 'Fechamos os últimos metros por você.',
  },

  // ══════════ LES REFUS — L19 : nommer un fait, jamais accuser ══════════════
  verifyPartial: {
    fr: 'Une partie du parcours n’a pas servi au territoire. Tes stats restent disponibles.',
    en: 'Part of the route did not count towards territory. Your stats are still there.',
    es: 'Parte del recorrido no contó para el territorio. Tus estadísticas siguen ahí.',
    de: 'Ein Teil der Strecke zählte nicht fürs Gebiet. Deine Statistiken bleiben.',
    pt: 'Parte do percurso não contou para o território. Suas estatísticas continuam aí.',
  },
  /** Le manque en MÈTRES vient du moteur (`loopMissingM`), jamais de l'écran. */
  verifyGap: {
    fr: 'Il manquait {m} m pour fermer ta boucle.',
    en: 'You were {m} m short of closing your loop.',
    es: 'Faltaban {m} m para cerrar tu bucle.',
    de: 'Es fehlten {m} m, um deine Schleife zu schließen.',
    pt: 'Faltavam {m} m para fechar seu circuito.',
  },
  verifyTooSmall: {
    fr: 'Boucle trop petite pour créer une zone.',
    en: 'Loop too small to create a zone.',
    es: 'Bucle demasiado pequeño para crear una zona.',
    de: 'Schleife zu klein für eine Zone.',
    pt: 'Circuito pequeno demais para criar uma zona.',
  },

  // ══════════ ÉTATS DE ZONE ═════════════════════════════════════════════════
  zoneShielded: {
    fr: 'Protégée {h} h',
    en: 'Protected {h} h',
    es: 'Protegida {h} h',
    de: 'Geschützt {h} h',
    pt: 'Protegida {h} h',
  },
  zoneFragile: {
    fr: 'Fragile — repasse dessus pour la garder',
    en: 'Fragile — run through it to keep it',
    es: 'Frágil — vuelve a pasar para conservarla',
    de: 'Brüchig — lauf hindurch, um sie zu behalten',
    pt: 'Frágil — passe de novo para mantê-la',
  },

  // ══════════ NOTIFICATIONS — L16 : un FAIT de jeu, jamais un rappel ════════
  notifTaken: {
    fr: '{player} t’a pris {zone}',
    en: '{player} took {zone} from you',
    es: '{player} te ha quitado {zone}',
    de: '{player} hat dir {zone} abgenommen',
    pt: '{player} tomou {zone} de você',
  },
  notifFragile: {
    fr: '{zone} devient fragile demain',
    en: '{zone} turns fragile tomorrow',
    es: '{zone} se vuelve frágil mañana',
    de: '{zone} wird morgen brüchig',
    pt: '{zone} fica frágil amanhã',
  },
  notifCrewRank: {
    fr: 'Ton crew passe {rank} à {city}',
    en: 'Your crew moves to {rank} in {city}',
    es: 'Tu crew pasa a {rank} en {city}',
    de: 'Dein Crew steigt auf {rank} in {city}',
    pt: 'Seu crew sobe para {rank} em {city}',
  },

  // ══════════ PARTAGE — l'objet viral (§5) ═════════════════════════════════
  shareCtaTaunt: {
    fr: 'Prends-la-moi',
    en: 'Come take it',
    es: 'Ven a quitármela',
    de: 'Hol sie dir',
    pt: 'Vem tomar de mim',
  },
  shareCtaRetaken: { fr: 'Reprise.', en: 'Taken back.', es: 'Recuperada.', de: 'Zurückgeholt.', pt: 'Retomada.' },
  shareCtaCrew: {
    fr: 'On tient le quartier',
    en: 'We hold this block',
    es: 'Controlamos el barrio',
    de: 'Wir halten das Viertel',
    pt: 'Nós dominamos o bairro',
  },
  /** Signature de marque — INVARIANTE, comme « GO » (§5.2). */
  shareTagline: {
    fr: 'CLAIM THE CITY.',
    en: 'CLAIM THE CITY.',
    es: 'CLAIM THE CITY.',
    de: 'CLAIM THE CITY.',
    pt: 'CLAIM THE CITY.',
  },

  // ══════════ ÉTATS VIDES — L8 : contiennent l'action qui les remplit ══════
  emptyMap: {
    fr: 'Ta ville est vierge. Ferme ta première boucle.',
    en: 'Your city is untouched. Close your first loop.',
    es: 'Tu ciudad está virgen. Cierra tu primer bucle.',
    de: 'Deine Stadt ist unberührt. Schließe deine erste Schleife.',
    pt: 'Sua cidade está intocada. Feche seu primeiro circuito.',
  },

  // ══════════ ONBOARDING — L9 : la valeur AVANT la permission ══════════════
  onboardingPriming: {
    fr: 'GRYD dessine ton territoire à partir de ta course. Autorise ta position pour commencer.',
    en: 'GRYD draws your territory from your run. Allow location to begin.',
    es: 'GRYD dibuja tu territorio a partir de tu carrera. Permite la ubicación para empezar.',
    de: 'GRYD zeichnet dein Gebiet aus deinem Lauf. Erlaube den Standort, um zu starten.',
    pt: 'O GRYD desenha seu território a partir da sua corrida. Permita a localização para começar.',
  },
});

/**
 * Les clés affichées PENDANT une course — soumises à la limite de 8 mots (L5).
 *
 * Cette liste est DONNÉE et non devinée : un test qui déduirait « in-run » d'un
 * préfixe de nom raterait la première clé qu'on nommerait autrement, et la
 * limite cesserait silencieusement de s'appliquer là où elle compte le plus.
 */
export const IN_RUN_KEYS = [
  'ctaGo',
  'ctaCloseLoop',
  'runMetersLeft',
  'runLoopAlmost',
  'runLoopClosed',
  'runGpsWeak',
  'runPaused',
] as const satisfies readonly (keyof typeof C)[];
