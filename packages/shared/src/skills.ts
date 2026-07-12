/**
 * GRYD — Catalogue des SKILLS (AMENDEMENT-23 §C, doc §28-§29). SOURCE DE VÉRITÉ
 * UNIQUE du catalogue skills. AUCUN nombre magique skill hors de ce fichier
 * (seuils, familles, icônes). Catalogue SELF-CONTAINED (comme badges.ts) —
 * PAS dans game-rules.ts.
 *
 * Les skills sont des SPÉCIALISATIONS DE GAMEPLAY gagnées par COMPORTEMENT
 * (pas seulement achetées). 8 familles, chacune à 3 niveaux (I/II/III) à seuils
 * gelés. Ils sont DISTINCTS des badges par intention :
 *   - badge   = récompense de PROGRESSION (collection, jalons).
 *   - skill   = RÔLE / spécialisation → oriente les MISSIONS et la
 *               RECONNAISSANCE (reco War Room, ex. « Finisher II · 620 m »).
 *
 * ANTI PAY-TO-WIN STRICT (doc §27-§28) : un skill ne donne JAMAIS de territoire,
 * de points ni de victoire directs. Il ORIENTE seulement. `Supporter` n'a
 * AUCUN pouvoir territorial direct.
 *
 * RÉUTILISATION DES STATS (règle §C « une seule source de stats joueur ») :
 * chaque famille se dérive d'un COMPTEUR DÉJÀ AGRÉGÉ pour les badges
 * (LifetimeStats, engine/badges.ts) — jamais de barème parallèle. Le `metric`
 * ci-dessous est exactement une clé de LifetimeStats (typée `SkillMetric`).
 *
 * Dérivation : fonction PURE `deriveSkills(stats, catalogue)` dans
 * packages/engine/src/skills.ts (+ tests Deno). Affichage : section Skills du
 * Profil + reco War Room (agents Écrans). UI-only côté rendu, mais la DÉRIVATION
 * vit dans l'engine (comme les badges) → copie générée _shared/engine/skills.ts
 * (sync-game-rules.mjs, drift testé) ; ce catalogue n'est PAS consommé par les
 * Edge Functions (aucun claim ne dépend d'un skill).
 */

// ─── Compteurs de stats réutilisés (sous-ensemble de LifetimeStats) ──────────
/**
 * Métrique d'un skill = clé EXISTANTE de LifetimeStats (engine/badges.ts),
 * alimentée par ingest_run / les jobs badges. Choix par famille (doc §28) :
 *  - defends           : zones défendues (Defender).
 *  - loopRuns          : boucles fermées terminées (Finisher).
 *  - pioneerHexes      : zones pionnières = jamais possédées = découvertes (Scout).
 *  - routes            : routes ouvertes (Route Maker).
 *  - hexesCaptured     : zones capturées, neutres + volées (Conqueror).
 *  - offensivesJoined  : offensives/missions War Room rejointes (Strategist).
 *  - crewContributions : contributions au crew — soutien, AUCUN pouvoir
 *                        territorial direct (Supporter, doc §28).
 *  - weeksActive       : semaines ISO actives = régularité (Streak Runner).
 * NB : sciemment un SOUS-ENSEMBLE — on ne réexpose que les 8 compteurs utiles,
 * pour garder le lien « skill → comportement » lisible.
 */
export type SkillMetric =
  | 'defends'
  | 'loopRuns'
  | 'pioneerHexes'
  | 'routes'
  | 'hexesCaptured'
  | 'offensivesJoined'
  | 'crewContributions'
  | 'weeksActive';

// ─── Familles (doc §28) ──────────────────────────────────────────────────────

/** Les 8 familles de skills (identifiants stables snake_case). */
export type SkillFamilyId =
  | 'defender'
  | 'finisher'
  | 'scout'
  | 'route_maker'
  | 'conqueror'
  | 'strategist'
  | 'supporter'
  | 'streak_runner';

/** Ordre d'affichage canonique des familles (doc §28). */
export const SKILL_FAMILY_ORDER: readonly SkillFamilyId[] = [
  'defender',
  'finisher',
  'scout',
  'route_maker',
  'conqueror',
  'strategist',
  'supporter',
  'streak_runner',
];

// ─── Niveaux ─────────────────────────────────────────────────────────────────

