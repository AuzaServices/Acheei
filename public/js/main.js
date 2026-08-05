// ============================================
// Acheei - Main JavaScript
// Funcionalidades da Home e Busca
// ============================================

const API_BASE = '/api';

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
        </div>
      </div>
      <div class="card-body">
        <div class="fotos-servicos">
          ${fotosHtml}
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary" onclick="abrirModalSolicitacao(${prof.id}, '${prof.nome_perfil}', '${prof.profissao}')">
          <span data-icon="send"></span> Solicitar Serviço
        </button>
      </div>
    `;

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

    // Filtrar por iniciais (ex: digitar "Dia" mostra "Diarista")
    const matches = categoriasCache.filter(cat => 
      cat.toLowerCase().startsWith(value)
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

async function verificarLoginCliente() {
  const token = localStorage.getItem('acheei_cliente_token');
  if (!token) {
    clienteLogado = null;
    atualizarHeaderCliente();
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/clientes/me`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const result = await response.json();
    if (result.success) {
      clienteLogado = result.data;
    } else {
      clienteLogado = null;
    }
  } catch (error) {
    console.error('Erro ao verificar login do cliente:', error);
    clienteLogado = null;
  }
  atualizarHeaderCliente();
}

function atualizarHeaderCliente() {
  var userArea = document.getElementById('userArea');
  var btnAreaCliente = document.getElementById('btnAreaCliente');
  var mobileUserArea = document.getElementById('mobileUserArea');
  var mobileBtnAreaCliente = document.getElementById('mobileBtnAreaCliente');
  var btnAreaProfissional = document.getElementById('btnAreaProfissional');
  var mobileBtnAreaProfissional = document.getElementById('mobileBtnAreaProfissional');

  if (clienteLogado) {
    if (userArea) userArea.style.display = 'flex';
    if (btnAreaCliente) btnAreaCliente.style.display = 'none';
    if (mobileUserArea) mobileUserArea.style.display = 'flex';
    if (mobileBtnAreaCliente) mobileBtnAreaCliente.style.display = 'none';
    // Oculta o botão "Área do Profissional" quando o cliente está logado
    if (btnAreaProfissional) btnAreaProfissional.style.display = 'none';
    if (mobileBtnAreaProfissional) mobileBtnAreaProfissional.style.display = 'none';

    // Nome
    var nome = clienteLogado.nome || 'Cliente';
    if (document.getElementById('userName')) document.getElementById('userName').textContent = nome;
    if (document.getElementById('mobileUserName')) document.getElementById('mobileUserName').textContent = nome;

    // Avatar (foto ou placeholder)
    var avatarHtml = clienteLogado.foto ? '<img src="' + clienteLogado.foto + '" alt="Foto">' : '👤';
    if (document.getElementById('userAvatar')) document.getElementById('userAvatar').innerHTML = avatarHtml;
    if (document.getElementById('mobileUserAvatar')) document.getElementById('mobileUserAvatar').innerHTML = avatarHtml;
  } else {
    if (userArea) userArea.style.display = 'none';
    if (btnAreaCliente) btnAreaCliente.style.display = '';
    if (mobileUserArea) mobileUserArea.style.display = 'none';
    if (mobileBtnAreaCliente) mobileBtnAreaCliente.style.display = '';
    // Restaura o botão "Área do Profissional" quando o cliente não está logado
    if (btnAreaProfissional) btnAreaProfissional.style.display = '';
    if (mobileBtnAreaProfissional) mobileBtnAreaProfissional.style.display = '';
  }
}

