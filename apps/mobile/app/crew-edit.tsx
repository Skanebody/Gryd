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
 * Quitter le crew vit dans l'écran Crew (`leave_crew`, 0042).
 *
 * ══ 11/09/2026 · LA DISSOLUTION EXISTE (décision du fondateur) ════════════
 * Le paragraphe ci-dessus disait, et c'était vrai : « supprimer un crew n'existe
 * pas côté serveur (`archiveCrew` est dans la matrice, pas dans le schéma) ».
 * `crew_dissolve_2026` (0190) l'a écrit. Le bouton n'est donc plus un bouton
 * mort, et il vit ici parce que c'est l'écran des réglages du crew.
 *
 * TROIS PRÉCAUTIONS, dans cet ordre :
 *   1. FONDATEUR SEUL (`CREW_PERMISSIONS.archiveCrew`). Le co-capitaine gère,
 *      il ne décapite pas — même doctrine que `canLeaveCrew`.
 *   2. CONFIRMATION EN DEUX TEMPS, avec ce que la dissolution FAIT et ce
 *      qu'elle NE FAIT PAS écrit avant le premier tap. Rien n'est supprimé : ni
 *      le crew, ni son nom, ni les sorties, ni les terrains (0126 : le titre
 *      territorial est individuel, personne ne perd un mètre carré).
 *   3. LES REFUS SONT NOMMÉS, et `active_challenge` rend sa DATE : un refus
 *      sans échéance serait un cul-de-sac. Le défi n'est pas différé, il est
 *      attendu — §G20 pose qu'un défi a un résultat, et le crew adverse y a
 *      droit sans avoir rien décidé.
 * Aucune RPC ne désarchive : rendre un crew à la vie demanderait de décider qui
 * en reprend la direction, ce qui est une décision de produit. L'écran le dit.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  CREW_KICK_NOTE_MAX,
  CREW_NAME_HOLD_AFTER_ARCHIVE_DAYS,
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
import { G } from '../src/i18n/catalog/crewGestion';
import { useLocale, useT } from '../src/i18n/store';
import { useSession } from '../src/lib/session';
import { haptics } from '../src/lib/haptics';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { Segmented } from '../src/ui/game/Segmented';
import { dayText } from '../src/features/crew/management/crewManagementCopy';
import {
  dissolveCrew,
  dissolveRefusalOf,
} from '../src/features/crew/management/crewManagementData';
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
import { roleHas } from '../src/features/crew/memberRoles';

/** Les 4 statuts de recrutement dans l'ordre du plus ouvert au plus fermé (§9). */
const STATUS_ORDER: readonly CrewRecruitmentStatus[] = [
  'open',
  'on_request',
  'invite_only',
  'closed',
];

/**
 * LES TROIS TEMPS DE LA ZONE DANGEREUSE. `idle` : le bouton, rien d'autre.
 * `confirm` : ce que la dissolution fait, ce qu'elle ne fait pas, le motif
 * facultatif, et deux boutons dont le premier est « garder mon crew ».
 * `done` : c'est fait, et l'écran ne prétend plus éditer un crew qui n'existe
 * plus.
 */
type DissolveStep = 'idle' | 'confirm' | 'done';

