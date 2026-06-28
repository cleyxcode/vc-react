import React, { useState, useContext, useEffect, useRef } from 'react';
import { UserContext } from '../context/UserContext';
import { useChat } from '../hooks/useChat';
import ChatBubble from '../components/ChatBubble';
import ChatHeader from '../components/ChatHeader';
import { Send, Paperclip, Loader2, Smile } from 'lucide-react';
import { storage } from '../firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import EmojiPicker from 'emoji-picker-react';

const ChatPage = () => {
  const { profile } = useContext(UserContext);
  const { messages, sendMessage, otherUserTyping, otherUserPresence, setTypingStatus } = useChat(profile);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTextChange = (e) => {
    setInputText(e.target.value);
    
    // Handle typing status
    setTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(false);
    }, 1500);
  };

  const handleEmojiClick = (emojiData) => {
    setInputText(prev => prev + emojiData.emoji);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      await sendMessage(inputText);
      setInputText('');
      setTypingStatus(false);
      setShowEmoji(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      alert("Hanya boleh upload gambar atau video!");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran file terlalu besar (Maksimal 10MB).");
      return;
    }

    try {
      setIsUploading(true);
      const ext = file.name.split('.').pop();
      const filename = `${Date.now()}_${profile.id}.${ext}`;
      const fileRef = storageRef(storage, `chat_media/${filename}`);
      
      const uploadTask = uploadBytesResumable(fileRef, file);
      
      uploadTask.on('state_changed', 
        null, 
        (error) => {
          console.error("Upload error:", error);
          alert("Gagal mengunggah file.");
          setIsUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await sendMessage('', {
            type: isImage ? 'image' : 'video',
            data: downloadURL
          });
          setIsUploading(false);
        }
      );
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat upload.");
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!profile) return null;

  return (
    <div className="page-container chat-page">
      <ChatHeader typing={otherUserTyping} presence={otherUserPresence} />
      <div className="chat-container">
        <div className="chat-messages" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
          {messages.map(msg => (
            <ChatBubble 
              key={msg.id} 
              message={msg} 
              isMine={msg.senderId === profile.id} 
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {showEmoji && (
          <div className="emoji-picker-container" style={{ position: 'absolute', bottom: '60px', left: '10px', zIndex: 100 }}>
            <EmojiPicker 
              onEmojiClick={handleEmojiClick} 
              emojiStyle="apple"
              theme="dark"
            />
          </div>
        )}

        <form onSubmit={handleSend} className="chat-input-area">
          <button 
            type="button" 
            className="chat-attach-btn" 
            onClick={() => setShowEmoji(v => !v)}
            title="Emoji"
          >
            <Smile size={20} color={showEmoji ? '#00a884' : '#8696a0'} />
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*,video/*" 
            style={{ display: 'none' }} 
          />
          <button 
            type="button" 
            className="chat-attach-btn" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Upload Gambar/Video"
          >
            {isUploading ? <Loader2 size={20} className="spin-icon" /> : <Paperclip size={20} />}
          </button>
          
          <input
            type="text"
            value={inputText}
            onChange={handleTextChange}
            placeholder="Ketik pesan..."
            className="chat-input"
            disabled={isUploading}
            onFocus={() => setShowEmoji(false)}
          />
          <button type="submit" className="chat-send-btn" disabled={isUploading || (!inputText.trim() && !isUploading)}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
