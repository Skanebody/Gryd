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
    fr: 'Un fichier importé est envoyé au serveur GRYD, qui décide seul de ce qu’il capture. Sans compte, il n’a nulle part où l’envoyer — autant te le dire avant que tu choisisses le fichier.',
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
  noReadFailureNote: {
    fr: 'Aucun de ces états ne vient du réseau : la capture GRYD est locale et l’import lit un fichier sur ce téléphone. Cet écran n’a donc pas d’état « lecture impossible ».',
    en: 'None of these states comes from the network: GRYD capture is local and the import reads a file on this phone. So this screen has no “could not read” state.',
    es: 'Ninguno de estos estados viene de la red: la captura de GRYD es local y la importación lee un archivo de este teléfono. Por eso esta pantalla no tiene estado «no se pudo leer».',
    de: 'Keiner dieser Zustände kommt aus dem Netz: Die GRYD-Aufzeichnung ist lokal, und der Import liest eine Datei auf diesem Handy. Dieser Screen hat deshalb keinen Zustand „nicht lesbar“.',
    pt: 'Nenhum desses estados vem da rede: a captura do GRYD é local e a importação lê um arquivo deste telefone. Por isso esta tela não tem estado “não foi possível ler”.',
  },
});
