/**
 * GRYD — « PERSONNALISATION » : le troisième segment de la Collection (G24).
 *
 * ─── CE QUE CHAQUE LIGNE DIT, ET CE QU'ELLE NE DIT JAMAIS ───────────────────
 * G24 : « chaque objet montre son rendu, son statut, son obtention et sa
 * permanence ; les objets déjà détenus portent Équiper ; les objets gagnables
 * indiquent une condition vérifiable ». Donc :
 *  · le RENDU est un aperçu réel (pas une icône générique) ;
 *  · le STATUT est l'un des sept états de `cosmeticState2026`, jamais un
 *    « bientôt » ;
 *  · l'OBTENTION est vérifiable : « Débloqué au niveau 8 » se contrôle sur
 *    l'écran de progression ;
 *  · la PERMANENCE est dite une fois par famille, pas trente-quatre fois.
 * Et il n'y a NI compteur d'objets restants, NI pastille rouge, NI faux stock.
 *
 * ─── AUCUN BOUTON D'ACHAT ICI, ET C'EST STRUCTUREL (ADR-014) ────────────────
 * Cet écran ne vend rien. Il ne peut pas : il n'appelle aucune fonction
 * d'achat, et son seul verdict commercial descend de `storeAvailability2026`,
 * la fonction qui fait déjà loi pour l'écran Abonnements. Quand la boutique
 * s'ouvrira, la ligne renverra vers « Collections » — la place où l'achat vit
 * déjà, avec ses prix du Store et ses états d'achat.
 *
 * ADR-014 a corrigé une faute précise, et elle ne se refait pas ici :
 * « Pas encore en vente » n'est affiché QUE quand c'est VRAI. Déconnecté, en
 * cours de lecture, sur le web ou après un échec de lecture, on ne sait rien de
 * la vente — on dit la RAISON, on ne conclut pas.
 *
 * ─── LE PIÈGE ADR-011 QUE CE FICHIER ÉVITE ──────────────────────────────────
 * `useGrydPlusAccess().active` est VRAI en pré-vente (les outils GRYD+ sont
 * ouverts tant que rien n'est vendu). Déverrouiller les cosmétiques GRYD+ sur
 * ce booléen les OFFRIRAIT aujourd'hui pour les REPRENDRE le jour de
 * l'ouverture — exactement ce qu'ADR-011 interdit (« aucune capacité déjà
 * offerte ne devient payante »). On lit donc `status === 'active'` : le droit
 * RÉEL, celui que le serveur applique aussi dans `equip_cosmetic_2026`.
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { PROFILE_COSMETIC_SLOTS_2026, careerProgress2026, fonts, refonteColors as c } from '@klaim/shared';
import { purchasesCapability, storeAvailability2026, storeSaysNotOnSale2026, useGrydPlusAccess } from '../premium';
import type { PremiumOffer, PremiumStatus, StoreClosedReason2026 } from '../premium';
import { useCommercialCollections2026 } from '../premium/useCommercialCollections2026';
import { useProfileProgress } from '../refonte/ProfileProgress';
import { ProfileButton, useRefonteCopy } from '../refonte/ProfilePrimitives';
import { useSession } from '../../lib/session';
import { haptics } from '../../lib/haptics';
import { GrydIcon } from '../../ui/gryd';
import {
  COSMETIC_FAMILY_LABELS_2026, COSMETIC_FAMILY_WHERE_2026, CosmeticPreview2026,
} from './CosmeticArt2026';
import {
  cosmeticState2026, cosmeticsOfFamily2026, defaultCosmetic2026,
  type CosmeticItem2026, type CosmeticSlot2026, type CosmeticUnlockContext2026,
} from './cosmetics2026';
import { equipCosmetic2026, useMyCosmetics2026, type CosmeticEquipResult2026 } from './useMyCosmetics2026';

/** Côté d'un aperçu dans la liste. Une valeur de mise en page, pas une règle. */
const PREVIEW_SIZE = 64;

