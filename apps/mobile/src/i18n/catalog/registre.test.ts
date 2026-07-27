/**
 * GRYD — LE REGISTRE FRANÇAIS EST LE TUTOIEMENT, ET PLUS RIEN NE L'OUBLIE.
 *
 * ═══ POURQUOI CE FICHIER EXISTE (27/07/2026) ════════════════════════════════
 * CLAUDE.md déclare le tutoiement en français et ajoute « des tests le
 * verrouillent ». C'ÉTAIT FAUX : aucun test du dépôt ne regardait le registre.
 * Résultat mesuré — quinze entrées de `crew.ts` vouvoyaient, dont cinq RENDUES
 * à l'écran (« Trouvez votre crew », « Connectez-vous pour voir les crews de
 * votre ville », « C'est votre crew. »…), et un rendu-compte affirmait pourtant
 * avoir relu « les 36 clés une par une ». Le catalogue lui-même portait la
 * contradiction en commentaire (« ⚠ REGISTRE : le bloc LOT 7 VOUVOIE… ») sans
 * que rien ne la fasse échouer.
 *
 * Une règle énoncée qu'aucun test ne tient n'est pas une règle : c'est une
 * intention. Ce fichier la rend mécanique — sur les 48 catalogues, d'un coup, y
 * compris ceux qui n'existent pas encore.
 *
 * ═══ CE QU'IL NE FAIT PAS ═══════════════════════════════════════════════════
 * Il ne confond pas le VOUVOIEMENT (s'adresser au lecteur avec déférence) avec
 * le PLURIEL (s'adresser à plusieurs personnes, ou parler d'un groupe). « Plus
 * vous êtes nombreux à y être passés » est un pluriel juste : le tutoyer le
 * rendrait faux. Les seules exceptions tolérées sont donc nommées une par une
 * ci-dessous, avec leur raison — et le test échoue AUSSI si une exception
 * devient inutile, pour qu'aucune ne survive à sa justification.
 *
 * PUR : aucun import React Native (les 48 catalogues se chargent tels quels
 * sous Deno — vérifié).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';

/** Une entrée i18n : les 5 langues obligatoires (contrat de `types.ts`). */
function isEntry(v: unknown): v is Record<string, string> {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return LOCALES.every((l) => typeof o[l] === 'string');
}

/**
 * Marqueurs de vouvoiement en français. `rendez-vous` est un NOM commun, pas un
 * pronom : il est retiré du texte avant l'examen, sinon chaque « point de
 * rendez-vous » du catalogue crew ferait rougir le test pour rien.
 */
const VOUS_RE = /(^|[^\p{L}])(vous|votre|vos|vôtre|vôtres)([^\p{L}]|$)/iu;

function frVouvoie(text: string): boolean {
  const clean = text
    .replace(/rendez-vous/gi, ' ')
    .replace(/\{[^}]*\}/g, ' '); // les jetons {n}, {city}… ne portent pas de registre
  return VOUS_RE.test(clean);
}

/**
 * LES SEULES EXCEPTIONS — un PLURIEL RÉEL, jamais une déférence. Clé → raison.
 * Chacune a été relue à sa surface : le tutoiement y serait FAUX, pas seulement
 * inhabituel.
 */
const PLURIEL_ASSUME: ReadonlyMap<string, string> = new Map([
  [
    'crew:editDescPh',
    'Le champ décrit le CREW à ses futurs membres : « Vos habitudes de crew, ' +
      'vos règles » s’adresse au groupe, pas au lecteur. « Tes habitudes » ' +
      'parlerait de l’auteur seul, ce que la description ne fait pas.',
  ],
  [
    'crew:oBlockPlaceEmpty',
    'Un rendez-vous se donne À PLUSIEURS : « où vous vous retrouvez » désigne le ' +
      'crew. Le verbe qui précède, lui, tutoie déjà l’auteur (« Indique »).',
  ],
  [
    'explain:secRelaisLine',
    'Décrit le cas où PLUSIEURS coureurs sont sur la même boucle. « Vous êtes ' +
      'plusieurs » est le sujet même de la règle expliquée.',
  ],
  [
    'explain:qGroupLockA',
    'La défense collective se renforce avec le NOMBRE : « plus vous êtes ' +
      'nombreux » est la mécanique, pas une politesse.',
  ],
  [
    'rivalProfile:whatRivalry',
    'Une rivalité lie DEUX personnes : « la relation entre vous » désigne le ' +
      'couple observateur+rival. Au singulier, la phrase perd son objet.',
  ],
]);

/** Charge les 48 catalogues et rend `{ id, texte }` pour chaque entrée FR. */
async function toutesLesEntreesFr(): Promise<{ id: string; fr: string }[]> {
  const dir = new URL('./', import.meta.url);
  const out: { id: string; fr: string }[] = [];
  for (const file of Deno.readDirSync(dir)) {
    if (!file.isFile || !file.name.endsWith('.ts') || file.name.includes('.test.')) continue;
    const mod = (await import(new URL(file.name, dir).href)) as Record<string, unknown>;
    const catalogue = file.name.replace(/\.ts$/, '');
    for (const exported of Object.values(mod)) {
      if (typeof exported !== 'object' || exported === null) continue;
      for (const [cle, valeur] of Object.entries(exported as Record<string, unknown>)) {
        if (isEntry(valeur)) out.push({ id: `${catalogue}:${cle}`, fr: valeur.fr });
      }
    }
  }
  return out;
}

Deno.test('REGISTRE — le français TUTOIE, sur les 48 catalogues', async () => {
  const entrees = await toutesLesEntreesFr();
  // Filet : si le balayage ne charge plus rien, c'est le TEST qui est cassé et
  // il doit le dire, pas passer au vert sur zéro entrée.
  assert(entrees.length > 1000, `balayage suspect : ${entrees.length} entrées lues`);

  const fautes = entrees
    .filter((e) => frVouvoie(e.fr) && !PLURIEL_ASSUME.has(e.id))
    .map((e) => `  ${e.id} → « ${e.fr} »`);

  assertEquals(
    fautes.length,
    0,
    'VOUVOIEMENT en français (CLAUDE.md : le produit tutoie).\n' +
      'Si le « vous » est un PLURIEL RÉEL, inscris la clé dans PLURIEL_ASSUME\n' +
      'avec sa raison ; sinon, retutoie la phrase.\n' +
      fautes.join('\n'),
  );
});

Deno.test('REGISTRE — aucune exception ne survit à sa justification', async () => {
  const entrees = await toutesLesEntreesFr();
  const parId = new Map(entrees.map((e) => [e.id, e.fr]));
  for (const [id, raison] of PLURIEL_ASSUME) {
    const fr = parId.get(id);
    assert(fr !== undefined, `PLURIEL_ASSUME cite une clé qui n’existe plus : ${id}`);
    assert(
      frVouvoie(fr),
      `${id} ne vouvoie plus — retire l’exception (raison devenue caduque : ${raison})`,
    );
  }
});
