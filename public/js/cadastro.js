// ============================================
// Acheei - Cadastro Profissional (3 Etapas)
// ============================================

const API_BASE = '/api';
let currentStep = 1;
const totalSteps = 3;

// Dados acumulados do formulário
let formData = {
  foto_perfil: null,
  fotos_servicos: [null, null, null]
};

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

function formatCPF(value) {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{3})(\d)/g, '$1.$2')
    .replace(/^(\d{3}\.\d{3})(\d)/g, '$1.$2')
    .replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/g, '$1-$2')
    .substring(0, 14);
}

function formatCEP(value) {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{5})(\d)/g, '$1-$2')
    .substring(0, 9);
}

function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;

  return true;
}

function resizeImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

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
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
}

// ============================================
// Step Navigation
// ============================================
function showStep(step) {
  // Hide all steps
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  
  // Show current step
  document.getElementById(`step${step}`).classList.add('active');
  
  // Update progress bar
  document.querySelectorAll('.progress-step').forEach((el, i) => {
    const stepNum = i + 1;
    el.classList.remove('active', 'completed');
    if (stepNum === step) el.classList.add('active');
    else if (stepNum < step) el.classList.add('completed');
  });

  document.querySelectorAll('.progress-line').forEach((el, i) => {
    const lineNum = i + 1;
    el.classList.toggle('completed', lineNum < step);
  });

  // Update buttons
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');

  prevBtn.style.visibility = step === 1 ? 'hidden' : 'visible';
  nextBtn.style.display = step === totalSteps ? 'none' : 'inline-flex';
  submitBtn.style.display = step === totalSteps ? 'inline-flex' : 'none';

  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
  if (validateStep(currentStep)) {
    showStep(currentStep + 1);
  }
}

function prevStep() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

// ============================================
// Validation
// ============================================
function validateStep(step) {
  let valid = true;

  if (step === 1) {
    const cpf = document.getElementById('cpf');
    const data = document.getElementById('data_nascimento');

    // Clear errors
    cpf.classList.remove('error');
    document.getElementById('cpfError').classList.remove('show');

    if (!validarCPF(cpf.value)) {
      cpf.classList.add('error');
      document.getElementById('cpfError').classList.add('show');
      valid = false;
    }

    if (!data.value) {
      data.classList.add('error');
      document.getElementById('dataError').classList.add('show');
      valid = false;
    } else {
      const birthDate = new Date(data.value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      
      if (age < 18) {
        data.classList.add('error');
        document.getElementById('dataError').textContent = 'Você deve ter pelo menos 18 anos';
        document.getElementById('dataError').classList.add('show');
        valid = false;
      }
    }
  }

  if (step === 2) {
    const campos = ['endereco', 'bairro', 'cidade', 'estado', 'cep'];
    campos.forEach(campo => {
      const el = document.getElementById(campo);
      if (!el.value.trim()) {
        el.classList.add('error');
        valid = false;
      } else {
        el.classList.remove('error');
      }
    });
  }

  if (step === 3) {
    const nomePerfil = document.getElementById('nome_perfil');
    const profissao = document.getElementById('profissao');

    if (!nomePerfil.value.trim()) {
      nomePerfil.classList.add('error');
      valid = false;
    } else {
      nomePerfil.classList.remove('error');
    }

    if (!profissao.value.trim()) {
      profissao.classList.add('error');
      valid = false;
    } else {
      profissao.classList.remove('error');
    }
  }

  if (!valid) {
    showToast('Preencha todos os campos obrigatórios corretamente', 'error');
  }

  return valid;
}

// ============================================
// Image Handling
// ============================================
function setupPhotoUpload() {
  const uploadArea = document.getElementById('fotoPerfilUpload');
  const fileInput = document.getElementById('foto_perfil');
  const preview = document.getElementById('fotoPerfilPreview');

  uploadArea.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const resizedImage = await resizeImage(file);
        preview.src = resizedImage;
        preview.style.display = 'block';
        uploadArea.querySelector('.upload-icon').style.display = 'none';
        uploadArea.querySelector('p').textContent = 'Clique para alterar a foto';
        formData.foto_perfil = resizedImage;
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
        showToast('Erro ao processar imagem', 'error');
      }
    }
  });
}

