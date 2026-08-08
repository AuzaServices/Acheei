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

let detalhesEditando = false;
let detalhesId = null;

function verDetalhes(id) {
  var prof = null;
  for (var i = 0; i < profissionaisData.length; i++) {
    if (profissionaisData[i].id === id) { prof = profissionaisData[i]; break; }
  }
  if (!prof) return;
  detalhesId = id;
  detalhesEditando = false;
  renderizarDetalhes(prof);
  document.getElementById('detalhesModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderizarDetalhes(prof) {
  var fotosServicos = [];
  if (prof.fotos_servicos) {
    if (Array.isArray(prof.fotos_servicos)) fotosServicos = prof.fotos_servicos;
    else try { fotosServicos = JSON.parse(prof.fotos_servicos); } catch(e) { fotosServicos = []; }
  }
var sc = prof.status_aprovacao;
  var sl = sc.charAt(0).toUpperCase() + sc.slice(1);

  // Foto de perfil (somente remoção, sem editar)
  var fotoPerfil = '<div class="detalhes-foto-perfil" style="text-align:center;margin-bottom:16px;">';
  fotoPerfil += '<div style="position:relative;display:inline-block;">';
  if (prof.foto_perfil) {
    fotoPerfil += '<img src="' + prof.foto_perfil + '" alt="' + prof.nome_perfil + '" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid red;display:block;">';
    fotoPerfil += '<button type="button" class="detalhes-remover-foto" onclick="removerFotoPerfil(' + prof.id + ')" title="Remover foto" aria-label="Remover foto">&times;</button>';
  } else {
    fotoPerfil += '<div style="width:100px;height:100px;border-radius:50%;background:var(--gray-lighter);display:flex;align-items:center;justify-content:center;font-size:40px;color:var(--gray-medium);">👤</div>';
  }
  fotoPerfil += '</div></div>';

  var itens = '';
  itens += detalheItem('cpf', 'CPF', prof.cpf, false);
  itens += detalheItem('nome_perfil', 'Nome de Perfil', prof.nome_perfil, true);
  itens += detalheItem('email', 'E-mail', prof.email, true);
  itens += detalheItem('profissao', 'Profissão', prof.profissao, false);
  itens += detalheItem('data_nascimento', 'Data de Nascimento', prof.data_nascimento ? new Date(prof.data_nascimento).toLocaleDateString('pt-BR') : '', true);
  itens += detalheItem('endereco', 'Endereço', prof.endereco, true);
  itens += detalheItem('numero', 'Número', prof.numero || '', true);
  itens += detalheItem('bairro', 'Bairro', prof.bairro, true);
  itens += detalheItem('cidade', 'Cidade', prof.cidade, true);
  itens += detalheItem('estado', 'Estado', prof.estado, true);
  itens += detalheItem('cep', 'CEP', prof.cep, true);
  itens += detalheItem('data_cadastro', 'Data de Cadastro', prof.data_cadastro ? new Date(prof.data_cadastro).toLocaleString('pt-BR') : '', false);

  var fotosHtml = '';
  for (var i = 0; i < 3; i++) {
    var fotoUrl = fotosServicos[i];
    fotosHtml += '<div class="detalhes-foto-item" style="position:relative;">';
    if (fotoUrl) {
      fotosHtml += '<img src="' + fotoUrl + '" alt="Servico ' + (i + 1) + '">';
    } else {
      fotosHtml += '<div style="width:100%;height:150px;border:2px dashed var(--gray-lighter);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;color:var(--gray-medium);background:var(--gray-bg);">Sem foto</div>';
    }
    fotosHtml += '<button type="button" class="btn btn-primary btn-sm" onclick="editarFotoServicoAdmin(' + prof.id + ', ' + i + ')" style="position:absolute;bottom:6px;right:6px;padding:4px 10px;font-size:11px;">Alterar</button>';
    fotosHtml += '</div>';
  }

  document.getElementById('detalhesBody').innerHTML =
    fotoPerfil +
    '<h3 style="text-align:center;margin-bottom:4px;">' + prof.nome_perfil + '</h3>' +
    '<p style="text-align:center;color:red;font-weight:600;margin-bottom:16px;">' + prof.profissao + '</p>' +
    '<div style="text-align:center;margin-bottom:16px;"><span class="status-badge ' + sc + '">' + sl + '</span></div>' +
    '<div class="detalhes-grid">' + itens + '</div>' +
    '<h4 style="margin-top:24px;margin-bottom:12px;">Fotos dos Serviços</h4>' +
    '<div class="detalhes-fotos">' + fotosHtml + '</div>';

  document.getElementById('detalhesSaveBar').classList.remove('active');
}

function detalheItem(campo, label, valor, editavel) {
  var html = '<div class="detalhes-item" id="detalhe-' + campo + '">';
  html += '<div class="label">' + label + '</div>';
  html += '<div class="value" id="valor-' + campo + '">' + (valor || '—') + '</div>';
  if (editavel) {
    html += '<button type="button" class="edit-btn" onclick="editarCampo(\'' + campo + '\', \'' + label + '\')" title="Editar">' + icon('edit') + '</button>';
    html += '<input type="text" class="edit-input" id="input-' + campo + '" style="display:none;">';
    html += '<input type="hidden" id="campo-' + campo + '" value="' + (valor || '') + '">';
  }
  html += '</div>';
  return html;
}

function editarCampo(campo, label) {
  var item = document.getElementById('detalhe-' + campo);
  var input = document.getElementById('input-' + campo);
  if (!item || !input) return;
  item.classList.add('editando');
  input.value = document.getElementById('campo-' + campo).value;
  input.style.display = 'block';
  input.focus();
  document.getElementById('valor-' + campo).style.display = 'none';
  document.getElementById('detalhesSaveBar').classList.add('active');
  detalhesEditando = true;
  input.onchange = function() {
    document.getElementById('campo-' + campo).value = input.value;
  };
}

function cancelarEdicao() {
  if (!detalhesId) return;
  detalhesEditando = false;
  document.getElementById('detalhesSaveBar').classList.remove('active');
  // Re-renderiza com dados originais
  var prof = null;
  for (var i = 0; i < profissionaisData.length; i++) {
    if (profissionaisData[i].id === detalhesId) { prof = profissionaisData[i]; break; }
  }
  if (prof) renderizarDetalhes(prof);
}

async function salvarDetalhes() {
  if (!detalhesId) return;
  var dados = {};
  var campos = ['nome_perfil', 'email', 'data_nascimento', 'endereco', 'numero', 'bairro', 'cidade', 'estado', 'cep'];
  for (var i = 0; i < campos.length; i++) {
    var campo = campos[i];
    var input = document.getElementById('input-' + campo);
    if (input && input.style.display !== 'none') {
      dados[campo] = input.value;
    }
  }

  var btn = document.getElementById('btnSalvarDetalhes');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Salvando...';
  }

  var result = await apiRequest(API_BASE + '/admin/profissional/' + detalhesId, {
    method: 'PUT',
    body: JSON.stringify(dados)
  });

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = 'Salvar Alterações';
  }

  if (result && result.success) {
    showToast('Dados atualizados com sucesso!', 'success');
    detalhesEditando = false;
    await carregarProfissionais();
    cancelarEdicao();
  } else {
    showToast((result && result.message) || 'Erro ao salvar', 'error');
  }
}

