/**
 * ANTI PAY-TO-WIN — L'INVARIANT GELÉ.
 *
 * Ce fichier existe pour qu'une violation déjà corrigée ne puisse pas revenir
 * par inadvertance. Il ne teste pas un comportement : il teste une INTERDICTION.
 *
 * Règles constitutionnelles couvertes :
 *  · CLAUDE.md — « aucun achat, abonnement, sponsor ou perk ne donne territoire,
 *    points, vitesse, avantage de jeu NI PROTECTION ».
 *  · AMENDEMENT-40 §2 (15/07/2026) — « Le Bouclier et le Streak Gel ne sont plus
 *    achetables contre de l'argent (ni directement, ni via une monnaie
 *    achetable) » + « STREAK_FREEZE_CLUB_PER_MONTH doit valoir
 *    STREAK_FREEZE_FREE_PER_MONTH ».
 *  · AMENDEMENT-45 §2 « Bonus » (21/07/2026) — « Bouclier et scout_ping
 *    deviennent gagnables en jouant, jamais achetables en argent réel. »
 *  · AMENDEMENT-45 §2 C1 — « Être prévenu plus tôt d'une attaque, c'est défendre
 *    en premier — un avantage compétitif payant, interdit. » (→ attack_alert)
 *
 * Ce que le test refuse, à quatre endroits différents :
 *  1. le registre partagé (game-rules) ;
 *  2. les tables de prix EUR / Éclats du même fichier ;
 *  3. les paniers des packs payants (SKU_GRANTED_ITEM_KEYS) ;
 *  4. le catalogue SERVEUR (seed SQL) — prix ET contrainte de non-régression.
 *
 * Un prix réintroduit sur un objet fonctionnel fait ÉCHOUER ce fichier.
 */
import { assert, assertEquals } from 'jsr:@std/assert@^1';
import {
  ECLATS_PACKS,
  FUNCTIONAL_ITEM_ACQUISITION,
  FUNCTIONAL_ITEM_KEYS,
  isFunctionalItemKey,
  SKU_GRANTED_ITEM_KEYS,
  SKU_PRICES_EUR,
  SKUS,
  STREAK_FREEZE_CLUB_PER_MONTH,
  STREAK_FREEZE_FREE_PER_MONTH,
} from '../_shared/game-rules.ts';

// ─── 1. Le registre lui-même ────────────────────────────────────────────────

Deno.test('p2w : aucun objet FONCTIONNEL n’a de prix (Éclats ou EUR)', () => {
  assert(FUNCTIONAL_ITEM_KEYS.length > 0, 'le registre ne doit jamais être vidé');
  for (const key of FUNCTIONAL_ITEM_KEYS) {
    const acq = FUNCTIONAL_ITEM_ACQUISITION[key];
    assertEquals(acq.priceEclats, null, `${key} : prix Éclats interdit`);
    assertEquals(acq.priceEur, null, `${key} : prix EUR interdit`);
    assertEquals(acq.purchasable, false, `${key} : jamais achetable`);
    assertEquals(acq.earnedBy, 'play', `${key} : seule voie = le jeu`);
  }
});

Deno.test('p2w : les 4 objets fonctionnels connus sont bien au registre', () => {
  // Si un objet fonctionnel est RETIRÉ du registre, il redevient libre d'être
  // vendu sans que rien ne proteste — donc on épingle la liste.
  for (const key of ['shield', 'streak_gel', 'scout_ping', 'attack_alert']) {
    assert(isFunctionalItemKey(key), `${key} doit rester un objet FONCTIONNEL`);
  }
});

// ─── 2. Les tables de prix du fichier partagé ───────────────────────────────

Deno.test('p2w : aucune clé fonctionnelle dans SKU_PRICES_EUR', () => {
  for (const sku of Object.keys(SKU_PRICES_EUR)) {
    assert(!isFunctionalItemKey(sku), `SKU_PRICES_EUR ne doit pas coter ${sku}`);
  }
});

Deno.test('p2w : aucun SKU store ne désigne un objet fonctionnel', () => {
  for (const sku of Object.values(SKUS)) {
    assert(!isFunctionalItemKey(sku), `SKUS ne doit pas exposer ${sku}`);
  }
});

