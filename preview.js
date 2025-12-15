let steps = [];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  chrome.runtime.sendMessage({ type: "get-steps" }, (stored) => {
    steps = stored || [];
    render();
  });

  // Update date
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  document.getElementById("created-date").textContent = `Created on ${dateStr}`;

  // Event delegation for dynamically created elements
  document.getElementById("steps-container").addEventListener("input", (e) => {
    if (e.target.classList.contains("step-description")) {
      const index = parseInt(e.target.dataset.index);
      autoSave(index, e.target);
    }
  });

  // Better event delegation - check both target and closest button
  document.getElementById("steps-container").addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
      const index = parseInt(deleteBtn.dataset.index);
      if (!isNaN(index)) {
        deleteStep(index);
      }
    }
  });

  // PDF Export button
  document.getElementById("downloadPdf").addEventListener("click", exportToPDF);
});

function render() {
  const container = document.getElementById("steps-container");
  container.innerHTML = "";
  document.getElementById("step-count").textContent = `${steps.length} steps`;

  if (steps.length === 0) {
    container.innerHTML = '<div class="empty-state">No steps recorded yet. Start a new capture to create your guide.</div>';
    return;
  }

  steps.forEach((step, i) => {
    const el = document.createElement("div");
    el.className = "step-item";
    el.setAttribute("draggable", "true");
    el.setAttribute("data-step-index", i);

    el.innerHTML = `
      <div class="drag-handle" title="Drag to reorder">
        <span>⋮⋮</span>
      </div>
      <div class="step-number">${i + 1}</div>
      <div class="step-content">
        <textarea class="step-description" data-index="${i}" rows="2">${step.description}</textarea>
        <img src="${step.screenshot}" class="step-image" loading="lazy" alt="Step ${i + 1} screenshot">
      </div>
      <div class="step-actions">
        <button class="action-btn edit-btn" data-index="${i}" title="Edit screenshot - add highlights or annotations">
          <span>✏️</span>
          <span>Edit</span>
        </button>
        <button class="action-btn delete-btn" data-index="${i}" title="Delete this step">
          <span>🗑️</span>
          <span>Delete</span>
        </button>
      </div>
    `;

    // Drag and drop event listeners
    el.addEventListener("dragstart", handleDragStart);
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("drop", handleDrop);
    el.addEventListener("dragend", handleDragEnd);
    el.addEventListener("dragenter", handleDragEnter);
    el.addEventListener("dragleave", handleDragLeave);

    container.appendChild(el);
  });

  // Auto-resize textareas
  document.querySelectorAll(".step-description").forEach(tx => {
    autoResizeTextarea(tx);
    tx.addEventListener("input", function () {
      autoResizeTextarea(this);
    });

    // Add text selection detection for enhance tooltip
    tx.addEventListener("mouseup", handleTextSelection);
    tx.addEventListener("keyup", handleTextSelection);
    tx.addEventListener("blur", hideEnhanceTooltip);
  });

  // Add edit button listeners
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.index);
      openEditor(index);
    });
  });
}

// ========== ENHANCE TOOLTIP FUNCTIONALITY ==========

let enhanceTooltip = null;
let currentTextarea = null;
let selectedText = '';
let selectionStart = 0;
let selectionEnd = 0;

function handleTextSelection(e) {
  const textarea = e.target;
  const selection = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);

  console.log('Text selection detected:', {
    selected: selection,
    length: selection.length,
    start: textarea.selectionStart,
    end: textarea.selectionEnd
  });

  if (selection && selection.trim().length > 0) {
    // User has selected text
    selectedText = selection;
    selectionStart = textarea.selectionStart;
    selectionEnd = textarea.selectionEnd;
    currentTextarea = textarea;

    console.log('✅ Showing enhance tooltip for:', selectedText);
    showEnhanceTooltip(e);
  } else {
    // No selection
    console.log('❌ No text selected, hiding tooltip');
    hideEnhanceTooltip();
  }
}

function showEnhanceTooltip(e) {
  if (!enhanceTooltip) {
    enhanceTooltip = document.getElementById('enhance-tooltip');
    if (!enhanceTooltip) {
      console.error('❌ Enhance tooltip element not found!');
      return;
    }
    enhanceTooltip.addEventListener('click', handleEnhanceClick);
    console.log('✅ Enhance tooltip element found and click listener added');
  }

  // Position tooltip above textarea
  const rect = currentTextarea.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  // Calculate position - center above textarea
  const tooltipX = rect.left + scrollLeft + (rect.width / 2) - 75; // Center (tooltip ~150px wide)
  const tooltipY = rect.top + scrollTop - 60; // 60px above textarea

  console.log('Positioning tooltip at:', {
    x: tooltipX,
    y: tooltipY,
    textareaRect: rect
  });

  enhanceTooltip.style.position = 'absolute';
  enhanceTooltip.style.left = tooltipX + 'px';
  enhanceTooltip.style.top = tooltipY + 'px';
  enhanceTooltip.style.display = 'block';
  enhanceTooltip.classList.remove('loading');

  // Update tooltip text
  document.getElementById('enhance-tooltip-text').textContent = 'Enhance with AI';

  console.log('✅ Tooltip displayed at', tooltipX, tooltipY);
}

function hideEnhanceTooltip() {
  if (enhanceTooltip) {
    setTimeout(() => {
      // Delay to allow clicking the tooltip
      if (!enhanceTooltip.matches(':hover')) {
        enhanceTooltip.style.display = 'none';
      }
    }, 200);
  }
}

