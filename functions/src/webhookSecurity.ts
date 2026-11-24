import { createHmac, timingSafeEqual } from 'crypto';

export interface SignatureVerificationResult {
  verified: boolean;
  enforced: boolean;
  reason?: string;
}

const parseSignatureHeader = (
  headerValue: string
): { ts: string | null; v1: string | null } => {
  let ts: string | null = null;
  let v1: string | null = null;

  for (const part of headerValue.split(',')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim().toLowerCase();
    const val = part.slice(eqIdx + 1).trim();
    if (key === 'ts' && val) ts = val;
    if (key === 'v1' && val) v1 = val;
  }

  return { ts, v1 };
};

export const verifyMercadoPagoSignature = (params: {
  xSignatureHeader?: string;
  xRequestIdHeader?: string;
  dataId?: string;
  secret?: string;
}): SignatureVerificationResult => {
  const secret = (params.secret || '').trim();
  if (!secret || secret.includes('placeholder') || secret.includes('tu-webhook-secret')) {
    return {
      verified: true,
      enforced: false,
      reason: 'secret_not_configured',
    };
  }

  const signatureHeader = (params.xSignatureHeader || '').trim();
  if (!signatureHeader) {
    return {
      verified: false,
      enforced: true,
      reason: 'missing_signature_header',
    };
  }

  const { ts, v1 } = parseSignatureHeader(signatureHeader);
  if (!ts || !v1) {
    return {
      verified: false,
      enforced: true,
      reason: 'malformed_signature_header',
    };
  }

  if (!/^[a-f0-9]+$/i.test(v1)) {
    return {
      verified: false,
      enforced: true,
      reason: 'invalid_hex_signature',
    };
  }

  const manifestParts: string[] = [];
  if (params.dataId) {
    manifestParts.push(`id:${params.dataId.toLowerCase()};`);
  }
  if (params.xRequestIdHeader) {
    manifestParts.push(`request-id:${params.xRequestIdHeader};`);
  }
  manifestParts.push(`ts:${ts};`);

  const manifest = manifestParts.join('');
  const expectedHex = createHmac('sha256', secret).update(manifest).digest('hex');

  const actualBuf = Buffer.from(v1.toLowerCase(), 'hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');

  if (actualBuf.length !== expectedBuf.length) {
    return {
      verified: false,
      enforced: true,
      reason: 'signature_length_mismatch',
    };
  }

  const matches = timingSafeEqual(actualBuf, expectedBuf);
  return {
    verified: matches,
    enforced: true,
    reason: matches ? undefined : 'signature_mismatch',
  };
};

export const parsePaymentExternalReference = (
  rawRef: unknown
): { tenantId?: string; slotId?: string } => {
  if (typeof rawRef !== 'string') return {};
  const trimmed = rawRef.trim();
  if (!trimmed) return {};
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) {
    return { slotId: trimmed };
  }
  const refTenantId = trimmed.slice(0, colonIdx).trim();
  const refSlotId = trimmed.slice(colonIdx + 1).trim();
  return {
    ...(refTenantId ? { tenantId: refTenantId } : {}),
    ...(refSlotId ? { slotId: refSlotId } : {}),
  };
};
