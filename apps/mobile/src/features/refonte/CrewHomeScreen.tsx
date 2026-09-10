import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { CREW_ROLE_DUTIES, CREW_SWITCH_COOLDOWN_DAYS, EVENTS, fonts, refonteColors as c } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { screen, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { useLocale, t } from '../../i18n/store';
import { isResultOwnerCurrent2026, resultOwnerEpoch2026 } from '../run/resultOwner2026';
import { GrydIcon } from '../../ui/gryd';
import { TranslucentBackdrop2026 } from '../../ui/gryd/TranslucentBackdrop2026';
import { brandImagery } from '../../ui/gryd/brandImagery';
import { CREW_DUTY_E, CREW_DUTY_HELP_E, CREW_ROLE_E } from '../../i18n/catalog/crew';
import { myReaction2026, socialError2026 } from '../social/social2026Model';
import { socialRpc2026, useSocialRead2026 } from '../social/social2026Data';
import type { SocialPerson2026, SocialPost2026, SocialReactionKind2026 } from '../social/social2026Model';
import { SocialAvatar2026, SocialPostCard2026 } from '../social/SocialPostCard2026';
import { CREW_SPORTING_ROLES_2026, isCrewSportingRole2026, sportingRoleLabel2026, type CrewSportingRole2026 } from '../crew/crewConversation2026';
import { resolveCrewJoinCode2026 } from '../crew/joinInput2026';
import { canOpenCrewEdit, dutyOf, isCrewRole, leaveVerdict } from '../crew/memberRoles';
import { crewEmblemSeed, isCrewEmblem } from '../crew/crewEmblem';
import { crewDisciplinesLabel2026, crewIdentityLine2026, crewTerrainState2026 } from '../crew/crewIdentity2026';
import { useRealCrew, type CrewRefusal, type RealCrewMember } from '../crew/real';
import { nextCrewOuting2026 } from './crewNextOuting2026';
import { parseCrewOutings2026, type CrewOuting2026 } from './crewOutingsModel2026';
import { useCrewActivity } from '../crew/crewActivityData';
import { CrewInviteScreen } from './CrewInviteScreen';
import { PlayerModerationSheet, useBlockedPseudos } from '../crew/PlayerModerationSheet';
import { isPseudoBlocked } from '../crew/blocklist';
import { CrewCrest } from '../../ui/game/CrewCrest';
import { ProfileButton, ProfileLink, ProfilePage, ProfileSection, ProfileSegments, useRefonteCopy } from './ProfilePrimitives';

/**
 * ⚠ `create-name` / `create-access` ONT ÉTÉ RETIRÉS (10/09/2026).
 *
 * La création vivait ici, en deux « modes » de cet écran, derrière une ligne de
 * texte posée sur la photo du hero. Retour fondateur après test iPhone : « on
 * me propose seulement de rejoindre un crew, jamais de créer un crew ». Le
 * geste marchait ; c'est son RANG qui le rendait introuvable — le titre de
 * l'état vide annonçait « Rejoindre un crew », et les deux seules CARTES de
 * l'écran menaient l'une et l'autre à une adhésion.
 *
 * La création a maintenant son écran (`app/crew-create.tsx`), au même rang que
 * l'adhésion. Garder les modes en doublon aurait laissé deux formulaires de
 * création à tenir d'accord — dont un invisible.
 */
type Mode = 'home' | 'join' | 'invite';

export function CrewHomeScreen() {
  const { session, loading } = useSession();
  return <CrewHomeContents key={loading ? 'restoring' : session?.user.id ?? 'guest'} />;
}
function CrewHomeContents() {
  const copy = useRefonteCopy();
  const locale = useLocale();
  const { session, loading: sessionLoading, configured } = useSession();
  const crew = useRealCrew({ withOverview: true });
  const outingRead = useSocialRead2026<{ok:boolean;canCreate:boolean;items:CrewOuting2026[]}>('crew_outings_2026', {}, crew.crew?.id ?? 'no-crew');
  const confirmedOutings = parseCrewOutings2026(outingRead.data);
  const outings = {ctx:confirmedOutings?{canCreate:confirmedOutings.canCreate,upcoming:confirmedOutings.items.filter(item=>!item.cancelled).map(item=>({...item,hostPseudo:item.hostName,whenLabel:null}))}:null,loading:outingRead.status==='loading',failed:outingRead.status==='failed'||outingRead.status==='ready'&&!confirmedOutings,reload:outingRead.reload};
  const feed = useCrewActivity();
  const memberProfiles = useSocialRead2026<SocialPerson2026[]>('social_crew_members_2026', {}, crew.crew?.id ?? 'no-crew');
  const sportingRoles = useSocialRead2026<{userId:string;role:unknown}[]>('crew_sporting_roles_2026', {p_crew_id:crew.crew?.id ?? null});
  const voluntaryRoles = Array.isArray(sportingRoles.data) ? sportingRoles.data : [];
  const [editingContribution, setEditingContribution] = useState(false);
  const [memberFilter, setMemberFilter] = useState<'all' | CrewSportingRole2026>('all');
  const [contributionBusy, setContributionBusy] = useState(false);
  const contributionLock = useRef(false);
  const blocked = useBlockedPseudos();
  const [mode, setMode] = useState<Mode>('home');
  const [section, setSection] = useState<'life' | 'members'>('life');
  const [feedActivity, setFeedActivity] = useState<'run'|'bike'>('run');
  const social = useSocialRead2026<SocialPost2026[]>('social_feed_2026', { p_activity: feedActivity }, crew.crew?.id ?? 'no-crew');
  const rsvpLock = useRef(false);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const reactionLock = useRef(false);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [reactionError, setReactionError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<RealCrewMember | null>(null);
  useEffect(() => { screen('crew'); }, []);
  // Outing and feed hooks are account-scoped. A membership change invalidates their context.
  useEffect(() => { outings.reload(); feed.reload(); }, [crew.crew?.id, outings.reload, feed.reload]);
  const refusal = (reason: CrewRefusal): string => {
    if (reason === 'full') return copy('Ce crew est complet.', 'This crew is full.');
    if (reason === 'bad_code') return copy('Ce code est inconnu ou a expiré.', 'This code is unknown or expired.');
    if (reason === 'cooldown') return copy('Le changement de crew est temporairement indisponible pour ton compte.', 'Changing crews is temporarily unavailable for your account.');
    if (reason === 'dead_crew') return copy('Ce crew n’a plus aucun membre actif.', 'This crew has no active member left.');
    if (reason === 'unsupported_server') return copy('Ce serveur ne connaît pas encore cette action.', 'This server does not know this action yet.');
    if (reason === 'must_transfer_lead') return copy('Transmets la direction de ton crew avant de le quitter.', 'Transfer leadership before leaving your crew.');
    return copy('Cette action n’a pas abouti. Vérifie ta connexion et réessaie.', 'This action did not complete. Check your connection and try again.');
  };
  async function joinCrew() {
    const invitationCode = resolveCrewJoinCode2026(code);
    if (busy || !invitationCode) return;
    setBusy(true); setError(null);
    const result = await crew.joinByCode(invitationCode);
    setBusy(false);
    if (result.ok) { haptics.success(); track(EVENTS.crewJoined, { via: 'code' }); setMode('home'); crew.reload(); }
    else { haptics.error(); setError(refusal(result.reason)); }
  }
  async function leaveCrew() {
    if (busy) return;
    setBusy(true); setError(null);
    const result = await crew.leaveCrew();
    setBusy(false);
    if (result.ok) { haptics.medium(); setConfirmLeave(false); crew.reload(); }
    else { haptics.error(); setError(refusal(result.reason)); }
  }
  async function chooseContribution(role: CrewSportingRole2026 | null) {
    if (!sportingRoles.owner || !crew.crew || contributionLock.current) return;
    contributionLock.current = true; setContributionBusy(true); setError(null);
    try { await socialRpc2026(sportingRoles.owner, 'crew_set_my_sporting_role_2026', { p_crew_id: crew.crew.id, p_role: role }); sportingRoles.reload(); setEditingContribution(false); }
    catch (cause) { setError(socialError2026(String(cause), locale === 'en')); }
    finally { contributionLock.current = false; setContributionBusy(false); }
  }
  async function joinNextOuting(item: CrewOuting2026) {
    const owner = outingRead.owner, epoch = resultOwnerEpoch2026();
    if (!owner || rsvpLock.current || item.joined || !isResultOwnerCurrent2026(owner, epoch)) return;
    rsvpLock.current = true; setRsvpBusy(true); setRsvpError(null);
    try {
      const result = await socialRpc2026<{ok:boolean;reason?:string}>(owner, 'crew_outing_rsvp_2026', {p_event_id:item.id,p_joined:true}, epoch);
      if (!isResultOwnerCurrent2026(owner, epoch)) return;
      if (!result.ok) setRsvpError(result.reason === 'full' ? copy('Cette sortie est complète.', 'This outing is full.') : result.reason === 'started' ? copy('Cette sortie a déjà commencé.', 'This outing has already started.') : copy('L’inscription n’a pas abouti. Ouvre la sortie pour réessayer.', 'Registration did not complete. Open the outing to retry.'));
      outingRead.reload();
    } catch { if (isResultOwnerCurrent2026(owner, epoch)) setRsvpError(copy('L’inscription n’a pas abouti. Réessaie.', 'Registration did not complete. Try again.')); }
    finally { rsvpLock.current = false; if (isResultOwnerCurrent2026(owner, epoch)) setRsvpBusy(false); }
  }
  // §13.4 : la réaction porte un NOM (encouragement, merci, à la prochaine).
  // La carte dit laquelle a été tapée ; sans ce paramètre, taper « merci »
  // enregistrait un encouragement — un bouton qui ment sur son propre effet.
  async function encourage(post: SocialPost2026, kind: SocialReactionKind2026) {
    if (!social.owner || reactionLock.current) return;
    reactionLock.current = true; setReactionBusy(true); setReactionError(null);
    try { await socialRpc2026(social.owner, 'social_react_2026', { p_post_id: post.id, p_kind: kind, p_reacted: myReaction2026(post) !== kind }); social.reload(); }
    catch (cause) { setReactionError(socialError2026(String(cause), locale === 'en')); }
    finally { reactionLock.current = false; setReactionBusy(false); }
  }
  const goMode = (next: Mode) => { setError(null); setMode(next); };
  if (mode === 'invite' && crew.crew) return <CrewInviteScreen crewName={crew.crew.name} fetchMyCode={crew.fetchMyCode} onBack={() => goMode('home')} />;
  const nextOuting = nextCrewOuting2026(outings.ctx?.upcoming ?? [], Date.now());
  const recent = Array.isArray(social.data) ? social.data.slice(0, 3) : [];
  const announcement = feed.ctx?.announcements.find(item => !item.authorPseudo || !isPseudoBlocked(blocked, item.authorPseudo));
  const filteredMembers = crew.members.filter(member => memberFilter === 'all' || sportingRoles.status !== 'ready' || !isPseudoBlocked(blocked, member.pseudo) && voluntaryRoles.some(item => item.userId === member.userId && item.role === memberFilter));
  /*
   * MON RÔLE, tel que le SERVEUR l'a rendu (`crew_overview.role`) — jamais
   * déduit d'autre chose. `''` quand l'agrégat n'a pas été lu : `canOpenCrewEdit`
   * rend alors `false`, ce qui est la bonne réponse. « Je ne sais pas quel est
   * ton rôle » ne doit pas ouvrir une porte que le serveur refermerait.
   */
  const myRole = crew.overview?.myRole ?? '';
  /*
   * VILLE ET ACCUEIL (migration 0182). Ils étaient rendus par la fiche PUBLIQUE
   * d'un crew (`crew_public_profile`, 0152 §3) et perdus dès l'adhésion : la
   * page de son propre crew en disait MOINS que celle du voisin. `null` quand
   * on ne sait pas — l'écran ne peint alors aucune ligne (jamais l'identifiant
   * technique de la ville en guise de nom).
   */
  const identityLine = crewIdentityLine2026(
    { cityName: crew.overview?.cityName ?? null, access: crew.overview?.access },
    locale !== 'en',
  );
  /*
   * LE TERRAIN DU CREW, en QUATRE états. Il vient de `crew_overview.territory`
   * (0152) — une donnée que `real.ts` lisait déjà et qu'AUCUN écran de
   * septembre n'affichait. Ce bloc remplace `/crew-stats`, qui est une
   * redirection depuis le cahier et dont la source (`crew_stats()`, épinglée
   * `ruleset_version='legacy'` par 0118) ne peut plus rien mesurer.
   *
   * ⚠️ DES PERSONNES, JAMAIS UNE EMPRISE. 0126 : le titre territorial est
   * INDIVIDUEL. Un crew n'a ni surface ni rang, et l'écran le DIT plutôt que de
   * laisser croire à un chiffre absent.
   */
  const terrain = crewTerrainState2026({
    loading: crew.overviewLoading,
    failed: crew.overviewFailed,
    territory: crew.overview?.territory ?? null,
  });
  /*
   * LA PORTE VERS `/crew-edit` ÉTAIT PEINTE POUR TOUT LE MONDE. `crew_edit`
   * (0084) gate ses trois champs sur des permissions qui valent `['founder']` :
   * six rôles sur sept arrivaient donc sur « tu n'as pas le droit ». Deux
   * boutons morts, alors que le docblock de l'écran d'édition affirmait que
   * son entrée « n'existe que pour qui a le droit ».
   */
  const canEditCrew = canOpenCrewEdit(myRole);
  /* Le rôle d'un membre, tel que `crew_overview` le rend. `null` = non lu. */
  const roleOfMember = (userId: string): string => crew.overview?.contributions.find(item => item.userId === userId)?.role ?? '';

  return <>
    <ProfilePage tone="light" title="Crew" right={crew.crew && canEditCrew ? <Pressable accessibilityRole="button" accessibilityLabel={copy('Modifier le crew', 'Edit crew')} onPress={() => { haptics.light(); router.push('/crew-edit'); }} style={local.headerAction}><GrydIcon name="settings" size={20} color={c.ink} /></Pressable> : undefined}>
      {mode === 'join' ? <View style={local.form}>
        <Pressable accessibilityRole="button" onPress={() => goMode('home')} style={local.back}><GrydIcon name="chevronLeft" size={20} color={c.ink} /><Text style={local.actionText}>{copy('Retour', 'Back')}</Text></Pressable>
        <Text style={local.kicker}>{copy('INVITATION', 'INVITATION')}</Text>
        <Text style={local.homeTitle}>{copy('Rejoindre un crew', 'Join a crew')}</Text>
        <Text style={local.body}>{copy('Colle le lien d’invitation ou entre le code reçu.', 'Paste the invitation link or enter the code you received.')}</Text>
        <TextInput accessibilityLabel={copy('Code ou lien d’invitation', 'Invitation code or link')} value={code} onChangeText={setCode} maxLength={2048} autoCapitalize="none" autoCorrect={false} placeholder={copy('Code ou lien du crew', 'Crew code or link')} placeholderTextColor={c.muted} style={local.input} />
        <View style={local.compact}><ProfileButton tone="light" label={copy('Rejoindre le crew', 'Join crew')} disabled={resolveCrewJoinCode2026(code) === null} busy={busy} onPress={() => void joinCrew()} /></View>
        {/* Le 3e chemin d’adhésion du cahier (G16) : sans code, on découvre. */}
        <ProfileLink tone="light" title={copy('Les crews de ta ville', 'Crews in your city')} subtitle={copy('Sans code d’invitation.', 'No invitation code needed.')} icon="carte" onPress={() => router.push('/crew-discovery')} />
        {error ? <Text accessibilityRole="alert" style={local.body}>{error}</Text> : null}
      </View> : sessionLoading || crew.loading ? <View style={local.state}><ActivityIndicator color={c.ink} /><Text style={local.copy}>{copy('Chargement du crew…', 'Loading crew…')}</Text></View> :
      crew.loadFailed ? <View style={local.state}><GrydIcon name="crew" size={28} color={c.ink} /><Text style={local.homeTitle}>{copy('Crew indisponible', 'Crew unavailable')}</Text><Text style={local.body}>{copy('Impossible de charger ton crew pour le moment.', 'Your crew could not be loaded right now.')}</Text><View style={local.compact}><ProfileButton tone="light" label={copy('Réessayer', 'Try again')} onPress={crew.reload} /></View></View> :
      !crew.crew ? <View style={local.layout}>
        <View style={local.hero}>
          <View style={local.heroPhoto}><Image source={brandImagery.community.source} style={local.heroImage} resizeMode="cover" accessibilityLabel={copy(brandImagery.community.fr, brandImagery.community.en)} /><View style={local.photoLabel}><TranslucentBackdrop2026 tone="dark" /><Text style={local.photoLabelText}>{copy('COURSE / VÉLO', 'RUN / RIDE')}</Text></View></View>
          {/* LE TITRE NE NOMME PLUS UNE SEULE DES DEUX PORTES. Il disait
              « Rejoindre un crew » : la moitié de l’offre était donc invisible
              avant même le premier bouton (retour fondateur 10/09/2026). */}
          <View style={local.heroContent}><Text style={local.heroTitle}>{copy('Ton crew', 'Your crew')}</Text><Text style={local.heroCopy}>{copy('Un groupe, un rendez-vous, des sorties à partager.', 'A group, a meetup, activities to share.')}</Text>
            {/* DEUX ACTIONS DE MÊME RANG : créer (accent) et rejoindre. Elles
                ont la même hauteur, la même surface et la même place — la
                seule différence est l’accent chartreuse du geste primaire. */}
            {session && crew.ready ? <View style={local.heroActions}>
              <Pressable accessibilityRole="button" onPress={() => { haptics.light(); router.push('/crew-create'); }} style={local.heroPrimary}><Text style={local.heroPrimaryText}>{copy('Créer mon crew', 'Create my crew')}</Text><View style={local.darkCircle}><GrydIcon name="plus" size={20} color={c.darkInk} /></View></Pressable>
              <Pressable accessibilityRole="button" onPress={() => { haptics.light(); goMode('join'); }} style={local.heroSecondary}><Text style={local.heroSecondaryText}>{copy('Rejoindre un crew', 'Join a crew')}</Text><View style={local.lightCircle}><GrydIcon name="crew" size={20} color={c.ink} /></View></Pressable>
            </View>
              : configured ? <View style={local.heroActions}>
                {/* LA PORTE DISAIT SEULEMENT « Me connecter » : quelqu’un qui
                    n’a pas encore de compte n’y lisait rien pour lui. */}
                <Pressable accessibilityRole="button" onPress={() => { haptics.light(); router.push('/sign-in'); }} style={local.heroPrimary}><View style={local.flex}><Text style={local.heroPrimaryText}>{copy('Créer mon compte', 'Create my account')}</Text><Text style={local.heroPrimaryNote}>{copy('ou me connecter', 'or sign in')}</Text></View><View style={local.darkCircle}><GrydIcon name="arrowUpRight" size={20} color={c.darkInk} /></View></Pressable>
              </View>
              : <Text style={local.heroCopy}>{copy('La connexion aux crews est indisponible.', 'Crew connections are unavailable.')}</Text>}
          </View>
        </View>
        {session && crew.ready ? null : <View style={local.guestNote}><GrydIcon name="calendar" size={20} color={c.ink} /><Text style={local.copy}>{copy('Un rendez-vous. Des visages familiers. Une bonne raison de ressortir.', 'A meetup. Familiar faces. A reason to head out again.')}</Text></View>}
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)')} style={local.territoryAccess}><View style={local.routeSymbol}><GrydIcon name="map" size={26} color={c.ink} /></View><View style={local.flex}><Text style={local.tileTitle}>{copy('Les terrains', 'Terrain')}</Text><Text style={local.copy}>{copy('Retrouver les zones sur la carte.', 'Explore territories on the map.')}</Text></View><View style={local.actionCircle}><GrydIcon name="arrowUpRight" size={20} color={c.ink} /></View></Pressable>
        <View style={local.challengeInfo}><GrydIcon name="versus" size={24} color={c.ink} /><View style={local.flex}><Text style={local.rowTitle}>{copy('Défis 5 contre 5', '5 versus 5 challenges')}</Text><Text style={local.copy}>{copy('Une équipe choisie. Une participation volontaire.', 'A chosen team. Voluntary participation.')}</Text></View></View>
      </View> : <View style={local.layout}>
        <View style={local.hero}>
          <View style={[local.heroPhoto, local.memberHeroPhoto]}><Image source={brandImagery.community.source} style={local.heroImage} resizeMode="cover" accessibilityLabel={copy(brandImagery.community.fr, brandImagery.community.en)} /><View style={local.photoLabel}><TranslucentBackdrop2026 tone="dark" /><Text style={local.photoLabelText}>GRYD / CREW</Text></View></View>
          {/* Le BLASON du crew, dérivé de `crews.color` — la valeur choisie à la
              création est enfin relue quelque part (voir crewEmblem.ts). Un
              entier hors bornes n'affiche rien plutôt qu'un blason d'emprunt. */}
          <View style={local.crewIdentity}>{isCrewEmblem(crew.crew.color) ? <CrewCrest seed={crewEmblemSeed(crew.crew.color)} name={crew.crew.name} size="m" /> : null}<View style={local.flex}><Text style={local.heroTitle}>{crew.crew.name}</Text>{identityLine ? <Text style={local.micro}>{identityLine}</Text> : null}<Pressable accessibilityRole="button" onPress={() => setSection('members')} style={local.memberCount}><Text style={local.heroCopy}>{crew.memberCount.toLocaleString(locale)} {copy('membres', 'members')}</Text><GrydIcon name="chevronRight" size={16} color={c.darkMuted} /></Pressable></View><Pressable accessibilityRole="button" accessibilityLabel={copy('Inviter un membre', 'Invite a member')} onPress={() => goMode('invite')} style={local.lightCircle}><GrydIcon name="plus" size={20} color={c.ink} /></Pressable></View>
        </View>
        <ProfileSegments tone="light" value={section} onChange={setSection} options={[{ key: 'life', label: copy('Activité', 'Activity') }, { key: 'members', label: copy('Membres', 'Members') }]} />
        {section === 'life' ? <>
          <View style={local.outingCard}>
            <View style={local.cardHeading}><Text style={local.cardLabel}>{copy('Prochain rendez-vous', 'Next meetup')}</Text><GrydIcon name="calendar" size={20} color={c.muted} /></View>
            {nextOuting ? <View>
              <View style={local.outing}><View style={local.dateMark}>{nextOuting.startsAt ? <><Text style={local.dateMonth}>{new Date(nextOuting.startsAt).toLocaleDateString(locale, { month: 'short' })}</Text><Text style={local.dateDay}>{new Date(nextOuting.startsAt).getDate()}</Text></> : <GrydIcon name="calendar" size={24} color={c.ink} />}</View><View style={local.flex}><Text style={local.outingTitle}>{nextOuting.title}</Text><Text style={local.copy}>{nextOuting.startsAt ? new Date(nextOuting.startsAt).toLocaleString(locale, { weekday: 'long', hour: '2-digit', minute: '2-digit' }) : nextOuting.whenLabel}</Text>{nextOuting.placeLabel ? <Text style={local.copy}>{nextOuting.placeLabel}</Text> : null}</View></View>
              <View style={local.outingFooter}><View style={local.flex}><View style={local.outingSport}><GrydIcon name={nextOuting.activity === 'bike' ? 'bike' : nextOuting.activity === 'run' ? 'run' : 'crew'} size={16} color={c.muted} /><Text style={local.micro}>{nextOuting.activity === 'bike' ? copy('Vélo', 'Ride') : nextOuting.activity === 'run' ? copy('Course', 'Run') : copy('Ensemble', 'Together')} · {nextOuting.goingCount} {copy('inscrits', 'attending')}{nextOuting.joined ? copy(' · tu participes', ' · you are attending') : ''}</Text></View>{nextOuting.hostPseudo ? <Text style={local.micro}>{copy('Avec', 'With')} {nextOuting.hostPseudo}</Text> : null}</View><Pressable accessibilityRole="button" accessibilityLabel={copy(`Détails de ${nextOuting.title}`, `Details of ${nextOuting.title}`)} style={local.actionCircle} onPress={() => router.push('/crew-sortie')}><GrydIcon name="chevronRight" size={20} color={c.ink} /></Pressable></View>
              <View style={{marginTop:14}}><ProfileButton tone="light" label={nextOuting.joined ? copy('Tu participes · Voir la sortie', 'You’re going · View outing') : nextOuting.capacity !== null && nextOuting.goingCount >= nextOuting.capacity ? copy('Complet · Voir la sortie', 'Full · View outing') : copy('Je participe', 'Join outing')} secondary={nextOuting.joined || nextOuting.capacity !== null && nextOuting.goingCount >= nextOuting.capacity} busy={rsvpBusy} onPress={() => nextOuting.joined || nextOuting.capacity !== null && nextOuting.goingCount >= nextOuting.capacity ? router.push('/crew-sortie') : void joinNextOuting(nextOuting)} /></View>
              {rsvpError ? <Text accessibilityRole="alert" style={local.copy}>{rsvpError}</Text> : null}
            </View> : outings.loading ? <View style={local.inlineState}><ActivityIndicator color={c.ink} /><Text style={local.copy}>{copy('Lecture des rendez-vous…', 'Loading meetups…')}</Text></View> : outings.ctx ? <>
              <Text style={local.outingTitle}>{copy('Aucune sortie prévue', 'No outing planned')}</Text><Text style={local.copy}>{copy('Le prochain rendez-vous reste à choisir.', 'Your next meetup is still to be chosen.')}</Text>
              {outings.ctx.canCreate ? <Pressable accessibilityRole="button" onPress={() => router.push('/crew-sortie')} style={local.primaryRow}><Text style={local.actionText}>{copy('Proposer une sortie', 'Plan an outing')}</Text><View style={local.primaryCircle}><GrydIcon name="plus" size={20} color={c.ink} /></View></Pressable> : <Pressable accessibilityRole="button" onPress={() => goMode('invite')} style={local.primaryRow}><Text style={local.actionText}>{copy('Inviter un ami', 'Invite a friend')}</Text><View style={local.actionCircle}><GrydIcon name="plus" size={20} color={c.ink} /></View></Pressable>}
            </> : <><Text style={local.copy}>{copy('Les rendez-vous sont momentanément indisponibles.', 'Outings are temporarily unavailable.')}</Text>{outings.failed ? <Pressable accessibilityRole="button" onPress={outings.reload} style={local.primaryRow}><Text style={local.actionText}>{copy('Réessayer', 'Try again')}</Text><View style={local.actionCircle}><GrydIcon name="arrowUpRight" size={20} color={c.ink} /></View></Pressable> : null}</>}
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/crew-conversation')} style={local.conversation}><View style={local.actionCircle}><GrydIcon name="message" size={20} color={c.ink} /></View><View style={local.flex}><Text style={local.rowTitle}>{copy('Conversation', 'Conversation')}</Text><Text style={local.copy}>{copy('Préparer la prochaine sortie ensemble.', 'Plan your next activity together.')}</Text></View><GrydIcon name="chevronRight" size={18} color={c.muted} /></Pressable>
          <View style={local.shortcutRow}><Pressable accessibilityRole="button" onPress={() => goMode('invite')} style={local.shortcut}><GrydIcon name="share" size={20} color={c.ink} /><Text style={local.actionText}>{copy('Inviter', 'Invite')}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/amis')} style={local.shortcut}><GrydIcon name="profile" size={20} color={c.ink} /><Text style={local.actionText}>{copy('Mes amis', 'My friends')}</Text></Pressable></View>
          {/* LE TERRAIN DU CREW — ce que `crew_overview.territory` (0152) sait
              dire, et que rien n'affichait. Quatre états DISTINCTS ; la note du
              bas n'est pas une excuse, c'est la règle du jeu (0126 : le titre
              est individuel, un crew n'a pas de surface à lui). */}
          <View style={local.outingCard}>
            <View style={local.cardHeading}><Text style={local.cardLabel}>{copy('Le terrain du crew', 'Crew terrain')}</Text><GrydIcon name="map" size={20} color={c.muted} /></View>
            {terrain.kind === 'loading' ? <View style={local.inlineState}><ActivityIndicator color={c.ink} /><Text style={local.copy}>{copy('Lecture du terrain…', 'Loading terrain…')}</Text></View>
              : terrain.kind === 'unavailable' ? <><Text style={local.copy}>{copy('Le terrain du crew n’a pas pu être lu. Ce n’est pas un crew sans terrain : c’est la lecture qui manque.', 'Crew terrain could not be read. This is not a crew without terrain: only the reading is missing.')}</Text><Pressable accessibilityRole="button" onPress={crew.reload} style={local.primaryRow}><Text style={local.actionText}>{copy('Réessayer', 'Try again')}</Text><View style={local.actionCircle}><GrydIcon name="arrowUpRight" size={20} color={c.ink} /></View></Pressable></>
              : terrain.kind === 'empty' ? <><Text style={local.outingTitle}>{copy('Personne ne tient encore de terrain', 'No one holds terrain yet')}</Text><Text style={local.copy}>{copy('Ferme une boucle et ton nom sera le premier du crew à en tenir.', 'Close a loop and you will be the first in the crew to hold some.')}</Text></>
              : <>
                <Text style={local.outingTitle}>{terrain.membersHolding.toLocaleString(locale)} {terrain.membersHolding > 1 ? copy('membres tiennent du terrain', 'members hold terrain') : copy('membre tient du terrain', 'member holds terrain')}</Text>
                {crewDisciplinesLabel2026(terrain, locale !== 'en') ? <Text style={local.copy}>{crewDisciplinesLabel2026(terrain, locale !== 'en')}</Text> : null}
                {terrain.lastCaptureAt && Number.isFinite(Date.parse(terrain.lastCaptureAt)) ? <Text style={local.micro}>{copy('Dernière prise', 'Latest capture')} : {new Date(terrain.lastCaptureAt).toLocaleDateString(locale, { day: 'numeric', month: 'long' })}</Text> : null}
              </>}
            {/* Ce que le crew n'a PAS, dit une fois. Sans cette phrase, l'absence
                de km² se lit comme un chiffre qui n'a pas chargé. */}
            <Text style={local.micro}>{copy('Chaque terrain appartient à son joueur. Un crew n’a ni surface ni classement à lui.', 'Each terrain belongs to its player. A crew has no area and no ranking of its own.')}</Text>
          </View>
          <View style={local.bento}>
            {/* G20 porte le nom « Défi de la semaine ». La TUILE est une PORTE, pas
                une affirmation : elle décrit ce qu'on trouve derrière, jamais
                l'existence d'un défi en cours — l'état réel (aucune arène
                publiée tant qu'aucun joueur ne court vraiment là, 0151) se lit
                sur l'écran des défis, avec ses quatre états. */}
            <CrewTile icon="versus" title={copy('Défi de la semaine', 'Weekly challenge')} detail={copy('Cinq contre cinq. Invitations et résultats.', 'Five against five. Invitations and results.')} onPress={() => router.push('/crew-challenges')} prominent />
            <CrewTile icon="map" title={copy('Terrains', 'Terrain')} detail={copy('Voir la carte.', 'Open the map.')} onPress={() => router.push('/(tabs)')} />
          </View>
          {announcement ? <View style={local.announcement}><View style={local.cardHeading}><Text style={local.cardLabel}>{copy('Annonce', 'Announcement')}</Text><GrydIcon name="bell" size={20} color={c.muted} /></View><Text style={local.body}>{announcement.body}</Text><ProfileLink tone="light" title={copy('Voir les annonces', 'View announcements')} icon="feed" onPress={() => router.push('/crew-activite')} /></View> : null}
          {/* LA PORTE DU JOURNAL DU CREW, SANS CONDITION. Elle vivait DANS le
              bloc « Annonce » : sur un crew calme (aucune annonce épinglée), le
              fil complet — arrivées, sorties proposées, captures — n'était
              atteignable par aucun geste. Une porte qui n'existe que quand il y
              a déjà quelque chose à voir n'est pas une porte. */}
          <ProfileLink tone="light" title={copy('Journal du crew', 'Crew journal')} subtitle={copy('Arrivées, sorties proposées et captures.', 'Arrivals, proposed outings and captures.')} icon="historique" onPress={() => router.push('/crew-activite')} />
          <View><ProfileSection tone="light" title={copy('Partagé avec le crew', 'Shared with your crew')} action={copy('Tout voir', 'View all')} onPress={() => router.push({ pathname: '/crew-feed', params: { activity: feedActivity } })} /><ProfileSegments tone="light" value={feedActivity} onChange={setFeedActivity} options={[{ key: 'run', label: copy('Course', 'Run') }, { key: 'bike', label: copy('Vélo', 'Ride') }]} /></View>
          {social.status === 'loading' ? <View style={local.state}><ActivityIndicator color={c.ink} /><Text style={local.copy}>{copy('Lecture des publications…', 'Loading posts…')}</Text></View> : social.status === 'failed' ? <View style={local.state}><ProfileLink tone="light" title={copy('Le fil est indisponible · Réessayer', 'Feed unavailable · Retry')} icon="historique" onPress={social.reload} /></View> : recent.length ? recent.map(post => <View key={post.id} style={local.socialSurface}><SocialPostCard2026 post={post} tone="light" busy={reactionBusy} onReact={kind => void encourage(post, kind)} onOpen={() => router.push({ pathname: '/crew-feed', params: { activity: feedActivity, postId: post.id } })} /></View>) : <View style={local.state}><GrydIcon name="camera" size={24} color={c.ink} /><Text style={local.rowTitle}>{copy('Le fil attend vos sorties', 'Your outings belong here')}</Text><Text style={local.copy}>{copy('Les sorties partagées avec le crew apparaîtront ici.', 'Activities shared with the crew will appear here.')}</Text></View>}
          {reactionError ? <Text accessibilityRole="alert" style={local.body}>{reactionError}</Text> : null}
          <ProfileLink tone="light" title={copy('Choisir une sortie dans mon journal', 'Choose an activity from my journal')} icon="historique" onPress={() => router.push('/(tabs)/profil')} />
        </> : <>
          <ProfileSection tone="light" title={copy('Membres du crew', 'Crew members')} action={copy('Inviter', 'Invite')} onPress={() => goMode('invite')} />
          <View style={local.contributionPanel}><Pressable accessibilityRole="button" accessibilityState={{expanded:editingContribution}} aria-expanded={editingContribution} onPress={() => setEditingContribution(value => !value)} style={local.contributionHeading}><View style={local.flex}><Text style={local.rowTitle}>{copy('Ma contribution', 'My contribution')}</Text><Text style={local.copy}>{copy('Un rôle volontaire pour aider le groupe.', 'A voluntary role to help the group.')}</Text></View><GrydIcon name={editingContribution ? 'minus' : 'plus'} size={20} color={c.ink} /></Pressable>{editingContribution ? <><Text style={local.copy}>{copy('Propose d’accueillir les nouveaux, d’organiser des sorties ou de repérer des parcours publics. Ce choix n’accorde aucun pouvoir de gestion ni qualification sportive.', 'Offer to welcome newcomers, organize outings or scout public routes. This grants no administrative power or sporting qualification.')}</Text>{sportingRoles.status === 'loading' ? <ActivityIndicator color={c.ink} /> : sportingRoles.status === 'failed' ? <ProfileLink tone="light" title={copy('Contributions indisponibles · Réessayer', 'Contributions unavailable · Retry')} icon="historique" onPress={sportingRoles.reload} /> : [...CREW_SPORTING_ROLES_2026, null].map(role => { const current = voluntaryRoles.find(item => item.userId === session?.user.id)?.role; return <Pressable key={role ?? 'none'} accessibilityRole="radio" accessibilityState={{ checked: current === role, disabled: contributionBusy }} aria-checked={current === role} aria-disabled={contributionBusy} disabled={contributionBusy} onPress={() => void chooseContribution(role)} style={local.contributionChoice}><Text style={[local.actionText, local.flex]}>{role ? sportingRoleLabel2026(role, locale === 'en') : copy('Sans rôle volontaire', 'No voluntary role')}</Text><GrydIcon name={current === role ? 'check' : 'plus'} size={20} color={c.ink} /></Pressable>; })}</> : null}</View>
          {sportingRoles.status === 'ready' ? <View accessibilityRole="radiogroup" accessibilityLabel={copy('Retrouver une personne du crew', 'Find someone in your crew')} style={local.memberFilters}>{([
            {key:'all',label:copy('Tous','All')}, {key:'welcomer',label:copy('Accueil','Welcome')}, {key:'outing_host',label:copy('Sorties','Outings')}, {key:'route_scout',label:copy('Parcours','Routes')},
          ] as const).map(filter => <Pressable key={filter.key} accessibilityRole="radio" accessibilityState={{checked:memberFilter===filter.key}} aria-checked={memberFilter===filter.key} onPress={()=>setMemberFilter(filter.key)} style={[local.memberFilter,memberFilter===filter.key&&local.memberFilterOn]}><Text style={[local.memberFilterText,memberFilter===filter.key&&local.memberFilterTextOn]}>{filter.label}</Text></Pressable>)}</View> : null}
          {filteredMembers.length === 0 ? <Text style={local.copy}>{copy('Personne n’a encore choisi cette contribution.','No one has chosen this contribution yet.')}</Text> : null}
          {/* LES RÔLES VIENNENT DE `crew_overview`. Quand cet agrégat n'a PAS
              été lu, on le dit une fois : sans cette phrase, une liste sans
              aucun badge se lisait « ce crew n'a que des membres » — et les
              actions de rôle disparaissaient sans explication. */}
          {crew.overviewFailed ? <Text style={local.copy}>{copy('Les rôles du crew n’ont pas pu être lus. Ce n’est pas un crew sans capitaine : c’est l’affichage qui manque.', 'Crew roles could not be loaded. This is not a crew without a captain: only the display is missing.')}</Text> : null}
          <View style={local.memberList}>{filteredMembers.map(member => {
            const hidden = isPseudoBlocked(blocked, member.pseudo); const displayed = hidden ? copy('Membre masqué', 'Hidden member') : member.pseudo;
            const sportingRole = voluntaryRoles.find(item => item.userId === member.userId)?.role;
            const memberRole = roleOfMember(member.userId);
            /* Le BADGE dit le rang (« Co-Capitaine ») ; la ligne dessous dit le
               devoir du cahier §13.3 (« traite les signalements et les accès »).
               Un rôle non lu n'affiche NI l'un NI l'autre. */
            const roleLabel = isCrewRole(memberRole) ? t(CREW_ROLE_E[memberRole]) : null;
            const duty = dutyOf(memberRole);
            const identity = !hidden ? memberProfiles.data?.find(person => person.id === member.userId) : undefined;
            return <View key={member.userId} style={local.member}>{identity ? <SocialAvatar2026 person={identity} size={40} /> : <View style={local.memberAvatar}><Text style={local.memberInitial}>{hidden ? '·' : displayed.slice(0, 1).toLocaleUpperCase()}</Text></View>}<Pressable style={local.memberIdentity} accessibilityRole="button" disabled={hidden} aria-disabled={hidden} accessibilityState={{ disabled: hidden }} onPress={() => router.push({ pathname: '/member', params: { userId: member.userId } })}><View style={local.memberLine}><Text style={local.rowTitle}>{identity?.name ?? displayed}{member.isMe ? copy(' · toi', ' · you') : ''}</Text>{!hidden && roleLabel ? <View style={[local.roleBadge, duty === 'captain' && local.roleBadgeLead]}><Text style={[local.roleBadgeText, duty === 'captain' && local.roleBadgeTextLead]}>{roleLabel}</Text></View> : null}</View><Text style={local.micro}>{hidden ? copy('Profil masqué', 'Hidden profile') : duty ? t(CREW_DUTY_HELP_E[duty]) : copy('Voir le profil', 'View profile')}</Text>{!hidden && isCrewSportingRole2026(sportingRole) ? <Text style={local.micro}>{sportingRoleLabel2026(sportingRole, locale === 'en')} · {copy('volontaire', 'voluntary')}</Text> : null}</Pressable>
              {!member.isMe ? <Pressable accessibilityRole="button" accessibilityLabel={copy(`Actions pour ${displayed}`, `Actions for ${displayed}`)} style={local.actionCircle} onPress={() => { haptics.light(); setSelectedMember(member); }}><GrydIcon name="plus" size={20} color={c.ink} /></Pressable> : null}
            </View>;
          })}</View>
          {/* Les quatre rôles utiles du cahier §13.3, dits une fois : sans cette
              légende, « Stratège » ou « Éclaireur » restent des mots sans
              conséquence lisible. */}
          <View style={local.dutyLegend}><Text style={local.cardLabel}>{copy('Les rôles du crew', 'Crew roles')}</Text>{CREW_ROLE_DUTIES.map(key => <View key={key} style={local.dutyRow}><Text style={local.rowTitle}>{t(CREW_DUTY_E[key])}</Text><Text style={[local.copy, local.flex]}>{t(CREW_DUTY_HELP_E[key])}</Text></View>)}</View>
          <ProfileLink tone="light" title={copy('Amis et abonnements', 'Friends and following')} subtitle={copy('Retrouver et suivre des sportifs.', 'Find and follow athletes.')} icon="ami" onPress={() => router.push('/amis')} />
          {canEditCrew ? <ProfileLink tone="light" title={copy('Modifier le crew', 'Edit the crew')} subtitle={copy('Nom, description, accès et style.', 'Name, description, access and style.')} icon="reglages" onPress={() => { haptics.light(); router.push('/crew-edit'); }} /> : null}
          <ProfileLink tone="light" title={copy('Quitter ce crew', 'Leave this crew')} icon="fermer" onPress={() => {
            setError(null);
            if (leaveVerdict(myRole, crew.memberCount) === 'must_transfer_lead') setError(copy('Transmets la direction à un autre membre avant de quitter ce crew. Les actions d’un membre permettent de le faire.', 'Transfer leadership to another member before leaving this crew. Open a member’s actions to do this.'));
            else setConfirmLeave(true);
          }} />
          {confirmLeave ? <View style={local.state}><Text style={local.body}>{copy(`Quitter ${crew.crew.name} ? Un délai de ${CREW_SWITCH_COOLDOWN_DAYS} jours peut s’appliquer au changement de crew. Tes sorties et tes souvenirs restent conservés.`, `Leave ${crew.crew.name}? A ${CREW_SWITCH_COOLDOWN_DAYS}-day crew-change delay may apply. Your activities and memories are kept.`)}</Text><ProfileButton tone="light" label={copy('Confirmer mon départ', 'Confirm leaving')} busy={busy} onPress={() => void leaveCrew()} secondary /><ProfileButton tone="light" label={copy('Rester dans le crew', 'Stay in this crew')} disabled={busy} onPress={() => setConfirmLeave(false)} secondary /></View> : null}
          {error ? <Text accessibilityRole="alert" style={local.body}>{error}</Text> : null}
        </>}
      </View>}
    </ProfilePage>
    <PlayerModerationSheet pseudo={selectedMember?.pseudo ?? null} onClose={() => setSelectedMember(null)} crew={selectedMember ? { userId: selectedMember.userId, actorRole: myRole, targetRole: roleOfMember(selectedMember.userId), onChanged: crew.reload } : null} />
  </>;
}
function CrewTile({ icon, title, detail, onPress, prominent = false }: { icon: ComponentProps<typeof GrydIcon>['name']; title: string; detail: string; onPress?: () => void; prominent?: boolean }) {
  const content = <><View style={local.tileTop}><GrydIcon name={icon} size={24} color={c.ink} />{onPress ? <View style={local.tileArrow}><GrydIcon name="arrowUpRight" size={20} color={c.ink} /></View> : null}</View><View style={local.tileCopy}><Text style={local.tileTitle}>{title}</Text><Text style={local.copy}>{detail}</Text></View></>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={[local.tile, prominent && local.tileProminent]}>{content}</Pressable> : <View style={[local.tile, prominent && local.tileProminent]}>{content}</View>;
}
const local = StyleSheet.create({
  memberFilters: { flexDirection: 'row', gap: 5 }, memberFilter: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: c.surface }, memberFilterOn: { backgroundColor: c.ink }, memberFilterText: { fontFamily: fonts.textMedium, fontSize: 12, color: c.ink }, memberFilterTextOn: { color: c.surface },
  layout: { gap: 12 }, flex: { flex: 1, gap: 5 }, compact: { alignSelf: 'flex-start' },
  homeTitle: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, letterSpacing: -0.4, color: c.ink }, body: { fontFamily: fonts.text, fontSize: 14, lineHeight: 20, color: c.ink }, copy: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.muted }, micro: { fontFamily: fonts.text, fontSize: 12, lineHeight: 17, color: c.muted }, rowTitle: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.ink }, actionText: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19, color: c.ink }, kicker: { fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 18, color: c.muted },
  headerAction: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 24, backgroundColor: c.carbon, overflow: 'hidden' }, heroPhoto: { height: 212, overflow: 'hidden', backgroundColor: c.carbon }, memberHeroPhoto: { height: 148 }, heroImage: { width: '100%', height: '100%' }, photoLabel: { position: 'absolute', left: 16, top: 16, overflow: 'hidden', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 }, photoLabelText: { fontFamily: fonts.textMedium, fontSize: 12, letterSpacing: 0.4, color: c.darkInk }, heroContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, gap: 7 }, heroTitle: { fontFamily: fonts.displayMedium, fontSize: 24, lineHeight: 29, letterSpacing: -0.5, color: c.darkInk }, heroCopy: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.darkMuted },   /* Deux actions de MÊME RANG : même hauteur, même rayon, même padding. Seul
     l'accent chartreuse distingue le geste primaire du second (L15 : le
     libellé porte le sens, la couleur ne fait que le souligner). */
  heroActions: { gap: 10, marginTop: 12 },
  heroPrimary: { minHeight: 60, borderRadius: 20, backgroundColor: c.accent, paddingLeft: 18, paddingRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroPrimaryText: { fontFamily: fonts.textMedium, fontSize: 15, lineHeight: 21, color: c.ink, flexShrink: 1 },
  heroPrimaryNote: { fontFamily: fonts.text, fontSize: 12, lineHeight: 17, color: c.ink, opacity: 0.72 },
  heroSecondary: { minHeight: 60, borderRadius: 20, backgroundColor: c.surface, paddingLeft: 18, paddingRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroSecondaryText: { fontFamily: fonts.textMedium, fontSize: 15, lineHeight: 21, color: c.ink, flexShrink: 1 },
  darkCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }, primaryCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }, lightCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  guestNote: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingVertical: 12 },
  bento: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }, tile: { flex: 1, minWidth: 130, minHeight: 112, backgroundColor: c.surface, padding: 18, borderRadius: 24, justifyContent: 'space-between', gap: 16 }, tileProminent: { flex: 1.2 }, tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 34 }, tileArrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center' }, tileCopy: { gap: 7 }, tileTitle: { fontFamily: fonts.displayMedium, fontSize: 17, lineHeight: 23, letterSpacing: -0.4, color: c.ink },
  territoryAccess: { minHeight: 96, padding: 18, borderRadius: 24, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12 }, routeSymbol: { width: 36, alignItems: 'center' }, actionCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center' }, challengeInfo: { flexDirection: 'row', gap: 14, paddingHorizontal: 4, paddingVertical: 18, alignItems: 'center' },
  crewIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, paddingBottom: 14 }, memberCount: { flexDirection: 'row', gap: 5, minHeight: 34, alignItems: 'center' },
  outingCard: { backgroundColor: c.surface, borderRadius: 24, padding: 20, gap: 12 }, cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, cardLabel: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19, color: c.muted }, outing: { flexDirection: 'row', gap: 16, alignItems: 'center', paddingTop: 6, paddingBottom: 14 }, dateMark: { width: 46, alignItems: 'center', justifyContent: 'center' }, dateMonth: { fontFamily: fonts.textMedium, fontSize: 12, lineHeight: 18, color: c.muted }, dateDay: { fontFamily: fonts.displayRegular, fontSize: 28, lineHeight: 34, letterSpacing: -0.7, color: c.ink }, outingTitle: { fontFamily: fonts.displayMedium, fontSize: 17, lineHeight: 23, letterSpacing: -0.4, color: c.ink }, outingSport: { flexDirection: 'row', alignItems: 'center', gap: 6 }, outingFooter: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.canvas }, primaryRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10 }, inlineState: { flexDirection: 'row', gap: 10, paddingVertical: 18, alignItems: 'center' },
  announcement: { backgroundColor: c.surface, borderRadius: 24, padding: 20, gap: 12 }, conversation: { backgroundColor: c.surface, borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }, socialSurface: { backgroundColor: c.surface, borderRadius: 24, paddingHorizontal: 18, overflow: 'hidden' },
  shortcutRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, shortcut: { flex: 1, minWidth: 108, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.surface },
  contributionPanel: { backgroundColor: c.surface, borderRadius: 24, padding: 18, gap: 12 }, contributionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }, contributionChoice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  /* Le badge de rôle : SURFACE + LIBELLÉ, jamais une pastille de couleur seule
     (L15). Le chef porte l'accent, les autres une capsule neutre — la teinte
     souligne, elle ne remplace pas le mot. */
  memberLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: c.canvas },
  roleBadgeLead: { backgroundColor: c.accent },
  roleBadgeText: { fontFamily: fonts.textMedium, fontSize: 11, lineHeight: 16, color: c.muted },
  roleBadgeTextLead: { color: c.ink },
  dutyLegend: { backgroundColor: c.surface, borderRadius: 24, padding: 18, gap: 10 },
  dutyRow: { gap: 3 },
  memberList: { backgroundColor: c.surface, borderRadius: 24, paddingHorizontal: 18 }, member: { minHeight: 68, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: c.canvas }, memberIdentity: { flex: 1, gap: 4, minHeight: 44, justifyContent: 'center' }, memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.canvas, alignItems: 'center', justifyContent: 'center' }, memberInitial: { fontFamily: fonts.textMedium, color: c.ink, fontSize: 17 },
  state: { backgroundColor: c.surface, padding: 20, borderRadius: 24, gap: 14 }, form: { gap: 16, paddingTop: 8, paddingBottom: 20 }, back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 }, input: { minHeight: 52, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, fontFamily: fonts.text, fontSize: 15, color: c.ink },
});
