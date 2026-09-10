/**
 * GRYD — LA COUTURE DU @PSEUDO : ce que les ÉCRANS reprennent de ce que la
 * règle a posé (LOT H, 10/09/2026).
 *
 * ═══ POURQUOI CE FICHIER ════════════════════════════════════════════════════
 * Même raison que `features/journal/couture.test.ts` : `handleStatus2026` est
 * testé phrase par phrase, la migration 0175 est testée règle par règle, et
 * aucun de ces deux tests ne verrait un écran qui, tout simplement, ne les
 * monte pas. Ce filet lit le SOURCE des écrans. Il attrape une FORME, pas une
 * intention : il ne remplace ni la relecture, ni `ux-gate`.
 *
 * ═══ ÉTAPE 0 — les défauts existaient, tous les trois ═══════════════════════
 *  · /profil-edit traitait le pseudo comme un champ libre de 20 caractères,
 *    dans la MÊME boucle que « Nom affiché » et « Bio » : aucune règle
 *    affichée, aucun décompte, aucune réservation lisible. La cadence ne
 *    pouvait s'apprendre qu'en se faisant refuser ;
 *  · l'enregistrement passait par `save_my_social_profile_2026` seul, qui ne
 *    sait nommer un refus que par une exception SANS DATE (« handle_held »
 *    tout court) : impossible d'écrire au joueur jusqu'à quand attendre ;
 *  · l'onglet Profil n'affichait le @pseudo NULLE PART, alors que c'est
 *    l'adresse que ses amis cherchent dans /amis. Le nom, la ville et le titre
 *    y étaient ; l'identifiant, non.
 */

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFileSync(chemin: string | URL): string;
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function lire(chemin: string): string {
  return Deno.readTextFileSync(new URL(chemin, import.meta.url));
}

/** Le code hors commentaires : citer un défaut dans un commentaire le recrée. */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((ligne) => !ligne.trim().startsWith('//') && !ligne.trim().startsWith('*'))
    .join('\n');
}

const EDIT = '../../../app/profil-edit.tsx';
const PROFIL = '../refonte/ProfileHomeScreen.tsx';
const MEMBRE = '../../../app/member.tsx';
const AMIS = '../../../app/amis.tsx';
const REGLE = './handleStatus2026.ts';
const LECTURE = './handleStatus2026Data.ts';

Deno.test('/profil-edit dit la règle AVANT de la faire subir', () => {
  const source = codeSeul(lire(EDIT));
  assert(source.includes('handleRuleSentence2026'), 'la phrase de règle n’est pas montée');
  assert(source.includes('handleCreditSentence2026'), 'le décompte des changements n’est pas monté');
  // La règle ne se recopie pas dans l'écran : elle vient de game-rules (repli)
  // ou du serveur. Un « 2 » ou un « 14 » écrit ici divergerait le jour où le
  // fondateur change d'avis.
  assert(source.includes('HANDLE_CHANGES_PER_WINDOW'), 'le plafond est codé en dur dans l’écran');
  assert(source.includes('HANDLE_CHANGE_WINDOW_DAYS'), 'la fenêtre est codée en dur dans l’écran');
  assert(source.includes('HANDLE_HOLD_DAYS'), 'la durée de réservation est codée en dur dans l’écran');
});

Deno.test('/profil-edit passe par change_my_handle_2026 quand le pseudo change', () => {
  const source = codeSeul(lire(EDIT));
  assert(source.includes("'change_my_handle_2026'"), 'la RPC de renommage n’est pas appelée');
  assert(source.includes('parseHandleChange2026'), 'la réponse de la RPC n’est pas lue');
  assert(source.includes('handleRefusalMessage2026'), 'les refus ne sont pas nommés');
  // Le reste du profil continue par sa propre RPC : deux portes, deux objets.
  assert(source.includes('account.save('), 'le reste du profil ne s’enregistre plus');
  // L'appel n'a lieu QUE si le pseudo a bougé : sinon chaque « Enregistrer »
  // d'une bio irait déranger la règle de renommage pour rien.
  assert(
    /!==\s*account\.editable\.handle/.test(source),
    'la RPC de renommage part même quand le pseudo n’a pas changé',
  );
});

