// ============================================
// Cloudinary Configuration
// ============================================
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: 'dzwkr47ib',
  api_key: '553561859359519',
  api_secret: 'IYJBytc-xlGnFW87Taguno77LDw',
  secure: true
});

// Storage para fotos de perfil
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'acheei/perfis',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }]
  }
});

// Storage para fotos de serviços
const servicoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'acheei/servicos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'fill', quality: 'auto' }]
  }
});

const uploadProfile = multer({ storage: profileStorage });
const uploadServico = multer({ storage: servicoStorage });

module.exports = {
  cloudinary,
  uploadProfile,
  uploadServico,
  uploadProfileMiddleware: uploadProfile.single('foto_perfil'),
  uploadServicoMiddleware: uploadServico.array('fotos_servicos', 3)
};
