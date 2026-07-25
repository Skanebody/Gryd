/**
 * GRYD — CHÂSSIS DE DOCUMENT LÉGAL (CGU, CGV, Politique RGPD, Licences, Mentions).
 *
 * ─── ORDRE DE COMPOSITION ──────────────────────────────────────────────────
 *  1. barre `StackScreen` : retour + titre (clip, jamais d'ellipse) ;
 *  2. KICKER mono gris — le document se NOMME avant de commencer, et se
 *     distingue de l'écran de réglages homonyme (« POLITIQUE · RGPD » vs
 *     l'écran /confidentialite où l'on exerce ses droits) ;
 *  3. ligne de date, grise et discrète (jamais rendue sans date réelle) ;
 *  4. NOTE D'ÉTAT grise : l'avertissement de lecture (« seul le français fait
 *     foi ») n'est pas du texte contractuel ;
 *  5. CHAPEAU blanc optionnel : le fait qui PRIME dans le document ;
 *  6. les sections, numérotées quand le document est long ;
 *  7. PIED optionnel : la ligne-lien vers l'écran qui EXÉCUTE ce que le document
 *     décrit (Politique → Réglages › Confidentialité).
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ──────────────────────────────────────
 * · LA CARD PAR SECTION. Le châssis posait `elevation.surface` sur CHAQUE
 *   section : 11 boîtes pour les CGU, 10 pour les CGV, 13 pour la politique.
 *   Une seule couche de surface par zone : les sections se séparent par
 *   l'ESPACE. La surface redevient un SIGNAL, réservée à la section qui la
 *   demande (`surface: true` — l'identité du vendeur / de l'éditeur), et elle
 *   passe alors par la primitive `Card` au lieu d'être recodée ici.
 * · LES POLICES SYSTÈME. `styles.body` et `styles.heading` recodaient taille,
 *   graisse et interlettrage à la main — dont un `fontWeight: '700'` posé sans
 *   famille, qui n'agit sur AUCUNE des familles à graisse nommée de Night Print
 *   (design-tokens : « une famille PAR GRAISSE »). Le corps consomme
 *   `typography.body`, l'intitulé passe par `SectionLabel` (kicker canonique).
 * · LE BANDEAU BLANC. Il avait la couleur ET la taille du corps : un
 *   avertissement de lecture déguisé en clause. Il descend en note grise.
 *
 * ─── ÉCARTS ASSUMÉS ────────────────────────────────────────────────────────
 * · AUCUNE PLANCHE VAGUE 1 NE COUVRE LE LÉGAL (E01→E21). La composition est
 *   dérivée du système visuel, pas d'une planche : c'est l'écart de fond de
 *   tous les écrans de ce lot, et il ne se refermera qu'avec une planche.
 * · PAS DE SOMMAIRE CLIQUABLE. Un sommaire suppose de défiler jusqu'à une ancre,
 *   donc un `ref` sur le ScrollView — ce ScrollView appartient à `StackScreen`,
 *   hors du périmètre de ce lot. Le repère est donc la NUMÉROTATION des sections
 *   (`numbered`) : elle donne la position et la longueur sans peindre un
 *   contrôle qui ne défilerait nulle part.
 * · PAS D'ACCORDÉONS REPLIÉS, contrairement à `faq.tsx`. Arbitrage écrit : une
 *   FAQ est une collection de réponses indépendantes, un contrat se lit d'un
 *   bloc. Une clause repliée par défaut est une clause dont on peut dire ne
 *   l'avoir jamais vue — or c'est précisément ce que l'acceptation engage.
 * · LES QUATRE ÉTATS N'EXISTENT PAS ICI, et c'est DÉCLARÉ : ce châssis ne lit
 *   rien (ni réseau, ni session, ni store). Les textes sont embarqués dans le
 *   bundle et s'affichent en avion, sans compte et sans backend — donc pas de
 *   « lecture en cours », pas d'« échec », pas de « pas connecté ». Même
 *   déclaration, pour la même raison, que `app/qr.tsx`.
 * · TEXTE SÉLECTIONNABLE (`selectable`) sur le corps et le chapeau : un contrat
 *   qu'on ne peut ni copier ni citer n'est pas opposable en pratique.
 */
import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, type IconName } from '@klaim/shared';
import { Card } from './Card';
import { SectionLabel } from './SectionLabel';
import { StackScreen } from './StackScreen';

