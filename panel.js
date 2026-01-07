document.addEventListener("DOMContentLoaded", () => {
  // ====== MAIN APP FUNCTIONALITY ======
  const startBtn = document.getElementById("start");
  const stopBtn = document.getElementById("stop");
  const closeBtn = document.getElementById("closeBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const livePreviewSection = document.getElementById("live-preview-section");
  const screenshotsContainer = document.getElementById("screenshots-container");
  const stepCounter = document.getElementById("step-counter");
  const historySection = document.getElementById("history-section");
  const historyList = document.getElementById("history-list");

  if (!startBtn || !stopBtn || !closeBtn || !settingsBtn) {
    console.error("One or more buttons not found in panel.html");
    return;
  }

  let capturedSteps = 0;
  let initialStepsWhenContinuing = 0; // Track initial count when continuing

  // Load history on startup
  loadHistory();

  function loadHistory() {
    chrome.runtime.sendMessage({ type: "get-history" }, (history) => {
      if (chrome.runtime.lastError) {
        console.log('Error loading history:', chrome.runtime.lastError.message);
        renderHistory([]);
        return;
      }
      renderHistory(history || []);
    });
  }

  function renderHistory(history) {
    if (!historyList) return;
    historyList.innerHTML = "";

    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state" style="text-align:center; padding: 20px; color: #6b7280; font-size: 13px;">
          No recorded history yet.
        </div>
      `;
      return;
    }

    // Sort history by ID (timestamp) in descending order - newest first
    const sortedHistory = [...history].sort((a, b) => b.id - a.id);

    // Show only last 4 items
    const recentHistory = sortedHistory.slice(0, 4);

    recentHistory.forEach(item => {
      const historyItem = document.createElement("div");
      historyItem.className = "history-item";

      // Smart date formatting
      const itemDate = new Date(item.id);
      const now = new Date();
      const time = itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Calculate if it's today, yesterday, or older
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

      let dateDisplay;
      if (itemDay.getTime() === today.getTime()) {
        dateDisplay = "Today";
      } else if (itemDay.getTime() === yesterday.getTime()) {
        dateDisplay = "Yesterday";
      } else {
        // Show formatted date like "Dec 15" or full date if older
        dateDisplay = itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      historyItem.innerHTML = `
        <div class="history-icon">📄</div>
        <div class="history-info">
          <div class="history-title">${item.title || "Untitled Workflow"}</div>
          <div class="history-meta">
            <span>${dateDisplay}</span>
            <span>•</span>
            <span>${time}</span>
            <span>•</span>
            <span>${item.stepCount || 0} screenshots</span>
          </div>
        </div>
        <button class="continue-btn" title="Continue Recording" data-id="${item.id}">🎥</button>
        <button class="delete-btn" title="Delete" data-id="${item.id}">🗑️</button>
      `;

      // Click event for the item (load history)
      historyItem.addEventListener("click", (e) => {
        // Don't trigger if any button was clicked
        if (e.target.closest(".delete-btn") || e.target.closest(".continue-btn")) return;

        chrome.runtime.sendMessage({ type: "load-history", id: item.id }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Error loading history item:', chrome.runtime.lastError.message);
          }
        });
      });

      // Click event for continue button
      const continueBtn = historyItem.querySelector(".continue-btn");
      continueBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // prevent item click

        console.log("Continue recording for history item:", item.id);

        // Send message to background to continue this recording
        chrome.runtime.sendMessage({
          type: "continue-recording",
          historyId: item.id
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Error continuing recording:', chrome.runtime.lastError.message);
            return;
          }

          if (!response || !response.success) {
            console.log('Failed to continue recording');
            return;
          }

          console.log('Continue recording response:', response);

          // Switch to recording mode UI
          if (historySection) historySection.style.display = "none";
          livePreviewSection.style.display = "block";
          startBtn.style.display = "none";
          stopBtn.style.display = "block";

          // Clear existing preview content
          screenshotsContainer.innerHTML = "";

          // Track initial count and current count
          capturedSteps = item.stepCount || 0;
          initialStepsWhenContinuing = capturedSteps;
          stepCounter.textContent = capturedSteps.toString();

          // Load existing screenshots into preview
          if (item.steps && item.steps.length > 0) {
            console.log(`Loading ${item.steps.length} existing screenshots into preview`);
            item.steps.forEach((step, index) => {
              addScreenshotToPreview(step, index + 1);
            });
          }
        });
      });

      // Click event for delete button
      const deleteBtn = historyItem.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // prevent item click

        // Show confirmation modal
        showDeleteConfirmation(item.id, item.title || "this workflow");
      });

      historyList.appendChild(historyItem);
    });
  }

  startBtn.addEventListener("click", () => {
    console.log("Panel: Start button clicked");

    chrome.runtime.sendMessage({ type: "start-capture" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Error starting capture:', chrome.runtime.lastError.message);
        showErrorToast("⚠️ Failed to start recording. Please try again.");
        return;
      }

      // Check if recording failed to start
      if (response && !response.success) {
        console.log("Panel: Failed to start recording:", response.error);
        showErrorToast(response.error || "⚠️ Failed to start recording. Please try again.");
        return;
      }

      console.log("Panel: Message sent to background");
    });

    // Valid UI transition: Hide history, Show live preview
    if (historySection) historySection.style.display = "none";
    livePreviewSection.style.display = "block";

    // Reset preview
    capturedSteps = 0;
    initialStepsWhenContinuing = 0; // Reset tracking for new recording
    screenshotsContainer.innerHTML = "";
    stepCounter.textContent = "0";

    startBtn.style.display = "none";
    stopBtn.style.display = "block";
  });

  stopBtn.addEventListener("click", () => {
    // Check if any steps were captured (or new steps when continuing)
    const noNewSteps = (initialStepsWhenContinuing > 0 && capturedSteps === initialStepsWhenContinuing) || capturedSteps === 0;

    if (noNewSteps) {
      // Send message to web page to show error toast
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "show-error-toast",
            message: "⚠️ No screenshots captured! Please capture at least one step before stopping."
          }).catch(() => {
            // If content script not available, log error
            console.log('Could not show error toast on web page');
          });
        }
      });

      // Reset UI to initial state
      if (historySection) historySection.style.display = "block";
      livePreviewSection.style.display = "none";
      stopBtn.style.display = "none";
      startBtn.style.display = "block";

      // Send stop message to background to reset recording state
      chrome.runtime.sendMessage({ type: "stop-capture-no-steps" }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Error stopping capture:', chrome.runtime.lastError.message);
        }
      });

      // Reset tracking
      initialStepsWhenContinuing = 0;

      return; // Don't proceed further
    }

    // Normal flow - steps were captured
    chrome.runtime.sendMessage({ type: "stop-capture" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Error stopping capture:', chrome.runtime.lastError.message);
      }
    });

    // Transition back to initial state (after short delay or immediately)
    // We just stopped, so we should see history again (with new item)
    if (historySection) historySection.style.display = "block";
    livePreviewSection.style.display = "none";

    stopBtn.style.display = "none";
    startBtn.style.display = "block";

    // Reset tracking
    initialStepsWhenContinuing = 0;

    // Reload history to show the new item
    setTimeout(loadHistory, 500);
  });

  closeBtn.addEventListener("click", () => {
    window.close();
  });

  settingsBtn.addEventListener("click", () => {
    alert("Settings feature coming soon!");
  });


  // Listen for new steps from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "new-step-captured") {
      capturedSteps++;
      addScreenshotToPreview(msg.step);
      stepCounter.textContent = capturedSteps.toString();
    }
  });

  function addScreenshotToPreview(step, stepNumber) {
    const screenshotItem = document.createElement("div");
    screenshotItem.className = "screenshot-item";

    const img = document.createElement("img");
    img.src = step.screenshot;
    img.alt = step.description;

    const description = document.createElement("div");
    description.className = "screenshot-description";
    description.textContent = step.description;

    const meta = document.createElement("div");
    meta.className = "screenshot-meta";
    // Use provided stepNumber or current capturedSteps count
    meta.textContent = `Step ${stepNumber || capturedSteps}`;

    screenshotItem.appendChild(description);
    screenshotItem.appendChild(img);
    screenshotItem.appendChild(meta);

    screenshotsContainer.appendChild(screenshotItem);

    // Auto scroll to bottom
    screenshotsContainer.scrollTop = screenshotsContainer.scrollHeight;
  }

  // Error Toast Notification Function
  function showErrorToast(message) {
    // Create or get toast container
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast error-toast';

    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-simple-message">
          ${message}
          <button class="toast-close-simple" onclick="this.closest('.toast').remove()">✕</button>
        </div>
      </div>
    `;

    toastContainer.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (toast && toast.parentElement) {
        toast.classList.add('fade-out');
        setTimeout(() => {
          if (toast && toast.parentElement) {
            toast.remove();
          }
        }, 300);
      }
    }, 4000);
  }

});

