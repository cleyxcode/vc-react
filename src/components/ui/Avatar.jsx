import React from 'react';
import './ui.css';

export const Avatar = ({ name = '?', color = '#3498db', size = 40, className = '' }) => {
  return (
    <div 
      className={`ui-avatar ${className}`}
      style={{ 
        backgroundColor: color, 
        width: size, 
        height: size, 
        fontSize: Math.max(12, size * 0.4) 
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};
