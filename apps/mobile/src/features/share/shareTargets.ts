/**
 * GRYD — QUELLES DESTINATIONS DE PARTAGE ONT LE DROIT D'ÊTRE PEINTES.
 *
 * La planche E35 (docs/design/vague-1/PLANCHES.md:136, spec §… « raccourcis
 * Instagram, TikTok, WhatsApp, Plus » — docs/product/GRYD_SPEC_PRODUIT_UI_UX_
 * COMPLET.md:1413) montre quatre destinations nommées. Ce module décide
 * lesquelles existent VRAIMENT, ici, maintenant, sur cette plateforme, pour ce
 * média — et il est volontairement le seul endroit du dépôt qui en décide.
 *
 * ═══ POURQUOI CE FICHIER EXISTE (CONSTITUTION §2, « aucun bouton mort ») ═════
 * Un raccourci « Instagram » qui ouvre le vide, ou qui ouvre Instagram SANS
 * l'image, est un mensonge : il promet un partage et livre autre chose. La
 * règle est donc inversée par rapport à l'intuition — on ne peint pas une
 * cible « sauf si elle est cassée », on ne la peint QUE si trois conditions
 * sont réunies et DÉMONTRÉES :
 *   1. un canal existe sur cette plateforme (structurel) ;
 *   2. ce canal sait recevoir CE média (une story PNG ≠ un texte) ;
 *   3. on SAIT que la destination répondra — et savoir qu'on ne sait pas
 *      compte comme un non.
 * Tout le reste sort de la liste, avec une raison lisible (`omitted`) que
 * l'écran peut dire à voix haute (copy `channelUnavailableApp` /
 * `channelUnavailablePlatform`, features/share/copy.ts:279-293) au lieu de
 * faire disparaître les choses en silence.
 *
 * ═══ LE PIÈGE `canOpenURL` — POURQUOI « false » NE VEUT PAS DIRE « absent » ══
 * iOS : `Linking.canOpenURL('instagram-stories://…')` ne consulte PAS le
 * système tant que le schéma n'est pas listé dans `LSApplicationQueriesSchemes`
 * (Info.plist). Non déclaré ⇒ la réponse est `false` MÊME SI l'app est
 * installée. Traiter ce `false` comme « pas installé » serait déjà faux ; s'en
 * servir pour peindre ou ne pas peindre un bouton reviendrait à tirer une
 * conclusion d'une mesure qui n'a pas eu lieu.
 * Android : depuis targetSdk 30 (nous sommes en SDK Expo 52.0.49 → API 35), la
 * « package visibility » filtre `resolveActivity`, donc `canOpenURL` sur un
 * schéma tiers renvoie `false` sans un bloc `<queries>` dans le manifeste.
 *
 * ÉTAT RÉEL AU 27/07/2026, RELU DANS `apps/mobile/app.json` :
 *   · `expo.ios.infoPlist` ne contient QUE `UIBackgroundModes` — aucun
 *     `LSApplicationQueriesSchemes` ;
 *   · `expo.android` ne porte aucune déclaration de visibilité de paquets (et
 *     ne le peut pas : `queries` n'existe pas dans le schéma de config Expo,
 *     vérifié dans node_modules/@expo/config-types/build/ExpoConfig.d.ts — il
 *     faudrait un config plugin `withAndroidManifest`).
 * ⇒ `DECLARED_QUERIES` vaut `[]` des deux côtés, donc AUCUNE cible native
 * nommée n'est peinte aujourd'hui. Ce n'est pas un choix esthétique : c'est la
 * seule sortie honnête. `shareTargets.test.ts` relit `app.json` et casse le
 * jour où les deux divergent, dans un sens comme dans l'autre.
 *
 * ═══ LE SECOND PIÈGE, PLUS DISCRET : SAVOIR N'EST PAS POUVOIR ═══════════════
 * Déclarer le schéma et constater l'app installée ne suffit pas : encore
 * faut-il pouvoir lui REMETTRE le média. Or, avec les dépendances embarquées
 * aujourd'hui (apps/mobile/package.json) :
 *   · Instagram Stories iOS attend l'image sur `UIPasteboard` sous des types
 *     propriétaires (`com.instagram.sharedSticker.*`) + un `source_application`
 *     (App ID Facebook). `expo-clipboard` ne sait écrire que `public.png` sur
 *     le presse-papier général — il ne peut pas nommer un type tiers.
 *   · Instagram Stories Android attend une `Intent` `com.instagram.share.
 *     ADD_TO_STORY` avec un content-URI en extra. `Linking.openURL` n'envoie
 *     pas d'extras, et `expo-intent-launcher` n'est pas installé.
 *   · TikTok n'a PAS de schéma d'URL qui transporte un média : son partage
 *     direct passe par l'OpenSDK natif (client key). Ouvrir `snssdk1233://`
 *     ouvrirait TikTok à vide — le bouton mort par excellence.
 * D'où `requiresBridge` : le PONT qui remet la charge utile. Absent ⇒ la cible
 * ne se peint pas, même installée, même déclarée. Le jour où l'un de ces ponts
 * arrive, on l'annonce dans `bridges` et la cible apparaît — sans retoucher la
 * logique.
 *
 * ═══ CE QUI MARCHE VRAIMENT, ET POURQUOI ════════════════════════════════════
 * · WhatsApp : `https://wa.me/?text=…` est un lien HTTPS. Aucun schéma à
 *   déclarer, un navigateur existe toujours, et il transporte du TEXTE. Il est
 *   donc peint sur les trois plateformes — mais UNIQUEMENT pour `media:'text'`,
 *   car wa.me ne sait pas porter de fichier (`fileHandoff:false`). Proposer
 *   « WhatsApp » sous une story PNG en n'envoyant que la légende serait le même
 *   mensonge en plus poli.
 *   NUANCE ASSUMÉE, et c'est pour elle que la certitude s'appelle
 *   `always_openable` et non « installé » : si WhatsApp est là, le lien
 *   universel ouvre l'app avec le texte pré-rempli ; s'il ne l'est pas, wa.me
 *   ouvre une page web. Le bouton n'échoue donc JAMAIS — il ouvre toujours
 *   quelque chose — ce qui est exactement le critère de §2, et c'est aussi
 *   pourquoi il ne prétend pas savoir si l'app est installée.
 * · « Plus » : la feuille système. C'est le repli qui marche partout, il est
 *   donc TOUJOURS rendu (`resolveShareTargets` ne renvoie jamais une liste
 *   vide). Sur natif c'est `Share.share` / `expo-sharing`, qui savent porter un
 *   fichier ; sur le web c'est la Web Share API et elle dégrade en texte dans
 *   `openShareSheet` (features/share/shareActions.ts:207-233) — d'où
 *   `fileHandoff:false` sur web, que l'écran doit refléter.
 *
 * ═══ CE QUE CE MODULE NE FAIT PAS ═══════════════════════════════════════════
 * Il n'ouvre rien, ne capture rien, n'importe ni React ni `expo-linking` : il
 * est PUR et testable en Deno. Sonder `canOpenURL` est le travail de
 * l'appelant, qui redonne les réponses dans `probes` — et l'absence de réponse
 * est une valeur légitime (`undefined` = « pas encore sondé », traité comme un
 * non, jamais comme un oui).
 * Aucune constante de JEU ici : ni territoire, ni points, ni protection. Le
 * choix d'un réseau ne touche aucune grandeur de jeu (anti pay-to-win §1.6).
 */

