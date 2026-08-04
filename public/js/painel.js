// ============================================
// Acheei - Painel Administrativo
// Gerenciamento de profissionais e solicitacoes
// ============================================

const API_BASE = '/api';
let token = localStorage.getItem('acheei_token');
let profissionaisData = [];

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
        localStorage.removeItem('acheei_token');
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

async function login(event) {
  event.preventDefault();
  var btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Entrando...';
  var usuario = document.getElementById('usuario').value.trim();
  var senha = document.getElementById('senha').value;
  var result = await apiRequest(API_BASE + '/admin/login', {
    method: 'POST',
    body: JSON.stringify({ usuario: usuario, senha: senha })
  });
  btn.disabled = false;
  btn.innerHTML = 'Entrar no Painel';
  if (result && result.success) {
    token = result.data.token;
    localStorage.setItem('acheei_token', token);
    document.getElementById('adminName').textContent = result.data.usuario;
    mostrarDashboard();
    carregarDados();
    showToast('Login realizado com sucesso!', 'success');
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem('acheei_token');
  token = null;
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

function switchTab(tab, btn) {
  var tabs = document.querySelectorAll('.dashboard-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  btn.classList.add('active');
  var contents = document.querySelectorAll('.tab-content');
  for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');
  var map = { pendentes: 'tabPendentes', aprovados: 'tabAprovados', reprovados: 'tabReprovados', solicitacoes: 'tabSolicitacoes' };
  document.getElementById(map[tab]).classList.add('active');
}

async function carregarDados() {
  await carregarProfissionais();
  await carregarSolicitacoes();
}

async function carregarProfissionais() {
  var result = await apiRequest(API_BASE + '/profissionais/todas');
  if (result && result.success) {
    profissionaisData = result.data;
    renderizarTabelas();
  }
}

async function carregarSolicitacoes() {
  var result = await apiRequest(API_BASE + '/solicitacoes');
  if (result && result.success) {
    renderizarSolicitacoes(result.data);
    document.getElementById('countSolicitacoes').textContent = result.total;
  }
}

function renderizarTabelas() {
  var pendentes = [], aprovados = [], reprovados = [];
  for (var i = 0; i < profissionaisData.length; i++) {
    var p = profissionaisData[i];
    if (p.status_aprovacao === 'pendente') pendentes.push(p);
    else if (p.status_aprovacao === 'aprovado') aprovados.push(p);
    else if (p.status_aprovacao === 'reprovado') reprovados.push(p);
  }
  document.getElementById('countPendentes').textContent = pendentes.length;
  document.getElementById('countAprovados').textContent = aprovados.length;
  document.getElementById('countReprovados').textContent = reprovados.length;
  renderizarTabela('pendentesBody', pendentes);
  renderizarTabela('aprovadosBody', aprovados);
  renderizarTabela('reprovadosBody', reprovados);
}

function renderizarTabela(tbodyId, profissionais) {
  var tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';
  if (profissionais.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">Nenhum profissional encontrado nesta categoria</td></tr>';
    return;
  }
  for (var i = 0; i < profissionais.length; i++) {
    var prof = profissionais[i];
    var foto = prof.foto_perfil ? '<img src="' + prof.foto_perfil + '" alt="' + prof.nome_perfil + '" class="foto-mini">' : '<div class="foto-mini-placeholder">' + icon('user') + '</div>';
    var sc = prof.status_aprovacao;
    var sl = sc.charAt(0).toUpperCase() + sc.slice(1);
    var acoes = gerarAcoes(prof);
    var tr = document.createElement('tr');
    tr.innerHTML = '<td>' + foto + '</td><td><strong>' + prof.nome_perfil + '</strong></td><td>' + prof.cpf + '</td><td>' + prof.profissao + '</td><td>' + prof.cidade + '/' + prof.estado + '</td><td><span class="status-badge ' + sc + '">' + sl + '</span></td><td><div class="action-btns"><button class="btn btn-outline btn-sm" onclick="verDetalhes(' + prof.id + ')">' + icon('eye') + ' Ver</button>' + acoes + '</div></td>';
    tbody.appendChild(tr);
  }
}

function gerarAcoes(prof) {
  if (prof.status_aprovacao === 'pendente') {
    return '<button class="btn btn-success btn-sm" onclick="aprovarProfissional(' + prof.id + ')">' + icon('check') + ' Aprovar</button><button class="btn btn-danger btn-sm" onclick="reprovarProfissional(' + prof.id + ')">' + icon('x') + ' Reprovar</button>';
  }
  if (prof.status_aprovacao === 'aprovado') {
    return '<button class="btn btn-danger btn-sm" onclick="reprovarProfissional(' + prof.id + ')">' + icon('x') + ' Reprovar</button>';
  }
  if (prof.status_aprovacao === 'reprovado') {
    return '<button class="btn btn-success btn-sm" onclick="aprovarProfissional(' + prof.id + ')">' + icon('check') + ' Aprovar</button><button class="btn btn-danger btn-sm" onclick="deletarProfissional(' + prof.id + ')" style="background:#6c757d;border-color:#6c757d;">' + icon('trash') + ' Deletar</button>';
  }
  return '';
}

async function aprovarProfissional(id) {
  if (!confirm('Tem certeza que deseja aprovar este profissional?')) return;
  var result = await apiRequest(API_BASE + '/admin/aprovar/' + id, { method: 'PUT' });
  if (result && result.success) {
    showToast('Profissional aprovado com sucesso!', 'success');
    await carregarProfissionais();
  }
}

async function reprovarProfissional(id) {
  if (!confirm('Tem certeza que deseja reprovar este profissional?')) return;
  var result = await apiRequest(API_BASE + '/admin/reprovar/' + id, { method: 'PUT' });
  if (result && result.success) {
    showToast('Profissional reprovado!', 'info');
    await carregarProfissionais();
  }
}

async function deletarProfissional(id) {
  if (!confirm('ATENCAO! Esta acao ira DELETAR PERMANENTEMENTE este profissional, TODAS as suas fotos (Cloudinary) e solicitacoes relacionadas. Esta acao nao pode ser desfeita!')) return;
  if (!confirm('Confirmacao final: deseja realmente excluir permanentemente este registro?')) return;
  var result = await apiRequest(API_BASE + '/admin/deletar/' + id, { method: 'DELETE' });
  if (result && result.success) {
    var msg = 'Profissional deletado permanentemente!';
    if (result.erros && result.erros.length > 0) msg += ' (Alguns erros: ' + result.erros.join(', ') + ')';
    showToast(msg, 'success');
    await carregarProfissionais();
  }
}

function verDetalhes(id) {
  var prof = null;
  for (var i = 0; i < profissionaisData.length; i++) {
    if (profissionaisData[i].id === id) { prof = profissionaisData[i]; break; }
  }
  if (!prof) return;
  var fotosServicos = [];
  if (prof.fotos_servicos) {
    if (Array.isArray(prof.fotos_servicos)) fotosServicos = prof.fotos_servicos;
    else try { fotosServicos = JSON.parse(prof.fotos_servicos); } catch(e) { fotosServicos = []; }
  }
  var fotosHtml = '';
  if (fotosServicos.length > 0) {
    for (var i = 0; i < fotosServicos.length; i++) {
      fotosHtml += '<div class="foto-box"><button type="button" class="photo-delete-btn" onclick="removerFotoServico(' + prof.id + ', ' + i + ')">×</button><img src="' + fotosServicos[i] + '" alt="Servico"></div>';
    }
  } else {
    fotosHtml = '<div class="foto-box foto-placeholder">Nenhuma foto de serviço cadastrada</div>';
  }
  var fotoPerfil = '';
  if (prof.foto_perfil) {
    fotoPerfil = '<div class="foto-box" style="width:120px;height:120px;margin:0 auto 16px;"><button type="button" class="photo-delete-btn" onclick="removerFotoPerfil(' + prof.id + ')">×</button><img src="' + prof.foto_perfil + '" alt="' + prof.nome_perfil + '" class="detalhes-perfil-foto"></div>';
  } else {
    fotoPerfil = '<div class="foto-box foto-placeholder" style="width:120px;height:120px;margin:0 auto 16px;">Sem foto de perfil</div>';
  }
  var sc = prof.status_aprovacao;
  var sl = sc.charAt(0).toUpperCase() + sc.slice(1);
  document.getElementById('detalhesBody').innerHTML =
    fotoPerfil +
    '<h3 style="text-align:center;margin-bottom:4px;">' + prof.nome_perfil + '</h3>' +
    '<p style="text-align:center;color:red;font-weight:600;margin-bottom:16px;">' + prof.profissao + '</p>' +
    '<div style="text-align:center;margin-bottom:16px;"><span class="status-badge ' + sc + '">' + sl + '</span></div>' +
    '<div class="detalhes-grid">' +
      '<div class="detalhes-item"><div class="label">CPF</div><div class="value">' + prof.cpf + '</div></div>' +
      '<div class="detalhes-item"><div class="label">Data de Nascimento</div><div class="value">' + new Date(prof.data_nascimento).toLocaleDateString('pt-BR') + '</div></div>' +
      '<div class="detalhes-item"><div class="label">Endereco</div><div class="value">' + prof.endereco + ', ' + (prof.numero || 'S/N') + '</div></div>' +
      '<div class="detalhes-item"><div class="label">Bairro</div><div class="value">' + prof.bairro + '</div></div>' +
      '<div class="detalhes-item"><div class="label">Cidade</div><div class="value">' + prof.cidade + '</div></div>' +
      '<div class="detalhes-item"><div class="label">Estado</div><div class="value">' + prof.estado + '</div></div>' +
      '<div class="detalhes-item"><div class="label">CEP</div><div class="value">' + prof.cep + '</div></div>' +
      '<div class="detalhes-item"><div class="label">Data de Cadastro</div><div class="value">' + new Date(prof.data_cadastro).toLocaleString('pt-BR') + '</div></div>' +
    '</div>' +
    '<h4 style="margin-top:24px;margin-bottom:12px;">Fotos dos Servicos</h4>' +
    '<div class="detalhes-fotos">' + fotosHtml + '</div>';
  document.getElementById('detalhesModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function removerFotoPerfil(id) {
  if (!confirm('Remover a foto de perfil deste profissional?')) return;
  var result = await apiRequest(API_BASE + '/admin/profissional/' + id + '/foto-perfil', { method: 'PUT' });
  if (result && result.success) {
    showToast('Foto de perfil removida com sucesso.', 'success');
    atualizarDadosProfissional(id, { foto_perfil: '' });
    verDetalhes(id);
  }
}

async function removerFotoServico(id, index) {
  if (!confirm('Remover esta foto de serviço?')) return;
  var result = await apiRequest(API_BASE + '/admin/profissional/' + id + '/foto-servico/' + index, { method: 'DELETE' });
  if (result && result.success) {
    showToast('Foto de serviço removida com sucesso.', 'success');
    atualizarDadosProfissional(id, { fotos_servicos: result.data ? result.data.fotos_servicos : [] });
    verDetalhes(id);
  }
}

function atualizarDadosProfissional(id, changes) {
  for (var i = 0; i < profissionaisData.length; i++) {
    if (profissionaisData[i].id === id) {
      profissionaisData[i] = Object.assign({}, profissionaisData[i], changes);
      break;
    }
  }
}

function fecharDetalhes() {
  document.getElementById('detalhesModal').classList.remove('active');
  document.body.style.overflow = '';
}

function renderizarSolicitacoes(solicitacoes) {
  var container = document.getElementById('solicitacoesList');
  container.innerHTML = '';
  if (!solicitacoes || solicitacoes.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="icon">' + icon('clipboard') + '</span><h3>Nenhuma solicitacao recebida</h3><p>As solicitacoes de servicos dos clientes aparecerao aqui.</p></div>';
    return;
  }

  var servicos = solicitacoes.filter(function(sol) { return sol.tipo !== 'troca_fotos'; });
  var trocas = solicitacoes.filter(function(sol) { return sol.tipo === 'troca_fotos'; });

  if (servicos.length > 0) {
    var servicosSection = document.createElement('div');
    servicosSection.innerHTML = '<h3 style="margin-bottom:16px;">Solicitações de Serviço</h3>';
    servicos.forEach(function(sol) {
      var statusPag = sol.status_pagamento || 'pendente';
      var badgeHtml = statusPag === 'pago'
        ? '<span class="badge pago">Pago</span>'
        : '<span class="badge pendente">Pendente</span>';
      var pagarBtn = statusPag === 'pendente'
        ? '<button class="btn btn-primary btn-sm" onclick="pagarSolicitacao(' + sol.id + ')">Pagar R$14,99</button>'
        : '';
      var card = document.createElement('div');
      card.className = 'solicitacao-card';
      card.innerHTML =
        '<div class="card-header">' +
          '<h4>Solicitação #' + sol.id + '</h4>' +
          '<span class="date">' + new Date(sol.data_solicitacao).toLocaleString('pt-BR') + '</span>' +
        '</div>' +
        '<div class="info">' +
          '<div class="item"><div class="label">Cliente</div><div class="value">' + sol.cliente_nome + '</div></div>' +
          '<div class="item"><div class="label">Telefone</div><div class="value">' + (sol.cliente_telefone || 'Não informado') + '</div></div>' +
          '<div class="item"><div class="label">Pagamento</div><div class="value">' + badgeHtml + '</div></div>' +
        '</div>' +
        '<div class="descricao"><div class="label">Descrição do Serviço</div><div class="value">' + sol.descricao + '</div></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' + pagarBtn + '</div>';
      servicosSection.appendChild(card);
    });
    container.appendChild(servicosSection);
  } else {
    var emptyServicos = document.createElement('div');
    emptyServicos.className = 'empty-state';
    emptyServicos.innerHTML = '<span class="icon">📋</span><h3>Sem solicitações de serviço</h3><p>As solicitações de serviços aparecerão aqui quando forem enviadas.</p>';
    container.appendChild(emptyServicos);
  }

  if (trocas.length > 0) {
    var trocasSection = document.createElement('div');
    trocasSection.style.marginTop = '32px';
    trocasSection.innerHTML = '<h3 style="margin-bottom:16px;">Solicitações de Troca de Fotos</h3>';
    trocas.forEach(function(sol) {
      var statusLabel = sol.status_aprovacao ? sol.status_aprovacao.charAt(0).toUpperCase() + sol.status_aprovacao.slice(1) : 'Pendente';
      var statusClass = sol.status_aprovacao || 'pendente';
      var card = document.createElement('div');
      card.className = 'solicitacao-card';
      var fotosHtml = '';
      if (sol.foto_perfil_nova) {
        fotosHtml += '<div style="margin-bottom:12px;"><div class="label">Nova Foto de Perfil</div><img src="' + sol.foto_perfil_nova + '" alt="Nova foto de perfil" style="width:100%;max-width:180px;border-radius:12px;margin-top:8px;object-fit:cover;"></div>';
      }
      var novasFotos = [];
      try { novasFotos = sol.fotos_servicos_novas ? JSON.parse(sol.fotos_servicos_novas) : []; } catch (e) { novasFotos = []; }
      if (novasFotos.length > 0) {
        fotosHtml += '<div class="label">Novas Fotos de Serviço</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:8px;">';
        for (var j = 0; j < novasFotos.length; j++) {
          fotosHtml += '<img src="' + novasFotos[j] + '" alt="Nova foto de serviço" style="width:100%;height:120px;object-fit:cover;border-radius:12px;">';
        }
        fotosHtml += '</div>';
      }
      card.innerHTML =
        '<div class="card-header">' +
          '<h4>Troca de Fotos #' + sol.id + '</h4>' +
          '<span class="date">' + new Date(sol.data_solicitacao).toLocaleString('pt-BR') + '</span>' +
        '</div>' +
        '<div class="info">' +
          '<div class="item"><div class="label">Profissional</div><div class="value">' + sol.nome_perfil + ' (' + sol.profissao + ')</div></div>' +
          '<div class="item"><div class="label">Status</div><div class="value"><span class="status-badge ' + statusClass + '">' + statusLabel + '</span></div></div>' +
        '</div>' +
        '<div class="descricao"><div class="label">Motivo da troca</div><div class="value">' + (sol.motivo_troca || sol.descricao) + '</div></div>' +
        fotosHtml +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">' +
          (sol.status_aprovacao === 'pendente' ? '<button class="btn btn-success btn-sm" onclick="aprovarSolicitacao(' + sol.id + ')">Aprovar</button><button class="btn btn-danger btn-sm" onclick="rejeitarSolicitacao(' + sol.id + ')">Rejeitar</button>' : '') +
        '</div>';
      trocasSection.appendChild(card);
    });
    container.appendChild(trocasSection);
  } else {
    var emptyTrocas = document.createElement('div');
    emptyTrocas.className = 'empty-state';
    emptyTrocas.style.marginTop = '32px';
    emptyTrocas.innerHTML = '<span class="icon">📷</span><h3>Sem solicitações de troca de fotos</h3><p>As solicitações de troca de fotos aparecerão aqui quando forem enviadas pelos profissionais.</p>';
    container.appendChild(emptyTrocas);
  }
}

async function aprovarSolicitacao(id) {
  if (!confirm('Aprovar esta solicitação de troca de fotos?')) return;
  var result = await apiRequest(API_BASE + '/admin/solicitacoes/' + id + '/aprovar', { method: 'PUT' });
  if (result && result.success) {
    showToast('Solicitação aprovada e fotos atualizadas.', 'success');
    await carregarSolicitacoes();
    await carregarProfissionais();
  }
}

async function rejeitarSolicitacao(id) {
  if (!confirm('Rejeitar esta solicitação de troca de fotos?')) return;
  var result = await apiRequest(API_BASE + '/admin/solicitacoes/' + id + '/rejeitar', { method: 'PUT' });
  if (result && result.success) {
    showToast('Solicitação rejeitada.', 'info');
    await carregarSolicitacoes();
  }
}

async function verificarToken() {
  if (!token) { mostrarLogin(); return; }
  var result = await apiRequest(API_BASE + '/admin/verificar');
  if (result && result.success) {
    document.getElementById('adminName').textContent = result.data.usuario;
    mostrarDashboard();
    await carregarDados();
  } else {
    mostrarLogin();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('loginForm').addEventListener('submit', login);
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') fecharDetalhes(); });
  document.getElementById('detalhesModal').addEventListener('click', function(e) { if (e.target === this) fecharDetalhes(); });
  verificarToken();
});
