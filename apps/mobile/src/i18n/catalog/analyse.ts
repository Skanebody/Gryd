/**
 * GRYD — i18n : catalogue de l'écran E27 « Analyse et synchronisation »
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, l.1254-1268).
 *
 * L'écran qui tient entre la fin de l'activité (E26) et le Résultat (E29-E34) :
 * carte avec la trace, étapes franchies, message hors ligne si l'envoi est
 * différé. Règle de la spec, reprise mot pour mot : « L'utilisateur peut
 * quitter. […] Ne jamais bloquer plusieurs minutes sur un faux spinner. »
 *
 * ─── REGISTRE ───────────────────────────────────────────────────────────────
 * Tutoiement fr, « tú » es, « du » de, « você » pt-BR (jamais teu/tua).
 *
 * ─── LES TROIS ÉTAPES NE SONT PAS CELLES DE LA SPEC, ET C'EST LE POINT ──────
 * La spec liste « sécurisation ; analyse de boucle ; validation territoriale ».
 * Les DEUX DERNIÈRES se déroulent à l'intérieur du MÊME appel serveur : le
 * client ne peut pas savoir quand l'une finit et l'autre commence. Peindre deux
 * étapes qui avancent « toutes seules » serait exactement la « progression
 * artificielle » que la ligne suivante de la spec interdit — et la forme la plus
 * banale du mensonge d'écran.
 *
 * Les étapes servies ici sont donc les TROIS TRANSITIONS RÉELLEMENT OBSERVÉES
 * par le client, dans l'ordre :
 *   1. `step1*` — sécurisation : la sortie est finalisée et écrite localement ;
 *   2. `step2*` — envoi : la requête part (ou attend un réseau) ;
 *   3. `step3*` — analyse : le serveur a reçu, il juge. C'est l'étape qui
 *      recouvre « analyse de boucle » ET « validation territoriale », et son
 *      libellé le dit honnêtement plutôt que de simuler deux avancements.
 * Chaque étape a TROIS états distincts (à venir / en cours / faite) : sans
 * `*Pending`, une étape non commencée se lirait comme une étape en cours.
 *
 * ─── QUATRE ÉTATS DE L'ÉCRAN, JAMAIS CONFONDUS ─────────────────────────────
 *   · en cours   → les `*Active` ci-dessous ;
 *   · hors ligne → `queuedTitle` / `queuedBody` (rien n'est perdu, rien n'est
 *     promis « bientôt ») ;
 *   · échec      → `failedTitle` / `failedBody` + `retry` (une VRAIE reprise) ;
 *   · terminé    → l'écran cède la place au Résultat ; aucun texte de victoire
 *     n'est écrit ici, le verdict appartient au serveur et à E29-E34.
 *
 * ─── QUITTER : DEUX PHRASES, PARCE QU'IL Y A DEUX RÉALITÉS ─────────────────
 * `leaveNotified` ne s'affiche QUE si une notification peut réellement partir
 * (permission accordée ET rail push opérationnel). Sinon `leaveSilent`, qui
 * promet ce que l'app tient sans personne : le résultat attendra dans
 * l'historique. Promettre une notification qu'aucun credential ne peut envoyer,
 * c'est une garantie écrite avant le code.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Entête ────────────────────────────────────────────────────────────────
  title: {
    fr: 'Analyse en cours',
    en: 'Analysis in progress',
    es: 'Análisis en curso',
    de: 'Auswertung läuft',
    pt: 'Análise em curso',
  },
  /**
   * LECTURE EN COURS — le 4ᵉ état de la constitution, et le plus vite bâclé.
   * Tant que la première observation n'a pas rendu, l'écran ne sait RIEN : ni
   * qu'une sortie existe, ni qu'elle est partie, ni qu'elle attend. Il le dit,
   * plutôt que d'afficher « Sécurisation… » — qui affirmerait un travail que
   * personne n'a encore constaté.
   */
  reading: {
    fr: 'Lecture de l’état de ta sortie…',
    en: 'Reading the state of your outing…',
    es: 'Leyendo el estado de tu salida…',
    de: 'Status deiner Aktivität wird gelesen…',
    pt: 'Lendo o estado da sua atividade…',
  },
  /** a11y de la carte : c'est la trace de la sortie qui vient de finir. */
  a11yTrace: {
    fr: 'Tracé de la sortie qui vient de se terminer',
    en: 'Route of the outing that just ended',
    es: 'Trazado de la salida que acaba de terminar',
    de: 'Strecke der gerade beendeten Aktivität',
    pt: 'Traçado da atividade que acabou de terminar',
  },

  // ── Étape 1 — sécurisation (locale) ───────────────────────────────────────
  step1Pending: {
    fr: 'Sécurisation',
    en: 'Securing',
    es: 'Aseguramiento',
    de: 'Sicherung',
    pt: 'Segurança',
  },
  step1Active: {
    fr: 'Sécurisation de ta sortie…',
    en: 'Securing your outing…',
    es: 'Asegurando tu salida…',
    de: 'Deine Aktivität wird gesichert…',
    pt: 'Protegendo sua atividade…',
  },
  /**
   * ⚠ CORRECTIF 27/07 — cette ligne disait « Sortie enregistrée sur ton
   * appareil » et s'affichait dans TOUTES les phases où l'étape 1 valait `done`,
   * y compris celles où RIEN n'était écrit sur le disque (pas de backend) et
   * celles où la sortie était partie chez le serveur (les clés locales venant
   * justement d'être purgées). L'étape 1 ne peut désormais valoir `done` que
   * dans deux situations, et la phrase doit être vraie dans les DEUX :
   *   · la sortie est dans la file FIFO relue sur le disque (`local_saved`) ;
   *   · le serveur l'a acceptée (`server_accepted`).
   * « À l'abri » est ce qu'elles ont en commun — et c'est tout ce qu'on affirme.
   * La destination exacte est dite par la phrase de situation, sous la liste.
   */
  step1Done: {
    fr: 'Ta sortie est à l’abri',
    en: 'Your outing is safe',
    es: 'Tu salida está a salvo',
    de: 'Deine Aktivität ist in Sicherheit',
    pt: 'Sua atividade está protegida',
  },

  // ── Étape 2 — envoi ───────────────────────────────────────────────────────
  step2Pending: {
    fr: 'Envoi',
    en: 'Upload',
    es: 'Envío',
    de: 'Übertragung',
    pt: 'Envio',
  },
  step2Active: {
    fr: 'Envoi au serveur…',
    en: 'Uploading to the server…',
    es: 'Enviando al servidor…',
    de: 'Wird an den Server gesendet…',
    pt: 'Enviando ao servidor…',
  },
  step2Done: {
    fr: 'Sortie reçue par le serveur',
    en: 'Outing received by the server',
    es: 'Salida recibida por el servidor',
    de: 'Aktivität vom Server empfangen',
    pt: 'Atividade recebida pelo servidor',
  },

  // ── Étape 3 — analyse serveur (boucle + territoire, une seule attente) ────
  step3Pending: {
    fr: 'Analyse',
    en: 'Analysis',
    es: 'Análisis',
    de: 'Auswertung',
    pt: 'Análise',
  },
  /**
   * Une seule phrase pour les deux traitements serveur : le client attend UN
   * verdict, il n'a aucun moyen de savoir lequel des deux est en cours.
   */
  step3Active: {
    fr: 'Le serveur analyse ta boucle et ton territoire…',
    en: 'The server is analysing your loop and territory…',
    es: 'El servidor analiza tu bucle y tu territorio…',
    de: 'Der Server wertet deine Schleife und dein Gebiet aus…',
    pt: 'O servidor analisa seu circuito e seu território…',
  },
  step3Done: {
    fr: 'Analyse terminée',
    en: 'Analysis complete',
    es: 'Análisis terminado',
    de: 'Auswertung abgeschlossen',
    pt: 'Análise concluída',
  },
  /** a11y de la liste d'étapes : l'état RÉEL, jamais un pourcentage inventé. */
  a11yStep: {
    fr: 'Étape {n} sur {total} : {label}',
    en: 'Step {n} of {total}: {label}',
    es: 'Paso {n} de {total}: {label}',
    de: 'Schritt {n} von {total}: {label}',
    pt: 'Etapa {n} de {total}: {label}',
  },

  // ── Hors ligne : l'envoi est différé ──────────────────────────────────────
  queuedTitle: {
    fr: 'Envoi différé',
    en: 'Upload deferred',
    es: 'Envío diferido',
    de: 'Übertragung verschoben',
    pt: 'Envio adiado',
  },
  /**
   * Ce qui est VRAI : la sortie est gardée et repartira dès que l'envoi
   * redeviendra possible. Aucun délai n'est annoncé — personne ne sait quand le
   * réseau revient.
   *
   * ⚠ 27/07/2026 — « PAS DE RÉSEAU. » A ÉTÉ RETIRÉ DE CETTE PHRASE. La file
   * s'arrête pour DEUX raisons que l'écran ne distingue pas (`DrainReport
   * .stoppedBy` : `retry_later` = réseau/5xx/429, `no_session` = personne n'est
   * connecté). Nommer la cause revenait donc à en inventer une une fois sur
   * deux — un joueur déconnecté lisait « pas de réseau » avec quatre barres.
   * Ce qui reste est vrai dans les deux cas, et c'est tout ce qu'on affirme.
   */
  queuedBody: {
    fr: 'Ta sortie est gardée sur ton appareil et sera envoyée dès que possible.',
    en: 'Your outing is kept on your device and will be sent as soon as possible.',
    es: 'Tu salida se guarda en tu dispositivo y se enviará en cuanto se pueda.',
    de: 'Deine Aktivität bleibt auf deinem Gerät und wird sobald wie möglich gesendet.',
    pt: 'Sua atividade fica guardada no seu aparelho e será enviada assim que der.',
  },
  /**
   * Combien de sorties attendent VRAIMENT (la file en porte plusieurs). Affiché
   * seulement quand la file a été lue : jamais « 0 », jamais « 1 » par défaut.
   *
   * ⚠ 27/07/2026 — CE COMPTE DIT MAINTENANT CE QU'IL COMPTE. C'est le TOTAL de
   * la file, toutes sorties confondues. Il ne s'affiche que dans la phase
   * `deferred`, laquelle n'est désormais atteinte que si la sortie du joueur est
   * RÉELLEMENT dans la file (`runInQueue === 'queued'`, syncFacts.ts) : « ta
   * sortie comprise » est donc vrai à chaque fois qu'il est peint. Avant ce
   * correctif, la phase se déclenchait sur un compte GLOBAL, et ce même nombre
   * s'affichait pour une course que la file venait de REFUSER — le joueur lisait
   * « 12 en attente » en croyant y être.
   */
  queuedDepth: {
    fr: '{n} en attente d’envoi, ta sortie comprise',
    en: '{n} waiting to be sent, yours included',
    es: '{n} en espera de envío, la tuya incluida',
    de: '{n} in der Warteschlange, deine ist dabei',
    pt: '{n} aguardando envio, incluindo a sua',
  },

  // ── Échec d'envoi : LE SERVEUR EST EN PANNE ───────────────────────────────
  // `failedTitle`/`failedBody` étaient le SEUL couple d'échec du catalogue. Il
  // servait donc indifféremment une panne serveur, un refus de course et une
  // sortie non stockée — trois situations qui n'appellent ni la même action ni
  // la même inquiétude, réduites à une seule phrase. Ils sont désormais
  // spécialisés « serveur en erreur », et chacune des autres a la sienne.
  failedTitle: {
    fr: 'Serveur indisponible',
    en: 'Server unavailable',
    es: 'Servidor no disponible',
    de: 'Server nicht erreichbar',
    pt: 'Servidor indisponível',
  },
  failedBody: {
    fr: 'Le serveur n’a pas pu traiter ta sortie. Elle reste enregistrée sur ton appareil.',
    en: 'The server couldn’t process your outing. It stays saved on your device.',
    es: 'El servidor no pudo procesar tu salida. Sigue guardada en tu dispositivo.',
    de: 'Der Server konnte deine Aktivität nicht verarbeiten. Sie bleibt auf deinem Gerät.',
    pt: 'O servidor não conseguiu processar sua atividade. Ela continua salva no aparelho.',
  },

  // ── La course a été REFUSÉE : le serveur a jugé ───────────────────────────
  // Aucune reprise n'est proposée (l'idempotence rendrait le même verdict), et
  // aucun langage accusatoire — même règle que E28.
  rejectedTitle: {
    fr: 'Sortie non retenue',
    en: 'Outing not counted',
    es: 'Salida no contabilizada',
    de: 'Aktivität nicht gewertet',
    pt: 'Atividade não contabilizada',
  },
  rejectedBody: {
    fr: 'Cette sortie n’a pas été retenue pour le territoire. Elle reste dans ton historique.',
    en: 'This outing wasn’t counted for territory. It stays in your history.',
    es: 'Esta salida no se contabilizó para el territorio. Sigue en tu historial.',
    de: 'Diese Aktivität wurde nicht für Gebiet gewertet. Sie bleibt in deinem Verlauf.',
    pt: 'Esta atividade não contou para o território. Ela continua no seu histórico.',
  },

  // ── La sortie n'a PAS pu être mise à l'abri ───────────────────────────────
  // Le cas le plus grave : ni envoyée, ni en file. On ne l'habille pas.
  unstoredTitle: {
    fr: 'Sortie non mise en file',
    en: 'Outing not queued',
    es: 'Salida no puesta en cola',
    de: 'Aktivität nicht eingereiht',
    pt: 'Atividade não enfileirada',
  },
  unstoredBody: {
    fr: 'Ta sortie n’a pas pu être mise en file d’envoi. Elle sera reproposée à ta prochaine course.',
    en: 'Your outing couldn’t be queued for upload. It will be offered again at your next run.',
    es: 'Tu salida no se pudo poner en cola de envío. Se te propondrá de nuevo en tu próxima carrera.',
    de: 'Deine Aktivität konnte nicht zur Übertragung eingereiht werden. Sie wird dir beim nächsten Lauf erneut angeboten.',
    pt: 'Sua atividade não pôde entrar na fila de envio. Ela será oferecida de novo na próxima corrida.',
  },

  // ── Aucun serveur configuré (O1 ouvert) ───────────────────────────────────
  // On ne peint AUCUNE reprise ici : elle échouerait toujours (bouton mort).
  noBackendTitle: {
    fr: 'Analyse indisponible',
    en: 'Analysis unavailable',
    es: 'Análisis no disponible',
    de: 'Auswertung nicht verfügbar',
    pt: 'Análise indisponível',
  },
  /**
   * ⚠ CORRECTIF 27/07 — cette phrase affirmait « Ta sortie est enregistrée sur
   * ton appareil ». C'était faux exactement ici : sans backend, `uploadOrQueue`
   * sort en 'none' avant la file et `finish()` purge les clés de la course. La
   * sortie n'est nulle part sur le disque. On dit maintenant ce qui est, y
   * compris la partie désagréable — c'est le prix de « l'app ne ment jamais ».
   */
  noBackendBody: {
    fr: 'Cette version n’est reliée à aucun serveur : ta sortie ne peut être ni envoyée ni validée, et elle n’est pas conservée sur cet appareil. Les chiffres de ton résultat restent affichés jusqu’à la fermeture.',
    en: 'This build isn’t connected to a server: your outing can’t be uploaded or validated, and it isn’t kept on this device. Your result figures stay on screen until you close it.',
    es: 'Esta versión no está conectada a ningún servidor: tu salida no se puede enviar ni validar, y no se conserva en este dispositivo. Las cifras de tu resultado siguen visibles hasta que lo cierres.',
    de: 'Diese Version ist mit keinem Server verbunden: Deine Aktivität kann weder übertragen noch bestätigt werden und bleibt nicht auf diesem Gerät. Die Zahlen deines Ergebnisses bleiben bis zum Schließen sichtbar.',
    pt: 'Esta versão não está ligada a nenhum servidor: sua atividade não pode ser enviada nem validada, e não fica guardada neste aparelho. Os números do seu resultado ficam na tela até você fechar.',
  },

  // ── Aucune sortie à analyser (écran ouvert hors contexte) ─────────────────
  noRunTitle: {
    fr: 'Aucune sortie à analyser',
    en: 'No outing to analyse',
    es: 'Ninguna salida que analizar',
    de: 'Keine Aktivität zum Auswerten',
    pt: 'Nenhuma atividade para analisar',
  },
  noRunBody: {
    fr: 'Cet écran suit la synchronisation d’une sortie qui vient de se terminer. Il n’y en a aucune en ce moment.',
    en: 'This screen follows the sync of an outing that just ended. There isn’t one right now.',
    es: 'Esta pantalla sigue la sincronización de una salida recién terminada. Ahora mismo no hay ninguna.',
    de: 'Dieser Bildschirm verfolgt die Synchronisierung einer gerade beendeten Aktivität. Momentan gibt es keine.',
    pt: 'Esta tela acompanha a sincronização de uma atividade recém-terminada. No momento não há nenhuma.',
  },

  // ── L'issue existe, mais cet écran ne peut pas la lire ────────────────────
  // Le 3ᵉ des quatre états de la constitution : « échec de chargement ». Il ne
  // se confond ni avec « en cours », ni avec un succès.
  unreadableTitle: {
    fr: 'Issue non lisible',
    en: 'Outcome unreadable',
    es: 'Resultado no legible',
    de: 'Ergebnis nicht lesbar',
    pt: 'Resultado ilegível',
  },
  /**
   * ⚠ CORRECTIF 27/07 — la phrase ajoutait « Elle reste enregistrée sur ton
   * appareil », une consolation qu'aucune lecture n'établissait : cette phase est
   * atteinte file VIDE ou file ILLISIBLE, c'est-à-dire précisément quand on ne
   * sait pas où la sortie se trouve. On ne remplace pas ce mensonge par un autre
   * (« elle est perdue » serait tout aussi inventé) : on dit l'inconnu, et le
   * seul geste qui a une prise réelle reste peint (« Réessayer » draine la file).
   */
  unreadableBody: {
    fr: 'Impossible de lire ce que le serveur a décidé pour cette sortie, ni de dire où elle en est. Réessaie : la reprise relit la file d’envoi.',
    en: 'We can’t read what the server decided for this outing, nor where it stands. Try again: retrying re-reads the upload queue.',
    es: 'No se puede leer lo que el servidor decidió para esta salida, ni en qué punto está. Inténtalo de nuevo: el reintento vuelve a leer la cola de envío.',
    de: 'Es lässt sich weder lesen, was der Server für diese Aktivität entschieden hat, noch wo sie steht. Versuch es erneut: Der Neuversuch liest die Warteschlange neu.',
    pt: 'Não dá para ler o que o servidor decidiu para esta atividade, nem em que ponto ela está. Tente de novo: a retomada relê a fila de envio.',
  },

  retry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  /** Reprise EN COURS : le libellé reste, l'action est verrouillée (Button loading). */
  retryRunning: {
    fr: 'Envoi en cours…',
    en: 'Sending…',
    es: 'Enviando…',
    de: 'Wird gesendet…',
    pt: 'Enviando…',
  },
  /** Le verdict est là : E27 a fini son travail, le Résultat prend la suite. */
  seeResult: {
    fr: 'Voir le résultat',
    en: 'See the result',
    es: 'Ver el resultado',
    de: 'Ergebnis ansehen',
    pt: 'Ver o resultado',
  },

  // ── États d'étape, en toutes lettres (a11y + pastille) ────────────────────
  // Une couleur ou une coche ne suffit pas : l'état de chaque étape doit être
  // LISIBLE, y compris au lecteur d'écran.
  statePending: {
    fr: 'à venir',
    en: 'up next',
    es: 'pendiente',
    de: 'ausstehend',
    pt: 'a seguir',
  },
  stateActive: {
    fr: 'en cours',
    en: 'in progress',
    es: 'en curso',
    de: 'läuft',
    pt: 'em curso',
  },
  stateDone: {
    fr: 'terminée',
    en: 'done',
    es: 'terminado',
    de: 'erledigt',
    pt: 'concluída',
  },
  stateWaiting: {
    fr: 'en attente',
    en: 'waiting',
    es: 'en espera',
    de: 'wartet',
    pt: 'aguardando',
  },
  stateFailed: {
    fr: 'échec',
    en: 'failed',
    es: 'fallo',
    de: 'fehlgeschlagen',
    pt: 'falhou',
  },
  stateUnavailable: {
    fr: 'indisponible',
    en: 'unavailable',
    es: 'no disponible',
    de: 'nicht verfügbar',
    pt: 'indisponível',
  },
  stateUnknown: {
    fr: 'inconnu',
    en: 'unknown',
    es: 'desconocido',
    de: 'unbekannt',
    pt: 'desconhecido',
  },

  // ── Quitter l'écran ───────────────────────────────────────────────────────
  leaveCta: {
    fr: 'Continuer sans attendre',
    en: 'Carry on without waiting',
    es: 'Seguir sin esperar',
    de: 'Weiter, ohne zu warten',
    pt: 'Continuar sem esperar',
  },
  /** Servi UNIQUEMENT si une notification peut réellement partir. */
  leaveNotified: {
    fr: 'Tu peux quitter : on te prévient quand le résultat est prêt.',
    en: 'You can leave: we’ll let you know when the result is ready.',
    es: 'Puedes salir: te avisamos cuando el resultado esté listo.',
    de: 'Du kannst gehen: Wir melden uns, wenn das Ergebnis da ist.',
    pt: 'Você pode sair: avisamos quando o resultado estiver pronto.',
  },
  /** Défaut honnête quand aucune notification ne peut être envoyée. */
  leaveSilent: {
    fr: 'Tu peux quitter : le résultat t’attendra dans ton historique.',
    en: 'You can leave: the result will be waiting in your history.',
    es: 'Puedes salir: el resultado te esperará en tu historial.',
    de: 'Du kannst gehen: Das Ergebnis wartet in deinem Verlauf.',
    pt: 'Você pode sair: o resultado ficará no seu histórico.',
  },
});
