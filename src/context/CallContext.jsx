import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { UserContext } from './UserContext';
import { getRoomKey } from '../hooks/useChat';

export const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
  const { profile, activeChat } = useContext(UserContext);

  const [callState, setCallState] = useState({
    status:      'idle', // 'idle' | 'calling' | 'ringing' | 'connected'
    type:        null,   // 'video' | 'voice'
    caller:      null,
    callerName:  null,
    callerColor: null,
    roomKey:     null,   // which message room this call belongs to
  });
  const [navigateTo, setNavigateTo] = useState(null);
  const prevStatusRef = useRef('idle');

  // The person clay is talking to; for non-admin it's always clay
  const otherId = profile?.isAdmin
    ? (activeChat || 'uli')
    : 'clay';

  // Firebase call signal node — scoped per pair
  const pairKey = profile ? getRoomKey(profile.id, otherId) : null;
  const callDbKey = pairKey ? `calls/${pairKey}` : null;

  useEffect(() => {
    if (!profile || !callDbKey) return;

    const callRef = ref(db, callDbKey);
    const unsubscribe = onValue(callRef, (snapshot) => {
      const data = snapshot.val();
      const prevStatus = prevStatusRef.current;

      if (!data) {
        prevStatusRef.current = 'idle';
        setCallState({ status: 'idle', type: null, caller: null, callerName: null, callerColor: null, roomKey: null });
        return;
      }

      if (data.status === 'ringing') {
        const newState = {
          status:      data.caller === profile.id ? 'calling' : 'ringing',
          type:        data.type,
          caller:      data.caller,
          callerName:  data.callerName,
          callerColor: data.callerColor,
          roomKey:     data.roomKey,
        };
        prevStatusRef.current = newState.status;
        setCallState(newState);
      } else if (data.status === 'accepted') {
        prevStatusRef.current = 'connected';
        setCallState(prev => ({ ...prev, status: 'connected' }));
        setNavigateTo('/call');
      } else if (data.status === 'declined') {
        prevStatusRef.current = 'idle';
        setCallState({ status: 'idle', type: null, caller: null, callerName: null, callerColor: null, roomKey: null });
      } else if (data.status === 'ended') {
        prevStatusRef.current = 'idle';
        setCallState({ status: 'idle', type: null, caller: null, callerName: null, callerColor: null, roomKey: null });
        if (prevStatus === 'connected') setNavigateTo('/chat');
      }
    });

    return () => unsubscribe();
  }, [profile?.id, callDbKey]);

  const initiateCall = async (type) => {
    if (!profile || !pairKey || !callDbKey) return;
    const msgRoomKey = getRoomKey(profile.id, otherId);
    await set(ref(db, callDbKey), {
      caller:      profile.id,
      callerName:  profile.name,
      callerColor: profile.color,
      type,
      status:      'ringing',
      roomKey:     msgRoomKey,
    });
  };

  const acceptCall = async () => {
    if (!callDbKey) return;
    await set(ref(db, `${callDbKey}/status`), 'accepted');
  };

  const declineCall = async () => {
    if (!callDbKey) return;
    await set(ref(db, `${callDbKey}/status`), 'declined');
    setTimeout(() => remove(ref(db, callDbKey)), 800);
  };

  const endCall = async () => {
    if (!callDbKey) return;
    await set(ref(db, `${callDbKey}/status`), 'ended');
    setTimeout(() => {
      remove(ref(db, callDbKey));
      // WebRTC room cleaned up by CallScreen via useWebRTC
    }, 800);
  };

  return (
    <CallContext.Provider value={{
      callState, initiateCall, acceptCall, declineCall, endCall,
      navigateTo, setNavigateTo,
      otherId,
    }}>
      {children}
    </CallContext.Provider>
  );
};
