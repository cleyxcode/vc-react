import React, { useState, useContext, useEffect, useRef } from 'react';
import { UserContext } from '../context/UserContext';
import { useChat } from '../hooks/useChat';
import ChatBubble from '../components/ChatBubble';
import ChatHeader from '../components/ChatHeader';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { storage } from '../firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const ChatPage = () => {
  const { profile } = useContext(UserContext);
  const { messages, sendMessage } = useChat();
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendMessage(inputText, profile);
      setInputText('');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // determine type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      alert("Hanya boleh upload gambar atau video!");
      return;
    }

    // Check size limit (e.g., 50MB max for general, but we limit to 10MB just to be safe for now)
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
        (snapshot) => {
          // progress logic if needed
        }, 
        (error) => {
          console.error("Upload error:", error);
          alert("Gagal mengunggah file. Pastikan Firebase Storage Rules Anda mengizinkan upload (allow read, write: if true; untuk testing).");
          setIsUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await sendMessage('', profile, {
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
      // reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!profile) return null;

  return (
    <div className="page-container chat-page">
      <ChatHeader />
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
        <form onSubmit={handleSend} className="chat-input-area">
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
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ketik pesan..."
            className="chat-input"
            disabled={isUploading}
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
