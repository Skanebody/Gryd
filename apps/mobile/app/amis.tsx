/**
 * GRYD — Page Amis (AMENDEMENT-07 §8, doc social Partie C). Écran POUSSÉ depuis
 * Profil. Onglets : Mes amis · Demandes · Suggestions · QR · Recherche @handle.
 * Actions Ajouter / Accepter / Refuser / Bloquer / Inviter au crew (icônes
 * @klaim/shared, toasts de confirmation). La recherche valide le handle via
 * HANDLE_REGEX (source shared). Chaque ami rend un AvatarHex à tier JOUEUR
 * DÉRIVÉ de son XP (playerLevelForXp/playerTierForLevel) — aucun tier codé en
 * dur. Données démo (features/social/demo). Zéro position live.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { HANDLE_REGEX, colors, fontSizes, radii, spacing } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { GhostButton } from '../src/ui/GhostButton';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { AvatarHex } from '../src/features/social/AvatarHex';
import { FRIENDS, MY_SOCIAL_PROFILE, type FriendDemo } from '../src/features/social/demo';
import { ToastHost, useToast, type ToastController } from '../src/features/social/Toast';
import { playerLevelForXp, playerTierForLevel } from '../src/features/crew/rules';

type TabKey = 'friends' | 'requests' | 'suggestions' | 'qr' | 'search';

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: 'friends', label: 'Mes amis' },
  { key: 'requests', label: 'Demandes' },
  { key: 'suggestions', label: 'Suggestions' },
  { key: 'qr', label: 'QR' },
  { key: 'search', label: 'Recherche' },
];

/** Carte d'un ami/candidat/suggestion : avatar + identité + actions contextuelles. */
function FriendCard({
  friend,
  actions,
}: {
  friend: FriendDemo;
  actions: React.ReactNode;
}) {
  const tier = playerTierForLevel(playerLevelForXp(friend.xp));
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <AvatarHex handle={friend.handle} tier={tier} crewTag={friend.crewTag} size={52} />
        <View style={styles.cardInfo}>
          <Text style={styles.name}>@{friend.handle}</Text>
          <Text style={styles.meta}>
            {friend.city}
            {friend.crewTag ? ` · ${friend.crewTag}` : ''}
          </Text>
          {friend.reason ? <Text style={styles.reason}>{friend.reason}</Text> : null}
        </View>
      </View>
      <View style={styles.actions}>{actions}</View>
    </View>
  );
}

/** Ligne d'actions compacte (boutons ghost côte à côte). */
function ActionRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.actionRow}>{children}</View>;
}

function FriendsList({ toast }: { toast: ToastController }) {
  const friends = FRIENDS.filter((f) => f.state === 'accepted');
  return (
    <View style={styles.list}>
      {friends.map((f) => (
        <FriendCard
          key={f.handle}
          friend={f}
          actions={
            <ActionRow>
              {!f.inMyCrew ? (
                <View style={styles.actionCell}>
                  <GhostButton
                    label="Inviter au crew"
                    icon="crew"
                    onPress={() => toast.show(`Invitation envoyée à @${f.handle}`)}
                  />
                </View>
              ) : null}
              <View style={styles.actionCell}>
                <GhostButton
                  label="Bloquer"
                  onPress={() => toast.show(`@${f.handle} bloqué`)}
                />
              </View>
            </ActionRow>
          }
        />
      ))}
    </View>
  );
}

function RequestsList({ toast }: { toast: ToastController }) {
  const requests = FRIENDS.filter((f) => f.state === 'incoming');
  if (requests.length === 0) {
    return <Text style={styles.empty}>Aucune demande en attente.</Text>;
  }
  return (
    <View style={styles.list}>
      {requests.map((f) => (
        <FriendCard
          key={f.handle}
          friend={f}
          actions={
            <ActionRow>
              <View style={styles.actionCell}>
                <GhostButton
                  label="Accepter"
                  icon="badge"
                  onPress={() => toast.show(`@${f.handle} ajouté`)}
                />
              </View>
              <View style={styles.actionCell}>
                <GhostButton label="Refuser" onPress={() => toast.show('Demande refusée')} />
              </View>
            </ActionRow>
          }
        />
      ))}
    </View>
  );
}

function SuggestionsList({ toast }: { toast: ToastController }) {
  const suggestions = FRIENDS.filter((f) => f.state === 'suggested');
  return (
    <View style={styles.list}>
      {suggestions.map((f) => (
        <FriendCard
          key={f.handle}
          friend={f}
          actions={
            <ActionRow>
              <View style={styles.actionCell}>
                <GhostButton
                  label="Ajouter"
                  icon="ajoutami"
                  onPress={() => toast.show(`Demande envoyée à @${f.handle}`)}
                />
              </View>
            </ActionRow>
          }
        />
      ))}
    </View>
  );
}

