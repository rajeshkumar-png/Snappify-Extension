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
  console.log("Background: Received message:", msg.type);

  // Start capture from panel
  if (msg.type === "start-capture") {
    console.log("Background: Processing start-capture request");
    isRecording = true;

    // Clear previous steps to start fresh
    steps = [];
    chrome.storage.local.set({ steps });

    // Find the FIRST non-extension tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log("Background: Found tabs:", tabs.length);

      if (!tabs || tabs.length === 0) {
        console.error("Background: No active tab found");
        return;
      }

      const tab = tabs[0];
      console.log("Background: Active tab:", tab.id, tab.url);

      // If user is inside the panel, reject
      if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("chrome-extension://")) {
        console.warn("Snappify: Cannot record on this page.");
        alert("Cannot record on internal browser pages. Please open a website.");
        return;
      }

      console.log("Background: Attempting to send message to tab", tab.id);

      // Try to send message to content script
      chrome.tabs.sendMessage(tab.id, { type: "enable-recording" })
        .then(() => {
          console.log("Background: Successfully sent enable-recording message");
        })
        .catch(err => {
          // Check if it's the expected "no content script" error
          if (err.message && err.message.includes("Receiving end does not exist")) {
            console.log("Background: Content script not active. Injecting now...");
          } else {
            // Real error
            console.error("Background: Failed to send enable-recording:", err);
          }

          // Content script not loaded - try to inject it
          console.log("Background: Attempting to inject content script...");

          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          })
            .then(() => {
              console.log("Background: Content script injected successfully");

              // Wait a bit for script to initialize, then try again
              setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { type: "enable-recording" })
                  .then(() => {
                    console.log("Background: Message sent after injection");
                  })
                  .catch(err2 => {
                    console.error("Background: Still failed after injection:", err2);
                    alert("Failed to start recording. Please refresh the page and try again.");
                  });
              }, 200);
            })
            .catch(injectErr => {
              console.error("Background: Failed to inject content script:", injectErr);
              alert("Failed to start recording. Please refresh the page and try again.");
            });
        });
    });

    return;
  }


  // Stop capture from panel
  if (msg.type === "stop-capture") {
    isRecording = false;

    // Save to history before stopping
    if (steps.length > 0) {
      chrome.storage.local.get(["history"], (res) => {
        const history = res.history || [];
        const newHistoryItem = {
          id: Date.now(),
          date: new Date().toLocaleString(),
          steps: [...steps], // copy steps
          stepCount: steps.length,
          title: `Workflow ${new Date().toLocaleTimeString()}`
        };

        // Add to beginning
        history.unshift(newHistoryItem);

        // Keep only last 10 items
        if (history.length > 10) {
          history.length = 10;
        }

        chrome.storage.local.set({ history });
        console.log("Background: Saved to history", history);
      });
    }

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

    // Notify the panel about the new step for live preview
    chrome.runtime.sendMessage({
      type: "new-step-captured",
      step: msg.step
    }).catch(() => {
      // Panel might not be open, silently ignore
    });

    return;
  }

  // Preview page requesting steps
  if (msg.type === "get-steps") {
    sendResponse(steps);
    // Do NOT return true; sendResponse is synchronous here.
    return false;
  }

  // Get history
  if (msg.type === "get-history") {
    chrome.storage.local.get(["history"], (res) => {
      sendResponse(res.history || []);
    });
    return true; // async response
  }

  // Delete history item
  if (msg.type === "delete-history") {
    const idToDelete = msg.id;
    chrome.storage.local.get(["history"], (res) => {
      let history = res.history || [];
      history = history.filter(item => item.id !== idToDelete);
      chrome.storage.local.set({ history }, () => {
        sendResponse({ success: true, history });
      });
    });
    return true; // async response
  }

  // Load history item (restore as current steps)
  if (msg.type === "load-history") {
    const idToLoad = msg.id;
    chrome.storage.local.get(["history"], (res) => {
      const history = res.history || [];
      const item = history.find(i => i.id === idToLoad);
      if (item) {
        steps = [...item.steps];
        chrome.storage.local.set({ steps }, () => {
          chrome.tabs.create({
            url: chrome.runtime.getURL("preview.html")
          });
        });
      }
    });
    return;
  }

  // Default: close channel
  return false;
});
