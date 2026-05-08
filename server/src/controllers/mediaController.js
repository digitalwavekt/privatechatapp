const multer = require('multer');
const supabase = require('../config/supabase');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'media', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]);

exports.uploadMedia = (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      const uploadedFile =
        req.files?.file?.[0] ||
        req.files?.media?.[0] ||
        req.files?.image?.[0] ||
        req.files?.photo?.[0];

      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          message: 'File is required'
        });
      }

      const userId = req.user?.id || req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      const fileExt = uploadedFile.originalname.split('.').pop();
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('chat-media')
        .upload(filePath, uploadedFile.buffer, {
          contentType: uploadedFile.mimetype,
          upsert: false
        });

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      const { data } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      return res.json({
        success: true,
        message: 'File uploaded successfully',
        url: data.publicUrl,
        fileUrl: data.publicUrl,
        path: filePath,
        type: uploadedFile.mimetype,
        size: uploadedFile.size
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });
};