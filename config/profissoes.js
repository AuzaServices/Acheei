// ============================================
// Configuração de profissões para links de compartilhamento
// Cada profissão tem um link amigável (/cadastro/:profissao)
// que direciona ao cadastro com a profissão pré-selecionada
// e metatags (og/twitter) dinâmicas para prévia no WhatsApp/redes.
// ============================================

// Imagem genérica usada quando a profissão não tem imagem própria
const IMAGEM_PADRAO = 'https://i.imgur.com/JIJuFgp.jpeg';
const URL_BASE = 'https://www.acheei.com.br/cadastro';

// Título e descrição padrão (fallback para profissões não mapeadas)
const PADRAO = {
  titulo: 'Acheei - Cadastre-se Grátis e Encontre Novos Clientes',
  descricao: 'Divulgue seu trabalho, mostre suas fotos e seja encontrado por quem procura pelo seu serviço. O cadastro é gratuito e leva poucos minutos.',
  imagem: IMAGEM_PADRAO
};

// Mapa: slug da profissão (como aparece na URL) -> dados de metatag
const PROFISSOES = {
  'Eletricista': {
    titulo: 'Acheei - Cadastro para Eletricistas',
    descricao: 'Divulgue seu trabalho como eletricista na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/1vgL9W8.jpeg'
  },
  'Pedreiro': {
    titulo: 'Acheei - Cadastro para Pedreiros',
    descricao: 'Divulgue seu trabalho como pedreiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/DPbDL1T.jpeg'
  },
  'Encanador': {
    titulo: 'Acheei - Cadastro para Encanadores',
    descricao: 'Divulgue seu trabalho como encanador na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Pintor': {
    titulo: 'Acheei - Cadastro para Pintores',
    descricao: 'Divulgue seu trabalho como pintor na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Marceneiro': {
    titulo: 'Acheei - Cadastro para Marceneiros',
    descricao: 'Divulgue seu trabalho como marceneiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Jardineiro': {
    titulo: 'Acheei - Cadastro para Jardineiros',
    descricao: 'Divulgue seu trabalho como jardineiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Diarista': {
    titulo: 'Acheei - Cadastro para Diaristas',
    descricao: 'Divulgue seu trabalho como diarista na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Mecânico': {
    titulo: 'Acheei - Cadastro para Mecânicos',
    descricao: 'Divulgue seu trabalho como mecânico na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Chaveiro': {
    titulo: 'Acheei - Cadastro para Chaveiros',
    descricao: 'Divulgue seu trabalho como chaveiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Técnico em TI': {
    titulo: 'Acheei - Cadastro para Técnicos em TI',
    descricao: 'Divulgue seu trabalho como técnico em TI na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Personal Trainer': {
    titulo: 'Acheei - Cadastro para Personal Trainers',
    descricao: 'Divulgue seu trabalho como personal trainer na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Fotógrafo': {
    titulo: 'Acheei - Cadastro para Fotógrafos',
    descricao: 'Divulgue seu trabalho como fotógrafo na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Cozinheiro': {
    titulo: 'Acheei - Cadastro para Cozinheiros',
    descricao: 'Divulgue seu trabalho como cozinheiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Babá': {
    titulo: 'Acheei - Cadastro para Babás',
    descricao: 'Divulgue seu trabalho como babá na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Cuidador de Idosos': {
    titulo: 'Acheei - Cadastro para Cuidadores de Idosos',
    descricao: 'Divulgue seu trabalho como cuidador de idosos na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Segurança': {
    titulo: 'Acheei - Cadastro para Seguranças',
    descricao: 'Divulgue seu trabalho como segurança na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Advogado': {
    titulo: 'Acheei - Cadastro para Advogados',
    descricao: 'Divulgue seu trabalho como advogado na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Contador': {
    titulo: 'Acheei - Cadastro para Contadores',
    descricao: 'Divulgue seu trabalho como contador na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Designer Gráfico': {
    titulo: 'Acheei - Cadastro para Designers Gráficos',
    descricao: 'Divulgue seu trabalho como designer gráfico na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Professor Particular': {
    titulo: 'Acheei - Cadastro para Professores Particulares',
    descricao: 'Divulgue seu trabalho como professor particular na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Cabeleireiro': {
    titulo: 'Acheei - Cadastro para Cabeleireiros',
    descricao: 'Divulgue seu trabalho como cabeleireiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Manicure': {
    titulo: 'Acheei - Cadastro para Manicures',
    descricao: 'Divulgue seu trabalho como manicure na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Costureira': {
    titulo: 'Acheei - Cadastro para Costureiras',
    descricao: 'Divulgue seu trabalho como costureira na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Confeiteiro': {
    titulo: 'Acheei - Cadastro para Confeiteiros',
    descricao: 'Divulgue seu trabalho como confeiteiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Vidraceiro': {
    titulo: 'Acheei - Cadastro para Vidraceiros',
    descricao: 'Divulgue seu trabalho como vidraceiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Serralheiro': {
    titulo: 'Acheei - Cadastro para Serralheiros',
    descricao: 'Divulgue seu trabalho como serralheiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Tatuador': {
    titulo: 'Acheei - Cadastro para Tatuadores',
    descricao: 'Divulgue seu trabalho como tatuador na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Montador de Móveis': {
    titulo: 'Acheei - Cadastro para Montadores de Móveis',
    descricao: 'Divulgue seu trabalho como montador de móveis na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Frete e Mudanças': {
    titulo: 'Acheei - Cadastro para Frete e Mudanças',
    descricao: 'Divulgue seu trabalho com frete e mudanças na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Gesseiro': {
    titulo: 'Acheei - Cadastro para Gesseiros',
    descricao: 'Divulgue seu trabalho como gesseiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Ajudante de Pedreiro': {
    titulo: 'Acheei - Cadastro para Ajudantes de Pedreiro',
    descricao: 'Divulgue seu trabalho como ajudante de pedreiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Metalúrgico': {
    titulo: 'Acheei - Cadastro para Metalúrgicos',
    descricao: 'Divulgue seu trabalho como metalúrgico na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  },
  'Adesivador': {
    titulo: 'Acheei - Cadastro para Adesivadores',
    descricao: 'Divulgue seu trabalho como adesivador na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: IMAGEM_PADRAO
  }
};

// Normaliza o nome da profissão (aceita com/sem acento, maiúsculas/minúsculas)
function normalizar(nome) {
  return String(nome || '').trim();
}

// Retorna os dados de metatag para uma profissão (ou o padrão)
function obterProfissao(slug) {
  var chave = normalizar(slug);
  return PROFISSOES[chave] || PADRAO;
}

module.exports = {
  URL_BASE: URL_BASE,
  PADRAO: PADRAO,
  PROFISSOES: PROFISSOES,
  obterProfissao: obterProfissao,
  normalizar: normalizar
};
