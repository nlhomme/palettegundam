// Minimal STORE-only ZIP writer. Builds a single Uint8Array.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function utf8(str) {
  return new TextEncoder().encode(str);
}

function writeU16(view, off, val) { view.setUint16(off, val, true); }
function writeU32(view, off, val) { view.setUint32(off, val, true); }

// files: Array<{ name: string, data: Uint8Array | string }>
export function buildZip(files) {
  const entries = files.map((f) => {
    const nameBytes = utf8(f.name);
    const dataBytes = typeof f.data === 'string' ? utf8(f.data) : f.data;
    return {
      nameBytes,
      dataBytes,
      crc: crc32(dataBytes),
      size: dataBytes.length,
    };
  });

  let totalLfh = 0;
  let totalCdh = 0;
  for (const e of entries) {
    totalLfh += 30 + e.nameBytes.length + e.size;
    totalCdh += 46 + e.nameBytes.length;
  }
  const totalSize = totalLfh + totalCdh + 22;
  const buf = new Uint8Array(totalSize);
  const view = new DataView(buf.buffer);

  let off = 0;
  const lfhOffsets = [];

  for (const e of entries) {
    lfhOffsets.push(off);
    writeU32(view, off, 0x04034b50); off += 4;        // local file header signature
    writeU16(view, off, 20); off += 2;                // version needed
    writeU16(view, off, 0x0800); off += 2;            // flags (UTF-8 name)
    writeU16(view, off, 0); off += 2;                 // compression: STORE
    writeU16(view, off, 0); off += 2;                 // mod time
    writeU16(view, off, 0x21); off += 2;              // mod date (1980-01-01)
    writeU32(view, off, e.crc); off += 4;             // CRC-32
    writeU32(view, off, e.size); off += 4;            // compressed size
    writeU32(view, off, e.size); off += 4;            // uncompressed size
    writeU16(view, off, e.nameBytes.length); off += 2;
    writeU16(view, off, 0); off += 2;                 // extra length
    buf.set(e.nameBytes, off); off += e.nameBytes.length;
    buf.set(e.dataBytes, off); off += e.size;
  }

  const cdStart = off;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    writeU32(view, off, 0x02014b50); off += 4;        // central directory signature
    writeU16(view, off, 20); off += 2;                // version made by
    writeU16(view, off, 20); off += 2;                // version needed
    writeU16(view, off, 0x0800); off += 2;            // flags
    writeU16(view, off, 0); off += 2;                 // compression
    writeU16(view, off, 0); off += 2;                 // mod time
    writeU16(view, off, 0x21); off += 2;              // mod date
    writeU32(view, off, e.crc); off += 4;
    writeU32(view, off, e.size); off += 4;
    writeU32(view, off, e.size); off += 4;
    writeU16(view, off, e.nameBytes.length); off += 2;
    writeU16(view, off, 0); off += 2;                 // extra
    writeU16(view, off, 0); off += 2;                 // comment
    writeU16(view, off, 0); off += 2;                 // disk start
    writeU16(view, off, 0); off += 2;                 // internal attr
    writeU32(view, off, 0); off += 4;                 // external attr
    writeU32(view, off, lfhOffsets[i]); off += 4;     // LFH offset
    buf.set(e.nameBytes, off); off += e.nameBytes.length;
  }

  const cdSize = off - cdStart;
  writeU32(view, off, 0x06054b50); off += 4;          // EOCD signature
  writeU16(view, off, 0); off += 2;                   // disk number
  writeU16(view, off, 0); off += 2;                   // disk with cd start
  writeU16(view, off, entries.length); off += 2;      // entries on this disk
  writeU16(view, off, entries.length); off += 2;      // total entries
  writeU32(view, off, cdSize); off += 4;
  writeU32(view, off, cdStart); off += 4;
  writeU16(view, off, 0); off += 2;                   // comment length

  return buf;
}
