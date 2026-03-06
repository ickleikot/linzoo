'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../lib/store';

export default function ImageViewer() {
  const { imageViewer, closeImage } = useStore();
  const [zoom, setZoom]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const dragStart = useRef(null);
  const imgRef    = useRef(null);

  useEffect(() => {
    if (!imageViewer) return;
    setZoom(1); setOffset({ x: 0, y: 0 }); setLoaded(false);
  }, [imageViewer]);

  useEffect(() => {
    if (!imageViewer) return;
    function onKey(e) {
      if (e.key === 'Escape') closeImage();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.25, 4));
      if (e.key === '-')                  setZoom(z => Math.max(z - 0.25, 0.25));
      if (e.key === '0')                  { setZoom(1); setOffset({ x: 0, y: 0 }); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imageViewer]);

  function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(z => Math.min(Math.max(z + delta, 0.2), 5));
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }
  function onMouseMove(e) {
    if (!dragging || !dragStart.current) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }
  function onMouseUp() { setDragging(false); dragStart.current = null; }

  function download() {
    const a = document.createElement('a');
    a.href = imageViewer.src;
    a.download = 'linzoo-image.jpg';
    a.click();
  }

  if (!imageViewer) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeIn 150ms ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) closeImage(); }}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(0,0,0,0.5)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          {imageViewer.alt || 'Image'}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M8 11h6M11 8v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>, label: 'Zoom In',  action: () => setZoom(z => Math.min(z + 0.25, 5)) },
            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M8 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>, label: 'Zoom Out', action: () => setZoom(z => Math.max(z - 0.25, 0.2)) },
            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'Reset', action: () => { setZoom(1); setOffset({ x: 0, y: 0 }); } },
            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'Download', action: download },
            { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>, label: 'Close', action: closeImage },
          ].map(b => (
            <button key={b.label} onClick={b.action} title={b.label}
              style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.8)', transition: 'background var(--ease-fast)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              {b.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Image area */}
      <div
        style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {!loaded && (
          <div className="a-spin" style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
        )}
        <img
          ref={imgRef}
          src={imageViewer.src}
          alt={imageViewer.alt || ''}
          onLoad={() => setLoaded(true)}
          style={{
            maxWidth: '90vw', maxHeight: '80vh',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transition: dragging ? 'none' : 'transform 200ms ease',
            display: loaded ? 'block' : 'none',
            borderRadius: 'var(--r-md)',
            boxShadow: '0 0 60px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Zoom indicator */}
      <div style={{ textAlign: 'center', padding: '8px', color: 'rgba(255,255,255,0.4)', fontSize: 12, flexShrink: 0 }}>
        {Math.round(zoom * 100)}% · Scroll to zoom · Drag to pan · ESC to close
      </div>
    </div>
  );
}
