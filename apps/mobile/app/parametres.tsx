/**
 * GRYD — PARAMÈTRES (écran poussé depuis le Profil).
 *
 * ─── ORDRE DE COMPOSITION ─────────────────────────────────────────────────────
 *   1. En-tête `StackScreen` : retour + kicker mono gris + titre display ;
 *   2. TROIS groupes, chacun ouvert par un `SectionLabel` (kicker canonique) ;
 *   3. Dans chaque groupe, des `ListRow` — plaque d'icône, libellé, sous-libellé,
 *      chevron — séparées par l'ESPACE, jamais par un cadre.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ─────────────────────────────────────────
 * · LE COMPOSANT `Row` LOCAL. Il dupliquait `src/ui/ListRow` au pixel près
 *   (même géométrie, même carré d'icône 36, même chevron gris) avec ses propres
 *   styles — donc sa propre dérive à la prochaine retouche. La primitive existe :
 *   on l'utilise.
 * · LES QUINZE CADRES PERMANENTS. Chaque ligne portait `borderWidth: 1` : quand
 *   tout est encadré, un cadre ne signale plus rien (règle 80/20, `Card.tsx`).
 *   `ListRow` pose une surface N1 sans contour, séparée par la marge.
 * · LES DEUX `numberOfLines={1}` NUS sur le libellé et le détail. En allemand
 *   comme en portugais, « Verbundene Quellen » et son sous-titre dépassent
 *   375 px : RN coupait en `tail`, donc « … ». `ListRow` laisse les deux
 *   s'enrouler (règle 9).
 * · LES QUATRE BLOCS DE LISTE ÉCRITS À LA MAIN (parcours, explicabilité, langue
 *   ajoutés hors du catalogue). Ils fabriquaient trois sur-titres de plus pour
 *   trois lignes. Tout vit maintenant dans `SETTINGS_GROUPS`, seule source.
 * · LES STYLES TYPO LOCAUX (`fontSize` + `fontWeight` sans `fontFamily`, donc la
 *   fonte SYSTÈME au lieu d'Inter). `ListRow` et `SectionLabel` portent les rôles.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ──────────────────────────────────────────────
 * · Pas de photo ni de bloc d'identité en tête : l'identité vit dans le Profil,
 *   et la relire ici demanderait une seconde lecture de session pour un écran
 *   qui n'est que de la navigation.
 * · Aucun des QUATRE états n'est rendu ici, et c'est délibéré : cet écran ne
 *   fait AUCUNE lecture réseau. Il n'affiche que des routes qui existent —
 *   il ne peut donc être ni vide, ni en échec, ni en cours de lecture.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SETTINGS_GROUPS, type SettingsRow } from '../src/features/settings/sections';
import { C } from '../src/i18n/catalog/reglages';
import { useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { ListRow } from '../src/ui/ListRow';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';

/** Cible d'une ligne : sous-page interne, ou route existante. */
function pushRow(row: SettingsRow): void {
  if (row.section !== undefined) router.push(`/parametres/${row.section}`);
  else if (row.href !== undefined) router.push(row.href);
}

export default function ParametresScreen() {
  const t = useT();
  useEffect(() => {
    screen('parametres');
  }, []);

  return (
    <StackScreen title={t(C.paramsTitle)} icon="reglages" kicker={t(C.paramsKicker)}>
      {SETTINGS_GROUPS.map((group) => (
        <View key={group.id}>
          <SectionLabel style={styles.kicker}>{t(group.label)}</SectionLabel>
          {group.rows.map((row) => (
            <ListRow
              key={row.section ?? row.href}
              icon={row.icon}
              label={t(row.label)}
              sublabel={t(row.detail)}
              chevron
              onPress={() => pushRow(row)}
            />
          ))}
        </View>
      ))}
    </StackScreen>
  );
}

/** Rythme vertical d'un sur-titre de section : il appartient à la PAGE
 *  (`SectionLabel` n'impose aucune marge), et il est le MÊME sur tous les écrans
 *  de réglages pour qu'ils se lisent comme un seul écran. */
const KICKER_TOP = 24;
const KICKER_BOTTOM = 10;

const styles = StyleSheet.create({
  kicker: { marginTop: KICKER_TOP, marginBottom: KICKER_BOTTOM },
});