// Show delete confirmation modal
function showDeleteConfirmation(itemId, itemTitle) {
  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'delete-modal-overlay';

  modal.innerHTML = `
    <div class="delete-modal">
      <div class="delete-modal-icon">⚠️</div>
      <h3 class="delete-modal-title">Delete Workflow?</h3>
      <p class="delete-modal-message">
        Are you sure you want to delete "<strong>${itemTitle}</strong>"?<br>
        This action cannot be undone.
      </p>
      <div class="delete-modal-buttons">
        <button class="modal-btn modal-btn-cancel" id="delete-cancel">No, Cancel</button>
        <button class="modal-btn modal-btn-delete" id="delete-confirm">Yes, Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  const cancelBtn = modal.querySelector('#delete-cancel');
  const confirmBtn = modal.querySelector('#delete-confirm');

  // Cancel button - just close modal
  cancelBtn.addEventListener('click', () => {
    modal.classList.add('fade-out');
    setTimeout(() => {
      if (modal.parentElement) {
        modal.remove();
      }
    }, 200);
  });

  // Confirm button - delete item and close modal
  confirmBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: "delete-history", id: itemId }, (res) => {
      if (chrome.runtime.lastError) {
        console.log('Error deleting history:', chrome.runtime.lastError.message);
        return;
      }
      if (res && res.success) {
        // Close modal first
        modal.classList.add('fade-out');
        setTimeout(() => {
          if (modal.parentElement) {
            modal.remove();
          }
        }, 200);

        // Then update history display
        const renderHistory = window.renderHistory;
        if (renderHistory && res.history) {
          renderHistory(res.history);
        } else {
          // Reload the page if render function not available
          location.reload();
        }
      }
    });
  });

  // Click outside to cancel
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      cancelBtn.click();
    }
  });
}
