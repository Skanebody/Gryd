/**
 * GRYD — LA PAGE PARAMÈTRES EST LA PORTE DE DERNIER RECOURS.
 *
 * ═══ POURQUOI CE FICHIER EXISTE (28/07/2026) ════════════════════════════════
 * Un audit a montré que l'écran E75 « Abonnement et achats » (`/abonnement`),
 * bâti pour porter le statut, la prochaine échéance, la restauration, l'accès au
 * Store et l'historique, était INATTEIGNABLE pour exactement la population qu'il
 * sert. La chaîne était :
 *   `/abonnement`  ←  `/premium`  ←  `/arsenal`            (masqué : flags.arsenal)
 *                                 ←  `/premium-analytics`  (branche `locked` seule,
 *                                    qui disparaît dès que le joueur est abonné)
 * Dans le build par défaut (`EXPO_PUBLIC_FULL_SURFACE` absent), un joueur ABONNÉ
 * n'avait donc AUCUN chemin vers sa propre gestion d'abonnement.
 *
 * `scripts/audit-routes.mjs` sortait pourtant en 0 : il fait de l'analyse de
 * liens STATIQUE et ne modélise ni les drapeaux ni les branches d'état. Un vert
 * qui ne prouve pas la porte. Ce test-ci prouve la porte : il lit la liste des
 * réglages telle qu'elle est construite, drapeaux compris, et exige que les
 * routes de dernier recours y figurent SANS condition.
 *
 * PUR : `sections.ts` n'importe que des types, `flags` et des catalogues i18n —
 * aucun React Native, il se charge tel quel sous Deno.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../../i18n/types.ts';
import { SETTINGS_GROUPS } from './sections.ts';

/** Toutes les lignes réellement construites, tous groupes confondus. */
const ROWS = SETTINGS_GROUPS.flatMap((g) => g.rows);

/**
 * Les routes qui n'ont AUCUNE autre porte fiable dans le build MVP. Chacune est
 * accompagnée de la raison pour laquelle elle est ici — une liste sans raisons
 * finirait par accumuler des entrées que personne n'ose retirer.
 */
const PORTES_DE_DERNIER_RECOURS: ReadonlyMap<string, string> = new Map([
  [
    '/abonnement',
    'E75 : ses seules autres portes passent par /premium, lui-même derrière ' +
      'flags.arsenal ou derrière la branche `locked` de /premium-analytics — ' +
      'branche absente précisément quand le joueur EST abonné.',
  ],
]);

Deno.test('paramètres : les portes de dernier recours existent, drapeaux compris', () => {
  const hrefs = new Set(ROWS.map((r) => r.href).filter((h): h is string => typeof h === 'string'));
  for (const [route, raison] of PORTES_DE_DERNIER_RECOURS) {
    assert(hrefs.has(route), `${route} n’a plus de porte dans les Paramètres — ${raison}`);
  }
});

Deno.test('paramètres : ces portes ne dépendent d’AUCUN drapeau', async () => {
  // La garde vise le code, pas les commentaires : une ligne conditionnée par
  // `flags.*` se reconnaît à un `...(flags.x ? [...] : [])`. On vérifie que la
  // route de dernier recours n'apparaît dans AUCUN de ces spreads.
  const src = await Deno.readTextFile(new URL('./sections.ts', import.meta.url));
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const spread of code.matchAll(/\.\.\.\(flags\.[\w]+[\s\S]*?\)\s*:\s*\[\]\)/g)) {
    for (const route of PORTES_DE_DERNIER_RECOURS.keys()) {
      assert(
        !spread[0].includes(`'${route}'`),
        `${route} est repassée derrière un drapeau — l’écran redevient fermé à ceux qu’il sert`,
      );
    }
  }
});

Deno.test('paramètres : chaque ligne porte un libellé et un détail dans les 5 langues', () => {
  for (const row of ROWS) {
    const nom = row.href ?? row.section ?? '?';
    for (const locale of LOCALES) {
      assert(row.label[locale]?.trim().length > 0, `${nom} : label ${locale} vide`);
      assert(row.detail[locale]?.trim().length > 0, `${nom} : detail ${locale} vide`);
    }
  }
});