export function CosmeticsPanel2026() {
  const copy = useRefonteCopy();
  const { session, loading: sessionLoading } = useSession();
  const progress = useProfileProgress();
  const collections = useCommercialCollections2026();
  const access = useGrydPlusAccess();
  const mine = useMyCosmetics2026();
  const [busySlot, setBusySlot] = useState<CosmeticSlot2026 | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * L'ÉTAT RÉEL DE LA BOUTIQUE, lu avec les mêmes primitives que l'écran
   * Abonnements. Aucun raccourci : `storeAvailability2026` reste l'unique juge,
   * et il reçoit ici des faits (capacité de la plateforme, produits publiés,
   * prix confirmés), jamais une supposition.
   */
  const store = useMemo(() => {
    const capability = purchasesCapability();
    // Une collection permanente est un achat À VIE : c'est la période que le
    // Store lui donne, et c'est celle qu'on lui garde ici. Le prix n'est JAMAIS
    // écrit — il vient du produit, ou l'offre n'est pas achetable (`priceLabel`
    // nul), ce que `storeAvailability2026` traduit en `noConfirmedPrice`.
    const offers = collections.rows
      .filter(row => row.configured && !row.owned)
      .flatMap<PremiumOffer>(row => {
        const product = collections.productFor(row.id);
        return product ? [{
          period: 'lifetime', packageId: row.id, productId: product.identifier ?? row.id,
          priceLabel: typeof product.priceString === 'string' ? product.priceString : null,
          priceAmount: typeof product.price === 'number' ? product.price : null,
          currencyCode: null, freeTrial: null,
        }] : [];
      });
    const status: PremiumStatus = sessionLoading || collections.status === 'loading' ? 'loading'
      : !session ? 'signedOut'
        : !capability.available ? 'unavailable'
          : collections.status === 'unavailable' ? 'error'
            : collections.rows.every(row => !row.configured) ? 'empty' : 'ready';
    return storeAvailability2026({
      status, offers, blockedReason: capability.available ? null : capability.reason,
    });
  }, [collections.rows, collections.status, collections.productFor, session, sessionLoading]);
  const notOnSale = storeSaysNotOnSale2026(store);

  /**
   * CE QUE JE POSSÈDE, tel que trois lectures serveur le disent. Aucune de ces
   * sources n'est nouvelle : le niveau vient du registre d'XP, les objets de
   * saison de la progression, les collections du panneau commercial, et le
   * droit GRYD+ de son propre hook. Le client AFFICHE ; `equip_cosmetic_2026`
   * DÉCIDE, et peut dire non.
   */
  const context = useMemo<CosmeticUnlockContext2026>(() => ({
    level: progress.data ? careerProgress2026(progress.data.totalXp).level : 1,
    ownedSeasonRewardIds: (progress.data?.ownedRewards ?? []).map(reward => reward.rewardId),
    ownedCollectionIds: collections.rows.filter(row => row.owned).map(row => row.id),
    // `active` seul serait faux : il est VRAI en pré-vente. Voir l'en-tête.
    grydPlusActive: access.status === 'active',
  }), [progress.data, collections.rows, access.status]);

  async function equip(slot: CosmeticSlot2026, item: CosmeticItem2026): Promise<void> {
    if (busySlot) return;
    setBusySlot(slot); setNotice(null);
    // Un objet livré avec le compte se « retire » en envoyant null : le serveur
    // n'a alors aucune ligne à garder, et l'apparence revient à celle d'origine.
    const target = item.id === defaultCosmetic2026(slot).id ? null : item.id;
    const result = await equipCosmetic2026(slot, target);
    setNotice(result === 'saved' ? null : EQUIP_FAILURE_2026(result, copy));
    if (result === 'saved') void haptics.success(); else void haptics.error();
    setBusySlot(null);
  }

  if (sessionLoading || progress.status === 'loading') {
    return <View style={local.loading}>
      <ActivityIndicator size="small" color={c.ink} />
      <Text style={local.meta}>{copy('Lecture de ta personnalisation…', 'Loading your personalisation…')}</Text>
    </View>;
  }

  return <View style={local.root}>
    <Text style={local.intro}>{copy(
      'Sept choses à changer sur ton profil. Aucune ne change ce que tu gagnes.',
      'Seven things to change on your profile. None of them changes what you earn.')}</Text>
    {!session ? <Text style={local.meta}>{copy(
      'Sans compte, ces objets sont des aperçus : c’est ton compte qui garde ce que tu équipes.',
      'Without an account these are previews: your account is what keeps what you equip.')}</Text> : null}
    {/* ADR-014 : quand la boutique est fermée pour une raison qui NE CONCLUT
        RIEN sur la vente (lecture en cours, pas de compte, plateforme sans
        achat intégré, échec de lecture), on dit LA RAISON — une fois, en tête —
        au lieu de laisser trente-quatre tuiles répéter « on ne sait pas ». */}
    {!store.open && !notOnSale ? <Text style={local.meta}>{STORE_UNKNOWN_REASON_2026(store.reason, copy)}</Text> : null}
    {session && mine.status === 'unavailable' ? <View style={local.warning}>
      <Text style={local.meta}>{copy(
        'Ta personnalisation n’a pas pu être lue. Ton profil garde son apparence actuelle.',
        'Your personalisation could not be read. Your profile keeps its current look.')}</Text>
      <View style={local.action}><ProfileButton tone="light" secondary label={copy('Réessayer', 'Retry')} onPress={mine.reload} /></View>
    </View> : null}

    {PROFILE_COSMETIC_SLOTS_2026.map(slot => {
      const items = cosmeticsOfFamily2026(slot);
      const equippedId = mine.equipped[slot] ?? defaultCosmetic2026(slot).id;
      return <View key={slot} style={local.family}>
        <Text style={local.familyTitle}>{copy(COSMETIC_FAMILY_LABELS_2026[slot].fr, COSMETIC_FAMILY_LABELS_2026[slot].en)}</Text>
        <Text style={local.meta}>{copy(COSMETIC_FAMILY_WHERE_2026[slot].fr, COSMETIC_FAMILY_WHERE_2026[slot].en)}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={local.row}>
          {items.map(item => {
            const state = cosmeticState2026({ item, context, equippedId, storeOpen: store.open, storeSaysNotOnSale: notOnSale });
            const label = copy(item.name.fr, item.name.en);
            const statusLabel = COSMETIC_STATE_LABEL_2026(state, copy);
            const canEquip = session !== null && (state.kind === 'available' || state.kind === 'equipped');
            return <View key={item.id} style={local.tile}>
              <View aria-hidden style={local.art}><CosmeticPreview2026 item={item} size={PREVIEW_SIZE} /></View>
              <Text numberOfLines={2} style={local.name}>{label}</Text>
              <Text numberOfLines={2} style={local.status}>{statusLabel}</Text>
              {state.kind === 'equipped' ? <View style={local.equipped}>
                <GrydIcon name="check" size={16} color={c.ink} />
                <Text style={local.equippedText}>{copy('Équipé', 'Equipped')}</Text>
              </View> : canEquip ? <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy(`Équiper ${item.name.fr}`, `Equip ${item.name.en}`)}
                accessibilityState={{ disabled: busySlot !== null }}
                aria-disabled={busySlot !== null}
                disabled={busySlot !== null}
                onPress={() => { void equip(slot, item); }}
                style={local.equipAction}
              >
                {busySlot === slot ? <ActivityIndicator size="small" color={c.ink} />
                  : <Text style={local.equipText}>{copy('Équiper', 'Equip')}</Text>}
              </Pressable> : state.kind === 'on_sale' ? <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy('Voir les collections', 'View collections')}
                onPress={() => router.push('/arsenal')}
                style={local.equipAction}
              ><Text style={local.equipText}>{copy('Voir', 'View')}</Text></Pressable> : <View style={local.spacer} />}
            </View>;
          })}
        </ScrollView>
      </View>;
    })}

    <Text style={local.footer}>{copy(
      'Chaque objet obtenu reste à toi, sans abonnement et sans date de fin. Aucun ne donne de mètres carrés, d’XP ni de points.',
      'Every object you earn stays yours, with no subscription and no end date. None of them grants ground, XP or points.')}</Text>
    {notOnSale ? <Text style={local.footer}>{copy(
      'Les objets marqués « Pas encore en vente » ne sont vendus nulle part aujourd’hui, et aucune date n’est promise.',
      'Objects marked “Not on sale yet” are sold nowhere today, and no date is promised.')}</Text> : null}
    {notice ? <Text accessibilityRole="alert" style={local.notice}>{notice}</Text> : null}
    <View style={local.action}>
      <ProfileButton tone="light" secondary label={copy('Voir mon profil', 'View my profile')}
        onPress={() => router.push('/(tabs)/profil')} />
    </View>
  </View>;
}

