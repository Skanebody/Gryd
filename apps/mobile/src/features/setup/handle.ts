/**
 * GRYD — E08 « Création du profil minimal » (`/setup/profile`) : TOUTE la logique
 * de décision de l'écran, PURE.
 *
 * Zéro import React, zéro import Supabase, zéro accès disque : ce fichier est
 * exécutable et vérifiable en Deno (`handle.test.ts`). C'est délibéré — les
 * règles qui décident si un @handle est recevable, ce qu'on propose en
 * repêchage, ce que l'écran a le droit d'AFFIRMER et ce qu'il envoie à
 * l'analytique sont exactement les endroits où une erreur devient un mensonge
 * produit. Elles ne doivent donc pas être noyées dans du JSX.
 *
 * ═══ CE QUE CE MODULE N'A PAS LE DROIT DE FAIRE ═════════════════════════════
 *
 *  1. DÉCIDER D'UNE DISPONIBILITÉ. Aucune fonction ici ne répond « ce handle est
 *     libre ». Le seul juge est le serveur : la RPC `check_handle_available`
 *     (migration 0047) pour le CONFORT d'écriture, et surtout le
 *     `unique` + `check (handle ~ '^[a-z0-9_]{3,20}$')` de `user_profiles`
 *     (migration 0011:45) à l'écriture. Ce qui est calculé ici est le FORMAT
 *     (une propriété du texte, connue sans réseau) et des CANDIDATS (des chaînes
 *     à soumettre, pas des promesses).
 *
 *  2. REDÉFINIR LA RÈGLE. `HANDLE_REGEX` (game-rules.ts:1514) est le miroir
 *     exact du `check` SQL et reste LE juge de format. `handleFormatIssue` ne le
 *     contourne pas : elle DÉCOMPOSE son échec en un motif nommé pour pouvoir
 *     dire au joueur CE QUI cloche, et un test verrouille l'accord des deux sur
 *     un corpus (`handle.test.ts`). Les longueurs et le jeu de caractères
 *     viennent de `HANDLE_MIN_LENGTH` / `HANDLE_MAX_LENGTH` /
 *     `HANDLE_ALLOWED_CHAR_REGEX` — aucun littéral de règle n'est réécrit ici.
 *
 *  3. INVENTER UN MOTIF. Les motifs de refus sont le contrat FIGÉ de la RPC 0047
 *     (`too_short | too_long | bad_chars | reserved | taken`). On n'en ajoute
 *     pas côté client : un motif que le serveur ne connaît pas serait une règle
 *     que personne n'applique.
 */
import {
  HANDLE_ALLOWED_CHAR_REGEX,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  HANDLE_REGEX,
} from '@klaim/shared';

// ═══════════════════════════════════════════════════════════════════════════
// 1. LE CONTRAT DE VERDICT (miroir de la RPC 0047)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Motifs de refus renvoyés par `check_handle_available` — contrat FIGÉ, miroir
 * du SQL (0047 §3). Structurellement identique à `HandleRefusal` de
 * `features/social/handleCheck.ts` : les deux décrivent LE MÊME contrat serveur.
 *
 * Pourquoi une seconde déclaration plutôt qu'un import ? `handleCheck.ts`
 * importe React et le client Supabase ; l'importer ici rendrait ce module —
 * et donc ses tests — non exécutables en Deno. Le type vit donc du côté PUR,
 * et l'assignabilité structurelle fait le reste (l'écran passe le `HandleCheck`
 * du hook à ces fonctions sans conversion, et le typecheck le vérifie).
 */
export type HandleRefusalReason =
  | 'too_short'
  | 'too_long'
  | 'bad_chars'
  | 'reserved'
  | 'taken';

/**
 * Les motifs que le CLIENT peut constater seul, sans réseau : ils ne portent que
 * sur la forme du texte tapé. `reserved` et `taken` en sont ABSENTS, et c'est
 * tout le sujet — ce sont des faits d'état du monde, pas des propriétés d'une
 * chaîne de caractères.
 */
