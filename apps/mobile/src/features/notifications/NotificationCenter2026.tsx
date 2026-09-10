/**
 * GRYD — LE CENTRE DE NOTIFICATIONS (§14.2 : « centre d'activité »).
 *
 * ─── CE QU'IL EST, ET CE QU'IL REMPLACE ─────────────────────────────────────
 * `/activite` (planche E23) lisait `user_badges` et `territory_contests` :
 * deux sources d'AVANT la refonte, dont l'une mesure une mécanique supprimée
 * (§5.3 a retiré la contestation). Cet écran lit `my_notifications_2026`, donc
 * les faits que le serveur produit vraiment (0193), et `/activite` y redirige.
 *
 * ─── LES QUATRE ÉTATS, JAMAIS REPLIÉS ───────────────────────────────────────
 * Pas connecté · lecture en cours · échec de lecture · vide. Un « vide » qui
 * remplacerait un échec ferait croire qu'il n'y a rien à savoir (L8, L14).
 * L'état vide ne s'excuse pas et ne relance personne : il dit où arrivera la
 * prochaine nouvelle.
 *
 * ─── LE LU, ET CE QU'IL NE FAIT PAS ─────────────────────────────────────────
 * Une ligne se marque lue en l'ouvrant, ou toutes d'un geste. Rien ne
 * DISPARAÎT en étant lu : le centre est un journal, pas une file à vider. Le
 * point de non-lu s'éteint, la ligne reste.
 *
 * ─── AUCUN BOUTON MORT ──────────────────────────────────────────────────────
 * Une ligne sans lien (un crew dissous, un retrait) n'est pas pressable et ne
 * porte pas de chevron : il n'existe plus d'écran de ce crew pour son lecteur.
 * Elle se marque lue en marquant tout.
 */
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { fonts, refonteColors as c } from '@klaim/shared';
import { useT, useLocale } from '../../i18n/store';
import { C } from '../../i18n/catalog/notifications';
import { AccountDoor2026 } from '../account/AccountDoor2026';
import {
  ProfileButton, ProfilePage, ProfileSection, s, lightStyles,
} from '../refonte/ProfilePrimitives';
import { GrydIcon } from '../../ui/gryd/GrydIcon';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  formatDayLabel2026, groupNotificationsByDay2026, renderNotification2026,
  type NotificationItem2026,
} from './notificationInbox2026';
import { useNotificationCenter2026 } from './useNotificationCenter2026';

