// ============================================
// Acheei - Main JavaScript
// Funcionalidades da Home e Busca
// ============================================

const API_BASE = '/api';

// Estado da confirmação de WhatsApp no modal de solicitação
var modalWhatsAppConfirmado = false;
var modalWhatsAppTelefone = '';
var modalWhatsAppLink = '';

// ============================================
// Estrelas SVG (arredondadas, minimalistas)
// ============================================
function renderEstrelasSVG(media) {
  function svgStar(filled) {
    var color = filled ? '#FF0000' : '#e0e0e0';
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="' + color + '" style="display:inline-block;"><path d="M12 2.5c.3 0 .58.17.72.44l2.32 4.7 5.2.76c.61.09 1.02.66.86 1.25-.06.24-.2.45-.38.61l-3.76 3.66.89 5.17c.1.6-.3 1.17-.9 1.27-.24.04-.49 0-.71-.12L12 17.77l-4.64 2.47c-.54.29-1.2.08-1.49-.45-.12-.22-.16-.47-.12-.71l.89-5.17-3.76-3.66c-.44-.42-.45-1.12-.02-1.55.17-.18.38-.3.61-.36l5.2-.76 2.32-4.7c.14-.27.42-.44.72-.44z"/></svg>';
  }
  var arredondado = Math.round(Number(media) || 0);
  var html = '';
  for (var i = 1; i <= 5; i++) html += svgStar(i <= arredondado);
  return '<span class="estrelas-svg" role="img" aria-label="' + (Number(media) || 0).toFixed(1) + ' de 5 estrelas">' + html + '</span>';
}

// ============================================
// Utility Functions
// ============================================
function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function formatTelefone(value) {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 15);
}

function showLoading() {
  document.getElementById('loadingContainer').style.display = 'flex';
  document.getElementById('resultados').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
}

function hideLoading() {
  document.getElementById('loadingContainer').style.display = 'none';
}

// ============================================
// Busca de Profissionais
// ============================================
async function buscarProfissionais(params = {}) {
  showLoading();

  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE}/profissionais${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url);
    const result = await response.json();

    hideLoading();

    if (result.success) {
      exibirResultados(result.data, result.total);
    } else {
      showToast(result.message || 'Erro ao buscar profissionais', 'error');
    }
  } catch (error) {
    hideLoading();
    console.error('Erro na busca:', error);
    showToast('Erro ao conectar com o servidor', 'error');
  }
}

function exibirResultados(profissionais, total) {
  const grid = document.getElementById('profissionaisGrid');
  const resultsSection = document.getElementById('resultados');
  const emptyState = document.getElementById('emptyState');
  const resultsCount = document.getElementById('resultsCount');

  grid.innerHTML = '';

  if (profissionais.length === 0) {
    resultsSection.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  resultsSection.style.display = 'block';
  emptyState.style.display = 'none';
  resultsCount.textContent = `${total} resultado${total !== 1 ? 's' : ''}`;

  profissionais.forEach(prof => {
    const card = document.createElement('div');
    card.className = 'profissional-card';

const fotoPerfil = prof.foto_perfil 
      ? `<img src="${prof.foto_perfil}" alt="${prof.nome_perfil}" class="profile-photo">`
      : `<div class="profile-photo-placeholder"><span data-icon="user"></span></div>`;

    var mediaAvaliacoes = Number(prof.media_avaliacoes) || 0;
    var totalAvaliacoes = Number(prof.total_avaliacoes) || 0;
    var avaliacaoCard = totalAvaliacoes
      ? '<p class="avaliacao-card">' + renderEstrelasSVG(mediaAvaliacoes) + '</p>'
      : '<p class="avaliacao-card sem-avaliacoes">' + renderEstrelasSVG(0) + '</p>';

    let fotosHtml = '';
    if (prof.fotos_servicos && prof.fotos_servicos.length > 0) {
      fotosHtml = prof.fotos_servicos.map(foto => 
        `<img src="${foto}" alt="Serviço realizado">`
      ).join('');
      // Preencher até 3 slots
      for (let i = prof.fotos_servicos.length; i < 3; i++) {
        fotosHtml += `<div class="foto-placeholder"><span data-icon="camera"></span></div>`;
      }
    } else {
      fotosHtml = `
        <div class="foto-placeholder"><span data-icon="camera"></span></div>
        <div class="foto-placeholder"><span data-icon="camera"></span></div>
        <div class="foto-placeholder"><span data-icon="camera"></span></div>
      `;
    }

card.innerHTML = `
      <div class="card-header">
        ${fotoPerfil}
        <div class="card-info">
          <h4>${prof.nome_perfil}</h4>
          <p class="profissao">${prof.profissao}</p>
          <p class="localizacao"><span data-icon="map-pin"></span> ${prof.cidade}/${prof.estado}</p>
          ${avaliacaoCard}
        </div>
        <button type="button" class="btn-share-icon" onclick="abrirCompartilhar(${prof.id}, '${prof.nome_perfil}', '${prof.profissao}', '${prof.cidade}', '${prof.estado}', '${prof.foto_perfil || ''}', ${Number(prof.media_avaliacoes) || 0}, ${Number(prof.total_avaliacoes) || 0})" title="Compartilhar">
          <span data-icon="share"></span>
        </button>
      </div>
<div class="card-body">
        <div class="fotos-servicos">
          ${fotosHtml}
        </div>
      </div>
<div class="card-footer">
        ${profissionalLogado
          ? '<button class="btn btn-primary btn-prof-disabled" title="Profissionais não podem solicitar serviços a outros profissionais" onclick="mostrarErroProfSolicitacao(event)"><span data-icon="send"></span> Solicitar Serviço</button>'
          : '<button class="btn btn-primary" onclick="abrirModalSolicitacao(' + prof.id + ', \'' + prof.nome_perfil + '\', \'' + prof.profissao + '\')"><span data-icon="send"></span> Solicitar Serviço</button>'}
      </div>
    `;

    // Substitui os placeholders [data-icon] pelos SVGs reais
    // (necessário pois os cards são criados dinamicamente após o DOMContentLoaded do icons.js)
    card.querySelectorAll('[data-icon]').forEach(function(el) {
      var svg = icon(el.getAttribute('data-icon'));
      if (svg) {
        el.innerHTML = svg;
        el.classList.add('icon-wrap');
      }
    });

    grid.appendChild(card);
  });
}

// ============================================
// Autocomplete
// ============================================
let categoriasCache = [];

async function carregarCategorias() {
  try {
    const response = await fetch(`${API_BASE}/profissionais/categorias`);
    const result = await response.json();
    if (result.success) {
      categoriasCache = result.data;
    }
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
  }
}

function setupAutocomplete() {
  const input = document.getElementById('profissao');
  const list = document.getElementById('autocompleteList');

  input.addEventListener('input', function() {
    const value = this.value.toLowerCase().trim();
    list.innerHTML = '';
    list.classList.remove('has-items');

    if (value.length < 1) return;

    // "Servente" é sinônimo de "Ajudante de Pedreiro"
    const termoBusca = 'servente'.startsWith(value) ? 'ajudante' : value;

    // Filtrar por iniciais (ex: digitar "Dia" mostra "Diarista")
    const matches = categoriasCache.filter(cat => 
      cat.toLowerCase().startsWith(termoBusca) || cat.toLowerCase().startsWith(value)
    ).slice(0, 8);

    if (matches.length === 0) return;

    matches.forEach(match => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = match;
      item.addEventListener('click', () => {
        input.value = match;
        list.innerHTML = '';
        list.classList.remove('has-items');
        // Disparar busca automaticamente
        document.getElementById('searchForm').dispatchEvent(new Event('submit'));
      });
      list.appendChild(item);
    });
    list.classList.add('has-items');
  });

  // Fechar ao clicar fora
  document.addEventListener('click', function(e) {
    if (e.target !== input && e.target !== list && !list.contains(e.target)) {
      list.innerHTML = '';
      list.classList.remove('has-items');
    }
  });

  // Fechar com Escape
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      list.innerHTML = '';
      list.classList.remove('has-items');
    }
  });
}

