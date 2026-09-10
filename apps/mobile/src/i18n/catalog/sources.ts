/**
 * GRYD — i18n : catalogue du domaine « sources connectées » (Verify Hub).
 *
 * Il existe parce que les chaînes du Hub qui restaient en FRANÇAIS EN DUR
 * vivaient dans `features/sources/catalog.ts` (« Trust élevé », « Capture
 * directe », « Import + vérif ») — c'est-à-dire dans un module de données, hors
 * de toute traduction. Elles sont AFFICHÉES sur chaque ligne de l'écran.
 *
 * Le reste des textes du Hub vit dans `catalog/auth.ts`, qui appartient à un
 * autre chantier : on ne l'écrit pas, on le lit. D'où ce fichier neuf plutôt
 * qu'un ajout là-bas.
 *
 * ─── INVARIANTS (jamais traduits, donc pas d'entrée ici) ──────────────────────
 * « GRYD », « GRYD Verify Hub », « GRYD Live GPS », « GPX » : ce sont des NOMS
 * PROPRES — le nom du produit, celui de la capture native, et une extension de
 * fichier. Les traduire donnerait cinq noms pour une seule chose.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Niveau de confiance (ex-`features/sources/catalog.ts` TRUST_LABELS) ──
  trustHigh: {
    fr: 'Trust élevé',
    en: 'High trust',
    es: 'Confianza alta',
    de: 'Hohes Vertrauen',
    pt: 'Confiança alta',
  },
  trustMedium: {
    fr: 'Trust moyen',
    en: 'Medium trust',
    es: 'Confianza media',
    de: 'Mittleres Vertrauen',
    pt: 'Confiança média',
  },
  // ── Chemin de vérification (ex-champ `path`, français en dur) ──
  pathDirect: {
    fr: 'Capture directe',
    en: 'Direct capture',
    es: 'Captura directa',
    de: 'Direkte Aufzeichnung',
    pt: 'Captura direta',
  },
  pathImport: {
    fr: 'Import + vérif',
    en: 'Import + check',
    es: 'Importar + verificar',
    de: 'Import + Prüfung',
    pt: 'Importar + verificação',
  },
  /**
   * Remplace le placeholder « … » du statut en cours de lecture : un caractère
   * d'ellipse seul n'affirme rien, et la règle 9 interdit précisément ce
   * caractère comme substitut de texte.
   */
  statusReading: {
    fr: 'Lecture…',
    en: 'Reading…',
    es: 'Leyendo…',
    de: 'Wird gelesen…',
    pt: 'Lendo…',
  },
  /** ÉTAT ① : l'import exige un compte, et il faut le dire AVANT le tap. */
  needsAccountChip: {
    fr: 'Compte requis',
    en: 'Account required',
    es: 'Cuenta necesaria',
    de: 'Konto nötig',
    pt: 'Conta necessária',
  },
  needsAccountTitle: {
    fr: 'Importer demande un compte',
    en: 'Importing needs an account',
    es: 'Importar requiere una cuenta',
    de: 'Import braucht ein Konto',
    pt: 'Importar exige uma conta',
  },
  needsAccountBody: {
    fr: 'Un fichier importé est envoyé au serveur GRYD, qui décide seul de ce qu’il capture. Sans compte, il n’a nulle part où l’envoyer. Autant te le dire avant que tu choisisses le fichier.',
    en: 'An imported file is sent to the GRYD server, which alone decides what it captures. Without an account there is nowhere to send it — better to say so before you pick the file.',
    es: 'Un archivo importado se envía al servidor de GRYD, que decide solo lo que captura. Sin cuenta no hay a dónde enviarlo — mejor decírtelo antes de que elijas el archivo.',
    de: 'Eine importierte Datei geht an den GRYD-Server, der allein entscheidet, was erobert wird. Ohne Konto gibt es kein Ziel — besser, du weißt das vor der Dateiauswahl.',
    pt: 'Um arquivo importado é enviado ao servidor do GRYD, que decide sozinho o que captura. Sem conta não há para onde enviar — melhor avisar antes de você escolher o arquivo.',
  },
  /**
   * L'écran DÉCLARE qu'il n'a pas de quatrième état, comme `qr.tsx` déclare ne
   * pas en avoir. Ce n'est pas un aveu de paresse : `gpx.status()` renvoie
   * TOUJOURS « prêt » et la capture native est locale, donc aucune lecture ne
   * peut échouer. Prétendre gérer un échec impossible serait aussi faux
   * qu'ignorer un échec réel.
   */
  // ── G26 : chaque source dit CE QU'ELLE APPORTE et SON ÉTAT RÉEL ──────────
  sectionOther: {
    fr: 'Autres sources', en: 'Other sources', es: 'Otras fuentes',
    de: 'Weitere Quellen', pt: 'Outras fontes',
  },
  summaryGpx: {
    fr: 'Fichier .gpx · ajouté à ton journal privé',
    en: '.gpx file · added to your private journal',
    es: 'Archivo .gpx · añadido a tu diario privado',
    de: '.gpx-Datei · in deinem privaten Journal',
    pt: 'Arquivo .gpx · adicionado ao seu diário privado',
  },
  summaryLive: {
    fr: 'Course et vélo · GPS du téléphone',
    en: 'Run and ride · phone GPS',
    es: 'Correr y bici · GPS del teléfono',
    de: 'Laufen und Rad · Handy-GPS',
    pt: 'Corrida e bike · GPS do telefone',
  },
  summaryHealth: {
    fr: 'Apple Santé et Health Connect · séances déjà enregistrées par le téléphone',
    en: 'Apple Health and Health Connect · workouts already recorded by the phone',
    es: 'Apple Salud y Health Connect · sesiones ya registradas por el teléfono',
    de: 'Apple Health und Health Connect · bereits vom Handy aufgezeichnete Einheiten',
    pt: 'Apple Saúde e Health Connect · sessões já registradas pelo telefone',
  },
  summaryStrava: {
    fr: 'Sorties Strava · la trace seulement, jamais tes contacts',
    en: 'Strava activities · the trace only, never your contacts',
    es: 'Actividades de Strava · solo el trazado, nunca tus contactos',
    de: 'Strava-Aktivitäten · nur die Spur, nie deine Kontakte',
    pt: 'Atividades do Strava · apenas o traçado, nunca seus contatos',
  },
  summaryGarmin: {
    fr: 'Sorties Garmin · la trace enregistrée par la montre',
    en: 'Garmin activities · the trace recorded by the watch',
    es: 'Actividades de Garmin · el trazado registrado por el reloj',
    de: 'Garmin-Aktivitäten · die von der Uhr aufgezeichnete Spur',
    pt: 'Atividades da Garmin · o traçado gravado pelo relógio',
  },
  /**
   * « Aucune donnée disponible » plutôt qu'un diagnostic faux (G26) : une
   * autorisation Santé refusée et une absence de données sont indiscernables
   * de l'extérieur. Ici GRYD ne lit RIEN, et c'est ce fait-là qui est écrit.
   */
  stateHealth: {
    fr: 'Indisponible ici · aucune donnée disponible. GRYD ne lit aucune donnée de santé dans cette version, et n’affiche donc aucun diagnostic sur tes autorisations.',
    en: 'Unavailable here · no data available. GRYD reads no health data in this version, so it shows no diagnosis about your permissions.',
    es: 'No disponible aquí · sin datos disponibles. GRYD no lee ningún dato de salud en esta versión, así que no muestra ningún diagnóstico sobre tus permisos.',
    de: 'Hier nicht verfügbar · keine Daten verfügbar. GRYD liest in dieser Version keine Gesundheitsdaten und zeigt deshalb keine Diagnose zu deinen Freigaben.',
    pt: 'Indisponível aqui · nenhum dado disponível. O GRYD não lê dados de saúde nesta versão e não mostra diagnóstico sobre suas permissões.',
  },
  stateStrava: {
    fr: 'Indisponible · la connexion Strava n’est pas ouverte dans cette version. Exporte un fichier .gpx depuis Strava et ajoute-le ci-dessus.',
    en: 'Unavailable · the Strava connection is not open in this version. Export a .gpx file from Strava and add it above.',
    es: 'No disponible · la conexión con Strava no está abierta en esta versión. Exporta un archivo .gpx desde Strava y añádelo arriba.',
    de: 'Nicht verfügbar · die Strava-Verbindung ist in dieser Version nicht offen. Exportiere eine .gpx-Datei aus Strava und füge sie oben hinzu.',
    pt: 'Indisponível · a conexão com o Strava não está aberta nesta versão. Exporte um arquivo .gpx do Strava e adicione acima.',
  },
  stateGarmin: {
    fr: 'Indisponible · aucune connexion Garmin dans cette version. Exporte un fichier .gpx depuis Garmin Connect et ajoute-le ci-dessus.',
    en: 'Unavailable · no Garmin connection in this version. Export a .gpx file from Garmin Connect and add it above.',
    es: 'No disponible · sin conexión con Garmin en esta versión. Exporta un archivo .gpx desde Garmin Connect y añádelo arriba.',
    de: 'Nicht verfügbar · keine Garmin-Verbindung in dieser Version. Exportiere eine .gpx-Datei aus Garmin Connect und füge sie oben hinzu.',
    pt: 'Indisponível · sem conexão com a Garmin nesta versão. Exporte um arquivo .gpx do Garmin Connect e adicione acima.',
  },
  /** Ce que l'écran garantit sur ces lignes : elles n'échangent rien. */
  otherSourcesNote: {
    fr: 'Ces sources sont listées avec leur état réel, jamais comme « connectées ». Aucune donnée n’est échangée avec elles tant qu’elles restent indisponibles.',
    en: 'These sources are listed with their real state, never as “connected”. No data is exchanged with them while they remain unavailable.',
    es: 'Estas fuentes se listan con su estado real, nunca como «conectadas». No se intercambia ningún dato con ellas mientras sigan no disponibles.',
    de: 'Diese Quellen stehen mit ihrem echten Zustand da, nie als „verbunden“. Solange sie nicht verfügbar sind, werden keine Daten mit ihnen ausgetauscht.',
    pt: 'Essas fontes aparecem com seu estado real, nunca como “conectadas”. Nenhum dado é trocado com elas enquanto continuarem indisponíveis.',
  },
  noReadFailureNote: {
    fr: 'Aucun de ces états ne vient du réseau : la capture GRYD est locale et l’import lit un fichier sur ce téléphone. Cet écran n’a donc pas d’état « lecture impossible ».',
    en: 'None of these states comes from the network: GRYD capture is local and the import reads a file on this phone. So this screen has no “could not read” state.',
    es: 'Ninguno de estos estados viene de la red: la captura de GRYD es local y la importación lee un archivo de este teléfono. Por eso esta pantalla no tiene estado «no se pudo leer».',
    de: 'Keiner dieser Zustände kommt aus dem Netz: Die GRYD-Aufzeichnung ist lokal, und der Import liest eine Datei auf diesem Handy. Dieser Screen hat deshalb keinen Zustand „nicht lesbar“.',
    pt: 'Nenhum desses estados vem da rede: a captura do GRYD é local e a importação lê um arquivo deste telefone. Por isso esta tela não tem estado “não foi possível ler”.',
  },
});
