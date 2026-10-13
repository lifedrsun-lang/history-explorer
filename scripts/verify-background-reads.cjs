/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser lifecycle regression harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

function environment(file) {
  let now = 0, sequence = 0, fetches = 0, mode = 'healthy', revision = 1;
  const timers = new Map(), streams = [], snapshots = [];
  const document = new EventTarget(), window = new EventTarget();
  document.visibilityState = 'visible';
  const navigator = { onLine: true };
  const setTimeout = (callback, delay = 0) => { const id = ++sequence; timers.set(id, { due: now + delay, callback }); return id; };
  const clearTimeout = id => timers.delete(id);
  const event = (target, name) => target.dispatchEvent(new Event(name));
  class FakeEventSource extends EventTarget {
    constructor(url) {
      super(); this.url = url; this.closed = false; streams.push(this);
      queueMicrotask(() => {
        if (this.closed) return;
        if (mode === 'failed') this.onerror?.();
        else if (mode === 'healthy') this.emit('vote', { slot: Number(new URL(url, 'http://test').searchParams.get('slot')), revision });
      });
    }
    close() { this.closed = true; }
    emit(name, payload) { const e = new Event(name); e.data = JSON.stringify(payload); this.dispatchEvent(e); }
  }
  const context = {
    document, window, navigator, setTimeout, clearTimeout, AbortController,
    EventSource: FakeEventSource,
    fetch: async (url, options) => {
      fetches++;
      if (mode === 'pending') return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
      return { ok: mode !== 'get-failed', json: async () => ({ vote: { slot: Number(new URL(url, 'http://test').searchParams.get('slot')), revision } }) };
    },
    exports: {}, console,
  };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, context, { filename: file });
  return {
    ...context.exports, document, window, navigator, streams, snapshots,
    get fetches() { return fetches; }, get now() { return now; },
    setMode(value) { mode = value; }, setRevision(value) { revision = value; },
    event, hide() { document.visibilityState = 'hidden'; event(document, 'visibilitychange'); },
    show() { document.visibilityState = 'visible'; event(document, 'visibilitychange'); event(window, 'focus'); event(window, 'pageshow'); },
    async tick(ms) {
      const target = now + ms; await flush();
      let count = 0;
      while (true) {
        const [id, next] = [...timers].filter(([, t]) => t.due <= target).sort((a, b) => a[1].due - b[1].due)[0] || [];
        if (!next) break;
        assert.ok(++count < 10000, 'Timer loop must be bounded');
        now = next.due; timers.delete(id); next.callback(); await flush();
      }
      now = target; await flush();
    },
  };
}