// ============================================
// Área do Usuário (Cliente logado no header)
// ============================================
let clienteLogado = null;

// Estado otimista: usa dados em cache para exibir o header logado imediatamente,
// sem "flash" de deslogado enquanto a verificação assíncrona ocorre.
function carregarClienteCache() {
  try {
    var cache = JSON.parse(localStorage.getItem('acheei_cliente_cache') || 'null');
    return cache;
  } catch (e) {
    return null;
  }
}

function salvarClienteCache(cliente) {
  if (cliente) {
    localStorage.setItem('acheei_cliente_cache', JSON.stringify({ nome: cliente.nome, foto: cliente.foto || cliente.foto_perfil || null, id: cliente.id }));
  } else {
    localStorage.removeItem('acheei_cliente_cache');
  }
}

// Estado otimista do profissional (mesmo padrão do cliente)
let profissionalLogado = null;

function carregarProfissionalCache() {
  try {
    var cache = JSON.parse(localStorage.getItem('acheei_prof_cache') || 'null');
    return cache;
  } catch (e) {
    return null;
  }
}

function salvarProfissionalCache(prof) {
  if (prof) {
    localStorage.setItem('acheei_prof_cache', JSON.stringify({ nome: prof.nome_perfil, foto: prof.foto_perfil || null, id: prof.id }));
  } else {
    localStorage.removeItem('acheei_prof_cache');
  }
}

function limparProfissionalCache() {
  localStorage.removeItem('acheei_prof_cache');
}

