/**
 * GRYD — LE KICKER DE SECTION, version canonique.
 *
 * ─── POURQUOI CE FICHIER EXISTE ────────────────────────────────────────────────
 * Le sur-titre gris qui ouvre chaque section est la loi de composition n°2 du
 * système « Night Print » : on le retrouve à l'identique sur les vingt écrans
 * recalés (Profil, Statistiques, Classement, Crew, QR…). C'est le marqueur visuel
 * le plus répandu de l'app.
 *
 * Il vivait pourtant dans `src/features/privacy/ui.tsx` — un composant de kicker
 * importé depuis un dossier « confidentialité » par quatre écrans de réglages qui
 * n'ont rien à voir avec la vie privée, et qui y RECODAIT le rôle typo R1 à la
 * main. Deux fautes en une : une dépendance qui ment sur son domaine, et une règle
 * de charte dupliquée hors de sa source. Ici, le composant est à sa place et
 * CONSOMME `typography.kicker` au lieu de le réécrire.
 *
 * ─── COHABITATION TRANSITOIRE, ASSUMÉE ─────────────────────────────────────────
 * `features/privacy/ui.tsx` n'est PAS modifié par ce chantier : il appartient au
 * lot « Réglages & confidentialité », qui le videra et le fera ré-exporter d'ici.
 * Les deux versions coexistent donc quelques temps. C'est voulu : les vider en
 * parallèle depuis deux chantiers différents produirait le conflit que le
 * découpage en lots existe précisément pour éviter. Tout NOUVEL appelant utilise
 * celui-ci.
 *
 * ─── CE QUI RESTE À L'USAGE ────────────────────────────────────────────────────
 * La casse et la couleur s'appliquent ici (le rôle R1 ne les porte pas — cf. le
 * commentaire de `typography` dans design-tokens). L'espacement, lui, appartient à
 * la MISE EN PAGE de l'écran : on l'expose en prop plutôt que de l'imposer, sinon
 * chaque écran le contredirait par un style local et on retomberait dans la
 * duplication qu'on vient de supprimer.
 */
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors, typography } from '@klaim/shared';

interface SectionLabelProps {
  /** Le libellé. Il est mis en capitales par le style, pas par l'appelant :
   *  écrire « MON TERRITOIRE » en dur casserait les lecteurs d'écran, qui
   *  épellent les capitales. */
  children: string;
  /** Marges de l'écran hôte (le rythme vertical appartient à la page). */
  style?: StyleProp<TextStyle>;
}

export function SectionLabel({ children, style }: SectionLabelProps) {
  // Pas de `numberOfLines` : un libellé de section s'enroule plutôt que d'être
  // coupé — §A « aucun texte n'est jamais tronqué par une ellipse ».
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    ...typography.kicker,
    color: colors.gris,
    textTransform: 'uppercase',
  },
});
