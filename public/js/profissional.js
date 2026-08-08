// ============================================
// Acheei - Área do Profissional
// ============================================

const API_BASE = '/api';
let token = localStorage.getItem('acheei_prof_token');
let profissional = null;
let solicitacoesData = [];
let orcamentosData = [];
let chatTimer = null;
let chatSolicitacaoSelecionada = '';
let widgetUltimasMensagensProf = {};
let widgetUltimaNovaSolicitacaoProf = null;
let widgetGlobalIntervalProf = null;
let widgetConversaSelecionada = '';
let widgetIntervaloMsgProf = null;

// ============================================
// Cache do Profissional (compartilhado via localStorage)
// ============================================
function salvarProfCache(prof) {
  if (prof) {
    localStorage.setItem('acheei_prof_cache', JSON.stringify({
      id: prof.id,
      nome_perfil: prof.nome_perfil,
      foto_perfil: prof.foto_perfil || null
    }));
  } else {
    localStorage.removeItem('acheei_prof_cache');
  }
}

function carregarProfCache() {
  try {
    return JSON.parse(localStorage.getItem('acheei_prof_cache') || 'null');
  } catch (e) {
    return null;
  }
}

// Otimista: se já está logado e existe cache, mostra o dashboard imediatamente
// (evita o flash da tela de login ao acessar a área do profissional)
if (token && carregarProfCache()) {
  var cacheInicial = carregarProfCache();
  profissional = { id: cacheInicial.id, nome_perfil: cacheInicial.nome_perfil, foto_perfil: cacheInicial.foto_perfil };
  var nmInicial = document.getElementById('userName');
  var avInicial = document.getElementById('userAvatar');
  if (nmInicial) nmInicial.textContent = cacheInicial.nome_perfil || 'Profissional';
  if (avInicial) {
    if (cacheInicial.foto_perfil) {
      avInicial.innerHTML = '<img src="' + cacheInicial.foto_perfil + '" alt="Foto">';
    } else {
      avInicial.textContent = '👤';
    }
  }
  mostrarDashboard();
}

// ============================================
// Utility
// ============================================
function showToast(message, type) {
  if (!type) type = 'success';
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(function() { toast.remove(); }, 300);
  }, 4000);
}

function formatarMoeda(valor) {
  return 'R$ ' + parseFloat(valor).toFixed(2).replace('.', ',');
}

// Som "chiclete" (estalo de goma de mascar) ao receber nova mensagem
function tocarSomChiclete() {
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
// API Request com token
// ============================================
async function apiRequest(url, options) {
  if (!options) options = {};
  var headers = { 'Content-Type': 'application/json' };
  if (options.headers) {
    for (var k in options.headers) headers[k] = options.headers[k];
  }
  if (token) headers['Authorization'] = 'Bearer ' + token;
  try {
    var opts = {};
    for (var k in options) opts[k] = options[k];
    opts.headers = headers;
    var response = await fetch(url, opts);
    var result = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('acheei_prof_token');
        token = null;
        mostrarLogin();
        showToast('Sessao expirada. Faca login novamente.', 'error');
        return null;
      }
      throw new Error(result.message || 'Erro na requisicao');
    }
    return result;
  } catch (error) {
    console.error('Erro na requisicao:', error);
    showToast(error.message || 'Erro ao conectar com o servidor', 'error');
    return null;
  }
}

// ============================================
// Login
// ============================================
async function login(event) {
  event.preventDefault();
  var btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Entrando...';
  var email = document.getElementById('email').value.trim();
  var senha = document.getElementById('senha').value;

  if (!email || !senha) {
    document.getElementById('loginError').textContent = 'Preencha email e senha';
    document.getElementById('loginError').style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Entrar na Área';
    return;
  }

try {
    var response = await fetch(API_BASE + '/profissionais/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, senha: senha })
    });
    var result = await response.json();

    btn.disabled = false;
    btn.innerHTML = 'Entrar na Área';

    if (response.ok && result && result.success) {
      token = result.data.token;
      profissional = result.data.profissional;
      localStorage.setItem('acheei_prof_token', token);
      salvarProfCache(profissional);
      // Limpa estado de conversas do profissional anterior
      pararPollingWidgetProf();
      if (widgetIntervaloMsgProf) { clearInterval(widgetIntervaloMsgProf); widgetIntervaloMsgProf = null; }
      widgetUltimasMensagensProf = {};
      widgetUltimaNovaSolicitacaoProf = null;
      chatSolicitacaoSelecionada = '';
      widgetConversaSelecionada = '';
      var listWidget = document.getElementById('widgetChatList');
      if (listWidget) listWidget.innerHTML = '<div class="chat-conv-empty"><span class="icon">💬</span><p>Nenhuma conversa.</p></div>';
      var viewWidget = document.getElementById('widgetChatView');
      if (viewWidget) viewWidget.classList.remove('open');
      document.getElementById('userName').textContent = profissional.nome_perfil;
      // Foto
      var avatar = document.getElementById('userAvatar');
      if (profissional.foto_perfil) {
        avatar.innerHTML = '<img src="' + profissional.foto_perfil + '" alt="Foto">';
      } else {
        avatar.textContent = '👤';
      }
      mostrarDashboard();
      carregarDados();
      mostrarWidgetChat();
      showToast('Login realizado com sucesso!', 'success');
    } else {
      var msg = (result && result.message) ? result.message : 'E-mail ou senha inválidos';
      document.getElementById('loginError').textContent = msg;
      document.getElementById('loginError').style.display = 'block';
    }
  } catch (error) {
    console.error('Erro no login do profissional:', error);
    btn.disabled = false;
    btn.innerHTML = 'Entrar na Área';
    document.getElementById('loginError').textContent = 'Erro ao conectar com o servidor. Tente novamente.';
    document.getElementById('loginError').style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem('acheei_prof_token');
  salvarProfCache(null);
  token = null;
  profissional = null;
  // Limpa todo o estado do chat/widget do profissional anterior
  pararPollingWidgetProf();
  if (widgetIntervaloMsgProf) { clearInterval(widgetIntervaloMsgProf); widgetIntervaloMsgProf = null; }
  widgetUltimasMensagensProf = {};
  widgetUltimaNovaSolicitacaoProf = null;
  chatSolicitacaoSelecionada = '';
  widgetConversaSelecionada = '';
  if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
  var listWidget = document.getElementById('widgetChatList');
  if (listWidget) listWidget.innerHTML = '<div class="chat-conv-empty"><span class="icon">💬</span><p>Nenhuma conversa.</p></div>';
  var viewWidget = document.getElementById('widgetChatView');
  if (viewWidget) viewWidget.classList.remove('open');
  var bodyWidget = document.getElementById('widgetChatBody');
  if (bodyWidget) bodyWidget.innerHTML = '';
  var footerWidget = document.getElementById('widgetChatFooter');
  if (footerWidget) footerWidget.style.display = 'none';
  var bubbleWidget = document.getElementById('chatBubble');
  if (bubbleWidget) bubbleWidget.classList.remove('pulse');
  var badgeWidget = document.getElementById('chatBadge');
  if (badgeWidget) { badgeWidget.classList.remove('show'); badgeWidget.textContent = '0'; }
  var panelWidget = document.getElementById('chatPanel');
  if (panelWidget) panelWidget.classList.remove('open');
  var widgetBox = document.getElementById('chatWidget');
  if (widgetBox) widgetBox.classList.remove('active');
  mostrarLogin();
  showToast('Sessao encerrada', 'info');
}

function mostrarLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loginForm').reset();
  document.getElementById('loginError').style.display = 'none';
}

function mostrarDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
}

// ============================================
// Tabs
// ============================================
function switchTab(tab, btn) {
  var tabs = document.querySelectorAll('.dashboard-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  btn.classList.add('active');
  var contents = document.querySelectorAll('.tab-content');
  for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');
  var map = {
    solicitacoes: 'tabSolicitacoes',
    orcamentos: 'tabOrcamentos',
    calculadora: 'tabCalculadora',
    ferramentas: 'tabFerramentas',
    chat: 'tabChat'
  };
document.getElementById(map[tab]).classList.add('active');
  if (tab === 'chat') {
    esconderWidgetChat();
    carregarChatSolicitacoes();
  } else {
    mostrarWidgetChat();
  }
}

function openMobileMenu() {
  document.getElementById('mobileMenuOverlay').classList.add('active');
  document.getElementById('mobileMenu').classList.add('active');
  document.getElementById('hamburgerBtn').classList.add('active');
}

function closeMobileMenu() {
  document.getElementById('mobileMenuOverlay').classList.remove('active');
  document.getElementById('mobileMenu').classList.remove('active');
  document.getElementById('hamburgerBtn').classList.remove('active');
}

function toggleMobileMenu() {
  var menu = document.getElementById('mobileMenu');
  if (menu.classList.contains('active')) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
}

function navigateMobileMenu(tab) {
  closeMobileMenu();
  var selector = ".dashboard-tab[onclick=\"switchTab('" + tab + "', this)\"]";
  var btn = document.querySelector(selector);
  if (btn) {
    btn.click();
  }
}

// ============================================
// Carregar Dados
// ============================================
async function carregarDados() {
  if (!profissional) return;
  await carregarSolicitacoes();
  await carregarOrcamentos();
}

// ============================================
// Solicitações
// ============================================
async function carregarSolicitacoes() {
  if (!profissional) return;
  var result = await apiRequest(API_BASE + '/solicitacoes/profissional/' + profissional.id);
  if (result && result.success) {
    solicitacoesData = result.data;
    renderizarSolicitacoes();
    document.getElementById('countSolicitacoes').textContent = result.total;
    document.getElementById('solCount').textContent = result.total + ' solicitação' + (result.total !== 1 ? 'ões' : '');
  }
}

function renderizarSolicitacoes() {
  var container = document.getElementById('solicitacoesList');
  container.innerHTML = '';
  if (solicitacoesData.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="icon">📋</span><h3>Nenhuma solicitação ainda</h3><p>Quando clientes solicitarem seus serviços, aparecerão aqui.</p></div>';
    return;
  }
  for (var i = 0; i < solicitacoesData.length; i++) {
    var sol = solicitacoesData[i];
    var statusPag = sol.status_pagamento || 'pendente';
    var badgeHtml = statusPag === 'pago'
      ? '<span class="badge pago">Pago</span>'
      : '<span class="badge pendente">Pendente</span>';
    var pagarBtn = statusPag === 'pendente'
      ? '<button type="button" class="btn btn-primary btn-sm" data-solicitacao-id="' + sol.id + '" onclick="pagarSolicitacao(event, ' + sol.id + ')">Pagar R$14,99</button>'
      : '';
    var card = document.createElement('div');
    card.className = 'solicitacao-card';

    // Campos opcionais (Data/Hora, Urgência, Orçamento) - exibe apenas quando preenchidos
    var extrasHtml = '';
    if (sol.data_hora) {
      var dh = new Date(sol.data_hora);
      extrasHtml += '<div class="item"><div class="label">Data e Hora</div><div class="value">' + dh.toLocaleString('pt-BR') + '</div></div>';
    }
    if (sol.urgencia) {
      extrasHtml += '<div class="item"><div class="label">Urgência</div><div class="value">' + sol.urgencia + '</div></div>';
    }
    if (sol.orcamento_estimado) {
      extrasHtml += '<div class="item"><div class="label">Orçamento estimado</div><div class="value">' + sol.orcamento_estimado + '</div></div>';
    }

    card.innerHTML =
      '<div class="card-header">' +
        '<h4>' + sol.cliente_nome + '</h4>' +
        '<span class="date">' + new Date(sol.data_solicitacao).toLocaleString('pt-BR') + '</span>' +
      '</div>' +
'<div class="info-grid">' +
        '<div class="item"><div class="label">Pagamento</div><div class="value">' + badgeHtml + '</div></div>' +
        extrasHtml +
      '</div>' +
      '<div class="descricao">' + sol.descricao + '</div>' +
      '<div style="display:flex;gap:8px;">' + pagarBtn + '</div>';
    container.appendChild(card);
  }
}

// ============================================
// Pagamento via Mercado Pago (PIX Transparente)
// ============================================
let pixTimer = null;

function abrirModalPix(data) {
  document.getElementById('pixModal').classList.add('active');
  document.body.style.overflow = 'hidden';

  // Exibe QR Code
  var qrContainer = document.getElementById('pixQrCode');
  if (data.qr_code_base64) {
    qrContainer.innerHTML = '<img src="data:image/png;base64,' + data.qr_code_base64 + '" alt="QR Code PIX" style="width:220px;height:220px;display:block;margin:0 auto;">';
  } else {
    qrContainer.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-medium);"><span style="font-size:48px;display:block;margin-bottom:8px;">📱</span><p>QR Code indisponível</p></div>';
  }

  // Exibe código copia e cola
  document.getElementById('pixCopiaCola').value = data.qr_code || '';

  // Exibe valor
  document.getElementById('pixValor').textContent = 'R$ ' + (data.transaction_amount || 14.99).toFixed(2).replace('.', ',');

  // Exibe tempo de expiração
  if (data.date_of_expiration) {
    var expDate = new Date(data.date_of_expiration);
    document.getElementById('pixExpiracao').textContent = 'Válido até: ' + expDate.toLocaleTimeString('pt-BR');
  }

  // Armazena solicitacao_id para verificação
  document.getElementById('pixSolicitacaoId').value = data.solicitacao_id || '';

  // Inicia verificação automática
  var solicitacaoId = data.solicitacao_id;
  if (solicitacaoId && pixTimer) clearInterval(pixTimer);
  if (solicitacaoId) {
    pixTimer = setInterval(function() {
      verificarStatusPix(solicitacaoId);
    }, 5000);
  }
}

function fecharModalPix() {
  document.getElementById('pixModal').classList.remove('active');
  document.body.style.overflow = '';
  if (pixTimer) { clearInterval(pixTimer); pixTimer = null; }
}

function copiarChavePix() {
  var input = document.getElementById('pixCopiaCola');
  if (!input.value) return;
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value).then(function() {
    showToast('Código PIX copiado!', 'success');
  }).catch(function() {
    showToast('Copie o código manualmente', 'info');
  });
}

