import React, { useEffect } from 'react';

export function Modal({ as = 'div', className = '', labelledBy, onClose, elementProps = {}, children }) {
  const Element = as;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <Element
        {...elementProps}
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </Element>
    </div>
  );
}
