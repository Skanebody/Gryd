/**
 * GRYD — i18n : catalogue DÉDIÉ à l'écran « Défis de la semaine »
 * (app/defis-semaine.tsx), ADR-013 §2.2 ①, décision fondateur du 10/09/2026.
 *
 * POURQUOI UN CATALOGUE À PART : `saison.ts` porte la saison et le classement,
 * `crew.ts` les sorties de groupe ; les deux sont ouverts par d'autres
 * chantiers. Les clés de cet écran vivent donc ici, et nulle part ailleurs.
 *
 * CE QU'ON N'ÉCRIT JAMAIS DANS CES CHAÎNES (§4.2, G24) :
 *  · un décompte — « il te reste 3 jours », « plus que 2 heures » ; la lecture
 *    serveur ne renvoie même pas d'échéance, il n'y a rien à afficher ;
 *  · un reproche — « tu n'as pas réussi », « raté », « dommage » ; une semaine
 *    passée se dit AU PASSÉ et sans jugement ;
 *  · une injonction — « sors maintenant », « ne casse pas ta série » ;
 *  · une promesse au-delà du code — un objet obtenu est dit obtenu, et rien
 *    n'est annoncé sur des surfaces qui ne le montrent pas encore.
 *
 * INVARIANTS (jamais traduits, donc pas ici) : GRYD, les noms d'objets du
 * catalogue serveur (« Sticker Ailleurs »), les pseudos, les noms de crew.
 *
 * §A CONTRAIGNANT : libellés COURTS dans les 5 langues (l'allemand est
 * reformulé concis) pour ne jamais tronquer à 375 px.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ═══════════════════════ En-tête et cadre ════════════════════════════════
  titre: {
    fr: 'Défis de la semaine',
    en: 'This week’s challenges',
    es: 'Retos de la semana',
    de: 'Wochen-Aufgaben',
    pt: 'Desafios da semana',
  },
  intro: {
    fr: 'Deux défis à la fois. Ils demandent d’aller ailleurs, avec quelqu’un, ou autrement, jamais plus.',
    en: 'Two challenges at a time. They ask for elsewhere, with someone, or differently — never more.',
    es: 'Dos retos a la vez. Piden ir a otro sitio, con alguien o de otra forma — nunca más.',
    de: 'Zwei Aufgaben zugleich. Sie fragen nach woanders, mit jemandem, anders — nie nach mehr.',
    pt: 'Dois desafios de cada vez. Pedem outro lugar, com alguém ou de outra forma — nunca mais.',
  },
  reglePasDXp: {
    fr: 'Un défi donne un objet. Jamais des XP, jamais un avantage de jeu.',
    en: 'A challenge gives an object. Never XP, never a gameplay advantage.',
    es: 'Un reto da un objeto. Nunca XP, nunca una ventaja de juego.',
    de: 'Eine Aufgabe gibt ein Objekt. Nie XP, nie einen Spielvorteil.',
    pt: 'Um desafio dá um objeto. Nunca XP, nunca vantagem de jogo.',
  },
  tabCourse: { fr: 'Course', en: 'Run', es: 'Correr', de: 'Laufen', pt: 'Corrida' },
  tabVelo: { fr: 'Vélo', en: 'Ride', es: 'Bici', de: 'Rad', pt: 'Bike' },

  // ═══════════════════════ Les quatre états ════════════════════════════════
  /** Pas connecté — distinct de « vide » (L8/L14/L19). */
  etatDeconnecte: {
    fr: 'Connecte-toi pour voir tes défis de la semaine.',
    en: 'Sign in to see this week’s challenges.',
    es: 'Inicia sesión para ver tus retos de la semana.',
    de: 'Melde dich an, um deine Wochen-Aufgaben zu sehen.',
    pt: 'Entre para ver seus desafios da semana.',
  },
  actionConnexion: { fr: 'Me connecter', en: 'Sign in', es: 'Iniciar sesión', de: 'Anmelden', pt: 'Entrar' },
  /** Lecture en cours. */
  etatLecture: {
    fr: 'Lecture de tes défis…',
    en: 'Loading your challenges…',
    es: 'Cargando tus retos…',
    de: 'Aufgaben werden geladen…',
    pt: 'Carregando seus desafios…',
  },
  /** La lecture a ÉCHOUÉ : on ne sait pas — on ne dit pas « aucun défi ». */
  etatEchec: {
    fr: 'Tes défis n’ont pas pu être lus.',
    en: 'Your challenges could not be loaded.',
    es: 'No se han podido cargar tus retos.',
    de: 'Deine Aufgaben konnten nicht geladen werden.',
    pt: 'Não foi possível carregar seus desafios.',
  },
  actionReessayer: { fr: 'Réessayer', en: 'Try again', es: 'Reintentar', de: 'Erneut versuchen', pt: 'Tentar de novo' },
  /** Lu, et il n'y a rien pour cette discipline — état DISTINCT d'un échec. */
  etatVide: {
    fr: 'Aucun défi dans cette discipline cette semaine.',
    en: 'No challenge in this sport this week.',
    es: 'Ningún reto en esta disciplina esta semana.',
    de: 'Diese Woche keine Aufgabe in dieser Sportart.',
    pt: 'Nenhum desafio nesta modalidade esta semana.',
  },
  etatVideDetail: {
    fr: 'Ils reviendront la semaine prochaine. Rien à faire d’ici là.',
    en: 'They come back next week. Nothing to do until then.',
    es: 'Volverán la semana que viene. No hay nada que hacer hasta entonces.',
    de: 'Sie kommen nächste Woche wieder. Bis dahin nichts zu tun.',
    pt: 'Voltam na próxima semana. Nada a fazer até lá.',
  },
  actionActualiser: { fr: 'Actualiser', en: 'Refresh', es: 'Actualizar', de: 'Aktualisieren', pt: 'Atualizar' },

  // ═══════════════════════ Les six conditions ══════════════════════════════
  conditionNewLocality: {
    fr: 'Ferme une boucle dans un secteur où tu n’en avais encore jamais fermé.',
    en: 'Close a loop in an area where you have never closed one.',
    es: 'Cierra un bucle en una zona donde nunca hayas cerrado ninguno.',
    de: 'Schließe eine Runde in einem Gebiet, in dem du noch keine geschlossen hast.',
    pt: 'Feche um circuito numa zona onde você nunca fechou nenhum.',
  },
  conditionNewLocalityDetail: {
    fr: 'Un secteur fait environ 1 km de côté.',
    en: 'An area is roughly 1 km across.',
    es: 'Una zona mide aproximadamente 1 km de lado.',
    de: 'Ein Gebiet misst etwa 1 km.',
    pt: 'Uma zona tem cerca de 1 km de lado.',
  },
  conditionDistinctLoops: {
    fr: 'Ferme deux boucles différentes cette semaine.',
    en: 'Close two different loops this week.',
    es: 'Cierra dos bucles diferentes esta semana.',
    de: 'Schließe diese Woche zwei verschiedene Runden.',
    pt: 'Feche dois circuitos diferentes esta semana.',
  },
  conditionDistinctLoopsDetail: {
    fr: 'Refaire la même boucle compte pour une seule.',
    en: 'Repeating the same loop counts once.',
    es: 'Repetir el mismo bucle cuenta una sola vez.',
    de: 'Dieselbe Runde erneut zählt nur einmal.',
    pt: 'Repetir o mesmo circuito conta uma vez.',
  },
  conditionGroupOuting: {
    fr: 'Fais une sortie de groupe avec ton crew.',
    en: 'Join a group outing with your crew.',
    es: 'Haz una salida de grupo con tu crew.',
    de: 'Mach eine Gruppenausfahrt mit deinem Crew.',
    pt: 'Faça uma saída em grupo com seu crew.',
  },
  conditionGroupOutingDetail: {
    fr: 'Dis « je viens » avant le départ, et enregistre ta sortie.',
    en: 'Say you are coming before the start, and record your activity.',
    es: 'Di que vienes antes de la salida y registra tu actividad.',
    de: 'Sag vor dem Start zu und zeichne deine Aktivität auf.',
    pt: 'Diga que vai antes da largada e registre sua atividade.',
  },
  conditionDoublePractice: {
    fr: 'Une journée en course et une journée à vélo.',
    en: 'One running day and one riding day.',
    es: 'Un día corriendo y un día en bici.',
    de: 'Ein Lauftag und ein Radtag.',
    pt: 'Um dia correndo e um dia pedalando.',
  },
  conditionDoublePracticeDetail: {
    fr: 'Deux journées différentes, dans n’importe quel ordre.',
    en: 'Two different days, in any order.',
    es: 'Dos días distintos, en cualquier orden.',
    de: 'Zwei verschiedene Tage, in beliebiger Reihenfolge.',
    pt: 'Dois dias diferentes, em qualquer ordem.',
  },
  conditionActiveDays: {
    fr: 'Deux journées actives cette semaine.',
    en: 'Two active days this week.',
    es: 'Dos días activos esta semana.',
    de: 'Zwei aktive Tage diese Woche.',
    pt: 'Dois dias ativos esta semana.',
  },
  conditionActiveDaysDetail: {
    fr: 'Une journée active, c’est au moins 10 minutes de mouvement.',
    en: 'An active day is at least 10 minutes of movement.',
    es: 'Un día activo son al menos 10 minutos de movimiento.',
    de: 'Ein aktiver Tag sind mindestens 10 Minuten Bewegung.',
    pt: 'Um dia ativo são pelo menos 10 minutos de movimento.',
  },
  conditionHostedOuting: {
    fr: 'Propose une sortie ouverte à ton crew.',
    en: 'Offer an open outing to your crew.',
    es: 'Propón una salida abierta a tu crew.',
    de: 'Biete deinem Crew eine offene Ausfahrt an.',
    pt: 'Proponha uma saída aberta ao seu crew.',
  },
  conditionHostedOutingDetail: {
    fr: 'Elle compte quand au moins une autre personne s’y joint.',
    en: 'It counts once at least one other person joins.',
    es: 'Cuenta cuando al menos otra persona se apunta.',
    de: 'Sie zählt, sobald mindestens eine weitere Person mitkommt.',
    pt: 'Conta quando pelo menos outra pessoa entra.',
  },

  // ═══════════════════════ Familles de badges (§7.4) ════════════════════════
  familleExploration: { fr: 'Exploration', en: 'Exploration', es: 'Exploración', de: 'Erkundung', pt: 'Exploração' },
  familleEnsemble: { fr: 'Ensemble', en: 'Together', es: 'Juntos', de: 'Gemeinsam', pt: 'Juntos' },
  familleDoublePratique: { fr: 'Double pratique', en: 'Both sports', es: 'Doble práctica', de: 'Beide Sportarten', pt: 'Dupla prática' },
  familleRegularite: { fr: 'Régularité', en: 'Regularity', es: 'Regularidad', de: 'Regelmäßigkeit', pt: 'Regularidade' },
  familleAccueil: { fr: 'Accueil', en: 'Hosting', es: 'Acogida', de: 'Gastgeben', pt: 'Acolhimento' },
  familleDepart: { fr: 'Départ', en: 'First steps', es: 'Comienzo', de: 'Anfang', pt: 'Começo' },
  familleCourse: { fr: 'Course', en: 'Running', es: 'Correr', de: 'Laufen', pt: 'Corrida' },
  familleVelo: { fr: 'Vélo', en: 'Cycling', es: 'Ciclismo', de: 'Radfahren', pt: 'Ciclismo' },

  // ═══════════════════════ Statuts, sans reproche ═══════════════════════════
  statutEnCours: { fr: 'En cours', en: 'Open', es: 'En curso', de: 'Offen', pt: 'Em curso' },
  statutReussi: { fr: 'Réussi', en: 'Done', es: 'Conseguido', de: 'Geschafft', pt: 'Conseguido' },
  /** Expiré : dit AU PASSÉ, sans « raté », sans « dommage ». */
  statutPasse: { fr: 'La semaine est passée', en: 'That week has passed', es: 'Esa semana ya pasó', de: 'Diese Woche ist vorbei', pt: 'Essa semana passou' },
  sectionPassee: {
    fr: 'La semaine du {date} est passée',
    en: 'The week of {date} has passed',
    es: 'La semana del {date} ya pasó',
    de: 'Die Woche vom {date} ist vorbei',
    pt: 'A semana de {date} já passou',
  },
  sectionObjets: { fr: 'Mes objets de défi', en: 'My challenge objects', es: 'Mis objetos de reto', de: 'Meine Aufgaben-Objekte', pt: 'Meus objetos de desafio' },

  // ═══════════════════════ Les objets et leur usage ═════════════════════════
  recompense: { fr: 'Objet à gagner', en: 'Object to earn', es: 'Objeto por ganar', de: 'Zu gewinnendes Objekt', pt: 'Objeto a ganhar' },
  recompenseObtenue: { fr: 'Objet obtenu', en: 'Object earned', es: 'Objeto conseguido', de: 'Objekt erhalten', pt: 'Objeto conseguido' },
  recompenseDejaPossedee: {
    fr: 'Déjà dans ta collection',
    en: 'Already in your collection',
    es: 'Ya en tu colección',
    de: 'Schon in deiner Sammlung',
    pt: 'Já na sua coleção',
  },
  actionEquiper: { fr: 'Équiper', en: 'Equip', es: 'Equipar', de: 'Anlegen', pt: 'Equipar' },
  actionRetirer: { fr: 'Retirer', en: 'Remove', es: 'Quitar', de: 'Ablegen', pt: 'Retirar' },
  etatEquipe: { fr: 'Équipé', en: 'Equipped', es: 'Equipado', de: 'Angelegt', pt: 'Equipado' },
  objetPermanent: {
    fr: 'Il est à toi, définitivement.',
    en: 'It is yours, permanently.',
    es: 'Es tuyo, para siempre.',
    de: 'Es gehört dir, dauerhaft.',
    pt: 'É seu, para sempre.',
  },
  objetsVides: {
    fr: 'Aucun objet de défi pour l’instant.',
    en: 'No challenge object yet.',
    es: 'Aún ningún objeto de reto.',
    de: 'Noch kein Aufgaben-Objekt.',
    pt: 'Ainda nenhum objeto de desafio.',
  },

  // ═══════════════════════ Natures d'objet (§7.5) ═══════════════════════════
  kindSticker: { fr: 'Sticker', en: 'Sticker', es: 'Pegatina', de: 'Sticker', pt: 'Autocolante' },
  kindTracePattern: { fr: 'Motif de trace', en: 'Trace pattern', es: 'Motivo de traza', de: 'Spurmuster', pt: 'Padrão de traço' },
  kindPhotoComposition: { fr: 'Composition photo', en: 'Photo layout', es: 'Composición de foto', de: 'Fotolayout', pt: 'Composição de foto' },
  kindPersonalEmblem: { fr: 'Emblème', en: 'Emblem', es: 'Emblema', de: 'Emblem', pt: 'Emblema' },
  kindPoster: { fr: 'Affiche', en: 'Poster', es: 'Cartel', de: 'Poster', pt: 'Cartaz' },

  // ═══════════════════════ Erreurs d'action, dites en clair ═════════════════
  erreurNonPossede: {
    fr: 'Cet objet n’est pas encore à toi.',
    en: 'This object is not yours yet.',
    es: 'Este objeto aún no es tuyo.',
    de: 'Dieses Objekt gehört dir noch nicht.',
    pt: 'Este objeto ainda não é seu.',
  },
  erreurSession: {
    fr: 'Reconnecte-toi pour continuer.',
    en: 'Sign in again to continue.',
    es: 'Vuelve a iniciar sesión para continuar.',
    de: 'Melde dich erneut an, um fortzufahren.',
    pt: 'Entre novamente para continuar.',
  },
  erreurAction: {
    fr: 'L’action n’a pas abouti. Actualise puis réessaie.',
    en: 'The action did not complete. Refresh and try again.',
    es: 'La acción no se completó. Actualiza y reinténtalo.',
    de: 'Die Aktion wurde nicht abgeschlossen. Aktualisiere und versuche es erneut.',
    pt: 'A ação não foi concluída. Atualize e tente de novo.',
  },
  /** Entrée du Profil. */
  entreeProfil: {
    fr: 'Défis de la semaine',
    en: 'This week’s challenges',
    es: 'Retos de la semana',
    de: 'Wochen-Aufgaben',
    pt: 'Desafios da semana',
  },
  entreeProfilDetail: {
    fr: 'Deux à la fois, sans compte à rebours',
    en: 'Two at a time, no countdown',
    es: 'Dos a la vez, sin cuenta atrás',
    de: 'Zwei zugleich, ohne Countdown',
    pt: 'Dois de cada vez, sem contagem decrescente',
  },
});
