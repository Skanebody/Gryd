/**
 * GRYD — RunButton : CTA de lancement de course RÉUTILISABLE et INLINE.
 *
 * AMENDEMENT-17 §1.1 : ce composant ne FLOTTE plus jamais en overlay central
 * bas (« pas deux GO » ; retiré de l'overlay global du layout). Il n'est plus
 * monté dans `(tabs)/_layout`. La CARTE l'appelle DANS sa bottom sheet comme le
 * SEUL point de départ de course ; il n'y a donc qu'un GO à l'écran.
 *
 * Il reste utile (non redondant) car il encapsule TOUT le flux de départ :
 *   - TAP         départ immédiat sur le plan auto (AMENDEMENT-14 §2).
 *   - APPUI LONG  RunModeSheet : choix avancés + INTENTIONS Conquérir/Défendre
 *                 (AMENDEMENT-16 §1, client-seul) + « Planifier une boucle » +
 *                 « Changer d'itinéraire ». Ce flux long-press SURVIT ici et la
 *                 Carte le rebranche simplement en montant <RunButton />.
 *
 * Rendu : bouton plein-largeur chartreuse (InlineRunCTA). Le LIBELLÉ vient du
 * contexte (défaut « GO » ; la Carte peut passer DÉFENDRE / CONQUÉRIR / … via
 * `label`) — plus jamais un GO générique imposé par la nav.
 */
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { type RunMode } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { InlineRunCTA, type InlineRunCTASize } from '../../ui/game';
import { RunModeSheet } from '../motivation/RunModeSheet';
import { battleContext, goHref, intentionHref } from './runContext';
import type { DefenseTargetDemo, RunIntention } from '../run/intention';

export interface RunButtonProps {
  /**
   * Libellé du CTA. Défaut « GO » (départ immédiat sur le plan auto). La Carte
   * peut passer un libellé contextuel (DÉFENDRE / CONQUÉRIR / TERMINER…) tiré du
   * plan — le bouton reste le point de départ unique, seul le mot change.
   */
  label?: string;
  size?: InlineRunCTASize;
  /**
   * Ouvre directement le sélecteur d'intentions au tap au lieu du départ
   * immédiat (optionnel — la Carte reste sur le tap = départ par défaut).
   */
  tapOpensSheet?: boolean;
}

/**
 * CTA de course inline. La Carte le rend dans sa sheet ; il porte tout le flux
 * (départ immédiat + intentions long-press). Aucun positionnement absolu : il
 * s'insère dans le layout de l'appelant.
 */
export function RunButton({ label = 'GO', size = 'lg', tapOpensSheet = false }: RunButtonProps) {
  const router = useRouter();
  const [modePickerOpen, setModePickerOpen] = useState(false);

  // Plan auto dérivé des données démo (defense/conquete) — stable sur la session.
  const { mode: contextMode, plan } = useMemo(() => battleContext(), []);

  /** TAP = départ immédiat sur le plan auto (AMENDEMENT-14 §2). */
  const goNow = () => {
    if (tapOpensSheet) {
      setModePickerOpen(true);
      return;
    }
    track(EVENTS.runStart, { mode: 'conquete', context: contextMode, route: plan.routeId });
    router.push(goHref(plan));
  };

  /** Choix avancés (appui long) : mode explicite (Social Run / Course privée). */
  const startRun = (mode: RunMode) => {
    haptics.medium();
    setModePickerOpen(false);
    track(EVENTS.runStart, { mode, context: contextMode });
    router.push(mode === 'conquete' ? goHref(plan) : `/course-live?mode=${mode}`);
  };

  /**
   * Intention optionnelle (AMENDEMENT-16 §1) : Conquérir/Défendre teintent le
   * live via `intention=…` — CLIENT SEUL, jamais envoyé au serveur (le tracé
   * décide). Conquérir « courir librement » → aucune route imposée ; Défendre
   * porte l'itinéraire de la zone à protéger (doc §3.3).
   */
  const startIntention = (intention: RunIntention, routeId?: string) => {
    haptics.medium();
    setModePickerOpen(false);
    track(EVENTS.runStart, { mode: 'conquete', context: contextMode, intention });
    router.push(intentionHref(intention, routeId));
  };

  /** « Planifier une boucle » (Conquérir) → Route Planner présélectionné capture. */
  const planLoop = () => {
    setModePickerOpen(false);
    router.push('/route-planner?type=capture');
  };

  const changeRoute = () => {
    setModePickerOpen(false);
    router.push('/route-planner');
  };

  return (
    <>
      <InlineRunCTA
        label={label}
        size={size}
        onPress={goNow}
        onLongPress={() => setModePickerOpen(true)}
        accessibilityLabel={`${label} — départ immédiat. Maintiens pour les choix avancés.`}
      />
      <RunModeSheet
        visible={modePickerOpen}
        onSelect={startRun}
        onIntention={(intention) => startIntention(intention)}
        onDefenseTarget={(target: DefenseTargetDemo) => startIntention('defense', target.routeId)}
        onPlanLoop={planLoop}
        onChangeRoute={changeRoute}
        onClose={() => setModePickerOpen(false)}
      />
    </>
  );
}
