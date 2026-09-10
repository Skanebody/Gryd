/**
 * GRYD — LA COUTURE DE L'ABONNEMENT : ce que les écrans reprennent aux modules.
 *
 * Même filet que `src/mvp/couture.test.ts` : on lit le SOURCE des écrans et on
 * y cherche les tournures qui ANNULENT une garde. Un `plan2026.ts` irréprochable
 * ne protège personne si l'écran écrit « 5,99 € » juste à côté, ou s'il peint
 * « S'abonner » hors de la capacité qui décide qu'on peut vendre.
 *
 * ─── ÉTAPE 0 — CHAQUE RÈGLE CITE LE CODE QU'ELLE AURAIT FAIT ROUGIR ────────
 *  · quatre blocs — `app/abonnement.tsx` du 09/09 n'avait ni « Ton statut », ni
 *    « Tes achats », ni « Gérer » : il ouvrait sur « GRYD+ » puis un état, et
 *    le fondateur a lu la page comme vide (10/09 : « aucun statut »).
 *  · prix en dur — `app/arsenal.tsx` rendait `formatEur(item.priceEur)`, donc
 *    « 4,99 € » écrit dans le bundle (cf. l'en-tête de `storePrices.ts`). La
 *    même faute sur l'abonnement afficherait un montant que le Store ne
 *    facturera pas.
 *  · « S'abonner » hors capacité — `ProfilePremiumScreen.tsx` du 09/09 vendait
 *    sur `status === 'ready'` seul, sans exiger un prix confirmé.
 *  · « Restaurer » hors capacité — `app/abonnement.tsx` du 09/09 l'ouvrait sur
 *    `status === 'ready' || status === 'empty' || status === 'error'` : deux de
 *    ces trois états n'ont AUCUN produit derrière.
 *  · vente depuis la gestion — la doctrine du fichier (« the only sale surface
 *    remains /premium ») n'était garantie par rien.
 */
import { assert } from 'jsr:@std/assert@^1';

const RACINE = new URL('../../../', import.meta.url);

function source(chemin: string): string {
  const texte = Deno.readTextFileSync(new URL(chemin, RACINE));
  // Un chemin faux rendrait toutes les règles vertes sans rien vérifier : le
  // mode d'échec le plus banal de ce genre de test.
  assert(texte.length > 500, `couture : ${chemin} lu vide ou introuvable`);
  return texte;
}

/** Le code hors commentaires — citer un défaut dans un commentaire le recrée. */
function codeSeul(texte: string): string {
  return texte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((ligne) => !ligne.trim().startsWith('//'))
    .join('\n');
}

const ABONNEMENT = 'app/abonnement.tsx';
const PREMIUM = 'src/features/refonte/ProfilePremiumScreen.tsx';
const ANALYTICS = 'src/features/refonte/ProfileComparisonScreen.tsx';

Deno.test('couture /abonnement : les QUATRE blocs existent, avec leurs repères français', () => {
  const code = codeSeul(source(ABONNEMENT));
  for (const repere of ['Ton statut', 'GRYD+', 'Tes achats', 'Gérer']) {
    assert(code.includes(repere), `/abonnement : le bloc « ${repere} » a disparu de l’écran`);
  }
});

Deno.test('couture /abonnement : les QUATRE états de droit restent distincts', () => {
  const code = codeSeul(source(ABONNEMENT));
  // Pas connecté · en cours · connu (actif / gratuit) · impossible de vérifier.
  // Le défaut évité : replier « unavailable » sur « aucun abonnement », ce qui
  // affirme un fait qu'on n'a pas lu (L8/L14/L19).
  for (const etat of ["access.status === 'signedOut'", "access.status === 'loading'", "access.status === 'unavailable'", 'access.active']) {
    assert(code.includes(etat), `/abonnement : l’état ${etat} n’est plus distingué`);
  }
});

Deno.test('couture : AUCUN montant en dur dans les trois écrans de l’offre', () => {
  for (const chemin of [ABONNEMENT, PREMIUM, ANALYTICS]) {
    const code = codeSeul(source(chemin));
    const montants = code.match(/\d+[.,]\d{2}\s*€|€\s*\d/g) ?? [];
    assert(montants.length === 0, `${chemin} : montant écrit en dur (${montants.join(', ')}) — il doit venir de COMMERCIAL_PROPOSAL_2026 ou du Store`);
    // Les centimes du cahier ne se recopient pas non plus en nombres nus.
    const centimes = code.match(/\b(599|4999|199|399|799)\b/g) ?? [];
    assert(centimes.length === 0, `${chemin} : centimes du cahier recopiés (${centimes.join(', ')})`);
  }
});

