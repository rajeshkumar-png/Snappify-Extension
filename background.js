let isRecording = false;
let steps = [];
let continuingHistoryId = null; // Track which history item we're continuing
let isNewRecording = false; // Track if this is a new recording (not continuation)

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
    isNewRecording = true; // This is a NEW recording

    // Clear previous steps to start fresh
    steps = [];
    chrome.storage.local.set({ steps });

    // Find the FIRST non-extension tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log("Background: Found tabs:", tabs.length);

      if (!tabs || tabs.length === 0) {
        console.error("Background: No active tab found");
        sendResponse({ success: false, error: "No active tab found" });
        return;
      }

      const tab = tabs[0];
      console.log("Background: Active tab:", tab.id, tab.url);

      // If user is inside the panel, reject
      if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("chrome-extension://")) {
        console.error("Snappify: Cannot record on internal browser pages. Please open a website.");
        isRecording = false; // Reset recording state
        isNewRecording = false; // Reset flag
        sendResponse({ success: false, error: "Cannot record on internal browser pages. Please navigate to a regular website first." });
        return;
      }

      console.log("Background: Attempting to send message to tab", tab.id);

      // Try to send message to content script with captureInitial flag
      chrome.tabs.sendMessage(tab.id, {
        type: "enable-recording",
        captureInitial: true // Signal to capture initial screenshot
      })
        .then(() => {
          console.log("Background: Successfully sent enable-recording message");
          sendResponse({ success: true });
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
                chrome.tabs.sendMessage(tab.id, {
                  type: "enable-recording",
                  captureInitial: isNewRecording // Pass the flag after injection too
                })
                  .then(() => {
                    console.log("Background: Message sent after injection");
                    sendResponse({ success: true });
                  })
                  .catch(err2 => {
                    console.error("Background: Still failed after injection:", err2);
                    console.error("Failed to start recording. Please refresh the page and try again.");
                    isRecording = false;
                    isNewRecording = false; // Reset flag on failure
                    sendResponse({ success: false, error: "Failed to start recording. Please refresh the page and try again." });
                  });
              }, 200);
            })
            .catch(injectErr => {
              console.error("Background: Failed to inject content script:", injectErr);
              console.error("Failed to start recording. Please refresh the page and try again.");
              isRecording = false;
              isNewRecording = false; // Reset flag on injection failure
              sendResponse({ success: false, error: "Failed to start recording. Please refresh the page and try again." });
            });
        });
    });

    return true; // Keep the message channel open for async response
  }

  // Continue recording from existing history item
  if (msg.type === "continue-recording") {
    console.log("Background: Continue recording for history ID:", msg.historyId);

    // Load the history item's steps
    chrome.storage.local.get(["history"], (res) => {
      const history = res.history || [];
      const historyItem = history.find(item => item.id === msg.historyId);

      if (historyItem) {
        // Load existing steps
        steps = [...historyItem.steps];
        continuingHistoryId = msg.historyId;
        isRecording = true;

        console.log(`Background: Loaded ${steps.length} existing steps, continuing recording`);

        // Find and enable recording on active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || tabs.length === 0) {
            console.error("Background: No active tab found");
            sendResponse({ success: false });
            return;
          }

          const tab = tabs[0];

          if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("chrome-extension://")) {
            console.warn("Cannot record on this page.");
            sendResponse({ success: false });
            return;
          }

          // Enable recording on the tab
          chrome.tabs.sendMessage(tab.id, { type: "enable-recording" })
            .then(() => {
              console.log("Background: Successfully enabled recording for continuation");
              sendResponse({ success: true });
            })
            .catch(err => {
              // Try to inject content script if not loaded
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
              })
                .then(() => {
                  setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, { type: "enable-recording" })
                      .then(() => sendResponse({ success: true }))
                      .catch(err2 => {
                        console.error("Background: Failed after injection:", err2);
                        sendResponse({ success: false });
                      });
                  }, 200);
                })
                .catch(injectErr => {
                  console.error("Background: Failed to inject:", injectErr);
                  sendResponse({ success: false });
                });
            });
        });
      } else {
        console.error("Background: History item not found");
        sendResponse({ success: false });
      }
    });

    return true; // async response
  }



  // NEW: Start replay - create new tab and execute steps
  if (msg.type === "start-replay") {
    console.log("🎬 Background: Starting replay with", msg.steps.length, "steps");
    console.log("First step:", msg.steps[0]?.description);

    // Extract starting URL from first step (should be "Navigate to ...")
    let startingUrl = null;
    const firstStep = msg.steps[0];
    if (firstStep && firstStep.description) {
      const match = firstStep.description.match(/Navigate to "([^"]+)"/);
      if (match) {
        startingUrl = match[1];
        console.log("✅ Extracted starting URL:", startingUrl);
      }
    }

    // If no URL found in first step, can't replay
    if (!startingUrl) {
      console.error("❌ No starting URL found in first step");
      sendResponse({ success: false, error: "First step must be a navigation step with URL" });
      return true;
    }

    // Create a new tab with the starting URL
    console.log("🌐 Creating new tab with URL:", startingUrl);
    chrome.tabs.create({ url: startingUrl, active: true }, (newTab) => {
      console.log("✅ New tab created:", newTab.id);

      // Wait for the page to load
      const checkTabLoaded = (tabId, changeInfo, tab) => {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          console.log("✅ Page loaded, removing listener");
          chrome.tabs.onUpdated.removeListener(checkTabLoaded);

          // Small delay to ensure page is fully rendered
          setTimeout(() => {
            console.log("🎬 Injecting replay engine...");

            // Inject replay engine script
            chrome.scripting.executeScript({
              target: { tabId: newTab.id },
              files: ['replay-engine.js']
            })
              .then(() => {
                console.log("✅ Replay engine injected successfully");

                // Wait longer for script to initialize
                setTimeout(() => {
                  console.log("📤 Sending steps to replay engine...");
                  console.log("📊 Total steps to send:", msg.steps.length);
                  console.log("📊 Steps after skipping first:", msg.steps.slice(1).length);

                  // Send steps to replay engine (skip first step since we already navigated)
                  chrome.tabs.sendMessage(newTab.id, {
                    type: 'execute-replay',
                    steps: msg.steps.slice(1) // Skip the "Navigate to" step
                  })
                    .then(() => {
                      console.log("✅ Replay started successfully in new tab");
                      sendResponse({ success: true });
                    })
                    .catch(err => {
                      console.error("❌ Failed to start replay:", err);
                      sendResponse({ success: false, error: `Failed to start replay: ${err.message}` });
                    });
                }, 800); // Increased delay for script initialization
              })
              .catch(err => {
                console.error("❌ Failed to inject replay engine:", err);
                sendResponse({ success: false, error: `Failed to inject: ${err.message}` });
              });
          }, 1500); // Increased delay for page rendering
        }
      };

      // Listen for tab to finish loading
      chrome.tabs.onUpdated.addListener(checkTabLoaded);
    });

    return true; // async response
  }

  // Stop capture with no steps - don't open preview
  if (msg.type === "stop-capture-no-steps") {
    isRecording = false;
    continuingHistoryId = null; // Reset continuation tracking

    // Just disable recording, don't save to history or open preview
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        try {
          chrome.tabs.sendMessage(tabs[0].id, { type: "disable-recording" }).catch(() => { });
        } catch (e) { /* ignore */ }
      }
    });

    sendResponse({ success: true });
    return false;
  }

  // Stop capture from panel
  if (msg.type === "stop-capture") {
    isRecording = false;

    // Save to history before stopping
    if (steps.length > 0) {
      chrome.storage.local.get(["history"], (res) => {
        let history = res.history || [];

        if (continuingHistoryId) {
          // Update existing history item
          console.log("Background: Updating existing history item:", continuingHistoryId);
          const itemIndex = history.findIndex(item => item.id === continuingHistoryId);

          if (itemIndex !== -1) {
            // Update the existing item
            history[itemIndex] = {
              ...history[itemIndex],
              steps: [...steps],
              stepCount: steps.length,
              date: new Date().toLocaleString() // Update timestamp
            };

            console.log(`Background: Updated history item with ${steps.length} total steps`);
          } else {
            console.error("Background: Could not find history item to update");
          }

          // Reset continuation tracking
          continuingHistoryId = null;
        } else {
          // Create new history item (normal flow)
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

          console.log("Background: Created new history item");
        }

        chrome.storage.local.set({ history });
        console.log("Background: Saved to history", history);
      });
    } else {
      // Reset continuation tracking even if no steps
      continuingHistoryId = null;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        try {
          chrome.tabs.sendMessage(tabs[0].id, { type: "disable-recording" }).catch(() => { });
        } catch (e) { /* ignore */ }
      }
    });

    // Always open preview when user stops recording
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