/** Une section du document : un intitulé + un corps (1 ou plusieurs paragraphes). */
export interface LegalSection {
  /** Intitulé de section — rendu par le kicker canonique (gris, capitales). */
  heading: string;
  /** Corps : une chaîne, ou plusieurs paragraphes (rendus espacés). */
  body: string | readonly string[];
  /**
   * Donne à CETTE section la surface N1. À réserver au bloc d'IDENTITÉ (vendeur,
   * éditeur) : c'est le seul contenu que le lecteur vient chercher isolément
   * dans un document long. Si toutes les sections la demandent, elle ne signale
   * plus rien — c'est le défaut que ce châssis vient de corriger.
   */
  surface?: boolean;
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
   * (ex. « Mis à jour le 23/07/2026 »). Omise = pas de ligne (aucune date
   * fabriquée, jamais un « Mis à jour le — »).
   */
  updatedLabel?: string;
  /** Sur-titre mono gris sous la barre (ex. « POLITIQUE · RGPD »). */
  kicker?: string;
  /**
   * Note d'ÉTAT, grise : avertissement de lecture, pas une clause. C'est là que
   * vit « seul le texte français fait foi ».
   */
  notice?: string;
  /**
   * Chapeau BLANC : le fait qui prime, en tête du document (ex. « aucune de ces
   * offres n'est commercialisée »). Réservé à ce qui change la lecture de tout
   * le reste — sinon, c'est une section comme une autre.
   */
  intro?: string;
  /**
   * Numérote les sections (« 5 · TES DROITS »). Repère de position dans un
   * document long ; inutile — et bureaucratique — sous ~8 sections.
   */
  numbered?: boolean;
  /**
   * Pied de document : les lignes-liens (`ListRow`) vers l'écran qui EXÉCUTE ce
   * que le texte décrit. Jamais un CTA chartreuse : un document légal ne porte
   * pas la décision de l'écran, il y renvoie.
   */
  footer?: ReactNode;
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
  notice,
  intro,
  numbered = false,
  footer,
}: LegalDocProps) {
  return (
    <StackScreen title={title} icon={icon} kicker={kicker}>
      {updatedLabel !== undefined ? <Text style={styles.updated}>{updatedLabel}</Text> : null}
      {notice !== undefined ? <Text style={styles.notice}>{notice}</Text> : null}
      {intro !== undefined ? (
        <Text style={styles.intro} selectable>
          {intro}
        </Text>
      ) : null}

      {sections.map((section, i) => {
        // Le numéro est DÉRIVÉ de la position, jamais saisi dans le catalogue :
        // insérer une section ne peut pas désynchroniser la numérotation.
        const heading = numbered ? `${i + 1} · ${section.heading}` : section.heading;
        const body = paragraphs(section.body).map((p, j) => (
          <Fragment key={j}>
            {/* Aucun `numberOfLines` : un texte légal ne se coupe jamais. */}
            <Text style={[styles.body, j > 0 && styles.bodyGap]} selectable>
              {p}
            </Text>
          </Fragment>
        ));
        return (
          // La clé combine l'index et l'intitulé : deux sections ne partagent pas
          // forcément un intitulé unique, l'index garantit l'unicité.
          <View key={`${i}-${section.heading}`} style={styles.section}>
            <SectionLabel style={styles.heading}>{heading}</SectionLabel>
            {section.surface === true ? <Card>{body}</Card> : body}
          </View>
        );
      })}

      {footer !== undefined ? <View style={styles.footer}>{footer}</View> : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  /** Date : discrète, en tête. Jamais chartreuse — ce n'est pas un accent. */
  updated: { ...typography.meta, color: colors.gris, marginBottom: spacing.xxs },
  /** Note d'état : même gris que la date, interligne de lecture. */
  notice: {
    ...typography.body,
    color: colors.gris,
    marginBottom: spacing.sm,
  },
  /** Chapeau : le fait qui prime, en blanc, avant la première section. */
  intro: { ...typography.body, color: colors.blanc },
  section: { marginTop: spacing.xl },
  heading: { marginBottom: spacing.sm },
  /** Corps légal : rôle R4, lisible, jamais tronqué. */
  body: { ...typography.body, color: colors.blanc },
  bodyGap: { marginTop: spacing.sm },
  footer: { marginTop: spacing.xl },
});