async function handleEnhanceClick() {
  if (!selectedText || !currentTextarea) return;

  // Show loading state
  enhanceTooltip.classList.add('loading');
  document.getElementById('enhance-tooltip-text').textContent = 'Enhancing...';

  try {
    // Call AI to enhance text
    const enhancedText = await enhanceTextWithAI(selectedText);

    // Replace selected text with enhanced version
    const before = currentTextarea.value.substring(0, selectionStart);
    const after = currentTextarea.value.substring(selectionEnd);
    currentTextarea.value = before + enhancedText + after;

    // Update step in storage
    const index = parseInt(currentTextarea.dataset.index);
    steps[index].description = currentTextarea.value;
    chrome.storage.local.set({ steps });

    // Auto-resize textarea
    autoResizeTextarea(currentTextarea);

    // Hide tooltip
    enhanceTooltip.style.display = 'none';

    // Show success feedback
    showSuccessNotification('✨ Description enhanced!');

  } catch (error) {
    console.error('Enhancement failed:', error);

    // Hide tooltip
    enhanceTooltip.style.display = 'none';

    // Only show error if it's not an API key issue (which shows its own modal)
    if (error.message !== 'API key required' && error.message !== 'Invalid API key') {
      enhanceTooltip.classList.remove('loading');
      document.getElementById('enhance-tooltip-text').textContent = 'Error - Try again';
      setTimeout(() => {
        document.getElementById('enhance-tooltip-text').textContent = 'Enhance with AI';
        enhanceTooltip.classList.remove('loading');
      }, 2000);
    }
  }
}