async function verificarStatusPix(solicitacaoId) {
  if (!solicitacaoId) return;

  // Consulta o Mercado Pago diretamente (não apenas o banco local),
  // para detectar o pagamento mesmo sem o webhook chegar (ex: localhost)
  var result = await apiRequest(API_BASE + '/pagamento/verificar/' + solicitacaoId, { method: 'POST' });

  if (result && result.success && result.data) {
    if (result.data.status_pagamento === 'pago') {
      if (pixTimer) { clearInterval(pixTimer); pixTimer = null; }
      fecharModalPix();
      showToast('✅ Pagamento confirmado! Chat liberado!', 'success');

      // Atualiza o badge/botão na lista
      var btn = document.querySelector('button[data-solicitacao-id="' + solicitacaoId + '"]');
      if (btn) {
        btn.outerHTML = '<span class="badge pago">Pago</span>';
      }
      await carregarSolicitacoes();
    } else {
      console.log('Pagamento ainda pendente para solicitação #' + solicitacaoId);
    }
  }
}

async function pagarSolicitacao(event, id) {
  if (event) {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
  }

  if (!profissional) {
    showToast('Faça login primeiro', 'error');
    return;
  }

  // Busca a solicitação para obter dados do cliente
  var sol = null;
  for (var i = 0; i < solicitacoesData.length; i++) {
    if (solicitacoesData[i].id == id) { sol = solicitacoesData[i]; break; }
  }
  if (!sol) {
    showToast('Solicitação não encontrada', 'error');
    return;
  }

  var btn = event && event.target ? event.target.closest('button, .btn') : null;
  if (btn) {
    if (btn.dataset.processing === 'true') {
      return;
    }
    btn.dataset.processing = 'true';
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Gerando PIX...';
  }

  showToast('Gerando pagamento PIX... aguarde', 'info');

  try {
    var result = await apiRequest(API_BASE + '/pagamento/pix', {
      method: 'POST',
      body: JSON.stringify({
        solicitacao_id: id,
        profissional_id: profissional.id,
        cliente_nome: sol.cliente_nome,
        cliente_telefone: sol.cliente_telefone,
        descricao: sol.descricao,
        payer_email: profissional.email || undefined
      })
    });

if (btn) {
      btn.disabled = false;
      btn.dataset.processing = 'false';
      btn.innerHTML = 'Pagar R$14,99';
    }

    if (result && result.success && result.data) {
      // Adiciona solicitacao_id nos dados para o modal
      result.data.solicitacao_id = id;

      if (result.data.tipo === 'checkout') {
        // Fallback: redireciona para o Checkout Pro (PIX disponível na página do MP)
        if (result.data.init_point) {
          window.open(result.data.init_point, '_blank');
          showToast('Abra a página do Mercado Pago para pagar com PIX', 'info');
        } else {
          showToast('Erro: link de pagamento não gerado', 'error');
        }
      } else {
        abrirModalPix(result.data);
      }
    } else {
      var msg = (result && result.message) ? result.message : 'Erro ao criar pagamento PIX';
      showToast(msg, 'error');
    }
  } catch (error) {
    console.error('Erro ao pagar via PIX:', error);
    if (btn) {
      btn.disabled = false;
      btn.dataset.processing = 'false';
      btn.innerHTML = '💳 Pagar R$14,99';
    }
    showToast('Erro ao processar pagamento PIX', 'error');
  }
}

// ============================================
// Orçamentos
// ============================================
async function carregarOrcamentos() {
  if (!profissional) return;
  var result = await apiRequest(API_BASE + '/orcamentos/' + profissional.id);
  if (result && result.success) {
    orcamentosData = result.data;
    renderizarOrcamentos();
  }
}

function renderizarOrcamentos() {
  var container = document.getElementById('orcamentosList');
  container.innerHTML = '';
  if (orcamentosData.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="icon">💰</span><h3>Nenhum orçamento ainda</h3><p>Crie orçamentos para seus clientes aqui.</p></div>';
    return;
  }
  for (var i = 0; i < orcamentosData.length; i++) {
    var orc = orcamentosData[i];
    var statusLabel = orc.status.charAt(0).toUpperCase() + orc.status.slice(1);
    var card = document.createElement('div');
    card.className = 'orcamento-card';
    card.innerHTML =
      '<div class="orc-header">' +
        '<span class="cliente">👤 ' + orc.cliente_nome + '</span>' +
        '<span class="valor">' + formatarMoeda(orc.valor) + '</span>' +
      '</div>' +
      '<div class="orc-body">' + orc.descricao + '</div>' +
      '<div class="orc-footer">' +
        '<span class="badge ' + orc.status + '">' + statusLabel + '</span>' +
        '<button class="btn btn-danger btn-sm" onclick="excluirOrcamento(' + orc.id + ')">🗑️</button>' +
      '</div>';
    container.appendChild(card);
  }
}

