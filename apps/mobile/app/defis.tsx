/**
 * GRYD — E58 · MES DÉFIS (`/defis`) : la BOÎTE. Poussé depuis `/amis`.
 *
 * ─── POURQUOI CET ÉCRAN EXISTE, SÉPARÉ DE `/defi` ───────────────────────────
 * E58 décrit « une feuille courte » : c'est l'écran d'ENVOI (`/defi`). Mais un
 * défi qui ne peut pas être REFUSÉ n'est pas une sollicitation, c'est une
 * obligation — et refuser demande un endroit où voir ce qu'on a reçu. Les deux
 * écrans portent donc DEUX décisions distinctes (§A : 1 écran = 1 décision) :
 *   · ici, « je réponds » ;
 *   · sur `/defi`, « j'envoie ».
 * Les fondre aurait donné une page avec un formulaire ET une boîte de
 * réception, illisible en moins de 3 s.
 *
 * ⚠️ NE PAS CONFONDRE AVEC `/challenges`. Celui-là sert des OBJECTIFS SOLO
 * servis par le serveur à tout le monde (table `challenges`, 0007), sans
 * destinataire ni refus possible. Ici, chaque ligne a un émetteur humain.
 *
 * ─── CE QUE CET ÉCRAN NE MONTRE PAS, ET C'EST L'ESSENTIEL ───────────────────
 * AUCUN SCORE, AUCUNE PROGRESSION, AUCUN « qui mène ». `duel_inbox()` rend
 * `scoringExists: false` (0088 §14) parce qu'AUCUN moteur ne mesure une surface
 * sur une fenêtre par joueur ni ne désigne un vainqueur. Peindre « 3 – 1 »
 * aujourd'hui serait l'inventer. L'écran le DIT en une phrase plutôt que de
 * laisser un vide interprétable — et si `scoringExists` passait un jour à
 * `true`, cette phrase disparaîtrait avec la raison qui la justifiait.
 *
 * ─── LE REFUS, DE PREMIÈRE CLASSE ───────────────────────────────────────────
 * « Refuser » est un bouton de ligne, au même niveau visuel qu'« Accepter » :
 * pas plus petit, pas en gris pâle, pas caché derrière un menu. Il n'ouvre
 * AUCUNE confirmation et ne demande AUCUN motif — les deux seraient de la
 * friction, et un champ « pourquoi ? » serait une culpabilisation. Une phrase
 * factuelle dit ce qui se passe ensuite (l'autre le voit, sans commentaire, et
 * ne peut pas relancer avant DUEL_RETRY_COOLDOWN_HOURS).
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  DUEL_RETRY_COOLDOWN_HOURS,
  EVENTS,
  borderState,
  colors,
  sizes,
  spacing,
  typography,
} from '@klaim/shared';
import { screen, track } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Card, IconPlate } from '../src/ui/Card';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { ToastHost, useToast } from '../src/features/social/Toast';
import type {
  ActiveDuel,
  IncomingDuel,
  OutgoingDuel,
} from '../src/features/social/socialGraph';
import {
  cancelDuel,
  respondDuel,
  useDuelInbox,
  type SocialOutcome,
} from '../src/features/social/socialGraphData';
import { C } from '../src/i18n/catalog/social';
import { useT } from '../src/i18n/store';
import { duelLine, socialRefusalText } from '../src/features/social/socialLabels';

export default function DefisScreen() {
  const t = useT();
  const toast = useToast();
  const { data: inbox, loading, failed, unsupported, signedOut, configured, reload } =
    useDuelInbox();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    screen('defis');
  }, []);

  const say = useCallback(
    (out: SocialOutcome, success: string) => {
      if (out.kind === 'done') {
        toast.show(success);
        reload();
        return;
      }
      if (out.kind === 'failed') return toast.show(t(C.errNetwork));
      if (out.kind === 'unsupported') return toast.show(t(C.unsupportedTitle));
      toast.show(socialRefusalText(t, out.refusal, true));
      reload();
    },
    [reload, t, toast],
  );

  const respond = useCallback(
    async (id: string, accept: boolean) => {
      if (busy) return;
      setBusy(true);
      const out = await respondDuel(id, accept);
      setBusy(false);
      if (out.kind === 'done') {
        track(EVENTS.duelDecided, { decision: accept ? 'accepted' : 'declined' });
      }
      say(out, t(accept ? C.duelOkAccepted : C.okDeclined));
    },
    [busy, say, t],
  );

  const withdraw = useCallback(
    async (id: string) => {
      if (busy) return;
      setBusy(true);
      const out = await cancelDuel(id);
      setBusy(false);
      say(out, t(C.okDeclined));
    },
    [busy, say, t],
  );

  const empty =
    inbox !== null &&
    inbox.incoming.length === 0 &&
    inbox.outgoing.length === 0 &&
    inbox.active.length === 0;

  return (
    <StackScreen
      title={t(C.duelsTitle)}
      icon="cible"
      backHref="/amis"
      floating={<ToastHost state={toast} />}
    >
      {/* ④ lecture en cours : une ligne, qui n'affirme rien. */}
      {loading ? <Text style={styles.stateInline}>{t(C.duelsReading)}</Text> : null}

      {/* ① pas connecté — et ①bis : pas de backend du tout.
             Le CTA « Se connecter » ne se peint que s'il MÈNE quelque part :
             sans backend, `/sign-in` redirige aussitôt sur la carte, donc le
             bouton serait mort (corrigé le 28/07/2026, comme dans `/amis`). */}
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
                analyticsId="defis_sign_in"
              />
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* ③ je n'ai pas pu lire — ça ne dit rien sur ses défis. */}
      {!loading && !signedOut && failed ? (
        <Card style={styles.stateCard} state="alert">
          <Text style={styles.stateTitle}>{t(C.failedTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.failedBody)}</Text>
          <View style={styles.stateAction}>
            <Button variant="ghost" size="md" label={t(C.retry)} onPress={reload} />
          </View>
        </Card>
      ) : null}

      {/* ③b serveur sans 0088 : aucun bouton, réessayer ne réparerait rien. */}
      {!loading && !signedOut && unsupported ? (
        <Card style={styles.stateCard}>
          <Text style={styles.stateTitle}>{t(C.unsupportedTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.unsupportedBody)}</Text>
        </Card>
      ) : null}

      {inbox ? (
        <>
          {empty ? (
            <Card style={styles.stateCard}>
              <Text style={styles.stateTitle}>{t(C.duelsEmptyTitle)}</Text>
              <Text style={styles.stateBody}>{t(C.duelsEmptyBody)}</Text>
              <View style={styles.stateAction}>
                <Button
                  variant="ghost"
                  size="md"
                  label={t(C.duelOpenFriends)}
                  onPress={() => router.push('/amis')}
                  analyticsId="defis_open_friends"
                />
              </View>
            </Card>
          ) : null}

          {inbox.incoming.length > 0 ? (
            <View style={styles.section}>
              <SectionLabel>{t(C.duelsSectionIncoming)}</SectionLabel>
              {inbox.incoming.map((d) => (
                <IncomingRow key={d.id} duel={d} busy={busy} onRespond={respond} />
              ))}
              {/* La phrase qui rend le refus banal — factuelle, jamais rassurante
                  à l'excès, et son nombre vient de game-rules. */}
              <Text style={styles.note}>
                {t(C.duelDeclineNote, { hours: DUEL_RETRY_COOLDOWN_HOURS })}
              </Text>
            </View>
          ) : null}

          {inbox.outgoing.length > 0 ? (
            <View style={styles.section}>
              <SectionLabel>{t(C.duelsSectionOutgoing)}</SectionLabel>
              {inbox.outgoing.map((d) => (
                <OutgoingRow key={d.id} duel={d} busy={busy} onWithdraw={withdraw} />
              ))}
              <Text style={styles.note}>{t(C.duelExpires)}</Text>
            </View>
          ) : null}

          {inbox.active.length > 0 ? (
            <View style={styles.section}>
              <SectionLabel>{t(C.duelsSectionActive)}</SectionLabel>
              {inbox.active.map((d) => (
                <ActiveRow key={d.id} duel={d} />
              ))}
            </View>
          ) : null}

          {/* L'HONNÊTETÉ CENTRALE : GRYD ne compte pas encore les défis. Cette
              phrase n'est affichée QUE tant que le serveur le confirme. */}
          {!inbox.scoringExists && !empty ? (
            <Text style={styles.footnote}>{t(C.duelNoScoring)}</Text>
          ) : null}
        </>
      ) : null}
    </StackScreen>
  );
}