/** Rang d'un niveau atteint : 0 = verrouillé, 1 = I, 2 = II, 3 = III. */
export type SkillLevelRank = 0 | 1 | 2 | 3;

/** Chiffres romains des 3 niveaux (I/II/III). */
export const SKILL_ROMAN = ['I', 'II', 'III'] as const;

/** Nombre de niveaux par famille (I/II/III). */
export const SKILL_MAX_LEVEL = 3;

/** Un palier de niveau d'une famille (seuil GELÉ sur le compteur `metric`). */
export interface SkillLevelDef {
  /** 1 = I, 2 = II, 3 = III. */
  level: 1 | 2 | 3;
  /** Nom complet affiché, ex. « Defender II ». */
  name: string;
  /** Chiffre romain du niveau. */
  roman: (typeof SKILL_ROMAN)[number];
  /** Débloqué quand `stats[metric] >= threshold`. Seuil GELÉ. */
  threshold: number;
  /** Condition affichée, formulée joueur, ex. « 50 zones défendues ». */
  requirement: string;
}

/** Une famille de skill (self-contained : familles + seuils + icône + libellés). */
export interface SkillDef {
  /** Identifiant stable snake_case. */
  id: SkillFamilyId;
  /** Nom de la famille, ex. « Defender ». */
  name: string;
  /** Rôle en une phrase (reco mission / reconnaissance). */
  role: string;
  /**
   * Déclencheurs = COMPORTEMENTS qui font monter le skill (doc §28), formulés
   * joueur. Le premier déclencheur est le compteur principal (`metric`).
   */
  triggers: readonly string[];
  /** Compteur de stat réutilisé (clé LifetimeStats). Une seule source. */
  metric: SkillMetric;
  /** Nom de l'icône (icons.ts, résolue par skillIconName / SKILL_ICONS). */
  icon: string;
  /** Les 3 niveaux I/II/III, seuils croissants gelés. */
  levels: readonly [SkillLevelDef, SkillLevelDef, SkillLevelDef];
}

// ─── Construction d'une famille ──────────────────────────────────────────────

/**
 * Construit une famille de skill à 3 niveaux. `thresholds` = 3 bornes STRICTEMENT
 * croissantes [I, II, III]. `requirementFor(threshold)` rend la condition
 * affichée d'un niveau (une seule unité par famille → seul le seuil varie).
 */
function family(
  id: SkillFamilyId,
  name: string,
  role: string,
  metric: SkillMetric,
  icon: string,
  triggers: readonly string[],
  thresholds: readonly [number, number, number],
  requirementFor: (threshold: number) => string,
): SkillDef {
  const levels = thresholds.map((threshold, i) => {
    const level = (i + 1) as 1 | 2 | 3;
    return {
      level,
      name: `${name} ${SKILL_ROMAN[i]}`,
      roman: SKILL_ROMAN[i]!,
      threshold,
      requirement: requirementFor(threshold),
    };
  }) as [SkillLevelDef, SkillLevelDef, SkillLevelDef];
  return { id, name, role, triggers, metric, icon, levels };
}

/** Modèle de condition « N <unité> ». */
const req = (unit: string) => (t: number) => `${t.toLocaleString('fr-FR')} ${unit}`;

/**
 * Le catalogue des 8 familles de skills.
 *
 * SEUILS — cohérence avec l'existant (aucune magie, tout documenté) :
 *  - `Defender` = 10 / 50 / 150 zones défendues : bornes EXACTES du doc §28
 *    (l'exemple canonique). Sert de gabarit de granularité pour les autres.
 *  - Les 7 autres familles : le doc §28 ne fige QUE Defender ; on retient le
 *    même profil « accessible → engagé → spécialiste » (I atteignable en
 *    quelques courses, III = signal fort de rôle), calé sur la RARETÉ du
 *    compteur badge correspondant (badges.ts) pour rester crédible :
 *      · Finisher (loopRuns)          5 / 25 / 100   — fermer une boucle est
 *        un acte rare et volontaire → I bas, III exigeant mais < secrets.
 *      · Scout (pioneerHexes)         10 / 50 / 150  — comme Defender : les
 *        découvertes s'accumulent par lot (badge Pioneer démarre à 10).
 *      · Route Maker (routes)         3 / 10 / 30    — une route ≥ 2 km est
 *        peu fréquente (badge Route Opened : 1/5/10/25/50) → paliers medians.
 *      · Conqueror (hexesCaptured)    100 / 500 / 1 500 — capturer est l'acte
 *        le plus courant (badge Zone Hunter : 100/500/1000…) → gros volumes.
 *      · Strategist (offensivesJoined) 1 / 5 / 15     — participer au War Room
 *        est occasionnel (badge Raid Leader : 1/5/10/25) → paliers bas.
 *      · Supporter (crewContributions) 5 / 25 / 100   — soutien régulier au
 *        crew (badge Crew Member : 1/5/25/100…) ; AUCUN pouvoir territorial.
 *      · Streak Runner (weeksActive)  4 / 12 / 26     — 1 mois / 1 trimestre /
 *        6 mois de régularité (badge Consistency : 2/4/8/12/24/52).
 * Toutes les bornes sont STRICTEMENT croissantes et vérifiées en test.
 */
