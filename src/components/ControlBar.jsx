import React from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff, Eye, EyeOff } from 'lucide-react';

const ControlBar = ({
  isMuted,
  toggleMute,
  isVideoOff,
  toggleVideo,
  devices,
  selectedDevices,
  changeDevice,
  endCall,
  isPrivacyMode,
  togglePrivacyMode,
  isMobile = false,
}) => {
  // Icon size: smaller on mobile so the bar stays compact
  const iconSize = isMobile ? 20 : 24;

  return (
    <div className={`control-bar-container${isMobile ? ' control-bar-mobile' : ''}`}>
      <div className="control-bar">

        {/* Privacy Toggle */}
        <div className="control-group">
          <button
            className={`control-btn ${isPrivacyMode ? 'bg-red' : 'bg-gray'}${isMobile ? ' control-btn-sm' : ''}`}
            onClick={togglePrivacyMode}
            title={isPrivacyMode ? "Matikan Mode Privasi" : "Nyalakan Mode Privasi"}
          >
            {isPrivacyMode ? <EyeOff size={iconSize} /> : <Eye size={iconSize} />}
          </button>
        </div>

        {/* Mic Toggle */}
        <div className="control-group">
          <button
            className={`control-btn ${isMuted ? 'bg-red' : 'bg-gray'}${isMobile ? ' control-btn-sm' : ''}`}
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={iconSize} /> : <Mic size={iconSize} />}
          </button>

          {!isMobile && (
            <select
              className="device-select"
              value={selectedDevices.audio}
              onChange={(e) => changeDevice('audio', e.target.value)}
            >
              {devices.audio.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.substring(0, 5)}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Video Toggle */}
        {toggleVideo && (
          <div className="control-group">
            <button
              className={`control-btn ${isVideoOff ? 'bg-red' : 'bg-gray'}${isMobile ? ' control-btn-sm' : ''}`}
              onClick={toggleVideo}
              title={isVideoOff ? "Nyalakan Kamera" : "Matikan Kamera"}
            >
              {isVideoOff ? <VideoOff size={iconSize} /> : <Video size={iconSize} />}
            </button>

            {!isMobile && (
              <select
                className="device-select"
                value={selectedDevices.video}
                onChange={(e) => changeDevice('video', e.target.value)}
              >
                {devices.video.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* End Call */}
        <div className="control-group">
          <button
            className={`control-btn bg-red end-call${isMobile ? ' control-btn-sm' : ''}`}
            onClick={endCall}
            title="Akhiri Panggilan"
          >
            <PhoneOff size={iconSize} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ControlBar;