async function enhanceTextWithAI(text) {
  // Real AI-powered enhancement using Google Gemini API!

  console.log('🤖 Starting AI enhancement for:', text);

  // Get API key from storage (user sets this in extension settings)
  const result = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = result.geminiApiKey;

  console.log('API Key check:', {
    keyExists: !!apiKey,
    keyLength: apiKey?.length,
    keyPreview: apiKey ? apiKey.substring(0, 10) + '...' : 'NONE'
  });

  if (!apiKey) {
    // No API key - show how to get one
    console.log('❌ No API key found, showing prompt');
    showApiKeyPrompt();
    throw new Error('API key required');
  }

  console.log('✅ API key found, calling Gemini API...');

  try {
    // Call Google Gemini AI API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert technical writer specializing in workflow documentation and user guides.

Your task: Improve this workflow step description by fixing spelling/grammar errors and making it professional and clear.

CRITICAL RULES:
1. PRESERVE all quoted UI element names EXACTLY as they appear (e.g., "Email Address", "Save Button", "Country")
2. Keep the description concise (ideally one clear sentence)
3. Use imperative mood (e.g., "Click", "Enter", "Select", not "The user clicks")
4. Maintain the action type (Click, Type, Select, Navigate, etc.)
5. Fix only spelling and grammar - DO NOT change the meaning or add extra information
6. Return ONLY the corrected text, no quotes or explanation

GOOD EXAMPLES:
- "clik email adress feild" → "Click the 'Email Address' field"
- "Type you're name in the name feild" → "Type your name in the 'Name' field"
- "sELECT Country from dropdown" → "Select 'Country' from dropdown"
- "click on the save botton to submit" → "Click the 'Save' button to submit"

Original text: "${text}"

Corrected text:`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Gemini API error:', error);
      console.error('Full error details:', {
        status: response.status,
        statusText: response.statusText,
        message: error.error?.message,
        details: error
      });

      if (response.status === 400 && error.error?.message?.includes('API_KEY')) {
        showApiKeyPrompt();
        throw new Error('Invalid API key');
      }

      if (response.status === 404) {
        console.error('❌ 404 Error - Possible issues:');
        console.error('1. Gemini API not enabled');
        console.error('2. Wrong API endpoint');
        console.error('3. API key from wrong service');
        alert('API Error: Gemini API not found.\n\nPlease create your API key from:\nhttps://makersuite.google.com/app/apikey\n\n(Not from Google Cloud Console)');
      }

      throw new Error('AI service error');
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected API response:', data);
      throw new Error('Invalid AI response');
    }

    let enhanced = data.candidates[0].content.parts[0].text.trim();

    // Clean up any wrapper quotes the AI might add around the entire response
    enhanced = enhanced.replace(/^["'](.*?)["']$/s, '$1');

    // Normalize quotes around UI elements: ensure we use double quotes consistently
    // Convert single quotes around UI elements to double quotes for consistency
    enhanced = enhanced.replace(/'([^']+)'/g, '"$1"');

    // Smart capitalization - ensure first letter is capitalized
    if (enhanced.length > 0) {
      enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
    }

    // Ensure it ends with punctuation (only if it's a complete sentence, not a fragment)
    if (enhanced && enhanced.length > 10 && !enhanced.match(/[.!?:,]$/)) {
      enhanced += '.';
    }

    console.log('✅ AI Enhanced:', {
      original: text,
      enhanced: enhanced
    });

    return enhanced;

  } catch (error) {
    console.error('Enhancement error:', error);

    // Fall back to basic enhancement if API fails
    console.log('Falling back to basic enhancement...');
    return basicEnhancement(text);
  }
}

// Fallback: Basic enhancement (if API fails)
function basicEnhancement(text) {
  let enhanced = text.trim();

  // Common typos and corrections for workflow documentation
  const corrections = {
    // Action verbs
    'clik': 'Click',
    'clcik': 'Click',
    'slect': 'Select',
    'sellect': 'Select',
    'tpye': 'Type',
    'typ': 'Type',
    'naviagte': 'Navigate',
    'nagivate': 'Navigate',
    'scrol': 'Scroll',

    // UI elements
    'botton': 'button',
    'buttom': 'button',
    'feild': 'field',
    'fild': 'field',
    'fiedl': 'field',
    'dropdown': 'dropdown',
    'dropown': 'dropdown',
    'chekbox': 'checkbox',
    'chexbox': 'checkbox',

    // Common words
    'addres': 'address',
    'adress': 'address',
    'seperate': 'separate',
    'recieve': 'receive',
    'occured': 'occurred',

    // Grammar
    'you\'re': 'your',
    'its ': 'it\'s ',
    'thier': 'their',
    'then ': 'than ',
  };

  // Apply corrections (case-insensitive word boundary)
  for (const [wrong, right] of Object.entries(corrections)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    enhanced = enhanced.replace(regex, right);
  }

  // Capitalize first letter
  if (enhanced.length > 0) {
    enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
  }

  // Add period if missing and it's a complete sentence
  if (enhanced.length > 10 && !enhanced.match(/[.!?]$/)) {
    enhanced += '.';
  }

  return enhanced;
}

// Show API key setup prompt
function showApiKeyPrompt() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      border-radius: 20px;
      max-width: 500px;
      color: white;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    ">
      <h2 style="margin: 0 0 20px 0; font-size: 24px;">🤖 AI Enhancement Setup</h2>
      <p style="margin: 0 0 20px 0; line-height: 1.6; opacity: 0.9;">
        To use AI-powered enhancement, you need a free Google Gemini API key.
      </p>
      <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px;">How to get your FREE API key:</h3>
        <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Visit: <a href="https://makersuite.google.com/app/apikey" target="_blank" style="color: #fff; text-decoration: underline;">Google AI Studio</a></li>
          <li>Click "Create API Key"</li>
          <li>Copy your API key</li>
          <li>Paste it below</li>
        </ol>
      </div>
      <input 
        type="text" 
        id="api-key-input" 
        placeholder="Paste your API key here..."
        style="
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 15px;
          box-sizing: border-box;
        "
      />
      <div style="display: flex; gap: 10px;">
        <button id="save-api-key" style="
          flex: 1;
          background: white;
          color: #667eea;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          font-size: 14px;
        ">Save & Use AI</button>
        <button id="cancel-api-key" style="
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        ">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('save-api-key').onclick = () => {
    const key = document.getElementById('api-key-input').value.trim();
    console.log('Saving API key, length:', key.length);

    if (key) {
      chrome.storage.local.set({ geminiApiKey: key }, () => {
        console.log('✅ API key saved successfully!');

        // Verify it was saved
        chrome.storage.local.get(['geminiApiKey'], (result) => {
          console.log('Verification - Saved key:', result.geminiApiKey ? 'EXISTS' : 'NOT FOUND');
          console.log('Saved key length:', result.geminiApiKey?.length);
        });

        modal.remove();
        showSuccessNotification('✅ API key saved! Try enhancing again.');
      });
    } else {
      alert('Please enter your API key');
    }
  };

  document.getElementById('cancel-api-key').onclick = () => {
    modal.remove();
  };

  // Auto-focus input
  setTimeout(() => document.getElementById('api-key-input').focus(), 100);
}

function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
    z-index: 10000;
    font-weight: 600;
    animation: slideInRight 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Drag and drop state
let draggedElement = null;
let draggedIndex = null;

function handleDragStart(e) {
  draggedElement = this;
  draggedIndex = parseInt(this.getAttribute("data-step-index"));

  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", this.innerHTML);

  console.log("Drag started - Step", draggedIndex + 1);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = "move";
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedElement) {
    this.classList.add("drag-over");
  }
}

function handleDragLeave(e) {
  this.classList.remove("drag-over");
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  if (draggedElement !== this) {
    const dropIndex = parseInt(this.getAttribute("data-step-index"));

    console.log(`Moving step ${draggedIndex + 1} to position ${dropIndex + 1}`);

    // Reorder the steps array
    const draggedStep = steps[draggedIndex];
    steps.splice(draggedIndex, 1);
    steps.splice(dropIndex, 0, draggedStep);

    // Save reordered steps
    chrome.storage.local.set({ steps }, () => {
      console.log("Steps reordered and saved");
      render(); // Re-render with new order
    });
  }

  return false;
}

function handleDragEnd(e) {
  // Remove all drag classes
  document.querySelectorAll(".step-item").forEach(item => {
    item.classList.remove("dragging");
    item.classList.remove("drag-over");
  });

  draggedElement = null;
  draggedIndex = null;
}

function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = (textarea.scrollHeight) + "px";
}

function autoSave(index, element) {
  if (steps[index]) {
    steps[index].description = element.value;
    chrome.storage.local.set({ steps });
  }
}

function deleteStep(index) {
  if (!confirm("Are you sure you want to delete this step?")) return;

  steps.splice(index, 1);
  chrome.storage.local.set({ steps }, () => {
    render();
  });
}

// Improved PDF Export
async function exportToPDF() {
  const jsPDF = window.jspdf?.jsPDF;
  if (!jsPDF) {
    alert("PDF library not loaded. Please refresh the page.");
    return;
  }

  if (steps.length === 0) {
    alert("No steps to export. Record some steps first!");
    return;
  }

  try {
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
      compress: true
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    let y = margin + 20;

    // Title
    doc.setFontSize(28);
    doc.setFont(undefined, 'bold');
    const title = document.querySelector(".doc-title").value || "Workflow Guide";
    doc.text(title, margin, y);
    y += 40;

    // Metadata
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${steps.length} steps | Created on ${new Date().toLocaleDateString()}`, margin, y);
    y += 40;

    doc.setTextColor(0, 0, 0);

    // Steps
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Check if we need a new page
      if (y > pageHeight - 150) {
        doc.addPage();
        y = margin + 20;
      }

      // Step number and description
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(`${i + 1}.`, margin, y);

      doc.setFontSize(14);
      doc.setFont(undefined, 'normal');
      const descLines = doc.splitTextToSize(step.description, contentWidth - 30);
      doc.text(descLines, margin + 25, y);
      y += (descLines.length * 18) + 15;

      // Screenshot
      try {
        const imgProps = doc.getImageProperties(step.screenshot);
        const imgWidth = contentWidth;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        // Check if image fits on current page
        if (y + imgHeight > pageHeight - margin) {
          doc.addPage();
          y = margin + 20;
        }

        doc.addImage(step.screenshot, "PNG", margin, y, imgWidth, imgHeight);
        y += imgHeight + 30;

      } catch (e) {
        console.error("Failed to add image:", e);
        doc.setTextColor(200, 0, 0);
        doc.setFontSize(10);
        doc.text("[Screenshot could not be included]", margin, y);
        doc.setTextColor(0, 0, 0);
        y += 30;
      }

      // Add separator line between steps (except last)
      if (i < steps.length - 1) {
        doc.setDrawColor(230, 230, 230);
        doc.line(margin, y, pageWidth - margin, y);
        y += 25;
      }
    }

    // Save
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
    doc.save(fileName);

  } catch (error) {
    console.error("PDF export failed:", error);
    alert("Failed to create PDF. Please try again or check the console for errors.");
  }
}

