/**
 * GRYD — i18n : catalogue du domaine SOCIAL (E57 « Suivis et amis », E58
 * « Défi »). Écrans `/amis`, `/defis`, `/defi`.
 *
 * ─── LA LIGNE ÉDITORIALE DE CE CATALOGUE, ET ELLE N'EST PAS COSMÉTIQUE ──────
 *  1. UN LIEN SE DEMANDE. Aucun libellé n'emploie un verbe de prise
 *     (« ajouter », « prendre ») pour ce qui est une SOLLICITATION : on
 *     « demande » en ami, on « envoie » un défi. Le mot doit dire qui décide.
 *  2. UN REFUS NE SE JUSTIFIE PAS. « Refuser » n'est jamais accompagné d'un
 *     « pourquoi ? », d'un « êtes-vous sûr ? » ni d'un adverbe de regret. Le
 *     texte qui suit un refus est FACTUEL (ce qui se passe ensuite), jamais
 *     émotionnel. Une confirmation modale serait déjà de la friction.
 *  3. UNE ABSENCE SE DIT AU MONDE, PAS AU JOUEUR. « Personne ne t'a encore
 *     défié » est un fait sur le jeu ; « tu n'as pas d'amis » serait un
 *     reproche. La base est vide : l'état vide est de première classe et il
 *     n'accuse personne.
 *  4. « AUCUNE SOURCE » ≠ « AUCUN RÉSULTAT ». Les suggestions et l'import de
 *     contacts n'existent PAS (game-rules `SOCIAL_SUGGESTIONS_SOURCE_EXISTS`) :
 *     la copie le dit comme une propriété du produit, pas comme un vide
 *     temporaire qui se remplirait tout seul.
 *
 * TUTOIEMENT en français (règle de projet). PORTUGAIS = BRÉSILIEN : « você »,
 * « seu/sua », « pode », JAMAIS « teu/tua/tens/podes ».
 *
 * INVARIANTS jamais traduits : GRYD, le @handle en tant que jeton, « Run » et
 * « Bike » (noms des deux disciplines du jeu, §1.2).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ═════════════════════════════════════════════════════════════════════════
  // E57 — SUIVIS ET AMIS (`/amis`)
  // ═════════════════════════════════════════════════════════════════════════
  friendsTitle: {
    fr: 'Suivis et amis',
    en: 'Following and friends',
    es: 'Seguidos y amigos',
    de: 'Gefolgt und Freunde',
    pt: 'Seguindo e amigos',
  },
  /** Kicker : mon @ réel, jamais un compteur à zéro. */
  friendsKickerHandle: {
    fr: 'TON CODE · @{handle}',
    en: 'YOUR CODE · @{handle}',
    es: 'TU CÓDIGO · @{handle}',
    de: 'DEIN CODE · @{handle}',
    pt: 'SEU CÓDIGO · @{handle}',
  },

  // ── Les cinq états de lecture ────────────────────────────────────────────
  reading: {
    fr: 'Lecture de tes liens…',
    en: 'Reading your connections…',
    es: 'Leyendo tus vínculos…',
    de: 'Deine Verbindungen werden gelesen…',
    pt: 'Lendo suas conexões…',
  },
  signedOutTitle: {
    fr: 'Connecte-toi pour retrouver tes liens.',
    en: 'Sign in to find your connections.',
    es: 'Inicia sesión para recuperar tus vínculos.',
    de: 'Melde dich an, um deine Verbindungen zu sehen.',
    pt: 'Entre para encontrar suas conexões.',
  },
  signedOutBody: {
    fr: 'Suivre quelqu’un, demander en ami ou défier demande un compte : ces liens vivent sur le serveur, pas sur ce téléphone.',
    en: 'Following, friending and challenging need an account: these links live on the server, not on this phone.',
    es: 'Seguir, pedir amistad o desafiar requiere una cuenta: estos vínculos viven en el servidor, no en este teléfono.',
    de: 'Folgen, Freundschaft anfragen oder herausfordern braucht ein Konto: Diese Verbindungen liegen auf dem Server, nicht auf diesem Telefon.',
    pt: 'Seguir, pedir amizade ou desafiar exige uma conta: essas conexões ficam no servidor, não neste telefone.',
  },
  signIn: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  /**
   * ÉTAT ①bis — AUCUN BACKEND RELIÉ (constitution « aucun bouton mort »).
   * Sans backend il n'y a pas de session, donc `signedOut` est vrai — mais
   * proposer « Se connecter » serait un bouton mort : `/sign-in` fait
   * `if (session || !configured) return <Redirect href="/" />` (sign-in.tsx),
   * et le tap éjecterait la personne sur la carte sans un mot. Deux phrases
   * remplacent le bouton, exactement comme `activite.tsx` le fait déjà.
   */
  noBackendTitle: {
    fr: 'Aucun serveur relié',
    en: 'No server connected',
    es: 'Sin servidor conectado',
    de: 'Kein Server verbunden',
    pt: 'Nenhum servidor conectado',
  },
  noBackendBody: {
    fr: 'Cette version de l’app n’est reliée à aucun serveur : il n’y a pas de compte à rejoindre, donc rien à lire. Tes liens ne sont pas vides — ils ne sont nulle part encore.',
    en: 'This build isn’t connected to any server: there is no account to join, so nothing to read. Your connections aren’t empty — they aren’t anywhere yet.',
    es: 'Esta versión de la app no está conectada a ningún servidor: no hay cuenta a la que entrar, así que no hay nada que leer. Tus vínculos no están vacíos: todavía no están en ninguna parte.',
    de: 'Dieser Build ist mit keinem Server verbunden: Es gibt kein Konto und damit nichts zu lesen. Deine Verbindungen sind nicht leer — sie existieren noch nirgends.',
    pt: 'Esta versão do app não está conectada a nenhum servidor: não há conta para entrar, então não há nada para ler. Suas conexões não estão vazias — elas ainda não estão em lugar nenhum.',
  },
  failedTitle: {
    fr: 'Je n’ai pas pu lire tes liens.',
    en: 'I couldn’t read your connections.',
    es: 'No pude leer tus vínculos.',
    de: 'Deine Verbindungen konnten nicht gelesen werden.',
    pt: 'Não consegui ler suas conexões.',
  },
  failedBody: {
    fr: 'Ça ne dit rien sur qui tu connais : c’est la lecture qui a échoué, pas ta liste qui est vide.',
    en: 'This says nothing about who you know: the read failed, your list isn’t empty.',
    es: 'Esto no dice nada sobre a quién conoces: falló la lectura, tu lista no está vacía.',
    de: 'Das sagt nichts darüber aus, wen du kennst: Der Abruf ist fehlgeschlagen, deine Liste ist nicht leer.',
    pt: 'Isso não diz nada sobre quem você conhece: a leitura falhou, sua lista não está vazia.',
  },
  retry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  unsupportedTitle: {
    fr: 'Le serveur ne sert pas encore cette page.',
    en: 'The server doesn’t serve this page yet.',
    es: 'El servidor todavía no sirve esta página.',
    de: 'Der Server liefert diese Seite noch nicht.',
    pt: 'O servidor ainda não serve esta página.',
  },
  unsupportedBody: {
    fr: 'Ce n’est pas une panne de réseau : cette version du serveur ne connaît pas encore les suivis et les défis. Réessayer n’y changerait rien.',
    en: 'This isn’t a network glitch: this server version doesn’t know about following and challenges yet. Retrying wouldn’t help.',
    es: 'No es un fallo de red: esta versión del servidor todavía no conoce los seguimientos ni los desafíos. Reintentar no cambiaría nada.',
    de: 'Das ist keine Netzwerkstörung: Diese Serverversion kennt Folgen und Duelle noch nicht. Erneut versuchen hilft nicht.',
    pt: 'Não é falha de rede: esta versão do servidor ainda não conhece seguidores nem desafios. Tentar de novo não mudaria nada.',
  },
  emptyTitle: {
    fr: 'Personne ici pour l’instant.',
    en: 'Nobody here yet.',
    es: 'Todavía no hay nadie aquí.',
    de: 'Hier ist noch niemand.',
    pt: 'Ninguém aqui ainda.',
  },
  emptyBody: {
    fr: 'GRYD ne cherche personne à ta place : on se suit à partir d’un @code reçu en vrai. Montre le tien, ou saisis celui qu’on t’a donné.',
    en: 'GRYD doesn’t look people up for you: you follow someone from a @code you were given in person. Show yours, or enter the one you received.',
    es: 'GRYD no busca a nadie por ti: te sigues a partir de un @código recibido en persona. Muestra el tuyo o escribe el que te dieron.',
    de: 'GRYD sucht niemanden für dich: Man folgt sich über einen @Code, den man persönlich bekommen hat. Zeig deinen oder gib den ein, den du erhalten hast.',
    pt: 'O GRYD não procura ninguém por você: você segue alguém a partir de um @código recebido pessoalmente. Mostre o seu ou digite o que te deram.',
  },

  // ── Ajouter par @handle ──────────────────────────────────────────────────
  addKicker: {
    fr: 'SUIVRE UN @CODE',
    en: 'FOLLOW A @CODE',
    es: 'SEGUIR UN @CÓDIGO',
    de: 'EINEM @CODE FOLGEN',
    pt: 'SEGUIR UM @CÓDIGO',
  },
  addPlaceholder: {
    fr: 'son @code',
    en: 'their @code',
    es: 'su @código',
    de: 'ihr @Code',
    pt: 'o @código dela',
  },
  addCta: {
    fr: 'Suivre',
    en: 'Follow',
    es: 'Seguir',
    de: 'Folgen',
    pt: 'Seguir',
  },
  showMyCode: {
    fr: 'Montrer mon code',
    en: 'Show my code',
    es: 'Mostrar mi código',
    de: 'Meinen Code zeigen',
    pt: 'Mostrar meu código',
  },

  // ── Sections ─────────────────────────────────────────────────────────────
  sectionRequestsIn: {
    fr: 'DEMANDES REÇUES',
    en: 'REQUESTS RECEIVED',
    es: 'SOLICITUDES RECIBIDAS',
    de: 'ERHALTENE ANFRAGEN',
    pt: 'PEDIDOS RECEBIDOS',
  },
  sectionFriends: {
    fr: 'AMIS',
    en: 'FRIENDS',
    es: 'AMIGOS',
    de: 'FREUNDE',
    pt: 'AMIGOS',
  },
  sectionFollowing: {
    fr: 'TU SUIS',
    en: 'YOU FOLLOW',
    es: 'SIGUES A',
    de: 'DU FOLGST',
    pt: 'VOCÊ SEGUE',
  },
  sectionFollowers: {
    fr: 'ABONNÉS',
    en: 'FOLLOWERS',
    es: 'SEGUIDORES',
    de: 'FOLLOWER',
    pt: 'SEGUIDORES',
  },
  /** Une liste bornée le DIT : sinon le total affiché serait faux. */
  truncated: {
    fr: '{shown} affichés sur {total}',
    en: '{shown} of {total} shown',
    es: '{shown} mostrados de {total}',
    de: '{shown} von {total} angezeigt',
    pt: '{shown} de {total} exibidos',
  },
  /** Une demande envoyée, en attente : un fait, sans relance possible. */
  requestsOut: {
    fr: 'Demandes envoyées, en attente : {handles}',
    en: 'Requests sent, awaiting reply: {handles}',
    es: 'Solicitudes enviadas, en espera: {handles}',
    de: 'Gesendete Anfragen, noch offen: {handles}',
    pt: 'Pedidos enviados, aguardando resposta: {handles}',
  },

  // ── Actions sur une personne ─────────────────────────────────────────────
  accept: {
    fr: 'Accepter',
    en: 'Accept',
    es: 'Aceptar',
    de: 'Annehmen',
    pt: 'Aceitar',
  },
  decline: {
    fr: 'Refuser',
    en: 'Decline',
    es: 'Rechazar',
    de: 'Ablehnen',
    pt: 'Recusar',
  },
  unfollow: {
    fr: 'Ne plus suivre',
    en: 'Unfollow',
    es: 'Dejar de seguir',
    de: 'Nicht mehr folgen',
    pt: 'Deixar de seguir',
  },
  askFriend: {
    fr: 'Demander en ami',
    en: 'Send friend request',
    es: 'Pedir amistad',
    de: 'Freundschaft anfragen',
    pt: 'Pedir amizade',
  },
  challenge: {
    fr: 'Défier',
    en: 'Challenge',
    es: 'Desafiar',
    de: 'Herausfordern',
    pt: 'Desafiar',
  },
  /** Étiquette a11y d'une ligne : le nom seul ne dit pas ce qu'on peut y faire. */
  personA11y: {
    fr: '@{handle}, ouvrir les actions',
    en: '@{handle}, open actions',
    es: '@{handle}, abrir acciones',
    de: '@{handle}, Aktionen öffnen',
    pt: '@{handle}, abrir ações',
  },
  /** Une personne sans profil complété : on ne lui invente pas de nom. */
  personNoHandle: {
    fr: 'Compte sans @code',
    en: 'Account with no @code',
    es: 'Cuenta sin @código',
    de: 'Konto ohne @Code',
    pt: 'Conta sem @código',
  },

  // ── Ce qui n'a PAS de source (spec E57, sections 3 et 4) ─────────────────
  noSourceTitle: {
    fr: 'Ni import de contacts, ni suggestions.',
    en: 'No contact import, no suggestions.',
    es: 'Ni importación de contactos, ni sugerencias.',
    de: 'Kein Kontaktimport, keine Vorschläge.',
    pt: 'Sem importar contatos, sem sugestões.',
  },
  noSourceBody: {
    fr: 'GRYD ne lit pas ton carnet d’adresses et ne te propose pas de coureurs proches : désigner qui court près de chez toi révélerait où ils courent. Les liens se font par @code, en vrai.',
    en: 'GRYD doesn’t read your address book and won’t suggest nearby runners: naming who runs near you would reveal where they run. Connections happen by @code, in person.',
    es: 'GRYD no lee tu agenda ni te propone corredores cercanos: señalar quién corre cerca de ti revelaría dónde corren. Los vínculos se hacen por @código, en persona.',
    de: 'GRYD liest dein Adressbuch nicht und schlägt keine Läufer in der Nähe vor: Wer in deiner Nähe läuft, würde damit verraten, wo er läuft. Verbindungen entstehen über @Code, persönlich.',
    pt: 'O GRYD não lê sua agenda nem sugere corredores por perto: apontar quem corre perto de você revelaria onde essa pessoa corre. As conexões acontecem por @código, pessoalmente.',
  },

  // ── Réponses du serveur ──────────────────────────────────────────────────
  okFollowed: {
    fr: 'Tu suis @{handle}.',
    en: 'You now follow @{handle}.',
    es: 'Ahora sigues a @{handle}.',
    de: 'Du folgst jetzt @{handle}.',
    pt: 'Você agora segue @{handle}.',
  },
  okAlreadyFollowing: {
    fr: 'Tu suivais déjà @{handle}.',
    en: 'You were already following @{handle}.',
    es: 'Ya seguías a @{handle}.',
    de: 'Du folgst @{handle} bereits.',
    pt: 'Você já seguia @{handle}.',
  },
  okRequestSent: {
    fr: 'Demande envoyée. Elle attend sa réponse.',
    en: 'Request sent. It’s waiting for a reply.',
    es: 'Solicitud enviada. Espera respuesta.',
    de: 'Anfrage gesendet. Sie wartet auf Antwort.',
    pt: 'Pedido enviado. Aguardando resposta.',
  },
  okFriendAccepted: {
    fr: 'Vous êtes amis.',
    en: 'You’re friends now.',
    es: 'Ahora son amigos.',
    de: 'Ihr seid jetzt Freunde.',
    pt: 'Vocês são amigos agora.',
  },
  okDeclined: {
    fr: 'Refusé.',
    en: 'Declined.',
    es: 'Rechazado.',
    de: 'Abgelehnt.',
    pt: 'Recusado.',
  },
  errNotFound: {
    fr: 'Aucun compte joignable avec ce @code.',
    en: 'No reachable account with that @code.',
    es: 'Ninguna cuenta accesible con ese @código.',
    de: 'Kein erreichbares Konto mit diesem @Code.',
    pt: 'Nenhuma conta acessível com esse @código.',
  },
  errSelf: {
    fr: 'C’est ton propre code.',
    en: 'That’s your own code.',
    es: 'Ese es tu propio código.',
    de: 'Das ist dein eigener Code.',
    pt: 'Esse é o seu próprio código.',
  },
  errRateLimited: {
    fr: 'Tu as atteint {max} nouveaux suivis en 24 h. Ça repart demain.',
    en: 'You’ve hit {max} new follows in 24 h. It resets tomorrow.',
    es: 'Alcanzaste {max} nuevos seguimientos en 24 h. Se reinicia mañana.',
    de: 'Du hast {max} neue Follows in 24 Std. erreicht. Morgen geht es weiter.',
    pt: 'Você atingiu {max} novos seguidores em 24 h. Recomeça amanhã.',
  },
  errFriendCooldown: {
    fr: 'Cette personne a décliné. Tu pourras redemander dans {days} jours.',
    en: 'They declined. You can ask again in {days} days.',
    es: 'Esa persona declinó. Podrás pedirlo de nuevo en {days} días.',
    de: 'Diese Person hat abgelehnt. Du kannst in {days} Tagen erneut fragen.',
    pt: 'Essa pessoa recusou. Você pode pedir de novo em {days} dias.',
  },
  errTooManyPending: {
    fr: 'Tu as déjà {max} demandes en attente. Une réponse en libère une.',
    en: 'You already have {max} requests pending. A reply frees one up.',
    es: 'Ya tienes {max} solicitudes en espera. Una respuesta libera una.',
    de: 'Du hast bereits {max} offene Anfragen. Eine Antwort gibt eine frei.',
    pt: 'Você já tem {max} pedidos pendentes. Uma resposta libera um.',
  },
  errGeneric: {
    fr: 'Le serveur n’a pas pris cette action. Rien n’a changé.',
    en: 'The server didn’t take that action. Nothing changed.',
    es: 'El servidor no aceptó esa acción. Nada cambió.',
    de: 'Der Server hat die Aktion nicht ausgeführt. Nichts hat sich geändert.',
    pt: 'O servidor não executou essa ação. Nada mudou.',
  },
  errNetwork: {
    fr: 'Je n’ai pas joint le serveur. Je ne sais pas si l’action est passée — rouvre la page pour voir.',
    en: 'I couldn’t reach the server. I don’t know whether it went through — reopen the page to check.',
    es: 'No pude contactar con el servidor. No sé si la acción se aplicó: vuelve a abrir la página para verlo.',
    de: 'Der Server war nicht erreichbar. Ob die Aktion durchging, weiß ich nicht — öffne die Seite erneut.',
    pt: 'Não consegui falar com o servidor. Não sei se a ação passou — reabra a página para conferir.',
  },

  // ═════════════════════════════════════════════════════════════════════════
  // E58 — DÉFIS (`/defis` : la boîte) et DÉFI (`/defi` : la feuille)
  // ═════════════════════════════════════════════════════════════════════════
  duelsTitle: {
    fr: 'Défis',
    en: 'Challenges',
    es: 'Desafíos',
    de: 'Duelle',
    pt: 'Desafios',
  },
  duelsOpen: {
    fr: 'Mes défis',
    en: 'My challenges',
    es: 'Mis desafíos',
    de: 'Meine Duelle',
    pt: 'Meus desafios',
  },
  duelsReading: {
    fr: 'Lecture de tes défis…',
    en: 'Reading your challenges…',
    es: 'Leyendo tus desafíos…',
    de: 'Deine Duelle werden gelesen…',
    pt: 'Lendo seus desafios…',
  },
  duelsEmptyTitle: {
    fr: 'Aucun défi en cours.',
    en: 'No challenge going on.',
    es: 'Ningún desafío en curso.',
    de: 'Kein laufendes Duell.',
    pt: 'Nenhum desafio em andamento.',
  },
  duelsEmptyBody: {
    fr: 'Un défi se lance vers quelqu’un que tu connais déjà : un ami, ou quelqu’un que tu suis et qui te suit.',
    en: 'A challenge goes to someone you already know: a friend, or someone you follow who follows you back.',
    es: 'Un desafío se envía a alguien que ya conoces: un amigo, o alguien a quien sigues y que te sigue.',
    de: 'Ein Duell geht an jemanden, den du schon kennst: einen Freund oder jemanden, dem du folgst und der dir zurückfolgt.',
    pt: 'Um desafio vai para alguém que você já conhece: um amigo, ou alguém que você segue e que segue você de volta.',
  },
  duelsSectionIncoming: {
    fr: 'REÇUS',
    en: 'RECEIVED',
    es: 'RECIBIDOS',
    de: 'ERHALTEN',
    pt: 'RECEBIDOS',
  },
  duelsSectionOutgoing: {
    fr: 'ENVOYÉS',
    en: 'SENT',
    es: 'ENVIADOS',
    de: 'GESENDET',
    pt: 'ENVIADOS',
  },
  duelsSectionActive: {
    fr: 'EN COURS',
    en: 'UNDER WAY',
    es: 'EN CURSO',
    de: 'LAUFEND',
    pt: 'EM ANDAMENTO',
  },
  duelFrom: {
    fr: 'De @{handle}',
    en: 'From @{handle}',
    es: 'De @{handle}',
    de: 'Von @{handle}',
    pt: 'De @{handle}',
  },
  duelTo: {
    fr: 'À @{handle}',
    en: 'To @{handle}',
    es: 'Para @{handle}',
    de: 'An @{handle}',
    pt: 'Para @{handle}',
  },
  duelWith: {
    fr: 'Avec @{handle}',
    en: 'With @{handle}',
    es: 'Con @{handle}',
    de: 'Mit @{handle}',
    pt: 'Com @{handle}',
  },
  duelExpires: {
    fr: 'Sans réponse, il tombe tout seul.',
    en: 'With no reply, it lapses on its own.',
    es: 'Sin respuesta, caduca solo.',
    de: 'Ohne Antwort verfällt es von selbst.',
    pt: 'Sem resposta, ele expira sozinho.',
  },
  duelCancel: {
    fr: 'Retirer',
    en: 'Withdraw',
    es: 'Retirar',
    de: 'Zurückziehen',
    pt: 'Retirar',
  },
  /** Le texte qui rend le refus BANAL. Factuel, jamais rassurant à l'excès. */
  duelDeclineNote: {
    fr: 'Refuser prend un tap et ne demande aucune raison. La personne le verra, sans commentaire, et ne pourra pas te relancer avant {hours} heures.',
    en: 'Declining takes one tap and asks for no reason. They’ll see it, with no comment, and can’t ask you again for {hours} hours.',
    es: 'Rechazar es un toque y no pide ninguna razón. La persona lo verá, sin comentarios, y no podrá insistir durante {hours} horas.',
    de: 'Ablehnen ist ein Tipp und verlangt keine Begründung. Die Person sieht es, ohne Kommentar, und kann dich {hours} Stunden lang nicht erneut fragen.',
    pt: 'Recusar é um toque e não pede nenhum motivo. A pessoa vai ver, sem comentário, e não poderá insistir por {hours} horas.',
  },
  /** L'honnêteté centrale de E58 : GRYD ne compte pas encore les défis. */
  duelNoScoring: {
    fr: 'GRYD ne compte pas encore les défis : accepter, c’est prendre rendez-vous entre vous, pas déclencher un décompte. Aucun score ne s’affichera tant que ce n’est pas vrai.',
    en: 'GRYD doesn’t score challenges yet: accepting is an agreement between you two, not a counter starting. No score will show until that’s real.',
    es: 'GRYD todavía no puntúa los desafíos: aceptar es un acuerdo entre ustedes, no un contador que arranca. No se mostrará ningún marcador hasta que sea real.',
    de: 'GRYD wertet Duelle noch nicht aus: Annehmen ist eine Abmachung zwischen euch, kein startender Zähler. Es wird kein Punktestand angezeigt, solange das nicht stimmt.',
    pt: 'O GRYD ainda não pontua desafios: aceitar é um combinado entre vocês, não um contador começando. Nenhum placar aparecerá enquanto isso não for real.',
  },

  // ── La feuille courte (`/defi`) ──────────────────────────────────────────
  duelNewTitle: {
    fr: 'Défier @{handle}',
    en: 'Challenge @{handle}',
    es: 'Desafiar a @{handle}',
    de: '@{handle} herausfordern',
    pt: 'Desafiar @{handle}',
  },
  duelNewTitleNoTarget: {
    fr: 'Défier',
    en: 'Challenge',
    es: 'Desafiar',
    de: 'Herausfordern',
    pt: 'Desafiar',
  },
  duelNoTargetTitle: {
    fr: 'Aucune personne à défier.',
    en: 'Nobody to challenge.',
    es: 'Nadie a quien desafiar.',
    de: 'Niemand zum Herausfordern.',
    pt: 'Ninguém para desafiar.',
  },
  duelNoTargetBody: {
    fr: 'Un défi part depuis une personne de ta liste. Ouvre tes suivis et amis, puis choisis quelqu’un.',
    en: 'A challenge starts from someone on your list. Open your following and friends, then pick someone.',
    es: 'Un desafío parte de alguien de tu lista. Abre tus seguidos y amigos y elige a alguien.',
    de: 'Ein Duell startet bei jemandem aus deiner Liste. Öffne deine Gefolgten und Freunde und wähle jemanden.',
    pt: 'Um desafio parte de alguém da sua lista. Abra seus seguidos e amigos e escolha uma pessoa.',
  },
  duelOpenFriends: {
    fr: 'Ouvrir mes liens',
    en: 'Open my connections',
    es: 'Abrir mis vínculos',
    de: 'Meine Verbindungen öffnen',
    pt: 'Abrir minhas conexões',
  },
  duelKindKicker: {
    fr: 'FORMAT',
    en: 'FORMAT',
    es: 'FORMATO',
    de: 'FORMAT',
    pt: 'FORMATO',
  },
  duelKindSurface: {
    fr: 'Surface sur la période',
    en: 'Ground covered over the window',
    es: 'Superficie en el periodo',
    de: 'Fläche im Zeitraum',
    pt: 'Área no período',
  },
  duelKindLoops: {
    fr: 'Nombre de boucles',
    en: 'Number of loops',
    es: 'Número de bucles',
    de: 'Anzahl Runden',
    pt: 'Número de voltas',
  },
  duelKindDefend: {
    fr: 'Défendre une zone',
    en: 'Defend a zone',
    es: 'Defender una zona',
    de: 'Eine Zone verteidigen',
    pt: 'Defender uma zona',
  },
  duelKindDistance: {
    fr: 'Distance',
    en: 'Distance',
    es: 'Distancia',
    de: 'Distanz',
    pt: 'Distância',
  },
  duelPeriodKicker: {
    fr: 'FENÊTRE',
    en: 'WINDOW',
    es: 'VENTANA',
    de: 'ZEITRAUM',
    pt: 'JANELA',
  },
  duelPeriodDays: {
    fr: '{n} j',
    en: '{n} d',
    es: '{n} d',
    de: '{n} T',
    pt: '{n} d',
  },
  duelTargetKicker: {
    fr: 'OBJECTIF',
    en: 'TARGET',
    es: 'OBJETIVO',
    de: 'ZIEL',
    pt: 'META',
  },
  duelTargetKm: {
    fr: 'km',
    en: 'km',
    es: 'km',
    de: 'km',
    pt: 'km',
  },
  duelTargetLoops: {
    fr: 'boucles',
    en: 'loops',
    es: 'bucles',
    de: 'Runden',
    pt: 'voltas',
  },
  duelTargetZones: {
    fr: 'zones',
    en: 'zones',
    es: 'zonas',
    de: 'Zonen',
    pt: 'zonas',
  },
  duelZoneKicker: {
    fr: 'ZONE PUBLIQUE',
    en: 'PUBLIC ZONE',
    es: 'ZONA PÚBLICA',
    de: 'ÖFFENTLICHE ZONE',
    pt: 'ZONA PÚBLICA',
  },
  duelZonePlaceholder: {
    fr: 'un lieu public (parc, quai, stade)',
    en: 'a public place (park, riverside, track)',
    es: 'un lugar público (parque, muelle, pista)',
    de: 'ein öffentlicher Ort (Park, Ufer, Bahn)',
    pt: 'um lugar público (parque, orla, pista)',
  },
  duelZoneNote: {
    fr: 'Un lieu public uniquement : ce libellé part chez l’autre personne, et une adresse n’a rien à y faire.',
    en: 'Public places only: this label goes to the other person, and an address has no business there.',
    es: 'Solo lugares públicos: esta etiqueta llega a la otra persona, y una dirección no pinta nada ahí.',
    de: 'Nur öffentliche Orte: Diese Angabe geht an die andere Person, eine Adresse gehört dort nicht hin.',
    pt: 'Apenas lugares públicos: este rótulo vai para a outra pessoa, e um endereço não cabe aí.',
  },
  duelSend: {
    fr: 'Envoyer le défi',
    en: 'Send the challenge',
    es: 'Enviar el desafío',
    de: 'Duell senden',
    pt: 'Enviar o desafio',
  },
  duelSendNote: {
    fr: 'C’est une invitation : elle peut être refusée d’un tap, et tomber toute seule au bout de {hours} heures.',
    en: 'It’s an invitation: it can be declined in one tap, and lapses on its own after {hours} hours.',
    es: 'Es una invitación: puede rechazarse con un toque y caduca sola tras {hours} horas.',
    de: 'Es ist eine Einladung: Sie kann mit einem Tipp abgelehnt werden und verfällt nach {hours} Stunden von selbst.',
    pt: 'É um convite: pode ser recusado com um toque e expira sozinho depois de {hours} horas.',
  },
  duelOkSent: {
    fr: 'Défi envoyé.',
    en: 'Challenge sent.',
    es: 'Desafío enviado.',
    de: 'Duell gesendet.',
    pt: 'Desafio enviado.',
  },
  duelOkAccepted: {
    fr: 'Défi accepté.',
    en: 'Challenge accepted.',
    es: 'Desafío aceptado.',
    de: 'Duell angenommen.',
    pt: 'Desafio aceito.',
  },
  duelErrNoRelation: {
    fr: 'Vous n’avez pas encore de lien. Un défi part vers un ami, ou vers quelqu’un que tu suis et qui te suit.',
    en: 'You have no connection yet. A challenge goes to a friend, or to someone you follow who follows you back.',
    es: 'Todavía no tienen ningún vínculo. Un desafío va a un amigo, o a alguien a quien sigues y que te sigue.',
    de: 'Ihr habt noch keine Verbindung. Ein Duell geht an einen Freund oder an jemanden, dem du folgst und der dir zurückfolgt.',
    pt: 'Vocês ainda não têm vínculo. Um desafio vai para um amigo, ou para alguém que você segue e que segue você.',
  },
  /**
   * VIE PRIVÉE DU LIBELLÉ DE ZONE (constitution §7). Le motif EST dit, et
   * précisément : la personne n'essaie pas de contourner une garde, elle essaie
   * d'être utile — lui dire quoi corriger est ce qui la fait corriger. C'est
   * l'inverse exact de `duelErrZoneUnavailable`, qui reste volontairement muet.
   */
  duelErrZoneAddress: {
    fr: 'Ce libellé ressemble à une adresse. Écris un lieu public — un parc, une place, une station.',
    en: 'That label looks like an address. Write a public place instead — a park, a square, a station.',
    es: 'Esta etiqueta parece una dirección. Escribe un lugar público: un parque, una plaza, una estación.',
    de: 'Diese Angabe sieht nach einer Adresse aus. Schreib einen öffentlichen Ort — Park, Platz, Station.',
    pt: 'Esse rótulo parece um endereço. Escreva um lugar público: um parque, uma praça, uma estação.',
  },
  duelErrZoneDoor: {
    fr: 'Pas de digicode, d’étage ni de numéro d’appartement : ce libellé part chez quelqu’un d’autre.',
    en: 'No door code, floor or apartment number: this label goes to someone else.',
    es: 'Nada de códigos, pisos ni números de apartamento: esta etiqueta llega a otra persona.',
    de: 'Kein Türcode, kein Stockwerk, keine Wohnungsnummer: Diese Angabe geht an jemand anderen.',
    pt: 'Nada de código da porta, andar ou número de apartamento: esse rótulo vai para outra pessoa.',
  },
  /** Verdict de MODÉRATION — opaque par doctrine (0050) : le détailler serait un mode d'emploi. */
  duelErrZoneUnavailable: {
    fr: 'Ce libellé ne passe pas. Choisis un autre nom de lieu.',
    en: 'That label will not go through. Pick another place name.',
    es: 'Esta etiqueta no pasa. Elige otro nombre de lugar.',
    de: 'Diese Angabe geht nicht durch. Wähl einen anderen Ortsnamen.',
    pt: 'Esse rótulo não passa. Escolha outro nome de lugar.',
  },
  duelErrCooldown: {
    fr: 'Un défi a déjà été décliné ou laissé passer. Tu pourras relancer dans {hours} heures.',
    en: 'A challenge was already declined or left to lapse. You can try again in {hours} hours.',
    es: 'Ya se rechazó o caducó un desafío. Podrás volver a intentarlo en {hours} horas.',
    de: 'Ein Duell wurde bereits abgelehnt oder ist verfallen. Du kannst es in {hours} Stunden erneut versuchen.',
    pt: 'Um desafio já foi recusado ou deixado expirar. Você poderá tentar de novo em {hours} horas.',
  },
  duelErrAlreadyPending: {
    fr: 'Un défi est déjà ouvert entre vous. Une réponse d’abord.',
    en: 'A challenge is already open between you. A reply first.',
    es: 'Ya hay un desafío abierto entre ustedes. Primero una respuesta.',
    de: 'Zwischen euch läuft schon ein Duell. Erst eine Antwort.',
    pt: 'Já existe um desafio aberto entre vocês. Primeiro uma resposta.',
  },
  duelErrTooManyPending: {
    fr: 'Tu as déjà {max} défis en attente. Une réponse en libère un.',
    en: 'You already have {max} challenges pending. A reply frees one up.',
    es: 'Ya tienes {max} desafíos en espera. Una respuesta libera uno.',
    de: 'Du hast bereits {max} offene Duelle. Eine Antwort gibt eines frei.',
    pt: 'Você já tem {max} desafios pendentes. Uma resposta libera um.',
  },
  duelErrExpired: {
    fr: 'Ce défi est tombé de lui-même. Personne n’a rien refusé.',
    en: 'This challenge lapsed on its own. Nobody declined anything.',
    es: 'Este desafío caducó solo. Nadie rechazó nada.',
    de: 'Dieses Duell ist von selbst verfallen. Niemand hat etwas abgelehnt.',
    pt: 'Este desafio expirou sozinho. Ninguém recusou nada.',
  },
});
