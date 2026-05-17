// Cloudinary + Multer Storage Configuration
// ============================================================
// SETUP STEPS:
// 1. Go to cloudinary.com → sign up free
// 2. Dashboard → copy Cloud Name, API Key, API Secret
// 3. Paste into server/.env as CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// 4. Free tier gives 25 GB storage + 25 GB bandwidth/month
// ============================================================

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    const isAudio = file.mimetype.startsWith('audio/');

    let resource_type = 'raw';
    if (isImage) resource_type = 'image';
    if (isVideo) resource_type = 'video';
    if (isAudio) resource_type = 'video'; // Cloudinary handles audio under video

    const params = {
      folder: 'baithak',
      resource_type,
      allowed_formats: [
        // Images
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
        // Video
        'mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v',
        // Audio
        'mp3', 'wav', 'ogg', 'm4a', 'aac',
        // Documents
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        // Other
        'zip', 'rar', 'txt', 'csv',
      ],
      // Only transform images, not videos (video transformation costs Cloudinary credits)
      transformation: isImage 
        ? [{ quality: 'auto', fetch_format: 'auto' }] 
        : [],
      // For videos: generate a thumbnail automatically
      eager: isVideo 
        ? [{ 
            width: 400, height: 300, 
            crop: 'fill', format: 'jpg',
            quality: 'auto'
          }] 
        : [],
      eager_async: true, // Don't wait for thumbnail — generate in background
    };

    return params;
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const blocked = ['exe', 'bat', 'sh', 'cmd', 'msi', 'dll', 'dmg'];
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (blocked.includes(ext)) {
      return cb(new Error('File type not allowed'), false);
    }
    // Explicitly allow video mimetypes
    const allowedMimetypes = [
      'image/', 'video/', 'audio/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
      'text/csv',
    ];
    const isAllowed = allowedMimetypes.some(type => 
      file.mimetype.startsWith(type)
    );
    if (!isAllowed) {
      return cb(new Error('File type not allowed'), false);
    }
    cb(null, true);
  },
});

module.exports = { upload, cloudinary };