/** Plateforme d'exécution, telle que `Platform.OS` la rapporte. */
export type SharePlatform = 'ios' | 'android' | 'web';

/**
 * Vocabulaire FERMÉ des destinations. Identique, mot pour mot, à celui de
 * l'event `share_channel_tapped` (packages/shared/src/events.ts:197) : un seul
 * vocabulaire pour ce que l'écran peint et pour ce que l'analytics compte,
 * sinon les deux dérivent et le KPI ment.
 */
export type ShareTargetId = 'instagram' | 'tiktok' | 'whatsapp' | 'more';

/**
 * ORDRE STABLE, et la seule source de l'ordre. La planche lit « Instagram ·
 * TikTok · WhatsApp · Plus » : la feuille système ferme la rangée, toujours.
 * Un ordre qui bouge d'un rendu à l'autre transforme un geste appris en
 * loterie — et le test l'interdit.
 */
export const SHARE_TARGET_ORDER: readonly ShareTargetId[] = [
  'instagram',
  'tiktok',
  'whatsapp',
  'more',
];

/**
 * CE QU'ON A DANS LES MAINS AU MOMENT DU PARTAGE. Ce ne sont pas des formats
 * d'image décoratifs : chacun se remet différemment et toutes les cibles ne
 * savent pas les recevoir.
 *   · `story_image`   PNG 9:16 plein écran (ShareCard format story) ;
 *   · `post_image`    PNG carré / 4:5 destiné à un feed ;
 *   · `sticker_image` PNG à fond TRANSPARENT, à coller sur une story
 *                     (features/share/shareActions.ts:186 `shareStickerImage`) ;
 *   · `text`          texte + lien, aucun fichier (`stickerText`, deep link).
 */
