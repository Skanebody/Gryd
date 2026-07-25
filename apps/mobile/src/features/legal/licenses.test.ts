/**
 * GRYD — TEST DE DÉRIVE DES LICENCES OPEN SOURCE.
 *
 * La page `/legal/licences` est tenue à la main : sans ce filet, elle vieillit
 * en silence à chaque `npm install`. Elle avait déjà raté les trois fontes
 * (SIL OFL 1.1, dont la mention est une CONDITION d'usage) — ce test existe pour
 * que ce trou-là ne puisse pas se rouvrir sans que le gate passe au rouge.
 *
 * Trois vérifications, du plus déterministe au plus contextuel :
 *   1. `package.json` ↔ instantané (lecture d'un fichier du dépôt : toujours) ;
 *   2. instantané ↔ sections du document (pur) ;
 *   3. instantané ↔ paquets RÉELLEMENT installés (lecture de `node_modules`).
 * La 3ᵉ échoue explicitement si les dépendances ne sont pas installées : un test
 * qui se met en sourdine quand il ne peut pas vérifier est un faux vert, et un
 * faux vert sur une obligation de licence est pire que pas de test du tout.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  BUNDLED_LICENSES,
  missingFromSnapshot,
  staleInSnapshot,
  uncoveredLicenses,
  UNDECLARED,
  WORKSPACE_PACKAGES,
} from './licenses.ts';

const MOBILE_PACKAGE_JSON = new URL('../../../package.json', import.meta.url);
/** Racines npm possibles : nested sous l'app, ou hissée à la racine du monorepo. */
const NODE_MODULES_ROOTS = [
  new URL('../../../node_modules/', import.meta.url),
  new URL('../../../../../node_modules/', import.meta.url),
];

function dependencyNames(): readonly string[] {
  const raw = Deno.readTextFileSync(MOBILE_PACKAGE_JSON);
  const parsed = JSON.parse(raw) as { dependencies?: Record<string, string> };
  return Object.keys(parsed.dependencies ?? {}).sort();
}

/** Licence déclarée par le paquet installé, ou `null` s'il n'est pas installé. */
function installedLicense(name: string): string | null {
  for (const root of NODE_MODULES_ROOTS) {
    const path = new URL(`${name}/package.json`, root);
    let raw: string;
    try {
      raw = Deno.readTextFileSync(path);
    } catch {
      continue;
    }
    const parsed = JSON.parse(raw) as { license?: string };
    return parsed.license ?? UNDECLARED;
  }
  return null;
}

Deno.test('licences : chaque dépendance de package.json est dans l’instantané', () => {
  const names = dependencyNames();
  assertEquals(missingFromSnapshot(names), [], 'dépendance ajoutée et non créditée');
  assertEquals(staleInSnapshot(names), [], 'crédit fantôme : plus une dépendance');
});

Deno.test('licences : chaque licence embarquée a sa section dans le document', () => {
  // Le cas historique : `MIT AND OFL-1.1` sur les trois fontes, dont seule la
  // branche MIT était couverte.
  assertEquals(uncoveredLicenses(), []);
});

Deno.test('licences : l’instantané correspond aux paquets réellement installés', () => {
  const divergences: string[] = [];
  const absents: string[] = [];
  for (const [name, expected] of Object.entries(BUNDLED_LICENSES)) {
    const actual = installedLicense(name);
    if (actual === null) {
      absents.push(name);
      continue;
    }
    if (actual !== expected) divergences.push(`${name} : instantané ${expected} ≠ installé ${actual}`);
  }
  assertEquals(
    absents,
    [],
    'paquets introuvables dans node_modules — lancer `npm install` avant le gate',
  );
  assertEquals(divergences, [], 'une licence installée a changé depuis le relevé du 25/07/2026');
});

Deno.test('licences : nos propres paquets ne sont pas crédités comme des tiers', () => {
  for (const own of WORKSPACE_PACKAGES) {
    assertEquals(own in BUNDLED_LICENSES, false);
  }
});
