import { useEffect, useCallback } from 'react';
import { formatFileSize } from '../services/uploadService';

const ImageLightbox = ({ url, fileName, fileSize, onClose }) => {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <>
      <style>{`
        @keyframes lbFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .lb-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: lbFadeIn 0.2s ease-out;
        }
        .lb-backdrop {
          position: absolute;
          inset: 0;
          cursor: zoom-out;
        }
        .lb-toolbar {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          gap: 8px;
          z-index: 10001;
        }
        .lb-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: opacity 0.15s;
        }
        .lb-btn:hover { opacity: 0.85; }
        .lb-btn-close  { background: #334155; color: #e2e8f0; }
        .lb-btn-dl     { background: #0d9488; color: #fff; }
        .lb-img-wrap {
          position: relative;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 90vw;
          max-height: 90vh;
        }
        .lb-img {
          max-width: 90vw;
          max-height: 82vh;
          object-fit: contain;
          border-radius: 10px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.6);
          display: block;
        }
        .lb-footer {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          text-align: center;
          z-index: 10001;
          pointer-events: none;
        }
        .lb-footer-name {
          font-size: 13px;
          color: #e2e8f0;
          font-weight: 600;
        }
        .lb-footer-size {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 2px;
        }
      `}</style>

      <div className="lb-overlay" role="dialog" aria-modal="true" aria-label="Image viewer">
        {/* Click-away backdrop */}
        <div className="lb-backdrop" onClick={onClose} />

        {/* Toolbar */}
        <div className="lb-toolbar">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={fileName}
            className="lb-btn lb-btn-dl"
          >
            {/* Download icon */}
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2"
              viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </a>

          <button className="lb-btn lb-btn-close" onClick={onClose}>
            {/* X icon */}
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2"
              viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Close
          </button>
        </div>

        {/* Image */}
        <div className="lb-img-wrap" onClick={(e) => e.stopPropagation()}>
          <img src={url} alt={fileName || 'Image'} className="lb-img" />
        </div>

        {/* Footer */}
        {(fileName || fileSize) && (
          <div className="lb-footer">
            {fileName && <div className="lb-footer-name">{fileName}</div>}
            {fileSize && <div className="lb-footer-size">{formatFileSize(fileSize)}</div>}
          </div>
        )}
      </div>
    </>
  );
};

export default ImageLightbox;
