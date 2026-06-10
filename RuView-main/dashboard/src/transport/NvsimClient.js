/* Common NvsimClient interface — both WasmClient and WsClient implement it.
 * Dashboard binds to this interface and never to a concrete client.
 * Aligns with ADR-092 §5.2.
 */
/** Parse one MagFrame from a 60-byte slice. Layout matches `nvsim::frame`. */
export function parseMagFrame(view, offset, raw) {
    // v1 layout: magic(u32) | version(u16) | flags(u16) | sensor_id(u16) | _reserved(u16) |
    //            t_us(u64) | b_pt[3](f32) | sigma_pt[3](f32) | noise_floor_pt_sqrt_hz(f32) |
    //            temperature_k(f32) — 60 bytes total. All little-endian.
    const magic = view.getUint32(offset + 0, true);
    const version = view.getUint16(offset + 4, true);
    const flags = view.getUint16(offset + 6, true);
    const sensorId = view.getUint16(offset + 8, true);
    // skip 2 bytes reserved at offset+10
    const tUs = view.getBigUint64(offset + 12, true);
    const bx = view.getFloat32(offset + 20, true);
    const by = view.getFloat32(offset + 24, true);
    const bz = view.getFloat32(offset + 28, true);
    const sx = view.getFloat32(offset + 32, true);
    const sy = view.getFloat32(offset + 36, true);
    const sz = view.getFloat32(offset + 40, true);
    const noiseFloorPtSqrtHz = view.getFloat32(offset + 44, true);
    const temperatureK = view.getFloat32(offset + 48, true);
    return {
        magic,
        version,
        flags,
        sensorId,
        tUs,
        bPt: [bx, by, bz],
        sigmaPt: [sx, sy, sz],
        noiseFloorPtSqrtHz,
        temperatureK,
        raw: raw.subarray(offset, offset + 60),
    };
}
export function parseFrameBatch(bytes) {
    const frameSize = 60;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = [];
    for (let off = 0; off + frameSize <= bytes.byteLength; off += frameSize) {
        out.push(parseMagFrame(view, off, bytes));
    }
    return out;
}
