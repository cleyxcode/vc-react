import React from 'react';
import { Avatar } from './ui/Avatar';
import { Check, CheckCheck } from 'lucide-react';
import emojiRegex from 'emoji-regex';

const toUnified = (emoji) => {
  return [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(c => c !== 'fe0f')
    .join('-');
};

const renderTextWithEmojis = (text) => {
  if (!text) return null;
  const regex = emojiRegex();
  const parts = [];
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${i}`}>{text.substring(lastIndex, match.index)}</span>);
    }
    const emoji = match[0];
    const unified = toUnified(emoji);
    
    parts.push(
      <img
        key={`emoji-${i}`}
        src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${unified}.png`}
        alt={emoji}
        style={{ width: '22px', height: '22px', verticalAlign: 'middle', margin: '0 2px', display: 'inline-block' }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'inline';
        }}
      />
    );
    parts.push(<span key={`fb-${i}`} style={{ display: 'none' }}>{emoji}</span>);
    
    lastIndex = regex.lastIndex;
    i++;
  }
  
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${i}`}>{text.substring(lastIndex)}</span>);
  }
  
  return parts;
};

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
        {message.text && <p className="chat-text">{renderTextWithEmojis(message.text)}</p>}
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
