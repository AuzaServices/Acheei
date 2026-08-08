// ============================================
// Acheei - Área do Cliente
// Login, Cadastro, Solicitações, Orçamentos, Chat
// ============================================

const API_BASE = '/api';

let token = localStorage.getItem('acheei_cliente_token');
let clienteData = null;

// Adiciona a função de som de notificação ("som chiclete" - estalo de goma de mascar)
function tocarSomNotificacao() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    function estalo(quando, freqInicial) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqInicial, quando);
      osc.frequency.exponentialRampToValueAtTime(freqInicial * 0.5, quando + 0.08);
      gain.gain.setValueAtTime(0.4, quando);
      gain.gain.exponentialRampToValueAtTime(0.0001, quando + 0.09);
      osc.start(quando);
      osc.stop(quando + 0.1);
    }
    // Duplo estalo rápido, característico de "chiclete"
    estalo(ctx.currentTime, 900);
    estalo(ctx.currentTime + 0.12, 1200);
  } catch (e) {
    // Falha ao reproduzir o som - ignora
  }
}

// ============================================
// Widget de Chat Flutuante (Messenger) - Verifica novas mensagens do profissional
// ============================================
function iniciarPollingWidget() {
  if (widgetGlobalInterval) clearInterval(widgetGlobalInterval);
  widgetGlobalInterval = setInterval(async function () {
    await verificarNovasMensagensWidget();
  }, 5000);
  // Chamada inicial para carregar imediatamente
  verificarNovasMensagensWidget();

  function sairUsuario() {
    if (token) {
      console.log("Saindo do sistema...");
      localStorage.removeItem('acheei_cliente_token');
      salvarClienteCache(null);
      token = null;
      clienteData = null;
    } else {
      console.log("Já estava deslogado");
    }
    window.location.href = '/';
  }

  // Expõe a função como global
  window.sairUsuario = sairUsuario;
}

async function verificarNovasMensagensWidget() {
  if (!token) return;
  var result = await apiRequest(API_BASE + '/clientes/solicitacoes');
  if (!result || !result.success) return;

  var novasMensagens = 0;
  for (var i = 0; i < result.data.length; i++) {
    var sol = result.data[i];
    if (sol.status_pagamento !== 'pago') continue;
    var msgRes = await apiRequest(API_BASE + '/clientes/mensagens/' + sol.id);
    if (!msgRes || !msgRes.success) continue;
    var mensagens = msgRes.data;
    if (!widgetUltimasMensagens[sol.id]) {
      widgetUltimasMensagens[sol.id] = 0;
    }
    for (var j = 0; j < mensagens.length; j++) {
      if (mensagens[j].id > widgetUltimasMensagens[sol.id] && mensagens[j].remetente === 'profissional') {
        novasMensagens++;
      }
    }
    if (mensagens.length > 0) {
      widgetUltimasMensagens[sol.id] = mensagens[mensagens.length - 1].id;
    }
  }

  if (novasMensagens > 0) {
    var bubble = document.getElementById('chatBubble');
    if (bubble) bubble.classList.add('pulse');
    var badge = document.getElementById('chatBadge');
    if (badge) {
      var count = parseInt(badge.textContent) || 0;
      badge.textContent = count + novasMensagens;
      if (badge.classList.contains('show') === false) {
        badge.classList.add('show');
      }
    }
    // Tocar som de notificação
    tocarSomNotificacao();
  }
}

// ============================================
// Widget de Chat Flutuante - Função de enviar mensagem (usada no clique do botão "Enviar")
// ============================================
async function widgetEnviarMensagem() {
  var solicitacaoId = widgetConversaSelecionada;
  var input = document.getElementById('widgetChatInput');
  var texto = input.value.trim();

  if (!solicitacaoId) {
    showToast('Selecione uma conversa', 'error');
    return;
  }
  if (!texto) return;

  input.value = '';
  var result = await apiRequest(API_BASE + '/clientes/mensagens', {
    method: 'POST',
    body: JSON.stringify({ solicitacao_id: parseInt(solicitacaoId), texto: texto })
  });

  if (result && result.success) {
    await widgetCarregarMensagens(solicitacaoId);
  }
}

// Adiciona o event listener do botão "Enviar"
document.addEventListener('DOMContentLoaded', function() {
  var btnEnviar = document.getElementById('widgetChatSendBtn');
  if (btnEnviar) {
    btnEnviar.addEventListener('click', function() {
      widgetEnviarMensagem();
    });
  }
});

