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
 * ─── LA PAGE DIT QUEL MONDE ELLE MONTRE (E14, vélo réel — 26/07/2026) ───────
 * Elle lisait `hex_claims` SANS discipline, donc dans le monde par défaut : un
 * joueur qui ne roule qu'à vélo ouvrait « Mon territoire » sur une carte vide
 * et lisait « cours pour prendre ta première zone » alors qu'il tient des
 * zones. La page lit maintenant les DEUX mondes pour savoir lequel est peuplé,
 * en montre UN — le sien — et le NOMME au-dessus des métriques.
 *
 * Le commutateur n'apparaît QUE si les deux mondes ont réellement du
 * territoire : sinon il ouvrirait sur un trou. Il est LOCAL et non mémorisé —
 * /territoire n'est pas une des quatre surfaces où la planche E14 mémorise le
 * choix « par onglet », et une page poussée qui rouvrirait un mois plus tard
 * sur un monde qu'on ne se rappelle pas avoir choisi serait un piège.
 *
 * Inchangé : screen('territoire') au montage (§8), vocabulaire zones/secteurs,
 * libellés courts NON tronqués, anti-shame, zéro position live.
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DEFAULT_ACTIVITY,
  borderState,
  colors,
  elevation,
  fonts,
  fontSizes,
  radii,
  sizes,
  spacing,
  typography,
  type Activity,
  type IconName,
} from '@klaim/shared';
import { TerritoryFranceMap } from '../src/features/territory/TerritoryFranceMap';
import {
  territoryCta,
  territoryMetricKeys,
  territoryPageState,
  territoryShowsMap,
} from '../src/features/territory/pageState';
import { useMyWorlds, useRealTerritoriesByActivity } from '../src/features/map/hexClaims';
import { profileTerritoryView } from '../src/features/territory/profileTerritory';
import { formatKm2 } from '../src/features/widget/territoryWidget';
import { ActivitySwitch } from '../src/ui/ActivitySwitch';
import { flags } from '../src/lib/flags';
import { WORLD_SCOPE, C as Cprofil } from '../src/i18n/catalog/profil';
import { ZoneLeaderboard } from '../src/features/territory/ZoneLeaderboard';
import { screen } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { StackScreen } from '../src/ui/StackScreen';
import { formatInt } from '../src/ui/format';
import { useSession } from '../src/lib/session';
import { useLocale, useT } from '../src/i18n/store';
import { C, TERRITORY_SHARE_NOTE } from '../src/i18n/catalog/historique';
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
   * Les VRAIES captures, DANS LES DEUX MONDES — même source que la Battle Map,
   * pour que les deux écrans ne puissent pas se contredire. Appelé SANS
   * `crewIds` : `stateFor` ne classe alors 'crew' que ce qui m'appartient
   * (territoryBuild), ce qui est exactement le périmètre d'une page « Mon
   * territoire ».
   *
   * ─── POURQUOI LES DEUX MONDES ICI (E14, 26/07/2026) ───────────────────────
   * Cette page lisait `useRealTerritories()` sans discipline, donc le monde par
   * défaut : un joueur qui ne roule qu'à vélo ouvrait « Mon territoire » sur
   * une carte vide et lisait « cours pour prendre ta première zone » alors
   * qu'il en tient. On lit les deux mondes pour SAVOIR lequel est peuplé, puis
   * la page en montre UN et le NOMME (le commutateur ci-dessous est la sortie
   * quand il y en a deux).
   */
  const { worlds, failed, signedOut, loading, reload } = useRealTerritoriesByActivity();
  const myWorlds = useMyWorlds(worlds);
  // Un backend existe-t-il seulement ? Sans lui, « Se connecter » est un
  // cul-de-sac (l'écran d'auth redirige aussitôt vers la carte).
  const { configured } = useSession();

  /**
   * LENTILLE DE CETTE PAGE — locale, jamais persistée, et c'est un choix.
   * La planche E14 mémorise le choix « par onglet » sur ses QUATRE surfaces ;
   * /territoire n'en est pas une (c'est une page poussée depuis le Profil).
   * Lui donner une clé de persistance la ferait s'ouvrir un mois plus tard sur
   * un monde que le joueur ne se rappelle pas avoir choisi.
   *
   * `null` = le joueur n'a rien choisi → la page montre le monde qu'il POSSÈDE.
   */
  const [chosen, setChosen] = useState<Activity | null>(null);
  const territoryView = useMemo(
    () =>
      myWorlds === null
        ? null
        : profileTerritoryView({
            run: { areaM2: myWorlds.run.areaM2, zones: myWorlds.run.zones },
            bike: { areaM2: myWorlds.bike.areaM2, zones: myWorlds.bike.zones },
          }),
    [myWorlds],
  );
  /**
   * Le monde MONTRÉ. Sans choix explicite : celui que le joueur possède quand
   * il n'en possède qu'un (c'est le correctif), sinon la discipline par défaut
   * — qui, en hybride comme en compte neuf, ne masque rien d'inatteignable (le
   * commutateur est là en hybride, et il n'y a rien à voir en compte neuf).
   */
  const shown: Activity =
    chosen ?? (territoryView?.kind === 'single' ? territoryView.world.activity : DEFAULT_ACTIVITY);
  /**
   * Le commutateur n'apparaît QUE si les deux mondes ont du territoire. Sinon
   * il ouvrirait sur un monde vide — et §A interdit de peindre une action dont
   * le résultat est un trou. Son absence n'est pas un mensonge : la page dit
   * quel monde elle montre, et il n'y en a qu'un.
   */
  const switchVisible = flags.bike && territoryView?.kind === 'both';

  /** Mes possessions réelles DANS LE MONDE MONTRÉ — jamais une somme des deux. */
  const world = myWorlds?.[shown] ?? null;
  const myZones = world?.zones ?? 0;
  const myAreaM2 = world?.areaM2 ?? 0;

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
      {/* ── 0. LE MONDE MONTRÉ, DIT ET (s'il y en a deux) CHANGEABLE ────────
             Une surface sans commutateur E14 ne doit pas choisir en silence :
             la phrase de portée nomme la discipline, et le commutateur
             n'apparaît que quand l'autre monde a réellement quelque chose à
             montrer. §A : ce n'est pas un CTA (fond carbone, filet gris). ── */}
      {territoryShowsMap(pageState) && metricKeys.length > 0 ? (
        <View style={styles.lensRow}>
          <Text style={styles.lensLabel}>{t(WORLD_SCOPE[shown])}</Text>
          {switchVisible ? (
            <ActivitySwitch
              activity={shown}
              onChange={setChosen}
              runLabel={t(Cprofil.sectionTerritoryRun)}
              bikeLabel={t(Cprofil.sectionTerritoryBike)}
              testID="territoire-activity-switch"
            />
          ) : null}
        </View>
      ) : null}

      {/* ── 1. LE BLOC DE MÉTRIQUES — un seul bloc à séparateurs, 2 cellules
             MAX, jamais deux cards. Une métrique sans mesure DISPARAÎT : la
             page se TAIT plutôt que d'aligner un « 0 zone » sous un titre
             « Mon territoire », qui n'est pas une information mais un reproche
             (anti-shame). La surface contrôlée est LA mise en avant — c'est la
             matière du jeu, et la seule cellule chartreuse de l'écran.
             Les deux chiffres décrivent LE MONDE NOMMÉ juste au-dessus, jamais
             une somme des deux (E14). ── */}
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
          {/* La carte peint LE monde que la page vient de nommer — jamais les
              deux superposés (cf. le bloc de tête de TerritoryFranceMap). */}
          <TerritoryFranceMap
            activity={shown}
            style={styles.map}
            testID="territoire-france-map"
          />
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
             qui dit « rien » n'apprend rien.
             Il reçoit le MONDE MONTRÉ : sans lui, la section disait « personne
             n'a couru ici » sous un en-tête « À vélo » — l'écran se contredisait
             sur lui-même (E14, 26/07/2026). ── */}
      {pageState === 'held' ? <ZoneLeaderboard activity={shown} /> : null}

      {/* ── 6. Ce qui n'existe pas encore, dit à sa place : en bas, en gris,
             après l'action (patron `qr.tsx`).
             ELLE AUSSI REÇOIT LE MONDE MONTRÉ (26/07/2026) : montée sous
             `held`, donc dans l'état où `shown` peut valoir `bike` et où la
             page IMPRIME « À vélo » quatre blocs plus haut, elle affirmait
             « seule une COURSE terminée peut devenir une carte de partage ».
             C'est le défaut que le commentaire du ZoneLeaderboard ci-dessus
             décrit mot pour mot — la note de bas de page avait été oubliée. ── */}
      {pageState === 'held' ? (
        <Text style={styles.footnote}>{t(TERRITORY_SHARE_NOTE[shown])}</Text>
      ) : null}

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
  /**
   * Ligne « quel monde je regarde » : la phrase à gauche, le commutateur à
   * droite quand il y a deux mondes. `flexShrink` sur le texte pour qu'il
   * enroule au lieu de pousser la capsule hors de l'écran (§A.9).
   */
  lensRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  lensLabel: { flexShrink: 1, color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.4 },
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
