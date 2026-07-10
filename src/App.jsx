import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { UserProvider, UserContext } from './context/UserContext';
import { CallProvider, CallContext } from './context/CallContext';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import CallScreen from './components/CallScreen';
import CallOverlay from './components/CallOverlay';
import './App.css';

/* Watch CallContext.navigateTo and navigate accordingly */
const NavigationWatcher = () => {
  const { navigateTo, setNavigateTo } = useContext(CallContext);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (navigateTo) {
      navigate(navigateTo);
      setNavigateTo(null);
    }
  }, [navigateTo, navigate, setNavigateTo]);

  return null;
};

const ProtectedRoutes = () => {
  const { profile } = useContext(UserContext);
  const { callState } = useContext(CallContext);

  // Determine WebRTC role from who initiated the call
  const role = callState.caller === profile?.id ? 'caller' : 'callee';
  // WebRTC room is scoped to the same pair as the call
  const roomId = callState.roomKey || 'room_main';

  return (
    <div className="content-area">
      <NavigationWatcher />
      <CallOverlay />
      <Routes>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/call" element={<CallScreen role={role} callType={callState.type} roomId={roomId} />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </div>
  );
};

const MainApp = () => {
  const { profile, isLoading } = useContext(UserContext);
  if (isLoading) return null;

  return (
    <Routes>
      <Route path="/login" element={!profile ? <LoginPage /> : <Navigate to="/chat" replace />} />
      <Route path="/*" element={profile ? <ProtectedRoutes /> : <Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <UserProvider>
      <Router>
        <CallProvider>
          <div className="app">
            <MainApp />
          </div>
        </CallProvider>
      </Router>
    </UserProvider>
  );
}

export default App;
