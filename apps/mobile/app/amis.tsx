/**
 * GRYD — Page Amis mise en scène de jeu (AMENDEMENT-08 §8, doc §19 ; conserve
 * AMENDEMENT-07 §8). Écran POUSSÉ depuis Profil. Onglets : Amis · Demandes ·
 * Suggestions · QR · Recherche @handle. Chaque ami est une FriendCard du design
 * system (avatar hex à tier DÉRIVÉ de son XP, @handle, ville · crew, dispo +
 * runs semaine) avec les actions POSITIVES en avant (Inviter sortie / Inviter
 * crew) — « Bloquer » est RELÉGUÉ dans le menu « … » (anti-shame : plus jamais
 * en bouton visible). La recherche valide le handle via HANDLE_REGEX (source
 * shared). Données démo (features/social/demo). Zéro position live.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { HANDLE_REGEX, colors, fontSizes, gameColors, radii, sizes, spacing } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { GhostButton } from '../src/ui/GhostButton';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { FriendCard } from '../src/ui/game';
import { playerLevelForXp, playerTierForLevel } from '../src/features/crew/rules';
import { FRIENDS, type FriendDemo } from '../src/features/social/demo';
import { useMyProfile } from '../src/features/social/profileStore';
import { ToastHost, useToast, type ToastController } from '../src/features/social/Toast';
import { useSession } from '../src/lib/session';

const NO_FRIENDS: readonly FriendDemo[] = [];

/**
 * Amis : AUCUNE source réelle d'amis n'est encore câblée (O1). Un vrai
 * utilisateur (session) voit donc une liste VIDE honnête — jamais de faux amis
 * présentés comme les siens (« l'app ne ment jamais »). La démo ne sert que le
 * showcase (web / dev sans session).
 */
function useFriends(): readonly FriendDemo[] {
  const { session, configured } = useSession();
  return configured && session ? NO_FRIENDS : FRIENDS;
}

type TabKey = 'friends' | 'requests' | 'suggestions' | 'qr' | 'search';

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: 'friends', label: 'Amis' },
  { key: 'requests', label: 'Demandes' },
  { key: 'suggestions', label: 'Suggestions' },
  { key: 'qr', label: 'QR' },
  { key: 'search', label: 'Recherche' },
];

/** Tier joueur DÉRIVÉ de l'XP (aucun tier codé en dur). */
function tierOf(friend: FriendDemo) {
  return playerTierForLevel(playerLevelForXp(friend.xp));
}

/** FriendCard du design system pré-câblée depuis la demo sociale. */
function DemoFriendCard({
  friend,
  toast,
  onMore,
  withInvites = false,
}: {
  friend: FriendDemo;
  toast: ToastController;
  onMore?: () => void;
  withInvites?: boolean;
}) {
  return (
    <FriendCard
      handle={`@${friend.handle}`}
      city={friend.city}
      crewName={friend.crewTag}
      availability={friend.availability ?? friend.reason}
      runsThisWeek={friend.runsThisWeek}
      tier={tierOf(friend)}
      onInviteRun={
        withInvites ? () => toast.show(`Sortie proposée à @${friend.handle}`) : undefined
      }
      onInviteCrew={
        withInvites && friend.inMyCrew !== true
          ? () => toast.show(`Invitation crew envoyée à @${friend.handle}`)
          : undefined
      }
      onMore={onMore}
    />
  );
}

function FriendsList({ toast, onMore }: {
  toast: ToastController;
  onMore: (friend: FriendDemo) => void;
}) {
  const friends = useFriends().filter((f) => f.state === 'accepted');
  if (friends.length === 0) {
    return <Text style={styles.empty}>Pas encore d’amis. Invite ton crew ou fais scanner ton QR.</Text>;
  }
  return (
    <View style={styles.list}>
      {friends.map((f) => (
        <DemoFriendCard
          key={f.handle}
          friend={f}
          toast={toast}
          withInvites
          onMore={() => onMore(f)}
        />
      ))}
    </View>
  );
}

