// ============================================
// Acheei - Área do Cliente
// Login, Cadastro, Solicitações, Orçamentos, Chat
// ============================================

const API_BASE = '/api';

let token = localStorage.getItem('acheei_cliente_token');
let clienteData = null;
let solicitacoesData = [];
let orcamentosData = [];
let chatTimer = null;
let chatSolicitacaoSelecionada = '';
let avalModalId = null;

// Estado do widget de chat
let widgetGlobalInterval = null;
let widgetUltimasMensagens = {};
let widgetConversaSelecionada = '';
let widgetIntervaloMsg = null;

// ============================================
// Cache do Cliente (compartilhado via localStorage)
// ============================================
function salvarClienteCache(c) {
  if (c) {
    localStorage.setItem('acheei_cliente_cache', JSON.stringify({ nome: c.nome, foto: c.foto || c.foto_perfil || null, id: c.id }));
  } else {
    localStorage.removeItem('acheei_cliente_cache');
  }
}

function carregarClienteCache() {
  try {
    return JSON.parse(localStorage.getItem('acheei_cliente_cache') || 'null');
  } catch (e) {
    return null;
  }
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

function formatTelefone(value) {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
}

// ============================================
// Som "chiclete" (estalo de goma de mascar) ao receber nova mensagem
// ============================================
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
        localStorage.removeItem('acheei_cliente_token');
        salvarClienteCache(null);
        token = null;
        mostrarLogin();
        showToast('Sessão expirada. Faça login novamente.', 'error');
        return null;
      }
      throw new Error(result.message || 'Erro na requisição');
    }
    return result;
  } catch (error) {
    console.error('Erro na requisição:', error);
    showToast(error.message || 'Erro ao conectar com o servidor', 'error');
    return null;
  }
}

// ============================================
// Auth Screen
// ============================================
function mostrarLogin() {
  var auth = document.getElementById('authScreen');
  var dash = document.getElementById('dashboard');
  if (auth) auth.style.display = 'flex';
  if (dash) dash.style.display = 'none';
  if (token) { token = null; localStorage.removeItem('acheei_cliente_token'); }
}

function mostrarDashboard() {
  var auth = document.getElementById('authScreen');
  var dash = document.getElementById('dashboard');
  if (auth) auth.style.display = 'none';
  if (dash) dash.style.display = 'block';
  mostrarWidgetChat();
}

function switchAuthTab(tab) {
  var tabs = document.querySelectorAll('.auth-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].getAttribute('onclick').indexOf("'" + tab + "'") !== -1);
  }
  var forms = document.querySelectorAll('.auth-form');
  for (var j = 0; j < forms.length; j++) {
    forms[j].classList.toggle('active', forms[j].id === (tab === 'login' ? 'loginForm' : 'cadastroForm'));
  }
  var err = document.getElementById('loginError');
  if (err) err.style.display = 'none';
  var cerr = document.getElementById('cadastroError');
  if (cerr) cerr.style.display = 'none';
}

