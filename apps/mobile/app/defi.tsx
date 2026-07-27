/**
 * GRYD — E58 · DÉFI (`/defi?handle=…`) : LA FEUILLE COURTE (spec l.1919).
 *
 * ─── COMMENT ON ARRIVE ICI, ET POURQUOI PAS AUTREMENT ───────────────────────
 * Par le bouton « Défier » d'une PERSONNE de `/amis` — et il n'est peint que
 * sur qui peut réellement être défié (`canChallenge` : ami, ou suivi
 * réciproque). Il n'existe AUCUN champ « à qui ? » sur cet écran, et c'est
 * délibéré : taper un @handle libre en ferait un moyen de solliciter des
 * inconnus, ce que 0088 refuse (`no_relation`). La cible arrive donc TOUJOURS
 * d'un lien déjà consenti.
 *
 * Ouvert sans `handle` (lien profond, retour arrière bizarre), l'écran ne peint
 * PAS un formulaire qui n'aboutirait nulle part : il dit qu'il n'a personne à
 * défier et renvoie à la liste. C'est la même règle qu'ailleurs — un écran sans
 * sujet se tait, il n'improvise pas.
 *
 * ─── FEUILLE COURTE : QUATRE DÉCISIONS, PAS UNE DE PLUS ─────────────────────
 *   1. le FORMAT (les quatre de la spec, DUEL_KINDS) ;
 *   2. la FENÊTRE (DUEL_PERIOD_DAYS_MIN → MAX) ;
 *   3. l'OBJECTIF — un chiffre, ou un libellé de zone publique ;
 *   4. la DISCIPLINE (Run / Bike — un défi Run ne se compare pas à un Bike).
 * Un seul CTA chartreuse : « Envoyer le défi » (§A4). Il est INACTIF tant que
 * `duelDraftIssue` trouve quelque chose à redire — jamais peint sur un envoi
 * condamné.
 *
 * ─── CE QU'ON N'ÉCRIT PAS, ET POURQUOI ──────────────────────────────────────
 * · AUCUNE MISE, AUCUN ENJEU, AUCUN GAGE. `duels` n'a pas de colonne où
 *   l'écrire (0088 §0bis) : l'anti-pay-to-win tient par l'absence de champ, pas
 *   par une intention. Rien de ce que le joueur possède n'entre dans un défi.
 * · AUCUNE COORDONNÉE. `defend_zone` prend un LIBELLÉ de lieu public, pas un
 *   point ni un identifiant d'hexagone : ce texte part chez quelqu'un d'autre
 *   (§12), et une adresse n'a rien à y faire — la copie le dit sous le champ.
 * · AUCUNE PROMESSE DE SCORE. Accepter un défi ne déclenche aucun décompte
 *   (`scoringExists: false`) ; c'est écrit sur `/defis`, pas ici, pour ne pas
 *   charger la feuille d'envoi de ce qui se lit dans la boîte.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ACTIVITIES,
  DUEL_EXPIRY_HOURS,
  DUEL_KINDS,
  DUEL_PERIOD_DAYS_MAX,
  DUEL_PERIOD_DAYS_MIN,
  EVENTS,
  colors,
  elevation,
  gameColors,
  fontSizes,
  radii,
  sizes,
  spacing,
  typography,
  type Activity,
  type DuelKind,
} from '@klaim/shared';
import { screen, track } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { Segmented } from '../src/ui/game/Segmented';
import { ACTIVITY_LABELS } from '../src/ui/activityLens';
import { ToastHost, useToast } from '../src/features/social/Toast';
import {
  duelDraftIssue,
  duelPayload,
  type DuelDraft,
} from '../src/features/social/socialGraph';
import { createDuel } from '../src/features/social/socialGraphData';
import {
  DUEL_KIND_LABEL,
  DUEL_TARGET_UNIT,
  socialRefusalText,
} from '../src/features/social/socialLabels';
import { C } from '../src/i18n/catalog/social';
import { useT } from '../src/i18n/store';

/**
 * Les fenêtres proposées. Ce ne sont PAS de nouvelles constantes de jeu : les
 * bornes restent DUEL_PERIOD_DAYS_MIN/MAX (game-rules), et cette liste n'en est
 * qu'un échantillon d'ergonomie — 1 jour, une semaine, deux semaines. Un
 * curseur au jour près aurait fait choisir entre 6 et 7 jours, une décision que
 * personne ne veut prendre.
 */
const PERIOD_CHOICES = [1, 7, DUEL_PERIOD_DAYS_MAX] as const;

