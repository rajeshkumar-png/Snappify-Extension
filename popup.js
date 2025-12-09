    document.getElementById("start").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "open-sidebar" });
        chrome.tabs.sendMessage(tabs[0].id, { type: "start" });
    });
    });

    document.getElementById("stop").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: "stop" });
    });
    });

    document.getElementById("export").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "export-steps" });
    });

    document.getElementById("openPanel").addEventListener("click", () => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
});

