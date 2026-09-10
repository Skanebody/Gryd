/**
 * GRYD — LA COUTURE DU PARTAGE EN UN GESTE.
 *
 * Un modèle pur vert ne prouve rien si aucun écran ne l'appelle. Ces tests
 * relisent les SOURCES des deux portes de partage (fin de sortie, détail d'une
 * sortie du journal) et le manifeste, et refusent les régressions qui ne se
 * voient pas à la compilation : un bouton qui repart vers l'écran Studio, une
 * feuille montée en permanence, un schéma déclaré d'un seul côté.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { DECLARED_QUERIES } from './shareTargets.ts';

const RESULT = Deno.readTextFileSync(new URL('../refonte/RunResult.tsx', import.meta.url));
const DETAIL = Deno.readTextFileSync(new URL('../../../app/course/[id].tsx', import.meta.url));
const SHEET = Deno.readTextFileSync(new URL('./QuickShareSheet2026.tsx', import.meta.url));
const APP_JSON = JSON.parse(
  Deno.readTextFileSync(new URL('../../../app.json', import.meta.url)),
) as { expo: { ios?: { infoPlist?: Record<string, unknown> } } };

const PORTES: readonly (readonly [string, string])[] = [
  ['fin de sortie', RESULT],
  ['détail d’une sortie', DETAIL],
];

// ─── 1. LES DEUX PORTES OUVRENT LA FEUILLE, PAS UN ÉCRAN ────────────────────

Deno.test('les DEUX portes de partage ouvrent la feuille courte', () => {
  // ÉTAPE 0 (mesurée le 10/09/2026) : les deux écrans faisaient
  // `if (armed) router.push('/partage')`, c'est-à-dire une NAVIGATION vers le
  // Studio, ses quatre familles et ses cinq compositions, avant qu'une seule
  // image ne parte. C'est ce que la demande fondateur appelait « pas facile ».
  for (const [nom, src] of PORTES) {
    assert(src.includes('QuickShareSheet2026'), `${nom} : la feuille courte n’est pas montée`);
    assert(src.includes('setSharing('), `${nom} : le partage n’ouvre pas la feuille`);
  }
});

Deno.test('le tap « Partager » ne pousse plus l’écran Studio', () => {
  // La régression exacte à empêcher : quelqu'un remet `router.push('/partage')`
  // dans le gestionnaire du bouton, et le geste court disparaît sans qu'aucun
  // type ne bronche. `openStudio` a le droit de le faire — lui seul.
  for (const [nom, src] of PORTES) {
    const pushes = [...src.matchAll(/([\w]+)\s*=\s*\(\)\s*=>\s*\{[^}]*router\.push\('\/partage'\)/g)];
    for (const match of pushes) {
      assertEquals(match[1], 'openStudio', `${nom} : « ${match[1]} » pousse /partage au lieu d’ouvrir la feuille`);
    }
    assert(src.includes("openStudio"), `${nom} : le Studio n’est plus atteignable du tout`);
  }
});

Deno.test('la feuille n’est montée QUE si une sortie est armée', () => {
  // Son étage d'export rend l'affiche hors écran à pleine largeur : le monter
  // en permanence sous chaque écran de résultat coûterait un rendu complet à
  // chaque affichage, pour rien.
  for (const [nom, src] of PORTES) {
    assert(
      /\{sharing (\?|&&)[\s\S]{0,120}QuickShareSheet2026/.test(src),
      `${nom} : la feuille est montée sans condition d’armement`,
    );
  }
});

Deno.test('l’armement RESTE gardé par le propriétaire de la sortie', () => {
  // `setShareRun` refuse une sortie qui n'appartient pas au compte courant. La
  // feuille ne doit s'ouvrir que si l'armement a ABOUTI, sinon elle afficherait
  // l'affiche d'une sortie que le studio, lui, refuserait de composer.
  for (const [nom, src] of PORTES) {
    assert(src.includes('setShareRun('), `${nom} : plus d’armement du tout`);
    assert(
      /return setShareRun\(data, \{[^}]*\}\) \? data : null;/.test(src),
      `${nom} : l’armement n’est plus la condition d’ouverture de la feuille`,
    );
  }
});

// ─── 2. CE QUE LA FEUILLE PEINT, ET CE QU'ELLE NE PEINT PAS ─────────────────

Deno.test('la feuille dérive ses actions de la capacité, jamais d’une intention', () => {
  assert(SHEET.includes('quickShareActions2026'), 'les actions ne sont pas dérivées');
  assert(SHEET.includes('getRunFilmCompatibility2026'), 'la capacité vidéo n’est pas mesurée');
  // Le bouton vidéo est gardé par la liste d'actions, pas par un booléen local
  // qu'on pourrait oublier de recalculer au changement de format.
  assert(SHEET.includes("actions.includes('film')"), 'le bouton vidéo n’est pas gardé par la capacité');
});

Deno.test('aucun raccourci « Instagram » n’est peint tant qu’aucun pont ne livre l’image', () => {
  // Le verrou est documenté dans app.json et dans shareTargets.ts : ouvrir
  // `instagram-stories://` sans déposer l'image sur UIPasteboard sous ses types
  // propriétaires ouvre Instagram SANS l'image. Un bouton qui promet un partage
  // et livre autre chose est exactement le « bouton mort » de la constitution.
  assert(!SHEET.includes('instagram-stories://'), 'la feuille ouvre Instagram sans pouvoir lui remettre l’image');
  assert(!/snssdk|tiktok:\/\//i.test(SHEET), 'la feuille ouvre TikTok sans son SDK natif');
});

Deno.test('chaque événement de jeu a sa réponse physique (L6)', () => {
  assert(SHEET.includes("from 'expo-haptics'"), 'aucun retour haptique');
  // Un simple import ne suffit pas : le succès d'un partage doit être plus
  // marqué qu'un changement d'option.
  assert(SHEET.includes('ImpactFeedbackStyle.Medium'), 'la remise réussie n’a pas de retour appuyé');
});

Deno.test('la feuille n’écrit aucune couleur en dur (ADR-008)', () => {
  // Toute couleur vient de `refonteColors`, importé de @klaim/shared.
  const hexes = [...SHEET.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((match) => match[0]);
  assertEquals(hexes, [], `couleurs en dur dans la feuille : ${hexes.join(', ')}`);
  assert(SHEET.includes("refonteColors as c"), 'les tokens ne sont pas importés');
});

Deno.test('les deux cadres se distinguent AUSSI par un motif, pas seulement par un mot (L15)', () => {
  // Story et Carré portent chacun une vignette dont les proportions sont celles
  // du cadre : la différence se voit sans lire, et sans distinguer les teintes.
  assert(SHEET.includes('ratioStory') && SHEET.includes('ratioSquare'), 'les cadres n’ont pas de motif');
});

// ─── 3. LE MANIFESTE ────────────────────────────────────────────────────────

Deno.test('LSApplicationQueriesSchemes déclare instagram-stories et instagram', () => {
  // Décision fondateur du 10/09/2026. Sans cette déclaration,
  // `Linking.canOpenURL('instagram-stories://…')` répond `false` MÊME quand
  // Instagram est installé : aucune sonde iOS ne pourrait rien mesurer.
  const declared = APP_JSON.expo.ios?.infoPlist?.LSApplicationQueriesSchemes;
  assert(Array.isArray(declared), 'app.json ne déclare aucun LSApplicationQueriesSchemes');
  assertEquals([...(declared as string[])].sort(), ['instagram', 'instagram-stories']);
});

Deno.test('le manifeste et le module de destinations ne peuvent pas diverger', () => {
  // La même garde que `shareTargets.test.ts`, répétée ici parce que c'est CE
  // lot qui a introduit la déclaration : modifier l'un sans l'autre ferait
  // mentir la sonde dans un sens ou dans l'autre.
  const declared = (APP_JSON.expo.ios?.infoPlist?.LSApplicationQueriesSchemes ?? []) as string[];
  assertEquals([...DECLARED_QUERIES.ios].sort(), [...declared].sort());
});

Deno.test('déclarer un schéma n’ajoute AUCUNE collecte au manifeste de confidentialité', () => {
  // Sonder un schéma d'URL n'est pas une collecte de données : rien ne doit
  // bouger côté `privacyManifests`, et surtout pas un domaine de tracking.
  const raw = Deno.readTextFileSync(new URL('../../../app.json', import.meta.url));
  assert(raw.includes('"NSPrivacyTracking": false'), 'le manifeste ne dit plus « aucun tracking »');
  assert(raw.includes('"NSPrivacyTrackingDomains": []'), 'un domaine de tracking est apparu');
});
