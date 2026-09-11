# Gabarits d'e-mail d'authentification GRYD (septembre 2026)

Les six e-mails que Supabase Auth envoie au joueur. Ces fichiers sont la **source
de vérité** : le tableau de bord Supabase ne l'est pas. Ce qu'on tape à la main
dans l'interface disparaît du dépôt, et plus personne ne sait ce qui est parti au
joueur. On édite les fichiers, on relance le script.

## Fichiers et champs d'API

| Fichier | Gabarit Supabase | Champ objet | Champ contenu |
| --- | --- | --- | --- |
| `confirmation.html` | Confirm signup (compte NEUF) | `mailer_subjects_confirmation` | `mailer_templates_confirmation_content` |
| `magic-link.html` | Magic Link (compte existant) | `mailer_subjects_magic_link` | `mailer_templates_magic_link_content` |
| `recovery.html` | Reset password | `mailer_subjects_recovery` | `mailer_templates_recovery_content` |
| `email-change.html` | Change email | `mailer_subjects_email_change` | `mailer_templates_email_change_content` |
| `invite.html` | Invite user | `mailer_subjects_invite` | `mailer_templates_invite_content` |
| `reauthentication.html` | Reauthentication | `mailer_subjects_reauthentication` | `mailer_templates_reauthentication_content` |

Les six objets vivent dans `subjects.json` (une seule source, lue par le script).

## Ré-appliquer

```sh
set -a && . ./scratchpad-secrets.local && set +a   # apporte SUPABASE_ACCESS_TOKEN
node scripts/apply-auth-email-templates.mjs --dry-run   # ce qui diffère, sans écrire
node scripts/apply-auth-email-templates.mjs             # PATCH puis RELECTURE par GET
node scripts/apply-auth-email-templates.mjs --verify     # relit seulement, sort 1 si ça diffère
```

Le jeton vient de l'environnement, **jamais** d'un fichier versionné. Le script
relit la configuration après le `PATCH` et compare octet à octet : un `HTTP 200`
ne prouve pas que le contenu est enregistré, seul le contenu relu le prouve.

Projet par défaut `sydwxwwirinjoheeodcg` ; surchargeable par `SUPABASE_PROJECT_REF`.

## Ce qui a été décidé, et pourquoi

### Le lien PORTE LE NONCE DE REMISE (E5, 12/09/2026)

Décision du fondateur, mot pour mot : « vas juste vers une page qui dit que ça a été bien
validé mais derrière il faut que le compte fonctionne dans l'application ».

`confirmation.html` et `magic-link.html` rendent désormais :

```
{{ if .RedirectTo }}{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=signup{{ else }}{{ .SiteURL }}/callback?token_hash={{ .TokenHash }}&amp;type=signup{{ end }}
```