function editarFotoPerfilAdmin(id) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    try {
      var resized = await resizeImage(file);
      var url = await uploadImageToCloudinary(resized, 'perfis');
      var result = await apiRequest(API_BASE + '/admin/profissional/' + id, {
        method: 'PUT',
        body: JSON.stringify({ foto_perfil: url })
      });
      if (result && result.success) {
        showToast('Foto de perfil atualizada!', 'success');
        await carregarProfissionais();
        cancelarEdicao();
      } else {
        showToast((result && result.message) || 'Erro ao atualizar foto', 'error');
      }
    } catch (err) {
      console.error('Erro ao alterar foto de perfil:', err);
      showToast(err.message || 'Erro ao processar imagem', 'error');
    }
  };
  input.click();
}

function editarFotoServicoAdmin(id, index) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    try {
      var resized = await resizeImage(file);
      var url = await uploadImageToCloudinary(resized, 'servicos');

      // Busca fotos atuais
      var prof = null;
      for (var i = 0; i < profissionaisData.length; i++) {
        if (profissionaisData[i].id == id) { prof = profissionaisData[i]; break; }
      }
      var fotos = [];
      if (prof && prof.fotos_servicos) {
        if (Array.isArray(prof.fotos_servicos)) fotos = prof.fotos_servicos.slice();
        else try { fotos = JSON.parse(prof.fotos_servicos); } catch(e) { fotos = []; }
      }
      while (fotos.length < 3) fotos.push(null);
      fotos[index] = url;

      var result = await apiRequest(API_BASE + '/admin/profissional/' + id, {
        method: 'PUT',
        body: JSON.stringify({ fotos_servicos: fotos })
      });
      if (result && result.success) {
        showToast('Foto de serviço atualizada!', 'success');
        await carregarProfissionais();
        cancelarEdicao();
      } else {
        showToast((result && result.message) || 'Erro ao atualizar foto', 'error');
      }
    } catch (err) {
      console.error('Erro ao alterar foto de serviço:', err);
      showToast(err.message || 'Erro ao processar imagem', 'error');
    }
  };
  input.click();
}

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
    var avaliacaoHtml = sol.avaliacao_nota
      ? '<div class="item" style="grid-column:1/-1;"><div class="label">Avaliação do cliente</div><div class="value"><strong>★ ' + sol.avaliacao_nota + '/5</strong><br>Respeito: ' + sol.avaliacao_respeito + ' · Comprometimento: ' + sol.avaliacao_comprometimento + ' · Qualidade: ' + sol.avaliacao_qualidade + '</div></div>'
      : '<div class="item" style="grid-column:1/-1;"><div class="label">Avaliação do cliente</div><div class="value">Ainda não avaliada.</div></div>';

    // Campos opcionais da solicitação (Data/Hora, Urgência, Orçamento estimado)
    var extrasHtml = '';
    if (sol.data_hora) {
      var dh = new Date(sol.data_hora);
      extrasHtml += '<div class="item"><div class="label">Data e Hora</div><div class="value">' + dh.toLocaleString('pt-BR') + '</div></div>';
    }
    if (sol.urgencia) {
      extrasHtml += '<div class="item"><div class="label">Urgência</div><div class="value">' + sol.urgencia + '</div></div>';
    }
    if (sol.orcamento_estimado) {
      extrasHtml += '<div class="item"><div class="label">Orçamento estimado</div><div class="value">' + sol.orcamento_estimado + '</div></div>';
    }

      card.innerHTML =
      '<div class="card-header"><h4>Solicitacao #' + sol.id + '</h4><span class="date">' + new Date(sol.data_solicitacao).toLocaleString('pt-BR') + '</span></div>' +
      '<div class="info">' +
        '<div class="item"><div class="label">Cliente</div><div class="value">' + sol.cliente_nome + '</div></div>' +
        '<div class="item"><div class="label">Telefone</div><div class="value"><a href="' + telefoneLink + '" target="_blank" class="btn btn-success btn-sm" style="text-decoration:none;">' + icon('chat') + ' ' + sol.cliente_telefone + '</a></div></div>' +
        '<div class="item"><div class="label">Profissional</div><div class="value">' + sol.nome_perfil + ' (' + sol.profissao + ')</div></div>' +
        extrasHtml +
        '<div class="item" style="grid-column:1/-1;"><div class="label">Descricao do Servico</div><div class="value">' + sol.descricao + '</div></div>' +
        avaliacaoHtml +
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
  document.getElementById('detalhesModal').addEventListener('click', function(e) { if (e.target === this) fecharDetalhes(); });
  verificarToken();
});