export type HandleFormatIssue = Extract<
  HandleRefusalReason,
  'too_short' | 'too_long' | 'bad_chars'
>;

/**
 * Ce que l'écran SAIT de la disponibilité, à un instant donné. LES QUATRE ÉTATS
 * demandés par la spec E08 y sont DISTINCTS et le restent — plus un cinquième
 * que la constitution impose :
 *
 *   · `idle`     — pas encore saisi. On n'a rien demandé, on n'affirme rien.
 *   · `checking` — vérification EN COURS. Ce n'est PAS « libre ». Un chargement
 *                  n'affirme rien sur le joueur (constitution §1).
 *   · `free`     — le serveur a dit « disponible » À CET INSTANT. Ce n'est pas
 *                  une réservation : deux joueurs peuvent l'entendre à la même
 *                  seconde, et c'est l'écriture qui tranchera.
 *   · `refused`  — le serveur refuse, avec un motif exploitable (`taken` = pris).
 *   · `unknown`  — hors ligne / sans session / réponse illisible. On ne SAIT pas,
 *                  donc on ne dit rien — ni « libre », ni « pris ».
 *
 * Structurellement identique à `HandleCheck` (handleCheck.ts) — voir ci-dessus.
 */
export type HandleAvailability =
  | { readonly state: 'idle' }
  | { readonly state: 'checking' }
  | { readonly state: 'free' }
  | { readonly state: 'refused'; readonly reason: HandleRefusalReason }
  | { readonly state: 'unknown' };

// ═══════════════════════════════════════════════════════════════════════════
// 2. SAISIE ET FORMAT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * FILTRE DE SAISIE : ce que le champ accepte réellement de retenir.
 *
 * On écarte la frappe interdite au lieu de la laisser entrer puis de gronder —
 * un caractère qu'on ne veut pas ne doit pas apparaître à l'écran une seconde
 * pour disparaître ensuite. Trois gestes, dans cet ordre :
 *   1. minuscules (le `check` SQL n'admet que ça — « KORO » et « koro » ne
 *      peuvent pas coexister, la RPC `lower()` de toute façon) ;
 *   2. on ne garde que `HANDLE_ALLOWED_CHAR_REGEX` (a-z 0-9 _) ;
 *   3. on borne à `HANDLE_MAX_LENGTH`.
 *
 * ⚠️ Le résultat n'est PAS garanti valide : une chaîne vide ou trop courte en
 * sort telle quelle. Le filtre borne ce qu'on peut TAPER, `handleFormatIssue`
 * dit ce qui est RECEVABLE. Les confondre ferait taire le message « {n}
 * caractères minimum » que la spec demande d'afficher.
 */
export function normalizeHandleInput(raw: string): string {
  const lowered = raw.toLowerCase();
  let kept = '';
  for (const char of lowered) {
    // Test caractère par caractère : la regex de game-rules n'est PAS ancrée,
    // précisément pour cet usage. Pas de `/g` (le `lastIndex` d'une regex
    // globale partagée au niveau module rendrait ce filtre non déterministe).
    if (HANDLE_ALLOWED_CHAR_REGEX.test(char)) kept += char;
    if (kept.length === HANDLE_MAX_LENGTH) break;
  }
  return kept;
}

/**
 * Le motif de refus de FORMAT, ou `null` si la forme est bonne.
 *
 * Ordre volontaire — longueur AVANT alphabet : quelqu'un qui a tapé deux
 * caractères doit lire « il en faut {n} », pas un reproche sur des caractères
 * qu'il n'a pas encore eu l'occasion de mal taper.
 *
 * ⚠️ CE N'EST PAS UN VERDICT DE DISPONIBILITÉ. Un `null` ici veut dire « cette
 * chaîne a la bonne forme », rien de plus. Elle peut être réservée, déjà prise,
 * ou perdue à la seconde près face à un autre joueur.
 */
