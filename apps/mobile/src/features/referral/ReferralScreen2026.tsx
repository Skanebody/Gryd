/**
 * GRYD — `/parrainage`. Ce que les DEUX gagnent, et rien d'autre.
 *
 * DÉROGATION FONDATEUR DU 11/09/2026 : « il faut faire comme Tesla, il faut
 * qu'un mec qui parraine ait quelque chose à gagner que les autres n'ont pas ».
 * Cet écran est l'endroit où cette promesse est TENUE, ou pas du tout.
 *
 * ─── CE QU'IL NE MONTRE JAMAIS ──────────────────────────────────────────────
 *  · UN COMPTEUR FACTICE. « 0 filleul » ne s'écrit pas : quand la liste est
 *    vide, on dit « personne n'a encore saisi ton code ». Un crédit absent rend
 *    `null` côté serveur, et l'écran n'imprime alors AUCUNE ligne GRYD+ — pas
 *    « 0 jour » (L8, L14 : jamais un zéro nu).
 *  · UN COMPTE À REBOURS SUR LE DOS D'UN TIERS (§4.2, G24). Un filleul qui n'a
 *    pas encore couru est un ÉTAT, pas un retard : « sa première sortie reste à
 *    venir », au présent, sans reproche et sans échéance.
 *  · UN CLASSEMENT. Le boost porte sur l'XP de progression, et l'écran le DIT
 *    en toutes lettres sous la ligne du boost. Laisser croire qu'un parrainage
 *    fait monter au classement serait faux : les tables de 0160-0164 ne voient
 *    rien passer.
 *  · UN OBJET DESSINÉ AU HASARD. Depuis la migration 0191, le CADRE et la
 *    TRACE de parrainage sont de vrais cosmétiques du catalogue : leur aperçu
 *    est le rendu RÉEL (`CosmeticPreview2026`), pas une vignette inventée, et
 *    la ligne renvoie là où on les équipe. Les DEUX TITRES, eux, n'ont aucun
 *    emplacement de profil qui sache les porter (0191, note « LES DEUX
 *    TITRES ») : ils gardent l'icône et l'écran le DIT (`objetTitresIci`).
 *
 * ─── LES QUATRE ÉTATS (L8/L14/L19), NOMMÉS SÉPARÉMENT ───────────────────────
 *  ① pas connecté  → `AccountDoor2026`, la porte unique du dépôt ;
 *  ② lecture       → un indicateur et une phrase, jamais un écran noir ;
 *  ③ échec         → « rien n'est perdu » + « Réessayer », distinct du vide ;
 *  ④ lu            → l'état RÉEL, y compris entièrement vide.
 * Un cinquième existe parce que la réalité en a un de plus : SANS SERVEUR
 * (`configured` faux), où aucun bouton n'est peint — une phrase le dit.
 *
 * ─── LA SAISIE N'EST PEINTE QUE SI ELLE PEUT ABOUTIR ────────────────────────
 * `canRedeem` vient du serveur (âge du compte, parrain déjà noué). Quand elle
 * est fermée, la LIGNE RESTE et dit POURQUOI : un champ qui disparaît sans
 * explication laisse penser à un bug, et un champ qui apparaît pour être refusé
 * est un bouton mort.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  REFERRAL_CODE_LENGTH, REFERRAL_COMPLETION_WINDOW_DAYS, REFERRAL_MAX_ACTIVE_PER_SEASON,
  REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS, REFERRAL_XP_BOOST_2026, fonts, refonteColors as c,
} from '@klaim/shared';
import { useLocale } from '../../i18n/store';
import { format, resolve, type Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/referral';
import { screen } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { GrydIcon } from '../../ui/gryd';
import { AccountDoor2026 } from '../account/AccountDoor2026';
import { CosmeticPreview2026 } from '../arsenal/CosmeticArt2026';
import { cosmeticById2026 } from '../arsenal/cosmetics2026';
import { ProfileButton, ProfilePage, ProfileSection, s, lightStyles } from '../refonte/ProfilePrimitives';
import { copyText, openShareSheet } from '../share/shareActions';
import { useSession } from '../../lib/session';
import { useMyReferral2026, type RedeemOutcome2026 } from './useMyReferral2026';
import {
  buildReferralDeepLink, formatReferralCodeForDisplay, normalizeReferralCode,
  type MyReferral2026, type ReferralLinkState2026, type ReferralReward2026,
} from './referral2026';

/** Le libellé d'un objet exclusif. Le serveur rend un `reward_id`, jamais un texte. */
const REWARD_LABELS: Readonly<Record<string, Entry>> = {
  referral_frame: C.objetCadre,
  referral_trace: C.objetTrace,
  referral_title_parrain: C.objetTitreParrain,
  referral_title_filleul: C.objetTitreFilleul,
};

