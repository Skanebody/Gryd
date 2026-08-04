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
      // LA PHOTO DU FONDATEUR, conservée telle quelle (`assets/onboarding/`).
      // Elle répond à L9 mieux qu'un objet abstrait : elle dit CE QUE C'EST —
      // des gens qui courent en ville — en une demi-seconde, avant toute
      // demande. `TerritoryMark` reste sur l'écran SUIVANT, où il dit ce que la
      // position va dessiner : les superposer les affaiblirait toutes les deux.
      photo={require('../../assets/onboarding/e01-crew.jpg')}
      title={t(C.obTitle)}
      body={t(C.obBody)}
      cta={{
        // `/position` et non `/(mvp)/position` : les groupes expo-router sont
        // transparents, les deux formes mènent au même écran — mais l'audit de
        // routes ne reconnaît que la seconde comme une PORTE. Écrire la forme
        // longue rendait `/position` orpheline aux yeux du script, ce qui
        // l'obligeait à vivre dans `KNOWN_ORPHANS` alors qu'elle était liée.
        // Tout le reste du groupe navigue déjà sans le préfixe.
        label: t(C.obCta),
        onPress: () => router.push('/position'),
      }}
    />
  );
}
