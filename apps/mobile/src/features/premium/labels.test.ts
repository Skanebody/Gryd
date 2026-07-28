/**
 * GRYD — PREMIUM : les libellés doivent s'accorder, dans les 5 langues.
 *  1. chaque période a son entrée (aucune formule sans nom) ;
 *  2. « 1 jour » / « 7 jours » — le pluriel bascule à n > 1, partout ;
 *  3. aucune entrée du catalogue premium ne contient de PRIX en dur.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../../i18n/types.ts';
import { C } from '../../i18n/catalog/premium.ts';
import { offerLabelEntry, trialUnitEntry } from './labels.ts';

Deno.test('chaque période a un libellé complet dans les 5 langues', () => {
  for (const period of ['lifetime', 'yearly', 'monthly'] as const) {
    const entry = offerLabelEntry(period);
    for (const locale of LOCALES) {
      assert(entry[locale].trim().length > 0, `${period}/${locale}`);
    }
  }
});

Deno.test('essai : singulier à 1, pluriel au-delà (fr)', () => {
  assertEquals(trialUnitEntry({ units: 1, unit: 'day' }).fr, '{n} jour');
  assertEquals(trialUnitEntry({ units: 7, unit: 'day' }).fr, '{n} jours');
  assertEquals(trialUnitEntry({ units: 1, unit: 'week' }).fr, '{n} semaine');
  assertEquals(trialUnitEntry({ units: 2, unit: 'week' }).fr, '{n} semaines');
  assertEquals(trialUnitEntry({ units: 1, unit: 'year' }).fr, '{n} an');
  assertEquals(trialUnitEntry({ units: 2, unit: 'year' }).fr, '{n} ans');
});

Deno.test('toute forme de durée porte le trou {n} dans les 5 langues', () => {
  for (const unit of ['day', 'week', 'month', 'year'] as const) {
    for (const units of [1, 3]) {
      const entry = trialUnitEntry({ units, unit });
      for (const locale of LOCALES) {
        assert(entry[locale].includes('{n}'), `${unit}/${units}/${locale}`);
      }
    }
  }
});

Deno.test('AUCUN prix en dur dans le catalogue premium (les prix viennent du Store)', () => {
  // Un montant suivi d'un symbole monétaire, ou l'inverse — ce que la spec E74
  // interdit explicitement d'écrire dans le code.
  const money = /\d[\d.,]*\s*(€|\$|£)|(€|\$|£)\s*\d/;
  for (const [key, entry] of Object.entries(C)) {
    for (const locale of LOCALES) {
      assert(!money.test(entry[locale]), `${key}/${locale} contient un prix en dur`);
    }
  }
});

// ─── 4. LES DEUX MENSONGES D'E74, CORRIGÉS LE 28/07/2026 ────────────────────

Deno.test('E74 : « Gérer » ne promet plus le Store — il navigue vers E75', async () => {
  // Le bouton faisait `Linking.openURL(managementUrl)` (et n'était peint que si
  // l'URL existait) ; il fait maintenant `router.push('/abonnement')`. E75 ne
  // peint le vrai lien Store QUE si `managementUrl !== null` — un joueur qui
  // tape ce bouton peut donc n'atteindre jamais le Store. Le libellé ne doit
  // donc plus nommer le Store. La clé `abonnement.ts:ctaManage`, elle, le peut :
  // c'est le seul bouton du dépôt qui ouvre réellement l'URL.
  const src = await Deno.readTextFile(new URL('../../../app/premium.tsx', import.meta.url));
  const navigueEnInterne = src.includes("onPress={() => router.push('/abonnement')}");
  if (!navigueEnInterne) return; // si un jour il rouvre le Store, la garde n'a plus lieu d'être
  const STORE = /(store|tienda|loja)/i;
  for (const locale of LOCALES) {
    assert(
      !STORE.test(C.ctaManage[locale]),
      `premium:ctaManage (${locale}) promet le Store alors que le bouton navigue vers E75`,
    );
  }
});

Deno.test('E74 : un achat non confirmé a SA phrase, distincte de « c’est actif »', async () => {
  // `purchasePackage()` qui ne jette pas ne prouve pas que le droit est ouvert
  // (achat différé « Demander à acheter » / SCA, ou entitlement mal nommé).
  // 1. la copie du cas non confirmé existe dans les 5 langues ;
  for (const locale of LOCALES) {
    assert(
      C.resultPurchasePending[locale].trim().length > 0,
      `resultPurchasePending (${locale}) manquant`,
    );
    assert(
      C.resultPurchasePending[locale] !== C.resultPurchased[locale],
      `resultPurchasePending (${locale}) répète « c’est actif » — les deux faits se confondraient`,
    );
  }
  // 2. et le hook RELIT bien le droit au lieu de le déduire du silence du SDK.
  const src = await Deno.readTextFile(new URL('./usePremium.ts', import.meta.url));
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const achat = code.indexOf("outcome.kind === 'purchased'");
  assert(achat >= 0, 'le chemin d’achat a disparu — cette garde doit être recalée');
  const apres = code.slice(achat, achat + 600);
  assert(
    apres.includes('readProStatus('),
    'purchaseSelected affirme un achat sans relire le droit (readProStatus)',
  );
  assert(
    apres.includes("kind: 'purchase_pending'"),
    'purchaseSelected ne distingue plus l’achat CONFIRMÉ de l’achat en attente',
  );
});