export default function NotificationCenter2026() {
  const t = useT();
  const locale = useLocale();
  const centre = useNotificationCenter2026();
  const { markRead } = centre;

  const jours = useMemo(
    () => groupNotificationsByDay2026(centre.items, Date.now()),
    [centre.items],
  );

  const ouvrir = useCallback((item: NotificationItem2026) => {
    void markRead([item.id]);
    if (item.deepLink !== null) router.push(item.deepLink as never);
  }, [markRead]);

  return <ProfilePage tone="light" title={t(C.titre)} back backHref="/">
    <Text style={[s.body, lightStyles.body, local.lead]}>{t(C.intro)}</Text>

    {centre.markFailed
      ? <Text accessibilityRole="alert" style={[s.meta, lightStyles.meta, local.notice]}>
        {t(C.echecMarquage)}
      </Text>
      : null}

    {centre.status === 'signed-out'
      ? <AccountDoor2026 tone="light" reason={t(C.etatDeconnecte)} />
      : centre.status === 'unavailable' || !isSupabaseConfigured
        ? <View style={s.state}>
          <Text style={[s.body, lightStyles.body]}>{t(C.etatIndisponible)}</Text>
        </View>
        : centre.status === 'loading'
          ? <View style={s.state}>
            <ActivityIndicator color={c.ink} />
            <Text style={[s.meta, lightStyles.meta]}>{t(C.etatLecture)}</Text>
          </View>
          : centre.status !== 'ready'
            ? <View style={s.state}>
              <Text style={[s.body, lightStyles.body]}>{t(C.etatEchec)}</Text>
              <ProfileButton tone="light" label={t(C.actionReessayer)} onPress={centre.reload} />
            </View>
            : centre.items.length === 0
              ? <View style={s.empty}>
                <Text style={[s.body, lightStyles.body]}>{t(C.etatVide)}</Text>
              </View>
              : <>
                {centre.unread > 0
                  ? <View style={local.toolbar}>
                    <ProfileButton tone="light" secondary label={t(C.actionToutLu)}
                      onPress={() => { void markRead(null); }} />
                  </View>
                  : null}

                {jours.map((jour) => <View key={jour.key}>
                  <ProfileSection tone="light" title={
                    jour.label === 'today' ? t(C.jourAujourdhui)
                      : jour.label === 'yesterday' ? t(C.jourHier)
                        : formatDayLabel2026(jour.key, locale)} />
                  {jour.items.map((item) => <Ligne key={item.id} item={item} onOpen={ouvrir} />)}
                </View>)}

                {centre.hasMore
                  ? <View style={local.toolbar}>
                    <ProfileButton tone="light" secondary busy={centre.busy}
                      label={t(C.actionPlus)} onPress={() => { void centre.loadMore(); }} />
                  </View>
                  : null}
              </>}

    <Pressable accessibilityRole="link" style={local.reglages}
      onPress={() => router.push('/parametres/notifications')}>
      <Text style={[s.meta, lightStyles.meta, local.reglagesTexte]}>{t(C.lienReglages)}</Text>
    </Pressable>
  </ProfilePage>;
}

/**
 * UNE ligne : l'emoji du serveur, le titre, le corps quand il existe, et le
 * point de non-lu. Le chevron n'apparaît QUE si un écran attend derrière.
 */
function Ligne({ item, onOpen }: {
  item: NotificationItem2026;
  onOpen: (item: NotificationItem2026) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const rendu = renderNotification2026(item, locale);
  const nonLu = item.readAtMs === null;
  const ouvrable = item.deepLink !== null;
  const etiquette = `${rendu.emoji} ${rendu.title}${rendu.body === null ? '' : `. ${rendu.body}`}`
    + (nonLu ? `. ${t(C.nonLu)}` : '');

  const contenu = <View style={local.ligneContenu}>
    <Text style={local.emoji}>{rendu.emoji}</Text>
    <View style={s.flex}>
      <Text style={[local.titre, nonLu && local.titreNonLu]}>{rendu.title}</Text>
      {rendu.body === null
        ? null
        : <Text style={[s.meta, lightStyles.meta]}>{rendu.body}</Text>}
    </View>
    {nonLu ? <View style={local.point} /> : null}
    {ouvrable ? <GrydIcon name="chevronRight" size={18} color={c.muted} /> : null}
  </View>;

  if (!ouvrable) {
    return <View accessible accessibilityLabel={etiquette} style={local.ligne}>{contenu}</View>;
  }
  return <Pressable accessibilityRole="button" accessibilityLabel={etiquette}
    onPress={() => onOpen(item)}
    style={({ pressed }) => [local.ligne, pressed && s.pressed]}>
    {contenu}
  </Pressable>;
}

const local = StyleSheet.create({
  lead: { marginBottom: 8 },
  notice: { color: c.ink, marginBottom: 8 },
  toolbar: { marginTop: 12, marginBottom: 4 },
  ligne: {
    minHeight: 56, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: c.surfaceMuted,
  },
  ligneContenu: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 22, lineHeight: 28, width: 28, textAlign: 'center' },
  titre: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.ink },
  titreNonLu: { fontFamily: fonts.textSemi },
  point: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
  reglages: { minHeight: 44, justifyContent: 'center', marginTop: 20 },
  reglagesTexte: { textDecorationLine: 'underline' },
});
