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

    el.innerHTML = `
      <div class="step-number">${i + 1}</div>
      <div class="step-content">
        <textarea class="step-description" data-index="${i}" rows="2">${step.description}</textarea>
        <img src="${step.screenshot}" class="step-image" loading="lazy" alt="Step ${i + 1} screenshot">
      </div>
      <div class="step-actions">
        <button class="action-btn delete-btn" data-index="${i}" title="Delete this step">Delete</button>
      </div>
    `;

    container.appendChild(el);
  });

  // Auto-resize textareas
  document.querySelectorAll(".step-description").forEach(tx => {
    autoResizeTextarea(tx);
    tx.addEventListener("input", function () {
      autoResizeTextarea(this);
    });
  });
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
