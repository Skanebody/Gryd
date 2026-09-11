/**
 * GRYD — i18n : catalogue de l'écran E08 « Création du profil minimal »
 * (`/setup/profile`).
 *
 * Spec produit UI/UX complète, l.758 : aperçu compact du profil en haut, trois
 * champs visibles (nom d'affichage, handle, ville de jeu), CTA sticky au-dessus
 * du clavier ; handle vérifié en temps réel avec debounce, suggestions en cas
 * d'indisponibilité, ville issue de la localisation mais modifiable ; photo,
 * bio et crew NON obligatoires ; « pas de demande de genre, âge exact ou poids ».
 *
 * ─── REGISTRE ───────────────────────────────────────────────────────────────
 * Tutoiement fr, « tú » es, « du » de, « você » pt-BR (jamais teu/tua/tens).
 *
 * ─── AUCUN NOMBRE ÉCRIT EN TOUTES LETTRES ───────────────────────────────────
 * `handleTooShort` / `handleTooLong` portent un `{n}` : l'écran y injecte
 * `HANDLE_MIN_LENGTH` / `HANDLE_MAX_LENGTH` (game-rules.ts). Le texte ne peut
 * donc pas annoncer une longueur que le serveur ne tiendrait pas — la panne
 * exacte qui guette `catalog/profil.ts`, où « 3 caractères minimum » est écrit
 * en dur. C'est délibéré et c'est le patron à suivre pour la suite.
 *
 * ─── POURQUOI CE CATALOGUE EXISTE À CÔTÉ DE `catalog/profil.ts` ─────────────
 * `profil.ts` sert l'écran d'ÉDITION (`/profil`) : il parle à quelqu'un qui a
 * déjà un compte, des zones et un crew. E08 parle à quelqu'un qui n'a encore
 * RIEN, pendant les vingt secondes qui décident s'il reste. Les deux disent des
 * choses différentes du même champ (« Ce nom est réservé. » ≠ « Celui-là est
 * réservé, prends-en un autre — tu n’as encore rien à perdre »). Les fusionner
 * obligerait un texte à décrire deux situations : il serait faux dans une.
 * Ce qui n'est PAS dupliqué, en revanche, ce sont les MOTIFS de refus eux-mêmes :
 * ils viennent de la RPC `check_handle_available` (migration 0047), pas d'ici.
 *
 * ─── HONNÊTETÉ (constitution §1) ────────────────────────────────────────────
 * Le verdict de disponibilité est un CONFORT, jamais une réservation : seul le
 * `unique` de 0011 tranche à l'enregistrement. `handleUnknown` couvre le cas où
 * l'app ne SAIT pas (hors ligne) — elle se tait alors, elle n'invente pas un
 * « disponible » optimiste. Idem pour la ville : `cityLocating` n'affirme rien,
 * `cityUnknown` avoue.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Entête ────────────────────────────────────────────────────────────────
  kicker: {
    fr: 'TON PROFIL',
    en: 'YOUR PROFILE',
    es: 'TU PERFIL',
    de: 'DEIN PROFIL',
    pt: 'SEU PERFIL',
  },
  title: {
    fr: 'Qui es-tu sur la carte ?',
    en: 'Who are you on the map?',
    es: '¿Quién eres en el mapa?',
    de: 'Wer bist du auf der Karte?',
    pt: 'Quem é você no mapa?',
  },
  /**
   * Ce que l'écran demande ET ce qu'il ne demandera pas. La spec l'impose en
   * règle (« pas de genre, âge exact ou poids ») ; le dire ici transforme une
   * absence en engagement lisible, au moment précis où l'on demande des données.
   */
  /**
   * ⚠️ « TROIS CHOSES » A ÉTÉ RETIRÉ LE 12/09/2026, ET C'EST UNE CORRECTION DE
   * VÉRITÉ, PAS DE STYLE. L'écran en montre QUATRE depuis que la photo y vit
   * (photo, nom, pseudo, ville) : le compte était devenu faux, et un chiffre
   * faux dans la première phrase d'un écran qui demande des données coûte plus
   * cher qu'il ne rapporte. La phrase garde ce qu'elle avait de précieux — dire
   * ce qu'on NE demandera PAS — sans annoncer un dénombrement que le JSX
   * contredit. Aucun compte n'est réintroduit : il redeviendrait faux au
   * prochain champ.
   */
  subtitle: {
    fr: 'Un pseudo, et ce que tu veux bien ajouter. Ni âge, ni genre, ni poids : GRYD n’en a pas besoin.',
    en: 'A handle, plus whatever you feel like adding. No age, gender or weight: GRYD doesn’t need them.',
    es: 'Un alias, y lo que quieras añadir. Ni edad, ni género, ni peso: GRYD no los necesita.',
    de: 'Ein Kürzel, und was du sonst magst. Kein Alter, kein Geschlecht, kein Gewicht: GRYD braucht das nicht.',
    pt: 'Um apelido, e o que você quiser acrescentar. Nem idade, nem gênero, nem peso: o GRYD não precisa disso.',
  },
  /** L'aperçu compact du haut — nom accessible du bloc, pas un titre affiché. */
  previewA11y: {
    fr: 'Aperçu de ton profil',
    en: 'Preview of your profile',
    es: 'Vista previa de tu perfil',
    de: 'Vorschau deines Profils',
    pt: 'Prévia do seu perfil',
  },
  /** Ce que l'aperçu montre tant qu'aucun nom n'est saisi — jamais un faux nom. */
  previewPlaceholderName: {
    fr: 'Ton nom',
    en: 'Your name',
    es: 'Tu nombre',
    de: 'Dein Name',
    pt: 'Seu nome',
  },

  // ─── Champ 1 · nom d'affichage ─────────────────────────────────────────────
  nameLabel: {
    fr: 'Nom d’affichage',
    en: 'Display name',
    es: 'Nombre visible',
    de: 'Anzeigename',
    pt: 'Nome de exibição',
  },
  namePlaceholder: {
    fr: 'Comme tes potes t’appellent',
    en: 'What your friends call you',
    es: 'Como te llaman tus amigos',
    de: 'Wie dich deine Leute nennen',
    pt: 'Como seus amigos chamam você',
  },
  nameHint: {
    fr: 'Visible par ton crew et sur les classements. Modifiable à tout moment.',
    en: 'Visible to your crew and on leaderboards. Changeable at any time.',
    es: 'Visible para tu crew y en las clasificaciones. Se puede cambiar cuando quieras.',
    de: 'Sichtbar für deine Crew und in den Ranglisten. Jederzeit änderbar.',
    pt: 'Visível para seu crew e nas classificações. Dá para mudar quando quiser.',
  },
  nameRequired: {
    fr: 'Il faut un nom pour apparaître sur la carte.',
    en: 'A name is needed to appear on the map.',
    es: 'Hace falta un nombre para aparecer en el mapa.',
    de: 'Ohne Namen tauchst du auf der Karte nicht auf.',
    pt: 'É preciso um nome para aparecer no mapa.',
  },

  // ─── Champ 2 · @handle ─────────────────────────────────────────────────────
  handleLabel: {
    fr: 'Handle',
    en: 'Handle',
    es: 'Handle',
    de: 'Handle',
    pt: 'Handle',
  },
  /** Le « @ » est un préfixe affiché hors champ : on ne le tape pas. */
  handlePlaceholder: {
    fr: 'ton_handle',
    en: 'your_handle',
    es: 'tu_handle',
    de: 'dein_handle',
    pt: 'seu_handle',
  },
  handleHint: {
    fr: 'Ton adresse unique dans GRYD. C’est par là qu’on t’invite et qu’on te défie.',
    en: 'Your unique address inside GRYD. It’s how people invite you and challenge you.',
    es: 'Tu dirección única dentro de GRYD. Por ahí te invitan y te desafían.',
    de: 'Deine eindeutige Adresse in GRYD. Darüber wirst du eingeladen und herausgefordert.',
    pt: 'Seu endereço único dentro do GRYD. É por ele que convidam e desafiam você.',
  },
  // ── @handle : les verdicts (RPC check_handle_available, migration 0047) ────
  /** Requête en vol. ÉTAT NEUTRE : aucun verdict n'est affiché pendant ce temps. */
  handleChecking: {
    fr: 'Vérification…',
    en: 'Checking…',
    es: 'Comprobando…',
    de: 'Wird geprüft…',
    pt: 'Verificando…',
  },
  /**
   * Le serveur dit « libre » À CET INSTANT. Le texte ne promet pas la
   * réservation : deux joueurs peuvent valider le même handle à la même seconde,
   * et c'est l'écriture qui tranchera.
   */
  handleFree: {
    fr: 'Libre',
    en: 'Available',
    es: 'Libre',
    de: 'Frei',
    pt: 'Livre',
  },
  handleTaken: {
    fr: 'Déjà pris. Choisis-en un autre, tu n’as encore rien à y perdre.',
    en: 'Already taken. Pick another one — you’ve got nothing invested yet.',
    es: 'Ya está ocupado. Elige otro: todavía no tienes nada que perder.',
    de: 'Schon vergeben. Nimm einen anderen — du verlierst noch nichts dabei.',
    pt: 'Já está em uso. Escolha outro — você ainda não tem nada a perder.',
  },
  handleReserved: {
    fr: 'Ce handle est réservé.',
    en: 'This handle is reserved.',
    es: 'Este handle está reservado.',
    de: 'Dieses Handle ist reserviert.',
    pt: 'Este handle está reservado.',
  },
  /** {n} = HANDLE_MIN_LENGTH — injecté par l'écran, jamais écrit en dur ici. */
  handleTooShort: {
    fr: '{n} caractères minimum.',
    en: '{n} characters minimum.',
    es: 'Mínimo {n} caracteres.',
    de: 'Mindestens {n} Zeichen.',
    pt: 'Mínimo de {n} caracteres.',
  },
  /** {n} = HANDLE_MAX_LENGTH — même règle. */
  handleTooLong: {
    fr: '{n} caractères maximum.',
    en: '{n} characters maximum.',
    es: 'Máximo {n} caracteres.',
    de: 'Höchstens {n} Zeichen.',
    pt: 'Máximo de {n} caracteres.',
  },
  handleBadChars: {
    fr: 'Minuscules, chiffres et « _ » seulement.',
    en: 'Lowercase, digits and “_” only.',
    es: 'Solo minúsculas, números y «_».',
    de: 'Nur Kleinbuchstaben, Ziffern und „_“.',
    pt: 'Apenas minúsculas, números e “_”.',
  },
  /**
   * Hors ligne / sans backend : on ne SAIT pas. On le dit, plutôt que d'afficher
   * un verdict inventé dans un sens ou dans l'autre.
   */
  handleUnknown: {
    fr: 'Disponibilité vérifiée à l’enregistrement.',
    en: 'Availability checked when you save.',
    es: 'La disponibilidad se comprueba al guardar.',
    de: 'Verfügbarkeit wird beim Speichern geprüft.',
    pt: 'A disponibilidade é verificada ao salvar.',
  },
  /**
   * AUCUN BACKEND SUR CETTE INSTALLATION (point ouvert O1 : `EXPO_PUBLIC_SUPABASE_*`
   * absents — l'aperçu local du fondateur). `handleUnknown` promettrait alors une
   * vérification « à l'enregistrement » qui n'aura JAMAIS lieu : il n'y a pas de
   * serveur pour la faire. Distinguer les deux n'est pas un détail — AMENDEMENT-47
   * dit que localhost EST le vrai produit, donc il n'a pas plus le droit de mentir
   * que l'app installée. Le profil reste utilisable, il n'est simplement réservé
   * nulle part, et l'écran le dit au lieu de le laisser croire.
   */
  handleNoBackend: {
    fr: 'Pas de serveur ici : ce handle n’est réservé nulle part.',
    en: 'No server here: this handle is reserved nowhere.',
    es: 'Aquí no hay servidor: este handle no queda reservado en ningún sitio.',
    de: 'Kein Server hier: Dieses Handle ist nirgends reserviert.',
    pt: 'Sem servidor aqui: este handle não fica reservado em lugar nenhum.',
  },
  handleRequired: {
    fr: 'Il faut un handle : c’est ton adresse unique.',
    en: 'A handle is needed: it’s your unique address.',
    es: 'Hace falta un handle: es tu dirección única.',
    de: 'Ein Handle ist nötig: Es ist deine eindeutige Adresse.',
    pt: 'É preciso um handle: é o seu endereço único.',
  },

  // ── @handle : suggestions (HANDLE_SUGGESTION_COUNT) ───────────────────────
  /**
   * Titre de la rangée de repêchage. Court : ce sont des pills sous un champ,
   * pas une section (§A — 1 écran = 1 décision, ceci est un dépannage).
   */
  suggestionsTitle: {
    fr: 'Libres tout de suite',
    en: 'Free right now',
    es: 'Libres ahora mismo',
    de: 'Jetzt gerade frei',
    pt: 'Livres agora',
  },
  /**
   * Les candidats sont EN COURS de soumission au serveur. Chaque suggestion est
   * un aller-retour `check_handle_available` : tant qu'il n'a pas répondu, aucune
   * pill n'est peinte — une pill affichée AVANT sa réponse afficherait « libre »
   * sans que rien ne l'ait vérifié. Cet état dit l'attente au lieu de la meubler.
   */
  suggestionsSearching: {
    fr: 'Recherche de handles libres…',
    en: 'Looking for free handles…',
    es: 'Buscando handles libres…',
    de: 'Freie Handles werden gesucht…',
    pt: 'Procurando handles livres…',
  },
  /** a11y d'une pill. {handle} = la suggestion (sans le @, ajouté à l'affichage). */
  suggestionA11y: {
    fr: 'Prendre le handle {handle}',
    en: 'Take the handle {handle}',
    es: 'Coger el handle {handle}',
    de: 'Handle {handle} nehmen',
    pt: 'Pegar o handle {handle}',
  },
  /**
   * Le serveur n'a rien proposé (ou la lecture a échoué). On ne fabrique pas de
   * suggestions côté client : elles paraîtraient « libres » sans que rien ne
   * l'ait vérifié.
   */
  suggestionsUnavailable: {
    fr: 'Pas de suggestion pour l’instant. Essaie une variante.',
    en: 'No suggestion right now — try a variant.',
    es: 'Ninguna sugerencia por ahora: prueba una variante.',
    de: 'Gerade kein Vorschlag — probier eine Variante.',
    pt: 'Nenhuma sugestão por enquanto — tente uma variação.',
  },

  // ─── Champ 3 · ville de jeu ────────────────────────────────────────────────
  //
  // ⚠️ NI LABEL NI BOUTON « CHANGER » ICI, ET C'EST VOLONTAIRE. Le champ est le
  // sélecteur PARTAGÉ `features/city/CityPicker` (les communes réelles) : il
  // porte DÉJÀ son propre label (`catalog/city.ts` → `fieldLabel`) et sa propre
  // affordance d'ouverture (`choosePrompt` / `changeCity`). En poser une seconde
  // série ici afficherait deux libellés pour un seul champ — §A. Ce catalogue ne
  // fournit donc que ce que le sélecteur ne sait pas : d'OÙ vient la valeur
  // proposée, et quoi faire quand on n'a pas su la deviner.
  cityHint: {
    fr: 'Là où tu cours le plus souvent. Tu peux en changer plus tard.',
    en: 'Where you run most often. You can change it later.',
    es: 'Donde corres más a menudo. Puedes cambiarla más tarde.',
    de: 'Wo du am häufigsten läufst. Du kannst sie später ändern.',
    pt: 'Onde você corre com mais frequência. Dá para mudar depois.',
  },
  /** Lecture de la position EN COURS : on n'affirme aucune ville tant qu'on lit. */
  cityLocating: {
    fr: 'Recherche de ta ville…',
    en: 'Finding your city…',
    es: 'Buscando tu ciudad…',
    de: 'Deine Stadt wird gesucht…',
    pt: 'Procurando sua cidade…',
  },
  /** La ville affichée VIENT de la position — dit, pour que le joueur corrige. */
  cityFromLocation: {
    fr: 'Déduite de ta position. Corrige-la si ce n’est pas la bonne.',
    en: 'Based on your location. Fix it if it’s not the right one.',
    es: 'Deducida de tu posición. Corrígela si no es la correcta.',
    de: 'Aus deinem Standort abgeleitet. Korrigier sie, falls sie nicht stimmt.',
    pt: 'Deduzida da sua posição. Corrija se não for a certa.',
  },
  /**
   * Localisation refusée, indisponible, ou aucune commune reconnue : le champ
   * reste VIDE et le dit. Il ne se remplit jamais d'une ville par défaut — une
   * ville inventée déciderait d'un terrain de jeu à la place du joueur.
   */
  cityUnknown: {
    fr: 'On n’a pas pu deviner ta ville. Choisis-la.',
    en: 'We couldn’t guess your city. Pick it.',
    es: 'No hemos podido adivinar tu ciudad. Elígela.',
    de: 'Wir konnten deine Stadt nicht erraten. Wähl sie aus.',
    pt: 'Não deu para adivinhar sua cidade. Escolha ela.',
  },
  /**
   * ⚠️ CE N'EST PLUS UN REFUS (12/09/2026), C'EST UNE INVITATION. La ville a
   * cessé d'être un blocage (`profileDraftBlock`) : elle CADRE la carte, et une
   * position mesurée la supplante toujours. La phrase ne peut donc plus dire
   * « choisis une ville » comme une condition. Clé conservée : elle est lue
   * ailleurs, et la renommer n'aurait rien prouvé de plus.
   */
  cityRequired: {
    fr: 'Sans ville, la carte s’ouvrira là où tu es. Tu pourras la choisir plus tard.',
    en: 'Without a city, the map opens where you are. You can pick one later.',
    es: 'Sin ciudad, el mapa se abre donde estés. Puedes elegirla más tarde.',
    de: 'Ohne Stadt öffnet die Karte dort, wo du bist. Du kannst sie später wählen.',
    pt: 'Sem cidade, o mapa abre onde você está. Dá para escolher depois.',
  },

  // ─── PHOTO DE PROFIL — facultative, et facultative pour de bon ─────────────
  /**
   * L'avatar généré (initiales + couleur de la charte) est un chemin de
   * PREMIÈRE CLASSE, pas un pis-aller : c'est l'identité visuelle GRYD. Rien
   * ici ne pousse vers la photo, et le libellé ne dit jamais « complète ton
   * profil » — un profil sans photo n'est pas incomplet.
   */
  photoAdd: {
    fr: 'Ajouter une photo',
    en: 'Add a photo',
    es: 'Añadir una foto',
    de: 'Foto hinzufügen',
    pt: 'Adicionar uma foto',
  },
  photoChange: {
    fr: 'Changer la photo',
    en: 'Change photo',
    es: 'Cambiar la foto',
    de: 'Foto ändern',
    pt: 'Trocar a foto',
  },
  photoRemove: {
    fr: 'Retirer la photo',
    en: 'Remove photo',
    es: 'Quitar la foto',
    de: 'Foto entfernen',
    pt: 'Remover a foto',
  },
  photoOptional: {
    fr: 'Facultatif. Sans photo, tes initiales font l’avatar.',
    en: 'Optional. Without a photo, your initials are the avatar.',
    es: 'Opcional. Sin foto, tus iniciales son el avatar.',
    de: 'Optional. Ohne Foto sind deine Initialen der Avatar.',
    pt: 'Opcional. Sem foto, suas iniciais viram o avatar.',
  },
  /** Permission refusée : on dit ce qui bloque, on ne réessaie pas en boucle. */
  photoDenied: {
    fr: 'Accès aux photos refusé. Tes initiales font l’avatar, et tu peux changer d’avis dans les réglages du téléphone.',
    en: 'Photo access denied. Your initials are the avatar, and you can change your mind in the phone settings.',
    es: 'Acceso a las fotos denegado. Tus iniciales son el avatar y puedes cambiar de idea en los ajustes del teléfono.',
    de: 'Fotozugriff abgelehnt. Deine Initialen sind der Avatar, und du kannst es in den Telefoneinstellungen ändern.',
    pt: 'Acesso às fotos negado. Suas iniciais viram o avatar, e dá para mudar de ideia nos ajustes do telefone.',
  },
  /** Le module natif n'est pas dans CE binaire : on ne peint pas un bouton mort. */
  photoUnavailable: {
    fr: 'Choisir une photo n’est pas possible sur cette version de l’app.',
    en: 'Picking a photo isn’t possible on this version of the app.',
    es: 'Elegir una foto no es posible en esta versión de la app.',
    de: 'Ein Foto zu wählen geht in dieser App-Version nicht.',
    pt: 'Escolher uma foto não é possível nesta versão do app.',
  },
  /** Photo trop lourde ou d'un format refusé : renvoyer la même ne marchera pas. */
  photoRefused: {
    fr: 'Cette image ne passe pas. Essaie une autre photo, plus légère.',
    en: 'That image won’t go through. Try another, lighter photo.',
    es: 'Esa imagen no pasa. Prueba con otra foto más ligera.',
    de: 'Dieses Bild geht nicht durch. Versuch ein anderes, leichteres Foto.',
    pt: 'Essa imagem não passa. Tente outra foto, mais leve.',
  },

  // ─── Ce qui N'EST PAS demandé (photo, bio, crew) ───────────────────────────
  /**
   * La spec dit « la photo, la bio et le crew ne sont pas obligatoires ». Une
   * ligne pour que leur absence se lise comme un choix, pas comme un écran
   * inachevé — et pour qu'on ne cherche pas un champ manquant.
   */
  /**
   * ⚠️ « PHOTO » A QUITTÉ CETTE LIGNE LE 12/09/2026. Elle disait « photo, bio et
   * crew : plus tard » à quinze pixels d'un bouton « Ajouter une photo » : deux
   * affirmations contradictoires dans le même écran, et c'est la note du bas
   * qui avait tort depuis que la photo se choisit ici. Ce qu'elle garde est ce
   * qui reste VRAI : bio et crew ne sont demandés nulle part dans ce parcours.
   */
  optionalNote: {
    fr: 'Bio et crew : plus tard, si tu veux. Rien ne t’attend là-dessus.',
    en: 'Bio and crew: later, if you want. Nothing is waiting on those.',
    es: 'Bio y crew: más tarde, si quieres. Nada depende de eso.',
    de: 'Bio und Crew: später, wenn du magst. Daran hängt nichts.',
    pt: 'Bio e crew: depois, se você quiser. Nada depende disso.',
  },

  // ─── CTA sticky (unique, §A4) ──────────────────────────────────────────────
  cta: {
    fr: 'CONTINUER',
    en: 'CONTINUE',
    es: 'CONTINUAR',
    de: 'WEITER',
    pt: 'CONTINUAR',
  },
  ctaBusy: {
    fr: 'Enregistrement…',
    en: 'Saving…',
    es: 'Guardando…',
    de: 'Wird gespeichert…',
    pt: 'Salvando…',
  },

  // ─── Échecs honnêtes ───────────────────────────────────────────────────────
  /** Course perdue sur le `unique` de 0011 : le serveur tranche, on le rend. */
  errorHandleTakenOnSave: {
    fr: 'Ce handle vient d’être pris. Choisis-en un autre.',
    en: 'That handle was just taken. Pick another one.',
    es: 'Ese handle acaba de ser ocupado. Elige otro.',
    de: 'Dieses Handle wurde gerade vergeben. Nimm ein anderes.',
    pt: 'Esse handle acabou de ser pego. Escolha outro.',
  },
  /**
   * RÉSERVÉ n'est pas PRIS (0175 : quatorze jours au profit de l'ancien
   * porteur). Personne ne l'utilise, et il se libérera : dire « pris »
   * enverrait le joueur croire qu'il a un rival et abandonner un pseudo qui
   * lui reviendra.
   */
  errorHandleHeldOnSave: {
    fr: 'Ce pseudo est encore réservé à son ancien porteur. Il se libérera, ou choisis-en un autre.',
    en: 'That handle is still reserved for its previous owner. It will free up, or pick another one.',
    es: 'Ese alias sigue reservado para su antiguo dueño. Se liberará, o elige otro.',
    de: 'Dieses Kürzel ist noch für seinen früheren Träger reserviert. Es wird frei, oder nimm ein anderes.',
    pt: 'Esse apelido ainda está reservado para o dono anterior. Ele vai liberar, ou escolha outro.',
  },
  errorNetwork: {
    fr: 'Enregistrement impossible. Réessaie quand tu as du réseau.',
    en: 'Couldn’t save — try again when you’re online.',
    es: 'No se pudo guardar: reinténtalo con conexión.',
    de: 'Speichern fehlgeschlagen — versuch es mit Netz erneut.',
    pt: 'Não foi possível salvar — tente quando tiver internet.',
  },
  errorUnknown: {
    fr: 'L’enregistrement a échoué. Réessaie : ta saisie est toujours là.',
    en: 'Saving failed. Try again — what you typed is still here.',
    es: 'No se pudo guardar. Reinténtalo: lo que has escrito sigue ahí.',
    de: 'Speichern fehlgeschlagen. Versuch es nochmal — deine Eingabe bleibt.',
    pt: 'Falha ao salvar. Tente de novo — o que você digitou continua aí.',
  },
});
