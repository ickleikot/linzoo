'use client';
import { useState, useRef } from 'react';
import { useTelegram } from '../../lib/TelegramContext';
import { fmtFull, getName } from '../../lib/helpers';

export default function SearchModal({ dialog, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { searchMessages } = useTelegram();
  const inputRef = useRef(null);

  async function doSearch() {
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const entity = dialog?.entity || dialog?.inputEntity;
      const msgs = await searchMessages(entity, query.trim(), 40);
      setResults(msgs);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      borderBottom: '1px solid var(--border-100)',
      background: 'var(--bg-200)',
      flexShrink: 0,
      animation: 'slideDown 150ms ease',
    }}>
      {/* Search bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-400)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
          <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') doSearch(); if (e.key === 'Escape') onClose(); }}
          placeholder="Search messages in this chat…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-100)', fontSize: 14, fontFamily: 'var(--font-ui)' }}
        />
        {loading && <div className="a-spin" style={{ width: 16, height: 16, border: '2px solid var(--border-200)', borderTopColor: 'var(--brand)', borderRadius: '50%', flexShrink: 0 }}/>}
        <button onClick={doSearch} className="btn-primary" style={{ padding: '5px 14px', fontSize: 13 }}>Search</button>
        <button onClick={onClose} className="ibtn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Results */}
      {searched && (
        <div style={{ maxHeight: 280, overflowY: 'auto', borderTop: '1px solid var(--border-100)' }}>
          {results.length === 0 && !loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-400)', fontSize: 13 }}>
              No messages found for "{query}"
            </div>
          )}
          {results.map(msg => (
            <div key={msg.id} style={{
              padding: '10px 16px', borderBottom: '1px solid var(--border-100)',
              cursor: 'pointer', transition: 'background var(--ease-fast)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-light)' }}>
                  {msg.sender ? getName(msg.sender) : 'Unknown'}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {fmtFull(msg.date)}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-300)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {msg.message || '(media)'}
              </p>
            </div>
          ))}
          {results.length > 0 && (
            <div style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
