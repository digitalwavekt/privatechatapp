const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'audio/mpeg', 'audio/wav', 'application/pdf'];

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  },
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024) }
});

exports.uploadMiddleware = upload.single('file');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const ext = path.extname(req.file.originalname) || '';
    const type = req.file.mimetype.split('/')[0];
    const fileName = `${uuidv4()}${ext}`;
    const filePath = `${req.user.userId}/${type}s/${fileName}`;

    const { error } = await supabase.storage
      .from('chat-media')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw error;

    const { data } = supabase.storage.from('chat-media').getPublicUrl(filePath);

    res.json({
      url: data.publicUrl,
      thumbnailUrl: '',
      filename: fileName,
      path: filePath,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.uploadMultiple = async (req, res) => {
  res.status(501).json({ message: 'Multiple upload will be added in next phase' });
};
