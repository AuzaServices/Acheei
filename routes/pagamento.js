// ============================================
// Rotas de Pagamento - Mercado Pago (Checkout Pro)
// Liberação do chat para profissionais (R$14,99)
// ============================================
const express = require('express');
const router = express.Router();
const mp = require('../config/mercadopago');

module.exports = function(db, dbConnected) {

  // ============================================
  // POST /api/pagamento/preferencia
  // Cria uma preferência de pagamento no Mercado Pago
  // body: { solicitacao_id, profissional_id, cliente_nome, cliente_telefone, descricao }
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

    // Verifica se já está paga
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

          // auto_return só funciona com URLs HTTPS (produção)
          if (mp.APP_URL.startsWith('https://')) {
            preferenceData.auto_return = 'approved';
          }

          const result = await mp.preference.create({ body: preferenceData });

          db.query(
            'UPDATE solicitacoes SET preference_id = ? WHERE id = ?',
            [result.id, solicitacao_id],
            (updateErr) => {
              if (updateErr) console.error('Erro ao salvar preference_id:', updateErr);
            }
          );

          const initPoint = mp.getInitPoint(result);

          res.json({
            success: true,
            message: 'Preferência criada com sucesso',
            data: {
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
  // Consulta o status de pagamento de uma solicitação
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
  // Verifica no Mercado Pago se o pagamento foi aprovado
  // e libera o chat se estiver aprovado
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

        if (!mp.isConfigured || !mp.payment) {
          return res.json({
            success: false,
            message: 'Mercado Pago não configurado. Use o modo teste ou configure o token.'
          });
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
  // Recebe notificações do Mercado Pago (webhook)
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
  // Confirma manualmente o pagamento de uma solicitação
  // (usado apenas em desenvolvimento/testes sem webhook)
  // ============================================
  router.post('/confirmar', (req, res) => {
    if (!dbConnected()) {
      return res.status(503).json({ success: false, message: 'Banco de dados indisponível' });
    }
    const { solicitacao_id } = req.body;
    if (!solicitacao_id) {
      return res.status(400).json({ success: false, message: 'solicitacao_id é obrigatório' });
    }
    db.query(
      'UPDATE solicitacoes SET status_pagamento = "pago", preference_id = NULL WHERE id = ?',
      [solicitacao_id],
      (err, result) => {
        if (err) {
          console.error('Erro ao confirmar pagamento:', err);
          return res.status(500).json({ success: false, message: 'Erro ao confirmar pagamento' });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'Solicitação não encontrada' });
        }
        console.log(`Pagamento confirmado manualmente para solicitação #${solicitacao_id}`);
        res.json({
          success: true,
          message: 'Pagamento confirmado! O chat com o cliente foi liberado.',
          data: { id: parseInt(solicitacao_id), status_pagamento: 'pago' }
        });
      }
    );
  });

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
