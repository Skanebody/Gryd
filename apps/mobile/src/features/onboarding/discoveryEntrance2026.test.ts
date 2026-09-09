/**
 * GRYD — G01 « Entrée dans GRYD » : la porte de compte existe, et elle n'est
 * pas un bouton mort.
 *
 * Le cahier de septembre décrit la composition de G01 : « une photo authentique
 * de sortie, une trace originale superposée avec parcimonie, promesse sur deux
 * lignes, bouton "Découvrir GRYD", accès "J'ai déjà un compte" ».
 *
 * ÉTAPE 0 — LE DÉFAUT EXISTAIT. Avant le 10/09/2026, `Discovery2026Screen.tsx`
 * ne rendait sur l'étape `welcome` que deux contrôles : le CTA principal
 * (« Explorer la carte ») et « Comment jouer ». Il n'existait AUCUN chemin écrit
 * vers `/sign-in` depuis le premier écran : celui qui réinstalle l'app ou change
 * de téléphone devait deviner qu'il fallait entrer dans la carte puis chercher
 * la connexion ailleurs. La copy, elle, existait déjà et n'était lue par
 * personne (`content.ts:383`, `SIGN_IN_DOOR = C.hookSignIn`) — une phrase
 * traduite en cinq langues sans écran derrière.
 *
 * Ce fichier lit le SOURCE. Il ne prouve pas le rendu (aucun React sous Deno) ;
 * il prouve qu'une propriété structurelle n'a pas disparu — exactement ce qu'une
 * capture d'écran ne peut pas garantir dans la durée.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

/** Source d'un fichier du dossier, commentaires RETIRÉS (la prose n'est pas du code). */
async function code(relPath: string): Promise<string> {
  const raw = await Deno.readTextFile(new URL(relPath, import.meta.url));
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

Deno.test('G01 — l’écran d’entrée porte un chemin écrit vers /sign-in', async () => {
  const src = await code('./Discovery2026Screen.tsx');
  assert(
    src.includes("router.push('/sign-in')"),
    'G01 exige un accès « J’ai déjà un compte » sur le premier écran. ' +
      'Sans lui, qui réinstalle l’app n’a aucune porte écrite vers son compte.',
  );
  assert(
    src.includes('SIGN_IN_DOOR'),
    'la copy de la porte vit dans le catalogue (5 langues), jamais en dur dans l’écran',
  );
});

Deno.test('G01 — la porte de compte n’est peinte que si un compte peut exister', async () => {
  const src = await code('./Discovery2026Screen.tsx');
  const door = src.slice(src.indexOf("router.push('/sign-in')") - 400, src.indexOf("router.push('/sign-in')"));
  assert(
    /welcome\s*&&\s*configured/.test(door),
    'constitution §2 (aucun bouton mort) : sans backend (O1), /sign-in redirige ' +
      'immédiatement vers la carte — la porte ne doit alors pas être peinte. ' +
      'Elle appartient aussi à la seule étape d’ENTRÉE, pas aux leçons.',
  );
  assert(
    src.includes("import { useSession }"),
    'la capacité se LIT (useSession().configured), elle ne se devine pas',
  );
});

Deno.test('G01 — en rejeu, le bouton principal ne promet pas d’explorer la carte', async () => {
  const src = await code('./Discovery2026Screen.tsx');
  const line = src.split('\n').find((l) => l.includes('const primaryLabel'));
  assert(line !== undefined, 'le libellé du CTA principal doit rester lisible d’un seul tenant');
  assert(
    /welcome\s*&&\s*!replay/.test(line),
    'ÉTAPE 0 : le libellé était `welcome || !progress.next && !replay`, donc en ' +
      'REJEU l’accueil annonçait « Explorer la carte » alors que la sortie ramène ' +
      'dans /parametres (cahier §9.3 : on revient d’où l’on vient).',
  );
});
