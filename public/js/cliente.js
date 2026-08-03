// ============================================
// Acheei - Área do Cliente
// Login, Cadastro, Solicitações, Orçamentos, Chat
// ============================================

const API_BASE = '/api';
let token = localStorage.getItem('acheei_cliente_token');
let clienteData = null;

// ============================================
// Utility Functions
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
        token = null;
        mostrarAuth();
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

function formatTelefone(value) {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 15);
}

// ============================================
// Auth Screen
// ============================================
function switchAuthTab(tab) {
  var tabs = document.querySelectorAll('.auth-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  if (tab === 'login') tabs[0].classList.add('active');
  else tabs[1].classList.add('active');
  var forms = document.querySelectorAll('.auth-form');
  for (var i = 0; i < forms.length; i++) forms[i].classList.remove('active');
  document.getElementById(tab === 'login' ? 'loginForm' : 'cadastroForm').classList.add('active');
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('cadastroError').style.display = 'none';
  document.getElementById('cadastroSuccess').style.display = 'none';
  if (tab === 'cadastro') {
    document.getElementById('pushNotice').style.display = 'block';
    atualizarEstadoBotaoCadastro();
  }
}

// ============================================
// Notificações Push - Cadastro
// ============================================
var notificacoesAceitas = localStorage.getItem('acheei_notificacoes') === 'true';

function atualizarEstadoBotaoCadastro() {
  var btn = document.getElementById('btnCriarConta');
  if (notificacoesAceitas) {
    btn.disabled = false;
    btn.innerHTML = 'Criar Conta';
  } else {
    btn.disabled = true;
    btn.innerHTML = '🔕 Aceite as notificações para continuar';
  }
}

async function ativarNotificacoesCadastro() {
  var btn = document.querySelector('#pushNotice .btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Ativando...';
  var ok = await ativarNotificacoes();
  if (ok) {
    notificacoesAceitas = true;
    localStorage.setItem('acheei_notificacoes', 'true');
    document.getElementById('pushNotice').innerHTML = '✅ <strong>Notificações ativadas!</strong> <p style="margin:8px 0 0;">Agora você pode criar sua conta normalmente.</p>';
    atualizarEstadoBotaoCadastro();
  } else {
    btn.disabled = false;
    btn.innerHTML = '🔔 Aceitar Notificações';
  }
}

function mostrarAuth() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
}

function mostrarDashboard() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
}

// ============================================
// Login
// ============================================
async function login(event) {
  event.preventDefault();
  var btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Entrando...';
  document.getElementById('loginError').style.display = 'none';

  var email = document.getElementById('loginEmail').value.trim();
  var senha = document.getElementById('loginSenha').value;

  var result = await apiRequest(API_BASE + '/clientes/login', {
    method: 'POST',
    body: JSON.stringify({ email: email, senha: senha })
  });

  btn.disabled = false;
  btn.innerHTML = 'Entrar';

  if (result && result.success) {
    token = result.data.token;
    localStorage.setItem('acheei_cliente_token', token);
    clienteData = result.data.cliente;
    document.getElementById('clienteName').textContent = clienteData.nome;
    mostrarDashboard();
    carregarDados();
    showToast('Login realizado com sucesso!', 'success');
  } else {
    document.getElementById('loginError').textContent = result ? result.message : 'Erro ao conectar';
    document.getElementById('loginError').style.display = 'block';
  }
}

// ============================================
// Cadastro
// ============================================
async function cadastrar(event) {
  event.preventDefault();
  var btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Criando...';
  document.getElementById('cadastroError').style.display = 'none';
  document.getElementById('cadastroSuccess').style.display = 'none';

  var nome = document.getElementById('cadastroNome').value.trim();
  var email = document.getElementById('cadastroEmail').value.trim();
  var senha = document.getElementById('cadastroSenha').value;
  var telefone = document.getElementById('cadastroTelefone').value.trim();

  if (!nome || !email || !senha) {
    document.getElementById('cadastroError').textContent = 'Preencha todos os campos obrigatórios';
    document.getElementById('cadastroError').style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Criar Conta';
    return;
  }

  if (senha.length < 6) {
    document.getElementById('cadastroError').textContent = 'A senha deve ter pelo menos 6 caracteres';
    document.getElementById('cadastroError').style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Criar Conta';
    return;
  }

  var result = await apiRequest(API_BASE + '/clientes/cadastro', {
    method: 'POST',
    body: JSON.stringify({ nome: nome, email: email, senha: senha, telefone: telefone })
  });

  if (result && result.success) {
    document.getElementById('cadastroSuccess').style.display = 'block';
    token = result.data.token;
    localStorage.setItem('acheei_cliente_token', token);
    clienteData = result.data.cliente;
    document.getElementById('clienteName').textContent = clienteData.nome;
    setTimeout(function() {
      mostrarDashboard();
      carregarDados();
      showToast('Cadastro realizado! Bem-vindo!', 'success');
    }, 1000);
  } else {
    document.getElementById('cadastroError').textContent = result ? result.message : 'Erro ao cadastrar';
    document.getElementById('cadastroError').style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Criar Conta';
  }
}

