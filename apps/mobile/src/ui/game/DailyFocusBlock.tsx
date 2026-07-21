/**
 * GRYD — LOT 3 : LE bloc « raison de revenir aujourd'hui » (A-45 §3).
 *
 * Il affiche AU PLUS UNE chose : soit l'étape suivante du parcours d'accueil,
 * soit la Zone du Jour. L'arbitrage est fait en amont par `useDailyFocus` — ce
 * composant ne choisit rien, il rend.
 *
 * §A (épuration), point par point :
 *   · surface PLATE posée dans le flux — aucune card dans une card ;
 *   · AUCUN CTA : l'unique CTA chartreuse de l'écran Aujourd'hui reste le départ
 *     de course. Ce bloc informe la décision, il ne la concurrence pas ;
 *   · ≤ 3 lignes de texte, compris en moins de 3 s ;
 *   · aucun texte tronqué : les phrases s'enroulent, jamais de « … ».
 *
 * COULEURS PAR RÔLE, jamais par décoration : la chartreuse ne marque que
 * l'ACQUIS (distinction du jour obtenue, palier franchi) et vit exclusivement
 * sur `colors.carbone` — jamais sur fond clair (contraste 1,2:1, interdit charte).
 * Une zone qu'il reste à prendre est en blanc/gris : on n'agite pas un accent
 * d'urgence sur une invitation.
 *
 * A-46 × A-45 — L'EFFORT PROPOSÉ TIENT DANS LA LIGNE QUI EXISTAIT DÉJÀ. La
 * distance issue des habitudes réelles remplace le contenu de la 3ᵉ ligne (celle
 * qui portait la récompense), et le verdict de terrain (`fit`) remplace le
 * contenu de la 2ᵉ (celle qui porte le rôle). Aucune ligne n'est ajoutée : §A
 * plafonne ce bloc à 3 lignes, et « on rajoute juste une petite ligne » est
 * exactement comment un écran clair devient une liste de devoirs. Chaque phrase
 * de remplacement redit « une distinction, aucun point » — l'anti pay-to-win ne
 * quitte jamais l'écran.
 *
 * L'APP NE MENT JAMAIS : quand le moteur renvoie `none`, ce composant AFFICHE
 * l'état honnête (« Pas de zone du jour aujourd'hui ») au lieu de disparaître.
 * Disparaître serait ambigu — le joueur ne saurait pas si la mécanique existe.
 * Il ne disparaît que lorsque l'appelant n'a RIEN de réel à lui passer (`null`).
 *
 * ANTI-SHAME : le parcours d'accueil n'affiche ni jour, ni retard, ni échéance —
 * il n'en reçoit d'ailleurs aucun (cf. engine/welcomeChallenge.ts, dont le type
 * de sortie ne contient volontairement aucun champ de reproche). La phrase
 * « Rien n'expire, rien ne se perd » est affichée telle quelle.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, iconSizes, radii, spacing } from '@klaim/shared';
import type { WelcomeStepKey } from '@klaim/shared';
import { Icon } from '../Icon';
import { C } from '../../i18n/catalog/daily';
import { useLocale, useT } from '../../i18n/store';
import type { DailyFocus } from '../../features/daily/useDailyFocus';
import type { DailyZoneEffort } from '../../features/daily/zoneFit';
import type { Entry, Locale } from '../../i18n/types';

export interface DailyFocusBlockProps {
  /** État RÉEL (useDailyFocus). `null` → le composant ne rend rien. */
  focus: DailyFocus | null;
}

/**
 * Libellé de chaque palier. Table EXHAUSTIVE indexée par `WelcomeStepKey` : si
 * un palier est ajouté dans game-rules sans sa copie, c'est une erreur de
 * TYPESCRIPT — donc un gate rouge, jamais une étape muette à l'écran.
 */
const STEP_LABELS: Readonly<Record<WelcomeStepKey, Entry>> = {
  run_3k: C.welcomeStepRun3k,
  run_5k: C.welcomeStepRun5k,
  loop: C.welcomeStepLoop,
  capture: C.welcomeStepCapture,
  share: C.welcomeStepShare,
};

/**
 * « 5,5 km » — virgule décimale partout sauf en anglais. Même règle que
 * `formatKm2` (features/widget/territoryWidget.ts) : pas d'`Intl`, dont le
 * support diffère entre Hermes iOS, Hermes Android et Deno.
 */
function formatKm(km: number, locale: Locale): string {
  const fixed = km.toFixed(1);
  return `${locale === 'en' ? fixed : fixed.replace('.', ',')} km`;
}

/**
 * L'effort → SA phrase. Le `switch` est exhaustif sur `DailyZoneEffort['kind']`
 * (le type de retour l'impose : un variant non traité ferait sortir `undefined`,
 * refusé par TypeScript).
 *
 * C'EST ICI QUE L'HONNÊTETÉ EST STRUCTURELLE : `C.dailyZoneEffortLearned` — la
 * seule copie qui dise « adapté à tes habitudes » — n'est atteignable que depuis
 * `kind === 'learned'`, et `resolveDailyZoneEffort` ne produit ce variant que
 * pour une distance de `source === 'learned'`. Aucune autre branche ne peut y
 * accéder, quel que soit l'oubli de test.
 *
 * `unknown` retombe sur `dailyZoneReward` : on ne sait rien de la distance de
 * cette personne, donc on ne dit rien d'elle.
 */
