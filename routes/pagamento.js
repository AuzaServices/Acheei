// ============================================
// Rotas de Pagamento - Mercado Pago
// Liberação do chat para profissionais (R$14,99)
// ============================================
const express = require('express');
const router = express.Router();
const mp = require('../config/mercadopago');

module.exports = function(db, dbConnected) {

  // ============================================
  // POST /api/pagamento/pix
  // Tenta criar pagamento PIX transparente. Se a conta não tiver chave PIX,
  // faz fallback automático para Checkout Pro (que suporta PIX na página do MP)
  // ============================================
  router.post('/pix', async (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }

    if (!mp.isConfigured) {
      return res.status(500).json({
        success: false,
        message: 'Mercado Pago não configurado. Configure o MERCADO_PAGO_ACCESS_TOKEN no arquivo .env'
      });
    }

    const { solicitacao_id, profissional_id, cliente_nome, cliente_telefone, descricao } = req.body;

    if (!solicitacao_id || !profissional_id) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: solicitacao_id, profissional_id'
      });
    }

    // Verifica se já está paga
    db.query(
      'SELECT id, status_pagamento FROM solicitacoes WHERE id = ? AND profissional_id = ?',
      [solicitacao_id, profissional_id],
      async (err, results) => {
        if (err) {
          console.error('Erro ao verificar solicitação:', err);
          return res.status(500).json({ success: false, message: 'Erro ao verificar solicitação' });
        }
        if (results.length === 0) {
          return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
        }
        if (results[0].status_pagamento === 'pago') {
          return res.status(400).json({ success: false, message: 'Esta solicitação já está paga. O chat já está liberado.' });
        }

        const sol = results[0];

        try {
          // Tenta criar pagamento PIX via API
          const { MercadoPagoConfig, Payment } = require('mercadopago');
          const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
          });
          const paymentClient = new Payment(client);

          const expirationDate = new Date(Date.now() + 30 * 60 * 1000);
          const uniqueReference = `solicitacao_${solicitacao_id}_${Date.now()}`;

          const paymentData = {
            body: {
              transaction_amount: mp.VALOR_LIBERACAO_CHAT,
              description: `Liberação de chat - Solicitação #${solicitacao_id} (${cliente_nome || 'Cliente'})`,
              payment_method_id: 'pix',
              payer: {
                email: req.body.payer_email || 'acheei@cliente.com.br',
                first_name: cliente_nome || 'Cliente',
                last_name: 'Acheei'
              },
              date_of_expiration: expirationDate.toISOString(),
              external_reference: uniqueReference
            }
          };

          const result = await paymentClient.create(paymentData);

          db.query(
            'UPDATE solicitacoes SET preference_id = ?, status_pagamento = "pendente" WHERE id = ?',
            ['payment:' + result.id.toString() + '|ref:' + uniqueReference, solicitacao_id],
            (updateErr) => {
              if (updateErr) console.error('Erro ao salvar payment_id:', updateErr);
            }
          );

          console.log(`🧾 Pagamento PIX criado para solicitação #${solicitacao_id}: payment_id=${result.id}`);

          return res.json({
            success: true,
            message: 'Pagamento PIX criado com sucesso',
            data: {
              tipo: 'pix',
              payment_id: result.id,
              status: result.status,
              qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64 || '',
              qr_code: result.point_of_interaction?.transaction_data?.qr_code || '',
              ticket_url: result.point_of_interaction?.transaction_data?.ticket_url || '',
              transaction_amount: mp.VALOR_LIBERACAO_CHAT,
              date_of_expiration: expirationDate.toISOString()
            }
          });
        } catch (error) {
          const msgPix = (error.message || '').toString();

          // Se a conta não tiver chave PIX habilitada, faz fallback para Checkout Pro
          // (que suporta PIX internamente na página do Mercado Pago)
          if (msgPix.includes('Collector user without key enabled') || msgPix.includes('key enabled')) {
            console.log(`Conta sem chave PIX para QR render. Usando Checkout Pro como fallback para solicitação #${solicitacao_id}`);
            try {
              const descricaoPagamento = descricao || sol.descricao || 'Liberação de chat com cliente';
              const payerData = req.body.payer_email ? { email: req.body.payer_email } : {};

              const uniqueReference = `solicitacao_${solicitacao_id}_${Date.now()}`;
              const preferenceData = {
                items: [
                  {
                    id: `solicitacao_${solicitacao_id}`,
                    title: `Liberação de chat - Solicitação #${solicitacao_id} (${cliente_nome || 'Cliente'})`,
                    description: descricaoPagamento,
                    quantity: 1,
                    unit_price: mp.VALOR_LIBERACAO_CHAT,
                    currency_id: 'BRL'
                  }
                ],
                payer: payerData,
                back_urls: {
                  success: `${mp.APP_URL}/profissional.html?status=success&solicitacao_id=${solicitacao_id}`,
                  pending: `${mp.APP_URL}/profissional.html?status=pending&solicitacao_id=${solicitacao_id}`,
                  failure: `${mp.APP_URL}/profissional.html?status=failure&solicitacao_id=${solicitacao_id}`
                },
                notification_url: `${mp.APP_URL}/api/pagamento/webhook`,
                external_reference: uniqueReference,
                statement_descriptor: 'ACHEEI',
                payment_methods: {
                  installments: 1
                }
              };

              if (mp.APP_URL.startsWith('https://')) {
                preferenceData.auto_return = 'approved';
              }

              const prefResult = await mp.preference.create({ body: preferenceData });
              const initPoint = mp.getInitPoint(prefResult);

              db.query(
                'UPDATE solicitacoes SET preference_id = ?, status_pagamento = "pendente" WHERE id = ?',
                ['preference:' + prefResult.id + '|ref:' + uniqueReference, solicitacao_id],
                (updateErr) => {
                  if (updateErr) console.error('Erro ao salvar preference_id no fallback:', updateErr);
                }
              );

              return res.json({
                success: true,
                message: 'Pagamento via Checkout Pro (PIX disponível na página do Mercado Pago)',
                data: {
                  tipo: 'checkout',
                  preference_id: prefResult.id,
                  init_point: initPoint,
                  sandbox_init_point: prefResult.sandbox_init_point,
                  valor: mp.VALOR_LIBERACAO_CHAT
                }
              });
            } catch (prefError) {
              console.error('Erro no fallback Checkout Pro:', prefError.message || prefError);
              return res.status(500).json({
                success: false,
                message: 'Erro ao criar pagamento: ' + (prefError.message || 'erro desconhecido')
              });
            }
          }

          console.error('Erro ao criar pagamento PIX:', msgPix);
          return res.status(500).json({
            success: false,
            message: 'Erro ao criar pagamento PIX: ' + msgPix
          });
        }
      }
    );
  });

  // ============================================
  // POST /api/pagamento/preferencia
  // Cria uma preferência de pagamento no Mercado Pago (Checkout Pro)
  // ============================================
  router.post('/preferencia', async (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível. Tente novamente mais tarde.' });
    }

    if (!mp.isConfigured) {
      return res.status(500).json({
        success: false,
        message: 'Mercado Pago não configurado. Configure o MERCADO_PAGO_ACCESS_TOKEN no arquivo .env'
      });
    }

    const { solicitacao_id, profissional_id, cliente_nome, cliente_telefone, descricao } = req.body;

    if (!solicitacao_id || !profissional_id || !cliente_nome) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: solicitacao_id, profissional_id, cliente_nome'
      });
    }

    db.query(
      'SELECT id, status_pagamento, descricao FROM solicitacoes WHERE id = ? AND profissional_id = ?',
      [solicitacao_id, profissional_id],
      async (err, results) => {
        if (err) {
          console.error('Erro ao verificar solicitação:', err);
          return res.status(500).json({ success: false, message: 'Erro ao verificar solicitação' });
        }
        if (results.length === 0) {
          return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
        }
        if (results[0].status_pagamento === 'pago') {
          return res.status(400).json({ success: false, message: 'Esta solicitação já está paga. O chat já está liberado.' });
        }

        const sol = results[0];
        const descricaoPagamento = descricao || sol.descricao || 'Liberação de chat com cliente';

        try {
          const payerData = req.body.payer_email ? { email: req.body.payer_email } : {};

          const preferenceData = {
            items: [
              {
                id: `solicitacao_${solicitacao_id}`,
                title: `Liberação de chat - Solicitação #${solicitacao_id} (${cliente_nome})`,
                description: descricaoPagamento,
                quantity: 1,
                unit_price: mp.VALOR_LIBERACAO_CHAT,
                currency_id: 'BRL'
              }
            ],
            payer: payerData,
            back_urls: {
              success: `${mp.APP_URL}/profissional.html?status=success&solicitacao_id=${solicitacao_id}`,
              pending: `${mp.APP_URL}/profissional.html?status=pending&solicitacao_id=${solicitacao_id}`,
              failure: `${mp.APP_URL}/profissional.html?status=failure&solicitacao_id=${solicitacao_id}`
            },
            notification_url: `${mp.APP_URL}/api/pagamento/webhook`,
            external_reference: `solicitacao_${solicitacao_id}`,
            statement_descriptor: 'ACHEEI',
            payment_methods: {
              installments: 1
            }
          };

          if (mp.APP_URL.startsWith('https://')) {
            preferenceData.auto_return = 'approved';
          }

          const result = await mp.preference.create({ body: preferenceData });

          db.query(
            'UPDATE solicitacoes SET preference_id = ? WHERE id = ?',
            ['preference:' + result.id, solicitacao_id],
            (updateErr) => {
              if (updateErr) console.error('Erro ao salvar preference_id:', updateErr);
            }
          );

          const initPoint = mp.getInitPoint(result);

          res.json({
            success: true,
            message: 'Preferência criada com sucesso',
            data: {
              tipo: 'checkout',
              preference_id: result.id,
              init_point: initPoint,
              sandbox_init_point: result.sandbox_init_point,
              valor: mp.VALOR_LIBERACAO_CHAT
            }
          });
        } catch (error) {
          console.error('Erro ao criar preferência Mercado Pago:', error.message || error);
          res.status(500).json({
            success: false,
            message: 'Erro ao criar pagamento no Mercado Pago: ' + (error.message || 'erro desconhecido')
          });
        }
      }
    );
  });

  // ============================================
  // GET /api/pagamento/status/:solicitacao_id
  // ============================================
  router.get('/status/:solicitacao_id', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    db.query(
      'SELECT id, status_pagamento, preference_id FROM solicitacoes WHERE id = ?',
      [req.params.solicitacao_id],
      (err, results) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Erro ao consultar status' });
        }
        if (results.length === 0) {
          return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
        }
        res.json({ success: true, data: results[0] });
      }
    );
  });

  // ============================================
  // POST /api/pagamento/verificar/:solicitacao_id
  // ============================================
  router.post('/verificar/:solicitacao_id', async (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const solicitacaoId = req.params.solicitacao_id;

    db.query(
      'SELECT id, status_pagamento, preference_id FROM solicitacoes WHERE id = ?',
      [solicitacaoId],
      async (err, results) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Erro ao consultar solicitação' });
        }
        if (results.length === 0) {
          return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
        }
        const sol = results[0];
        if (sol.status_pagamento === 'pago') {
          return res.json({ success: true, data: { status_pagamento: 'pago', ja_estava_pago: true } });
        }

        if (!mp.isConfigured) {
          return res.json({
            success: false,
            message: 'Mercado Pago não configurado. Use o modo teste ou configure o token.'
          });
        }

        // Se tivermos o payment/preference ID guardado, verifica esse pagamento diretamente primeiro.
        if (sol.preference_id) {
          const storedId = sol.preference_id.toString();
          const parts = storedId.split('|ref:');
          const idPart = parts[0];
          const refPart = parts[1] || '';

          if (idPart.startsWith('payment:') && mp.payment) {
            try {
              const paymentId = idPart.replace('payment:', '');
              const paymentResult = await mp.payment.get({ id: paymentId });
              if (paymentResult && paymentResult.status === 'approved') {
                const valorPago = parseFloat(paymentResult.transaction_amount || 0);
                if (Math.abs(valorPago - mp.VALOR_LIBERACAO_CHAT) <= 0.01) {
                  db.query(
                    'UPDATE solicitacoes SET status_pagamento = "pago", preference_id = NULL WHERE id = ?',
                    [solicitacaoId],
                    (updateErr) => {
                      if (updateErr) console.error('Erro ao liberar chat:', updateErr);
                    }
                  );
                  console.log(`✅ Pagamento verificado e chat liberado para solicitacao #${solicitacaoId}`);
                  return res.json({ success: true, data: { status_pagamento: 'pago', ja_estava_pago: false } });
                }
              }
            } catch (paymentErr) {
              console.warn('Não conseguiu verificar pagamento direto pelo payment_id:', paymentErr.message || paymentErr);
            }
          }

          if (idPart.startsWith('preference:') && refPart && mp.payment) {
            try {
              const searchResult = await mp.payment.search({
                options: {
                  external_reference: refPart,
                  sort: 'date_created',
criteria: 'desc',
                  limit: 5
                }
              });
              const payments = searchResult.results || searchResult.body?.results || [];
              let approved = false;
              for (const payment of payments) {
                const valorPago = parseFloat(payment.transaction_amount || 0);
                if (payment.status === 'approved' && Math.abs(valorPago - mp.VALOR_LIBERACAO_CHAT) <= 0.01) {
                  approved = true;
                  break;
                }
              }
              if (approved) {
                db.query(
                  'UPDATE solicitacoes SET status_pagamento = "pago", preference_id = NULL WHERE id = ?',
                  [solicitacaoId],
                  (updateErr) => {
                    if (updateErr) console.error('Erro ao liberar chat:', updateErr);
                  }
                );
                console.log(`✅ Pagamento verificado e chat liberado para solicitacao #${solicitacaoId}`);
                return res.json({ success: true, data: { status_pagamento: 'pago', ja_estava_pago: false } });
              }
            } catch (searchErr) {
              console.warn('Erro ao buscar pagamento por preference_id:', searchErr.message || searchErr);
            }
          }
        }

        if (!mp.payment) {
          return res.json({ success: true, data: { status_pagamento: 'pendente' } });
        }

        try {
          const searchResult = await mp.payment.search({
            options: {
              external_reference: `solicitacao_${solicitacaoId}`,
              sort: 'date_created',
              criteria: 'desc',
              limit: 5
            }
          });

          const payments = searchResult.results || searchResult.body?.results || [];
          let approved = false;

          for (const payment of payments) {
            const valorPago = parseFloat(payment.transaction_amount || 0);
            if (payment.status === 'approved' && Math.abs(valorPago - mp.VALOR_LIBERACAO_CHAT) <= 0.01) {
              approved = true;
              break;
            }
          }

          if (approved) {
            db.query(
              'UPDATE solicitacoes SET status_pagamento = "pago", preference_id = NULL WHERE id = ?',
              [solicitacaoId],
              (updateErr) => {
                if (updateErr) console.error('Erro ao liberar chat:', updateErr);
              }
            );
            console.log(`✅ Pagamento verificado e chat liberado para solicitação #${solicitacaoId}`);
            return res.json({ success: true, data: { status_pagamento: 'pago', ja_estava_pago: false } });
          }

          return res.json({ success: true, data: { status_pagamento: 'pendente' } });
        } catch (error) {
          console.error('Erro ao verificar pagamento:', error.message || error);
          return res.status(500).json({ success: false, message: 'Erro ao verificar pagamento no Mercado Pago' });
        }
      }
    );
  });

  // ============================================
  // POST /api/pagamento/webhook
  // ============================================
  router.post('/webhook', (req, res) => {
    res.status(200).json({ success: true });

    const { type, data } = req.body || {};

    if (type === 'payment' && data && data.id) {
      const paymentId = data.id;
      processarPagamento(paymentId);
    } else if (type === 'test' || (req.body && req.body.test)) {
      console.log('Webhook de teste recebido do Mercado Pago');
    }
  });

  // ============================================
  // GET /api/pagamento/webhook (para testes de IPN)
  // ============================================
  router.get('/webhook', (req, res) => {
    res.status(200).json({ success: true, message: 'Webhook ativo' });
  });

