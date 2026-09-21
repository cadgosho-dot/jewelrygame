import fs from 'node:fs';

const FILES = [
  'assets/images/events/dog-search-cabbage.png',
  'assets/images/events/dog-search-shepherd.png',
];

function inspectPng(path) {
  const data = fs.readFileSync(path);
  const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  if (data.length < 33 || !data.subarray(0,8).equals(sig)) {
    throw new Error(`${path}: PNG signature is invalid`);
  }
  let offset = 8;
  let ihdr = null;
  let hasTransparencyChunk = false;
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString('ascii');
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > data.length) throw new Error(`${path}: truncated PNG chunk ${type}`);
    if (type === 'IHDR') {
      if (length !== 13) throw new Error(`${path}: invalid IHDR length`);
      ihdr = {
        width:data.readUInt32BE(start),
        height:data.readUInt32BE(start + 4),
        colorType:data[start + 9],
      };
    }
    if (type === 'tRNS') hasTransparencyChunk = true;
    offset = end + 4;
    if (type === 'IEND') break;
  }
  if (!ihdr || ihdr.width < 1 || ihdr.height < 1) throw new Error(`${path}: IHDR missing`);
  const alpha = ihdr.colorType === 4 || ihdr.colorType === 6 || hasTransparencyChunk;
  if (!alpha) throw new Error(`${path}: transparent PNG is required`);
  return { ...ihdr, bytes:data.length };
}

for (const path of FILES) {
  const info = inspectPng(path);
  console.log(`OK: ${path} ${info.width}x${info.height} ${info.bytes} bytes`);
}
console.log('DOG SEARCH ASSETS: PASS');