async function login(event) {
  event.preventDefault();
  var btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Entrando...';
  var email = document.getElementById('loginEmail').value.trim();
  var senha = document.getElementById('loginSenha').value;

  var response = await apiRequest(API_BASE + '/clientes/login', {
    method: 'POST',
    body: JSON.stringify({ email: email, senha: senha })
  });

  btn.disabled = false;
  btn.innerHTML = 'Entrar';

  if (response && response.success) {
    token = response.data.token;
    clienteData = response.data.cliente;
    localStorage.setItem('acheei_cliente_token', token);
    salvarClienteCache(clienteData);
    if (document.getElementById('userName')) document.getElementById('userName').textContent = clienteData.nome;
    mostrarDashboard();
    carregarDados();
    iniciarPollingWidget();
    showToast('Login realizado com sucesso!', 'success');
    setTimeout(function() { salvarAssinaturaPendente(); }, 500);
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}

async function cadastro(event) {
  event.preventDefault();
  var btn = document.getElementById('btnCriarConta');
  var nome = document.getElementById('cadastroNome').value.trim();
  var email = document.getElementById('cadastroEmail').value.trim();
  var senha = document.getElementById('cadastroSenha').value;
  var telefone = document.getElementById('cadastroTelefone').value.trim();

  if (!nome || !email || !senha || !telefone) {
    document.getElementById('cadastroError').textContent = 'Preencha todos os campos';
    document.getElementById('cadastroError').style.display = 'block';
    return;
  }
  if (senha.length < 6) {
    document.getElementById('cadastroError').textContent = 'A senha deve ter no mínimo 6 caracteres';
    document.getElementById('cadastroError').style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Criando conta...';
  var response = await apiRequest(API_BASE + '/clientes/cadastro', {
    method: 'POST',
    body: JSON.stringify({ nome: nome, email: email, senha: senha, telefone: telefone })
  });
  btn.disabled = false;
  btn.innerHTML = 'Criar Conta';

  if (response && response.success) {
    token = response.data.token;
    clienteData = response.data.cliente;
    localStorage.setItem('acheei_cliente_token', token);
    salvarClienteCache(clienteData);
    if (document.getElementById('userName')) document.getElementById('userName').textContent = clienteData.nome;
    document.getElementById('cadastroSuccess').style.display = 'block';
    setTimeout(function() {
      mostrarDashboard();
      carregarDados();
      iniciarPollingWidget();
      salvarAssinaturaPendente();
      showToast('Conta criada e login realizado!', 'success');
    }, 800);
  } else {
    var msg = (response && response.message) ? response.message : 'Erro ao criar conta';
    document.getElementById('cadastroError').textContent = msg;
    document.getElementById('cadastroError').style.display = 'block';
  }
}

async function ativarNotificacoesCadastro() {
  var ok = await ativarNotificacoes();
  var btn = document.getElementById('btnCriarConta');
  if (ok) {
    var notice = document.getElementById('pushNotice');
    if (notice) {
      notice.style.borderColor = '#28a745';
      notice.innerHTML = '<strong>✅ Notificações ativadas!</strong>';
    }
    if (btn) btn.disabled = false;
  } else {
    if (btn) btn.disabled = true;
  }
}

function logout() {
  localStorage.removeItem('acheei_cliente_token');
  salvarClienteCache(null);
  token = null;
  clienteData = null;
  pararPollingWidget();
  mostrarLogin();
  showToast('Sessão encerrada', 'info');
}

function sairUsuario() {
  logout();
  window.location.href = '/';
}

// ============================================
// Tabs
// ============================================
function switchTab(tab, btn) {
  var tabs = document.querySelectorAll('.dashboard-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  if (btn) btn.classList.add('active');
  var contents = document.querySelectorAll('.tab-content');
  for (var j = 0; j < contents.length; j++) contents[j].classList.remove('active');
  var map = { solicitacoes: 'tabSolicitacoes', orcamentos: 'tabOrcamentos', chat: 'tabChat' };
  document.getElementById(map[tab]).classList.add('active');
  if (tab === 'chat') {
    esconderWidgetChat();
    carregarChatSolicitacoes();
  } else {
    mostrarWidgetChat();
    if (tab === 'solicitacoes') {
      carregarSolicitacoes();
    } else if (tab === 'orcamentos') {
      carregarOrcamentos();
    }
  }
}

// ============================================
// Carregar Dados
// ============================================
async function carregarDados() {
  if (!token) return;
  await carregarSolicitacoes();
  await carregarOrcamentos();
}

// ============================================
// Solicitações do Cliente
// ============================================
async function carregarSolicitacoes() {
  if (!token) return;
  var result = await apiRequest(API_BASE + '/clientes/solicitacoes');
  if (result && result.success) {
    solicitacoesData = result.data;
    renderizarSolicitacoes();
    document.getElementById('countSolicitacoes').textContent = result.total;
  }
}

function renderizarSolicitacoes() {
  var container = document.getElementById('solicitacoesList');
  if (!container) return;
  container.innerHTML = '';
  if (solicitacoesData.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="icon">📋</span><h3>Nenhuma solicitação ainda</h3><p>Quando você solicitar serviços, eles aparecerão aqui.</p></div>';
    return;
  }
  for (var i = 0; i < solicitacoesData.length; i++) {
    var sol = solicitacoesData[i];
    var card = document.createElement('div');
    card.className = 'solicitacao-card';

    var fotoHtml = sol.foto_perfil
      ? '<img src="' + sol.foto_perfil + '" alt="' + sol.nome_perfil + '" class="foto">'
      : '<div class="foto-placeholder">👤</div>';

    var statusPag = sol.status_pagamento === 'pago'
      ? '<span class="status-badge aprovado">Chat liberado</span>'
      : '<span class="status-badge pendente">Aguardando liberação</span>';

    // Data/Hora, Urgência, Orçamento (opcionais)
    var extrasHtml = '';
    if (sol.data_hora) {
      var dh = new Date(sol.data_hora);
      extrasHtml += '<div style="margin-bottom:4px;color:var(--gray-dark);font-size:13px;"><strong>Data/Hora:</strong> ' + dh.toLocaleString('pt-BR') + '</div>';
    }
    if (sol.urgencia) {
      extrasHtml += '<div style="margin-bottom:4px;color:var(--gray-dark);font-size:13px;"><strong>Urgência:</strong> ' + sol.urgencia + '</div>';
    }
    if (sol.orcamento_estimado) {
      extrasHtml += '<div style="margin-bottom:4px;color:var(--gray-dark);font-size:13px;"><strong>Orçamento estimado:</strong> ' + sol.orcamento_estimado + '</div>';
    }

    // Avaliação
    var avaliacaoHtml = '';
    if (sol.avaliacao_nota) {
      avaliacaoHtml = '<div class="avaliacao-enviada">⭐ Avaliada: ' + sol.avaliacao_nota + '/5</div>';
    } else if (sol.status_pagamento === 'pago') {
      avaliacaoHtml = '<div class="avaliacao-disponivel"><p>Como foi o atendimento deste profissional?</p><button class="btn btn-outline btn-sm" onclick="abrirModalAvaliacao(' + sol.id + ', ' + sol.profissional_id + ')">Avaliar profissional</button></div>';
    }

    card.innerHTML =
      '<div class="card-header">' +
        '<div class="prof-info">' + fotoHtml + '<div><h4>' + (sol.nome_perfil || '') + '</h4><div class="profissao">' + (sol.profissao || '') + '</div></div></div>' +
        '<span class="date">' + new Date(sol.data_solicitacao).toLocaleString('pt-BR') + '</span>' +
      '</div>' +
      '<div class="descricao">' + sol.descricao + '</div>' +
      extrasHtml +
      '<div style="margin-bottom:8px;">' + statusPag + '</div>' +
      avaliacaoHtml;
    container.appendChild(card);
  }
}

function abrirChatSolicitacao(id) {
  // Troca para a aba Chat e seleciona a solicitação
  var btn = null;
  var tabs = document.querySelectorAll('.dashboard-tab');
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].getAttribute('onclick') && tabs[i].getAttribute('onclick').indexOf("'chat'") !== -1) {
      btn = tabs[i]; break;
    }
  }
  switchTab('chat', btn);
  setTimeout(function() {
    var select = document.getElementById('chatSolicitacaoSelect');
    if (select) {
      select.value = String(id);
      chatSolicitacaoSelecionada = String(id);
      carregarChat();
    }
  }, 200);
}

