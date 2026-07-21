/**
 * GRYD — PARTAGE DE LA COURSE AFFICHÉE (AMENDEMENT-22 §7, UI en scènes) :
 *
 *   ← Résultat
 *   Partager ta conquête / ta défense / ta course   ← titre selon l'intention
 *      [ preview story qui FLOTTE — la story EST le container ]
 *   Format  [ Story | Carré | Carte seule ]         ← segmented (accent)
 *   Style   [ Carte | Conquête | Défense ]          ← segmented (surface) + « +3 styles »
 *   [ Partager en story ]                           ← UN SEUL gros CTA chartreuse
 *      ○ Sauver   ○ Copier   ○ Autre app            ← actions légères, zéro card
 *
 * PARTAGE VRAI : la preview est alimentée par les stats de LA course affichée
 * au Résultat (share/shareRun.ts, armé avant router.push) — zones, zone, boucle,
 * distance/allure/durée, points. En social_run (aucune capture), seul le style
 * « Carte » (stats) est proposé — aucun visuel qui prétendrait un secteur pris.
 *
 * ─── AUCUNE COURSE ARMÉE = AUCUNE CARTE (décision fondateur 21/07/2026) ──────
 * Cet écran faisait `shareRun?.card ?? demoCard` : ouvert sans course (deep
 * link, ou simplement le widget territoire et la Carte, qui poussent /partage
 * SANS `setShareRun`), il fabriquait une carte de partage COMPLÈTE — distance,
 * allure, zones, tracé, rang — et l'affichait prête à exporter. Une ligne de
 * texte « Exemple » était la seule protection ; elle ne rachète rien : « le
 * bandeau n'y change rien, c'est un run fabriqué à la place du sien ». Et ce
 * mensonge SORTAIT de l'app : la card est la cible exacte de l'export PNG.
 *
 * Il n'y a donc plus de mode exemple. Sans course armée, l'écran ne rend AUCUNE
 * card et affiche l'un des trois états vides (`SHARE_COPY.empty*`) :
 *   · pas connecté      → invite à se connecter ;
 *   · connecté, rien    → invite à courir (le partage part du Résultat) ;
 *   · session en cours de restauration → « Chargement… », aucune affirmation.
 *
 * Le RANG GRIP de la mascotte suivait la même pente : il était dérivé de
 * `MY_SOCIAL_PROFILE.xp` (persona de démo), en constante de module, sans la
 * moindre garde — donc gravé dans le PNG partagé de n'importe quel joueur, y
 * compris un compte neuf. Il vient désormais de l'XP RÉELLE (`useMyEconomy`) et
 * la mascotte DISPARAÎT quand cette XP est inconnue (pas de session, ou lecture
 * serveur impossible) : un rang inconnu ne s'invente pas.
 *
 * Profondeur : N0 fond (colors.noir) · N1 la preview (unique surface) · N2
 * segments/actifs · N3 rare (chartreuse). Jamais de card-dans-card. Actions
 * CÂBLÉES ; en web/démo, capture & Share natives indisponibles → toasts. En
 * prod : ViewShot + Share + expo-media-library (O1).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, elevation, fontSizes, motion, radii } from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { goBack } from '../src/lib/nav';
import { useSession } from '../src/lib/session';
import { Icon } from '../src/ui/Icon';
import { IconAction, Segmented, ShareCard, type ShareCardRatio } from '../src/ui/game';
import { C } from '../src/i18n/catalog/result';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { ShareMap } from '../src/features/share/ShareMap';
import { SHARE_COPY } from '../src/features/share/copy';
import { getShareRun, type ShareRunData } from '../src/features/share/shareRun';
import {
  SHARE_TEMPLATES,
  SHARE_TEMPLATES_BY_ID,
  type ShareDemoData,
  type ShareTemplateId,
  type ShareView,
} from '../src/features/share/templates';
import { applySharePrivacy } from '../src/features/share/sharePrivacy';
import { buildShareLink, defaultShareTarget } from '../src/features/share/shareDeepLink';
import {
  copyText,
  openShareSheet,
  shareAsImage,
  stickerText,
  type ShareActionResult,
} from '../src/features/share/shareActions';
import { usePrivacyPrefs } from '../src/features/privacy/store';
import { type RunIntention } from '../src/features/run/intention';
import { GripMascot } from '../src/features/social/GripMascot';
import { useMyEconomy } from '../src/features/social/economy';
import { gripRankForLevel, playerLevelForXp } from '../src/features/crew/rules';

/**
 * Formats d'export (Story / Carré / Carte seule) — options du segmented
 * « Format ». « Carte seule » (AMENDEMENT-24) = la carte 3D en grand, chrome
 * minimal (trace + zone + 1 ligne).
 */
