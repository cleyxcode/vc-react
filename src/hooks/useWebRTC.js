import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { ref, set, onValue, onChildAdded, remove, push, child } from 'firebase/database';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80',              username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',             username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

/**
 * role: 'caller' | 'callee'
 * roomId: per-pair room key, e.g. 'clay_uli'
 */
export const useWebRTC = (role = 'caller', callType = 'video', roomId = 'room_main') => {
  const [localStream,     setLocalStream]     = useState(null);
  const [remoteStream,    setRemoteStream]     = useState(null);
  const [connectionState, setConnectionState] = useState('Memulai...');
  const [isMuted,         setIsMuted]         = useState(false);
  const [isVideoOff,      setIsVideoOff]      = useState(false);
  const [devices,         setDevices]         = useState({ audio: [], video: [] });
  const [selectedDevices, setSelectedDevices] = useState({ audio: '', video: '' });

  const pcRef           = useRef(null);
  const localStreamRef  = useRef(null);
  const roleRef         = useRef(role);
  const startedRef      = useRef(false);

  useEffect(() => { roleRef.current = role; }, [role]);

  /* ── refs to Firebase paths ──────────────────── */
  const roomRef       = ref(db, `rooms/${roomId}`);
  const callerCands   = child(roomRef, 'callerCandidates');
  const calleeCands   = child(roomRef, 'calleeCandidates');

  /* ── 1. Acquire camera/mic ───────────────────── */
  const initializeMedia = async () => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      setConnectionState('Meminta akses media...');
      const reqVideo = callType === 'video';
      const stream = await navigator.mediaDevices.getUserMedia({ video: reqVideo, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const devList = await navigator.mediaDevices.enumerateDevices();
      const audio   = devList.filter(d => d.kind === 'audioinput');
      const video   = devList.filter(d => d.kind === 'videoinput');
      setDevices({ audio, video });
      if (audio[0]) setSelectedDevices(p => ({ ...p, audio: audio[0].deviceId }));
      if (video[0]) setSelectedDevices(p => ({ ...p, video: video[0].deviceId }));

      buildPeerConnection(stream);
    } catch (err) {
      console.error('[WebRTC] media error:', err);
      setConnectionState('Gagal akses kamera/mic');
    }
  };

  /* ── 2. Build RTCPeerConnection ──────────────── */
  const buildPeerConnection = (stream) => {
    setConnectionState('Menyiapkan koneksi...');
    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = e => {
      if (e.streams?.[0]) setRemoteStream(e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log('[WebRTC] connection state:', s);
      if (s === 'connected')                            setConnectionState('Tersambung');
      else if (s === 'disconnected' || s === 'failed') setConnectionState('Koneksi terputus');
      else if (s === 'closed')                          setConnectionState('Sesi berakhir');
    };

    if (roleRef.current === 'caller') {
      startAsCaller(pc);
    } else {
      startAsCallee(pc);
    }
  };

  /* ── 3a. CALLER ──────────────────────────────── */
  const startAsCaller = async (pc) => {
    console.log('[WebRTC] I am CALLER');
    setConnectionState('Menunggu lawan bicara...');

    // Wipe stale room data so callee gets a fresh offer
    await remove(roomRef);

    pc.onicecandidate = e => {
      if (e.candidate) push(callerCands, e.candidate.toJSON());
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await set(roomRef, { offer: { type: offer.type, sdp: offer.sdp } });
    console.log('[WebRTC] offer written');

    // Wait for callee's answer
    onValue(child(roomRef, 'answer'), snap => {
      const d = snap.val();
      if (d && !pc.currentRemoteDescription) {
        console.log('[WebRTC] received answer');
        pc.setRemoteDescription(new RTCSessionDescription(d)).catch(console.error);
      }
    });

    // Collect callee's ICE candidates
    onChildAdded(calleeCands, snap => {
      const c = snap.val();
      if (c) pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
    });
  };

  /* ── 3b. CALLEE ──────────────────────────────── */
  const startAsCallee = (pc) => {
    console.log('[WebRTC] I am CALLEE, waiting for offer...');
    setConnectionState('Menghubungkan...');

    pc.onicecandidate = e => {
      if (e.candidate) push(calleeCands, e.candidate.toJSON());
    };

    // React to offer (caller may write it slightly after callee loads)
    onValue(roomRef, async snap => {
      const d = snap.val();
      if (!d?.offer || pc.currentRemoteDescription) return;
      console.log('[WebRTC] got offer, creating answer...');

      await pc.setRemoteDescription(new RTCSessionDescription(d.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await set(child(roomRef, 'answer'), { type: answer.type, sdp: answer.sdp });
      console.log('[WebRTC] answer written');

      // Collect caller's ICE candidates
      onChildAdded(callerCands, snap2 => {
        const c = snap2.val();
        if (c) pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
      });
    });
  };

  /* ── Controls ────────────────────────────────── */
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };

  const toggleVideo = () => {
    if (!localStreamRef.current || callType === 'voice') return;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(v => !v);
  };

  const changeDevice = async (kind, deviceId) => {
    if (!localStreamRef.current || !pcRef.current) return;
    if (kind === 'video' && callType === 'voice') return;
    try {
      const constraints = kind === 'audio'
        ? { audio: { deviceId: { exact: deviceId } }, video: false }
        : { audio: false, video: { deviceId: { exact: deviceId } } };

      const ns    = await navigator.mediaDevices.getUserMedia(constraints);
      const track = kind === 'audio' ? ns.getAudioTracks()[0] : ns.getVideoTracks()[0];

      const sender = pcRef.current.getSenders().find(s => s.track?.kind === track.kind);
      if (sender) await sender.replaceTrack(track);

      const old = localStreamRef.current.getTracks().find(t => t.kind === track.kind);
      if (old) { localStreamRef.current.removeTrack(old); old.stop(); }
      localStreamRef.current.addTrack(track);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

      if (kind === 'audio') track.enabled = !isMuted;
      setSelectedDevices(p => ({ ...p, [kind]: deviceId }));
    } catch (err) {
      console.error('[WebRTC] changeDevice:', err);
    }
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('Panggilan diakhiri');
  };

  /* ── Lifecycle ───────────────────────────────── */
  useEffect(() => {
    initializeMedia();
    return () => { endCall(); };
    // eslint-disable-next-line
  }, []);

  return {
    localStream, remoteStream, connectionState,
    isMuted, toggleMute,
    isVideoOff, toggleVideo,
    devices, selectedDevices, changeDevice,
    endCall,
  };
};
