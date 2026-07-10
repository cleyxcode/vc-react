import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  ref, push, update, onValue, serverTimestamp,
  onDisconnect, set, remove,
} from 'firebase/database';

/** Returns a stable room key for the two participants, e.g. "clay_uli" */
export const getRoomKey = (idA, idB) =>
  [idA, idB].sort().join('_');

export const useChat = (profile, activeChat) => {
  const [messages,          setMessages]          = useState([]);
  const [otherUserTyping,   setOtherUserTyping]   = useState(false);
  const [otherUserPresence, setOtherUserPresence] = useState({ online: false, lastSeen: null });

  // The ID we're currently chatting with
  const otherId  = activeChat || (profile?.id === 'clay' ? 'uli' : 'clay');
  const roomKey  = profile ? getRoomKey(profile.id, otherId) : null;

  useEffect(() => {
    if (!profile || !roomKey) return;

    // ── 1. Messages scoped to this room ──────────────────
    const messagesRef = ref(db, `messages/${roomKey}`);
    const unsubscribeMsgs = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        }));
        msgArray.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(msgArray);

        // Auto-mark messages from the other user as read
        const updates = {};
        let hasUpdates = false;
        msgArray.forEach(msg => {
          if (msg.senderId !== profile.id && !msg.read) {
            updates[`messages/${roomKey}/${msg.id}/read`] = true;
            hasUpdates = true;
          }
        });
        if (hasUpdates) update(ref(db), updates);
      } else {
        setMessages([]);
      }
    });

    // ── 2. Presence — clay (admin) never writes its own presence ──
    let unsubscribeConn = () => {};
    if (!profile.isAdmin) {
      const myPresenceRef = ref(db, `presence/${profile.id}`);
      const connectedRef  = ref(db, '.info/connected');

      unsubscribeConn = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          onDisconnect(myPresenceRef).set({
            online: false,
            lastSeen: serverTimestamp(),
          }).then(() => {
            set(myPresenceRef, { online: true, lastSeen: serverTimestamp() });
          });
        }
      });
    }

    // ── 3. Other user's presence ──────────────────────────
    const otherPresenceRef = ref(db, `presence/${otherId}`);
    const unsubscribeOtherPres = onValue(otherPresenceRef, (snap) => {
      const data = snap.val();
      setOtherUserPresence(data ?? { online: false, lastSeen: null });
    });

    // ── 4. Typing indicator ───────────────────────────────
    const otherTypingRef = ref(db, `typing/${roomKey}/${otherId}`);
    const unsubscribeTyping = onValue(otherTypingRef, (snap) => {
      setOtherUserTyping(!!snap.val());
    });

    return () => {
      unsubscribeMsgs();
      unsubscribeConn();
      unsubscribeOtherPres();
      unsubscribeTyping();
      if (!profile.isAdmin) {
        const myPresenceRef = ref(db, `presence/${profile.id}`);
        set(myPresenceRef, { online: false, lastSeen: serverTimestamp() });
      }
      // Clear own typing flag on unmount
      set(ref(db, `typing/${roomKey}/${profile.id}`), false);
    };
  }, [profile?.id, roomKey, otherId]);

  const sendMessage = async (text, media = null) => {
    if ((!text?.trim() && !media) || !profile || !roomKey) return;
    const messagesRef = ref(db, `messages/${roomKey}`);
    await push(messagesRef, {
      text: text.trim(),
      senderId:    profile.id,
      senderName:  profile.name,
      senderColor: profile.color,
      timestamp:   serverTimestamp(),
      read: false,
      media: media ?? null,
    });
  };

  const deleteMessages = async (messageIds) => {
    if (!profile?.isAdmin || !roomKey) return;
    const updates = {};
    messageIds.forEach(id => {
      updates[`messages/${roomKey}/${id}`] = null;
    });
    await update(ref(db), updates);
  };

  const setTypingStatus = (isTyping) => {
    if (!profile || !roomKey) return;
    set(ref(db, `typing/${roomKey}/${profile.id}`), isTyping);
  };

  return {
    messages,
    sendMessage,
    deleteMessages,
    otherUserTyping,
    otherUserPresence,
    setTypingStatus,
    roomKey,
    otherId,
  };
};
