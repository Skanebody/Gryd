/**
 * GRYD — LA COUTURE DE LA GESTION DE CREW (LOT Q3, spec §4).
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * `crewRules2026.test.ts` et `crewBoard2026.test.ts` prouvent que les RÈGLES et
 * les LECTURES sont justes. Aucun des deux ne peut prouver qu'un écran les
 * appelle : c'est exactement l'angle mort qui a produit, côté serveur, le trou
 * ① de la spec (« le message de candidature n'a AUCUN chemin d'écriture » —
 * `crew_join_intent` insérait `(crew_id, user_id)` et rien d'autre, pendant que
 * `crew_join_requests` lisait fidèlement un `message` que personne n'écrivait).
 *
 * ÉTAPE 0, MESURÉE AU COMMIT 9d1b9e7 — chaque règle ci-dessous cite le défaut
 * qu'elle aurait attrapé :
 *   · AUCUN fichier `app/crew-gestion.tsx`, `app/crew-regles.tsx`,
 *     `app/crew-journal.tsx`, `app/crew-rejoindre.tsx`,
 *     `app/crew-ma-situation.tsx` n'existait : les quinze RPC de 0188-0190
 *     n'avaient AUCUN appelant mobile ;
 *   · `PlayerModerationSheet.tsx` appelait `removeMember` (0093), donc excluait
 *     SANS MOTIF et sans journal — le §6.7 ④ du serveur le dit noir sur blanc :
 *     « c'est le seul endroit du lot où la garantie *toute exclusion dit son
 *     motif* n'est pas encore tenue » ;
 *   · `CrewJoinRequests.tsx` peignait `r.pseudo` et deux liens, jamais
 *     `r.message` — le mot du candidat restait invisible même une fois écrit ;
 *   · `app/crew-public.tsx` n'affichait ni exigences ni charte, alors que le
 *     risque 3 de la spec (§5.3) pose que la vie privée du tableau de suivi ne
 *     tient QUE SI la fiche publique les affiche AVANT l'entrée ;
 *   · `app/crew-edit.tsx` écrivait « supprimer un crew n'existe pas côté
 *     serveur » — c'était vrai jusqu'à `crew_dissolve_2026` (0190).
 *
 * ─── CE QUE CES TESTS PEUVENT, ET CE QU'ILS NE PEUVENT PAS ──────────────────
 * Ils lisent la SOURCE et y cherchent des formes. Un filet grossier : il
 * n'attrape ni une hiérarchie visuelle, ni un rendu réel, et il ne remplace ni
 * la relecture ni le gate `ux-gate`. Il attrape ce qu'aucun typecheck ne voit :
 * une RPC livrée sans appelant, et un écran qui affirme là où il devrait dire
 * qu'il ne sait pas.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFileSync(chemin: string | URL): string;
};

/** Le code HORS commentaires — sinon citer un défaut dans un docblock le recrée. */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

function lire(chemin: string): string {
  const source = Deno.readTextFileSync(new URL(chemin, import.meta.url));
  // Un chemin faux rendrait toutes les règles vertes sans rien vérifier : c'est
  // le mode d'échec le plus banal de ce genre de test.
  assert(source.length > 500, `${chemin} : source trop courte, le chemin est faux`);
  return source;
}

const GESTION = '../../../../app/crew-gestion.tsx';
const REGLES = '../../../../app/crew-regles.tsx';
const JOURNAL = '../../../../app/crew-journal.tsx';
const REJOINDRE = '../../../../app/crew-rejoindre.tsx';
const SITUATION = '../../../../app/crew-ma-situation.tsx';
const PUBLIQUE = '../../../../app/crew-public.tsx';
const EDITION = '../../../../app/crew-edit.tsx';
const DECOUVERTE = '../../../../app/crew-discovery.tsx';
const FEUILLE = '../PlayerModerationSheet.tsx';
const DEMANDES = '../CrewJoinRequests.tsx';
const ACCUEIL = '../../refonte/CrewHomeScreen.tsx';
const DONNEES = './crewManagementData.ts';

// ═══════════════════════════════════════════════════════════════════════════
// ① LES QUINZE RPC ONT UN APPELANT, ET UN SEUL ENDROIT OÙ ELLES S'APPELLENT
//
// Une RPC livrée sans appelant est un serveur qui promet plus que l'app ne
// tient : c'est le miroir exact du trou ① de la spec, pris dans l'autre sens.
// ═══════════════════════════════════════════════════════════════════════════

