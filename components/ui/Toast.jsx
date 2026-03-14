'use client';
import { Toaster } from 'react-hot-toast';

export default function Toast() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: 'var(--bg)',
          color: 'var(--text-1)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          fontSize: '14px',
        },
      }}
    />
  );
}