(et `type=magiclink` pour l'autre), trois fois chacun : bouton, lien de secours, texte visible.

**Ce que ça change.** L'app écrit maintenant un NONCE dans sa propre demande de lien
(`emailRedirectTo: https://gryd.run/callback?n=<64 hex>`, `apps/mobile/src/lib/auth.ts`).
`{{ .RedirectTo }}` est la variable GoTrue qui porte cette adresse — la doc Supabase :
« Contains the redirect URL passed when signUp, signInWithOtp… is called ». Le gabarit y
accroche le haché et le type. La page `gryd.run/callback` peut alors vérifier le lien ET
déposer sa session pour l'app (migration `0198_auth_handoff_2026.sql`), au lieu de dépendre
du lien universel — qui exige une capacité Apple absente du profil de signature aujourd'hui
(build `fe030292` ERRORED).

**Pourquoi un `{{ if }}`.** `RedirectTo` peut être VIDE : un lien demandé sans redirection
(renvoi depuis le tableau de bord, appel d'administration). `{{ .RedirectTo }}` seul
produirait alors un `href` commençant par `&token_hash=…`, c'est-à-dire un lien relatif
cassé. Le repli rend exactement le lien E4, qui fonctionne encore.

**Pourquoi l'URL est recopiée EN ENTIER dans chaque branche**, au lieu de factoriser
(`{{ if }}…{{ else }}…{{ end }}token_hash=…`). GoTrue rend ses gabarits avec `html/template`
(Go, `internal/mailer/templatemailer/template.go`), qui analyse le CONTEXTE d'une URL et
choisit son échappement en conséquence :

- une action au DÉBUT d'un `href` est passée à `urlfilter` + `urlnormalizer` : `:`, `/`, `?`,
  `&` et `=` sont **conservés**. C'est pourquoi `{{ .RedirectTo }}` — qui est une URL
  complète avec sa query — doit être en première position, et n'est **pas** ré-encodée ;
- une action APRÈS un `?` est passée à `urlescaper`, qui percent-encode tout. `{{ .TokenHash }}`
  n'en souffre pas (hexadécimal), une URL entière, si.

Les deux branches se terminent donc dans deux parties d'URL différentes (avant la query pour
l'une, dedans pour l'autre). Go « joint » ces deux contextes en un contexte **ambigu** : une
action placée après le `{{ end }}` ferait alors échouer le rendu — donc l'envoi de l'e-mail.
Tant qu'aucune action ne suit le `{{ end }}`, rien n'est ambigu. `apps/mobile/src/lib/links.test.ts`
verrouille les deux points : la forme complète, et l'absence d'action après le `{{ end }}`.

**Ce qui n'a PAS pu être prouvé sans appareil.** L'envoi réel d'un lien magique
(`POST /auth/v1/otp`, `create_user:false`) rend HTTP 200 : `magic-link.html` s'est donc rendu
sans erreur de gabarit. `confirmation.html` ne peut pas être éprouvé de la même façon sans
CRÉER un compte en production, ce que le projet interdit. Son expression de lien est
**structurellement identique** (seul `signup` remplace `magiclink`), et l'analyse de contexte
de Go ne dépend pas de ce littéral : la preuve de l'une porte sur l'autre.

### Le lien ouvre l'app DIRECTEMENT (E4, 12/09/2026)

`confirmation.html` et `magic-link.html` ne rendent plus `{{ .ConfirmationURL }}`.
Leur bouton et leur lien de secours pointent sur `/callback`, sans redirection intermédiaire
(depuis E5, par `{{ .RedirectTo }}` — voir ci-dessus ; le repli garde la forme d'origine) :

```
{{ .SiteURL }}/callback?token_hash={{ .TokenHash }}&amp;type=signup      (confirmation)
{{ .SiteURL }}/callback?token_hash={{ .TokenHash }}&amp;type=magiclink   (magic link)
```

**Le défaut.** `{{ .ConfirmationURL }}` rend `https://<projet>.supabase.co/auth/v1/verify?
token=…&type=…&redirect_to=https://gryd.run/callback` : GoTrue vérifie, puis répond **302**
vers `gryd.run/callback#access_token=…`. Ça marche, et c'est pourtant un demi-échec :
**iOS ne remet pas un lien universel à l'app au bout d'une chaîne de redirections.** Safari
qui suit un 302 garde la main. Le joueur voyait donc toujours la page web, et devait appuyer
sur « Ouvrir GRYD » — un geste de plus à l'endroit le plus fragile du produit.

**Le correctif.** Le gabarit écrit l'adresse FINALE lui-même. C'est un lien universel de
première main : iOS le remet à l'app, qui échange le haché contre une session par
`supabase.auth.verifyOtp({ token_hash, type })` (`apps/mobile/src/lib/auth.ts`). Sans l'app,
le navigateur ouvre `gryd.run/callback`, qui **ne vérifie rien** et tend le bouton
`gryd://callback?token_hash=…` : un haché ne sert qu'UNE fois, et le consommer côté web le
rendrait mort pour l'app — c'est-à-dire recréer le défaut à un pas de distance.

`{{ .SiteURL }}` vaut `https://gryd.run` (sans slash final) — vérifié par
`GET /v1/projects/<ref>/config/auth`. Le `&amp;` est l'échappement HTML normal d'un `&` dans
un attribut ; le client mail le rend en `&`. Le test
`apps/mobile/src/lib/links.test.ts` relit ces deux fichiers et échoue si l'adresse change.

**Les trois gabarits DORMANTS gardent `{{ .ConfirmationURL }}`**, et chacun pour une raison
qui lui est propre. Aucun n'est déclenché par le moindre chemin de l'app (`grep` ne trouve ni
`resetPasswordForEmail`, ni `updateUser`, ni `inviteUserByEmail`) :

- **`recovery.html`** — un `verifyOtp({ type: 'recovery' })` émet `PASSWORD_RECOVERY` et non
  `SIGNED_IN`. Or `src/lib/session.tsx` n'annule la suppression de compte programmée (0046)
  que sur `SIGNED_IN` : basculer ce gabarit sans toucher à ce listener introduirait une
  régression silencieuse sur un flux que personne n'utilise. À faire ensemble, le jour où un
  écran déclenchera vraiment une récupération.
- **`email-change.html`** — `mailer_secure_email_change_enabled = true` : le message part sur
  les DEUX adresses et il faut DEUX confirmations. La première vérification ne rend pas de
  session, `verifyOtp` la remonterait en erreur, et l'app dirait « ce lien n'est plus
  valide » à quelqu'un qui vient de faire exactement ce qu'on lui demandait. La redirection
  de GoTrue, elle, gère la danse à deux temps.
- **`invite.html`** — déclenché seulement depuis le tableau de bord Supabase, et l'app n'a
  aucun écran d'invitation. Rien à gagner, une adresse de plus à tenir.

`reauthentication.html` n'a jamais porté de lien (c'est un code par construction).


**Aucun code à six chiffres dans l'e-mail d'inscription ni dans le lien magique.**
`apps/mobile/src/lib/auth.ts` expose `EMAIL_DELIVERY = emailDelivery2026(process.env…, false)` :
le second argument est `false` **en dur**, donc la valeur est toujours `'link'`,
donc l'écran `app/(auth)/email.tsx` n'atteint jamais son étape `'code'` et
**n'affiche aucun champ de saisie**. Imprimer `{{ .Token }}` dans l'e-mail
enverrait le joueur chercher un champ qui n'existe pas : c'est exactement le
mensonge que l'interdit « l'app ne ment jamais » proscrit.
Pour le rétablir il faut **les deux** gestes, dans cet ordre : ajouter le bloc
`{{ .Token }}` à `confirmation.html` et `magic-link.html`, **puis** passer le
littéral `false` à `true` dans `auth.ts` **et** `auth.web.ts` (c'est la preuve
que le gabarit porte bien un code). Un seul des deux gestes rouvre le mensonge.

**`reauthentication.html` est le seul à porter un code**, parce que ce gabarit-là
est un code par construction (GoTrue n'y met pas de lien). Aucun flux de l'app ne
le déclenche aujourd'hui : `grep` ne trouve ni `reauthenticate` ni
`signInWithPassword` ni `inviteUserByEmail` ni `updateUser` dans `apps/mobile`,
`apps/web` et `supabase/functions`. Le gabarit est **dormant**, pas faux : il ne
part pas tant que rien ne l'appelle.

**`recovery.html` ne parle pas de mot de passe** : GRYD n'en a pas. Le texte dit
ce qui est vrai, « un lien suffit ». Même raison pour `invite.html`, déclenché
seulement depuis le tableau de bord Supabase.

**`email-change.html` annonce les deux adresses**, parce que
`mailer_secure_email_change_enabled = true` : le message part sur l'ancienne ET
la nouvelle adresse, et le changement n'est effectif qu'après les deux
confirmations. Le dire évite la moitié des tickets de support.

**« Le lien expire dans 1 heure »** est adossé à `mailer_otp_exp = 3600`. Si
cette valeur change dans la configuration Auth, **ces phrases mentent** : les
mettre à jour en même temps.

## Contraintes techniques respectées

- **Aucun commentaire HTML** dans les gabarits. Ils sont passés au moteur de
  gabarits Go ; un `html/template` élide les commentaires, donc tout ce qui
  reposerait dessus (conditionnels Outlook `<!--[if mso]>`) serait supprimé
  en silence. Le bouton est donc conçu pour rester correct sans VML : la couleur
  est portée par le `<td>` (peinte partout) et le rembourrage par un `<a>` en
  `display:block` ; Outlook Windows le rendra carré au lieu d'arrondi, jamais
  cassé.
- **CSS en ligne partout.** Le `<style>` du `<head>` ne porte que les
  ajustements `@media` (marges et bouton pleine largeur sous 620 px) ; un client
  qui le supprime obtient le même e-mail, en un peu plus large.
- **Lisible sans images.** Le logo a un `alt="GRYD"` stylé en chartreuse, la
  photo un `alt` descriptif, et tous les fonds sont peints par CSS : images
  bloquées ou site pas encore en ligne, l'e-mail reste noir, lisible et cliquable.
- **Lisible sans HTML.** GoTrue n'envoie qu'une partie HTML (aucun champ
  `text/plain` dans l'API de configuration). La lisibilité en texte brut vient
  donc de la structure linéaire et surtout de **l'URL complète écrite en clair**
  sous le bouton : un client qui déshabille le HTML laisse un message
  compréhensible avec un lien utilisable.
- **Pas de tiret long**, tutoiement, un seul accent chartreuse (le bouton, ou le
  code quand il n'y a pas de bouton).

## Images

Référencées en URL absolues, par le **contrat du lot E2** :

| URL | Fichier du dépôt | Format |
| --- | --- | --- |
| `https://gryd.run/email/gryd-logo-email.png` | `apps/web/public/email/gryd-logo-email.png` | 240 × 240, fond carbone `#0A0A0A`, G chartreuse `#B4FF0D`, affiché en 72 px |
| `https://gryd.run/email/gryd-hero-email.jpg` | `apps/web/public/email/gryd-hero-email.jpg` | 1200 × 600, 75 Ko, affiché en 600 px (seulement dans `confirmation` et `invite`) |

Le logo est rendu depuis `apps/mobile/src/ui/gryd/brandPaths.ts` (le tracé de
marque du dépôt), pas redessiné. La photo est une bande 2:1 prise dans
`apps/mobile/assets/photos/gryd-crew-course-montee-ville-foule.jpg`.
Tant que `gryd.run` ne sert pas `/email/`, les deux images ne s'affichent pas ;
c'est prévu, voir « lisible sans images » ci-dessus.

## Aperçu local

```sh
node scripts/apply-auth-email-templates.mjs --verify   # l'état distant
```

Pour voir le rendu, remplacer `{{ .SiteURL }}` / `{{ .TokenHash }}` /
`{{ .ConfirmationURL }}` / `{{ .Email }}` / `{{ .Token }}` par des valeurs réalistes et
ouvrir le fichier dans un navigateur. Le rendu dans un vrai Outlook (moteur Word)
n'est **pas** vérifiable ici : il demande un envoi réel vers une boîte Outlook.

## Prouver qu'un e-mail part vraiment

```sh
# Le lien magique d'un compte QUI EXISTE (create_user:false : aucun compte créé).
# La clé anon est publique ; elle se lit par l'API de gestion, jamais en dur.
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST "https://<ref>.supabase.co/auth/v1/otp" \
  -H "apikey: <anon>" -H "Authorization: Bearer <anon>" -H 'Content-Type: application/json' \
  -d '{"email":"<adresse>","create_user":false}'
```

`200` = GoTrue a accepté ET remis le message au SMTP. Ce que ça ne prouve pas : la
réception, ni le rendu dans le client mail. Relevé du 12/09/2026, après application des
gabarits E4 : **HTTP 200** vers la boîte du fondateur (gabarit `magic_link`, le compte
existait déjà).
