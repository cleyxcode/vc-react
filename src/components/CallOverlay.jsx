import React, { useContext, useEffect } from 'react';
import { CallContext } from '../context/CallContext';
import { UserContext } from '../context/UserContext';
import { Phone, PhoneOff, Video, PhoneMissed } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import '../styles/call-overlay.css';

/* ===== Outgoing Call (Caller view) ===== */
const CallingOverlay = ({ callState, onCancel }) => {
  const otherName = callState.caller === 'saya' ? 'ulii' : 'eyy';
  const otherColor = callState.caller === 'saya' ? '#e74c3c' : '#3498db';

  return (
    <div className="calling-overlay">
      <div className="calling-info">
        <div className="call-avatar-wrapper">
          <div className="ring-1" />
          <div className="ring-2" />
          <div className="ring-3" />
          <Avatar name={otherName} color={otherColor} size={90} className="call-avatar-override" />
        </div>
        <div className="call-name">{otherName}</div>
        <div className="call-subtitle">
          {callState.type === 'video' ? <Video size={14} /> : <Phone size={14} />}
          {callState.type === 'video' ? 'Video call...' : 'Menghubungkan...'}
        </div>
        <div className="calling-dots">
          <span /><span /><span />
        </div>
      </div>

      <div className="call-actions">
        <button className="call-action-btn" onClick={onCancel}>
          <div className="call-action-icon red">
            <PhoneOff size={28} color="white" />
          </div>
          <span className="call-action-label">Batalkan</span>
        </button>
      </div>
    </div>
  );
};

/* ===== Incoming Call (Callee view) ===== */
const IncomingCallPopup = ({ callState, onAccept, onDecline }) => {
  return (
    <>
      <div className="call-backdrop" />
      <div className="incoming-call-popup">
        <div className="call-avatar-wrapper" style={{ marginBottom: 0 }}>
          <div className="ring-1" />
          <div className="ring-2" />
          <Avatar 
            name={callState.callerName || '?'} 
            color={callState.callerColor || '#3498db'} 
            size={90} 
            className="call-avatar-override"
          />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="call-name">{callState.callerName}</div>
          <div className="call-subtitle">
            {callState.type === 'video' ? <Video size={14} /> : <Phone size={14} />}
            {callState.type === 'video' ? 'Video Call masuk...' : 'Panggilan masuk...'}
          </div>
        </div>

        <div className="call-actions">
          <button className="call-action-btn" onClick={onDecline}>
            <div className="call-action-icon red">
              <PhoneMissed size={26} color="white" />
            </div>
            <span className="call-action-label">Tolak</span>
          </button>
          <button className="call-action-btn" onClick={onAccept}>
            <div className="call-action-icon green">
              {callState.type === 'video'
                ? <Video size={26} color="white" />
                : <Phone size={26} color="white" />}
            </div>
            <span className="call-action-label">Terima</span>
          </button>
        </div>
      </div>
    </>
  );
};

/* ===== Main CallOverlay dispatcher ===== */
const CallOverlay = () => {
  const { callState, acceptCall, declineCall, endCall } = useContext(CallContext);
  const { profile } = useContext(UserContext);

  if (!profile) return null;
  if (callState.status === 'idle' || callState.status === 'connected') return null;

  const isCaller = callState.caller === profile.id;

  if (isCaller && callState.status === 'calling') {
    return <CallingOverlay callState={callState} onCancel={endCall} />;
  }

  if (!isCaller && callState.status === 'ringing') {
    return (
      <IncomingCallPopup
        callState={callState}
        onAccept={acceptCall}
        onDecline={declineCall}
      />
    );
  }

  return null;
};

export default CallOverlay;
