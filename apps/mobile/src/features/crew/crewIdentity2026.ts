/**
 * GRYD — L'IDENTITÉ D'UN CREW, DITE SANS INVENTER. Module PUR (zéro React,
 * zéro réseau) : testable sous Deno.
 *
 * ─── LE DÉFAUT QU'IL CORRIGE (11/09/2026, LOT K) ────────────────────────────
 * Retour fondateur : « Une fois que l'on est dans un crew, qu'est-ce qu'il se
 * passe ? » L'audit `docs/product/GRYD_VIE_DE_CREW_2026_09.md` a trouvé, entre
 * autres, ceci : la page de son PROPRE crew en disait MOINS que la fiche
 * publique du crew d'à côté. `crew_public_profile` (0152 §3) rend la ville et
 * le mode d'accueil à qui n'est pas encore entré ; `crew_overview` ne les
 * rendait pas. On perdait deux faits en adhérant.
 *
 * La migration 0182 les ajoute. Ce module décide ce qu'on en AFFICHE — et
 * surtout ce qu'on n'affiche pas.
 *
 * ─── LA RÈGLE, ET ELLE EST TOUTE LA VALEUR DE CE FICHIER ────────────────────
 * UN STATUT INCONNU NE DEVIENT JAMAIS « OUVERT ». `crews.recruitment_status`
 * est un vocabulaire SERVEUR (0097 : `open` · `on_request` · `invite_only`) et
 * la base reste souveraine dessus. Un build plus vieux que la base lira un jour
 * un quatrième statut ; le replier sur « Ouvert à tous » ferait dire à l'app
 * que n'importe qui peut entrer dans un crew qui, peut-être, s'est fermé.
 * `null` = « je ne sais pas nommer cet accueil », et l'écran ne peint alors
 * rien du tout — L8/L14.
 *
 * Même règle pour la VILLE : `cityName` est `null` quand `city_zones` ne
 * connaît pas cet identifiant. On ne peint pas `rouen-sud-2` en guise de nom de
 * ville : un identifiant technique n'est pas un lieu.
 */

/** Le vocabulaire d'accueil de 0097, tel que le serveur l'écrit. */
export const CREW_ACCESS_2026 = ['open', 'on_request', 'invite_only'] as const;
export type CrewAccess2026 = (typeof CREW_ACCESS_2026)[number];

export function isCrewAccess2026(value: unknown): value is CrewAccess2026 {
  return typeof value === 'string' && (CREW_ACCESS_2026 as readonly string[]).includes(value);
}

/**
 * L'accueil, en une paire de mots. `null` quand on ne sait pas — jamais un
 * repli. Le libellé décrit ce qui se PASSE pour quelqu'un qui arrive, pas un
 * réglage d'administration : « Sur demande » plutôt que « Recrutement modéré ».
 */
export function crewAccessLabel2026(value: unknown, fr: boolean): string | null {
  if (!isCrewAccess2026(value)) return null;
  if (value === 'open') return fr ? 'Ouvert à tous' : 'Open to all';
  if (value === 'on_request') return fr ? 'Sur demande' : 'On request';
  return fr ? 'Sur invitation' : 'Invite only';
}

/**
 * LA LIGNE D'IDENTITÉ sous le nom du crew : ville et accueil, séparés par un
 * point médian, dans cet ordre. `null` quand NI l'un NI l'autre n'est connu —
 * une ligne vide sous un nom ressemble à une donnée manquante, une ligne
 * absente ne ressemble à rien.
 *
 * Le point médian « · » et non un tiret : le français de l'app n'écrit pas de
 * tiret long (`src/i18n/noDashFr2026.test.ts`).
 */
export function crewIdentityLine2026(input: {
  cityName: string | null;
  access: unknown;
}, fr: boolean): string | null {
  const parts = [input.cityName, crewAccessLabel2026(input.access, fr)]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * CE QUE LE CREW TIENT, tel que `crew_overview.territory` le rend (0152).
 *
 * ⚠️ LE PIÈGE, ET IL EST LA RAISON D'ÊTRE DE CETTE FONCTION. On parle ici de
 * PERSONNES, jamais d'une emprise. 0118 a gelé `hex_claims` / `territories`,
 * 0126 a posé que le titre territorial est INDIVIDUEL, et 0152 a retiré
 * `hexesHeld` / `cityRank` / `contributionPct` pour cette raison exacte. Un
 * crew n'a ni surface ni rang : additionner les possessions de ses membres
 * fabriquerait un second titre qui n'existe pas.
 *
 * Les quatre états sont DISTINCTS et le type les rend impossibles à confondre.
 * `'empty'` (« personne ne tient encore de terrain ») est un fait sur le
 * MONDE ; `'unavailable'` est un fait sur la LECTURE. Les fondre ferait dire à
 * un timeout que le crew n'a rien fait.
 */
export type CrewTerrainState2026 =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'empty' }
  | { kind: 'held'; membersHolding: number; holdsRun: boolean; holdsBike: boolean; lastCaptureAt: string | null };

export function crewTerrainState2026(input: {
  loading: boolean;
  failed: boolean;
  territory: { membersHolding: number; holdsRun: boolean; holdsBike: boolean; lastCaptureAt: string | null } | null;
}): CrewTerrainState2026 {
  if (input.loading) return { kind: 'loading' };
  // `failed` d'abord : un agrégat NON LU vaut `null`, exactement comme un crew
  // sans terrain. Sans cette porte, un échec de lecture s'afficherait
  // « personne ne tient de terrain » — une affirmation sur les membres du crew,
  // produite par une panne de réseau.
  if (input.failed || !input.territory) return { kind: 'unavailable' };
  const t = input.territory;
  if (t.membersHolding <= 0) return { kind: 'empty' };
  return {
    kind: 'held',
    membersHolding: t.membersHolding,
    holdsRun: t.holdsRun,
    holdsBike: t.holdsBike,
    lastCaptureAt: t.lastCaptureAt,
  };
}

/**
 * Les disciplines RÉELLEMENT pratiquées, en clair. Deux booléens, jamais une
 * somme : « course et vélo » n'est pas « deux terrains ».
 * `null` quand le serveur ne dit ni l'un ni l'autre — on se tait plutôt que
 * d'écrire « aucune discipline », qui serait faux d'un crew qui tient du
 * terrain.
 */
export function crewDisciplinesLabel2026(input: { holdsRun: boolean; holdsBike: boolean }, fr: boolean): string | null {
  if (input.holdsRun && input.holdsBike) return fr ? 'Course et vélo' : 'Running and cycling';
  if (input.holdsRun) return fr ? 'Course' : 'Running';
  if (input.holdsBike) return fr ? 'Vélo' : 'Cycling';
  return null;
}
