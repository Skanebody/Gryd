/**
 * GRYD — i18n : catalogue de l'écran E28 « Vérification » (route `/appel`).
 *
 * ── CE CATALOGUE NE PROMET AUCUN DÉLAI, ET C'EST LE POINT ─────────────────
 * La planche E28 demande « un délai estimatif ». Il n'y en a pas : la migration
 * 0081 crée la file de revue, mais AUCUN opérateur ne la dépile et aucun code
 * ne tient d'échéance (le suspens est écrit en toutes lettres en fin de 0081, et
 * la table n'a même pas de colonne d'échéance — un test PGlite le vérifie).
 * Écrire « une personne examine sous 48 h » serait exactement la faute qu'on
 * vient de corriger sur l'écran de résultat, un cran plus loin : la copie de
 * `flaggedWhy` (catalog/result.ts) a dû retirer « GRYD Verify examine cette
 * course » parce qu'aucune revue n'existait. On dit donc ce qui est VRAI :
 * la course est enregistrée, la capture n'est pas créditée, l'appel est reçu.
 * `delaiBody` le formule sans détour. NE PAS y remettre un délai tant qu'une
 * personne ne traite pas réellement la file.
 *
 * ── AUCUN LANGAGE ACCUSATOIRE (E28) ───────────────────────────────────────
 * Pas un mot de « triche », de « fraude » ni de « suspicion » dans les textes
 * VISIBLES. Le joueur lit un CONSTAT sur des données, pas un procès sur sa
 * personne : « les données de cette course ne permettent pas de créditer la
 * capture ». Les libellés de signaux nomment des MESURES (« précision du GPS »,
 * « podomètre et distance »), jamais une intention.
 *
 * ── AUCUN SEUIL N'EST AFFICHÉ (§11.2) ─────────────────────────────────────
 * Les seuils de pré-filtrage sont « des paramètres serveur, non exposés comme
 * règles de contournement ». Ce catalogue ne contient donc AUCUN nombre : ni
 * score, ni sévérité, ni borne. L'écran nomme les données concernées ; il
 * n'enseigne pas comment passer entre les mailles.
 *
 * ── AUCUNE ACCÉLÉRATION PAYANTE (E28, §1.6) ───────────────────────────────
 * `sansPaiement` n'est pas un argument commercial : c'est la règle
 * constitutionnelle anti pay-to-win rendue visible à l'endroit précis où un
 * joueur pressé chercherait un raccourci.
 *
 * §A CONTRAIGNANT : libellés d'action COURTS dans les 5 langues (jamais un
 * composé allemand qui tronquerait à 375 px), un seul CTA chartreuse.
 * Interpolation : mêmes {placeholders} dans les 5 langues.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── En-tête ───────────────────────────────────────────────────────────────
  title: {
    fr: 'Vérification',
    en: 'Verification',
    es: 'Verificación',
    de: 'Prüfung',
    pt: 'Verificação',
  },
  kicker: {
    fr: 'TES COURSES',
    en: 'YOUR RUNS',
    es: 'TUS CARRERAS',
    de: 'DEINE LÄUFE',
    pt: 'SUAS CORRIDAS',
  },

  // ── État : lecture en cours (n'affirme RIEN sur le joueur) ────────────────
  chargementTitle: {
    fr: 'Lecture en cours',
    en: 'Loading',
    es: 'Cargando',
    de: 'Wird geladen',
    pt: 'Carregando',
  },
  chargementBody: {
    fr: 'On lit tes vérifications. Rien n’est encore affirmé sur tes courses.',
    en: 'Reading your verifications. Nothing is being claimed about your runs yet.',
    es: 'Leyendo tus verificaciones. Todavía no se afirma nada sobre tus carreras.',
    de: 'Deine Prüfungen werden gelesen. Über deine Läufe ist noch nichts gesagt.',
    pt: 'Lendo suas verificações. Ainda não se afirma nada sobre suas corridas.',
  },

  // ── État : appareil sans serveur (mode local, O1) ─────────────────────────
  horsLigneTitle: {
    fr: 'Aucun serveur relié',
    en: 'No server connected',
    es: 'Ningún servidor conectado',
    de: 'Kein Server verbunden',
    pt: 'Nenhum servidor ligado',
  },
  horsLigneBody: {
    fr: 'Cette installation n’est reliée à aucun serveur GRYD : aucune vérification ne peut être lue ici.',
    en: 'This install is not connected to any GRYD server: no verification can be read here.',
    es: 'Esta instalación no está conectada a ningún servidor GRYD: aquí no se puede leer ninguna verificación.',
    de: 'Diese Installation ist mit keinem GRYD-Server verbunden: hier lässt sich keine Prüfung lesen.',
    pt: 'Esta instalação não está ligada a nenhum servidor GRYD: nenhuma verificação pode ser lida aqui.',
  },

  // ── État : pas connecté ───────────────────────────────────────────────────
  nonConnecteTitle: {
    fr: 'Pas de compte connecté',
    en: 'No account signed in',
    es: 'Sin cuenta conectada',
    de: 'Kein Konto angemeldet',
    pt: 'Sem conta ligada',
  },
  nonConnecteBody: {
    fr: 'Une vérification appartient à un compte. Connecte-toi pour voir les tiennes.',
    en: 'A verification belongs to an account. Sign in to see yours.',
    es: 'Una verificación pertenece a una cuenta. Inicia sesión para ver las tuyas.',
    de: 'Eine Prüfung gehört zu einem Konto. Melde dich an, um deine zu sehen.',
    pt: 'Uma verificação pertence a uma conta. Entre para ver as suas.',
  },
  seConnecter: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },

  // ── État : échec de lecture (JAMAIS confondu avec « rien à afficher ») ────
  echecTitle: {
    fr: 'Lecture impossible',
    en: 'Could not load',
    es: 'No se pudo cargar',
    de: 'Laden fehlgeschlagen',
    pt: 'Não foi possível carregar',
  },
  echecBody: {
    fr: 'On n’a pas pu lire tes vérifications. Ça ne dit rien sur tes courses — seulement que la lecture a échoué.',
    en: 'We could not read your verifications. That says nothing about your runs — only that the read failed.',
    es: 'No pudimos leer tus verificaciones. Eso no dice nada de tus carreras, solo que la lectura falló.',
    de: 'Deine Prüfungen konnten nicht gelesen werden. Das sagt nichts über deine Läufe — nur, dass das Laden fehlschlug.',
    pt: 'Não foi possível ler suas verificações. Isso não diz nada sobre suas corridas — apenas que a leitura falhou.',
  },
  reessayer: {
    fr: 'Réessayer',
    en: 'Retry',
    es: 'Reintentar',
    de: 'Erneut',
    pt: 'Tentar de novo',
  },

  // ── État : rien à afficher (le cas NORMAL) ────────────────────────────────
  videTitle: {
    fr: 'Aucune vérification',
    en: 'No verification',
    es: 'Ninguna verificación',
    de: 'Keine Prüfung',
    pt: 'Nenhuma verificação',
  },
  videBody: {
    fr: 'Aucune de tes courses n’attend de vérification. Rien à faire ici.',
    en: 'None of your runs is awaiting verification. Nothing to do here.',
    es: 'Ninguna de tus carreras espera verificación. Nada que hacer aquí.',
    de: 'Keiner deiner Läufe wartet auf eine Prüfung. Hier ist nichts zu tun.',
    pt: 'Nenhuma das suas corridas aguarda verificação. Nada a fazer aqui.',
  },

  // ── Liste ─────────────────────────────────────────────────────────────────
  sectionCourses: {
    fr: 'COURSES CONCERNÉES',
    en: 'RUNS CONCERNED',
    es: 'CARRERAS AFECTADAS',
    de: 'BETROFFENE LÄUFE',
    pt: 'CORRIDAS ENVOLVIDAS',
  },
  /** Motif — un CONSTAT sur des données, jamais une accusation. */
  motifReview: {
    fr: 'Les données de cette course demandent une vérification avant le classement.',
    en: 'The data from this run needs verification before ranking.',
    es: 'Los datos de esta carrera requieren verificación antes de la clasificación.',
    de: 'Die Daten dieses Laufs müssen vor der Wertung geprüft werden.',
    pt: 'Os dados desta corrida precisam de verificação antes da classificação.',
  },
  motifReject: {
    fr: 'Les données de cette course n’ont pas permis de créditer la capture.',
    en: 'The data from this run did not allow the capture to be credited.',
    es: 'Los datos de esta carrera no permitieron acreditar la captura.',
    de: 'Die Daten dieses Laufs erlaubten keine Gutschrift der Eroberung.',
    pt: 'Os dados desta corrida não permitiram creditar a captura.',
  },
  /** Ce qui RESTE — la moitié de l'écran que la planche demande explicitement. */
  resteLabel: {
    fr: 'CE QUI RESTE ENREGISTRÉ',
    en: 'WHAT STAYS RECORDED',
    es: 'LO QUE QUEDA REGISTRADO',
    de: 'WAS GESPEICHERT BLEIBT',
    pt: 'O QUE FICA REGISTRADO',
  },
  resteBody: {
    fr: 'Ta course, sa distance, sa durée et son tracé restent enregistrés. Seule la capture de territoire n’est pas créditée.',
    en: 'Your run, its distance, duration and route stay recorded. Only the territory capture is not credited.',
    es: 'Tu carrera, su distancia, su duración y su recorrido siguen registrados. Solo la captura de territorio no se acredita.',
    de: 'Dein Lauf, Distanz, Dauer und Strecke bleiben gespeichert. Nur die Gebietseroberung wird nicht gutgeschrieben.',
    pt: 'Sua corrida, distância, duração e percurso ficam registrados. Só a captura de território não é creditada.',
  },
  donneesLabel: {
    fr: 'DONNÉES CONCERNÉES',
    en: 'DATA CONCERNED',
    es: 'DATOS AFECTADOS',
    de: 'BETROFFENE DATEN',
    pt: 'DADOS ENVOLVIDOS',
  },

  // ── Libellés de signaux : des MESURES, jamais des intentions ──────────────
  sigSustainedSpeed: {
    fr: 'Vitesse maintenue',
    en: 'Sustained speed',
    es: 'Velocidad sostenida',
    de: 'Anhaltendes Tempo',
    pt: 'Velocidade mantida',
  },
  sigAcceleration: {
    fr: 'Variations de vitesse',
    en: 'Speed changes',
    es: 'Cambios de velocidad',
    de: 'Tempowechsel',
    pt: 'Variações de velocidade',
  },
  sigGpsAccuracy: {
    fr: 'Précision du GPS',
    en: 'GPS accuracy',
    es: 'Precisión del GPS',
    de: 'GPS-Genauigkeit',
    pt: 'Precisão do GPS',
  },
  sigGpsJumps: {
    fr: 'Ruptures du tracé',
    en: 'Gaps in the route',
    es: 'Cortes del recorrido',
    de: 'Lücken in der Strecke',
    pt: 'Quebras no percurso',
  },
  sigDistanceTimeRatio: {
    fr: 'Distance et temps',
    en: 'Distance and time',
    es: 'Distancia y tiempo',
    de: 'Distanz und Zeit',
    pt: 'Distância e tempo',
  },
  sigStepCoherence: {
    fr: 'Podomètre et distance',
    en: 'Step count and distance',
    es: 'Podómetro y distancia',
    de: 'Schrittzähler und Distanz',
    pt: 'Pedômetro e distância',
  },
  sigTraceRegularity: {
    fr: 'Régularité du tracé',
    en: 'Route regularity',
    es: 'Regularidad del recorrido',
    de: 'Gleichmäßigkeit der Strecke',
    pt: 'Regularidade do percurso',
  },
  sigDuplicateTrace: {
    fr: 'Tracé déjà enregistré',
    en: 'Route already recorded',
    es: 'Recorrido ya registrado',
    de: 'Strecke bereits gespeichert',
    pt: 'Percurso já registrado',
  },
  sigFutureTimestamps: {
    fr: 'Horloge de l’appareil',
    en: 'Device clock',
    es: 'Reloj del dispositivo',
    de: 'Geräteuhr',
    pt: 'Relógio do dispositivo',
  },
  /** Repli quand le serveur renvoie un signal que cette version ne connaît pas. */
  sigInconnu: {
    fr: 'Autre mesure',
    en: 'Other measurement',
    es: 'Otra medida',
    de: 'Andere Messung',
    pt: 'Outra medida',
  },

  // ── Statut de la vérification ─────────────────────────────────────────────
  statutLabel: {
    fr: 'STATUT',
    en: 'STATUS',
    es: 'ESTADO',
    de: 'STATUS',
    pt: 'ESTADO',
  },
  statutOpen: {
    fr: 'Enregistrée, pas encore traitée',
    en: 'Recorded, not yet handled',
    es: 'Registrada, aún sin tratar',
    de: 'Erfasst, noch nicht bearbeitet',
    pt: 'Registrada, ainda sem tratamento',
  },
  statutInProgress: {
    fr: 'En cours d’examen',
    en: 'Being examined',
    es: 'En examen',
    de: 'Wird geprüft',
    pt: 'Em análise',
  },
  statutClosed: {
    fr: 'Close',
    en: 'Closed',
    es: 'Cerrada',
    de: 'Abgeschlossen',
    pt: 'Encerrada',
  },
  decisionLabel: {
    fr: 'DÉCISION FINALE',
    en: 'FINAL DECISION',
    es: 'DECISIÓN FINAL',
    de: 'ENDGÜLTIGE ENTSCHEIDUNG',
    pt: 'DECISÃO FINAL',
  },
  decisionUpheld: {
    fr: 'Maintenue : la capture reste non créditée.',
    en: 'Upheld: the capture stays uncredited.',
    es: 'Mantenida: la captura sigue sin acreditarse.',
    de: 'Bestätigt: die Eroberung bleibt ohne Gutschrift.',
    pt: 'Mantida: a captura continua não creditada.',
  },
  decisionOverturned: {
    fr: 'Levée : la course est réhabilitée.',
    en: 'Overturned: the run is reinstated.',
    es: 'Revocada: la carrera queda rehabilitada.',
    de: 'Aufgehoben: der Lauf wird anerkannt.',
    pt: 'Revogada: a corrida é reabilitada.',
  },
  decisionPartial: {
    fr: 'Levée en partie : une portion de la course est réhabilitée.',
    en: 'Partly overturned: part of the run is reinstated.',
    es: 'Revocada en parte: una parte de la carrera queda rehabilitada.',
    de: 'Teilweise aufgehoben: ein Teil des Laufs wird anerkannt.',
    pt: 'Revogada em parte: uma parte da corrida é reabilitada.',
  },

  // ── LE DÉLAI : on dit qu'il n'y en a pas ─────────────────────────────────
  delaiLabel: {
    fr: 'DÉLAI',
    en: 'TIMEFRAME',
    es: 'PLAZO',
    de: 'FRIST',
    pt: 'PRAZO',
  },
  delaiBody: {
    fr: 'Aucun délai ne t’est annoncé, parce qu’aucun ne serait vrai aujourd’hui. Quand une décision sera prise, elle s’affichera ici.',
    en: 'No timeframe is announced, because none would be true today. When a decision is made, it will appear here.',
    es: 'No se anuncia ningún plazo, porque hoy ninguno sería cierto. Cuando se tome una decisión, aparecerá aquí.',
    de: 'Es wird keine Frist genannt, weil heute keine stimmen würde. Sobald entschieden ist, erscheint es hier.',
    pt: 'Não é anunciado nenhum prazo, porque hoje nenhum seria verdade. Quando houver decisão, aparecerá aqui.',
  },
  sansPaiement: {
    fr: 'Rien ne permet d’accélérer une vérification, et surtout pas un paiement.',
    en: 'Nothing speeds up a verification — least of all a payment.',
    es: 'Nada acelera una verificación, y menos aún un pago.',
    de: 'Nichts beschleunigt eine Prüfung — eine Zahlung erst recht nicht.',
    pt: 'Nada acelera uma verificação — muito menos um pagamento.',
  },

  // ── L'APPEL ───────────────────────────────────────────────────────────────
  appelLabel: {
    fr: 'TON APPEL',
    en: 'YOUR APPEAL',
    es: 'TU APELACIÓN',
    de: 'DEIN EINSPRUCH',
    pt: 'SEU RECURSO',
  },
  appelInvite: {
    fr: 'Tu peux demander un réexamen. Ajoute un mot si tu veux — ce n’est pas obligatoire.',
    en: 'You can ask for a review. Add a note if you want — it is not required.',
    es: 'Puedes pedir una revisión. Añade una nota si quieres, no es obligatorio.',
    de: 'Du kannst eine erneute Prüfung beantragen. Eine Notiz ist möglich, aber nicht nötig.',
    pt: 'Você pode pedir uma reavaliação. Acrescente uma nota se quiser — não é obrigatório.',
  },
  appelPlaceholder: {
    fr: 'Ce qui s’est passé (facultatif)',
    en: 'What happened (optional)',
    es: 'Qué ocurrió (opcional)',
    de: 'Was passiert ist (optional)',
    pt: 'O que aconteceu (opcional)',
  },
  appelCta: {
    fr: 'Faire appel',
    en: 'Appeal',
    es: 'Apelar',
    de: 'Einspruch',
    pt: 'Recorrer',
  },
  appelEnvoi: {
    fr: 'Envoi…',
    en: 'Sending…',
    es: 'Enviando…',
    de: 'Wird gesendet…',
    pt: 'Enviando…',
  },
  appelRecu: {
    fr: 'Appel reçu. Il est enregistré, et il attend d’être traité.',
    en: 'Appeal received. It is recorded and waiting to be handled.',
    es: 'Apelación recibida. Está registrada y espera tratamiento.',
    de: 'Einspruch erhalten. Er ist erfasst und wartet auf Bearbeitung.',
    pt: 'Recurso recebido. Está registrado e aguarda tratamento.',
  },
  appelEnCours: {
    fr: 'Ton appel est en cours d’examen.',
    en: 'Your appeal is being examined.',
    es: 'Tu apelación está en examen.',
    de: 'Dein Einspruch wird geprüft.',
    pt: 'Seu recurso está em análise.',
  },
  appelClos: {
    fr: 'Ton appel a été tranché.',
    en: 'Your appeal has been decided.',
    es: 'Tu apelación ha sido resuelta.',
    de: 'Über deinen Einspruch wurde entschieden.',
    pt: 'Seu recurso foi decidido.',
  },
  appelEchec: {
    fr: 'L’appel n’est pas parti. Rien n’a été enregistré — tu peux réessayer.',
    en: 'The appeal did not go through. Nothing was recorded — you can retry.',
    es: 'La apelación no se envió. No se registró nada; puedes reintentar.',
    de: 'Der Einspruch wurde nicht gesendet. Nichts wurde erfasst — versuch es erneut.',
    pt: 'O recurso não foi enviado. Nada ficou registrado — você pode tentar de novo.',
  },

  // ── Bas de page : ce que cet écran ne sait pas faire ──────────────────────
  honneteteLabel: {
    fr: 'CE QUE CET ÉCRAN NE FAIT PAS',
    en: 'WHAT THIS SCREEN DOES NOT DO',
    es: 'LO QUE ESTA PANTALLA NO HACE',
    de: 'WAS DIESER BILDSCHIRM NICHT TUT',
    pt: 'O QUE ESTA TELA NÃO FAZ',
  },
  honneteteBody: {
    fr: 'Il ne te prévient pas : reviens ici pour voir où en est une vérification. Aucune notification n’est envoyée aujourd’hui.',
    en: 'It does not notify you: come back here to see where a verification stands. No notification is sent today.',
    es: 'No te avisa: vuelve aquí para ver el estado de una verificación. Hoy no se envía ninguna notificación.',
    de: 'Er benachrichtigt dich nicht: komm zurück, um den Stand einer Prüfung zu sehen. Heute wird nichts gesendet.',
    pt: 'Não avisa você: volte aqui para ver o estado de uma verificação. Hoje não é enviada nenhuma notificação.',
  },
});
