/* WebSocket transport client — talks to a `nvsim-server` Axum host
 * (v2/crates/nvsim-server). REST for control plane, binary WebSocket
 * for the MagFrame stream. Mirrors the WasmClient interface so the
 * dashboard can swap transports at runtime without code changes.
 *
 * ADR-092 §5.2 / §6.2.
 */
import { parseFrameBatch, } from './NvsimClient';
/** Convert a base URL (e.g. `http://host:7878`) to its WebSocket peer (`ws://host:7878`). */
function toWsUrl(baseUrl) {
    if (baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://'))
        return baseUrl;
    return baseUrl.replace(/^http/, 'ws');
}
export class WsClient {
    /** @param baseUrl e.g. `http://localhost:7878` */
    constructor(baseUrl) {
        this.ws = null;
        this.bootInfo = null;
        this.frameSubs = new Set();
        this.eventSubs = new Set();
        this.running = false;
        this.framesEmitted = 0;
        this.fpsLast = performance.now();
        this.fpsCount = 0;
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.wsUrl = `${toWsUrl(this.baseUrl)}/ws/stream`;
    }
    async json(path, init) {
        const res = await fetch(`${this.baseUrl}${path}`, {
            ...init,
            headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
        });
        if (!res.ok)
            throw new Error(`${path}: ${res.status} ${res.statusText}`);
        return (await res.json());
    }
    async boot() {
        if (this.bootInfo)
            return this.bootInfo;
        const h = await this.json('/api/health');
        this.bootInfo = {
            buildVersion: h.nvsim_version,
            frameMagic: h.magic,
            frameBytes: h.frame_bytes,
            expectedWitnessHex: h.expected_witness_hex,
        };
        this.openWs();
        return this.bootInfo;
    }
    openWs() {
        if (this.ws)
            return;
        const ws = new WebSocket(this.wsUrl);
        ws.binaryType = 'arraybuffer';
        ws.onopen = () => {
            this.eventSubs.forEach((s) => s({ type: 'log', level: 'ok', msg: `ws/stream connected · ${this.wsUrl}` }));
        };
        ws.onclose = () => {
            this.ws = null;
            this.eventSubs.forEach((s) => s({ type: 'log', level: 'warn', msg: 'ws/stream closed' }));
        };
        ws.onerror = () => {
            this.eventSubs.forEach((s) => s({ type: 'log', level: 'err', msg: `ws/stream error · ${this.wsUrl}` }));
        };
        ws.onmessage = (ev) => {
            if (!(ev.data instanceof ArrayBuffer))
                return;
            const bytes = new Uint8Array(ev.data);
            const frames = parseFrameBatch(bytes);
            if (frames.length === 0)
                return;
            const batch = { frames, bytes };
            this.frameSubs.forEach((s) => s(batch));
            this.framesEmitted += frames.length;
            this.fpsCount += frames.length;
            const now = performance.now();
            if (now - this.fpsLast >= 1000) {
                const fps = (this.fpsCount * 1000) / (now - this.fpsLast);
                this.eventSubs.forEach((s) => s({ type: 'fps', value: fps }));
                this.fpsLast = now;
                this.fpsCount = 0;
            }
        };
        this.ws = ws;
    }
    async loadScene(scene) {
        await this.json('/api/scene', { method: 'PUT', body: JSON.stringify(scene) });
    }
    async setConfig(cfg) {
        await this.json('/api/config', { method: 'PUT', body: JSON.stringify(cfg) });
    }
    async setSeed(seed) {
        await this.json('/api/seed', {
            method: 'PUT',
            body: JSON.stringify({ seed_hex: '0x' + seed.toString(16).toUpperCase().padStart(16, '0') }),
        });
    }
    async reset() {
        await this.json('/api/reset', { method: 'POST' });
        this.running = false;
        this.framesEmitted = 0;
        this.eventSubs.forEach((s) => s({ type: 'state', running: false, t: 0, framesEmitted: 0 }));
    }
    async run(_opts) {
        await this.json('/api/run', { method: 'POST' });
        this.running = true;
        this.eventSubs.forEach((s) => s({ type: 'state', running: true, t: 0, framesEmitted: this.framesEmitted }));
    }
    async pause() {
        await this.json('/api/pause', { method: 'POST' });
        this.running = false;
        this.eventSubs.forEach((s) => s({ type: 'state', running: false, t: 0, framesEmitted: this.framesEmitted }));
    }
    async step(direction, dtMs) {
        await this.json('/api/step', { method: 'POST', body: JSON.stringify({ direction, dt_ms: dtMs }) });
    }
    onFrames(cb) { this.frameSubs.add(cb); }
    onEvent(cb) { this.eventSubs.add(cb); }
    async generateWitness(samples) {
        const r = await this.json('/api/witness/generate', {
            method: 'POST',
            body: JSON.stringify({ samples }),
        });
        const out = new Uint8Array(32);
        for (let i = 0; i < 32; i++)
            out[i] = parseInt(r.witness_hex.slice(i * 2, i * 2 + 2), 16);
        return out;
    }
    async verifyWitness(expected) {
        const expected_hex = Array.from(expected).map((b) => b.toString(16).padStart(2, '0')).join('');
        const r = await this.json('/api/witness/verify', {
            method: 'POST',
            body: JSON.stringify({ expected_hex, samples: 256 }),
        });
        if (r.ok)
            return { ok: true };
        const actual = new Uint8Array(32);
        for (let i = 0; i < 32; i++)
            actual[i] = parseInt(r.actual_hex.slice(i * 2, i * 2 + 2), 16);
        return { ok: false, actual };
    }
    async exportProofBundle() {
        const text = await fetch(`${this.baseUrl}/api/export-proof`, { method: 'POST' }).then((r) => r.text());
        return new Blob([text], { type: 'application/json' });
    }
    async runTransient(scene, config, _seed, samples) {
        // Server doesn't expose a transient route in V1 — the dashboard's
        // Ghost Murmur sandbox falls back to the WASM client when transport
        // is WS. Stub here returns a zero-result so the caller can detect.
        void scene;
        void config;
        void samples;
        return {
            bRecoveredT: [0, 0, 0],
            bMagT: 0,
            noiseFloorPtSqrtHz: 0,
            sigmaPt: [0, 0, 0],
            nFrames: 0,
            witnessHex: '(transient route not available in WS transport — V1 limitation)',
        };
    }
    async buildId() {
        const info = this.bootInfo ?? (await this.boot());
        return `nvsim@${info.buildVersion} (ws)`;
    }
    async close() {
        this.ws?.close();
        this.ws = null;
    }
}