const FORMATS: readonly { id: ShareCardRatio; label: Entry; icon: 'partage' | 'carte' }[] = [
  // Libellés courts pour tenir 3-up à 375px (les ratios 9:16/1:1 étaient
  // décoratifs — « Story » implique 9:16, « Carré » implique 1:1). Entries
  // i18n résolues au rendu (t) — parité 5 langues forcée par le type.
  { id: 'story', label: C.formatStory, icon: 'partage' },
  { id: 'square', label: C.formatSquare, icon: 'carte' },
  { id: 'mapOnly', label: C.formatMapOnly, icon: 'carte' },
];

/** Style = 3 principaux dans le segmented ; « Plus de styles » déplie les restants. */
const STYLE_MAIN: readonly ShareTemplateId[] = ['simple', 'conquete', 'defense'];
const STYLE_EXTRA: readonly ShareTemplateId[] = [
  'boucle',
  'crew',
  'classement',
  'avantApres',
  'carte3d',
];

/** Libellé COURT par style (jamais tronqué, résolu au rendu). Distinct du `chip` legacy. */
const STYLE_LABEL: Record<ShareTemplateId, Entry> = {
  simple: C.styleMap,
  conquete: C.styleConquest,
  defense: C.styleDefense,
  boucle: C.styleLoop,
  crew: C.styleCrew,
  classement: C.styleRanking,
  avantApres: C.styleBeforeAfter,
  carte3d: C.styleMap3d,
};

/** Styles dont la carte porte un VRAI tracé animable (bouton Rejouer pertinent). */
const ANIMATABLE_STYLES: readonly ShareTemplateId[] = [
  'simple',
  'conquete',
  'boucle',
  'classement',
  'avantApres',
];

/** Largeur de preview par format (la hauteur suit l'aspect de la card). */
const PREVIEW_WIDTH: Record<ShareCardRatio, number> = {
  story: 232,
  square: 300,
  feed: 280,
  mapOnly: 264,
};

/**
 * Aiguillage : une course est armée → l'aperçu réel ; sinon → l'état vide qui
 * correspond à la situation. Aucune donnée fabriquée d'un côté ni de l'autre.
 * Les hooks de l'aperçu vivent dans `SharePreview` : ce composant-ci n'appelle
 * QUE des hooks inconditionnels avant son unique branchement de rendu.
 */
export default function PartageScreen() {
  const { session, loading: sessionLoading, configured } = useSession();
  // Singleton module armé par le Résultat (shareRun.ts). Lu au rendu : /partage
  // n'est jamais monté avant `setShareRun` sur le chemin légitime.
  const run = getShareRun();

  useEffect(() => {
    screen('partage', { armed: run !== null });
  }, []);

  if (run) return <SharePreview run={run} />;
  return (
    <ShareEmptyState
      // Tant que la session se restaure, on ne sait pas qui est là : on n'affirme
      // ni « connecte-toi » ni « tu n'as rien couru ».
      loading={sessionLoading}
      needsAccount={configured && !session}
    />
  );
}

