// ============================================
// Configuração do Mercado Pago
// Checkout Pro - Liberação de chat para profissionais
// ============================================
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
const isConfigured = ACCESS_TOKEN.length > 0 && ACCESS_TOKEN !== 'SEU_TOKEN_AQUI';

// Valor cobrado para liberar o chat com o cliente
const VALOR_LIBERACAO_CHAT = 14.99;

// Instancia o SDK apenas se houver token configurado
const client = isConfigured ? new MercadoPagoConfig({ accessToken: ACCESS_TOKEN }) : null;
const preference = isConfigured ? new Preference(client) : null;
const payment = isConfigured ? new Payment(client) : null;

// URL base do site (usada nos back_urls e notification_url)
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function isTestToken() {
  return ACCESS_TOKEN.startsWith('TEST-');
}

// Pega a URL do checkout (sandbox ou produção)
function getInitPoint(preferenceResult) {
  if (!preferenceResult) return '';
  return isTestToken()
    ? preferenceResult.sandbox_init_point || preferenceResult.init_point
    : preferenceResult.init_point || preferenceResult.sandbox_init_point;
}

module.exports = {
  client,
  preference,
  payment,
  isConfigured,
  isTestToken,
  getInitPoint,
  VALOR_LIBERACAO_CHAT,
  APP_URL
};