// ========== SCREENSHOT EDITOR ==========

let currentEditIndex = null;
let editorCanvas = null;
let editorCtx = null;
let editorImage = null;
let editorAnnotations = [];
let isDrawing = false;
let startX = 0;
let startY = 0;
let currentTool = 'highlight'; // 'highlight', 'pencil', or 'text'
let currentColor = '#ff7a59';
let currentLineWidth = 5;

// Selection and dragging state
let selectedAnnotationIndex = null;
let isDraggingAnnotation = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Resizing state
let isResizing = false;
let resizeHandle = null; // 'tl', 'tr', 'bl', 'br' (top-left, top-right, bottom-left, bottom-right)
let resizeStartX = 0;
let resizeStartY = 0;
let originalBox = null; // Store original box dimensions

let currentPath = []; // For pencil drawing

// Text formatting state
let currentTextFormat = {
  fontFamily: 'Inter, sans-serif',
  fontSize: 24,
  bold: false,
  italic: false,
  color: '#ff7a59',
  background: true
};

let inlineTextInput = null;
let currentTextPosition = null;
let selectedTextIndex = null; // Track which text annotation is selected for editing/deletion

// Helper functions for inline text input
function showInlineTextInput(x, y) {
  if (!inlineTextInput) {
    inlineTextInput = document.getElementById("inline-text-input");
  }

  // Store the canvas position
  currentTextPosition = { x, y };

  // Position the input at click location
  const canvasRect = editorCanvas.getBoundingClientRect();
  const scaleX = editorCanvas.width / canvasRect.width;
  const scaleY = editorCanvas.height / canvasRect.height;

  // Convert canvas coords to screen coords
  const screenX = x / scaleX;
  const screenY = y / scaleY;

  inlineTextInput.style.display = "block";
  inlineTextInput.style.left = screenX + "px";
  inlineTextInput.style.top = screenY + "px";
  inlineTextInput.value = "";
  inlineTextInput.focus();

  // Update style
  updateInlineTextStyle();

  // Handle Enter key to save text
  inlineTextInput.onkeydown = (e) => {
    if (e.key === "Enter" && inlineTextInput.value.trim()) {
      saveInlineText();
    } else if (e.key === "Escape") {
      hideInlineTextInput();
    }
  };

  // Handle blur to save text
  inlineTextInput.onblur = () => {
    if (inlineTextInput.value.trim()) {
      setTimeout(() => saveInlineText(), 100);
    } else {
      hideInlineTextInput();
    }
  };
}

function hideInlineTextInput() {
  if (inlineTextInput) {
    inlineTextInput.style.display = "none";
    inlineTextInput.value = "";
    currentTextPosition = null;
  }
}

function updateInlineTextStyle() {
  if (!inlineTextInput || inlineTextInput.style.display === "none") return;

  let fontStyle = "";
  if (currentTextFormat.italic) fontStyle += "italic ";
  if (currentTextFormat.bold) fontStyle += "bold ";

  inlineTextInput.style.fontFamily = currentTextFormat.fontFamily;
  inlineTextInput.style.fontSize = currentTextFormat.fontSize + "px";
  inlineTextInput.style.fontWeight = currentTextFormat.bold ? "bold" : "normal";
  inlineTextInput.style.fontStyle = currentTextFormat.italic ? "italic" : "normal";
  inlineTextInput.style.color = currentTextFormat.color;
  inlineTextInput.style.background = currentTextFormat.background ? "rgba(255, 255, 255, 0.9)" : "transparent";
}

function saveInlineText() {
  if (!inlineTextInput || !currentTextPosition) return;

  const text = inlineTextInput.value.trim();
  if (!text) {
    hideInlineTextInput();
    editingAnnotationIndex = null;
    return;
  }

  if (editingAnnotationIndex !== null) {
    // Update existing annotation
    console.log("Updating text annotation at index:", editingAnnotationIndex);
    editorAnnotations[editingAnnotationIndex] = {
      type: 'text',
      x: currentTextPosition.x,
      y: currentTextPosition.y,
      text: text,
      color: currentTextFormat.color,
      fontFamily: currentTextFormat.fontFamily,
      fontSize: currentTextFormat.fontSize,
      bold: currentTextFormat.bold,
      italic: currentTextFormat.italic,
      background: currentTextFormat.background
    };
    editingAnnotationIndex = null;
  } else {
    // Add new text annotation
    console.log("Adding new text annotation");
    editorAnnotations.push({
      type: 'text',
      x: currentTextPosition.x,
      y: currentTextPosition.y,
      text: text,
      color: currentTextFormat.color,
      fontFamily: currentTextFormat.fontFamily,
      fontSize: currentTextFormat.fontSize,
      bold: currentTextFormat.bold,
      italic: currentTextFormat.italic,
      background: currentTextFormat.background
    });
  }

  hideInlineTextInput();
  selectedTextIndex = null; // Clear selection after saving
  redrawCanvas();
}

function openEditor(index) {
  console.log("Opening editor for step", index);
  currentEditIndex = index;
  const step = steps[index];

  if (!step || !step.screenshot) {
    alert("No screenshot available to edit");
    return;
  }

  // Get editor elements
  const modal = document.getElementById("editor-modal");
  editorCanvas = document.getElementById("editor-canvas");
  editorCtx = editorCanvas.getContext("2d");

  // Reset annotations (or load existing ones if stored)
  editorAnnotations = step.annotations || [];

  // Load image
  editorImage = new Image();
  editorImage.onload = () => {
    // Set canvas size to match image
    editorCanvas.width = editorImage.width;
    editorCanvas.height = editorImage.height;

    // Draw image and annotations
    redrawCanvas();

    // Show modal
    modal.style.display = "flex";
  };
  editorImage.src = step.screenshot;

  // Set up event listeners
  setupEditorListeners();
}

