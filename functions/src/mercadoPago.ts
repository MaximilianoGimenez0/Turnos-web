import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const mpAccessToken = process.env.MP_ACCESS_TOKEN || '';

if (!mpAccessToken) {
  console.warn(
    '[MercadoPago] ADVERTENCIA: La variable de entorno MP_ACCESS_TOKEN no está definida. Por favor agrégala en tus funciones o archivo .env.'
  );
}

export const mpClient = new MercadoPagoConfig({
  accessToken: mpAccessToken,
  options: {
    timeout: 7000,
  },
});

export const preference = new Preference(mpClient);
export const payment = new Payment(mpClient);