function QrPanel({ toast }: { toast: ToastController }) {
  return (
    <View style={styles.qrWrap}>
      <View style={styles.qrCard}>
        <Icon name="qr" size={120} color={colors.blanc} />
        <Text style={styles.qrHandle}>@{MY_SOCIAL_PROFILE.handle}</Text>
      </View>
      <Text style={styles.qrHint}>
        Fais scanner ce code pour t'ajouter en un tap — ou scanne celui d'un autre coureur.
      </Text>
      <GhostButton
        label="Scanner un QR"
        icon="qr"
        onPress={() => toast.show('Scanner — écran à venir (O1)')}
      />
    </View>
  );
}

function SearchPanel({ toast }: { toast: ToastController }) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase().replace(/^@/, '');
  const valid = HANDLE_REGEX.test(normalized);
  const matches = useMemo(
    () => (normalized ? FRIENDS.filter((f) => f.handle.includes(normalized)) : []),
    [normalized],
  );

  return (
    <View style={styles.searchWrap}>
      <View style={styles.searchBox}>
        <Text style={styles.at}>@</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="handle (3-20, a-z 0-9 _)"
          placeholderTextColor={colors.gris}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {normalized.length > 0 && !valid ? (
        <Text style={styles.invalid}>
          Handle invalide : minuscules, chiffres et _ uniquement (3 à 20).
        </Text>
      ) : null}

      {valid && matches.length === 0 ? (
        <View style={styles.list}>
          <View style={styles.card}>
            <Text style={styles.name}>@{normalized}</Text>
            <Text style={styles.meta}>Aucun coureur trouvé avec ce handle.</Text>
            <View style={styles.actions}>
              <GhostButton
                label="Envoyer une demande"
                icon="ajoutami"
                onPress={() => toast.show(`Demande envoyée à @${normalized}`)}
              />
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.list}>
        {matches.map((f) => (
          <FriendCard
            key={f.handle}
            friend={f}
            actions={
              <ActionRow>
                <View style={styles.actionCell}>
                  <GhostButton
                    label={f.state === 'accepted' ? 'Déjà ami' : 'Ajouter'}
                    icon={f.state === 'accepted' ? 'badge' : 'ajoutami'}
                    disabled={f.state === 'accepted'}
                    onPress={() => toast.show(`Demande envoyée à @${f.handle}`)}
                  />
                </View>
              </ActionRow>
            }
          />
        ))}
      </View>
    </View>
  );
}

export default function AmisScreen() {
  const [tab, setTab] = useState<TabKey>('friends');
  const toast = useToast();

  const friendsCount = FRIENDS.filter((f) => f.state === 'accepted').length;
  const requestsCount = FRIENDS.filter((f) => f.state === 'incoming').length;

  return (
    <>
      <StackScreen
        title="Amis"
        icon="ami"
        kicker={`${friendsCount} AMIS · ${requestsCount} DEMANDES`}
      >
        {/* Onglets pill (scroll horizontal implicite via wrap) */}
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              onPress={() => {
                setTab(t.key);
                screen(`amis_${t.key}`);
              }}
              style={[styles.tab, tab === t.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}
                {t.key === 'requests' && requestsCount > 0 ? ` · ${requestsCount}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'friends' ? <FriendsList toast={toast} /> : null}
        {tab === 'requests' ? <RequestsList toast={toast} /> : null}
        {tab === 'suggestions' ? <SuggestionsList toast={toast} /> : null}
        {tab === 'qr' ? <QrPanel toast={toast} /> : null}
        {tab === 'search' ? <SearchPanel toast={toast} /> : null}

        <Text style={styles.footnote}>
          Aucune position live n'est partagée. Ton profil suit tes réglages de visibilité.
        </Text>
      </StackScreen>
      <ToastHost state={toast} />
    </>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 },
  tab: {
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  tabActive: { backgroundColor: colors.carbone2, borderColor: colors.chartreuse40 },
  tabText: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  tabTextActive: { color: colors.blanc, fontWeight: '600' },
  list: { marginTop: 14, gap: 12 },
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardInfo: { flex: 1 },
  name: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.3 },
  meta: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 3, letterSpacing: 0.3 },
  reason: { color: colors.chartreuse, fontSize: fontSizes.xs, marginTop: 4, letterSpacing: 0.2 },
  actions: { marginTop: 14 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionCell: { flex: 1 },
  empty: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 24, textAlign: 'center' },
  qrWrap: { marginTop: 16, alignItems: 'center', gap: 16 },
  qrCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 14,
    alignSelf: 'stretch',
  },
  qrHandle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  qrHint: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
  },
  searchWrap: { marginTop: 14 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 16,
  },
  at: { color: colors.gris, fontSize: fontSizes.md, fontWeight: '600' },
  input: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, paddingVertical: 14 },
  invalid: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 8, letterSpacing: 0.2 },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 22,
  },
});