// ============================================
// Logout
// ============================================
function logout() {
  localStorage.removeItem('acheei_cliente_token');
  token = null;
  clienteData = null;
  mostrarAuth();
  showToast('Sessão encerrada', 'info');
}

// ============================================
// Dashboard Tabs
// ============================================
function switchTab(tab, btn) {
  var tabs = document.querySelectorAll('.dashboard-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  btn.classList.add('active');
  var contents = document.querySelectorAll('.tab-content');
  for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');
  var map = { solicitacoes: 'tabSolicitacoes', orcamentos: 'tabOrcamentos', chat: 'tabChat' };
  document.getElementById(map[tab]).classList.add('active');

  // Controlar o balão do chat: esconder ao entrar na aba Chat, reaparecer ao sair
  if (tab === 'chat') {
    esconderWidgetChat();
    // Fecha o painel flutuante se estiver aberto
    var panel = document.getElementById('chatPanel');
    if (panel) panel.classList.remove('open');
    widgetPainelAberto = false;
    carregarSolicitacoesParaChat();
  } else {
    mostrarWidgetChat();
  }
}

// ============================================
// Carregar Dados
// ============================================
async function carregarDados() {
  await carregarSolicitacoes();
  await carregarOrcamentos();
}

// ============================================
// Solicitações
// ============================================
async function carregarSolicitacoes() {
  var result = await apiRequest(API_BASE + '/clientes/solicitacoes');
  if (result && result.success) {
    renderizarSolicitacoes(result.data);
    document.getElementById('countSolicitacoes').textContent = result.total;
  }
}

function renderizarSolicitacoes(solicitacoes) {
  var container = document.getElementById('solicitacoesList');
  container.innerHTML = '';
  if (solicitacoes.length === 0) {
   container.innerHTML = `
  <div class="empty-state">
    <span class="icon">📋</span>
    <h3>Nenhuma solicitação</h3>
    <p>Você ainda não solicitou nenhum serviço. Volte à página inicial e encontre um profissional!</p>
    <button type="submit" class="btn-search" style="margin-top:16px;">
      <span data-icon="search"></span> Buscar
    </button>
  </div>
`;
    return;
  }
  for (var i = 0; i < solicitacoes.length; i++) {
    var sol = solicitacoes[i];
    var foto = sol.foto_perfil ? '<img src="' + sol.foto_perfil + '" class="foto">' : '<div class="foto-placeholder">👤</div>';
    var pagamento = sol.status_pagamento === 'pago' ? '<span class="status-badge" style="background:#d4edda;color:#155724;">Chat liberado</span>' : '<span class="status-badge pendente">Aguarde a liberação do Chat</span>';
    var card = document.createElement('div');
    card.className = 'solicitacao-card';
    card.innerHTML =
      '<div class="card-header">' +
        '<div class="prof-info">' +
          foto +
          '<div><h4>' + sol.nome_perfil + '</h4><p class="profissao">' + sol.profissao + '</p></div>' +
        '</div>' +
        '<span class="date">' + new Date(sol.data_solicitacao).toLocaleString('pt-BR') + '</span>' +
      '</div>' +
      '<div class="descricao">' + sol.descricao + '</div>' +
      '<div style="margin-bottom:12px;">' + pagamento + '</div>' +
      '<div class="card-footer">' +
        '<button class="btn btn-outline btn-sm" onclick="switchTab(\'chat\', document.querySelectorAll(\'.dashboard-tab\')[2]);setTimeout(function(){document.getElementById(\'chatSolicitacaoSelect\').value=' + sol.id + ';carregarChat();},100);">💬 Chat</button>' +
      '</div>';
    container.appendChild(card);
  }
}

// ============================================
// Orçamentos
// ============================================
async function carregarOrcamentos() {
  var result = await apiRequest(API_BASE + '/clientes/orcamentos');
  if (result && result.success) {
    renderizarOrcamentos(result.data);
    document.getElementById('countOrcamentos').textContent = result.total;
  }
}

function renderizarOrcamentos(orcamentos) {
  var container = document.getElementById('orcamentosList');
  container.innerHTML = '';
  if (orcamentos.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="icon">💰</span><h3>Nenhum orçamento</h3><p>Quando um profissional enviar um orçamento para sua solicitação, ele aparecerá aqui.</p></div>';
    return;
  }
  for (var i = 0; i < orcamentos.length; i++) {
    var o = orcamentos[i];
    var foto = o.foto_perfil ? '<img src="' + o.foto_perfil + '" class="foto">' : '<div class="foto-placeholder">👤</div>';
    var statusClass = o.status || 'pendente';
    var statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
    var card = document.createElement('div');
    card.className = 'orcamento-card';
    card.innerHTML =
      '<div class="card-header">' +
        '<div class="prof-info">' +
          foto +
          '<div><h4>' + o.nome_perfil + '</h4><p class="profissao">' + o.profissao + '</p></div>' +
        '</div>' +
        '<span class="status-badge ' + statusClass + '">' + statusLabel + '</span>' +
      '</div>' +
      '<div class="valor">R$ ' + parseFloat(o.valor).toFixed(2).replace('.', ',') + '</div>' +
      '<div class="descricao"><strong>Descrição:</strong> ' + o.descricao + '</div>' +
      '<div class="descricao" style="margin-top:8px;font-size:13px;color:var(--gray-medium);"><strong>Serviço solicitado:</strong> ' + o.descricao_solicitacao + '</div>';
    container.appendChild(card);
  }
}

// ============================================
// Chat
// ============================================
async function carregarSolicitacoesParaChat() {
  var result = await apiRequest(API_BASE + '/clientes/solicitacoes');
  if (result && result.success) {
    var select = document.getElementById('chatSolicitacaoSelect');
    var currentVal = select.value;
    select.innerHTML = '<option value="">Selecione uma solicitação...</option>';
    for (var i = 0; i < result.data.length; i++) {
      var sol = result.data[i];
      var option = document.createElement('option');
      option.value = sol.id;
      option.textContent = sol.nome_perfil + ' - ' + sol.profissao + ' (' + new Date(sol.data_solicitacao).toLocaleDateString('pt-BR') + ')';
      select.appendChild(option);
    }
    if (currentVal) select.value = currentVal;
    if (select.value) carregarChat();
  }
}

var chatInterval = null;

async function carregarChat() {
  var select = document.getElementById('chatSolicitacaoSelect');
  var solicitacaoId = select.value;

  if (chatInterval) {
    clearInterval(chatInterval);
    chatInterval = null;
  }

  if (!solicitacaoId) {
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('chatEmptyState').style.display = 'block';
    return;
  }

  document.getElementById('chatEmptyState').style.display = 'none';
  document.getElementById('chatContainer').style.display = 'block';

  var result = await apiRequest(API_BASE + '/clientes/mensagens/' + solicitacaoId);
  if (result && result.success) {
    renderizarChat(result.data);
  }

  // Auto-refresh a cada 5s
  chatInterval = setInterval(async function() {
    var r = await apiRequest(API_BASE + '/clientes/mensagens/' + solicitacaoId);
    if (r && r.success) renderizarChat(r.data);
  }, 5000);
}

function renderizarChat(mensagens) {
  var container = document.getElementById('chatMessages');
  container.innerHTML = '';
  if (mensagens.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:30px;"><span class="icon">💬</span><h3>Nenhuma mensagem</h3><p>Inicie a conversa enviando uma mensagem.</p></div>';
    return;
  }
  for (var i = 0; i < mensagens.length; i++) {
    var msg = mensagens[i];
    var div = document.createElement('div');
    div.className = 'chat-message ' + (msg.remetente === 'cliente' ? 'cliente' : 'profissional');
    var time = new Date(msg.data_envio).toLocaleTimeString('pt-BR');
    div.innerHTML = '<div class="bubble">' + msg.texto + '<div class="time">' + time + '</div></div>';
    container.appendChild(div);
  }
  container.scrollTop = container.scrollHeight;
}

async function enviarMensagemCliente() {
  var select = document.getElementById('chatSolicitacaoSelect');
  var solicitacaoId = select.value;
  var input = document.getElementById('chatInput');
  var texto = input.value.trim();

  if (!solicitacaoId) {
    showToast('Selecione uma solicitação para enviar mensagem', 'error');
    return;
  }
  if (!texto) return;

  input.value = '';
  var result = await apiRequest(API_BASE + '/clientes/mensagens', {
    method: 'POST',
    body: JSON.stringify({ solicitacao_id: parseInt(solicitacaoId), texto: texto })
  });

  if (result && result.success) {
    // Recarregar chat
    var r = await apiRequest(API_BASE + '/clientes/mensagens/' + solicitacaoId);
    if (r && r.success) renderizarChat(r.data);
  }
}

// ============================================
// Verificar Token
// ============================================
async function verificarToken() {
  if (!token) { mostrarAuth(); return; }
  var result = await apiRequest(API_BASE + '/clientes/me');
  if (result && result.success) {
    clienteData = result.data;
    document.getElementById('clienteName').textContent = clienteData.nome;
    mostrarDashboard();
    await carregarDados();
  } else {
    mostrarAuth();
  }
}

// ============================================
// Widget de Chat Flutuante (Messenger)
// ============================================
var widgetSolicitacoesCache = [];
var widgetChatInterval = null;
var widgetUltimasMensagens = {};
var widgetPainelAberto = false;

function mostrarWidgetChat() {
  var widget = document.getElementById('chatWidget');
  if (widget) widget.classList.add('active');
  // Reinicia o carregamento das conversas do widget
  widgetPainelAberto = false;
  var panel = document.getElementById('chatPanel');
  if (panel) panel.classList.remove('open');
}

function esconderWidgetChat() {
  var widget = document.getElementById('chatWidget');
  if (widget) widget.classList.remove('active');
  // Para o polling do widget enquanto escondido
  if (widgetChatInterval) {
    clearInterval(widgetChatInterval);
    widgetChatInterval = null;
  }
  // Zera badge e pulsação
  var badge = document.getElementById('chatBadge');
  if (badge) {
    badge.classList.remove('show');
    badge.textContent = '0';
  }
  var bubble = document.getElementById('chatBubble');
  if (bubble) bubble.classList.remove('pulse');
  var panel = document.getElementById('chatPanel');
  if (panel) panel.classList.remove('open');
  widgetPainelAberto = false;
}

function toggleChatPainel() {
  var panel = document.getElementById('chatPanel');
  var isOpen = panel.classList.contains('open');
  widgetPainelAberto = !isOpen;
  if (isOpen) {
    panel.classList.remove('open');
  } else {
    panel.classList.add('open');
    // Zera badge e pulsação ao abrir
    var bubble = document.getElementById('chatBubble');
    bubble.classList.remove('pulse');
    var badge = document.getElementById('chatBadge');
    badge.classList.remove('show');
    badge.textContent = '0';
    widgetCarregarSolicitacoes();
  }
}

async function widgetCarregarSolicitacoes() {
  var result = await apiRequest(API_BASE + '/clientes/solicitacoes');
  if (!result || !result.success) return;

  widgetSolicitacoesCache = result.data;
  var select = document.getElementById('widgetChatSelect');
  var currentVal = select.value;
  select.innerHTML = '<option value="">Selecione uma conversa...</option>';

  for (var i = 0; i < result.data.length; i++) {
    var sol = result.data[i];
    var option = document.createElement('option');
    option.value = sol.id;
    option.textContent = sol.nome_perfil + ' - ' + sol.profissao;
    select.appendChild(option);
  }

  if (currentVal && currentVal !== '') {
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === currentVal) {
        select.value = currentVal;
        break;
      }
    }
  }

  if (select.value) widgetCarregarChat();
}