/** Côté de l'aperçu dans la ligne. Une valeur de mise en page, pas une règle. */
const APERCU = 44;

/**
 * UN OCTROI QUI S'ÉQUIPE, c'est-à-dire un objet que le catalogue cosmétique
 * connaît (migration 0191). Le cadre et la trace en sont ; les DEUX TITRES n'en
 * sont pas, faute d'une maison de titres qui sache les porter. La distinction
 * se DÉRIVE du catalogue et n'est écrite nulle part sous forme de liste : un
 * build en retard sur le serveur retombe donc du bon côté tout seul.
 */
const equippableReward = (reward: ReferralReward2026): boolean =>
  reward.kind === 'collection' && cosmeticById2026(reward.rewardId) !== null;

export function ReferralScreen2026() {
  const { session, loading } = useSession();
  return <ReferralContents key={loading ? 'restoring' : session?.user.id ?? 'anonymous'} />;
}

function ReferralContents() {
  const locale = useLocale();
  const { configured } = useSession();
  const referral = useMyReferral2026();
  const params = useLocalSearchParams<{ refus?: string }>();
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState('');
  const t = useCallback((entry: Entry) => resolve(entry, locale), [locale]);
  const f = useCallback((entry: Entry, vars: Record<string, string | number>) => format(entry, vars, locale), [locale]);

  useEffect(() => { screen('parrainage'); }, []);

  /**
   * LE REFUS D'UNE REPRISE AUTOMATIQUE ARRIVE PAR L'URL. `resumePendingReferral`
   * a déjà appelé le serveur et ramené la personne ici : sans ce paramètre,
   * quelqu'un qui vient de créer un compte POUR ce parrainage verrait un écran
   * sans parrain et sans un mot d'explication.
   */
  const refusal = typeof params.refus === 'string' ? params.refus : null;
  useEffect(() => {
    if (refusal === null) return;
    setNotice(t(refusalCopy(refusal)));
  }, [refusal, t]);

  const data = referral.data;
  const deepLink = data ? buildReferralDeepLink(data.code) : null;

  const shareMessage = useMemo(() => data === null || deepLink === null ? null
    : f(C.partageMessage, { code: data.code, lien: deepLink }), [data, deepLink, f]);

  async function copy() {
    if (!data) return;
    setNotice(null);
    const result = await copyText(data.code);
    if (result.ok) { setCopied(true); void haptics.success(); return; }
    if (result.reason === 'unavailable') setNotice(t(C.copieImpossible));
  }

  async function share() {
    if (shareMessage === null) return;
    setNotice(null);
    const result = await openShareSheet(shareMessage);
    if (result.ok) { void haptics.success(); return; }
    // Fermer une feuille de partage est un droit : le silence est la bonne
    // réponse. Seule l'IMPOSSIBILITÉ de partager mérite une phrase.
    if (result.reason === 'unavailable') setNotice(t(C.partageImpossible));
  }

  async function submit() {
    const clean = normalizeReferralCode(draft);
    if (clean === null) { setNotice(t(C.refusBadCode)); return; }
    setNotice(null);
    const result: RedeemOutcome2026 = await referral.redeem(clean);
    if (result.ok) { setDraft(''); void haptics.success(); setNotice(t(C.saisieReussie)); return; }
    setNotice(t(refusalCopy(result.reason)));
  }

  const stateCopy = (state: ReferralLinkState2026): string => {
    switch (state) {
      case 'awaiting_referee_run': return t(C.etatCodeSaisi);
      case 'awaiting_referrer_run': return t(C.etatMaSortie);
      case 'rewarded': return t(C.etatRecompense);
      case 'capped': return t(C.etatPlafond);
      case 'expired': return f(C.etatExpire, { jours: REFERRAL_COMPLETION_WINDOW_DAYS });
      case 'revoked': return t(C.etatRevoque);
    }
  };

  const rewardRow = (reward: ReferralReward2026, index: number) => {
    const label = reward.kind === 'collection' ? REWARD_LABELS[reward.rewardId] ?? null : null;
    const title = label !== null ? t(label)
      : reward.kind === 'xp_boost' ? f(C.objetBoost, { x: reward.boostMultiplier ?? REFERRAL_XP_BOOST_2026.multiplier })
        : f(C.objetGrydPlus, { n: data?.grydPlusCredit?.days ?? 0 });
    // L'APERÇU RÉEL, ou rien. `cosmeticById2026` ne rend un objet que si CE
    // build sait le peindre : un serveur en avance d'une saison retombe donc
    // sur l'icône, jamais sur un carré vide ni sur un dessin approximatif.
    const art = reward.kind === 'collection' ? cosmeticById2026(reward.rewardId) : null;
    const detail = reward.kind === 'collection' ? t(C.objetExclusif)
      : reward.kind === 'xp_boost' ? `${t(C.boostPortee)} ${boostWindowCopy(reward)}`
        : creditCopy();
    return <View key={`${reward.kind}:${reward.rewardId}:${index}`} style={local.reward}>
      {art !== null
        ? <View aria-hidden style={local.art}><CosmeticPreview2026 item={art} size={APERCU} /></View>
        : <GrydIcon name={reward.kind === 'collection' ? 'collection' : reward.kind === 'xp_boost' ? 'chart' : 'lock'} size={20} color={c.ink} />}
      <View style={s.flex}>
        <Text style={[s.linkTitle, lightStyles.linkTitle]}>{title}</Text>
        <Text style={[s.meta, lightStyles.meta]}>{detail}</Text>
      </View>
    </View>;
  };

  function boostWindowCopy(reward: ReferralReward2026): string {
    if (reward.boostEndsAt === null) return '';
    const ends = Date.parse(reward.boostEndsAt);
    if (!Number.isFinite(ends)) return '';
    return ends > Date.now()
      ? f(C.boostActif, { date: new Date(ends).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) })
      : t(C.boostTermine);
  }

  function creditCopy(): string {
    const credit = data?.grydPlusCredit ?? null;
    if (credit === null) return '';
    if (credit.state === 'banked') return t(C.creditBanque);
    if (credit.state === 'ended') return t(C.creditTermine);
    const ends = credit.endsAt === null ? NaN : Date.parse(credit.endsAt);
    return Number.isFinite(ends)
      ? f(C.creditEnCours, { date: new Date(ends).toLocaleDateString(locale, { day: 'numeric', month: 'long' }) })
      : t(C.creditTermine);
  }

  const nextStepCopy = (model: MyReferral2026): string => {
    switch (model.nextStep) {
      case 'share': return t(C.etapePartage);
      case 'run': return t(C.etapeCourir);
      case 'wait': return t(C.etapeAttendre);
      case 'done': return t(C.etapeFini);
    }
  };

  return <ProfilePage tone="light" title={t(C.titre)} back backHref="/(tabs)/profil">
    <Text style={[s.title, lightStyles.title, local.lead]}>{t(C.intro)}</Text>
    <View style={local.rules}>
      <Text style={[s.meta, lightStyles.meta]}>{f(C.regle1, { jours: REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS })}</Text>
      <Text style={[s.meta, lightStyles.meta]}>{t(C.regle2)}</Text>
      <Text style={[s.meta, lightStyles.meta]}>{t(C.regle3)}</Text>
    </View>

    {notice ? <Text accessibilityRole="alert" style={[s.body, lightStyles.body, local.notice]}>{notice}</Text> : null}

    {referral.status === 'signed-out' ? <AccountDoor2026 reason={t(C.etatDeconnecte)} />
      : referral.status === 'unavailable' || !configured
        ? <View style={s.state}><Text style={[s.body, lightStyles.body]}>{t(C.etatIndisponible)}</Text></View>
        : referral.status === 'loading' ? <View style={s.state}>
          <ActivityIndicator color={c.ink} />
          <Text style={[s.meta, lightStyles.meta]}>{t(C.etatLecture)}</Text>
        </View>
          : referral.status !== 'ready' || data === null ? <View style={s.state}>
            <Text style={[s.body, lightStyles.body]}>{t(C.etatEchec)}</Text>
            <ProfileButton tone="light" label={t(C.actionReessayer)} onPress={referral.reload} />
          </View>
            : <>
              {/* ─── MON CODE ───────────────────────────────────────────── */}
              <ProfileSection tone="light" title={t(C.codeTitre)} />
              <View style={local.codePlate}>
                <Text accessibilityLabel={data.code.split('').join(' ')} selectable style={local.code}>
                  {formatReferralCodeForDisplay(data.code)}
                </Text>
              </View>
              <Text style={[s.meta, lightStyles.meta]}>{t(C.codeAide)}</Text>
              <View style={local.codeActions}>
                <ProfileButton tone="light" secondary label={copied ? t(C.actionCopie) : t(C.actionCopier)} onPress={() => { void copy(); }} />
                <ProfileButton tone="light" label={t(C.actionPartager)} onPress={() => { void share(); }} />
              </View>
              <Text style={[s.meta, lightStyles.meta, local.step]}>{nextStepCopy(data)}</Text>

              {/* ─── MON PARRAIN ────────────────────────────────────────── */}
              {data.sponsor !== null ? <>
                <ProfileSection tone="light" title={t(C.sectionParrain)} />
                <View style={local.peer}>
                  <GrydIcon name="profile" size={20} color={c.ink} />
                  <View style={s.flex}>
                    <Text style={[s.linkTitle, lightStyles.linkTitle]}>{data.sponsor.pseudo}</Text>
                    <Text style={[s.meta, lightStyles.meta]}>
                      {data.sponsor.state === 'awaiting_referee_run' ? t(C.parrainSortieAMoi) : stateCopy(data.sponsor.state)}
                    </Text>
                  </View>
                </View>
              </> : null}

              {/* ─── MES FILLEULS ───────────────────────────────────────── */}
              <ProfileSection tone="light" title={t(C.sectionFilleuls)} />
              {data.referees.length === 0
                ? <Text style={[s.meta, lightStyles.meta]}>{t(C.filleulsVide)}</Text>
                : data.referees.map((peer, index) => <View key={`${peer.pseudo}:${index}`} style={local.peer}>
                  <GrydIcon name={peer.state === 'rewarded' ? 'check' : 'profile'} size={20} color={peer.state === 'rewarded' ? c.ink : c.muted} />
                  <View style={s.flex}>
                    <Text style={[s.linkTitle, lightStyles.linkTitle]}>{peer.pseudo}</Text>
                    <Text style={[s.meta, lightStyles.meta]}>{stateCopy(peer.state)}</Text>
                  </View>
                </View>)}
              <Text style={[s.meta, lightStyles.meta, local.step]}>
                {data.remainingThisSeason > 0
                  ? f(C.restantSaison, { n: data.remainingThisSeason })
                  : f(C.plafondAtteint, { n: REFERRAL_MAX_ACTIVE_PER_SEASON })}
              </Text>

              {/* ─── MES RÉCOMPENSES ────────────────────────────────────── */}
              <ProfileSection tone="light" title={t(C.sectionRecompenses)} />
              {data.rewards.length === 0
                ? <Text style={[s.meta, lightStyles.meta]}>{t(C.recompensesVide)}</Text>
                : <>
                  {data.rewards.map(rewardRow)}
                  {/* Chaque phrase ne s'imprime QUE si l'objet qu'elle décrit est
                      là, et la coupure est DÉRIVÉE du catalogue, jamais d'une
                      liste d'identifiants recopiée ici : ce que ce build sait
                      peindre s'équipe, le reste se lit sur cette page. */}
                  {data.rewards.some(equippableReward) ? <>
                    <Text style={[s.meta, lightStyles.meta, local.step]}>{t(C.objetPorte)}</Text>
                    <View style={local.collectionDoor}>
                      <ProfileButton tone="light" secondary label={t(C.actionCollection)}
                        onPress={() => router.push({ pathname: '/arsenal', params: { segment: 'cosmetics' } })} />
                    </View>
                  </> : null}
                  {data.rewards.some(reward => reward.kind === 'collection' && !equippableReward(reward))
                    ? <Text style={[s.meta, lightStyles.meta, local.step]}>{t(C.objetTitresIci)}</Text> : null}
                  {data.bonusXp > 0 ? <Text style={[s.meta, lightStyles.meta]}>{f(C.bonusXp, { n: data.bonusXp })}</Text> : null}
                </>}

              {/* ─── ENTRER UN CODE ─────────────────────────────────────── */}
              <ProfileSection tone="light" title={t(C.sectionSaisie)} />
              {data.canRedeem ? <>
                <Text style={[s.meta, lightStyles.meta]}>{f(C.saisieAide, { n: REFERRAL_CODE_LENGTH })}</Text>
                <TextInput
                  accessibilityLabel={t(C.sectionSaisie)}
                  placeholder={t(C.saisiePlaceholder)} placeholderTextColor={c.muted}
                  value={draft} onChangeText={setDraft} editable={!referral.busy} aria-disabled={referral.busy}
                  autoCapitalize="characters" autoCorrect={false} maxLength={REFERRAL_CODE_LENGTH + 2}
                  style={[s.input, lightStyles.input, local.input]}
                />
                <ProfileButton tone="light" label={t(C.saisieAction)} busy={referral.busy}
                  disabled={normalizeReferralCode(draft) === null} onPress={() => { void submit(); }} />
              </> : <Text style={[s.meta, lightStyles.meta]}>
                {data.redeemBlockedReason === 'already_referred'
                  ? t(C.saisieAbsenteDejaParraine)
                  : f(C.saisieAbsenteCompteTropAncien, { jours: REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS, age: data.accountAgeDays })}
              </Text>}
            </>}
  </ProfilePage>;
}

