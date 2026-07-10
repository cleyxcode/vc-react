import React from 'react';
import { Avatar } from './ui/Avatar';
import { Check, CheckCheck, PhoneIncoming, PhoneMissed, PhoneCall, Video } from 'lucide-react';
import emojiRegex from 'emoji-regex';

/* ─── helpers ───────────────────────────────────────── */
const toUnified = (emoji) =>
  [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(c => c !== 'fe0f')
    .join('-');

const renderTextWithEmojis = (text) => {
  if (!text) return null;
  const regex = emojiRegex();
  const parts = [];
  let lastIndex = 0;
  let match;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex)
      parts.push(<span key={`text-${i}`}>{text.substring(lastIndex, match.index)}</span>);

    const emoji    = match[0];
    const unified  = toUnified(emoji);
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
      />,
    );
    parts.push(<span key={`fb-${i}`} style={{ display: 'none' }}>{emoji}</span>);
    lastIndex = regex.lastIndex;
    i++;
  }
  if (lastIndex < text.length)
    parts.push(<span key={`text-${i}`}>{text.substring(lastIndex)}</span>);

  return parts;
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const formatDuration = (secs) => {
  if (!secs || secs < 1) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m > 0) return `${m} mnt ${s > 0 ? s + ' dtk' : ''}`.trim();
  return `${s} dtk`;
};

/* ─── Call-log bubble ───────────────────────────────── */
const CallLogBubble = ({ message, isMine, isSelected, isSelectMode, onSelect }) => {
  const missed   = message.callResult === 'missed';
  const isVideo  = message.callType   === 'video';
  const color    = missed ? '#f44336' : '#00a884';
  const Icon     = missed
    ? PhoneMissed
    : (isMine ? PhoneCall : PhoneIncoming);
  const VideoIcon = Video;

  const label = missed
    ? (isMine ? 'Panggilan tidak terjawab' : 'Panggilan tidak terjawab')
    : (isVideo ? 'Video call' : 'Panggilan suara');

  const duration = !missed && message.duration > 0
    ? formatDuration(message.duration)
    : '';

  return (
    <div
      className={`chat-bubble-container call-log-container ${isSelected ? 'bubble-selected' : ''}`}
      style={{ justifyContent: 'center', alignItems: 'center' }}
      onClick={isSelectMode ? () => onSelect(message.id) : undefined}
    >
      {isSelectMode && (
        <div className={`select-checkbox ${isSelected ? 'checked' : ''}`} />
      )}
      <div className="call-log-bubble">
        <span className="call-log-icon" style={{ color }}>
          {isVideo ? <VideoIcon size={15} /> : <Icon size={15} />}
        </span>
        <span className="call-log-label" style={{ color: missed ? '#f44336' : '#e9edef' }}>
          {label}
          {duration && <span className="call-log-duration"> · {duration}</span>}
        </span>
        <span className="call-log-time">{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
};

/* ─── Regular chat bubble ───────────────────────────── */
const ChatBubble = ({ message, isMine, isSelected, isSelectMode, onSelect }) => {
  // Call-log messages get their own special rendering
  if (message.type === 'call_log') {
    return (
      <CallLogBubble
        message={message}
        isMine={isMine}
        isSelected={isSelected}
        isSelectMode={isSelectMode}
        onSelect={onSelect}
      />
    );
  }

  return (
    <div
      className={`chat-bubble-container ${isMine ? 'mine' : 'theirs'} ${isSelected ? 'bubble-selected' : ''}`}
      onClick={isSelectMode ? () => onSelect(message.id) : undefined}
      style={isSelectMode ? { cursor: 'pointer' } : {}}
    >
      {isSelectMode && (
        <div className={`select-checkbox ${isSelected ? 'checked' : ''}`} />
      )}
      {!isMine && (
        <Avatar name={message.senderName} color={message.senderColor} size={32} />
      )}
      <div className={`chat-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'} ${isSelected ? 'bubble-highlight' : ''}`}>
        {message.media?.type === 'image' && (
          <div className="chat-media-container">
            <img src={message.media.data} alt="Sent file" className="chat-media-image" />
            <a href={message.media.data} download="image.png" className="chat-media-download">Unduh</a>
          </div>
        )}
        {message.media?.type === 'video' && (
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
              {message.read
                ? <CheckCheck size={14} color="#34b7f1" />
                : <Check      size={14} color="#8696a0" />}
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export default ChatBubble;
