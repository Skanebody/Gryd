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
 * distance/allure/durée, points. La démo SHARE_DEMO ne sert QUE si /partage
 * s'ouvre sans course (deep link/dev) : l'écran s'annonce alors comme EXEMPLE,
 * jamais comme « ta course ». En social_run (aucune capture), seul le style
 * « Carte » (stats) est proposé — aucun visuel qui prétendrait un secteur pris.
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
import { Icon } from '../src/ui/Icon';
import { IconAction, Segmented, ShareCard, type ShareCardRatio } from '../src/ui/game';
import { ShareMap3D } from '../src/features/share/ShareMap3D';
import { getShareRun } from '../src/features/share/shareRun';
import {
  SHARE_DEMO,
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
  stickerText,
  type ShareActionResult,
} from '../src/features/share/shareActions';
import { usePrivacyPrefs } from '../src/features/privacy/store';
import { intentionFromParam, type RunIntention } from '../src/features/run/intention';
import { GripMascot } from '../src/features/social/GripMascot';
import { gripRankForLevel, playerLevelForXp } from '../src/features/crew/rules';
import { MY_SOCIAL_PROFILE } from '../src/features/social/demo';

/** Rang GRIP du joueur (dérivé de l'XP permanent) — signature du partage. */
const SHARE_GRIP_RANK = gripRankForLevel(playerLevelForXp(MY_SOCIAL_PROFILE.xp));

/**
 * Formats d'export (Story / Carré / Carte seule) — options du segmented
 * « Format ». « Carte seule » (AMENDEMENT-24) = la carte 3D en grand, chrome
 * minimal (trace + zone + 1 ligne).
 */
