// ============================================
// Brevo (antigo Sendinblue) - Envio de e-mails
// Configuração e função de envio de e-mail transacional
// ============================================
const { BrevoClient } = require('@getbrevo/brevo');

// Cliente Brevo com a API key do ambiente
const client = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY || ''
});

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'acheei@contato.com';
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Acheei';

/**
 * Envia um e-mail transacional via Brevo.
 * @param {Object} params - Parâmetros do envio
 * @param {string} params.toEmail - E-mail do destinatário
 * @param {string} params.toName - Nome do destinatário
 * @param {string} params.subject - Assunto do e-mail
 * @param {string} params.htmlContent - Conteúdo HTML do e-mail
 * @param {string} [params.textContent] - Versão em texto puro (opcional)
 * @returns {Promise<Object>} - Resposta da API (messageId)
 */
async function sendEmail(params) {
  const payload = {
    sender: {
      email: SENDER_EMAIL,
      name: SENDER_NAME
    },
    to: [
      {
        email: params.toEmail,
        name: params.toName || params.toEmail
      }
    ],
    subject: params.subject,
    htmlContent: params.htmlContent
  };

  if (params.textContent) payload.textContent = params.textContent;

  const response = await client.transactionalEmails.sendTransacEmail(payload);
  return response;
}

module.exports = {
  sendEmail,
  SENDER_EMAIL,
  SENDER_NAME
};