type Copy = (fr: string, en: string) => string;

/** Une phrase par état, et pas une de plus. Aucune ne promet de date. */
function COSMETIC_STATE_LABEL_2026(state: ReturnType<typeof cosmeticState2026>, copy: Copy): string {
  switch (state.kind) {
    case 'equipped': return copy('Sur ton profil', 'On your profile');
    case 'available': return copy('Obtenu · permanent', 'Earned · permanent');
    case 'locked_level': return copy(`Débloqué au niveau ${state.level}`, `Unlocked at level ${state.level}`);
    case 'locked_season': return copy('Gagné avec le titre de saison', 'Earned with the season title');
    case 'not_on_sale': return copy('Pas encore en vente', 'Not on sale yet');
    case 'on_sale': return copy('Dans une collection', 'In a collection');
    case 'store_unknown': return copy('Disponibilité inconnue ici', 'Availability unknown here');
  }
}

/**
 * Les CINQ raisons qui ne concluent rien sur la vente. Aucune ne dit « pas
 * encore en vente » : on ne sait pas, et le dire est la seule chose vraie.
 * `notConfigured` et `nothingOnSale` n'y sont pas — ce sont les deux seules qui
 * autorisent l'affirmation, et `storeSaysNotOnSale2026` s'en charge.
 */
