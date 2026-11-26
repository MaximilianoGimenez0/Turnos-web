import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const SENSITIVE_KEY_PATTERN = /(KEY|TOKEN|SECRET|PASSWORD|PASS|CREDENTIAL|PRIVATE)/i;

export const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) return {};
  const raw = readFileSync(filePath, 'utf8');
  const result = {};

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) {
      result[key] = value;
    }
  }

  return result;
};

export const maskSecretValue = (value) => {
  const str = String(value ?? '').trim();
  if (!str) return '(vacío)';
  if (str.length <= 6) return '****';
  if (str.length <= 12) return `${str.slice(0, 2)}****${str.slice(-2)}`;
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
};

export const formatEnvValueForDisplay = (key, value) => {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return maskSecretValue(value);
  }
  return String(value ?? '').trim() || '(vacío)';
};

export const readDefaultProjectId = (repoRoot = REPO_ROOT) => {
  const envProject =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.VITE_FIREBASE_PROJECT_ID;

  if (envProject && envProject.trim()) {
    return envProject.trim();
  }

  const firebasercPath = path.join(repoRoot, '.firebaserc');
  if (existsSync(firebasercPath)) {
    try {
      const raw = JSON.parse(readFileSync(firebasercPath, 'utf8'));
      const defaultProject = raw?.projects?.default;
      if (typeof defaultProject === 'string' && defaultProject.trim()) {
        return defaultProject.trim();
      }
    } catch {
      // Fallback below
    }
  }

  return 'turnos-web-eb8b5';
};

export const readDefaultStorageBucket = (projectId, repoRoot = REPO_ROOT) => {
  const envBucket =
    process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (envBucket && envBucket.trim()) {
    return envBucket.trim();
  }

  const rootEnv = parseEnvFile(path.join(repoRoot, '.env'));
  if (rootEnv.VITE_FIREBASE_STORAGE_BUCKET && rootEnv.VITE_FIREBASE_STORAGE_BUCKET.trim()) {
    return rootEnv.VITE_FIREBASE_STORAGE_BUCKET.trim();
  }

  return `${projectId}.firebasestorage.app`;
};

export const extractEmailAddressFromFromHeader = (fromHeader) => {
  const raw = String(fromHeader ?? '').trim();
  if (!raw) return '';
  const angleMatch = raw.match(/<([^>]+)>/);
  return (angleMatch ? angleMatch[1] : raw).trim();
};

