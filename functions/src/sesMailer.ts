import { createHash } from 'node:crypto';
import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandOutput,
} from '@aws-sdk/client-sesv2';

export interface SesSendEmailParams {
  from: string;
  to: string[];
  replyTo?: string[];
  subject: string;
  html: string;
  text: string;
}

export interface SesSendEmailOutcome {
  ok: boolean;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export type SesCommandSender = (command: SendEmailCommand) => Promise<SendEmailCommandOutput>;

const DEFAULT_SES_FROM_EMAIL = 'Turneado <noreply@turneado.app>';
const AWS_REGION_PATTERN = /^[a-z]{2}(?:-[a-z]+)+-\d+$/i;
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PURE_ASCII_PRINTABLE_PATTERN = /^[ -~]+$/;

const PLACEHOLDER_FRAGMENTS = [
  'placeholder',
  'tu_access_key',
  'tu_secret_access_key',
  'your_access_key',
  'your_secret_key',
  'akia_tu_',
  'ejemplo',
];

let cachedSesClient: SESv2Client | null = null;
let cachedSesFingerprint: string | null = null;
let customSesSender: SesCommandSender | null = null;

const isPlaceholderValue = (value: string): boolean => {
  const lower = value.toLowerCase();
  return PLACEHOLDER_FRAGMENTS.some((fragment) => lower.includes(fragment));
};

export const getAwsRegion = (): string => (process.env.AWS_REGION || '').trim();

const getAwsAccessKeyId = (): string => (process.env.AWS_ACCESS_KEY_ID || '').trim();

const getAwsSecretAccessKey = (): string => (process.env.AWS_SECRET_ACCESS_KEY || '').trim();

export const getSesFromEmail = (): string =>
  (process.env.SES_FROM_EMAIL || DEFAULT_SES_FROM_EMAIL).trim();

export const getSesConfigurationSet = (): string =>
  (process.env.SES_CONFIGURATION_SET || '').trim();

export const extractEmailAddress = (fromHeader: string): string => {
  const raw = (fromHeader || '').trim();
  if (!raw) return '';
  const angleMatch = raw.match(/<([^>]+)>/);
  return (angleMatch ? angleMatch[1] : raw).trim();
};

const isValidRegion = (region: string): boolean =>
  Boolean(region) && !isPlaceholderValue(region) && AWS_REGION_PATTERN.test(region);

const isValidCredential = (value: string): boolean =>
  Boolean(value) && !isPlaceholderValue(value) && value.length >= 16;

const isValidFromAddress = (fromHeader: string): boolean => {
  const address = extractEmailAddress(fromHeader);
  return Boolean(address) && !isPlaceholderValue(address) && EMAIL_ADDRESS_PATTERN.test(address);
};

export const isSesConfigured = (): boolean => {
  const region = getAwsRegion();
  const accessKeyId = getAwsAccessKeyId();
  const secretAccessKey = getAwsSecretAccessKey();
  const fromHeader = getSesFromEmail();

  return (
    isValidRegion(region) &&
    isValidCredential(accessKeyId) &&
    isValidCredential(secretAccessKey) &&
    isValidFromAddress(fromHeader)
  );
};

const buildConfigFingerprint = (
  region: string,
  accessKeyId: string,
  secretAccessKey: string
): string =>
  createHash('sha256')
    .update(`${region}\0${accessKeyId}\0${secretAccessKey}`)
    .digest('hex');

const getSesClient = (): SESv2Client | null => {
  if (!isSesConfigured()) return null;

  const region = getAwsRegion();
  const accessKeyId = getAwsAccessKeyId();
  const secretAccessKey = getAwsSecretAccessKey();
  const fingerprint = buildConfigFingerprint(region, accessKeyId, secretAccessKey);

  if (cachedSesClient && cachedSesFingerprint === fingerprint) {
    return cachedSesClient;
  }

  cachedSesClient = new SESv2Client({
    region,
    maxAttempts: process.env.FUNCTIONS_EMULATOR === 'true' ? 2 : 3,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  cachedSesFingerprint = fingerprint;
  return cachedSesClient;
};

export const resetSesClientForTesting = (): void => {
  cachedSesClient = null;
  cachedSesFingerprint = null;
  customSesSender = null;
};

export const setSesSenderForTesting = (sender: SesCommandSender | null): void => {
  customSesSender = sender;
};

/**
 * Formats a multitenant RFC 5322 / RFC 2047 From header using the verified SES address
 * (e.g. noreply@turneado.app) and the business display name.
 */
export const formatSesFromHeader = (businessName?: string): string => {
  const baseFrom = getSesFromEmail();
  const cleanName = (businessName || '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\r\n\u0000-\u001F\u007F<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

  if (!cleanName || cleanName.toLowerCase() === 'turneado') {
    return baseFrom;
  }

  const address = extractEmailAddress(baseFrom);
  if (!address || !EMAIL_ADDRESS_PATTERN.test(address)) {
    return baseFrom;
  }

  if (PURE_ASCII_PRINTABLE_PATTERN.test(cleanName)) {
    const escapedAscii = cleanName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escapedAscii}" <${address}>`;
  }

  const encodedWord = `=?UTF-8?B?${Buffer.from(cleanName, 'utf8').toString('base64')}?=`;
  return `${encodedWord} <${address}>`;
};

const classifySesError = (err: unknown): { errorCode: string; errorMessage: string } => {
  const errorObj = err as {
    name?: string;
    Code?: string;
    message?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const rawName = (errorObj?.name || errorObj?.Code || 'SesSendError').trim();
  const rawMessage =
    (typeof errorObj?.message === 'string' && errorObj.message.trim()) ||
    (err instanceof Error ? err.message : String(err));
  const statusCode = errorObj?.$metadata?.httpStatusCode;

  switch (rawName) {
    case 'MessageRejected':
      return {
        errorCode: 'MessageRejected',
        errorMessage: `Amazon SES rechazó el mensaje: ${rawMessage}`,
      };
    case 'MailFromDomainNotVerifiedException':
      return {
        errorCode: 'MailFromDomainNotVerifiedException',
        errorMessage: `Dominio o identidad MAIL FROM no verificada en Amazon SES: ${rawMessage}`,
      };
    case 'AccountSendingPausedException':
    case 'SendingPausedException':
      return {
        errorCode: rawName,
        errorMessage: `El envío de correos está pausado en Amazon SES (${rawName}): ${rawMessage}`,
      };
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return {
        errorCode: rawName,
        errorMessage: `Límite o cuota de envío superada en Amazon SES (${rawName}): ${rawMessage}`,
      };
    case 'BadRequestException':
    case 'InvalidParameterValue':
      return {
        errorCode: rawName,
        errorMessage: `Parámetros o encabezados inválidos para Amazon SES (${rawName}): ${rawMessage}`,
      };
    case 'CredentialsProviderError':
    case 'UnrecognizedClientException':
    case 'InvalidSignatureException':
      return {
        errorCode: rawName,
        errorMessage: `Error de credenciales o región de AWS SES (${rawName}): ${rawMessage}`,
      };
    default:
      return {
        errorCode: rawName,
        errorMessage: statusCode ? `[HTTP ${statusCode}] ${rawMessage}` : rawMessage,
      };
  }
};

export async function sendSesEmail(params: SesSendEmailParams): Promise<SesSendEmailOutcome> {
  if (!isSesConfigured()) {
    return {
      ok: false,
      errorCode: 'SesNotConfigured',
      errorMessage:
        'Amazon SES no está configurado correctamente (verificá AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y SES_FROM_EMAIL).',
    };
  }

  const toAddresses = params.to.map((addr) => addr.trim()).filter(Boolean);
  if (toAddresses.length === 0) {
    return {
      ok: false,
      errorCode: 'InvalidRecipient',
      errorMessage: 'No se especificaron destinatarios válidos para el correo.',
    };
  }

  const replyToAddresses = (params.replyTo || []).map((addr) => addr.trim()).filter(Boolean);
  const configurationSetName = getSesConfigurationSet();

  const command = new SendEmailCommand({
    FromEmailAddress: params.from,
    Destination: {
      ToAddresses: toAddresses,
    },
    ...(replyToAddresses.length > 0 ? { ReplyToAddresses: replyToAddresses } : {}),
    Content: {
      Simple: {
        Subject: {
          Data: params.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: params.html,
            Charset: 'UTF-8',
          },
          Text: {
            Data: params.text,
            Charset: 'UTF-8',
          },
        },
      },
    },
    ...(configurationSetName ? { ConfigurationSetName: configurationSetName } : {}),
  });

  try {
    let response: SendEmailCommandOutput;
    if (customSesSender) {
      response = await customSesSender(command);
    } else {
      const client = getSesClient();
      if (!client) {
        return {
          ok: false,
          errorCode: 'SesNotConfigured',
          errorMessage: 'Cliente de Amazon SES no disponible por configuración incompleta.',
        };
      }
      const timeoutMs = 10000;
      response = await client.send(command, {
        abortSignal: AbortSignal.timeout(timeoutMs),
      });
    }

    return {
      ok: true,
      messageId: response?.MessageId,
    };
  } catch (err: unknown) {
    const classified = classifySesError(err);
    return {
      ok: false,
      errorCode: classified.errorCode,
      errorMessage: classified.errorMessage,
    };
  }
}
