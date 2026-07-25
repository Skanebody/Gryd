/**
 * GRYD — MON TERRITOIRE (/territoire, AMENDEMENT-18 PARTIE B). Ouverte au tap
 * depuis la card du Profil recalé (`profil.tsx:774`).
 *
 * ─── ORDRE DE COMPOSITION ───────────────────────────────────────────────────
 *   1. `StackScreen` : retour + titre de barre + kicker mono gris ;
 *   2. le BLOC DE MÉTRIQUES à séparateurs — 2 cellules, une seule mise en avant
 *      (la surface contrôlée, en chartreuse sur surface sombre) ;
 *   3. la CARTE (220 px), uniquement quand la lecture a abouti ;
 *   4. la CARD D'ÉTAT nommée, quand la page n'a pas de territoire à montrer ;
 *   5. le classement de zone (titre + une ligne d'absence honnête) ;
 *   6. en gris, en bas : ce qui n'existe pas encore ;
 *   7. HORS du scroll, l'unique CTA chartreuse, dont la nature suit l'état.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ───────────────────────────────────────
 * · LE CHÂSSIS RECODÉ (barre de retour maison, kicker et titre stylés à la
 *   main, ScrollView + insets) → `StackScreen`, le gabarit des écrans poussés.
 *   Le kicker y consomme le rôle typo R1 au lieu de le réécrire.
 * · LE COMPOSANT `Section` et ses seize styles compagnons (villes, menaces,
 *   routes, records) : défini, jamais monté depuis la suppression des sections
 *   de démo le 21/07. Du code mort qui décrit un écran qui n'existe pas.
 * · LE BOUTON « PARTAGER ». Il poussait `/partage?template=conquete` sans
 *   jamais appeler `setShareRun` : `/partage` lit un singleton armé par le
 *   Résultat de course et sert son état vide quand il ne l'est pas. Depuis
 *   cette page, « Partager » aboutissait donc TOUJOURS à un écran vide — un CTA
 *   qui ne fait pas ce qu'il dit. Aucune carte de partage territoriale
 *   n'existe : le bouton part, et son absence est ÉCRITE en bas, en gris.
 * · LE CONTOUR PERMANENT de la carte (`borderWidth: 1`) : un contour signale un
 *   ÉTAT, pas une frontière de bloc.
 * · Les sections VILLES / À DÉFENDRE / ROUTES OUVERTES / RECORDS restent
 *   supprimées (21/07) : `hex_claims` porte le propriétaire, la géométrie et la
 *   date de capture — pas de ville (`city_id` est NULL sur toute capture
 *   réelle), pas d'expiration exploitée, pas de pression rivale, pas de record.
 *   Quatre sections qui répètent qu'elles n'ont rien font un écran de ruines.
 *
 * ─── LES CINQ ÉTATS, JAMAIS CONFONDUS (fonction pure `pageState.ts`) ────────
 *   · chargement   → une LIGNE grise non tapable. La page n'affichait RIEN dans
 *                    cet état : visuellement identique au vide, pendant que le
 *                    CTA du bas parlait déjà comme si la lecture était finie ;
 *   · échec        → card nommée, et l'unique CTA devient « Réessayer » ;
 *   · pas connecté → card nommée + CTA « Se connecter » ;
 *   · SANS BACKEND → état DISTINCT : `/(auth)/sign-in` redirige immédiatement
 *                    vers la carte quand `configured` est faux, donc le bouton
 *                    « Se connecter » renvoyait le joueur d'où il venait. C'est
 *                    la garde `canSignIn` du Profil, portée ici ;
 *   · zéro capture → la card invite à courir, le CTA mène à la carte (le GO) ;
 *   · du territoire→ les VRAIS chiffres : zones tenues + surface réelle.
 * Chaque état a désormais sa CARD NOMMÉE : ils ne se distinguaient auparavant
 * que par le libellé du bouton du bas.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ────────────────────────────────────────────
 * · PAS DE NOM DE JOUEUR dans le titre (« Territoire de KORO » de la planche).
 *   Raison technique : la session ne porte pas de pseudo — la page parle à la
 *   1ʳᵉ personne plutôt que d'inventer une identité.
 * · PAS DE VILLES, PAS DE FRONTIÈRES CONTESTÉES, PAS DE RECORDS. Raison
 *   technique : aucune colonne ni vue serveur ne les porte (cf. ci-dessus).
 * · PAS DE PARTAGE. Raison technique : `features/share/shareRun.ts` n'expose
 *   qu'un singleton armé par le Résultat de course ; aucune carte territoriale
 *   n'existe, et ce module appartient à un périmètre gelé.
 * · CLASSEMENT DE ZONE réduit à son titre + une phrase. Raison technique :
 *   aucune table, RPC ou vue n'agrège un palmarès de zone.
 *
 * Inchangé : screen('territoire') au montage (§8), vocabulaire zones/secteurs,
 * libellés courts NON tronqués, anti-shame, zéro position live.
 */
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  borderState,
  colors,
  elevation,
  fonts,
  fontSizes,
  radii,
  sizes,
  spacing,
  typography,
  type IconName,
} from '@klaim/shared';
import { TerritoryFranceMap } from '../src/features/territory/TerritoryFranceMap';
import {
  territoryCta,
  territoryMetricKeys,
  territoryPageState,
  territoryShowsMap,
} from '../src/features/territory/pageState';
import { useRealTerritories } from '../src/features/map/hexClaims';
import { formatKm2 } from '../src/features/widget/territoryWidget';
import { ZoneLeaderboard } from '../src/features/territory/ZoneLeaderboard';
import { screen } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { StackScreen } from '../src/ui/StackScreen';
import { formatInt } from '../src/ui/format';
import { useSession } from '../src/lib/session';
import { useLocale, useT } from '../src/i18n/store';
import { C } from '../src/i18n/catalog/historique';
import { C as Cmap } from '../src/i18n/catalog/map';

