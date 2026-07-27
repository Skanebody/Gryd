/**
 * GRYD — LES RACCOURCIS RÉSEAU PEUVENT-ILS MENTIR ?
 *
 * `shareTargets.ts` est le seul endroit qui décide si un bouton « Instagram »
 * a le droit d'exister. S'il se trompe, la faute n'est pas cosmétique : c'est
 * exactement le bouton mort que la constitution §2 interdit. Ce test attaque
 * donc le module par les quatre chemins où il pourrait se mettre à mentir, du
 * plus grave au plus discret :
 *   1. peindre une cible NATIVE sur le web (elle échouerait TOUJOURS) ;
 *   2. peindre une cible dont la sonde `canOpenURL` ne peut RIEN dire, parce
 *      que le schéma n'est pas déclaré au manifeste — conclure d'une mesure
 *      qui n'a pas eu lieu ;
 *   3. peindre une cible joignable mais à qui on ne peut RIEN remettre (app
 *      ouverte, image restée derrière) ;
 *   4. rendre une liste vide, ou un ordre qui bouge — l'écran n'aurait alors
 *      plus rien à peindre, ou plus rien d'apprenable.
 * Plus la garde anti-dérive qui compte le plus sur la durée : `DECLARED_QUERIES`
 * est relu CONTRE `app.json`. Le jour où quelqu'un ajoute un schéma d'un seul
 * côté, ce test tombe — c'est tout l'intérêt.
 */
import { assert, assertEquals, assertStrictEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  DECLARED_QUERIES,
  pillDestinations,
  resolveShareTargets,
  SHARE_MEDIA_KINDS,
  SHARE_TARGET_ORDER,
  type PayloadBridgeId,
  type ResolveShareTargetsInput,
  type ShareMediaKind,
  type SharePlatform,
  type ShareTargetId,
} from './shareTargets.ts';

const PLATFORMS: readonly SharePlatform[] = ['ios', 'android', 'web'];
const NATIVE_TARGETS: readonly ShareTargetId[] = ['instagram', 'tiktok'];
const ALL_BRIDGES: readonly PayloadBridgeId[] = [
  'ios_instagram_pasteboard',
  'android_story_intent',
  'tiktok_open_sdk',
];
/** Tout ce qui pourrait être déclaré un jour — sert à FORCER le pire des cas. */
const EVERY_PROBE_VALUE: readonly string[] = [
  'instagram-stories',
  'com.instagram.android',
  'snssdk1233',
  'com.zhiliaoapp.musically',
];
/** Une sonde qui répond OUI à tout : le scénario le plus permissif possible. */
const ALL_PROBES_TRUE: Record<string, boolean> = Object.fromEntries(
  EVERY_PROBE_VALUE.map((v) => [v, true]),
);

/** Le monde le plus favorable imaginable — tout déclaré, tout installé, tout ponté. */
function permissive(over: Partial<ResolveShareTargetsInput>): ResolveShareTargetsInput {
  return {
    platform: 'ios',
    media: 'story_image',
    text: 'GRYD — +47 zones',
    probes: ALL_PROBES_TRUE,
    bridges: ALL_BRIDGES,
    declaredQueries: EVERY_PROBE_VALUE,
    iosSourceApplication: '1234567890',
    ...over,
  };
}

const ids = (r: ReturnType<typeof resolveShareTargets>) => r.targets.map((t) => t.id);

// ─── 1. LE WEB NE PEINT JAMAIS UNE CIBLE NATIVE ─────────────────────────────
// La faute la plus grave : sur le web, `instagram-stories://` n'ouvre rien et
// TikTok n'a pas de SDK. Un tel bouton échouerait TOUJOURS. On le vérifie dans
// le monde le PLUS permissif possible — si la garde n'était qu'un `if` sur les
// sondes, elle tomberait ici.

Deno.test('web : aucune cible native, même tout déclaré / tout installé / tout ponté', () => {
  for (const media of SHARE_MEDIA_KINDS) {
    const res = resolveShareTargets(permissive({ platform: 'web', media }));
    for (const native of NATIVE_TARGETS) {
      assert(
        !ids(res).includes(native),
        `web + ${media} : « ${native} » ne doit JAMAIS être peint (${ids(res).join(', ')})`,
      );
      assertEquals(
        res.omitted.find((o) => o.id === native)?.reason,
        'no_channel_on_platform',
        `web : « ${native} » doit être écarté pour absence STRUCTURELLE de canal`,
      );
    }
  }
});