function SharePreview({ run }: { run: ShareRunData }) {
  const insets = useSafeAreaInsets();
  const toast = useShareToast();
  const t = useT();
  // Seul `template` est encore lu : le mode et l'intention viennent de la course
  // ARMÉE (autoritaire), plus d'un paramètre d'URL qu'un deep link peut inventer.
  const params = useLocalSearchParams<{ template?: string }>();

  // PARTAGE VRAI : les stats de la course affichée au Résultat (shareRun.ts).
  const runCard = run.card;
  const intention = run.intention;
  // Social Run = stats seules, aucune capture : on ne propose JAMAIS un visuel
  // « secteur pris » pour une course qui n'a rien capturé.
  const statsOnlyShare = run.mode === 'social_run';

  // Style par défaut : l'intention de la course (défense → card Défense),
  // stats seules → Carte ; sinon Conquête. Le param `template` reste prioritaire.
  const defaultTemplate: ShareTemplateId = statsOnlyShare
    ? 'simple'
    : intention === 'defense'
      ? 'defense'
      : 'conquete';
  const [selectedRaw, setSelected] = useState<ShareTemplateId>(
    !statsOnlyShare && isTemplateId(params.template) ? params.template : defaultTemplate,
  );
  const [ratioRaw, setRatio] = useState<ShareCardRatio>('story');
  /** Cible de l'export PNG (D6) : le conteneur EXACT de la ShareCard. */
  const cardShotRef = useRef<View | null>(null);
  // « +3 styles » ouvre le choix complet (déplié aussi si on arrive sur un extra).
  const [stylesExpanded, setStylesExpanded] = useState<boolean>(
    isTemplateId(params.template) ? STYLE_EXTRA.includes(params.template) : false,
  );
  // Rejouer l'animation de la preview (doc §4.8 « Replay Conquête » — free =
  // replay animé in-app, honnête : la trace se redessine et la zone se remplit).
  const [replayKey, setReplayKey] = useState(0);

  // MASQUAGE PRIVACY (doc §9) : par défaut on retire départ/arrivée du tracé
  // PARTAGÉ. La zone conquise reste entière (territoire public, pas la position).
  const { prefs } = usePrivacyPrefs();
  const maskEndpoints = prefs.maskEndpoints;
  const safeTrace = useMemo(
    () => (maskEndpoints ? applySharePrivacy(runCard.trace) : runCard.trace),
    [maskEndpoints, runCard.trace],
  );
  // Le tracé de CETTE course est-il connu ? (le Résultat arme `trace: []` pour
  // une vraie course : ingest_run ne renvoie pas encore la géométrie). Tout ce
  // qui est CARTOGRAPHIQUE en dépend — on ne PROPOSE pas ce qu'on ne peut pas
  // tenir : ni le format « Carte seule », ni le style « Carte 3D », ni le badge
  // « départ/arrivée masqués » (rien n'est masqué s'il n'y a rien à montrer).
  const hasKnownRoute = safeTrace.length >= 3;
  const privacyNote = maskEndpoints ? t(C.privacyMasked) : undefined;

  // Normalisation : un choix CARTOGRAPHIQUE qui ne peut pas être tenu (deep link
  // `?template=carte3d`, ou masquage qui vient de raboter la trace) retombe sur
  // un rendu honnête au lieu d'emprunter la carte d'un autre quartier.
  const selected: ShareTemplateId =
    !hasKnownRoute && selectedRaw === 'carte3d' ? defaultTemplate : selectedRaw;
  const ratio: ShareCardRatio = !hasKnownRoute && ratioRaw === 'mapOnly' ? 'story' : ratioRaw;

  useEffect(() => {
    // Preview auto-générée (doc §12 : share_preview_generated). Émis ICI et pas
    // dans l'aiguilleur : sans course armée, aucune card n'est générée.
    track(EVENTS.shareCardGenerated, { template: selected });
  }, []);

  const template = useMemo(
    () => SHARE_TEMPLATES.find((t) => t.id === selected) ?? SHARE_TEMPLATES_BY_ID.conquete,
    [selected],
  );
  // État de RENDU injecté dans chaque carte : anime + rejoue + fournit le tracé
  // DÉJÀ masqué (privacy). La preview est animée d'entrée (story auto, doc §7.2).
  // captured=false en social_run : aucune capture → la zone ne se remplit pas.
  const view: ShareView = useMemo(
    () => ({ animated: true, replayKey, trace: safeTrace, captured: !statsOnlyShare }),
    [replayKey, safeTrace, statsOnlyShare],
  );

  // Le badge « Départ et arrivée masqués » n'est HONNÊTE que sur une carte qui
  // rend RÉELLEMENT la trace tronquée (les templates SVG animables, hors « Carte
  // seule »). La Carte 3D / mapOnly rend une boucle FERMÉE (départ = arrivée) et
  // ne peut pas refléter le masquage → pas de badge menteur là-dessus.
  const traceShown = hasKnownRoute && ANIMATABLE_STYLES.includes(selected) && ratio !== 'mapOnly';

  const cardProps = useMemo(() => {
    // La card projette les VRAIES valeurs du run (runCard). `privacyNote` =
    // badge de confiance §9, seulement là où la trace tronquée est visible.
    const built = { ...template.build(runCard, view), privacyNote: traceShown ? privacyNote : undefined };
    // « Carte seule » (AMENDEMENT-24) : la carte EN GRAND quel que soit le
    // style — si le template n'a pas déjà son propre fond carte (les 5 SVG),
    // on injecte une carte plein cadre. Le style choisi ne règle alors QUE le
    // KPI/la ligne (chrome minimale). Toujours la carte SVG du tracé réellement
    // couru : la 3D (`ShareMap3D`) est une géométrie de démo FIGÉE (République)
    // et n'a plus d'aperçu d'exemple où s'afficher. « Carte seule » n'est de
    // toute façon pas proposé quand le tracé est inconnu (voir `formatOptions`).
    if (ratio === 'mapOnly' && built.mapBackground === undefined) {
      return {
        ...built,
        mapBackground: (
          <View style={styles.previewMapFill}>
            <ShareMap
              style={styles.previewMapSquare}
              animated={view.animated}
              replayKey={view.replayKey}
              trace={view.trace}
              captured={view.captured}
            />
          </View>
        ),
      };
    }
    return built;
    // `t` (stable par langue) force la re-construction des cards à la bascule.
  }, [template, ratio, runCard, view, privacyNote, traceShown, t]);

  // DEEP LINK de la story (doc §6.4) : UN lien par partage, dérivé de
  // l'intention/zone/crew + du style choisi. Attaché à tous les partages.
  const deepLink = useMemo(
    () =>
      buildShareLink(
        defaultShareTarget({
          intention,
          zoneName: runCard.zoneName,
          crewName: runCard.crewName,
          templateId: selected,
        }),
      ),
    [intention, runCard.zoneName, runCard.crewName, selected],
  );

  // Segments « Style » : 3 principaux, ou tous une fois « +3 styles » déplié.
  // « Boucle » n'est proposé que si la course a réellement fermé une boucle.
  // « Carte 3D » ne l'est que si un tracé est connu : ce style monte une carte
  // MapLibre de géométrie DÉMO FIGÉE (République) — sans tracé réel, le proposer
  // revenait à étiqueter « Carte 3D » un repli silencieux vers un autre rendu.
  const styleOptions = useMemo(() => {
    const extras = STYLE_EXTRA.filter(
      (id) =>
        (id !== 'boucle' || runCard.loopBonusZones > 0) && (id !== 'carte3d' || hasKnownRoute),
    );
    return (stylesExpanded ? [...STYLE_MAIN, ...extras] : STYLE_MAIN).map((id) => ({
      id,
      label: t(STYLE_LABEL[id]),
    }));
  }, [stylesExpanded, hasKnownRoute, runCard.loopBonusZones, t]);

  // Formats : « Carte seule » (la carte EN GRAND) n'a aucun sens — et serait un
  // cadre vide — quand le tracé de cette course est inconnu. On ne le propose pas.
  const formatOptions = useMemo(
    () =>
      FORMATS.filter((f) => f.id !== 'mapOnly' || hasKnownRoute).map((f) => ({
        id: f.id,
        label: t(f.label),
        icon: f.icon,
      })),
    [hasKnownRoute, t],
  );

  const pickStyle = (id: ShareTemplateId) => {
    setSelected(id);
    track(EVENTS.shareTemplateChanged, { template: id });
  };
  const expandStyles = () => {
    haptics.light();
    setStylesExpanded(true);
  };

  // Le style courant porte-t-il un vrai tracé animable (bouton Rejouer utile) ?
  const canReplay = ANIMATABLE_STYLES.includes(selected);

  // Message narratif prêt à coller (doc §6.1 « partager une conséquence ») +
  // le deep link. UN seul lien par story (§6.3).
  const shareMessage = `${buildShareHeadline(t, intention, runCard, statsOnlyShare)}\n${deepLink}`;

  // Action de partage RÉELLE (fire-and-forget) : ne confirme que si ça a marché
  // (honnêteté — un « annulé » reste silencieux). `msg` peut dépendre du canal
  // réel (`via`) pour ne jamais mentir (« copié » vs « prêt à partager »).
  // `onOk` émet les events qui exigent un succès réel (jamais au tap).
  const runAction = (
    p: Promise<ShareActionResult>,
    msg: string | ((via: 'clipboard' | 'share' | 'webshare' | 'image') => string),
    channel: string,
    onOk?: (via: 'clipboard' | 'share' | 'webshare' | 'image') => void,
  ) => {
    haptics.light();
    void p.then((r) => {
      if (r.ok) {
        track(EVENTS.shareCompleted, { channel });
        onOk?.(r.via);
        toast.show(typeof msg === 'function' ? msg(r.via) : msg);
      } else if (r.reason === 'unavailable') {
        toast.show(t(C.shareUnavailable));
      }
      // 'dismissed' → silencieux (l'utilisateur a fermé la feuille de partage).
    });
  };

  // Sticker transparent (doc §4.2) : copie le sticker TEXTE prêt à coller + lien.
  // HONNÊTE : « copié · colle-le » seulement si c'est VRAIMENT allé au presse-
  // papier (via clipboard) ; sinon (feuille de partage native) → « prêt à
  // partager ». L'event sticker_copied n'est émis qu'en cas de copie réelle.
  const copySticker = () => {
    const head = statsOnlyShare
      ? t(C.stickerHeadDistance, { km: runCard.distanceKm })
      : t(C.stickerHeadZones, { n: runCard.zonesGained, zone: runCard.zoneName });
    runAction(
      copyText(stickerText(runCard, head, deepLink)),
      (via) => (via === 'clipboard' ? t(C.stickerCopied) : t(C.stickerReady)),
      'sticker',
      (via) => {
        if (via === 'clipboard') track(EVENTS.stickerCopied, { template: selected });
      },
    );
  };

  // Replay Conquête (doc §4.8) : rejoue l'animation de la preview (free = in-app).
  const replay = () => {
    haptics.light();
    track(EVENTS.replayPlayed, { template: selected });
    setReplayKey((k) => k + 1);
  };

  // Titre = ce que la course a fait (jamais « conquête » pour une défense).
  const title =
    intention === 'defense'
      ? t(C.shareDefenseTitle)
      : intention === 'conquest'
        ? t(C.shareConquestTitle)
        : t(C.shareRunTitle);

  // SIGNATURE GRIP : rang dérivé de l'XP RÉELLE du joueur. `source === 'none'`
  // = on ne sait pas (pas de session, ou lecture serveur impossible) → aucune
  // mascotte plutôt qu'un rang emprunté, y compris dans le PNG exporté.
  const economy = useMyEconomy();
  const gripRank =
    economy.source === 'server' ? gripRankForLevel(playerLevelForXp(economy.xp)) : null;

  // CTA primaire aligné sur le format choisi — toujours un verbe précis.
  const primaryCta =
    ratio === 'square'
      ? { label: t(C.shareSquareCta), channel: 'instagram_feed' as const }
      : ratio === 'mapOnly'
        ? { label: t(C.shareMapCta), channel: 'instagram_feed' as const }
        : { label: t(C.shareStoryCta), channel: 'instagram_story' as const };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Retour (chevron inversé, charte §F). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.backToResultA11y)}
          onPress={() => goBack()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <View style={styles.backChevron}>
            <Icon name="chevron" size={14} color={colors.gris} />
          </View>
          <Text style={styles.backText}>{t(C.backToResult)}</Text>
        </Pressable>

        <Text style={styles.title}>{title}</Text>

        {/* PREVIEW qui FLOTTE : la story EST le container (pas de card noire autour).
            `cardShotRef` + collapsable=false : la cible EXACTE de l'export PNG (D6). */}
        <View ref={cardShotRef} collapsable={false} style={styles.previewWrap}>
          <ShareCard
            {...cardProps}
            ratio={ratio}
            width={PREVIEW_WIDTH[ratio]}
            mascot={gripRank ? <GripMascot rank={gripRank} size={36} /> : undefined}
          />
        </View>
        {/* Le signal privacy vit dans l'APERÇU (retour fondateur : il rassure le
            partageur AVANT le partage — le visuel final, lui, reste épuré). Le
            template héros ne rend plus la note DANS l'image ; on la montre ici. */}
        {cardProps.heroTitle && cardProps.privacyNote ? (
          <Text style={styles.privacyCaption} numberOfLines={1}>
            🔒 {cardProps.privacyNote}
          </Text>
        ) : null}
        {/* Tracé inconnu : la card le dit déjà à la place de la carte ; ici on
            explique POURQUOI, et que les chiffres, eux, sont bien ceux de cette
            course (état vide qui parle, jamais un carré nu). */}
        {!hasKnownRoute ? (
          <Text style={styles.noRouteNote}>{t(SHARE_COPY.traceUnavailableNote)}</Text>
        ) : null}

        {/* Format — UN segmented (accent chartreuse). */}
        <View style={styles.controlRow}>
          <Text style={[styles.controlLabel, styles.controlLabelSolo]}>{t(C.formatLabel)}</Text>
          <Segmented
            accessibilityLabel={t(C.formatA11y)}
            options={formatOptions}
            value={ratio}
            onChange={(id) => setRatio(id)}
            // surface (pas accent) : un seul focus chartreuse fort par scène est
            // la CTA « Partager » (§A). Un segment actif chartreuse plein ferait
            // un 2e bloc chartreuse concurrent.
            tone="surface"
            // 3 formats aux libellés complets (Story · Carré · Carte seule) →
            // strip défilant : AUCUN label n'est jamais tronqué (§7).
            scrollable
          />
        </View>

        {/* Style — UN segmented (surface). Masqué en social_run : une course
            sans capture n'a qu'un visuel honnête, la carte de stats. */}
        {!statsOnlyShare ? (
          <View style={styles.controlRow}>
            <View style={styles.controlHead}>
              <Text style={styles.controlLabel}>{t(C.styleLabel)}</Text>
              {!stylesExpanded ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(C.moreStylesA11y)}
                  onPress={expandStyles}
                  hitSlop={14}
                  style={({ pressed }) => [styles.moreLink, pressed && styles.pressed]}
                >
                  <Text style={styles.moreLinkText}>{t(C.moreStyles)}</Text>
                </Pressable>
              ) : null}
            </View>
            <Segmented
              accessibilityLabel={t(C.styleA11y)}
              options={styleOptions}
              value={selected}
              onChange={pickStyle}
              tone="surface"
              scrollable={stylesExpanded}
            />
          </View>
        ) : null}

        {/* UN SEUL gros CTA chartreuse (suit le format, verbe précis). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryCta.label}
          onPress={() =>
            runAction(
              shareAsImage(cardShotRef.current, shareMessage),
              (via) => (via === 'image' ? t(C.storyExported) : t(C.storyReady)),
              primaryCta.channel,
              (via) => {
                // P1 D6 — share_exported = une IMAGE a réellement été produite
                // (≠ share_card_generated, la preview React ; ≠ share_completed,
                // qui compte aussi le filet texte).
                if (via === 'image') track(EVENTS.shareExported, { ratio, channel: primaryCta.channel });
              },
            )
          }
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Icon name="partage" size={18} color={colors.noir} />
          <Text style={styles.ctaLabel}>{primaryCta.label}</Text>
        </Pressable>

        {/* Actions LÉGÈRES (doc §7.2 : Sticker · Rejouer · Plus), zéro grosse card. */}
        <View style={styles.actionRow}>
          <IconAction
            icon="copier"
            label={t(C.stickerAction)}
            accessibilityLabel={t(C.stickerA11y)}
            onPress={copySticker}
          />
          {canReplay ? (
            <IconAction
              icon="route"
              label={t(C.replayAction)}
              accessibilityLabel={t(C.replayA11y)}
              onPress={replay}
            />
          ) : null}
          <IconAction
            icon="partage"
            label={t(C.otherApp)}
            accessibilityLabel={t(C.otherAppA11y)}
            onPress={() => runAction(openShareSheet(shareMessage), t(C.storyReady), 'native')}
          />
        </View>
      </ScrollView>

      <ShareToast opacity={toast.opacity} message={toast.message} />
    </View>
  );
}