(async () => {
  const checks = [];
  const poll = environment('lib/visiblePolling.ts');
  let reads = 0;
  const stopPolling = poll.startVisiblePolling(async () => { reads++; }, 60000);
  await poll.tick(0); assert.equal(reads, 1);
  await poll.tick(59000); assert.equal(reads, 1);
  await poll.tick(1000); assert.equal(reads, 2);
  poll.hide(); await poll.tick(180000); assert.equal(reads, 2);
  poll.show(); await poll.tick(100); assert.equal(reads, 3);
  poll.navigator.onLine = false; poll.event(poll.window, 'offline'); await poll.tick(120000); assert.equal(reads, 3);
  poll.navigator.onLine = true; poll.event(poll.window, 'online'); await poll.tick(100); assert.equal(reads, 4);
  stopPolling(); await poll.tick(120000); assert.equal(reads, 4);
  checks.push('Visible school reads every 60s; hidden/offline stops; return coalesces visibility/focus/pageshow into one current read; cleanup stops timers');

  const slow = environment('lib/visiblePolling.ts');
  let resolve, active = 0, maxActive = 0, slowReads = 0;
  const stopSlow = slow.startVisiblePolling(() => { slowReads++; maxActive = Math.max(maxActive, ++active); return new Promise(done => { resolve = () => { active--; done(); }; }); }, 10000);
  await slow.tick(0); await slow.tick(60000);
  assert.equal(slowReads, 1);
  slow.event(slow.window, 'focus'); await slow.tick(100); assert.equal(slowReads, 1);
  resolve(); await slow.tick(100); assert.equal(slowReads, 2); assert.equal(maxActive, 1);
  stopSlow(); resolve(); await slow.tick(60000); assert.equal(slowReads, 2);
  checks.push('Slow classroom reads never overlap; a focus refresh waits for the current request');

  const healthy = environment('app/vote/voteConnection.ts');
  const received = [];
  const stopHealthy = healthy.startVoteConnection(2, vote => received.push(vote.revision), () => {});
  await healthy.tick(0); assert.deepEqual(received, [1]); assert.equal(healthy.fetches, 0);
  healthy.streams[0].emit('reconnect', {}); await healthy.tick(0);
  assert.equal(healthy.streams.length, 2); assert.equal(healthy.fetches, 0); assert.equal(healthy.streams[0].closed, true);
  healthy.hide(); assert.equal(healthy.streams[1].closed, true);
  const hiddenCount = healthy.streams.length; await healthy.tick(3600000);
  assert.equal(healthy.streams.length, hiddenCount); assert.equal(healthy.fetches, 0);
  healthy.setRevision(7); healthy.show(); await healthy.tick(100);
  assert.equal(healthy.streams.length, hiddenCount + 1); assert.equal(received.at(-1), 7);
  const retainedCount = received.length;
  healthy.streams[0].emit('vote', { slot: 2, revision: 99 });
  assert.equal(received.length, retainedCount, 'Old stream cannot replace returned-tab state');
  stopHealthy(); healthy.show(); await healthy.tick(60000); assert.equal(healthy.streams.length, hiddenCount + 1);
  checks.push('Healthy vote needs no duplicate initial GET; normal server rotation reconnects once without polling; hidden tab closes stream; return receives latest slot; stale stream and unmount ignored');

  const failed = environment('app/vote/voteConnection.ts'); failed.setMode('failed');
  const stopFailed = failed.startVoteConnection(1, () => {}, () => {});
  await failed.tick(0); assert.equal(failed.fetches, 0);
  await failed.tick(2999); assert.equal(failed.fetches, 0);
  await failed.tick(1); assert.equal(failed.fetches, 1);
  await failed.tick(9999); assert.equal(failed.fetches, 1);
  await failed.tick(1); assert.equal(failed.fetches, 2);
  await failed.tick(30000); assert.equal(failed.fetches, 3);
  await failed.tick(60000); assert.equal(failed.fetches, 4);
  await failed.tick(3600000 - failed.now);
  const hourlyFallbackReads = failed.fetches;
  assert.ok(hourlyFallbackReads <= 65, `Outage retry capped, actual ${hourlyFallbackReads}`);
  failed.hide(); const hiddenFetches = failed.fetches; await failed.tick(3600000); assert.equal(failed.fetches, hiddenFetches);
  failed.setMode('healthy'); failed.show(); await failed.tick(100);
  const restoredFetches = failed.fetches; await failed.tick(60000); assert.equal(failed.fetches, restoredFetches);
  stopFailed();
  checks.push('Failed vote uses 3s/10s/30s/60s backoff with one fallback read per retry; hidden cancels; stream recovery stops fallback reads');

  const pending = environment('app/vote/voteConnection.ts'); pending.setMode('failed');
  const stopPending = pending.startVoteConnection(3, () => {}, () => {});
  await pending.tick(0); pending.setMode('pending'); await pending.tick(3000);
  assert.equal(pending.fetches, 1);
  pending.hide(); await pending.tick(60000); assert.equal(pending.streams.length, 1);
  pending.setMode('healthy'); pending.show(); await pending.tick(100); assert.equal(pending.streams.length, 2);
  stopPending();
  checks.push('Hiding during a fallback aborts it and cannot start a stale reconnect; returning resumes the selected slot');

  let deadline, unsubscribed = false;
  const routeContext = {
    exports: {}, URL, Request, Response, TextEncoder, ReadableStream, console,
    setInterval: () => 1, clearInterval: () => {},
    setTimeout: callback => { deadline = callback; return 2; }, clearTimeout: () => {},
    require: name => name.endsWith('liveVoteServer') ? {
      readVote: async () => ({ slot: 1, revision: 1 }),
      voteRefs: () => ({ state: { onSnapshot: () => () => { unsubscribed = true; } } }),
      voteFailure: error => { throw error; },
    } : { voteSlot: () => 1 },
  };
  const routeCode = ts.transpileModule(fs.readFileSync(path.join(root, 'app/api/vote/events/route.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(routeCode, routeContext);
  const streamResponse = await routeContext.exports.GET(new Request('http://test/api/vote/events?slot=1'));
  assert.equal(streamResponse.status, 200);
  const reader = streamResponse.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: vote/);
  deadline();
  assert.match(new TextDecoder().decode((await reader.read()).value), /event: reconnect/);
  assert.equal((await reader.read()).done, true); assert.equal(unsubscribed, true);
  checks.push('Actual SSE route sends a reconnect frame on normal rotation and cleans up its Firestore listener before closing');

  console.log(JSON.stringify({ passed: true, checks, simulatedOneHourOutage: { fallbackGets: hourlyFallbackReads, previousThreeSecondIntervalGets: 3600 / 3 }, productionDataWrites: 0 }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
