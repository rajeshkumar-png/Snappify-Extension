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
        <button class="delete-btn" title="Delete" data-id="${item.id}">🗑️</button>
      `;

      // Click event for the item (load history)
      historyItem.addEventListener("click", (e) => {
        // Don't trigger if delete button was clicked
        if (e.target.closest(".delete-btn")) return;

        chrome.runtime.sendMessage({ type: "load-history", id: item.id }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Error loading history item:', chrome.runtime.lastError.message);
          }
        });
      });

      // Click event for delete button
      const deleteBtn = historyItem.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // prevent item click
        chrome.runtime.sendMessage({ type: "delete-history", id: item.id }, (res) => {
          if (chrome.runtime.lastError) {
            console.log('Error deleting history:', chrome.runtime.lastError.message);
            return;
          }
          if (res && res.success) {
            renderHistory(res.history);
          }
        });
      });

      historyList.appendChild(historyItem);
    });
  }

  startBtn.addEventListener("click", () => {
    console.log("Panel: Start button clicked");

    chrome.runtime.sendMessage({ type: "start-capture" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Error starting capture:', chrome.runtime.lastError.message);
        return;
      }
      console.log("Panel: Message sent to background");
    });

    // Valid UI transition: Hide history, Show live preview
    if (historySection) historySection.style.display = "none";
    livePreviewSection.style.display = "block";

    // Reset preview
    capturedSteps = 0;
    screenshotsContainer.innerHTML = "";
    stepCounter.textContent = "0";

    startBtn.style.display = "none";
    stopBtn.style.display = "block";
  });

  stopBtn.addEventListener("click", () => {
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

  function addScreenshotToPreview(step) {
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
    meta.textContent = `Step ${capturedSteps}`;

    screenshotItem.appendChild(img);
    screenshotItem.appendChild(description);
    screenshotItem.appendChild(meta);

    screenshotsContainer.appendChild(screenshotItem);

    // Auto scroll to bottom
    screenshotsContainer.scrollTop = screenshotsContainer.scrollHeight;
  }

});
