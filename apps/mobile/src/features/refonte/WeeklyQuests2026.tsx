/**
 * GRYD — G23bis « Défis de la semaine » (ADR-013 §2.2 ①).
 *
 * CE QUE CET ÉCRAN NE MONTRE JAMAIS :
 *  · un compte à rebours, une échéance, un « il te reste » — la lecture serveur
 *    n'en renvoie pas et le modèle refuserait la réponse qui en porterait un ;
 *  · un reproche : une semaine non réussie se dit AU PASSÉ (« la semaine du
 *    7 septembre est passée »), sans « raté », sans « dommage » ;
 *  · une jauge, un pourcentage ou un « 3/2 » : la condition est une PHRASE, et
 *    l'état est binaire — en cours, ou réussi ;
 *  · un objet gagnable présenté comme une vitrine à cocher (G24). L'objet d'un
 *    défi est nommé, et c'est tout tant qu'il n'est pas gagné.
 *
 * QUATRE ÉTATS DISTINCTS (CLAUDE.md, L8/L14/L19) : pas connecté · lecture en
 * cours · lecture impossible · lu et vide. Aucun « 0 » nu, aucun repli inventé.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { fonts, refonteColors as c } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { useLocale } from '../../i18n/store';
import { resolve, format } from '../../i18n/types';
import { C } from '../../i18n/catalog/defisSemaine';
import { screen } from '../../lib/analytics';
import { GrydIcon } from '../../ui/gryd';
import { ProfileButton, ProfilePage, ProfileSection, ProfileSegments, s } from './ProfilePrimitives';
import { useWeeklyQuests2026 } from './WeeklyQuests2026Data';
import {
  QUEST_CONDITION_COPY_2026, QUEST_FAMILY_COPY_2026, QUEST_REWARD_KIND_COPY_2026,
  type QuestActivity2026, type WeeklyQuest2026, type WeeklyQuestObject2026,
} from './WeeklyQuests2026Model';

export function WeeklyQuests2026Screen() {
  const { session, loading } = useSession();
  return <WeeklyQuests2026Contents key={loading ? 'restoring' : session?.user.id ?? 'anonymous'} />;
}

function WeeklyQuests2026Contents() {
  const locale = useLocale();
  const { configured } = useSession();
  const data = useWeeklyQuests2026();
  const [activity, setActivity] = useState<QuestActivity2026>('run');
  const [notice, setNotice] = useState<string | null>(null);
  const t = (entry: Parameters<typeof resolve>[0]) => resolve(entry, locale);
  useEffect(() => { screen('defis-semaine'); }, []);

  const current = useMemo(() => data.data?.current.filter(x => x.activity === activity) ?? [], [data.data, activity]);
  const passed = useMemo(() => data.data?.passed.filter(x => x.activity === activity) ?? [], [data.data, activity]);
  const objects = data.data?.objects ?? [];
  const passedLabel = data.data
    ? format(C.sectionPassee, {
      date: new Date(`${data.data.passedWeek}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'long' }),
    }, locale)
    : '';

  async function toggleEquip(object: WeeklyQuestObject2026) {
    setNotice(null);
    const result = await data.equip(object.rewardId, !object.equipped);
    if (result.ok) return;
    setNotice(t(result.reason.includes('reward_not_owned') ? C.erreurNonPossede
      : result.reason.includes('authentication_required') ? C.erreurSession : C.erreurAction));
  }

  const questCard = (quest: WeeklyQuest2026, past: boolean) => {
    const copy = QUEST_CONDITION_COPY_2026[quest.condition];
    const done = quest.status === 'completed';
    return <View key={`${quest.activity}:${quest.questId}`} style={[local.card, done && local.cardDone]}>
      <View style={local.cardHead}>
        <Text style={local.family}>{t(QUEST_FAMILY_COPY_2026[quest.family])}</Text>
        <Text style={[local.status, done && local.statusDone]}>
          {done ? t(C.statutReussi) : past ? t(C.statutPasse) : t(C.statutEnCours)}
        </Text>
      </View>
      <Text style={local.condition}>{t(copy.title)}</Text>
      <Text style={s.meta}>{t(copy.detail)}</Text>
      <View style={local.reward}>
        <GrydIcon name="collection" size={18} color={done ? c.accent : c.darkMuted} />
        <View style={s.flex}>
          <Text style={local.rewardLabel}>{quest.reward.label}</Text>
          <Text style={s.meta}>
            {t(QUEST_REWARD_KIND_COPY_2026[quest.reward.kind])}
            {' · '}
            {done ? t(C.recompenseObtenue) : quest.reward.owned ? t(C.recompenseDejaPossedee) : t(C.recompense)}
          </Text>
        </View>
      </View>
    </View>;
  };

  const objectRow = (object: WeeklyQuestObject2026) =>
    <View key={object.rewardId} style={local.object}>
      <GrydIcon name={object.equipped ? 'check' : 'collection'} size={20} color={object.equipped ? c.accent : c.darkInk} />
      <View style={s.flex}>
        <Text style={s.linkTitle}>{object.label}</Text>
        <Text style={s.meta}>
          {t(QUEST_REWARD_KIND_COPY_2026[object.kind])}
          {' · '}
          {object.equipped ? t(C.etatEquipe) : t(C.objetPermanent)}
        </Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: data.busy }} disabled={data.busy}
        onPress={() => { void toggleEquip(object); }} style={local.objectAction}>
        <Text style={s.linkAction}>{object.equipped ? t(C.actionRetirer) : t(C.actionEquiper)}</Text>
      </Pressable>
    </View>;

  return <ProfilePage title={t(C.titre)} back backHref="/(tabs)/profil">
    <Text style={[s.title, { marginBottom: 8 }]}>{t(C.intro)}</Text>
    <Text style={[s.meta, { marginBottom: 18 }]}>{t(C.reglePasDXp)}</Text>
    <ProfileSegments value={activity} onChange={setActivity}
      options={[{ key: 'run' as const, label: t(C.tabCourse) }, { key: 'bike' as const, label: t(C.tabVelo) }]} />
    {notice ? <Text accessibilityRole="alert" style={[s.body, { marginVertical: 16 }]}>{notice}</Text> : null}

    {data.status === 'signed-out' ? <View style={s.state}>
      <Text style={s.body}>{t(C.etatDeconnecte)}</Text>
      {configured ? <ProfileButton label={t(C.actionConnexion)} onPress={() => router.push('/sign-in')} /> : null}
    </View> : data.status === 'loading' ? <View style={s.state}>
      <ActivityIndicator color={c.darkInk} />
      <Text style={s.meta}>{t(C.etatLecture)}</Text>
    </View> : data.status !== 'ready' || !data.data ? <View style={s.state}>
      <Text style={s.body}>{t(C.etatEchec)}</Text>
      <ProfileButton label={t(C.actionReessayer)} onPress={data.reload} />
    </View> : <>
      {current.length ? current.map(quest => questCard(quest, false)) : <View style={s.empty}>
        <Text style={s.sectionTitle}>{t(C.etatVide)}</Text>
        <Text style={s.meta}>{t(C.etatVideDetail)}</Text>
      </View>}

      {passed.length ? <>
        <ProfileSection title={passedLabel} />
        {passed.map(quest => questCard(quest, true))}
      </> : null}

      <ProfileSection title={t(C.sectionObjets)} />
      {objects.length ? objects.map(objectRow) : <Text style={s.meta}>{t(C.objetsVides)}</Text>}

      <View style={{ marginTop: 22 }}>
        <ProfileButton label={t(C.actionActualiser)} secondary onPress={data.reload} />
      </View>
    </>}
  </ProfilePage>;
}

const local = StyleSheet.create({
  card: {
    borderWidth: 1, borderColor: c.darkSurfaceMuted, borderRadius: 16,
    padding: 16, marginTop: 12, gap: 8,
  },
  cardDone: { borderColor: c.accent, backgroundColor: c.darkSurface },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  family: { flex: 1, fontFamily: fonts.textSemi, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: c.darkMuted },
  status: { fontFamily: fonts.textMedium, fontSize: 11, color: c.darkMuted },
  statusDone: { color: c.accent },
  condition: { fontFamily: fonts.displayMedium, fontSize: 18, lineHeight: 24, letterSpacing: -0.4, color: c.darkInk },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.darkSurfaceMuted },
  rewardLabel: { fontFamily: fonts.textMedium, fontSize: 14, color: c.darkInk },
  object: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.darkSurfaceMuted },
  objectAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
});
