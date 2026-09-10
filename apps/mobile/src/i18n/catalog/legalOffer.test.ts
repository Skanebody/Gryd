/**
 * GRYD — LE CONTRAT NE VEND PLUS UNE OFFRE QUI N'EXISTE PAS.
 *
 * ─── ÉTAPE 0 — CE QUI ÉTAIT ÉCRIT DANS LES CGV LE 10/09/2026 ───────────────
 * Un document CONTRACTUEL est l'endroit où « une doc ne promet jamais au-delà
 * du code » est le plus strict : il engage l'éditeur, et un consommateur peut
 * l'opposer. Or les CGV embarquées vendaient, mot pour mot :
 *
 *  · « Abonnement (unique) — GRYD Club, mensuel ou annuel » alors que l'offre
 *    décidée par le cahier §16.1 s'appelle GRYD+ (`COMMERCIAL_PROPOSAL_2026`) ;
 *  · dans ce même abonnement, « stats avancées, historique complet » alors que
 *    §16.2 range l'historique complet dans le GRATUIT — les CGV faisaient donc
 *    payer ce que le produit donne ;
 *  · « Founder Pack (à vie, édition limitée), Starter Pack » alors que §16.1
 *    interdit toute offre à vie avant compréhension des coûts, et que les trois
 *    produits uniques sont les collections permanentes ;
 *  · « de la monnaie de style » alors que `virtualCurrency: false` et que §7.5
 *    dit « Pas de monnaie virtuelle au lancement » ;
 *  · « bouclier de zone, gel de série, alerte d'attaque anticipée » comme
 *    objets non vendus — ils ne sont plus seulement invendables, ils N'EXISTENT
 *    PLUS (§5.3 : « Il n'y a ni bouclier, ni contestation de 18 heures, ni
 *    défense achetable, ni dette de connexion ») ;
 *  · « L'accès aux avantages est activé immédiatement après le paiement »
 *    alors que G28 exige l'inverse (« "Premium activé" n'apparaît qu'après
 *    confirmation des droits ») et que le code le tient déjà
 *    (`purchase_pending`, `access2026.ts`).
 *
 * Ces tests ne figent AUCUNE formulation — une clause se réécrit. Ils figent
 * les FAITS : le nom de l'offre, ce qui n'est pas vendu, et les mentions que la
 * loi impose à une vente B2C.
 *
 * PUR : aucun accès disque, aucun import React Native.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { COMMERCIAL_PROPOSAL_2026 } from '@klaim/shared';
import { LOCALES } from '../types.ts';
import type { Entry } from '../types.ts';
import { C, LEGAL_OFFER_LAST_UPDATED } from './legal.ts';

/** Toutes les clauses commerciales, CGV et CGU réunies. */
const CLAUSES: readonly (readonly [string, Entry])[] = [
  ['cgvObjetBody', C.cgvObjetBody],
  ['cgvOffresBody1', C.cgvOffresBody1],
  ['cgvOffresAbonnement', C.cgvOffresAbonnement],
  ['cgvOffresPonctuels', C.cgvOffresPonctuels],
  ['cgvOffresJamaisVendus', C.cgvOffresJamaisVendus],
  ['cgvOffresBody3', C.cgvOffresBody3],
  ['cgvStatusIntro', C.cgvStatusIntro],
  ['cgvCommandeBody1', C.cgvCommandeBody1],
  ['cgvCommandeBody2', C.cgvCommandeBody2],
  ['cgvDureeBody1', C.cgvDureeBody1],
  ['cgvDureeBody2', C.cgvDureeBody2],
  ['cguAboBody1', C.cguAboBody1],
  ['cguAboBody2', C.cguAboBody2],
  ['cguAboBody3', C.cguAboBody3],
];

const contratComplet = CLAUSES.map(([, entry]) => entry.fr).join('\n');

Deno.test('contrat : l’offre porte le nom décidé dans game-rules, et lui seul', () => {
  assert(
    contratComplet.includes(COMMERCIAL_PROPOSAL_2026.subscriptionName),
    `le contrat ne nomme jamais ${COMMERCIAL_PROPOSAL_2026.subscriptionName}`,
  );
  // Le nom d'une offre est ce qu'un acheteur retrouve sur sa facture : deux noms
  // pour un produit, c'est un litige.
  assert(!/GRYD Club/.test(contratComplet), 'le contrat vend encore « GRYD Club », une offre qui n’existe pas');
});

Deno.test('contrat : ni pack à vie, ni pack de départ, ni monnaie de style', () => {
  for (const disparu of ['Founder Pack', 'Starter Pack', 'monnaie de style', 'Éclats', 'Foulées']) {
    assert(!contratComplet.includes(disparu), `le contrat vend encore « ${disparu} »`);
  }
  // §16.1 : « pas d'offre à vie avant compréhension des coûts ». Le contrat le
  // DIT, au lieu de simplement ne plus la lister.
  assert(/aucune offre à vie/i.test(contratComplet), 'le contrat ne dit pas qu’aucune offre à vie n’est proposée');
});

