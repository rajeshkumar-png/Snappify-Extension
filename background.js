let isRecording = false;
let steps = [];

// Restore previous steps on startup (optional)
chrome.storage.local.get(["steps"], (res) => {
  steps = res.steps || [];
});

// Allow the side panel to open on action click
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Start capture from panel
  if (msg.type === "start-capture") {
    isRecording = true;

    // Clear previous steps to start fresh
    steps = [];
    chrome.storage.local.set({ steps });

    // Find the FIRST non-extension tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];

      // If user is inside the panel, reject
      if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("chrome-extension://")) {
        console.warn("Snappify: Cannot record on this page.");
        alert("Cannot record on internal browser pages. Please open a website.");
        return;
      }

      try {
        chrome.tabs.sendMessage(tab.id, { type: "enable-recording" }).catch(err => {
          console.log("Could not send enable-recording (content script may not be ready):", err);
        });
      } catch (e) {
        console.error(e);
      }
    });

    return;
  }


  // Stop capture from panel
  if (msg.type === "stop-capture") {
    isRecording = false;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        try {
          chrome.tabs.sendMessage(tabs[0].id, { type: "disable-recording" }).catch(() => { });
        } catch (e) { /* ignore */ }
      }
    });

    // Always open preview page
    chrome.tabs.create({
      url: chrome.runtime.getURL("preview.html")
    });

    return;
  }

  // Content script asks for a tab screenshot
  if (msg.type === "request-tab-screenshot" && isRecording) {
    // Service Workers need explicit windowId for captureVisibleTab
    const windowId = sender.tab ? sender.tab.windowId : null;
    const tabId = sender.tab ? sender.tab.id : null;

    if (!windowId || !tabId) {
      return;
    }

    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        // Silently ignore - likely tab was closed or navigated
        return;
      }

      // Verify tab still exists before sending
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          // Tab no longer exists - silently ignore
          return;
        }

        // Send screenshot back - if it fails, the content script is gone (expected behavior)
        chrome.tabs.sendMessage(tabId, {
          type: "screenshot-ready",
          screenshot: dataUrl
        }).catch(() => {
          // Silently ignore - content script context was invalidated
          // This is normal for SPAs or fast navigation
        });
      });
    });
    return;
  }

  // Final step (screenshot + description) coming from content.js
  if (msg.type === "snappify-step" && msg.step) {
    console.log("Background: Received step:", msg.step.description);
    steps.push(msg.step);
    chrome.storage.local.set({ steps }, () => {
      console.log("Background: Saved", steps.length, "steps to storage");
    });
    return;
  }

  // Preview page requesting steps
  if (msg.type === "get-steps") {
    sendResponse(steps);
    // Do NOT return true; sendResponse is synchronous here.
    return false;
  }

  // Default: close channel
  return false;
});
