import React, { forwardRef } from 'react';
import './ui.css';

export const Input = forwardRef(({ className = '', icon: Icon, iconAction, ...props }, ref) => {
  return (
    <div className={`ui-input-wrapper ${className}`}>
      <input ref={ref} className="ui-input" {...props} />
      {Icon && (
        <button type="button" className="ui-input-icon-btn" onClick={iconAction}>
          <Icon size={18} />
        </button>
      )}
    </div>
  );
});
Input.displayName = 'Input';
