import { Simulator } from '../../components/Simulator';
import ui from '../../components/ui.module.css';

/** Simulateur : trace synthétique → VRAI moteur @klaim/engine → carte + célébration. */
export default function AdminSimulatorPage() {
  return (
    <div>
      <p className={ui.kicker}>MOTEUR @KLAIM/ENGINE · §3.1-§3.4</p>
      <h1 className={ui.pageTitle}>Simulateur de course</h1>
      <p className={ui.pageSub}>
        Génère une trace GPS synthétique et la passe dans le vrai moteur de jeu
        (filterPoints → validateRun → claimableSegments → hexesForSegments →
        decideClaims → scoring). Aucune règle réimplémentée : ce que tu vois est ce que
        l&rsquo;app décidera.
      </p>
      <Simulator />
    </div>
  );
}
