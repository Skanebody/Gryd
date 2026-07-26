/**
 * GRYD — E26 « Profil rival · vue publique » (planche : entrée E04 / E11 / E23 /
 * QR, même gabarit que E15).
 *
 * ══ POURQUOI CET ÉCRAN NE MONTRE PAS « NINA M. » (la décision la plus lourde) ══
 * La planche jauge un adversaire concret : avatar orange, « Nina M. · NIV. 17 »,
 * « NIGHT RUNNERS · #2 quartier », 2,31 km² de territoire, « Votre rivalité :
 * Nina tient Saint-Rémy… ». Tout cela suppose de LIRE le profil et le territoire
 * d'UN AUTRE joueur — des lectures cross-utilisateur CONSENTIES (public_profiles
 * pour l'identité, faits territoriaux publics gouvernés par la confidentialité
 * E25). Ce chemin n'est pas câblé (point ouvert O1) : il n'existe aujourd'hui
 * AUCUN rival réel à afficher. Coder « Nina M. » pour « reproduire la planche »
 * serait exactement la donnée fabriquée que la constitution interdit — pire, un
 * faux adversaire qui fausse la seule chose qui compte ici : décider de le
 * suivre ou d'attaquer son territoire.
 *
 * L'écran affiche donc l'ÉTAT HONNÊTE de la planche pour cette condition de
 * données (« profil indisponible »), pas un profil d'illustration. La décision
 * est prise par le MOTEUR testé `resolveRivalProfileState` : tant qu'aucune
 * identité consentie n'est atteinte (`identity: 'none'`, la réalité d'O1), il
 * renvoie `unavailable`. Le jour où O1 est levé, seule la source change.
 *
 * ══ AUCUN BOUTON MORT ═════════════════════════════════════════════════════════
 * La planche pose « Suivre » et « VOIR SES ZONES » (CTA chartreuse). Les deux
 * exigent le backend cross-utilisateur (suivre = ses captures dans mon flux E23 ;
 * voir ses zones = sa carte consentie centrée) — O1. On ne les peint donc PAS :
 * un CTA qui échoue toujours est le mensonge d'interface le plus coûteux, a
 * fortiori l'accent chartreuse (§A4). Le seul geste offert est le retour (barre),
 * qui, lui, fonctionne. Et aucune surface de l'app ne pointe vers cet écran (pas
 * de bouton mort qui y MÈNE) : il n'est atteignable que par lien profond / QR,
 * où un état honnête vaut mieux qu'un écran « route introuvable ».
 *
 * ANTI-FUITE : même à O1 levé, cet écran ne montrera que des faits PUBLICS
 * consentis (E25) — jamais une course privée ni une position live. Le `handle`
 * du lien n'est pas ré-affiché comme un nom : l'écran n'a résolu aucune identité,
 * il ne doit pas laisser croire le contraire.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, gameColors, iconSizes, radii, spacing, withAlpha } from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { StackScreen } from '../../src/ui/StackScreen';
import { Icon } from '../../src/ui/Icon';
import { useT } from '../../src/i18n/store';
import { RIVAL_C } from '../../src/i18n/catalog/rivalProfile';
import { resolveRivalProfileState } from '../../src/features/social/rivalProfile';

/**
 * Ce que les sources publiques ont rendu AUJOURD'HUI. `identity: 'none'` n'est
 * pas une hypothèse : c'est le constat d'O1 — aucun chemin cross-utilisateur
 * consenti n'existe pour identifier un rival ni lire son territoire public. Le
 * jour où O1 est levé, c'est LA SEULE valeur à remplacer par la vraie lecture.
 */
const RIVAL_PROFILE_SOURCES_TODAY = { identity: 'none', territoryAvailable: false } as const;