function STORE_UNKNOWN_REASON_2026(reason: StoreClosedReason2026, copy: Copy): string {
  switch (reason) {
    case 'checking': return copy('Lecture de la boutique en cours.', 'Checking the store.');
    case 'signedOut': return copy(
      'Connecte-toi pour savoir ce qui est en vente.',
      'Sign in to see what is on sale.');
    case 'platform': return copy(
      'Les achats intégrés n’existent pas sur cet appareil : la vente ne peut pas être lue ici.',
      'In-app purchases do not exist on this device: sales cannot be checked here.');
    case 'readFailed': return copy(
      'La boutique n’a pas pu être lue. On ne sait pas ce qui est en vente.',
      'The store could not be read. We do not know what is on sale.');
    case 'noConfirmedPrice': return copy(
      'Aucun prix confirmé par la boutique : rien n’est proposé à l’achat.',
      'No price confirmed by the store: nothing is offered for sale.');
    default: return copy('Pas encore en vente.', 'Not on sale yet.');
  }
}

/** Chaque refus a SA phrase : « Réessaie » ne répond pas à « tu ne l'as pas ». */
function EQUIP_FAILURE_2026(result: CosmeticEquipResult2026, copy: Copy): string {
  switch (result) {
    case 'not_unlocked': return copy(
      'Cet objet n’est pas encore à toi. Ton profil n’a pas changé.',
      'This object is not yours yet. Your profile has not changed.');
    case 'unknown': return copy(
      'Cet objet n’existe pas sur le serveur de ce build.',
      'This object does not exist on this build’s server.');
    case 'signed_out': return copy(
      'Un objet s’attache à un compte. Connecte-toi pour le garder.',
      'An object belongs to an account. Sign in to keep it.');
    default: return copy(
      'Ton choix n’a pas pu être enregistré. Réessaie.',
      'Your choice could not be saved. Try again.');
  }
}

const local = StyleSheet.create({
  root: { paddingTop: 8, gap: 4 },
  intro: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 21, color: c.ink, paddingBottom: 10 },
  meta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted },
  loading: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 16 },
  warning: { padding: 14, backgroundColor: c.surface, borderRadius: 20, gap: 10, marginBottom: 8 },
  action: { alignSelf: 'flex-start', paddingTop: 10 },
  family: { paddingVertical: 12, gap: 4, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  familyTitle: { fontFamily: fonts.textSemi, fontSize: 15, lineHeight: 22, color: c.ink },
  row: { gap: 10, paddingTop: 10, paddingRight: 4 },
  tile: { width: 108, gap: 5, padding: 10, borderRadius: 20, backgroundColor: c.surface },
  art: { alignItems: 'center', justifyContent: 'center', minHeight: PREVIEW_SIZE + 12 },
  name: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 18, color: c.ink },
  status: { fontFamily: fonts.text, fontSize: 11, lineHeight: 16, color: c.muted, minHeight: 32 },
  equipped: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40 },
  equippedText: { fontFamily: fonts.textSemi, fontSize: 12, color: c.ink },
  equipAction: { minHeight: 40, justifyContent: 'center' },
  equipText: { fontFamily: fonts.textSemi, fontSize: 13, color: c.ink },
  spacer: { minHeight: 40 },
  footer: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted, paddingTop: 12 },
  notice: { fontFamily: fonts.text, fontSize: 13, lineHeight: 20, color: c.ink, paddingTop: 10 },
});
