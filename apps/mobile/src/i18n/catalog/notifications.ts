/**
 * GRYD — LA COPIE DU CENTRE DE NOTIFICATIONS (§14.2), EN CINQ LANGUES.
 *
 * ─── POURQUOI LE TEXTE EST ICI ET PAS EN BASE ───────────────────────────────
 * Le serveur écrit un FAIT et ses paramètres (`payload->>'event'`, `crewName`,
 * `runId`…), jamais une phrase : c'est la décision de 0188, reprise par 0192.
 * Du français en base fige un message dans une seule langue (L18). Le catalogue
 * typé, lui, IMPOSE les cinq langues par le type `Entry` : une traduction
 * oubliée est une erreur TypeScript, donc un gate rouge.
 *
 * ─── COURTES, AVEC UN EMOJI ─────────────────────────────────────────────────
 * Fondateur, 11/09/2026. L'EMOJI n'est PAS ici : il vit dans le catalogue
 * serveur (`NOTIFICATION_EVENTS_2026`, `notification_kinds_2026`) parce qu'il
 * ne se traduit pas, et qu'un seul fait ne doit pas porter deux emojis selon
 * l'écran qui le rend. Ici vivent le TITRE et, quand il apporte quelque chose,
 * le CORPS. `corps: null` n'est pas un trou : c'est une notification d'une
 * seule ligne, et beaucoup le sont.
 *
 * Longueurs tenues par un test (`notificationCenter2026.test.ts`) contre
 * `NOTIFICATION_INBOX_2026` : 60 caractères de titre, 140 de corps, dans les
 * CINQ langues. « Court » n'est pas une intention, c'est une mesure.
 *
 * ⚠ LE FRANÇAIS N'ÉCRIT AUCUN TIRET LONG (`src/i18n/noDashFr2026.test.ts`).
 *
 * ─── LES PARAMÈTRES MANQUANTS NE FONT PAS DE PHRASE À TROU ─────────────────
 * `{crew}` et `{handle}` viennent du payload, et un crew supprimé ou un profil
 * sans pseudo les rend absents. Le rendu retombe alors sur `crewDefaut` /
 * `handleDefaut` : « Tu as rejoint ton crew » reste vrai, « Tu as rejoint  »
 * serait cassé.
 */
import { defineCatalog } from '../types';

