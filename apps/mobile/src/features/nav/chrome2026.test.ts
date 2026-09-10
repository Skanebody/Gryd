/**
 * GRYD : LA COUTURE DU CHROME (logo de carte, barre basse, pin, porte de compte).
 *
 * Même patron que `mvp/couture.test.ts` et `run/liveChain2026.test.ts` : ces
 * quatre défauts ne sont pas des erreurs de calcul, ce sont des BRANCHEMENTS.
 * Une barre montée par un écran au lieu du layout compile parfaitement ; un
 * disque translucide derrière un logo aussi ; un avis qui n'est pas un bouton
 * n'a jamais fait échouer un test unitaire. Aucun module pur ne peut les
 * attraper, parce que la faute est dans le rendu, pas dans la logique.
 *
 * ÉTAPE 0 : chacune des règles ci-dessous cite le code EXACT qu'elle aurait
 * fait échouer le 10/09/2026 au matin, avec son fichier, avant les retours du
 * fondateur sur son iPhone.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { NAV_BAR_HEIGHT, NAV_MAP_BAR_HEIGHT, NAV_BOTTOM_GAP, NAV_MAP_BOTTOM_GAP, GRYD_NAV_BAR_HEIGHT } from './metrics.ts';

/** Source d'un fichier, commentaires retirés : ils CITENT les défauts corrigés. */
function code(relPath: string): string {
  return Deno.readTextFileSync(new URL(relPath, import.meta.url))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

// ════════════════════════════════════════════════════════════════════════════
// (i) LE LOGO : le G, chartreuse, sur la carte. Rien derrière.
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `MapHome.tsx` rendait
 *   <View style={s.brand}><MapTranslucent2026 tone="dark" radius={22} />…
 * soit un disque translucide de 44 pt sous le G, qui le faisait lire comme un
 * quatrième bouton de carte. Demande fondateur : « le logo sur la map doit être
 * chartreuse sur fond transparent, juste le G ».
 */
Deno.test('carte : le logo est le G chartreuse, sans socle translucide', () => {
  const map = code('../refonte/MapHome.tsx');
  const brand = map.slice(map.indexOf('style={s.brand}'), map.indexOf('style={s.brand}') + 200);
  assert(brand.length > 0, 'le bloc de marque doit exister');
  assert(!brand.includes('MapTranslucent2026'), 'plus aucun socle derrière la marque');
  assert(brand.includes('GrydMark') && brand.includes('c.accent'),
    'le G reste peint, et il est chartreuse (token, jamais un hex)');
  const style = map.match(/brand: \{[^}]*\}/)?.[0] ?? '';
  assert(style.length > 0, 'le style de la marque doit exister');
  assert(!style.includes('borderRadius'), 'un rayon sans fond ne décrit plus rien : il a disparu avec le socle');
  assert(style.includes('width: 44') && style.includes('height: 44'),
    'la zone de 44 pt reste : même position, même place pour un futur appui');
});

// ════════════════════════════════════════════════════════════════════════════
// (ii) LA BARRE : une seule, montée par le layout, sur les cinq routes.
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `app/(tabs)/_layout.tsx` faisait
 *   {pathname === '/' ? null : <GrydNavBar />}
 * parce que `MapHome.tsx` montait la SIENNE, avec l'action Courir intégrée. Les
 * autres onglets recevaient donc une barre différente, sans départ possible.
 */
Deno.test('barre : le layout d’onglets la monte pour TOUTES les routes du groupe', () => {
  const layout = code('../../../app/(tabs)/_layout.tsx');
  assert(!/pathname === '\/'\s*\?\s*null/.test(layout),
    'la Carte ne se voit plus refuser la barre du layout');
  assert(layout.includes('<GrydNavBar />'), 'la barre est montée, sans condition');
  assert(!/usePathname/.test(layout),
    'le layout n’a plus de raison de lire le chemin : la barre s’en charge');
});

