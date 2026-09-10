/**
 * GRYD — LES DEUX BOUTONS APPLE DISENT LE MÊME MOT (lot 9).
 *
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT, ET IL ÉTAIT DÉJÀ À MOITIÉ CORRIGÉ ────────
 * Le 10/09/2026, `app/(auth)/sign-in.tsx` est passé de
 * `AppleAuthenticationButtonType.SIGN_IN` à `CONTINUE`, pour une raison écrite
 * dans son entête : iOS rendait « Se connecter avec Apple » sur la seule porte
 * de l'app, donc le système lui-même répétait au nouveau joueur qu'il fallait
 * déjà avoir un compte. Or l'ONBOARDING peint son propre bouton natif
 * (`features/onboarding/AppleButton.tsx`), et il est resté sur :
 *
 *   buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
 *
 * C'est-à-dire l'écran qui s'adresse le PLUS sûrement à quelqu'un sans compte.
 * Deux libellés système pour un geste unique — Apple crée le compte au premier
 * passage — et la seule preuve tenait dans une ligne de source que personne ne
 * lisait. Ce test la lit.
 *
 * ─── CE QU'IL NE PROUVE PAS ─────────────────────────────────────────────────
 * Ni le rendu, ni la traduction : « Continuer avec Apple » est écrit par iOS,
 * jamais par nous. Il prouve qu'on demande le bon type, dans les DEUX fichiers.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const SRC = {
  onboarding: new URL('./AppleButton.tsx', import.meta.url),
  signIn: new URL('../../../app/(auth)/sign-in.tsx', import.meta.url),
} as const;

/** Le code hors commentaires : l'entête des deux fichiers CITE « SIGN_IN ». */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('{/*') && !l.trim().startsWith('*'))
    .join('\n');
}

function lire(url: URL): string {
  const brut = Deno.readTextFileSync(url);
  // Un chemin faux rendrait les deux règles vertes sans rien vérifier.
  assert(brut.length > 400, `source introuvable ou vide : ${url.pathname}`);
  return codeSeul(brut);
}

Deno.test('aucun bouton Apple ne demande le type SIGN_IN', () => {
  for (const [nom, url] of Object.entries(SRC)) {
    const src = lire(url);
    assert(
      /AppleAuthenticationButtonType\./.test(src),
      `${nom} : plus aucun type de bouton Apple n’est demandé`,
    );
    // ÉTAPE 0, mot pour mot, dans features/onboarding/AppleButton.tsx.
    assert(
      !/AppleAuthenticationButtonType\.SIGN_IN/.test(src),
      `${nom} : iOS rendra « Se connecter avec Apple » à quelqu’un qui n’a pas de compte`,
    );
  }
});

Deno.test('les deux boutons demandent CONTINUE, le type d’un flux qui crée OU connecte', () => {
  for (const [nom, url] of Object.entries(SRC)) {
    assert(
      /AppleAuthenticationButtonType\.CONTINUE/.test(lire(url)),
      `${nom} : le type attendu est CONTINUE`,
    );
  }
});
