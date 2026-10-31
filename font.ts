import { supabase } from './supabase';
import fontkit from '@pdf-lib/fontkit';

export type FontSetting = { url: string; name: string };
export type FontData = { bytes: ArrayBuffer; fk: any; upm: number; xh: number; name: string };

export async function fetchActiveFont(): Promise<FontSetting | null> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'writing_font').maybeSingle();
  return (data?.value as FontSetting) || null;
}

// Font tập viết (khác font giao diện): đăng ký thành 'WritingFont' cho toàn website.
export async function applyWritingFont(url: string) {
  const ff = new FontFace('WritingFont', `url(${url})`);
  await ff.load();
  document.fonts.add(ff);
}

export async function parseFont(bytes: ArrayBuffer, name = 'font'): Promise<FontData> {
  const fk: any = (fontkit as any).create(new Uint8Array(bytes));
  const upm = fk.unitsPerEm || 1000;
  const xh = fk.xHeight && fk.xHeight > 0 ? fk.xHeight : upm * 0.5;
  return { bytes, fk, upm, xh, name };
}

export async function loadFontFromUrl(url: string, name = 'font') {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Không tải được font');
  return parseFont(await r.arrayBuffer(), name);
}

// Kiểm tra font có đủ dấu tiếng Việt không.
export function missingVietnamese(f: FontData): string[] {
  const sample = 'aăâbcdđeêghiklmnoôơpqrstuưvxyAĂÂĐÊÔƠƯàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ';
  return [...new Set(sample)].filter((c) => !f.fk.hasGlyphForCodePoint(c.codePointAt(0)));
}