const RPC_Q2: readonly string[] = [
  'crew_rules_get_2026',
  'crew_rules_set_2026',
  'crew_eligibility_2026',
  'crew_apply_2026',
  'crew_accept_charter_2026',
  'crew_member_board_2026',
  'crew_my_standing_2026',
  'crew_warn_member_2026',
  'crew_remove_member_2026',
  'crew_resolve_warning_2026',
  'crew_decisions_log_2026',
  'crew_invite_by_handle_2026',
  'crew_discovery_2026',
  'crew_dissolve_2026',
];

Deno.test('gestion : les quatorze RPC de joueur ont un appelant mobile', () => {
  const code = codeSeul(lire(DONNEES));
  for (const rpc of RPC_Q2) {
    assert(code.includes(`'${rpc}'`), `${rpc} n’a aucun appelant : la RPC est morte`);
  }
});

Deno.test('gestion : le câblage passe TOUJOURS par une RPC, jamais par une table', () => {
  const code = codeSeul(lire(DONNEES));
  // `crew_rules_2026`, `crew_warnings_2026`, `crew_kicks_2026` sont en RLS
  // « lecture par RPC seulement » (0188 §7). Une requête `.from()` sur elles
  // rendrait un tableau vide silencieux, que l'écran lirait « aucune règle ».
  assert(!/\.from\(\s*'crew_/.test(code), 'une table de crew est lue en direct');
});

// ═══════════════════════════════════════════════════════════════════════════
// ② L'EXCLUSION DIT SON MOTIF — UN SEUL CHEMIN, JOURNALISÉ
//
// ÉTAPE 0 (PlayerModerationSheet.tsx, 9d1b9e7) :
//     action.key === 'remove' ? await removeMember(crew.userId)
// `removeMember` appelle `crew_remove_member` (0093) : aucun motif, aucune
// ligne dans `crew_decisions_2026`, aucune notification à l'exclu.
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('exclusion : la feuille appelle la RPC À MOTIF, pas celle de 0093', () => {
  const code = codeSeul(lire(FEUILLE));
  assert(
    code.includes('removeMemberWithReason'),
    'la feuille n’exclut pas avec un motif : l’exclusion reste muette',
  );
  assert(
    !/\bawait removeMember\(/.test(code),
    'l’ancien chemin sans motif (crew_remove_member, 0093) est encore appelé',
  );
});

Deno.test('exclusion : le motif vient du catalogue FERMÉ de game-rules', () => {
  const code = codeSeul(lire(FEUILLE));
  assert(
    code.includes('CREW_KICK_REASONS'),
    'les motifs d’exclusion ne viennent pas de game-rules',
  );
  // `other` exige la note côté serveur (`note_required`) : l'écran doit le
  // savoir AVANT le tap, sinon le bouton part se faire refuser.
  assert(
    code.includes('CREW_KICK_REASON_REQUIRING_NOTE'),
    'la note obligatoire du motif « autre » n’est pas dérivée de game-rules',
  );
});

Deno.test('exclusion : l’aperçu du message reçu par la personne est montré', () => {
  const code = codeSeul(lire(FEUILLE));
  // §4.1 E : « l'aperçu exact du message que la personne recevra ». Décider
  // d'exclure sans voir ce que l'autre lira, c'est décider à l'aveugle.
  assert(code.includes('kickPreview'), 'le message reçu par l’exclu n’est pas montré');
});

Deno.test('avertir : la feuille propose l’avertissement, sous les mêmes bornes', () => {
  const code = codeSeul(lire(FEUILLE));
  assert(code.includes('warnMember'), 'la feuille ne permet pas d’avertir');
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ LE MOT DU CANDIDAT EST LU
//
// ÉTAPE 0 (CrewJoinRequests.tsx, 9d1b9e7) : le composant peignait `r.pseudo`
// et deux liens. `r.message` était parsé par `discoveryData.ts` et jeté.
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('demandes : le message du candidat est affiché', () => {
  const code = codeSeul(lire(DEMANDES));
  assert(code.includes('r.message'), 'le mot du candidat n’est toujours pas affiché');
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ LA FICHE PUBLIQUE MONTRE CE QUE LE CREW DEMANDE, AVANT L'ENTRÉE
//
// Risque 3 de la spec (§5.3) : la résolution de vie privée du tableau de suivi
// ne tient QUE SI la fiche publique affiche exigences ET règles avant l'entrée.
// « Écran de charte bâclé = consentement fictif. »
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('fiche publique : exigences et charte sont lues et peintes', () => {
  const code = codeSeul(lire(PUBLIQUE));
  assert(code.includes('useCrewRules'), 'la fiche publique ne lit pas crew_rules_get_2026');
  assert(code.includes('CrewRequirementsBlock'), 'les exigences ne sont pas peintes');
  assert(code.includes('CrewCharterBlock'), 'la charte n’est pas peinte');
});

Deno.test('fiche publique : « Demander à rejoindre » passe par l’écran d’éligibilité', () => {
  const code = codeSeul(lire(PUBLIQUE));
  assert(code.includes("'/crew-rejoindre'"), 'la demande ne passe plus par la vérification');
  // L'ancien chemin envoyait la demande SANS message, SANS charte et SANS
  // éligibilité : `crew_join_intent` ne sait rien faire de tout cela.
  assert(
    !code.includes('requestCrewJoin('),
    'l’ancien chemin (crew_join_intent, sans message ni charte) est encore appelé',
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ « IL TE MANQUE 2 KM » — JAMAIS « TU N'ES PAS ÉLIGIBLE » TOUT SEUL
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('rejoindre : l’écran dit ce qui manque ET de combien', () => {
  const code = codeSeul(lire(REJOINDRE));
  assert(code.includes('missingLine'), 'le manque n’est pas chiffré ligne par ligne');
  assert(code.includes('useCrewEligibility'), 'l’éligibilité n’est pas vérifiée avant l’envoi');
});

Deno.test('rejoindre : le quatrième état existe (vérification IMPOSSIBLE)', () => {
  const code = codeSeul(lire(REJOINDRE));
  // « on ne sait pas » n'est pas une réponse : §4.2 H exige que l'échec de
  // lecture ne se dise JAMAIS « tu n'es pas éligible ».
  assert(code.includes('eligibilityFailed'), 'l’échec de vérification est replié sur « non éligible »');
});

Deno.test('rejoindre : la charte se lit et s’accepte avant l’envoi', () => {
  const code = codeSeul(lire(REJOINDRE));
  assert(code.includes('charterAccepted'), 'la charte n’est pas acceptée avant l’envoi');
  assert(code.includes('p_charter_version') || code.includes('charterVersion'),
    'la version de charte ne voyage pas avec la demande');
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑥ LE TABLEAU DE SUIVI : QUATRE ÉTATS, ET « NON PARTAGÉ » N'EST NI 0 NI UN TIRET
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('gestion : les quatre états sont distincts', () => {
  const code = codeSeul(lire(GESTION));
  assert(code.includes('!session'), 'l’état « pas connecté » manque');
  assert(code.includes('failed'), 'l’état « échec » manque');
  assert(code.includes('loading'), 'l’état « en cours » manque');
  assert(code.includes('rows.length === 0'), 'l’état « vide » manque');
});

Deno.test('gestion : une mesure masquée passe par le formateur, jamais par un 0', () => {
  const code = codeSeul(lire(GESTION));
  assert(code.includes('measureText'), 'les mesures ne passent pas par le formateur commun');
  // `?? 0` sur une mesure transformerait « non partagé » en « n'a pas couru ».
  assert(!/distance28dKm\s*\?\?\s*0/.test(code), 'une mesure masquée est repliée sur 0');
});

Deno.test('gestion : tri et filtres viennent des catalogues FERMÉS de game-rules', () => {
  const code = codeSeul(lire(GESTION));
  assert(code.includes('CREW_BOARD_SORTS'), 'les tris ne viennent pas de game-rules');
  assert(code.includes('CREW_BOARD_FILTERS'), 'les filtres ne viennent pas de game-rules');
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑦ RÈGLES : LA CONSÉQUENCE EST DITE AVANT L'ARMEMENT
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('règles : l’écran montre combien de membres ne respecteraient pas le réglage', () => {
  const code = codeSeul(lire(REGLES));
  // §4.1 B : « Un capitaine doit voir la conséquence avant de l'armer, pas après. »
  assert(code.includes('enforcementImpact'), 'la conséquence d’un réglage n’est pas montrée');
});

Deno.test('règles : les trois blocs écrivent ENSEMBLE (une seule RPC, trois champs)', () => {
  const code = codeSeul(lire(REGLES));
  // `crew_rules_set_2026` écrit charte, exigences ET règles dans le même appel :
  // n'en envoyer qu'un remettrait les deux autres à `{}` en silence.
  assert(code.includes('rulesPayload'), 'la charge utile n’est pas construite d’un seul tenant');
  assert(code.includes('CrewCharterBlock') || code.includes('charterDraft'),
    'la charte n’est pas éditée sur le même écran que les règles');
});

Deno.test('règles : le retrait automatique est grisé tant que l’inactivité est éteinte', () => {
  const code = codeSeul(lire(REGLES));
  assert(code.includes('removalArmable'), 'le garde-fou ① n’est pas peint');
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑧ DISSOUDRE : DEUX TEMPS, ET LES TROIS REFUS NOMMÉS
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('dissolution : elle vit dans /crew-edit, en deux temps', () => {
  const code = codeSeul(lire(EDITION));
  assert(code.includes('dissolveCrew'), 'la dissolution n’a aucun appelant');
  assert(code.includes('dissolveStep'), 'la confirmation en deux temps manque');
});

Deno.test('dissolution : `active_challenge` affiche la DATE de clôture', () => {
  const code = codeSeul(lire(EDITION));
  // Un refus sans échéance serait un cul-de-sac : le capitaine ne saurait pas
  // quand réessayer.
  assert(code.includes('endsAt'), 'le refus « défi en cours » ne dit pas jusqu’à quand');
});

Deno.test('dissolution : les refus viennent de CREW_DISSOLVE_REFUSALS', () => {
  const code = codeSeul(lire(DONNEES));
  assert(code.includes('CREW_DISSOLVE_REFUSALS'), 'le vocabulaire de refus est réécrit à la main');
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑨ LES PORTES : chaque écran neuf est atteignable depuis l'arbre du crew
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('portes : l’accueil du crew mène à la gestion, aux règles et à ma situation', () => {
  const code = codeSeul(lire(ACCUEIL));
  assert(code.includes("'/crew-gestion'"), 'aucune porte vers le tableau de suivi');
  assert(code.includes("'/crew-ma-situation'"), 'aucune porte vers « ma situation »');
});

Deno.test('portes : la gestion mène au journal et aux règles', () => {
  const code = codeSeul(lire(GESTION));
  assert(code.includes("'/crew-journal'"), 'aucune porte vers le journal des décisions');
  assert(code.includes("'/crew-regles'"), 'aucune porte vers les règles');
});

Deno.test('portes : la gestion n’est peinte que pour qui peut exclure', () => {
  const code = codeSeul(lire(ACCUEIL));
  // `crew_member_board_2026` est gatée sur `CREW_PERMISSIONS.kick` : peindre la
  // porte pour un membre simple ferait un bouton mort (§A4).
  assert(
    code.includes('canManageCrew'),
    'la porte de gestion n’est pas dérivée de la permission réelle',
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑩ MA SITUATION : LE BLOC « À RISQUE » N'EXISTE QUE SI LE RETRAIT EST ARMÉ
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('ma situation : « à risque » est conditionné à atRisk, jamais peint à vide', () => {
  const code = codeSeul(lire(SITUATION));
  assert(code.includes('standing.atRisk'), 'le bloc « à risque » n’est pas conditionné');
  assert(code.includes('removalAtMs'), 'la date de retrait n’est pas affichée');
});

Deno.test('journal : chaque ligne dit qui a décidé, ou « automatique »', () => {
  const code = codeSeul(lire(JOURNAL));
  assert(code.includes('automatic'), 'le journal ne distingue pas le job d’un officier');
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑪ DÉCOUVERTE : LES FILTRES DE §2.7, DONT « JE SUIS ÉLIGIBLE »
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('découverte : le filtre « je suis éligible » existe et vient du serveur', () => {
  const code = codeSeul(lire(DECOUVERTE));
  assert(code.includes("'eligible'"), 'le filtre « je suis éligible » manque');
  // Le détail de ce qui manque n'appartient QU'À la fiche du crew : la
  // découverte ne rend qu'un booléen (§6.3).
  assert(!code.includes('missing'), 'la découverte expose le détail de ce qui manque');
});

Deno.test('découverte : un seul CTA chartreuse, et zéro compteur inventé', () => {
  const source = lire(DECOUVERTE);
  const primaires = codeSeul(source).split('variant="primary"').length - 1;
  assertEquals(primaires, 0, 'la découverte peint un second bouton primaire');
});