async function verificarLoginProfissional() {
  const token = localStorage.getItem('acheei_prof_token');
  if (!token) {
    profissionalLogado = null;
    limparProfissionalCache();
    atualizarHeaderProfissional();
    return;
  }
  // Renderiza imediatamente com dados em cache para evitar flash de deslogado
  const cache = carregarProfissionalCache();
  if (cache) {
    profissionalLogado = { nome: cache.nome, id: cache.id, foto: cache.foto };
    atualizarHeaderProfissional();
  }
  try {
    const response = await fetch(`${API_BASE}/profissionais/me`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const result = await response.json();
    if (result.success) {
      profissionalLogado = result.data;
      salvarProfissionalCache(result.data);
    } else {
      profissionalLogado = null;
      limparProfissionalCache();
    }
  } catch (error) {
    console.error('Erro ao verificar login do profissional:', error);
    // Mantém o estado em cache (não derruba o login por erro de rede)
  }
  atualizarHeaderProfissional();
}

function atualizarHeaderProfissional() {
  var userArea = document.getElementById('userArea');
  var btnAreaCliente = document.getElementById('btnAreaCliente');
  var mobileUserArea = document.getElementById('mobileUserArea');
  var mobileBtnAreaCliente = document.getElementById('mobileBtnAreaCliente');
  var btnAreaProfissional = document.getElementById('btnAreaProfissional');
  var mobileBtnAreaProfissional = document.getElementById('mobileBtnAreaProfissional');
  var userAreaLink = document.getElementById('userAreaLink');
  var userAreaLinkText = document.getElementById('userAreaLinkText');
  var mobileUserAreaLink = document.getElementById('mobileUserAreaLink');
  var mobileUserAreaLinkText = document.getElementById('mobileUserAreaLinkText');

  // Prioridade: cliente logado > profissional logado > deslogado
  if (clienteLogado) {
    if (userArea) userArea.style.display = 'flex';
    if (btnAreaCliente) btnAreaCliente.style.display = 'none';
    if (mobileUserArea) mobileUserArea.style.display = 'flex';
    if (mobileBtnAreaCliente) mobileBtnAreaCliente.style.display = 'none';
    if (btnAreaProfissional) btnAreaProfissional.style.display = 'none';
    if (mobileBtnAreaProfissional) mobileBtnAreaProfissional.style.display = 'none';
if (userAreaLink) userAreaLink.href = 'cliente';
    if (mobileUserAreaLink) mobileUserAreaLink.href = 'cliente';
    if (userAreaLinkText) userAreaLinkText.textContent = 'Minha Área';
    if (mobileUserAreaLinkText) mobileUserAreaLinkText.textContent = 'Minha Área';
    var nome = clienteLogado.nome || 'Cliente';
    if (document.getElementById('userName')) document.getElementById('userName').textContent = nome;
    if (document.getElementById('mobileUserName')) document.getElementById('mobileUserName').textContent = nome;
    var avatarHtml = clienteLogado.foto ? '<img src="' + clienteLogado.foto + '" alt="Foto">' : '👤';
    if (document.getElementById('userAvatar')) document.getElementById('userAvatar').innerHTML = avatarHtml;
    if (document.getElementById('mobileUserAvatar')) document.getElementById('mobileUserAvatar').innerHTML = avatarHtml;
  } else if (profissionalLogado) {
    if (userArea) userArea.style.display = 'flex';
    if (btnAreaCliente) btnAreaCliente.style.display = 'none';
    if (mobileUserArea) mobileUserArea.style.display = 'flex';
    if (mobileBtnAreaCliente) mobileBtnAreaCliente.style.display = 'none';
    if (btnAreaProfissional) btnAreaProfissional.style.display = 'none';
    if (mobileBtnAreaProfissional) mobileBtnAreaProfissional.style.display = 'none';
if (userAreaLink) userAreaLink.href = 'profissional';
    if (mobileUserAreaLink) mobileUserAreaLink.href = 'profissional';
    if (userAreaLinkText) userAreaLinkText.textContent = 'Minha Área';
    if (mobileUserAreaLinkText) mobileUserAreaLinkText.textContent = 'Minha Área';
    var pnome = profissionalLogado.nome_perfil || profissionalLogado.nome || 'Profissional';
    if (document.getElementById('userName')) document.getElementById('userName').textContent = pnome;
    if (document.getElementById('mobileUserName')) document.getElementById('mobileUserName').textContent = pnome;
    var pavatarHtml = profissionalLogado.foto_perfil || profissionalLogado.foto ? '<img src="' + (profissionalLogado.foto_perfil || profissionalLogado.foto) + '" alt="Foto">' : '👤';
    if (document.getElementById('userAvatar')) document.getElementById('userAvatar').innerHTML = pavatarHtml;
    if (document.getElementById('mobileUserAvatar')) document.getElementById('mobileUserAvatar').innerHTML = pavatarHtml;
  } else {
    if (userArea) userArea.style.display = 'none';
    if (btnAreaCliente) btnAreaCliente.style.display = '';
    if (mobileUserArea) mobileUserArea.style.display = 'none';
    if (mobileBtnAreaCliente) mobileBtnAreaCliente.style.display = '';
    if (btnAreaProfissional) btnAreaProfissional.style.display = '';
    if (mobileBtnAreaProfissional) mobileBtnAreaProfissional.style.display = '';
  }
  // Mostrar/ocultar ícone de notificações imediatamente conforme estado de login
  try {
    var notif = document.getElementById('notifIcon');
    if (notif) {
      if (clienteLogado || profissionalLogado) {
        notif.style.display = 'flex';
      } else {
        notif.style.display = 'none';
      }
    }
  } catch (e) {}
}

async function verificarLoginCliente() {
  const token = localStorage.getItem('acheei_cliente_token');
  if (!token) {
    clienteLogado = null;
    salvarClienteCache(null);
    atualizarHeaderCliente();
    return;
  }
  // Renderiza imediatamente com dados em cache para evitar flash de deslogado
  const cache = carregarClienteCache();
  if (cache) {
    clienteLogado = { nome: cache.nome, id: cache.id, foto: cache.foto };
    atualizarHeaderCliente();
  }
  try {
    const response = await fetch(`${API_BASE}/clientes/me`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const result = await response.json();
    if (result.success) {
      clienteLogado = result.data;
      salvarClienteCache(result.data);
    } else {
      clienteLogado = null;
      salvarClienteCache(null);
    }
  } catch (error) {
    console.error('Erro ao verificar login do cliente:', error);
    // Mantém o estado em cache (não derruba o login por erro de rede)
  }
  atualizarHeaderCliente();
}

function atualizarHeaderCliente() {
  // Delega para o renderizador unificado (que considera cliente E profissional)
  atualizarHeaderProfissional();
}

function sairClienteHome() {
  sairUsuarioHome();
}

function sairUsuarioHome() {
  // Limpa cliente
  localStorage.removeItem('acheei_cliente_token');
  salvarClienteCache(null);
  clienteLogado = null;
  // Limpa profissional
  localStorage.removeItem('acheei_prof_token');
  limparProfissionalCache();
  profissionalLogado = null;
  atualizarHeaderProfissional();
  fecharMenuMobile();
  fecharDropdownUsuario();
  showToast('Sessão encerrada', 'info');
}

// ============================================
// Dropdown do usuário (avatar + nome)
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

  // Fecha ao clicar fora
  document.addEventListener('click', function(e) {
    if (!dropdown.contains(e.target)) {
      fecharDropdownUsuario();
    }
  });

  // Fecha com Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      fecharDropdownUsuario();
    }
  });
}

