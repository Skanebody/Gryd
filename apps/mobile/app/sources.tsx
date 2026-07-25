/**
 * GRYD — GRYD VERIFY HUB. « Seules les courses vérifiées capturent. Les autres
 * enrichissent tes stats. » L'écran liste les sources RÉELLEMENT utilisables et
 * l'état honnête de chacune.
 *
 * ─── ORDRE DE COMPOSITION ─────────────────────────────────────────────────────
 *   1. `StackScreen` : kicker + titre ;
 *   2. l'en-tête de confiance (le bleu `verify` = état de confiance, jamais une
 *      identité) ;
 *   3. SOURCES VÉRIFIÉES — une `ListRow` par source : plaque d'icône, nom,
 *      ligne de contexte « trust · chemin · dernier résultat », état à droite ;
 *   4. pourquoi la liste est courte, et ce que cet écran ne sait pas dire.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ─────────────────────────────────────────
 * · LE PLACEHOLDER « … » du statut en cours de lecture. Un caractère d'ellipse
 *   seul n'affirme rien, et c'est précisément le caractère que la règle 9
 *   interdit. Il devient un état NOMMÉ : « Lecture… ».
 * · L'ABSENCE D'ÉTAT « PAS CONNECTÉ ». « Importer » était peint hors session :
 *   l'utilisateur ouvrait le sélecteur natif, choisissait un fichier, attendait
 *   le parse — et apprenait SEULEMENT ALORS qu'un compte était nécessaire
 *   (`adapters/gpx.ts`). Le coût était payé avant le message. La décision est
 *   maintenant prise avant le rendu, dans `features/sources/rowView.ts` (pure et
 *   testée), et « pas de compte » PRIME sur l'action.
 * · LA CHARTREUSE SUR L'ICÔNE DE CHAQUE SOURCE. La chartreuse dit « moi / mon
 *   crew » (§C) ; ici elle décorait une source tierce. L'icône est grise, et le
 *   bleu `verify` reste réservé à l'ÉTAT actif.
 * · LES CADRES PERMANENTS des cards, et les TROIS `numberOfLines` nus (nom,
 *   ligne de trust, détail) : « Verbundene Quellen » et « Import + Prüfung »
 *   coupaient en « … » dès l'allemand.
 * · LE `SourceRow` LOCAL, qui dupliquait `ListRow` et son `IconPlate`.
 * · LA SECONDE NOTE DE PIED : deux paragraphes gris disaient la même chose.
 * · Le champ `path` et `TRUST_LABELS`, en français dans un module de DONNÉES,
 *   affichés sur chaque ligne → `catalog/sources.ts`.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ──────────────────────────────────────────────
 * · Le titre « GRYD Verify Hub » reste littéral : c'est un NOM PROPRE, invariant
 *   comme « GRYD » ou « GPX » (déclaré en tête de `catalog/sources.ts`).
 * · CET ÉCRAN N'A PAS DE 4ᵉ ÉTAT, et il le DÉCLARE en bas. Raison technique :
 *   `gpxAdapter.status()` renvoie inconditionnellement « prêt » et la capture
 *   native est locale — aucune lecture réseau ne peut échouer. Gérer un échec
 *   impossible serait aussi faux que d'ignorer un échec réel.
 * · La déconnexion n'a pas de ligne dédiée : aucune des deux sources listées ne
 *   crée de liaison durable (l'import GPX ne délie rien). Le cas `connected`
 *   reste géré pour la première source connectable re-listée.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  colors,
  elevation,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  sizes,
  spacing,
  typography,
} from '@klaim/shared';
import { C } from '../src/i18n/catalog/auth';
import { C as CSrc } from '../src/i18n/catalog/sources';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { useSession } from '../src/lib/session';
import { supabase } from '../src/lib/supabase';
import { Icon } from '../src/ui/Icon';
import { ListRow } from '../src/ui/ListRow';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { TRUST_LABELS, VERIFY_SOURCES, type VerifySourceDef } from '../src/features/sources/catalog';
import { SOURCE_ADAPTERS } from '../src/features/sources/adapters/registry';
import type { SourceAdapterSnapshot } from '../src/features/sources/adapters/types';
import { sourceContextLine, sourceRowKind } from '../src/features/sources/rowView';

/**
 * Libellés courts des états NON actionnables — Entries i18n. `needs_keys` /
 * `needs_dev_build` / `coming_soon` ne sont plus atteignables depuis le
 * catalogue actuel : la table reste complète pour qu'une source re-listée
 * s'affiche correctement dès la première ligne rajoutée.
 */