// ============================================
// Orçamentos do Cliente
// ============================================
async function carregarOrcamentos() {
  if (!token) return;
  var result = await apiRequest(API_BASE + '/clientes/orcamentos');
  if (result && result.success) {
    orcamentosData = result.data;
    renderizarOrcamentos();
    document.getElementById('countOrcamentos').textContent = result.total;
  }
}

function renderizarOrcamentos() {
  var container = document.getElementById('orcamentosList');
  if (!container) return;
  container.innerHTML = '';
  if (orcamentosData.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="icon">💰</span><h3>Nenhum orçamento ainda</h3><p>Os orçamentos enviados pelos profissionais aparecerão aqui.</p></div>';
    return;
  }
  for (var i = 0; i < orcamentosData.length; i++) {
    var orc = orcamentosData[i];
    var card = document.createElement('div');
    card.className = 'orcamento-card';
    var statusLabel = orc.status.charAt(0).toUpperCase() + orc.status.slice(1);
    card.innerHTML =
      '<div class="card-header">' +
        '<div class="prof-info">' +
          (orc.foto_perfil ? '<img src="' + orc.foto_perfil + '" alt="' + orc.nome_perfil + '" class="foto">' : '<div class="foto-placeholder">👤</div>') +
          '<div><h4>' + orc.nome_perfil + '</h4><div class="profissao">' + orc.profissao + '</div></div>' +
        '</div>' +
        '<span class="date">' + new Date(orc.data_criacao).toLocaleDateString('pt-BR') + '</span>' +
      '</div>' +
      '<div class="valor">' + formatarMoeda(orc.valor) + '</div>' +
      '<div class="descricao">' + orc.descricao + '</div>' +
      '<div style="margin-top:12px;"><span class="status-badge ' + orc.status + '">' + statusLabel + '</span></div>';
    container.appendChild(card);
  }
}

