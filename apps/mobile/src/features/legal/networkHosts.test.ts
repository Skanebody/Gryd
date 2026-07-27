/**
 * GRYD — LE TEST QUI EMPÊCHE LA POLITIQUE DE PRENDRE DU RETARD SUR LE CODE.
 *
 * Trois rattrapages en un jour (Nominatim, puis OSRM, puis les quatre fournisseurs
 * de fonds de carte) ont montré qu'une liste de destinataires tenue à la main
 * dérive silencieusement. Ici, la dérive devient une ERREUR DE TEST :
 *
 *   1. RELECTURE DE L'ARBORESCENCE — tous les hôtes littéralement écrits dans
 *      `apps/mobile/src` et `apps/mobile/app` (hors fichiers de test) doivent
 *      figurer au registre `networkHosts.ts`. Ajouter un appel réseau sans le
 *      déclarer casse ici.
 *   2. COUVERTURE DE LA POLITIQUE — chaque hôte qualifié `recipient` doit être
 *      NOMMÉ dans la section « Partage & sous-traitants » embarquée.
 *   3. COHÉRENCE DES DEUX SECTIONS — la clause de transfert hors UE ne peut plus
 *      annoncer un nombre d'exceptions ; elle doit nommer les mêmes tiers.
 *
 * Ce que le test NE prétend PAS faire : il lit des littéraux de source, donc une
 * URL construite à l'exécution (concaténation, variable d'environnement) lui
 * échappe. C'est écrit ici plutôt que promis ailleurs.
 *
 * Deno, `--allow-read` (déjà le mode de `npm run test:mobile`).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { C } from '../../i18n/catalog/legal.ts';
import {
  EXTERNAL_HOSTS,
  recipientHosts,
  undeclaredRecipients,
  unregisteredHosts,
} from './networkHosts.ts';

/** Racine `apps/mobile` déduite de l'emplacement de ce fichier. */
const MOBILE_ROOT = new URL('../../../', import.meta.url);

/** Fichiers de code (hors tests) sous un dossier donné. */
async function* sourceFiles(dir: URL): AsyncGenerator<URL> {
  for await (const entry of Deno.readDir(dir)) {
    const child = new URL(`${entry.name}${entry.isDirectory ? '/' : ''}`, dir);
    if (entry.isDirectory) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      yield* sourceFiles(child);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      yield child;
    }
  }
}

/** Hôtes http(s) écrits en clair dans le code mobile. */
async function scanHosts(): Promise<string[]> {
  const found = new Set<string>();
  for (const sub of ['src/', 'app/']) {
    for await (const file of sourceFiles(new URL(sub, MOBILE_ROOT))) {
      const text = await Deno.readTextFile(file);
      for (const match of text.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
        found.add(match[1]);
      }
    }
  }
  return [...found];
}

Deno.test('aucun hôte du code n’échappe au registre', async () => {
  const missing = unregisteredHosts(await scanHosts());
  assertEquals(
    missing,
    [],
    `hôte(s) contacté(s) par le code et absent(s) de networkHosts.ts : ${missing.join(', ')} — ` +
      'le déclarer, et mettre la politique à jour s’il reçoit des données.',
  );
});

Deno.test('chaque destinataire est NOMMÉ dans « Partage & sous-traitants »', () => {
  const section = C.privacyPartageBody1.fr + '\n' + C.privacyPartageBody2.fr;
  const missing = undeclaredRecipients(section);
  assertEquals(
    missing,
    [],
    `destinataire(s) absent(s) de la politique embarquée : ${missing.join(', ')}`,
  );
});

Deno.test('les fonds de carte sont nommés, et ce qu’ils reçoivent est borné', () => {
  const body = C.privacyPartageBody2.fr;
  // Les quatre hôtes ajoutés le 27/07 (3ᵉ passe) — ceux appelés à chaque carte.
  for (const name of ['CARTO', 'Esri', 'OpenMapTiles', 'Amazon Web Services']) {
    assert(body.includes(name), `« ${name} » n’est plus nommé dans la politique`);
  }
  // Ce qu'ils reçoivent (zone + IP) ET ce qu'ils ne reçoivent pas : la borne est
  // la moitié utile de la déclaration.
  assert(/adresse IP/i.test(body), 'la politique ne dit pas que l’adresse IP part avec la tuile');
  assert(
    /jamais ton tracé/i.test(body) && /jamais ta position exacte/i.test(body),
    'la politique ne borne plus ce que les fonds de carte NE reçoivent pas',
  );
});

Deno.test('« encadrés par contrat » ne couvre plus les services publics sans contrat', () => {
  const body = C.privacyPartageBody1.fr;
  assert(
    !/^(?!.*sans contrat).*sous-traitants techniques, encadrés par contrat/s.test(body),
    'la phrase promet un contrat RGPD là où Nominatim / OSRM / les fonds de carte n’en ont aucun',
  );
  assert(/sans contrat/i.test(body), 'la politique ne distingue plus les services publics sans contrat');
});

Deno.test('transferts hors UE : les mêmes tiers, et aucun décompte figé', () => {
  const body = C.privacyTransfertBody.fr;
  assert(
    !/DEUX exceptions/i.test(body),
    'la clause annonce encore « DEUX exceptions » alors que les fonds de carte en ajoutent',
  );
  for (const name of ['Nominatim', 'OSRM', 'CARTO', 'Esri', 'OpenMapTiles', 'Amazon Web Services']) {
    assert(body.includes(name), `« ${name} » manque à la clause de transfert hors UE`);
  }
});

Deno.test('registre : un destinataire porte toujours le nom attendu par la politique', () => {
  for (const host of recipientHosts()) {
    assert(
      typeof host.policyName === 'string' && host.policyName.length > 0,
      `${host.host} est un destinataire sans nom de politique`,
    );
  }
  // Le « pourquoi » n'est pas décoratif : c'est lui qui rend l'entrée vérifiable.
  for (const host of EXTERNAL_HOSTS) {
    assert(host.why.trim().length > 0, `${host.host} n’explique pas pourquoi il est contacté`);
  }
});
