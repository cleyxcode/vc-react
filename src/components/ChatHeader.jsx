import React, { useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { CallContext } from '../context/CallContext';
import { Video, Phone } from 'lucide-react';
import { Avatar } from './ui/Avatar';

const ChatHeader = ({ typing, presence }) => {
  const { profile } = useContext(UserContext);
  const { initiateCall } = useContext(CallContext);

  const otherName  = profile?.id === 'saya' ? 'ulii' : 'eyy';
  const otherColor = profile?.id === 'saya' ? '#e74c3c' : '#3498db';

  return (
    <div className="chat-header">
      <div className="chat-header-info">
        <Avatar name={otherName} color={otherColor} size={40} />
        <div className="chat-contact-info">
          <div className="chat-contact-name">{otherName}</div>
          <div className="chat-contact-status" style={{ color: typing || presence?.online ? '#00a884' : '#8696a0' }}>
            {typing ? 'sedang mengetik...' : presence?.online ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="chat-header-actions">
        <button
          onClick={() => initiateCall('video')}
          className="header-icon-btn"
          title="Video Call"
          aria-label="Mulai video call"
        >
          <Video size={20} />
        </button>
        <button
          onClick={() => initiateCall('voice')}
          className="header-icon-btn"
          title="Voice Call"
          aria-label="Mulai voice call"
        >
          <Phone size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