const FORMATS: readonly { id: ShareCardRatio; label: string; icon: 'partage' | 'carte' }[] = [
  // Libellés courts pour tenir 3-up à 375px (les ratios 9:16/1:1 étaient
  // décoratifs — « Story » implique 9:16, « Carré » implique 1:1).
  { id: 'story', label: 'Story', icon: 'partage' },
  { id: 'square', label: 'Carré', icon: 'carte' },
  { id: 'mapOnly', label: 'Carte seule', icon: 'carte' },
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

/** Libellé COURT par style (jamais tronqué). Distinct du `chip` legacy des templates. */
const STYLE_LABEL: Record<ShareTemplateId, string> = {
  simple: 'Carte',
  conquete: 'Conquête',
  defense: 'Défense',
  boucle: 'Boucle',
  crew: 'Crew',
  classement: 'Classement',
  avantApres: 'Avant/Après',
  carte3d: 'Carte 3D',
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

export default function PartageScreen() {
  const insets = useSafeAreaInsets();
  const toast = useShareToast();
  const params = useLocalSearchParams<{
    template?: string;
    mode?: string;
    intention?: string;
  }>();

  // PARTAGE VRAI : les stats de la course affichée au Résultat (shareRun.ts).
  // null = /partage ouvert sans course → EXEMPLE annoncé comme tel.
  const shareRun = getShareRun();
  const isExample = shareRun === null;
  const runCard = shareRun?.card ?? SHARE_DEMO;
  const intention = shareRun ? shareRun.intention : intentionFromParam(params.intention);
  // Social Run = stats seules, aucune capture : on ne propose JAMAIS un visuel
  // « secteur pris » pour une course qui n'a rien capturé.
  const statsOnlyShare = !isExample && shareRun.mode === 'social_run';

  // Style par défaut : l'intention de la course (défense → card Défense),
  // stats seules → Carte ; sinon Conquête. Le param `template` reste prioritaire.
  const defaultTemplate: ShareTemplateId = statsOnlyShare
    ? 'simple'
    : intention === 'defense'
      ? 'defense'
      : 'conquete';
  const [selected, setSelected] = useState<ShareTemplateId>(
    !statsOnlyShare && isTemplateId(params.template) ? params.template : defaultTemplate,
  );
  const [ratio, setRatio] = useState<ShareCardRatio>('story');
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
  const privacyNote = maskEndpoints ? 'Départ et arrivée masqués' : undefined;

  useEffect(() => {
    screen('partage', { template: selected });
    // Preview auto-générée (doc §12 : share_preview_generated).
    track(EVENTS.shareCardGenerated);
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
  const traceShown = ANIMATABLE_STYLES.includes(selected) && ratio !== 'mapOnly';

  const cardProps = useMemo(() => {
    // La card projette les VRAIES valeurs du run (runCard) — SHARE_DEMO ne
    // passe ici que dans le mode exemple. `privacyNote` = badge de confiance §9,
    // seulement là où la trace tronquée est réellement visible.
    const built = { ...template.build(runCard, view), privacyNote: traceShown ? privacyNote : undefined };
    // « Carte seule » (AMENDEMENT-24) : la carte 3D EN GRAND quel que soit le
    // style — si le template n'a pas déjà son propre fond carte (les 5 SVG),
    // on injecte la GRYD 3D Conquest Map plein cadre. Le style choisi ne règle
    // alors QUE le KPI/la ligne (chrome minimale).
    if (ratio === 'mapOnly' && built.mapBackground === undefined) {
      return { ...built, mapBackground: <ShareMap3D style={styles.previewMap} /> };
    }
    return built;
  }, [template, ratio, runCard, view, privacyNote, traceShown]);

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
  const styleOptions = useMemo(() => {
    const extras = STYLE_EXTRA.filter(
      (id) => id !== 'boucle' || isExample || runCard.loopBonusZones > 0,
    );
    return (stylesExpanded ? [...STYLE_MAIN, ...extras] : STYLE_MAIN).map((id) => ({
      id,
      label: STYLE_LABEL[id],
    }));
  }, [stylesExpanded, isExample, runCard.loopBonusZones]);

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
  const shareMessage = `${buildShareHeadline(intention, runCard, statsOnlyShare)}\n${deepLink}`;

  // Action de partage RÉELLE (fire-and-forget) : ne confirme que si ça a marché
  // (honnêteté — un « annulé » reste silencieux). `msg` peut dépendre du canal
  // réel (`via`) pour ne jamais mentir (« copié » vs « prêt à partager »).
  // `onOk` émet les events qui exigent un succès réel (jamais au tap).
  const runAction = (
    p: Promise<ShareActionResult>,
    msg: string | ((via: 'clipboard' | 'share' | 'webshare') => string),
    channel: string,
    onOk?: (via: 'clipboard' | 'share' | 'webshare') => void,
  ) => {
    haptics.light();
    void p.then((r) => {
      if (r.ok) {
        track(EVENTS.shareCompleted, { channel });
        onOk?.(r.via);
        toast.show(typeof msg === 'function' ? msg(r.via) : msg);
      } else if (r.reason === 'unavailable') {
        toast.show('Partage indisponible ici');
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
      ? `${runCard.distanceKm} km sur GRYD`
      : `+${runCard.zonesGained} zones · ${runCard.zoneName}`;
    runAction(
      copyText(stickerText(runCard, head, deepLink)),
      (via) =>
        via === 'clipboard' ? 'Sticker copié · colle-le sur ta story' : 'Sticker prêt à partager',
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

  // Titre = ce que la course a fait (jamais « conquête » pour une défense) ;
  // sans course armée, l'écran s'annonce comme aperçu d'exemple.
  const title = isExample
    ? 'Aperçu du partage'
    : intention === 'defense'
      ? 'Partager ta défense'
      : intention === 'conquest'
        ? 'Partager ta conquête'
        : 'Partager ta course';

  // CTA primaire aligné sur le format choisi — toujours un verbe précis.
  const primaryCta =
    ratio === 'square'
      ? { label: 'Partager en carré', channel: 'instagram_feed' as const }
      : ratio === 'mapOnly'
        ? { label: 'Partager la carte', channel: 'instagram_feed' as const }
        : { label: 'Partager en story', channel: 'instagram_story' as const };

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
          accessibilityLabel="Revenir au résultat"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <View style={styles.backChevron}>
            <Icon name="chevron" size={14} color={colors.gris} />
          </View>
          <Text style={styles.backText}>Résultat</Text>
        </Pressable>

        <Text style={styles.title}>{title}</Text>
        {/* Honnêteté : sans course, les chiffres sont un exemple — dit tel quel. */}
        {isExample ? (
          <Text style={styles.exampleNote}>
            Exemple — termine une course pour partager la tienne.
          </Text>
        ) : null}

        {/* PREVIEW qui FLOTTE : la story EST le container (pas de card noire autour). */}
        <View style={styles.previewWrap}>
          <ShareCard
            {...cardProps}
            ratio={ratio}
            width={PREVIEW_WIDTH[ratio]}
            mascot={<GripMascot rank={SHARE_GRIP_RANK} size={36} />}
          />
        </View>

        {/* Format — UN segmented (accent chartreuse). */}
        <View style={styles.controlRow}>
          <Text style={[styles.controlLabel, styles.controlLabelSolo]}>Format</Text>
          <Segmented
            accessibilityLabel="Format de partage"
            options={FORMATS}
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
              <Text style={styles.controlLabel}>Style</Text>
              {!stylesExpanded ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Afficher plus de styles"
                  onPress={expandStyles}
                  hitSlop={14}
                  style={({ pressed }) => [styles.moreLink, pressed && styles.pressed]}
                >
                  <Text style={styles.moreLinkText}>Plus de styles</Text>
                </Pressable>
              ) : null}
            </View>
            <Segmented
              accessibilityLabel="Style de la carte"
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
          onPress={() => runAction(openShareSheet(shareMessage), 'Story prête.', primaryCta.channel)}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Icon name="partage" size={18} color={colors.noir} />
          <Text style={styles.ctaLabel}>{primaryCta.label}</Text>
        </Pressable>

        {/* Actions LÉGÈRES (doc §7.2 : Sticker · Rejouer · Plus), zéro grosse card. */}
        <View style={styles.actionRow}>
          <IconAction
            icon="copier"
            label="Sticker"
            accessibilityLabel="Copier le sticker à coller sur ta story"
            onPress={copySticker}
          />
          {canReplay ? (
            <IconAction
              icon="route"
              label="Rejouer"
              accessibilityLabel="Rejouer l'animation de conquête"
              onPress={replay}
            />
          ) : null}
          <IconAction
            icon="partage"
            label="Autre app"
            accessibilityLabel="Partager vers une autre app"
            onPress={() => runAction(openShareSheet(shareMessage), 'Story prête.', 'native')}
          />
        </View>
      </ScrollView>

      <ShareToast opacity={toast.opacity} message={toast.message} />
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
 */
function buildShareHeadline(
  intention: RunIntention | null,
  d: ShareDemoData,
  statsOnly: boolean,
): string {
  if (statsOnly) return `${d.distanceKm} km sur GRYD. Cours. Capture. Défends.`;
  if (intention === 'defense') {
    return `${d.zoneName} tient encore. ${d.zonesDefended} zones défendues. #GRYD`;
  }
  if (intention === 'conquest') {
    return `J'ai pris ${d.zoneName}. +${d.zonesGained} zones. #GRYD`;
  }
  return `+${d.zonesGained} zones sur ${d.zoneName}. #GRYD`;
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
  // Note exemple (mode sans course) — honnête, discrète, jamais < 12 px.
  exampleNote: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    marginTop: 6,
  },

  // La preview flotte librement dans l'espace (pas de container autour).
  previewWrap: { alignItems: 'center', marginTop: 22, marginBottom: 26 },
  // Carte 3D injectée en « Carte seule » : remplit le slot plein cadre.
  previewMap: { flex: 1 },

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
