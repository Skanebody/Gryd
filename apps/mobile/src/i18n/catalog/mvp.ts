/**
 * GRYD — MICROCOPY MVP : la boucle cœur, mot pour mot (MASTER Annexe C, lot M1).
 *
 * ─── CE QUE CE CATALOGUE EST ────────────────────────────────────────────────
 * Les textes de la SEULE boucle du MVP : voir → courir → fermer → prendre →
 * partager. Ils sont la base de départ de l'Annexe C, complétée des phrases que
 * le moteur sait désormais tenir (fermeture assistée, mètres manquants — lots
 * G1b/G1c) et qui n'existaient nulle part.
 *
 * ─── POURQUOI PAS `locales/fr.json` COMME LE DEMANDE LE MASTER (§Annexe E) ──
 * Parce que le système en place est PLUS SÛR que ce qu'il propose. Ici, une
 * `Entry` est un `Record<Locale, string>` COMPLET : ajouter un texte sans ses
 * cinq langues est une erreur TypeScript, donc un gate rouge. Un JSON ne peut
 * pas offrir ça — une clé manquante ne se voit qu'à l'exécution, chez le joueur,
 * dans la langue qu'on ne teste jamais. L18 exige « aucun texte en dur, parité
 * FR/EN, pluriels gérés » : c'est tenu, et mieux. Le format n'était pas la règle.
 *
 * Les cinq langues sont donc écrites ici bien que le MVP n'en EXPOSE que deux :
 * restreindre l'offre se fait au SÉLECTEUR de langue, jamais en amputant un
 * catalogue — une chaîne absente ne se dégrade pas, elle affiche une clé brute.
 *
 * ─── LES DEUX LOIS QUI GOUVERNENT CE FICHIER ────────────────────────────────
 * L5 — tout message affiché PENDANT une course tient en ≤ 8 mots (idéal ≤ 4) :
 *      on le lit en courant, à bout de souffle, en une fraction de seconde.
 * L19 — l'app n'accuse JAMAIS. Aucun refus n'est un reproche : il nomme un
 *      fait, donne le manque en mètres, et rappelle ce qui est conservé.
 * `mvp.test.ts` vérifie les deux — sur TOUTES les langues, pas seulement le
 * français, parce qu'une traduction est exactement l'endroit où un ton dérape.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ══════════ CTA — impératif court (Annexe C) ═══════════════════════════════
  // « GO » est INVARIANT (override fondateur A-38) : il n'est pas traduit, il
  // est la marque du départ. Les autres sont des verbes, jamais des noms.
  ctaGo: { fr: 'GO', en: 'GO', es: 'GO', de: 'GO', pt: 'GO' },
  ctaRetake: { fr: 'REPRENDRE', en: 'TAKE BACK', es: 'RECUPERAR', de: 'ZURÜCKHOLEN', pt: 'RETOMAR' },
  ctaDefend: { fr: 'DÉFENDRE', en: 'DEFEND', es: 'DEFENDER', de: 'VERTEIDIGEN', pt: 'DEFENDER' },
  ctaShare: { fr: 'PARTAGER', en: 'SHARE', es: 'COMPARTIR', de: 'TEILEN', pt: 'PARTILHAR' },
  ctaCloseLoop: {
    fr: 'FERMER MA BOUCLE',
    en: 'CLOSE MY LOOP',
    es: 'CERRAR MI BUCLE',
    de: 'SCHLEIFE SCHLIESSEN',
    pt: 'FECHAR MEU CIRCUITO',
  },

  // ══════════ PENDANT LA COURSE — L5 : ≤ 8 mots, lisibles à bout de souffle ══
  runMetersLeft: {
    fr: '{m} m restants',
    en: '{m} m to go',
    es: 'faltan {m} m',
    de: 'noch {m} m',
    pt: 'faltam {m} m',
  },
  runLoopAlmost: {
    fr: 'Boucle presque fermée',
    en: 'Loop almost closed',
    es: 'Bucle casi cerrado',
    de: 'Schleife fast geschlossen',
    pt: 'Circuito quase fechado',
  },
  runLoopClosed: {
    fr: 'Boucle fermée',
    en: 'Loop closed',
    es: 'Bucle cerrado',
    de: 'Schleife geschlossen',
    pt: 'Circuito fechado',
  },
  runGpsWeak: {
    fr: 'Signal GPS faible',
    en: 'Weak GPS signal',
    es: 'Señal GPS débil',
    de: 'Schwaches GPS-Signal',
    pt: 'Sinal GPS fraco',
  },
  runPaused: { fr: 'Pause', en: 'Paused', es: 'Pausa', de: 'Pause', pt: 'Pausa' },

  // ══════════ LA CAPTURE — le pic émotionnel (L7) ═══════════════════════════
  captureTitle: {
    fr: 'Territoire pris',
    en: 'Ground taken',
    es: 'Territorio tomado',
    de: 'Gebiet erobert',
    pt: 'Território tomado',
  },
  captureGain: { fr: '+{m2} m²', en: '+{m2} m²', es: '+{m2} m²', de: '+{m2} m²', pt: '+{m2} m²' },
  captureFirst: {
    fr: 'Ta première conquête',
    en: 'Your first conquest',
    es: 'Tu primera conquista',
    de: 'Deine erste Eroberung',
    pt: 'Sua primeira conquista',
  },
  /**
   * FERMETURE ASSISTÉE (lot G1b) — le produit DIT ce qu'il a donné.
   * Ton : constat chaleureux, jamais une faveur condescendante. Le joueur a
   * fait le tour ; c'est un trottoir qui manquait, pas un effort.
   */
  captureAssisted: {
    fr: 'On a refermé les derniers mètres pour toi.',
    en: 'We closed the last few metres for you.',
    es: 'Hemos cerrado los últimos metros por ti.',
    de: 'Wir haben die letzten Meter für dich geschlossen.',
    pt: 'Fechamos os últimos metros por você.',
  },

  // ══════════ LES REFUS — L19 : nommer un fait, jamais accuser ══════════════
  verifyPartial: {
    fr: 'Une partie du parcours n’a pas servi au territoire. Tes stats restent disponibles.',
    en: 'Part of the route did not count towards territory. Your stats are still there.',
    es: 'Parte del recorrido no contó para el territorio. Tus estadísticas siguen ahí.',
    de: 'Ein Teil der Strecke zählte nicht fürs Gebiet. Deine Statistiken bleiben.',
    pt: 'Parte do percurso não contou para o território. Suas estatísticas continuam aí.',
  },
  /** Le manque en MÈTRES vient du moteur (`loopMissingM`), jamais de l'écran. */
  verifyGap: {
    fr: 'Il manquait {m} m pour fermer ta boucle.',
    en: 'You were {m} m short of closing your loop.',
    es: 'Faltaban {m} m para cerrar tu bucle.',
    de: 'Es fehlten {m} m, um deine Schleife zu schließen.',
    pt: 'Faltavam {m} m para fechar seu circuito.',
  },
  verifyTooSmall: {
    fr: 'Boucle trop petite pour créer une zone.',
    en: 'Loop too small to create a zone.',
    es: 'Bucle demasiado pequeño para crear una zona.',
    de: 'Schleife zu klein für eine Zone.',
    pt: 'Circuito pequeno demais para criar uma zona.',
  },

  // ══════════ ÉTATS DE ZONE ═════════════════════════════════════════════════
  zoneShielded: {
    fr: 'Protégée {h} h',
    en: 'Protected {h} h',
    es: 'Protegida {h} h',
    de: 'Geschützt {h} h',
    pt: 'Protegida {h} h',
  },
  zoneFragile: {
    fr: 'Fragile — repasse dessus pour la garder',
    en: 'Fragile — run through it to keep it',
    es: 'Frágil — vuelve a pasar para conservarla',
    de: 'Brüchig — lauf hindurch, um sie zu behalten',
    pt: 'Frágil — passe de novo para mantê-la',
  },

  // ══════════ NOTIFICATIONS — L16 : un FAIT de jeu, jamais un rappel ════════
  // ⚠️ AUCUNE NOTIFICATION NE NOMME UN LIEU. Trois raisons, et chacune suffit :
  //
  // 1. `territories` N'A PAS de colonne « nom » — un territoire est un polygone,
  //    une aire, un propriétaire. Le nom venait d'un `zoneLabel` envoyé par le
  //    CLIENT, alors que tout doit être tranché serveur (constitution).
  // 2. UN COUREUR NE PREND PAS UNE ZONE ENTIÈRE (ADR-010). Un territoire fait
  //    ~40 000 m², une commune ~15 km² : écrire « il t'a pris Bihorel » annonce
  //    un quartier pour un pâté de rues, et surtout un TOUT pour une PART.
  // 3. VIE PRIVÉE. « Marc t'a pris rue des Capucins » diffuse le parcours de
  //    Marc à quelqu'un d'autre. Le dépôt protège la trace partout ailleurs
  //    (polyline masquée, `map_sharing`, zones privées, domicile à 200 m) — la
  //    notification passait à travers, par la petite porte du nom.
  //
  // Ce qui remplace le lieu : les m², déjà le chiffre héros du jeu. Précis,
  // vrai même sur une prise partielle, et ça ne localise personne. Les noms
  // restent à l'échelle de la VILLE (`notifCrewRank`), parce qu'un agrégat sur
  // beaucoup de gens ne désigne personne.
  notifTaken: {
    fr: '{player} t’a pris {m2} m²',
    en: '{player} took {m2} m² from you',
    es: '{player} te ha quitado {m2} m²',
    de: '{player} hat dir {m2} m² abgenommen',
    pt: '{player} tomou {m2} m² de você',
  },
  notifFragile: {
    fr: '{m2} m² deviennent fragiles demain',
    en: '{m2} m² turn fragile tomorrow',
    es: '{m2} m² se vuelven frágiles mañana',
    de: '{m2} m² werden morgen brüchig',
    pt: '{m2} m² ficam frágeis amanhã',
  },
  notifCrewRank: {
    fr: 'Ton crew passe {rank} à {city}',
    en: 'Your crew moves to {rank} in {city}',
    es: 'Tu crew pasa a {rank} en {city}',
    de: 'Dein Crew steigt auf {rank} in {city}',
    pt: 'Seu crew sobe para {rank} em {city}',
  },

  // ══════════ PARTAGE — l'objet viral (§5) ═════════════════════════════════
  shareCtaTaunt: {
    fr: 'Prends-la-moi',
    en: 'Come take it',
    es: 'Ven a quitármela',
    de: 'Hol sie dir',
    pt: 'Vem tomar de mim',
  },
  shareCtaRetaken: { fr: 'Reprise.', en: 'Taken back.', es: 'Recuperada.', de: 'Zurückgeholt.', pt: 'Retomada.' },
  shareCtaCrew: {
    fr: 'On tient le quartier',
    en: 'We hold this block',
    es: 'Controlamos el barrio',
    de: 'Wir halten das Viertel',
    pt: 'Nós dominamos o bairro',
  },
  /** Signature de marque — INVARIANTE, comme « GO » (§5.2). */
  shareTagline: {
    fr: 'CLAIM THE CITY.',
    en: 'CLAIM THE CITY.',
    es: 'CLAIM THE CITY.',
    de: 'CLAIM THE CITY.',
    pt: 'CLAIM THE CITY.',
  },

  // ══════════ ÉTATS VIDES — L8 : contiennent l'action qui les remplit ══════
  emptyMap: {
    fr: 'Ta ville est vierge. Ferme ta première boucle.',
    en: 'Your city is untouched. Close your first loop.',
    es: 'Tu ciudad está virgen. Cierra tu primer bucle.',
    de: 'Deine Stadt ist unberührt. Schließe deine erste Schleife.',
    pt: 'Sua cidade está intocada. Feche seu primeiro circuito.',
  },

  // ══════════ DÉPART — L3 : un seul tap, puis le décompte se déroule seul ══
  // Le signal GPS est une INFORMATION, jamais une permission de courir : ces
  // trois phrases décrivent, elles ne retiennent personne (voir run/countdown.ts).
  gpsSearching: {
    fr: 'Recherche du signal',
    en: 'Finding signal',
    es: 'Buscando señal',
    de: 'Signalsuche',
    pt: 'Procurando sinal',
  },
  gpsWeak: { fr: 'Signal faible', en: 'Weak signal', es: 'Señal débil', de: 'Schwaches Signal', pt: 'Sinal fraco' },
  gpsGood: { fr: 'Signal franc', en: 'Strong signal', es: 'Señal fuerte', de: 'Starkes Signal', pt: 'Sinal forte' },
  ctaCancel: { fr: 'ANNULER', en: 'CANCEL', es: 'CANCELAR', de: 'ABBRECHEN', pt: 'CANCELAR' },

  // ══════════ PENDANT — L5 : lisible à bout de souffle, ≤ 8 mots ═══════════
  ctaFinish: { fr: 'TERMINER', en: 'FINISH', es: 'TERMINAR', de: 'BEENDEN', pt: 'TERMINAR' },
  unitKm: { fr: 'km', en: 'km', es: 'km', de: 'km', pt: 'km' },

  // ══════════ RÉSULTAT — L19 : un refus nomme un FAIT, jamais une faute ════
  resTakenTitle: {
    fr: 'Territoire pris',
    en: 'Territory taken',
    es: 'Territorio conquistado',
    de: 'Gebiet erobert',
    pt: 'Território conquistado',
  },
  /** Fermeture assistée : le produit DIT ce qu'il a donné (§ moteur). */
  resAssisted: {
    fr: 'GRYD a refermé les derniers mètres.',
    en: 'GRYD closed the last few metres for you.',
    es: 'GRYD ha cerrado los últimos metros.',
    de: 'GRYD hat die letzten Meter geschlossen.',
    pt: 'O GRYD fechou os últimos metros.',
  },
  /** Pris, mais l'aire surestimerait le gain : on ne chiffre pas. */
  resTakenNoArea: {
    fr: 'Une partie de la boucle est à toi. La carte montre ce qui a été pris.',
    en: 'Part of the loop is yours. The map shows what was taken.',
    es: 'Una parte del bucle es tuya. El mapa muestra lo conquistado.',
    de: 'Ein Teil der Schleife gehört dir. Die Karte zeigt das Eroberte.',
    pt: 'Parte do circuito é sua. O mapa mostra o que foi conquistado.',
  },
  resNoLoop: {
    fr: 'Ta boucle ne s’est pas refermée. Tes stats restent disponibles.',
    en: 'Your loop did not close. Your stats are still available.',
    es: 'Tu bucle no se cerró. Tus estadísticas siguen disponibles.',
    de: 'Deine Schleife hat sich nicht geschlossen. Deine Statistiken bleiben verfügbar.',
    pt: 'Seu circuito não fechou. Suas estatísticas continuam disponíveis.',
  },
  resNarrow: {
    fr: 'Forme trop étroite pour créer une zone. Tes stats restent disponibles.',
    en: 'Shape too narrow to create a zone. Your stats are still available.',
    es: 'Forma demasiado estrecha para crear una zona. Tus estadísticas siguen disponibles.',
    de: 'Form zu schmal für ein Gebiet. Deine Statistiken bleiben verfügbar.',
    pt: 'Forma estreita demais para criar uma zona. Suas estatísticas continuam disponíveis.',
  },
  resRefused: {
    fr: 'Cette sortie n’a pas été retenue pour le territoire. Tes stats restent disponibles.',
    en: 'This outing was not counted for territory. Your stats are still available.',
    es: 'Esta salida no se ha contado para el territorio. Tus estadísticas siguen disponibles.',
    de: 'Diese Ausfahrt zählt nicht für das Gebiet. Deine Statistiken bleiben verfügbar.',
    pt: 'Esta saída não contou para o território. Suas estatísticas continuam disponíveis.',
  },
  /** Hors ligne : AUCUN verdict n'existe. On ne dit rien du territoire. */
  resPending: {
    fr: 'Course enregistrée. Envoi dès que possible.',
    en: 'Run saved. It will be sent as soon as possible.',
    es: 'Carrera guardada. Se enviará en cuanto sea posible.',
    de: 'Lauf gespeichert. Wird sobald wie möglich gesendet.',
    pt: 'Corrida salva. Será enviada assim que possível.',
  },
  resLost: {
    fr: 'L’envoi n’a pas pu être mis en attente. Ta course est encore sur cet appareil.',
    en: 'The upload could not be queued. Your run is still on this device.',
    es: 'El envío no se ha podido poner en cola. Tu carrera sigue en este dispositivo.',
    de: 'Der Upload konnte nicht eingereiht werden. Dein Lauf liegt noch auf diesem Gerät.',
    pt: 'O envio não pôde ser enfileirado. Sua corrida ainda está neste aparelho.',
  },
  resStats: {
    fr: '{km} km · {duree}',
    en: '{km} km · {duree}',
    es: '{km} km · {duree}',
    de: '{km} km · {duree}',
    pt: '{km} km · {duree}',
  },
  ctaBackToMap: {
    fr: 'VOIR LA CARTE',
    en: 'SEE THE MAP',
    es: 'VER EL MAPA',
    de: 'KARTE ANSEHEN',
    pt: 'VER O MAPA',
  },

  // ══════════ NEVER-LOSE-A-RUN — une trace retrouvée se DIT ═══════════════
  // Une course qui survit à un crash sans que personne ne le sache est perdue
  // quand même. Ce texte est la moitié de la garantie ; le buffer est l'autre.
  mapInterrupted: {
    fr: 'Une course n’a pas été terminée. Elle t’attend.',
    en: 'A run was never finished. It is waiting for you.',
    es: 'Una carrera no se terminó. Te está esperando.',
    de: 'Ein Lauf wurde nie beendet. Er wartet auf dich.',
    pt: 'Uma corrida não foi finalizada. Ela está esperando por você.',
  },
  ctaResumeRun: {
    fr: 'REPRENDRE MA COURSE',
    en: 'RESUME MY RUN',
    es: 'CONTINUAR MI CARRERA',
    de: 'LAUF FORTSETZEN',
    pt: 'CONTINUAR MINHA CORRIDA',
  },
  /** Bandeau de la course reprise : le joueur doit savoir qu'il continue. */
  runResumed: {
    fr: 'Course reprise',
    en: 'Run resumed',
    es: 'Carrera reanudada',
    de: 'Lauf fortgesetzt',
    pt: 'Corrida retomada',
  },

  // ══════════ CONNEXION — le seul écran dont on ne ressort pas sans succès ══
  signInTitle: {
    fr: 'Prends ta ville',
    en: 'Claim your city',
    es: 'Conquista tu ciudad',
    de: 'Erobere deine Stadt',
    pt: 'Conquiste sua cidade',
  },
  signInBody: {
    fr: 'Un compte pour que ton territoire t’appartienne d’une course à l’autre.',
    en: 'An account so your territory stays yours from one run to the next.',
    es: 'Una cuenta para que tu territorio siga siendo tuyo de una carrera a otra.',
    de: 'Ein Konto, damit dein Gebiet von Lauf zu Lauf deins bleibt.',
    pt: 'Uma conta para que seu território continue seu de uma corrida a outra.',
  },
  signInApple: {
    fr: 'Continuer avec Apple',
    en: 'Continue with Apple',
    es: 'Continuar con Apple',
    de: 'Weiter mit Apple',
    pt: 'Continuar com a Apple',
  },
  signInGoogle: {
    fr: 'Continuer avec Google',
    en: 'Continue with Google',
    es: 'Continuar con Google',
    de: 'Weiter mit Google',
    pt: 'Continuar com o Google',
  },
  signInEmail: {
    fr: 'Continuer par e-mail',
    en: 'Continue with email',
    es: 'Continuar por correo',
    de: 'Weiter per E-Mail',
    pt: 'Continuar por e-mail',
  },
  // Aucune porte : on DIT pourquoi plutôt que de peindre trois boutons inertes.
  signInNoDoor: {
    fr: 'GRYD ne joint aucun serveur. La connexion n’est pas possible pour l’instant.',
    en: 'GRYD cannot reach any server. Signing in is not possible right now.',
    es: 'GRYD no alcanza ningún servidor. No es posible iniciar sesión ahora.',
    de: 'GRYD erreicht keinen Server. Anmelden ist gerade nicht möglich.',
    pt: 'O GRYD não alcança nenhum servidor. Não é possível entrar agora.',
  },
  // L19 — un échec nomme un fait et laisse la porte ouverte. Une ANNULATION,
  // elle, n'affiche rien du tout (voir `signIn.ts`).
  signInFailed: {
    fr: 'La connexion n’a pas abouti. Tu peux réessayer.',
    en: 'Signing in did not go through. You can try again.',
    es: 'El inicio de sesión no se completó. Puedes reintentar.',
    de: 'Die Anmeldung ist nicht durchgegangen. Du kannst es erneut versuchen.',
    pt: 'O login não foi concluído. Você pode tentar de novo.',
  },

  // ══════════ PROFIL — suivi + compte (exigences App Store 5.1.1(v), RGPD) ══
  profilTitle: { fr: 'Toi', en: 'You', es: 'Tú', de: 'Du', pt: 'Você' },
  statTerritory: { fr: 'Territoire', en: 'Territory', es: 'Territorio', de: 'Gebiet', pt: 'Território' },
  statRuns: { fr: 'Sorties', en: 'Runs', es: 'Salidas', de: 'Läufe', pt: 'Saídas' },
  statDistance: { fr: 'Distance', en: 'Distance', es: 'Distancia', de: 'Distanz', pt: 'Distância' },
  statsEmpty: {
    fr: 'Aucune sortie enregistrée. Ferme ta première boucle.',
    en: 'No run recorded yet. Close your first loop.',
    es: 'Ninguna salida registrada. Cierra tu primer bucle.',
    de: 'Noch kein Lauf aufgezeichnet. Schließe deine erste Schleife.',
    pt: 'Nenhuma saída registrada. Feche seu primeiro circuito.',
  },
  statsFailed: {
    fr: 'Tes statistiques n’ont pas pu être lues. Tes courses restent enregistrées.',
    en: 'Your stats could not be read. Your runs are still saved.',
    es: 'No se han podido leer tus estadísticas. Tus carreras siguen guardadas.',
    de: 'Deine Statistiken konnten nicht gelesen werden. Deine Läufe bleiben gespeichert.',
    pt: 'Não foi possível ler suas estatísticas. Suas corridas continuam salvas.',
  },
  accountTitle: { fr: 'Compte', en: 'Account', es: 'Cuenta', de: 'Konto', pt: 'Conta' },
  accountSignOut: {
    fr: 'Se déconnecter',
    en: 'Sign out',
    es: 'Cerrar sesión',
    de: 'Abmelden',
    pt: 'Sair da conta',
  },
  accountExport: {
    fr: 'Exporter mes données',
    en: 'Export my data',
    es: 'Exportar mis datos',
    de: 'Meine Daten exportieren',
    pt: 'Exportar meus dados',
  },
  accountDelete: {
    fr: 'Supprimer mon compte',
    en: 'Delete my account',
    es: 'Eliminar mi cuenta',
    de: 'Mein Konto löschen',
    pt: 'Excluir minha conta',
  },
  // L17 en miroir : une action irréversible se confirme, et la phrase dit ce
  // qui se passe VRAIMENT — un délai, pas un effacement instantané.
  accountDeleteConfirm: {
    fr: 'Supprimer ton compte et tout ce que tu as capturé ? Tu auras {d} jours pour changer d’avis.',
    en: 'Delete your account and everything you captured? You will have {d} days to change your mind.',
    es: '¿Eliminar tu cuenta y todo lo que has conquistado? Tendrás {d} días para cambiar de opinión.',
    de: 'Dein Konto und alles Eroberte löschen? Du hast {d} Tage, um es dir anders zu überlegen.',
    pt: 'Excluir sua conta e tudo o que você conquistou? Você terá {d} dias para mudar de ideia.',
  },
  accountDeletePending: {
    fr: 'Suppression prévue dans {d} jours.',
    en: 'Deletion scheduled in {d} days.',
    es: 'Eliminación prevista en {d} días.',
    de: 'Löschung in {d} Tagen geplant.',
    pt: 'Exclusão prevista em {d} dias.',
  },
  accountDeleteCancel: {
    fr: 'Annuler la suppression',
    en: 'Cancel deletion',
    es: 'Cancelar la eliminación',
    de: 'Löschung abbrechen',
    pt: 'Cancelar a exclusão',
  },
  legalTitle: { fr: 'Légal', en: 'Legal', es: 'Legal', de: 'Rechtliches', pt: 'Jurídico' },
  legalPrivacy: {
    fr: 'Confidentialité',
    en: 'Privacy',
    es: 'Privacidad',
    de: 'Datenschutz',
    pt: 'Privacidade',
  },
  legalConduct: {
    fr: 'Code de conduite',
    en: 'Code of conduct',
    es: 'Código de conducta',
    de: 'Verhaltenskodex',
    pt: 'Código de conduta',
  },
  // « Support » est le MÊME mot en français, anglais et allemand — le test L18
  // l'a refusé, et il a raison : ce n'était pas une traduction. « Aide » est de
  // toute façon le mot juste ici, et il dit mieux ce que le lien fait.
  legalSupport: { fr: 'Aide', en: 'Help', es: 'Ayuda', de: 'Hilfe', pt: 'Ajuda' },
  ctaProfil: { fr: 'Toi', en: 'You', es: 'Tú', de: 'Du', pt: 'Você' },

  // ══════════ ACCUEIL / CARTE — une phrase PAR ÉTAT, jamais une pour deux ══
  // `homeState.ts` distingue six réponses honnêtes à « qu'est-ce qui est à
  // moi ? ». Si deux d'entre elles partageaient un texte, la distinction ne
  // servirait à rien : c'est ICI que le joueur la perçoit ou pas.
  mapLoading: {
    fr: 'Lecture en cours…',
    en: 'Loading…',
    es: 'Cargando…',
    de: 'Wird geladen…',
    pt: 'Carregando…',
  },
  // L19 — un échec nomme un fait, ne reproche rien, et laisse une porte.
  mapFailed: {
    fr: 'Tes territoires n’ont pas pu être lus. Tes captures restent enregistrées.',
    en: 'Your territories could not be read. Your captures are still saved.',
    es: 'No se han podido leer tus territorios. Tus capturas siguen guardadas.',
    de: 'Deine Gebiete konnten nicht gelesen werden. Deine Eroberungen bleiben gespeichert.',
    pt: 'Não foi possível ler seus territórios. Suas capturas continuam salvas.',
  },
  mapRetry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  // Ni un vide, ni un échec de lecture : ce build ne joint AUCUN serveur.
  mapUnavailable: {
    fr: 'GRYD ne joint aucun serveur. Rien ne peut être affiché ni capturé.',
    en: 'GRYD cannot reach any server. Nothing can be shown or captured.',
    es: 'GRYD no alcanza ningún servidor. No se puede mostrar ni capturar nada.',
    de: 'GRYD erreicht keinen Server. Es kann nichts angezeigt oder erobert werden.',
    pt: 'O GRYD não alcança nenhum servidor. Nada pode ser exibido nem capturado.',
  },
  // Sans compte, « à moi » n'a pas de référent — ce n'est pas « tu n'as rien ».
  mapSignedOut: {
    fr: 'Sans compte, GRYD ne sait pas encore ce qui est à toi.',
    en: 'Without an account, GRYD does not yet know what is yours.',
    es: 'Sin cuenta, GRYD aún no sabe qué es tuyo.',
    de: 'Ohne Konto weiß GRYD noch nicht, was dir gehört.',
    pt: 'Sem conta, o GRYD ainda não sabe o que é seu.',
  },
  /** Légende SOUS le chiffre héros (L12) : le nombre domine, le mot explique. */
  mapOwnedLabel: {
    fr: 'à toi',
    en: 'yours',
    es: 'tuyo',
    de: 'dir gehörend',
    pt: 'seu',
  },
  /**
   * Unité SI — INVARIANTE : un symbole d'unité ne se traduit pas. Le MVP n'en a
   * QU'UNE : le chiffre héros reste en m² à toutes les échelles (L12 — « les m²
   * dominent »), voir `mvp/ui/area.ts`.
   */
  unitM2: { fr: 'm²', en: 'm²', es: 'm²', de: 'm²', pt: 'm²' },

  // ══════════ ONBOARDING — L9 : la valeur AVANT la permission ══════════════
  onboardingPriming: {
    fr: 'GRYD dessine ton territoire à partir de ta course. Autorise ta position pour commencer.',
    en: 'GRYD draws your territory from your run. Allow location to begin.',
    es: 'GRYD dibuja tu territorio a partir de tu carrera. Permite la ubicación para empezar.',
    de: 'GRYD zeichnet dein Gebiet aus deinem Lauf. Erlaube den Standort, um zu starten.',
    pt: 'O GRYD desenha seu território a partir da sua corrida. Permita a localização para começar.',
  },

  // ══════════ ONBOARDING — L9 : la valeur AVANT la permission ══════════════
  // DEUX écrans, pas trois. L9 pose un PLAFOND (« ≤ 3 »), pas un objectif, et
  // la 2ᵉ vérité du MASTER impose que chaque écran justifie son existence. Le
  // jeu tient en une phrase : l'étirer sur un écran de plus n'ajouterait qu'un
  // tap entre l'installation et la carte.
  obTitle: {
    fr: 'Ta ville est à prendre',
    en: 'Your city is up for grabs',
    es: 'Tu ciudad está por conquistar',
    de: 'Deine Stadt ist zu erobern',
    pt: 'Sua cidade está para conquistar',
  },
  obBody: {
    fr: 'Tu cours. Ta trace dessine une ligne. Si elle se referme, l’intérieur est à toi.',
    en: 'You run. Your track draws a line. Close it, and the inside is yours.',
    es: 'Corres. Tu traza dibuja una línea. Si se cierra, el interior es tuyo.',
    de: 'Du läufst. Deine Spur zieht eine Linie. Schließt sie sich, gehört dir das Innere.',
    pt: 'Você corre. Seu traçado desenha uma linha. Se ela fecha, o interior é seu.',
  },
  obCta: { fr: 'CONTINUER', en: 'CONTINUE', es: 'CONTINUAR', de: 'WEITER', pt: 'CONTINUAR' },

  // ── Priming (L9) : on explique AVANT que l'OS ne demande ──────────────────
  obPrimingTitle: {
    fr: 'Une seule autorisation',
    en: 'One permission',
    es: 'Un solo permiso',
    de: 'Eine Berechtigung',
    pt: 'Uma única permissão',
  },
  obPrimingCta: { fr: 'AUTORISER', en: 'ALLOW', es: 'PERMITIR', de: 'ERLAUBEN', pt: 'PERMITIR' },
  // Refus : jamais un cul-de-sac, jamais un reproche (L8, L19).
  obDeniedTitle: {
    fr: 'Sans position, pas de territoire',
    en: 'No location, no territory',
    es: 'Sin ubicación, no hay territorio',
    de: 'Ohne Standort kein Gebiet',
    pt: 'Sem localização, não há território',
  },
  obDeniedBody: {
    fr: 'GRYD ne peut pas dessiner ta boucle sans savoir où tu cours. Tu peux l’autoriser dans les réglages, quand tu veux.',
    en: 'GRYD cannot draw your loop without knowing where you run. You can allow it in settings, whenever you want.',
    es: 'GRYD no puede dibujar tu bucle sin saber dónde corres. Puedes permitirlo en los ajustes, cuando quieras.',
    de: 'GRYD kann deine Schleife nicht zeichnen, ohne zu wissen, wo du läufst. Du kannst es jederzeit in den Einstellungen erlauben.',
    pt: 'O GRYD não consegue desenhar seu circuito sem saber onde você corre. Você pode permitir nos ajustes, quando quiser.',
  },
  obDeniedCta: {
    fr: 'OUVRIR LES RÉGLAGES',
    en: 'OPEN SETTINGS',
    es: 'ABRIR AJUSTES',
    de: 'EINSTELLUNGEN ÖFFNEN',
    pt: 'ABRIR AJUSTES',
  },
  obSkip: {
    fr: 'Voir la carte d’abord',
    en: 'See the map first',
    es: 'Ver el mapa primero',
    de: 'Zuerst die Karte ansehen',
    pt: 'Ver o mapa primeiro',
  },
});

/**
 * Les clés affichées PENDANT une course — soumises à la limite de 8 mots (L5).
 *
 * Cette liste est DONNÉE et non devinée : un test qui déduirait « in-run » d'un
 * préfixe de nom raterait la première clé qu'on nommerait autrement, et la
 * limite cesserait silencieusement de s'appliquer là où elle compte le plus.
 */
export const IN_RUN_KEYS = [
  'ctaGo',
  'ctaCloseLoop',
  'runMetersLeft',
  'runLoopAlmost',
  'runLoopClosed',
  'runGpsWeak',
  'runPaused',
] as const satisfies readonly (keyof typeof C)[];
