import React, { useRef, useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutPanelLeft, LayoutGrid, Maximize2, FlipHorizontal } from 'lucide-react';
import ControlBar from './ControlBar';
import { CallContext } from '../context/CallContext';
import { useWebRTC } from '../hooks/useWebRTC';

/* ─── layout constants ──────────────────────────────── */
const LAYOUTS = ['pip', 'side', 'grid'];  // pip=PIP overlay, side=side-by-side, grid=equal grid

/* ─── single video element (memoised) ──────────────── */
const VideoEl = React.forwardRef(({ stream, muted, mirror, className, style }, ref) => {
  const inner = useRef(null);
  const resolvedRef = ref || inner;

  useEffect(() => {
    if (resolvedRef.current && stream) {
      resolvedRef.current.srcObject = stream;
    }
  }, [stream, resolvedRef]);

  return (
    <video
      ref={resolvedRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
      style={{ transform: mirror ? 'scaleX(-1)' : 'none', ...style }}
    />
  );
});
VideoEl.displayName = 'VideoEl';

/* ─── draggable PIP box ─────────────────────────────── */
const PipBox = ({ stream, muted, mirror, onClick }) => {
  const ref         = useRef(null);
  const [pos, setPos] = useState({ x: null, y: null });
  const drag        = useRef({ active: false, ox: 0, oy: 0 });
  const moved       = useRef(false);

  // Default: bottom-right
  useEffect(() => {
    const place = () => {
      if (ref.current)
        setPos({ x: window.innerWidth - ref.current.offsetWidth - 16, y: window.innerHeight - ref.current.offsetHeight - 110 });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  const onDown = e => {
    moved.current = false;
    drag.current = {
      active: true,
      ox: (e.touches ? e.touches[0].clientX : e.clientX) - pos.x,
      oy: (e.touches ? e.touches[0].clientY : e.clientY) - pos.y,
    };
  };
  const onMove = e => {
    if (!drag.current.active) return;
    moved.current = true;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const W = ref.current?.offsetWidth  || 120;
    const H = ref.current?.offsetHeight || 180;
    setPos({
      x: Math.max(0, Math.min(cx - drag.current.ox, window.innerWidth  - W)),
      y: Math.max(0, Math.min(cy - drag.current.oy, window.innerHeight - H)),
    });
  };
  const onUp = () => { drag.current.active = false; };

  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  });

  if (pos.x === null) return null;

  return (
    <div
      ref={ref}
      className="pip-box"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onDown}
      onTouchStart={onDown}
      onClick={() => { if (!moved.current) onClick(); }}
    >
      <VideoEl stream={stream} muted={muted} mirror={mirror} className="pip-video-inner" />
      <div className="pip-hint"><Maximize2 size={14} /></div>
    </div>
  );
};

/* ─── LayoutIcon helper ─────────────────────────────── */
const LayoutBtn = ({ current, value, onClick, children, title }) => (
  <button
    className={`layout-btn ${current === value ? 'active' : ''}`}
    onClick={() => onClick(value)}
    title={title}
  >
    {children}
  </button>
);

/* ─── MAIN COMPONENT ────────────────────────────────── */
const CallScreen = ({ role, callType }) => {
  const rtc = useWebRTC(role, callType);
  const {
    localStream, remoteStream, connectionState,
    isMuted, toggleMute, isVideoOff, toggleVideo,
    devices, selectedDevices, changeDevice,
    endCall: stopTracks,
  } = rtc;

  const { endCall: endCallSignal } = useContext(CallContext);
  const navigate = useNavigate();

  const [layout,   setLayout]   = useState('pip');   // 'pip' | 'side' | 'grid'
  const [swapped,  setSwapped]  = useState(false);
  const [isLocalMirrored, setIsLocalMirrored] = useState(true);

  // On mobile, always stay in PIP layout
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const effectiveLayout = isMobile ? 'pip' : layout;

  // in PIP mode: big = remote unless swapped; small = local unless swapped
  const bigStream   = swapped ? localStream  : remoteStream;
  const smallStream = swapped ? remoteStream : localStream;
  const bigMirror   = swapped ? isLocalMirrored : false;
  const smallMirror = !swapped ? isLocalMirrored : false;

  const connected = !!remoteStream;

  const handleEndCall = async () => {
    stopTracks();
    await endCallSignal();
    navigate('/chat');
  };

  // Auto end call if connection drops
  useEffect(() => {
    const s = connectionState;
    if (s === 'Koneksi terputus' || s === 'Sesi berakhir' || s === 'Panggilan diakhiri') {
      const t = setTimeout(() => {
        handleEndCall();
      }, 1500); // Wait 1.5s so user can read the status before redirect
      return () => clearTimeout(t);
    }
  }, [connectionState]);

  return (
    <div className="call-screen">

      {/* ── Toolbar: layout switcher only ── */}
      {connected && callType !== 'voice' && !isMobile && (
        <div className="call-toolbar">
          <div className="layout-switcher">
            <button 
              className="layout-btn" 
              onClick={() => setIsLocalMirrored(m => !m)} 
              title={isLocalMirrored ? "Matikan Cermin" : "Nyalakan Cermin"}
              style={{ marginRight: '8px', borderRight: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px 0 0 16px', paddingRight: '14px' }}
            >
              <FlipHorizontal size={16} color={isLocalMirrored ? "#00a884" : "rgba(255,255,255,0.6)"} />
            </button>
            <LayoutBtn current={layout} value="pip"  onClick={setLayout} title="PIP (Float)">
              <Maximize2 size={16} />
            </LayoutBtn>
            <LayoutBtn current={layout} value="side" onClick={setLayout} title="Berdampingan">
              <LayoutPanelLeft size={16} />
            </LayoutBtn>
            <LayoutBtn current={layout} value="grid" onClick={setLayout} title="Grid Sejajar">
              <LayoutGrid size={16} />
            </LayoutBtn>
          </div>
        </div>
      )}

      {/* ── Waiting overlay ── */}
      {(!connected && callType !== 'voice') && (
        <div className="status-overlay">
          <div className="status-spinner" />
          <h2>{connectionState}</h2>
        </div>
      )}

      {/* ══════════════════════════════
          LAYOUT: VOICE CALL
         ══════════════════════════════ */}
      {callType === 'voice' && (
        <div className="voice-call-ui">
          <div className="voice-avatar-container">
            <div className={`voice-avatar ${connected ? 'pulsing' : ''}`}>
              {/* Dummy avatar logic, since we don't have profile here directly we use generic */}
              <div className="voice-avatar-inner">
                {connected ? 'V' : '...'}
              </div>
            </div>
          </div>
          <h2 className="voice-status">
            {connected ? 'Panggilan Suara Berlangsung' : connectionState}
          </h2>
          
          {/* We still need the video elements in DOM for audio to play! (or audio elements) */}
          <VideoEl stream={remoteStream} muted={false} className="hidden-media" />
          <VideoEl stream={localStream} muted={true} className="hidden-media" />
        </div>
      )}

      {/* ══════════════════════════════
          LAYOUT: PIP (default)
         ══════════════════════════════ */}
      {layout === 'pip' && callType !== 'voice' && effectiveLayout === 'pip' && (
        <>
          <VideoEl
            stream={bigStream}
            muted={swapped}
            mirror={false}
            className="main-video"
          />
          {smallStream && (
            <PipBox
              stream={smallStream}
              muted={!swapped}
              mirror={false}
              onClick={() => setSwapped(s => !s)}
            />
          )}
        </>
      )}

      {/* ══════════════════════════════
          LAYOUT: SIDE BY SIDE
         ══════════════════════════════ */}
      {layout === 'side' && callType !== 'voice' && effectiveLayout !== 'pip' && (
        <div className="side-layout">
          <div className="side-cell">
            <VideoEl stream={remoteStream} muted={false} mirror={false} className="side-video" />
            <div className="video-label">Lawan Bicara</div>
          </div>
          <div className="side-cell">
            <VideoEl stream={localStream}  muted={true}  mirror={isLocalMirrored}  className="side-video" />
            <div className="video-label">Kamera Saya</div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          LAYOUT: GRID (equal squares)
         ══════════════════════════════ */}
      {layout === 'grid' && callType !== 'voice' && effectiveLayout !== 'pip' && (
        <div className="grid-layout">
          <div className="grid-cell">
            <VideoEl stream={remoteStream} muted={false} mirror={false} className="grid-video" />
            <div className="video-label">Lawan Bicara</div>
          </div>
          <div className="grid-cell">
            <VideoEl stream={localStream}  muted={true}  mirror={isLocalMirrored}  className="grid-video" />
            <div className="video-label">Kamera Saya</div>
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      <ControlBar
        isMuted={isMuted}
        toggleMute={toggleMute}
        isVideoOff={callType === 'voice' ? true : isVideoOff}
        toggleVideo={callType === 'voice' ? undefined : toggleVideo}
        devices={devices}
        selectedDevices={selectedDevices}
        changeDevice={changeDevice}
        endCall={handleEndCall}
      />
    </div>
  );
};

export default CallScreen;
