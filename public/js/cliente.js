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
      // Erro de chat bloqueado (403): retorna o objeto com success:false
      // sem lançar exceção, para não spammar o toast de erro a cada polling.
      if (response.status === 403) {
        return { success: false, status: 403, message: result.message || 'Ação bloqueada' };
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
  document.getElementById('authScreen').style.setProperty('display', 'flex', 'important');
  document.getElementById('dashboard').style.setProperty('display', 'none', 'important');
}

function mostrarDashboard() {
  document.getElementById('authScreen').style.setProperty('display', 'none', 'important');
  document.getElementById('dashboard').style.setProperty('display', 'block', 'important');
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
    salvarClienteCache(clienteData);
    aplicarHeaderCliente(clienteData.nome, clienteData.foto || clienteData.foto_perfil);
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

  if (!nome || !email || !senha || !telefone) {
    document.getElementById('cadastroError').textContent = 'Preencha todos os campos obrigatórios, incluindo o WhatsApp';
    document.getElementById('cadastroError').style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Criar Conta';
    return;
  }

  // Telefone deve ter ao menos 10 dígitos (DDD + número) para WhatsApp
  var telefoneDigitos = telefone.replace(/\D/g, '');
  if (telefoneDigitos.length < 10) {
    document.getElementById('cadastroError').textContent = 'Informe um telefone válido com DDD para o WhatsApp';
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
    salvarClienteCache(clienteData);
    aplicarHeaderCliente(clienteData.nome, clienteData.foto || clienteData.foto_perfil);
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
  salvarClienteCache(null);
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

// Retorna uma estrela em SVG com cantos arredondados (sem emoji)
function svgEstrela() {
  return '<svg class="estrela-svg" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">' +
    '<path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.5l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95L12 2.5z" ' +
    'fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
    '</svg>';
}

function renderizarSolicitacoes(solicitacoes) {
  var container = document.getElementById('solicitacoesList');
  container.innerHTML = '';
  if (solicitacoes.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="icon">📋</span><h3>Nenhuma solicitação</h3><p>Você ainda não solicitou nenhum serviço. Volte à página inicial e encontre um profissional!</p><a href="/" class="btn btn-primary" style="margin-top:16px;">Buscar Profissionais</a></div>';
    return;
  }
  for (var i = 0; i < solicitacoes.length; i++) {
    var sol = solicitacoes[i];
    var foto = sol.foto_perfil ? '<img src="' + sol.foto_perfil + '" class="foto">' : '<div class="foto-placeholder">👤</div>';
    var pagamento = sol.status_pagamento === 'pago' ? '<span class="status-badge" style="background:#d4edda;color:#155724;">Chat liberado</span>' : '<span class="status-badge pendente">Aguarde a liberação do Chat</span>';
    var chatLiberado = sol.status_pagamento === 'pago';
    var avaliacao = '';
    if (chatLiberado && sol.avaliacao_id) {
      avaliacao = '<div class="avaliacao-enviada">Avaliação enviada: ' + sol.avaliacao_nota + ' de 5 estrelas.</div>';
    } else if (chatLiberado) {
      avaliacao = '<div class="avaliacao-disponivel"><p>Como foi sua experiência? Escolha uma estrela para avaliar.</p><div class="estrelas-avaliacao">';
      for (var estrela = 1; estrela <= 5; estrela++) {
        var nomeCod = encodeURIComponent(String(sol.nome_perfil).replace(/'/g, '%27'));
        avaliacao += '<button type="button" class="estrela-btn" aria-label="Avaliar com ' + estrela + ' estrelas" onclick="abrirModalAvaliacao(' + sol.id + ', ' + estrela + ', \'' + nomeCod + '\')">' + svgEstrela() + '</button>';
      }
      avaliacao += '</div></div>';
    }
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
      avaliacao;
    container.appendChild(card);
  }
}

// ============================================
// Orçamentos
// ============================================
function abrirModalAvaliacao(solicitacaoId, nota, nomeCodificado) {
  document.getElementById('avaliacaoForm').reset();
  document.getElementById('avaliacaoSolicitacaoId').value = solicitacaoId;
  document.getElementById('avaliacaoNota').value = nota;
  var nome = decodeURIComponent(nomeCodificado);
  document.getElementById('avaliacaoProfissional').textContent = 'Você selecionou ' + nota + ' estrela' + (nota > 1 ? 's' : '') + ' para ' + nome + '.';
  document.getElementById('avaliacaoModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModalAvaliacao() {
  document.getElementById('avaliacaoModal').classList.remove('active');
  document.body.style.overflow = '';
}

async function enviarAvaliacao(event) {
  event.preventDefault();
  var form = event.target;
  var botao = form.querySelector('button[type="submit"]');
  botao.disabled = true;
  var result = await apiRequest(API_BASE + '/clientes/avaliacoes', {
    method: 'POST',
    body: JSON.stringify({
      solicitacao_id: Number(document.getElementById('avaliacaoSolicitacaoId').value),
      nota: Number(document.getElementById('avaliacaoNota').value),
      respeito: document.getElementById('avaliacaoRespeito').value,
      comprometimento: document.getElementById('avaliacaoComprometimento').value,
      qualidade: document.getElementById('avaliacaoQualidade').value
    })
  });
  botao.disabled = false;
  if (result && result.success) {
    fecharModalAvaliacao();
    showToast('Avaliação enviada. Obrigado pelo seu feedback!', 'success');
    carregarSolicitacoes();
  }
}

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
  } else if (result && result.status === 403) {
    // Chat bloqueado (pagamento não liberado): mostra mensagem fixa no corpo,
    // sem repetir toast a cada polling.
    document.getElementById('chatMessages').innerHTML =
      '<div class="chat-locked" style="text-align:center;padding:40px;">' +
        '<span class="icon" style="font-size:48px;display:block;margin-bottom:12px;">🔒</span>' +
        '<p>' + (result.message || 'O chat ainda não foi liberado. O profissional precisa concluir o pagamento para liberar a conversa.') + '</p>' +
      '</div>';
    return; // não inicia o polling quando o chat está bloqueado
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
// Header - Dropdown Avatar + Nome
// ============================================
function aplicarHeaderCliente(nome, foto) {
  var nameEl = document.getElementById('userName');
  var avatarEl = document.getElementById('userAvatar');
  if (nameEl) nameEl.textContent = nome || 'Cliente';
  if (avatarEl) {
    avatarEl.innerHTML = foto
      ? '<img src="' + foto + '" alt="Foto">'
      : '👤';
  }
}

function setupUserDropdown() {
  var trigger = document.getElementById('userDropdownTrigger');
  var dropdown = document.getElementById('userDropdown');
  if (!trigger || !dropdown) return;

trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    var isActive = dropdown.classList.toggle('active');
    trigger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
  });

  // Fecha ao clicar em qualquer item do menu (ex: Início/Categorias)
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
// Cache do cliente (compartilhado com o index via localStorage)
// ============================================
function carregarClienteCache() {
  try {
    return JSON.parse(localStorage.getItem('acheei_cliente_cache') || 'null');
  } catch (e) {
    return null;
  }
}

function salvarClienteCache(cliente) {
  if (cliente) {
    localStorage.setItem('acheei_cliente_cache', JSON.stringify({
      nome: cliente.nome,
      foto: cliente.foto || cliente.foto_perfil || null,
      id: cliente.id
    }));
  } else {
    localStorage.removeItem('acheei_cliente_cache');
  }
}

// ============================================
// Verificar Token
// ============================================
async function verificarToken() {
  if (!token) { mostrarAuth(); return; }

  // Estado otimista: se houver cache, mostra o dashboard imediatamente
  // (sem flash da tela de login) enquanto a verificação assíncrona ocorre.
var cache = carregarClienteCache();
  if (cache) {
    clienteData = { id: cache.id, nome: cache.nome, foto: cache.foto };
    aplicarHeaderCliente(cache.nome, cache.foto);
    mostrarDashboard();
  }

  var result = await apiRequest(API_BASE + '/clientes/me');
  if (result && result.success) {
    clienteData = result.data;
    salvarClienteCache(result.data);
    aplicarHeaderCliente(clienteData.nome, clienteData.foto || clienteData.foto_perfil);
    mostrarDashboard();
    await carregarDados();
  } else {
    // Se a verificação falhar por erro de rede, mantém o cache (não derruba o login)
    if (!cache) {
      mostrarAuth();
    }
  }
}

// ============================================
// Widget de Chat Flutuante (Messenger)
// ============================================
var widgetSolicitacoesCache = [];
var widgetChatInterval = null;
var widgetGlobalInterval = null;
var widgetUltimasMensagens = {};
var widgetPainelAberto = false;
var widgetConversaSelecionada = '';

function mostrarWidgetChat() {
  var widget = document.getElementById('chatWidget');
  if (widget) widget.classList.add('active');
  // Reinicia o carregamento das conversas do widget
  widgetPainelAberto = false;
  var panel = document.getElementById('chatPanel');
  if (panel) panel.classList.remove('open');
  // Polling de fundo: detecta novas mensagens do profissional mesmo com o painel fechado
  iniciarPollingGlobalWidget();
}

function esconderWidgetChat() {
  var widget = document.getElementById('chatWidget');
  if (widget) widget.classList.remove('active');
  // Para o polling do widget enquanto escondido
  if (widgetChatInterval) {
    clearInterval(widgetChatInterval);
    widgetChatInterval = null;
  }
  if (widgetGlobalInterval) {
    clearInterval(widgetGlobalInterval);
    widgetGlobalInterval = null;
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

// Polling global: verifica periódicamente todas as conversas em busca de novas mensagens do profissional
function iniciarPollingGlobalWidget() {
  if (widgetGlobalInterval) clearInterval(widgetGlobalInterval);
  widgetGlobalInterval = setInterval(function() {
    widgetVerificarNovasMensagens();
  }, 5000);
  // Verifica imediatamente ao iniciar
  widgetVerificarNovasMensagens();
}

async function widgetVerificarNovasMensagens() {
  if (!token) return;
  var result = await apiRequest(API_BASE + '/clientes/solicitacoes');
  if (!result || !result.success) return;

  var temNovaProfissional = false;
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
        temNovaProfissional = true;
      }
    }
    if (mensagens.length > 0) {
      widgetUltimasMensagens[sol.id] = mensagens[mensagens.length - 1].id;
    }
  }

var panel = document.getElementById('chatPanel');
  var chatAberto = widgetPainelAberto && panel.classList.contains('open');

  if (temNovaProfissional && !chatAberto) {
    var bubble = document.getElementById('chatBubble');
    if (bubble) bubble.classList.add('pulse');
    var badge = document.getElementById('chatBadge');
    if (badge && !badge.classList.contains('show')) {
      badge.classList.add('show');
      var count = parseInt(badge.textContent) || 0;
      badge.textContent = count + temNovaProfissional ? (count + 1) : 1;
    }
  }
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
    // Ao clicar no balão, abre a conversa da mensagem mais recente
    widgetCarregarSolicitacoes(true);
  }
}

// Retorna o id da conversa (solicitação liberada) que tem a mensagem mais recente.
// Prioriza a conversa do último profissional que enviou. Em empate de datas, a de maior id.
async function widgetEncontrarConversaMaisRecente(solicitacoes) {
  var melhores = null; // { id, data }
  for (var i = 0; i < solicitacoes.length; i++) {
    var sol = solicitacoes[i];
    if (sol.status_pagamento !== 'pago') continue;
    var msgRes = await apiRequest(API_BASE + '/clientes/mensagens/' + sol.id);
    if (!msgRes || !msgRes.success) continue;
    var mensagens = msgRes.data;
    if (!mensagens || mensagens.length === 0) continue;
    var ultima = mensagens[mensagens.length - 1];
    var tempo = new Date(ultima.data_envio).getTime();
    if (!melhores || tempo > melhores.data) {
      melhores = { id: sol.id, data: tempo };
    }
  }
  return melhores ? melhores.id : null;
}

// Carrega a lista de conversas (estilo Messenger) com as solicitações liberadas (pagas)
async function widgetCarregarSolicitacoes(abrirMaisRecente) {
  var result = await apiRequest(API_BASE + '/clientes/solicitacoes');
  if (!result || !result.success) return;

  widgetSolicitacoesCache = result.data;

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

  // Se for para abrir a mais recente, seleciona a conversa adequada
  if (abrirMaisRecente) {
    var maisRecenteId = await widgetEncontrarConversaMaisRecente(convs);
    if (maisRecenteId) {
      widgetAbrirConversa(maisRecenteId);
      return;
    }
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

    item.innerHTML =
      '<span class="chat-conv-avatar">' + avatarHtml + '</span>' +
      '<span class="chat-conv-info">' +
        '<span class="chat-conv-top">' +
          '<span class="chat-conv-name">' + (c.nome_perfil || 'Profissional') + '</span>' +
        '</span>' +
        '<span class="chat-conv-snippet">' + (c.profissao || 'Conversa liberada') + '</span>' +
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
      if (name) name.textContent = c.nome_perfil || 'Profissional';
      if (snippet) snippet.textContent = c.profissao || 'Conversa liberada';
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
  for (var j = 0; j < widgetSolicitacoesCache.length; j++) {
    if (widgetSolicitacoesCache[j].id == id) { sol = widgetSolicitacoesCache[j]; break; }
  }
  if (nome) nome.textContent = sol && sol.nome_perfil ? sol.nome_perfil : 'Profissional';
  if (avatar) {
    if (sol && sol.foto_perfil) {
      avatar.innerHTML = '<img src="' + sol.foto_perfil + '" alt="Foto">';
    } else {
      avatar.textContent = sol && sol.nome_perfil ? sol.nome_perfil.charAt(0).toUpperCase() : '👤';
    }
  }

  // Polling a cada 5s
  if (widgetChatInterval) clearInterval(widgetChatInterval);
  widgetChatInterval = setInterval(function() {
    widgetCarregarMensagens(id);
  }, 5000);
  widgetCarregarMensagens(id);
}

function widgetVoltarParaLista() {
  if (widgetChatInterval) { clearInterval(widgetChatInterval); widgetChatInterval = null; }
  widgetConversaSelecionada = '';
  var list = document.getElementById('widgetChatList');
  var view = document.getElementById('widgetChatView');
  if (list) list.style.display = '';
  if (view) view.classList.remove('open');
  // Recarrega a lista para mostrar o estado mais atual
  widgetCarregarSolicitacoes(false);
}

async function widgetCarregarMensagens(solicitacaoId) {
  var result = await apiRequest(API_BASE + '/clientes/mensagens/' + solicitacaoId);
  if (!result || !result.success) {
    // Chat bloqueado (403): mostra mensagem fixa no widget, sem repetir toast.
    var body = document.getElementById('widgetChatBody');
    if (result && result.status === 403 && body) {
      body.innerHTML =
        '<div class="chat-panel-empty" style="text-align:center;padding:30px;">' +
          '<span class="icon" style="font-size:40px;display:block;margin-bottom:8px;">🔒</span>' +
          '<p>' + (result.message || 'O chat ainda não foi liberado. O profissional precisa concluir o pagamento para liberar a conversa.') + '</p>' +
        '</div>';
    }
    return;
  }

  var body = document.getElementById('widgetChatBody');
  var footer = document.getElementById('widgetChatFooter');
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
  var chatAberto = widgetPainelAberto && widgetConversaSelecionada === solicitacaoId;
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
  if (widgetConversaSelecionada === solicitacaoId) {
    renderizarWidgetChat(mensagens);
    if (footer) footer.style.display = 'flex';
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

  // Dropdown do usuário (avatar + nome)
  document.getElementById('avaliacaoForm').addEventListener('submit', enviarAvaliacao);
  document.getElementById('avaliacaoModal').addEventListener('click', function(e) {
    if (e.target === this) fecharModalAvaliacao();
  });
  setupUserDropdown();

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
