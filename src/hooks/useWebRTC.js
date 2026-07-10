import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { ref, set, onValue, onChildAdded, remove, push, child, off } from 'firebase/database';

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
 * role    : 'caller' | 'callee'
 * callType: 'video'  | 'voice'
 * roomId  : per-pair key, e.g. 'clay_uli'
 */
export const useWebRTC = (role = 'caller', callType = 'video', roomId = 'room_main') => {
  const [localStream,     setLocalStream]     = useState(null);
  const [remoteStream,    setRemoteStream]     = useState(null);
  const [connectionState, setConnectionState] = useState('Memulai...');
  const [isMuted,         setIsMuted]         = useState(false);
  const [isVideoOff,      setIsVideoOff]      = useState(false);
  const [devices,         setDevices]         = useState({ audio: [], video: [] });
  const [selectedDevices, setSelectedDevices] = useState({ audio: '', video: '' });

  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);
  // Keep latest prop values accessible inside async callbacks without stale closure
  const roleRef        = useRef(role);
  const callTypeRef    = useRef(callType);
  const roomIdRef      = useRef(roomId);
  // Firebase listener cleanup fns
  const unsubListeners = useRef([]);

  useEffect(() => { roleRef.current    = role;     }, [role]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { roomIdRef.current  = roomId;   }, [roomId]);

  /* ─── helper: register a firebase listener and track it ─── */
  const addListener = (fbRef, type, handler) => {
    if (type === 'value') {
      onValue(fbRef, handler);
      unsubListeners.current.push(() => off(fbRef, 'value', handler));
    } else {
      onChildAdded(fbRef, handler);
      unsubListeners.current.push(() => off(fbRef, 'child_added', handler));
    }
  };

  const cleanupListeners = () => {
    unsubListeners.current.forEach(fn => fn());
    unsubListeners.current = [];
  };

  /* ─── close PC and stop tracks ──────────────────────────── */
  const closePeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.ontrack           = null;
      pcRef.current.onicecandidate    = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  /* ─── 3a. CALLER logic ───────────────────────────────────── */
  const startAsCaller = useCallback(async (pc, roomRef, callerCands, calleeCands) => {
    console.log('[WebRTC] role=CALLER, room=', roomIdRef.current);
    setConnectionState('Menunggu lawan bicara...');

    // Remove stale room so callee always gets a fresh offer
    await remove(roomRef);

    pc.onicecandidate = e => {
      if (e.candidate) push(callerCands, e.candidate.toJSON());
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await set(roomRef, { offer: { type: offer.type, sdp: offer.sdp } });
    console.log('[WebRTC] offer written');

    // Wait for callee's answer
    const answerRef = child(roomRef, 'answer');
    const onAnswer = (snap) => {
      const d = snap.val();
      if (d && pc.signalingState !== 'closed' && !pc.currentRemoteDescription) {
        console.log('[WebRTC] got answer');
        pc.setRemoteDescription(new RTCSessionDescription(d)).catch(console.error);
      }
    };
    addListener(answerRef, 'value', onAnswer);

    // Collect callee's ICE candidates
    const onCalleeCand = (snap) => {
      const c = snap.val();
      if (c && pc.signalingState !== 'closed') {
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
      }
    };
    addListener(calleeCands, 'child_added', onCalleeCand);

  }, []);

  /* ─── 3b. CALLEE logic ───────────────────────────────────── */
  const startAsCallee = useCallback((pc, roomRef, callerCands, calleeCands) => {
    console.log('[WebRTC] role=CALLEE, room=', roomIdRef.current);
    setConnectionState('Menghubungkan...');

    pc.onicecandidate = e => {
      if (e.candidate) push(calleeCands, e.candidate.toJSON());
    };

    const onRoom = async (snap) => {
      const d = snap.val();
      if (!d?.offer || pc.signalingState === 'closed') return;
      if (pc.currentRemoteDescription) return; // already processed
      console.log('[WebRTC] got offer, creating answer...');

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(d.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await set(child(roomRef, 'answer'), { type: answer.type, sdp: answer.sdp });
        console.log('[WebRTC] answer written');

        // Now start collecting caller ICE candidates
        const onCallerCand = (snap2) => {
          const c = snap2.val();
          if (c && pc.signalingState !== 'closed') {
            pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error);
          }
        };
        addListener(callerCands, 'child_added', onCallerCand);
      } catch (err) {
        console.error('[WebRTC] callee answer error:', err);
      }
    };
    addListener(roomRef, 'value', onRoom);

  }, []);

  /* ─── 2. Build RTCPeerConnection ─────────────────────────── */
  const buildPeerConnection = useCallback((stream) => {
    const currentRoomId = roomIdRef.current;
    setConnectionState('Menyiapkan koneksi...');

    const pc          = new RTCPeerConnection(configuration);
    pcRef.current     = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = e => {
      console.log('[WebRTC] ontrack fired', e.streams);
      if (e.streams?.[0]) {
        setRemoteStream(e.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log('[WebRTC] connectionState:', s);
      if (s === 'connected')                             setConnectionState('Tersambung');
      else if (s === 'disconnected' || s === 'failed')  setConnectionState('Koneksi terputus');
      else if (s === 'closed')                           setConnectionState('Sesi berakhir');
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] iceState:', pc.iceConnectionState);
    };

    // Build Firebase refs fresh from current roomId
    const roomRef     = ref(db, `rooms/${currentRoomId}`);
    const callerCands = child(roomRef, 'callerCandidates');
    const calleeCands = child(roomRef, 'calleeCandidates');

    if (roleRef.current === 'caller') {
      startAsCaller(pc, roomRef, callerCands, calleeCands);
    } else {
      startAsCallee(pc, roomRef, callerCands, calleeCands);
    }
  }, [startAsCaller, startAsCallee]);

  /* ─── 1. Acquire camera/mic then build PC ────────────────── */
  const initializeMedia = useCallback(async () => {
    try {
      setConnectionState('Meminta akses media...');
      const reqVideo = callTypeRef.current !== 'voice';
      console.log('[WebRTC] requesting media, video=', reqVideo, 'role=', roleRef.current, 'room=', roomIdRef.current);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: reqVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: true,
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Enumerate devices after permission granted
      const devList = await navigator.mediaDevices.enumerateDevices();
      const audio   = devList.filter(d => d.kind === 'audioinput');
      const video   = devList.filter(d => d.kind === 'videoinput');
      setDevices({ audio, video });
      if (audio[0]) setSelectedDevices(p => ({ ...p, audio: audio[0].deviceId }));
      if (video[0]) setSelectedDevices(p => ({ ...p, video: video[0].deviceId }));

      buildPeerConnection(stream);
    } catch (err) {
      console.error('[WebRTC] media error:', err);
      setConnectionState('Gagal akses kamera/mic: ' + err.message);
    }
  }, [buildPeerConnection]);

  /* ─── Lifecycle: init once per mount ────────────────────── */
  useEffect(() => {
    // Give React one tick to settle props before starting (avoids null callType)
    const t = setTimeout(() => {
      initializeMedia();
    }, 50);

    return () => {
      clearTimeout(t);
      cleanupListeners();
      closePeer();
      setLocalStream(null);
      setRemoteStream(null);
      setConnectionState('Panggilan diakhiri');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Controls ───────────────────────────────────────────── */
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  };

  const toggleVideo = () => {
    if (!localStreamRef.current || callTypeRef.current === 'voice') return;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOff(v => !v);
  };

  const changeDevice = async (kind, deviceId) => {
    if (!localStreamRef.current || !pcRef.current) return;
    if (kind === 'video' && callTypeRef.current === 'voice') return;
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
    cleanupListeners();
    closePeer();
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('Panggilan diakhiri');
  };

  return {
    localStream, remoteStream, connectionState,
    isMuted, toggleMute,
    isVideoOff, toggleVideo,
    devices, selectedDevices, changeDevice,
    endCall,
  };
};
