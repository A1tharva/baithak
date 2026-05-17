// Upload service for Baithak file/image sharing
// Uses the same token key as the rest of the app: 'baithak_token'

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Upload a file to Cloudinary via the server.
 * @param {File} file
 * @returns {Promise<{url, publicId, fileName, fileSize, mimeType, width, height, thumbnailUrl}>}
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('baithak_token')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Upload failed');
  }
  return response.json();
};

/**
 * Format raw byte count into a human-readable string.
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

/**
 * Returns true if the mimeType is an image.
 */
export const isImageFile = (mimeType) => mimeType?.startsWith('image/');

/**
 * Derive a messageType from a file's mimeType.
 */
export const getMessageType = (mimeType) => {
  if (!mimeType) return 'file';
  if (mimeType.startsWith('image/gif')) return 'gif';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
};