export const SHARE_MEDIA_KINDS = ['story_image', 'post_image', 'sticker_image', 'text'] as const;
export type ShareMediaKind = (typeof SHARE_MEDIA_KINDS)[number];

/**
 * PONT NATIF qui remet réellement la charge utile à l'app tierce. Aucun n'est
 * embarqué aujourd'hui — voir le docblock de tête. Nommés ici pour que le jour
 * où l'un arrive, il s'annonce (`bridges`) au lieu d'être supposé.
 */
export type PayloadBridgeId =
  /** UIPasteboard + types `com.instagram.sharedSticker.*` + App ID Facebook. */
  | 'ios_instagram_pasteboard'
  /** Intent `com.instagram.share.ADD_TO_STORY` avec content-URI en extra. */
  | 'android_story_intent'
  /** TikTok OpenSDK (client key) — le seul chemin qui transporte un média. */
  | 'tiktok_open_sdk';

/**
 * CE QU'IL FAUT SONDER avant de peindre. `null` = rien à sonder (HTTPS ouvre
 * toujours, la feuille système est fournie par l'OS).
 */
export type SharePreflightProbe =
  /** `Linking.canOpenURL('<scheme>://')` — n'a de SENS que si le schéma est déclaré. */
  | { readonly kind: 'ios_url_scheme'; readonly value: string }
  /** Visibilité de paquet Android — exige un `<queries>` dans le manifeste. */
  | { readonly kind: 'android_package'; readonly value: string };

/** COMMENT on ouvre la destination, une fois qu'elle a le droit d'être peinte. */
export type ShareOpenPlan =
  | { readonly via: 'url'; readonly url: string }
  | {
      readonly via: 'android_intent';
      readonly action: string;
      readonly androidPackage: string;
    }
  | { readonly via: 'native_sdk'; readonly sdk: PayloadBridgeId }
  | { readonly via: 'os_share_sheet' };

/** POURQUOI une destination de la planche n'est pas là. Jamais « parce que ». */
export type ShareTargetOmissionReason =
  /** Cette destination n'a aucun canal sur cette plateforme. Structurel. */
  | 'no_channel_on_platform'
  /** Le canal existe mais ne sait pas recevoir CE média. */
  | 'media_not_accepted'
  /** Rien à envoyer (texte vide) : il n'y a pas de partage sans charge utile. */
  | 'empty_payload'
  /** Schéma/paquet non déclaré ⇒ `canOpenURL` ne peut RIEN dire. On ne sait pas. */
  | 'probe_not_declared'
  /** Déclaré, mais la sonde n'a pas encore répondu. On ne sait pas ENCORE. */
  | 'probe_missing'
  /** La sonde a répondu non, sur un schéma déclaré : l'app est absente. */
  | 'app_absent'
  /** App joignable, mais aucun pont pour lui remettre le média. */
  | 'no_payload_bridge';

/** D'où vient le droit de peindre. Jamais une supposition. */
export type ShareTargetCertainty =
  /** `canOpenURL` a répondu OUI sur un schéma réellement déclaré. */
  | 'probed_installed'
  /** HTTPS : un navigateur existe toujours, il n'y a rien à sonder. */
  | 'always_openable'
  /** Fournie par l'OS / le runtime (feuille de partage). */
  | 'os_provided';

