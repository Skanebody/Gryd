/**
 * GRYD — LA PORTE « GÉRER MON CREW », AVEC CE QUI ATTEND DERRIÈRE (lot Q4).
 *
 * ═══ POURQUOI UN COMPOSANT PLUTÔT QUE TROIS LIGNES DANS L'ÉCRAN ════════════
 * Il porte DEUX lectures serveur (`crew_join_requests`, 0083, et
 * `crew_member_board_2026`, 0189), toutes deux gatées sur des permissions
 * d'officier. Un hook ne se monte pas sous condition : les écrire dans
 * `CrewHomeScreen` aurait envoyé deux RPC de plus À CHAQUE membre simple, pour
 * recevoir deux `forbidden` et n'afficher aucune porte. Isoler le bloc, et ne
 * le monter que pour qui a la permission, est la seule façon de ne pas
 * interroger le serveur sur ce qu'on n'a pas le droit de savoir.
 *
 * ═══ LE COMPTEUR DISPARAÎT À ZÉRO ══════════════════════════════════════════
 * Aucune pastille permanente. Le sous-titre est la description de l'écran tant
 * qu'il n'y a rien à signaler ; il devient le CHIFFRE dès qu'une personne
 * attend une réponse ou qu'un membre va être retiré. Et une lecture qui n'a
 * pas abouti ne compte pour rien : `crewAlertCount2026` sépare « zéro » de
 * « je ne sais pas », et le second n'écrit aucun chiffre.
 */
import { router } from 'expo-router';
import { haptics } from '../../lib/haptics';
import { ProfileLink, useRefonteCopy } from '../refonte/ProfilePrimitives';
import { boardAlerts } from './management/crewBoard2026';
import { crewAlertCount2026 } from './management/crewAlerts2026';
import { useCrewBoard } from './management/crewManagementData';
import { useCrewJoinRequests } from './discoveryData';

export function CrewManagementShortcut2026() {
  const copy = useRefonteCopy();
  const requests = useCrewJoinRequests();
  const board = useCrewBoard();

  /*
   * `canDecide` est le seul témoin honnête de la lecture des candidatures : le
   * hook le met à `false` sur une panne comme sur un refus, et rend une liste
   * VIDE dans les deux cas. On ne compte donc que quand il vaut `true`.
   */
  const alerts = crewAlertCount2026({
    requestsKnown: requests.canDecide,
    requests: requests.requests.length,
    boardKnown: board.data !== null,
    atRisk: board.data ? boardAlerts(board.data).atRisk : 0,
  });

  const parts: string[] = [];
  if (alerts.pending > 0) {
    parts.push(
      alerts.pending > 1
        ? copy(`${alerts.pending} demandes en attente`, `${alerts.pending} pending requests`)
        : copy('1 demande en attente', '1 pending request'),
    );
  }
  if (alerts.atRisk > 0) {
    parts.push(
      alerts.atRisk > 1
        ? copy(`${alerts.atRisk} membres à risque`, `${alerts.atRisk} members at risk`)
        : copy('1 membre à risque', '1 member at risk'),
    );
  }

  const subtitle =
    parts.length > 0
      ? parts.join(' · ')
      : copy(
          'Suivi des membres, avertissements, exclusions et journal.',
          'Member board, warnings, removals and decision log.',
        );

  return (
    <ProfileLink
      tone="light"
      title={copy('Gérer mon crew', 'Manage my crew')}
      subtitle={subtitle}
      icon="crew"
      onPress={() => {
        haptics.light();
        router.push('/crew-gestion');
      }}
    />
  );
}