/** L'écran lui-même : titre, états, gestes. */
export const C = defineCatalog({
  titre: {
    fr: 'Notifications', en: 'Notifications', es: 'Notificaciones',
    de: 'Mitteilungen', pt: 'Notificações',
  },
  intro: {
    fr: 'Ce que le jeu a fait pendant que tu n’étais pas là.',
    en: 'What the game did while you were away.',
    es: 'Lo que el juego hizo mientras no estabas.',
    de: 'Was im Spiel passiert ist, während du weg warst.',
    pt: 'O que o jogo fez enquanto você estava fora.',
  },
  /**
   * ⚠ CETTE PHRASE NE PEUT PAS COMMENCER PAR « Connecte-toi pour » : la porte de
   * compte s'adresse aussi à qui n'a PAS de compte, et lui ordonner de se
   * connecter l'exclut de ce qu'on veut lui faire créer. Règle tenue par
   * `features/account/accountDoorButtons2026.test.ts`.
   */
  etatDeconnecte: {
    fr: 'Tes notifications vivent avec ton compte. Elles reviennent ici avec lui.',
    en: 'Your notifications live on your account. They come back here with it.',
    es: 'Tus notificaciones viven con tu cuenta. Vuelven aquí con ella.',
    de: 'Deine Mitteilungen hängen an deinem Konto. Mit ihm sind sie wieder da.',
    pt: 'Suas notificações vivem com a sua conta. Elas voltam aqui com ela.',
  },
  etatIndisponible: {
    fr: 'Les notifications ne sont pas disponibles sur cette version.',
    en: 'Notifications are not available on this build.',
    es: 'Las notificaciones no están disponibles en esta versión.',
    de: 'Mitteilungen sind in dieser Version nicht verfügbar.',
    pt: 'As notificações não estão disponíveis nesta versão.',
  },
  etatLecture: {
    fr: 'Lecture de tes notifications.',
    en: 'Reading your notifications.',
    es: 'Leyendo tus notificaciones.',
    de: 'Deine Mitteilungen werden gelesen.',
    pt: 'Lendo suas notificações.',
  },
  etatEchec: {
    fr: 'Impossible de lire tes notifications pour le moment.',
    en: 'Your notifications cannot be read right now.',
    es: 'No se pueden leer tus notificaciones ahora mismo.',
    de: 'Deine Mitteilungen lassen sich gerade nicht lesen.',
    pt: 'Não é possível ler suas notificações agora.',
  },
  etatVide: {
    fr: 'Rien à signaler. Ton prochain fait de jeu arrivera ici.',
    en: 'Nothing to report. Your next moment lands here.',
    es: 'Nada que señalar. Tu próximo momento aparecerá aquí.',
    de: 'Nichts zu melden. Dein nächster Moment landet hier.',
    pt: 'Nada a relatar. Seu próximo momento aparece aqui.',
  },
  actionReessayer: {
    fr: 'Réessayer', en: 'Try again', es: 'Reintentar',
    de: 'Erneut versuchen', pt: 'Tentar de novo',
  },
  actionToutLu: {
    fr: 'Tout marquer comme lu', en: 'Mark all as read', es: 'Marcar todo como leído',
    de: 'Alle als gelesen markieren', pt: 'Marcar tudo como lido',
  },
  actionPlus: {
    fr: 'Voir plus ancien', en: 'See older', es: 'Ver más antiguas',
    de: 'Ältere anzeigen', pt: 'Ver mais antigas',
  },
  lienReglages: {
    fr: 'Régler ce que tu reçois', en: 'Choose what you receive',
    es: 'Elegir lo que recibes', de: 'Wähle, was du bekommst',
    pt: 'Escolher o que você recebe',
  },
  echecMarquage: {
    fr: 'Le marquage n’a pas abouti. Tes notifications sont intactes.',
    en: 'Marking as read did not go through. Your notifications are untouched.',
    es: 'No se pudo marcar como leído. Tus notificaciones están intactas.',
    de: 'Das Markieren hat nicht geklappt. Deine Mitteilungen sind unverändert.',
    pt: 'Não deu para marcar como lido. Suas notificações estão intactas.',
  },
  jourAujourdhui: { fr: 'Aujourd’hui', en: 'Today', es: 'Hoy', de: 'Heute', pt: 'Hoje' },
  jourHier: { fr: 'Hier', en: 'Yesterday', es: 'Ayer', de: 'Gestern', pt: 'Ontem' },
  nonLu: { fr: 'Non lu', en: 'Unread', es: 'Sin leer', de: 'Ungelesen', pt: 'Não lida' },
  cloche: {
    fr: 'Notifications', en: 'Notifications', es: 'Notificaciones',
    de: 'Mitteilungen', pt: 'Notificações',
  },
  clocheNonLus: {
    fr: 'Notifications, {n} non lues', en: 'Notifications, {n} unread',
    es: 'Notificaciones, {n} sin leer', de: 'Mitteilungen, {n} ungelesen',
    pt: 'Notificações, {n} não lidas',
  },
  /** Substitut quand le payload n’a pas de nom de crew (crew supprimé). */
  crewDefaut: {
    fr: 'ton crew', en: 'your crew', es: 'tu crew', de: 'deinem Crew', pt: 'seu crew',
  },
  /** Substitut quand le payload n’a pas de pseudo (profil sans nom public). */
  handleDefaut: {
    fr: 'Quelqu’un', en: 'Someone', es: 'Alguien', de: 'Jemand', pt: 'Alguém',
  },
});

/**
 * UN FAIT, SON TITRE, SON CORPS. Les clés sont EXACTEMENT celles de
 * `NOTIFICATION_EVENTS_2026` (packages/shared) : le test refuse une clé en trop
 * comme une clé manquante, donc aucun fait ne peut arriver sans phrase, et
 * aucune phrase ne peut décrire un fait que rien ne produit.
 */