Deno.test('web : rien ne remet un fichier — l’écran ne peut pas y promettre l’image', () => {
  for (const media of SHARE_MEDIA_KINDS) {
    const res = resolveShareTargets(permissive({ platform: 'web', media }));
    for (const t of res.targets) {
      assertEquals(
        t.fileHandoff,
        false,
        `web + ${media} : « ${t.id} » prétend porter un fichier alors que openShareSheet dégrade en texte`,
      );
    }
  }
});

// ─── 2. UNE SONDE NON DÉCLARÉE NE PROUVE RIEN ───────────────────────────────
// Le piège central du chantier : sur iOS, `canOpenURL` d'un schéma absent de
// LSApplicationQueriesSchemes renvoie `false` MÊME si l'app est installée. Un
// `true` passé ici serait donc une réponse impossible — le module doit refuser
// de s'en servir, et écarter pour « on ne sait pas », pas pour « absent ».

Deno.test('sonde non déclarée : la cible n’est jamais peinte, même si les probes disent oui', () => {
  for (const platform of ['ios', 'android'] as const) {
    const res = resolveShareTargets(
      permissive({ platform, media: 'story_image', declaredQueries: [] }),
    );
    for (const native of NATIVE_TARGETS) {
      assert(!ids(res).includes(native), `${platform} : « ${native} » peint sans déclaration`);
    }
    assertEquals(
      res.omitted.find((o) => o.id === 'instagram')?.reason,
      'probe_not_declared',
      `${platform} : la raison doit dire « non déclarée », pas « absente » — ce n’est pas la même chose`,
    );
  }
});

Deno.test('sonde déclarée mais sans réponse : « pas encore mesuré » vaut non', () => {
  const res = resolveShareTargets(
    permissive({ platform: 'ios', probes: {} }), // aucune réponse encore revenue
  );
  assert(!ids(res).includes('instagram'));
  assertEquals(res.omitted.find((o) => o.id === 'instagram')?.reason, 'probe_missing');
});

Deno.test('sonde déclarée qui répond non : app absente, et on le dit ainsi', () => {
  const res = resolveShareTargets(
    permissive({ platform: 'ios', probes: { ...ALL_PROBES_TRUE, 'instagram-stories': false } }),
  );
  assert(!ids(res).includes('instagram'));
  assertEquals(res.omitted.find((o) => o.id === 'instagram')?.reason, 'app_absent');
});

// ─── 3. JOIGNABLE ≠ LIVRABLE ────────────────────────────────────────────────
// Le mensonge discret : Instagram installé, schéma déclaré… et l'image reste
// derrière parce qu'aucun pont ne sait la déposer. Le bouton « ouvre Instagram »
// en promettant « partage sur Instagram ».

Deno.test('aucun pont natif : la cible reste écartée, app installée ou non', () => {
  for (const platform of ['ios', 'android'] as const) {
    const res = resolveShareTargets(permissive({ platform, bridges: [] }));
    for (const native of NATIVE_TARGETS) {
      assert(!ids(res).includes(native), `${platform} : « ${native} » peint sans pont`);
      assertEquals(
        res.omitted.find((o) => o.id === native)?.reason,
        'no_payload_bridge',
        `${platform} : « ${native} » doit être écarté pour absence de pont`,
      );
    }
  }
});

Deno.test('pont iOS Instagram sans App ID : ce n’est pas un pont, c’est une ouverture à vide', () => {
  const res = resolveShareTargets(permissive({ platform: 'ios', iosSourceApplication: '   ' }));
  assert(!ids(res).includes('instagram'));
  assertEquals(res.omitted.find((o) => o.id === 'instagram')?.reason, 'no_payload_bridge');
});

Deno.test('tout réuni (déclaré + installé + ponté) : ALORS la cible peut être peinte', () => {
  // Le pendant indispensable des tests ci-dessus : sans lui, un module qui
  // n'affiche JAMAIS rien passerait toute la suite.
  const res = resolveShareTargets(permissive({ platform: 'ios', media: 'story_image' }));
  assert(ids(res).includes('instagram'), `attendu instagram peint, obtenu ${ids(res).join(', ')}`);
  const ig = res.targets.find((t) => t.id === 'instagram')!;
  assertEquals(ig.certainty, 'probed_installed');
  assertEquals(ig.fileHandoff, true);
  assertEquals(ig.open, {
    via: 'url',
    url: 'instagram-stories://share?source_application=1234567890',
  });
});

Deno.test('Android Instagram passe par une Intent, pas par un schéma d’URL', () => {
  const res = resolveShareTargets(permissive({ platform: 'android' }));
  const ig = res.targets.find((t) => t.id === 'instagram');
  assert(ig, 'instagram attendu peint sur android dans le monde permissif');
  assertEquals(ig.open, {
    via: 'android_intent',
    action: 'com.instagram.share.ADD_TO_STORY',
    androidPackage: 'com.instagram.android',
  });
});

