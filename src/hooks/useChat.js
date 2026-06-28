import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, push, onValue, serverTimestamp } from 'firebase/database';

export const useChat = () => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const messagesRef = ref(db, 'messages');
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object to array and sort by timestamp
        const msgArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        msgArray.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(msgArray);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const sendMessage = async (text, profile, media = null) => {
    if ((!text.trim() && !media) || !profile) return;
    
    const messagesRef = ref(db, 'messages');
    await push(messagesRef, {
      text: text.trim(),
      senderId: profile.id,
      senderName: profile.name,
      senderColor: profile.color,
      timestamp: serverTimestamp(),
      media
    });
  };

  return { messages, sendMessage };
};
