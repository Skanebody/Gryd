/**
 * GRYD — page détaillée « Mon territoire » (/territoire), AMENDEMENT-18 PARTIE
 * B. Ouverte au tap depuis la card du Profil.
 *
 * ─── CE QUI A ÉTÉ CORRIGÉ ICI (21/07/2026) ──────────────────────────────────
 * Cette page rendait `TERRITORY_PAGE_DEMO` SANS AUCUNE GARDE. Sur un iPhone
 * neuf, sans compte, elle affichait donc : « Territoire de KORO » (une identité
 * qui n'est pas celle du joueur), « 55 zones tenues · Paris + Lille · 3
 * frontières contestées » (des chiffres qu'il n'a pas gagnés, dans des villes où
 * il n'a jamais couru), trois menaces datées (« République — expire dans 18 h »),
 * trois routes, trois records, et un palmarès de coureurs inexistants. La seule
 * réserve était une ligne de bas de titre « Territoires de démonstration ».
 * Décision fondateur du 21/07 : le bandeau n'y change rien — c'est un
 * territoire fabriqué affiché à la place du sien. Bug bloquant.
 *
 * PREMIÈRE CORRECTION (matin du 21/07) : la démo était mise derrière
 * `isShowcasePlatform`. CORRECTION DÉFINITIVE (celle-ci) : la vitrine elle-même
 * est abandonnée — plus AUCUNE branche ne peut afficher KORO, où que ce soit.
 *
 * ─── CE QUE LA PAGE MONTRE MAINTENANT ───────────────────────────────────────
 * Elle lit `hex_claims` via `useRealTerritories`, exactement comme la Battle
 * Map, et n'affiche QUE ce qui en sort. Quatre états, jamais confondus :
 *   • pas connecté  → la carte le dit, l'unique CTA est « Se connecter » ;
 *   • chargement    → on n'affirme RIEN (pas de « 0 » nu, pas de spinner infini,
 *                     et surtout pas « pas connecté » pendant la restauration de
 *                     session — c'était le bug de `signedOut`, corrigé dans le
 *                     hook lui-même) ;
 *   • échec         → la carte le dit, l'unique CTA est « Réessayer » ;
 *   • zéro capture  → la carte invite à courir, le CTA mène à la carte (le GO) ;
 *   • du territoire → les VRAIS chiffres : zones tenues + surface réelle.
 *
 * Les quatre sections démo (VILLES / À DÉFENDRE / ROUTES OUVERTES / RECORDS) ne
 * sont PAS remplacées par des sections vides : elles n'ont aucune source de
 * données. `hex_claims` porte le propriétaire, la géométrie et la date de
 * capture — pas de ville (`city_id` est NULL sur toute capture réelle, cf.
 * hexClaims.ts), pas d'expiration exploitée, pas de pression rivale, pas de
 * record. Une section « À défendre » vide serait un aveu, quatre en série un
 * champ de ruines (§A : compris en < 3 s). Elles reviendront le jour où une vue
 * serveur les alimente — et pas avant. Le bouton « Défendre » disparaît avec
 * elles : il ciblait `d.threats.find(urgent)`, une menace fabriquée.
 *
 * Inchangé : screen('territoire') au montage (§8), vocabulaire zones/secteurs,
 * libellés courts NON tronqués (Partie D), anti-shame, zéro position live.
 */
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { goBack } from '../src/lib/nav';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  sizes,
  spacing,
  type IconName,
} from '@klaim/shared';
import { TerritoryFranceMap } from '../src/features/territory/TerritoryFranceMap';
import { useRealTerritories } from '../src/features/map/hexClaims';
import { formatKm2 } from '../src/features/widget/territoryWidget';
import { ZoneLeaderboard } from '../src/features/territory/ZoneLeaderboard';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { formatInt } from '../src/ui/format';
import { useLocale, useT } from '../src/i18n/store';
import { C } from '../src/i18n/catalog/historique';
import { C as Cmap } from '../src/i18n/catalog/map';

