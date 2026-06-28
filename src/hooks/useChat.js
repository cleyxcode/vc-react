import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, push, update, onValue, serverTimestamp, onDisconnect, set } from 'firebase/database';

export const useChat = (profile) => {
  const [messages, setMessages] = useState([]);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserPresence, setOtherUserPresence] = useState({ online: false, lastSeen: null });

  // Determine other user ID based on current
  const otherId = profile?.id === 'saya' ? 'pacar' : 'saya';

  useEffect(() => {
    if (!profile) return;

    // 1. Listen to messages
    const messagesRef = ref(db, 'messages');
    const unsubscribeMsgs = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        msgArray.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(msgArray);

        // Auto-mark as read for messages sent by the other user
        const updates = {};
        let hasUpdates = false;
        msgArray.forEach(msg => {
          if (msg.senderId !== profile.id && !msg.read) {
            updates[`messages/${msg.id}/read`] = true;
            hasUpdates = true;
          }
        });
        if (hasUpdates) {
          update(ref(db), updates);
        }

      } else {
        setMessages([]);
      }
    });

    // 2. Presence system (Online/Offline)
    const myPresenceRef = ref(db, `presence/${profile.id}`);
    const connectedRef = ref(db, '.info/connected');
    
    const unsubscribeConn = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // We're connected (or reconnected)
        onDisconnect(myPresenceRef).set({
          online: false,
          lastSeen: serverTimestamp()
        }).then(() => {
          set(myPresenceRef, {
            online: true,
            lastSeen: serverTimestamp()
          });
        });
      }
    });

    // 3. Listen to other user's presence
    const otherPresenceRef = ref(db, `presence/${otherId}`);
    const unsubscribeOtherPres = onValue(otherPresenceRef, (snap) => {
      const data = snap.val();
      if (data) {
        setOtherUserPresence(data);
      } else {
        setOtherUserPresence({ online: false, lastSeen: null });
      }
    });

    // 4. Listen to other user's typing status
    const otherTypingRef = ref(db, `typing/${otherId}`);
    const unsubscribeTyping = onValue(otherTypingRef, (snap) => {
      setOtherUserTyping(!!snap.val());
    });

    return () => {
      unsubscribeMsgs();
      unsubscribeConn();
      unsubscribeOtherPres();
      unsubscribeTyping();
      // On unmount, set offline
      set(myPresenceRef, { online: false, lastSeen: serverTimestamp() });
    };
  }, [profile, otherId]);

  const sendMessage = async (text, media = null) => {
    if ((!text.trim() && !media) || !profile) return;
    
    const messagesRef = ref(db, 'messages');
    await push(messagesRef, {
      text: text.trim(),
      senderId: profile.id,
      senderName: profile.name,
      senderColor: profile.color,
      timestamp: serverTimestamp(),
      read: false,
      media
    });
  };

  const setTypingStatus = (isTyping) => {
    if (!profile) return;
    set(ref(db, `typing/${profile.id}`), isTyping);
  };

  return { 
    messages, 
    sendMessage, 
    otherUserTyping, 
    otherUserPresence,
    setTypingStatus
  };
};