function abrirModalOrcamento() {
  document.getElementById('orcamentoModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModalOrcamento() {
  document.getElementById('orcamentoModal').classList.remove('active');
  document.getElementById('orcamentoForm').reset();
  document.body.style.overflow = '';
}

async function criarOrcamento(event) {
  event.preventDefault();
  if (!profissional) return;
  var cliente = document.getElementById('orcCliente').value.trim();
  var descricao = document.getElementById('orcDescricao').value.trim();
  var valor = parseFloat(document.getElementById('orcValor').value);
  if (!cliente || !descricao || !valor) {
    showToast('Preencha todos os campos', 'error');
    return;
  }
  var result = await apiRequest(API_BASE + '/orcamentos', {
    method: 'POST',
    body: JSON.stringify({
      profissional_id: profissional.id,
      cliente_nome: cliente,
      descricao: descricao,
      valor: valor
    })
  });
  if (result && result.success) {
    showToast('Orçamento criado com sucesso!', 'success');
    fecharModalOrcamento();
    await carregarOrcamentos();
  }
}

async function excluirOrcamento(id) {
  if (!confirm('Excluir este orçamento?')) return;
  var result = await apiRequest(API_BASE + '/orcamentos/' + id, { method: 'DELETE' });
  if (result && result.success) {
    showToast('Orçamento excluído', 'info');
    await carregarOrcamentos();
  }
}

// ============================================
// Calculadora
// ============================================
let calcExpressao = '';
let calcUltimoResultado = null;

function calcInput(valor) {
  var display = document.getElementById('calcDisplay');
  if (calcUltimoResultado !== null && /[0-9]/.test(valor)) {
    calcExpressao = String(calcUltimoResultado);
    calcUltimoResultado = null;
  }
  if (valor === '.' && calcExpressao.split(/[÷×+\-]/).pop().includes('.')) return;
  if (valor === '÷' || valor === '×' || valor === '-' || valor === '+') {
    if (calcExpressao === '' && valor === '-') {
      calcExpressao = '-';
    } else if (calcExpressao !== '' && /[÷×+\-]$/.test(calcExpressao)) {
      calcExpressao = calcExpressao.slice(0, -1) + valor;
    } else {
      calcExpressao += valor;
    }
  } else {
    calcExpressao += valor;
  }
  display.value = calcExpressao || '0';
}

function calcClearAll() {
  calcExpressao = '';
  calcUltimoResultado = null;
  document.getElementById('calcDisplay').value = '0';
}

function calcDelete() {
  calcExpressao = calcExpressao.slice(0, -1);
  document.getElementById('calcDisplay').value = calcExpressao || '0';
}

function calcPercent() {
  if (!calcExpressao) return;
  var valor = parseFloat(calcExpressao);
  if (isNaN(valor)) return;
  calcExpressao = String(valor / 100);
  document.getElementById('calcDisplay').value = calcExpressao;
}

function calcEqual() {
  if (!calcExpressao) return;
  var expr = calcExpressao
    .replace(/÷/g, '/')
    .replace(/×/g, '*')
    .replace(/,/g, '.');
  try {
    var resultado = Function('"use strict"; return (' + expr + ')')();
    if (typeof resultado === 'number' && !isFinite(resultado)) {
      document.getElementById('calcDisplay').value = 'Erro';
      calcExpressao = '';
      return;
    }
    calcExpressao = String(resultado);
    calcUltimoResultado = resultado;
    document.getElementById('calcDisplay').value = String(resultado);
  } catch (e) {
    document.getElementById('calcDisplay').value = 'Erro';
    calcExpressao = '';
  }
}

// ============================================
// Ferramentas
// ============================================
function converterMedida() {
  var m = prompt('Digite o valor em metros:');
  if (m === null) return;
  m = parseFloat(m);
  if (isNaN(m)) { showToast('Valor inválido', 'error'); return; }
  document.getElementById('ferramentaResultado').style.display = 'block';
  document.getElementById('ferramentaResultado').innerHTML =
    '<strong>📏 Conversão de ' + m + 'm</strong><br>' +
    'Centímetros: ' + (m * 100) + ' cm<br>' +
    'Milímetros: ' + (m * 1000) + ' mm<br>' +
    'Polegadas: ' + (m * 39.37).toFixed(2) + ' in<br>' +
    'Pés: ' + (m * 3.281).toFixed(2) + ' ft<br>' +
    'Jardas: ' + (m * 1.094).toFixed(2) + ' yd';
}

function converterPeso() {
  var kg = prompt('Digite o valor em quilogramas:');
  if (kg === null) return;
  kg = parseFloat(kg);
  if (isNaN(kg)) { showToast('Valor inválido', 'error'); return; }
  document.getElementById('ferramentaResultado').style.display = 'block';
  document.getElementById('ferramentaResultado').innerHTML =
    '<strong>⚖️ Conversão de ' + kg + ' kg</strong><br>' +
    'Gramas: ' + (kg * 1000) + ' g<br>' +
    'Libras: ' + (kg * 2.205).toFixed(2) + ' lb<br>' +
    'Onças: ' + (kg * 35.274).toFixed(2) + ' oz';
}

function converterVolume() {
  var l = prompt('Digite o valor em litros:');
  if (l === null) return;
  l = parseFloat(l);
  if (isNaN(l)) { showToast('Valor inválido', 'error'); return; }
  document.getElementById('ferramentaResultado').style.display = 'block';
  document.getElementById('ferramentaResultado').innerHTML =
    '<strong>🧊 Conversão de ' + l + ' L</strong><br>' +
    'Mililitros: ' + (l * 1000) + ' mL<br>' +
    'Metros cúbicos: ' + (l / 1000) + ' m³<br>' +
    'Galões (EUA): ' + (l * 0.264).toFixed(2) + ' gal';
}

function converterTemperatura() {
  var c = prompt('Digite a temperatura em Celsius:');
  if (c === null) return;
  c = parseFloat(c);
  if (isNaN(c)) { showToast('Valor inválido', 'error'); return; }
  document.getElementById('ferramentaResultado').style.display = 'block';
  document.getElementById('ferramentaResultado').innerHTML =
    '<strong>🌡️ Conversão de ' + c + '°C</strong><br>' +
    'Fahrenheit: ' + ((c * 9/5) + 32).toFixed(1) + ' °F<br>' +
    'Kelvin: ' + (c + 273.15).toFixed(1) + ' K';
}

// ============================================
// Chat
// ============================================
async function carregarChatSolicitacoes() {
  if (!profissional) return;
  var select = document.getElementById('chatSolicitacaoSelect');
  select.innerHTML = '<option value="">Selecione uma solicitação para conversar</option>';
  var result = await apiRequest(API_BASE + '/solicitacoes/profissional/' + profissional.id);
  if (result && result.success) {
    var achouSelecionada = false;
    for (var i = 0; i < result.data.length; i++) {
      var sol = result.data[i];
      var opt = document.createElement('option');
      opt.value = sol.id;
      opt.textContent = '#' + sol.id + ' - ' + sol.cliente_nome + ' (' + (sol.status_pagamento === 'pago' ? 'Pago' : 'Pendente') + ')';
      select.appendChild(opt);
      if (String(sol.id) === String(chatSolicitacaoSelecionada)) achouSelecionada = true;
    }
    // Restaura a conversa selecionada ao voltar para a aba Chat
    if (achouSelecionada) {
      select.value = chatSolicitacaoSelecionada;
      selecionarChat();
    } else if (chatSolicitacaoSelecionada) {
      chatSolicitacaoSelecionada = '';
    }
  }
}

function selecionarChat() {
  var select = document.getElementById('chatSolicitacaoSelect');
  var id = select.value;
  chatSolicitacaoSelecionada = id;
  if (!id) {
    document.getElementById('chatHeader').textContent = 'Selecione uma solicitação acima';
    document.getElementById('chatMessages').innerHTML = '<div class="chat-locked"><span class="icon">💬</span><p>Selecione uma solicitação para iniciar o chat</p></div>';
    document.getElementById('chatInputArea').style.display = 'none';
    if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
    return;
  }
  // Verificar pagamento
  var sol = null;
  for (var i = 0; i < solicitacoesData.length; i++) {
    if (solicitacoesData[i].id == id) { sol = solicitacoesData[i]; break; }
  }
  if (!sol) return;
  document.getElementById('chatHeader').textContent = '💬 ' + sol.cliente_nome;
  if (sol.status_pagamento !== 'pago') {
    document.getElementById('chatMessages').innerHTML =
      '<div class="chat-locked"><span class="icon">🔒</span><p>Chat bloqueado. Realize o pagamento de R$14,99 na aba "Solicitações" para liberar o chat com este cliente.</p></div>';
    document.getElementById('chatInputArea').style.display = 'none';
    if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
    return;
  }
  document.getElementById('chatInputArea').style.display = 'flex';
  carregarMensagens(id);
  // Auto refresh
  if (chatTimer) clearInterval(chatTimer);
  chatTimer = setInterval(function() { carregarMensagens(id); }, 5000);
}

async function carregarMensagens(solicitacaoId) {
  var result = await apiRequest(API_BASE + '/mensagens/' + solicitacaoId);
  if (result && result.success) {
    renderizarMensagens(result.data);
  }
}

function renderizarMensagens(mensagens) {
  var container = document.getElementById('chatMessages');
  container.innerHTML = '';
  if (mensagens.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:30px;"><span class="icon">💬</span><h3>Nenhuma mensagem</h3><p>Envie a primeira mensagem para o cliente.</p></div>';
    return;
  }
  for (var i = 0; i < mensagens.length; i++) {
    var msg = mensagens[i];
    // No chat do profissional, ele mesmo aparece à direita (vermelho) e o cliente à esquerda (cinza)
    var div = document.createElement('div');
    div.className = 'chat-message ' + (msg.remetente === 'profissional' ? 'cliente' : 'profissional');
    var time = new Date(msg.data_envio).toLocaleTimeString('pt-BR');
    div.innerHTML = '<div class="bubble">' + msg.texto + '<div class="time">' + time + '</div></div>';
    container.appendChild(div);
  }
  container.scrollTop = container.scrollHeight;
}

async function enviarMensagem() {
  var input = document.getElementById('chatInput');
  var texto = input.value.trim();
  var select = document.getElementById('chatSolicitacaoSelect');
  var solicitacaoId = select.value;
  if (!texto || !solicitacaoId) return;
  input.value = '';
  var result = await apiRequest(API_BASE + '/mensagens', {
    method: 'POST',
    body: JSON.stringify({
      solicitacao_id: parseInt(solicitacaoId),
      remetente: 'profissional',
      texto: texto
    })
  });
  if (result && result.success) {
    carregarMensagens(solicitacaoId);
  }
}

// ============================================
// Verificar Token
// ============================================
async function verificarToken() {
  if (!token) { mostrarLogin(); return; }

  // Estado otimista: se há cache, mostra o dashboard imediatamente
  var cache = carregarProfCache();
  if (cache) {
    profissional = { id: cache.id, nome_perfil: cache.nome_perfil, foto_perfil: cache.foto_perfil };
    document.getElementById('userName').textContent = cache.nome_perfil || 'Profissional';
    var avatarCache = document.getElementById('userAvatar');
    if (cache.foto_perfil) {
      avatarCache.innerHTML = '<img src="' + cache.foto_perfil + '" alt="Foto">';
    } else {
      avatarCache.textContent = '👤';
    }
    mostrarDashboard();
    mostrarWidgetChat();
  }

  var result = await apiRequest(API_BASE + '/profissionais/me');
  if (result && result.success) {
    profissional = result.data;
    salvarProfCache(result.data);
    document.getElementById('userName').textContent = profissional.nome_perfil;
    var avatar = document.getElementById('userAvatar');
    if (profissional.foto_perfil) {
      avatar.innerHTML = '<img src="' + profissional.foto_perfil + '" alt="Foto">';
    } else {
      avatar.textContent = '👤';
    }
    mostrarDashboard();
    mostrarWidgetChat();
    await carregarDados();
  } else {
    // Se a verificação falhar por erro de rede, mantém o cache (não derruba o login)
    if (!cache) {
      mostrarLogin();
    }
  }
}

// ============================================
// Header - Dropdown Avatar + Nome
// ============================================
function setupUserDropdown() {
  var trigger = document.getElementById('userDropdownTrigger');
  var dropdown = document.getElementById('userDropdown');
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    var isActive = dropdown.classList.toggle('active');
    trigger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
  });

  // Fecha ao clicar em qualquer item do menu
  var menu = document.getElementById('userDropdownMenu');
  if (menu) {
    menu.addEventListener('click', function(e) {
      if (e.target.closest('.user-dropdown-item')) {
        fecharDropdown();
      }
    });
  }

  // Fecha ao clicar fora
  document.addEventListener('click', function(e) {
    if (!dropdown.contains(e.target)) {
      fecharDropdown();
    }
  });

  // Fecha com Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') fecharDropdown();
  });
}

