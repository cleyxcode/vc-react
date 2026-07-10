import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { UserContext } from '../context/UserContext';
import { useChat } from '../hooks/useChat';
import ChatBubble from '../components/ChatBubble';
import ChatHeader from '../components/ChatHeader';
import { Send, Paperclip, Loader2, Smile, Trash2, X, CheckSquare } from 'lucide-react';
import { storage } from '../firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import EmojiPicker from 'emoji-picker-react';

const ChatPage = () => {
  const { profile, activeChat } = useContext(UserContext);
  const { messages, sendMessage, deleteMessages, otherUserTyping, otherUserPresence, setTypingStatus }
    = useChat(profile, activeChat);

  const [inputText,    setInputText]    = useState('');
  const [isUploading,  setIsUploading]  = useState(false);
  const [showEmoji,    setShowEmoji]    = useState(false);

  // ── Selection mode (admin only) ──────────────────────
  const [isSelectMode,   setIsSelectMode]   = useState(false);
  const [selectedIds,    setSelectedIds]    = useState(new Set());

  const messagesEndRef   = useRef(null);
  const fileInputRef     = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Reset selection when chat partner changes
  useEffect(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
    setInputText('');
    setShowEmoji(false);
  }, [activeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  /* ── Input handlers ────────────────────────────────── */
  const handleTextChange = (e) => {
    setInputText(e.target.value);
    setTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTypingStatus(false), 1500);
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
    if (!isImage && !isVideo) { alert('Hanya boleh upload gambar atau video!'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Ukuran file terlalu besar (Maksimal 10MB).'); return; }

    try {
      setIsUploading(true);
      const ext      = file.name.split('.').pop();
      const filename = `${Date.now()}_${profile.id}.${ext}`;
      const fileRef  = storageRef(storage, `chat_media/${filename}`);
      const task     = uploadBytesResumable(fileRef, file);

      task.on('state_changed', null,
        (err) => { console.error(err); alert('Gagal mengunggah file.'); setIsUploading(false); },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          await sendMessage('', { type: isImage ? 'image' : 'video', data: url });
          setIsUploading(false);
        },
      );
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat upload.');
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ── Selection helpers ─────────────────────────────── */
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleLongPress = useCallback((id) => {
    if (!profile?.isAdmin) return;
    setIsSelectMode(true);
    setSelectedIds(new Set([id]));
  }, [profile]);

  const cancelSelect = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    setSelectedIds(new Set(messages.map(m => m.id)));
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`Hapus ${selectedIds.size} pesan?`);
    if (!confirmed) return;
    await deleteMessages([...selectedIds]);
    cancelSelect();
  };

  /* ── Long press detection (touch + mouse) ────────── */
  const longPressTimer = useRef(null);

  const onBubblePointerDown = (id) => {
    if (!profile?.isAdmin) return;
    longPressTimer.current = setTimeout(() => handleLongPress(id), 500);
  };
  const onBubblePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  if (!profile) return null;

  return (
    <div className="page-container chat-page">
      <ChatHeader typing={otherUserTyping} presence={otherUserPresence} />

      {/* ── Selection action bar ── */}
      {isSelectMode && (
        <div className="select-action-bar">
          <button className="select-bar-btn" onClick={cancelSelect} title="Batal">
            <X size={20} />
          </button>
          <span className="select-count">{selectedIds.size} dipilih</span>
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button className="select-bar-btn" onClick={selectAll} title="Pilih semua">
              <CheckSquare size={20} />
            </button>
            <button
              className="select-bar-btn select-bar-delete"
              onClick={handleDelete}
              disabled={selectedIds.size === 0}
              title="Hapus"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="chat-container" style={{ position: 'relative' }}>
        <div
          className="chat-messages"
          style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              onMouseDown={() => onBubblePointerDown(msg.id)}
              onMouseUp={onBubblePointerUp}
              onTouchStart={() => onBubblePointerDown(msg.id)}
              onTouchEnd={onBubblePointerUp}
            >
              <ChatBubble
                message={msg}
                isMine={msg.senderId === profile.id}
                isSelected={selectedIds.has(msg.id)}
                isSelectMode={isSelectMode}
                onSelect={isSelectMode ? toggleSelect : undefined}
              />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {showEmoji && (
          <div className="emoji-picker-container" style={{ position: 'absolute', bottom: '60px', left: '10px', zIndex: 100 }}>
            <EmojiPicker onEmojiClick={handleEmojiClick} emojiStyle="apple" theme="dark" />
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
            {isUploading
              ? <Loader2 size={20} className="spin-icon" />
              : <Paperclip size={20} />}
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
          <button
            type="submit"
            className="chat-send-btn"
            disabled={isUploading || !inputText.trim()}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
