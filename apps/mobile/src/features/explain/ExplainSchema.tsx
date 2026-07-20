/**
 * GRYD — rendu d'un schéma pédagogique par `SchemaId` (§31).
 * UN seul endroit qui sait quel composant SVG correspond à quel identifiant, et
 * qui injecte les VRAIES constantes (game-rules.ts, via labels.ts) dans ceux qui
 * en portent : durées de défense, paliers verify, valeurs de zone, ligne de vie.
 * Les deux pages d'explicabilité (visite guidée « Calcul des zones » et FAQ
 * « Calculs & règles ») l'utilisent avec des largeurs différentes — avant, elles
 * dupliquaient ce switch et pouvaient diverger.
 *
 * AUCUN NOMBRE MAGIQUE ici : chaque valeur affichée passe par un helper de
 * labels.ts. Les schémas restent des composants PURS qui ne font que dessiner.
 */
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/explain';
import type { SchemaId } from './content';
import {
  defenseHoursLabels,
  verifyTiersLabel,
  zoneActionRatios,
  zoneLifecycleEntries,
  zoneLifecycleShares,
  zonePointsEntries,
} from './labels';
import {
  BonusCible,
  BoucleCollective,
  BoucleFaitLaZone,
  DefenseFrontiere,
  LeRelais,
  LigneVsBoucle,
  ValeurZone,
  VerifySchema,
  VieDeLaZone,
} from './schemas';

export function ExplainSchema({ id, width }: { id: SchemaId; width: number }) {
  const t = useT();
  switch (id) {
    case 'ligne_vs_boucle':
      return <LigneVsBoucle size={width} />;
    case 'boucle_fait_zone':
      return <BoucleFaitLaZone size={width} />;
    case 'defense_frontiere': {
      const h = defenseHoursLabels();
      return (
        <DefenseFrontiere
          size={width}
          traverseLabel={h.traverse}
          longeLabel={h.longe}
          coverLabel={h.cover}
        />
      );
    }
    case 'boucle_collective':
      return <BoucleCollective size={width} />;
    case 'bonus_cible':
      return <BonusCible size={width} />;
    case 'verify': {
      const tiers = verifyTiersLabel();
      return (
        <VerifySchema
          size={width}
          validLabel={t(C.verifyValidWithTier, { n: tiers.full })}
          excludedLabel={t(C.verifyExcludedWithTier, { n: tiers.partial })}
        />
      );
    }
    case 'valeur_zone': {
      // Points RÉELS payés par le moteur (base × coeff d'action) + longueurs
      // de barres dérivées des mêmes coefficients.
      const points = zonePointsEntries();
      return (
        <ValeurZone
          size={width}
          neutralLabel={t(points.neutral)}
          defenseLabel={t(points.defense)}
          stealLabel={t(points.steal)}
          ratios={zoneActionRatios()}
        />
      );
    }
    case 'le_relais':
      // Les parts (1, 1/2, 1/3) SONT la loi harmonique : rien à injecter.
      return <LeRelais size={width} />;
    case 'vie_de_la_zone': {
      const lifecycle = zoneLifecycleEntries();
      const shares = zoneLifecycleShares();
      return (
        <VieDeLaZone
          size={width}
          stableLabel={t(lifecycle.stable)}
          fragileLabel={t(lifecycle.fragile)}
          stableShare={shares.stable}
          defendShare={shares.defend}
        />
      );
    }
  }
}
