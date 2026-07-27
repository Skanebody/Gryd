/**
 * GRYD — E21 · MODIFIER LE CREW (route `/crew-edit`).
 *
 * ══ CE QUE CET ÉCRAN REMPLACE ═════════════════════════════════════════════
 * Un `<Redirect href="/crew"/>`. Avant lui, cette route éditait un crew de
 * DÉMO — nom, tag et rôle « founder » fabriqués — dans un store AsyncStorage
 * local qui n'écrivait sur AUCUNE table. Un fondateur y renommait son crew et
 * ne voyait ce changement nulle part ailleurs : le pire des mensonges
 * d'interface, celui qui fait croire à une action. La fin du mode vitrine
 * (A-47) l'a réduite à une redirection, et le manque a été inscrit en suspens
 * plutôt que maquillé — le docblock d'alors disait lui-même que « l'édition
 * réelle reste à faire […] exige une RPC serveur rôle-gatée ».
 *
 * Ce fichier lève ce suspens avec de vraies écritures serveur : `crew_edit` /
 * `crew_edit_context` (migration 0084), SECURITY DEFINER, qui revérifient
 * l'appartenance, le rôle (CREW_PERMISSIONS), les bornes, la modération et le
 * solde. Le client n'apporte que des intentions.
 *
 * ══ CINQ ÉTATS DISTINCTS, JAMAIS CONFONDUS ═══════════════════════════════
 *   pas connecté · lecture EN COURS · échec de lecture · lu et SANS CREW ·
 *   lu avec un crew.
 * Le couple qui compte : « lu et sans crew » AFFIRME que le joueur n'est dans
 * aucun crew ; « échec » n'affirme rien du tout. Les rendre pareil ferait dire
 * à un timeout réseau que le crew du joueur n'existe pas.
 * Un sixième cas se distingue à l'écriture : « je n'ai pas pu envoyer » ne dit
 * PAS « ça n'a pas marché » — on ignore si le serveur a écrit, donc on invite à
 * rouvrir l'écran plutôt qu'à retenter à l'aveugle.
 *
 * ══ AUCUN BOUTON MORT (§A4) — LE SUJET DE CET ÉCRAN ══════════════════════
 * Trois garde-fous, dans cet ordre :
 *   1. LES CHAMPS SUIVENT LES DROITS. `crew_edit_context` renvoie un booléen
 *      PAR CHAMP, tiré de CREW_PERMISSIONS côté serveur. Un membre sans droit
 *      ne voit AUCUN champ — pas un champ grisé, pas un champ qui échouera :
 *      l'écran explique et s'arrête. L'absence d'une fonction n'est pas un
 *      mensonge ; un contrôle qui échoue toujours en est un.
 *   2. LE PRIX EST ANNONCÉ AVANT LE GESTE. Renommer coûte CREW_RENAME_FOULEES.
 *      Le contexte porte le coût ET le solde : un fondateur à sec voit le
 *      montant sous le champ, et le CTA se grise AVEC SON MOTIF au lieu de
 *      partir se faire refuser.
 *   3. LE CTA EST GRISÉ TANT QU'IL N'Y A RIEN DE VALIDE À ENVOYER. `pristine`
 *      (« tu n'as rien changé ») n'est PAS traité comme une erreur : on ne crie
 *      pas « nom vide » à quelqu'un qui vient d'ouvrir la page.
 * Les trois décisions sont PURES et testées (`features/crew/crewEdit.test.ts`) :
 *  cet écran ne fait que les rendre.
 *
 * ══ UN SEUL CTA CHARTREUSE (§A) ══════════════════════════════════════════
 * « Enregistrer » vit dans le `headerRight` de StackScreen — hors du
 * ScrollView, donc atteignable clavier ouvert, sans barre flottante en plus.
 * Aucun autre bouton chartreuse. « Annuler mes modifications » est un lien
 * discret, en bas, et il n'apparaît QUE s'il y a quelque chose à annuler.
 *
 * ══ CE QUE CET ÉCRAN N'ÉDITE PAS, ET POURQUOI ════════════════════════════
 *   · LA COULEUR du crew : la colonne existe mais AUCUNE surface du dépôt ne la
 *     rend (le rendu carte va par RÔLE, jamais par identité — §C). Un sélecteur
 *     serait un contrôle sans effet visible : un bouton mort déguisé en réglage.
 *   · L'EMBLÈME / LA BANNIÈRE : aucune colonne. Ce qui existe est un inventaire
 *     d'objets achetables, sans notion de pièce équipée par le crew.
 *   · LE TAG (abréviation) : son changement exige une redirection de 30 jours
 *     (E21) qui n'existe nulle part. Livrer la moitié casserait en silence tout
 *     lien déjà partagé.
 *   Ces trois manques sont inscrits dans l'en-tête de la migration 0084 et
 *   restent en suspens — ils ne sont pas peints ici en attendant.
 *
 * ══ CE QUI N'EST PAS ICI NON PLUS ════════════════════════════════════════
 * Aucune action destructrice. Quitter le crew vit dans l'écran Crew
 * (`leave_crew`, 0042) ; supprimer un crew n'existe pas côté serveur
 * (`archiveCrew` est dans la matrice, pas dans le schéma). Poser un bouton
 * « Supprimer » qui échouerait serait exactement la faute que cet écran répare.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CREW_TAG_KEYS,
  colors,
  elevation,
  fontSizes,
  gameColors,
  radii,
  sizes,
  spacing,
  type CrewRecruitmentStatus,
  type CrewTag,
} from '@klaim/shared';
import { C, CREW_ROLE_E, CREW_TAG_E, RECRUITMENT_E } from '../src/i18n/catalog/crew';
import { useT } from '../src/i18n/store';
import { useSession } from '../src/lib/session';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { Segmented } from '../src/ui/game/Segmented';
import {
  NAME_MAX,
  blockReason,
  draftOf,
  isDirty,
  payloadOf,
  toggleTag,
  willRename,
  type BlockReason,
  type EditContext,
  type EditDraft,
  type EditRefusal,
  type EditableCrew,
} from '../src/features/crew/crewEdit';
import { saveCrewEdit, useCrewEditContext } from '../src/features/crew/crewEditData';

/** Les 4 statuts de recrutement dans l'ordre du plus ouvert au plus fermé (§9). */
const STATUS_ORDER: readonly CrewRecruitmentStatus[] = [
  'open',
  'on_request',
  'invite_only',
  'closed',
];

