/**
 * GRYD — i18n : catalogue de l'écran « Modération » (route `/moderation`).
 *
 * ── À QUI CET ÉCRAN PARLE, ET POURQUOI ÇA CHANGE LES RÈGLES ───────────────
 * E28 (`catalog/appel.ts`) parle au JOUEUR vérifié : aucun mot accusatoire,
 * aucun seuil, aucun score. Ce catalogue-ci parle au MODÉRATEUR, et deux de ces
 * trois règles tombent, pour une raison précise :
 *   · LE SCORE ET LES PREUVES CHIFFRÉES sont AFFICHÉS. §11.2 interdit d'exposer
 *     les seuils « comme règles de contournement » : la personne à qui l'on
 *     demande de juger un dossier ne peut pas juger sur un résumé, et elle est
 *     du côté de la règle, pas du côté du contournement. L'écran n'est peint
 *     que si `am_i_moderator_2026()` rend vrai (migration 0187).
 *   · LE LANGAGE RESTE NON ACCUSATOIRE quand même. Un dossier dit ce que les
 *     MESURES montrent, jamais ce qu'une personne aurait voulu faire : le
 *     modérateur doit pouvoir valider sans avoir l'impression de se dédire, et
 *     un vocabulaire de procès pousse à confirmer plutôt qu'à réparer.
 *
 * ── LES LIBELLÉS DE SIGNAUX NE SONT PAS REDÉFINIS ICI ─────────────────────
 * `ReviewQueue2026.tsx` importe ceux de `catalog/appel.ts`. Deux tables des
 * mêmes mesures finiraient par nommer la même chose de deux façons, et le
 * joueur qui fait appel lirait un mot que son modérateur n'emploie pas.
 *
 * ── LA FENÊTRE DE 24 h EST DITE, PARCE QU'ELLE EST VRAIE ──────────────────
 * `resolve_pending_captures_2026` (0156) refuse toute capture encore en attente
 * plus de 24 h après la fermeture de la boucle. Passé ce délai, une validation
 * reste vraie (la sortie est reconnue honnête, les XP reviennent) mais LE
 * TERRAIN NE REVIENT PAS. C'est la seule échéance RÉELLE du système : elle est
 * écrite sur l'écran de celui qui décide, pas promise sur celui du joueur.
 *
 * §A CONTRAIGNANT : libellés d'action COURTS dans les 5 langues, un seul CTA
 * chartreuse à la fois. Interpolation : mêmes {placeholders} partout.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── En-tête et porte d'entrée ─────────────────────────────────────────────
  title: {
    fr: 'Modération',
    en: 'Moderation',
    es: 'Moderación',
    de: 'Moderation',
    pt: 'Moderação',
  },
  kicker: {
    fr: 'FILE DE VÉRIFICATION',
    en: 'VERIFICATION QUEUE',
    es: 'COLA DE VERIFICACIÓN',
    de: 'PRÜFLISTE',
    pt: 'FILA DE VERIFICAÇÃO',
  },
  settingsGroup: {
    fr: 'Modération',
    en: 'Moderation',
    es: 'Moderación',
    de: 'Moderation',
    pt: 'Moderação',
  },
  settingsRow: {
    fr: 'File de vérification',
    en: 'Verification queue',
    es: 'Cola de verificación',
    de: 'Prüfliste',
    pt: 'Fila de verificação',
  },
  settingsRowDetail: {
    fr: 'Les sorties en attente d’une décision humaine',
    en: 'Activities waiting for a human decision',
    es: 'Salidas a la espera de una decisión humana',
    de: 'Aktivitäten, die auf eine menschliche Entscheidung warten',
    pt: 'Atividades aguardando uma decisão humana',
  },

  // ── Les états ─────────────────────────────────────────────────────────────
  chargementTitle: {
    fr: 'Lecture de la file',
    en: 'Loading the queue',
    es: 'Leyendo la cola',
    de: 'Liste wird gelesen',
    pt: 'Lendo a fila',
  },
  chargementBody: {
    fr: 'Rien n’est affiché tant que le serveur n’a pas répondu.',
    en: 'Nothing is shown until the server has answered.',
    es: 'No se muestra nada hasta que el servidor responda.',
    de: 'Es wird nichts angezeigt, bevor der Server geantwortet hat.',
    pt: 'Nada é exibido enquanto o servidor não responder.',
  },
  horsLigneTitle: {
    fr: 'Aucun serveur relié',
    en: 'No server connected',
    es: 'Ningún servidor conectado',
    de: 'Kein Server verbunden',
    pt: 'Nenhum servidor ligado',
  },
  horsLigneBody: {
    fr: 'Cette application n’est reliée à aucun serveur. La file de vérification vit côté serveur : il n’y a rien à lire ici.',
    en: 'This app is not connected to any server. The verification queue lives server-side: there is nothing to read here.',
    es: 'Esta aplicación no está conectada a ningún servidor. La cola vive en el servidor: aquí no hay nada que leer.',
    de: 'Diese App ist mit keinem Server verbunden. Die Prüfliste liegt serverseitig: hier gibt es nichts zu lesen.',
    pt: 'Este aplicativo não está conectado a nenhum servidor. A fila fica no servidor: aqui não há nada para ler.',
  },
  nonConnecteTitle: {
    fr: 'Pas connecté',
    en: 'Not signed in',
    es: 'Sin sesión',
    de: 'Nicht angemeldet',
    pt: 'Sem sessão',
  },
  nonConnecteBody: {
    fr: 'Une habilitation appartient à un compte. Connecte-toi pour que le serveur sache qui demande.',
    en: 'A moderation grant belongs to an account. Sign in so the server knows who is asking.',
    es: 'Una habilitación pertenece a una cuenta. Inicia sesión para que el servidor sepa quién pregunta.',
    de: 'Eine Berechtigung gehört zu einem Konto. Melde dich an, damit der Server weiß, wer fragt.',
    pt: 'Uma habilitação pertence a uma conta. Entre para que o servidor saiba quem está pedindo.',
  },
  seConnecter: {
    fr: 'Me connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  interditTitle: {
    fr: 'Pas d’habilitation',
    en: 'No moderation grant',
    es: 'Sin habilitación',
    de: 'Keine Berechtigung',
    pt: 'Sem habilitação',
  },
  interditBody: {
    fr: 'Ce compte ne porte pas d’habilitation de modération. Le serveur refuse la lecture, et c’est lui qui décide, pas cet écran.',
    en: 'This account carries no moderation grant. The server refuses the read, and the server decides, not this screen.',
    es: 'Esta cuenta no tiene habilitación de moderación. El servidor rechaza la lectura, y decide él, no esta pantalla.',
    de: 'Dieses Konto hat keine Moderationsberechtigung. Der Server verweigert den Zugriff, und er entscheidet, nicht dieser Bildschirm.',
    pt: 'Esta conta não tem habilitação de moderação. O servidor recusa a leitura, e quem decide é ele, não esta tela.',
  },
  echecTitle: {
    fr: 'Lecture impossible',
    en: 'Could not read',
    es: 'Lectura imposible',
    de: 'Lesen nicht möglich',
    pt: 'Leitura impossível',
  },
  echecBody: {
    fr: 'La file n’a pas pu être lue. Ce n’est pas « aucun dossier » : c’est une lecture qui n’a pas abouti.',
    en: 'The queue could not be read. That is not "no cases": it is a read that did not complete.',
    es: 'No se pudo leer la cola. Eso no es "ningún caso": es una lectura que no llegó a término.',
    de: 'Die Liste konnte nicht gelesen werden. Das heißt nicht "keine Fälle": das Lesen ist fehlgeschlagen.',
    pt: 'Não foi possível ler a fila. Isso não é "nenhum caso": é uma leitura que não terminou.',
  },
  reessayer: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  videTitle: {
    fr: 'Aucun dossier en attente',
    en: 'No case waiting',
    es: 'Ningún caso pendiente',
    de: 'Kein Fall offen',
    pt: 'Nenhum caso pendente',
  },
  videBody: {
    fr: 'La file est vide. Rien n’est inventé pour la remplir.',
    en: 'The queue is empty. Nothing is invented to fill it.',
    es: 'La cola está vacía. No se inventa nada para llenarla.',
    de: 'Die Liste ist leer. Es wird nichts erfunden, um sie zu füllen.',
    pt: 'A fila está vazia. Nada é inventado para a preencher.',
  },

  // ── Le dossier ────────────────────────────────────────────────────────────
  sectionFile: {
    fr: 'DOSSIERS EN ATTENTE',
    en: 'CASES WAITING',
    es: 'CASOS PENDIENTES',
    de: 'OFFENE FÄLLE',
    pt: 'CASOS PENDENTES',
  },
  joueurLabel: {
    fr: 'JOUEUR',
    en: 'PLAYER',
    es: 'JUGADOR',
    de: 'SPIELERIN',
    pt: 'JOGADOR',
  },
  sortieLabel: {
    fr: 'LA SORTIE',
    en: 'THE ACTIVITY',
    es: 'LA SALIDA',
    de: 'DIE AKTIVITÄT',
    pt: 'A ATIVIDADE',
  },
  sortieResume: {
    fr: '{distance} km · {duree} min · {allure} min/km',
    en: '{distance} km · {duree} min · {allure} min/km',
    es: '{distance} km · {duree} min · {allure} min/km',
    de: '{distance} km · {duree} min · {allure} min/km',
    pt: '{distance} km · {duree} min · {allure} min/km',
  },
  scoreLabel: {
    fr: 'SCORE DE VÉRIFICATION',
    en: 'VERIFICATION SCORE',
    es: 'PUNTUACIÓN DE VERIFICACIÓN',
    de: 'PRÜFWERT',
    pt: 'PONTUAÇÃO DE VERIFICAÇÃO',
  },
  scoreValeur: {
    fr: '{score} sur 100',
    en: '{score} out of 100',
    es: '{score} sobre 100',
    de: '{score} von 100',
    pt: '{score} em 100',
  },
  signauxLabel: {
    fr: 'MESURES QUI ONT PESÉ',
    en: 'MEASURES THAT WEIGHED IN',
    es: 'MEDIDAS QUE PESARON',
    de: 'MESSUNGEN, DIE ZÄHLTEN',
    pt: 'MEDIDAS QUE PESARAM',
  },
  // ── Les DEUX mesures que E28 ne nomme pas encore ─────────────────────────
  // `catalog/appel.ts` porte neuf libellés de signaux ; le moteur en émet onze
  // depuis ADR-015 (`discipline_mismatch`, `mocked_location`). Sur E28, les deux
  // retombent sur « Autre mesure » — ce sont pourtant les plus décisives, et un
  // modérateur qui lit « Autre mesure » juge à l'aveugle. On les nomme ICI
  // plutôt que d'éditer le catalogue du joueur, qui appartient à un autre lot :
  // le jour où E28 les nomme aussi, ces deux entrées disparaissent au profit des
  // siennes. Le vocabulaire reste celui d'une MESURE, jamais d'une intention.
  sigDisciplineMismatch: {
    fr: 'Discipline déclarée et déplacement mesuré',
    en: 'Declared sport and measured movement',
    es: 'Disciplina declarada y desplazamiento medido',
    de: 'Angegebene Sportart und gemessene Bewegung',
    pt: 'Modalidade declarada e deslocamento medido',
  },
  sigMockedLocation: {
    fr: 'Position déclarée simulée par l’appareil',
    en: 'Location reported as simulated by the device',
    es: 'Posición declarada simulada por el dispositivo',
    de: 'Vom Gerät als simuliert gemeldeter Standort',
    pt: 'Posição informada como simulada pelo aparelho',
  },
  signalAucun: {
    fr: 'Aucune mesure disponible n’a pesé. Le dossier tient sur le score seul.',
    en: 'No available measure weighed in. The case rests on the score alone.',
    es: 'Ninguna medida disponible pesó. El caso se sostiene solo en la puntuación.',
    de: 'Keine verfügbare Messung fiel ins Gewicht. Der Fall stützt sich nur auf den Wert.',
    pt: 'Nenhuma medida disponível pesou. O caso se apoia apenas na pontuação.',
  },
  captureLabel: {
    fr: 'TERRITOIRE',
    en: 'TERRITORY',
    es: 'TERRITORIO',
    de: 'GEBIET',
    pt: 'TERRITÓRIO',
  },
  capturePending: {
    fr: 'Gelé, en attente de cette décision.',
    en: 'Frozen, waiting for this decision.',
    es: 'Congelado, a la espera de esta decisión.',
    de: 'Eingefroren, wartet auf diese Entscheidung.',
    pt: 'Congelado, aguardando esta decisão.',
  },
  captureExpire: {
    fr: 'Déjà refusé, le plus souvent parce que plus de 24 h se sont écoulées depuis la fermeture de la boucle. Une validation reconnaîtra la sortie, mais ne rendra pas le terrain.',
    en: 'Already refused, most often because more than 24 h have passed since the loop closed. Clearing will recognise the activity, but will not give the territory back.',
    es: 'Ya rechazado, casi siempre porque han pasado más de 24 h desde el cierre del bucle. Validar reconocerá la salida, pero no devolverá el territorio.',
    de: 'Bereits abgelehnt, meist weil seit dem Schließen der Schleife mehr als 24 Std. vergangen sind. Eine Freigabe erkennt die Aktivität an, gibt das Gebiet aber nicht zurück.',
    pt: 'Já recusado, quase sempre porque passaram mais de 24 h desde o fechamento do circuito. Validar reconhece a atividade, mas não devolve o território.',
  },
  captureAutre: {
    fr: 'Aucun territoire en attente sur cette sortie.',
    en: 'No territory pending on this activity.',
    es: 'Ningún territorio pendiente en esta salida.',
    de: 'Kein Gebiet zu dieser Aktivität offen.',
    pt: 'Nenhum território pendente nesta atividade.',
  },
  appelLabel: {
    fr: 'CE QUE LE JOUEUR RÉPOND',
    en: 'WHAT THE PLAYER SAYS',
    es: 'LO QUE RESPONDE EL JUGADOR',
    de: 'WAS DIE SPIELERIN SAGT',
    pt: 'O QUE O JOGADOR RESPONDE',
  },
  appelAucun: {
    fr: 'Aucun appel déposé. L’absence de réponse n’est pas un aveu : elle est souvent l’absence de notification.',
    en: 'No appeal filed. Silence is not an admission: it is often the absence of a notification.',
    es: 'Ninguna apelación presentada. El silencio no es una confesión: suele ser la falta de aviso.',
    de: 'Kein Einspruch eingelegt. Schweigen ist kein Geständnis: meist fehlt schlicht die Benachrichtigung.',
    pt: 'Nenhum recurso enviado. O silêncio não é uma confissão: costuma ser a falta de aviso.',
  },
  appelSansMot: {
    fr: 'Appel déposé, sans message.',
    en: 'Appeal filed, with no message.',
    es: 'Apelación presentada, sin mensaje.',
    de: 'Einspruch eingelegt, ohne Nachricht.',
    pt: 'Recurso enviado, sem mensagem.',
  },

  // ── La décision ───────────────────────────────────────────────────────────
  decisionLabel: {
    fr: 'TA DÉCISION',
    en: 'YOUR DECISION',
    es: 'TU DECISIÓN',
    de: 'DEINE ENTSCHEIDUNG',
    pt: 'SUA DECISÃO',
  },
  noteLabel: {
    fr: 'Note (conservée dans le journal)',
    en: 'Note (kept in the log)',
    es: 'Nota (guardada en el registro)',
    de: 'Notiz (bleibt im Protokoll)',
    pt: 'Nota (salva no registro)',
  },
  notePlaceholder: {
    fr: 'Ce qui t’a décidé, en une phrase.',
    en: 'What made up your mind, in one sentence.',
    es: 'Lo que te hizo decidir, en una frase.',
    de: 'Was den Ausschlag gab, in einem Satz.',
    pt: 'O que fez você decidir, em uma frase.',
  },
  valider: {
    fr: 'Valider',
    en: 'Clear',
    es: 'Validar',
    de: 'Freigeben',
    pt: 'Validar',
  },
  rejeter: {
    fr: 'Rejeter',
    en: 'Reject',
    es: 'Rechazar',
    de: 'Ablehnen',
    pt: 'Rejeitar',
  },
  annuler: {
    fr: 'Annuler',
    en: 'Cancel',
    es: 'Cancelar',
    de: 'Abbrechen',
    pt: 'Cancelar',
  },
  confirmerValiderTitle: {
    fr: 'Valider cette sortie ?',
    en: 'Clear this activity?',
    es: '¿Validar esta salida?',
    de: 'Diese Aktivität freigeben?',
    pt: 'Validar esta atividade?',
  },
  confirmerValiderBody: {
    fr: 'La sortie est reconnue honnête. Son territoire encore gelé repart vers la publication, ses XP redeviennent éligibles, et le dossier se ferme.',
    en: 'The activity is recognised as honest. Its still-frozen territory goes back to publication, its XP become eligible again, and the case closes.',
    es: 'La salida se reconoce honesta. Su territorio aún congelado vuelve a publicación, sus XP vuelven a ser elegibles y el caso se cierra.',
    de: 'Die Aktivität gilt als ehrlich. Ihr noch eingefrorenes Gebiet geht zurück zur Veröffentlichung, ihre XP werden wieder gültig, und der Fall wird geschlossen.',
    pt: 'A atividade é reconhecida como honesta. O território ainda congelado volta para publicação, os XP voltam a contar, e o caso é encerrado.',
  },
  confirmerRejeterTitle: {
    fr: 'Rejeter cette sortie ?',
    en: 'Reject this activity?',
    es: '¿Rechazar esta salida?',
    de: 'Diese Aktivität ablehnen?',
    pt: 'Rejeitar esta atividade?',
  },
  confirmerRejeterBody: {
    fr: 'Le territoire gelé devient un refus daté. La sortie reste enregistrée comme sport, et le joueur lit la décision sur son écran de vérification.',
    en: 'The frozen territory becomes a dated refusal. The activity stays recorded as sport, and the player reads the decision on their verification screen.',
    es: 'El territorio congelado pasa a ser un rechazo fechado. La salida sigue registrada como deporte, y el jugador lee la decisión en su pantalla de verificación.',
    de: 'Das eingefrorene Gebiet wird zu einer datierten Ablehnung. Die Aktivität bleibt als Sport gespeichert, und die Spielerin liest die Entscheidung auf ihrem Prüfbildschirm.',
    pt: 'O território congelado vira uma recusa datada. A atividade continua registrada como esporte, e o jogador lê a decisão na tela de verificação dele.',
  },
  envoiEnCours: {
    fr: 'Envoi de la décision',
    en: 'Sending the decision',
    es: 'Enviando la decisión',
    de: 'Entscheidung wird gesendet',
    pt: 'Enviando a decisão',
  },
  envoiEchec: {
    fr: 'La décision n’est pas partie. Rien n’a été écrit : réessaie.',
    en: 'The decision did not go through. Nothing was written: try again.',
    es: 'La decisión no se envió. No se escribió nada: reinténtalo.',
    de: 'Die Entscheidung ging nicht durch. Nichts wurde geschrieben: versuche es erneut.',
    pt: 'A decisão não foi enviada. Nada foi escrito: tente de novo.',
  },
  envoiRefus: {
    fr: 'Le serveur a refusé cette décision. Une sortie qui t’appartient ne se juge pas toi-même.',
    en: 'The server refused this decision. You never rule on your own activity.',
    es: 'El servidor rechazó esta decisión. Nadie juzga su propia salida.',
    de: 'Der Server hat diese Entscheidung abgelehnt. Über die eigene Aktivität entscheidet man nie selbst.',
    pt: 'O servidor recusou esta decisão. Ninguém julga a sua própria atividade.',
  },

  // ── Ce que la décision a réellement fait ──────────────────────────────────
  resultatValide: {
    fr: 'Sortie validée.',
    en: 'Activity cleared.',
    es: 'Salida validada.',
    de: 'Aktivität freigegeben.',
    pt: 'Atividade validada.',
  },
  resultatRejete: {
    fr: 'Sortie rejetée.',
    en: 'Activity rejected.',
    es: 'Salida rechazada.',
    de: 'Aktivität abgelehnt.',
    pt: 'Atividade rejeitada.',
  },
  resultatDejaClos: {
    fr: 'Ce dossier était déjà clos. Rien n’a été rejugé.',
    en: 'This case was already closed. Nothing was re-judged.',
    es: 'Este caso ya estaba cerrado. Nada se volvió a juzgar.',
    de: 'Dieser Fall war bereits geschlossen. Es wurde nichts neu bewertet.',
    pt: 'Este caso já estava encerrado. Nada foi julgado de novo.',
  },
  resultatTerrainRendu: {
    fr: '{n} portion(s) de terrain repartent vers la publication.',
    en: '{n} territory piece(s) go back to publication.',
    es: '{n} porción(es) de territorio vuelven a publicación.',
    de: '{n} Gebietsteil(e) gehen zurück zur Veröffentlichung.',
    pt: '{n} porção(ões) de território voltam à publicação.',
  },
  resultatTerrainRefuse: {
    fr: '{n} portion(s) de terrain deviennent un refus daté.',
    en: '{n} territory piece(s) become a dated refusal.',
    es: '{n} porción(es) de territorio pasan a ser un rechazo fechado.',
    de: '{n} Gebietsteil(e) werden zu einer datierten Ablehnung.',
    pt: '{n} porção(ões) de território tornam-se uma recusa datada.',
  },
  resultatTerrainExpire: {
    fr: '{n} portion(s) de terrain avaient déjà expiré : elles ne reviennent pas.',
    en: '{n} territory piece(s) had already expired: they do not come back.',
    es: '{n} porción(es) de territorio ya habían expirado: no vuelven.',
    de: '{n} Gebietsteil(e) waren bereits abgelaufen: sie kommen nicht zurück.',
    pt: '{n} porção(ões) de território já tinham expirado: não voltam.',
  },
  resultatTerrainNonConfirme: {
    fr: '{n} portion(s) restent en attente : l’origine de la trace n’a pas pu être confirmée.',
    en: '{n} piece(s) stay pending: the origin of the trace could not be confirmed.',
    es: '{n} porción(es) quedan pendientes: no se pudo confirmar el origen de la traza.',
    de: '{n} Teil(e) bleiben offen: die Herkunft der Aufzeichnung ließ sich nicht bestätigen.',
    pt: '{n} porção(ões) ficam pendentes: não foi possível confirmar a origem do traço.',
  },
  resultatXp: {
    fr: 'Les XP de cette sortie redeviennent éligibles. Elles seront recalculées à la prochaine sortie du joueur.',
    en: 'This activity becomes XP-eligible again. XP are recomputed on the player’s next activity.',
    es: 'Esta salida vuelve a ser elegible para XP. Se recalcularán en la próxima salida del jugador.',
    de: 'Diese Aktivität zählt wieder für XP. Sie werden bei der nächsten Aktivität neu berechnet.',
    pt: 'Esta atividade volta a contar para XP. Serão recalculados na próxima atividade do jogador.',
  },
  resultatAppelClos: {
    fr: 'L’appel du joueur est clos avec la même décision.',
    en: 'The player’s appeal is closed with the same decision.',
    es: 'La apelación del jugador se cierra con la misma decisión.',
    de: 'Der Einspruch wird mit derselben Entscheidung geschlossen.',
    pt: 'O recurso do jogador é encerrado com a mesma decisão.',
  },

  // ── Le rappel qui vaut plus qu'un délai promis ────────────────────────────
  deontologieLabel: {
    fr: 'CE QUE TU DOIS SAVOIR',
    en: 'WHAT YOU NEED TO KNOW',
    es: 'LO QUE DEBES SABER',
    de: 'WAS DU WISSEN MUSST',
    pt: 'O QUE VOCÊ PRECISA SABER',
  },
  deontologieBody: {
    fr: 'Le terrain d’une sortie gelée expire 24 h après la fermeture de la boucle : au-delà, une validation ne le rend plus. Tu ne peux pas juger tes propres sorties, le serveur le refuse. Chaque décision est journalisée avec ton nom, sa date et ta note.',
    en: 'A frozen activity’s territory expires 24 h after the loop closed: past that, clearing no longer gives it back. You cannot rule on your own activities, the server refuses. Every decision is logged with your name, its date and your note.',
    es: 'El territorio de una salida congelada expira 24 h tras cerrarse el bucle: pasado ese plazo, validar ya no lo devuelve. No puedes juzgar tus propias salidas, el servidor lo rechaza. Cada decisión queda registrada con tu nombre, su fecha y tu nota.',
    de: 'Das Gebiet einer eingefrorenen Aktivität verfällt 24 Std. nach dem Schließen der Schleife: danach gibt eine Freigabe es nicht mehr zurück. Über eigene Aktivitäten darfst du nicht entscheiden, der Server verweigert es. Jede Entscheidung wird mit deinem Namen, Datum und Notiz protokolliert.',
    pt: 'O território de uma atividade congelada expira 24 h após o fechamento do circuito: depois disso, validar não devolve mais nada. Você não pode julgar as próprias atividades, o servidor recusa. Cada decisão fica registrada com seu nome, a data e sua nota.',
  },
});