export const FAITS = {
  capture_published: {
    titre: {
      fr: 'Boucle validée', en: 'Loop validated', es: 'Bucle validado',
      de: 'Schleife bestätigt', pt: 'Volta validada',
    },
    corps: {
      fr: 'Ton terrain est sur la carte.', en: 'Your ground is on the map.',
      es: 'Tu terreno está en el mapa.', de: 'Dein Gebiet ist auf der Karte.',
      pt: 'Seu terreno está no mapa.',
    },
  },
  result_pending: {
    titre: {
      fr: 'Vérification en cours', en: 'Verification under way', es: 'Verificación en curso',
      de: 'Prüfung läuft', pt: 'Verificação em curso',
    },
    corps: {
      fr: 'Ta sortie est enregistrée.', en: 'Your activity is saved.',
      es: 'Tu salida está guardada.', de: 'Deine Aktivität ist gespeichert.',
      pt: 'Sua atividade está salva.',
    },
  },
  result_ready: {
    titre: {
      fr: 'Résultat prêt', en: 'Result ready', es: 'Resultado listo',
      de: 'Ergebnis bereit', pt: 'Resultado pronto',
    },
    corps: {
      fr: 'Ta sortie est analysée.', en: 'Your activity has been reviewed.',
      es: 'Tu salida ha sido analizada.', de: 'Deine Aktivität wurde geprüft.',
      pt: 'Sua atividade foi analisada.',
    },
  },
  result_refused: {
    titre: {
      fr: 'Sortie non retenue', en: 'Activity not counted', es: 'Salida no contabilizada',
      de: 'Aktivität nicht gewertet', pt: 'Atividade não contabilizada',
    },
    corps: {
      fr: 'Elle ne prend pas de terrain.', en: 'It takes no ground.',
      es: 'No toma terreno.', de: 'Sie nimmt kein Gebiet.', pt: 'Ela não toma terreno.',
    },
  },
  /**
   * « SPORT SEULEMENT » (0197). Le titre dit le CHOIX (« gardée »), pas une
   * sanction ; le corps dit les deux moitiés de la conséquence dans l'ordre qui
   * rassure d'abord : ce qui compte, puis ce qui ne compte pas.
   */
  run_sport_only: {
    titre: {
      fr: 'Sortie gardée en l’état', en: 'Outing kept as declared',
      es: 'Salida mantenida tal cual', de: 'Aktivität so behalten',
      pt: 'Atividade mantida assim',
    },
    corps: {
      fr: 'Elle compte pour toi, pas pour le terrain.',
      en: 'It counts for you, not for ground.',
      es: 'Cuenta para ti, no para el terreno.',
      de: 'Sie zählt für dich, nicht für Gebiet.',
      pt: 'Conta para você, não para terreno.',
    },
  },
  weekly_quest_done: {
    titre: {
      fr: 'Défi de la semaine accompli', en: 'Weekly challenge done',
      es: 'Reto de la semana logrado', de: 'Wochen-Challenge geschafft',
      pt: 'Desafio da semana concluído',
    },
    corps: {
      fr: 'Ta récompense t’attend.', en: 'Your reward is waiting.',
      es: 'Tu recompensa te espera.', de: 'Deine Belohnung wartet.',
      pt: 'Sua recompensa espera por você.',
    },
  },
  level_reward: {
    titre: {
      fr: 'Nouvelle récompense', en: 'New reward', es: 'Nueva recompensa',
      de: 'Neue Belohnung', pt: 'Nova recompensa',
    },
    corps: {
      fr: 'Elle est dans ta collection.', en: 'It is in your collection.',
      es: 'Está en tu colección.', de: 'Sie ist in deiner Sammlung.',
      pt: 'Ela está na sua coleção.',
    },
  },
  referral_completed: {
    titre: {
      fr: 'Parrainage réussi', en: 'Referral complete', es: 'Invitación completada',
      de: 'Empfehlung abgeschlossen', pt: 'Convite concluído',
    },
    corps: {
      fr: 'Vos récompenses sont là.', en: 'Your rewards are here.',
      es: 'Vuestras recompensas están aquí.', de: 'Eure Belohnungen sind da.',
      pt: 'Suas recompensas chegaram.',
    },
  },
  crew_joined: {
    titre: {
      fr: 'Tu as rejoint {crew}', en: 'You joined {crew}', es: 'Te has unido a {crew}',
      de: 'Du bist bei {crew}', pt: 'Você entrou em {crew}',
    },
    corps: null,
  },
  crew_member_joined: {
    titre: {
      fr: '{handle} a rejoint {crew}', en: '{handle} joined {crew}',
      es: '{handle} se ha unido a {crew}', de: '{handle} ist bei {crew}',
      pt: '{handle} entrou em {crew}',
    },
    corps: null,
  },
  crew_announcement: {
    titre: {
      fr: 'Annonce du capitaine', en: 'Captain’s announcement', es: 'Anuncio del capitán',
      de: 'Ansage des Kapitäns', pt: 'Aviso do capitão',
    },
    corps: {
      fr: 'Elle t’attend dans {crew}.', en: 'It is waiting in {crew}.',
      es: 'Te espera en {crew}.', de: 'Sie wartet in {crew}.',
      pt: 'Ele espera por você em {crew}.',
    },
  },
  crew_challenge_started: {
    titre: {
      fr: 'Le défi commence', en: 'The challenge is on', es: 'El reto empieza',
      de: 'Die Challenge läuft', pt: 'O desafio começou',
    },
    corps: {
      fr: 'Ton crew est engagé.', en: 'Your crew is in.', es: 'Tu crew está dentro.',
      de: 'Dein Crew ist dabei.', pt: 'Seu crew está dentro.',
    },
  },
  crew_challenge_ended: {
    titre: {
      fr: 'Le résultat de votre défi est prêt', en: 'Your challenge result is ready',
      es: 'El resultado de vuestro reto está listo', de: 'Euer Challenge-Ergebnis ist da',
      pt: 'O resultado do seu desafio está pronto',
    },
    corps: null,
  },
  crew_outing_proposed: {
    titre: {
      fr: 'Sortie proposée dans {crew}', en: 'Outing proposed in {crew}',
      es: 'Salida propuesta en {crew}', de: 'Ausfahrt vorgeschlagen bei {crew}',
      pt: 'Saída proposta em {crew}',
    },
    corps: null,
  },
  crew_outing_changed: {
    titre: {
      fr: 'Le rendez-vous a changé', en: 'The meet-up has changed',
      es: 'La cita ha cambiado', de: 'Das Treffen hat sich geändert',
      pt: 'O encontro mudou',
    },
    corps: {
      fr: 'Les détails sont à jour dans {crew}.', en: 'The details are updated in {crew}.',
      es: 'Los detalles están actualizados en {crew}.',
      de: 'Die Details sind bei {crew} aktualisiert.',
      pt: 'Os detalhes estão atualizados em {crew}.',
    },
  },
  crew_outing_cancelled: {
    titre: {
      fr: 'Le rendez-vous est annulé', en: 'The meet-up is cancelled',
      es: 'La cita está cancelada', de: 'Das Treffen ist abgesagt',
      pt: 'O encontro foi cancelado',
    },
    corps: null,
  },
  application_received: {
    titre: {
      fr: 'Une candidature attend', en: 'An application is waiting',
      es: 'Una solicitud espera', de: 'Eine Bewerbung wartet',
      pt: 'Uma candidatura espera',
    },
    corps: {
      fr: 'Quelqu’un veut rejoindre {crew}.', en: 'Someone wants to join {crew}.',
      es: 'Alguien quiere unirse a {crew}.', de: 'Jemand möchte {crew} beitreten.',
      pt: 'Alguém quer entrar em {crew}.',
    },
  },
  invited: {
    titre: {
      fr: 'Invitation à rejoindre {crew}', en: 'Invitation to join {crew}',
      es: 'Invitación para unirte a {crew}', de: 'Einladung zu {crew}',
      pt: 'Convite para entrar em {crew}',
    },
    corps: null,
  },
  charter_updated: {
    titre: {
      fr: 'La charte a changé', en: 'The charter has changed', es: 'La carta ha cambiado',
      de: 'Die Charta hat sich geändert', pt: 'A carta mudou',
    },
    corps: {
      fr: '{crew} a une nouvelle version.', en: '{crew} has a new version.',
      es: '{crew} tiene una nueva versión.', de: '{crew} hat eine neue Fassung.',
      pt: '{crew} tem uma nova versão.',
    },
  },
  warning_issued: {
    titre: {
      fr: 'Avertissement', en: 'Warning', es: 'Aviso', de: 'Verwarnung', pt: 'Advertência',
    },
    corps: {
      fr: 'Ta situation dans {crew} est à lire.',
      en: 'Your standing in {crew} is worth a read.',
      es: 'Tu situación en {crew} merece una lectura.',
      de: 'Dein Stand bei {crew} ist einen Blick wert.',
      pt: 'Vale ler sua situação em {crew}.',
    },
  },
  removed: {
    titre: {
      fr: 'Tu ne fais plus partie de {crew}', en: 'You are no longer in {crew}',
      es: 'Ya no formas parte de {crew}', de: 'Du bist nicht mehr bei {crew}',
      pt: 'Você não faz mais parte de {crew}',
    },
    corps: null,
  },
  dissolved: {
    titre: {
      fr: '{crew} a été dissous', en: '{crew} has been dissolved',
      es: '{crew} se ha disuelto', de: '{crew} wurde aufgelöst',
      pt: '{crew} foi dissolvido',
    },
    corps: null,
  },
} as const;
