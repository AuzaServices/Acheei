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

// Estado de edição atual no modal de detalhes
let detalhesEditId = null;

// Gera um item editável do grid no modal de detalhes
function detalhesItemEditavel(label, campo, valor, extraCls) {
  var valorHtml = (valor !== undefined && valor !== null && valor !== '') ? valor : '—';
  return '<div class="detalhes-item" data-campo="' + campo + '" id="detalhe-' + campo + '">' +
    '<button type="button" class="edit-btn" title="Editar ' + label + '" data-campo="' + campo + '">' + icon('edit') + '</button>' +
    '<div class="label">' + label + '</div>' +
    '<div class="value">' + valorHtml + '</div>' +
  '</div>';
}

// Abre o modo de edição de um campo específico
function editarCampo(campo) {
  var item = document.getElementById('detalhe-' + campo);
  if (!item) return;
  var prof = null;
  for (var i = 0; i < profissionaisData.length; i++) {
    if (profissionaisData[i].id === detalhesEditId) { prof = profissionaisData[i]; break; }
  }
  if (!prof) return;

  var valorAtual = prof[campo] !== undefined && prof[campo] !== null ? prof[campo] : '';
  var input = '';

  if (campo === 'data_nascimento') {
    var d = valorAtual ? new Date(valorAtual) : null;
    var iso = d && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
    input = '<input type="date" class="edit-input" id="edit-' + campo + '" value="' + iso + '">';
  } else if (campo === 'estado') {
    input = '<input type="text" class="edit-input edit-input-sm" id="edit-' + campo + '" value="' + valorAtual + '" maxlength="2" placeholder="UF" style="text-transform:uppercase;">';
  } else if (campo === 'cep') {
    input = '<input type="text" class="edit-input edit-input-cep" id="edit-' + campo + '" value="' + valorAtual + '" maxlength="9" placeholder="00000-000">';
  } else if (campo === 'numero') {
    input = '<input type="text" class="edit-input edit-input-sm" id="edit-' + campo + '" value="' + valorAtual + '" placeholder="Nº">';
  } else if (campo === 'endereco') {
    input = '<input type="text" class="edit-input" id="edit-' + campo + '" value="' + valorAtual + '" placeholder="Rua, avenida...">';
  } else {
    input = '<input type="text" class="edit-input" id="edit-' + campo + '" value="' + valorAtual + '">';
  }

  item.classList.add('editando');
  item.querySelector('.value').innerHTML = input;
  item.querySelector('.edit-btn').style.display = 'none';

  // Ao digitar, mostra a barra de salvar
  var inp = document.getElementById('edit-' + campo);
  if (inp) {
    inp.addEventListener('input', function() {
      document.getElementById('detalhesSaveBar').classList.add('active');
    });
    inp.focus();
  }
}

// Cancela a edição atual (recarrega os dados originais do modal)
function cancelarEdicao() {
  if (detalhesEditId) {
    verDetalhes(detalhesEditId);
  }
}

// Salva as alterações feitas no modal
async function salvarDetalhes() {
  if (!detalhesEditId) return;
  var camposEditaveis = ['nome_perfil', 'endereco', 'numero', 'bairro', 'cidade', 'estado', 'cep', 'data_nascimento'];
  var dados = {};
  var algumEditado = false;

  for (var i = 0; i < camposEditaveis.length; i++) {
    var campo = camposEditaveis[i];
    var inp = document.getElementById('edit-' + campo);
    if (inp) {
      dados[campo] = inp.value.trim();
      algumEditado = true;
    }
  }

  if (!algumEditado) {
    showToast('Nenhum campo foi editado', 'info');
    return;
  }

  var btn = document.getElementById('btnSalvarDetalhes');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Salvando...';

  var result = await apiRequest(API_BASE + '/admin/profissional/' + detalhesEditId, {
    method: 'PUT',
    body: JSON.stringify(dados)
  });

  btn.disabled = false;
  btn.innerHTML = 'Salvar Alterações';

  if (result && result.success) {
    showToast('Dados atualizados com sucesso!', 'success');
    await carregarProfissionais();
    verDetalhes(detalhesEditId);
  }
}

