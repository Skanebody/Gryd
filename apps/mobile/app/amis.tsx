/**
 * GRYD — E57 · SUIVIS ET AMIS (`/amis`, spec l.1906). Écran poussé depuis Profil.
 *
 * ─── CE QUE CET ÉCRAN ÉTAIT, ET POURQUOI IL CHANGE ──────────────────────────
 * Depuis A-47 (21/07/2026), il DISAIT la vérité et ne faisait rien : « la
 * fonctionnalité n'est pas ouverte », plus le @handle du joueur. C'était la
 * bonne conduite tant qu'aucune table n'avait de chemin d'écriture — `follows`
 * n'existait pas, `friendships` (0011) était en lecture seule, et cinq onglets
 * de démonstration avaient été supprimés pour avoir répondu « @x ajouté » à des
 * actions qui n'arrivaient nulle part.
 *
 * La migration 0088 crée ces chemins. L'écran devient donc RÉEL, et la phrase
 * « ce n'est pas ouvert » disparaît AVEC la raison qui la justifiait — pas
 * avant. Le @handle et son QR restent : ils sont ce qui rend les liens
 * possibles (§0 de 0088 : il n'y a pas d'annuaire, on se suit par @code reçu).
 *
 * ─── LES CINQ ÉTATS, DISTINCTS ET JAMAIS CONFONDUS ──────────────────────────
 *   ④ lecture EN COURS   → une LIGNE grise. N'affirme RIEN sur le joueur ;
 *   ① pas connecté       → carte + « Se connecter » (le seul CTA de cet état) ;
 *   ③ échec de lecture   → carte + « Réessayer ». On DIT que c'est la lecture
 *                          qui a échoué, jamais que la liste est vide ;
 *   ③b serveur sans 0088 → carte SANS bouton : réessayer ne changerait rien,
 *                          et un bouton qui ne répare pas est un bouton mort ;
 *   ② lu et VIDE         → l'état vide de première classe : un fait sur le jeu
 *                          (« personne ici »), une explication (on se suit par
 *                          @code), et la seule action qui marche — montrer son
 *                          code, ou saisir celui qu'on a reçu.
 *
 * ─── CE QUI N'EST PAS PEINT, ET POURQUOI (§A4, aucun bouton mort) ───────────
 * · AUCUNE SUGGESTION, AUCUN IMPORT DE CONTACTS. La spec E57 les liste ; ils
 *   n'ont AUCUNE source (game-rules `SOCIAL_SUGGESTIONS_SOURCE_EXISTS`), et le
 *   serveur le confirme (`suggestionsSource: 'none'`). On l'écrit comme une
 *   propriété du produit, pas comme une section vide qui se remplirait un jour
 *   toute seule.
 * · « DÉFIER » N'APPARAÎT QUE SUR QUI PEUT ÊTRE DÉFIÉ. `canChallenge` reproduit
 *   la règle de lien du serveur (ami, ou suivi réciproque) : peint partout, ce
 *   bouton échouerait en `no_relation` sur la moitié des lignes.
 * · AUCUN COMPTEUR À ZÉRO EN KICKER. L'ancien « 0 AMIS · 0 DEMANDES » comptait
 *   des demandes qui ne pouvaient pas exister. Le kicker ne porte QUE mon @.
 *
 * ─── ÉCART ASSUMÉ ──────────────────────────────────────────────────────────
 * Une demande ENVOYÉE ne se retire pas. RAISON TECHNIQUE : 0088 n'expose aucune
 * RPC pour ça (`social_graph` ne rend d'ailleurs pas d'`id` sur les demandes
 * sortantes, exprès). Elles sont donc affichées comme un FAIT en une ligne, sans
 * bouton — plutôt qu'avec un « annuler » qui n'appellerait rien.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  borderState,
  colors,
  elevation,
  fontSizes,
  radii,
  sizes,
  spacing,
  typography,
} from '@klaim/shared';
import { EVENTS } from '@klaim/shared';
import { screen, track } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Card, IconPlate } from '../src/ui/Card';
import { Icon } from '../src/ui/Icon';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { ToastHost, useToast } from '../src/features/social/Toast';
import {
  canChallenge,
  isEmptyGraph,
  sections,
  type Person,
  type SocialGraph,
  type SocialSectionKey,
} from '../src/features/social/socialGraph';
import { socialRefusalText } from '../src/features/social/socialLabels';
import {
  followUser,
  requestFriend,
  respondFriend,
  unfollowUser,
  useSocialGraph,
  type SocialOutcome,
} from '../src/features/social/socialGraphData';
import { C } from '../src/i18n/catalog/social';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';

const SECTION_LABEL: Readonly<Record<SocialSectionKey, Entry>> = {
  requestsIn: C.sectionRequestsIn,
  friends: C.sectionFriends,
  following: C.sectionFollowing,
  followers: C.sectionFollowers,
};

export default function AmisScreen() {
  const t = useT();
  const toast = useToast();
  const { data: graph, loading, failed, unsupported, refusal, signedOut, configured, reload } =
    useSocialGraph();
  const [handleInput, setHandleInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    screen('amis');
  }, []);

  /**
   * Traduit UNE réponse serveur en UNE phrase. Un seul endroit, pour que les
   * six points d'écriture de l'écran ne puissent pas se contredire — et pour
   * qu'aucun motif ne finisse en « une erreur est survenue ».
   */
  const say = useCallback(
    (out: SocialOutcome, success: string): void => {
      if (out.kind === 'done') {
        toast.show(success);
        reload();
        return;
      }
      if (out.kind === 'failed') return toast.show(t(C.errNetwork));
      if (out.kind === 'unsupported') return toast.show(t(C.unsupportedTitle));
      toast.show(socialRefusalText(t, out.refusal));
      // Un refus est une RÉPONSE : l'état affiché peut être périmé (l'autre
      // personne a répondu entre-temps), donc on relit plutôt que de deviner.
      reload();
    },
    [reload, t, toast],
  );

  const doFollow = useCallback(async () => {
    const handle = handleInput.trim().replace(/^@/, '').toLowerCase();
    if (handle.length === 0 || busy) return;
    setBusy(true);
    const out = await followUser(handle);
    setBusy(false);
    track(EVENTS.socialFollowed, {
      result:
        out.kind === 'done' ? (out.already ? 'already' : 'followed')
        : out.kind === 'refused' ? out.refusal
        : out.kind,
    });
    if (out.kind === 'done') setHandleInput('');
    say(out, t(out.kind === 'done' && out.already ? C.okAlreadyFollowing : C.okFollowed, { handle }));
  }, [busy, handleInput, say, t]);

  const doAsk = useCallback(
    async (handle: string) => {
      if (busy) return;
      setBusy(true);
      const out = await requestFriend(handle);
      setBusy(false);
      track(EVENTS.friendRequestSent, {
        result:
          out.kind === 'done'
            ? out.data.status === 'accepted' ? 'accepted' : out.already ? 'already' : 'pending'
            : out.kind === 'refused' ? out.refusal
            : out.kind,
      });
      say(out, t(out.kind === 'done' && out.data.status === 'accepted' ? C.okFriendAccepted : C.okRequestSent));
    },
    [busy, say, t],
  );

  const doRespond = useCallback(
    async (id: string, accept: boolean) => {
      if (busy) return;
      setBusy(true);
      const out = await respondFriend(id, accept);
      setBusy(false);
      if (out.kind === 'done') track(EVENTS.friendRequestDecided, { decision: accept ? 'accepted' : 'declined' });
      say(out, t(accept ? C.okFriendAccepted : C.okDeclined));
    },
    [busy, say, t],
  );

  const doUnfollow = useCallback(
    async (handle: string) => {
      if (busy) return;
      setBusy(true);
      const out = await unfollowUser(handle);
      setBusy(false);
      say(out, t(C.okDeclined));
    },
    [busy, say, t],
  );

  const kicker = graph?.me.handle ? t(C.friendsKickerHandle, { handle: graph.me.handle }) : undefined;

  return (
    <StackScreen
      title={t(C.friendsTitle)}
      icon="ami"
      kicker={kicker}
      floating={<ToastHost state={toast} />}
    >
      {/* ── ÉTAT ④ : lecture en cours. Une ligne, non tapable. ───────────── */}
      {loading ? <Text style={styles.stateInline}>{t(C.reading)}</Text> : null}

      {/* ── ÉTAT ① : pas connecté. UN CTA — MAIS SEULEMENT S'IL MÈNE QUELQUE PART.
             Correction du 28/07/2026 : le bouton « Se connecter » était peint
             dans TOUS les cas signedOut, y compris sans backend relié — or
             `/sign-in` redirige alors immédiatement vers la carte
             (`if (session || !configured) return <Redirect href="/" />`), donc
             le tap éjectait la personne sans un mot. Un bouton qui ne répare
             rien est un bouton mort, ce que le docblock de cet écran affirmait
             déjà. Sans backend : deux phrases, zéro bouton (même patron
             qu'`activite.tsx`). ───────────────────────────────────────────── */}
      {!loading && signedOut ? (
        <Card style={styles.stateCard}>
          <Text style={styles.stateTitle}>
            {t(configured ? C.signedOutTitle : C.noBackendTitle)}
          </Text>
          <Text style={styles.stateBody}>
            {t(configured ? C.signedOutBody : C.noBackendBody)}
          </Text>
          {configured ? (
            <View style={styles.stateAction}>
              <Button
                variant="ghost"
                size="md"
                label={t(C.signIn)}
                onPress={() => router.push('/sign-in')}
                analyticsId="amis_sign_in"
              />
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* ── ÉTAT ③ : je n'ai PAS PU lire. Ça ne dit rien sur ses liens. ─── */}
      {!loading && !signedOut && failed ? (
        <Card style={styles.stateCard} state="alert">
          <Text style={styles.stateTitle}>{t(C.failedTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.failedBody)}</Text>
          <View style={styles.stateAction}>
            <Button variant="ghost" size="md" label={t(C.retry)} onPress={reload} />
          </View>
        </Card>
      ) : null}

      {/* ── ÉTAT ③b : le serveur RÉPOND mais n'a pas 0088. Aucun bouton :
             réessayer ne réparerait rien, et le peindre serait mentir. ──── */}
      {!loading && !signedOut && unsupported ? (
        <Card style={styles.stateCard}>
          <Text style={styles.stateTitle}>{t(C.unsupportedTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.unsupportedBody)}</Text>
        </Card>
      ) : null}

      {/* Un refus explicite hors `signed_out` (contrat inattendu) : on le DIT
          plutôt que de laisser l'écran muet. */}
      {!loading && !signedOut && !failed && !unsupported && !graph && refusal ? (
        <Card style={styles.stateCard}>
          <Text style={styles.stateTitle}>{t(C.failedTitle)}</Text>
          <Text style={styles.stateBody}>{socialRefusalText(t, refusal)}</Text>
        </Card>
      ) : null}

      {/* ── ÉTAT ② : LU. Une liste vide est ici une VÉRITÉ. ─────────────── */}
      {graph ? (
        <>
          {isEmptyGraph(graph) ? (
            <Card style={styles.stateCard}>
              <Text style={styles.stateTitle}>{t(C.emptyTitle)}</Text>
              <Text style={styles.stateBody}>{t(C.emptyBody)}</Text>
            </Card>
          ) : null}

          {sections(graph).map((section) => (
            <View key={section.key} style={styles.section}>
              <SectionLabel>{t(SECTION_LABEL[section.key])}</SectionLabel>
              {section.people.map((person, i) => (
                <PersonRow
                  key={`${section.key}-${person.handle ?? i}`}
                  person={person}
                  sectionKey={section.key}
                  graph={graph}
                  busy={busy}
                  /* L'id vient de LA PERSONNE, pas d'un index croisé sur une
                     autre liste : `sections()` pourrait un jour filtrer ou
                     réordonner, et deux boutons de décision branchés sur la
                     mauvaise demande seraient la pire régression possible. */
                  requestId={requestIdOf(person)}
                  onAsk={doAsk}
                  onRespond={doRespond}
                  onUnfollow={doUnfollow}
                />
              ))}
              {/* Une liste BORNÉE le dit : sinon le compte affiché serait faux. */}
              {section.truncated ? (
                <Text style={styles.truncated}>
                  {t(C.truncated, { shown: section.people.length, total: section.total })}
                </Text>
              ) : null}
            </View>
          ))}

          {graph.requestsOut.length > 0 ? (
            <Text style={styles.footnote}>
              {t(C.requestsOut, {
                handles: graph.requestsOut.map((p) => `@${p.handle ?? '?'}`).join(', '),
              })}
            </Text>
          ) : null}

          {/* ── SUIVRE UN @CODE — la seule façon d'entrer en lien ─────────── */}
          <View style={styles.addBlock}>
            <SectionLabel>{t(C.addKicker)}</SectionLabel>
            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                value={handleInput}
                onChangeText={setHandleInput}
                placeholder={t(C.addPlaceholder)}
                placeholderTextColor={colors.gris}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={21}
                accessibilityLabel={t(C.addPlaceholder)}
                onSubmitEditing={() => void doFollow()}
              />
              <Button
                variant="primary"
                size="md"
                label={t(C.addCta)}
                onPress={() => void doFollow()}
                // §A4 : le CTA ne se peint pas actif sur un envoi condamné.
                disabled={busy || handleInput.trim().replace(/^@/, '').length === 0}
                analyticsId="amis_follow"
              />
            </View>
            {graph.me.handle ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(C.showMyCode)}
                onPress={() => router.push('/qr')}
                style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
              >
                <IconPlate icon="qr" size="md" color={colors.blanc} />
                <Text style={styles.linkLabel}>{t(C.showMyCode)}</Text>
                <Icon name="chevron" size={16} color={colors.gris} />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.duelsOpen)}
              onPress={() => router.push('/defis')}
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            >
              <IconPlate icon="cible" size="md" color={colors.blanc} />
              <Text style={styles.linkLabel}>{t(C.duelsOpen)}</Text>
              <Icon name="chevron" size={16} color={colors.gris} />
            </Pressable>
          </View>

          {/* ── CE QUI N'A PAS DE SOURCE (spec E57 §3 et §4) ──────────────── */}
          <View style={styles.noSource}>
            <Text style={styles.noSourceTitle}>{t(C.noSourceTitle)}</Text>
            <Text style={styles.stateBody}>{t(C.noSourceBody)}</Text>
          </View>
        </>
      ) : null}
    </StackScreen>
  );
}

/**
 * UNE LIGNE PAR PERSONNE : plaque → @handle → actions. Les actions dépendent de
 * la SECTION, parce que ce qu'on peut faire d'un lien dépend de sa nature.
 * Une personne sans @handle ne porte AUCUNE action : elle n'est pas adressable
 * (les RPC prennent un @handle), et peindre un bouton condamné serait la faute.
 */
function PersonRow({
  person, sectionKey, graph, busy, requestId, onAsk, onRespond, onUnfollow,
}: {
  person: Person;
  sectionKey: SocialSectionKey;
  graph: SocialGraph;
  busy: boolean;
  requestId: string | null;
  onAsk: (handle: string) => void;
  onRespond: (id: string, accept: boolean) => void;
  onUnfollow: (handle: string) => void;
}) {
  const t = useT();
  const handle = person.handle;
  const challengeable = canChallenge(graph, handle);

  return (
    <View style={styles.row}>
      <IconPlate icon="ami" size="md" color={colors.blanc} />
      <View style={styles.rowText}>
        {/* Aucun `numberOfLines` : un @ s'enroule, il ne se coupe jamais (§A.9). */}
        <Text style={styles.rowTitle}>{handle ? `@${handle}` : t(C.personNoHandle)}</Text>
        {person.displayName && handle ? (
          <Text style={styles.rowMeta}>{person.displayName}</Text>
        ) : null}
      </View>
      <View style={styles.rowActions}>
        {sectionKey === 'requestsIn' && requestId ? (
          <>
            <RowAction label={t(C.accept)} onPress={() => onRespond(requestId, true)} disabled={busy} />
            <RowAction label={t(C.decline)} onPress={() => onRespond(requestId, false)} disabled={busy} />
          </>
        ) : null}
        {sectionKey === 'following' && handle ? (
          <RowAction label={t(C.unfollow)} onPress={() => onUnfollow(handle)} disabled={busy} />
        ) : null}
        {sectionKey === 'followers' && handle ? (
          <RowAction label={t(C.askFriend)} onPress={() => onAsk(handle)} disabled={busy} />
        ) : null}
        {challengeable && handle ? (
          <RowAction
            label={t(C.challenge)}
            onPress={() => router.push({ pathname: '/defi', params: { handle } })}
            disabled={busy}
          />
        ) : null}
      </View>
    </View>
  );
}

/** Action de ligne : texte tapable, 44 px de haut RÉELS, jamais tronqué. */
function RowAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed, disabled && styles.actionOff]}
    >
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * Une demande REÇUE porte un `id` (c'est la seule ligne décidable) ; toutes les
 * autres personnes n'en ont pas. On le lit sur l'objet plutôt que de le déduire
 * de la section — un `id` présent EST la preuve qu'il y a une décision à
 * prendre, et son absence garantit qu'aucun bouton ne sera peint.
 */
function requestIdOf(person: Person): string | null {
  const id = (person as { id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

const styles = StyleSheet.create({
  // ── Les états ────────────────────────────────────────────────────────────
  stateInline: { ...typography.body, color: colors.gris, marginTop: spacing.lg },
  stateCard: { marginTop: spacing.md, gap: spacing.xs },
  stateTitle: { ...typography.cardTitle, color: colors.blanc },
  stateBody: { ...typography.body, color: colors.gris },
  stateAction: { marginTop: spacing.sm },

  // ── Sections et lignes (§A : des LIGNES, jamais des cards dans une card) ─
  section: { marginTop: spacing.lg, gap: spacing.xxs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: borderState.hairline,
  },
  rowText: { flex: 1 },
  rowTitle: { ...typography.itemTitle, color: colors.blanc },
  rowMeta: { ...typography.meta, color: colors.gris, marginTop: spacing.xxs },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  action: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionOff: { opacity: 0.4 },
  actionLabel: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: { opacity: 0.7 },
  truncated: { ...typography.meta, color: colors.gris, marginTop: spacing.xs },

  // ── Suivre un @code ──────────────────────────────────────────────────────
  addBlock: { marginTop: spacing.xl, gap: spacing.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: sizes.touchTarget,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    color: colors.blanc,
    fontSize: fontSizes.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
  },
  linkLabel: { ...typography.itemTitle, color: colors.blanc, flex: 1 },

  // ── Ce qui n'a pas de source ─────────────────────────────────────────────
  noSource: { marginTop: spacing.xl, gap: spacing.xs },
  noSourceTitle: { ...typography.cardTitle, color: colors.blanc },
  footnote: { ...typography.meta, color: colors.gris, marginTop: spacing.md },
});