const STATUS_CHIP_LABELS: Record<string, Entry> = {
  app_only: C.chipAppOnly,
  needs_keys: C.chipNeedsKeys,
  needs_dev_build: C.chipNeedsDevBuild,
  coming_soon: C.chipSoon,
};

/** Ligne source : nom, « Trust · chemin · dernier résultat », état à droite. */
function SourceRow({
  source,
  snapshot,
  busy,
  signedIn,
  onAction,
  onDisconnect,
}: {
  source: VerifySourceDef;
  snapshot: SourceAdapterSnapshot | undefined;
  busy: boolean;
  signedIn: boolean;
  onAction: () => void;
  onDisconnect: () => void;
}) {
  const t = useT();
  const isImport = source.action === 'import';
  const kind = sourceRowKind({
    availability: source.availability,
    ...(source.action !== undefined ? { action: source.action } : {}),
    status: snapshot?.status,
    busy,
    signedIn,
  });

  // Phrase de détail : Entry traduite (chemin normal) ou `detail` legacy des
  // adaptateurs non listés. Jamais les deux. Un segment sans source DISPARAÎT.
  const detailText = snapshot?.detailEntry
    ? t(snapshot.detailEntry, snapshot.detailVars ?? {})
    : snapshot?.detail;
  const sublabel = sourceContextLine([t(TRUST_LABELS[source.trust]), t(source.path), detailText]);

  const active = kind === 'active' || kind === 'connected';
  // §C : la chartreuse dit « moi / mon crew » — elle ne décore pas une source
  // tierce. Le bleu `verify` reste réservé à l'ÉTAT de confiance actif.
  const iconColor = active ? gameColors.verify : colors.gris;

  /** Le texte de droite ET l'action, dérivés du MÊME état. */
  const value =
    kind === 'active'
      ? t(C.statusActive)
      : kind === 'reading'
        ? t(CSrc.statusReading)
        : kind === 'needsAccount'
          ? t(CSrc.needsAccountChip)
          : kind === 'busy'
            ? t(isImport ? C.importBusy : C.connectBusy)
            : kind === 'connected'
              ? t(C.statusConnected)
              : kind === 'blocked'
                ? t(STATUS_CHIP_LABELS[snapshot?.status ?? ''] ?? C.chipSoon)
                : t(isImport ? C.importCta : C.connectCta);

  // Aucun `onPress` sur ce qui n'aboutirait pas : un état de lecture, un compte
  // manquant ou une source bloquée ne sont pas des actions.
  const press =
    kind === 'import' || kind === 'connect'
      ? onAction
      : kind === 'connected'
        ? onDisconnect
        : undefined;

  return (
    <ListRow
      icon={source.icon}
      iconColor={iconColor}
      label={source.name}
      sublabel={sublabel}
      value={value}
      {...(press !== undefined ? { onPress: press } : {})}
      {...(press !== undefined
        ? {
            accessibilityLabel: t(
              kind === 'connected' ? C.disconnectA11y : isImport ? C.importA11y : C.connectA11y,
              { name: source.name },
            ),
          }
        : {})}
    />
  );
}

