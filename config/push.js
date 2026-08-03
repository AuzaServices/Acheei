// ============================================
// Configuração de Notificações Push (Web Push)
// Acheei - Notificações para Clientes
// ============================================
const webpush = require('web-push');

// Chaves VAPID (geradas para a plataforma Acheei)
const VAPID_PUBLIC_KEY = 'BAIo2JpxKMvRWXkG2vxC1ROrSVkoTp5TGem_anQI0KlWwsN3va6GSSF8LRc13Xh8aG3yRAbdWHTGKVUZxYRJXvw';
const VAPID_PRIVATE_KEY = 'ZUYDlyocvuuWkj8_LFYlnSoPquLpUyfkQSKRngudtMk';

// Email de contato (necessário para identificação do remetente)
const VAPID_SUBJECT = process.env.PUSH_SUBJECT || 'mailto:contato@acheei.com.br';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ============================================
// Enviar notificação push para uma assinatura
// ============================================
async function enviarNotificacao(subscription, payload) {
  if (!subscription || !subscription.endpoint) {
    console.log('Assinatura push inválida, pulando notificação');
    return { success: false, error: 'Assinatura inválida' };
  }

  try {
    // Converte subscription de string JSON se necessário
    let sub = subscription;
    if (typeof subscription === 'string') {
      try {
        sub = JSON.parse(subscription);
      } catch (e) {
        console.error('Erro ao parsear assinatura push:', e);
        return { success: false, error: 'Assinatura inválida' };
      }
    }

    const result = await webpush.sendNotification(sub, JSON.stringify(payload));
    console.log(`✅ Notificação push enviada para ${sub.endpoint.substring(0, 50)}...`);
    return { success: true, statusCode: result.statusCode };
  } catch (error) {
    // 404/410 = assinatura expirada/inválida, deve ser removida
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log(`⚠️ Assinatura push expirada/inválida: ${error.statusCode}`);
      return { success: false, expired: true, error: error.message };
    }
    console.error('Erro ao enviar notificação push:', error.message || error);
    return { success: false, error: error.message || 'Erro ao enviar notificação' };
  }
}

// ============================================
// Enviar notificação para um cliente por ID
// (busca a assinatura no banco)
// ============================================
async function notificarCliente(db, clienteId, payload) {
  return new Promise((resolve) => {
    if (!clienteId) return resolve({ success: false, error: 'Cliente sem ID' });

    db.query(
      'SELECT push_subscription FROM clientes WHERE id = ?',
      [clienteId],
      (err, results) => {
        if (err) {
          console.error('Erro ao buscar assinatura push do cliente:', err);
          return resolve({ success: false, error: 'Erro ao buscar assinatura' });
        }
        if (results.length === 0 || !results[0].push_subscription) {
          console.log(`Cliente ${clienteId} não possui assinatura push cadastrada`);
          return resolve({ success: false, error: 'Sem assinatura' });
        }

        enviarNotificacao(results[0].push_subscription, payload).then((result) => {
          // Se a assinatura expirou, limpar do banco
          if (result.expired) {
            db.query(
              'UPDATE clientes SET push_subscription = NULL WHERE id = ?',
              [clienteId],
              (clearErr) => {
                if (clearErr) console.error('Erro ao limpar assinatura expirada:', clearErr);
              }
            );
          }
          resolve(result);
        });
      }
    );
  });
}

module.exports = {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
  enviarNotificacao,
  notificarCliente
};

