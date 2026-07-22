/**
 * GRYD — CHÂSSIS DE DOCUMENT LÉGAL (CGU, CGV, Confidentialité, Mentions, Licences).
 *
 * La mise en page COMMUNE d'un document légal long : titre (barre StackScreen),
 * date de mise à jour, puis une suite de sections `heading + corps`. Les 5 écrans
 * légaux partagent ce contenant ; le lot « Légal » n'a plus qu'à fournir le TEXTE
 * (déjà traduit, déjà daté). C'est l'équivalent structuré de `app/a-propos.tsx`,
 * généralisé et réutilisable.
 *
 * CHARTE : réutilise `StackScreen` (barre + scroll + dégagement bas). Intitulé de
 * section GRIS — même grammaire que le `SectionLabel` partagé (jamais un accent
 * chartreuse, réservé à l'action). TEXTE LISIBLE,
 * JAMAIS TRONQUÉ — aucun `numberOfLines`, `lineHeight` généreux, scroll propre
 * hérité de StackScreen. Corps multi-paragraphes supporté (tableau de chaînes).
 *
 * HONNÊTETÉ : `updatedLabel` est une chaîne DÉJÀ formatée et datée que l'appelant
 * fournit — ce composant n'invente aucune date. Pas de date réelle ⇒ ne rien
 * passer, et la ligne n'apparaît pas (jamais un « Mis à jour le — »).
 */
import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, elevation, fontSizes, radii, spacing, type IconName } from '@klaim/shared';
import { StackScreen } from './StackScreen';

/** Une section du document : un intitulé + un corps (1 ou plusieurs paragraphes). */
export interface LegalSection {
  /** Intitulé de section (kicker chartreuse). */
  heading: string;
  /** Corps : une chaîne, ou plusieurs paragraphes (rendus espacés). */
  body: string | readonly string[];
}

export interface LegalDocProps {
  /** Titre de la barre (StackScreen) — jamais tronqué (clip côté StackScreen). */
  title: string;
  /** Sections du document, dans l'ordre. */
  sections: readonly LegalSection[];
  /** Icône d'en-tête (défaut `pass`, la famille « document/légal »). */
  icon?: IconName;
  /**
   * Date de dernière mise à jour, DÉJÀ formatée et libellée par l'appelant
   * (ex. « Mis à jour le 21 juillet 2026 »). Omise = pas de ligne (aucune date
   * fabriquée).
   */
  updatedLabel?: string;
  /** Sur-titre mono gris optionnel sous la barre (ex. « CONDITIONS · v1 »). */
  kicker?: string;
  /** Intro optionnelle avant la première section (chapeau du document). */
  intro?: string;
}

/** Normalise un corps (chaîne unique OU paragraphes) en tableau de paragraphes. */
function paragraphs(body: string | readonly string[]): readonly string[] {
  return typeof body === 'string' ? [body] : body;
}

export function LegalDoc({
  title,
  sections,
  icon = 'pass',
  updatedLabel,
  kicker,
  intro,
}: LegalDocProps) {
  return (
    <StackScreen title={title} icon={icon} kicker={kicker}>
      {updatedLabel !== undefined ? <Text style={styles.updated}>{updatedLabel}</Text> : null}
      {intro !== undefined ? <Text style={styles.intro}>{intro}</Text> : null}

      {sections.map((section, i) => (
        // La clé combine l'intitulé et l'index : deux sections ne partagent pas
        // forcément un intitulé unique, l'index garantit l'unicité.
        <View key={`${i}-${section.heading}`} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>
          <View style={styles.card}>
            {paragraphs(section.body).map((p, j) => (
              <Fragment key={j}>
                {/* Aucun numberOfLines : le texte légal ne se coupe jamais. */}
                <Text style={[styles.body, j > 0 && styles.bodyGap]}>{p}</Text>
              </Fragment>
            ))}
          </View>
        </View>
      ))}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  // Ligne de date : discrète, en tête, jamais chartreuse (ce n'est pas un accent).
  updated: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginBottom: spacing.sm,
  },
  intro: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.6,
    marginBottom: spacing.xs,
  },
  section: { marginTop: spacing.xl },
  // Intitulé de section GRIS — même grammaire que le `SectionLabel` partagé
  // (À propos / Confidentialité) : gris, xs, letterSpacing 2. La chartreuse est
  // l'accent d'action, pas un intitulé ; deux familles d'en-tête = « pourquoi ce
  // n'est pas le même UI ». Poids 700 conservé (repère de scan dans un long corps).
  heading: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  // Surface N1 unique par section (jamais de card-in-card, §A) — sœurs sur le
  // fond noir, séparées par l'espace `section`.
  card: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
  },
  // Corps légal : lisible, généreux, jamais tronqué.
  body: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 21 },
  bodyGap: { marginTop: spacing.sm },
});
