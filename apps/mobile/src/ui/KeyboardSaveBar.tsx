/**
 * GRYD — BARRE « SAUVEGARDER / ANNULER » QUI SUIT LE CLAVIER.
 *
 * Retour terrain 20/07 (fondateur, sur son iPhone) : « quand on a tapé du texte
 * et fait les modifications, le bouton de sauvegarde n'apparaît plus et est
 * caché par le clavier. Il doit y avoir le même problème quand on crée ou
 * modifie le crew ou sûrement à d'autres endroits ».
 *
 * C'était un bug SYSTÉMIQUE : les 8 écrans à saisie posaient leur CTA en BAS du
 * contenu scrollable ; dès que le clavier s'ouvre il recouvre le bas de l'écran,
 * et le joueur ne peut plus valider ce qu'il vient d'écrire. Une modification
 * saisie mais impossible à enregistrer, c'est une modification perdue — même
 * famille de faute que « aucun run perdu ».
 *
 * LA RÈGLE ICI : la barre n'existe QUE s'il y a quelque chose à sauvegarder
 * (`visible` = formulaire modifié). Elle n'occupe donc RIEN tant qu'on lit, et
 * devient impossible à manquer dès qu'on écrit — elle monte avec le clavier et
 * reste posée au-dessus de lui.
 *
 * §A : un seul CTA chartreuse (Sauvegarder) ; Annuler est une action ghost, pas
 * une seconde couleur. Aucun texte tronqué (labels courts, 5 langues).
 *
 * Pourquoi PAS KeyboardAvoidingView : il pousse tout l'écran (le contenu saute,
 * les champs du haut sortent de vue). Ici on lit la HAUTEUR du clavier et on
 * pose la barre juste au-dessus — le contenu ne bouge pas.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  View,
  type KeyboardEvent,
} from 'react-native';
import { colors, radii } from '@klaim/shared';
import { Button } from './Button';
import { C } from '../i18n/catalog/nav';
import { useT } from '../i18n/store';

export interface KeyboardSaveBarProps {
  /** Le formulaire est-il MODIFIÉ ? Faux ⇒ la barre n'est pas rendue du tout. */
  visible: boolean;
  onSave: () => void;
  /** Annuler : rétablit les valeurs d'origine (l'écran décide quoi faire). */
  onCancel: () => void;
  /** Sauvegarde impossible (validation en échec) : CTA grisé, barre visible. */
  saveDisabled?: boolean;
  /** Libellé du CTA si l'écran veut être plus précis (« Créer le crew »). */
  saveLabel?: string;
}

/** Hauteur réelle du clavier (0 = fermé). iOS anime, Android bascule. */
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    // iOS : `Will` (avant l'animation) → la barre monte AVEC le clavier, pas
    // après lui. Android n'émet que `Did`.
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => setHeight(e.endCoordinates?.height ?? 0);
    const onHide = () => setHeight(0);
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);
  return height;
}

export function KeyboardSaveBar({
  visible,
  onSave,
  onCancel,
  saveDisabled = false,
  saveLabel,
}: KeyboardSaveBarProps) {
  const t = useT();
  const keyboardHeight = useKeyboardHeight();
  // Apparition douce : la barre surgit sous les doigts, un saut sec ferait
  // rater le premier tap.
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: visible ? 1 : 0,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [visible, fade]);

  // La barre n'existe QUE clavier ouvert. C'est le seul moment où le CTA de
  // pied de page est inatteignable — et donc le seul où un second bouton se
  // justifie. Clavier fermé, le CTA de pied reprend son rôle : à tout instant
  // il y a EXACTEMENT UN bouton chartreuse à l'écran (§A : 1 CTA max). Sans
  // cette condition, formulaire modifié + scroll en bas affichait deux boutons
  // pleins faisant la même chose (relevé par la vérification adversariale).
  if (!visible || keyboardHeight === 0) return null;

  return (
    <Animated.View
      style={[styles.wrap, { bottom: keyboardHeight, opacity: fade }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {/* La barre DIT ce qu'elle propose (demande fondateur) — deux boutons
            nus laisseraient deviner ce qu'on est en train de valider. */}
        <Text style={styles.question} numberOfLines={1} adjustsFontSizeToFit>
          {t(C.saveBarQuestion)}
        </Text>
        <View style={styles.actions}>
          <Button variant="ghost" size="md" label={t(C.saveBarCancel)} onPress={onCancel} />
          <View style={styles.cta}>
            <Button
              label={saveLabel ?? t(C.saveBarSave)}
              onPress={onSave}
              disabled={saveDisabled}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
  },
  bar: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grisLigne,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  question: {
    color: colors.blanc,
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  /** Le CTA prend la place restante : cible large, label jamais coupé. */
  cta: { flex: 1 },
});