/**
 * Hauteur de la carte de résumé — MESURE DE COMPOSITION (≈ 40 % du premier
 * écran), pas une règle de jeu : elle laisse le bloc de métriques et la card
 * d'état visibles sans scroll.
 */
const SUMMARY_MAP_H = 220;

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
   * `stateFor` ne classe alors 'crew' que ce qui m'appartient (territoryBuild),
   * ce qui est exactement le périmètre d'une page « Mon territoire ».
   */
  const { territories, failed, signedOut, loading, reload } = useRealTerritories();
  // Un backend existe-t-il seulement ? Sans lui, « Se connecter » est un
  // cul-de-sac (l'écran d'auth redirige aussitôt vers la carte).
  const { configured } = useSession();

  /** Mes possessions réelles : total de zones + surface réellement couverte. */
  const mine = useMemo(
    () => (territories ?? []).filter((ter) => ter.props.status === 'crew'),
    [territories],
  );
  const myZones = useMemo(() => mine.reduce((sum, ter) => sum + ter.zoneCount, 0), [mine]);
  const myAreaM2 = useMemo(() => mine.reduce((sum, ter) => sum + ter.props.areaM2, 0), [mine]);

  const pageState = territoryPageState({
    loading,
    failed,
    signedOut,
    configured,
    zonesHeld: myZones,
  });
  const metricKeys = territoryMetricKeys({ areaM2: myAreaM2, zonesHeld: myZones });
  const ctaKind = territoryCta(pageState);

  /**
   * L'UNIQUE CTA chartreuse de l'écran (§A.4), et il change de NATURE avec
   * l'état. « Voir sur la carte » est vrai quel que soit ce qu'on sait du
   * territoire : la carte existe et s'ouvre — ce bouton n'affirme donc jamais
   * une lecture terminée. Jamais un bouton qui promet une action sans objet.
   */
  const cta: { label: string; icon: IconName; analyticsId: string; onPress: () => void } =
    ctaKind === 'sign-in'
      ? {
          label: t(Cmap.emptySignedOutCta),
          icon: 'profil',
          analyticsId: 'territoire_sign_in',
          onPress: () => router.push('/(auth)/sign-in'),
        }
      : ctaKind === 'retry'
        ? {
            label: t(Cmap.emptyFailedCta),
            icon: 'alerte',
            analyticsId: 'territoire_retry',
            onPress: reload,
          }
        : {
            label: t(C.seeOnMap),
            icon: 'carte',
            analyticsId: 'territoire_open_map',
            onPress: () => router.push('/(tabs)'),
          };

  /** Copie de l'état — chaque situation a SA card nommée (jamais un trou). */
  const stateCopy: { title: string; body: string } | null =
    pageState === 'signed-out'
      ? { title: t(Cmap.emptySignedOutTitle), body: t(Cmap.emptySignedOutLine) }
      : pageState === 'no-backend'
        ? { title: t(C.territoryNoBackendTitle), body: t(C.territoryNoBackendBody) }
        : pageState === 'failed'
          ? { title: t(Cmap.emptyFailedTitle), body: t(Cmap.emptyFailedLine) }
          : pageState === 'empty'
            ? { title: t(Cmap.emptyNoneTitle), body: t(Cmap.emptyNoneLine) }
            : null;

  return (
    <StackScreen
      title={t(Cmap.territoryPageTitle)}
      icon="carte"
      kicker={t(C.territoryKicker)}
      backHref="/profil"
      floating={
        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Button
            label={cta.label}
            icon={cta.icon}
            size="md"
            analyticsId={cta.analyticsId}
            onPress={cta.onPress}
          />
        </View>
      }
    >
      {/* ── 1. LE BLOC DE MÉTRIQUES — un seul bloc à séparateurs, 2 cellules
             MAX, jamais deux cards. Une métrique sans mesure DISPARAÎT : la
             page se TAIT plutôt que d'aligner un « 0 zone » sous un titre
             « Mon territoire », qui n'est pas une information mais un reproche
             (anti-shame). La surface contrôlée est LA mise en avant — c'est la
             matière du jeu, et la seule cellule chartreuse de l'écran. ── */}
      {metricKeys.length > 0 ? (
        <View style={styles.metrics}>
          {metricKeys.map((key, i) =>
            key === 'area' ? (
              <View
                key={key}
                accessible
                accessibilityLabel={t(C.a11yAreaHeld, { value: formatKm2(myAreaM2, locale) })}
                style={[styles.metricCell, styles.metricLead, i > 0 && styles.metricDivided]}
              >
                <Text
                  style={styles.metricLeadValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formatKm2(myAreaM2, locale)}
                </Text>
                <Text style={styles.metricLabel} numberOfLines={2}>
                  {t(C.metricArea)}
                </Text>
              </View>
            ) : (
              <View
                key={key}
                accessible
                /* La grammaire vit dans l'énoncé du lecteur d'écran : un joueur
                   qui tient UNE zone entendait « 1 zones tenues ». */
                accessibilityLabel={t(myZones === 1 ? C.a11yZonesHeldOne : C.a11yZonesHeldMany, {
                  n: formatInt(myZones),
                })}
                style={[styles.metricCell, i > 0 && styles.metricDivided]}
              >
                <Text
                  style={styles.metricValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formatInt(myZones)}
                </Text>
                <Text style={styles.metricLabel} numberOfLines={2}>
                  {t(C.metricZones)}
                </Text>
              </View>
            ),
          )}
        </View>
      ) : null}

      {/* ── 2. LECTURE EN COURS — une ligne grise non tapable. Sans elle, la
             page était VIDE pendant la requête : indistinguable d'un joueur qui
             n'a rien capturé. Un chargement n'affirme rien. ── */}
      {pageState === 'loading' ? (
        <Text style={styles.stateInline}>{t(C.territoryLoading)}</Text>
      ) : null}

      {/* ── 3. LA CARTE — seulement là où la lecture a ABOUTI (tenu ou vide).
             Ailleurs, une vue monde sans possession occupait le premier écran
             en laissant croire qu'on regardait le territoire du joueur. ── */}
      {territoryShowsMap(pageState) ? (
        <View style={styles.mapWrap}>
          <TerritoryFranceMap style={styles.map} testID="territoire-france-map" />
        </View>
      ) : null}

      {/* ── 4. LA CARD D'ÉTAT NOMMÉE. Elle ne porte AUCUN bouton : l'unique CTA
             chartreuse de l'écran vit en bas et change déjà de nature. ── */}
      {stateCopy ? (
        <Card style={styles.state}>
          <Text style={styles.stateTitle}>{stateCopy.title}</Text>
          <Text style={styles.stateBody}>{stateCopy.body}</Text>
        </Card>
      ) : null}

      {/* ── 5. CLASSEMENT DE ZONE — le composant garde son titre et explique en
             une ligne qu'aucun palmarès n'existe encore, au lieu d'afficher des
             coureurs qui n'existent pas. On ne le montre qu'à un joueur qui
             TIENT du territoire : sur une page déjà vide, une section de plus
             qui dit « rien » n'apprend rien. ── */}
      {pageState === 'held' ? <ZoneLeaderboard /> : null}

      {/* ── 6. Ce qui n'existe pas encore, dit à sa place : en bas, en gris,
             après l'action (patron `qr.tsx`). ── */}
      {pageState === 'held' ? <Text style={styles.footnote}>{t(C.territoryShareNote)}</Text> : null}

      {/* Dégagement du CTA flottant : `StackScreen` réserve la hauteur de la
          barre d'onglets, pas celle d'une barre d'action. Sans cette cale, la
          dernière ligne passerait SOUS le bouton. */}
      <View style={styles.ctaClearance} />
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  // ── Bloc de métriques : UNE surface N1, colonnes séparées par un filet —
  //    jamais deux cards. La 1ʳᵉ colonne est plus large : c'est LA mise en avant.
  metrics: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  metricCell: { flex: 1, gap: 3, paddingHorizontal: spacing.xs, justifyContent: 'center' },
  metricLead: { flex: 1.45, paddingLeft: spacing.md },
  metricDivided: { borderLeftWidth: 1, borderLeftColor: borderState.hairline },
  /**
   * Rôle R6 « stat » recopié à la main : `typography.stat` porte un
   * `fontVariant` en LECTURE SEULE que `StyleSheet` refuse à l'étalement
   * (TextStyle le veut mutable) — même contrainte, même contournement que
   * `StatBlock`. Mêmes valeurs, chiffres tabulaires compris.
   * Chartreuse sur surface N1 SOMBRE (carbone) — jamais sur clair (charte).
   */
  metricLeadValue: {
    color: colors.chartreuse,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * 1.15,
  },
  metricValue: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * 1.2,
  },
  metricLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.3,
    letterSpacing: 0.2,
  },

  // ── Carte de résumé — aucun contour : un contour signale un ÉTAT. ──
  mapWrap: {
    height: SUMMARY_MAP_H,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: elevation.surface,
    marginTop: spacing.md,
  },
  map: { flex: 1 },

  // ── États ──
  state: { gap: spacing.xs, marginTop: spacing.md },
  stateTitle: { ...typography.cardTitle, color: colors.blanc },
  stateBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 },
  stateInline: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.md,
  },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.xl,
  },

  /**
   * Cale de dégagement du CTA flottant — MESURE DE COMPOSITION : hauteur du
   * bouton (`sizes.buttonMd`) + le padding haut de sa barre.
   */
  ctaClearance: { height: sizes.buttonMd + spacing.sm },

  // ── Barre du CTA unique, HORS du ScrollView (donc fixe à l'écran). ──
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.sm,
    backgroundColor: colors.noir,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
  },
});
