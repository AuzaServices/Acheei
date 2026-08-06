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

  var result = await apiRequest(API_BASE + '/profissionais/login', {
    method: 'POST',
    body: JSON.stringify({ email: email, senha: senha })
  });

  btn.disabled = false;
  btn.innerHTML = 'Entrar na Área';

  if (result && result.success) {
    token = result.data.token;
    profissional = result.data.profissional;
    localStorage.setItem('acheei_prof_token', token);
    document.getElementById('profNome').textContent = profissional.nome_perfil;
    // Foto
    var fotoHtml = '';
    if (profissional.foto_perfil) {
      fotoHtml = '<img src="' + profissional.foto_perfil + '" alt="Foto" class="foto-mini">';
    } else {
      fotoHtml = '<div class="foto-mini-placeholder">👤</div>';
    }
    document.getElementById('profFotoMini').innerHTML = fotoHtml;
    mostrarDashboard();
    carregarDados();
    showToast('Login realizado com sucesso!', 'success');
  } else {
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
      btn.innerHTML = '💳 Pagar R$14,99';
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
function calcular(tipo) {
  var res = 0;
  if (tipo === 'soma') {
    var a = parseFloat(document.getElementById('calcSoma1').value) || 0;
    var b = parseFloat(document.getElementById('calcSoma2').value) || 0;
    res = a + b;
    document.getElementById('resSoma').textContent = res;
  } else if (tipo === 'subtracao') {
    var a = parseFloat(document.getElementById('calcSub1').value) || 0;
    var b = parseFloat(document.getElementById('calcSub2').value) || 0;
    res = a - b;
    document.getElementById('resSub').textContent = res;
  } else if (tipo === 'multiplicacao') {
    var a = parseFloat(document.getElementById('calcMult1').value) || 0;
    var b = parseFloat(document.getElementById('calcMult2').value) || 0;
    res = a * b;
    document.getElementById('resMult').textContent = res;
  } else if (tipo === 'divisao') {
    var a = parseFloat(document.getElementById('calcDiv1').value) || 0;
    var b = parseFloat(document.getElementById('calcDiv2').value) || 1;
    if (b === 0) { showToast('Divisão por zero!', 'error'); return; }
    res = a / b;
    document.getElementById('resDiv').textContent = res.toFixed(2);
  } else if (tipo === 'porcentagem') {
    var valor = parseFloat(document.getElementById('calcPctValor').value) || 0;
    var pct = parseFloat(document.getElementById('calcPctPct').value) || 0;
    res = (valor * pct) / 100;
    document.getElementById('resPct').textContent = res.toFixed(2);
  } else if (tipo === 'juros') {
    var capital = parseFloat(document.getElementById('calcJurosCapital').value) || 0;
    var taxa = parseFloat(document.getElementById('calcJurosTaxa').value) || 0;
    var tempo = parseFloat(document.getElementById('calcJurosTempo').value) || 0;
    res = capital * (taxa / 100) * tempo;
    document.getElementById('resJuros').textContent = 'Juros: R$ ' + res.toFixed(2).replace('.', ',') + ' | Total: R$ ' + (capital + res).toFixed(2).replace('.', ',');
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
    document.getElementById('profNome').textContent = profissional.nome_perfil;
    var fotoHtml = '';
    if (profissional.foto_perfil) {
      fotoHtml = '<img src="' + profissional.foto_perfil + '" alt="Foto" class="foto-mini">';
    } else {
      fotoHtml = '<div class="foto-mini-placeholder">👤</div>';
    }
    document.getElementById('profFotoMini').innerHTML = fotoHtml;
    mostrarDashboard();
    await carregarDados();
  } else {
    mostrarLogin();
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
  verificarToken();
  verificarRetornoPagamento();
});