function sairClienteHome() {
  localStorage.removeItem('acheei_cliente_token');
  clienteLogado = null;
  atualizarHeaderCliente();
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

async function abrirModalSolicitacao(id, nome, profissao) {
  document.getElementById('modalProfissionalId').value = id;
  document.getElementById('modalProfissionalNome').textContent = nome;
  document.getElementById('modalProfissionalProfissao').textContent = profissao;
  document.getElementById('solicitacaoModal').classList.add('active');
  document.body.style.overflow = 'hidden';

  // Garante que o estado de login foi verificado antes de decidir como renderizar o modal
  try {
    await verificarLoginCliente();
  } catch (e) { /* ignora erro e segue */ }

  // Se o cliente está logado, mostrar modal simples (só descrição)
  var cadastroSection = document.querySelector('.modal-cadastro-section');
  var descricaoGroup = document.querySelector('#solicitacaoForm .form-group:last-of-type');
  var pushNotice = document.querySelector('.push-notice-modal');
  var submitBtn = document.querySelector('#solicitacaoForm button[type="submit"]');

  if (clienteLogado) {
    // Esconde cadastro e aviso push
    if (cadastroSection) cadastroSection.classList.add('hidden');
    if (pushNotice) pushNotice.style.display = 'none';
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-disabled');
    }
    // Ajusta o título do botão
    if (submitBtn) submitBtn.innerHTML = '<span data-icon="send"></span> Enviar Solicitação';
    return;
  }

  // Não logado: manter modal completo (cadastro embutido)
  if (cadastroSection) cadastroSection.classList.remove('hidden');

  // Bloquear envio até o usuário aceitar as notificações push
  var notificaoSuportada = typeof Notification !== 'undefined';
  var notificacoesOk = pushNoticeAceito || (notificaoSuportada && Notification.permission === 'granted');

  if (pushNotice && descricaoGroup) {
    // move push notice para antes da descricao (já está no modal-cadastro-section)
  }
  if (pushNotice) {
    if (!notificaoSuportada) {
      pushNotice.style.display = 'none';
    } else {
      pushNotice.style.display = notificacoesOk ? 'none' : 'block';
    }
  }
  if (submitBtn) {
    submitBtn.disabled = notificaoSuportada ? !notificacoesOk : false;
    submitBtn.classList.toggle('btn-disabled', notificaoSuportada && !notificacoesOk);
  }
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
    // Liberar o botão de envio após aceitar notificações
    var submitBtn = document.querySelector('#solicitacaoForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-disabled');
    }
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
        cliente_id: clienteLogado.id
      };
      const response = await fetch(`${API_BASE}/solicitacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success) {
        showToast('Solicitação enviada! Acesse a Área do Cliente para acompanhar.', 'success');
        fecharModal();
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
      cliente_id: clienteId
    };

    const response = await fetch(`${API_BASE}/solicitacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      // Redireciona para a área do cliente APENAS quando é cadastro novo
      if (foiCadastroNovo) {
        showToast('Conta criada! Solicitação enviada. Direcionando para sua área...', 'success');
        fecharModal();
        setTimeout(function() {
          window.location.href = 'cliente.html';
        }, 1200);
      } else {
        showToast('Solicitação enviada! Acesse a Área do Cliente para acompanhar.', 'success');
        fecharModal();
      }
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
// Event Listeners
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // Verificar se o cliente está logado e atualizar o header
  verificarLoginCliente();

// Carregar categorias para autocomplete
  carregarCategorias();
  setupAutocomplete();

  // Dropdown do usuário (avatar + nome)
  setupUserDropdown();

  // Formulário de busca
  document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const params = {};
    const profissao = document.getElementById('profissao').value.trim();
    const cidade = document.getElementById('cidade').value.trim();
    const estado = document.getElementById('estado').value;

    if (profissao) params.profissao = profissao;
    if (cidade) params.cidade = cidade;
    if (estado) params.estado = estado;

    buscarProfissionais(params);

    // Scroll para resultados
    document.getElementById('resultados').scrollIntoView({ behavior: 'smooth' });
  });

  // Formulário de solicitação
  document.getElementById('solicitacaoForm').addEventListener('submit', enviarSolicitacao);

  // Máscara de telefone
  document.getElementById('clienteTelefone').addEventListener('input', function(e) {
    e.target.value = formatTelefone(e.target.value);
  });

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

