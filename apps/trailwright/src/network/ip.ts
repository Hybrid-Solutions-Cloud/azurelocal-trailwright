// Small IPv4 helpers for the management network checks.
export const toNum = (ip: string | undefined): number | undefined => {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec((ip ?? '').trim());
  if (!m) return undefined;
  const parts = m.slice(1).map(Number);
  if (parts.some((x) => x > 255)) return undefined;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
};

export const inRange = (ip: string, cidrBase: string, bits: number): boolean => {
  const n = toNum(ip);
  const b = toNum(cidrBase);
  if (n === undefined || b === undefined) return false;
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (n & mask) === (b & mask);
};

// Ranges the platform reserves for its internal Kubernetes services and pods (Arc Resource Bridge and AKS).
export const reservedRanges = [
  { base: '10.96.0.0', bits: 12, label: '10.96.0.0/12' },
  { base: '10.244.0.0', bits: 16, label: '10.244.0.0/16' },
];

export const reservedRangeOf = (ip: string): string | undefined => reservedRanges.find((r) => inRange(ip, r.base, r.bits))?.label;

export const maskBits = (mask: string): number | undefined => {
  const n = toNum(mask);
  if (n === undefined) return undefined;
  let bits = 0;
  let seenZero = false;
  for (let i = 31; i >= 0; i--) {
    const one = ((n >>> i) & 1) === 1;
    if (one && seenZero) return undefined;
    if (one) bits++;
    else seenZero = true;
  }
  return bits;
};

export const sameSubnet = (a: string, b: string, mask: string): boolean => {
  const bits = maskBits(mask);
  const nb = toNum(b);
  return bits !== undefined && nb !== undefined && inRange(a, b, bits);
};