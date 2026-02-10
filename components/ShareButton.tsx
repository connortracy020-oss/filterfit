'use client';

import React, { useState } from 'react';

type ShareButtonProps = {
  label?: string;
};

export default function ShareButton({ label = 'Copy share link' }: ShareButtonProps) {
  const [status, setStatus] = useState<string>('');

  const handleCopy = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setStatus('Copied.');
    } catch (error) {
      setStatus('Unable to copy.');
    }
    setTimeout(() => setStatus(''), 2200);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <button type="button" className="secondary" onClick={handleCopy}>
        {label}
      </button>
      {status ? <span className="tag">{status}</span> : null}
    </div>
  );
}