/** Section compacte : titre + ≤ 2 items visibles + « Voir tout » (anti-scroll). */
function Section({
  title,
  count,
  onSeeAll,
  children,
}: {
  title: string;
  count: number;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count > 2 && onSeeAll ? (
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t(C.a11ySeeAll, { title })}
            onPress={onSeeAll}
          >
            <Text style={styles.seeAll}>{t(C.seeAll)}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * Ce que la page est en train de dire. UN état à la fois — c'est ce qui garantit
 * qu'on ne mélange jamais « pas connecté » et « rien capturé ».
 * `loading` existe pour lui-même : sans lui, l'absence de territoires pendant la
 * requête se lit comme « tu n'as rien pris », et la page dément sa propre phrase
 * une seconde plus tard.
 */
type PageState = 'failed' | 'signed-out' | 'loading' | 'empty' | 'held';

export default function TerritoireScreen() {
  const t = useT();
  const locale = useLocale();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    screen('territoire');
  }, []);

  /**
   * Les VRAIES captures — même source et même hook que la Battle Map, pour que
   * les deux écrans ne puissent pas se contredire. Appelé SANS `crewIds` :
   * `stateFor` ne classe alors 'crew' que ce qui m'appartient (territoryBuild.ts),
   * ce qui est exactement le périmètre d'une page intitulée « Mon territoire ».
   */
  const { territories, failed, signedOut, loading, reload } = useRealTerritories();

  /** Mes possessions réelles : total de zones + surface réellement couverte. */
  const mine = useMemo(
    () => (territories ?? []).filter((ter) => ter.props.status === 'crew'),
    [territories],
  );
  const myZones = useMemo(() => mine.reduce((sum, ter) => sum + ter.zoneCount, 0), [mine]);
  const myAreaM2 = useMemo(
    () => mine.reduce((sum, ter) => sum + ter.props.areaM2, 0),
    [mine],
  );

  // Ordre de priorité IDENTIQUE à celui de la carte et du HUD : chargement >
  // échec > pas de session > vide > tenu. Toute divergence rouvrirait la porte à
  // « la page dit une chose, la carte juste en dessous en dit une autre ».
  // `loading` EN PREMIER (et fourni par le hook, pas déduit de `territories`) :
  // pendant la restauration de session, `signedOut` était vrai et cette page
  // affichait « Se connecter » à un joueur connecté.
  const pageState: PageState = loading
    ? 'loading'
    : failed
      ? 'failed'
      : signedOut
        ? 'signed-out'
        : myZones === 0
          ? 'empty'
          : 'held';

  /**
   * L'UNIQUE CTA chartreuse de l'écran (§A.4), et il change de NATURE avec
   * l'état : se connecter quand il n'y a pas de compte, réessayer quand la
   * lecture a échoué, aller à la carte (où vit le GO) dans tous les autres cas.
   * Jamais un bouton qui promet une action sans objet.
   */
  const cta: { label: string; icon: IconName; onPress: () => void } =
    pageState === 'signed-out'
      ? {
          label: t(Cmap.emptySignedOutCta),
          icon: 'profil',
          onPress: () => router.push('/(auth)/sign-in'),
        }
      : pageState === 'failed'
        ? { label: t(Cmap.emptyFailedCta), icon: 'alerte', onPress: () => reload() }
        : { label: t(C.seeOnMap), icon: 'carte', onPress: () => router.push('/(tabs)') };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── En-tête stratégique ────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.a11yBackProfile)}
              onPress={() => goBack('/profil')}
              hitSlop={12}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <View style={styles.backChevron}>
                <Icon name="chevron" size={20} color={colors.blanc} />
              </View>
            </Pressable>
            <Text style={styles.kicker}>{t(C.territoryKicker)}</Text>
            <View style={styles.back} />
          </View>

          {/* Aucune source ne donne le nom du joueur (la session ne porte pas de
              pseudo aujourd'hui) : la page parle à la 1ʳᵉ personne plutôt que
              d'inventer un KORO. `territoryOf` reprendra sa place le jour où un
              profil réel existe. */}
          <Text style={styles.title}>{t(Cmap.territoryPageTitle)}</Text>

          {/* Résumé chiffré : QUE ce qui a été mesuré (zones tenues + surface).
              La page se TAIT tant qu'il n'y a rien — un « 0 zone » nu sous un
              titre « Mon territoire » n'est pas une information, c'est un
              reproche (anti-shame). Ni villes ni frontières contestées : aucune
              donnée ne les porte. */}
          {pageState === 'held' ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryStrong}>
                {t(C.zonesHeld, { n: formatInt(myZones) })}
              </Text>
              <Text style={styles.summaryDot}> · </Text>
              <Text style={styles.summaryMuted}>{formatKm2(myAreaM2, locale)}</Text>
            </View>
          ) : null}
        </View>

        {/* ── La carte (résumé, ~40 % — hauteur ≤ 260 px) ────────────────── */}
        <View style={styles.mapWrap}>
          <TerritoryFranceMap style={styles.map} testID="territoire-france-map" />
        </View>

        {/* ── SECTIONS SUPPRIMÉES LE 21/07/2026 ───────────────────────────────
            VILLES · À DÉFENDRE · ROUTES OUVERTES · RECORDS sortaient tous de
            `pageDemo.ts` : aucune requête ne les alimentait. Elles ne sont PAS
            remplacées par des versions « vides » — quatre sections qui répètent
            qu'elles n'ont rien, c'est un écran de trous, et §A demande de
            comprendre l'écran en moins de 3 s. L'état réel est déjà dit, une
            seule fois, par la carte au-dessus. Elles reviendront quand une vue
            serveur les portera (ville, expiration, pression rivale, records). */}

        {/* ── CLASSEMENT DE ZONE ─────────────────────────────────────────────
            Le composant garde son titre et explique en une ligne qu'aucun
            palmarès n'existe encore, au lieu d'afficher MIRA/ELIO/SAKO — des
            coureurs qui n'existent pas. On ne le montre qu'à un joueur qui TIENT
            du territoire : sur une page déjà vide, une section de plus qui dit
            « rien » n'apprend rien. */}
        {pageState === 'held' ? <ZoneLeaderboard /> : null}
      </ScrollView>

      {/* ── CTA bas contextuel (jamais « Explorer la carte » vague) ──────────
          UN seul bouton chartreuse (§A.4), dont le LIBELLÉ et la DESTINATION
          suivent l'état : « Se connecter » / « Réessayer » / « Voir sur la
          carte ». Le bouton « Défendre » a disparu : il ciblait une menace
          fabriquée (`d.threats`). « Partager » ne survit que là où il a un
          objet — un territoire réellement tenu. */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cta.label}
          onPress={cta.onPress}
          style={({ pressed }) => [styles.ctaPrimary, pressed && styles.pressed]}
        >
          <Icon name={cta.icon} size={iconSizes.md} color={colors.noir} />
          <Text style={styles.ctaPrimaryLabel}>{cta.label}</Text>
        </Pressable>
        {pageState === 'held' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.a11yShareTerritory)}
            onPress={() => router.push('/partage?template=conquete')}
            style={({ pressed }) => [styles.ctaIcon, pressed && styles.pressed]}
          >
            <Icon name="partage" size={iconSizes.md} color={colors.blanc} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.cardPadding },
  pressed: { opacity: 0.7 },

  // En-tête
  header: { paddingBottom: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 32, alignItems: 'flex-start' },
  backChevron: { transform: [{ scaleX: -1 }] },
  demoNote: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 6 },
  kicker: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },
  title: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginTop: 14,
  },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 6 },
  summaryStrong: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '700' },
  summaryMuted: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  summaryContested: { color: gameColors.contested, fontSize: fontSizes.sm, fontWeight: '600' },
  summaryDot: { color: colors.gris, fontSize: fontSizes.sm },

  // Carte (≤ 260 px, ~40 %)
  mapWrap: {
    height: 220,
    borderRadius: radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  map: { flex: 1 },

  // Sections
  section: { marginTop: 22 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  seeAll: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '700' },

  // Villes
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.carbone,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  cityLeft: { flexDirection: 'column' },
  cityName: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  cityStatus: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
  cityZones: {
    color: colors.chartreuse,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Items génériques (menaces / routes / records)
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  itemIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemIconUrgent: { backgroundColor: gameColors.dangerSoft },
  itemName: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  itemDetail: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  itemDetailUrgent: { color: gameColors.danger },
  itemRecord: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '700' },

  // CTA bas
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.sm,
    backgroundColor: colors.noir,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  ctaPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: sizes.buttonMd,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
  },
  ctaPrimaryLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '700' },
  ctaGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: sizes.buttonMd,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  ctaGhostLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  ctaIcon: {
    width: sizes.buttonMd,
    height: sizes.buttonMd,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
});