export interface ResolvedShareTarget {
  readonly id: ShareTargetId;
  /**
   * Marque INVARIANTE (jamais traduite — copy.ts:235-239). `null` pour la
   * feuille système, dont le libellé « Plus » est du français traduit en cinq
   * langues (`channelMore`).
   */
  readonly brand: string | null;
  /** Comment l'appelant doit ouvrir cette destination. */
  readonly open: ShareOpenPlan;
  /** Ce que ce canal sait RECEVOIR (informatif pour l'écran). */
  readonly accepts: readonly ShareMediaKind[];
  /**
   * Ce canal peut-il porter un FICHIER ? `false` = seul le texte passera, quel
   * que soit le média demandé — l'écran ne doit alors pas promettre l'image.
   */
  readonly fileHandoff: boolean;
  readonly certainty: ShareTargetCertainty;
}

export interface OmittedShareTarget {
  readonly id: ShareTargetId;
  readonly reason: ShareTargetOmissionReason;
}

export interface ShareTargetsResolution {
  /** Peintes. Ordre `SHARE_TARGET_ORDER`, JAMAIS vide (« Plus » ferme la marche). */
  readonly targets: readonly ResolvedShareTarget[];
  /** Écartées, avec la raison — pour que l'écran puisse l'expliquer. */
  readonly omitted: readonly OmittedShareTarget[];
}

export interface ResolveShareTargetsInput {
  readonly platform: SharePlatform;
  /** Ce qu'on s'apprête à partager. */
  readonly media: ShareMediaKind;
  /** Texte / lien accompagnant le partage (obligatoire pour wa.me). */
  readonly text?: string;
  /**
   * Réponses de `Linking.canOpenURL`, par valeur de sonde. Une clé ABSENTE
   * signifie « pas sondé » et vaut non : on ne peint pas ce qu'on n'a pas
   * mesuré.
   */
  readonly probes?: Readonly<Record<string, boolean>>;
  /**
   * Ponts natifs réellement embarqués dans CE build. Défaut `[]` = l'état du
   * dépôt au 27/07/2026.
   */
  readonly bridges?: readonly PayloadBridgeId[];
  /**
   * Schémas / paquets déclarés au manifeste. Défaut : `DECLARED_QUERIES`, qui
   * recopie `app.json` (et qu'un test tient synchronisé). Surchargeable pour
   * les tests uniquement — jamais pour se donner raison.
   */
  readonly declaredQueries?: readonly string[];
  /**
   * App ID Facebook exigé par `instagram-stories://share?source_application=`.
   * Absent ⇒ le pont iOS est incomplet, donc inexistant.
   */
  readonly iosSourceApplication?: string;
}

/**
 * CE QUE LE MANIFESTE DÉCLARE VRAIMENT, recopié de `apps/mobile/app.json`.
 *
 * Vide des deux côtés au 27/07/2026 — et ce n'est pas un oubli à corriger à la
 * légère : ajouter un schéma ici SANS l'ajouter à `app.json` ferait mentir la
 * sonde (elle croirait pouvoir mesurer), et l'ajouter à `app.json` sans le
 * pont correspondant ferait apparaître un bouton qui ouvre une app sans lui
 * remettre l'image. `shareTargets.test.ts` relit `app.json` et refuse la
 * divergence.
 */
export const DECLARED_QUERIES: Readonly<Record<SharePlatform, readonly string[]>> = {
  /** `expo.ios.infoPlist.LSApplicationQueriesSchemes` — absent. */
  ios: [],
  /** `<queries>` du manifeste Android — impossible depuis app.json (config plugin requis). */
  android: [],
  /** Sans objet : un navigateur ne sonde pas les schémas natifs. */
  web: [],
};

/** Un canal = une destination SUR une plateforme. Absent ⇒ impossible, structurellement. */
interface ChannelSpec {
  readonly open:
    | { readonly via: 'url'; readonly template: string }
    | { readonly via: 'android_intent'; readonly action: string; readonly androidPackage: string }
    | { readonly via: 'native_sdk'; readonly sdk: PayloadBridgeId }
    | { readonly via: 'os_share_sheet' };
  readonly probe: SharePreflightProbe | null;
  readonly accepts: readonly ShareMediaKind[];
  readonly fileHandoff: boolean;
  readonly requiresBridge: PayloadBridgeId | null;
  /** Exige un texte non vide (wa.me : sans texte il n'y a rien à envoyer). */
  readonly requiresText: boolean;
}

