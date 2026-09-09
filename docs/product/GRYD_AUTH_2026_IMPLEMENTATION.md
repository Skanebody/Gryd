# Auth GRYD 2026 — implémentation et capacités

État vérifié le 9 septembre 2026. Cette note décrit ce que le binaire sait réellement faire ; elle ne présume aucune configuration distante.

## Parcours livré

- `/sign-in` partage désormais la même composition sur iOS, Android et web : identité GRYD noire, blanche et chartreuse, motif de boucle original, panneau en verre sombre et contenu compact.
- `Continuer sans compte` reste visible. Il marque l'exploration pour la session et le stockage local, puis ouvre la carte. Une première sortie n'attend ni compte, ni profil, ni ville, ni Crew, ni permission préparatoire.
- La déclaration d'âge reste placée immédiatement avant une tentative susceptible de créer un compte. Elle ne bloque jamais l'exploration invitée.
- Apple n'apparaît qu'après `AppleAuthentication.isAvailableAsync()`. Google n'apparaît que si l'identifiant OAuth de la plateforme courante existe.
- L'e-mail utilise le mode réellement déclaré par le build. Le défaut est `link`; le mode `code` ne s'active qu'avec `EXPO_PUBLIC_EMAIL_AUTH_MODE=code`.
- `/callback` traite les retours Supabase PKCE (`code`) et implicites (`access_token` + `refresh_token`), établit une vraie session et rejette un retour incomplet. Aucun jeton n'est journalisé.
- Les activités locales en attente ne sont ni supprimées ni transformées par l'auth. Le propriétaire courant continue d'être changé uniquement par le `SessionProvider` après une vraie session Supabase.

## Configuration constatée sans lecture des valeurs

| Capacité | État local constaté | Comportement UI |
| --- | --- | --- |
| Supabase URL + clé publique | présentes dans `apps/mobile/.env` | auth réelle disponible |
| Apple natif | plugin Expo présent ; entitlement/appareil sondés à l'exécution | bouton seulement si la sonde réussit |
| Apple côté Supabase | invérifiable depuis le client | une erreur d'échange reste visible et récupérable |
| Google iOS | variable absente | bouton masqué |
| Google Android | variable absente | bouton masqué |
| Google web | aucun flux web configuré | bouton masqué |
| E-mail | mode non déclaré, donc `link` | lien avec retour `gryd://callback` ou `/callback` |
| OTP à six chiffres | code client prêt, template distant non prouvé | masqué tant que le mode `code` n'est pas déclaré |

Pour activer l'OTP, les templates Supabase `confirmation` **et** `magic_link` doivent contenir `{{ .Token }}`, puis le build doit définir `EXPO_PUBLIC_EMAIL_AUTH_MODE=code`. Supabase envoie `confirmation` à une adresse nouvelle ou non confirmée, et `magic_link` à un utilisateur confirmé. Configurer un seul des deux ferait donc fonctionner soit l'inscription, soit le retour d'un compte existant, jamais les deux. Définir seulement la variable client sans changer les templates afficherait une saisie de code que l'e-mail ne fournit pas.

Le template prêt à versionner est `supabase/templates/magic_link_otp.html`. Les deux blocs locaux `confirmation` et `magic_link` correspondants sont commentés dans `supabase/config.toml` : aucun e-mail ni réglage hébergé n'a été modifié. L'activation doit être atomique avec le mode du client. Changer les templates vers `{{ .Token }}` tandis que d'anciens builds attendent `{{ .ConfirmationURL }}` leur ferait annoncer un lien absent. Il faut donc publier un client compatible avant le basculement, ou conserver temporairement les deux instructions dans l'e-mail pendant la transition.

Recette d'activation obligatoire : demander un code avec une adresse jamais vue et vérifier la création de session, puis se déconnecter et demander un code avec ce même compte confirmé. Les deux parcours doivent aboutir par `verifyOtp({ type: 'email' })` avant de déclarer le mode `code` disponible.

Les URL `gryd://callback` et les origines web déployées doivent figurer dans la liste des URL de redirection Supabase. Le scheme `gryd` est déjà déclaré dans `app.json`.

## Setup progressif

La navigation principale ne lit plus `user_profiles` comme garde. Les routes `/setup/profile`, `/setup/activity` et `/setup/permissions` restent disponibles séparément ; chacune revient directement à la carte. Une erreur de lecture du profil reste `unknown` et ne devient jamais une absence de profil.

## Sources primaires

- [Supabase — Passwordless email logins](https://supabase.com/docs/guides/auth/auth-email-passwordless) : le même `signInWithOtp` sert lien ou OTP, selon le template ; `verifyOtp` valide le code.
- [Supabase — Email templates](https://supabase.com/docs/guides/auth/auth-email-templates) : `{{ .ConfirmationURL }}` produit le lien et `{{ .Token }}` le code ; les scanners d'e-mail peuvent préouvrir un lien.
- [Supabase — Local email templates](https://supabase.com/docs/guides/local-development/customizing-email-templates) : le CLI lit `auth.email.template.magic_link` et son `content_path` depuis `config.toml`.
- [Supabase Auth — implémentation officielle du magic link](https://github.com/supabase/auth/blob/master/internal/api/magic_link.go#L77-L119) : une adresse nouvelle ou non confirmée suit la branche d'inscription/confirmation ; un utilisateur confirmé suit la branche magic link.
- [Supabase — Native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) et [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) : scheme mobile et URL de retour doivent être déclarés et autorisés.
- [Supabase — Google auth](https://supabase.com/docs/guides/auth/social-login/auth-google) : le fournisseur et ses clients OAuth doivent être configurés avant d'exposer l'action.
- [Expo — AppleAuthentication](https://docs.expo.dev/versions/v54.0.0/sdk/apple-authentication/) : disponibilité iOS sondable et échange via identity token.

## Revue finale d’intégration

Le callback utilise `useLinkingURL()` pour les liens reçus quand l’application est déjà ouverte. Une génération active interdit la navigation tardive après sortie de l’écran ; les retours sur la même URL partagent la même promesse d’échange. Sans URL, l’écran reste récupérable. La détection automatique du SDK est désactivée uniquement sur `/callback` dans le navigateur, car cette page échange déjà explicitement le code à usage unique ; elle reste disponible sur les anciens chemins web. Ce comportement est vérifié dans les sources installées d’Expo Linking et de Supabase Auth JS et par les tests de routage/parser. Une recette avec les fournisseurs réellement configurés reste nécessaire.

Le titre de connexion/e-mail est de 28 px, le G chartreuse de 24 px sur toute la séquence et les boutons de 48 px. Le retour e-mail affiche « Retour » dans une cible de 44 px et conserve son intitulé accessible complet. La photo originale est recadrée dans la connexion. Le texte invité décrit une conservation privée et un rattachement ultérieur choisi, sans annoncer une synchronisation automatique.