export default function CrewEditRoute() {
  const t = useT();
  const locale = useLocale();
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
  const [dissolveStep, setDissolveStep] = useState<DissolveStep>('idle');
  const [dissolveReason, setDissolveReason] = useState('');
  const [dissolving, setDissolving] = useState(false);
  const [dissolveError, setDissolveError] = useState<string | null>(null);

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

  /**
   * DISSOUDRE. Le serveur revérifie tout : le rôle, l'archivage déjà fait, et
   * surtout le défi en cours. On ne peint donc jamais un « c'est fait » qu'on
   * n'a pas lu, et chaque refus dit son motif dans SES mots.
   */
  async function onDissolve() {
    if (dissolving) return;
    setDissolving(true);
    setDissolveError(null);
    const out = await dissolveCrew(dissolveReason);
    setDissolving(false);
    if (out.kind === 'ok') {
      haptics.success();
      setDissolveStep('done');
      return;
    }
    haptics.error();
    if (out.kind === 'failed') {
      setDissolveError(t(G.actionFailed));
      return;
    }
    if (out.kind === 'unsupported') {
      setDissolveError(t(G.refusedUnsupported));
      return;
    }
    const why = dissolveRefusalOf(out);
    if (why === 'active_challenge') {
      // La DATE de clôture voyage avec le refus : sans elle, le capitaine ne
      // saurait pas quand réessayer, et le refus deviendrait un mur.
      const endsAt =
        typeof out.data.endsAt === 'string' ? dayText(Date.parse(out.data.endsAt), locale) : null;
      setDissolveError(
        endsAt ? t(G.dissolveActiveChallenge, { date: endsAt }) : t(G.refusedGeneric),
      );
      return;
    }
    setDissolveError(
      why === 'not_founder'
        ? t(G.dissolveNotFounder)
        : why === 'already_archived'
          ? t(G.dissolveAlready)
          : why === 'no_crew'
            ? t(G.boardNoCrewBody)
            : t(G.refusedGeneric),
    );
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

  // ── LE CREW EST DISSOUS ───────────────────────────────────────────────────
  // Un retour HONNÊTE à l'état sans crew : cet écran n'édite plus rien, et il
  // ne prétend pas le contraire. Le seul geste restant est de repartir.
  if (dissolveStep === 'done') {
    return (
      <StackScreen title={t(C.editTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(G.dissolveDone)}</Text>
          <Text style={styles.body}>{t(G.dissolveIrreversible)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.createMyCrew)} onPress={() => router.replace('/(tabs)/crew')} />
          </View>
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

      {/* ── ZONE DANGEREUSE · DISSOUDRE (fondateur SEUL) ──────────────────
          Elle n'est peinte que pour qui peut réellement dissoudre : la
          permission vient de `CREW_PERMISSIONS.archiveCrew`, pas d'un
          `role === 'founder'` écrit à la main. Elle vit TOUT EN BAS, après
          tout ce qui se répare, et sa couleur n'est jamais chartreuse : la
          chartreuse marque ce qu'on veut faire, pas ce qu'on peut regretter. */}
      {roleHas(live.role, 'archiveCrew') ? (
        <View style={styles.danger}>
          <Text style={styles.dangerTitle}>{t(G.dissolveZone)}</Text>

          {dissolveStep === 'idle' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(G.dissolveCta)}
              onPress={() => {
                haptics.light();
                setDissolveError(null);
                setDissolveStep('confirm');
              }}
              style={({ pressed }) => [styles.dangerAction, pressed && styles.dim]}
            >
              <Text style={styles.dangerActionText}>{t(G.dissolveCta)}</Text>
            </Pressable>
          ) : (
            <>
              {/* CE QUE ÇA FAIT, puis CE QUE ÇA NE FAIT PAS. Le second compte
                  autant : la peur de « tout perdre » est ce qui fait hésiter,
                  et rien ne se perd. */}
              <Text style={styles.body}>
                {t(G.dissolveWhat, { n: CREW_NAME_HOLD_AFTER_ARCHIVE_DAYS })}
              </Text>
              <Text style={styles.body}>{t(G.dissolveIrreversible)}</Text>
              <Text style={styles.label}>{t(G.dissolveReasonLabel)}</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={dissolveReason}
                onChangeText={setDissolveReason}
                multiline
                maxLength={CREW_KICK_NOTE_MAX}
                accessibilityLabel={t(G.dissolveReasonLabel)}
                placeholderTextColor={colors.gris}
              />
              {/* GARDER passe en premier et reste le geste le plus facile. */}
              <Button
                variant="ghost"
                size="md"
                label={t(G.dissolveCancel)}
                disabled={dissolving}
                onPress={() => setDissolveStep('idle')}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(G.dissolveConfirmCta)}
                accessibilityState={{ disabled: dissolving, busy: dissolving }}
                disabled={dissolving}
                onPress={() => void onDissolve()}
                style={({ pressed }) => [styles.dangerAction, pressed && styles.dim]}
              >
                <Text style={styles.dangerActionText}>{t(G.dissolveConfirmCta)}</Text>
              </Pressable>
            </>
          )}
          {dissolveError ? <Text style={styles.error}>{dissolveError}</Text> : null}
        </View>
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

  // ── Zone dangereuse : un filet, jamais un aplat. L15 — le mot « zone
  // dangereuse » porte l'avertissement ; la teinte ne fait que le souligner,
  // et l'écran reste lisible sans elle.
  danger: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    paddingTop: spacing.lg,
  },
  dangerTitle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dangerAction: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: gameColors.danger,
    paddingHorizontal: spacing.md,
  },
  dangerActionText: { color: gameColors.danger, fontSize: fontSizes.sm, fontWeight: '700' },
});