interface TargetSpec {
  readonly id: ShareTargetId;
  readonly brand: string | null;
  /** Une clé de plateforme ABSENTE = aucun canal, jamais. C'est ce qui garantit
   *  structurellement qu'aucune cible native ne peut apparaître sur le web. */
  readonly channels: Partial<Readonly<Record<SharePlatform, ChannelSpec>>>;
}

const IMAGE_MEDIA: readonly ShareMediaKind[] = ['story_image', 'post_image', 'sticker_image'];

/**
 * LE CATALOGUE. Chaque ligne est une affirmation vérifiable sur le monde réel,
 * pas une intention de produit.
 */
const CATALOG: readonly TargetSpec[] = [
  {
    id: 'instagram',
    brand: 'Instagram',
    channels: {
      ios: {
        open: {
          via: 'url',
          template: 'instagram-stories://share?source_application={sourceApplication}',
        },
        probe: { kind: 'ios_url_scheme', value: 'instagram-stories' },
        // L'image ne voyage PAS dans l'URL : elle est déposée sur UIPasteboard
        // sous `com.instagram.sharedSticker.backgroundImage` (story) ou
        // `…stickerImage` (sticker) juste avant l'ouverture. D'où le pont.
        accepts: ['story_image', 'sticker_image'],
        fileHandoff: true,
        requiresBridge: 'ios_instagram_pasteboard',
        requiresText: false,
      },
      android: {
        open: {
          via: 'android_intent',
          action: 'com.instagram.share.ADD_TO_STORY',
          androidPackage: 'com.instagram.android',
        },
        probe: { kind: 'android_package', value: 'com.instagram.android' },
        accepts: ['story_image', 'sticker_image'],
        fileHandoff: true,
        requiresBridge: 'android_story_intent',
        requiresText: false,
      },
      // web : AUCUN canal. Un navigateur ne peut pas ouvrir `instagram-stories://`
      // (au mieux il ne se passe rien, au pire une boîte d'erreur de l'OS), et
      // instagram.com n'accepte pas de média par URL.
    },
  },
  {
    id: 'tiktok',
    brand: 'TikTok',
    channels: {
      ios: {
        open: { via: 'native_sdk', sdk: 'tiktok_open_sdk' },
        probe: { kind: 'ios_url_scheme', value: 'snssdk1233' },
        accepts: ['story_image', 'post_image'],
        fileHandoff: true,
        requiresBridge: 'tiktok_open_sdk',
        requiresText: false,
      },
      android: {
        open: { via: 'native_sdk', sdk: 'tiktok_open_sdk' },
        probe: { kind: 'android_package', value: 'com.zhiliaoapp.musically' },
        accepts: ['story_image', 'post_image'],
        fileHandoff: true,
        requiresBridge: 'tiktok_open_sdk',
        requiresText: false,
      },
      // web : idem — le partage TikTok passe par un SDK natif, point.
    },
  },
  {
    id: 'whatsapp',
    brand: 'WhatsApp',
    channels: {
      // Le MÊME canal sur les trois plateformes, et c'est tout l'intérêt :
      // wa.me est un lien HTTPS. Rien à déclarer, rien à sonder, aucun pont —
      // mais il ne porte que du texte.
      ios: {
        open: { via: 'url', template: 'https://wa.me/?text={text}' },
        probe: null,
        accepts: ['text'],
        fileHandoff: false,
        requiresBridge: null,
        requiresText: true,
      },
      android: {
        open: { via: 'url', template: 'https://wa.me/?text={text}' },
        probe: null,
        accepts: ['text'],
        fileHandoff: false,
        requiresBridge: null,
        requiresText: true,
      },
      web: {
        open: { via: 'url', template: 'https://wa.me/?text={text}' },
        probe: null,
        accepts: ['text'],
        fileHandoff: false,
        requiresBridge: null,
        requiresText: true,
      },
    },
  },
  {
    id: 'more',
    brand: null,
    channels: {
      // La feuille système accepte TOUT : c'est le repli universel, et c'est
      // pour ça qu'elle n'est jamais filtrée par le média. Sur natif elle porte
      // un fichier (expo-sharing) ; sur web `openShareSheet` dégrade en texte,
      // d'où `fileHandoff:false` — l'écran ne doit pas y promettre l'image.
      ios: {
        open: { via: 'os_share_sheet' },
        probe: null,
        accepts: SHARE_MEDIA_KINDS,
        fileHandoff: true,
        requiresBridge: null,
        requiresText: false,
      },
      android: {
        open: { via: 'os_share_sheet' },
        probe: null,
        accepts: SHARE_MEDIA_KINDS,
        fileHandoff: true,
        requiresBridge: null,
        requiresText: false,
      },
      web: {
        open: { via: 'os_share_sheet' },
        probe: null,
        accepts: SHARE_MEDIA_KINDS,
        fileHandoff: false,
        requiresBridge: null,
        requiresText: false,
      },
    },
  },
];