function RequestsList({ toast, onMore }: {
  toast: ToastController;
  onMore: (friend: FriendDemo) => void;
}) {
  const requests = useFriends().filter((f) => f.state === 'incoming');
  if (requests.length === 0) {
    return <Text style={styles.empty}>Aucune demande en attente.</Text>;
  }
  return (
    <View style={styles.list}>
      {requests.map((f) => (
        <View key={f.handle} style={styles.requestBlock}>
          <DemoFriendCard friend={f} toast={toast} onMore={() => onMore(f)} />
          <View style={styles.actionRow}>
            <View style={styles.actionCell}>
              <GhostButton
                label="Accepter"
                icon="ajoutami"
                onPress={() => toast.show(`@${f.handle} ajouté`)}
              />
            </View>
            <View style={styles.actionCell}>
              <GhostButton label="Refuser" onPress={() => toast.show('Demande refusée')} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function SuggestionsList({ toast, onMore }: {
  toast: ToastController;
  onMore: (friend: FriendDemo) => void;
}) {
  const suggestions = useFriends().filter((f) => f.state === 'suggested');
  if (suggestions.length === 0) {
    return <Text style={styles.empty}>Aucune suggestion pour l’instant.</Text>;
  }
  return (
    <View style={styles.list}>
      {suggestions.map((f) => (
        <View key={f.handle} style={styles.requestBlock}>
          <DemoFriendCard friend={f} toast={toast} onMore={() => onMore(f)} />
          <View style={styles.actionRow}>
            <View style={styles.actionCell}>
              <GhostButton
                label="Ajouter"
                icon="ajoutami"
                onPress={() => toast.show(`Demande envoyée à @${f.handle}`)}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function QrPanel({ toast }: { toast: ToastController }) {
  // Identité RÉELLE via useMyProfile (session-aware) : un vrai user ne voit plus
  // le @handle démo « koro » comme si c'était son propre QR (O1).
  const { profile } = useMyProfile();
  return (
    <View style={styles.qrWrap}>
      <View style={styles.qrCard}>
        <Icon name="qr" size={120} color={colors.blanc} />
        <Text style={styles.qrHandle}>@{profile.handle}</Text>
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

function SearchPanel({ toast, onMore }: {
  toast: ToastController;
  onMore: (friend: FriendDemo) => void;
}) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase().replace(/^@/, '');
  const valid = HANDLE_REGEX.test(normalized);
  const friends = useFriends();
  const matches = useMemo(
    () => (normalized ? friends.filter((f) => f.handle.includes(normalized)) : []),
    [normalized, friends],
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
          <View style={styles.emptyCard}>
            <Text style={styles.emptyHandle}>@{normalized}</Text>
            <Text style={styles.emptyMeta}>Aucun coureur trouvé avec ce handle.</Text>
            <View style={styles.actionRow}>
              <View style={styles.actionCell}>
                <GhostButton
                  label="Envoyer une demande"
                  icon="ajoutami"
                  onPress={() => toast.show(`Demande envoyée à @${normalized}`)}
                />
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.list}>
        {matches.map((f) => (
          <View key={f.handle} style={styles.requestBlock}>
            <DemoFriendCard friend={f} toast={toast} onMore={() => onMore(f)} />
            {f.state !== 'accepted' ? (
              <View style={styles.actionRow}>
                <View style={styles.actionCell}>
                  <GhostButton
                    label="Ajouter"
                    icon="ajoutami"
                    onPress={() => toast.show(`Demande envoyée à @${f.handle}`)}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Menu « … » d'un ami — c'est ICI (et seulement ici) que vit « Bloquer »
 * (doc §19 : plus jamais en bouton visible). Overlay maison, options courtes.
 */
function MoreMenu({ friend, toast, onDismiss }: {
  friend: FriendDemo;
  toast: ToastController;
  onDismiss: () => void;
}) {
  const options: { label: string; danger?: boolean; onPress: () => void }[] = [
    {
      label: 'Voir le profil',
      onPress: () => toast.show(`Profil de @${friend.handle} — écran à venir (O1)`),
    },
    {
      label: 'Retirer de mes amis',
      onPress: () => toast.show(`@${friend.handle} retiré de tes amis`),
    },
    {
      label: `Bloquer @${friend.handle}`,
      danger: true,
      onPress: () => toast.show(`@${friend.handle} bloqué`),
    },
  ];
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer le menu"
        style={[StyleSheet.absoluteFill, styles.menuOverlay]}
        onPress={onDismiss}
      />
      <View style={styles.menuSheet}>
        <View style={styles.menuHandleBar} />
        <Text style={styles.menuTitle}>@{friend.handle}</Text>
        {options.map((opt) => (
          <Pressable
            key={opt.label}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            onPress={() => {
              opt.onPress();
              onDismiss();
            }}
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          >
            <Text style={[styles.menuItemLabel, opt.danger === true && styles.menuItemDanger]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Annuler"
          onPress={onDismiss}
          style={({ pressed }) => [styles.menuCancel, pressed && styles.menuItemPressed]}
        >
          <Text style={styles.menuCancelLabel}>Annuler</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AmisScreen() {
  const [tab, setTab] = useState<TabKey>('friends');
  const [menuFor, setMenuFor] = useState<FriendDemo | null>(null);
  const toast = useToast();

  useEffect(() => {
    // Screen view standard au montage (même motif que sources.tsx/support.tsx).
    screen('amis');
  }, []);

  const friends = useFriends();
  const friendsCount = friends.filter((f) => f.state === 'accepted').length;
  const requestsCount = friends.filter((f) => f.state === 'incoming').length;

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

        {tab === 'friends' ? <FriendsList toast={toast} onMore={setMenuFor} /> : null}
        {tab === 'requests' ? <RequestsList toast={toast} onMore={setMenuFor} /> : null}
        {tab === 'suggestions' ? <SuggestionsList toast={toast} onMore={setMenuFor} /> : null}
        {tab === 'qr' ? <QrPanel toast={toast} /> : null}
        {tab === 'search' ? <SearchPanel toast={toast} onMore={setMenuFor} /> : null}

        <Text style={styles.footnote}>
          Aucune position live n'est partagée. Ton profil suit tes réglages de visibilité.
        </Text>
      </StackScreen>
      {menuFor ? (
        <MoreMenu friend={menuFor} toast={toast} onDismiss={() => setMenuFor(null)} />
      ) : null}
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
    minHeight: sizes.touchTarget, // plancher tactile 44 (P1 : onglets ~33 px)
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  // Actif = bordure blanche (motif classement/badges) — chartreuse réservée
  // à moi/crew, CTA primaire, gains, live.
  tabActive: { backgroundColor: colors.carbone2, borderColor: colors.blanc },
  tabText: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  tabTextActive: { color: colors.blanc, fontWeight: '600' },
  list: { marginTop: 14, gap: 12 },
  requestBlock: { gap: 8 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionCell: { flex: 1 },
  empty: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 24, textAlign: 'center' },
  emptyCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 4,
  },
  emptyHandle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.3 },
  emptyMeta: { color: colors.gris, fontSize: fontSizes.xs, marginBottom: 10 },
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

  // ── Menu « … » (Bloquer relégué ici — doc §19) ──
  menuOverlay: { backgroundColor: colors.noir, opacity: 0.75 },
  menuSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.carbone,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: spacing.cardPadding,
    alignItems: 'stretch',
  },
  menuHandleBar: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.grisLigne,
    alignSelf: 'center',
    marginBottom: 14,
  },
  menuTitle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: 8,
  },
  menuItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.grisLigne,
  },
  menuItemPressed: { opacity: 0.7 },
  menuItemLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  // Muted red danger : action grave, pas de mise en avant (relégué + sobre)
  menuItemDanger: { color: gameColors.danger },
  menuCancel: { paddingVertical: 14, alignItems: 'center' },
  menuCancelLabel: { color: colors.gris, fontSize: fontSizes.sm },
});