function setupEditorListeners() {
  // Tool selection
  document.getElementById("highlight-tool").onclick = () => {
    currentTool = 'highlight';
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("highlight-tool").classList.add("active");
    editorCanvas.style.cursor = "crosshair";
    document.getElementById("text-format-group").style.display = "none";
    hideInlineTextInput();
  };

  document.getElementById("pencil-tool").onclick = () => {
    currentTool = 'pencil';
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("pencil-tool").classList.add("active");
    const cursorColor = encodeURIComponent(currentColor);
    editorCanvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="2" fill="${cursorColor}"/></svg>') 10 10, auto`;
    document.getElementById("text-format-group").style.display = "none";
    hideInlineTextInput();
  };

  document.getElementById("text-tool").onclick = () => {
    currentTool = 'text';
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
    document.getElementById("text-tool").classList.add("active");
    editorCanvas.style.cursor = "text";
    document.getElementById("text-format-group").style.display = "flex";
    hideInlineTextInput();
  };

  // Text formatting controls
  const fontFamilySelect = document.getElementById("font-family");
  const fontSizeSelect = document.getElementById("font-size");
  const boldBtn = document.getElementById("bold-btn");
  const italicBtn = document.getElementById("italic-btn");
  const bgToggleBtn = document.getElementById("bg-toggle-btn");

  fontFamilySelect.onchange = () => {
    currentTextFormat.fontFamily = fontFamilySelect.value;
    updateInlineTextStyle();

    // Apply to selected text immediately
    if (selectedTextIndex !== null && editorAnnotations[selectedTextIndex]) {
      editorAnnotations[selectedTextIndex].fontFamily = currentTextFormat.fontFamily;
      redrawCanvas();
    }
  };

  fontSizeSelect.onchange = () => {
    currentTextFormat.fontSize = parseInt(fontSizeSelect.value);
    updateInlineTextStyle();

    // Apply to selected text immediately
    if (selectedTextIndex !== null && editorAnnotations[selectedTextIndex]) {
      editorAnnotations[selectedTextIndex].fontSize = currentTextFormat.fontSize;
      redrawCanvas();
    }
  };

  boldBtn.onclick = () => {
    currentTextFormat.bold = !currentTextFormat.bold;
    boldBtn.classList.toggle("active");
    updateInlineTextStyle();

    // Apply to selected text immediately
    if (selectedTextIndex !== null && editorAnnotations[selectedTextIndex]) {
      editorAnnotations[selectedTextIndex].bold = currentTextFormat.bold;
      redrawCanvas();
    }
  };

  italicBtn.onclick = () => {
    currentTextFormat.italic = !currentTextFormat.italic;
    italicBtn.classList.toggle("active");
    updateInlineTextStyle();

    // Apply to selected text immediately
    if (selectedTextIndex !== null && editorAnnotations[selectedTextIndex]) {
      editorAnnotations[selectedTextIndex].italic = currentTextFormat.italic;
      redrawCanvas();
    }
  };

  bgToggleBtn.onclick = () => {
    currentTextFormat.background = !currentTextFormat.background;
    bgToggleBtn.classList.toggle("active");

    // Apply to selected text immediately
    if (selectedTextIndex !== null && editorAnnotations[selectedTextIndex]) {
      editorAnnotations[selectedTextIndex].background = currentTextFormat.background;
      redrawCanvas();
    }
  };

  // Color picker
  document.getElementById("highlight-color").onchange = (e) => {
    currentColor = e.target.value;
    currentTextFormat.color = currentColor;
    updateInlineTextStyle();

    // Apply to selected text immediately
    if (selectedTextIndex !== null && editorAnnotations[selectedTextIndex]) {
      editorAnnotations[selectedTextIndex].color = currentColor;
      redrawCanvas();
    }

    // Update pencil cursor color if pencil is active
    if (currentTool === 'pencil') {
      const cursorColor = encodeURIComponent(currentColor);
      editorCanvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="2" fill="${cursorColor}"/></svg>') 10 10, auto`;
    }
  };

  // Line width picker
  const lineWidthInput = document.getElementById("line-width");
  const lineWidthValue = document.getElementById("line-width-value");

  lineWidthInput.oninput = (e) => {
    currentLineWidth = parseInt(e.target.value);
    lineWidthValue.textContent = currentLineWidth;
  };

  // Undo
  document.getElementById("undo-tool").onclick = () => {
    if (editorAnnotations.length > 0) {
      editorAnnotations.pop();
      redrawCanvas();
    }
  };

  // Clear all
  document.getElementById("clear-tool").onclick = () => {
    if (confirm("Clear all annotations?")) {
      editorAnnotations = [];
      redrawCanvas();
    }
  };

  // Canvas drawing
  editorCanvas.onmousedown = handleMouseDown;
  editorCanvas.onmousemove = handleMouseMove;
  editorCanvas.onmouseup = handleMouseUp;
  editorCanvas.onclick = handleCanvasClick;

  // Add keyboard event listener for deleting selected text
  document.addEventListener('keydown', handleKeyPress);

  // Close/Cancel/Save
  document.getElementById("close-editor").onclick = closeEditor;
  document.getElementById("cancel-edit").onclick = closeEditor;
  document.getElementById("save-edit").onclick = saveEdit;
}

// Handle keyboard shortcuts
function handleKeyPress(e) {
  // Delete selected text with Delete or Backspace key
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedTextIndex !== null) {
    // Don't delete if user is typing in the input field
    if (inlineTextInput && inlineTextInput.style.display === 'block') {
      return;
    }

    e.preventDefault();
    console.log('Deleting text annotation at index:', selectedTextIndex);
    editorAnnotations.splice(selectedTextIndex, 1);
    selectedTextIndex = null;
    redrawCanvas();
  }
}

// Helper function to find highlight box at click position
function findHighlightAtPosition(x, y) {
  // Check annotations in reverse order (top to bottom)
  for (let i = editorAnnotations.length - 1; i >= 0; i--) {
    const annotation = editorAnnotations[i];

    if (annotation.type === 'highlight') {
      // Check if click is within bounds of this highlight box
      if (x >= annotation.x &&
        x <= annotation.x + annotation.width &&
        y >= annotation.y &&
        y <= annotation.y + annotation.height) {
        return i; // Return index of found highlight
      }
    }
  }

  return null; // No highlight found at this position
}