export const auditEnvConfig = ({
  rootEnv = {},
  functionsEnv = {},
  hasRootEnvFile = true,
  hasFunctionsEnvFile = true,
} = {}) => {
  const checks = [];

  const requiredFrontendKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  if (!hasRootEnvFile) {
    checks.push({
      level: 'warn',
      scope: 'frontend (.env)',
      message: 'No se encontró archivo .env en la raíz del proyecto.',
    });
  } else {
    const missing = requiredFrontendKeys.filter(
      (key) => !rootEnv[key] || rootEnv[key].includes('tu-proyecto')
    );
    if (missing.length > 0) {
      checks.push({
        level: 'error',
        scope: 'frontend (.env)',
        message: `Faltan o tienen placeholders: ${missing.join(', ')}`,
      });
    } else {
      checks.push({
        level: 'ok',
        scope: 'frontend (.env)',
        message: `Variables VITE_FIREBASE_* completas (proyecto: ${rootEnv.VITE_FIREBASE_PROJECT_ID}).`,
      });
    }
  }

  if (!hasFunctionsEnvFile) {
    checks.push({
      level: 'warn',
      scope: 'backend (functions/.env)',
      message: 'No se encontró functions/.env (necesario para despliegues con env local).',
    });
    return checks;
  }

  const clientAppUrl = String(functionsEnv.CLIENT_APP_URL || '').trim();
  if (!clientAppUrl) {
    checks.push({
      level: 'error',
      scope: 'CLIENT_APP_URL',
      message: 'No está definido en functions/.env.',
    });
  } else if (/localhost|127\.0\.0\.1/i.test(clientAppUrl)) {
    checks.push({
      level: 'warn',
      scope: 'CLIENT_APP_URL',
      message: `Apunta a entorno local (${clientAppUrl}). Cambialo por tu dominio HTTPS antes de desplegar.`,
    });
  } else if (!/^https:\/\//i.test(clientAppUrl)) {
    checks.push({
      level: 'warn',
      scope: 'CLIENT_APP_URL',
      message: `Se recomienda HTTPS en producción (valor actual: ${clientAppUrl}).`,
    });
  } else {
    checks.push({
      level: 'ok',
      scope: 'CLIENT_APP_URL',
      message: `Configurado en ${clientAppUrl}.`,
    });
  }

  const webhookUrl = String(functionsEnv.MP_WEBHOOK_URL || '').trim();
  if (!webhookUrl) {
    checks.push({
      level: 'warn',
      scope: 'MP_WEBHOOK_URL',
      message: 'Vacío; se usará el fallback automático basado en GCLOUD_PROJECT.',
    });
  } else if (webhookUrl.includes('tu-proyecto-id')) {
    checks.push({
      level: 'error',
      scope: 'MP_WEBHOOK_URL',
      message: 'Contiene el placeholder "tu-proyecto-id". Actualizalo con tu projectId real.',
    });
  } else {
    checks.push({
      level: 'ok',
      scope: 'MP_WEBHOOK_URL',
      message: `Configurado en ${webhookUrl}.`,
    });
  }

  const awsRegion = String(functionsEnv.AWS_REGION || '').trim();
  if (!awsRegion || /placeholder|tu-region|your-region/i.test(awsRegion)) {
    checks.push({
      level: 'error',
      scope: 'AWS_REGION',
      message: 'No está definido o contiene un placeholder en functions/.env (ej: us-east-1).',
    });
  } else if (!/^[a-z]{2}(?:-[a-z]+)+-\d+$/i.test(awsRegion)) {
    checks.push({
      level: 'error',
      scope: 'AWS_REGION',
      message: `Región AWS inválida "${awsRegion}" (ej: us-east-1, sa-east-1).`,
    });
  } else {
    checks.push({
      level: 'ok',
      scope: 'AWS_REGION',
      message: `Configurado (${awsRegion}).`,
    });
  }

  const awsAccessKeyId = String(functionsEnv.AWS_ACCESS_KEY_ID || '').trim();
  if (
    !awsAccessKeyId ||
    /placeholder|akia_tu_|tu_access_key|your_access_key/i.test(awsAccessKeyId)
  ) {
    checks.push({
      level: 'warn',
      scope: 'AWS_ACCESS_KEY_ID',
      message:
        'No configurado o con valor de ejemplo (los correos por Amazon SES no se despacharán).',
    });
  } else {
    checks.push({
      level: 'ok',
      scope: 'AWS_ACCESS_KEY_ID',
      message: `Configurado (${maskSecretValue(awsAccessKeyId)}).`,
    });
  }

  const awsSecretAccessKey = String(functionsEnv.AWS_SECRET_ACCESS_KEY || '').trim();
  if (
    !awsSecretAccessKey ||
    /placeholder|tu_secret_access_key|your_secret_key/i.test(awsSecretAccessKey)
  ) {
    checks.push({
      level: 'warn',
      scope: 'AWS_SECRET_ACCESS_KEY',
      message:
        'No configurado o con valor de ejemplo (los correos por Amazon SES no se despacharán).',
    });
  } else {
    checks.push({
      level: 'ok',
      scope: 'AWS_SECRET_ACCESS_KEY',
      message: `Configurado (${maskSecretValue(awsSecretAccessKey)}).`,
    });
  }

  const fromHeader = String(functionsEnv.SES_FROM_EMAIL || '').trim();
  const fromAddress = extractEmailAddressFromFromHeader(fromHeader);
  if (!fromHeader) {
    checks.push({
      level: 'warn',
      scope: 'SES_FROM_EMAIL',
      message: 'No está definido (usará fallback Turneado <noreply@turneado.app>).',
    });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fromAddress)) {
    checks.push({
      level: 'error',
      scope: 'SES_FROM_EMAIL',
      message: `Dirección inválida "${fromHeader}" (debe incluir usuario@dominio válido, ej: Turneado <noreply@turneado.app>).`,
    });
  } else if (/(?:example\.com|ejemplo\.com|test\.local|localhost)$/i.test(fromAddress)) {
    checks.push({
      level: 'warn',
      scope: 'SES_FROM_EMAIL',
      message: `Usa dominio de prueba (${fromAddress}). Verificá tu dominio propio en Amazon SES para producción.`,
    });
  } else {
    checks.push({
      level: 'ok',
      scope: 'SES_FROM_EMAIL',
      message: `Configurado (${fromHeader}).`,
    });
  }

  const sesConfigSet = String(functionsEnv.SES_CONFIGURATION_SET || '').trim();
  checks.push({
    level: 'ok',
    scope: 'SES_CONFIGURATION_SET',
    message: sesConfigSet
      ? `Configurado (${sesConfigSet}).`
      : 'Omitido intencionalmente (opcional).',
  });

  const mpToken = String(functionsEnv.MP_ACCESS_TOKEN || '').trim();
  if (!mpToken) {
    checks.push({
      level: 'warn',
      scope: 'MP_ACCESS_TOKEN',
      message: 'Sin token global de respaldo para modo Demo (isDemo: true).',
    });
  } else if (mpToken.startsWith('APP_USR-')) {
    checks.push({
      level: 'warn',
      scope: 'MP_ACCESS_TOKEN',
      message: `Token de PRODUCCIÓN (${maskSecretValue(mpToken)}) cargado en respaldo Demo. Verificá si preferís TEST-... para /demo.`,
    });
  } else if (mpToken.startsWith('TEST-')) {
    checks.push({
      level: 'ok',
      scope: 'MP_ACCESS_TOKEN',
      message: `Token de prueba (${maskSecretValue(mpToken)}) listo para respaldo Demo.`,
    });
  } else {
    checks.push({
      level: 'error',
      scope: 'MP_ACCESS_TOKEN',
      message: 'Formato inválido (debe comenzar con APP_USR- o TEST-).',
    });
  }

  return checks;
};