Deno.test('p2w : aucune constante *_ECLATS ne survit pour un objet fonctionnel', async () => {
  // Garde textuelle : les constantes supprimées (SHIELD_EXTRA_ECLATS,
  // STREAK_GEL_ECLATS, SCOUT_PING_ECLATS) ne doivent pas réapparaître, même
  // sous un autre nom, dès lors qu'elles nomment un objet fonctionnel.
  const src = await Deno.readTextFile(new URL('../_shared/game-rules.ts', import.meta.url));
  const banned = [
    /export const SHIELD_[A-Z_]*ECLATS/,
    /export const STREAK_GEL_[A-Z_]*ECLATS/,
    /export const SCOUT_PING_[A-Z_]*ECLATS/,
    /export const ATTACK_ALERT_[A-Z_]*ECLATS/,
  ];
  for (const re of banned) {
    assert(!re.test(src), `constante de prix interdite réintroduite : ${re}`);
  }
});

// ─── 3. Les paniers des packs payants ──────────────────────────────────────

Deno.test('p2w : aucun pack payant ne crédite un objet fonctionnel', () => {
  for (const [sku, keys] of Object.entries(SKU_GRANTED_ITEM_KEYS)) {
    for (const key of keys as readonly string[]) {
      assert(
        !isFunctionalItemKey(key),
        `le pack ${sku} ne doit pas créditer ${key} (argent réel → protection)`,
      );
    }
  }
});

Deno.test('p2w : les Éclats restent des packs, jamais un objet fonctionnel', () => {
  for (const key of Object.keys(ECLATS_PACKS)) {
    assert(!isFunctionalItemKey(key), `${key} ne peut pas être un pack d'Éclats`);
  }
});

// ─── 4. Le Club ne protège pas mieux que la gratuité ───────────────────────

Deno.test('p2w : le gel de série est identique Club et gratuit (A-40 §2)', () => {
  assertEquals(
    STREAK_FREEZE_CLUB_PER_MONTH,
    STREAK_FREEZE_FREE_PER_MONTH,
    'l’abonnement ne protège pas mieux la série que la gratuité',
  );
});

// ─── 5. Le catalogue SERVEUR (seed SQL) ────────────────────────────────────

Deno.test('p2w : la migration 0065 dépose bien la contrainte anti-prix', async () => {
  const sql = await Deno.readTextFile(
    new URL('../../migrations/0065_functional_items_never_sold.sql', import.meta.url),
  );
  assert(
    sql.includes('items_functional_never_priced_check'),
    'la contrainte SQL doit exister — sans elle un UPDATE peut revendre l’objet',
  );
  for (const key of FUNCTIONAL_ITEM_KEYS) {
    assert(sql.includes(`'${key}'`), `la contrainte doit couvrir ${key}`);
  }
  assert(
    /price_shards is null and price_eur is null/.test(sql),
    'la contrainte doit interdire les DEUX monnaies',
  );
});

Deno.test('p2w : la migration 0067 interdit que l’ABONNEMENT distribue un objet fonctionnel', async () => {
  // 0065 ferme le chemin d'ACHAT. Il restait le chemin du DON : six expressions
  // `case when v_is_club … then 'club'` faisaient de l'abonnement la SEULE source
  // d'objets devenus ni achetables ni gagnables. Une contrainte de DONNÉE tient
  // quelle que soit la version de fonction déployée — y compris une ancienne
  // qu'on redéploierait par erreur.
  const sql = await Deno.readTextFile(
    new URL('../../migrations/0067_club_never_grants_functional_items.sql', import.meta.url),
  );
  for (const table of ['streak_gels', 'scout_pings', 'attack_alerts']) {
    assert(
      sql.includes(`${table}_club_never_grants`),
      `${table} doit porter la contrainte : sans elle, le Club redevient une source`,
    );
  }
  assert(
    (sql.match(/source is distinct from 'club'/g) ?? []).length >= 3,
    'les TROIS tables doivent refuser la provenance « club »',
  );
});