// Helper function to check if click is on a resize handle
function getResizeHandle(x, y, annotation) {
  const handleSize = 8;
  const tolerance = 10; // Click tolerance area around handle

  // Check each corner handle
  const handles = {
    'tl': { x: annotation.x, y: annotation.y }, // top-left
    'tr': { x: annotation.x + annotation.width, y: annotation.y }, // top-right
    'bl': { x: annotation.x, y: annotation.y + annotation.height }, // bottom-left
    'br': { x: annotation.x + annotation.width, y: annotation.y + annotation.height } // bottom-right
  };

  for (const [handleName, handlePos] of Object.entries(handles)) {
    if (Math.abs(x - handlePos.x) <= tolerance &&
      Math.abs(y - handlePos.y) <= tolerance) {
      return handleName;
    }
  }

  return null; // Not on any handle
}

function handleMouseDown(e) {
  const rect = editorCanvas.getBoundingClientRect();
  const scaleX = editorCanvas.width / rect.width;
  const scaleY = editorCanvas.height / rect.height;

  startX = (e.clientX - rect.left) * scaleX;
  startY = (e.clientY - rect.top) * scaleY;

  // Check if clicking on existing highlight box (for highlight tool)
  if (currentTool === 'highlight') {
    // First, check if we're clicking on a resize handle of the selected box
    if (selectedAnnotationIndex !== null) {
      const annotation = editorAnnotations[selectedAnnotationIndex];
      const handle = getResizeHandle(startX, startY, annotation);

      if (handle) {
        // Start resizing
        isResizing = true;
        resizeHandle = handle;
        resizeStartX = startX;
        resizeStartY = startY;

        // Store original box dimensions
        originalBox = {
          x: annotation.x,
          y: annotation.y,
          width: annotation.width,
          height: annotation.height
        };

        console.log('Starting resize from handle:', handle);
        return; // Don't start dragging or drawing
      }
    }

    // Check if clicking on a highlight box
    const clickedHighlight = findHighlightAtPosition(startX, startY);

    if (clickedHighlight !== null) {
      // Start dragging existing highlight
      selectedAnnotationIndex = clickedHighlight;
      const annotation = editorAnnotations[clickedHighlight];
      isDraggingAnnotation = true;

      // Store offset from click position to top-left of box
      dragOffsetX = startX - annotation.x;
      dragOffsetY = startY - annotation.y;

      console.log('Selected highlight box for dragging:', clickedHighlight);
      redrawCanvas(); // Redraw to show selection
      return; // Don't start drawing
    } else {
      // Clicked on empty space - deselect any selected annotation
      if (selectedAnnotationIndex !== null) {
        selectedAnnotationIndex = null;
        redrawCanvas(); // Redraw to remove selection feedback
      }
    }
  }

  // Normal drawing behavior
  isDrawing = true;

  // For pencil tool, start a new path
  if (currentTool === 'pencil') {
    currentPath = [{ x: startX, y: startY }];
  }
}

function handleMouseMove(e) {
  const rect = editorCanvas.getBoundingClientRect();
  const scaleX = editorCanvas.width / rect.width;
  const scaleY = editorCanvas.height / rect.height;

  const currentX = (e.clientX - rect.left) * scaleX;
  const currentY = (e.clientY - rect.top) * scaleY;

  // Handle resizing annotation
  if (isResizing && selectedAnnotationIndex !== null && resizeHandle) {
    const annotation = editorAnnotations[selectedAnnotationIndex];
    const deltaX = currentX - resizeStartX;
    const deltaY = currentY - resizeStartY;

    // Update box dimensions based on which handle is being dragged
    switch (resizeHandle) {
      case 'tl': // Top-left: adjust x, y, width, height
        annotation.x = originalBox.x + deltaX;
        annotation.y = originalBox.y + deltaY;
        annotation.width = originalBox.width - deltaX;
        annotation.height = originalBox.height - deltaY;
        break;

      case 'tr': // Top-right: adjust y, width, height
        annotation.y = originalBox.y + deltaY;
        annotation.width = originalBox.width + deltaX;
        annotation.height = originalBox.height - deltaY;
        break;

      case 'bl': // Bottom-left: adjust x, width, height
        annotation.x = originalBox.x + deltaX;
        annotation.width = originalBox.width - deltaX;
        annotation.height = originalBox.height + deltaY;
        break;

      case 'br': // Bottom-right: adjust width, height
        annotation.width = originalBox.width + deltaX;
        annotation.height = originalBox.height + deltaY;
        break;
    }

    // Ensure minimum size
    const minSize = 20;
    if (annotation.width < minSize) {
      annotation.width = minSize;
      if (resizeHandle === 'tl' || resizeHandle === 'bl') {
        annotation.x = originalBox.x + originalBox.width - minSize;
      }
    }
    if (annotation.height < minSize) {
      annotation.height = minSize;
      if (resizeHandle === 'tl' || resizeHandle === 'tr') {
        annotation.y = originalBox.y + originalBox.height - minSize;
      }
    }

    redrawCanvas();
    return;
  }

  // Handle dragging annotation
  if (isDraggingAnnotation && selectedAnnotationIndex !== null) {
    const annotation = editorAnnotations[selectedAnnotationIndex];

    // Update position
    annotation.x = currentX - dragOffsetX;
    annotation.y = currentY - dragOffsetY;

    // Redraw with updated position
    redrawCanvas();
    return;
  }

  // Normal drawing behavior
  if (!isDrawing) {
    // Update cursor based on what's under the mouse
    if (currentTool === 'highlight') {
      // Check if hovering over resize handle of selected box
      if (selectedAnnotationIndex !== null) {
        const annotation = editorAnnotations[selectedAnnotationIndex];
        const handle = getResizeHandle(currentX, currentY, annotation);

        if (handle) {
          // Show appropriate resize cursor based on handle
          const cursors = {
            'tl': 'nwse-resize', // top-left = northwest-southeast
            'tr': 'nesw-resize', // top-right = northeast-southwest
            'bl': 'nesw-resize', // bottom-left = northeast-southwest
            'br': 'nwse-resize'  // bottom-right = northwest-southeast
          };
          editorCanvas.style.cursor = cursors[handle];
          return;
        }
      }

      // Check if hovering over a highlight box
      const highlightUnderMouse = findHighlightAtPosition(currentX, currentY);
      if (highlightUnderMouse !== null) {
        editorCanvas.style.cursor = 'move'; // Show move cursor
      } else {
        editorCanvas.style.cursor = 'crosshair'; // Show draw cursor
      }
    }
    return;
  }

  if (currentTool === 'highlight') {
    // Redraw everything + current rectangle
    redrawCanvas();

    // Draw temporary rectangle
    editorCtx.strokeStyle = currentColor;
    editorCtx.lineWidth = 5;
    editorCtx.strokeRect(
      startX,
      startY,
      currentX - startX,
      currentY - startY
    );
  } else if (currentTool === 'pencil') {
    // Add point to current path
    currentPath.push({ x: currentX, y: currentY });

    // Redraw everything including current path
    redrawCanvas();

    // Draw current path being drawn
    if (currentPath.length > 1) {
      editorCtx.strokeStyle = currentColor;
      editorCtx.lineWidth = currentLineWidth;
      editorCtx.lineCap = 'round';
      editorCtx.lineJoin = 'round';

      editorCtx.beginPath();
      editorCtx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        editorCtx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      editorCtx.stroke();
    }
  }
}

