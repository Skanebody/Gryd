/**
 * GRYD — LA LECTURE QUI AFFINE L'ACCUEIL, ET QUI NE BLOQUE RIEN.
 *
 * Elle sert à DEUX choses, et à rien d'autre : distinguer un compte jamais
 * nommé (`handle_chosen_2026` faux, donc neuf) d'un habitué, et écrire son
 * @pseudo dans « Bon retour ». Elle ne DÉBLOQUE aucun accès.
 *
 * D'où un plafond de patience très court (`WELCOME_READ_TIMEOUT_MS`, 2,5 s) :
 * faire patienter quelqu'un dix secondes devant un logo pour choisir entre deux
 * félicitations serait absurde. Au-delà, on conclut sans elle — la date de
 * création du compte tranche, et le joueur entre dans l'app.
 *
 * ⚠️ `signedOut` REJOINT `reading`, ET C'EST UN CHOIX. À l'instant précis où la
 * session vient d'être posée, `useSocialRead2026` n'a pas encore vu son
 * propriétaire changer : ce n'est pas une réponse, c'est une latence. La
 * confondre avec `failed` ferait clignoter l'écran entre deux verdicts. Le
 * plafond s'en charge si ça dure.
 */
import { useEffect, useState } from 'react';
import { useMyHandleStatus2026 } from '../social/handleStatus2026Data';
import { WELCOME_READ_TIMEOUT_MS, type WelcomeRead2026 } from './welcome2026';

/**
 * @param active `false` tant qu'il n'y a pas de session : le plafond ne doit
 *               pas courir sur une attente qui n'a pas commencé.
 */
export function useWelcomeRead2026(active: boolean): WelcomeRead2026 {
  const status = useMyHandleStatus2026();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!active) { setTimedOut(false); return; }
    const timer = setTimeout(() => setTimedOut(true), WELCOME_READ_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [active]);

  if (status.status === 'ready' && status.data !== null) {
    return {
      state: 'ready',
      handle: status.data.handle,
      handleChosen: status.data.handleChosen,
    };
  }
  if (status.status === 'failed' || timedOut) return { state: 'failed' };
  return { state: 'reading' };
}
