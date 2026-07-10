import React, { useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { CallContext } from '../context/CallContext';
import { Video, Phone, LogOut } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { useNavigate } from 'react-router-dom';

// Map of all user display info (mirror of LoginPage ACCOUNTS)
const USER_INFO = {
  clay: { name: 'clay',  color: '#3498db' },
  uli:  { name: 'ulii',  color: '#e74c3c' },
  code: { name: 'code',  color: '#2ecc71' },
};

const ChatHeader = ({ typing, presence }) => {
  const { profile, activeChat, switchActiveChat, logout } = useContext(UserContext);
  const { initiateCall, otherId } = useContext(CallContext);
  const navigate = useNavigate();

  const other     = USER_INFO[otherId] ?? { name: otherId, color: '#888' };
  const isAdmin   = profile?.isAdmin;

  const showOnlineStatus = !isAdmin && otherId !== 'clay';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

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

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="header-icon-btn"
          title="Keluar"
          aria-label="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
