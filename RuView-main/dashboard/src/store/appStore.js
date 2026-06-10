/* Application-wide reactive state.
 *
 * One signal per logical observable; components subscribe to only the
 * signals they read. Keeps re-renders surgical even at 1 kHz frame rates.
 * Persistence lives in `persistence.ts`; this module is pure state.
 */
import { signal, computed } from '@preact/signals-core';
export const transport = signal('wasm');
export const wsUrl = signal('');
export const connected = signal(false);
export const transportError = signal(null);
export const running = signal(false);
export const paused = signal(true);
export const speed = signal(1.0);
export const t = signal(0); // sim time (s)
export const framesEmitted = signal(0n);
export const seed = signal(0xcafebaben);
export const fs = signal(10000); // sample rate Hz
export const fmod = signal(1000); // lockin Hz
export const dtMs = signal(1.0);
export const noiseEnabled = signal(true);
export const theme = signal('dark');
export const density = signal('default');
export const motionReduced = signal(false);
export const autoUpdate = signal(true);
export const lastB = signal([0, 0, 0]); // T
export const bMag = signal(0);
export const snr = signal(0);
export const fps = signal(0);
export const witnessHex = signal('');
export const witnessVerified = signal('idle');
export const expectedWitness = signal('');
export const lastFrame = signal(null);
export const traceX = signal([]);
export const traceY = signal([]);
export const traceZ = signal([]);
export const stripBars = signal([]);
export const sceneName = signal('rebar-walkby-01');
export const sceneJson = signal('');
export const consolePaused = signal(false);
export const consoleFilter = signal('all');
/** REPL command history, persisted via persistence.ts (kvSet 'repl-history'). */
export const replHistory = signal([]);
export function pushReplHistory(cmd) {
    const next = replHistory.value.slice();
    next.push(cmd);
    while (next.length > 200)
        next.shift();
    replHistory.value = next;
}
export const scenePositions = signal([]);
export const appEvents = signal([]);
export const appEventCounts = signal({});
export function pushAppEvent(ev) {
    const next = appEvents.value.slice();
    next.push(ev);
    while (next.length > 200)
        next.shift();
    appEvents.value = next;
    const c = { ...appEventCounts.value };
    c[ev.appId] = (c[ev.appId] ?? 0) + 1;
    appEventCounts.value = c;
}
/** Active app activations — driven by the App Store toggles. Mirrored
 * from `apps.ts` but exposed as a signal here so `main.ts` can dispatch
 * frames to active runtimes without importing the App Store component. */
export const activeAppIds = signal(new Set());
export const transportLabel = computed(() => transport.value === 'wasm' ? 'wasm' : 'ws');
let _client = null;
export function setClient(c) { _client = c; }
export function getClient() { return _client; }
export const consoleLines = signal([]);
const MAX_LINES = 200;
export function pushLog(level, msg) {
    if (consolePaused.value)
        return;
    const next = consoleLines.value.slice();
    next.push({ ts: Date.now(), level, msg });
    while (next.length > MAX_LINES)
        next.shift();
    consoleLines.value = next;
}
export function pushTrace(b) {
    const cap = 200;
    const x = traceX.value.slice();
    x.push(b[0]);
    if (x.length > cap)
        x.shift();
    const y = traceY.value.slice();
    y.push(b[1]);
    if (y.length > cap)
        y.shift();
    const z = traceZ.value.slice();
    z.push(b[2]);
    if (z.length > cap)
        z.shift();
    traceX.value = x;
    traceY.value = y;
    traceZ.value = z;
}
export function pushStripBar(amp) {
    const cap = 48;
    const next = stripBars.value.slice();
    next.push(Math.max(0, Math.min(1, amp)));
    while (next.length > cap)
        next.shift();
    stripBars.value = next;
}
export function recordEvent(_ev) {
    // future: route NvsimEvent into store updates per type. For V1 the
    // worker pushes B-vector / frame data directly via the data plane.
}
