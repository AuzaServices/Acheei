// ============================================
// Acheei - Área do Profissional
// ============================================

const API_BASE = '/api';
let token = localStorage.getItem('acheei_prof_token');
let profissional = null;
let solicitacoesData = [];
let orcamentosData = [];
let chatTimer = null;

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
  token = null;
  profissional = null;
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
  if (tab === 'chat') carregarChatSolicitacoes();
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
    card.innerHTML =
      '<div class="card-header">' +
        '<h4>' + sol.cliente_nome + '</h4>' +
        '<span class="date">' + new Date(sol.data_solicitacao).toLocaleString('pt-BR') + '</span>' +
      '</div>' +
'<div class="info-grid">' +
        '<div class="item"><div class="label">Pagamento</div><div class="value">' + badgeHtml + '</div></div>' +
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
    for (var i = 0; i < result.data.length; i++) {
      var sol = result.data[i];
      var opt = document.createElement('option');
      opt.value = sol.id;
      opt.textContent = '#' + sol.id + ' - ' + sol.cliente_nome + ' (' + (sol.status_pagamento === 'pago' ? 'Pago' : 'Pendente') + ')';
      select.appendChild(opt);
    }
  }
}

function selecionarChat() {
  var select = document.getElementById('chatSolicitacaoSelect');
  var id = select.value;
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
    container.innerHTML = '<div class="chat-locked"><span class="icon">💬</span><p>Nenhuma mensagem ainda. Envie a primeira mensagem para o cliente!</p></div>';
    return;
  }
  for (var i = 0; i < mensagens.length; i++) {
    var msg = mensagens[i];
    var classe = msg.remetente === 'profissional' ? 'profissional' : 'cliente';
    var label = msg.remetente === 'profissional' ? 'Você' : 'Cliente';
    var div = document.createElement('div');
    div.className = 'msg ' + classe;
    div.innerHTML =
      '<div class="bubble">' + msg.texto + '</div>' +
      '<div class="time">' + label + ' - ' + new Date(msg.data_envio).toLocaleTimeString('pt-BR') + '</div>';
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
var result = await apiRequest(API_BASE + '/profissionais/me');
  if (result && result.success) {
    profissional = result.data;
    document.getElementById('userName').textContent = profissional.nome_perfil;
    var avatar = document.getElementById('userAvatar');
    if (profissional.foto_perfil) {
      avatar.innerHTML = '<img src="' + profissional.foto_perfil + '" alt="Foto">';
    } else {
      avatar.textContent = '👤';
    }
    mostrarDashboard();
    await carregarDados();
  } else {
    mostrarLogin();
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
function toggleChatPainel() {
  var panel = document.getElementById('chatPanel');
  var widget = document.getElementById('chatWidget');
  if (!panel || !widget) return;
  if (panel.classList.contains('open')) {
    fecharChatPainel();
  } else {
    panel.classList.add('open');
    widget.classList.remove('active');
    widget.classList.add('pulse');
    widgetCarregarChat();
  }
}

function fecharChatPainel() {
  var panel = document.getElementById('chatPanel');
  var widget = document.getElementById('chatWidget');
  if (panel) panel.classList.remove('open');
  if (widget) widget.classList.remove('pulse');
}

async function widgetCarregarChat() {
  if (!profissional) return;
  var select = document.getElementById('widgetChatSelect');
  var id = select.value;
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
    body.innerHTML = '<div class="chat-panel-empty"><span class="icon">💬</span><p>Nenhuma mensagem ainda.</p></div>';
    return;
  }
  for (var i = 0; i < mensagens.length; i++) {
    var msg = mensagens[i];
    var classe = msg.remetente === 'profissional' ? 'profissional' : 'cliente';
    var label = msg.remetente === 'profissional' ? 'Você' : 'Cliente';
    var div = document.createElement('div');
    div.className = 'chat-panel-msg ' + classe;
    div.innerHTML = '<div class="bubble">' + msg.texto + '</div><div class="time">' + label + ' - ' + new Date(msg.data_envio).toLocaleTimeString('pt-BR') + '</div>';
    body.appendChild(div);
  }
  body.scrollTop = body.scrollHeight;
}

async function widgetEnviarMensagem() {
  var input = document.getElementById('widgetChatInput');
  var select = document.getElementById('widgetChatSelect');
  var solicitacaoId = select.value;
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
