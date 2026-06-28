import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const ACCOUNTS = {
  clay: { id: 'saya',  name: 'eyy',  color: '#3498db' },
  yuli: { id: 'pacar', name: 'ulii', color: '#e74c3c' },
};

const LoginPage = () => {
  const [passcode, setPasscode]  = useState('');
  const [showPass, setShowPass]  = useState(false);
  const [error, setError]        = useState('');
  const { login, profile, isLoading } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && profile) navigate('/chat', { replace: true });
  }, [isLoading, profile, navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    const matched = ACCOUNTS[passcode.trim()];
    if (matched) {
      login(matched);
      navigate('/chat');
    } else {
      setError('Kode sandi salah. Coba lagi.');
    }
  };

  if (isLoading) return null;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">📱</div>
        <h2>VC App</h2>
        <p className="auth-tagline">Video call &amp; chat pribadi</p>

        <form onSubmit={handleLogin} className="auth-form">
          <Input
            type={showPass ? 'text' : 'password'}
            value={passcode}
            onChange={(e) => { setPasscode(e.target.value); setError(''); }}
            placeholder="Masukkan kode sandi"
            autoFocus
            icon={showPass ? EyeOff : Eye}
            iconAction={() => setShowPass(v => !v)}
          />

          {error && <p className="auth-error">⚠ {error}</p>}

          <Button type="submit">
            <Lock size={16} />
            Masuk
          </Button>
        </form>

        <div className="auth-hint">
          Sandi berbeda untuk setiap akun.<br />
          Sesi tersimpan otomatis di browser.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