Deno.test('couture /abonnement : le prix affiché DESCEND de game-rules', () => {
  const code = codeSeul(source(ABONNEMENT));
  assert(code.includes('GRYD_PLUS_PLANNED_PRICES_2026'), '/abonnement : le tarif prévu ne vient plus des règles');
  assert(code.includes('formatEurCents2026'), '/abonnement : le montant n’est plus formaté depuis des centimes');
  assert(code.includes('showsPlannedPrices2026'), '/abonnement : le tarif prévu ne s’efface plus quand le Store parle');
});

Deno.test('couture : « S’abonner » et « Restaurer » vivent DANS la capacité de vente', () => {
  for (const chemin of [ABONNEMENT, PREMIUM]) {
    const code = codeSeul(source(chemin));
    assert(code.includes('storeAvailability2026('), `${chemin} : la capacité de vente n’est plus lue`);
    for (const libelle of ['S’abonner', 'Restaurer mes achats']) {
      let depuis = 0;
      let trouve = 0;
      for (;;) {
        const index = code.indexOf(libelle, depuis);
        if (index < 0) break;
        trouve += 1;
        depuis = index + libelle.length;
        // La garde doit être l'ancêtre IMMÉDIAT du bouton : on exige
        // `store.open` dans les 400 caractères qui précèdent le libellé. Un
        // filet grossier — il attrape une forme, pas une intention — mais il
        // rougit dès qu'on sort le bouton de sa condition.
        const avant = code.slice(Math.max(0, index - 400), index);
        assert(avant.includes('store.open'), `${chemin} : « ${libelle} » n’est plus gardé par store.open`);
      }
      assert(trouve > 0, `${chemin} : « ${libelle} » a disparu — la capacité ne garde plus rien`);
    }
  }
});

Deno.test('couture /abonnement : la gestion ne VEND jamais, et mène aux CGV', () => {
  const code = codeSeul(source(ABONNEMENT));
  // « Management never launches a purchase; the only sale surface remains
  // /premium » : cette doctrine n'était garantie par aucun test.
  assert(!code.includes('purchaseSelected'), '/abonnement : cet écran lance un achat — la seule surface de vente est /premium');
  assert(code.includes('/legal/cgv'), '/abonnement : les conditions de vente ne sont plus atteignables depuis la page qui les engage');
  assert(code.includes('/legal/confidentialite'), '/abonnement : la politique de confidentialité n’est plus atteignable');
  assert(code.includes('apps.apple.com/account/subscriptions'), '/abonnement : la gestion d’abonnement iOS n’a plus de destination');
});

Deno.test('couture : les trois surfaces disent les MÊMES mots de l’offre', () => {
  // Le défaut réel du 10/09 : trois phrases pour un seul état de boutique
  // (« Droits indisponibles » / « Les offres du Store sont indisponibles » /
  // « Découvrir GRYD+ »). Les libellés partagés vivent dans `planCopy2026.ts`.
  for (const chemin of [ABONNEMENT, PREMIUM]) {
    const code = codeSeul(source(chemin));
    assert(code.includes('STORE_CLOSED_COPY_2026'), `${chemin} : la phrase de boutique fermée est réécrite localement`);
  }
  const analytics = codeSeul(source(ANALYTICS));
  assert(!analytics.includes('Découvrir GRYD+'), '/premium-analytics : le bouton promet à nouveau un achat impossible');
});

Deno.test('couture : pas de tiret long dans les textes français des trois écrans', () => {
  for (const chemin of [ABONNEMENT, PREMIUM, ANALYTICS]) {
    const code = codeSeul(source(chemin));
    const litteraux = [
      ...(code.match(/'(?:[^'\\\n]|\\.)*'/g) ?? []),
      ...(code.match(/`(?:[^`\\]|\\.)*`/g) ?? []),
    ];
    for (const litteral of litteraux) {
      const texte = litteral.slice(1, -1);
      // Un GLYPHE seul (« — » comme marqueur d'absence dans un tableau de
      // mesures) n'est pas de la prose : la règle vise les phrases.
      if (texte.trim().length <= 2) continue;
      assert(!texte.includes('—') && !texte.includes('–'), `${chemin} : tiret long dans un texte affiché (${texte.slice(0, 60)})`);
    }
  }
});
