# 🔧 Fix HTTP 500 Error - Step by Step

## The Problem
Your browser still has an **old/invalid token** from before the token manager was implemented.

## The Solution
Clear the old token and login again to get a fresh valid one.

---

## Method 1: Manual Clearing (Easiest)

### Step 1: Open Developer Tools
- Press **F12** on your keyboard
- Or right-click → "Inspect"

### Step 2: Go to Storage
- Click on **Application** tab (or **Storage** tab in Firefox)
- Click on **Local Storage** on the left
- Click on **http://127.0.0.1:5173**

### Step 3: Delete Old Tokens
Delete these keys if they exist:
- `token` ← **DELETE THIS**
- `token_timestamp` ← **DELETE THIS**
- `username` (optional)
- `user_id` (optional)

**How to delete:**
- Right-click on each item
- Click "Delete"

### Step 4: Refresh & Login
1. Close the DevTools (F12)
2. Refresh the page (Ctrl+R or F5)
3. You should be redirected to login page
4. **Login with your credentials**
5. This stores a fresh valid token

### Step 5: Test
- Send a message in chat
- Should work now ✅

---

## Method 2: Automatic Clearing (via Console)

### Step 1: Open Console
- Press **F12** → Go to **Console** tab

### Step 2: Paste & Run Code
Copy this code and paste it in the console, then press Enter:

```javascript
(function() {
  console.log('🧹 Clearing stale tokens...');
  ['token', 'token_timestamp', 'username', 'user_id'].forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log('✅ Removed: ' + key);
    }
  });
  console.log('✨ Done! Redirecting to login in 2 seconds...');
  setTimeout(() => { window.location.href = '/'; }, 2000);
})();
```

### Step 3: Wait for Redirect
- Console shows: "Redirecting to login in 2 seconds..."
- Page automatically goes to login page
- Login with fresh credentials

---

## What Happens After Login

✅ **Token Manager kicks in**
- New valid token stored with timestamp
- Token validation runs every 30 seconds
- You get 5-minute warning before expiry
- Auto-logout happens gracefully

✅ **HTTP 500 Errors Gone**
- Frontend detects invalid tokens before sending
- Expired tokens cause logout, not 500 errors
- Clear user-friendly messages

---

## Still Having Issues?

### Check 1: Verify Backend is Running
```
http://127.0.0.1:8000/health
```
Should return 200 status (no errors)

### Check 2: Check Browser Console
- F12 → Console tab
- Look for red errors
- Share the error message if present

### Check 3: Try Different Browser
- Try Chrome, Firefox, or Edge
- See if issue persists

### Check 4: Hard Refresh Cache
- Press **Ctrl+Shift+R** (or Cmd+Shift+R on Mac)
- Clears browser cache and reloads

---

## After You've Cleared Storage

| Next Step | Expected Behavior |
|-----------|-------------------|
| Login | ✅ Token stored with tokenManager |
| Use app | ✅ Works normally |
| After 23h 45m | ⚠️ Warning shown |
| After 24h | Auto-logout to login |

---

## FAQ

**Q: Will I lose my chat history?**  
A: No, all chats are saved on the server.

**Q: Do I need to clear storage again?**  
A: No, just once. Token manager handles refreshes automatically.

**Q: Why old token causes 500 error?**  
A: Expired JWT tokens get rejected by backend, causing auth failure.

**Q: How long does fresh token last?**  
A: 24 hours from login time.

---

## Success Indicators

After clearing and logging in again, you should see:
- ✅ Messages send successfully
- ✅ No HTTP 500 errors
- ✅ Chat responses appear normally
- ✅ Dashboard loads correctly
- ⚠️ Warning appears at 5 minutes before expiry (after 23h 45m)

---

**Status**: Ready to implement!

**Difficulty**: ⭐ Easy (2 min task)

Let me know once you've done this and the app should work perfectly! 🚀
