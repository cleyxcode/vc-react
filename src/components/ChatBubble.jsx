import React from 'react';
import { Avatar } from './ui/Avatar';
import { Check, CheckCheck } from 'lucide-react';

const ChatBubble = ({ message, isMine }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className={`chat-bubble-container ${isMine ? 'mine' : 'theirs'}`}>
      {!isMine && (
        <Avatar 
          name={message.senderName} 
          color={message.senderColor} 
          size={32} 
        />
      )}
      <div className={`chat-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
        {message.media && message.media.type === 'image' && (
          <div className="chat-media-container">
            <img src={message.media.data} alt="Sent file" className="chat-media-image" />
            <a href={message.media.data} download="image.png" className="chat-media-download">Unduh</a>
          </div>
        )}
        {message.media && message.media.type === 'video' && (
          <div className="chat-media-container">
            <video src={message.media.data} controls className="chat-media-video" />
            <a href={message.media.data} download="video.mp4" className="chat-media-download">Unduh</a>
          </div>
        )}
        {message.text && <p className="chat-text">{message.text}</p>}
        <span className="chat-time">
          {formatTime(message.timestamp)}
          {isMine && (
            <span className="chat-read-receipt" style={{ marginLeft: '4px', display: 'inline-flex', alignItems: 'center' }}>
              {message.read ? (
                <CheckCheck size={14} color="#34b7f1" /> // Blue double check (whatsapp style)
              ) : (
                <Check size={14} color="#8696a0" />
              )}
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export default ChatBubble;
