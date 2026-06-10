/* Default `NvsimClient` implementation. Talks to the Web Worker that
 * hosts the nvsim WASM module. ADR-092 §5.4 + §6.3. */
import { parseFrameBatch, } from './NvsimClient';
export class WasmClient {
    constructor() {
        this.nextId = 1;
        this.pending = new Map();
        this.frameSubs = new Set();
        this.eventSubs = new Set();
        this.bootInfo = null;
        this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
        this.worker.addEventListener('message', (ev) => this.onMessage(ev));
        this.worker.addEventListener('error', (e) => this.eventSubs.forEach((s) => s({ type: 'log', level: 'err', msg: String(e.message) })));
    }
    onMessage(ev) {
        const m = ev.data;
        if (m.type === 'frames') {
            const buf = m.batch;
            const bytes = new Uint8Array(buf);
            const frames = parseFrameBatch(bytes);
            const batch = { frames, bytes };
            this.frameSubs.forEach((s) => s(batch));
            const fps = m.fps;
            if (fps > 0) {
                this.eventSubs.forEach((s) => s({ type: 'fps', value: fps }));
            }
            return;
        }
        if (m.type === 'state') {
            this.eventSubs.forEach((s) => s({
                type: 'state',
                running: Boolean(m.running),
                t: 0,
                framesEmitted: Number(m.framesEmitted ?? 0),
            }));
            return;
        }
        if (m.type === 'ready') {
            return;
        }
        if (m.type === 'err' && m.id == null) {
            this.eventSubs.forEach((s) => s({ type: 'log', level: 'err', msg: String(m.msg) }));
            return;
        }
        if (typeof m.id === 'number' && this.pending.has(m.id)) {
            const p = this.pending.get(m.id);
            this.pending.delete(m.id);
            if (m.type === 'err')
                p.reject(new Error(String(m.msg)));
            else
                p.resolve(m);
        }
    }
    rpc(msg, transfer = []) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            this.pending.set(id, { resolve: resolve, reject });
            this.worker.postMessage({ ...msg, id }, transfer);
        });
    }
    async boot() {
        if (this.bootInfo)
            return this.bootInfo;
        // Pass Vite's resolved BASE_URL so the worker can locate /nvsim-pkg/
        // under the same prefix the dashboard is served from (e.g. /RuView/nvsim/
        // on GitHub Pages, "/" in dev).
        const base = import.meta.env.BASE_URL ?? '/';
        const r = await this.rpc({ type: 'boot', base });
        this.bootInfo = {
            buildVersion: r.buildVersion,
            frameMagic: r.frameMagic,
            frameBytes: r.frameBytes,
            expectedWitnessHex: r.expectedWitnessHex,
        };
        return this.bootInfo;
    }
    async loadScene(scene) {
        await this.rpc({ type: 'setScene', json: JSON.stringify(scene) });
    }
    async setConfig(cfg) {
        await this.rpc({ type: 'setConfig', json: JSON.stringify(cfg) });
    }
    async setSeed(seed) {
        await this.rpc({ type: 'setSeed', seed: Number(seed & 0xffffffffn) });
    }
    async reset() {
        await this.rpc({ type: 'reset' });
    }
    async run(_opts) {
        await this.rpc({ type: 'run' });
    }
    async pause() {
        await this.rpc({ type: 'pause' });
    }
    async step(_direction, _dtMs) {
        await this.rpc({ type: 'step' });
    }
    onFrames(cb) { this.frameSubs.add(cb); }
    onEvent(cb) { this.eventSubs.add(cb); }
    async generateWitness(samples) {
        const r = await this.rpc({ type: 'witnessGenerate', samples });
        return new Uint8Array(r.witness);
    }
    async verifyWitness(expected) {
        const buf = expected.slice().buffer;
        const r = await this.rpc({ type: 'witnessVerify', samples: 256, expected: buf }, [buf]);
        if (r.ok)
            return { ok: true };
        return { ok: false, actual: new Uint8Array(r.actual) };
    }
    async runTransient(scene, config, seed, samples) {
        const r = await this.rpc({
            type: 'runTransient',
            scene: JSON.stringify(scene),
            config: JSON.stringify(config),
            seed: Number(seed & 0xffffffffn),
            samples,
        });
        return {
            bRecoveredT: [r.bRecoveredT[0], r.bRecoveredT[1], r.bRecoveredT[2]],
            bMagT: r.bMagT,
            noiseFloorPtSqrtHz: r.noiseFloorPtSqrtHz,
            sigmaPt: [r.sigmaPt[0], r.sigmaPt[1], r.sigmaPt[2]],
            nFrames: r.nFrames,
            witnessHex: r.witnessHex,
        };
    }
    async exportProofBundle() {
        // Bundle = REFERENCE_SCENE_JSON + computed witness hex + version. Wraps
        // the same artifacts `Proof::generate` produces natively. ADR-092 §6.1.
        const w = await this.generateWitness(256);
        const hex = Array.from(w).map((b) => b.toString(16).padStart(2, '0')).join('');
        const info = this.bootInfo ?? (await this.boot());
        const manifest = JSON.stringify({
            kind: 'nvsim-proof-bundle',
            version: info.buildVersion,
            seed: '0x0000002A',
            nSamples: 256,
            witness: hex,
            expected: info.expectedWitnessHex,
            ok: hex === info.expectedWitnessHex,
            ts: new Date().toISOString(),
        }, null, 2);
        return new Blob([manifest], { type: 'application/json' });
    }
    async buildId() {
        const r = await this.rpc({ type: 'buildId' });
        return r.buildId;
    }
    async close() {
        this.worker.terminate();
    }
}