function verDetalhes(id) {
  var prof = null;
  for (var i = 0; i < profissionaisData.length; i++) {
    if (profissionaisData[i].id === id) { prof = profissionaisData[i]; break; }
  }
  if (!prof) return;
  detalhesEditId = id;
  var fotosServicos = [];
  if (prof.fotos_servicos) {
    if (Array.isArray(prof.fotos_servicos)) fotosServicos = prof.fotos_servicos;
    else try { fotosServicos = JSON.parse(prof.fotos_servicos); } catch(e) { fotosServicos = []; }
  }
  var fotosHtml = '';
  if (fotosServicos.length > 0) {
    for (var i = 0; i < fotosServicos.length; i++) {
      fotosHtml += '<div class="foto-box"><button type="button" class="photo-delete-btn" onclick="removerFotoServico(' + prof.id + ', ' + i + ')">&times;</button><img src="' + fotosServicos[i] + '" alt="Servico"></div>';
    }
  } else {
    fotosHtml = '<p style="color:#999;">Nenhuma foto de servico cadastrada</p>';
  }
  var fotoPerfil = '';
  if (prof.foto_perfil) fotoPerfil = '<div class="foto-box"><button type="button" class="photo-delete-btn" onclick="removerFotoPerfil(' + prof.id + ')">&times;</button><img src="' + prof.foto_perfil + '" alt="' + prof.nome_perfil + '" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid red;display:block;margin:0 auto 16px;"></div>';
var sc = prof.status_aprovacao;
  var sl = sc.charAt(0).toUpperCase() + sc.slice(1);
  var dataNasc = prof.data_nascimento ? new Date(prof.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
  document.getElementById('detalhesBody').innerHTML =
    fotoPerfil +
    detalhesItemEditavel('Nome', 'nome_perfil', prof.nome_perfil) +
    '<p style="text-align:center;color:red;font-weight:600;margin-bottom:16px;">' + prof.profissao + '</p>' +
    '<div style="text-align:center;margin-bottom:16px;"><span class="status-badge ' + sc + '">' + sl + '</span></div>' +
    '<div class="detalhes-grid">' +
      '<div class="detalhes-item"><div class="label">CPF</div><div class="value">' + prof.cpf + '</div></div>' +
      detalhesItemEditavel('Data de Nascimento', 'data_nascimento', dataNasc) +
      detalhesItemEditavel('Endereço', 'endereco', prof.endereco) +
      detalhesItemEditavel('Número', 'numero', prof.numero || 'S/N') +
      detalhesItemEditavel('Bairro', 'bairro', prof.bairro) +
      detalhesItemEditavel('Cidade', 'cidade', prof.cidade) +
      detalhesItemEditavel('Estado', 'estado', prof.estado) +
      detalhesItemEditavel('CEP', 'cep', prof.cep) +
      '<div class="detalhes-item"><div class="label">Data de Cadastro</div><div class="value">' + new Date(prof.data_cadastro).toLocaleString('pt-BR') + '</div></div>' +
    '</div>' +
    '<h4 style="margin-top:24px;margin-bottom:12px;">Fotos dos Servicos</h4>' +
    '<div class="detalhes-fotos">' + fotosHtml + '</div>';

  // Esconde a barra de salvar ao abrir/reabrir o modal
  document.getElementById('detalhesSaveBar').classList.remove('active');

  document.getElementById('detalhesModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharDetalhes() {
  document.getElementById('detalhesModal').classList.remove('active');
  document.body.style.overflow = '';
}

async function removerFotoPerfil(id) {
  if (!confirm('Remover foto de perfil deste profissional?')) return;
  var result = await apiRequest(API_BASE + '/admin/profissional/' + id + '/foto-perfil', { method: 'DELETE' });
  if (result && result.success) {
    showToast('Foto de perfil removida com sucesso.', 'success');
    await carregarProfissionais();
    verDetalhes(id);
  }
}

async function removerFotoServico(id, index) {
  if (!confirm('Remover esta foto de serviço do profissional?')) return;
  var result = await apiRequest(API_BASE + '/admin/profissional/' + id + '/fotos-servicos/' + index, { method: 'DELETE' });
  if (result && result.success) {
    showToast('Foto de serviço removida com sucesso.', 'success');
    await carregarProfissionais();
    verDetalhes(id);
  }
}

function renderizarSolicitacoes(solicitacoes) {
  var container = document.getElementById('solicitacoesList');
  container.innerHTML = '';
  if (solicitacoes.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="icon">' + icon('clipboard') + '</span><h3>Nenhuma solicitacao recebida</h3><p>As solicitacoes de servicos dos clientes aparecerao aqui.</p></div>';
    return;
  }
  for (var i = 0; i < solicitacoes.length; i++) {
    var sol = solicitacoes[i];
    var card = document.createElement('div');
    card.className = 'solicitacao-card';
var telefoneLink = sol.cliente_telefone ? 'https://wa.me/55' + sol.cliente_telefone.replace(/\D/g, '') + '?text=' + encodeURIComponent('Ola, aqui e do time Acheei! Gostaria de dar prosseguimento ao servico de "' + sol.descricao.substring(0, 100) + '"') : '#';
      card.innerHTML =
      '<div class="card-header"><h4>Solicitacao #' + sol.id + '</h4><span class="date">' + new Date(sol.data_solicitacao).toLocaleString('pt-BR') + '</span></div>' +
      '<div class="info">' +
        '<div class="item"><div class="label">Cliente</div><div class="value">' + sol.cliente_nome + '</div></div>' +
        '<div class="item"><div class="label">Telefone</div><div class="value"><a href="' + telefoneLink + '" target="_blank" class="btn btn-success btn-sm" style="text-decoration:none;">' + icon('chat') + ' ' + sol.cliente_telefone + '</a></div></div>' +
        '<div class="item"><div class="label">Profissional</div><div class="value">' + sol.nome_perfil + ' (' + sol.profissao + ')</div></div>' +
        '<div class="item" style="grid-column:1/-1;"><div class="label">Descricao do Servico</div><div class="value">' + sol.descricao + '</div></div>' +
      '</div>';
    container.appendChild(card);
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
  document.getElementById('detalhesModal').addEventListener('click', function(e) {
    // Clica no overlay para fechar
    if (e.target === this) fecharDetalhes();
    // Delegate para o botão de editar (lápis)
    var editBtn = e.target.closest('.edit-btn');
    if (editBtn && editBtn.dataset.campo) {
      editarCampo(editBtn.dataset.campo);
    }
  });
  verificarToken();
});
