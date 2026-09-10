import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { careerProgress2026, fonts, refonteColors as c, type Activity } from '@klaim/shared';
import { useMyProfile, effectiveInitials } from '../social/profileStore';
import { useProfileJournal, type JournalEntry2026 } from './ProfileJournal';
import { useRealCrew } from '../crew/real';
import { useSession } from '../../lib/session';
import { screen } from '../../lib/analytics';
import { GrydIcon, GrydMark, CircularAction2026 } from '../../ui/gryd';
import { useLocale } from '../../i18n/store';
import { resolve } from '../../i18n/types';
import { C as defisSemaine } from '../../i18n/catalog/defisSemaine';
import { useProfileProgress } from './ProfileProgress';
import { adoptLocalActivities2026, useAdoptableLocalActivities2026, useAdoptionNoticeAcknowledged2026 } from './localActivities';
import { profileMovementState2026 } from './ProfileMovementState2026';
import { SeasonalIdentity2026 } from './SeasonalIdentity2026';
import { CommercialIdentity2026 } from './CommercialIdentity2026';
import { useCommercialCollections2026 } from '../premium/useCommercialCollections2026';
import { brandImagery } from '../../ui/gryd/brandImagery';
import { SeasonRewardArtwork2026 } from './SeasonRewardArtwork2026';
import { resolveStudioObject2026 } from '../share/studioObjects2026';
import { rewardLabel2026 } from './SeasonRewardLabels2026';
import { retryPendingUpload } from '../../lib/pendingUpload';
import { ProfileButton, ProfileLink, ProfilePage, s, useRefonteCopy } from './ProfilePrimitives';
import { JournalSection2026 } from '../journal/JournalSection2026';
import { buildProfileLink } from '../social/profileLink';
import { openShareSheet } from '../share/shareActions';
import { haptics } from '../../lib/haptics';

