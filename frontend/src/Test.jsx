import React from 'react';

function Test() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontSize: '32px',
      fontWeight: 'bold',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 10000
    }}>
      🚀 BCABuddy Test - If you see this, React is working!
    </div>
  );
}

export default Test;