function fecharDropdownUsuario() {
  var dropdown = document.getElementById('userDropdown');
  var trigger = document.getElementById('userDropdownTrigger');
  if (dropdown) dropdown.classList.remove('active');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

// ============================================
// Modal de Solicitação
// ============================================
var pushNoticeAceito = localStorage.getItem('acheei_notificacoes') === 'true';

// ============================================
// Confirmação de WhatsApp no modal de solicitação
// (fluxo gratuito via link wa.me)
// ============================================
function modalMostrarWhatsAppErro(msg) {
  var err = document.getElementById('modalWhatsappError');
  var ok = document.getElementById('modalWhatsappSuccess');
  if (err) { err.textContent = msg || ''; err.style.display = msg ? 'block' : 'none'; }
  if (ok) ok.style.display = 'none';
}

function modalMostrarWhatsAppSucesso(msg) {
  var err = document.getElementById('modalWhatsappError');
  var ok = document.getElementById('modalWhatsappSuccess');
  if (err) { err.style.display = 'none'; err.textContent = ''; }
  if (ok) { ok.style.display = 'block'; ok.textContent = msg || 'WhatsApp confirmado!'; }
}

async function modalGerarConfirmacaoWhatsApp() {
  var tel = document.getElementById('clienteTelefone').value.trim();
  if (!tel || tel.replace(/\D/g, '').length < 10) {
    modalMostrarWhatsAppErro('Informe um telefone válido com DDD para gerar a confirmação.');
    return;
  }
  modalMostrarWhatsAppErro('');
  var btn = document.getElementById('modalBtnConfirmarWhatsApp');
  if (btn) { btn.disabled = true; btn.textContent = 'Gerando...'; }
  var result = await fetch(API_BASE + '/clientes/verificar-whatsapp-inicial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone: tel })
  }).then(function(r) { return r.json(); }).catch(function() { return null; });
  if (btn) { btn.disabled = false; btn.textContent = 'Confirmar WhatsApp'; }
  if (!result || !result.success) {
    modalMostrarWhatsAppErro((result && result.message) || 'Erro ao gerar a confirmação.');
    return;
  }
  modalWhatsAppTelefone = result.telefone;
  modalWhatsAppLink = result.link;
  var step = document.getElementById('modalWhatsappConfirmStep');
  if (step) step.style.display = 'block';
  showToast('Confirme seu WhatsApp enviando o código para nosso número.', 'info');
}

function modalAbrirWhatsAppLink() {
  if (modalWhatsAppLink) {
    window.open(modalWhatsAppLink, '_blank');
  } else {
    modalMostrarWhatsAppErro('Clique em "Confirmar WhatsApp" primeiro.');
  }
}

async function modalConfirmarCodigoWhatsApp() {
  var codigo = document.getElementById('modalWhatsappCodigoInput').value.trim();
  if (!codigo || codigo.length !== 6) {
    modalMostrarWhatsAppErro('Digite o código de 6 dígitos enviado.');
    return;
  }
  if (!modalWhatsAppTelefone) {
    modalMostrarWhatsAppErro('Gere a confirmação antes de confirmar o código.');
    return;
  }
  modalMostrarWhatsAppErro('');
  var btn = document.getElementById('modalBtnConfirmarCodigoWhatsApp');
  if (btn) { btn.disabled = true; btn.textContent = 'Confirmando...'; }
  var result = await fetch(API_BASE + '/clientes/confirmar-whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telefone: modalWhatsAppTelefone, codigo: codigo })
  }).then(function(r) { return r.json(); }).catch(function() { return null; });
  if (btn) { btn.disabled = false; btn.textContent = 'Confirmar codigo'; }
  if (result && result.success) {
    modalWhatsAppConfirmado = true;
    modalMostrarWhatsAppSucesso('WhatsApp confirmado!');
    var step = document.getElementById('modalWhatsappConfirmStep');
    if (step) step.style.display = 'none';
    var btnGerar = document.getElementById('modalBtnConfirmarWhatsApp');
    if (btnGerar) { btnGerar.disabled = true; btnGerar.textContent = 'WhatsApp confirmado'; }
    // Libera o envio da solicitação
    var submitBtn = document.querySelector('#solicitacaoForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-disabled');
    }
  } else {
    modalMostrarWhatsAppErro((result && result.message) || 'Código incorreto. Tente novamente.');
  }
}

// Profissionais não podem solicitar serviços a outros profissionais
function mostrarErroProfSolicitacao(event) {
  if (event) {
    if (event.preventDefault) event.preventDefault();
    if (event.stopPropagation) event.stopPropagation();
  }
  showToast('Profissionais não podem solicitar serviços a outros profissionais, por favor crie uma conta como cliente', 'error');
}