export function handleFormatIssue(handle: string): HandleFormatIssue | null {
  if (handle.length < HANDLE_MIN_LENGTH) return 'too_short';
  if (handle.length > HANDLE_MAX_LENGTH) return 'too_long';
  if (!HANDLE_REGEX.test(handle)) return 'bad_chars';
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. SUGGESTIONS — DES CANDIDATS, PAS DES PROMESSES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Combien de candidats on accepte de SOUMETTRE au serveur pour remplir la
 * rangée de repêchage.
 *
 * Ce n'est PAS une constante de jeu (elle ne décide d'aucun point, d'aucune
 * capture, d'aucun classement) : c'est un BUDGET DE REQUÊTES, propre à cet
 * écran — même arbitrage que `CITY_DEDUP_RADIUS_KM` (features/city/catalog.ts),
 * qui vit lui aussi près de son usage et non dans `game-rules.ts`.
 *
 * Ce qu'il borne : `HANDLE_SUGGESTION_COUNT` pills à afficher, mais certaines
 * propositions peuvent elles-mêmes être prises. On teste donc plus large que le
 * besoin, et on s'arrête — sans ce plafond, un préfixe très demandé ferait
 * défiler la RPC indéfiniment pour un CONFORT (les suggestions ne sont qu'un
 * dépannage : le joueur peut toujours taper autre chose).
 */
export const HANDLE_SUGGESTION_PROBE_MAX = 9;

/**
 * Base propre d'où dériver des candidats.
 *
 * Les `_` de fin sont retirés : `koro_` produirait sinon `koro__2`, deux
 * underscores collés qu'aucun humain ne tape volontairement. Si l'élagage
 * ramène la base sous `HANDLE_MIN_LENGTH` (cas réel : le handle `___`, valide
 * en base), on GARDE l'original — mieux vaut un candidat un peu laid qu'aucun
 * candidat.
 */
function suggestionBase(handle: string): string {
  const trimmed = handle.replace(/_+$/, '');
  return trimmed.length >= HANDLE_MIN_LENGTH ? trimmed : handle;
}

/**
 * CANDIDATS de repêchage, déterministes, dérivés du handle que le joueur a
 * lui-même tapé.
 *
 * ─── CE QUE CETTE FONCTION RETOURNE, ET CE QU'ELLE NE RETOURNE PAS ──────────
 * Elle retourne des CHAÎNES À SOUMETTRE. Elle ne sait pas, et ne peut pas
 * savoir, lesquelles sont libres — c'est l'écran qui les passe une à une à
 * `check_handle_available` et n'affiche QUE celles que le serveur a confirmées.
 * Fabriquer la disponibilité ici serait exactement la donnée inventée que la
 * charte interdit : une pill « libre » que personne n'a vérifiée.
 *
 * ─── POURQUOI DES CHIFFRES, ET RIEN D'AUTRE ─────────────────────────────────
 * Pas de `real_`, pas de `_official`, pas de `_pro`, pas de `_run` :
 *   · les deux premiers SUGGÈRENT UN STATUT que la personne n'a pas — c'est la
 *     famille de handles que la migration 0047 réserve explicitement
 *     (`reason = 'misleading'`), on n'allait pas la proposer nous-mêmes ;
 *   · `_run` enfermerait dans une discipline alors que le vélo est une lentille
 *     de première classe (planche E14) — et E09 n'a même pas encore été posée
 *     quand E08 propose ces pills.
 * Le suffixe numérique, lui, ne dit rien d'autre que « quelqu'un porte déjà ce
 * nom ». On alterne `{base}{n}` et `{base}_{n}` pour offrir les deux graphies
 * usuelles au lieu d'imposer la nôtre.
 *
 * La numérotation part de 2 : si `koro` est pris, `koro2` se lit « le deuxième
 * koro ». `koro1` laisserait penser qu'il existe un `koro1` quelque part alors
 * que le premier s'appelle `koro` tout court.
 *
 * Base trop longue ? On la tronque pour que le candidat tienne dans
 * `HANDLE_MAX_LENGTH` — un candidat trop long serait refusé par le serveur, donc
 * une pill qui échoue à coup sûr (un bouton mort, §A4).
 *
 * @param handle base saisie par le joueur (déjà passée par `normalizeHandleInput`)
 * @param count  combien de candidats produire (l'appelant borne son budget)
 */
export function handleSuggestionCandidates(handle: string, count: number): readonly string[] {
  // Une base à la forme cassée ne produit rien : on n'a aucune raison de
  // proposer des variantes de quelque chose que le serveur refuserait de toute
  // façon, et l'écran a déjà un message précis pour ce cas.
  if (count <= 0 || handleFormatIssue(handle) !== null) return [];

  const base = suggestionBase(handle);
  const out: string[] = [];
  const seen = new Set<string>([handle]);

  for (let n = 2; out.length < count; n++) {
    for (const suffix of [`${n}`, `_${n}`]) {
      const room = HANDLE_MAX_LENGTH - suffix.length;
      const candidate = `${base.slice(0, room)}${suffix}`;
      if (seen.has(candidate)) continue;
      // Ceinture ET bretelles : une troncature ne doit jamais accoucher d'un
      // candidat que le `check` SQL refuserait (base vide, longueur limite).
      if (handleFormatIssue(candidate) !== null) continue;
      seen.add(candidate);
      out.push(candidate);
      if (out.length === count) break;
    }
    // Garde-fou d'arrêt : `n` grandit, le suffixe s'allonge, la base rétrécit —
    // au-delà, deux itérations produiraient les mêmes chaînes tronquées et la
    // boucle tournerait sans rien ajouter.
    if (n > count * 2 + 2) break;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. CE QUE LE CTA A LE DROIT DE FAIRE
// ═══════════════════════════════════════════════════════════════════════════

/** Le brouillon de profil que E08 collecte. Trois champs, pas un de plus. */
export interface ProfileDraft {
  readonly displayName: string;
  readonly handle: string;
  /** Identifiant de la ville CHOISIE (`paris`/`lille` ou geonameid). Vide = aucune. */
  readonly cityId: string;
}

/**
 * Ce qui empêche d'enregistrer. `null` = le CTA est actionnable.
 *
 * ─── LA LIGNE DE PARTAGE, ET POURQUOI ELLE EST LÀ ───────────────────────────
 * BLOQUE : les champs manquants, le format cassé, et un refus SERVEUR CONNU
 * (`taken` / `reserved`). Peindre un CTA chartreuse qui part se faire refuser
 * par une contrainte dont on connaît déjà le verdict, c'est un bouton mort
 * (constitution §2) — a fortiori l'unique CTA de l'écran (§A4).
 *
 * NE BLOQUE PAS : `checking` et `unknown`. Une vérification en vol ne doit pas
 * geler le formulaire (règle 2 de handleCheck.ts), et une app hors ligne ne doit
 * pas retenir quelqu'un sur un écran d'inscription : on tente, et c'est le
 * serveur qui tranche — sa réponse est de toute façon la seule qui compte.
 * Ce choix a un prix ASSUMÉ : l'enregistrement peut échouer et l'écran doit
 * savoir le dire (`saveFailureKind` ci-dessous), saisie préservée.
 */
export type ProfileDraftBlock =
  | 'name_required'
  | 'handle_required'
  | 'city_required'
  | HandleFormatIssue
  | 'handle_taken'
  | 'handle_reserved';

export function profileDraftBlock(
  draft: ProfileDraft,
  availability: HandleAvailability,
): ProfileDraftBlock | null {
  if (draft.displayName.trim().length === 0) return 'name_required';
  if (draft.handle.length === 0) return 'handle_required';

  const format = handleFormatIssue(draft.handle);
  if (format !== null) return format;

  if (draft.cityId.length === 0) return 'city_required';

  if (availability.state === 'refused') {
    if (availability.reason === 'taken') return 'handle_taken';
    if (availability.reason === 'reserved') return 'handle_reserved';
    // Un refus de FORMAT venu du serveur ne peut pas contredire le nôtre (même
    // regex des deux côtés) ; s'il arrivait quand même, on le rend tel quel
    // plutôt que de l'ignorer — le serveur a toujours le dernier mot.
    return availability.reason;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. ÉCHECS D'ENREGISTREMENT — NOMMER CE QUI S'EST PASSÉ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ce qu'on a le droit de conclure d'un échec d'écriture sur `user_profiles`.
 *  · `handle_taken` — la course a été perdue sur le `unique` de 0011 (SQLSTATE
 *    23505). C'est le SEUL cas où l'on peut nommer la cause au joueur.
 *  · `network`      — la requête n'est jamais arrivée. Réessayer a du sens.
 *  · `unknown`      — on ne sait pas. On le dit, et on garde la saisie.
 */
export type SaveFailureKind = 'handle_taken' | 'network' | 'unknown';

/** SQLSTATE d'une violation de contrainte d'unicité (Postgres). */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Traduit une erreur d'écriture en fait nommable. PURE : on lui passe la forme
 * minimale d'une `PostgrestError` (ou d'une `TypeError` de `fetch`), pas le
 * client.
 *
 * ⚠️ ON NE DEVINE PAS. Tout ce qui n'est ni un 23505 ni une panne de transport
 * reconnue tombe en `unknown` — et l'écran dira « l'enregistrement a échoué »,
 * pas une cause inventée. Un diagnostic faux coûte plus cher qu'un « je ne sais
 * pas » : il envoie le joueur changer un handle qui n'était pas le problème.
 */
export function saveFailureKind(error: unknown): SaveFailureKind {
  if (typeof error !== 'object' || error === null) return 'unknown';
  const e = error as { code?: unknown; message?: unknown };

  if (e.code === PG_UNIQUE_VIOLATION) return 'handle_taken';

  const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  // Les deux formes que `fetch` produit réellement quand le réseau tombe
  // (RN Android/iOS et navigateurs). On ne cherche PAS plus loin : une liste de
  // sous-chaînes trop bavarde finirait par classer « network » une erreur
  // serveur qui contient le mot par hasard.
  if (message.includes('network request failed') || message.includes('failed to fetch')) {
    return 'network';
  }
  return 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. ANALYTIQUE — DES CLÉS FERMÉES, JAMAIS DE PII
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Valeur de `result` pour l'event `setup_handle_checked` (events.ts:155), ou
 * `null` quand il n'y a RIEN à rapporter.
 *
 * `idle` et `checking` rendent `null` : ce sont des non-verdicts. Les compter
 * gonflerait le dénominateur d'un KPI qui mesure « combien abandonnent au
 * handle, et pour quel motif » avec des instants où le serveur n'a rien dit.
 *
 * ⚠️ Le @handle lui-même ne sort JAMAIS d'ici — seulement le verdict.
 */
export function handleCheckResult(availability: HandleAvailability): string | null {
  switch (availability.state) {
    case 'free':
      return 'free';
    case 'refused':
      return availability.reason;
    case 'unknown':
      return 'unknown';
    default:
      return null;
  }
}

/**
 * Valeur de `city_source` pour `setup_profile_completed` (events.ts:164) : le
 * KPI de « ville issue de la localisation, mais MODIFIABLE ».
 *
 * `location` seulement si la ville enregistrée est EXACTEMENT celle que la
 * position avait proposée. Dès qu'elle diffère — ou qu'aucune n'avait été
 * proposée — c'est un choix humain, donc `manual`. Aucun nom de ville ne part.
 */
export function citySource(detectedCityId: string | null, chosenCityId: string): 'location' | 'manual' {
  return detectedCityId !== null && detectedCityId === chosenCityId ? 'location' : 'manual';
}
