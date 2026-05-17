import { useCallback } from 'react';

const SidebarResizer = ({ onMouseDown, onDoubleClick }) => {
  return (
    <>
      <style>{`
        .sidebar-resizer {
          width: 4px;
          min-width: 4px;
          height: 100%;
          cursor: col-resize;
          background: transparent;
          position: relative;
          flex-shrink: 0;
          transition: background 0.15s;
          z-index: 20;
        }

        .sidebar-resizer:hover,
        .sidebar-resizer:active {
          background: #22d3ee;
        }

        .sidebar-resizer::before {
          content: '';
          position: absolute;
          top: 0;
          left: -6px;
          right: -6px;
          bottom: 0;
          cursor: col-resize;
        }

        .sidebar-resizer .drag-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 4px;
          height: 40px;
          border-radius: 2px;
          background: #0e2a3d;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          transition: background 0.15s, opacity 0.15s;
          opacity: 0;
        }

        .sidebar-resizer:hover .drag-indicator {
          opacity: 1;
          background: #155e7a;
        }

        .drag-indicator-dot {
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: #22d3ee;
        }

        @media (max-width: 768px) {
          .sidebar-resizer {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="sidebar-resizer"
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        title="Drag to resize · Double-click to reset"
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
      >
        <div className="drag-indicator">
          <div className="drag-indicator-dot" />
          <div className="drag-indicator-dot" />
          <div className="drag-indicator-dot" />
        </div>
      </div>
    </>
  );
};

export default SidebarResizer;
