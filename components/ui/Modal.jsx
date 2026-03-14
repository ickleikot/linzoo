'use client';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, width }) {
  useEffect(function() {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onKey);
    return function() { document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={function(e) { e.stopPropagation(); }}
        style={{
          background: 'var(--bg)', borderRadius: 20, padding: 24,
          width: '100%', maxWidth: width || 480, maxHeight: '80vh',
          overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>{title}</span>
          <button className="btn-icon" onClick={onClose} style={{ padding: 4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
