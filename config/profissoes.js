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
    imagem: 'https://i.imgur.com/78LKY07.jpeg'
  },
  'Pintor': {
    titulo: 'Acheei - Cadastro para Pintores',
    descricao: 'Divulgue seu trabalho como pintor na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/O4jFeKm.jpeg'
  },
  'Marceneiro': {
    titulo: 'Acheei - Cadastro para Marceneiros',
    descricao: 'Divulgue seu trabalho como marceneiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/m6SZdYY.jpeg'
  },
  'Jardineiro': {
    titulo: 'Acheei - Cadastro para Jardineiros',
    descricao: 'Divulgue seu trabalho como jardineiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/HuAbaWL.jpeg'
  },
  'Diarista': {
    titulo: 'Acheei - Cadastro para Diaristas',
    descricao: 'Divulgue seu trabalho como diarista na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/2D8QP5i.jpeg'
  },
  'Mecânico': {
    titulo: 'Acheei - Cadastro para Mecânicos',
    descricao: 'Divulgue seu trabalho como mecânico na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/4hga9K8.jpeg'
  },
  'Chaveiro': {
    titulo: 'Acheei - Cadastro para Chaveiros',
    descricao: 'Divulgue seu trabalho como chaveiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/DYQjxa6.jpeg'
  },
  'Técnico em TI': {
    titulo: 'Acheei - Cadastro para Técnicos em TI',
    descricao: 'Divulgue seu trabalho como técnico em TI na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/zXMJRjc.jpeg'
  },
  'Personal Trainer': {
    titulo: 'Acheei - Cadastro para Personal Trainers',
    descricao: 'Divulgue seu trabalho como personal trainer na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/dZ5Frar.jpeg'
  },
  'Fotógrafo': {
    titulo: 'Acheei - Cadastro para Fotógrafos',
    descricao: 'Divulgue seu trabalho como fotógrafo na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/sT0aHhC.jpeg'
  },
  'Cozinheiro': {
    titulo: 'Acheei - Cadastro para Cozinheiros',
    descricao: 'Divulgue seu trabalho como cozinheiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/nObLZWm.jpeg'
  },
  'Babá': {
    titulo: 'Acheei - Cadastro para Babás',
    descricao: 'Divulgue seu trabalho como babá na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/PXtLGHp.jpeg'
  },
  'Cuidador de Idosos': {
    titulo: 'Acheei - Cadastro para Cuidadores de Idosos',
    descricao: 'Divulgue seu trabalho como cuidador de idosos na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/QrIiAkT.jpeg'
  },
  'Segurança': {
    titulo: 'Acheei - Cadastro para Seguranças',
    descricao: 'Divulgue seu trabalho como segurança na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/Fft7sGJ.jpeg'
  },
  'Advogado': {
    titulo: 'Acheei - Cadastro para Advogados',
    descricao: 'Divulgue seu trabalho como advogado na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/QDH7407.jpeg'
  },
  'Contador': {
    titulo: 'Acheei - Cadastro para Contadores',
    descricao: 'Divulgue seu trabalho como contador na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/XmlNrGx.jpeg'
  },
  'Designer Gráfico': {
    titulo: 'Acheei - Cadastro para Designers Gráficos',
    descricao: 'Divulgue seu trabalho como designer gráfico na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/v8q575t.jpeg'
  },
  'Professor Particular': {
    titulo: 'Acheei - Cadastro para Professores Particulares',
    descricao: 'Divulgue seu trabalho como professor particular na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/qsTwR0F.jpeg'
  },
  'Cabeleireiro': {
    titulo: 'Acheei - Cadastro para Cabeleireiros',
    descricao: 'Divulgue seu trabalho como cabeleireiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/G6PbDPQ.jpeg'
  },
  'Manicure': {
    titulo: 'Acheei - Cadastro para Manicures',
    descricao: 'Divulgue seu trabalho como manicure na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/16IgmbH.jpeg'
  },
  'Costureira': {
    titulo: 'Acheei - Cadastro para Costureiras',
    descricao: 'Divulgue seu trabalho como costureira na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/FsteXyX.jpeg'
  },
  'Confeiteiro': {
    titulo: 'Acheei - Cadastro para Confeiteiros',
    descricao: 'Divulgue seu trabalho como confeiteiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/Lv5Lmf9.jpeg'
  },
  'Vidraceiro': {
    titulo: 'Acheei - Cadastro para Vidraceiros',
    descricao: 'Divulgue seu trabalho como vidraceiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/HSx0MOz.jpeg'
  },
  'Serralheiro': {
    titulo: 'Acheei - Cadastro para Serralheiros',
    descricao: 'Divulgue seu trabalho como serralheiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/bxmECsB.jpeg'
  },
  'Tatuador': {
    titulo: 'Acheei - Cadastro para Tatuadores',
    descricao: 'Divulgue seu trabalho como tatuador na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/Qc7ktY7.jpeg'
  },
  'Montador de Móveis': {
    titulo: 'Acheei - Cadastro para Montadores de Móveis',
    descricao: 'Divulgue seu trabalho como montador de móveis na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/40QPRai.jpeg'
  },
  'Frete e Mudanças': {
    titulo: 'Acheei - Cadastro para Frete e Mudanças',
    descricao: 'Divulgue seu trabalho com frete e mudanças na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/PRhnHNu.jpeg'
  },
  'Gesseiro': {
    titulo: 'Acheei - Cadastro para Gesseiros',
    descricao: 'Divulgue seu trabalho como gesseiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/HTcxuk8.jpeg'
  },
  'Ajudante de Pedreiro': {
    titulo: 'Acheei - Cadastro para Ajudantes de Pedreiro',
    descricao: 'Divulgue seu trabalho como ajudante de pedreiro na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/2fcVJbW.jpeg'
  },
  'Metalúrgico': {
    titulo: 'Acheei - Cadastro para Metalúrgicos',
    descricao: 'Divulgue seu trabalho como metalúrgico na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/TklYE5A.jpeg'
  },
  'Adesivador': {
    titulo: 'Acheei - Cadastro para Adesivadores',
    descricao: 'Divulgue seu trabalho como adesivador na Acheei e seja encontrado por quem precisa dos seus serviços na sua região. Cadastro gratuito.',
    imagem: 'https://i.imgur.com/ye99pXJ.jpeg'
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
