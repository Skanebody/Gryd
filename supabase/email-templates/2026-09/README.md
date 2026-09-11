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

Pour voir le rendu, remplacer `{{ .ConfirmationURL }}` / `{{ .Email }}` /
`{{ .Token }}` par des valeurs réalistes et ouvrir le fichier dans un navigateur.
Le rendu dans un vrai Outlook (moteur Word) n'est **pas** vérifiable ici : il
demande un envoi réel vers une boîte Outlook.
