/**
 * GRYD — « ce compte est-il habilité à modérer ? » (migration 0187).
 *
 * ── AUCUN BOUTON MORT, ET AUCUN BOUTON PEINT PAR ESPOIR ───────────────────
 * La constitution interdit les deux : un affichage se dérive de la capacité
 * RÉELLE, jamais d'un drapeau local ni d'une liste embarquée. Ce hook ne
 * connaît donc aucun modérateur ; il pose la question au serveur
 * (`am_i_moderator_2026()`, SECURITY DEFINER, qui lit `moderators_2026`) et rend
 * la réponse.
 *
 * ── TROIS ÉTATS, PAS DEUX ─────────────────────────────────────────────────
 * `null` = on ne sait pas encore (lecture en cours, hors ligne, pas connecté).
 * Il n'est PAS `false` : la différence compte à l'endroit précis où ce hook
 * sert. `false` ne se dit qu'après une réponse du serveur, et une erreur rend
 * `false` — une ligne de modération peinte « au cas où » ouvrirait un écran qui
 * refuserait ensuite, ce qui est exactement un bouton mort.
 *
 * Volontairement SANS cache : l'habilitation est rare, la question est posée à
 * l'ouverture des Réglages, et un cache local d'un droit serveur est la
 * première marche vers une UI qui croit savoir mieux que la base.
 */
import { useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';

export function useIsModerator2026(): boolean | null {
  const { session, loading, configured } = useSession();
  const [estModerateur, setEstModerateur] = useState<boolean | null>(null);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    let vivant = true;
    if (!configured || !supabase || loading || userId === null) {
      setEstModerateur(null);
      return () => {
        vivant = false;
      };
    }
    void supabase
      .rpc('am_i_moderator_2026')
      .then(({ data, error }) => {
        if (!vivant) return;
        setEstModerateur(error ? false : data === true);
      });
    return () => {
      vivant = false;
    };
  }, [configured, loading, userId]);

  return estModerateur;
}