Deno.test('barre : la Carte ne monte plus la sienne', () => {
  const map = code('../refonte/MapHome.tsx');
  assert(!map.includes('<GrydNavBar'), 'une seule barre dans l’app, et elle vient du layout');
  assert(!map.includes("from '../nav/GrydNavBar'"), 'l’import doit disparaître avec le rendu');
});

Deno.test('barre : elle calcule elle-même l’action, elle ne l’attend plus d’un écran', () => {
  const bar = code('./GrydNavBar.tsx');
  assert(bar.includes('useRunAction2026(pathname)'),
    'le libellé Courir/Rouler/Reprendre se dérive dans la barre');
  assert(!bar.includes('mapAction'),
    'plus de prop d’action : un écran ne peut plus l’oublier, ni en passer une autre');
  assert(!bar.includes('overMap'),
    'plus de barre « au-dessus de la carte » : il n’y a qu’une apparence');
});

/**
 * ÉTAPE 0 : deux jeux de mesures cohabitaient (54/22 pour la barre claire,
 * 60/16 pour le dock de carte). Deux constantes qui divergent, ce sont deux
 * barres qui reviennent par la porte de derrière.
 */
Deno.test('barre : une seule hauteur, un seul dégagement, pour toute l’app', () => {
  assertEquals(NAV_BAR_HEIGHT, NAV_MAP_BAR_HEIGHT, 'une seule hauteur de barre');
  assertEquals(NAV_BOTTOM_GAP, NAV_MAP_BOTTOM_GAP, 'un seul écart au bas de l’écran');
  assertEquals(GRYD_NAV_BAR_HEIGHT, NAV_BAR_HEIGHT, 'la constante publique EST la mesure rendue');
});

/**
 * ÉTAPE 0 : `MapHome` calculait son dégagement bas avec les mesures « map »
 * pendant que `TabScreen`/`StackScreen` utilisaient les mesures « regular ».
 * Les deux doivent lire la même barre, sinon un contenu passe dessous.
 */
Deno.test('barre : le contenu des onglets dégage la barre par la constante de la barre', () => {
  const metrics = code('./metrics.ts');
  assert(metrics.includes('TAB_CONTENT_BOTTOM_CLEARANCE =\n  GRYD_NAV_BAR_HEIGHT + GRYD_NAV_BOTTOM_GAP'),
    'le dégagement se DÉRIVE de la hauteur de la barre, il ne la recopie pas');
  const map = code('../refonte/MapHome.tsx');
  assert(map.includes('GRYD_NAV_BOTTOM_GAP + GRYD_NAV_BAR_HEIGHT'),
    'la carte pose ses contrôles au-dessus de LA barre, pas d’une mesure jumelle');
});

// ════════════════════════════════════════════════════════════════════════════
// (iii) LE PIN : ma position n'est plus un point anonyme.
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `markers={position ? [{ id: 'me', …, children: <View style={[s.positionHalo…`
 * peignait un disque de 13 pt. Demande fondateur : une forme de pin, avec la
 * photo de profil dedans.
 */
Deno.test('carte : « moi » est un pin avec ma photo, plus un point chartreuse', () => {
  const map = code('../refonte/MapHome.tsx');
  assert(map.includes("from '../../ui/game/MePinMarker2026'"), 'le pin est importé');
  assert(map.includes('<MePinMarker2026'), 'et rendu comme marker « me »');
  assert(!map.includes('s.positionDot') && !map.includes('s.positionHalo'),
    'l’ancien point ne survit pas en doublon');
  assert(map.includes('profile.avatarUri'),
    'la photo vient de la source de profil qui existe déjà, sans nouveau champ');
});

/**
 * ÉTAPE 0 (celle qui compte pour un pin) : `RealMap` ancre le contenu d'un
 * marker sur son CENTRE. Un pin dessiné sans compensation affiche donc la
 * position une demi-hauteur trop haut. La compensation vit DANS le composant,
 * pour qu'aucun appelant ne puisse l'oublier.
 */
