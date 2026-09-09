/**
 * GRYD — i18n : « Ta commune, cette semaine » (ADR-013 §2.1, lot L).
 *
 * ═══ POURQUOI UN CATALOGUE, ET PAS `copy(fr, en)` ══════════════════════════
 * Les écrans de la refonte écrivent leurs textes en deux langues, en ligne
 * (`useRefonteCopy`). C'est tenable pour une phrase de service ; ça ne l'est
 * pas ici. Cet écran énonce des RÈGLES à des gens qu'il classe — pourquoi il ne
 * montre rien à quatre, pourquoi il ne compte pas l'allure, à quelle heure il a
 * mesuré. Une règle expliquée seulement en français et en anglais n'est pas
 * expliquée : le typage de `Entry` impose les cinq langues, et c'est
 * exactement la garantie qu'on veut sur ces phrases-là.
 *
 * ═══ CE QUE CE CATALOGUE NE DIT JAMAIS ═════════════════════════════════════
 *  · Aucun nom de lieu. Le nom de la commune vient du serveur (`city_zones.name`,
 *    contour réel) ; le département n'a pas de nom dans ce dépôt, donc il est
 *    formulé par son CODE (« Département 76 »), jamais par un nom inventé.
 *  · Aucun chiffre de seuil en dur. `{min}` est rendu par la RPC, qui le tient
 *    de `LEADERBOARD_RULES_2026.minRankedSubjects` (ADR-003).
 *  · Aucune allure, aucun chrono, aucun record : §6.2 et §6.5 du cahier les
 *    excluent du classement, et `noteMetrique` le DIT au lecteur plutôt que de
 *    le laisser deviner pourquoi il n'y en a pas.
 *  · Aucun « 0 » nu : l'absence de mesure est une PHRASE (`moiSansTerrain`),
 *    jamais un zéro.
 *
 * REGISTRE : le français TUTOIE, le portugais est BRÉSILIEN (« você »).
 * §A : libellés courts dans les cinq langues — l'allemand est reformulé concis
 * pour ne pas tronquer à 375 px.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ══════════════ Titre et cadre ══════════════
  titre: {
    fr: 'Ta commune, cette semaine',
    en: 'Your town, this week',
    es: 'Tu municipio, esta semana',
    de: 'Deine Gemeinde, diese Woche',
    pt: 'Seu município, esta semana',
  },
  sousTitre: {
    fr: 'Le terrain nouveau, du lundi au dimanche.',
    en: 'New terrain, Monday to Sunday.',
    es: 'El terreno nuevo, de lunes a domingo.',
    de: 'Neues Gebiet, Montag bis Sonntag.',
    pt: 'O terreno novo, de segunda a domingo.',
  },
  fenetre: {
    fr: 'Semaine du {debut} au {fin}',
    en: 'Week of {debut} to {fin}',
    es: 'Semana del {debut} al {fin}',
    de: 'Woche {debut} – {fin}',
    pt: 'Semana de {debut} a {fin}',
  },
  mesureA: {
    fr: 'Mesuré à {heure}',
    en: 'Measured at {heure}',
    es: 'Medido a las {heure}',
    de: 'Gemessen um {heure}',
    pt: 'Medido às {heure}',
  },
  mesureAncienne: {
    fr: 'Mesuré à {heure} · mesure ancienne',
    en: 'Measured at {heure} · stale measurement',
    es: 'Medido a las {heure} · medición antigua',
    de: 'Gemessen um {heure} · veraltet',
    pt: 'Medido às {heure} · medição antiga',
  },
  noteMetrique: {
    fr: 'Ce classement compte le terrain pris. Jamais l’allure, ni le chrono.',
    en: 'This board counts terrain taken. Never pace, never time.',
    es: 'Esta clasificación cuenta el terreno tomado. Nunca el ritmo ni el tiempo.',
    de: 'Gezählt wird erobertes Gebiet. Nie Tempo, nie Zeit.',
    pt: 'Esta classificação conta o terreno tomado. Nunca o ritmo nem o tempo.',
  },

  // ══════════════ Sélecteurs ══════════════
  course: { fr: 'Course', en: 'Run', es: 'Carrera', de: 'Laufen', pt: 'Corrida' },
  velo: { fr: 'Vélo', en: 'Ride', es: 'Bici', de: 'Rad', pt: 'Bike' },
  porteeDepartement: {
    fr: 'Département {code}',
    en: 'Department {code}',
    es: 'Departamento {code}',
    de: 'Departement {code}',
    pt: 'Departamento {code}',
  },
  porteeFrance: { fr: 'France', en: 'France', es: 'Francia', de: 'Frankreich', pt: 'França' },

  // ══════════════ Les lignes ══════════════
  toi: { fr: 'Toi', en: 'You', es: 'Tú', de: 'Du', pt: 'Você' },
  ligneAnonyme: {
    fr: 'Joueur · {code}',
    en: 'Player · {code}',
    es: 'Jugador · {code}',
    de: 'Spieler · {code}',
    pt: 'Jogador · {code}',
  },
  exAequo: {
    fr: '{n} ex æquo',
    en: '{n} tied',
    es: '{n} empatados',
    de: '{n} gleichauf',
    pt: '{n} empatados',
  },
  terrainPris: {
    fr: '{km} km² pris',
    en: '{km} km² taken',
    es: '{km} km² tomados',
    de: '{km} km² erobert',
    pt: '{km} km² tomados',
  },
  terrainTenu: {
    fr: 'Tient {km} km²',
    en: 'Holds {km} km²',
    es: 'Mantiene {km} km²',
    de: 'Hält {km} km²',
    pt: 'Mantém {km} km²',
  },
  monRang: {
    fr: 'Ton rang : {rang}',
    en: 'Your rank: {rang}',
    es: 'Tu puesto: {rang}',
    de: 'Dein Rang: {rang}',
    pt: 'Sua posição: {rang}',
  },
  moiSansTerrain: {
    fr: 'Tu n’as pas encore pris de terrain ici cette semaine.',
    en: 'You have not taken terrain here this week yet.',
    es: 'Todavía no has tomado terreno aquí esta semana.',
    de: 'Du hast hier diese Woche noch kein Gebiet erobert.',
    pt: 'Você ainda não tomou terreno aqui esta semana.',
  },

  // ══════════════ État : pas connecté ══════════════
  connexionTitre: {
    fr: 'Le classement demande un compte',
    en: 'The board needs an account',
    es: 'La clasificación requiere una cuenta',
    de: 'Für die Rangliste braucht es ein Konto',
    pt: 'A classificação exige uma conta',
  },
  connexionCorps: {
    fr: 'Un classement nomme des personnes dans un lieu : il n’est pas ouvert au public.',
    en: 'A board names people in a place: it is not open to the public.',
    es: 'Una clasificación nombra a personas en un lugar: no es pública.',
    de: 'Eine Rangliste nennt Personen an einem Ort: sie ist nicht öffentlich.',
    pt: 'Uma classificação nomeia pessoas em um lugar: ela não é pública.',
  },
  connexionAction: { fr: 'Se connecter', en: 'Sign in', es: 'Iniciar sesión', de: 'Anmelden', pt: 'Entrar' },

  // ══════════════ État : pas assez de monde ══════════════
  premierIciTitre: {
    fr: 'Premier ici',
    en: 'First one here',
    es: 'Primero aquí',
    de: 'Erste·r hier',
    pt: 'Primeiro aqui',
  },
  premierIciCorps: {
    fr: '{n} sur {min} personnes ont pris du terrain ici cette semaine.',
    en: '{n} of {min} people have taken terrain here this week.',
    es: '{n} de {min} personas han tomado terreno aquí esta semana.',
    de: '{n} von {min} Personen haben hier diese Woche Gebiet erobert.',
    pt: '{n} de {min} pessoas tomaram terreno aqui esta semana.',
  },
  premierIciPourquoi: {
    fr: 'En dessous de {min}, un podium serait une donnée fabriquée. Il ne s’affiche pas.',
    en: 'Below {min}, a podium would be fabricated data. It is not shown.',
    es: 'Por debajo de {min}, un podio sería un dato inventado. No se muestra.',
    de: 'Unter {min} wäre ein Podium erfunden. Es wird nicht gezeigt.',
    pt: 'Abaixo de {min}, um pódio seria um dado inventado. Ele não aparece.',
  },
  premierIciAction: { fr: 'Ouvrir la carte', en: 'Open map', es: 'Abrir el mapa', de: 'Karte öffnen', pt: 'Abrir o mapa' },

  // ══════════════ État : indisponible ══════════════
  sansMesureTitre: {
    fr: 'Aucune mesure cette semaine',
    en: 'No measurement this week',
    es: 'Sin medición esta semana',
    de: 'Diese Woche keine Messung',
    pt: 'Sem medição esta semana',
  },
  sansMesureCorps: {
    fr: 'La mesure passe toutes les heures. Ferme une boucle : la prochaine te comptera.',
    en: 'The measurement runs every hour. Close a loop and the next one counts you.',
    es: 'La medición pasa cada hora. Cierra un bucle y la siguiente te contará.',
    de: 'Gemessen wird stündlich. Schließe eine Schleife — die nächste zählt dich.',
    pt: 'A medição roda a cada hora. Feche um circuito e a próxima conta você.',
  },
  communeFermeeTitre: {
    fr: 'Commune pas encore ouverte',
    en: 'Town not open yet',
    es: 'Municipio aún no abierto',
    de: 'Gemeinde noch nicht offen',
    pt: 'Município ainda não aberto',
  },
  communeFermeeCorps: {
    fr: 'Une commune s’ouvre à la première boucle qu’on y ferme.',
    en: 'A town opens with the first loop closed inside it.',
    es: 'Un municipio se abre con el primer bucle cerrado en él.',
    de: 'Eine Gemeinde öffnet mit der ersten dort geschlossenen Schleife.',
    pt: 'Um município abre com o primeiro circuito fechado nele.',
  },
  sansCommuneTitre: {
    fr: 'On ne sait pas encore où tu cours',
    en: 'We do not know where you run yet',
    es: 'Aún no sabemos dónde corres',
    de: 'Wir wissen noch nicht, wo du läufst',
    pt: 'Ainda não sabemos onde você corre',
  },
  sansCommuneCorps: {
    fr: 'Ta commune se déduit de tes boucles publiées, jamais de ta position.',
    en: 'Your town comes from your published loops, never from your location.',
    es: 'Tu municipio se deduce de tus bucles publicados, nunca de tu ubicación.',
    de: 'Deine Gemeinde ergibt sich aus veröffentlichten Schleifen, nie aus deinem Standort.',
    pt: 'Seu município vem dos seus circuitos publicados, nunca da sua localização.',
  },

  // ══════════════ États : en cours et échec ══════════════
  chargement: {
    fr: 'Lecture du classement…',
    en: 'Loading the board…',
    es: 'Cargando la clasificación…',
    de: 'Rangliste wird geladen…',
    pt: 'Carregando a classificação…',
  },
  echecTitre: {
    fr: 'Classement indisponible',
    en: 'Board unavailable',
    es: 'Clasificación no disponible',
    de: 'Rangliste nicht verfügbar',
    pt: 'Classificação indisponível',
  },
  echecCorps: {
    fr: 'La lecture a échoué. Rien n’est affiché tant que la mesure n’est pas revenue.',
    en: 'The read failed. Nothing is shown until the measurement is back.',
    es: 'La lectura falló. No se muestra nada hasta que vuelva la medición.',
    de: 'Das Laden ist fehlgeschlagen. Bis zur Messung wird nichts gezeigt.',
    pt: 'A leitura falhou. Nada aparece até a medição voltar.',
  },
  reessayer: { fr: 'Réessayer', en: 'Retry', es: 'Reintentar', de: 'Erneut', pt: 'Tentar de novo' },

  // ══════════════ Entrée depuis la Carte ══════════════
  entreeCarte: {
    fr: 'Ta commune, cette semaine',
    en: 'Your town, this week',
    es: 'Tu municipio, esta semana',
    de: 'Deine Gemeinde, diese Woche',
    pt: 'Seu município, esta semana',
  },
});