export const SKILLS: readonly SkillDef[] = [
  family(
    'defender',
    'Défenseur',
    'Tient les frontières — recommandé pour défendre une zone fragile.',
    'defends',
    'skill_defender',
    ['Défendre des zones', 'Couvrir des frontières', 'Courir sur des zones fragiles'],
    [10, 50, 150],
    req('zones défendues'),
  ),
  family(
    'finisher',
    'Finisseur',
    'Ferme les boucles — recommandé pour terminer une boucle ouverte.',
    'loopRuns',
    'skill_finisher',
    ['Terminer des boucles', 'Fermer des boucles crew', 'Compléter un segment manquant'],
    [5, 25, 100],
    req('boucles fermées'),
  ),
  family(
    'scout',
    'Éclaireur',
    'Repère le terrain — recommandé pour explorer un secteur inconnu.',
    'pioneerHexes',
    'skill_scout',
    ['Découvrir des zones vierges', 'Ouvrir de nouveaux terrains', 'Repérer des zones faibles'],
    [10, 50, 150],
    req('zones découvertes'),
  ),
  family(
    'route_maker',
    'Traceur',
    'Trace les itinéraires — recommandé pour relier deux secteurs.',
    'routes',
    'skill_route_maker',
    ['Ouvrir des routes', 'Relier des secteurs', 'Valider des itinéraires crew'],
    [3, 10, 30],
    req('routes ouvertes'),
  ),
  family(
    'conqueror',
    'Conquérant',
    'Prend du terrain — recommandé pour une conquête ou une reprise.',
    'hexesCaptured',
    'skill_conqueror',
    ['Capturer des zones', 'Prendre des secteurs', 'Reprendre des zones rival'],
    [100, 500, 1_500],
    req('zones capturées'),
  ),
  family(
    'strategist',
    'Stratège',
    'Pense le plan — recommandé pour mener une mission de crew.',
    'offensivesJoined',
    'skill_strategist',
    ['Rejoindre des offensives', 'Suivre les plans du War Room', 'Participer aux missions'],
    [1, 5, 15],
    req('offensives menées'),
  ),
  family(
    'supporter',
    'Soutien',
    'Soutient le crew — aucun pouvoir territorial, tout en entraide.',
    'crewContributions',
    'skill_supporter',
    ['Contribuer au crew', 'Offrir des boosts et coffres', 'Aider les coéquipiers'],
    [5, 25, 100],
    req('contributions au crew'),
  ),
  family(
    'streak_runner',
    'Régulier',
    'Court régulièrement — recommandé pour maintenir la cadence du crew.',
    'weeksActive',
    'skill_streak_runner',
    ['Courir chaque semaine', 'Enchaîner des semaines complètes', 'Tenir ses objectifs perso'],
    [4, 12, 26],
    req('semaines actives'),
  ),
];

/** Accès direct par id (affichage Profil / reco War Room). */
export const SKILLS_BY_ID: ReadonlyMap<SkillFamilyId, SkillDef> = new Map(
  SKILLS.map((s) => [s.id, s]),
);

/** Nombre de familles de skills (compteur x/N d'écran). */
export const SKILL_COUNT = SKILLS.length;

/**
 * Icône d'une famille de skill par id. Miroir de `SkillDef.icon`, utilitaire
 * pour l'UI qui n'a que l'id sous la main. Toutes ces icônes existent dans
 * icons.ts (réutilisées au max ; skill_* = alias explicites).
 */
export function skillIconName(id: SkillFamilyId): string {
  return SKILLS_BY_ID.get(id)?.icon ?? 'skill_conqueror';
}