Deno.test('TikTok ne se remet que par SDK natif — jamais par une URL', () => {
  for (const platform of ['ios', 'android'] as const) {
    const res = resolveShareTargets(permissive({ platform, media: 'post_image' }));
    const tk = res.targets.find((t) => t.id === 'tiktok');
    assert(tk, `tiktok attendu peint sur ${platform} dans le monde permissif`);
    assertEquals(tk.open, { via: 'native_sdk', sdk: 'tiktok_open_sdk' });
  }
});

// ─── 4. LA LISTE N'EST JAMAIS VIDE, ET L'ORDRE NE BOUGE PAS ─────────────────

Deno.test('la liste n’est jamais vide : « Plus » ferme toujours la marche', () => {
  for (const platform of PLATFORMS) {
    for (const media of SHARE_MEDIA_KINDS) {
      // Le monde le plus HOSTILE : rien de déclaré, rien d'installé, aucun
      // pont, aucun texte. C'est l'état réel du dépôt, poussé à l'extrême.
      const res = resolveShareTargets({ platform, media });
      assert(res.targets.length > 0, `${platform} + ${media} : liste vide`);
      assertEquals(
        res.targets[res.targets.length - 1].id,
        'more',
        `${platform} + ${media} : « Plus » doit fermer la rangée`,
      );
      assertEquals(res.targets.find((t) => t.id === 'more')?.certainty, 'os_provided');
    }
  }
});

Deno.test('ordre stable : toujours un sous-ensemble de SHARE_TARGET_ORDER, dans cet ordre', () => {
  assertEquals(SHARE_TARGET_ORDER, ['instagram', 'tiktok', 'whatsapp', 'more']);
  const worlds: ResolveShareTargetsInput[] = [];
  for (const platform of PLATFORMS) {
    for (const media of SHARE_MEDIA_KINDS) {
      worlds.push({ platform, media });
      worlds.push(permissive({ platform, media }));
    }
  }
  for (const w of worlds) {
    const got = ids(resolveShareTargets(w));
    const expected = SHARE_TARGET_ORDER.filter((id) => got.includes(id));
    assertEquals(got, expected, `ordre cassé pour ${w.platform}/${w.media} : ${got.join(', ')}`);
  }
});

Deno.test('chaque cible du catalogue est soit peinte soit écartée — exactement une fois', () => {
  for (const platform of PLATFORMS) {
    for (const media of SHARE_MEDIA_KINDS) {
      const res = resolveShareTargets(permissive({ platform, media }));
      const seen = [...res.targets.map((t) => t.id), ...res.omitted.map((o) => o.id)].sort();
      assertEquals(
        seen,
        [...SHARE_TARGET_ORDER].sort(),
        `${platform} + ${media} : une cible manque au rapport (ou y figure deux fois)`,
      );
    }
  }
});

// ─── 5. WHATSAPP : LE SEUL CANAL RÉELLEMENT OUVERT AUJOURD'HUI ──────────────

Deno.test('WhatsApp : peint sur les trois plateformes, mais UNIQUEMENT pour du texte', () => {
  for (const platform of PLATFORMS) {
    const withText = resolveShareTargets({ platform, media: 'text', text: 'Salut' });
    const wa = withText.targets.find((t) => t.id === 'whatsapp');
    assert(wa, `${platform} : WhatsApp attendu peint pour du texte`);
    assertEquals(wa.certainty, 'always_openable');
    assertEquals(wa.fileHandoff, false);
    assertEquals(wa.accepts, ['text']);

    for (const media of ['story_image', 'post_image', 'sticker_image'] as ShareMediaKind[]) {
      const res = resolveShareTargets({ platform, media, text: 'Salut' });
      assert(
        !ids(res).includes('whatsapp'),
        `${platform} + ${media} : wa.me ne porte pas de fichier, il ne doit pas être proposé`,
      );
      assertEquals(res.omitted.find((o) => o.id === 'whatsapp')?.reason, 'media_not_accepted');
    }
  }
});

Deno.test('WhatsApp : sans texte il n’y a rien à envoyer — pas de bouton', () => {
  for (const text of [undefined, '', '   ']) {
    const res = resolveShareTargets({ platform: 'web', media: 'text', text });
    assert(!ids(res).includes('whatsapp'), `texte « ${String(text)} » : WhatsApp ne doit pas être peint`);
    assertEquals(res.omitted.find((o) => o.id === 'whatsapp')?.reason, 'empty_payload');
  }
});