export default function RivalProfileRoute() {
  const t = useT();
  useEffect(() => {
    screen('profil_rival');
  }, []);

  const view = resolveRivalProfileState(RIVAL_PROFILE_SOURCES_TODAY);

  return (
    <StackScreen title={t(RIVAL_C.screenTitle)} icon="profil">
      {view.status === 'unavailable' ? (
        <RivalUnavailable />
      ) : (
        // O1 : la source consentie n'existe pas encore, donc cette branche n'est
        // pas atteignable aujourd'hui. Quand elle le sera, le profil RÉEL (hero
        // orange, 3 métriques, « Votre rivalité » dérivée par deriveRivalry, carte
        // des contours généralisés, faits publics, CTA Suivre / Voir ses zones)
        // se branchera ICI — jamais un faux. En repli, l'état honnête indisponible.
        <RivalUnavailable />
      )}
    </StackScreen>
  );
}

/**
 * L'état honnête « profil indisponible ». Il porte l'identité de RÔLE du rival
 * (orange, charte §C) sans fabriquer de personne : une plaque orange vide, pas un
 * avatar avec un faux nom. Puis il DIT pourquoi, et ce que l'écran montrera quand
 * la source existera — fidèle à la composition de la planche, énoncé au futur.
 */
function RivalUnavailable() {
  const t = useT();
  return (
    <View>
      {/* Plaque de rôle « rival » (orange) — vide : aucune identité n'a été lue. */}
      <View style={styles.heroPlate}>
        <View style={styles.rivalMark}>
          <Icon name="profil" size={iconSizes.lg} color={gameColors.rival} />
        </View>
      </View>

      {/* Aveu honnête : indisponible, et pourquoi (jamais un adversaire inventé). */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{t(RIVAL_C.unavailableTitle)}</Text>
        <Text style={styles.panelBody}>{t(RIVAL_C.unavailableBody)}</Text>
      </View>

      {/* Ce que l'écran montrera à O1 levé — la composition de la planche, promise
          sans être peinte (une garantie écrite ne dépasse jamais le code : c'est
          un « à venir », pas un bloc de fausses données). */}
      <Text style={styles.whatKicker}>{t(RIVAL_C.whatKicker)}</Text>
      <View style={styles.whatList}>
        <WhatRow text={t(RIVAL_C.whatTerritory)} />
        <WhatRow text={t(RIVAL_C.whatRivalry)} />
        <WhatRow text={t(RIVAL_C.whatFacts)} />
      </View>
    </View>
  );
}

function WhatRow({ text }: { text: string }) {
  return (
    <View style={styles.whatRow}>
      {/* Puce orange (rôle rival), jamais chartreuse : rien d'actionnable ici. */}
      <View style={styles.whatDot} />
      <Text style={styles.whatText}>{text}</Text>
    </View>
  );
}

const RIVAL_MARK_PX = 96;

const styles = StyleSheet.create({
  // Plaque de héros : place de l'avatar orange de la planche, laissée VIDE
  // (aucune identité lue). Centrée, sobre — pas un placeholder gris culpabilisant.
  heroPlate: { alignItems: 'center', paddingVertical: 24 },
  rivalMark: {
    width: RIVAL_MARK_PX,
    height: RIVAL_MARK_PX,
    borderRadius: RIVAL_MARK_PX / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(gameColors.rival, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(gameColors.rival, 0.4),
  },

  // Panneau d'ÉTAT (surface N1) : rien à taper, tout à lire — comme l'aveu
  // « boutique fermée » d'E17. Pas de bordure chartreuse : aucune action.
  panel: {
    backgroundColor: withAlpha(colors.blanc, 0.04),
    borderRadius: radii.card,
    padding: 16,
    gap: 8,
  },
  panelTitle: { color: colors.blanc, fontSize: fontSizes.md, fontFamily: fonts.display, fontWeight: '800' },
  panelBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.6 },

  whatKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 10,
  },
  whatList: { gap: 12 },
  whatRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  // Puce alignée sur la 1re ligne du texte (marginTop optique).
  whatDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: gameColors.rival, marginTop: 7 },
  whatText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 },
});