export function ProfileHomeScreen() {
  const { session, loading } = useSession();
  return <ProfileHomeContents key={loading ? 'restoring' : session?.user.id ?? 'guest'} />;
}
function ProfileHomeContents() {
  const copy = useRefonteCopy();
  const commercial = useCommercialCollections2026();
  const commercialFrame = commercial.rows.some(item=>item.id==='relief'&&item.owned&&item.equipped);
  const commercialEmblem = commercial.rows.some(item=>item.id==='clubhouse'&&item.owned&&item.equipped);
  const locale = useLocale();
  const { session, loading: sessionLoading, configured } = useSession();
  const { profile, editable, loading: profileLoading } = useMyProfile();
  const crew = useRealCrew();
  const progress = useProfileProgress();
  const adoptable = useAdoptableLocalActivities2026();
  const adoptionReceipt = useAdoptionNoticeAcknowledged2026();
  const [adopting, setAdopting] = useState(false);
  const [adoptionNotice, setAdoptionNotice] = useState<string | null>(null);
  const career = progress.data ? careerProgress2026(progress.data.totalXp) : null;
  const [activity, setActivity] = useState<Activity>('run');
  const [period, setPeriod] = useState<'month' | 'all'>('month');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const history = useProfileJournal(activity);
  const journal = history.runs;
  const journalStatus = history.status;
  useEffect(() => { screen('profil'); }, []);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthStartMs = monthStart.getTime();
  const periodRuns = useMemo(() => journal.filter(run => period === 'all' || run.startedAtMs >= monthStartMs), [journal, period, monthStartMs]);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
  const runs = journal.filter(run => !selectedDay || new Date(run.startedAtMs).toDateString() === selectedDay);
  const totalKm = periodRuns.reduce((sum, run) => sum + run.km, 0);
  const totalMinutes = Math.round(periodRuns.reduce((sum, run) => sum + run.durationS, 0) / 60);
  const openRun = (run: JournalEntry2026) => run.localId ? router.push({ pathname: '/course-result', params: { localId: run.localId } }) : router.push({ pathname: '/course/[id]', params: { id: run.id, activity } });
  async function adopt() {
    if (!session || adopting) return;
    setAdopting(true);
    try {
      const result = await adoptLocalActivities2026({ userId: session.user.id, consent: true });
      setAdoptionNotice(result.kind === 'adopted'
        ? copy(result.adopted === 1 ? '1 sortie rattachée. Elle reste privée.' : `${result.adopted} sorties rattachées. Elles restent privées.`,
          result.adopted === 1 ? '1 activity linked. It remains private.' : `${result.adopted} activities linked. They remain private.`)
        : result.kind === 'nothing' ? copy('Toutes tes sorties sont déjà rattachées.', 'All your activities are already linked.')
          : copy('Le rattachement a échoué. Tes sorties restent sur cet appareil.', 'Linking failed. Your activities remain on this device.'));
      if (result.kind === 'adopted') { history.reload(); void retryPendingUpload(); progress.reload(); }
    } finally { setAdopting(false); }
  }

  /**
   * ─── MON @ N'EST À MOI QUE S'IL VIENT DE MOI (même porte que /qr et /amis) ──
   * `useMyProfile()` ne laisse jamais un @handle blanc à l'écran : sans saisie
   * ni session il retombe sur « @coureur ». Ce repli est honnête pour un
   * libellé d'avatar ; il ne l'est pas dans une invitation, où l'on écrit à
   * quelqu'un « voici comment me retrouver ». On n'invite donc que si le @ est
   * adossé à une saisie du joueur ou à un compte.
   */
  const ownsHandle = editable.handle.trim().length > 0 || !!session;
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  /**
   * ─── CE QUE L'INVITATION EMPORTE, ET CE QU'ELLE N'EMPORTE PAS ──────────────
   * PAS LE LIEN. `buildProfileLink()` produit bien `gryd.run/u/<handle>`, mais
   * AUCUNE page ne répond dessus : l'arbitrage de domaine n'est pas rendu (O10)
   * et `apps/web` n'a ni route `/u/[handle]` ni route `/c/[code]`. C'est écrit
   * noir sur blanc dans `/qr` (« le domaine GRYD n'est pas encore en ligne »).
   * Un message qui SORT de l'app vers un tiers ne peut pas porter une adresse
   * morte : le tiers, lui, n'a pas notre note en bas d'écran. Ce dépôt a déjà
   * corrigé exactement cette faute une fois, sur le sticker de partage — « le
   * mensonge SORTAIT de l'app » (`shareActions.stickerText`).
   *
   * CE QU'ELLE EMPORTE : le @handle. Il est utilisable AUJOURD'HUI — `/amis`
   * porte une recherche « Nom ou pseudo » servie par un RPC serveur. L'ami
   * installe GRYD, cherche le @, envoie sa demande. La boucle se ferme.
   *
   * Le jour où le domaine répondra, `buildProfileLink` est déjà là et la ligne
   * ci-dessous n'aura qu'à l'ajouter — c'est pour ça qu'on le calcule.
   */
  const profileLink = ownsHandle ? buildProfileLink(profile.handle) : null;
  const inviteMessage = copy(
    `Je suis sur GRYD : mes sorties dessinent mon terrain sur la carte. Mon pseudo est @${profile.handle}. Cherche-le dans Amis quand tu auras l’appli.`,
    `I’m on GRYD: my activities draw my ground on the map. My handle is @${profile.handle}. Search for it under Friends once you have the app.`,
  );
  function invite() {
    if (!profileLink) return;
    setInviteNotice(null);
    void openShareSheet(inviteMessage).then(result => {
      if (result.ok) { void haptics.success(); return; }
      // Fermer une feuille de partage est un droit : le silence est la bonne
      // réponse. Seule l'IMPOSSIBILITÉ de partager mérite une phrase.
      if (result.reason === 'unavailable') setInviteNotice(copy(
        'Le partage n’est pas disponible sur cet appareil.',
        'Sharing is unavailable on this device.',
      ));
    });
  }

  const rewards = progress.data?.ownedRewards ?? [];
  // §7.2 — les objets de niveau comptent dans la collection au même titre que
  // ceux de saison ; l'emplacement d'identité, lui, reste unique (0144).
  const levelRewards = progress.data?.levelRewards ?? [];
  const ownedCount = rewards.length + levelRewards.length;
  const ownedPreview = rewards[0] ?? null;
  const previewObject = ownedPreview ? resolveStudioObject2026({ kind: 'season', collectionId: ownedPreview.collectionId, rewardId: ownedPreview.rewardId, variant: ownedPreview.variant }, rewards, [], progress.data?.collections ?? []) : null;
  const equippedTitle = rewards.find(reward => reward.rewardId === 'title' && reward.equipped);
  const equippedLevelTitle = levelRewards.find(reward => reward.rewardId === 'cartographer' && reward.equipped);
  const titleCollection = equippedTitle ? progress.data?.collections.find(item => item.id === equippedTitle.collectionId)?.title : null;
  // Le chiffre héros se dérive de l'ÉTAT DE LECTURE, jamais de la seule
  // présence d'une donnée : un échec ne se peint pas comme un profil vide.
  const movement = profileMovementState2026({ status: progress.status, activeDays: progress.data?.activeDays ?? null });

  // Sans compte, ces sorties n'appartiennent qu'à ce téléphone. Le rappel est
  // EN HAUT, sans scroll, et il s'acquitte — la ligne du bas reste pour ceux
  // qui l'ont acquitté puis changent d'avis.
  const offerAdoption = !!session && adoptable.count > 0 && adoptionReceipt.acknowledged === false;
  const adoptableCopy = copy(
    adoptable.count === 1 ? '1 sortie enregistrée sans compte peut être rattachée. Elle restera privée.' : `${adoptable.count} sorties enregistrées sans compte peuvent être rattachées. Elles resteront privées.`,
    adoptable.count === 1 ? '1 activity recorded without an account can be linked. It will remain private.' : `${adoptable.count} activities recorded without an account can be linked. They will remain private.`);
  return <ProfilePage tone="light" title={copy('Profil', 'Profile')} right={<CircularAction2026 icon="settings" label={copy('Réglages', 'Settings')} onPress={() => router.push('/parametres')} tooltipPlacement="bottom" />}>
    {/* ─── LA PORTE DE COMPTE (10/09/2026) ─────────────────────────────────
        Le fondateur, build en main : « on me dit de me connecter mais je n'ai
        aucun moyen de créer mon compte ». Ici, la seule porte était un lien de
        13 pt collé à droite de l'avatar, libellé « Connexion » : un mot qui ne
        s'adresse qu'à ceux qui ont déjà un compte, à l'endroit exact où l'œil
        cherche une icône. Elle devient le PREMIER bloc de l'écran invité, sans
        scroll, en chartreuse pleine largeur, et son verbe est « Créer ».
        Elle ne ment pas pour autant : le même bouton connecte celui qui a déjà
        un compte, et le sous-titre le dit.
        ⚠️ `sessionLoading` garde le bloc : peindre « Créer mon compte » pendant
        la restauration de session le montrerait à quelqu'un de connecté. */}
    {!session && !sessionLoading ? <View style={local.gate}>
      <Text style={local.gateTitle}>{copy('Crée ton compte ou connecte-toi', 'Create your account or sign in')}</Text>
      <Text style={local.meta}>{copy('Sans compte, tes sorties ne vivent que sur ce téléphone. Un compte les relie à tes zones, à ton crew et à tes autres appareils.', 'Without an account, your activities only live on this phone. An account links them to your zones, your crew and your other devices.')}</Text>
      {/* Sans serveur configuré sur ce build, la porte NE DISPARAÎT PAS : elle
          dit pourquoi elle ne s'ouvre pas. Un bouton qui mènerait à un écran
          incapable de créer quoi que ce soit serait un bouton mort. */}
      {configured ? <>
        <ProfileButton tone="light" label={copy('Créer mon compte', 'Create my account')} onPress={() => router.push('/sign-in')} />
        <Text style={local.gateNote}>{copy('ou se connecter', 'or sign in')}</Text>
      </> : <Text style={local.meta}>{copy('Serveur non configuré sur ce build : aucun compte ne peut être créé ici.', 'Server not configured in this build: no account can be created here.')}</Text>}
    </View> : null}
    {offerAdoption ? <View style={local.adoption} accessibilityLiveRegion="polite">
      <Text style={local.sectionTitle}>{copy('Tes sorties d’avant la connexion', 'Your activities from before sign-in')}</Text>
      <Text style={local.meta}>{adoptableCopy}</Text>
      <View style={local.adoptionActions}>
        <ProfileButton tone="light" label={copy('Rattacher mes sorties', 'Link my activities')} busy={adopting} onPress={() => void adopt()} />
        <Pressable accessibilityRole="button" disabled={adopting} onPress={() => void adoptionReceipt.acknowledge()} style={local.later}><Text style={local.actionText}>{copy('Plus tard', 'Later')}</Text></Pressable>
      </View>
    </View> : null}
    <View style={local.identity}>
      <View style={local.identityArt}><CommercialIdentity2026 size={48}><SeasonalIdentity2026 rewards={rewards.filter(reward => reward.rewardId !== 'title' && !(commercialFrame && reward.rewardId === 'profile_frame') && !(commercialEmblem && reward.rewardId === 'personal_emblem'))} levelRewards={levelRewards.filter(reward => reward.rewardId !== 'cartographer' && !(commercialFrame && (reward.rewardId === 'line_frame' || reward.rewardId === 'ridge_merit')))} collections={progress.data?.collections ?? []} size={48}>
        <View style={local.avatar}>{profileLoading || sessionLoading ? <ActivityIndicator color={c.darkInk} /> : profile.avatarUri && session ? <Image source={{ uri: profile.avatarUri }} style={local.avatarImage} /> : session ? <Text style={local.initials}>{effectiveInitials(profile)}</Text> : <GrydMark variant="symbol" size={20} color={c.darkInk} />}</View>
      </SeasonalIdentity2026></CommercialIdentity2026></View>
      <View style={local.identityCopy}>
        <Text style={local.name}>{sessionLoading || profileLoading ? '…' : session ? profile.displayName : copy('Invité', 'Guest')}</Text>
        <Text style={local.meta}>{session ? profile.city || copy('Course et vélo', 'Run and ride') : copy('Sur cet appareil', 'On this device')}</Text>
        {equippedTitle ? <Text style={local.identityTitle}>{titleCollection ?? equippedTitle.label}</Text> : equippedLevelTitle ? <Text style={local.identityTitle}>{rewardLabel2026(equippedLevelTitle.rewardId, equippedLevelTitle.label, locale)}</Text> : null}
      </View>
      {/* Plus de « Connexion » ici : la porte est le bloc du dessus, et deux
          portes pour un même geste en font une de trop. « Invité · Sur cet
          appareil » reste, parce que c'est l'état RÉEL de ce profil. */}
      {session ? <CircularAction2026 icon="chevronRight" label={copy('Modifier le profil', 'Edit profile')} onPress={() => router.push('/profil-edit')} /> : null}
    </View>
    {session ? <View style={local.identityLinks}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/season')} style={local.identityLink}><Text style={local.meta}>{career ? copy(`Niveau ${career.level}`, `Level ${career.level}`) : copy('Progression', 'Progress')}</Text>{career ? <Text style={local.meta}>{career.xp.toLocaleString(locale)} XP</Text> : null}<GrydIcon name="chevronRight" size={14} color={c.muted} /></Pressable>
      {crew.crew ? <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/crew')} style={local.identityLink}><GrydIcon name="crew" size={16} color={c.muted} /><Text style={local.meta}>{crew.crew.name}</Text></Pressable> : null}
    </View> : null}

    {/* ─── LE BLOC SOCIAL (10/09/2026) ────────────────────────────────────────
        INTVL met « Refer a friend » tout en haut de ses réglages, avant tout le
        reste, et paie l'invitation en XP. Le cahier §15.2 tranche les deux
        points : la place revient à l'INVITATION (« Rendez-vous → membres » est
        notre seule boucle de croissance mesurable), et « le parrainage ne donne
        ni XP ni points ni chance supplémentaire de gagner un prix ».
        Donc : la place, oui — sur le Profil, juste sous l'identité, là où l'on
        regarde déjà qui l'on est. La récompense, non. Aucun compteur, aucun
        palier, aucune promesse de gain : trois gestes, et c'est tout.

        ⚠️ PAS DE « ENTRER UN CODE DE PARRAINAGE ». La table `public.referrals`
        existe dans le schéma (0002) mais RIEN ne l'écrit : aucune RPC ne
        transforme un code en lien de parrainage, aucune Edge Function ne pose
        `activated_at`, et le client ne peut pas lire l'`user_id` d'un tiers
        pour insérer la ligne. Peindre le champ serait un bouton mort. La
        proposition chiffrée est dans
        `docs/product/GRYD_REGLAGES_PROFIL_AUDIT_2026_09.md`, § Parrainage. */}
    <View style={local.social}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !profileLink }} aria-disabled={!profileLink}
        disabled={!profileLink} onPress={invite}
        style={[local.socialAction, !profileLink && local.socialActionOff]}>
        <GrydIcon name="share" size={18} color={profileLink ? c.ink : c.muted} />
        <Text style={[local.socialLabel, !profileLink && local.socialLabelOff]}>{copy('Inviter un ami', 'Invite a friend')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/amis')} style={local.socialAction}>
        <GrydIcon name="crew" size={18} color={c.ink} />
        <Text style={local.socialLabel}>{copy('Ajouter des amis', 'Add friends')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/qr')} style={local.socialAction}>
        <GrydIcon name="accountCard" size={18} color={c.ink} />
        <Text style={local.socialLabel}>{copy('Mon code', 'My code')}</Text>
      </Pressable>
    </View>
    {/* Les DEUX raisons d'un partage impossible ne sont pas la même, et elles
        n'appellent pas le même geste : sans compte on en crée un ; avec un
        compte mais sans pseudo choisi, on va l'écrire. Un seul message gris
        pour les deux enverrait la moitié des gens dans la mauvaise pièce. */}
    {!profileLink ? <Text style={local.meta}>{session
      ? copy('Choisis un pseudo dans « Modifier le profil » : c’est lui qui te rend trouvable.', 'Pick a handle under “Edit profile”: that is what makes you findable.')
      : copy('Un compte te donne un pseudo, et un pseudo te rend trouvable par tes amis.', 'An account gives you a handle, and a handle is what makes you findable.')}</Text> : null}
    {inviteNotice ? <Text accessibilityRole="alert" style={local.meta}>{inviteNotice}</Text> : null}

    <View style={local.hero}>
      <MovementPhoto2026 label={copy(brandImagery.movement.fr, brandImagery.movement.en)} />
      <View style={local.heroCopy}>
        <View style={local.heroEyebrow}><GrydIcon name="route" size={18} color={c.accent} /><Text style={local.heroMeta}>{copy('Ton mouvement.', 'Your movement.')}</Text></View>
        {movement === 'ready' && progress.data ? <><Text style={local.heroValue}>{progress.data.activeDays}<Text style={local.heroUnit}> {copy(progress.data.activeDays === 1 ? 'jour actif' : 'jours actifs', progress.data.activeDays === 1 ? 'active day' : 'active days')}</Text></Text><Text style={local.heroMeta}>{copy('Depuis tes débuts sur GRYD.', 'Since your first day on GRYD.')}</Text><Pressable accessibilityRole="button" onPress={() => router.push('/season')} style={local.heroLink}><Text style={local.heroLinkText}>{copy('Voir ma progression', 'View my progress')}</Text><GrydIcon name="arrowUpRight" size={20} color={c.darkInk} /></Pressable></>
          : movement === 'loading' ? <View style={local.heroState}><ActivityIndicator color={c.darkInk} /><Text style={local.heroMeta}>{copy('Lecture de ta progression…', 'Loading your progress…')}</Text></View>
          : movement === 'failed' ? <><Text style={local.heroTitle}>{copy('Ta progression est indisponible.', 'Your progress is unavailable.')}</Text><Text style={local.heroMeta}>{copy('Tes sorties restent dans ton journal.', 'Your activities remain in your journal.')}</Text><Pressable accessibilityRole="button" onPress={progress.reload} style={local.heroLink}><Text style={local.heroLinkText}>{copy('Réessayer', 'Try again')}</Text><GrydIcon name="clock" size={20} color={c.darkInk} /></Pressable></>
          : movement === 'unavailable' ? <><Text style={local.heroTitle}>{copy('Progression indisponible sur cet appareil.', 'Progress is unavailable on this device.')}</Text><Text style={local.heroMeta}>{copy('Tes sorties restent dans ton journal, ici même.', 'Your activities remain in your journal, right here.')}</Text></>
          : <><Text style={local.heroTitle}>{journal.length > 0 ? copy('La suite se joue dehors.', 'Your next chapter is outside.') : copy('Tout commence dehors.', 'It starts outside.')}</Text><Text style={local.heroMeta}>{journal.length > 0 ? copy('Ton journal grandit à chaque sortie.', 'Your journal grows with every activity.') : copy('Une sortie. Le début de ton histoire.', 'One activity. Your story begins.')}</Text><Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)')} style={local.heroCta}><Text style={local.heroCtaText}>{copy('Ouvrir la carte', 'Open map')}</Text><GrydIcon name="arrowUpRight" size={20} color={c.ink} /></Pressable></>}
      </View>
    </View>
    <View style={local.journalHeading}>
      <Text style={local.sectionTitle}>{copy('Journal', 'Journal')}</Text>
      <View style={local.sports} accessibilityRole="tablist">{(['run', 'bike'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: activity === value }} aria-selected={activity === value} onPress={() => { setActivity(value); setSelectedDay(null); }} style={[local.sport, activity === value && local.sportSelected]}><GrydIcon name={value} size={17} color={activity === value ? c.darkInk : c.muted} /><Text style={[local.meta, activity === value && local.sportTextSelected]}>{value === 'run' ? copy('Course', 'Run') : copy('Vélo', 'Ride')}</Text></Pressable>)}</View>
    </View>
    <View style={local.calendar} accessibilityLabel={copy('Les sept derniers jours', 'The last seven days')}>
      {days.map(day => { const key = day.toDateString(); const hasRun = journal.some(run => new Date(run.startedAtMs).toDateString() === key); const selected = selectedDay === key;
        return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected }} aria-pressed={selected} accessibilityLabel={`${hasRun ? copy('Avec sortie. ', 'Activity recorded. ') : ''}${day.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}`} onPress={() => { setSelectedDay(selected ? null : key); setPeriod('all'); }} style={[local.day, selected && local.daySelected]}>
          <Text style={[local.dayName, selected && local.dayTextSelected]}>{day.toLocaleDateString(locale, { weekday: 'narrow' })}</Text><Text style={[local.dayNumber, selected && local.dayTextSelected]}>{day.getDate()}</Text><View style={[local.dot, hasRun && local.activeDot]} />
        </Pressable>;
      })}
    </View>
    {history.localFailed ? <Text style={local.notice}>{copy('Les sorties de cet appareil n’ont pas pu être lues.', 'Activities on this device could not be read.')}</Text> : null}
    {journalStatus === 'ready' && journal.length > 0 ? <View style={local.overview}>
      <View style={local.periods} accessibilityRole="tablist">{(['month', 'all'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: period === value }} aria-selected={period === value} onPress={() => { setPeriod(value); setSelectedDay(null); }} style={local.period}><Text style={[local.meta, period === value && local.selectedText]}>{value === 'month' ? copy('Ce mois', 'This month') : copy('Journal récent', 'Recent journal')}</Text></Pressable>)}<CircularAction2026 icon="chevronRight" label={copy('Détails des statistiques', 'Statistics details')} onPress={() => router.push('/performance')} /></View>
      <View style={local.stats}>{[{ value: totalKm.toLocaleString(locale, { maximumFractionDigits: 1 }), label: 'km' }, { value: totalMinutes, label: 'min' }, { value: periodRuns.length, label: copy('sorties', 'activities') }].map(item => <View key={item.label} style={local.summaryMetric}><Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={local.statValue}>{item.value}</Text><Text style={local.meta}>{item.label}</Text></View>)}</View>
    </View> : null}
    {journalStatus === 'loading' ? <View style={local.loading}><ActivityIndicator color={c.ink} /><Text style={local.meta}>{copy('Chargement du journal…', 'Loading journal…')}</Text></View> : journalStatus === 'failed' ? <View style={local.loading}><Text style={local.body}>{copy('Le journal est indisponible.', 'Journal unavailable.')}</Text><View style={local.compact}><ProfileButton tone="light" label={copy('Réessayer', 'Try again')} onPress={history.reload} secondary /></View></View> : runs.length === 0 ? <View style={local.empty}>
      <Text style={local.emptyTitle}>{selectedDay ? copy('Aucune sortie ce jour-là', 'No activity on this day') : copy('Aucune sortie enregistrée', 'No recorded activities')}</Text>
      <Text style={local.meta}>{copy('Ta prochaine sortie trouvera sa place ici.', 'Your next activity will appear here.')}</Text>
      {session && progress.data ? <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)')} style={local.startAction}><Text style={local.actionText}>{copy('Ouvrir la carte', 'Open map')}</Text><View style={local.startCircle}><GrydIcon name="arrowUpRight" size={20} color={c.ink} /></View></Pressable> : null}
    </View> : <>
      {/* ─── LE JOURNAL EST MONTÉ, PLUS RECOPIÉ (10/09/2026) ─────────────────
          Cette liste vivait ici, en dur : date, kilomètres, minutes. Deux
          sorties de 5 km s'y ressemblaient trait pour trait, et une sortie qui
          avait PRIS du terrain se lisait comme une sortie sans capture —
          alors que l'allure, le statut et le reçu de capture étaient déjà lus
          par `history/real.ts`. `features/journal/JournalSection2026` porte
          désormais la ligne complète (vignette du tracé, allure ou vitesse,
          terrain gagné, verdict serveur) et son propre dépliage.
          CE QUI RESTE ICI, ET DOIT Y RESTER : les états. La section ne peint
          ni vide, ni chargement, ni échec — seul l'écran hôte sait distinguer
          « pas connecté », « en cours », « échec » et « lu, et rien » (L8/L19).
          Les filtres (discipline, jour, période) et le lien vers /performance
          restent également à l'écran : ils gouvernent `runs`, ils ne sont pas
          la liste. */}
      <JournalSection2026 runs={runs} onOpen={openRun} onExpand={() => { setPeriod('all'); setSelectedDay(null); }} />
      {history.historyStatus !== 'ready' ? <Text style={local.notice}>{copy('Sorties de cet appareil. Le journal en ligne est indisponible.', 'Activities from this device. The online journal is unavailable.')}</Text> : null}
    </>}

    <Pressable accessibilityRole="button" onPress={() => router.push('/arsenal')} style={local.collection}>
      <View style={local.rewardArt}>{ownedPreview && previewObject ? <SeasonRewardArtwork2026 object={previewObject} rewardId={ownedPreview.rewardId} tier={ownedPreview.tier} size={42} state="earned" locale={locale === 'en' ? 'en' : 'fr'} /> : <GrydIcon name="collection" size={30} color={c.darkInk} />}</View>
      <View style={s.flex}><Text style={local.sectionTitle}>{copy('Collection', 'Collection')}</Text><Text style={local.meta}>{ownedCount > 0 ? copy(ownedCount === 1 ? '1 objet obtenu' : `${ownedCount} objets obtenus`, ownedCount === 1 ? '1 object earned' : `${ownedCount} objects earned`) : copy('Objets de saison · aperçu', 'Season objects · preview')}</Text></View><GrydIcon name="arrowUpRight" size={18} color={c.muted} />
    </Pressable>
    {session && adoptable.count > 0 ? <View style={local.adoption}>
      <Text style={local.sectionTitle}>{copy('Sorties de cet appareil', 'Activities on this device')}</Text>
      <Text style={local.meta}>{adoptableCopy}</Text>
      <View style={local.compact}><ProfileButton tone="light" label={copy('Rattacher mes sorties', 'Link my activities')} secondary busy={adopting} onPress={() => void adopt()} /></View>
    </View> : null}
    {adoptionNotice && session ? <Text accessibilityRole="alert" style={local.notice}>{adoptionNotice}</Text> : null}
    {/* ─── CE QUI RESTE EN BAS, ET CE QUI EST PARTI ───────────────────────
        · « Amis » a rejoint le bloc social du haut : deux portes pour le même
          geste en font une de trop, et celle du bas arrivait après le journal,
          la collection et les sorties de l'appareil.
        · « Sources et appareils » est parti dans Réglages, qui lui donne
          désormais son propre groupe. C'est aussi là que le benchmark le met
          (INTVL « Integrations », Strava « Applications connectées ») : on ne
          branche pas une montre depuis une page d'identité.
        Restent trois destinations, de la plus quotidienne à la plus rare. */}
    <ProfileLink tone="light" title={copy('Progression', 'Progress')} subtitle={copy('Niveaux et saison', 'Levels and season')} icon="niveau" onPress={() => router.push('/season')} />
    <ProfileLink tone="light" title={resolve(defisSemaine.entreeProfil, locale)} subtitle={resolve(defisSemaine.entreeProfilDetail, locale)} icon="badge" onPress={() => router.push('/defis-semaine')} />
    <ProfileLink tone="light" title="GRYD+" subtitle={copy('Studio, analyses et éditions', 'Studio, insights and editions')} icon="pass" onPress={() => router.push('/premium')} />
  </ProfilePage>;
}