function setupServicoPhotos() {
  document.querySelectorAll('.foto-upload-item').forEach(item => {
    const input = item.querySelector('.foto-servico-input');
    const index = parseInt(item.dataset.index);
    const removeBtn = item.querySelector('.remove-foto');

    item.addEventListener('click', (e) => {
      if (e.target !== removeBtn) {
        input.click();
      }
    });

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const resizedImage = await resizeImage(file);
          const img = document.createElement('img');
          img.src = resizedImage;
          
          // Remove existing image
          const existingImg = item.querySelector('img');
          if (existingImg) existingImg.remove();
          
          item.appendChild(img);
          item.classList.add('has-image');
          formData.fotos_servicos[index] = resizedImage;
        } catch (error) {
          console.error('Erro ao processar imagem:', error);
          showToast('Erro ao processar imagem', 'error');
        }
      }
    });

    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const img = item.querySelector('img');
      if (img) img.remove();
      item.classList.remove('has-image');
      input.value = '';
      formData.fotos_servicos[index] = null;
    });
  });
}

// ============================================
// Cloudinary Upload
// ============================================
async function uploadImageToCloudinary(base64Image, folder) {
  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, folder: folder })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Erro no upload');
  return result.data.url;
}

async function uploadMultipleToCloudinary(images, folder) {
  if (images.length === 0) return [];
  const response = await fetch(`${API_BASE}/upload/multiplas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: images, folder: folder })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'Erro no upload');
  return result.data.map(item => item.url);
}

// ============================================
// Submit Form (com Cloudinary)
// ============================================
async function submitForm(event) {
  event.preventDefault();

  if (!validateStep(3)) return;

  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Enviando imagens...';

  try {
    // Upload foto de perfil para Cloudinary
    let fotoPerfilUrl = '';
    if (formData.foto_perfil) {
      submitBtn.innerHTML = '<span class="spinner"></span> Enviando foto de perfil...';
      fotoPerfilUrl = await uploadImageToCloudinary(formData.foto_perfil, 'perfis');
    }

    // Upload fotos de serviço para Cloudinary
    const fotosServicos = formData.fotos_servicos.filter(f => f !== null);
    let fotosServicosUrls = [];
    if (fotosServicos.length > 0) {
      submitBtn.innerHTML = '<span class="spinner"></span> Enviando fotos dos servicos...';
      fotosServicosUrls = await uploadMultipleToCloudinary(fotosServicos, 'servicos');
    }

    submitBtn.innerHTML = '<span class="spinner"></span> Cadastrando...';

    const data = {
      cpf: document.getElementById('cpf').value,
      data_nascimento: document.getElementById('data_nascimento').value,
      endereco: document.getElementById('endereco').value.trim(),
      numero: document.getElementById('numero').value.trim(),
      bairro: document.getElementById('bairro').value.trim(),
      cidade: document.getElementById('cidade').value.trim(),
      estado: document.getElementById('estado').value,
      cep: document.getElementById('cep').value,
      nome_perfil: document.getElementById('nome_perfil').value.trim(),
      foto_perfil: fotoPerfilUrl,
      profissao: document.getElementById('profissao').value.trim(),
      fotos_servicos: fotosServicosUrls
    };

    const response = await fetch(`${API_BASE}/profissionais`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      document.getElementById('cadastroForm').style.display = 'none';
      document.getElementById('successScreen').classList.add('show');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showToast(result.message || 'Erro ao cadastrar', 'error');
    }
  } catch (error) {
    console.error('Erro ao cadastrar:', error);
    showToast(error.message || 'Erro ao conectar com o servidor', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '✅ Cadastrar';
  }
}

// ============================================
// Mask / Input Events
// ============================================
document.getElementById('cpf').addEventListener('input', function(e) {
  e.target.value = formatCPF(e.target.value);
  // Remove error on typing
  this.classList.remove('error');
  document.getElementById('cpfError').classList.remove('show');
});

document.getElementById('cep').addEventListener('input', function(e) {
  e.target.value = formatCEP(e.target.value);
});

document.getElementById('data_nascimento').addEventListener('change', function() {
  this.classList.remove('error');
  document.getElementById('dataError').classList.remove('show');
});

// Clear errors on focus
document.querySelectorAll('.form-step input, .form-step select').forEach(el => {
  el.addEventListener('focus', function() {
    this.classList.remove('error');
  });
});

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  showStep(1);
  setupPhotoUpload();
  setupServicoPhotos();

  document.getElementById('nextBtn').addEventListener('click', nextStep);
  document.getElementById('prevBtn').addEventListener('click', prevStep);
  document.getElementById('cadastroForm').addEventListener('submit', submitForm);

  // Auto-advance on Enter key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && currentStep < totalSteps) {
      e.preventDefault();
      nextStep();
    }
  });
});