// ============================================
// Chat (aba)
// ============================================
async function carregarChatSolicitacoes() {
  var select = document.getElementById('chatSolicitacaoSelect');
  if (!select) return;
  select.innerHTML = '<option value="">Selecione uma solicitação...</option>';
  if (!token) return;
  var result = await apiRequest(API_BASE + '/clientes/solicitacoes');
  if (result && result.success) {
    for (var i = 0; i < result.data.length; i++) {
      var sol = result.data[i];
      if (sol.status_pagamento !== 'pago') continue;
      var opt = document.createElement('option');
      opt.value = sol.id;
      opt.textContent = '#' + sol.id + ' - ' + (sol.nome_perfil || 'Profissional') + ' (' + (sol.profissao || '') + ')';
      select.appendChild(opt);
    }
    if (chatSolicitacaoSelecionada) {
      select.value = chatSolicitacaoSelecionada;
      carregarChat();
    }
  }
}

async function carregarChat() {
  var select = document.getElementById('chatSolicitacaoSelect');
  var id = select ? select.value : '';
  chatSolicitacaoSelecionada = id;
  var emptyState = document.getElementById('chatEmptyState');
  var container = document.getElementById('chatContainer');

  if (!id) {
    if (container) container.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
    return;
  }
  if (container) container.style.display = 'block';
  if (emptyState) emptyState.style.display = 'none';

  var result = await apiRequest(API_BASE + '/clientes/mensagens/' + id);
  if (result && result.success) {
    renderizarMensagens(result.data);
  }

  if (chatTimer) clearInterval(chatTimer);
  chatTimer = setInterval(function() { carregarMensagensLoop(id); }, 5000);
}

async function carregarMensagensLoop(id) {
  var select = document.getElementById('chatSolicitacaoSelect');
  if (!select || select.value !== String(id)) { clearInterval(chatTimer); chatTimer = null; return; }
  var result = await apiRequest(API_BASE + '/clientes/mensagens/' + id);
  if (result && result.success) {
    renderizarMensagens(result.data);
  }
}

function renderizarMensagens(mensagens) {
  var container = document.getElementById('chatMessages');
  if (!container) return;
  container.innerHTML = '';
  if (mensagens.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-medium);">Nenhuma mensagem ainda. Envie a primeira!</div>';
    return;
  }
  // Última mensagem enviada pelo cliente (para exibir o status de visualização)
  var ultimaEnviadaIdx = -1;
  for (var i = mensagens.length - 1; i >= 0; i--) {
    if (mensagens[i].remetente === 'cliente') { ultimaEnviadaIdx = i; break; }
  }
  for (var i = 0; i < mensagens.length; i++) {
    var msg = mensagens[i];
    // Cliente à direita (vermelho), profissional à esquerda (cinza)
    var div = document.createElement('div');
    div.className = 'chat-message ' + (msg.remetente === 'cliente' ? 'cliente' : 'profissional');
    var time = new Date(msg.data_envio).toLocaleTimeString('pt-BR');
    var statusHtml = '';
    if (i === ultimaEnviadaIdx) {
      var lida = msg.lida === 1 || msg.lida === true;
      var simbolo = lida ? '✓✓' : '✓';
      var texto = lida ? 'Visto' : 'Enviado';
      statusHtml = '<div class="msg-status">' + simbolo + ' ' + texto + '</div>';
    }
div.innerHTML = '<div class="bubble">' + msg.texto + '<div class="time">' + time + '</div></div>' + statusHtml;
    container.appendChild(div);
  }
  container.scrollTop = container.scrollHeight;
}