// ============================================
  // POST /api/pagamento/confirmar (fallback manual)
  // NÃO libera o chat sem antes consultar o Mercado Pago.
  // Apenas marca como pago se houver um pagamento APROVADO com o valor correto.
  // ============================================
  router.post('/confirmar', async (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { solicitacao_id } = req.body;
    if (!solicitacao_id) {
      return res.status(400).json({ success: false, message: 'solicitacao_id é obrigatório' });
    }

    try {
      const status = await consultarStatusPagamento(solicitacao_id);
      if (status === 'pago') {
        console.log(`Pagamento confirmado após verificação no Mercado Pago para solicitação #${solicitacao_id}`);
        return res.json({
          success: true,
          message: 'Pagamento confirmado! O chat com o cliente foi liberado.',
          data: { id: parseInt(solicitacao_id), status_pagamento: 'pago' }
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Pagamento não confirmado no Mercado Pago. O chat só é liberado após a confirmação do pagamento.'
      });
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error.message || error);
      return res.status(500).json({ success: false, message: 'Erro ao confirmar pagamento no Mercado Pago' });
    }
  });

// ============================================
  // Função: Consultar status real do pagamento no Mercado Pago
  // Retorna 'pago' somente se houver um pagamento APROVADO com o valor correto (R$14,99).
  // Se confirmar, marca a solicitação como paga no banco.
  // ============================================
  async function consultarStatusPagamento(solicitacaoId) {
    return new Promise((resolve, reject) => {
      if (!dbConnected()) return resolve('pendente');

      db.query(
        'SELECT status_pagamento, preference_id FROM solicitacoes WHERE id = ?',
        [solicitacaoId],
        async (err, results) => {
          if (err) return reject(err);
          if (results.length === 0) return resolve('pendente');

          const sol = results[0];
          if (sol.status_pagamento === 'pago') return resolve('pago');
          if (!mp.isConfigured) return resolve('pendente');

          // 1) Se tivermos um payment_id salvo, consulta direto
          if (sol.preference_id) {
            const storedId = sol.preference_id.toString();
            const parts = storedId.split('|ref:');
            const idPart = parts[0];
            const refPart = parts[1] || '';

            if (idPart.startsWith('payment:') && mp.payment) {
              try {
                const paymentId = idPart.replace('payment:', '');
                const paymentResult = await mp.payment.get({ id: paymentId });
                if (paymentResult && paymentResult.status === 'approved') {
                  const valorPago = parseFloat(paymentResult.transaction_amount || 0);
                  if (Math.abs(valorPago - mp.VALOR_LIBERACAO_CHAT) <= 0.01) {
                    liberarChat(solicitacaoId);
                    return resolve('pago');
                  }
                }
              } catch (e) {
                console.warn('Falha ao consultar payment_id direto:', e.message || e);
              }
            }

            // 2) preference_id com ref -> busca pelo external_reference
            if (idPart.startsWith('preference:') && refPart && mp.payment) {
              try {
                const searchResult = await mp.payment.search({
                  options: {
                    external_reference: refPart,
                    sort: 'date_created',
                    criteria: 'desc',
                    limit: 5
                  }
                });
                const payments = searchResult.results || searchResult.body?.results || [];
                for (const payment of payments) {
                  const valorPago = parseFloat(payment.transaction_amount || 0);
                  if (payment.status === 'approved' && Math.abs(valorPago - mp.VALOR_LIBERACAO_CHAT) <= 0.01) {
                    liberarChat(solicitacaoId);
                    return resolve('pago');
                  }
                }
              } catch (e) {
                console.warn('Falha ao buscar por preference ref:', e.message || e);
              }
            }
          }

          // 3) Busca genérica pelo external_reference padrão
          if (mp.payment) {
            try {
              const searchResult = await mp.payment.search({
                options: {
                  external_reference: `solicitacao_${solicitacaoId}`,
                  sort: 'date_created',
                  criteria: 'desc',
                  limit: 5
                }
              });
              const payments = searchResult.results || searchResult.body?.results || [];
              for (const payment of payments) {
                const valorPago = parseFloat(payment.transaction_amount || 0);
                if (payment.status === 'approved' && Math.abs(valorPago - mp.VALOR_LIBERACAO_CHAT) <= 0.01) {
                  liberarChat(solicitacaoId);
                  return resolve('pago');
                }
              }
            } catch (e) {
              console.warn('Falha na busca genérica de pagamento:', e.message || e);
            }
          }

          return resolve('pendente');
        }
      );
    });
  }

  // Marca a solicitação como paga no banco
  function liberarChat(solicitacaoId) {
    db.query(
      'UPDATE solicitacoes SET status_pagamento = "pago", preference_id = NULL WHERE id = ?',
      [solicitacaoId],
      (updateErr) => {
        if (updateErr) {
          console.error('Erro ao liberar chat:', updateErr);
        } else {
          console.log(`✅ Chat liberado para solicitação #${solicitacaoId}`);
        }
      }
    );
  }

  // ============================================
  // Função: Processar pagamento (consultar no MP e liberar)
  // ============================================
  async function processarPagamento(paymentId) {
    try {
      console.log(`Processando pagamento ${paymentId}...`);

      if (!mp.isConfigured || !mp.payment) {
        console.log('Mercado Pago não configurado, pulando processamento do pagamento.');
        return;
      }

      const paymentResult = await mp.payment.get({ id: paymentId });

      const status = paymentResult.status;
      const externalReference = paymentResult.external_reference;

      console.log(`Pagamento ${paymentId}: status=${status}, external_reference=${externalReference}`);

      if (status === 'approved' && externalReference) {
        const match = externalReference.match(/^solicitacao_(\d+)$/);
        if (match) {
          const solicitacaoId = match[1];

          const valorPago = parseFloat(paymentResult.transaction_amount || 0);
          const valorEsperado = mp.VALOR_LIBERACAO_CHAT;

          if (Math.abs(valorPago - valorEsperado) > 0.01) {
            console.warn(`Valor incorreto para solicitação #${solicitacaoId}: recebido ${valorPago}, esperado ${valorEsperado}`);
            return;
          }

          db.query(
            'UPDATE solicitacoes SET status_pagamento = "pago", preference_id = NULL WHERE id = ? AND status_pagamento != "pago"',
            [solicitacaoId],
            (err, result) => {
              if (err) {
                console.error('Erro ao liberar chat:', err);
                return;
              }
              if (result.affectedRows > 0) {
                console.log(`✅ Chat liberado para solicitação #${solicitacaoId}`);
              } else {
                console.log(`Solicitação #${solicitacaoId} já estava paga ou não existe`);
              }
            }
          );
        }
      } else {
        console.log(`Pagamento ${paymentId} não aprovado (status: ${status})`);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error.message || error);
    }
  }

  return router;
};
