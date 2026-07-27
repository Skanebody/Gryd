/**
 * GRYD — E61 « FIN DE SAISON » (spéc l.1981) : le bilan d'une saison CLOSE.
 *
 * ─── LA CONDITION D'EXISTENCE DE CET ÉCRAN ───────────────────────────────────
 * Il ne s'affiche QUE si `season_close` a réellement inséré la notification de
 * clôture de ce joueur (`notifications`, type 'season' — le rang final y est
 * GELÉ par le serveur). C'est une exigence de la constitution : une célébration
 * déclenchée par un calcul client serait un mensonge doublé d'une violation de
 * « tout est décidé serveur ». Aucun rang n'est recalculé ici ; le hook
 * `useSeasonRecap` LIT, et si le fait n'existe pas l'écran dit « pas de
 * classement cette saison » — l'état DOMINANT aujourd'hui, la base étant vide.
 *
 * ─── COMPOSITION (spéc E61) ──────────────────────────────────────────────────
 *   rang final · bilan · récompenses · prochaine saison · règles de remise à
 *   zéro · CTA.
 *
 * ─── LES DEUX ÉCARTS À LA PLANCHE, ET POURQUOI ───────────────────────────────
 *  1. CTA `RÉCUPÉRER` → « Voir mes badges ». Les médailles sont déjà décernées
 *     par le serveur (`founderBadges` → `user_badges`) au moment de la clôture :
 *     il n'y a RIEN à réclamer. Un bouton « Récupérer » simulerait une mécanique
 *     de claim que le code ne tient pas. Le CTA accuse réception (il pose
 *     `read_at` sur MA notification, seul droit d'écriture accordé par 0006) et
 *     mène à la collection. La clé `ctaRecuperer` reste au catalogue, non peinte,
 *     pour le jour où une remise réelle existera.
 *  2. LE BILAN NE COMPTE NI ZONES NI DÉFENSES. `season_close` phase 2 SUPPRIME
 *     les `hex_claims` au reset : après le wipe, un compte de zones rendrait 0
 *     pour tout le monde — un chiffre faux présenté comme un souvenir. Les clés
 *     `bilanZones` / `bilanDefenses` restent donc non peintes tant qu'aucun
 *     agrégat de fin de saison n'est persisté côté serveur (inscrit en suspens).
 *
 * ─── ANTI-PAY-TO-WIN (constitution §3) ───────────────────────────────────────
 * Le rang final vient de `season_close`, calculé sur des points de territoire
 * gagnés en courant. Les paliers énoncés ici rejouent EXACTEMENT `founderBadges`
 * (`recapRewards`, testé). Aucun chemin d'achat n'est importé ; la copie le dit
 * (`recompensesNature` : « Aucun avantage de jeu »).
 *
 * §A — un seul CTA chartreuse, et il n'apparaît QUE sur l'état 'ready'.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import {
  EVENTS,
  SEASON_FREEZE_HOURS,
  colors,
  elevation,
  fonts,
  fontSizes,
  iconSizes,
  radii,
  spacing,
  type Activity,
} from '@klaim/shared';
import { flags } from '../src/lib/flags';
import { useSeasonRecap } from '../src/features/season/useSeasonRecap';
import { recapRewards } from '../src/features/season/seasonRecap';
import { SeasonTierList } from '../src/features/season/SeasonTierList';
import { useMyBadges } from '../src/features/badges/myBadges';
import { C } from '../src/i18n/catalog/finSaison';
import { useT } from '../src/i18n/store';
import { formatInt, formatKm } from '../src/ui/format';
import { screen, track } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { Segmented } from '../src/ui/game/Segmented';
import { ACTIVITY_LABELS } from '../src/ui/activityLens';

const MS_PER_DAY = 86_400_000;

export default function SeasonRecapRoute() {
  if (!flags.season) return <Redirect href="/" />;
  return <SeasonRecapScreen />;
}

function SeasonRecapScreen() {
  const t = useT();
  const { status, view, reload, select, acknowledge } = useSeasonRecap();
  const badges = useMyBadges();
  const badgesKnown = badges.source === 'server' && !badges.loading;

  useEffect(() => {
    screen('fin_saison');
  }, []);

  // §18 — `state` FERMÉ, les quatre issues de la lecture. AUCUN rang final,
  // AUCUN palier : dans une ville de Saison 0, (rang, heure) désigne une
  // personne. Le serveur connaît déjà le rang — l'analytics n'en a aucun besoin.
  useEffect(() => {
    if (status === 'loading') return;
    track(EVENTS.seasonRecapViewed, {
      state:
        status === 'signed-out'
          ? 'signed_out'
          : status === 'failed'
            ? 'failed'
            : status === 'none'
              ? 'no_result'
              : 'ready',
    });
  }, [status]);

  // ── LES ÉTATS NON NOMINAUX, JAMAIS CONFONDUS ──
  if (status === 'loading') {
    return (
      <StackScreen title={t(C.titre)} icon="trophee" backHref="/season">
        <Text style={styles.stateNote}>{t(C.etatChargement)}</Text>
      </StackScreen>
    );
  }
  if (status !== 'ready' || view === null) {
    const [title, bodyText] =
      status === 'signed-out'
        ? [C.etatDeconnecteTitre, C.etatDeconnecteCorps]
        : status === 'failed'
          ? [C.etatEchecTitre, C.etatEchecCorps]
          : [C.etatSansResultatTitre, C.etatSansResultatCorps];
    return (
      <StackScreen title={t(C.titre)} icon="trophee" backHref="/season">
        <View style={styles.stateBlock}>
          <Text style={styles.stateTitle}>{t(title)}</Text>
          <Text style={styles.stateBody}>{t(bodyText)}</Text>
          {status === 'failed' ? (
            <Button label={t(C.reessayer)} onPress={reload} variant="ghost" size="md" />
          ) : null}
        </View>
      </StackScreen>
    );
  }

  const { recap, season, next, total, summary, available } = view;
  const rewards = recapRewards(recap);
  const km = formatKm(summary.distanceM / 1000);
  // Jours avant l'ouverture de la PROCHAINE saison — seulement si elle existe
  // déjà en base. On n'extrapole pas une date à partir de l'intersaison.
  const daysToNext =
    next === null
      ? null
      : Math.max(0, Math.ceil((Date.parse(next.startsAt) - Date.now()) / MS_PER_DAY));

  return (
    <StackScreen
      title={t(C.titre)}
      icon="trophee"
      kicker={t(C.kickerSaisonClose, { n: formatInt(season.number) })}
      backHref="/season"
    >
      {/* ══════════ 0 · LA DISCIPLINE — nommée, jamais tue (28/07/2026) ══════
          `season_close` produit UN résultat PAR DISCIPLINE. L'écran n'en peignait
          aucun nom : un athlète hybride lisait « #17 sur 42 » en gros sans savoir
          s'il regardait sa course ou son vélo, et le bilan dessous était borné à
          la même discipline sous des libellés génériques. Le commutateur
          n'apparaît QUE s'il y a réellement deux résultats — sinon ce serait un
          contrôle qui ne change rien (§A). Avec un seul, la discipline reste dite,
          en sur-titre du rang. */}
      {available.length > 1 ? (
        <View style={styles.disciplineSwitch}>
          <Segmented
            accessibilityLabel={t(C.sectionRangFinal)}
            options={available.map((a) => ({ id: a, label: ACTIVITY_LABELS[a] }))}
            value={recap.activity}
            onChange={(id) => select(id as Activity)}
          />
        </View>
      ) : null}

      {/* ══════════ 1 · RANG FINAL — gelé par le serveur, jamais recalculé ══════ */}
      <Section icon="couronne" label={t(C.sectionRangFinal)} />
      <View style={styles.finalCard}>
        {/* Le PÉRIMÈTRE avant le chiffre : un rang sans son monde est un chiffre
            dont on tait la portée. */}
        <Text style={styles.finalScope}>{ACTIVITY_LABELS[recap.activity]}</Text>
        <Text style={styles.finalRank}>
          {t(C.rangFinal, { rank: formatInt(recap.rank), total: formatInt(total) })}
        </Text>
        {/* Égalité ASSUMÉE (§13.6) : dite en toutes lettres, jamais masquée. */}
        {recap.tied ? <Text style={styles.finalMeta}>{t(C.rangExAequo)}</Text> : null}
      </View>

      {/* ══════════ 2 · BILAN — mes courses de la fenêtre, discipline bornée ══════
          `seasonRecapSummary(runRows, recap.activity)` : ces trois chiffres ne
          comptent QUE cette discipline. Le dire est la moitié du travail — E14
          interdit de sommer les mondes, afficher l'un pour l'autre est la même
          faute en plus discret. */}
      <Section icon="performance" label={t(C.sectionBilan)} />
      <Text style={styles.scopeNote}>
        {t(C.bilanPerimetre, { discipline: ACTIVITY_LABELS[recap.activity] })}
      </Text>
      <View style={styles.statRow}>
        <Stat label={t(C.bilanSorties)} value={formatInt(summary.runs)} />
        <Stat label={t(C.bilanJoursActifs)} value={formatInt(summary.activeDays)} />
        {/* `formatKm` peut rendre null (valeur non affichable) : on n'écrit alors
            aucune distance plutôt qu'un « 0 km » qui se lirait comme un fait. */}
        {km !== null ? <Stat label={t(C.bilanDistance)} value={`${km} km`} /> : null}
      </View>

      {/* ══════════ 3 · RÉCOMPENSES — l'énoncé de ce que le serveur a décerné ══════ */}
      <Section icon="cadeau" label={t(C.sectionRecompenses)} />
      <Text style={styles.paragraph}>{t(C.recompensesNature)}</Text>
      {rewards.length === 0 ? (
        <Text style={styles.paragraph}>{t(C.recompensesAucune)}</Text>
      ) : (
        <SeasonTierList unlocked={badgesKnown ? badges.unlockedIds : null} tiers={rewards} />
      )}

      {/* ══════════ 4 · CE QUI REPART, CE QUI RESTE ══════════ */}
      <Section icon="info" label={t(C.sectionRemiseAZero)} />
      <Text style={styles.paragraph}>{t(C.reglesRepartAZero)}</Text>
      <Text style={styles.paragraph}>{t(C.reglesConserve)}</Text>
      <Text style={styles.paragraph}>{t(C.reglesCarteRepartAZero)}</Text>
      <Text style={styles.paragraph}>
        {t(C.reglesGel, { h: formatInt(SEASON_FREEZE_HOURS) })}
      </Text>

      {/* ══════════ 5 · PROCHAINE SAISON — lue en base, ou avouée inconnue ══════ */}
      <Section icon="sablier" label={t(C.sectionProchaine)} />
      <Text style={styles.paragraph}>
        {daysToNext === null
          ? t(C.prochaineDateInconnue)
          : t(C.prochaineDansJours, { n: formatInt(daysToNext) })}
      </Text>

      {/* ══════════ 6 · L'UNIQUE CTA ══════════
          Il n'ouvre aucun coffre : les badges SONT déjà décernés. Il accuse
          réception (read_at) et mène à la collection. */}
      <View style={styles.ctaWrap}>
        <Button
          label={t(C.ctaVoirMesBadges)}
          onPress={() => {
            acknowledge();
            router.push('/badges');
          }}
          analyticsId="season_recap_badges"
        />
      </View>
    </StackScreen>
  );
}