/** Le catalogue, trié une fois pour toutes selon `SHARE_TARGET_ORDER`. */
const ORDERED_CATALOG: readonly TargetSpec[] = SHARE_TARGET_ORDER.map((id) => {
  const spec = CATALOG.find((c) => c.id === id);
  if (!spec) throw new Error(`shareTargets: aucune spec pour « ${id} »`);
  return spec;
});

/**
 * Substitution des trous du gabarit. `encodeURIComponent` n'est pas cosmétique :
 * sans lui, un « & » ou un « + » dans la légende couperait le lien WhatsApp en
 * silence (le « + » y serait lu comme une espace). Effet de bord utile : il
 * encode aussi `{` et `}`, donc un texte joueur contenant « {sourceApplication} »
 * ne peut pas se faire substituer à son tour.
 */
function fillTemplate(template: string, ctx: { text: string; sourceApplication: string }): string {
  return template
    .replace('{text}', encodeURIComponent(ctx.text))
    .replace('{sourceApplication}', encodeURIComponent(ctx.sourceApplication));
}

/**
 * Une seule décision par canal, et elle est SÉQUENTIELLE : chaque étape ne
 * s'exécute que si la précédente a dit oui. La première qui dit non donne la
 * raison — c'est cette raison que l'écran a le droit de prononcer.
 */
function decideChannel(
  channel: ChannelSpec,
  input: ResolveShareTargetsInput,
  declared: readonly string[],
): { readonly ok: true; readonly certainty: ShareTargetCertainty } | { readonly ok: false; readonly reason: ShareTargetOmissionReason } {
  // 1. Le canal sait-il recevoir ce média ?
  if (!channel.accepts.includes(input.media)) return { ok: false, reason: 'media_not_accepted' };

  // 2. Y a-t-il quelque chose à envoyer ? (wa.me sans texte = URL vide)
  if (channel.requiresText && (input.text ?? '').trim().length === 0) {
    return { ok: false, reason: 'empty_payload' };
  }

  // 3. Le pont qui REMET la charge utile existe-t-il dans ce build ?
  //    Placé AVANT la sonde à dessein : savoir l'app installée ne sert à rien
  //    si on ne peut rien lui donner, et sonder coûterait un avertissement iOS
  //    pour une réponse qu'on n'utiliserait pas.
  if (channel.requiresBridge !== null) {
    const bridges = input.bridges ?? [];
    if (!bridges.includes(channel.requiresBridge)) return { ok: false, reason: 'no_payload_bridge' };
    // Le pont Instagram iOS n'est un pont que s'il porte l'App ID exigé par le
    // schéma : sans lui, `instagram-stories://share` ouvre Instagram sans média.
    if (
      channel.requiresBridge === 'ios_instagram_pasteboard' &&
      (input.iosSourceApplication ?? '').trim().length === 0
    ) {
      return { ok: false, reason: 'no_payload_bridge' };
    }
  }

  // 4. Sait-on que la destination répondra ?
  if (channel.probe === null) {
    // Rien à sonder : HTTPS ouvre toujours, la feuille est fournie par l'OS.
    return {
      ok: true,
      certainty: channel.open.via === 'os_share_sheet' ? 'os_provided' : 'always_openable',
    };
  }
  // Non déclaré ⇒ `canOpenURL` répondrait `false` par construction, quelle que
  // soit la réalité. On ne SAIT pas, donc on ne peint pas — et on ne fait
  // surtout pas semblant d'avoir mesuré.
  if (!declared.includes(channel.probe.value)) return { ok: false, reason: 'probe_not_declared' };

  const answer = input.probes?.[channel.probe.value];
  if (answer === undefined) return { ok: false, reason: 'probe_missing' };
  if (answer === false) return { ok: false, reason: 'app_absent' };
  return { ok: true, certainty: 'probed_installed' };
}