/** Keep the original portrait. The upper crop keeps the central runner's entire face visible. */
function MovementPhoto2026({ label }: { label: string }) {
  const [width, setWidth] = useState(0);
  // Original e01-crew.jpg is 1024 × 1536; the runner's face is in the upper third.
  const imageHeight = width ? width * 1.5 : 148;
  const top = -Math.max(0, imageHeight - 148) * 0.24;
  return <View testID="profile-movement-photo" style={{ height: 148, overflow: 'hidden' }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <Image source={brandImagery.movement.source} accessibilityLabel={label} style={[local.heroImage, { height: imageHeight, top }]} />
  </View>;
}

const local = StyleSheet.create({
  gate: { gap: 10, padding: 16, borderRadius: 24, backgroundColor: c.surface, marginBottom: 12 },
  gateTitle: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, letterSpacing: -0.5, color: c.ink },
  gateNote: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted, textAlign: 'center' },
  identity: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 16, borderRadius: 24, backgroundColor: c.surface, marginBottom: 12 }, identityArt: { backgroundColor: c.carbon, borderRadius: 16 }, identityCopy: { flex: 1, minWidth: 90, gap: 4 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.darkSurface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: 44, height: 44 }, initials: { fontFamily: fonts.displayMedium, fontSize: 18, color: c.darkInk }, name: { fontFamily: fonts.displayMedium, fontSize: 17, lineHeight: 23, color: c.ink, letterSpacing: -0.4 }, identityTitle: { fontFamily: fonts.text, fontSize: 12, lineHeight: 17, color: c.muted },
  meta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted }, body: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.ink }, actionText: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19, color: c.ink }, iconAction: { width: 44, minHeight: 44, borderRadius: 22, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }, identityLinks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, paddingHorizontal: 8, marginBottom: 12 }, identityLink: { minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center' },
  social: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  socialAction: { flex: 1, minWidth: 96, minHeight: 62, gap: 6, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 20, backgroundColor: c.surface, justifyContent: 'center' },
  socialActionOff: { opacity: 0.55 },
  socialLabel: { fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 17, color: c.ink },
  socialLabelOff: { color: c.muted },
  hero: { backgroundColor: c.carbon, borderRadius: 24, overflow: 'hidden', marginBottom: 12 }, heroImage: { position: 'absolute', width: '100%', resizeMode: 'cover' }, heroCopy: { padding: 16, gap: 8 }, heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, heroMeta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted }, heroTitle: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, letterSpacing: -.5, color: c.darkInk }, heroValue: { fontFamily: fonts.displayMedium, fontSize: 28, lineHeight: 34, color: c.darkInk, fontVariant: ['tabular-nums'] }, heroUnit: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20 }, heroCta: { minHeight: 44, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 }, heroCtaText: { fontFamily: fonts.textSemi, fontSize: 13, lineHeight: 19, color: c.ink }, heroLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginTop: 2 }, heroLinkText: { flex: 1, fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19, color: c.darkInk }, heroState: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  journalHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 8, marginBottom: 12, gap: 8 }, sectionTitle: { fontFamily: fonts.displayMedium, fontSize: 17, lineHeight: 23, color: c.ink }, sports: { marginLeft: 'auto', flexDirection: 'row', gap: 4, backgroundColor: c.surface, borderRadius: 24, padding: 3 }, sport: { minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 22 }, sportSelected: { backgroundColor: c.carbon }, sportTextSelected: { color: c.darkInk }, selectedText: { color: c.ink, fontFamily: fonts.textSemi },
  calendar: { flexDirection: 'row', paddingVertical: 8, backgroundColor: c.surface, borderRadius: 24, marginBottom: 12 }, day: { flex: 1, alignItems: 'center', paddingVertical: 9, gap: 6, minHeight: 68, borderRadius: 20 }, daySelected: { backgroundColor: c.carbon }, dayName: { fontFamily: fonts.text, fontSize: 12, color: c.muted }, dayNumber: { fontFamily: fonts.displayMedium, fontSize: 17, color: c.ink }, dayTextSelected: { color: c.darkInk }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' }, activeDot: { backgroundColor: c.ink, borderWidth: 1, borderColor: c.accent },
  overview: { backgroundColor: c.surface, borderRadius: 24, padding: 18, marginBottom: 12 }, periods: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12 }, period: { minHeight: 44, justifyContent: 'center' }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, summaryMetric: { flex: 1, minWidth: 72, gap: 4 }, statValue: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28, fontVariant: ['tabular-nums'], color: c.ink },
  loading: { padding: 20, gap: 12, borderRadius: 24, backgroundColor: c.surface, marginBottom: 12 }, empty: { padding: 20, borderRadius: 24, backgroundColor: c.surface, marginBottom: 12, gap: 6 }, emptyTitle: { fontFamily: fonts.displayMedium, fontSize: 17, lineHeight: 23, color: c.ink }, startAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }, startCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  pending: { fontFamily: fonts.text, fontSize: 12, lineHeight: 17, color: c.muted },
  collection: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, marginBottom: 12, borderRadius: 24, backgroundColor: c.surface }, rewardArt: { padding: 8, borderRadius: 18, backgroundColor: c.carbon }, adoption: { gap: 10, padding: 20, borderRadius: 24, backgroundColor: c.surface, marginBottom: 12 }, adoptionActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }, later: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' }, notice: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.muted, marginVertical: 12 }, compact: { alignSelf: 'flex-start' },
});
