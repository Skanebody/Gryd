/**
 * GRYD — i18n : catalogue de l'écran E48 « Activité et annonces crew »
 * (route `/crew-activite`).
 *
 * SÉPARÉ DE `crew.ts` VOLONTAIREMENT : celui-ci porte déjà plus de 400 entrées
 * pour six surfaces. Un septième bloc noyé dedans se retrouverait relu par
 * quiconque touche au HQ, à l'édition ou à la découverte — et les libellés d'un
 * fil d'activité n'ont rien à voir avec ceux d'un roster. Même partage que
 * `qr.ts`, extrait de `crew.ts` pour la même raison.
 *
 * ═══ CE QUE CES TEXTES DISENT, ET CE QU'ILS SE REFUSENT À DIRE ═════════════
 * L'écran lit une base VIDE de jeu (zéro crew, zéro course, 28/07/2026). Ses
 * états vides sont donc la surface la plus lue du jour, et ils portent tout le
 * poids de la constitution : ils DISENT le calme sans l'appeler un échec, sans
 * le confondre avec un chargement, et sans inventer un seul message ni un seul
 * auteur pour « faire vivant ». Deux écrans de frontière crew ont été SUPPRIMÉS
 * le 21/07/2026 pour avoir fait exactement l'inverse.
 *
 * Trois refus explicites, lisibles dans les clés ci-dessous :
 *   · `emptyAll` ne dit PAS « il ne s'est rien passé » — on n'en sait rien à
 *     l'échelle du crew, on sait seulement qu'on n'a rien À MONTRER ;
 *   · `failed*` ne dit JAMAIS « ton crew n'a rien publié » : une lecture ratée
 *     n'affirme rien sur le joueur ;
 *   · `unsupported*` distingue « ce serveur n'a pas la fonction » d'une panne
 *     réseau — réessayer n'y changerait rien, et le dire évite de faire tourner
 *     quelqu'un en rond sur un bouton.
 *
 * INVARIANTS (jamais traduits) : GRYD, Crew (concept/onglet), les noms propres
 * de secteurs et de frontières (République, Bastille…), les pseudos.
 *
 * §A CONTRAIGNANT : les libellés d'action restent COURTS dans les cinq langues
 * (l'allemand compose vite) — aucun texte d'action ne doit se tronquer à 375 px.
 * REGISTRE : le français TUTOIE, le portugais est BRÉSILIEN (« você »).
 */
import { defineCatalog, type Entry } from '../types';
import type {
  AnnouncementBlock,
  AnnouncementPrivacyRefusal,
  CrewActivitySection,
  CrewConquestKind,
} from '../../features/crew/crewActivity';