/**
 * ÉTAT VIDE de /partage — aucune course armée. Trois situations, trois copies
 * DISTINCTES (jamais un écran blanc, jamais un « 0 » nu, jamais une carte
 * fabriquée en repli) :
 *   · `loading`      → la session se restaure : on n'affirme RIEN sur le joueur ;
 *   · `needsAccount` → pas connecté : on invite à se connecter ;
 *   · sinon          → connecté mais rien à montrer : on invite à l'action.
 * Un seul CTA chartreuse (§A), et jamais deux (le cas « chargement » n'en a
 * aucun : proposer une action serait déjà affirmer quelque chose).
 */
function ShareEmptyState({
  loading,
  needsAccount,
}: {
  loading: boolean;
  needsAccount: boolean;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();

  const body = loading
    ? t(SHARE_COPY.emptyLoading)
    : needsAccount
      ? t(SHARE_COPY.emptySignedOutBody)
      : t(SHARE_COPY.emptySignedInBody);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.content,
          styles.emptyContent,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(SHARE_COPY.emptyBackA11y)}
          onPress={() => goBack()}
          hitSlop={12}
          style={({ pressed }) => [styles.back, styles.emptyBack, pressed && styles.pressed]}
        >
          <View style={styles.backChevron}>
            <Icon name="chevron" size={14} color={colors.gris} />
          </View>
          <Text style={styles.backText}>{t(SHARE_COPY.emptyBack)}</Text>
        </Pressable>

        <View style={styles.emptyBody}>
          <Text style={styles.title}>{t(SHARE_COPY.emptyTitle)}</Text>
          <Text style={styles.emptyText}>{body}</Text>
        </View>

        {loading ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              needsAccount ? t(SHARE_COPY.emptySignedOutCta) : t(SHARE_COPY.emptySignedInCta)
            }
            onPress={() => {
              haptics.light();
              // `replace` : /partage n'a rien à garder dans la pile — et sur un
              // deep link il n'y a de toute façon aucun écran derrière.
              router.replace(needsAccount ? '/sign-in' : '/');
            }}
            style={({ pressed }) => [styles.cta, styles.emptyCta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaLabel}>
              {needsAccount ? t(SHARE_COPY.emptySignedOutCta) : t(SHARE_COPY.emptySignedInCta)}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Toast local (démo) : bandeau flottant, fondu + auto-dismiss (motion.toastDismissMs).
 * Piloté par un compteur pour re-jouer même si le message est identique. Aucune couleur hors
 * tokens. Volontairement minimal — les confirms de partage ne s'empilent pas.
 */
function useShareToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [message, setMessage] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const show = (m: string) => {
    setMessage(m);
    setNonce((n) => n + 1);
  };

  useEffect(() => {
    if (nonce === 0) return;
    opacity.stopAnimation();
    Animated.timing(opacity, {
      toValue: 1,
      duration: motion.transitionMs,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.transitionMs,
        useNativeDriver: true,
      }).start();
    }, motion.toastDismissMs);
    return () => clearTimeout(t);
  }, [nonce, opacity]);

  return { opacity, message, show };
}

