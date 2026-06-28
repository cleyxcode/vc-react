import React from 'react';
import { Mic, MicOff, PhoneOff, RefreshCw, Video, VideoOff } from 'lucide-react';

const ControlBar = ({
  isMuted,
  toggleMute,
  isVideoOff,
  toggleVideo,
  devices,
  selectedDevices,
  changeDevice,
  endCall,
  resetRoom
}) => {
  return (
    <div className="control-bar-container">
      <div className="control-bar">
        
        {/* Reset Room */}
        <div className="control-group">
          <button 
            className="control-btn bg-gray"
            onClick={resetRoom}
            title="Reset Room"
          >
            <RefreshCw size={24} />
          </button>
        </div>

        {/* Mic Toggle */}
        <div className="control-group">
          <button 
            className={`control-btn ${isMuted ? 'bg-red' : 'bg-gray'}`}
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          <select 
            className="device-select"
            value={selectedDevices.audio}
            onChange={(e) => changeDevice('audio', e.target.value)}
          >
            {devices.audio.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.substring(0,5)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Video Toggle */}
        <div className="control-group">
          <button 
            className={`control-btn ${isVideoOff ? 'bg-red' : 'bg-gray'}`}
            onClick={toggleVideo}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
          <select 
            className="device-select"
            value={selectedDevices.video}
            onChange={(e) => changeDevice('video', e.target.value)}
          >
            {devices.video.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.substring(0,5)}`}
              </option>
            ))}
          </select>
        </div>

        {/* End Call */}
        <div className="control-group">
          <button 
            className="control-btn bg-red end-call"
            onClick={endCall}
            title="End Call"
          >
            <PhoneOff size={24} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ControlBar;
