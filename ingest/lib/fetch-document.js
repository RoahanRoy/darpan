/* Fetching a source document, with the bits every adapter needs: a real
   User-Agent (several Indian government and think-tank hosts sit behind
   Cloudflare and 403 a bare client), a byte hash, and PDF text extraction. */

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Identifying the project rather than impersonating a browser. If a publisher
// wants to rate-limit or block this, they should be able to.
const USER_AGENT =
  'YojanaDarpanBot/0.1 (+https://github.com/yojana-darpan; public-budget-transparency)';

/** Fetches a URL and returns bytes plus the metadata raw_documents wants. */
export async function fetchDocument(url, { timeoutMs = 60_000 } = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
    signal,
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`GET ${url} → HTTP ${res.status} ${res.statusText}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  return {
    url,
    bytes,
    mediaType: res.headers.get('content-type'),
    byteSize: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

/** Extracts text from PDF bytes. Returns { text, lines, pageCount }. */
export async function extractPdfText(bytes) {
  // pdf-parse v2 exports a class; loaded lazily so a non-PDF adapter does not
  // pay for pdfjs at import time.
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    const text = result.text ?? '';
    return {
      text,
      lines: text.split('\n').map((l) => l.trim()),
      pageCount: result.total ?? result.pages?.length ?? 0,
    };
  } finally {
    await parser.destroy();
  }
}

export { USER_AGENT };