Deno.test('contrat : aucune monnaie virtuelle vendue, tant que la règle le dit', () => {
  // La clause n'est exigible QUE si la règle la porte : si un jour une monnaie
  // existe, c'est ce test qu'il faudra rouvrir, pas la clause qu'il faudra
  // oublier.
  assertEquals(COMMERCIAL_PROPOSAL_2026.virtualCurrency, false);
  assert(
    /aucune monnaie virtuelle/i.test(contratComplet),
    'le contrat ne dit plus qu’aucune monnaie virtuelle n’est vendue',
  );
});

Deno.test('contrat : les objets de jeu supprimés ne sont plus nommés du tout', () => {
  // Les nommer, même pour dire qu'on ne les vend pas, décrit un jeu qui n'existe
  // plus. Un lecteur en déduirait qu'il existe des boucliers quelque part.
  for (const fantome of ['bouclier', 'gel de série', 'alerte d’attaque']) {
    assert(!contratComplet.toLowerCase().includes(fantome.toLowerCase()), `le contrat nomme encore « ${fantome} »`);
  }
});

Deno.test('contrat : la garantie anti-pay-to-win nomme ce qui ne s’achète pas', () => {
  // Une promesse abstraite d'équité ne se vérifie pas. §16.2 nomme les faits :
  // capture, reprise, défis et chances de victoire strictement identiques.
  assert(/capture/i.test(contratComplet), 'la garantie ne nomme plus la capture');
  assert(/XP/.test(contratComplet), 'la garantie ne nomme plus l’XP');
  assert(/défi/i.test(contratComplet), 'la garantie ne nomme plus les défis');
  assert(/classement/i.test(contratComplet), 'la garantie ne nomme plus le classement');
});

Deno.test('contrat : le droit s’ouvre après CONFIRMATION, jamais « après le paiement »', () => {
  const commande = C.cgvCommandeBody2.fr;
  assert(
    !/activé immédiatement après le paiement/i.test(commande),
    'la clause promet un droit immédiat que G28 et le code refusent (achat en attente)',
  );
  assert(/confirm/i.test(commande), 'la clause ne dit plus que le droit dépend d’une confirmation');
});

Deno.test('contrat : une résiliation n’efface ni terrain, ni progression, ni objet', () => {
  // §16.3, mot pour mot : « Une interruption de paiement n'efface jamais un
  // terrain ni une progression. » Les CGU promettaient l'inverse (« jamais tes
  // zones — elles restent à toi tant que tu cours »), c'est-à-dire un decay que
  // §5.3 a supprimé et que `decay_job` refuse de faire tourner.
  assert(!/tant que tu cours/i.test(contratComplet), 'le contrat promet encore une perte de terrain par inactivité');
  assert(
    /n’efface (jamais|ni)/i.test(contratComplet),
    'le contrat ne garantit plus que payer ou arrêter de payer ne touche pas au terrain',
  );
});

Deno.test('CGV : les mentions obligatoires d’une vente B2C sont toutes présentes', () => {
  // On teste la PRÉSENCE des mentions, pas leur rédaction : la rédaction reste
  // du ressort d'un juriste, l'absence est un défaut vérifiable.
  const vendeur = C.cgvVendeurBody.fr;
  for (const jeton of ['{name}', '{form}', '{capital}', '{address}', '{rcs}', '{siren}', '{vat}']) {
    assert(vendeur.includes(jeton), `l’identité du vendeur ne porte plus ${jeton}`);
  }
  assert(/L221-18/.test(C.cgvRetractationBody1.fr), 'le délai de rétractation ne cite plus son article');
  // Contenu numérique : la RENONCIATION expresse au délai de 14 jours doit être
  // écrite, sinon le droit de rétractation survit à l'exécution immédiate.
  assert(/L221-28/.test(C.cgvRetractationBody2.fr), 'la renonciation au délai ne cite plus son article');
  assert(/14 jours/.test(C.cgvRetractationBody2.fr), 'la renonciation ne nomme plus le délai auquel elle renonce');
  assert(/tacite reconduction/i.test(C.cgvDureeBody1.fr), 'la reconduction tacite n’est plus annoncée');
  assert(/résiliation s’effectuent depuis les réglages/i.test(C.cgvDureeBody2.fr), 'la voie de résiliation a disparu');
  assert(/L217-1/.test(C.cgvGarantiesBody.fr), 'la garantie légale de conformité ne cite plus son article');
  assert(/L612-1/.test(C.cgvMediationBody2.fr), 'la médiation de la consommation ne cite plus son article');
  assert(/droit français/i.test(C.cgvDroitBody.fr), 'le droit applicable a disparu');
});

Deno.test('contrat : le corps fait foi en français, à l’identique dans les cinq langues', () => {
  for (const [label, entry] of CLAUSES) {
    for (const locale of LOCALES) {
      assert(entry[locale].trim().length > 0, `${label}.${locale} est vide`);
      assertEquals(entry[locale], entry.fr, `${label}.${locale} a divergé du français de référence`);
    }
  }
});

Deno.test('contrat : la date des documents d’offre est lisible et distincte', () => {
  assert(/^\d{2}\/\d{2}\/\d{4}$/.test(LEGAL_OFFER_LAST_UPDATED), `date illisible : ${LEGAL_OFFER_LAST_UPDATED}`);
});
