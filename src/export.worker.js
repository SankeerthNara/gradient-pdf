// Builds the recoloured PDF off the main thread, so the page never freezes while it works.
import { recolor, EncryptedPDFError } from './recolor.js';

self.onmessage = async ({ data: { bytes, style, password } }) => {
  try {
    const out = await recolor(bytes, style, (i, n) => self.postMessage({ progress: [i, n] }), password);
    self.postMessage({ out }, [out.buffer]);
  } catch (e) {
    self.postMessage({ error: String(e?.message || e), encrypted: e instanceof EncryptedPDFError });
  }
};
