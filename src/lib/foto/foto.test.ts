import { describe, expect, test } from 'vitest';
import { erroreDi, misure, PESO_MAX, scegli, tipoOriginale } from '.';

const file = (name: string, type: string, byte = 10) => Object.assign(new Blob([new Uint8Array(byte)], { type }), { name });

describe('misure', () => {
  test('12 MP verticale e orizzontale: lato lungo 1600', () => {
    expect(misure(4000, 3000)).toEqual({ larghezza: 1600, altezza: 1200 });
    expect(misure(3000, 4000)).toEqual({ larghezza: 1200, altezza: 1600 });
  });
  test('una foto piccola non si ingrandisce', () => expect(misure(800, 600)).toEqual({ larghezza: 800, altezza: 600 }));
  test('striscia lunghissima: mai sotto 1 px', () => expect(misure(100000, 10)).toEqual({ larghezza: 1600, altezza: 1 }));
});

describe('tipoOriginale', () => {
  test('dal browser', () => expect(tipoOriginale({ name: 'a.jpg', type: 'IMAGE/JPEG' })).toBe('image/jpeg'));
  test('HEIC senza tipo (Windows): dall’estensione', () => {
    expect(tipoOriginale({ name: 'IMG_0001.HEIC', type: '' })).toBe('image/heic');
    expect(tipoOriginale({ name: 'x.heif', type: '' })).toBe('image/heif');
  });
  test('senza tipo e senza estensione nota: niente', () => expect(tipoOriginale({ name: 'nota', type: '' })).toBe(''));
});

describe('scegli', () => {
  test('aperta dal browser: il JPEG rimpicciolito', () => {
    const jpeg = new Blob([new Uint8Array(5)], { type: 'image/jpeg' });
    expect(scegli(file('a.png', 'image/png', 50), jpeg)).toEqual({ blob: jpeg, tipo: 'image/jpeg', estensione: 'jpg' });
  });
  test('HEIC che il browser non apre: l’originale, con il suo tipo anche se il browser non lo dà', () => {
    const p = scegli(file('IMG.HEIC', ''), null);
    expect(p).toMatchObject({ tipo: 'image/heic', estensione: 'heic' });
    expect(typeof p !== 'string' && p.blob.type).toBe('image/heic');
  });
  test('non è un’immagine: rifiutato', () => {
    expect(scegli(file('compiti.pdf', 'application/pdf'), null)).toBe('non-immagine');
    expect(scegli(file('nota.txt', 'text/plain'), null)).toBe('non-immagine');
    expect(scegli(file('nota', ''), null)).toBe('non-immagine');
  });
  test('oltre 10 MB: rifiutata prima di caricare', () => {
    expect(scegli(file('IMG.heic', 'image/heic', PESO_MAX + 1), null)).toBe('troppo-grande');
    expect(scegli(file('IMG.heic', 'image/heic', PESO_MAX), null)).not.toBe('troppo-grande');
    expect(scegli(file('a.jpg', 'image/jpeg'), new Blob([new Uint8Array(PESO_MAX + 1)], { type: 'image/jpeg' }))).toBe('troppo-grande');
  });
});

describe('erroreDi', () => {
  test('senza rete', () => expect(erroreDi(new Error('qualsiasi'), false)).toBe('rete'));
  test('fetch fallita (Chrome, Safari, Firefox), anche dentro l’errore dello Storage', () => {
    expect(erroreDi(new TypeError('Failed to fetch'), true)).toBe('rete');
    expect(erroreDi({ message: 'x', originalError: new TypeError('Load failed') }, true)).toBe('rete');
    expect(erroreDi(new TypeError('NetworkError when attempting to fetch resource.'), true)).toBe('rete');
  });
  test('413 dallo Storage: troppo grande', () => expect(erroreDi({ message: 'Payload too large', statusCode: '413' }, true)).toBe('troppo-grande'));
  test('il resto', () => {
    expect(erroreDi({ message: 'new row violates row-level security policy' }, true)).toBe('altro');
    expect(erroreDi(null, true)).toBe('altro');
  });
});
