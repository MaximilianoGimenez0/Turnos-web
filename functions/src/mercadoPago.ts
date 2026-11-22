import type { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import * as logger from 'firebase-functions/logger';

let cachedClient: MercadoPagoConfig | null = null;
let cachedPreference: Preference | null = null;
let cachedPayment: Payment | null = null;
let warnedMissingToken = false;

const getMpClient = async (): Promise<MercadoPagoConfig> => {
  if (cachedClient) return cachedClient;

  const mpAccessToken = (process.env.MP_ACCESS_TOKEN || '').trim();
  if (!mpAccessToken && !warnedMissingToken) {
    warnedMissingToken = true;
    logger.warn(
      '[MercadoPago] MP_ACCESS_TOKEN no está definida en functions/.env.'
    );
  }

  const { MercadoPagoConfig: MercadoPagoConfigCtor } = await import('mercadopago');
  cachedClient = new MercadoPagoConfigCtor({
    accessToken: mpAccessToken,
    options: {
      timeout: 7000,
    },
  });
  return cachedClient;
};

export const getPreferenceClient = async (): Promise<Preference> => {
  if (cachedPreference) return cachedPreference;
  const client = await getMpClient();
  const { Preference: PreferenceCtor } = await import('mercadopago');
  cachedPreference = new PreferenceCtor(client);
  return cachedPreference;
};

export const getPaymentClient = async (): Promise<Payment> => {
  if (cachedPayment) return cachedPayment;
  const client = await getMpClient();
  const { Payment: PaymentCtor } = await import('mercadopago');
  cachedPayment = new PaymentCtor(client);
  return cachedPayment;
};
