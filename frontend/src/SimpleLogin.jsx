import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SimpleLogin = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    try {
      const response = await fetch('http://127.0.0.1:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      if (!response.ok) throw new Error("Invalid Username or Password");
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('username', username);
      setIsAuthenticated(true);
      navigate('/dashboard');
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'fixed', 
      top: 0, 
      left: 0,
      zIndex: 10000,
      overflow: 'auto'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        padding: '40px',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
        width: '90%',
        maxWidth: '400px'
      }}>
        <h1 style={{ 
          color: 'white', 
          textAlign: 'center', 
          marginBottom: '10px',
          fontSize: '36px'
        }}>
          🚀 BCABuddy
        </h1>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          textAlign: 'center', 
          marginBottom: '30px' 
        }}>
          Login to continue
        </p>

        {error && (
          <div style={{
            background: 'rgba(244, 67, 54, 0.2)',
            border: '1px solid rgba(244, 67, 54, 0.5)',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter username"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              background: loading ? 'rgba(187, 134, 252, 0.5)' : 'linear-gradient(135deg, #bb86fc, #03dac6)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: '15px'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
          Test credentials: test / test123
        </p>
      </div>
    </div>
  );
};

export default SimpleLogin;
