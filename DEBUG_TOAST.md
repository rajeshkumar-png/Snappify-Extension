# 🐛 Debugging Guide - Toast Message Issue

## Steps to Debug and Test

### 1️⃣ **Reload the Extension**
```
1. Go to chrome://extensions/
2. Find "Snappify"
3. Click the reload icon (🔄)
```

### 2️⃣ **Open Browser Console**
Before testing, open the browser console to see logs:
```
1. Press F12 or right-click → Inspect
2. Go to the "Console" tab
3. Keep it open while testing
```

### 3️⃣ **Test the Toast**
```
1. Navigate to ANY regular website (e.g., google.com, github.com)
   - NOT chrome:// pages
   - NOT extension pages
   
2. Click the Snappify icon → Open side panel

3. Click "Start Capture" button

4. Watch the CONSOLE for these messages:
   ✅ "Snappify: Message received: enable-recording"
   ✅ "Snappify: Starting recording..."
   ✅ "Snappify: showToast() called"
   ✅ "Snappify: Selected toast message: [message text]"
   ✅ "Snappify: Added toast styles"
   ✅ "Snappify: Toast appended to body - [message text]"

5. Look at the CENTER of the WEBPAGE (not the panel)
   - You should see a big green toast message!
```

---

## 🔍 What to Check in Console

### ✅ **Success Messages**
If you see these, the toast should be working:
```
Snappify: showToast() called
Snappify: Selected toast message: Lights, Camera, Action!
Snappify: Toast appended to body - Lights, Camera, Action!
```

### ❌ **Error Messages**
If you see these, there's a problem:

**Error: "document.body not ready yet"**
- Solution: The setTimeout(100ms) should fix this
- Try increasing the delay if needed

**Error: "Failed to show toast"**
- Look at the full error message
- There might be a JavaScript error

**No messages at all**
- Content script might not be loaded
- Try reloading the extension
- Make sure you're on a regular website

---

## 🧪 Test on These Websites

✅ **Good websites to test:**
- google.com
- github.com
- wikipedia.org
- youtube.com
- Any regular website

❌ **Won't work on:**
- chrome://extensions/
- chrome://settings/
- edge://
- Extension pages

---

## 🔧 Quick Fixes

### Fix 1: Increase Delay
If toast doesn't show, increase the setTimeout delay:

In `content.js` line ~157, change:
```javascript
setTimeout(() => {
  showToast();
}, 100);  // Try 500 instead
```

### Fix 2: Check if Content Script is Loaded
In console, type:
```javascript
console.log("Content script loaded");
```
If you see it, content script is working.

### Fix 3: Manually Test Toast
In console, type:
```javascript
showToast();
```
If this shows the toast, the function works but timing might be off.

---

## 📊 Expected Behavior

### Timeline:
```
0ms   → Click "Start Capture" in panel
0ms   → Panel sends "start-capture" to background
10ms  → Background sends "enable-recording" to content script
20ms  → Content script receives message
120ms → showToast() is called (after 100ms delay)
130ms → Toast appears on webpage
3000ms→ Toast fades out
3400ms→ Toast removed from DOM
```

---

## 🎯 Visual Check

The toast should:
- ✅ Appear in the CENTER of the webpage
- ✅ Have a GREEN gradient background
- ✅ Show an EMOJI icon + text
- ✅ BOUNCE in with animation
- ✅ Icon ROTATES
- ✅ Stay for 3 seconds
- ✅ FADE out smoothly

Size:
- Padding: 24px × 40px
- Font: 20px
- Icon: 32px
- Prominent shadow

---

## 📝 Quick Test Script

Copy this into the browser console (on a regular webpage):
```javascript
// Test if toast function exists
if (typeof showToast === 'function') {
  console.log("✅ showToast function exists");
  showToast();
} else {
  console.log("❌ showToast function NOT found - content script not loaded");
}
```

---

## 💡 Tips

1. **Reload extension** after ANY code change
2. **Refresh the webpage** you're testing on
3. **Check console** for errors
4. **Test on multiple websites** to rule out site-specific issues
5. **Make sure side panel is open** when clicking Start

---

Let me know what you see in the console!