/** Un refus serveur → SA phrase. Jamais un « réessaie » qui n'apprend rien. */
function refusalCopy(reason: string): Entry {
  switch (reason) {
    case 'bad_code': return C.refusBadCode;
    case 'unknown_code': return C.refusUnknownCode;
    case 'self_referral': return C.refusSelfReferral;
    case 'already_referred': return C.refusAlreadyReferred;
    case 'reciprocity': return C.refusReciprocity;
    case 'account_too_old': return C.refusAccountTooOld;
    default: return C.refusReseau;
  }
}

/** Une porte vers `/parrainage` depuis n'importe quel écran (couture testée). */
export function openReferralScreen2026(): void {
  router.push('/parrainage');
}

const local = StyleSheet.create({
  lead: { marginBottom: 10 },
  rules: { gap: 4, marginBottom: 14 },
  notice: { marginBottom: 14 },
  codePlate: {
    minHeight: 64, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  code: { fontFamily: fonts.mono, fontSize: 26, letterSpacing: 4, color: c.ink },
  codeActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  step: { marginTop: 10 },
  peer: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  reward: {
    flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  art: { width: APERCU, alignItems: 'center', justifyContent: 'center' },
  collectionDoor: { alignSelf: 'flex-start', paddingTop: 12 },
  input: { marginTop: 10, marginBottom: 12, letterSpacing: 3 },
});