async function abrirModalSolicitacao(id, nome, profissao) {
  // Profissional logado: bloqueia a abertura do modal de solicitação
  if (profissionalLogado) {
    mostrarErroProfSolicitacao();
    return;
  }
  document.getElementById('modalProfissionalId').value = id;
  document.getElementById('modalProfissionalNome').textContent = nome;
  document.getElementById('modalProfissionalProfissao').textContent = profissao;

  // Oculta o modal até renderizarmos o estado correto, evitando "flash" do formulário completo
  var modal = document.getElementById('solicitacaoModal');
  var cadastroSection = document.querySelector('.modal-cadastro-section');
  var descricaoGroup = document.querySelector('#solicitacaoForm .form-group:last-of-type');
  var pushNotice = document.querySelector('.push-notice-modal');
  var submitBtn = document.querySelector('#solicitacaoForm button[type="submit"]');

  if (cadastroSection) cadastroSection.classList.remove('hidden');

  // Reseta o estado da confirmação de WhatsApp ao abrir o modal
  modalWhatsAppConfirmado = false;
  modalWhatsAppTelefone = '';
  modalWhatsAppLink = '';
  var modalWaStep = document.getElementById('modalWhatsappConfirmStep');
  if (modalWaStep) modalWaStep.style.display = 'none';
  var modalWaGerar = document.getElementById('modalBtnConfirmarWhatsApp');
  if (modalWaGerar) { modalWaGerar.disabled = false; modalWaGerar.textContent = 'Confirmar WhatsApp'; }
  var modalWaSucesso = document.getElementById('modalWhatsappSuccess');
  if (modalWaSucesso) modalWaSucesso.style.display = 'none';
  var modalWaErro = document.getElementById('modalWhatsappError');
  if (modalWaErro) { modalWaErro.style.display = 'none'; modalWaErro.textContent = ''; }
  var modalWaCodigo = document.getElementById('modalWhatsappCodigoInput');
  if (modalWaCodigo) modalWaCodigo.value = '';

  // Garante que o estado de login foi verificado antes de decidir como renderizar o modal
  try {
    await verificarLoginCliente();
  } catch (e) { /* ignora erro e segue */ }

  if (clienteLogado) {
    // Cliente logado: modal simples (só descrição)
    if (cadastroSection) cadastroSection.classList.add('hidden');
    if (pushNotice) pushNotice.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-disabled');
      submitBtn.innerHTML = '<span data-icon="send"></span> Enviar Solicitação';
    }
  } else {
    // Não logado: manter modal completo (cadastro embutido)
    if (cadastroSection) cadastroSection.classList.remove('hidden');

    // Bloquear envio até o usuário confirmar o WhatsApp
    var notificaoSuportada = typeof Notification !== 'undefined';
    var notificacoesOk = pushNoticeAceito || (notificaoSuportada && Notification.permission === 'granted');

    if (pushNotice) {
      if (!notificaoSuportada) {
        pushNotice.style.display = 'none';
      } else {
        pushNotice.style.display = notificacoesOk ? 'none' : 'block';
      }
    }
    if (submitBtn) {
      // Só libera o envio após confirmar o WhatsApp
      submitBtn.disabled = true;
      submitBtn.classList.add('btn-disabled');
      submitBtn.innerHTML = '<span data-icon="send"></span> Enviar Solicitação';
    }
  }

  // Agora sim, exibe o modal já renderizado corretamente
  if (modal) modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  document.getElementById('solicitacaoModal').classList.remove('active');
  document.getElementById('solicitacaoForm').reset();
  document.body.style.overflow = '';
}

// Função para ativar notificações no modal da index
async function ativarNotificacaoSolicitacao() {
  var ok = await ativarNotificacoes();
  if (ok) {
    pushNoticeAceito = true;
    localStorage.setItem('acheei_notificacoes', 'true');
    var pushNotice = document.querySelector('.push-notice-modal');
    if (pushNotice) {
      pushNotice.innerHTML = '✅ <strong>Notificações ativadas!</strong>';
      pushNotice.style.borderColor = '#28a745';
    }
    // O envio da solicitação só é liberado após confirmar o WhatsApp
  }
}