export default function SourcesScreen() {
  const t = useT();
  const { session, configured } = useSession();
  const signedIn = configured && session !== null && supabase !== null;

  useEffect(() => {
    screen('sources');
  }, []);

  /** États RÉELS par source, lus des adaptateurs (AMENDEMENT-15 §3). */
  const [snapshots, setSnapshots] = useState<Record<string, SourceAdapterSnapshot>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const entries = await Promise.all(
        Object.values(SOURCE_ADAPTERS).map(async (adapter) => {
          const snap = await adapter.status();
          return [adapter.id, snap] as const;
        }),
      );
      if (mounted) setSnapshots(Object.fromEntries(entries));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /** CTA principal d'une source : connexion durable OU import ponctuel. */
  const runAction = async (key: string) => {
    const adapter = SOURCE_ADAPTERS[key];
    if (!adapter || busyKey) return;
    haptics.light();
    setBusyKey(key);
    try {
      const snap = await adapter.connect();
      setSnapshots((prev) => ({ ...prev, [key]: snap }));
    } catch {
      // Filet UI (« jamais d'exception vers l'UI ») : état honnête, action
      // re-tentable, aucun crash.
      setSnapshots((prev) => ({
        ...prev,
        [key]: { status: 'disconnected', lastSync: null, detailEntry: C.connectFailed },
      }));
    } finally {
      setBusyKey(null);
    }
  };

  const disconnect = async (key: string) => {
    const adapter = SOURCE_ADAPTERS[key];
    if (!adapter || busyKey) return; // même garde anti double-tap
    haptics.light();
    setBusyKey(key);
    try {
      const snap = await adapter.disconnect();
      setSnapshots((prev) => ({ ...prev, [key]: snap }));
    } catch {
      // Filet symétrique : la déconnexion a échoué → la source RESTE connectée.
      setSnapshots((prev) => ({
        ...prev,
        [key]: {
          status: 'connected',
          lastSync: prev[key]?.lastSync ?? null,
          detailEntry: C.disconnectFailed,
        },
      }));
    } finally {
      setBusyKey(null);
    }
  };

  /** Une source connectable existe-t-elle, dont l'action exige un compte ? */
  const needsAccount = !signedIn && VERIFY_SOURCES.some((s) => s.availability === 'connectable');

  return (
    // « GRYD Verify Hub » : nom propre, invariant (cf. catalog/sources.ts).
    <StackScreen title="GRYD Verify Hub" icon="radar" kicker={t(C.sourcesKicker)}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="radar" size={iconSizes.lg} color={gameColors.verify} />
        </View>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroStrong}>{t(C.sourcesHeroStrong)}</Text>
          <Text style={styles.heroLine}>{t(C.sourcesHeroLine)}</Text>
        </View>
      </View>

      <SectionLabel style={styles.kicker}>{t(C.sectionVerified)}</SectionLabel>
      {VERIFY_SOURCES.map((source) => (
        <SourceRow
          key={source.key}
          source={source}
          snapshot={snapshots[source.key]}
          busy={busyKey === source.key}
          signedIn={signedIn}
          onAction={() => void runAction(source.key)}
          onDisconnect={() => void disconnect(source.key)}
        />
      ))}

      {/* ÉTAT ① — dit AVANT le tap, pas après le sélecteur de fichier. */}
      {needsAccount ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>{t(CSrc.needsAccountTitle)}</Text>
          <Text style={styles.stateBody}>{t(CSrc.needsAccountBody)}</Text>
        </View>
      ) : null}

      {/* Pourquoi la liste est courte — dit franchement, sans « bientôt ». */}
      <Text style={styles.footnote}>{t(C.sourcesScopeNote)}</Text>
      {/* Et ce que cet écran ne sait PAS dire : il n'a pas de 4ᵉ état. */}
      <Text style={styles.footnote}>{t(CSrc.noReadFailureNote)}</Text>
    </StackScreen>
  );
}

/** Rythme vertical des sur-titres — commun à tous les écrans de réglages. */
const KICKER_TOP = 24;
const KICKER_BOTTOM = 10;

const styles = StyleSheet.create({
  kicker: { marginTop: KICKER_TOP, marginBottom: KICKER_BOTTOM },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    marginTop: spacing.xs,
  },
  // Le SEUL contour de l'écran : il porte l'état de confiance, donc il se voit.
  heroIcon: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    borderRadius: radii.control,
    borderWidth: 1.5,
    borderColor: gameColors.verify,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: { flex: 1, gap: spacing.xxs },
  heroStrong: { ...typography.itemTitle, color: colors.blanc, lineHeight: fontSizes.sm * 1.4 },
  heroLine: { ...typography.body, color: colors.gris, lineHeight: fontSizes.sm * 1.4 },

  stateCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  stateTitle: { ...typography.itemTitle, color: colors.blanc },
  stateBody: { ...typography.meta, color: colors.gris, lineHeight: fontSizes.xs * 1.6 },

  footnote: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.lg,
  },
});