function handleMouseUp(e) {
  // Handle end of resizing
  if (isResizing) {
    isResizing = false;
    resizeHandle = null;
    originalBox = null;
    console.log('Finished resizing highlight box');
    // Keep selection for visual feedback
    return;
  }

  // Handle end of dragging
  if (isDraggingAnnotation) {
    isDraggingAnnotation = false;
    console.log('Finished dragging highlight box');
    // Keep selection for visual feedback
    return;
  }

  if (!isDrawing) {
    isDrawing = false;
    return;
  }

  const rect = editorCanvas.getBoundingClientRect();
  const scaleX = editorCanvas.width / rect.width;
  const scaleY = editorCanvas.height / rect.height;

  const endX = (e.clientX - rect.left) * scaleX;
  const endY = (e.clientY - rect.top) * scaleY;

  if (currentTool === 'highlight') {
    // Only add if it's a meaningful size
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    if (width > 10 && height > 10) {
      editorAnnotations.push({
        type: 'highlight',
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: width,
        height: height,
        color: currentColor
      });

      redrawCanvas();
    }
  } else if (currentTool === 'pencil') {
    // Add final point
    currentPath.push({ x: endX, y: endY });

    // Only save if path has meaningful length
    if (currentPath.length > 2) {
      editorAnnotations.push({
        type: 'pencil',
        path: [...currentPath],
        color: currentColor,
        lineWidth: currentLineWidth
      });

      redrawCanvas();
    }

    currentPath = [];
  }

  isDrawing = false;
}

function handleCanvasClick(e) {
  if (currentTool !== 'text') return;
  if (isDrawing) return; // Don't trigger on drag operations

  const rect = editorCanvas.getBoundingClientRect();
  const scaleX = editorCanvas.width / rect.width;
  const scaleY = editorCanvas.height / rect.height;

  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  // Check if clicking on existing text annotation to edit it
  const clickedTextAnnotation = findTextAnnotationAtPosition(clickX, clickY);

  if (clickedTextAnnotation) {
    // Select and edit existing text
    selectedTextIndex = clickedTextAnnotation.index;
    editTextAnnotation(clickedTextAnnotation, clickX, clickY);
    redrawCanvas(); // Show selection feedback
  } else {
    // Deselect any selected text
    selectedTextIndex = null;
    // Add new text
    showInlineTextInput(clickX, clickY);
  }
}

// Find text annotation at click position
function findTextAnnotationAtPosition(x, y) {
  // Create temporary canvas context to measure text
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  // Check annotations in reverse order (top to bottom)
  for (let i = editorAnnotations.length - 1; i >= 0; i--) {
    const annotation = editorAnnotations[i];

    if (annotation.type === 'text') {
      // Build font string
      let fontWeight = annotation.bold ? 'bold' : 'normal';
      let fontStyle = annotation.italic ? 'italic' : 'normal';
      let fontSize = annotation.fontSize || 24;
      let fontFamily = annotation.fontFamily || 'Inter, sans-serif';

      tempCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      const metrics = tempCtx.measureText(annotation.text);

      // Calculate text bounds
      const textWidth = metrics.width;
      const textHeight = fontSize;
      const padding = 6;

      // Check if click is within text bounds
      if (x >= annotation.x - padding &&
        x <= annotation.x + textWidth + padding &&
        y >= annotation.y - textHeight - padding &&
        y <= annotation.y + padding) {
        return { annotation, index: i };
      }
    }
  }

  return null;
}

// Edit existing text annotation
let editingAnnotationIndex = null;

function editTextAnnotation(annotationData, clickX, clickY) {
  const { annotation, index } = annotationData;

  console.log("Editing text annotation:", annotation.text);

  // Store which annotation we're editing
  editingAnnotationIndex = index;

  // Set current format to match the annotation being edited
  currentTextFormat.fontFamily = annotation.fontFamily || 'Inter, sans-serif';
  currentTextFormat.fontSize = annotation.fontSize || 24;
  currentTextFormat.bold = annotation.bold || false;
  currentTextFormat.italic = annotation.italic || false;
  currentTextFormat.color = annotation.color || '#ff7a59';
  currentTextFormat.background = annotation.background !== false;

  // Update toolbar to reflect these settings
  document.getElementById('font-family').value = currentTextFormat.fontFamily;
  document.getElementById('font-size').value = currentTextFormat.fontSize;
  document.getElementById('bold-btn').classList.toggle('active', currentTextFormat.bold);
  document.getElementById('italic-btn').classList.toggle('active', currentTextFormat.italic);
  document.getElementById('bg-toggle-btn').classList.toggle('active', currentTextFormat.background);
  document.getElementById('highlight-color').value = currentTextFormat.color;
  currentColor = currentTextFormat.color;

  // Show inline input with existing text
  if (!inlineTextInput) {
    inlineTextInput = document.getElementById("inline-text-input");
  }

  currentTextPosition = { x: annotation.x, y: annotation.y };

  // Position the input at annotation location
  const canvasRect = editorCanvas.getBoundingClientRect();
  const scaleX = editorCanvas.width / canvasRect.width;
  const scaleY = editorCanvas.height / canvasRect.height;

  const screenX = annotation.x / scaleX;
  const screenY = annotation.y / scaleY;

  inlineTextInput.style.display = "block";
  inlineTextInput.style.left = screenX + "px";
  inlineTextInput.style.top = screenY + "px";
  inlineTextInput.value = annotation.text; // Pre-fill with existing text
  inlineTextInput.focus();
  inlineTextInput.select(); // Select all text for easy replacement

  updateInlineTextStyle();

  // Handle Enter key to save text
  inlineTextInput.onkeydown = (e) => {
    if (e.key === "Enter" && inlineTextInput.value.trim()) {
      saveInlineText();
    } else if (e.key === "Escape") {
      hideInlineTextInput();
      editingAnnotationIndex = null;
    }
  };

  // Handle blur to save text
  inlineTextInput.onblur = () => {
    if (inlineTextInput.value.trim()) {
      setTimeout(() => saveInlineText(), 100);
    } else {
      hideInlineTextInput();
      editingAnnotationIndex = null;
    }
  };
}