export const C = defineCatalog({
  // ── Barre + titres ─────────────────────────────────────────────────────────
  title: {
    fr: 'Activité du crew',
    en: 'Crew activity',
    es: 'Actividad del crew',
    de: 'Crew-Aktivität',
    pt: 'Atividade do crew',
  },
  back: {
    fr: 'Retour',
    en: 'Back',
    es: 'Volver',
    de: 'Zurück',
    pt: 'Voltar',
  },

  // ── Les quatre sections de la spéc ────────────────────────────────────────
  secAnnouncement: {
    fr: 'ANNONCES ÉPINGLÉES',
    en: 'PINNED ANNOUNCEMENTS',
    es: 'ANUNCIOS FIJADOS',
    de: 'ANGEHEFTETE ANSAGEN',
    pt: 'AVISOS FIXADOS',
  },
  secOuting: {
    fr: 'SORTIES PROPOSÉES',
    en: 'PROPOSED OUTINGS',
    es: 'SALIDAS PROPUESTAS',
    de: 'VORGESCHLAGENE AUSFAHRTEN',
    pt: 'SAÍDAS PROPOSTAS',
  },
  secConquest: {
    fr: 'FAITS DU CREW',
    en: 'CREW FACTS',
    es: 'HECHOS DEL CREW',
    de: 'CREW-FAKTEN',
    pt: 'FATOS DO CREW',
  },
  /**
   * « SIGNAUX » et non « DEMANDES D'AIDE » : la section est alimentée par les
   * PINGS DE ZONE (0051), un catalogue FERMÉ de signaux. `crew_requests` (la
   * table des demandes d'aide) n'a aucun chemin d'écriture. Titrer « demandes
   * d'aide » un bloc qui n'en contient pas ferait conclure, devant une liste
   * vide, que personne n'a besoin de rien — alors qu'on ne le sait pas.
   * Même arbitrage que « SIGNAUX DU CREW » dans RealCrewScreen.
   */
  secHelp: {
    fr: 'SIGNAUX DU CREW',
    en: 'CREW SIGNALS',
    es: 'SEÑALES DEL CREW',
    de: 'CREW-SIGNALE',
    pt: 'SINAIS DO CREW',
  },

  // ── Les faits du crew : deux types, deux phrases NEUTRES ──────────────────
  /**
   * « Boucle fermée » et non « territoire capturé » : c'est le fait que
   * `ingest_run` écrit (`boundary_completed`), et le nom de la frontière suit.
   */
  factBoundary: {
    fr: 'Boucle crew fermée · {name}',
    en: 'Crew loop closed · {name}',
    es: 'Bucle del crew cerrado · {name}',
    de: 'Crew-Runde geschlossen · {name}',
    pt: 'Circuito do crew fechado · {name}',
  },
  factBoundaryNoName: {
    fr: 'Boucle crew fermée',
    en: 'Crew loop closed',
    es: 'Bucle del crew cerrado',
    de: 'Crew-Runde geschlossen',
    pt: 'Circuito do crew fechado',
  },
  /**
   * NEUTRE, et c'est une décision. `contested` est inséré pour LES DEUX crews
   * avec le même contenu : rien ne dit de quel côté on est. « Vous avez repris »
   * serait faux une fois sur deux, et « vous avez perdu » violerait l'anti-shame.
   */
  factContested: {
    fr: 'Zone contestée pendant une sortie de groupe',
    en: 'Zone contested during a group outing',
    es: 'Zona disputada durante una salida en grupo',
    de: 'Zone bei einer Gruppenausfahrt umkämpft',
    pt: 'Zona disputada durante uma saída em grupo',
  },
  factBy: {
    fr: 'avec {pseudo}',
    en: 'with {pseudo}',
    es: 'con {pseudo}',
    de: 'mit {pseudo}',
    pt: 'com {pseudo}',
  },
  /**
   * L'écran ne montre jamais d'heure exacte : le serveur tronque à l'heure et
   * diffère la publication. Le dire une fois, en bas de section, vaut mieux que
   * de laisser croire à un direct.
   */
  factDeferredNote: {
    fr: 'Les faits sont publiés en différé, sans heure précise ni position.',
    en: 'Facts are published with a delay, without exact time or location.',
    es: 'Los hechos se publican con retraso, sin hora exacta ni ubicación.',
    de: 'Fakten erscheinen verzögert — ohne genaue Zeit und ohne Ort.',
    pt: 'Os fatos são publicados com atraso, sem horário exato nem localização.',
  },

  // ── Âge relatif (aucune horloge) ──────────────────────────────────────────
  ageToday: {
    fr: "aujourd'hui",
    en: 'today',
    es: 'hoy',
    de: 'heute',
    pt: 'hoje',
  },
  ageDays: {
    fr: 'il y a {n} j',
    en: '{n} d ago',
    es: 'hace {n} d',
    de: 'vor {n} T',
    pt: 'há {n} d',
  },
  ageWeeks: {
    fr: 'il y a {n} sem.',
    en: '{n} w ago',
    es: 'hace {n} sem.',
    de: 'vor {n} W',
    pt: 'há {n} sem.',
  },

  // ── Publier une annonce ───────────────────────────────────────────────────
  postOpen: {
    fr: 'Épingler une annonce',
    en: 'Pin an announcement',
    es: 'Fijar un anuncio',
    de: 'Ansage anheften',
    pt: 'Fixar um aviso',
  },
  postPlaceholder: {
    fr: 'Ce que le crew doit savoir cette semaine.',
    en: 'What the crew should know this week.',
    es: 'Lo que el crew debe saber esta semana.',
    de: 'Was die Crew diese Woche wissen sollte.',
    pt: 'O que o crew precisa saber esta semana.',
  },
  postSubmit: {
    fr: 'Épingler',
    en: 'Pin',
    es: 'Fijar',
    de: 'Anheften',
    pt: 'Fixar',
  },
  postCancel: {
    fr: 'Annuler',
    en: 'Cancel',
    es: 'Cancelar',
    de: 'Abbrechen',
    pt: 'Cancelar',
  },
  postRemaining: {
    fr: '{n} caractères restants',
    en: '{n} characters left',
    es: '{n} caracteres restantes',
    de: 'noch {n} Zeichen',
    pt: '{n} caracteres restantes',
  },
  postOver: {
    fr: '{n} caractères de trop',
    en: '{n} characters too many',
    es: '{n} caracteres de más',
    de: '{n} Zeichen zu viel',
    pt: '{n} caracteres a mais',
  },
  postScope: {
    fr: 'Visible par les membres de ton crew, et personne d’autre.',
    en: 'Visible to your crew members, and no one else.',
    es: 'Visible para los miembros de tu crew, y nadie más.',
    de: 'Nur für deine Crew-Mitglieder sichtbar — sonst niemand.',
    pt: 'Visível para os membros do seu crew, e mais ninguém.',
  },
  postSlots: {
    fr: '{n} sur {max} épinglées',
    en: '{n} of {max} pinned',
    es: '{n} de {max} fijados',
    de: '{n} von {max} angeheftet',
    pt: '{n} de {max} fixados',
  },

  // ── Ce qui bloque la publication (§A4 : jamais un CTA condamné) ───────────
  blockForbidden: {
    fr: 'Seuls le fondateur et le co-capitaine épinglent une annonce.',
    en: 'Only the founder and co-captain can pin an announcement.',
    es: 'Solo el fundador y el co-capitán pueden fijar un anuncio.',
    de: 'Nur Gründer und Co-Kapitän können eine Ansage anheften.',
    pt: 'Só o fundador e o co-capitão podem fixar um aviso.',
  },
  blockEmpty: {
    fr: 'Écris ton annonce.',
    en: 'Write your announcement.',
    es: 'Escribe tu anuncio.',
    de: 'Schreib deine Ansage.',
    pt: 'Escreva seu aviso.',
  },
  blockTooLong: {
    fr: 'Trop long : coupe encore un peu.',
    en: 'Too long — trim it a bit.',
    es: 'Demasiado largo: recorta un poco.',
    de: 'Zu lang — kürz es etwas.',
    pt: 'Longo demais: corte um pouco.',
  },
  blockTooMany: {
    fr: 'Le crew a déjà {max} annonces épinglées. Retires-en une.',
    en: 'The crew already has {max} pinned announcements. Remove one.',
    es: 'El crew ya tiene {max} anuncios fijados. Quita uno.',
    de: 'Die Crew hat schon {max} angeheftete Ansagen. Nimm eine weg.',
    pt: 'O crew já tem {max} avisos fixados. Remova um.',
  },
  /** Les trois motifs de vie privée — DITS, pour que la personne corrige. */
  blockCoordinates: {
    fr: 'Retire les coordonnées GPS : écris un lieu, pas un point.',
    en: 'Remove the GPS coordinates — name a place, not a point.',
    es: 'Quita las coordenadas GPS: escribe un lugar, no un punto.',
    de: 'Nimm die GPS-Koordinaten raus — nenn einen Ort, keinen Punkt.',
    pt: 'Tire as coordenadas GPS: escreva um lugar, não um ponto.',
  },
  blockStreetAddress: {
    fr: 'Pas d’adresse numérotée : donne un lieu public.',
    en: 'No street number — give a public place.',
    es: 'Sin número de calle: da un lugar público.',
    de: 'Keine Hausnummer — nenn einen öffentlichen Ort.',
    pt: 'Sem endereço numerado: dê um lugar público.',
  },
  blockDoorDetail: {
    fr: 'Pas de digicode ni d’étage : ça n’a rien à faire ici.',
    en: 'No door code or floor — that doesn’t belong here.',
    es: 'Sin código de portal ni piso: aquí no.',
    de: 'Kein Türcode, keine Etage — das gehört hier nicht hin.',
    pt: 'Sem código de portaria nem andar: não é lugar disso.',
  },

  // ── Ce que le serveur a répondu ──────────────────────────────────────────
  errUnavailable: {
    fr: 'Ce texte ne peut pas être publié.',
    en: 'This text cannot be published.',
    es: 'Este texto no se puede publicar.',
    de: 'Dieser Text kann nicht veröffentlicht werden.',
    pt: 'Este texto não pode ser publicado.',
  },
  errSendFailed: {
    fr: 'Envoi impossible. Rouvre l’écran pour voir si c’est passé.',
    en: 'Couldn’t send. Reopen the screen to see if it went through.',
    es: 'No se pudo enviar. Vuelve a abrir la pantalla para comprobarlo.',
    de: 'Senden fehlgeschlagen. Öffne den Screen neu, um zu sehen, ob es klappte.',
    pt: 'Não deu para enviar. Reabra a tela para ver se passou.',
  },
  okDuplicate: {
    fr: 'Cette annonce était déjà épinglée.',
    en: 'That announcement was already pinned.',
    es: 'Ese anuncio ya estaba fijado.',
    de: 'Diese Ansage war schon angeheftet.',
    pt: 'Esse aviso já estava fixado.',
  },

  // ── Retirer (Apple 1.2) + modération ─────────────────────────────────────
  removeAction: {
    fr: 'Retirer',
    en: 'Remove',
    es: 'Quitar',
    de: 'Entfernen',
    pt: 'Remover',
  },
  removeConfirmTitle: {
    fr: 'Retirer cette annonce ?',
    en: 'Remove this announcement?',
    es: '¿Quitar este anuncio?',
    de: 'Diese Ansage entfernen?',
    pt: 'Remover este aviso?',
  },
  removeConfirmBody: {
    fr: 'Elle disparaît pour tout le crew. Tu pourras la réécrire.',
    en: 'It disappears for the whole crew. You can write it again.',
    es: 'Desaparece para todo el crew. Podrás escribirlo de nuevo.',
    de: 'Sie verschwindet für die ganze Crew. Du kannst sie neu schreiben.',
    pt: 'Ele some para todo o crew. Você poderá escrever de novo.',
  },
  removeFailed: {
    fr: 'Retrait impossible pour l’instant.',
    en: 'Couldn’t remove it right now.',
    es: 'No se pudo quitar ahora mismo.',
    de: 'Entfernen gerade nicht möglich.',
    pt: 'Não deu para remover agora.',
  },
  reportAction: {
    fr: 'Signaler',
    en: 'Report',
    es: 'Denunciar',
    de: 'Melden',
    pt: 'Denunciar',
  },

  // ── Les états, jamais confondus ──────────────────────────────────────────
  signedOut: {
    fr: 'Connecte-toi pour voir l’activité de ton crew.',
    en: 'Sign in to see your crew’s activity.',
    es: 'Inicia sesión para ver la actividad de tu crew.',
    de: 'Melde dich an, um die Aktivität deiner Crew zu sehen.',
    pt: 'Entre para ver a atividade do seu crew.',
  },
  loading: {
    fr: 'Lecture en cours…',
    en: 'Loading…',
    es: 'Cargando…',
    de: 'Wird geladen…',
    pt: 'Carregando…',
  },
  failedTitle: {
    fr: 'Lecture impossible',
    en: 'Couldn’t load',
    es: 'No se pudo cargar',
    de: 'Laden fehlgeschlagen',
    pt: 'Não deu para carregar',
  },
  /** N'AFFIRME RIEN sur le crew : on n'a pas lu, point. */
  failedBody: {
    fr: 'On n’a pas pu lire l’activité. Ça ne dit rien de ton crew.',
    en: 'We couldn’t read the activity. That says nothing about your crew.',
    es: 'No pudimos leer la actividad. Eso no dice nada de tu crew.',
    de: 'Wir konnten die Aktivität nicht lesen. Das sagt nichts über deine Crew.',
    pt: 'Não deu para ler a atividade. Isso não diz nada sobre o seu crew.',
  },
  retry: {
    fr: 'Réessayer',
    en: 'Retry',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  unsupportedTitle: {
    fr: 'Pas encore actif ici',
    en: 'Not active here yet',
    es: 'Aún no activo aquí',
    de: 'Hier noch nicht aktiv',
    pt: 'Ainda não ativo aqui',
  },
  unsupportedBody: {
    fr: 'Ce serveur ne connaît pas encore les annonces. Réessayer n’y changera rien.',
    en: 'This server doesn’t know announcements yet. Retrying won’t help.',
    es: 'Este servidor aún no conoce los anuncios. Reintentar no servirá.',
    de: 'Dieser Server kennt Ansagen noch nicht. Erneut versuchen bringt nichts.',
    pt: 'Este servidor ainda não conhece os avisos. Tentar de novo não adianta.',
  },
  noCrewTitle: {
    fr: 'Tu n’es dans aucun crew',
    en: 'You’re not in a crew',
    es: 'No estás en ningún crew',
    de: 'Du bist in keiner Crew',
    pt: 'Você não está em nenhum crew',
  },
  noCrewBody: {
    fr: 'L’activité, les annonces et les sorties vivent dans un crew.',
    en: 'Activity, announcements and outings live inside a crew.',
    es: 'La actividad, los anuncios y las salidas viven en un crew.',
    de: 'Aktivität, Ansagen und Ausfahrten leben in einer Crew.',
    pt: 'Atividade, avisos e saídas vivem dentro de um crew.',
  },

  // ── L'ÉTAT VIDE — de première classe, ni panne ni chargement ─────────────
  /**
   * NE DIT PAS « il ne s'est rien passé ». On sait seulement qu'on n'a rien À
   * MONTRER : le fil n'observe qu'une partie de ce qu'un crew vit.
   */
  emptyTitle: {
    fr: 'Rien à afficher pour l’instant',
    en: 'Nothing to show yet',
    es: 'Nada que mostrar por ahora',
    de: 'Noch nichts zu zeigen',
    pt: 'Nada para mostrar por enquanto',
  },
  emptyBody: {
    fr: 'Les annonces, les sorties et les boucles fermées apparaîtront ici.',
    en: 'Announcements, outings and closed loops will show up here.',
    es: 'Los anuncios, las salidas y los bucles cerrados aparecerán aquí.',
    de: 'Ansagen, Ausfahrten und geschlossene Runden erscheinen hier.',
    pt: 'Avisos, saídas e circuitos fechados vão aparecer aqui.',
  },

  // ── Sorties : ce qu'on peut faire, et ce qu'on ne peut PAS ───────────────
  outingSee: {
    fr: 'Voir les sorties',
    en: 'See outings',
    es: 'Ver salidas',
    de: 'Ausfahrten ansehen',
    pt: 'Ver saídas',
  },
  /**
   * « Voir » et jamais « Participer » : aucun RSVP n'existe (0085 le dit).
   * Peindre « je viens » sur un bouton qui n'inscrit personne serait un bouton
   * mort déguisé en engagement.
   */
  outingNoRsvp: {
    fr: 'On ne s’inscrit pas encore à une sortie.',
    en: 'You can’t sign up for an outing yet.',
    es: 'Todavía no se puede apuntar a una salida.',
    de: 'Für Ausfahrten kann man sich noch nicht eintragen.',
    pt: 'Ainda não dá para se inscrever numa saída.',
  },
});

/** Un titre de section → `Entry`. Le `Record` est le verrou : ajouter une
 *  section au moteur sans ses 5 traductions ne compile plus. */
export const CREW_ACTIVITY_SECTION_E: Readonly<Record<CrewActivitySection, Entry>> = {
  announcement: C.secAnnouncement,
  outing: C.secOuting,
  conquest: C.secConquest,
  help: C.secHelp,
};

/** Un type de fait → sa phrase SANS nom de lieu (le variant nommé est à part). */
export const CREW_FACT_E: Readonly<Record<CrewConquestKind, Entry>> = {
  boundary_completed: C.factBoundaryNoName,
  contested: C.factContested,
};

/**
 * Ce qui bloque la publication → sa phrase. Même verrou de `Record`.
 *
 * ⚠️ `privacy` N'EST JAMAIS RENDU PAR CETTE TABLE, et c'est délibéré.
 * `announcementPrivacyRefusal` est le miroir exact du SQL : le motif PRÉCIS
 * (coordonnées / adresse / porte) est toujours calculable en local, et l'écran
 * l'affiche via `ANNOUNCEMENT_PRIVACY_E`. Dire « retire les coordonnées » à
 * quelqu'un qui a écrit « 12 rue X » ferait corriger la mauvaise chose.
 * La clé reste ici parce que le `Record` l'exige — le verrou de complétude vaut
 * mieux qu'un `Partial` qui laisserait un jour passer un vrai trou. Sa valeur
 * est le motif le plus courant, au cas où un futur appelant la lirait quand
 * même.
 */
export const ANNOUNCEMENT_BLOCK_E: Readonly<Record<AnnouncementBlock, Entry>> = {
  forbidden: C.blockForbidden,
  empty: C.blockEmpty,
  too_long: C.blockTooLong,
  privacy: C.blockCoordinates,
  too_many: C.blockTooMany,
};

/** Le motif PRÉCIS de vie privée → sa phrase. C'est celui qu'on affiche. */
export const ANNOUNCEMENT_PRIVACY_E: Readonly<Record<AnnouncementPrivacyRefusal, Entry>> = {
  coordinates: C.blockCoordinates,
  street_address: C.blockStreetAddress,
  door_detail: C.blockDoorDetail,
};