/**
 * LES DESTINATIONS RÉELLEMENT ATTEIGNABLES, dans l'ordre de la planche.
 *
 * PURE : aucune I/O, aucun import React/Expo, aucun accès à `Platform` — tout
 * arrive par `input`. Deux appels avec la même entrée rendent la même sortie.
 *
 * GARANTIES (tenues par `shareTargets.test.ts`) :
 *   · `targets` n'est JAMAIS vide — « Plus » y est toujours ;
 *   · sur `web`, aucune cible native n'apparaît, jamais, quels que soient les
 *     ponts et les sondes qu'on lui passe ;
 *   · une cible dont la sonde n'est pas déclarée n'apparaît jamais ;
 *   · l'ordre est stable et vaut `SHARE_TARGET_ORDER`.
 */
export function resolveShareTargets(input: ResolveShareTargetsInput): ShareTargetsResolution {
  const declared = input.declaredQueries ?? DECLARED_QUERIES[input.platform];
  const targets: ResolvedShareTarget[] = [];
  const omitted: OmittedShareTarget[] = [];

  for (const spec of ORDERED_CATALOG) {
    const channel = spec.channels[input.platform];
    if (!channel) {
      omitted.push({ id: spec.id, reason: 'no_channel_on_platform' });
      continue;
    }
    const decision = decideChannel(channel, input, declared);
    if (!decision.ok) {
      omitted.push({ id: spec.id, reason: decision.reason });
      continue;
    }
    const open: ShareOpenPlan =
      channel.open.via === 'url'
        ? {
            via: 'url',
            url: fillTemplate(channel.open.template, {
              text: input.text ?? '',
              sourceApplication: input.iosSourceApplication ?? '',
            }),
          }
        : channel.open;
    targets.push({
      id: spec.id,
      brand: spec.brand,
      open,
      accepts: channel.accepts,
      fileHandoff: channel.fileHandoff,
      certainty: decision.certainty,
    });
  }

  return { targets, omitted };
}

/**
 * LES PASTILLES QUI MÉRITENT D'ÊTRE PEINTES SOUS UN CTA QUI OUVRE DÉJÀ LA
 * FEUILLE SYSTÈME (§A : « 1 écran = 1 décision », deux contrôles pour la même
 * action sont un contrôle de trop).
 *
 * ═══ LE DOUBLON QUE CETTE FONCTION SUPPRIME ════════════════════════════════
 * `app/partage.tsx` peint un CTA chartreuse dont l'action est
 * `shareCurrentCard(...)` → `shareAsImage(...)`, qui rasterise puis passe la
 * main à la feuille de partage de l'OS (et y retombe directement sur le web).
 * C'est EXACTEMENT ce que fait la pastille « Plus » (`open.via ===
 * 'os_share_sheet'`), qui appelle la MÊME fonction. Sur natif, où le média est
 * une image, `resolveShareTargets` écarte Instagram et TikTok (aucun pont) et
 * WhatsApp (wa.me ne porte pas de fichier) : la rangée se réduisait donc à
 * cette seule pastille — un second bouton pour le geste que le CTA venait de
 * proposer. Le fichier `partage.tsx` s'interdisait déjà cette faute en
 * commentaire (« Autre app a DISPARU d'ici… deux contrôles pour la même action
 * sont un contrôle de trop ») ; le doublon avait simplement changé de côté.
 *
 * ═══ POURQUOI FILTRER PLUTÔT QUE MASQUER LA RANGÉE ═════════════════════════
 * Sur le web le média est du TEXTE : WhatsApp redevient atteignable, et c'est
 * une destination DISTINCTE (un lien wa.me, pas la feuille système). La rangée
 * garde donc du sens là-bas. Et la NOTE d'absence (« le partage direct vit dans
 * l'app sur téléphone ») doit survivre même quand il ne reste aucune pastille :
 * une absence expliquée n'est pas un bouton, c'est une information.
 *
 * PURE. Ne réordonne rien : la sortie est une sous-suite de `targets`, donc
 * l'ordre `SHARE_TARGET_ORDER` est conservé.
 */
export function pillDestinations(
  targets: readonly ResolvedShareTarget[],
): readonly ResolvedShareTarget[] {
  return targets.filter((t) => t.open.via !== 'os_share_sheet');
}
