/**
 * GRYD — Map3DToggle (AMENDEMENT-26). Le contrôle 2D/3D UNIQUE, réutilisé par
 * TOUTES les surfaces de carte (Battle Map, Course Live, Mon Territoire,
 * Historique). Un petit segmented léger « 2D | 3D » — pas un nouveau FAB
 * permanent qui ferait un cockpit : sur la Battle Map il vit dans le menu
 * Calques à côté du fond dark/couleur (AMENDEMENT-22 : le toggle vit avec les
 * contrôles d'apparence de carte).
 *
 * Règle de profondeur (AMENDEMENT-22) : le groupe = UNE surface N1, l'item actif
 * = N2 relevé + filet chartreuse DISCRET (jamais de texte chartreuse sur clair —
 * charte : le label reste blanc/gris, le filet chartreuse ne porte pas de
 * texte). Un seul focus chartreuse fort par scène : ce toggle est volontairement
 * en `tone` sobre (le gros CTA chartreuse de l'écran reste le seul accent plein).
 *
 * Câblage : par DÉFAUT branché sur la préférence partagée `gryd.map3d` (mapPref
 * — `useMap3d`) : lit la valeur, la bascule, la persiste, et toutes les surfaces
 * se re-rendent ensemble. Une surface qui détient déjà la préf peut piloter le
 * toggle en CONTRÔLÉ via `value` + `onChange`. haptics.light au change ; bascule
 * instantanée (le passage 2D↔3D est un snap doux géré par RealMap — reduce
 * motion respecté côté carte, rien à animer ici). Libellés COURTS « 2D »/« 3D »,
 * jamais tronqués (numberOfLines=1, sans ellipsize). Pur affichage — zéro impact
 * gameplay (le serveur décide du claim).
 */
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { borderState, colors, elevation, fontSizes, radii } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { useMap3d } from '../../features/map/mapPref';

/** Libellés courts, jamais tronqués (charte pet peeve : on ne coupe pas). */
const LABEL_2D = '2D';
const LABEL_3D = '3D';

export interface Map3DToggleProps {
  /**
   * Vue courante en mode CONTRÔLÉ (true = 3D). Fournir `value` + `onChange` pour
   * piloter le toggle depuis une surface qui détient déjà `useMap3d`. Omis : le
   * toggle est AUTONOME et se branche seul sur la préférence `gryd.map3d`.
   */
  value?: boolean;
  /** Appelé au tap de l'autre segment (mode contrôlé). Jamais si déjà actif. */
  onChange?: (map3d: boolean) => void;
  /**
   * Libellé d'accessibilité du GROUPE. Défaut « Vue de la carte ». Les deux
   * segments annoncent « 2D » / « 3D » (label + rôle tab + état sélectionné).
   */
  accessibilityLabel?: string;
  style?: ViewStyle;
  /** testID transmis au conteneur (vérif preview). */
  testID?: string;
}

/**
 * Contrôle 2D/3D. AUTONOME (branché sur `gryd.map3d`) si `value`/`onChange` sont
 * omis, CONTRÔLÉ sinon. Deux pastilles à largeur égale dans un seul container.
 */
export function Map3DToggle({
  value,
  onChange,
  accessibilityLabel = 'Vue de la carte',
  style,
  testID,
}: Map3DToggleProps) {
  // Fallback autonome sur la préférence partagée : les hooks sont appelés
  // inconditionnellement (règle des hooks) ; on n'UTILISE la préf que si le
  // parent ne pilote pas (value/onChange absents).
  const pref = useMap3d();
  const controlled = value !== undefined && onChange !== undefined;
  const current = controlled ? value : pref.map3d;

  const pick = (next: boolean) => {
    if (next === current) return;
    haptics.light();
    if (controlled) onChange?.(next);
    else pref.setMap3d(next);
  };

  const renderSegment = (segmentValue: boolean, label: string) => {
    const on = segmentValue === current;
    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={label}
        onPress={() => pick(segmentValue)}
        style={({ pressed }) => [
          styles.item,
          on && styles.itemOn,
          pressed && !on && styles.pressed,
        ]}
      >
        {/* numberOfLines=1 SANS ellipsize : libellés « 2D »/« 3D » calibrés
            courts — jamais coupés. */}
        <Text
          style={[styles.label, { color: on ? colors.blanc : colors.gris }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.group, style]}
      testID={testID}
    >
      {renderSegment(false, LABEL_2D)}
      {renderSegment(true, LABEL_3D)}
    </View>
  );
}

const styles = StyleSheet.create({
  // Container = LA surface N1 du groupe (une seule pour les deux segments) —
  // compacte (le toggle est discret, il vit à côté du fond de carte).
  group: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: elevation.surface,
    borderRadius: radii.pill,
    padding: 3,
    gap: 3,
  },
  item: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
  },
  // Actif : N2 relevé + filet chartreuse DISCRET (focus léger, pas d'aplat
  // chartreuse plein — un seul accent fort par scène, AMENDEMENT-22 §3). Le
  // label reste blanc : jamais de texte chartreuse (charte contraste).
  itemOn: {
    backgroundColor: elevation.raised,
    borderWidth: 1,
    borderColor: borderState.activeSoft,
  },
  label: { fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.3 },
  pressed: { opacity: 0.6 },
});
