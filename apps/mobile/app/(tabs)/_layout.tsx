import { useEffect, useState } from 'react';
/**
 * GRYD — layout (tabs) : BARRE D'ONGLETS BASSE PERSISTANTE custom (GrydNavBar)
 * par-dessus des Tabs expo-router dont la tab bar NATIVE est masquée.
 * EXACTEMENT 3 destinations visibles en 1 tap : Carte · Crew · Profil (spec
 * §2.1, arbitrage A2, LOT 5 — 27/07/2026). `classement` (Saison) et `warroom`
 * (Missions) restent déclarés CI-DESSOUS comme routes de ce groupe (fichiers
 * réels, titres d'onglet pour l'historique de navigation) mais ne sont RENDUS
 * par AUCUN onglet de `GrydNavBar` — ce sont des écrans entiers atteints par
 * des chemins nommés ailleurs : Saison depuis le Profil (raccourci « Saison › »
 * + lien de la section Progression, `app/(tabs)/profil.tsx`), Missions depuis
 * Aujourd'hui et Paramètres aujourd'hui (`app/aujourdhui.tsx`,
 * `app/parametres/[section].tsx`). Un accès direct à Missions depuis la Carte
 * (planche E16) reste À FAIRE — hors périmètre de ce chantier, qui ne touche
 * que la barre et le Profil.
 *
 * AVANT CE CHANTIER, la barre montrait RÉELLEMENT 4 destinations (Carte · Crew
 * · Saison · Moi) : `GrydNavBar` ajoutait Saison dès que `flags.season` valait
 * `true`, et ce drapeau vaut `true` depuis la Vague 1 (26/07/2026). Ce
 * commentaire le décrivait alors comme voulu ; ce n'était qu'un DÉFAUT de la
 * réouverture du drapeau, jamais corrigé — §2.1 est catégorique sur le nombre
 * d'onglets. Voir `src/features/nav/tabs.ts` pour la source unique, testée.
 *
 * Au CENTRE de la barre, soulevé : LE bouton d'action contextuel chartreuse
 * (AMENDEMENT-29), présent sur TOUS les onglets — « le joueur ne doit jamais
 * chercher comment courir ». Sa dérivation (deriveContextualAction : RUN par
 * défaut, DÉFENDRE/CONQUÉRIR/TERMINER selon l'écran) est portée par la barre,
 * avec un lien « Course libre » visible quand le verbe dérivé n'est pas RUN.
 *
 * Garde d'auth (règle session.tsx) : Supabase configuré + pas de session →
 * (auth)/sign-in SI l'onboarding a déjà été vu, /onboarding sinon ; non
 * configuré (O1) → mode dev, aucune redirection.
 *
 * AMENDEMENT-30 §3 — ONBOARDING SANS FRICTION : « jouer avant le compte ». Un
 * NOUVEAU visiteur voit l'ONBOARDING D'ABORD ; la porte de connexion ne
 * s'applique qu'ENSUITE. Non bloquant sans backend (`configured=false`) : on ne
 * force aucune redirection, aucune garde ne pourrait aboutir.
 *
 * ─── ORDRE DES GARDES (corrigé le 21/07/2026) ───────────────────────────────
 * L'ordre précédent était : onboarding D'ABORD, session ensuite — et le gate
 * d'onboarding ne consultait JAMAIS `session`. Un joueur DÉJÀ CONNECTÉ dont le
 * drapeau local manquait (nouveau téléphone, stockage vidé, navigation privée)
 * était donc renvoyé dans l'onboarding : le flow le rattrapait bien (son effet
 * « session ⇒ finish('/') »), mais après un aller-retour d'écrans que rien ne
 * justifiait. Le drapeau d'onboarding est du stockage LOCAL ; la session, elle,
 * est la preuve serveur qu'un compte existe.
 *
 *   UNE SESSION VALIDE VAUT ONBOARDING FAIT — elle passe donc EN PREMIER.
 *
 * Et tant que la lecture du drapeau n'a pas résolu, on ne tranche PAS (fond noir
 * muet) : l'ancien `!onboardingLoading &&` faisait TOMBER le nouveau visiteur
 * dans la branche suivante — donc vers /sign-in — pendant la lecture.
 *
 * ─── ET SI LE DRAPEAU EST ILLISIBLE ? (21/07/2026) ──────────────────────────
 * `onboardingDone: false` sorti des DÉFAUTS n'est pas une réponse (navigation
 * privée, localStorage bloqué, blob corrompu…). On ne choisit donc pas une porte
 * dessus : on envoie vers l'écran qui RE-DEMANDE. /onboarding est ce bon écran,
 * parce qu'il porte les DEUX portes — la découverte, et « J'ai déjà un compte »
 * qui mène droit à /sign-in. Re-demander ne coûte donc jamais l'accès à la
 * connexion, alors que trancher au hasard le coûterait une fois sur deux.
 *
 * ⚠️ Ce fichier ne connaît PAS le gate 16+, et c'est voulu. Faire dépendre
 * l'accès d'un drapeau d'âge stocké localement est ce qui a briqué l'app une
 * fois (cf. entête de `(auth)/sign-in.tsx`) : le gate légal vit au point de
 * CRÉATION de compte, jamais dans une garde de route.
 *
 * ─── TROISIÈME GARDE : LE PREMIER USAGE (E08 → E09 → E10 → carte) ──────────
 * Ajoutée le 27/07/2026. Une fois la session acquise, il reste une question :
 * ce compte a-t-il un profil minimal ? La réponse ne se DEVINE pas — elle se LIT
 * dans `public.user_profiles` (`features/setup/minimalProfile.ts`), et la
 * décision qu'on en tire est PURE et testée (`features/setup/firstRun.ts`).
 *
 * C'est le SEUL point de décision du parcours, délibérément. Les écrans d'auth
 * (E06 `sign-in`, E07 `email`) se contentent de rendre `<Redirect href="/" />`
 * après une authentification réussie : ils n'ont pas à savoir ce qu'il reste à
 * configurer, et deux gardes sur la même question finiraient par diverger (c'est
 * exactement ce qui est arrivé au fork onboarding/session, corrigé le 21/07).
 *
 * Trois propriétés à ne pas casser :
 *  · un échec de lecture N'EST PAS un profil absent — on n'envoie alors personne
 *    dans E08, où son propre @handle lui serait refusé (« déjà pris ») ;
 *  · pendant la lecture on ne tranche pas : on rend l'écran E00 (`SplashE00`),
 *    la même surface que le démarrage vient de montrer ;
 *  · un joueur dont le profil est LU comme présent ne retraverse JAMAIS
 *    E08/E09/E10.
 */
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors } from '@klaim/shared';
import { SplashE00 } from '../../src/features/boot/SplashE00';
import { GrydNavBar } from '../../src/features/nav/GrydNavBar';
import { SETUP_ENTRY, decideFirstRun } from '../../src/features/setup/firstRun';
import { entryDoor, type OnboardingSeen } from '../../src/mvp/onboarding/signIn';
import { readOnboardingSeen } from '../../src/mvp/onboarding/seen';
import { useMinimalProfile } from '../../src/features/setup/minimalProfile';
import { C } from '../../src/i18n/catalog/nav';
import { useT } from '../../src/i18n/store';
import { useSession } from '../../src/lib/session';