// ============================================
// Solicitar Serviço
// ============================================
async function enviarSolicitacao(event) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Enviando...';

  const descricao = document.getElementById('descricao').value.trim();
  const profissional_id = parseInt(document.getElementById('modalProfissionalId').value);
  const data_hora = document.getElementById('dataHora').value;
  const urgencia = document.getElementById('urgencia').value;
  const orcamento_estimado = document.getElementById('orcamentoEstimado').value.trim();

  if (!descricao) {
    showToast('Descreva o serviço que você precisa', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span data-icon="send"></span> Enviar Solicitação';
    return;
  }

try {
    // Decide se o cliente está logado (seção de cadastro oculta) para enviar direto
    var cadastroSection = document.querySelector('.modal-cadastro-section');
    var usarClienteLogado = clienteLogado && cadastroSection && cadastroSection.classList.contains('hidden');

    // Caso o cliente já esteja logado: envia direto sem cadastrar
    if (usarClienteLogado) {
      submitBtn.innerHTML = '<span class="spinner"></span> Enviando solicitação...';
      const data = {
        descricao: descricao,
        profissional_id: profissional_id,
        cliente_id: clienteLogado.id,
        data_hora: data_hora,
        urgencia: urgencia,
        orcamento_estimado: orcamento_estimado
      };
      const response = await fetch(`${API_BASE}/solicitacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
const result = await response.json();
      if (result.success) {
        showToast('Solicitação enviada! Direcionando para sua área...', 'success');
        fecharModal();
setTimeout(function() {
          window.location.href = 'cliente';
        }, 1200);
      } else {
        showToast(result.message, 'error');
      }
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span data-icon="send"></span> Enviar Solicitação';
      return;
    }

// ===== Não logado: cadastro + login automático =====
    const nome = document.getElementById('clienteNome').value.trim();
    const email = document.getElementById('clienteEmail').value.trim();
    const senha = document.getElementById('clienteSenha').value;
    const telefone = document.getElementById('clienteTelefone').value.trim();

    // Validação manual dos campos de cadastro (já que não usamos 'required' p/ não bloquear quando logado)
    if (!nome || !email || !senha || !telefone) {
      showToast('Preencha nome, email, senha e telefone para criar sua conta', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span data-icon="send"></span> Enviar Solicitação';
      return;
    }
    if (senha.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span data-icon="send"></span> Enviar Solicitação';
      return;
    }

    // Exige a confirmação do WhatsApp antes de criar a conta
    if (!modalWhatsAppConfirmado) {
      showToast('Confirme seu WhatsApp antes de enviar a solicitação', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span data-icon="send"></span> Enviar Solicitação';
      return;
    }

    let clienteId = null;
    let foiCadastroNovo = false;

    // 1. Tenta cadastrar o cliente
    submitBtn.innerHTML = '<span class="spinner"></span> Criando sua conta...';
    let cadastroResponse = await fetch(`${API_BASE}/clientes/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, telefone })
    });
    let cadastroResult = await cadastroResponse.json();
    let clienteToken = null;

    if (cadastroResult.success) {
      // Cadastro novo
      clienteId = cadastroResult.data.cliente.id;
      clienteToken = cadastroResult.data.token;
      foiCadastroNovo = true;
      // Salvar token do cliente
      localStorage.setItem('acheei_cliente_token', clienteToken);
      // Salvar a assinatura push que foi aceita antes do login/cadastro
      if (typeof salvarAssinaturaPendente === 'function') {
        salvarAssinaturaPendente();
      }
    } else {
      // Se email já existe, tenta login
      if (cadastroResult.message && cadastroResult.message.includes('já está cadastrado')) {
        submitBtn.innerHTML = '<span class="spinner"></span> Fazendo login...';
        let loginResponse = await fetch(`${API_BASE}/clientes/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha })
        });
        let loginResult = await loginResponse.json();
        if (loginResult.success) {
          clienteId = loginResult.data.cliente.id;
          clienteToken = loginResult.data.token;
          localStorage.setItem('acheei_cliente_token', clienteToken);
          // Salvar a assinatura push aceita antes do login
          if (typeof salvarAssinaturaPendente === 'function') {
            salvarAssinaturaPendente();
          }
        } else {
          showToast('Email já cadastrado, mas senha incorreta. Tente novamente.', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span data-icon="send"></span> Enviar Solicitação';
          return;
        }
      } else {
        showToast(cadastroResult.message || 'Erro ao criar conta', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span data-icon="send"></span> Enviar Solicitação';
        return;
      }
    }

    // 2. Enviar solicitação vinculada ao cliente
    submitBtn.innerHTML = '<span class="spinner"></span> Enviando solicitação...';
    const data = {
      cliente_nome: nome,
      cliente_telefone: telefone,
      descricao: descricao,
      profissional_id: profissional_id,
      cliente_id: clienteId,
      data_hora: data_hora,
      urgencia: urgencia,
      orcamento_estimado: orcamento_estimado
    };

    const response = await fetch(`${API_BASE}/solicitacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

if (result.success) {
      // Sempre redireciona para a área do cliente (aba de solicitações)
      showToast('Solicitação enviada! Direcionando para sua área...', 'success');
      fecharModal();
setTimeout(function() {
        window.location.href = 'cliente';
      }, 1200);
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    console.error('Erro ao enviar solicitação:', error);
    showToast('Erro ao conectar com o servidor', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span data-icon="send"></span> Enviar Solicitação';
  }
}

// ============================================
// Geolocalização Automática (preencher Cidade/Estado)
// ============================================
var GEO_CACHE_KEY = 'acheei_geo_cache';

function obterGeoCidadeCache() {
  try {
    var cache = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || 'null');
    return cache;
  } catch (e) {
    return null;
  }
}

function salvarGeoCidadeCache(cidade, estado) {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ cidade: cidade, estado: estado, time: Date.now() }));
  } catch (e) { /* ignora erro de armazenamento */ }
}

// Preenche os campos Cidade e Estado com os valores informados
function preencherCamposLocalizacao(cidade, estado) {
  var cidadeInput = document.getElementById('cidade');
  var estadoSelect = document.getElementById('estado');
  if (cidade && cidadeInput) cidadeInput.value = cidade;
  if (estado && estadoSelect) {
    // Seleciona a sigla correspondente no select (caso exista)
    var sigla = estado.toUpperCase().substring(0, 2);
    var found = false;
    for (var i = 0; i < estadoSelect.options.length; i++) {
      if (estadoSelect.options[i].value === sigla) {
        estadoSelect.selectedIndex = i;
        found = true;
        break;
      }
    }
    // Se o estado não for reconhecido, não força seleção
    if (!found) return;
  }
}

// Reverse geocoding via OpenStreetMap/Nominatim (gratuito, sem chave)
async function reverseGeocoding(lat, lon) {
  var url = 'https://nominatim.openstreetmap.org/reverse' +
    '?format=jsonv2&lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon) +
    '&accept-language=pt-BR&zoom=10';

  try {
    var response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) return null;
    var data = await response.json();
    if (!data || !data.address) return null;

    var cidade = null;
    // Campos possíveis: city, town, village, municipality, county, etc.
    cidade = data.address.city || data.address.town || data.address.village ||
             data.address.municipality || data.address.county || null;

    // Estado (region/state) - ex: "São Paulo" -> "SP"
    var estado = data.address.state || data.address.region || data.address.state_district || null;

    return { cidade: cidade, estado: estado };
  } catch (e) {
    console.error('Erro no reverse geocoding:', e);
    return null;
  }
}