export default function CrewEditRoute() {
  const t = useT();
  const { session } = useSession();
  const { loading, failed, refusal, ctx, reload } = useCrewEditContext();

  /**
   * Le crew de RÉFÉRENCE : celui que le serveur a confirmé en dernier. Il part
   * du contexte lu, puis avance à chaque enregistrement réussi. C'est lui qui
   * sert de base au diff — jamais le brouillon local, sinon un enregistrement
   * refusé laisserait l'écran croire qu'il est à jour.
   */
  const [crew, setCrew] = useState<EditableCrew | null>(null);
  const [foulees, setFoulees] = useState<number | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ctx) return;
    setCrew(ctx.crew);
    setFoulees(ctx.myFoulees);
    setDraft(draftOf(ctx.crew));
  }, [ctx]);

  /**
   * Le contexte COURANT : celui du serveur, avec le crew et le solde remis à
   * jour par le dernier enregistrement. Les droits et le coût viennent toujours
   * de `crew_edit_context` — on ne les recalcule jamais côté client.
   */
  const live: EditContext | null = useMemo(() => {
    if (!ctx) return null;
    return { ...ctx, crew: crew ?? ctx.crew, myFoulees: foulees ?? ctx.myFoulees };
  }, [ctx, crew, foulees]);

  const canEditAnything =
    !!live && (live.can.name || live.can.description || live.can.recruitment);

  const block: BlockReason | null = live && draft ? blockReason(live, draft) : 'pristine';
  const dirty = !!live && !!draft && isDirty(live.crew, draft);

  async function onSave() {
    if (!live || !draft || block !== null) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    const out = await saveCrewEdit(payloadOf(live.crew, draft));
    setSaving(false);

    if (out.kind === 'failed') {
      setError(t(C.editSaveFailed));
      return;
    }
    if (out.kind === 'refused') {
      setError(refusalText(out.refusal, out.shortfall, t));
      // Un refus peut venir d'un état serveur qui a bougé (rôle retiré, foulées
      // dépensées ailleurs) : on relit plutôt que de rester sur une vue périmée.
      reload();
      return;
    }
    setCrew(out.crew);
    setFoulees(out.fouleesLeft);
    setDraft(draftOf(out.crew));
    setNotice(out.renamed ? t(C.editSavedRenamed, { n: out.fouleesSpent }) : t(C.editSaved));
  }

  // ── Pas connecté ──────────────────────────────────────────────────────────
  if (!session) {
    return (
      <StackScreen title={t(C.editTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(C.editSignedOut)}</Text>
        </View>
      </StackScreen>
    );
  }

  // ── Lecture EN COURS — n'affirme RIEN sur le crew ─────────────────────────
  if (loading && !ctx) {
    return (
      <StackScreen title={t(C.editTitle)}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.chartreuse} />
        </View>
      </StackScreen>
    );
  }

  // ── Échec de lecture — DISTINCT de « aucun crew » ─────────────────────────
  if (failed) {
    return (
      <StackScreen title={t(C.editTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.editFailedTitle)}</Text>
          <Text style={styles.body}>{t(C.editFailedBody)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.editRetry)} onPress={reload} loading={loading} />
          </View>
        </View>
      </StackScreen>
    );
  }

  // ── Lu, et le serveur AFFIRME qu'il n'y a pas de crew ─────────────────────
  if (!ctx) {
    return (
      <StackScreen title={t(C.editTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.editNoCrewTitle)}</Text>
          <Text style={styles.body}>{t(C.editNoCrewBody)}</Text>
          {/* Un refus autre que `no_crew` (signed_out déjà traité) reste dit :
              on n'invente pas un motif, on affiche celui du serveur. */}
          {refusal && refusal !== 'no_crew' ? (
            <Text style={styles.body}>{t(C.editRefusedGeneric)}</Text>
          ) : null}
        </View>
      </StackScreen>
    );
  }

  if (!live || !draft) return null;

  // ── Membre sans droit : AUCUN champ peint, une explication ───────────────
  // Ce cas ne s'atteint normalement pas (l'entrée vers cet écran n'existe que
  // pour qui a le droit) — il couvre l'arrivée par lien `gryd://crew-edit`.
  if (!canEditAnything) {
    return (
      <StackScreen title={t(C.editTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.editForbiddenTitle)}</Text>
          <Text style={styles.body}>
            {t(C.editForbiddenBody, { role: t(CREW_ROLE_E[live.role]) })}
          </Text>
        </View>
      </StackScreen>
    );
  }

  const renaming = willRename(live.crew, draft);
  const descLength = draft.description.trim().length;
  const saveBlocked = block !== null || saving;

  return (
    <StackScreen
      title={t(C.editTitle)}
      kicker={t(C.editKicker)}
      /*
        UNIQUE CTA de l'écran, dans la barre FIXE (hors ScrollView) : il reste
        atteignable clavier ouvert. Grisé tant que `blockReason` rend un motif —
        et ce motif s'affiche juste sous le champ concerné, jamais caché.
      */
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.editSave)}
          accessibilityState={{ disabled: saveBlocked, busy: saving }}
          disabled={saveBlocked}
          onPress={onSave}
          hitSlop={8}
          style={({ pressed }) => [styles.headerSave, pressed && styles.dim]}
        >
          <Text
            style={[styles.headerSaveText, saveBlocked && styles.headerSaveOff]}
            numberOfLines={1}
          >
            {t(C.editSave)}
          </Text>
        </Pressable>
      }
    >
      {/* Retour d'enregistrement : un fait, jamais une supposition. */}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* ── LE NOM (et son prix) ─────────────────────────────────────────── */}
      {live.can.name ? (
        <View style={styles.field}>
          <Text style={styles.label}>{t(C.editNameLabel)}</Text>
          <TextInput
            style={styles.input}
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name })}
            placeholderTextColor={colors.gris}
            autoCorrect={false}
            accessibilityLabel={t(C.editNameLabel)}
          />
          {/*
            Le prix est dit AVANT le geste, et il ne s'affiche comme un COÛT que
            si le nom change réellement — sinon il annonce l'absence de débit.
          */}
          <Text style={styles.hint}>
            {renaming ? t(C.editNameCost, { n: live.renameCostFoulees }) : t(C.editNameCostFree)}
          </Text>
          {block === 'name_empty' ? (
            <Text style={styles.invalid}>{t(C.editNameEmpty)}</Text>
          ) : null}
          {block === 'name_too_long' ? (
            <Text style={styles.invalid}>{t(C.editNameTooLong, { n: NAME_MAX })}</Text>
          ) : null}
          {block === 'rename_unaffordable' ? (
            <Text style={styles.invalid}>
              {t(C.editNotEnough, { need: live.renameCostFoulees, have: live.myFoulees })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* ── LA DESCRIPTION ───────────────────────────────────────────────── */}
      {live.can.description ? (
        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{t(C.editDescLabel)}</Text>
            <Text style={styles.counter}>
              {t(C.editDescCount, { n: descLength, max: live.descriptionMax })}
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={draft.description}
            onChangeText={(description) => setDraft({ ...draft, description })}
            placeholder={t(C.editDescPh)}
            placeholderTextColor={colors.gris}
            multiline
            /*
              `maxLength` empêche de dépasser au clavier, mais le motif de refus
              existe quand même : un texte collé, ou une borne serveur plus basse
              que celle qu'on croit connaître, doit se DIRE au lieu d'être rogné
              en silence.
            */
            maxLength={live.descriptionMax}
            accessibilityLabel={t(C.editDescLabel)}
          />
          {block === 'description_too_long' ? (
            <Text style={styles.invalid}>
              {t(C.editDescTooLong, { n: live.descriptionMax })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* ── LE RECRUTEMENT ───────────────────────────────────────────────── */}
      {live.can.recruitment ? (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>{t(C.editAccessLabel)}</Text>
            {/*
              `tone="surface"` : la sélection ne doit PAS être chartreuse. La
              chartreuse marque l'action décisive de l'écran — ici, enregistrer.
              `scrollable` : quatre statuts en cinq langues ne tiennent pas en
              colonnes égales sans couper un libellé (§A.9 : jamais de « … » sur
              un texte d'action).
            */}
            <Segmented
              scrollable
              tone="surface"
              accessibilityLabel={t(C.editAccessLabel)}
              value={draft.recruitmentStatus}
              onChange={(recruitmentStatus: CrewRecruitmentStatus) =>
                setDraft({ ...draft, recruitmentStatus })
              }
              options={STATUS_ORDER.map((id) => ({ id, label: t(RECRUITMENT_E[id]) }))}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t(C.editTagsLabel)}</Text>
            <Text style={styles.hint}>{t(C.editTagsHint)}</Text>
            <View style={styles.chips}>
              {CREW_TAG_KEYS.map((tag: CrewTag) => {
                const on = draft.tags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={t(CREW_TAG_E[tag])}
                    onPress={() => setDraft({ ...draft, tags: toggleTag(draft.tags, tag) })}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    {/* Pas de numberOfLines : un tag tronqué ne se reconnaît pas. */}
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {t(CREW_TAG_E[tag])}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      ) : null}

      {/*
        Annuler : un lien discret, JAMAIS un second bouton chartreuse, et il
        n'existe que s'il y a quelque chose à annuler — un « Annuler » sans
        modification serait un bouton sans effet.
      */}
      {dirty ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.editDiscard)}
          onPress={() => {
            setDraft(draftOf(live.crew));
            setNotice(null);
            setError(null);
          }}
          style={styles.discard}
        >
          <Text style={styles.discardText}>{t(C.editDiscard)}</Text>
        </Pressable>
      ) : null}
    </StackScreen>
  );
}

/**
 * Motif serveur → phrase. Les refus de MODÉRATION restent volontairement vagues
 * (« ce nom n'est pas disponible ») : détailler la règle qui a mordu serait un
 * mode d'emploi du contournement — c'est la doctrine de la migration 0050, et
 * la copie ne doit pas la trahir en étant plus bavarde que le serveur.
 */
function refusalText(
  reason: EditRefusal,
  shortfall: { need: number; have: number } | null,
  t: ReturnType<typeof useT>,
): string {
  switch (reason) {
    case 'name_unavailable':
      return t(C.editNameUnavailable);
    case 'description_unavailable':
      return t(C.editDescUnavailable);
    case 'not_enough_foulees':
      return shortfall
        ? t(C.editNotEnough, { need: shortfall.need, have: shortfall.have })
        : t(C.editNotEnoughShort);
    case 'bad_name':
      return t(C.editNameEmpty);
    case 'forbidden':
      return t(C.editForbiddenTitle);
    default:
      return t(C.editRefusedGeneric);
  }
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.md },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  cta: { marginTop: spacing.sm },
  center: { marginTop: spacing.xl, alignItems: 'center' },

  notice: { marginTop: spacing.lg, color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20 },
  error: {
    marginTop: spacing.lg,
    color: gameColors.danger,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },

  // Champs à PLAT : aucune card autour, donc aucun risque de card-in-card (§A).
  field: { marginTop: spacing.lg, gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  counter: { color: colors.gris, fontSize: fontSizes.xs },
  hint: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },
  invalid: { color: gameColors.danger, fontSize: fontSizes.sm, lineHeight: 20 },

  input: {
    backgroundColor: elevation.raised,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    color: colors.blanc,
    fontSize: fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: sizes.touchTarget,
  },
  multiline: { minHeight: 112, textAlignVertical: 'top' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: elevation.raised,
  },
  // Sélection en BLANC, jamais en chartreuse : la chartreuse est réservée à
  // l'action décisive de l'écran (§A4).
  chipOn: { borderColor: colors.blanc },
  chipText: { color: colors.gris, fontSize: fontSizes.sm },
  chipTextOn: { color: colors.blanc, fontWeight: '600' },

  headerSave: { minHeight: sizes.touchTarget, justifyContent: 'center', paddingLeft: spacing.sm },
  headerSaveText: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '700' },
  headerSaveOff: { color: colors.gris },
  dim: { opacity: 0.6 },

  discard: { marginTop: spacing.xl, minHeight: sizes.touchTarget, justifyContent: 'center' },
  discardText: { color: colors.gris, fontSize: fontSizes.sm, textDecorationLine: 'underline' },
});
