/**
 * GRYD — LE REFUS D'ÂGE EST UN MUR, PAS UNE SUGGESTION.
 *
 * ÉTAPE 0 — LE DÉFAUT EXISTAIT, et il était visible à l'œil nu. Les deux portes
 * de compte affichaient « GRYD n'est pas accessible avant 16 ans » puis, DANS LE
 * MÊME PANNEAU, juste dessous :
 *
 *     <Button label={t(C.guestCta)} onPress={guest} … />   // « Continuer sans compte »
 *     const guest = () => { … router.replace('/'); };
 *
 * — c'est-à-dire toute l'app, en un geste. Et le refus ne vivait que dans un
 * `useState(false)` : relancer l'application l'effaçait.
 *
 * Ces tests lisent le SOURCE. Ils ne prouvent pas le rendu (aucun React sous
 * Deno) ; ils prouvent qu'une propriété structurelle n'a pas disparu — et
 * chacune des trois a réellement manqué dans ce dépôt.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const PORTES = [
  { nom: 'AuthEntry2026.tsx', url: new URL('./AuthEntry2026.tsx', import.meta.url) },
  { nom: 'app/(auth)/email.tsx', url: new URL('../../../app/(auth)/email.tsx', import.meta.url) },
] as const;

/** Le code hors commentaires — citer un défaut dans une prose ne le recrée pas. */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('{/*') && !l.trim().startsWith('*'))
    .join('\n');
}

async function source(url: URL): Promise<string> {
  return codeSeul(await Deno.readTextFile(url));
}

Deno.test('le mur d’âge n’offre AUCUNE sortie vers la carte', async () => {
  for (const porte of PORTES) {
    const src = await source(porte.url);
    const premierBouton = src.indexOf('guestCta');
    assert(premierBouton > 0, `${porte.nom} : la sortie visiteur a disparu de l’écran`);
    const murAbord = src.indexOf('declined');
    assert(
      murAbord >= 0 && murAbord < premierBouton,
      `${porte.nom} : le mur doit être TRANCHÉ avant que « Continuer sans compte » ` +
        `soit peint — sinon la phrase et le bouton se contredisent dans le même panneau.`,
    );
  }
});

Deno.test('« Continuer sans compte » REFUSE de partir quand le mur est posé', async () => {
  // La garde de rendu suffit à l'œil ; celle-ci suffit tout court. Un bouton
  // qu'un futur remaniement de JSX repeindrait par mégarde ne rouvrirait pas
  // l'app pour autant : c'est la FONCTION qui refuse.
  for (const porte of PORTES) {
    const src = await source(porte.url);
    const guest = src.slice(src.indexOf('const guest = ()'));
    const corps = guest.slice(0, guest.indexOf('};') + 2);
    assert(
      /if\s*\([^)]*[dD]eclined[^)]*\)\s*return;/.test(corps),
      `${porte.nom} : \`guest()\` doit sortir sans naviguer quand le refus d'âge est posé`,
    );
  }
});

Deno.test('le mur d’âge a UNE issue, et elle revient à la question', async () => {
  for (const porte of PORTES) {
    const src = await source(porte.url);
    assert(
      src.includes('AGE.notMe'),
      `${porte.nom} : sans « Ce n'est pas moi », qui tape à côté est enfermé pour de bon`,
    );
    assert(
      /ageDeclined:\s*false/.test(src),
      `${porte.nom} : l'issue doit RÉVOQUER le refus persisté, pas seulement masquer le mur`,
    );
  }
});

Deno.test('le refus d’âge est PERSISTÉ, pas gardé dans un état d’écran', async () => {
  for (const porte of PORTES) {
    const src = await source(porte.url);
    assert(
      /update\(\{[^}]*ageDeclined:\s*true/.test(src),
      `${porte.nom} : le refus doit partir dans le stockage d'onboarding`,
    );
    assert(
      !/useState\(false\)[^\n]*ageDeclined|const \[ageDeclined/.test(src),
      `${porte.nom} : un refus tenu dans un useState disparaît au redémarrage`,
    );
    assert(
      src.includes('onboarding.ageDeclined'),
      `${porte.nom} : le mur se LIT depuis le stockage, il ne se re-devine pas`,
    );
  }
});

Deno.test('le mur ne clignote pas : rien n’est peint tant que le stockage n’a pas répondu', async () => {
  for (const porte of PORTES) {
    const src = await source(porte.url);
    assert(
      /onboardingStatus === 'reading'/.test(src),
      `${porte.nom} : sans cet état, un refus relu depuis le disque laisserait les ` +
        `méthodes de connexion peintes pendant quelques centaines de millisecondes`,
    );
  }
});

Deno.test('« Continuer sans compte » rend la main — sinon tout l’écran meurt', async () => {
  // ÉTAPE 0 : `guest()` posait `inFlight.current = true` et ne le remettait
  // jamais à `false`. Sur react-native-web, l'écran remplacé reste monté : en y
  // revenant, `finish()`, `guest()` et la porte e-mail sortaient tous sur leur
  // premier test. Zéro bouton vivant, aucun message.
  for (const porte of PORTES) {
    const src = await source(porte.url);
    const guest = src.slice(src.indexOf('const guest = ()'));
    const corps = guest.slice(0, guest.indexOf('};') + 2);
    assert(corps.includes("router.replace('/')"), `${porte.nom} : la sortie visiteur doit mener à la carte`);
    assert(
      corps.includes('inFlight.current = false'),
      `${porte.nom} : \`inFlight\` doit être rendu après la navigation`,
    );
  }
});
