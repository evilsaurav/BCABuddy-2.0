/**
 * Clear Storage Helper - Paste this in browser console to fix token issues
 * 
 * Usage:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy-paste all the code below and press Enter
 * 4. Follow the prompts
 */

// ============================================
// AUTO-CLEAR STORAGE & REDIRECT TO LOGIN
// ============================================

(function() {
  console.log('🧹 Clearing stale tokens and session data...');
  
  // List of keys to remove
  const keysToRemove = [
    'token',
    'token_timestamp',
    'username',
    'user_id',
    'auth_token',
    'access_token'
  ];
  
  // Remove each key
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`✅ Removed: ${key}`);
    }
  });
  
  console.log('');
  console.log('════════════════════════════════════════════');
  console.log('✨ STORAGE CLEARED SUCCESSFULLY!');
  console.log('════════════════════════════════════════════');
  console.log('');
  console.log('📍 Redirecting to login in 2 seconds...');
  console.log('');
  console.log('After login:');
  console.log('• Fresh token will be stored with tokenManager');
  console.log('• Token validation loop will run every 30s');
  console.log('• You\\'ll see expiry warnings at 5 minutes');
  console.log('• Auto-logout will happen at buffer time');
  console.log('');
  
  // Redirect to login after 2 seconds
  setTimeout(() => {
    console.log('🔄 Navigating to login...');
    window.location.href = window.location.origin + '/';
  }, 2000);
})();
