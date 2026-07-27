/**
 * GRYD — i18n : LE VOCABULAIRE DE RANG, et l'écran E60 « Passage de rang ».
 *
 * ─── POURQUOI CE CATALOGUE EXISTE (27/07/2026) ────────────────────────────────
 * Deux trous distincts, un seul endroit pour les fermer.
 *
 * 1. LES SEPT NOMS DE RANG N'ÉTAIENT PAS TRADUITS. `GRIP_RANK_LABELS`
 *    (features/crew/rules.ts) était un `Record<GripRank, string>` de sept
 *    chaînes FRANÇAISES — « Recrue », « Éclaireur », « Conquérant »… — rendues
 *    telles quelles par le Profil (app/(tabs)/profil.tsx, 3 sites) dans les cinq
 *    langues. Un joueur allemand lisait « Conquérant · NIV. 22 ». Ce sont
 *    maintenant des `Entry` (règle 17 : jamais une chaîne déjà résolue), et
 *    `GRIP_RANK_LABELS` les LIT — il n'existe pas deux tables de noms.
 *    Ce ne sont PAS des noms propres invariants (contrairement aux badges du
 *    catalogue `@klaim/shared`, qui sont des titres décernés) : ce sont des
 *    mots communs qui décrivent un palier.
 *
 * 2. E60 N'AVAIT AUCUN CATALOGUE. L'écran plein écran de passage de rang
 *    (emblème, anneau chartreuse, `NOUVEAU RANG`, rang, récompense, CTA
 *    `CONTINUER`, lien `Voir la saison`) n'existe pas encore ; ses textes vivent
 *    donc ici, prêts, plutôt que d'être improvisés en français au moment du
 *    rendu.
 *
 * ─── CE QUE CE CATALOGUE NE DIT PAS, ET POURQUOI ──────────────────────────────
 * Aucune promesse de RÉCOMPENSE en dur. La spéc E60 liste « récompense » dans la
 * composition de l'écran : ce que GRYD décerne à un palier de rang est un
 * COSMÉTIQUE (pose de GRIP, §43.3 — gagnée au niveau, jamais achetée), et le
 * texte le dit sans chiffrer ni nommer un objet que le code ne donne pas.
 * `recompensePose` est la seule formulation honnête aujourd'hui.
 *
 * ─── LES ÉTATS NON NOMINAUX ───────────────────────────────────────────────────
 * E60 est un MOMENT, pas une lecture : il ne s'ouvre qu'APRÈS un franchissement
 * déjà calculé et connu. Il n'a donc ni « vide » ni « en cours de lecture » —
 * mais il a un échec possible (`rangIndispo`) : si le nom du nouveau rang n'a pas
 * pu être résolu, on ne fabrique pas un rang, on le dit et on laisse la sortie
 * ouverte. Les états de lecture d'une SAISON vivent dans `saison.ts` / `finSaison.ts`.
 *
 * §A : libellés COURTS dans les cinq langues (l'allemand est reformulé concis)
 * pour ne jamais tronquer à 375 px. Le français TUTOIE (registre.test.ts).
 * Le portugais est BRÉSILIEN (« você » ; jamais « teu/tua/tens/podes »).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ══════════════ Les sept rangs GRIP (§43.3) — vocabulaire partagé ══════════
  // Clés = `GripRank` de @klaim/shared. Lues par GRIP_RANK_LABELS (E55 Profil),
  // par E59 Saison et par E60 ci-dessous. Une seule table de noms.
  rankRookie: {
    fr: 'Recrue',
    en: 'Rookie',
    es: 'Recluta',
    de: 'Rekrut',
    pt: 'Recruta',
  },
  rankRunner: {
    fr: 'Coureur',
    en: 'Runner',
    es: 'Corredor',
    de: 'Läufer',
    pt: 'Corredor',
  },
  rankScout: {
    fr: 'Éclaireur',
    en: 'Scout',
    es: 'Explorador',
    de: 'Späher',
    pt: 'Batedor',
  },
  rankDefender: {
    fr: 'Défenseur',
    en: 'Defender',
    es: 'Defensor',
    de: 'Verteidiger',
    pt: 'Defensor',
  },
  rankConqueror: {
    fr: 'Conquérant',
    en: 'Conqueror',
    es: 'Conquistador',
    de: 'Eroberer',
    pt: 'Conquistador',
  },
  rankVeteran: {
    fr: 'Vétéran',
    en: 'Veteran',
    es: 'Veterano',
    de: 'Veteran',
    pt: 'Veterano',
  },
  rankLegend: {
    fr: 'Légende',
    en: 'Legend',
    es: 'Leyenda',
    de: 'Legende',
    pt: 'Lenda',
  },

  // ══════════════ E60 · Le moment de rang (plein écran) ══════════════════════
  /** Le kicker de la planche, en capitales à l'écran (pas dans la chaîne). */
  kickerNouveauRang: {
    fr: 'Nouveau rang',
    en: 'New rank',
    es: 'Nuevo rango',
    de: 'Neuer Rang',
    pt: 'Nova patente',
  },
  /** Sous-titre : d'où l'on vient. `{from}` = nom de rang, résolu par l'écran. */
  depuisRang: {
    fr: 'Tu passes de {from} à {to}',
    en: 'You go from {from} to {to}',
    es: 'Pasas de {from} a {to}',
    de: 'Von {from} zu {to}',
    pt: 'Você passa de {from} para {to}',
  },
  /** Le niveau atteint, sous le nom du rang. */
  niveauAtteint: {
    fr: 'Niveau {n}',
    en: 'Level {n}',
    es: 'Nivel {n}',
    de: 'Level {n}',
    pt: 'Nível {n}',
  },
  /**
   * LA RÉCOMPENSE, DITE SANS RIEN PROMETTRE DE PLUS. Un palier de rang change la
   * POSE de GRIP (cosmétique, §43.3) : rien d'autre n'est décerné, et surtout
   * aucun avantage de jeu (anti pay-to-win : un rang ne s'achète pas, il se
   * court).
   */
  recompensePose: {
    fr: 'GRIP prend une nouvelle pose. Cosmétique, jamais un avantage.',
    en: 'GRIP takes a new pose. Cosmetic, never an advantage.',
    es: 'GRIP adopta una nueva pose. Cosmético, nunca una ventaja.',
    de: 'GRIP nimmt eine neue Pose ein. Kosmetik, nie ein Vorteil.',
    pt: 'GRIP assume uma nova pose. Cosmético, nunca uma vantagem.',
  },
  /** CTA unique et chartreuse de l'écran (§A4). */
  continuer: {
    fr: 'Continuer',
    en: 'Continue',
    es: 'Continuar',
    de: 'Weiter',
    pt: 'Continuar',
  },
  /** Lien secondaire, jamais un second CTA coloré. */
  voirLaSaison: {
    fr: 'Voir la saison',
    en: 'View season',
    es: 'Ver la temporada',
    de: 'Saison ansehen',
    pt: 'Ver a temporada',
  },
  /** Le moment est SKIPPABLE (§3.7) — l'affordance doit être dite. */
  a11yPasser: {
    fr: 'Passer l’animation',
    en: 'Skip the animation',
    es: 'Saltar la animación',
    de: 'Animation überspringen',
    pt: 'Pular a animação',
  },
  /**
   * ÉCHEC DE RÉSOLUTION : le franchissement est réel (le serveur l'a décidé)
   * mais le NOM du rang n'a pas pu être lu. On ne fabrique pas un nom — on le
   * dit, et la sortie reste ouverte.
   */
  rangIndispo: {
    fr: 'Rang indisponible',
    en: 'Rank unavailable',
    es: 'Rango no disponible',
    de: 'Rang nicht verfügbar',
    pt: 'Patente indisponível',
  },
  rangIndispoCorps: {
    fr: 'Tu as franchi un palier, mais son nom n’a pas pu être lu. Il apparaîtra sur ton profil.',
    en: 'You crossed a tier, but its name could not be read. It will show on your profile.',
    es: 'Has superado un nivel, pero no se pudo leer su nombre. Aparecerá en tu perfil.',
    de: 'Du hast eine Stufe erreicht, ihr Name konnte aber nicht gelesen werden. Er erscheint in deinem Profil.',
    pt: 'Você subiu de patamar, mas o nome não pôde ser lido. Ele vai aparecer no seu perfil.',
  },
});
