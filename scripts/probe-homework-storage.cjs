/* Temporary build-time integration probe. No student records or credentials are output. */
const fs = require('node:fs');
const { randomUUID, createHash } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const results = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_ASSIGNMENT_BUCKET) {
    results.push({ configured: false }); return;
  }
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) },
  });
  const bucket = client.storage.from(process.env.SUPABASE_ASSIGNMENT_BUCKET);
  for (const [format, type] of [['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]) {
    const path = `_diagnostics/homework/${randomUUID()}.${format === 'jpeg' ? 'jpg' : format}`;
    const result = { format, configured: true };
    let stage = 'fixture';
    try {
      const bytes = await sharp({ create: { width: 80, height: 80, channels: 3, background: '#27a89c' } }).toFormat(format).toBuffer();
      stage = 'signed-url';
      const signed = await bucket.createSignedUploadUrl(path);
      if (signed.error || !signed.data) throw signed.error || new Error('missing');
      const form = new FormData(); form.append('cacheControl', '3600');
      form.append('', new File([bytes], `probe.${format}`, { type }));
      stage = 'client-upload';
      const response = await fetch(signed.data.signedUrl, { method: 'PUT', body: form, signal: AbortSignal.timeout(15000) });
      result.uploadStatus = response.status;
      if (!response.ok) throw new Error('upload');
      stage = 'object-info';
      const info = await bucket.info(path);
      if (info.error || !info.data) throw info.error || new Error('missing');
      result.infoKeys = Object.keys(info.data).filter(key => !['name', 'id', 'version', 'metadata'].includes(key));
      result.infoSize = info.data.size; result.infoSizeType = typeof info.data.size;
      stage = 'download';
      const downloaded = await bucket.download(path);
      if (downloaded.error || !downloaded.data) throw downloaded.error || new Error('missing');
      result.downloadSize = downloaded.data.size;
      result.strictSizeMatches = downloaded.data.size === info.data.size;
      result.downloadType = downloaded.data.type;
      const contents = Buffer.from(await downloaded.data.arrayBuffer());
      result.bytesMatch = hash(contents) === hash(bytes);
      stage = 'sharp-decode';
      const converted = await sharp(contents, { failOn: 'error', limitInputPixels: 80000000 }).rotate()
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toBuffer();
      result.jpegBytes = converted.length;
      result.passed = result.strictSizeMatches && result.bytesMatch;
    } catch (error) { result.passed = false; result.stage = stage; result.errorName = error?.name || 'unknown'; }
    finally {
      const cleanup = await bucket.remove([path]); result.cleanupSucceeded = !cleanup.error;
    }
    results.push(result);
  }
}
main().catch(error => results.push({ passed: false, errorName: error?.name || 'unknown' })).finally(() => {
  fs.mkdirSync('public/.well-known', { recursive: true });
  fs.writeFileSync('public/.well-known/homework-storage-probe.json', JSON.stringify({ results }, null, 2));
  console.log('Homework storage probe:', JSON.stringify(results));
});