export default function DefiScreen() {
  const t = useT();
  const toast = useToast();
  const params = useLocalSearchParams<{ handle?: string }>();
  const handle = typeof params.handle === 'string' ? params.handle.trim() : '';

  const [kind, setKind] = useState<DuelKind>('distance');
  const [activity, setActivity] = useState<Activity>('run');
  const [periodDays, setPeriodDays] = useState<number>(7);
  const [targetText, setTargetText] = useState('');
  const [zoneLabel, setZoneLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    screen('defi');
  }, []);

  const draft: DuelDraft = useMemo(() => {
    // Une saisie vide n'est PAS un zéro : `null` dit « pas encore renseigné »,
    // ce qui donne `issue = 'target'` et garde le CTA inactif.
    const parsed = Number(targetText.replace(',', '.'));
    return {
      kind,
      activity,
      periodDays,
      target: kind === 'defend_zone' ? null : (targetText.trim() && Number.isFinite(parsed) ? parsed : null),
      zoneLabel: kind === 'defend_zone' ? zoneLabel : null,
    };
  }, [activity, kind, periodDays, targetText, zoneLabel]);

  const issue = duelDraftIssue(draft);
  const unit = DUEL_TARGET_UNIT[kind];

  const send = useCallback(async () => {
    if (busy || sent || issue !== null || handle.length === 0) return;
    setBusy(true);
    const out = await createDuel(duelPayload(handle, draft));
    setBusy(false);
    track(EVENTS.duelSent, {
      kind: draft.kind,
      activity: draft.activity,
      periodDays: draft.periodDays,
      result:
        out.kind === 'done' ? 'sent'
        : out.kind === 'refused' ? out.refusal
        : out.kind,
    });
    if (out.kind === 'done') {
      // Envoyé : on VERROUILLE l'écran plutôt que de laisser réappuyer. Un
      // second envoi serait refusé (`already_pending`) et ressemblerait à un bug.
      setSent(true);
      toast.show(t(C.duelOkSent));
      return;
    }
    if (out.kind === 'failed') return toast.show(t(C.errNetwork));
    if (out.kind === 'unsupported') return toast.show(t(C.unsupportedTitle));
    toast.show(socialRefusalText(t, out.refusal, true));
  }, [busy, draft, handle, issue, sent, t, toast]);

  // ── AUCUNE CIBLE : on ne peint pas un formulaire sans destinataire. ───────
  if (handle.length === 0) {
    return (
      <StackScreen title={t(C.duelNewTitleNoTarget)} icon="cible" backHref="/amis">
        <Card style={styles.stateCard}>
          <Text style={styles.stateTitle}>{t(C.duelNoTargetTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.duelNoTargetBody)}</Text>
          <View style={styles.stateAction}>
            <Button
              variant="ghost"
              size="md"
              label={t(C.duelOpenFriends)}
              onPress={() => router.replace('/amis')}
              analyticsId="defi_open_friends"
            />
          </View>
        </Card>
      </StackScreen>
    );
  }

  return (
    <StackScreen
      title={t(C.duelNewTitle, { handle })}
      icon="cible"
      backHref="/amis"
      floating={<ToastHost state={toast} />}
    >
      {/* ── 1. FORMAT ──────────────────────────────────────────────────────── */}
      <View style={styles.block}>
        <SectionLabel>{t(C.duelKindKicker)}</SectionLabel>
        <Segmented
          accessibilityLabel={t(C.duelKindKicker)}
          scrollable
          options={DUEL_KINDS.map((k) => ({ id: k, label: t(DUEL_KIND_LABEL[k]) }))}
          value={kind}
          onChange={(k) => {
            setKind(k);
            // Changer de format remet à zéro ce qui n'a plus de sens : garder
            // une cible chiffrée sur « défendre une zone » enverrait un champ
            // que le serveur refuse (`bad_target`).
            if (k === 'defend_zone') setTargetText('');
            else setZoneLabel('');
          }}
        />
      </View>

      {/* ── 2. FENÊTRE ─────────────────────────────────────────────────────── */}
      <View style={styles.block}>
        <SectionLabel>{t(C.duelPeriodKicker)}</SectionLabel>
        <Segmented
          accessibilityLabel={t(C.duelPeriodKicker)}
          options={PERIOD_CHOICES.map((n) => ({
            id: String(n),
            label: t(C.duelPeriodDays, { n }),
          }))}
          value={String(periodDays)}
          onChange={(id) => {
            const n = Number(id);
            if (n >= DUEL_PERIOD_DAYS_MIN && n <= DUEL_PERIOD_DAYS_MAX) setPeriodDays(n);
          }}
        />
      </View>

      {/* ── 3. OBJECTIF : un chiffre, OU un lieu public — jamais les deux ──── */}
      {kind === 'defend_zone' ? (
        <View style={styles.block}>
          <SectionLabel>{t(C.duelZoneKicker)}</SectionLabel>
          <TextInput
            style={styles.input}
            value={zoneLabel}
            onChangeText={setZoneLabel}
            placeholder={t(C.duelZonePlaceholder)}
            placeholderTextColor={colors.gris}
            maxLength={80}
            accessibilityLabel={t(C.duelZoneKicker)}
          />
          {/* La garde de vie privée est ÉCRITE **ET** APPLIQUÉE (27/07/2026).
              Elle n'était qu'écrite : un avertissement de placeholder n'empêche
              rien, et le serveur acceptait 80 caractères libres qui repartaient
              VERBATIM chez l'autre personne. `duel_create` les refuse désormais
              (`crew_outing_place_refusal`, 0085), et cette ligne dit le motif
              AVANT l'envoi — pendant que le doigt est encore sur le champ.
              La note générique cède la place au motif dès qu'il y en a un :
              deux phrases empilées diraient deux fois la même chose. */}
          {issue === 'zone_street_address' ? (
            <Text style={styles.noteAlert}>{t(C.duelErrZoneAddress)}</Text>
          ) : issue === 'zone_door_detail' ? (
            <Text style={styles.noteAlert}>{t(C.duelErrZoneDoor)}</Text>
          ) : (
            <Text style={styles.note}>{t(C.duelZoneNote)}</Text>
          )}
        </View>
      ) : (
        <View style={styles.block}>
          <SectionLabel>{t(C.duelTargetKicker)}</SectionLabel>
          <View style={styles.targetRow}>
            <TextInput
              style={[styles.input, styles.targetInput]}
              value={targetText}
              onChangeText={setTargetText}
              keyboardType="decimal-pad"
              placeholder="—"
              placeholderTextColor={colors.gris}
              maxLength={6}
              accessibilityLabel={t(C.duelTargetKicker)}
            />
            {unit ? <Text style={styles.unit}>{t(unit)}</Text> : null}
          </View>
        </View>
      )}

      {/* ── 4. DISCIPLINE ──────────────────────────────────────────────────── */}
      <View style={styles.block}>
        <Segmented
          accessibilityLabel={ACTIVITY_LABELS.run}
          tone="surface"
          options={ACTIVITIES.map((a) => ({ id: a, label: ACTIVITY_LABELS[a] }))}
          value={activity}
          onChange={setActivity}
        />
      </View>

      {/* ── L'UNIQUE CTA CHARTREUSE ────────────────────────────────────────── */}
      <View style={styles.cta}>
        <Button
          variant="primary"
          size="lg"
          label={t(C.duelSend)}
          onPress={() => void send()}
          loading={busy}
          // §A4 — inactif tant que l'envoi serait refusé, ou déjà parti.
          disabled={issue !== null || busy || sent}
          analyticsId="duel_send"
        />
        {/* La nature de l'objet est dite AVANT l'envoi : c'est une invitation,
            refusable d'un tap, et qui tombe toute seule. */}
        <Text style={styles.note}>{t(C.duelSendNote, { hours: DUEL_EXPIRY_HOURS })}</Text>
      </View>

      {sent ? (
        <View style={styles.stateAction}>
          <Button
            variant="ghost"
            size="md"
            label={t(C.duelsOpen)}
            onPress={() => router.replace('/defis')}
            analyticsId="defi_open_inbox"
          />
        </View>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  stateCard: { marginTop: spacing.md, gap: spacing.xs },
  stateTitle: { ...typography.cardTitle, color: colors.blanc },
  stateBody: { ...typography.body, color: colors.gris },
  stateAction: { marginTop: spacing.md },

  block: { marginTop: spacing.lg, gap: spacing.sm },
  input: {
    minHeight: sizes.touchTarget,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    color: colors.blanc,
    fontSize: fontSizes.sm,
  },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  targetInput: { flex: 1 },
  unit: { ...typography.body, color: colors.gris },
  note: { ...typography.meta, color: colors.gris, lineHeight: fontSizes.xs * 1.6 },
  // Même typo que `note` : c'est la MÊME ligne qui change de voix, pas un
  // bloc d'erreur qui s'ajoute. Rouge `danger` (token, jamais une valeur en
  // dur), sur fond sombre — jamais de chartreuse pour dire un refus.
  noteAlert: { ...typography.meta, color: gameColors.danger, lineHeight: fontSizes.xs * 1.6 },
  cta: { marginTop: spacing.xl, gap: spacing.sm },
});
