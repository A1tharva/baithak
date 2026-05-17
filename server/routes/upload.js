const express = require('express');
const router = express.Router();
const { upload, cloudinary } = require('../config/cloudinary');
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');

// POST /api/upload — Upload a file to Cloudinary
router.post(
  '/upload',
  protect,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.message === 'File size too large' || err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File size exceeds 50MB' });
        }
        if (err.message === 'File type not allowed') {
          return res.status(400).json({ message: 'File type not allowed' });
        }
        return res.status(400).json({ message: err.message || 'Upload failed' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const isImage = req.file.mimetype.startsWith('image/');
      const isVideo = req.file.mimetype.startsWith('video/');
      const publicId = req.file.filename;

      // For images: generate thumbnail via Cloudinary URL transform
      let thumbnailUrl = null;
      if (isImage) {
        thumbnailUrl = cloudinary.url(publicId, {
          width: 400,
          height: 400,
          crop: 'limit',
          quality: 'auto',
          fetch_format: 'auto',
          secure: true,
        });
      }

      // For videos: generate from first frame
      if (isVideo) {
        thumbnailUrl = cloudinary.url(publicId, {
          resource_type: 'video',
          format: 'jpg',        // Extract frame as jpg
          start_offset: '0',   // First frame
          width: 400,
          height: 300,
          crop: 'fill',
          quality: 'auto',
          secure: true,
        });
      }

      return res.status(200).json({
        url: req.file.path,
        thumbnailUrl,
        publicId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        isVideo,
        isImage,
        width: req.file.width || null,
        height: req.file.height || null,
      });

    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ message: error.message || 'Upload failed' });
    }
  }
);

// DELETE /api/upload/:publicId — Delete a file from Cloudinary
router.delete('/upload/:publicId', protect, async (req, res) => {
  try {
    // publicId may contain slashes (e.g. baithak/abc123), decode it
    const publicId = decodeURIComponent(req.params.publicId);

    // Verify the caller owns at least one message with this file
    const message = await Message.findOne({
      'attachment.publicId': publicId,
      sender: req.user._id,
    });

    if (!message) {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }

    await cloudinary.uploader.destroy(publicId);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete upload error:', err);
    res.status(500).json({ message: 'Server error during deletion' });
  }
});

module.exports = router;