Deno.test('WhatsApp : le texte est encodé dans l’URL (& et espaces ne cassent pas le lien)', () => {
  const res = resolveShareTargets({
    platform: 'ios',
    media: 'text',
    text: '+47 zones & 4,4 km — https://gryd.run/z/republique',
  });
  const wa = res.targets.find((t) => t.id === 'whatsapp')!;
  assertEquals(wa.open.via, 'url');
  assert(wa.open.via === 'url');
  assertStrictEquals(
    wa.open.url,
    'https://wa.me/?text=' +
      encodeURIComponent('+47 zones & 4,4 km — https://gryd.run/z/republique'),
  );
  // Le « + » ne doit pas rester nu : WhatsApp le lirait comme un espace.
  assert(!wa.open.url.includes('?text=+47'), 'le + n’a pas été encodé');
});

Deno.test('WhatsApp : un texte joueur ne peut pas se substituer dans le gabarit', () => {
  // Le texte vient du joueur (légende éditable). S'il contenait un trou du
  // gabarit, une substitution en cascade fabriquerait une URL qu'on n'a pas
  // écrite. `encodeURIComponent` encode `{` et `}` — on le vérifie plutôt que
  // de le supposer.
  const res = resolveShareTargets({
    platform: 'web',
    media: 'text',
    text: '{sourceApplication}{text}',
  });
  const wa = res.targets.find((t) => t.id === 'whatsapp')!;
  assert(wa.open.via === 'url');
  assertStrictEquals(wa.open.url, 'https://wa.me/?text=%7BsourceApplication%7D%7Btext%7D');
});

// ─── 6. ANTI-DÉRIVE : LE MODULE DIT-IL LA VÉRITÉ SUR app.json ? ─────────────
// C'est la garde qui compte sur la durée. Ajouter LSApplicationQueriesSchemes
// à app.json sans le recopier ici ferait taire des cibles réellement joignables ;
// l'écrire ici sans app.json ferait sonder dans le vide et peindre des boutons
// morts. Les deux fautes tombent sur ce test.

const APP_JSON = JSON.parse(
  Deno.readTextFileSync(new URL('../../../app.json', import.meta.url)),
) as {
  expo: {
    ios?: { infoPlist?: Record<string, unknown> };
    android?: Record<string, unknown>;
  };
};

Deno.test('DECLARED_QUERIES.ios reflète exactement app.json → ios.infoPlist.LSApplicationQueriesSchemes', () => {
  const declared = APP_JSON.expo.ios?.infoPlist?.LSApplicationQueriesSchemes;
  const fromManifest: readonly string[] = Array.isArray(declared) ? (declared as string[]) : [];
  assertEquals(
    [...DECLARED_QUERIES.ios].sort(),
    [...fromManifest].sort(),
    'shareTargets.DECLARED_QUERIES.ios a dérivé de app.json — une sonde iOS ne peut RIEN dire d’un schéma non déclaré',
  );
});

Deno.test('DECLARED_QUERIES.android : rien ne peut être déclaré depuis app.json (config plugin requis)', () => {
  // `queries` n'existe pas dans le schéma de config Expo (vérifié dans
  // node_modules/@expo/config-types/build/ExpoConfig.d.ts) : tant qu'aucun
  // config plugin `withAndroidManifest` n'ajoute le bloc, la visibilité de
  // paquets (targetSdk ≥ 30) rend toute sonde de schéma tiers aveugle.
  assertEquals(
    APP_JSON.expo.android?.queries,
    undefined,
    'app.json déclare des `queries` Android : mettre DECLARED_QUERIES.android à jour et retirer cette garde',
  );
  assertEquals(DECLARED_QUERIES.android, []);
});

Deno.test('avec le manifeste RÉEL, aucune cible native n’est peinte — c’est l’état du dépôt', () => {
  for (const platform of PLATFORMS) {
    for (const media of SHARE_MEDIA_KINDS) {
      // Pas de `declaredQueries` : on prend le défaut, c'est-à-dire app.json.
      const res = resolveShareTargets({
        platform,
        media,
        text: 'GRYD',
        probes: ALL_PROBES_TRUE,
        bridges: ALL_BRIDGES,
        iosSourceApplication: '1234567890',
      });
      for (const native of NATIVE_TARGETS) {
        assert(
          !ids(res).includes(native),
          `${platform} + ${media} : « ${native} » peint alors que le manifeste ne déclare rien`,
        );
      }
    }
  }
});

