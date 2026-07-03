import { getPlayers } from '../../lib/demo-data';
import { PlayersTable } from '../../components/PlayersTable';
import ui from '../../components/ui.module.css';

/** Joueurs à risque (spec admin §3) + sanctions progressives §7 en menu. */
export default function AdminPlayersPage() {
  const players = getPlayers();

  return (
    <div>
      <p className={ui.kicker}>ANTI-TRICHE · SANCTIONS §7</p>
      <h1 className={ui.pageTitle}>Joueurs à risque</h1>
      <p className={ui.pageSub}>
        Risk score, runs flaggés, traces répétées, intégrité device. Les sanctions sont
        progressives — jamais de ban définitif sans historique ou fraude évidente.
      </p>
      <PlayersTable players={players} />
    </div>
  );
}
