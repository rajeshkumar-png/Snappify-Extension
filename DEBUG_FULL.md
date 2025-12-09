# 🔍 Debug Toast - With Full Logging

## 🎯 NEW LOGGING ADDED

I've added detailed console logging at every step. Now you'll be able to see EXACTLY where the message flow breaks.

---

## 📋 **Step-by-Step Testing**

### **1. Reload Extension**
```
chrome://extensions/ → Find Snappify → Click Reload 🔄
```

### **2. Open THREE Console Windows**

You need to check THREE different consoles:

#### **Console 1: Background Service Worker**
```
1. Go to chrome://extensions/
2. Find "Snappify"
3. Click "service worker" link (under "Inspect views")
4. This opens the background script console
```

#### **Console 2: Side Panel**
```
1. Open the Snappify side panel
2. Right-click inside the panel
3. Click "Inspect"
4. Go to Console tab
```

#### **Console 3: Active Webpage**
```
1. Navigate to a regular website (e.g., google.com)
2. Press F12
3. Go to Console tab
```

---

## 🧪 **Test Flow**

### **Step 1: Click "Start Capture"**

### **Step 2: Check Each Console**

#### **Expected in Panel Console:**
```javascript
✅ Panel: Start button clicked
✅ Panel: Message sent to background
```

#### **Expected in Background Console:**
```javascript
✅ Background: Received message: start-capture
✅ Background: Processing start-capture request
✅ Background: Found tabs: 1
✅ Background: Active tab: [tab-id] [url]
✅ Background: Sending enable-recording to tab [tab-id]
✅ Background: Successfully sent enable-recording message
```

#### **Expected in Webpage Console:**
```javascript
✅ Snappify: Message received: enable-recording
✅ Snappify: Starting recording...
✅ Snappify: showToast() called
✅ Snappify: Selected toast message: [message]
✅ Snappify: Added toast styles
✅ Snappify: Toast appended to body - [message]
```

---

## 🚨 **Troubleshooting Based on Console**

### **Scenario 1: Nothing in Panel Console**
❌ **Issue**: Button click not working
✅ **Fix**: Check if button exists, reload extension

### **Scenario 2: Panel logs but NO Background logs**
❌ **Issue**: Message not reaching background
✅ **Fix**: Background service worker might be inactive
- Go to chrome://extensions/
- Click "service worker" again to wake it up

### **Scenario 3: Panel + Background logs but NO Webpage logs**
❌ **Issue**: Content script not loaded or wrong tab
✅ **Fix**: 
- Make sure you're on a REGULAR website (not chrome://)
- Refresh the webpage
- Check if content script is injected

### **Scenario 4: All logs but "document.body not ready"**
❌ **Issue**: Toast called too early
✅ **Fix**: Increase setTimeout in content.js line 157 to 500ms

### **Scenario 5: All logs but NO TOAST VISIBLE**
❌ **Issue**: Toast created but not visible
✅ **Fix**: Check z-index conflicts, try inspecting DOM

---

## 🔧 **Quick DOM Check**

If you see all logs but no toast, check the DOM:

In Webpage Console, type:
```javascript
document.getElementById('snappify-toast')
```

**If it returns an element**: Toast exists but invisible
- Check CSS, z-index, display property

**If it returns null**: Toast not created
- Check for JavaScript errors

---

## 📊 **Visual Flow Diagram**

```
Panel (Side Panel)
  │
  │ Click "Start Capture"
  ▼
  │ chrome.runtime.sendMessage({ type: "start-capture" })
  │
  ▼
Background (Service Worker)
  │
  │ Receives "start-capture"
  │ Queries active tab
  ▼
  │ chrome.tabs.sendMessage(tabId, { type: "enable-recording" })
  │
  ▼
Content Script (Webpage)
  │
  │ Receives "enable-recording"
  │ Calls showToast() after 100ms
  ▼
  │ Creates toast element
  │ Appends to document.body
  ▼
Toast appears on webpage! 🎉
```

---

## 🎯 **What to Tell Me**

After testing, please share:

1. **What you see in PANEL console**
2. **What you see in BACKGROUND console**
3. **What you see in WEBPAGE console**
4. **Which website you tested on**
5. **Did the toast appear?**

This will help me pinpoint EXACTLY where it's failing!

---

## ⚡ **Quick Test Commands**

### In Webpage Console:
```javascript
// 1. Check if content script loaded
console.log("Content script test");

// 2. Check if toast function exists
typeof showToast

// 3. Manually trigger toast (if function exists)
// Note: showToast is in a closure, might not be accessible

// 4. Check if toast element exists in DOM
document.getElementById('snappify-toast')

// 5. Create a test toast manually
document.body.innerHTML += '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#10b981;color:white;padding:24px 40px;border-radius:20px;font-size:20px;z-index:2147483646;display:flex;gap:16px;">🎬 <span>Test Toast!</span></div>';
```

---

Let's debug this together! 🔍