function Section({
  icon,
  label,
}: {
  icon: 'couronne' | 'performance' | 'cadeau' | 'info' | 'sablier';
  label: string;
}) {
  return (
    <View style={styles.sectionHead}>
      <Icon name={icon} size={iconSizes.sm} color={colors.gris} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

/** Un chiffre du bilan : valeur au-dessus, libellé dessous. Aucune card. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 26,
    marginBottom: 10,
  },
  sectionLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },

  // ── Rang final : une seule couche de container ──
  finalCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.xxs,
  },
  finalRank: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  finalMeta: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  /* Le PÉRIMÈTRE du rang (RUN / BIKE) : sur-titre discret, jamais chartreuse —
     ce n'est pas une action, c'est la portée du chiffre juste dessous. */
  finalScope: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  /* La même vérité, redite une fois là où elle est le plus facile à oublier :
     les trois chiffres du bilan ne comptent QUE cette discipline. */
  scopeNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
  disciplineSwitch: { marginBottom: spacing.md },

  // ── Bilan : chiffres à plat, posés sur l'espace ──
  statRow: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  stat: { gap: 2 },
  statValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontFamily: fonts.display,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },

  paragraph: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.55,
    marginBottom: spacing.xs,
  },
  stateNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.sm,
  },
  stateBlock: { gap: spacing.sm, marginTop: spacing.md, alignItems: 'flex-start' },
  stateTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
  },
  stateBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.55 },
  ctaWrap: { marginTop: spacing.lg },
});