function IncomingRow({
  duel, busy, onRespond,
}: { duel: IncomingDuel; busy: boolean; onRespond: (id: string, accept: boolean) => void }) {
  const t = useT();
  return (
    <View style={styles.row}>
      <IconPlate icon="cible" size="md" color={colors.blanc} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>
          {t(C.duelFrom, { handle: duel.from.handle ?? '—' })}
        </Text>
        <Text style={styles.rowMeta}>{duelLine(t, duel)}</Text>
      </View>
      {/* « Refuser » a EXACTEMENT le même poids visuel qu'« Accepter » : ni
          plus petit, ni caché, ni précédé d'une confirmation. */}
      <View style={styles.rowActions}>
        <Button
          variant="ghost"
          size="md"
          label={t(C.accept)}
          disabled={busy}
          onPress={() => onRespond(duel.id, true)}
          analyticsId="duel_accept"
        />
        <Button
          variant="ghost"
          size="md"
          label={t(C.decline)}
          disabled={busy}
          onPress={() => onRespond(duel.id, false)}
          analyticsId="duel_decline"
        />
      </View>
    </View>
  );
}

function OutgoingRow({
  duel, busy, onWithdraw,
}: { duel: OutgoingDuel; busy: boolean; onWithdraw: (id: string) => void }) {
  const t = useT();
  return (
    <View style={styles.row}>
      <IconPlate icon="cible" size="md" color={colors.blanc} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{t(C.duelTo, { handle: duel.to.handle ?? '—' })}</Text>
        <Text style={styles.rowMeta}>{duelLine(t, duel)}</Text>
      </View>
      <Button
        variant="ghost"
        size="md"
        label={t(C.duelCancel)}
        disabled={busy}
        onPress={() => onWithdraw(duel.id)}
        analyticsId="duel_withdraw"
      />
    </View>
  );
}

/** Un défi accepté. AUCUN score : il n'en existe pas (cf. l'en-tête). */
function ActiveRow({ duel }: { duel: ActiveDuel }) {
  const t = useT();
  return (
    <View style={styles.row}>
      <IconPlate icon="cible" size="md" color={colors.blanc} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{t(C.duelWith, { handle: duel.with.handle ?? '—' })}</Text>
        <Text style={styles.rowMeta}>{duelLine(t, duel)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stateInline: { ...typography.body, color: colors.gris, marginTop: spacing.lg },
  stateCard: { marginTop: spacing.md, gap: spacing.xs },
  stateTitle: { ...typography.cardTitle, color: colors.blanc },
  stateBody: { ...typography.body, color: colors.gris },
  stateAction: { marginTop: spacing.sm },

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
  note: { ...typography.meta, color: colors.gris, marginTop: spacing.sm },
  footnote: { ...typography.body, color: colors.gris, marginTop: spacing.xl },
});