async function enviarMensagemCliente() {
  var input = document.getElementById('chatInput');
  var texto = input.value.trim();
  var select = document.getElementById('chatSolicitacaoSelect');
  var solicitacaoId = select ? select.value : '';
  if (!texto || !solicitacaoId) return;
  input.value = '';
  var result = await apiRequest(API_BASE + '/clientes/mensagens', {
    method: 'POST',
    body: JSON.stringify({ solicitacao_id: parseInt(solicitacaoId), texto: texto })
  });
  if (result && result.success) {
    carregarChat();
  }
}

// ============================================
// Avaliação
// ============================================
function abrirModalAvaliacao(solicitacaoId, profissionalId) {
  if (!solicitacaoId || !profissionalId) return;
  avalModalId = solicitacaoId;
  document.getElementById('avaliacaoSolicitacaoId').value = solicitacaoId;
  // Buscar nome do profissional
  for (var i = 0; i < solicitacoesData.length; i++) {
    var sol = solicitacoesData[i];
    if (sol.id == solicitacaoId) {
      document.getElementById('avaliacaoProfissional').textContent = 'Avaliando: ' + (sol.nome_perfil || 'Profissional') + ' (' + (sol.profissao || '') + ')';
      break;
    }
  }
  document.getElementById('avaliacaoModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModalAvaliacao() {
  document.getElementById('avaliacaoModal').classList.remove('active');
  document.body.style.overflow = '';
  var form = document.getElementById('avaliacaoForm');
  if (form) form.reset();
}

async function enviarAvaliacao(event) {
  event.preventDefault();
  var solicitacao_id = document.getElementById('avaliacaoSolicitacaoId').value;
  var nota = document.getElementById('avaliacaoNota').value;
  var respeito = document.getElementById('avaliacaoRespeito').value;
  var comprometimento = document.getElementById('avaliacaoComprometimento').value;
  var qualidade = document.getElementById('avaliacaoQualidade').value;

  if (!nota || !respeito || !comprometimento || !qualidade) {
    showToast('Selecione a nota e preencha todas as respostas', 'error');
    return;
  }

  var btn = event.target.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enviando...'; }

  var result = await apiRequest(API_BASE + '/clientes/avaliacoes', {
    method: 'POST',
    body: JSON.stringify({ solicitacao_id: parseInt(solicitacao_id), nota: parseInt(nota), respeito: respeito, comprometimento: comprometimento, qualidade: qualidade })
  });

  if (btn) { btn.disabled = false; btn.innerHTML = 'Enviar avaliação'; }

  if (result && result.success) {
    fecharModalAvaliacao();
    showToast('Avaliação enviada com sucesso!', 'success');
    await carregarSolicitacoes();
  } else {
    showToast((result && result.message) || 'Erro ao enviar avaliação', 'error');
  }
}

function setAvaliacaoEstrela(nota) {
  var input = document.getElementById('avaliacaoNota');
  if (input) input.value = nota;
  var btns = document.querySelectorAll('.estrela-btn');
  for (var i = 0; i < btns.length; i++) {
    var n = parseInt(btns[i].getAttribute('data-nota'));
    btns[i].style.opacity = n <= nota ? '1' : '0.3';
  }
}

// ============================================
// Widget de Chat Flutuante (Messenger)
// ============================================
function iniciarPollingWidget() {
  pararPollingWidget();
  widgetGlobalInterval = setInterval(function() {
    verificarNovasMensagensWidget();
  }, 5000);
  verificarNovasMensagensWidget();
}

// Zera o badge global do balão (usado ao abrir o painel / conversa)
function zerarBadgeWidget() {
  var badge = document.getElementById('chatBadge');
  if (badge) {
    badge.classList.remove('show');
    badge.textContent = '0';
  }
  var bubble = document.getElementById('chatBubble');
  if (bubble) bubble.classList.remove('pulse');
}

function pararPollingWidget() {
  if (widgetGlobalInterval) { clearInterval(widgetGlobalInterval); widgetGlobalInterval = null; }
  if (widgetIntervaloMsg) { clearInterval(widgetIntervaloMsg); widgetIntervaloMsg = null; }
}

function toggleChatPainel() {
  var panel = document.getElementById('chatPanel');
  if (!panel) return;
  if (panel.classList.contains('open')) {
    fecharChatPainel();
  } else {
    panel.classList.add('open');
    var bubble = document.getElementById('chatBubble');
    if (bubble) bubble.classList.remove('pulse');
    var badge = document.getElementById('chatBadge');
    if (badge) { badge.classList.remove('show'); badge.textContent = '0'; }
    widgetCarregarSolicitacoes();
  }
}

function fecharChatPainel() {
  var panel = document.getElementById('chatPanel');
  if (panel) panel.classList.remove('open');
  // Para o polling da conversa aberta e limpa o estado, para não marcar
  // mensagens como lidas enquanto o painel está fechado.
  if (widgetIntervaloMsg) { clearInterval(widgetIntervaloMsg); widgetIntervaloMsg = null; }
  widgetConversaSelecionada = '';
  var view = document.getElementById('widgetChatView');
  if (view) view.classList.remove('open');
  // Restaura a visibilidade da lista de conversas (o widgetAbrirConversa esconde ela)
  var list = document.getElementById('widgetChatList');
  if (list) list.style.display = '';
}

// Exibe o balão de chat flutuante (canto inferior direito)
function mostrarWidgetChat() {
  var widget = document.getElementById('chatWidget');
  if (widget) widget.classList.add('active');
}

// Esconde o balão de chat flutuante (usado na aba Chat, igual à área do profissional)
function esconderWidgetChat() {
  var widget = document.getElementById('chatWidget');
  if (widget) widget.classList.remove('active');
  var bubble = document.getElementById('chatBubble');
  if (bubble) bubble.classList.remove('pulse');
  var badge = document.getElementById('chatBadge');
  if (badge) {
    badge.classList.remove('show');
    badge.textContent = '0';
  }
var panel = document.getElementById('chatPanel');
  if (panel) panel.classList.remove('open');
  // Restaura a visibilidade da lista de conversas
  var list = document.getElementById('widgetChatList');
  if (list) list.style.display = '';
}

async function widgetCarregarSolicitacoes() {
  if (!token) return;
  var result = await apiRequest(API_BASE + '/clientes/solicitacoes');
  if (!result || !result.success) return;

  var convs = [];
  for (var i = 0; i < result.data.length; i++) {
    var sol = result.data[i];
    if (sol.status_pagamento !== 'pago') continue;
    convs.push(sol);
  }

  var list = document.getElementById('widgetChatList');
  if (!list) return;

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
var avatarHtml = c.foto_perfil
      ? '<img src="' + c.foto_perfil + '" alt="Foto">'
      : (c.nome_perfil ? c.nome_perfil.charAt(0).toUpperCase() : '👤');
var naoLidas = parseInt(c.qtd_nao_lidas) || 0;
    var badgeHtml = naoLidas > 0
      ? '<span class="chat-conv-badge">' + (naoLidas > 99 ? '99+' : naoLidas) + '</span>'
      : '';

    // Última mensagem da conversa (fonte: backend)
    var snippet = (c.descricao || 'Conversa liberada');
    if (c.ultima_mensagem) {
      var prefixo = c.ultima_mensagem_remetente === 'cliente' ? 'Você: ' : '';
      var txt = c.ultima_mensagem.replace(/\n/g, ' ');
      if (txt.length > 42) txt = txt.substring(0, 42) + '...';
      snippet = prefixo + txt;
    }

item.innerHTML =
      '<span class="chat-conv-avatar">' + avatarHtml + '</span>' +
      '<span class="chat-conv-info">' +
        '<span class="chat-conv-top">' +
          '<span class="chat-conv-name">' + (c.nome_perfil || 'Profissional') + '</span>' +
          badgeHtml +
        '</span>' +
        '<span class="chat-conv-profissao">' + (c.profissao || '') + '</span>' +
        '<span class="chat-conv-snippet">' + snippet + '</span>' +
      '</span>';
    list.appendChild(item);
  }
}