Deno.test('/profil-edit peint les QUATRE états de lecture, sans repli inventé', () => {
  const source = codeSeul(lire(EDIT));
  for (const etat of ["==='loading'", "==='failed'", "==='signedOut'"]) {
    assert(source.includes(etat), `état ${etat} non peint dans /profil-edit`);
  }
  // « Réessayer » n'existe que parce que l'échec est peint : sans lui, l'écran
  // laisserait un blanc que rien ne répare.
  assert(source.includes('state.reload'), 'l’échec de lecture n’offre aucun « Réessayer »');
});

Deno.test('« Reprendre @ancien » n’est peint que si le serveur nomme une réservation', () => {
  const source = codeSeul(lire(EDIT));
  assert(source.includes('status.reclaimable'), 'la reprise n’est pas montée');
  // Le bouton est CONDITIONNÉ. Un emplacement grisé ou un bouton toujours
  // présent serait le bouton mort que la constitution interdit.
  assert(
    /status\.reclaimable\s*&&/.test(source),
    'la reprise est peinte sans vérifier qu’il y a quelque chose à reprendre',
  );
});

Deno.test('le champ pseudo montre le @ et filtre la frappe', () => {
  const source = codeSeul(lire(EDIT));
  assert(source.includes('sanitizeHandle'), 'la frappe n’est pas filtrée par le module partagé');
  assert(source.includes('HANDLE_MAX_LENGTH'), 'la longueur du champ est un nombre magique');
  assert(source.includes('styles.at'), 'le « @ » n’est pas peint devant le champ');
  // MUTATION : le pseudo a QUITTÉ la boucle des champs libres. S'il y revenait,
  // il redeviendrait un texte de 20 caractères sans règle.
  assert(
    !/key:\s*'handle'/.test(source),
    'le pseudo est retombé dans la boucle des champs de texte libres',
  );
});

Deno.test('l’onglet Profil affiche le @pseudo sous le nom', () => {
  // ON TIENT LA CONDITION, PAS LE COMPOSANT. Le lot « cosmétiques » peint la
  // même ligne avec son propre rendu de nom (`CosmeticName2026`) : exiger ici
  // un `<Text>` littéral ferait échouer ce test à chaque changement d'habillage,
  // alors que ce qui compte est ailleurs. Pendant le chargement,
  // `profile.handle` retombe sur un repli dérivé de la session : l'afficher
  // comme « son @ » donnerait à ses amis une adresse introuvable.
  const ligne = codeSeul(lire(PROFIL))
    .split('\n')
    .find((l) => /!profileLoading\s*&&\s*profile\.handle/.test(l));
  assert(
    ligne !== undefined,
    'le @pseudo est absent du profil, ou peint avant d’être lu (repli affiché comme une adresse)',
  );
  assert(/@[$]?\{?\s*profile\.handle/.test(ligne ?? ''), 'la ligne ne peint pas le pseudo précédé de « @ » : ' + ligne);
});

Deno.test('le @pseudo reste visible là où on cherche quelqu’un', () => {
  // Ces deux écrans l'affichaient déjà avant ce lot : ce test le VERROUILLE,
  // il ne le revendique pas. Un pseudo qui disparaît de la recherche rendrait
  // la règle de réservation sans objet (on réserve une adresse qu'on montre).
  assert(lire(MEMBRE).includes('@{person.data.handle}'), '/member n’affiche plus le @pseudo');
  assert(lire(AMIS).includes('@{person.handle}'), '/amis n’affiche plus le @pseudo dans la recherche');
});

Deno.test('la règle reste PURE : rien de React ni de réseau dans son module', () => {
  // C'est ce qui rend `handleStatus2026.test.ts` possible : Deno type-vérifie
  // le graphe d'imports complet, et un seul import de React Native ferait
  // échouer la vérification avant le premier test.
  const source = lire(REGLE);
  for (const interdit of ['react', 'react-native', './social2026Data', '../../lib/supabase']) {
    assert(
      !new RegExp(`from '${interdit.replace(/[./]/g, '\\$&')}'`).test(source),
      `handleStatus2026.ts importe ${interdit} : ses tests deviennent impossibles`,
    );
  }
  // Et la lecture réseau, elle, appelle bien la RPC du serveur.
  assert(lire(LECTURE).includes("'my_handle_status_2026'"), 'l’état du pseudo n’est jamais lu');
});
