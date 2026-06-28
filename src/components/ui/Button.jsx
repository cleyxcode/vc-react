import React from 'react';
import './ui.css';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  return (
    <button 
      className={`ui-button ui-button-${variant} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};
