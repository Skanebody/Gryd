/**
 * GRYD — TextDecoder utf-16le pour Hermes/iOS (CAUSE RÉELLE des crashes de
 * démarrage des builds 1 à 3, élucidée par l'alerte bootDiagnostics du build 3).
 *
 * h3-js (cœur de la grille hexagonale, importé partout) est compilé par
 * Emscripten, dont le runtime évalue AU CHARGEMENT DU MODULE :
 *   typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined
 * Sur le runtime RN/Hermes d'Expo, un TextDecoder global EXISTE mais ne connaît
 * que l'UTF-8 → le garde `typeof` passe, le constructeur jette
 * « RangeError: Unknown encoding: utf-16le » → l'import de h3-js meurt → app
 * tuée avant le premier écran. Sans polyfill du tout, Emscripten retomberait
 * proprement sur son décodeur manuel : c'est l'existence d'un TextDecoder
 * INCOMPLET qui casse. Le web n'est pas touché (TextDecoder natif complet).
 *
 * Correctif : envelopper le TextDecoder global — les labels utf-16le/utf-16
 * sont décodés par l'implémentation locale ci-dessous (les chaînes h3 sont
 * courtes, la boucle simple suffit) ; TOUT le reste est délégué au décodeur
 * d'origine à l'identique. Aucune dépendance ajoutée.
 *
 * DOIT être importé avant tout module qui touche h3-js → 2ᵉ import de
 * app/_layout.tsx, juste après bootDiagnostics.
 */
import { Platform } from 'react-native';

interface TextDecoderLike {
  readonly encoding: string;
  decode(input?: ArrayBuffer | ArrayBufferView): string;
}

type TextDecoderCtor = new (label?: string, options?: unknown) => TextDecoderLike;

function isUtf16le(label?: string): boolean {
  const l = (label ?? '').trim().toLowerCase();
  return l === 'utf-16le' || l === 'utf-16';
}

function toUint8(input?: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (!input) return new Uint8Array(0);
  if (input instanceof Uint8Array) return input;
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(input);
}

/** Décodeur UTF-16LE minimal : paires d'octets little-endian → code units JS. */
class Utf16leDecoder implements TextDecoderLike {
  readonly encoding = 'utf-16le';
  decode(input?: ArrayBuffer | ArrayBufferView): string {
    const u8 = toUint8(input);
    const even = u8.length - (u8.length % 2);
    let out = '';
    for (let i = 0; i < even; i += 2) {
      // Little-endian : octet bas puis octet haut. Les surrogates passent tels
      // quels — les chaînes JS sont déjà de l'UTF-16.
      out += String.fromCharCode(u8[i]! | (u8[i + 1]! << 8));
    }
    return out;
  }
}

const g = globalThis as { TextDecoder?: TextDecoderCtor };
const NativeTextDecoder = g.TextDecoder;

// On ne patche QUE le cas problématique : un TextDecoder présent (donc le garde
// `typeof` d'Emscripten passe) mais incapable d'utf-16le. S'il n'y a aucun
// TextDecoder, Emscripten se débrouille déjà — ne rien installer.
if (Platform.OS !== 'web' && NativeTextDecoder) {
  class PatchedTextDecoder implements TextDecoderLike {
    private readonly impl: TextDecoderLike;
    constructor(label?: string, options?: unknown) {
      this.impl = isUtf16le(label)
        ? new Utf16leDecoder()
        : new NativeTextDecoder!(label, options);
    }
    get encoding(): string {
      return this.impl.encoding;
    }
    decode(input?: ArrayBuffer | ArrayBufferView): string {
      return this.impl.decode(input);
    }
  }
  g.TextDecoder = PatchedTextDecoder as TextDecoderCtor;
}

export {};
