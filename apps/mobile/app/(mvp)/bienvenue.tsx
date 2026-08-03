/**
 * GRYD — ONBOARDING 1/2 : le jeu en une phrase (lot M2).
 *
 * ─── DEUX ÉCRANS, PAS TROIS ─────────────────────────────────────────────────
 * L9 pose un PLAFOND (« ≤ 3 écrans avant la carte »), pas un objectif. La 2ᵉ
 * vérité du MASTER impose que chaque écran justifie son existence, et le jeu
 * tient en une phrase : « tu cours, ta trace dessine une ligne, si elle se
 * referme l'intérieur est à toi ». Un troisième écran n'aurait ajouté qu'un tap
 * entre l'installation et la carte — sur la métrique qui compte (1ʳᵉ capture
 * < 48 h), c'est une perte sèche.
 *
 * L10 — rien d'autre n'est expliqué. Ni le decay, ni le bouclier, ni le crew :
 * chacun s'expliquera au moment où il sert. Un tutoriel exhaustif est un
 * tutoriel oublié.
 */
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Stage } from '../../src/mvp/ui/Stage';
import { TerritoryMark } from '../../src/mvp/ui/TerritoryMark';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';

export default function Bienvenue() {
  const t = useT();
  useEffect(() => {
    screen('onboarding_started');
  }, []);
  return (
    <Stage
      title={t(C.obTitle)}
      body={t(C.obBody)}
      visual={<TerritoryMark />}
      cta={{ label: t(C.obCta), onPress: () => router.push('/(mvp)/position') }}
    />
  );
}
