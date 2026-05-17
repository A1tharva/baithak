import { useState, useEffect, useRef, useCallback } from 'react';

const MIN_WIDTH = 280;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 280;
const STORAGE_KEY = 'baithak_sidebar_width';

export const useSidebarResize = () => {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = parseInt(saved, 10);
    if (parsed && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
      return parsed;
    }
    return DEFAULT_WIDTH;
  });

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const startResize = useCallback((e) => {
    // Only on desktop
    if (window.innerWidth < 768) return;

    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;

    // Change cursor for entire page during drag
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';

    // Allow the handle itself to still receive events
    e.currentTarget.style.pointerEvents = 'auto';

    e.preventDefault();
  }, [sidebarWidth]);

  const stopResize = useCallback(() => {
    if (!isResizing.current) return;
    isResizing.current = false;

    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  const onMouseMove = useCallback((e) => {
    if (!isResizing.current) return;

    const delta = e.clientX - startX.current;
    const newWidth = startWidth.current + delta;

    // Clamp between min and max
    const clamped = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
    setSidebarWidth(clamped);
  }, []);

  const resetWidth = useCallback(() => {
    setSidebarWidth(DEFAULT_WIDTH);
    localStorage.setItem(STORAGE_KEY, DEFAULT_WIDTH.toString());
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopResize);
    };
  }, [onMouseMove, stopResize]);

  // Save width whenever it changes and user stops dragging
  useEffect(() => {
    if (!isResizing.current) {
      localStorage.setItem(STORAGE_KEY, sidebarWidth.toString());
    }
  }, [sidebarWidth]);

  return { 
    sidebarWidth, 
    startResize, 
    resetWidth,
    isResizing: isResizing.current,
  };
};
