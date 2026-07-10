import React, { useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { CallContext } from '../context/CallContext';
import { Video, Phone } from 'lucide-react';
import { Avatar } from './ui/Avatar';

// Map of all user display info (mirror of LoginPage ACCOUNTS)
const USER_INFO = {
  clay: { name: 'clay',  color: '#3498db' },
  uli:  { name: 'ulii',  color: '#e74c3c' },
  code: { name: 'code',  color: '#2ecc71' },
};

const ChatHeader = ({ typing, presence }) => {
  const { profile, activeChat, switchActiveChat } = useContext(UserContext);
  const { initiateCall, otherId } = useContext(CallContext);

  const other     = USER_INFO[otherId] ?? { name: otherId, color: '#888' };
  const isAdmin   = profile?.isAdmin;

  // For non-admin users the other side is always clay, but clay is admin so
  // we never show clay's online status — just show the static contact name.
  const showOnlineStatus = !isAdmin && otherId !== 'clay';

  return (
    <div className="chat-header">
      <div className="chat-header-info">
        <Avatar name={other.name} color={other.color} size={40} />
        <div className="chat-contact-info">
          <div className="chat-contact-name">{other.name}</div>
          <div
            className="chat-contact-status"
            style={{ color: showOnlineStatus && (typing || presence?.online) ? '#00a884' : '#8696a0' }}
          >
            {showOnlineStatus
              ? (typing ? 'sedang mengetik...' : presence?.online ? 'Online' : 'Offline')
              : <span style={{ color: '#8696a0' }}>VC App</span>
            }
          </div>
        </div>
      </div>

      <div className="chat-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* ── Admin contact switcher ── */}
        {isAdmin && (
          <div className="contact-switcher">
            <button
              className={`switcher-btn ${activeChat === 'uli' ? 'switcher-active' : ''}`}
              onClick={() => switchActiveChat('uli')}
              title="Chat dengan ulii"
            >
              <Avatar name="ulii" color="#e74c3c" size={26} />
            </button>
            <button
              className={`switcher-btn ${activeChat === 'code' ? 'switcher-active' : ''}`}
              onClick={() => switchActiveChat('code')}
              title="Chat dengan code"
            >
              <Avatar name="code" color="#2ecc71" size={26} />
            </button>
          </div>
        )}

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