function effortLine(
  effort: DailyZoneEffort,
  t: (entry: Entry, vars?: Record<string, string | number>) => string,
  locale: Locale,
): string {
  switch (effort.kind) {
    case 'learned':
      return t(C.dailyZoneEffortLearned, { km: formatKm(effort.km, locale) });
    case 'manual':
      return t(C.dailyZoneEffortManual, { km: formatKm(effort.km, locale) });
    case 'learning':
      // Reste inconnu ⇒ phrase sans nombre, jamais un « encore 0 courses ».
      return effort.runsLeft === null
        ? t(C.dailyZoneEffortLearningSoon)
        : t(C.dailyZoneEffortLearning, { runs: effort.runsLeft });
    case 'off':
      return t(C.dailyZoneEffortOff);
    case 'unknown':
      return t(C.dailyZoneReward);
  }
}

export function DailyFocusBlock({ focus }: DailyFocusBlockProps) {
  const t = useT();
  const locale = useLocale();
  if (focus === null) return null;

  // ── Parcours d'accueil ─────────────────────────────────────────────────────
  if (focus.kind === 'welcome') {
    const { challenge } = focus;
    // `complete` n'arrive pas ici (useDailyFocus bascule alors sur la Zone du
    // Jour), mais on ne suppose jamais : on rend la félicitation, pas un vide.
    if (challenge.kind === 'complete') {
      return (
        <View accessibilityRole="summary" style={styles.block}>
          <View style={styles.head}>
            <Icon name="aujourdhui" size={iconSizes.sm} color={colors.chartreuse} />
            <Text style={styles.kicker}>{t(C.welcomeKicker)}</Text>
          </View>
          <Text style={styles.title}>{t(C.welcomeComplete)}</Text>
        </View>
      );
    }

    const stepLabel = t(STEP_LABELS[challenge.next.key]);
    const progress = t(C.welcomeProgress, {
      done: challenge.doneCount,
      total: challenge.total,
    });

    return (
      <View
        accessibilityRole="summary"
        accessibilityLabel={t(C.welcomeA11y, {
          done: challenge.doneCount,
          total: challenge.total,
          step: stepLabel,
          note: t(C.welcomeNoRush),
        })}
        style={styles.block}
      >
        <View style={styles.head}>
          {/* Chartreuse dès qu'il y a de l'acquis — la couleur récompense, elle
              ne signale pas un manque. À 0 palier, le repère reste gris. */}
          <Icon
            name="aujourdhui"
            size={iconSizes.sm}
            color={challenge.doneCount > 0 ? colors.chartreuse : colors.gris}
          />
          <Text style={styles.kicker}>{t(C.welcomeKicker)}</Text>
          <Text style={styles.counter}>{progress}</Text>
        </View>
        <Text style={styles.title}>{stepLabel}</Text>
        <Text style={styles.detail}>{t(C.welcomeNoRush)}</Text>
      </View>
    );
  }

  // ── Zone du Jour ───────────────────────────────────────────────────────────
  const { zone, distinctionActive, effort } = focus;

  // État HONNÊTE : aucune zone réelle ne convient. On le dit, on ne le cache pas.
  if (zone.kind === 'none') {
    return (
      <View
        accessibilityRole="summary"
        accessibilityLabel={t(C.dailyZoneA11y, {
          zone: t(C.dailyZoneNone),
          detail: t(C.dailyZoneNoneDetail),
        })}
        style={styles.block}
      >
        <View style={styles.head}>
          <Icon name="carte" size={iconSizes.sm} color={colors.gris} />
          <Text style={styles.kicker}>{t(C.dailyZoneKicker)}</Text>
        </View>
        <Text style={styles.titleMuted}>{t(C.dailyZoneNone)}</Text>
        <Text style={styles.detail}>{t(C.dailyZoneNoneDetail)}</Text>
      </View>
    );
  }

  // Nom RÉEL du secteur, ou la formule neutre — jamais un quartier inventé.
  const zoneName = zone.sectorName ?? t(C.dailyZoneUnnamed);
  // Le rôle dit ce qu'il y a à y faire. `tight` (moins de terrain libre que ce
  // qu'une sortie habituelle traverserait) est un FAIT sur ce secteur-ci : il
  // change la phrase, il ne change PAS le secteur proposé.
  const tight = (effort.kind === 'learned' || effort.kind === 'manual') && effort.fit === 'tight';
  const role =
    zone.role !== 'neutral'
      ? t(C.dailyZoneFragile)
      : tight
        ? t(C.dailyZoneFreeTight)
        : t(C.dailyZoneFree);
  // Une fois la distinction acquise, on félicite : relancer sur une zone déjà
  // capturée transformerait une récompense en corvée — et annoncer une distance
  // à courir pour une conquête DÉJÀ faite serait faux.
  const detail = distinctionActive ? t(C.dailyZoneDone) : effortLine(effort, t, locale);

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={t(C.dailyZoneA11y, { zone: `${zoneName}, ${role}`, detail })}
      style={styles.block}
    >
      <View style={styles.head}>
        <Icon
          name="carte"
          size={iconSizes.sm}
          color={distinctionActive ? colors.chartreuse : colors.gris}
        />
        <Text style={styles.kicker}>{t(C.dailyZoneKicker)}</Text>
      </View>
      <Text style={[styles.title, distinctionActive && styles.titleAccent]}>{zoneName}</Text>
      <Text style={styles.detail}>{role}</Text>
      <Text style={styles.detailMuted}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    marginTop: spacing.md,
    gap: spacing.xxs,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    flexShrink: 1,
  },
  counter: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginLeft: 'auto',
    fontVariant: ['tabular-nums'],
  },
  title: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  // Chartreuse UNIQUEMENT sur fond carbone (jamais sur fond clair — charte).
  titleAccent: { color: colors.chartreuse },
  titleMuted: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  detail: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.4,
  },
  detailMuted: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
  },
});