function widgetAtualizarItemConversa(convs) {
  for (var i = 0; i < convs.length; i++) {
    var c = convs[i];
    var item = document.querySelector('.chat-conv-item[data-id="' + c.id + '"]');
    if (item) {
var name = item.querySelector('.chat-conv-name');
      var snippet = item.querySelector('.chat-conv-snippet');
      if (name && c.nome_perfil) name.textContent = c.nome_perfil;
      if (snippet) {
        var snip = (c.descricao || 'Conversa liberada');
        if (c.ultima_mensagem) {
          var pref = c.ultima_mensagem_remetente === 'cliente' ? 'Você: ' : '';
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

async function widgetAbrirConversa(id) {
  widgetConversaSelecionada = id;
  var list = document.getElementById('widgetChatList');
  var view = document.getElementById('widgetChatView');
  if (list) list.style.display = 'none';
  if (view) view.classList.add('open');

  var items = document.querySelectorAll('.chat-conv-item');
  for (var i = 0; i < items.length; i++) {
    items[i].classList.remove('active');
    if (items[i].getAttribute('data-id') === String(id)) items[i].classList.add('active');
  }

  var nome = document.getElementById('widgetChatViewNome');
  var avatar = document.getElementById('widgetChatViewAvatar');
  var sol = null;
  for (var j = 0; j < solicitacoesData.length; j++) {
    if (solicitacoesData[j].id == id) { sol = solicitacoesData[j]; break; }
  }
  if (nome) nome.textContent = sol && sol.nome_perfil ? sol.nome_perfil : 'Conversa';
  if (avatar) {
    if (sol && sol.foto_perfil) {
      avatar.innerHTML = '<img src="' + sol.foto_perfil + '" alt="Foto">';
    } else {
      avatar.textContent = sol && sol.nome_perfil ? sol.nome_perfil.charAt(0).toUpperCase() : '👤';
    }
  }

  if (widgetIntervaloMsg) clearInterval(widgetIntervaloMsg);
  widgetIntervaloMsg = setInterval(function() { widgetCarregarMensagens(); }, 5000);
  widgetCarregarMensagens();

  // Zera o badge ao abrir a conversa
  var badge = document.getElementById('chatBadge');
  if (badge) { badge.classList.remove('show'); badge.textContent = '0'; }
}

function widgetVoltarParaLista() {
  if (widgetIntervaloMsg) { clearInterval(widgetIntervaloMsg); widgetIntervaloMsg = null; }
  widgetConversaSelecionada = '';
  var list = document.getElementById('widgetChatList');
  var view = document.getElementById('widgetChatView');
  if (list) list.style.display = '';
  if (view) view.classList.remove('open');
  widgetCarregarSolicitacoes();
}

async function widgetCarregarMensagens() {
  var id = widgetConversaSelecionada;
  var body = document.getElementById('widgetChatBody');
  var footer = document.getElementById('widgetChatFooter');
  var badge = document.getElementById('chatBadge');
  if (!id) {
    if (body) body.innerHTML = '<div class="chat-panel-empty"><span class="icon">💬</span><p>Selecione uma conversa</p></div>';
    if (footer) footer.style.display = 'none';
    if (badge) badge.classList.remove('show');
    return;
  }
  var result = await apiRequest(API_BASE + '/clientes/mensagens/' + id);
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
  // Última mensagem enviada pelo cliente (status de visualização)
  var ultimaEnviadaIdx = -1;
  for (var i = mensagens.length - 1; i >= 0; i--) {
    if (mensagens[i].remetente === 'cliente') { ultimaEnviadaIdx = i; break; }
  }
  for (var i = 0; i < mensagens.length; i++) {
    var msg = mensagens[i];
    var classe = msg.remetente === 'cliente' ? 'cliente' : 'profissional';
    var div = document.createElement('div');
    div.className = 'chat-panel-msg ' + classe;
    var time = new Date(msg.data_envio).toLocaleTimeString('pt-BR');
    var statusHtml = '';
    if (i === ultimaEnviadaIdx) {
      var lida = msg.lida === 1 || msg.lida === true;
      var simbolo = lida ? '✓✓' : '✓';
      var texto = lida ? 'Visto' : 'Enviado';
      statusHtml = '<div class="msg-status">' + simbolo + ' ' + texto + '</div>';
    }
div.innerHTML = '<div class="bubble">' + msg.texto + '<div class="time">' + time + '</div></div>' + statusHtml;
    body.appendChild(div);
  }
  body.scrollTop = body.scrollHeight;
}

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
    await widgetCarregarMensagens();
  }
}

// ============================================
// Verificar novas mensagens (polling do widget)
// ============================================
async function verificarNovasMensagensWidget() {
  if (!token) return;
  var result = await apiRequest(API_BASE + '/clientes/solicitacoes');
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
    widgetCarregarSolicitacoes();
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
    // Som chiclete ao receber nova mensagem
    tocarSomNotificacao();
  } else {
    // Nada não lido: garante badge zerado
    var badge2 = document.getElementById('chatBadge');
    if (badge2 && badge2.classList.contains('show')) {
      badge2.classList.remove('show');
      badge2.textContent = '0';
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

  var menu = document.getElementById('userDropdownMenu');
  if (menu) {
    menu.addEventListener('click', function(e) {
      if (e.target.closest('.user-dropdown-item')) fecharDropdown();
    });
  }

  document.addEventListener('click', function(e) {
    if (!dropdown.contains(e.target)) fecharDropdown();
  });

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
// Verificar Token
// ============================================
async function verificarToken() {
  if (!token) { mostrarLogin(); return; }

  // Estado otimista
  var cache = carregarClienteCache();
  if (cache) {
    clienteData = { id: cache.id, nome: cache.nome, foto: cache.foto };
    if (document.getElementById('userName')) document.getElementById('userName').textContent = cache.nome || 'Cliente';
    var avatar = document.getElementById('userAvatar');
    if (avatar) {
      if (cache.foto) avatar.innerHTML = '<img src="' + cache.foto + '" alt="Foto">';
      else avatar.innerHTML = '<span data-icon="user"></span>';
    }
    mostrarDashboard();
    iniciarPollingWidget();
  }

  var result = await apiRequest(API_BASE + '/clientes/me');
  if (result && result.success) {
    clienteData = result.data;
    salvarClienteCache(result.data);
    if (document.getElementById('userName')) document.getElementById('userName').textContent = clienteData.nome;
    mostrarDashboard();
    iniciarPollingWidget();
    await carregarDados();
  } else {
    if (!cache) {
      mostrarLogin();
    }
  }
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // Login
  var loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', login);

  // Cadastro
  var cadastroForm = document.getElementById('cadastroForm');
  if (cadastroForm) cadastroForm.addEventListener('submit', cadastro);

  // Máscara de telefone
  var cadTel = document.getElementById('cadastroTelefone');
  if (cadTel) {
    cadTel.addEventListener('input', function(e) {
      e.target.value = formatTelefone(e.target.value);
    });
  }

  // Avaliação
  var avalForm = document.getElementById('avaliacaoForm');
  if (avalForm) avalForm.addEventListener('submit', enviarAvaliacao);
  var avalModal = document.getElementById('avaliacaoModal');
  if (avalModal) {
    avalModal.addEventListener('click', function(e) { if (e.target === this) fecharModalAvaliacao(); });
  }

  // Widget - botão enviar
  var btnSend = document.getElementById('widgetChatSendBtn');
  if (btnSend) {
    btnSend.addEventListener('click', function() { widgetEnviarMensagem(); });
  }

  // Escape fecha o painel de chat
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      fecharChatPainel();
      var am = document.getElementById('avaliacaoModal');
      if (am && am.classList.contains('active')) fecharModalAvaliacao();
    }
  });

  setupUserDropdown();
  verificarToken();

  // Trata parâmetro ?chat=ID
  var params = new URLSearchParams(window.location.search);
  var chatId = params.get('chat');
  if (chatId && token) {
    setTimeout(function() {
      var btn = null;
      var tabs = document.querySelectorAll('.dashboard-tab');
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].getAttribute('onclick') && tabs[i].getAttribute('onclick').indexOf("'chat'") !== -1) {
          btn = tabs[i]; break;
        }
      }
      switchTab('chat', btn);
      setTimeout(function() {
        var select = document.getElementById('chatSolicitacaoSelect');
        if (select) { select.value = String(chatId); chatSolicitacaoSelecionada = String(chatId); carregarChat(); }
      }, 400);
    }, 500);
  }
});