function widgetCarregarChat() {
  var select = document.getElementById('widgetChatSelect');
  var solicitacaoId = select.value;
  var body = document.getElementById('widgetChatBody');
  var footer = document.getElementById('widgetChatFooter');

  if (widgetChatInterval) {
    clearInterval(widgetChatInterval);
    widgetChatInterval = null;
  }

  if (!solicitacaoId) {
    body.innerHTML = '<div class="chat-panel-empty"><span class="icon">💬</span><p>Selecione uma conversa</p></div>';
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'flex';
  widgetCarregarMensagens(solicitacaoId);

  // Polling a cada 5s
  widgetChatInterval = setInterval(function() {
    widgetCarregarMensagens(solicitacaoId);
  }, 5000);
}

async function widgetCarregarMensagens(solicitacaoId) {
  var result = await apiRequest(API_BASE + '/clientes/mensagens/' + solicitacaoId);
  if (!result || !result.success) return;

  var body = document.getElementById('widgetChatBody');
  var mensagens = result.data;

  // Guarda as mensagens para detectar novas
  if (!widgetUltimasMensagens[solicitacaoId]) {
    widgetUltimasMensagens[solicitacaoId] = 0;
  }

  var novas = [];
  for (var i = 0; i < mensagens.length; i++) {
    if (mensagens[i].id > widgetUltimasMensagens[solicitacaoId]) {
      novas.push(mensagens[i]);
    }
  }

  // Atualiza último id
  if (mensagens.length > 0) {
    widgetUltimasMensagens[solicitacaoId] = mensagens[mensagens.length - 1].id;
  }

  // Detecta novas mensagens do profissional (não lidas)
  var select = document.getElementById('widgetChatSelect');
  var chatAberto = widgetPainelAberto && select.value === solicitacaoId;
  var qtdeNovaProfissional = 0;
  for (var j = 0; j < novas.length; j++) {
    if (novas[j].remetente === 'profissional') {
      qtdeNovaProfissional++;
    }
  }

  // Se tem novas mensagens do profissional e o chat não está aberto nessa conversa
  if (qtdeNovaProfissional > 0 && !chatAberto) {
    var bubble = document.getElementById('chatBubble');
    bubble.classList.add('pulse');
    var badge = document.getElementById('chatBadge');
    var count = parseInt(badge.textContent) || 0;
    badge.textContent = count + qtdeNovaProfissional;
    badge.classList.add('show');
  }

  // Só renderiza se for a conversa selecionada no widget
  if (select.value === solicitacaoId) {
    body.setAttribute('data-solicitacao', solicitacaoId);
    renderizarWidgetChat(mensagens);
  }
}

function renderizarWidgetChat(mensagens) {
  var body = document.getElementById('widgetChatBody');
  body.innerHTML = '';

  if (mensagens.length === 0) {
    body.innerHTML = '<div class="chat-panel-empty"><span class="icon">💬</span><p>Nenhuma mensagem ainda. Envie algo!</p></div>';
    return;
  }

  for (var i = 0; i < mensagens.length; i++) {
    var msg = mensagens[i];
    var div = document.createElement('div');
    div.className = 'chat-panel-msg ' + (msg.remetente === 'cliente' ? 'cliente' : 'profissional');
    var time = new Date(msg.data_envio).toLocaleTimeString('pt-BR');
    div.innerHTML = '<div class="bubble">' + msg.texto + '<div class="time">' + time + '</div></div>';
    body.appendChild(div);
  }
  body.scrollTop = body.scrollHeight;
}

async function widgetEnviarMensagem() {
  var select = document.getElementById('widgetChatSelect');
  var solicitacaoId = select.value;
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
    // Se havia pulsação, remove (usuário respondeu)
    var bubble = document.getElementById('chatBubble');
    bubble.classList.remove('pulse');
  }
}

// ============================================
// Salvar assinatura push após login/cadastro
// ============================================
(async function() {
  var loginOriginal = login;
  login = async function(event) {
    await loginOriginal(event);
    if (token) {
      await salvarAssinaturaPush();
      mostrarWidgetChat();
    }
  };

  var cadastroOriginal = cadastrar;
  cadastrar = async function(event) {
    await cadastroOriginal(event);
    if (token) {
      await salvarAssinaturaPush();
      mostrarWidgetChat();
    }
  };
})();

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('loginForm').addEventListener('submit', login);
  document.getElementById('cadastroForm').addEventListener('submit', cadastrar);
  document.getElementById('cadastroTelefone').addEventListener('input', function(e) {
    e.target.value = formatTelefone(e.target.value);
  });

  // Inicializar push
  if ('Notification' in window && Notification.permission === 'granted') {
    registrarServiceWorker();
  }

  // Se já está logado (token válido), mostrar o widget
  if (token) {
    verificarToken().then(function() {
      mostrarWidgetChat();
    });
  } else {
    verificarToken();
  }
});
