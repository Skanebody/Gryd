/**
 * GRYD — i18n : catalogue du domaine PROFIL-SOCIAL (onglet Profil, édition de
 * profil, page Amis, défauts de profileStore). Parité 5 langues imposée par le
 * type Entry — une langue manquante = erreur TypeScript.
 *
 * Invariants jamais traduits : GRYD, GO, Crew (concept), @handles, noms propres,
 * QR, XP, km. Chips/CTA courts dans TOUTES les langues (§A — troncature interdite
 * à 375px). Les {placeholders} sont identiques dans les 5 langues.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Onglet Profil : header / player card ──────────────────────────────────
  /** Titre d'écran = le NOM DE LA PAGE (« Moi »), pas le pseudo : le pseudo vit
   *  DANS la player card, aligné avec l'avatar et le @handle (retour terrain
   *  20/07 : « le bloc du haut, rien n'est aligné »). */
  tabMe: {
    fr: 'Moi',
    en: 'Me',
    es: 'Yo',
    de: 'Ich',
    pt: 'Eu',
  },
  kickerPlayerCard: {
    fr: 'CARTE DE JOUEUR',
    en: 'PLAYER CARD',
    es: 'CARTA DE JUGADOR',
    de: 'SPIELERKARTE',
    pt: 'CARTÃO DE JOGADOR',
  },
  a11yOpenSettings: {
    fr: 'Ouvrir les paramètres',
    en: 'Open settings',
    es: 'Abrir los ajustes',
    de: 'Einstellungen öffnen',
    pt: 'Abrir as configurações',
  },
  /** Sert aussi de titre à l'écran /profil-edit (même libellé exact). */
  editMyProfile: {
    fr: 'Modifier mon profil',
    en: 'Edit my profile',
    es: 'Editar mi perfil',
    de: 'Profil bearbeiten',
    pt: 'Editar meu perfil',
  },
  identityLine: {
    fr: 'Niveau {n} · {city}',
    en: 'Level {n} · {city}',
    es: 'Nivel {n} · {city}',
    de: 'Level {n} · {city}',
    pt: 'Nível {n} · {city}',
  },
  actionEditProfile: {
    fr: 'Modifier profil',
    en: 'Edit profile',
    es: 'Editar perfil',
    de: 'Profil ändern',
    pt: 'Editar perfil',
  },
  actionShare: {
    fr: 'Partager',
    en: 'Share',
    es: 'Compartir',
    de: 'Teilen',
    pt: 'Compartilhar',
  },
  a11yShareCard: {
    fr: 'Partager ma carte de joueur',
    en: 'Share my player card',
    es: 'Compartir mi carta de jugador',
    de: 'Meine Spielerkarte teilen',
    pt: 'Compartilhar meu cartão de jogador',
  },
  toastShareReady: {
    fr: 'Carte de partage prête — capture-la pour la partager',
    en: 'Share card ready — screenshot it to share',
    es: 'Carta lista — haz una captura para compartirla',
    de: 'Share-Karte bereit — Screenshot machen und teilen',
    pt: 'Cartão pronto — faça um print para compartilhar',
  },
  /** Mot « Niveau » seul (stat de ShareCard + ligne de progression). */
  levelWord: {
    fr: 'Niveau',
    en: 'Level',
    es: 'Nivel',
    de: 'Level',
    pt: 'Nível',
  },
  // ─── Player card : bandeau de 3 chiffres (labels COURTS, une seule ligne) ──
  statZonesHeld: {
    fr: 'Zones tenues',
    en: 'Zones held',
    es: 'Zonas tomadas',
    de: 'Zonen gehalten',
    pt: 'Zonas mantidas',
  },
  statRankShort: {
    fr: 'Rang saison',
    en: 'Season rank',
    es: 'Rango temp.',
    de: 'Saisonrang',
    pt: 'Rank temporada',
  },
  statBadgesShort: {
    fr: 'Badges',
    en: 'Badges',
    es: 'Insignias',
    de: 'Abzeichen',
    pt: 'Insígnias',
  },
  statSeasonRank: {
    fr: 'Rang saison · {scope}',
    en: 'Season rank · {scope}',
    es: 'Rango temporada · {scope}',
    de: 'Saisonrang · {scope}',
    pt: 'Rank temporada · {scope}',
  },
  shareSubtitle: {
    fr: '{rank} · niv. {n} · {title}',
    en: '{rank} · lvl {n} · {title}',
    es: '{rank} · nv. {n} · {title}',
    de: '{rank} · Lv. {n} · {title}',
    pt: '{rank} · nv. {n} · {title}',
  },

  // ─── Onglet Profil : territoire ────────────────────────────────────────────
  sectionTerritory: {
    fr: 'MON TERRITOIRE',
    en: 'MY TERRITORY',
    es: 'MI TERRITORIO',
    de: 'MEIN GEBIET',
    pt: 'MEU TERRITÓRIO',
  },
  a11yOpenTerritory: {
    fr: 'Ouvrir le détail de mon territoire',
    en: 'Open my territory details',
    es: 'Abrir el detalle de mi territorio',
    de: 'Details meines Gebiets öffnen',
    pt: 'Abrir os detalhes do meu território',
  },
  soloCrewSub: {
    fr: 'Cours et défends avec eux',
    en: 'Run and defend with them',
    es: 'Corre y defiende con ellos',
    de: 'Lauf und verteidige mit ihnen',
    pt: 'Corra e defenda com eles',
  },

  // ─── Onglet Profil : progression ───────────────────────────────────────────
  sectionProgress: {
    fr: 'PROGRESSION',
    en: 'PROGRESS',
    es: 'PROGRESO',
    de: 'FORTSCHRITT',
    pt: 'PROGRESSO',
  },
  statStreak: {
    fr: 'Série · {n} sem',
    en: 'Streak · {n} wk',
    es: 'Racha · {n} sem',
    de: 'Serie · {n} Wo.',
    pt: 'Sequência · {n} sem',
  },
  statBadgesUnlocked: {
    fr: 'badges débloqués',
    en: 'badges unlocked',
    es: 'insignias desbloqueadas',
    de: 'Abzeichen freigeschaltet',
    pt: 'insígnias desbloqueadas',
  },
  statFormScore: {
    fr: 'Score Forme',
    en: 'Form Score',
    es: 'Score Forma',
    de: 'Form-Score',
    pt: 'Score de Forma',
  },
  statCrewChest: {
    fr: 'du coffre crew',
    en: 'of crew chest',
    es: 'del cofre del crew',
    de: 'der Crew-Truhe',
    pt: 'do baú do crew',
  },

  // ─── Onglet Profil : badges ────────────────────────────────────────────────
  sectionBadges: {
    fr: 'BADGES ÉQUIPÉS',
    en: 'EQUIPPED BADGES',
    es: 'INSIGNIAS EQUIPADAS',
    de: 'AKTIVE ABZEICHEN',
    pt: 'INSÍGNIAS EQUIPADAS',
  },
  a11yBadge: {
    fr: 'Badge {name}',
    en: 'Badge {name}',
    es: 'Insignia {name}',
    de: 'Abzeichen {name}',
    pt: 'Insígnia {name}',
  },
  a11ySeeBadgeCollection: {
    fr: 'Voir la collection de badges',
    en: 'View the badge collection',
    es: 'Ver la colección de insignias',
    de: 'Abzeichensammlung ansehen',
    pt: 'Ver a coleção de insígnias',
  },
  seeCollection: {
    fr: 'Voir la collection ({n}/{total})',
    en: 'See collection ({n}/{total})',
    es: 'Ver la colección ({n}/{total})',
    de: 'Sammlung ansehen ({n}/{total})',
    pt: 'Ver a coleção ({n}/{total})',
  },

  // ─── Onglet Profil : spécialisations ───────────────────────────────────────
  /** Accordéon : une seule Entry pour toutes les sections repliables. */
  a11yToggleSection: {
    fr: 'Afficher ou masquer {section}',
    en: 'Show or hide {section}',
    es: 'Mostrar u ocultar {section}',
    de: '{section} ein- oder ausblenden',
    pt: 'Mostrar ou ocultar {section}',
  },
  sectionSkills: {
    fr: 'SPÉCIALISATIONS',
    en: 'SPECIALIZATIONS',
    es: 'ESPECIALIZACIONES',
    de: 'SPEZIALISIERUNGEN',
    pt: 'ESPECIALIZAÇÕES',
  },
  skillStartAt: {
    fr: 'Commence à {n} {unit}',
    en: 'Starts at {n} {unit}',
    es: 'Empieza a {n} {unit}',
    de: 'Startet bei {n} {unit}',
    pt: 'Começa em {n} {unit}',
  },
  skillMaxed: {
    fr: 'Niveau max atteint',
    en: 'Max level reached',
    es: 'Nivel máximo alcanzado',
    de: 'Max-Level erreicht',
    pt: 'Nível máximo atingido',
  },
  skillRemaining: {
    fr: '{n} {unit} avant {name} {roman}',
    en: '{n} {unit} to {name} {roman}',
    es: '{n} {unit} para {name} {roman}',
    de: '{n} {unit} bis {name} {roman}',
    pt: '{n} {unit} até {name} {roman}',
  },

  // ─── Onglet Profil : raccourcis ────────────────────────────────────────────
  // Retour terrain 20/07 : les raccourcis qui FAISAIENT DOUBLON avec le bouton
  // Paramètres (engrenage, haut-droit) ont été RETIRÉS — Arsenal, Sources
  // connectées, Support et Paramètres lui-même vivent déjà dans /parametres
  // (SETTINGS_GROUPS). Il ne reste que les destinations de JEU, en une ligne
  // chacune (le sous-titre descriptif est supprimé : il doublait la hauteur
  // sans rien apprendre — « Historique de courses » se comprend seul).
  sectionShortcuts: {
    fr: 'RACCOURCIS',
    en: 'SHORTCUTS',
    es: 'ATAJOS',
    de: 'SCHNELLZUGRIFF',
    pt: 'ATALHOS',
  },
  linkSeason: {
    fr: 'Saison',
    en: 'Season',
    es: 'Temporada',
    de: 'Saison',
    pt: 'Temporada',
  },
  linkMissions: {
    fr: 'Missions',
    en: 'Missions',
    es: 'Misiones',
    de: 'Missionen',
    pt: 'Missões',
  },
  linkFriends: {
    fr: 'Mes amis',
    en: 'My friends',
    es: 'Mis amigos',
    de: 'Meine Freunde',
    pt: 'Meus amigos',
  },
  linkPerformance: {
    fr: 'Performance',
    en: 'Performance',
    es: 'Rendimiento',
    de: 'Leistung',
    pt: 'Desempenho',
  },
  linkHistory: {
    fr: 'Historique de courses',
    en: 'Run history',
    es: 'Historial de carreras',
    de: 'Lauf-Historie',
    pt: 'Histórico de corridas',
  },
  linkPrivacy: {
    fr: 'Confidentialité & géoloc',
    en: 'Privacy & location',
    es: 'Privacidad y ubicación',
    de: 'Privatsphäre & Standort',
    pt: 'Privacidade e localização',
  },
  signOut: {
    fr: 'Se déconnecter',
    en: 'Sign out',
    es: 'Cerrar sesión',
    de: 'Abmelden',
    pt: 'Sair',
  },

  // ─── /profil-edit ──────────────────────────────────────────────────────────
  editKicker: {
    fr: 'PLAYER CARD · IDENTITÉ',
    en: 'PLAYER CARD · IDENTITY',
    es: 'PLAYER CARD · IDENTIDAD',
    de: 'PLAYER CARD · IDENTITÄT',
    pt: 'PLAYER CARD · IDENTIDADE',
  },
  previewNameFallback: {
    fr: 'Ton nom',
    en: 'Your name',
    es: 'Tu nombre',
    de: 'Dein Name',
    pt: 'Seu nome',
  },
  sectionIdentity: {
    fr: 'IDENTITÉ',
    en: 'IDENTITY',
    es: 'IDENTIDAD',
    de: 'IDENTITÄT',
    pt: 'IDENTIDADE',
  },
  fieldDisplayName: {
    fr: 'Nom affiché',
    en: 'Display name',
    es: 'Nombre visible',
    de: 'Anzeigename',
    pt: 'Nome exibido',
  },
  nameEmpty: {
    fr: 'Le nom ne peut pas être vide.',
    en: "Name can't be empty.",
    es: 'El nombre no puede estar vacío.',
    de: 'Der Name darf nicht leer sein.',
    pt: 'O nome não pode ficar vazio.',
  },
  handleHint: {
    fr: '3 à 20 caractères : minuscules, chiffres, « _ ».',
    en: '3-20 characters: lowercase, digits, "_".',
    es: 'De 3 a 20 caracteres: minúsculas, números y «_».',
    de: '3-20 Zeichen: Kleinbuchstaben, Ziffern, „_“.',
    pt: 'De 3 a 20 caracteres: minúsculas, números e "_".',
  },
  // ─── @handle : disponibilité vérifiée en direct (RPC check_handle_available,
  //     migration 0047). Le serveur reste juge à la sauvegarde : ces libellés
  //     décrivent un CONSTAT à l'instant T, jamais une réservation. ───────────
  /** État neutre pendant la requête — jamais un verdict prématuré. */
  handleChecking: {
    fr: 'Vérification…',
    en: 'Checking…',
    es: 'Comprobando…',
    de: 'Wird geprüft…',
    pt: 'A verificar…',
  },
  /** Libre À CET INSTANT. Volontairement pas « réservé » : rien n'est réservé. */
  handleFree: {
    fr: 'Disponible',
    en: 'Available',
    es: 'Disponible',
    de: 'Verfügbar',
    pt: 'Disponível',
  },
  handleTaken: {
    fr: 'Déjà pris par un autre coureur.',
    en: 'Already taken by another runner.',
    es: 'Ya lo usa otro corredor.',
    de: 'Schon von einer anderen Läuferin vergeben.',
    pt: 'Já usado por outro corredor.',
  },
  /** Marque, terme officiel ou trompeur (table reserved_handles). */
  handleReserved: {
    fr: 'Ce nom est réservé.',
    en: 'This name is reserved.',
    es: 'Este nombre está reservado.',
    de: 'Dieser Name ist reserviert.',
    pt: 'Este nome está reservado.',
  },
  handleTooShort: {
    fr: '3 caractères minimum.',
    en: '3 characters minimum.',
    es: 'Mínimo 3 caracteres.',
    de: 'Mindestens 3 Zeichen.',
    pt: 'Mínimo de 3 caracteres.',
  },
  handleTooLong: {
    fr: '20 caractères maximum.',
    en: '20 characters maximum.',
    es: 'Máximo 20 caracteres.',
    de: 'Höchstens 20 Zeichen.',
    pt: 'Máximo de 20 caracteres.',
  },
  handleBadChars: {
    fr: 'Minuscules, chiffres et « _ » seulement.',
    en: 'Lowercase, digits and "_" only.',
    es: 'Solo minúsculas, números y «_».',
    de: 'Nur Kleinbuchstaben, Ziffern und „_“.',
    pt: 'Apenas minúsculas, números e "_".',
  },
  /** Hors ligne / sans compte : on ne SAIT pas, donc on le dit. */
  handleUnknown: {
    fr: 'Disponibilité vérifiée à l’enregistrement.',
    en: 'Availability checked when you save.',
    es: 'La disponibilidad se comprueba al guardar.',
    de: 'Verfügbarkeit wird beim Speichern geprüft.',
    pt: 'A disponibilidade é verificada ao guardar.',
  },
  /** a11y du badge vérifié. Il n'apparaît que si le SERVEUR le dit (0047). */
  a11yVerified: {
    fr: 'Compte vérifié',
    en: 'Verified account',
    es: 'Cuenta verificada',
    de: 'Verifiziertes Konto',
    pt: 'Conta verificada',
  },
  sectionTitleCity: {
    fr: 'TITRE & VILLE',
    en: 'TITLE & CITY',
    es: 'TÍTULO Y CIUDAD',
    de: 'TITEL & STADT',
    pt: 'TÍTULO E CIDADE',
  },
  fieldTitle: {
    fr: 'Titre affiché',
    en: 'Displayed title',
    es: 'Título visible',
    de: 'Angezeigter Titel',
    pt: 'Título exibido',
  },
  titlePlaceholder: {
    fr: 'Tenace du 19ᵉ',
    en: 'Tenacious of the 19th',
    es: 'Tenaz del 19',
    de: 'Zäh im 19.',
    pt: 'Tenaz do 19º',
  },
  fieldCity: {
    fr: 'Ville',
    en: 'City',
    es: 'Ciudad',
    de: 'Stadt',
    pt: 'Cidade',
  },
  /** Le champ libre est supprimé : on choisit une ville qui EXISTE (city_zones). */
  cityHint: {
    fr: 'Choisis une ville jouable.',
    en: 'Pick a playable city.',
    es: 'Elige una ciudad jugable.',
    de: 'Wähle eine spielbare Stadt.',
    pt: 'Escolhe uma cidade jogável.',
  },
  /** a11y du sélecteur de ville. */
  a11yPickCity: {
    fr: 'Choisir {city}',
    en: 'Pick {city}',
    es: 'Elegir {city}',
    de: '{city} wählen',
    pt: 'Escolher {city}',
  },
  sectionBio: {
    fr: 'BIO COURTE',
    en: 'SHORT BIO',
    es: 'BIO CORTA',
    de: 'KURZ-BIO',
    pt: 'BIO CURTA',
  },
  bioPlaceholder: {
    fr: 'Une ligne sur ta manière de courir (optionnel).',
    en: 'One line about how you run (optional).',
    es: 'Una línea sobre tu forma de correr (opcional).',
    de: 'Eine Zeile darüber, wie du läufst (optional).',
    pt: 'Uma linha sobre seu jeito de correr (opcional).',
  },
  sectionAvatar: {
    fr: 'AVATAR',
    en: 'AVATAR',
    es: 'AVATAR',
    de: 'AVATAR',
    pt: 'AVATAR',
  },
  // ── Avatar : PHOTO ou INITIALES, deux chemins de première classe ──────────
  /** Onglet « photo » du sélecteur d'avatar. */
  avatarModePhoto: {
    fr: 'Photo',
    en: 'Photo',
    es: 'Foto',
    de: 'Foto',
    pt: 'Foto',
  },
  /** Onglet « avatar généré » — nommé pour ce qu'il EST, pas « aucune photo ». */
  avatarModeInitials: {
    fr: 'Initiales',
    en: 'Initials',
    es: 'Iniciales',
    de: 'Initialen',
    pt: 'Iniciais',
  },
  /** Dit explicitement qu'aucune des deux options n'est le bon choix par défaut. */
  avatarChoiceHint: {
    fr: 'Les deux se valent : montre ton visage, ou reste derrière ton pseudo.',
    en: 'Both work: show your face, or stay behind your handle.',
    es: 'Las dos valen: muestra tu cara o quédate detrás de tu alias.',
    de: 'Beides ist in Ordnung: Zeig dein Gesicht oder bleib hinter deinem Handle.',
    pt: 'As duas valem: mostre seu rosto ou fique atrás do seu apelido.',
  },
  a11yAvatarMode: {
    fr: 'Avatar : {mode}',
    en: 'Avatar: {mode}',
    es: 'Avatar: {mode}',
    de: 'Avatar: {mode}',
    pt: 'Avatar: {mode}',
  },
  photoChoose: {
    fr: 'Choisir une photo',
    en: 'Choose a photo',
    es: 'Elegir una foto',
    de: 'Foto auswählen',
    pt: 'Escolher uma foto',
  },
  photoReplace: {
    fr: 'Changer de photo',
    en: 'Change photo',
    es: 'Cambiar de foto',
    de: 'Foto ändern',
    pt: 'Trocar de foto',
  },
  photoRemove: {
    fr: 'Retirer la photo',
    en: 'Remove photo',
    es: 'Quitar la foto',
    de: 'Foto entfernen',
    pt: 'Remover a foto',
  },
  /** ZÉRO MENSONGE : le stockage distant n'est pas câblé — on ne dit pas « publiée ». */
  photoLocalOnly: {
    fr: 'Ta photo reste sur ton téléphone : elle n’est envoyée à personne pour l’instant.',
    en: 'Your photo stays on your phone: it is not sent to anyone yet.',
    es: 'Tu foto se queda en tu teléfono: por ahora no se envía a nadie.',
    de: 'Dein Foto bleibt auf deinem Telefon: Es wird vorerst an niemanden gesendet.',
    pt: 'Sua foto fica no seu telefone: por enquanto não é enviada a ninguém.',
  },
  photoDenied: {
    fr: 'GRYD n’a pas accès à tes photos. Autorise-le dans les réglages du téléphone, ou garde tes initiales.',
    en: 'GRYD cannot access your photos. Allow it in your phone settings, or keep your initials.',
    es: 'GRYD no tiene acceso a tus fotos. Autorízalo en los ajustes del teléfono o quédate con tus iniciales.',
    de: 'GRYD hat keinen Zugriff auf deine Fotos. Erlaube es in den Telefon-Einstellungen oder behalte deine Initialen.',
    pt: 'O GRYD não tem acesso às suas fotos. Autorize nas configurações do telefone ou fique com suas iniciais.',
  },
  fieldColor: {
    fr: 'Couleur',
    en: 'Color',
    es: 'Color',
    de: 'Farbe',
    pt: 'Cor',
  },
  a11yAvatarColor: {
    fr: 'Avatar {label}',
    en: 'Avatar {label}',
    es: 'Avatar {label}',
    de: 'Avatar {label}',
    pt: 'Avatar {label}',
  },
  fieldInitials: {
    fr: 'Initiales (1-2 lettres, optionnel)',
    en: 'Initials (1-2 letters, optional)',
    es: 'Iniciales (1-2 letras, opcional)',
    de: 'Initialen (1-2 Buchstaben, optional)',
    pt: 'Iniciais (1-2 letras, opcional)',
  },
  sectionFrame: {
    fr: 'FRAME DE LA CARD',
    en: 'CARD FRAME',
    es: 'FRAME DE LA CARD',
    de: 'CARD-FRAME',
    pt: 'FRAME DO CARD',
  },
  a11yEquip: {
    fr: 'Équiper {name}',
    en: 'Equip {name}',
    es: 'Equipar {name}',
    de: '{name} ausrüsten',
    pt: 'Equipar {name}',
  },
  equippedTag: {
    fr: 'Équipé',
    en: 'Equipped',
    es: 'Equipado',
    de: 'Aktiv',
    pt: 'Equipado',
  },
  arsenalLink: {
    fr: 'Débloquer d’autres frames — Arsenal',
    en: 'Unlock more frames — Arsenal',
    es: 'Desbloquear más frames — Arsenal',
    de: 'Mehr Frames freischalten — Arsenal',
    pt: 'Desbloquear mais frames — Arsenal',
  },
  a11yOpenArsenal: {
    fr: 'Ouvrir l’Arsenal pour d’autres cosmétiques',
    en: 'Open the Arsenal for more cosmetics',
    es: 'Abrir el Arsenal para más cosméticos',
    de: 'Arsenal für weitere Cosmetics öffnen',
    pt: 'Abrir o Arsenal para mais cosméticos',
  },
  sectionFeaturedBadges: {
    fr: 'BADGES AFFICHÉS · {n}/{max}',
    en: 'FEATURED BADGES · {n}/{max}',
    es: 'INSIGNIAS DESTACADAS · {n}/{max}',
    de: 'GEZEIGTE ABZEICHEN · {n}/{max}',
    pt: 'INSÍGNIAS EXIBIDAS · {n}/{max}',
  },
  featuredHint: {
    fr: 'Sans choix, la card affiche automatiquement tes 3 badges les plus rares.',
    en: 'If you pick none, the card automatically shows your 3 rarest badges.',
    es: 'Sin elección, la card muestra automáticamente tus 3 insignias más raras.',
    de: 'Ohne Auswahl zeigt die Card automatisch deine 3 seltensten Abzeichen.',
    pt: 'Sem escolha, o card mostra automaticamente suas 3 insígnias mais raras.',
  },
  savedNotice: {
    fr: 'Enregistré — ton profil est à jour.',
    en: 'Saved — your profile is up to date.',
    es: 'Guardado — tu perfil está al día.',
    de: 'Gespeichert — dein Profil ist aktuell.',
    pt: 'Salvo — seu perfil está em dia.',
  },
  saveCta: {
    fr: 'ENREGISTRER',
    en: 'SAVE',
    es: 'GUARDAR',
    de: 'SPEICHERN',
    pt: 'SALVAR',
  },

  // ─── profileStore (défauts + validation @handle + palette avatar) ─────────
  defaultRunnerName: {
    fr: 'Coureur',
    en: 'Runner',
    es: 'Corredor',
    de: 'Läufer',
    pt: 'Corredor',
  },
  handleRequired: {
    fr: 'Le @handle est requis.',
    en: 'The @handle is required.',
    es: 'El @handle es obligatorio.',
    de: 'Der @handle ist erforderlich.',
    pt: 'O @handle é obrigatório.',
  },
  handleInvalid: {
    fr: '3 à 20 caractères : minuscules, chiffres et « _ ».',
    en: '3-20 characters: lowercase, digits and "_".',
    es: 'De 3 a 20 caracteres: minúsculas, números y «_».',
    de: '3-20 Zeichen: Kleinbuchstaben, Ziffern und „_“.',
    pt: 'De 3 a 20 caracteres: minúsculas, números e "_".',
  },
  // Nom de couleur identique partout (nom propre de teinte charte).
  avatarChartreuse: {
    fr: 'Chartreuse',
    en: 'Chartreuse',
    es: 'Chartreuse',
    de: 'Chartreuse',
    pt: 'Chartreuse',
  },
  avatarIvory: {
    fr: 'Ivoire',
    en: 'Ivory',
    es: 'Marfil',
    de: 'Elfenbein',
    pt: 'Marfim',
  },
  avatarCarbon: {
    fr: 'Carbone',
    en: 'Carbon',
    es: 'Carbón',
    de: 'Karbon',
    pt: 'Carbono',
  },
  avatarGrey: {
    fr: 'Gris',
    en: 'Grey',
    es: 'Gris',
    de: 'Grau',
    pt: 'Cinza',
  },
  avatarNight: {
    fr: 'Nuit',
    en: 'Night',
    es: 'Noche',
    de: 'Nacht',
    pt: 'Noite',
  },

  // ─── /amis ─────────────────────────────────────────────────────────────────
  friendsTitle: {
    fr: 'Amis',
    en: 'Friends',
    es: 'Amigos',
    de: 'Freunde',
    pt: 'Amigos',
  },
  friendsKicker: {
    fr: '{friends} AMIS · {requests} DEMANDES',
    en: '{friends} FRIENDS · {requests} REQUESTS',
    es: '{friends} AMIGOS · {requests} SOLICITUDES',
    de: '{friends} FREUNDE · {requests} ANFRAGEN',
    pt: '{friends} AMIGOS · {requests} PEDIDOS',
  },
  tabRequests: {
    fr: 'Demandes',
    en: 'Requests',
    es: 'Solicitudes',
    de: 'Anfragen',
    pt: 'Pedidos',
  },
  tabSuggestions: {
    fr: 'Suggestions',
    en: 'Suggestions',
    es: 'Sugerencias',
    de: 'Vorschläge',
    pt: 'Sugestões',
  },
  tabQr: {
    fr: 'QR',
    en: 'QR',
    es: 'QR',
    de: 'QR',
    pt: 'QR',
  },
  tabSearch: {
    fr: 'Recherche',
    en: 'Search',
    es: 'Buscar',
    de: 'Suche',
    pt: 'Busca',
  },
  emptyFriends: {
    fr: 'Pas encore d’amis. Invite ton crew ou fais scanner ton QR.',
    en: 'No friends yet. Invite your crew or get your QR scanned.',
    es: 'Aún no tienes amigos. Invita a tu crew o haz escanear tu QR.',
    de: 'Noch keine Freunde. Lade deine Crew ein oder lass deinen QR scannen.',
    pt: 'Ainda sem amigos. Convide seu crew ou peça para escanearem seu QR.',
  },
  emptyRequests: {
    fr: 'Aucune demande en attente.',
    en: 'No pending requests.',
    es: 'Ninguna solicitud pendiente.',
    de: 'Keine offenen Anfragen.',
    pt: 'Nenhum pedido pendente.',
  },
  emptySuggestions: {
    fr: 'Aucune suggestion pour l’instant.',
    en: 'No suggestions for now.',
    es: 'Ninguna sugerencia por ahora.',
    de: 'Im Moment keine Vorschläge.',
    pt: 'Nenhuma sugestão por enquanto.',
  },
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
  add: {
    fr: 'Ajouter',
    en: 'Add',
    es: 'Añadir',
    de: 'Hinzufügen',
    pt: 'Adicionar',
  },
  toastRunInvite: {
    fr: 'Sortie proposée à @{handle}',
    en: 'Run invite sent to @{handle}',
    es: 'Salida propuesta a @{handle}',
    de: 'Lauf vorgeschlagen an @{handle}',
    pt: 'Corrida proposta a @{handle}',
  },
  toastCrewInvite: {
    fr: 'Invitation crew envoyée à @{handle}',
    en: 'Crew invite sent to @{handle}',
    es: 'Invitación al crew enviada a @{handle}',
    de: 'Crew-Einladung an @{handle} gesendet',
    pt: 'Convite de crew enviado a @{handle}',
  },
  toastFriendAdded: {
    fr: '@{handle} ajouté',
    en: '@{handle} added',
    es: '@{handle} añadido',
    de: '@{handle} hinzugefügt',
    pt: '@{handle} adicionado',
  },
  toastRequestDeclined: {
    fr: 'Demande refusée',
    en: 'Request declined',
    es: 'Solicitud rechazada',
    de: 'Anfrage abgelehnt',
    pt: 'Pedido recusado',
  },
  toastRequestSent: {
    fr: 'Demande envoyée à @{handle}',
    en: 'Request sent to @{handle}',
    es: 'Solicitud enviada a @{handle}',
    de: 'Anfrage an @{handle} gesendet',
    pt: 'Pedido enviado a @{handle}',
  },
  /**
   * Le QR n'est PAS encore généré (audit doctrine Crew 20/07 : l'écran affichait
   * l'ICÔNE décorative `qr` en 120 px comme s'il s'agissait d'un code scannable —
   * personne n'aurait jamais pu le scanner). Tant qu'aucun générateur n'existe,
   * on annonce la fonction au lieu de simuler un code : l'app ne ment jamais.
   */
  qrHint: {
    fr: 'Ton QR d’ajout arrive bientôt. En attendant, partage ton @ ou cherche un coureur.',
    en: 'Your add-me QR is coming soon. Until then, share your @ or search for a runner.',
    es: 'Tu QR para añadirte llega pronto. Mientras tanto, comparte tu @ o busca a un corredor.',
    de: 'Dein Hinzufügen-QR kommt bald. Bis dahin: teile dein @ oder suche einen Läufer.',
    pt: 'Seu QR para te adicionar chega em breve. Até lá, compartilhe seu @ ou busque um corredor.',
  },
  scanQr: {
    fr: 'Scanner un QR',
    en: 'Scan a QR',
    es: 'Escanear un QR',
    de: 'QR scannen',
    pt: 'Escanear um QR',
  },
  toastScannerSoon: {
    fr: 'Scanner — écran à venir (O1)',
    en: 'Scanner — screen coming soon (O1)',
    es: 'Escáner — pantalla próximamente (O1)',
    de: 'Scanner — Screen folgt (O1)',
    pt: 'Scanner — tela em breve (O1)',
  },
  // Indication technique de format — identique dans les 5 langues.
  searchPlaceholder: {
    fr: 'handle (3-20, a-z 0-9 _)',
    en: 'handle (3-20, a-z 0-9 _)',
    es: 'handle (3-20, a-z 0-9 _)',
    de: 'handle (3-20, a-z 0-9 _)',
    pt: 'handle (3-20, a-z 0-9 _)',
  },
  searchInvalid: {
    fr: 'Handle invalide : minuscules, chiffres et _ uniquement (3 à 20).',
    en: 'Invalid handle: lowercase, digits and _ only (3-20).',
    es: 'Handle no válido: solo minúsculas, números y _ (3 a 20).',
    de: 'Ungültiger Handle: nur Kleinbuchstaben, Ziffern und _ (3-20).',
    pt: 'Handle inválido: só minúsculas, números e _ (3 a 20).',
  },
  searchNoRunner: {
    fr: 'Aucun coureur trouvé avec ce handle.',
    en: 'No runner found with this handle.',
    es: 'Ningún corredor con ese handle.',
    de: 'Kein Läufer mit diesem Handle gefunden.',
    pt: 'Nenhum corredor com esse handle.',
  },
  sendRequest: {
    fr: 'Envoyer une demande',
    en: 'Send a request',
    es: 'Enviar solicitud',
    de: 'Anfrage senden',
    pt: 'Enviar pedido',
  },
  menuViewProfile: {
    fr: 'Voir le profil',
    en: 'View profile',
    es: 'Ver el perfil',
    de: 'Profil ansehen',
    pt: 'Ver o perfil',
  },
  toastProfileSoon: {
    fr: 'Profil de @{handle} — écran à venir (O1)',
    en: 'Profile of @{handle} — screen coming soon (O1)',
    es: 'Perfil de @{handle} — pantalla próximamente (O1)',
    de: 'Profil von @{handle} — Screen folgt (O1)',
    pt: 'Perfil de @{handle} — tela em breve (O1)',
  },
  menuRemoveFriend: {
    fr: 'Retirer de mes amis',
    en: 'Remove from my friends',
    es: 'Quitar de mis amigos',
    de: 'Aus meinen Freunden entfernen',
    pt: 'Remover dos meus amigos',
  },
  toastFriendRemoved: {
    fr: '@{handle} retiré de tes amis',
    en: '@{handle} removed from your friends',
    es: '@{handle} eliminado de tus amigos',
    de: '@{handle} aus deinen Freunden entfernt',
    pt: '@{handle} removido dos seus amigos',
  },
  menuBlock: {
    fr: 'Bloquer @{handle}',
    en: 'Block @{handle}',
    es: 'Bloquear a @{handle}',
    de: '@{handle} blockieren',
    pt: 'Bloquear @{handle}',
  },
  toastBlocked: {
    fr: '@{handle} bloqué',
    en: '@{handle} blocked',
    es: '@{handle} bloqueado',
    de: '@{handle} blockiert',
    pt: '@{handle} bloqueado',
  },
  a11yCloseMenu: {
    fr: 'Fermer le menu',
    en: 'Close menu',
    es: 'Cerrar el menú',
    de: 'Menü schließen',
    pt: 'Fechar o menu',
  },
  cancel: {
    fr: 'Annuler',
    en: 'Cancel',
    es: 'Cancelar',
    de: 'Abbrechen',
    pt: 'Cancelar',
  },
  friendsFootnote: {
    fr: 'Aucune position live n’est partagée. Ton profil suit tes réglages de visibilité.',
    en: 'No live location is shared. Your profile follows your visibility settings.',
    es: 'No se comparte ninguna posición en vivo. Tu perfil sigue tus ajustes de visibilidad.',
    de: 'Es wird keine Live-Position geteilt. Dein Profil folgt deinen Sichtbarkeits-Einstellungen.',
    pt: 'Nenhuma posição ao vivo é compartilhada. Seu perfil segue seus ajustes de visibilidade.',
  },

  // ═══ ÉTATS VIDES DU PROFIL (21/07/2026) ════════════════════════════════════
  //
  // La démo ayant quitté l'app installée, des surfaces se vident. Un trou n'est
  // pas plus honnête qu'un mensonge : chaque état ci-dessous DIT ce qui manque
  // et propose UNE suite. Trois situations, trois copies distinctes — les
  // confondre serait mentir à nouveau :
  //   · pas connecté      → l'invitation à se connecter ;
  //   · connecté, vide    → l'invitation à jouer (la donnée viendra du jeu) ;
  //   · échec de lecture  → l'aveu de la panne + un réessai (JAMAIS un « 0 »,
  //     qui se lirait « tu n'as rien fait » alors que ses données existent).

  /** Player card sans ville renseignée — « Niveau 3 · » serait un trou visible. */
  identityLevelOnly: {
    fr: 'Niveau {n}',
    en: 'Level {n}',
    es: 'Nivel {n}',
    de: 'Level {n}',
    pt: 'Nível {n}',
  },
  signedOutTitle: {
    fr: 'Connecte-toi pour voir tes chiffres.',
    en: 'Sign in to see your numbers.',
    es: 'Inicia sesión para ver tus cifras.',
    de: 'Melde dich an, um deine Zahlen zu sehen.',
    pt: 'Entre para ver seus números.',
  },
  signedOutBody: {
    fr: 'Territoire, progression et badges sont rattachés à ton compte.',
    en: 'Territory, progress and badges are tied to your account.',
    es: 'Territorio, progreso e insignias están vinculados a tu cuenta.',
    de: 'Territorium, Fortschritt und Abzeichen hängen an deinem Konto.',
    pt: 'Território, progresso e insígnias ficam na sua conta.',
  },
  signIn: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  /**
   * Quatrième situation, découverte en câblant les trois autres : le build n'a
   * PAS de backend (Supabase non configuré — aperçu web, build de dev). Proposer
   * « Se connecter » y serait un cul-de-sac : l'écran d'auth redirige aussitôt
   * vers la carte, sans rien connecter. On explique donc en une phrase, et on
   * n'offre AUCUNE action — il n'y en a aucune à offrir.
   */
  noBackendTitle: {
    fr: 'Cette version n’est pas reliée au serveur.',
    en: 'This build isn’t connected to the server.',
    es: 'Esta versión no está conectada al servidor.',
    de: 'Diese Version ist nicht mit dem Server verbunden.',
    pt: 'Esta versão não está conectada ao servidor.',
  },
  noBackendBody: {
    fr: 'Ni territoire, ni progression, ni badges tant qu’aucun compte n’est relié. Rien à régler de ton côté.',
    en: 'No territory, progress or badges until an account is linked. Nothing to fix on your side.',
    es: 'Sin territorio, progreso ni insignias hasta que se vincule una cuenta. No hay nada que arreglar por tu parte.',
    de: 'Kein Territorium, kein Fortschritt, keine Abzeichen, solange kein Konto verbunden ist. Du musst nichts tun.',
    pt: 'Sem território, progresso ou insígnias enquanto nenhuma conta estiver vinculada. Nada a resolver do seu lado.',
  },
  loadFailedTitle: {
    fr: 'On n’a pas pu charger tes données.',
    en: 'We couldn’t load your data.',
    es: 'No pudimos cargar tus datos.',
    de: 'Wir konnten deine Daten nicht laden.',
    pt: 'Não conseguimos carregar seus dados.',
  },
  loadFailedBody: {
    fr: 'Rien n’est perdu. Vérifie ta connexion, puis réessaie.',
    en: 'Nothing is lost. Check your connection, then try again.',
    es: 'No se pierde nada. Revisa tu conexión y vuelve a intentarlo.',
    de: 'Nichts ist verloren. Prüfe deine Verbindung und versuch es erneut.',
    pt: 'Nada se perdeu. Verifique sua conexão e tente de novo.',
  },
  retry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  territoryEmptyTitle: {
    fr: 'Aucune zone à toi pour l’instant.',
    en: 'No zone of yours yet.',
    es: 'Aún no tienes ninguna zona.',
    de: 'Noch keine eigene Zone.',
    pt: 'Nenhuma zona sua por enquanto.',
  },
  territoryEmptyBody: {
    fr: 'Une course suffit : le terrain que tu boucles devient le tien.',
    en: 'One run is enough: the ground you loop becomes yours.',
    es: 'Basta una carrera: el terreno que cierras pasa a ser tuyo.',
    de: 'Ein Lauf genügt: Was du umrundest, gehört dir.',
    pt: 'Uma corrida basta: o terreno que você fecha vira seu.',
  },
  territoryEmptyCta: {
    fr: 'Prendre ma première zone',
    en: 'Take my first zone',
    es: 'Tomar mi primera zona',
    de: 'Erste Zone holen',
    pt: 'Pegar minha primeira zona',
  },
  /**
   * Le premier rendu d'un joueur connecté a lieu AVANT que Supabase ait répondu :
   * l'économie vaut alors zéro. Afficher « Niveau 1 · 0 badges » puis basculer
   * sur « Niveau 14 · 12 badges » ferait clignoter un mensonge d'une demi-seconde.
   * On dit qu'on charge, et on n'écrit aucun chiffre tant qu'on n'en a pas.
   */
  loadingNumbers: {
    fr: 'Chargement de tes chiffres…',
    en: 'Loading your numbers…',
    es: 'Cargando tus cifras…',
    de: 'Deine Zahlen werden geladen …',
    pt: 'Carregando seus números…',
  },
  territoryLoading: {
    fr: 'Chargement de ton territoire…',
    en: 'Loading your territory…',
    es: 'Cargando tu territorio…',
    de: 'Dein Territorium wird geladen …',
    pt: 'Carregando seu território…',
  },
  badgesEmptyLine: {
    fr: 'Aucun badge débloqué. Ta première course en ouvre un.',
    en: 'No badge unlocked yet. Your first run opens one.',
    es: 'Ninguna insignia desbloqueada. Tu primera carrera abre una.',
    de: 'Noch kein Abzeichen. Dein erster Lauf schaltet eines frei.',
    pt: 'Nenhuma insígnia desbloqueada. Sua primeira corrida abre uma.',
  },
  badgesFailedLine: {
    fr: 'Tes badges n’ont pas pu être chargés.',
    en: 'Your badges couldn’t be loaded.',
    es: 'No se pudieron cargar tus insignias.',
    de: 'Deine Abzeichen konnten nicht geladen werden.',
    pt: 'Não foi possível carregar suas insígnias.',
  },

  // ─── Page Amis : états vides (aucun annuaire d'amis n'est encore câblé) ────
  friendsKickerHandle: {
    fr: '@{handle}',
    en: '@{handle}',
    es: '@{handle}',
    de: '@{handle}',
    pt: '@{handle}',
  },
  tabMyHandle: {
    fr: 'Mon @',
    en: 'My @',
    es: 'Mi @',
    de: 'Mein @',
    pt: 'Meu @',
  },
  friendsSignedOutTitle: {
    fr: 'Connecte-toi pour retrouver tes amis.',
    en: 'Sign in to find your friends.',
    es: 'Inicia sesión para encontrar a tus amigos.',
    de: 'Melde dich an, um deine Freunde zu finden.',
    pt: 'Entre para encontrar seus amigos.',
  },
  friendsSignedOutBody: {
    fr: 'Ta liste suit ton compte, pas ce téléphone.',
    en: 'Your list follows your account, not this phone.',
    es: 'Tu lista sigue a tu cuenta, no a este teléfono.',
    de: 'Deine Liste hängt an deinem Konto, nicht an diesem Handy.',
    pt: 'Sua lista segue sua conta, não este telefone.',
  },
  /** Vérité de l'état actuel : aucun annuaire ni demande d'ami n'existe côté serveur. */
  friendsNotOpenTitle: {
    fr: 'L’ajout d’amis n’est pas encore ouvert.',
    en: 'Adding friends isn’t open yet.',
    es: 'Añadir amigos aún no está disponible.',
    de: 'Freunde hinzufügen ist noch nicht möglich.',
    pt: 'Adicionar amigos ainda não está aberto.',
  },
  friendsNotOpenBody: {
    fr: 'En attendant, ton @ est ton identité GRYD : c’est avec ça qu’on te retrouvera.',
    en: 'Meanwhile, your @ is your GRYD identity — that’s how people will find you.',
    es: 'Mientras tanto, tu @ es tu identidad GRYD: así te encontrarán.',
    de: 'Bis dahin ist dein @ deine GRYD-Identität – so findet man dich.',
    pt: 'Até lá, seu @ é sua identidade GRYD: é assim que vão te encontrar.',
  },
  /**
   * `qrHint` renvoie vers l'onglet Recherche — qui n'existe que sur la vitrine.
   * Sur l'app, cette phrase pointerait vers un onglet absent : elle est
   * remplacée par ce qui est vrai ici et maintenant.
   */
  qrHintReal: {
    fr: 'Ton @ est ton identité GRYD. Le QR à scanner et la recherche de coureurs arriveront ensemble.',
    en: 'Your @ is your GRYD identity. The scannable QR and runner search will arrive together.',
    es: 'Tu @ es tu identidad GRYD. El QR escaneable y la búsqueda de corredores llegarán juntos.',
    de: 'Dein @ ist deine GRYD-Identität. Der scanbare QR und die Läufersuche kommen zusammen.',
    pt: 'Seu @ é sua identidade GRYD. O QR para escanear e a busca de corredores chegarão juntos.',
  },
  friendsCtaMyHandle: {
    fr: 'Voir mon @',
    en: 'See my @',
    es: 'Ver mi @',
    de: 'Mein @ ansehen',
    pt: 'Ver meu @',
  },
});
