# TODO - Correções Área do Profissional e Painel Admin

## Objetivo
1. Implementar o modal de Configurações do profissional (abrir, editar dados, editar foto de perfil e 3 fotos de serviços).
2. Restaurar a edição de fotos e informações no painel do admin.

## Passos
- [x] Analisar profissional.html, profissional.js, painel.html, painel.js, admin.js, upload.js, cadastro.js
- [x] Criar plano e aprovar com o usuário

## Implementação
### Área do Profissional
- [x] profissional.js: adicionar funções de Configurações (abrirConfiguracoes, fecharConfiguracoes, salvarConfiguracoes)
- [x] profissional.js: adicionar resizeImage, uploadImageToCloudinary, uploadMultipleToCloudinary (reaproveitando padrão cadastro.js)
- [x] Modal de configurações: CPF e profissão somente leitura; demais campos editáveis; foto de perfil e 3 fotos de serviço editáveis
- [x] Salvar via PUT /api/profissionais/me e atualizar header (nome/foto)

### Painel Admin
- [x] admin.js: adicionar rota PUT /api/admin/profissional/:id (autenticada) para atualizar dados e fotos
- [x] painel.js: restaurar edição no modal de detalhes (campos com botão de editar, editáveis exceto CPF e profissão)
- [x] painel.js: adicionar edição de foto de perfil e fotos de serviço via upload Cloudinary
- [x] painel.js: adicionar funções salvarDetalhes, cancelarEdicao, editarCampo
- [x] painel.html: garantir modal tem elementos de edição (já preparados)

## Validação
- [ ] Testar botão Configurações no dropdown do profissional (abre modal, edita e salva)
- [ ] Testar edição de foto de perfil e fotos de serviço no profissional
- [ ] Testar edição de informações e fotos no painel admin
- [ ] node --check nos arquivos JS alterados