Deno.test('pin : la pointe tombe sur la coordonnée, pas le centre du dessin', () => {
  const pin = code('../../ui/game/MePinMarker2026.tsx');
  assert(pin.includes('translateY: -ME_PIN_HEIGHT / 2'),
    'le marker est remonté d’une demi-hauteur : sa pointe EST le point');
  const native = code('../../ui/game/RealMapNative.tsx');
  assert(native.includes('anchor={{ x: 0.5, y: 0.5 }}'),
    'si l’ancrage natif changeait, la compensation ci-dessus deviendrait fausse');
  const web = code('../../ui/game/RealMap.web.tsx');
  assert(web.includes("anchor: 'center'"), 'même ancrage sur le fork web');
});

Deno.test('pin : sans photo une initiale, sans compte le G, jamais un vide', () => {
  const pin = code('../../ui/game/MePinMarker2026.tsx');
  assert(pin.includes('hasPhoto'), 'la photo est un cas, pas une hypothèse');
  assert(pin.includes('GrydMark'), 'le repli d’un invité est la marque, pas un placeholder gris');
  assert(pin.includes('colors.chartreuse'), 'le liseré du pin est chartreuse par token');
  assert(!/#[0-9a-fA-F]{6}/.test(pin), 'aucun hex en dur (ADR-008)');
  const map = code('../refonte/MapHome.tsx');
  assert(map.includes("session ? effectiveInitials(profile) : ''"),
    'un invité n’a pas d’initiale : il ne doit pas hériter du pseudo de repli');
});

// ════════════════════════════════════════════════════════════════════════════
// (iv) LA PORTE DE COMPTE : elle existe sur la carte, sans ouvrir de feuille.
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 (P0 fondateur) : « je ne suis pas connecté, l'app s'ouvre sur la
 * carte, on me dit de me connecter mais je n'ai aucun moyen de créer mon
 * compte ». C'était exact : l'avis « Connecte-toi pour voir les terrains de ton
 * compte. » était un `<View>` (donc rien à taper), et la seule porte vers
 * /sign-in vivait dans la feuille « Couches », derrière deux gestes.
 */
Deno.test('carte : « Créer mon compte » est sur la carte, et c’est un vrai bouton', () => {
  const map = code('../refonte/MapHome.tsx');
  assert(/text\('Créer mon compte/.test(map),
    'le libellé FR commence par « Créer mon compte »');
  const card = map.slice(map.indexOf('accountDoorOpen ?'), map.indexOf('</View> : null}'));
  assert(card.includes("router.push('/sign-in')"), 'la porte mène à /sign-in');
  assert(card.includes('accessibilityRole="button"'), 'un avis ne suffit pas : c’est un bouton');
  assert(card.includes('ou me connecter'), 'et le sous-titre garde l’autre chemin');
  assert(card.includes('Serveur non configuré sur ce build'),
    'sans backend on DIT pourquoi la porte n’est pas franchissable, on ne la cache pas');
});

Deno.test('carte : la porte se ferme pour la session, jamais pour toujours', () => {
  const map = code('../refonte/MapHome.tsx');
  assert(map.includes('let accountDoorDismissed2026 = false'),
    'la fermeture vit en mémoire de session');
  assert(!map.includes('AsyncStorage'),
    'rien n’est persisté : au prochain lancement, la porte est là de nouveau');
  assert(map.includes('accountDoorDismissed2026 = true'), 'et la fermeture est bien enregistrée');
});

Deno.test('carte : la porte de la feuille « Couches » reste, elle aussi', () => {
  const map = code('../refonte/MapHome.tsx');
  const sheet = map.slice(map.indexOf('<Modal'));
  assert(sheet.includes("router.push('/sign-in')"),
    'le chemin historique vers le compte ne disparaît pas avec le nouveau');
});
