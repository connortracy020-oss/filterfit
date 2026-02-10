'use client';

import React from 'react';
import { useFormState } from 'react-dom';
import { importCsv, type ImportState } from '@/app/admin/actions';

const initialState: ImportState = {
  status: 'idle',
  inserted: 0,
  failed: 0,
  errors: []
};

export default function ImportForm() {
  const [state, formAction] = useFormState(importCsv, initialState);

  return (
    <div className="grid" style={{ gap: '16px' }}>
      <form action={formAction} className="grid" style={{ gap: '12px' }}>
        <div>
          <label htmlFor="file">CSV file</label>
          <input id="file" name="file" type="file" accept=".csv" required />
        </div>
        <button type="submit">Import CSV</button>
      </form>

      {state.status !== 'idle' ? (
        <div className={`notice ${state.status === 'error' ? 'error' : 'success'}`}>
          Imported {state.inserted} row{state.inserted === 1 ? '' : 's'}. {state.failed} row{state.failed === 1 ? '' : 's'} failed.
        </div>
      ) : null}

      {state.errors.length ? (
        <div className="card">
          <h3>Row errors</h3>
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            {state.errors.map((error, index) => (
              <li key={`${error.row}-${index}`} style={{ marginBottom: '6px', color: 'var(--muted)' }}>
                Row {error.row || '?'}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
