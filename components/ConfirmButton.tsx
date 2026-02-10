'use client';

import React from 'react';

type ConfirmButtonProps = {
  label: string;
  message: string;
  className?: string;
};

export default function ConfirmButton({ label, message, className }: ConfirmButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
