/**
 * GRYD — MODIFIER LE CREW (founder, §8.1). Retour fondateur : « pas trouvé les
 * boutons pour modifier le crew ». Écran POUSSÉ (StackScreen) où le fondateur
 * édite l'IDENTITÉ ÉDITORIALE du crew : NOM, TAG, DESCRIPTION, statut de
 * RECRUTEMENT (§9) et TAGS DE STYLE (§10). Persisté (démo AsyncStorage via
 * crewEdit store), reflété dans le Crew HQ au retour.
 *
 * Anti pay-to-win : PAS de blason ici (le blason premium = item Arsenal, lien
 * en bas). On n'édite que du texte + de la politique de recrutement — jamais de
 * la puissance. Gating : `changeNameEmblem` / `manageRecruitment` (founder-only,
 * CREW_PERMISSIONS = source de vérité) ; si un rôle non autorisé arrive ici, on
 * l'informe et on désactive l'enregistrement (le serveur reste seul juge, O1).
 *
 * Charte dark GRYD : cards carbone, accent chartreuse, réglages haptic light,
 * anti-shame (aucun ton culpabilisant). Analytics : screen('crew_edit').
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { flags } from '../src/lib/flags';
import { goBack } from '../src/lib/nav';
import {
  CREW_RECRUITMENT_STATUSES,
  CREW_TAGS,
  CREW_TAG_KEYS,
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
  type CrewRecruitmentStatus,
  type CrewTag,
} from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { InlineRunCTA } from '../src/ui/game';
import { MY_CREW } from '../src/features/crew/demo';
import { RECRUITMENT_STATUS_LABELS, roleCan } from '../src/features/crew/rules';
import {
  CREW_DESCRIPTION_MAX,
  CREW_NAME_MAX,
  CREW_TAG_MAX,
  crewEditSeed,
  saveCrewEdit,
  useCrewProfile,
} from '../src/features/crew/crewEdit';

export default function CrewEditScreen() {
  useEffect(() => {
    // Pas d'event §8 dédié à l'édition crew → screen view standard (jamais de
    // nom custom hors events.ts).
    screen('crew_edit');
  }, []);

  const persisted = useCrewProfile();
  // Mon rôle démo (KORO = founder) → gating de l'enregistrement (matrice §8).
  const myRole = MY_CREW.members.find((m) => m.me)?.role ?? 'runner';
  const canEditIdentity = roleCan(myRole, 'changeNameEmblem');
  const canManageRecruitment = roleCan(myRole, 'manageRecruitment');
  const canSave = canEditIdentity || canManageRecruitment;

  // Brouillon local, initialisé sur le profil persisté (reflète les édits déjà faits).
  const [name, setName] = useState(persisted.name);
  const [tag, setTag] = useState(persisted.tag);
  const [description, setDescription] = useState(persisted.description);
  const [recruitment, setRecruitment] = useState<CrewRecruitmentStatus>(persisted.recruitment);
  const [tags, setTags] = useState<readonly CrewTag[]>(persisted.tags);
  const [savedNotice, setSavedNotice] = useState(false);

  const nameValid = name.trim().length > 0;
  const tagValid = tag.trim().length > 0;
  const dirty = useMemo(
    () =>
      name !== persisted.name ||
      tag !== persisted.tag ||
      description !== persisted.description ||
      recruitment !== persisted.recruitment ||
      tags.length !== persisted.tags.length ||
      tags.some((t) => !persisted.tags.includes(t)),
    [name, tag, description, recruitment, tags, persisted],
  );

  const toggleTag = (t: CrewTag) => {
    haptics.light();
    setSavedNotice(false);
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const onSave = () => {
    if (!canSave || !nameValid || !tagValid) return;
    // InlineRunCTA déclenche déjà haptics.medium() au press (pas de double tap).
    saveCrewEdit({ name, tag, description, recruitment, tags });
    setSavedNotice(true);
    // Petit délai laissé au feedback avant retour au HQ (le HQ reflète l'édit).
    setTimeout(() => goBack('/crew'), 450);
  };

  const onReset = () => {
    haptics.light();
    const seed = crewEditSeed();
    setName(seed.name);
    setTag(seed.tag);
    setDescription(seed.description);
    setRecruitment(seed.recruitment);
    setTags(seed.tags);
    setSavedNotice(false);
  };

  return (
    <StackScreen title="Modifier le crew" icon="crew" kicker="FONDATEUR · IDENTITÉ DU CREW">
      {!canSave ? (
        <View style={styles.gateCard}>
          <Icon name="verrou" size={16} color={colors.gris} />
          <Text style={styles.gateText}>
            Seul le fondateur peut modifier le nom, le blason et le recrutement du crew.
          </Text>
        </View>
      ) : null}

      {/* ── IDENTITÉ : nom + tag ── */}
      <Text style={styles.sectionLabel}>IDENTITÉ</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Nom du crew</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v.slice(0, CREW_NAME_MAX));
              setSavedNotice(false);
            }}
            editable={canEditIdentity}
            placeholder="Nom du crew"
            placeholderTextColor={colors.gris}
            style={styles.input}
            maxLength={CREW_NAME_MAX}
          />
          <Text style={styles.counter}>
            {name.length}/{CREW_NAME_MAX}
          </Text>
        </View>
        {!nameValid ? <Text style={styles.invalid}>Le nom ne peut pas être vide.</Text> : null}

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>Tag (abréviation)</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={tag}
            onChangeText={(v) => {
              setTag(v.slice(0, CREW_TAG_MAX));
              setSavedNotice(false);
            }}
            editable={canEditIdentity}
            placeholder="9³"
            placeholderTextColor={colors.gris}
            autoCapitalize="characters"
            style={styles.input}
            maxLength={CREW_TAG_MAX}
          />
          <Text style={styles.counter}>
            {tag.length}/{CREW_TAG_MAX}
          </Text>
        </View>
        {!tagValid ? <Text style={styles.invalid}>Le tag ne peut pas être vide.</Text> : null}

        {/* Anti pay-to-win : le blason vit dans l'Arsenal (lien, jamais ici). */}
        {/* D8 : Arsenal masqué hors MVP — le lien disparaît avec la route. */}
        {flags.arsenal ? (
          <>
            <View style={styles.divider} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ouvrir l'Arsenal pour le blason du crew"
              onPress={() => {
                haptics.light();
                router.push('/arsenal');
              }}
              style={({ pressed }) => [styles.crestLink, pressed && styles.dim]}
            >
              <Icon name="crest" size={16} color={colors.blanc} />
              <Text style={styles.crestLinkText}>Blason &amp; cosmétiques — Arsenal</Text>
              <Icon name="chevron" size={15} color={colors.gris} />
            </Pressable>
          </>
        ) : null}
      </View>

      {/* ── DESCRIPTION ── */}
      <Text style={styles.sectionLabel}>DESCRIPTION</Text>
      <View style={styles.card}>
        <TextInput
          value={description}
          onChangeText={(v) => {
            setDescription(v.slice(0, CREW_DESCRIPTION_MAX));
            setSavedNotice(false);
          }}
          editable={canEditIdentity}
          placeholder="Présente ton crew en une phrase (visible en découverte)."
          placeholderTextColor={colors.gris}
          style={styles.textarea}
          multiline
          maxLength={CREW_DESCRIPTION_MAX}
        />
        <Text style={styles.counterRight}>
          {description.length}/{CREW_DESCRIPTION_MAX}
        </Text>
      </View>

      {/* ── RECRUTEMENT (§9) ── */}
      <Text style={styles.sectionLabel}>RECRUTEMENT</Text>
      <View style={styles.card}>
        {CREW_RECRUITMENT_STATUSES.map((s, i) => {
          const active = recruitment === s;
          return (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: !canManageRecruitment }}
              disabled={!canManageRecruitment}
              onPress={() => {
                haptics.light();
                setRecruitment(s);
                setSavedNotice(false);
              }}
              style={({ pressed }) => [
                styles.radioRow,
                i > 0 && styles.radioRowBorder,
                pressed && styles.dim,
              ]}
            >
              <View style={[styles.radio, active && styles.radioOn]}>
                {active ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={[styles.radioLabel, active && styles.radioLabelOn]}>
                {RECRUITMENT_STATUS_LABELS[s]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── TAGS DE STYLE (§10) : identité, pas hiérarchie ── */}
      <Text style={styles.sectionLabel}>STYLE DU CREW · {tags.length}</Text>
      <View style={[styles.card, styles.tagWrap]}>
        {CREW_TAG_KEYS.map((t) => {
          const active = tags.includes(t);
          return (
            <Pressable
              key={t}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              disabled={!canEditIdentity}
              onPress={() => toggleTag(t)}
              style={[styles.tagChip, active && styles.tagChipOn]}
            >
              <Text style={[styles.tagChipText, active && styles.tagChipTextOn]}>{CREW_TAGS[t]}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Enregistrer / Réinitialiser ── */}
      <View style={styles.saveBlock}>
        {savedNotice ? (
          <View style={styles.savedRow}>
            <Icon name="cible" size={14} color={gameColors.crew} />
            <Text style={styles.savedText}>Enregistré — le crew est à jour.</Text>
          </View>
        ) : null}
        <InlineRunCTA
          label="ENREGISTRER"
          leading={<Icon name="cible" size={18} color={colors.noir} />}
          disabled={!canSave || !nameValid || !tagValid || !dirty}
          onPress={onSave}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Réinitialiser les modifications"
          onPress={onReset}
          style={({ pressed }) => [styles.resetBtn, pressed && styles.dim]}
        >
          <Text style={styles.resetText}>Réinitialiser</Text>
        </Pressable>
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  dim: { opacity: 0.6 },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  gateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  gateText: { flex: 1, color: colors.gris, fontSize: fontSizes.xs, lineHeight: 17 },
  fieldLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '600',
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  counter: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    width: 44,
    textAlign: 'right',
  },
  counterRight: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    marginTop: 8,
  },
  invalid: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 8 },
  divider: { height: 1, backgroundColor: colors.grisLigne, marginVertical: 16 },
  crestLink: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  crestLinkText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  textarea: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    backgroundColor: colors.carbone2,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    minHeight: 92,
    textAlignVertical: 'top',
  },
  // ── Recrutement (radio) ──
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  radioRowBorder: { borderTopWidth: 1, borderTopColor: colors.grisLigne },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: gameColors.crew },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: gameColors.crew },
  radioLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  radioLabelOn: { color: gameColors.crew },
  // ── Tags de style ──
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone2,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  tagChipOn: { backgroundColor: gameColors.crew, borderColor: gameColors.crew },
  tagChipText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  // Libellé noir sur chartreuse (contraste charte — jamais l'inverse).
  tagChipTextOn: { color: colors.noir },
  // ── Enregistrer ──
  saveBlock: { marginTop: 26, gap: 12 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedText: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '600' },
  resetBtn: { alignItems: 'center', paddingVertical: 10 },
  resetText: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
});
