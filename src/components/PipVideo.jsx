import React, { useRef, useEffect, useState } from 'react';
import { Maximize2 } from 'lucide-react';

const PipVideo = ({ stream, muted, onClick, isLocal }) => {
  const videoRef = useRef(null);
  const pipRef = useRef(null);
  
  // Default position bottom right
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 140, 
    y: window.innerHeight - 200 
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Adjust default position on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!hasDragged.current && pipRef.current) {
        setPosition({
          x: window.innerWidth - pipRef.current.offsetWidth - 20,
          y: window.innerHeight - pipRef.current.offsetHeight - 120
        });
      }
    };
    handleResize(); // Initial positioning
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e) => {
    hasDragged.current = false;
    setIsDragging(true);
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    dragStartPos.current = {
      x: clientX - position.x,
      y: clientY - position.y
    };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    let newX = clientX - dragStartPos.current.x;
    let newY = clientY - dragStartPos.current.y;

    const deltaX = Math.abs(clientX - (position.x + dragStartPos.current.x));
    const deltaY = Math.abs(clientY - (position.y + dragStartPos.current.y));
    
    // Only mark as dragged if moved more than 5 pixels
    if (deltaX > 5 || deltaY > 5) {
      hasDragged.current = true;
    }

    const maxX = window.innerWidth - pipRef.current.offsetWidth;
    const maxY = window.innerHeight - pipRef.current.offsetHeight;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', handlePointerUp);
    } else {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    }

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, position]);

  return (
    <div 
      ref={pipRef}
      className={`pip-container ${isDragging ? 'dragging' : ''}`}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      onClick={(e) => {
        if (!hasDragged.current) onClick(e);
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="pip-video"
        style={{ transform: isLocal ? 'scaleX(-1)' : 'none' }}
      />
      <div className="pip-overlay-icon">
        <Maximize2 size={20} color="white" />
      </div>
    </div>
  );
};

export default PipVideo;