export default function TabsLayout() {
  const { session, loading, configured } = useSession();
  // Drapeau d'onboarding MVP — lu ICI plutôt que par le store legacy (ADR-001,
  // voir la garde plus bas). `reading` tant que le stockage n'a pas répondu :
  // on ne choisit pas une porte sur une valeur par défaut.
  const [mvpSeen, setMvpSeen] = useState<OnboardingSeen>('reading');
  useEffect(() => {
    let vivant = true;
    readOnboardingSeen()
      .then((v) => {
        if (vivant) setMvpSeen(v);
      })
      // `readOnboardingSeen` ne jette pas ; ce `catch` couvre l'imprévu et
      // choisit le même sens du doute — l'onboarding, jamais la connexion.
      .catch(() => {
        if (vivant) setMvpSeen('unseen');
      });
    return () => {
      vivant = false;
    };
  }, []);
  // ⚠️ Règle des hooks : déclaré AVANT tout retour anticipé. Il ne déclenche
  // aucune requête tant qu'il n'y a ni backend ni session (`shouldStartRead`).
  const minimalProfile = useMinimalProfile(session?.user?.id ?? null);
  const t = useT();

  // Restauration de session en cours : fond noir muet (splash implicite).
  if (loading) return <View style={styles.root} />;

  // Pas de session (et un backend qui rend la garde utile) : c'est LÀ, et
  // seulement là, que le drapeau local d'onboarding décide de la porte.
  // Une session existante ne consulte plus rien — voir l'entête.
  if (configured && !session) {
    // ══════════ BASCULE DE LA PORTE D'ENTRÉE — 03/08/2026 ══════════════════
    // Les écrans sans session sont désormais ceux du MVP : `/bienvenue` (les
    // deux écrans d'onboarding) puis `/connexion`. La bascule de l'ACCUEIL
    // avait eu lieu plus tôt dans la journée ; il manquait la porte.
    //
    // Le drapeau lu est CELUI DU MVP (`mvp/onboarding/seen.ts`), pas celui du
    // legacy : ce dernier vit dans un hook d'UI, et ADR-001 interdit à la
    // nouvelle UI d'en dépendre. Conséquence assumée — quelqu'un qui avait vu
    // l'ANCIEN onboarding reverra les deux écrans MVP une fois. Deux écrans,
    // une seule fois, contre une dépendance permanente vers le legacy.
    //
    // La DÉCISION est pure et testée (`entryDoor`) : lecture en cours ⇒ on
    // n'affirme rien, et un drapeau illisible envoie vers l'ONBOARDING — se
    // tromper de ce côté coûte deux écrans, l'autre sauterait la seule
    // explication du jeu.
    const porte = entryDoor(mvpSeen);
    if (porte === 'wait') return <View style={styles.root} />;
    return <Redirect href={porte === 'signIn' ? '/connexion' : '/bienvenue'} />;
  }

  // ── PORTE DU PREMIER USAGE (E08 → E09 → E10 → carte) ──────────────────────
  // Elle vient APRÈS la garde d'auth, et c'est l'ordre qui la rend juste : sans
  // session il n'y a pas de profil à lire, et l'écran de connexion doit gagner.
  //
  // Le drapeau ne se DEVINE pas, il se LIT : `useMinimalProfile` interroge
  // `user_profiles` (le juge est la table, pas le téléphone — voir l'entête de
  // `features/setup/firstRun.ts`). La décision, elle, est PURE et testée :
  // `decideFirstRun` distingue les quatre états sans jamais les confondre, et
  // en particulier n'envoie JAMAIS dans E08 sur un échec de lecture.
  //
  // C'est le SEUL point de décision du parcours. Les écrans d'auth se
  // contentent de rendre `<Redirect href="/" />` : ils n'ont pas à savoir ce
  // qu'il reste à configurer, et deux gardes sur la même question finiraient
  // par diverger.
  const firstRun = decideFirstRun({
    configured,
    hasSession: session !== null,
    profile: minimalProfile,
  });
  // Lecture EN COURS : on ne tranche pas, et on ne peint pas non plus un fond
  // noir muet. C'est la MÊME surface E00 que le démarrage vient de montrer
  // (logo, indicateur discret au-delà du seuil de la spec) : la continuité
  // visuelle est exacte, et « ça travaille » reste dit. Les fontes sont
  // forcément prêtes ici — `app/_layout.tsx` ne monte le `<Stack>` qu'après.
  if (firstRun === 'wait') return <SplashE00 logoReady />;
  if (firstRun === 'setup') return <Redirect href={SETUP_ENTRY} />;

  // ══════════ BASCULE D'ENTRÉE — 03/08/2026 (ADR-001, Phase 1 close) ════════
  // Un joueur connecté et configuré atterrit désormais sur la carte MVP, plus
  // sur les onglets legacy. C'est LA bascule : jusqu'ici les huit écrans
  // reconstruits n'étaient atteints que par URL directe, donc par personne.
  //
  // Elle est posée ICI et nulle part ailleurs parce que ce fichier est, de son
  // propre aveu, « le SEUL point de décision du parcours ». Une seconde garde
  // ailleurs finirait par diverger de celle-ci — c'est le défaut que l'entête
  // de ce fichier raconte déjà avoir payé une fois.
  //
  // ⚠️ CE QUI RESTE LEGACY, ET POURQUOI :
  //   · la CONNEXION (`/sign-in`, `/onboarding`) — le groupe `(mvp)` n'a aucun
  //     écran d'authentification, et basculer sans lui livrerait une app où un
  //     nouveau joueur ne peut jamais créer de compte ;
  //   · la PORTE d'onboarding — le drapeau `onboardingDone` vit dans un hook
  //     legacy qu'ADR-001 interdit d'importer depuis la nouvelle UI. Tant qu'un
  //     drapeau MVP ne le remplace pas, `/bienvenue` et `/position` restent
  //     atteints par URL directe.
  // Les deux sont inscrits au BACKLOG. Ce qui bascule aujourd'hui, c'est le
  // PRODUIT : carte → GO → course → résultat.
  return <Redirect href="/carte" />;

  // eslint-disable-next-line no-unreachable
  return (
    <View style={styles.root}>
      <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.hiddenTabBar }}>
        <Tabs.Screen name="index" options={{ title: t(C.tabCarte), tabBarLabel: t(C.tabCarte) }} />
        {/* HORS barre GrydNavBar (LOT 5) : Missions, atteinte depuis Aujourd'hui
            et Paramètres — pas encore depuis la Carte (E16, hors périmètre). */}
        <Tabs.Screen
          name="warroom"
          options={{ title: t(C.tabMissions), tabBarLabel: t(C.tabMissions) }}
        />
        {/* « Crew » = invariant produit (jamais traduit). */}
        <Tabs.Screen name="crew" options={{ title: 'Crew', tabBarLabel: 'Crew' }} />
        {/* HORS barre GrydNavBar (LOT 5, 27/07/2026) : Saison, atteinte depuis le
            Profil (raccourci « Saison › » + lien Progression). Route + titre
            d'onglet restent déclarés ici — seule sa présence dans LA BARRE a
            disparu, cf. `src/features/nav/tabs.ts`. */}
        <Tabs.Screen
          name="classement"
          options={{ title: t(C.tabSaison), tabBarLabel: t(C.tabSaison) }}
        />
        <Tabs.Screen name="profil" options={{ title: t(C.tabMoi), tabBarLabel: t(C.tabMoi) }} />
      </Tabs>
      {/* Barre d'onglets persistante — EXACTEMENT 3 (Carte · Crew · Profil). */}
      <GrydNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  hiddenTabBar: { display: 'none' },
});