function redrawCanvas() {
  // Clear canvas
  editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);

  // Draw original image
  editorCtx.drawImage(editorImage, 0, 0);

  // Draw all annotations
  editorAnnotations.forEach((annotation, index) => {
    if (annotation.type === 'highlight') {
      editorCtx.strokeStyle = annotation.color;
      editorCtx.lineWidth = 5;
      editorCtx.strokeRect(
        annotation.x,
        annotation.y,
        annotation.width,
        annotation.height
      );

      // If this is the selected annotation, draw selection feedback
      if (index === selectedAnnotationIndex) {
        // Draw dashed border around selection
        editorCtx.strokeStyle = '#4A90E2'; // Blue selection color
        editorCtx.lineWidth = 2;
        editorCtx.setLineDash([8, 4]); // Dashed line
        editorCtx.strokeRect(
          annotation.x - 5,
          annotation.y - 5,
          annotation.width + 10,
          annotation.height + 10
        );
        editorCtx.setLineDash([]); // Reset to solid

        // Draw corner handles
        const handleSize = 8;
        editorCtx.fillStyle = '#4A90E2';

        // Top-left
        editorCtx.fillRect(annotation.x - handleSize / 2, annotation.y - handleSize / 2, handleSize, handleSize);
        // Top-right
        editorCtx.fillRect(annotation.x + annotation.width - handleSize / 2, annotation.y - handleSize / 2, handleSize, handleSize);
        // Bottom-left
        editorCtx.fillRect(annotation.x - handleSize / 2, annotation.y + annotation.height - handleSize / 2, handleSize, handleSize);
        // Bottom-right
        editorCtx.fillRect(annotation.x + annotation.width - handleSize / 2, annotation.y + annotation.height - handleSize / 2, handleSize, handleSize);
      }
    } else if (annotation.type === 'pencil') {
      // Draw freehand path
      if (annotation.path && annotation.path.length > 1) {
        editorCtx.strokeStyle = annotation.color;
        editorCtx.lineWidth = annotation.lineWidth || 5;
        editorCtx.lineCap = 'round';
        editorCtx.lineJoin = 'round';

        editorCtx.beginPath();
        editorCtx.moveTo(annotation.path[0].x, annotation.path[0].y);
        for (let i = 1; i < annotation.path.length; i++) {
          editorCtx.lineTo(annotation.path[i].x, annotation.path[i].y);
        }
        editorCtx.stroke();
      }
    } else if (annotation.type === 'text') {
      // Build font string with formatting
      let fontWeight = annotation.bold ? 'bold' : 'normal';
      let fontStyle = annotation.italic ? 'italic' : 'normal';
      let fontSize = annotation.fontSize || 24;
      let fontFamily = annotation.fontFamily || 'Inter, sans-serif';

      editorCtx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      const metrics = editorCtx.measureText(annotation.text);

      // Draw background if enabled
      if (annotation.background !== false) {
        editorCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const padding = 6;
        editorCtx.fillRect(
          annotation.x - padding,
          annotation.y - fontSize - padding / 2,
          metrics.width + padding * 2,
          fontSize + padding * 1.5
        );
      }

      // Draw text
      editorCtx.fillStyle = annotation.color;
      editorCtx.fillText(annotation.text, annotation.x, annotation.y);

      // If this is the selected text, draw selection feedback
      if (index === selectedTextIndex) {
        const padding = 6;
        const textWidth = metrics.width;
        const textHeight = fontSize;

        // Draw dashed border around text
        editorCtx.strokeStyle = '#4A90E2'; // Blue selection color
        editorCtx.lineWidth = 2;
        editorCtx.setLineDash([5, 3]); // Dashed line
        editorCtx.strokeRect(
          annotation.x - padding - 2,
          annotation.y - textHeight - padding / 2 - 2,
          textWidth + padding * 2 + 4,
          textHeight + padding * 1.5 + 4
        );
        editorCtx.setLineDash([]); // Reset to solid
      }
    }
  });
}

function saveEdit() {
  if (currentEditIndex === null) return;

  // Save canvas as new screenshot
  const editedScreenshot = editorCanvas.toDataURL("image/png");

  // Update step with edited screenshot and annotations
  steps[currentEditIndex].screenshot = editedScreenshot;
  steps[currentEditIndex].annotations = [...editorAnnotations];

  // Save to storage
  chrome.storage.local.set({ steps }, () => {
    console.log("Saved edited screenshot");
    render();
    closeEditor();
  });
}

function closeEditor() {
  const modal = document.getElementById("editor-modal");
  modal.style.display = "none";

  // Reset all states
  currentEditIndex = null;
  editorAnnotations = [];
  isDrawing = false;
  selectedAnnotationIndex = null;
  selectedTextIndex = null;
  isDraggingAnnotation = false;
  isResizing = false;
}