// Converte o nome do estado para a sigla (UF) usando a lista do select
function estadoParaSigla(nomeEstado) {
  if (!nomeEstado) return null;
  var nome = nomeEstado.toLowerCase().trim();
  var estados = {
    'acre': 'AC','alagoas': 'AL','amapá': 'AP','amazonas': 'AM','bahia': 'BA',
    'ceará': 'CE','distrito federal': 'DF','espírito santo': 'ES','goiás': 'GO',
    'maranhão': 'MA','mato grosso': 'MT','mato grosso do sul': 'MS','minas gerais': 'MG',
    'pará': 'PA','paraíba': 'PB','paraná': 'PR','pernambuco': 'PE','piauí': 'PI',
    'rio de janeiro': 'RJ','rio grande do norte': 'RN','rio grande do sul': 'RS',
    'rondônia': 'RO','roraima': 'RR','santa catarina': 'SC','são paulo': 'SP',
    'sergipe': 'SE','tocantins': 'TO'
  };
  return estados[nome] || null;
}

// Função principal: pede a geolocalização e preenche os campos
function preencherLocalizacaoAutomatica() {
  var cidadeInput = document.getElementById('cidade');
  var estadoSelect = document.getElementById('estado');
  if (!cidadeInput || !estadoSelect) return;

  // Se já houver um valor preenchido, não sobrescreve
  if (cidadeInput.value.trim() !== '' || estadoSelect.value !== '') return;

  // Usa cache para não re-pedir permissão a cada visita
  var cache = obterGeoCidadeCache();
  if (cache && cache.cidade) {
    preencherCamposLocalizacao(cache.cidade, cache.estado || '');
    return;
  }

  // Verifica se a API de geolocalização está disponível
  if (!('geolocation' in navigator)) {
    console.log('Geolocalização não suportada pelo navegador');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async function(position) {
      var lat = position.coords.latitude;
      var lon = position.coords.longitude;
      var geo = await reverseGeocoding(lat, lon);
      if (geo && geo.cidade) {
        var sigla = estadoParaSigla(geo.estado);
        preencherCamposLocalizacao(geo.cidade, sigla || '');
        salvarGeoCidadeCache(geo.cidade, sigla || '');
      }
    },
    function(error) {
      // Permissão negada ou indisponível: mantém os campos vazios (sem erro intrusivo)
      console.log('Permissão de localização negada ou indisponível:', error.code);
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
  );
}

// ============================================
// Compartilhar Profissional
// ============================================
var profissionalCompartilhado = null;

function obterLinkProfissional() {
  var id = document.getElementById('compartilharProfissionalId').value;
  return window.location.origin + '/?profissional=' + id;
}

function montarTextoCompartilhamento() {
  if (!profissionalCompartilhado) return '';
  var p = profissionalCompartilhado;
  var texto = 'Conheça ' + p.nome + ' no Acheei! 🛠️\n';
  texto += 'Profissão: ' + p.profissao + '\n';
  if (p.cidade && p.estado) texto += 'Localização: ' + p.cidade + '/' + p.estado + '\n';
  texto += 'Solicite um serviço: ' + obterLinkProfissional();
  return texto;
}

function abrirCompartilhar(id, nome, profissao, cidade, estado, foto, mediaAvaliacoes, totalAvaliacoes) {
  profissionalCompartilhado = {
    id: id, nome: nome, profissao: profissao, cidade: cidade, estado: estado, foto: foto || ''
  };

  document.getElementById('compartilharProfissionalId').value = id;
  document.getElementById('compartilharNome').textContent = nome;
  document.getElementById('compartilharProfissao').textContent = profissao;
  document.getElementById('compartilharCidadeEstado').textContent = (cidade && estado) ? cidade + '/' + estado : 'Localização não informada';

  var avaliacaoEl = document.getElementById('compartilharAvaliacao');
  var media = Number(mediaAvaliacoes) || 0;
  var total = Number(totalAvaliacoes) || 0;
  avaliacaoEl.innerHTML = renderEstrelasSVG(media);

  // Foto do profissional
  var fotoContainer = document.getElementById('compartilharFoto');
  if (foto) {
    fotoContainer.innerHTML = '<img src="' + foto + '" alt="' + nome + '" style="width:100%;height:100%;object-fit:cover;">';
  } else {
    fotoContainer.innerHTML = '<span data-icon="user"></span>';
  }

  // Abre o modal
  document.getElementById('compartilharModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharCompartilhar() {
  document.getElementById('compartilharModal').classList.remove('active');
  document.body.style.overflow = '';
}

// Tenta usar a Web Share API nativa (mobile moderno); senão abre o modal
async function compartilharProfissional() {
  if (navigator.share) {
    try {
      await navigator.share({
        title: profissionalCompartilhado ? 'Acheei - ' + profissionalCompartilhado.nome : 'Acheei',
        text: montarTextoCompartilhamento(),
        url: obterLinkProfissional()
      });
      return;
    } catch (err) {
      // Usuário cancelou ou erro; segue para opções manuais
    }
  }
  // Fallback: mantém o modal de compartilhamento aberto para opções manuais
}

function compartilharWhatsApp() {
  var url = 'https://wa.me/?text=' + encodeURIComponent(montarTextoCompartilhamento());
  window.open(url, '_blank');
}

function compartilharFacebook() {
  var url = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(obterLinkProfissional());
  window.open(url, '_blank');
}

function compartilharTwitter() {
  var texto = profissionalCompartilhado ? 'Conheça ' + profissionalCompartilhado.nome + ' no Acheei! 🛠️' : 'Acheei';
  var url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(texto) + '&url=' + encodeURIComponent(obterLinkProfissional());
  window.open(url, '_blank');
}

function copiarLinkProfissional() {
  var link = obterLinkProfissional();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(function() {
      showToast('Link copiado!', 'success');
    }).catch(function() {
      copiarLinkFallback(link);
    });
  } else {
    copiarLinkFallback(link);
  }
}

function copiarLinkFallback(link) {
  var temp = document.createElement('textarea');
  temp.value = link;
  document.body.appendChild(temp);
  temp.select();
  try {
    document.execCommand('copy');
    showToast('Link copiado!', 'success');
  } catch (e) {
    showToast('Não foi possível copiar o link', 'error');
  }
  document.body.removeChild(temp);
}

// Ao abrir o site via link compartilhado (?profissional=ID), busca o profissional e abre o modal
async function abrirProfissionalPorLink() {
  var params = new URLSearchParams(window.location.search);
  var id = params.get('profissional');
  if (!id) return;

  try {
    var response = await fetch(API_BASE + '/profissionais/' + id);
    var result = await response.json();
    if (result.success && result.data) {
      var p = result.data;
      abrirCompartilhar(p.id, p.nome_perfil, p.profissao, p.cidade, p.estado, p.foto_perfil || '', p.media_avaliacoes, p.total_avaliacoes);
    }
  } catch (e) {
    console.error('Erro ao carregar profissional por link:', e);
  }
}

// ============================================
// Event Listeners
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // Verificar se o cliente está logado e atualizar o header
  verificarLoginCliente();
  // Verificar se o profissional está logado e atualizar o header
  verificarLoginProfissional();

  // Dropdown do usuário (avatar + nome)
  setupUserDropdown();

// Em páginas que não têm a busca da home (ex: sobre, contato),
  // encerra aqui para não acessar elementos que não existem nessa página.
  if (!document.getElementById('searchForm')) {
    return;
  }

  // Preencher Cidade/Estado automaticamente via geolocalização
  preencherLocalizacaoAutomatica();

  // Se veio por link compartilhado, abre o modal do profissional
  abrirProfissionalPorLink();

// Carregar categorias para autocomplete
  carregarCategorias();
  setupAutocomplete();

  // Se veio de categorias.html com profissão pré-selecionada (?profissao=...)
  var profissaoUrl = new URLSearchParams(window.location.search).get('profissao');
  if (profissaoUrl) {
    document.getElementById('profissao').value = profissaoUrl;
    document.getElementById('searchForm').dispatchEvent(new Event('submit'));
    document.getElementById('busca').scrollIntoView({ behavior: 'smooth' });
  }

  // Botão "Solicitar Serviço" do modal de compartilhamento
  var compartilharSolicitarBtn = document.getElementById('compartilharSolicitarBtn');
  if (compartilharSolicitarBtn) {
    compartilharSolicitarBtn.addEventListener('click', function() {
      if (!profissionalCompartilhado) return;
      var p = profissionalCompartilhado;
      fecharCompartilhar();
      abrirModalSolicitacao(p.id, p.nome, p.profissao);
    });
  }

  // Fechar modal de compartilhamento clicando fora ou com ESC
  var compartilharModal = document.getElementById('compartilharModal');
  if (compartilharModal) {
    compartilharModal.addEventListener('click', function(e) {
      if (e.target === this) fecharCompartilhar();
    });
  }
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') fecharCompartilhar();
  });

  // Formulário de busca
  document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const params = {};
    let profissao = document.getElementById('profissao').value.trim();
    const cidade = document.getElementById('cidade').value.trim();
    const estado = document.getElementById('estado').value;

    // "Servente" é sinônimo de "Ajudante de Pedreiro"
    if (profissao.toLowerCase() === 'servente') {
      profissao = 'Ajudante de Pedreiro';
    }

    if (profissao) params.profissao = profissao;
    if (cidade) params.cidade = cidade;
    if (estado) params.estado = estado;

    buscarProfissionais(params);

    // Scroll para resultados
    document.getElementById('resultados').scrollIntoView({ behavior: 'smooth' });
  });

  // Formulário de solicitação
  document.getElementById('solicitacaoForm').addEventListener('submit', enviarSolicitacao);

  // Máscara de telefone (modal)
  document.getElementById('clienteTelefone').addEventListener('input', function(e) {
    e.target.value = formatTelefone(e.target.value);
    // Se o número mudar após confirmar, exige nova confirmação
    if (modalWhatsAppConfirmado) {
      modalWhatsAppConfirmado = false;
      modalWhatsAppTelefone = '';
      modalWhatsAppLink = '';
      var mws = document.getElementById('modalWhatsappSuccess');
      if (mws) mws.style.display = 'none';
      var mwe = document.getElementById('modalWhatsappError');
      if (mwe) { mwe.style.display = 'none'; mwe.textContent = ''; }
      var mwStep = document.getElementById('modalWhatsappConfirmStep');
      if (mwStep) mwStep.style.display = 'none';
      var mwGerar = document.getElementById('modalBtnConfirmarWhatsApp');
      if (mwGerar) { mwGerar.disabled = false; mwGerar.textContent = 'Confirmar WhatsApp'; }
      var mwSubmit = document.querySelector('#solicitacaoForm button[type="submit"]');
      if (mwSubmit) { mwSubmit.disabled = true; mwSubmit.classList.add('btn-disabled'); }
    }
  });

  // Campo do código de confirmação (modal): só dígitos (6)
  var mwCodigo = document.getElementById('modalWhatsappCodigoInput');
  if (mwCodigo) {
    mwCodigo.addEventListener('input', function(e) {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    });
    mwCodigo.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        modalConfirmarCodigoWhatsApp();
      }
    });
  }

  // Fechar modal com ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') fecharModal();
  });

  // Fechar modal clicando fora
  document.getElementById('solicitacaoModal').addEventListener('click', function(e) {
    if (e.target === this) fecharModal();
  });

  // Clique nas categorias
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', function() {
      const categoria = this.dataset.categoria;
      document.getElementById('profissao').value = categoria;
      // Disparar busca automaticamente
      document.getElementById('searchForm').dispatchEvent(new Event('submit'));
    });
  });
});