function ShareToast({
  opacity,
  message,
}: {
  opacity: Animated.Value;
  message: string | null;
}) {
  if (message === null) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { opacity }]}>
      <Icon name="badge" size={16} color={colors.chartreuse} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

function isTemplateId(v: string | undefined): v is ShareTemplateId {
  return (
    v === 'simple' ||
    v === 'conquete' ||
    v === 'defense' ||
    v === 'boucle' ||
    v === 'crew' ||
    v === 'classement' ||
    v === 'avantApres' ||
    v === 'carte3d'
  );
}

/**
 * Message narratif prêt à coller (doc §6.1 : « partager une conséquence, pas une
 * performance »). Court, une seule histoire. Le lien est ajouté par l'appelant.
 * Jamais de position rival ni de départ/arrivée (doc §8) : que le résultat.
 * `t` vient du composant (useT) — le message suit la langue courante.
 */
function buildShareHeadline(
  t: ReturnType<typeof useT>,
  intention: RunIntention | null,
  d: ShareDemoData,
  statsOnly: boolean,
): string {
  if (statsOnly) return t(C.headlineStats, { km: d.distanceKm });
  /* LE SERVEUR N'A PAS ENCORE JUGÉ. `zoneName` vide + `zonesGained` à 0, c'est
     l'état normal juste après une course : les claims sont décidés serveur, pas
     ici. Sans ce garde, le gabarit se lisait « I TOOK ZONE » — le mot ZONE passe
     pour un nom de lieu — sous un héros « +0 ZONES ». On annonçait une conquête
     vide sur une VRAIE course, et ça partait sur Instagram. Tant qu'il n'y a
     rien de jugé, on partage la course (la distance est un fait mesuré), jamais
     un territoire. */
  const juged = d.zoneName.trim().length > 0 && (d.zonesGained > 0 || d.zonesDefended > 0);
  if (!juged) return t(C.headlineStats, { km: d.distanceKm });
  if (intention === 'defense') {
    return t(C.headlineDefense, { zone: d.zoneName, n: d.zonesDefended });
  }
  if (intention === 'conquest') {
    return t(C.headlineConquest, { zone: d.zoneName, n: d.zonesGained });
  }
  return t(C.headlineDefault, { n: d.zonesGained, zone: d.zoneName });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { paddingHorizontal: 20 },
  pressed: { opacity: 0.6 },

  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  backChevron: { transform: [{ scaleX: -1 }] },
  backText: { color: colors.gris, fontSize: fontSizes.sm, letterSpacing: 0.4 },

  title: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  privacyCaption: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    marginTop: 8,
  },

  // ── État vide (aucune course armée) : une phrase, un CTA, beaucoup d'air ──
  emptyContent: { flex: 1 },
  emptyBack: { marginBottom: 0 },
  emptyBody: { flex: 1, justifyContent: 'center' },
  emptyText: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    marginTop: 12,
  },
  emptyCta: { marginTop: 0 },
  // Explication du tracé manquant : sous l'aperçu, jamais dans l'image exportée.
  noRouteNote: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    textAlign: 'center',
    marginTop: 4,
  },

  // La preview flotte librement dans l'espace (pas de container autour).
  previewWrap: { alignItems: 'center', marginTop: 22, marginBottom: 26 },
  // Carte 3D injectée en « Carte seule » : remplit le slot plein cadre.
  previewMap: { flex: 1 },
  // Carte SVG en « Carte seule » (vraie course) : centrée dans le slot 3:4 —
  // elle reste carrée (aspect du tracé conservé, jamais étirée).
  previewMapFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewMapSquare: { width: '100%' },

  // Un bloc « label + segmented » séparé du suivant par l'ESPACE, pas par une boîte.
  controlRow: { marginTop: 18 },
  controlHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  // Le label du bloc Style vit DANS controlHead (déjà espacé) → pas de marge propre.
  controlLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600', letterSpacing: 0.2 },
  // Le label Format est un enfant direct de controlRow → il porte son propre espace.
  controlLabelSolo: { marginBottom: 10 },
  moreLink: { paddingVertical: 2 },
  moreLinkText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.chartreuse,
    borderRadius: radii.card,
    paddingVertical: 16,
    marginTop: 26,
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 44,
    marginTop: 22,
  },

  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  toastText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', letterSpacing: 0.2 },
});
