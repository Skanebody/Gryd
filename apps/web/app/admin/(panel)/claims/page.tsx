import { getFrozenClaims } from '../../lib/demo-data';
import { ClaimsTable } from '../../components/ClaimsTable';
import ui from '../../components/ui.module.css';

/** Claims gelés (spec admin §3) : hexes, score potentiel, raison, ancienneté, action. */
export default function AdminClaimsPage() {
  const claims = getFrozenClaims();

  return (
    <div>
      <p className={ui.kicker}>WORKFLOW §6 · ÉTAPE 2</p>
      <h1 className={ui.pageTitle}>Claims gelés</h1>
      <p className={ui.pageSub}>
        Une course flaggée ne modifie pas le classement : ses claims attendent ici la
        décision de revue. Débloquer = re-jouer la décision moteur ; rejeter = aucun hex
        attribué.
      </p>
      <ClaimsTable claims={claims} />
    </div>
  );
}
