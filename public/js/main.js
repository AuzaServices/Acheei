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
      : `<div class="profile-photo-placeholder">👤</div>`;

    let fotosHtml = '';
    if (prof.fotos_servicos && prof.fotos_servicos.length > 0) {
      fotosHtml = prof.fotos_servicos.map(foto => 
        `<img src="${foto}" alt="Serviço realizado">`
      ).join('');
      // Preencher até 3 slots
      for (let i = prof.fotos_servicos.length; i < 3; i++) {
        fotosHtml += `<div class="foto-placeholder">📷</div>`;
      }
    } else {
      fotosHtml = `
        <div class="foto-placeholder">📷</div>
        <div class="foto-placeholder">📷</div>
        <div class="foto-placeholder">📷</div>
      `;
    }

    card.innerHTML = `
      <div class="card-header">
        ${fotoPerfil}
        <div class="card-info">
          <h4>${prof.nome_perfil}</h4>
          <p class="profissao">${prof.profissao}</p>
          <p class="localizacao">📍 ${prof.cidade}/${prof.estado}</p>
        </div>
      </div>
      <div class="card-body">
        <div class="fotos-servicos">
          ${fotosHtml}
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary" onclick="abrirModalSolicitacao(${prof.id}, '${prof.nome_perfil}', '${prof.profissao}')">
          📋 Solicitar Serviço
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
    const value = this.value.toLowerCase();
    list.innerHTML = '';

    if (value.length < 1) return;

    const matches = categoriasCache.filter(cat => 
      cat.toLowerCase().includes(value)
    ).slice(0, 6);

    matches.forEach(match => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.textContent = match;
      item.addEventListener('click', () => {
        input.value = match;
        list.innerHTML = '';
      });
      list.appendChild(item);
    });
  });

  document.addEventListener('click', function(e) {
    if (e.target !== input) {
      list.innerHTML = '';
    }
  });
}

// ============================================
// Modal de Solicitação
// ============================================
function abrirModalSolicitacao(id, nome, profissao) {
  document.getElementById('modalProfissionalId').value = id;
  document.getElementById('modalProfissionalNome').textContent = nome;
  document.getElementById('modalProfissionalProfissao').textContent = profissao;
  document.getElementById('solicitacaoModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharModal() {
  document.getElementById('solicitacaoModal').classList.remove('active');
  document.getElementById('solicitacaoForm').reset();
  document.body.style.overflow = '';
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

  const data = {
    cliente_nome: document.getElementById('clienteNome').value.trim(),
    cliente_telefone: document.getElementById('clienteTelefone').value.trim(),
    descricao: document.getElementById('descricao').value.trim(),
    profissional_id: parseInt(document.getElementById('modalProfissionalId').value)
  };

  try {
    const response = await fetch(`${API_BASE}/solicitacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      showToast(result.message, 'success');
      fecharModal();
    } else {
      showToast(result.message, 'error');
    }
  } catch (error) {
    console.error('Erro ao enviar solicitação:', error);
    showToast('Erro ao conectar com o servidor', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>📤</span> Enviar Solicitação';
  }
}

// ============================================
// Event Listeners
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // Carregar categorias para autocomplete
  carregarCategorias();
  setupAutocomplete();

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

