// ============================================
// Rota de Upload para Cloudinary
// ============================================
const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dzwkr47ib',
  api_key: '553561859359519',
  api_secret: 'IYJBytc-xlGnFW87Taguno77LDw',
  secure: true
});

module.exports = function() {

  // ============================================
  // POST /api/upload
  // Upload de imagem base64 para Cloudinary
  // body: { image: "data:image/...", folder: "perfis" }
  // ============================================
  router.post('/', async (req, res) => {
    try {
      const { image, folder } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma imagem fornecida'
        });
      }

      // Upload para Cloudinary
      const result = await cloudinary.uploader.upload(image, {
        folder: folder ? `acheei/${folder}` : 'acheei',
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto'
      });

      res.json({
        success: true,
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height
        }
      });
    } catch (error) {
      console.error('Erro no upload Cloudinary:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao fazer upload da imagem'
      });
    }
  });

  // ============================================
  // POST /api/upload/multiplas
  // Upload de múltiplas imagens base64
  // body: { images: ["data:image/...", ...], folder: "servicos" }
  // ============================================
  router.post('/multiplas', async (req, res) => {
    try {
      const { images, folder } = req.body;

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma imagem fornecida'
        });
      }

      const uploads = images.map(img => 
        cloudinary.uploader.upload(img, {
          folder: folder ? `acheei/${folder}` : 'acheei',
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto'
        })
      );

      const results = await Promise.all(uploads);

      res.json({
        success: true,
        data: results.map(r => ({
          url: r.secure_url,
          public_id: r.public_id
        }))
      });
    } catch (error) {
      console.error('Erro no upload múltiplo Cloudinary:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao fazer upload das imagens'
      });
    }
  });

  // ============================================
  // DELETE /api/upload/:publicId
  // Deletar imagem do Cloudinary
  // ============================================
  router.delete('/:publicId', async (req, res) => {
    try {
      const result = await cloudinary.uploader.destroy(req.params.publicId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar imagem'
      });
    }
  });

  return router;
};