function fecharDropdown() {
  var dropdown = document.getElementById('userDropdown');
  var trigger = document.getElementById('userDropdownTrigger');
  if (dropdown) dropdown.classList.remove('active');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

// ============================================
// Configurações do Profissional
// ============================================
let configFotosServicos = [null, null, null];
let configFotoPerfil = null;
let configNovaFotoPerfil = null;
let configNovasFotos = [null, null, null];

function resizeImage(file, maxWidth, maxHeight, quality) {
  if (!maxWidth) maxWidth = 800;
  if (!maxHeight) maxHeight = 800;
  if (!quality) quality = 0.7;
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(e) {
      var img = new Image();
      img.src = e.target.result;
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var width = img.width;
        var height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
}

async function uploadImageToCloudinary(base64Image, folder) {
  var response = await fetch(API_BASE + '/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, folder: folder })
  });
  var result = await response.json();
  if (!result.success) throw new Error(result.message || 'Erro no upload');
  return result.data.url;
}

async function uploadMultipleToCloudinary(images, folder) {
  if (!images || images.length === 0) return [];
  var response = await fetch(API_BASE + '/upload/multiplas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: images, folder: folder })
  });
  var result = await response.json();
  if (!result.success) throw new Error(result.message || 'Erro no upload');
  return result.data.map(function(item) { return item.url; });
}