// ─── 7. PURETÉ ET DÉTERMINISME ──────────────────────────────────────────────

Deno.test('déterministe : deux appels identiques rendent la même chose', () => {
  const input = permissive({ platform: 'android', media: 'post_image' });
  assertEquals(resolveShareTargets(input), resolveShareTargets(input));
});

Deno.test('module PUR : aucun import React / Expo / react-native', () => {
  // Même garde que clubExport.test.ts:152 — un import natif rendrait ce module
  // intestable en Deno et le sortirait du domaine des fonctions pures exigé par
  // la constitution. On relit la source plutôt que de le supposer.
  const src = Deno.readTextFileSync(new URL('./shareTargets.ts', import.meta.url));
  const imports = [...src.matchAll(/^\s*import\s[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1]);
  assertEquals(imports, [], `shareTargets.ts doit rester sans dépendance : ${imports.join(', ')}`);
  for (const forbidden of ['react', 'react-native', 'expo-linking', 'expo-sharing']) {
    assert(!src.includes(`'${forbidden}'`), `import interdit : ${forbidden}`);
  }
});

Deno.test('aucune grandeur de JEU ne se glisse dans un choix de réseau (anti pay-to-win §1.6)', () => {
  // Choisir Instagram plutôt que WhatsApp ne doit pouvoir donner ni territoire,
  // ni points, ni protection. Le module ne connaît que des schémas d'URL — on
  // relit la source pour que ça reste vrai.
  const src = Deno.readTextFileSync(new URL('./shareTargets.ts', import.meta.url));
  for (const forbidden of ['@klaim/shared', 'game-rules', 'hex_claims', 'pressure_score']) {
    assert(!src.includes(forbidden), `grandeur de jeu référencée dans shareTargets.ts : ${forbidden}`);
  }
});

// ─── 8. LA RANGÉE NE REFAIT PAS LE GESTE DU CTA (§A) ────────────────────────
// `app/partage.tsx` peint un CTA chartreuse qui ouvre la feuille système. Une
// pastille « Plus » en dessous appelle EXACTEMENT la même fonction : deux
// contrôles pour une seule action, ce que §A interdit — et ce que le fichier
// s'interdisait déjà pour « Autre app ». `pillDestinations` est la garde.

Deno.test('pillDestinations retire la feuille système : c’est le CTA lui-même', () => {
  const res = resolveShareTargets(permissive({ platform: 'ios', media: 'story_image' }));
  assert(ids(res).includes('more'), 'précondition : « Plus » est bien dans la résolution');
  const pills = pillDestinations(res.targets);
  assert(
    !pills.some((t) => t.id === 'more'),
    '« Plus » survit au filtre : le doublon du CTA chartreuse est de retour',
  );
});

Deno.test('sur le NATIF réel (manifeste du dépôt), il ne reste AUCUNE pastille', () => {
  // Le produit réel : media image sur iOS/Android, aucun pont embarqué, aucun
  // schéma déclaré. C'est le cas où la rangée se réduisait à une seule pastille
  // « Plus » sous un CTA qui fait la même chose.
  for (const platform of ['ios', 'android'] as const) {
    for (const media of ['story_image', 'post_image'] as const) {
      const res = resolveShareTargets({ platform, media, text: 'GRYD' });
      assertEquals(ids(res), ['more'], `${platform}/${media} : la résolution réelle a changé`);
      assertEquals(
        pillDestinations(res.targets).length,
        0,
        `${platform}/${media} : une pastille subsiste alors que le CTA fait déjà ce geste`,
      );
    }
  }
});

Deno.test('sur le web, WhatsApp SURVIT au filtre — c’est une destination distincte', () => {
  const res = resolveShareTargets({ platform: 'web', media: 'text', text: 'GRYD — +47 zones' });
  assertEquals(ids(res), ['whatsapp', 'more']);
  assertEquals(
    pillDestinations(res.targets).map((t) => t.id),
    ['whatsapp'],
    'le filtre ne doit retirer QUE la feuille système, jamais un vrai canal',
  );
});

Deno.test('pillDestinations est une SOUS-SUITE : ni réordonnancement, ni invention', () => {
  const res = resolveShareTargets(permissive({ platform: 'ios', media: 'story_image' }));
  const pills = pillDestinations(res.targets);
  const order = res.targets.map((t) => t.id);
  let cursor = -1;
  for (const p of pills) {
    const at = order.indexOf(p.id);
    assert(at > cursor, `ordre cassé sur « ${p.id} »`);
    cursor = at;
    assert(res.targets.includes(p), 'une pastille ne vient pas de la résolution');
  }
});
