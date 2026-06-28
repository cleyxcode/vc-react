import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { db } from '../firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { UserContext } from './UserContext';

export const CallContext = createContext(null);

export const CallProvider = ({ children }) => {
  const { profile } = useContext(UserContext);
  const [callState, setCallState] = useState({
    status: 'idle', // 'idle' | 'calling' | 'ringing' | 'connected'
    type: null,     // 'video' | 'voice'
    caller: null,
    callerName: null,
    callerColor: null,
  });
  const [navigateTo, setNavigateTo] = useState(null);
  const prevStatusRef = useRef('idle');

  useEffect(() => {
    if (!profile) return;

    const callRef = ref(db, 'calls/main');
    const unsubscribe = onValue(callRef, (snapshot) => {
      const data = snapshot.val();
      const prevStatus = prevStatusRef.current;

      if (!data) {
        prevStatusRef.current = 'idle';
        setCallState({ status: 'idle', type: null, caller: null, callerName: null, callerColor: null });
        return;
      }

      if (data.status === 'ringing') {
        const newState = {
          status: data.caller === profile.id ? 'calling' : 'ringing',
          type: data.type,
          caller: data.caller,
          callerName: data.callerName,
          callerColor: data.callerColor,
        };
        prevStatusRef.current = newState.status;
        setCallState(newState);
      } else if (data.status === 'accepted') {
        prevStatusRef.current = 'connected';
        setCallState(prev => ({ ...prev, status: 'connected' }));
        setNavigateTo('/call');
      } else if (data.status === 'declined' || data.status === 'ended') {
        prevStatusRef.current = 'idle';
        setCallState({ status: 'idle', type: null, caller: null, callerName: null, callerColor: null });
        if (prevStatus === 'connected') {
          setNavigateTo('/chat');
        }
      }
    });

    return () => unsubscribe();
  }, [profile]);

  const initiateCall = async (type) => {
    if (!profile) return;
    await set(ref(db, 'calls/main'), {
      caller: profile.id,
      callerName: profile.name,
      callerColor: profile.color,
      type,
      status: 'ringing',
    });
  };

  const acceptCall = async () => {
    await set(ref(db, 'calls/main/status'), 'accepted');
  };

  const declineCall = async () => {
    await set(ref(db, 'calls/main/status'), 'declined');
    setTimeout(() => remove(ref(db, 'calls/main')), 800);
  };

  const endCall = async () => {
    await set(ref(db, 'calls/main/status'), 'ended');
    setTimeout(() => {
      remove(ref(db, 'calls/main'));
      remove(ref(db, 'rooms/room_main'));
    }, 800);
  };

  return (
    <CallContext.Provider value={{ callState, initiateCall, acceptCall, declineCall, endCall, navigateTo, setNavigateTo }}>
      {children}
    </CallContext.Provider>
  );
};