function abrirConfiguracoes() {
  if (!profissional) {
    showToast('Faça login primeiro', 'error');
    return;
  }
  fecharDropdown();
  renderizarConfiguracoes();
  document.getElementById('configModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharConfiguracoes() {
  document.getElementById('configModal').classList.remove('active');
  document.body.style.overflow = '';
  configNovaFotoPerfil = null;
  configNovasFotos = [null, null, null];
}

function renderizarConfiguracoes() {
  var prof = profissional;
  configFotoPerfil = prof.foto_perfil || null;
  configFotosServicos = (prof.fotos_servicos && Array.isArray(prof.fotos_servicos))
    ? prof.fotos_servicos.slice(0, 3)
    : [null, null, null];
  while (configFotosServicos.length < 3) configFotosServicos.push(null);

  var html = '';
  html += '<div class="config-section">';
  html += '  <h4><span data-icon="user"></span> Informações Pessoais</h4>';
  html += '  <div class="config-grid">';
  html += '    <div class="config-group"><label>Nome de Perfil</label><input type="text" id="cfgNome" value="' + escHtml(prof.nome_perfil || '') + '"></div>';
  html += '    <div class="config-group"><label>E-mail</label><input type="email" id="cfgEmail" value="' + escHtml(prof.email || '') + '"></div>';
  html += '    <div class="config-group"><label>CPF</label><input type="text" value="' + escHtml(prof.cpf || '') + '" disabled></div>';
  html += '    <div class="config-group"><label>Profissão</label><input type="text" value="' + escHtml(prof.profissao || '') + '" disabled></div>';
  html += '    <div class="config-group"><label>Endereço</label><input type="text" id="cfgEndereco" value="' + escHtml(prof.endereco || '') + '"></div>';
  html += '    <div class="config-group"><label>Número</label><input type="text" id="cfgNumero" value="' + escHtml(prof.numero || '') + '"></div>';
  html += '    <div class="config-group"><label>Bairro</label><input type="text" id="cfgBairro" value="' + escHtml(prof.bairro || '') + '"></div>';
  html += '    <div class="config-group"><label>Cidade</label><input type="text" id="cfgCidade" value="' + escHtml(prof.cidade || '') + '"></div>';
  html += '    <div class="config-group"><label>Estado (UF)</label><input type="text" id="cfgEstado" maxlength="2" value="' + escHtml(prof.estado || '') + '"></div>';
  html += '    <div class="config-group"><label>CEP</label><input type="text" id="cfgCep" value="' + escHtml(prof.cep || '') + '"></div>';
  html += '  </div>';
  html += '</div>';

  // Foto de perfil
  html += '<div class="config-section">';
  html += '  <h4><span data-icon="camera"></span> Foto de Perfil</h4>';
  html += '  <div class="config-foto-perfil">';
  html += '    <div class="config-foto-perfil-preview" id="cfgFotoPerfilPreview" style="cursor:pointer;" onclick="document.getElementById(\'cfgFotoPerfilInput\').click()">';
  html += configFotoPerfil
    ? '<img src="' + configFotoPerfil + '" alt="Foto de Perfil">'
    : '<div class="foto-placeholder">👤</div>';
  html += '    </div>';
  html += '    <input type="file" id="cfgFotoPerfilInput" accept="image/*" style="display:none;">';
  html += '    <p style="font-size:13px;color:var(--gray-medium);">Clique na foto para alterar</p>';
  html += '  </div>';
  html += '</div>';

  // Fotos de serviço
  html += '<div class="config-section">';
  html += '  <h4><span data-icon="image"></span> Fotos dos Serviços</h4>';
  html += '  <div class="config-foto-servicos" id="cfgFotosServicosContainer">';
  for (var i = 0; i < 3; i++) {
    html += '    <div class="config-foto-servico" data-index="' + i + '" onclick="document.getElementById(\'cfgServicoInput' + i + '\').click()">';
    html += configFotosServicos[i]
      ? '<img src="' + configFotosServicos[i] + '" alt="Serviço ' + (i + 1) + '">'
      : '<div class="placeholder"><span data-icon="image"></span><span>Foto ' + (i + 1) + '</span></div>';
    html += '      <input type="file" id="cfgServicoInput' + i + '" accept="image/*" style="display:none;" data-index="' + i + '">';
    html += '    </div>';
  }
  html += '  </div>';
  html += '</div>';

  html += '<div class="config-save-bar active" style="display:flex;justify-content:flex-end;gap:10px;">';
  html += '  <button class="btn btn-outline" onclick="fecharConfiguracoes()">Cancelar</button>';
  html += '  <button class="btn btn-primary" onclick="salvarConfiguracoes()">Salvar Alterações</button>';
  html += '</div>';

  document.getElementById('configBody').innerHTML = html;

  // Event listeners de upload
  document.getElementById('cfgFotoPerfilInput').addEventListener('change', async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    try {
      var resized = await resizeImage(file);
      configNovaFotoPerfil = resized;
      var preview = document.getElementById('cfgFotoPerfilPreview');
      preview.innerHTML = '<img src="' + resized + '" alt="Foto de Perfil">';
    } catch (err) {
      showToast('Erro ao processar imagem', 'error');
    }
  });

  for (var j = 0; j < 3; j++) {
    (function(idx) {
      var input = document.getElementById('cfgServicoInput' + idx);
      if (!input) return;
      input.addEventListener('change', async function(e) {
        var file = e.target.files[0];
        if (!file) return;
        try {
          var resized = await resizeImage(file);
          configNovasFotos[idx] = resized;
          var box = document.querySelector('.config-foto-servico[data-index="' + idx + '"]');
          if (box) box.innerHTML = '<img src="' + resized + '" alt="Serviço ' + (idx + 1) + '">';
        } catch (err) {
          showToast('Erro ao processar imagem', 'error');
        }
      });
    })(j);
  }
}

