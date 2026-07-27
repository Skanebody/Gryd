/**
 * GRYD — i18n : catalogue de l'écran E07 « Connexion par e-mail » (`/auth/email`).
 *
 * Spec produit UI/UX complète, l.735 : retour, titre, champ e-mail, CTA
 * `RECEVOIR LE LIEN`, clavier e-mail, aucune demande de mot de passe en
 * première intention — et CINQ états nommés : lien envoyé, e-mail invalide,
 * compte existant avec fournisseur externe, lien expiré, renvoi après délai.
 * Les cinq sont ci-dessous, aucun n'est laissé à l'improvisation de l'écran.
 *
 * ─── REGISTRE ───────────────────────────────────────────────────────────────
 * TUTOIEMENT en français (la spec vouvoie ; le registre du produit gagne, et
 * des tests le verrouillent), « tú » en espagnol, « du » en allemand, « você »
 * en portugais BRÉSILIEN — jamais « teu / tua / tens / podes » (registre
 * européen), le mélange des deux dans un même catalogue est ce que
 * `features/explain/copyDiscipline.test.ts` §4 interdit.
 *
 * ─── CE QUE CE CATALOGUE N'EST PAS ──────────────────────────────────────────
 * `catalog/auth.ts` sert l'écran E06 (le panneau de boutons Apple / Google /
 * e-mail) et le filet OTP qui y vit encore. Ici, c'est l'écran DÉDIÉ e-mail :
 * une seule décision, un seul champ, un seul CTA (§A). Les deux ne partagent
 * volontairement aucune entrée — un texte servi aux deux endroits devrait
 * décrire deux contextes à la fois, et finirait faux dans l'un des deux.
 *
 * ─── HONNÊTETÉ (constitution §1) ────────────────────────────────────────────
 * Quatre états DISTINCTS, quatre familles de textes : rien n'est su
 * (`ctaBusy`, `verifying`), le serveur a accepté (`sent*`), le serveur a refusé
 * (`error*`), le lien a rendu son verdict (`expired*`, `errorLinkInvalid`).
 * AUCUNE phrase n'affirme que le compte existe, ni qu'il est nouveau : l'écran
 * ne le sait pas, et `requestEmailOtp` envoie `shouldCreateUser: true` — la même
 * adresse connecte OU crée. `whatHappens` le dit, une fois, sans deviner.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Entête ────────────────────────────────────────────────────────────────
  /** Le retour n'affiche pas de texte : chevron seul + nom accessible (§A / a11y). */
  backA11y: {
    fr: 'Revenir aux autres façons de se connecter',
    en: 'Back to the other ways to sign in',
    es: 'Volver a las otras formas de iniciar sesión',
    de: 'Zurück zu den anderen Anmeldewegen',
    pt: 'Voltar às outras formas de entrar',
  },
  kicker: {
    fr: 'PAR E-MAIL',
    en: 'BY EMAIL',
    es: 'POR E-MAIL',
    de: 'PER E-MAIL',
    pt: 'POR E-MAIL',
  },
  title: {
    fr: 'Ton adresse e-mail',
    en: 'Your email address',
    es: 'Tu dirección de e-mail',
    de: 'Deine E-Mail-Adresse',
    pt: 'Seu endereço de e-mail',
  },
  /**
   * « aucune demande de mot de passe en première intention » — la spec en fait
   * une règle ; on en fait une PROMESSE LISIBLE, sinon le joueur attend un
   * champ mot de passe qui ne viendra pas et croit l'écran cassé.
   */
  subtitle: {
    fr: 'On t’envoie un lien. Un tap et tu es dedans — aucun mot de passe à retenir.',
    en: 'We send you a link. One tap and you’re in — no password to remember.',
    es: 'Te enviamos un enlace. Un toque y estás dentro: ninguna contraseña que recordar.',
    de: 'Wir schicken dir einen Link. Ein Tipp und du bist drin — kein Passwort zum Merken.',
    pt: 'A gente envia um link. Um toque e você está dentro — nenhuma senha para lembrar.',
  },

  // ─── Le champ ──────────────────────────────────────────────────────────────
  /**
   * Label PERSISTANT (planche E21 : champs 56 pt à label affiché). Il sert aussi
   * de nom accessible : un seul texte, une seule vérité — un placeholder seul
   * disparaît à la première frappe et le champ ne dit plus ce qu'il attend.
   */
  emailLabel: {
    fr: 'Adresse e-mail',
    en: 'Email address',
    es: 'Dirección de e-mail',
    de: 'E-Mail-Adresse',
    pt: 'Endereço de e-mail',
  },
  emailPlaceholder: {
    fr: 'ton@email.fr',
    en: 'you@email.com',
    es: 'tu@email.es',
    de: 'du@email.de',
    pt: 'voce@email.com',
  },
  /**
   * Ce que le lien fait VRAIMENT. La même adresse connecte un compte existant
   * et en crée un sinon (`shouldCreateUser: true`) : le taire laisserait le
   * joueur deviner s'il est sur la bonne porte. Aucune de ces phrases n'affirme
   * qu'il a déjà un compte — l'écran ne le sait pas.
   */
  whatHappens: {
    fr: 'Un lien de connexion : il te connecte si ton compte existe, il le crée sinon.',
    en: 'A sign-in link: it signs you in if your account exists, and creates it if not.',
    es: 'Un enlace de acceso: te conecta si tu cuenta existe, y la crea si no.',
    de: 'Ein Anmeldelink: Er meldet dich an, wenn dein Konto existiert — sonst legt er es an.',
    pt: 'Um link de acesso: ele conecta você se a conta existir, e a cria se não.',
  },

  // ─── Le CTA (unique, §A4) ──────────────────────────────────────────────────
  /** Spec E07 : `RECEVOIR LE LIEN`. Court dans les 5 langues — jamais tronqué. */
  cta: {
    fr: 'RECEVOIR LE LIEN',
    en: 'GET THE LINK',
    es: 'RECIBIR EL ENLACE',
    de: 'LINK ERHALTEN',
    pt: 'RECEBER O LINK',
  },
  /** Envoi en vol : on n'affirme RIEN tant que le serveur n'a pas répondu. */
  ctaBusy: {
    fr: 'Envoi…',
    en: 'Sending…',
    es: 'Enviando…',
    de: 'Wird gesendet…',
    pt: 'Enviando…',
  },

  // ─── ÉTAT 1 · lien envoyé ──────────────────────────────────────────────────
  sentTitle: {
    fr: 'Lien envoyé',
    en: 'Link sent',
    es: 'Enlace enviado',
    de: 'Link gesendet',
    pt: 'Link enviado',
  },
  /** {email} = l'adresse RÉELLEMENT acceptée par le serveur, jamais un exemple. */
  sentBody: {
    fr: 'Regarde dans {email}.',
    en: 'Check {email}.',
    es: 'Mira en {email}.',
    de: 'Schau in {email} nach.',
    pt: 'Confira em {email}.',
  },
  /** Les deux limites réelles du lien Supabase : appareil et durée de vie. */
  sentHint: {
    fr: 'Ouvre-le depuis cet appareil : il te connecte directement. Il expire dans l’heure et ne sert qu’une fois.',
    en: 'Open it on this device: it signs you in directly. It expires within the hour and works once.',
    es: 'Ábrelo desde este dispositivo: te conecta directamente. Caduca en una hora y solo sirve una vez.',
    de: 'Öffne ihn auf diesem Gerät: Er meldet dich direkt an. Er läuft in einer Stunde ab und gilt einmal.',
    pt: 'Abra no mesmo aparelho: ele conecta você direto. Expira em uma hora e serve uma vez só.',
  },
  /** Le spam est la première cause d'« il ne marche pas » — on le dit d'avance. */
  sentSpamHint: {
    fr: 'Rien dans une minute ? Regarde aussi les indésirables.',
    en: 'Nothing after a minute? Check your spam folder too.',
    es: '¿Nada en un minuto? Mira también el correo no deseado.',
    de: 'Nach einer Minute nichts da? Schau auch im Spam-Ordner nach.',
    pt: 'Nada depois de um minuto? Veja também a caixa de spam.',
  },
  /** Sortie de l'état « envoyé » : corriger une adresse mal tapée. */
  sentChangeEmail: {
    fr: 'Changer d’adresse',
    en: 'Use another address',
    es: 'Cambiar de dirección',
    de: 'Andere Adresse nutzen',
    pt: 'Trocar de endereço',
  },

  // ─── ÉTAT 2 · e-mail invalide ──────────────────────────────────────────────
  /**
   * Refus de FORME, constaté avant tout appel réseau. Il ne dit pas « cette
   * adresse n’existe pas » : l'app ne le sait pas et ne peut pas le savoir.
   */
  errorInvalidEmail: {
    fr: 'Cette adresse n’a pas le bon format. Vérifie le @ et ce qui suit.',
    en: 'That address isn’t formatted right. Check the @ and what follows.',
    es: 'Esa dirección no tiene el formato correcto. Revisa la @ y lo que sigue.',
    de: 'Diese Adresse hat nicht das richtige Format. Prüf das @ und den Teil danach.',
    pt: 'Esse endereço não está no formato certo. Confira o @ e o que vem depois.',
  },

  // ─── ÉTAT 3 · compte existant avec fournisseur externe ─────────────────────
  /**
   * ⚠️ À NE RENDRE QUE SI LE SERVEUR LE DIT. Le plan actuel (magic link avec
   * `shouldCreateUser: true`) n'a AUCUN moyen de distinguer « cette adresse est
   * déjà liée à Apple » : il envoie le lien de toute façon. Ces deux entrées
   * existent parce que la spec nomme l'état, et pour que l'écran n'ait pas à
   * l'inventer le jour où la fusion de comptes (E06 « fusion par e-mail
   * vérifié ») la remontera vraiment. Les afficher aujourd'hui, sur une
   * heuristique client, serait une donnée fabriquée.
   * {provider} = Apple | Google — noms de marque, jamais traduits.
   */
  errorExistingProvider: {
    fr: 'Cette adresse est déjà reliée à {provider}. Continue avec {provider} : c’est le même compte, les mêmes zones.',
    en: 'This address is already linked to {provider}. Continue with {provider}: same account, same zones.',
    es: 'Esta dirección ya está vinculada a {provider}. Continúa con {provider}: es la misma cuenta y las mismas zonas.',
    de: 'Diese Adresse ist bereits mit {provider} verknüpft. Mach mit {provider} weiter: gleiches Konto, gleiche Zonen.',
    pt: 'Este endereço já está ligado a {provider}. Continue com {provider}: é a mesma conta e as mesmas zonas.',
  },
  /** Le CTA de secours — l'état ne laisse jamais le joueur sans sortie. */
  existingProviderCta: {
    fr: 'Continuer avec {provider}',
    en: 'Continue with {provider}',
    es: 'Continuar con {provider}',
    de: 'Weiter mit {provider}',
    pt: 'Continuar com {provider}',
  },

  // ─── ÉTAT 4 · lien expiré ──────────────────────────────────────────────────
  /**
   * Constaté à l'OUVERTURE du lien, souvent dans une autre session que celle
   * qui l'a demandé. L'écran doit donc savoir le dire à froid, sans supposer
   * qu'il connaît encore l'adresse.
   */
  expiredTitle: {
    fr: 'Ce lien a expiré',
    en: 'This link has expired',
    es: 'Este enlace ha caducado',
    de: 'Dieser Link ist abgelaufen',
    pt: 'Este link expirou',
  },
  expiredBody: {
    fr: 'Les liens ne durent qu’une heure et ne servent qu’une fois. Rien n’est perdu : demandes-en un neuf.',
    en: 'Links last one hour and work once. Nothing is lost: ask for a fresh one.',
    es: 'Los enlaces duran una hora y solo sirven una vez. No se ha perdido nada: pide uno nuevo.',
    de: 'Links gelten eine Stunde und nur einmal. Nichts ist verloren: Fordere einfach einen neuen an.',
    pt: 'Os links duram uma hora e servem uma vez só. Nada foi perdido: peça um novo.',
  },
  expiredCta: {
    fr: 'DEMANDER UN NOUVEAU LIEN',
    en: 'REQUEST A NEW LINK',
    es: 'PEDIR UN ENLACE NUEVO',
    de: 'NEUEN LINK ANFORDERN',
    pt: 'PEDIR UM NOVO LINK',
  },
  /** Le lien est ouvert mais le verdict n'est pas tombé : on n'affirme rien. */
  verifying: {
    fr: 'Vérification du lien…',
    en: 'Checking the link…',
    es: 'Comprobando el enlace…',
    de: 'Link wird geprüft…',
    pt: 'Verificando o link…',
  },
  /** Lien malformé/tronqué (copié à la main, coupé par un client mail). */
  errorLinkInvalid: {
    fr: 'Ce lien est incomplet. Ouvre-le directement depuis l’e-mail, sans le recopier.',
    en: 'This link is incomplete. Open it straight from the email, without retyping it.',
    es: 'Este enlace está incompleto. Ábrelo directamente desde el e-mail, sin copiarlo a mano.',
    de: 'Dieser Link ist unvollständig. Öffne ihn direkt aus der E-Mail, ohne ihn abzutippen.',
    pt: 'Este link está incompleto. Abra direto pelo e-mail, sem copiar à mão.',
  },

  // ─── ÉTAT 5 · renvoi après délai ───────────────────────────────────────────
  resendCta: {
    fr: 'Renvoyer le lien',
    en: 'Resend the link',
    es: 'Reenviar el enlace',
    de: 'Link erneut senden',
    pt: 'Reenviar o link',
  },
  /**
   * Le renvoi est ARMÉ mais pas encore permis. {s} = secondes restantes. Le
   * compte à rebours est affiché plutôt que le bouton simplement grisé : un
   * bouton mort sans explication est exactement ce que la constitution §2
   * interdit — ici l'attente est dite, donc le bouton n'est pas mort, il est
   * daté.
   */
  resendCountdown: {
    fr: 'Renvoyer dans {s} s',
    en: 'Resend in {s}s',
    es: 'Reenviar en {s} s',
    de: 'Erneut senden in {s} s',
    pt: 'Reenviar em {s} s',
  },
  /** Confirmation discrète du renvoi — sinon le joueur retape le bouton. */
  resendDone: {
    fr: 'Nouveau lien envoyé. Le précédent ne marche plus.',
    en: 'New link sent. The previous one no longer works.',
    es: 'Nuevo enlace enviado. El anterior ya no funciona.',
    de: 'Neuer Link gesendet. Der vorherige gilt nicht mehr.',
    pt: 'Novo link enviado. O anterior não funciona mais.',
  },
  /** Le serveur impose sa propre cadence : on la rend, on ne la maquille pas. */
  errorRateLimited: {
    fr: 'Trop de demandes d’affilée. Attends une minute avant de réessayer.',
    en: 'Too many requests in a row. Wait a minute before trying again.',
    es: 'Demasiadas solicitudes seguidas. Espera un minuto antes de reintentar.',
    de: 'Zu viele Anfragen hintereinander. Warte eine Minute und versuch es erneut.',
    pt: 'Pedidos demais seguidos. Espere um minuto antes de tentar de novo.',
  },

  // ─── Échecs de transport (jamais un mur — §4.1) ────────────────────────────
  errorNetwork: {
    fr: 'Envoi impossible — réessaie quand tu as du réseau.',
    en: 'Couldn’t send — try again when you’re online.',
    es: 'No se pudo enviar: reinténtalo con conexión.',
    de: 'Senden fehlgeschlagen — versuch es mit Netz erneut.',
    pt: 'Não foi possível enviar — tente quando tiver internet.',
  },
  errorUnknown: {
    fr: 'L’envoi a échoué. Réessaie — rien n’a été enregistré.',
    en: 'Sending failed. Try again — nothing was saved.',
    es: 'El envío falló. Reinténtalo: no se ha guardado nada.',
    de: 'Senden fehlgeschlagen. Versuch es nochmal — nichts wurde gespeichert.',
    pt: 'O envio falhou. Tente de novo — nada foi salvo.',
  },
});
