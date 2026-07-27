/**
 * GRYD — RANGÉE DE DESTINATIONS (planche E10 : « Instagram · TikTok · WhatsApp
 * · Plus », spec E35 « raccourcis »).
 *
 * ═══ CE COMPOSANT NE DÉCIDE RIEN — ET C'EST TOUT L'INTÉRÊT ══════════════════
 * Qui a le droit d'être peint est décidé par `resolveShareTargets()`
 * (features/share/shareTargets.ts), fonction PURE et testée qui exige TROIS
 * preuves avant d'ouvrir une destination : un canal existe sur cette plateforme,
 * il sait recevoir CE média, et on SAIT qu'il répondra (ne pas savoir compte
 * comme un non). Ce fichier ne fait que poser des pastilles sur sa sortie.
 *
 * CONSÉQUENCE ASSUMÉE, ET VISIBLE À L'ŒIL : tant qu'aucun PONT natif n'est
 * embarqué (UIPasteboard `com.instagram.sharedSticker.*`, Intent
 * `com.instagram.share.ADD_TO_STORY`, TikTok OpenSDK), Instagram et TikTok ne
 * sont PAS peints — même installés, même déclarés. Ouvrir Instagram sans lui
 * remettre l'image serait exactement le bouton mort que la constitution §2
 * interdit. La rangée de la planche apparaîtra en entier le jour où les ponts
 * arriveront, sans une ligne de plus ici.
 *
 * ═══ LES MARQUES NE SE TRADUISENT PAS ══════════════════════════════════════
 * « Instagram », « TikTok », « WhatsApp » sont des marques : elles s'affichent
 * telles quelles (`target.brand`), et seul « Plus » est du français traduit en
 * cinq langues (`channelMore`). Les libellés d'ACCESSIBILITÉ, eux, décrivent
 * l'action (« Partager sur Instagram ») : VoiceOver lit une action, pas un mot.
 *
 * ═══ PAS D'ICÔNE DE MARQUE ═════════════════════════════════════════════════
 * Le jeu d'icônes du projet est filaire et maison (`packages/shared/src/icons.ts`)
 * — il ne contient aucun logo tiers, et en dessiner un « à peu près » serait à la
 * fois faux visuellement et discutable juridiquement. Le NOM suffit, il est même
 * plus lisible à 375 px.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, elevation, fontSizes, radii, sizes, spacing } from '@klaim/shared';
import { useT } from '../../i18n/store';
import { SHARE_COPY } from './copy';
import type { OmittedShareTarget, ResolvedShareTarget } from './shareTargets';

export interface ShareDestinationsProps {
  /**
   * Sortie de `pillDestinations(resolveShareTargets().targets)` — c'est-à-dire
   * les destinations RÉELLEMENT distinctes du CTA chartreuse, la feuille
   * système en moins. PEUT être vide : sur natif elle l'est aujourd'hui (aucun
   * pont natif, wa.me ne porte pas d'image), et une rangée d'une seule pastille
   * qui refait le geste du CTA est le doublon que §A interdit.
   */
  targets: readonly ResolvedShareTarget[];
  /** Sortie de `resolveShareTargets().omitted` — sert à EXPLIQUER une absence. */
  omitted: readonly OmittedShareTarget[];
  onPick: (target: ResolvedShareTarget) => void;
}

export function ShareDestinations({ targets, omitted, onPick }: ShareDestinationsProps) {
  const t = useT();

  /**
   * La seule absence qu'on EXPLIQUE, parce que c'est la seule dont la phrase
   * existante est vraie : sur le web, Instagram et TikTok n'ont aucun canal du
   * tout (`no_channel_on_platform`) — « le partage direct vit dans l'app sur
   * téléphone » décrit exactement ça.
   * Les autres raisons restent muettes À DESSEIN : `channelUnavailableApp`
   * (« n'est pas installé ») serait FAUSSE pour une cible écartée faute de pont
   * natif, et une absence n'est pas un mensonge — un bouton qui échoue en est un.
   */
  const platformOmitted = omitted.some((o) => o.reason === 'no_channel_on_platform');

  /**
   * RIEN À DIRE, RIEN À PEINDRE. `pillDestinations` a déjà retiré la feuille
   * système (c'est le CTA chartreuse lui-même) ; s'il ne reste aucune
   * destination distincte ET aucune absence à expliquer, la rangée n'a plus
   * d'objet. Un conteneur vide qui garde sa marge est un trou dans la mise en
   * page, pas une information. C'est le cas RÉEL sur iOS et Android
   * aujourd'hui.
   */
  if (targets.length === 0 && !platformOmitted) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {targets.map((target) => {
          const label = target.brand ?? t(SHARE_COPY.channelMore);
          return (
            <Pressable
              key={target.id}
              accessibilityRole="button"
              accessibilityLabel={
                target.brand === null
                  ? t(SHARE_COPY.channelMoreA11y)
                  : t(SHARE_COPY.channelA11y, { name: target.brand })
              }
              onPress={() => onPick(target)}
              style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
            >
              {/* §A.9 — jamais d'ellipse sur un texte d'action : la pastille
                  s'élargit avec son nom, elle ne le coupe pas. */}
              <Text style={styles.label} numberOfLines={1} ellipsizeMode="clip">
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {platformOmitted ? (
        <Text style={styles.note}>{t(SHARE_COPY.channelUnavailablePlatform)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.md, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  // N2 discret : aucune destination n'est un CTA (§A — un seul chartreuse).
  pill: {
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
  },
  label: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.2 },
  note: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  pressed: { opacity: 0.6 },
});
