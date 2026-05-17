import { formatFileSize } from '../services/uploadService';

// ── Inline SVG icons (no lucide-react dependency) ────────────────────────────
const XIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
    viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const FileTextIcon = ({ color = '#60a5fa' }) => (
  <svg width="28" height="28" fill="none" stroke={color} strokeWidth="1.8"
    viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const ArchiveIcon = () => (
  <svg width="28" height="28" fill="none" stroke="#f59e0b" strokeWidth="1.8"
    viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const MusicIcon = () => (
  <svg width="28" height="28" fill="none" stroke="#a78bfa" strokeWidth="1.8"
    viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const VideoIcon = () => (
  <svg width="28" height="28" fill="none" stroke="#34d399" strokeWidth="1.8"
    viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const FileIcon = () => (
  <svg width="28" height="28" fill="none" stroke="#94a3b8" strokeWidth="1.8"
    viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </svg>
);

// Pick an icon based on mimeType / extension
const FileTypeIcon = ({ mimeType, fileName }) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  if (mimeType?.includes('pdf') || ext === 'pdf') return <FileTextIcon color="#f87171" />;
  if (mimeType?.includes('word') || ext === 'doc' || ext === 'docx') return <FileTextIcon color="#60a5fa" />;
  if (mimeType?.includes('zip') || ext === 'zip') return <ArchiveIcon />;
  if (mimeType?.startsWith('audio/') || ext === 'mp3') return <MusicIcon />;
  if (mimeType?.startsWith('video/') || ext === 'mp4') return <VideoIcon />;
  return <FileIcon />;
};

// ─────────────────────────────────────────────────────────────────────────────

const FilePreview = ({ file, onCancel }) => {
  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const previewUrl = (isImage || isVideo) ? URL.createObjectURL(file) : null;

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .fp-card {
          animation: slideUp 0.2s ease-out;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          margin-bottom: 8px;
          position: relative;
        }
        .fp-cancel {
          position: absolute;
          top: 6px;
          right: 8px;
          background: #334155;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }
        .fp-cancel:hover { background: #475569; color: #f1f5f9; }
        .fp-thumb {
          width: 56px;
          height: 56px;
          object-fit: cover;
          border-radius: 8px;
          flex-shrink: 0;
          border: 1px solid #334155;
        }
        .fp-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid #1e293b;
        }
        .fp-info { flex: 1; min-width: 0; padding-right: 20px; }
        .fp-name {
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fp-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
        .fp-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #14b8a6;
          font-weight: 700;
          margin-bottom: 4px;
        }
      `}</style>

      <div className="fp-card">
        <button className="fp-cancel" onClick={onCancel} title="Remove file">
          <XIcon />
        </button>

        {isImage && (
          <img src={previewUrl} alt={file.name} className="fp-thumb" />
        )}
        
        {isVideo && (
          <video
            src={previewUrl}
            className="fp-thumb"
            muted
            preload="metadata"
          />
        )}

        {!isImage && !isVideo && (
          <div className="fp-icon-box">
            <FileTypeIcon mimeType={file.type} fileName={file.name} />
          </div>
        )}

        <div className="fp-info">
          <div className="fp-label">{isImage ? 'Image' : isVideo ? 'Video' : 'File'} selected</div>
          <div className="fp-name">{file.name}</div>
          <div className="fp-meta">{formatFileSize(file.size)}</div>
        </div>
      </div>
    </>
  );
};

export default FilePreview;