function escHtml(str) {
  if (!str) return ('');
  var a = String.fromCharCode(38);
  return String(str)
    .replace(/&/g, a + 'amp;')
    .replace(/</g, a + 'lt;')
    .replace(/>/g, a + 'gt;')
    .replace(/\x22/g, a + 'quot;')
    .replace(/'/g, a + '#39;');
}

async function salvarConfiguracoes() {
  var btn = event && event.target ? event.target : document.querySelector('[onclick="salvarConfiguracoes()"]');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Salvando...';
  }

  try {
    var dados = {
      nome_perfil: document.getElementById('cfgNome').value.trim(),
      email: document.getElementById('cfgEmail').value.trim(),
      endereco: document.getElementById('cfgEndereco').value.trim(),
      numero: document.getElementById('cfgNumero').value.trim(),
      bairro: document.getElementById('cfgBairro').value.trim(),
      cidade: document.getElementById('cfgCidade').value.trim(),
      estado: document.getElementById('cfgEstado').value.trim().toUpperCase(),
      cep: document.getElementById('cfgCep').value.trim()
    };

    // Upload nova foto de perfil se alterada
    if (configNovaFotoPerfil) {
      btn.innerHTML = '<span class="spinner"></span> Enviando foto de perfil...';
      dados.foto_perfil = await uploadImageToCloudinary(configNovaFotoPerfil, 'perfis');
    }

    // Upload novas fotos de serviço se alteradas
    var novasFotos = [];
    var temNova = false;
    for (var i = 0; i < 3; i++) {
      if (configNovasFotos[i]) { temNova = true; }
    }
    if (temNova) {
      btn.innerHTML = '<span class="spinner"></span> Enviando fotos dos serviços...';
      var fotosFinais = [];
      for (var k = 0; k < 3; k++) {
        if (configNovasFotos[k]) {
          fotosFinais.push(configNovasFotos[k]);
        } else if (configFotosServicos[k]) {
          fotosFinais.push(configFotosServicos[k]);
        }
      }
      if (fotosFinais.length > 0) {
        var urls = await uploadMultipleToCloudinary(fotosFinais, 'servicos');
        dados.fotos_servicos = urls;
      } else {
        dados.fotos_servicos = [];
      }
    }

    btn.innerHTML = '<span class="spinner"></span> Salvando...';
    var result = await apiRequest(API_BASE + '/profissionais/me', {
      method: 'PUT',
      body: JSON.stringify(dados)
    });

    if (result && result.success) {
      showToast('Configurações salvas com sucesso!', 'success');
      fecharConfiguracoes();
      // Atualiza dados locais e header
      var me = await apiRequest(API_BASE + '/profissionais/me');
      if (me && me.success) {
        profissional = me.data;
        document.getElementById('userName').textContent = profissional.nome_perfil;
        var avatar = document.getElementById('userAvatar');
        if (profissional.foto_perfil) {
          avatar.innerHTML = '<img src="' + profissional.foto_perfil + '" alt="Foto">';
        } else {
          avatar.textContent = '👤';
        }
      }
    } else {
      showToast((result && result.message) || 'Erro ao salvar configurações', 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    showToast(error.message || 'Erro ao salvar configurações', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Salvar Alterações';
    }
  }
}

// ============================================
// Retorno do Mercado Pago (Checkout Pro)
// Verifica se o usuário voltou de um pagamento
// ============================================
function verificarRetornoPagamento() {
  var params = new URLSearchParams(window.location.search);
  var status = params.get('status');
  var solicitacaoId = params.get('solicitacao_id');

  if (!status || !solicitacaoId) return;

  // Remove os parâmetros da URL sem recarregar
  if (window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (status === 'success') {
    showToast('Pagamento realizado. Verificando confirmação real...', 'info');

    // Tenta verificar o pagamento no backend
    setTimeout(async function() {
      var result = await apiRequest(API_BASE + '/pagamento/verificar/' + solicitacaoId, { method: 'POST' });
      if (result && result.success && result.data && result.data.status_pagamento === 'pago') {
        showToast('Chat liberado! Agora você pode conversar com o cliente.', 'success');
        await carregarSolicitacoes();
      } else if (result && result.success && result.data && result.data.status_pagamento === 'pendente') {
        showToast('Pagamento ainda não confirmado. Aguarde o processamento do Mercado Pago.', 'warning');
      } else {
        showToast('Pagamento não confirmado. Por favor, confirme novamente mais tarde.', 'warning');
      }
    }, 2000);
  } else if (status === 'pending') {
    showToast('Pagamento pendente. Complete o pagamento para liberar o chat.', 'warning');
  } else if (status === 'failure') {
    showToast('Pagamento cancelado ou não aprovado. Tente novamente.', 'error');
  }
}

// ============================================
// Widget de Chat Flutuante (Messenger)
// ============================================
function mostrarWidgetChat() {
  var widget = document.getElementById('chatWidget');
  if (widget) widget.classList.add('active');
  // Reinicia o polling de novas mensagens do cliente
  iniciarPollingWidgetProf();
}

function esconderWidgetChat() {
  var widget = document.getElementById('chatWidget');
  if (widget) widget.classList.remove('active');
  // Para o polling enquanto escondido
  pararPollingWidgetProf();
  // Zera badge e pulsação
  var bubble = document.getElementById('chatBubble');
  if (bubble) bubble.classList.remove('pulse');
  var badge = document.getElementById('chatBadge');
  if (badge) {
    badge.classList.remove('show');
    badge.textContent = '0';
  }
  var panel = document.getElementById('chatPanel');
  if (panel) panel.classList.remove('open');
}

// Polling global: verifica novas mensagens do cliente em todas as conversas
function iniciarPollingWidgetProf() {
  if (widgetGlobalIntervalProf) clearInterval(widgetGlobalIntervalProf);
  widgetGlobalIntervalProf = setInterval(function() {
    widgetVerificarNovasMensagensProf();
  }, 5000);
  widgetVerificarNovasMensagensProf();
}

function pararPollingWidgetProf() {
  if (widgetGlobalIntervalProf) {
    clearInterval(widgetGlobalIntervalProf);
    widgetGlobalIntervalProf = null;
  }
}

async function widgetVerificarNovasMensagensProf() {
  if (!token || !profissional) return;
  var result = await apiRequest(API_BASE + '/solicitacoes/profissional/' + profissional.id);
  if (!result || !result.success) return;

  // Total de mensagens não lidas vindas do backend (fonte de verdade = coluna lida)
  var totalNaoLidas = 0;
  for (var i = 0; i < result.data.length; i++) {
    var sol = result.data[i];
    if (sol.status_pagamento !== 'pago') continue;
    totalNaoLidas += (parseInt(sol.qtd_nao_lidas) || 0);
  }

var panel = document.getElementById('chatPanel');
  var chatAberto = panel && panel.classList.contains('open');

  // Se o painel estiver aberto (lista de conversas visível), atualiza a lista
  // ao vivo para que novas mensagens/snippets/badges apareçam ali mesmo.
  if (chatAberto) {
    widgetCarregarSolicitacoesProf();
    // Garante o badge global zerado enquanto o painel está aberto
    var badgeAberto = document.getElementById('chatBadge');
    if (badgeAberto && badgeAberto.classList.contains('show')) {
      badgeAberto.classList.remove('show');
      badgeAberto.textContent = '0';
    }
  }

  if (totalNaoLidas > 0 && !chatAberto) {
    var bubble = document.getElementById('chatBubble');
    if (bubble) bubble.classList.add('pulse');
    var badge = document.getElementById('chatBadge');
    if (badge) {
      badge.textContent = totalNaoLidas;
      badge.classList.add('show');
    }
    // Som "chiclete" ao receber nova mensagem do cliente
    tocarSomChiclete();
  } else {
    var badge2 = document.getElementById('chatBadge');
    if (badge2 && badge2.classList.contains('show')) {
      badge2.classList.remove('show');
      badge2.textContent = '0';
    }
  }
}

function toggleChatPainel() {
  var panel = document.getElementById('chatPanel');
  var widget = document.getElementById('chatWidget');
  if (!panel || !widget) return;
  if (panel.classList.contains('open')) {
    fecharChatPainel();
  } else {
    panel.classList.add('open');
    // Zera badge e pulsação ao abrir
    var bubble = document.getElementById('chatBubble');
    if (bubble) bubble.classList.remove('pulse');
    var badge = document.getElementById('chatBadge');
    if (badge) {
      badge.classList.remove('show');
      badge.textContent = '0';
    }
    widgetCarregarSolicitacoesProf();
  }
}

function fecharChatPainel() {
  var panel = document.getElementById('chatPanel');
  var widget = document.getElementById('chatWidget');
  if (panel) panel.classList.remove('open');
  if (widget) {
    widget.classList.add('active');
    widget.classList.remove('pulse');
  }
}

// Carrega a lista de conversas (estilo Messenger) com as conversas liberadas (pagas)
async function widgetCarregarSolicitacoesProf() {
  if (!profissional) return;
  var result = await apiRequest(API_BASE + '/solicitacoes/profissional/' + profissional.id);
  if (!result || !result.success) return;

  var convs = [];
  for (var i = 0; i < result.data.length; i++) {
    var sol = result.data[i];
    if (sol.status_pagamento !== 'pago') continue;
    convs.push(sol);
  }

  var list = document.getElementById('widgetChatList');
  if (!list) return;

  // Se já está em uma conversa aberta, apenas atualiza a lista em segundo plano
  if (widgetConversaSelecionada) {
    widgetAtualizarItemConversa(convs);
    return;
  }

  if (convs.length === 0) {
    list.innerHTML = '<div class="chat-conv-empty"><span class="icon">💬</span><p>Nenhuma conversa liberada ainda.</p></div>';
    return;
  }

  list.innerHTML = '';
  for (var j = 0; j < convs.length; j++) {
    var c = convs[j];
    var item = document.createElement('div');
    item.className = 'chat-conv-item';
    item.setAttribute('data-id', c.id);
    item.setAttribute('onclick', "widgetAbrirConversa('" + c.id + "')");

    var avatarHtml = c.cliente_foto
      ? '<img src="' + c.cliente_foto + '" alt="Foto">'
      : (c.cliente_nome ? c.cliente_nome.charAt(0).toUpperCase() : '👤');

var naoLidas = parseInt(c.qtd_nao_lidas) || 0;
    var badgeHtml = naoLidas > 0
      ? '<span class="chat-conv-badge">' + (naoLidas > 99 ? '99+' : naoLidas) + '</span>'
      : '';

    // Última mensagem da conversa (fonte: backend)
    var snippet = (c.descricao || 'Conversa liberada');
    if (c.ultima_mensagem) {
      var prefixo = c.ultima_mensagem_remetente === 'profissional' ? 'Você: ' : '';
      var txt = c.ultima_mensagem.replace(/\n/g, ' ');
      if (txt.length > 42) txt = txt.substring(0, 42) + '...';
      snippet = prefixo + txt;
    }

    item.innerHTML =
      '<span class="chat-conv-avatar">' + avatarHtml + '</span>' +
      '<span class="chat-conv-info">' +
        '<span class="chat-conv-top">' +
          '<span class="chat-conv-name">' + (c.cliente_nome || 'Cliente') + '</span>' +
          badgeHtml +
        '</span>' +
        '<span class="chat-conv-snippet">' + snippet + '</span>' +
      '</span>';
    list.appendChild(item);
  }
}

// Atualiza um item da lista (nome/snippet) sem refazer tudo
function widgetAtualizarItemConversa(convs) {
  for (var i = 0; i < convs.length; i++) {
    var c = convs[i];
    var item = document.querySelector('.chat-conv-item[data-id="' + c.id + '"]');
    if (item) {
var name = item.querySelector('.chat-conv-name');
      var snippet = item.querySelector('.chat-conv-snippet');
      if (name) name.textContent = c.cliente_nome || 'Cliente';
      if (snippet) {
        var snip = (c.descricao || 'Conversa liberada');
        if (c.ultima_mensagem) {
          var pref = c.ultima_mensagem_remetente === 'profissional' ? 'Você: ' : '';
          var tx = c.ultima_mensagem.replace(/\n/g, ' ');
          if (tx.length > 42) tx = tx.substring(0, 42) + '...';
          snip = pref + tx;
        }
        snippet.textContent = snip;
      }
      // Atualiza badge de não lidas por conversa
      var badge = item.querySelector('.chat-conv-badge');
      var naoLidas = parseInt(c.qtd_nao_lidas) || 0;
      if (naoLidas > 0) {
        if (badge) {
          badge.textContent = naoLidas;
        } else {
          var top = item.querySelector('.chat-conv-top');
          if (top) {
            var nb = document.createElement('span');
            nb.className = 'chat-conv-badge';
            nb.textContent = naoLidas;
            top.appendChild(nb);
          }
        }
      } else {
        if (badge) badge.remove();
      }
    }
  }
}

// Abre uma conversa específica (view estilo Messenger)
async function widgetAbrirConversa(id) {
  widgetConversaSelecionada = id;
  var list = document.getElementById('widgetChatList');
  var view = document.getElementById('widgetChatView');
  if (list) list.style.display = 'none';
  if (view) view.classList.add('open');

  // Destaque o item ativo na lista (para quando voltar)
  var items = document.querySelectorAll('.chat-conv-item');
  for (var i = 0; i < items.length; i++) {
    items[i].classList.remove('active');
    if (items[i].getAttribute('data-id') === String(id)) items[i].classList.add('active');
  }

  // Atualiza o cabeçalho da conversa
  var nome = document.getElementById('widgetChatViewNome');
  var avatar = document.getElementById('widgetChatViewAvatar');
  var sol = null;
  for (var j = 0; j < solicitacoesData.length; j++) {
    if (solicitacoesData[j].id == id) { sol = solicitacoesData[j]; break; }
  }
  if (nome) nome.textContent = sol && sol.cliente_nome ? sol.cliente_nome : 'Conversa';
  if (avatar) {
    if (sol && sol.cliente_foto) {
      avatar.innerHTML = '<img src="' + sol.cliente_foto + '" alt="Foto">';
    } else {
      avatar.textContent = sol && sol.cliente_nome ? sol.cliente_nome.charAt(0).toUpperCase() : '👤';
    }
  }

  // Inicia/atualiza o polling de mensagens da conversa
  if (widgetIntervaloMsgProf) clearInterval(widgetIntervaloMsgProf);
  widgetIntervaloMsgProf = setInterval(function() { widgetCarregarChat(); }, 5000);
  widgetCarregarChat();
}

function widgetVoltarParaLista() {
  if (widgetIntervaloMsgProf) { clearInterval(widgetIntervaloMsgProf); widgetIntervaloMsgProf = null; }
  widgetConversaSelecionada = '';
  var list = document.getElementById('widgetChatList');
  var view = document.getElementById('widgetChatView');
  if (list) list.style.display = '';
  if (view) view.classList.remove('open');
  // Recarrega a lista para mostrar o estado mais atual
  widgetCarregarSolicitacoesProf();
}

async function widgetCarregarChat() {
  if (!profissional) return;
  var id = widgetConversaSelecionada;
  var body = document.getElementById('widgetChatBody');
  var footer = document.getElementById('widgetChatFooter');
  var badge = document.getElementById('chatBadge');
  if (!body) return;

  if (!id) {
    body.innerHTML = '<div class="chat-panel-empty"><span class="icon">💬</span><p>Selecione uma conversa acima</p></div>';
    if (footer) footer.style.display = 'none';
    if (badge) badge.classList.remove('show');
    return;
  }

  // Busca os dados da solicitação para saber se o chat está liberado
  var sol = null;
  for (var i = 0; i < solicitacoesData.length; i++) {
    if (solicitacoesData[i].id == id) { sol = solicitacoesData[i]; break; }
  }

  if (sol && sol.status_pagamento !== 'pago') {
    body.innerHTML = '<div class="chat-panel-empty"><span class="icon">🔒</span><p>Chat bloqueado. Realize o pagamento na aba "Solicitações" para liberar.</p></div>';
    if (footer) footer.style.display = 'none';
    if (badge) badge.classList.remove('show');
    return;
  }

  // Carrega mensagens
  var result = await apiRequest(API_BASE + '/mensagens/' + id);
  if (result && result.success) {
    renderizarWidgetMensagens(result.data);
    if (footer) footer.style.display = 'flex';
    if (badge) badge.classList.remove('show');
  }
}

function renderizarWidgetMensagens(mensagens) {
  var body = document.getElementById('widgetChatBody');
  if (!body) return;
  body.innerHTML = '';
  if (!mensagens || mensagens.length === 0) {
    body.innerHTML = '<div class="chat-panel-empty"><span class="icon">💬</span><p>Nenhuma mensagem ainda. Envie a primeira!</p></div>';
    return;
  }
  for (var i = 0; i < mensagens.length; i++) {
    var msg = mensagens[i];
    var classe = msg.remetente === 'profissional' ? 'profissional' : 'cliente';
    var div = document.createElement('div');
    div.className = 'chat-panel-msg ' + classe;
    var time = new Date(msg.data_envio).toLocaleTimeString('pt-BR');
    div.innerHTML = '<div class="bubble">' + msg.texto + '<div class="time">' + time + '</div></div>';
    body.appendChild(div);
  }
  body.scrollTop = body.scrollHeight;
}

async function widgetEnviarMensagem() {
  var input = document.getElementById('widgetChatInput');
  var solicitacaoId = widgetConversaSelecionada;
  var texto = input.value.trim();
  if (!texto || !solicitacaoId) return;
  input.value = '';
  var result = await apiRequest(API_BASE + '/mensagens', {
    method: 'POST',
    body: JSON.stringify({
      solicitacao_id: parseInt(solicitacaoId),
      remetente: 'profissional',
      texto: texto
    })
  });
  if (result && result.success) {
    widgetCarregarChat();
  }
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('loginForm').addEventListener('submit', login);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') fecharModalOrcamento();
  });
document.getElementById('orcamentoModal').addEventListener('click', function(e) {
    if (e.target === this) fecharModalOrcamento();
  });
  setupUserDropdown();
  verificarToken();
  verificarRetornoPagamento();
});
