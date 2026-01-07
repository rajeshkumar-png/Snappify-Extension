// Snappify Replay Engine
// Automatically replays recorded steps to reproduce bugs and workflows

(function () {
    'use strict';

    class ReplayEngine {
        constructor(steps) {
            this.steps = steps;
            this.currentIndex = 0;
            this.isPaused = false;
            this.isStopped = false;
            this.progressCallback = null;
        }

        // Parse step description to extract action details
        parseDescription(desc) {
            console.log(`🎬 Replay: Parsing "${desc}"`);

            // Navigate to URL
            if (desc.startsWith('Navigate to')) {
                const match = desc.match(/Navigate to "([^"]+)"/);
                return {
                    type: 'NAVIGATE',
                    url: match ? match[1] : null,
                    delay: 2000 // Wait for page load
                };
            }

            // Click action: "Click the 'Button Name' field" or "Click 'Link Text'"
            if (desc.startsWith('Click')) {
                const match = desc.match(/Click (?:the )?"([^"]+)"(?:\s+(?:field|button|link))?/i);
                return {
                    type: 'CLICK',
                    target: match ? match[1] : null,
                    delay: 500
                };
            }

            // Select action: "Select the 'Field Name' field"
            if (desc.startsWith('Select')) {
                const match = desc.match(/Select (?:the )?"([^"]+)"/i);
                return {
                    type: 'CLICK',
                    target: match ? match[1] : null,
                    delay: 500
                };
            }

            // Check checkbox: "Check 'Checkbox Name'"
            if (desc.startsWith('Check')) {
                const match = desc.match(/Check "([^"]+)"/);
                return {
                    type: 'CHECK',
                    target: match ? match[1] : null,
                    delay: 300
                };
            }

            return { type: 'UNKNOWN', delay: 100 };
        }

        // Find element on page using multiple strategies
        findElement(labelText) {
            if (!labelText) return null;

            console.log(`🔍 Replay: Looking for element with label "${labelText}"`);

            // Normalize label text for better matching
            const normalizedLabel = labelText.toLowerCase().trim();

            // Strategy 1: Find button by exact text content
            const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"], a, div[class*="button"], span[class*="button"]');
            for (const btn of buttons) {
                const text = (btn.innerText || btn.textContent || btn.value || '').trim();
                if (text === labelText || text.toLowerCase() === normalizedLabel) {
                    console.log(`✅ Replay: Found button by exact text`);
                    return btn;
                }
            }

            // Strategy 2: Find button by partial text (contains)
            for (const btn of buttons) {
                const text = (btn.innerText || btn.textContent || btn.value || '').toLowerCase().trim();
                if (text.includes(normalizedLabel) || normalizedLabel.includes(text)) {
                    console.log(`✅ Replay: Found button by partial text match`);
                    return btn;
                }
            }

            // Strategy 3: Find input/select/textarea by associated label (exact)
            const labels = document.querySelectorAll('label');
            for (const label of labels) {
                const labelTxt = (label.innerText || label.textContent || '').trim();
                if (labelTxt === labelText || labelTxt.toLowerCase() === normalizedLabel) {
                    // Try for="id" association
                    const forAttr = label.getAttribute('for');
                    if (forAttr) {
                        const element = document.getElementById(forAttr);
                        if (element) {
                            console.log(`✅ Replay: Found element by label[for]`);
                            return element;
                        }
                    }
                    // Try wrapped element
                    const wrapped = label.querySelector('input, select, textarea');
                    if (wrapped) {
                        console.log(`✅ Replay: Found element wrapped in label`);
                        return wrapped;
                    }
                }
            }

            // Strategy 4: Find by label partial match
            for (const label of labels) {
                const labelTxt = (label.innerText || label.textContent || '').toLowerCase().trim();
                if (labelTxt.includes(normalizedLabel)) {
                    const forAttr = label.getAttribute('for');
                    if (forAttr) {
                        const element = document.getElementById(forAttr);
                        if (element) {
                            console.log(`✅ Replay: Found element by partial label match`);
                            return element;
                        }
                    }
                    const wrapped = label.querySelector('input, select, textarea');
                    if (wrapped) {
                        console.log(`✅ Replay: Found element wrapped in partial match label`);
                        return wrapped;
                    }
                }
            }

            // Strategy 5: Find by aria-label (exact and partial)
            let ariaElement = document.querySelector(`[aria-label="${labelText}"]`);
            if (ariaElement) {
                console.log(`✅ Replay: Found element by aria-label (exact)`);
                return ariaElement;
            }

            // Partial aria-label match
            const ariaElements = document.querySelectorAll('[aria-label]');
            for (const el of ariaElements) {
                const ariaLabel = el.getAttribute('aria-label').toLowerCase();
                if (ariaLabel.includes(normalizedLabel)) {
                    console.log(`✅ Replay: Found element by aria-label (partial)`);
                    return el;
                }
            }

            // Strategy 6: Find by placeholder
            let placeholderElement = document.querySelector(`input[placeholder="${labelText}"], textarea[placeholder="${labelText}"]`);
            if (placeholderElement) {
                console.log(`✅ Replay: Found element by placeholder`);
                return placeholderElement;
            }

            // Partial placeholder match
            const placeholderElements = document.querySelectorAll('input[placeholder], textarea[placeholder]');
            for (const el of placeholderElements) {
                const placeholder = el.getAttribute('placeholder').toLowerCase();
                if (placeholder.includes(normalizedLabel)) {
                    console.log(`✅ Replay: Found element by placeholder (partial)`);
                    return el;
                }
            }

            // Strategy 7: Find by name attribute (case-insensitive)
            const nameAttr = labelText.toLowerCase().replace(/\s+/g, '');
            let nameElement = document.querySelector(`[name="${nameAttr}"], [name*="${nameAttr}"]`);
            if (nameElement) {
                console.log(`✅ Replay: Found element by name attribute`);
                return nameElement;
            }

            // Strategy 8: Find by ID (case-insensitive)
            const idAttr = labelText.toLowerCase().replace(/\s+/g, '');
            let idElement = document.getElementById(idAttr) || document.querySelector(`[id*="${idAttr}"]`);
            if (idElement) {
                console.log(`✅ Replay: Found element by ID`);
                return idElement;
            }

            // Strategy 9: Find clickable element containing the text (last resort)
            const allClickable = document.querySelectorAll('*');
            for (const el of allClickable) {
                const text = (el.innerText || el.textContent || '').trim();
                if (text === labelText && (el.onclick || el.tagName === 'A' || el.tagName === 'BUTTON')) {
                    console.log(`✅ Replay: Found clickable element by text content`);
                    return el;
                }
            }

            // Strategy 10: Find element by nearby text (for custom form components)
            // Look for elements that have a sibling or parent with the label text
            const allElements = document.querySelectorAll('input, select, textarea, [role="combobox"], [role="textbox"], [contenteditable="true"]');
            for (const el of allElements) {
                // Check previous sibling
                let sibling = el.previousElementSibling;
                while (sibling) {
                    const siblingText = (sibling.innerText || sibling.textContent || '').trim().toLowerCase();
                    if (siblingText.includes(normalizedLabel)) {
                        console.log(`✅ Replay: Found element by nearby sibling text`);
                        return el;
                    }
                    sibling = sibling.previousElementSibling;
                    if (sibling && sibling.tagName === 'INPUT') break; // Stop at another input
                }

                // Check parent's text content
                const parent = el.parentElement;
                if (parent) {
                    const parentText = Array.from(parent.childNodes)
                        .filter(node => node.nodeType === Node.TEXT_NODE)
                        .map(node => node.textContent.trim())
                        .join(' ').toLowerCase();
                    if (parentText.includes(normalizedLabel)) {
                        console.log(`✅ Replay: Found element by parent text content`);
                        return el;
                    }
                }
            }

            // Strategy 11: Find by data attributes
            const dataElements = document.querySelectorAll('[data-label], [data-field], [data-name], [data-id]');
            for (const el of dataElements) {
                const dataLabel = el.getAttribute('data-label') || '';
                const dataField = el.getAttribute('data-field') || '';
                const dataName = el.getAttribute('data-name') || '';
                const dataId = el.getAttribute('data-id') || '';

                const allData = (dataLabel + ' ' + dataField + ' ' + dataName + ' ' + dataId).toLowerCase();
                if (allData.includes(normalizedLabel)) {
                    console.log(`✅ Replay: Found element by data attribute`);
                    return el;
                }
            }

            // Strategy 12: Use XPath to find elements near text
            try {
                const xpath = `//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${normalizedLabel}')]/following::input[1]`;
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                if (result.singleNodeValue) {
                    console.log(`✅ Replay: Found element by XPath (following input)`);
                    return result.singleNodeValue;
                }
            } catch (e) {
                // XPath might fail, that's okay
            }

            console.warn(`⚠️ Replay: Element "${labelText}" not found after trying all strategies`);
            return null;
        }

        // Execute a single step
        async executeStep(step, index) {
            const action = this.parseDescription(step.description);

            console.log(`\n📍 Replay: Step ${index + 1}/${this.steps.length}`);
            console.log(`   Action: ${action.type}, Target: ${action.target || action.url}`);

            if (this.progressCallback) {
                this.progressCallback(index, step.description);
            }

            if (action.type === 'NAVIGATE') {
                if (action.url) {
                    console.log(`🌐 Replay: Navigating to ${action.url}`);
                    window.location.href = action.url;
                    // Note: Execution stops here, page will reload
                    return;
                }
            }
            else if (action.type === 'CLICK') {
                const element = this.findElement(action.target);
                if (element) {
                    console.log(`👆 Replay: Clicking element`, element.tagName);

                    // Check if this is a dropdown/select element
                    const isDropdown = element.tagName === 'SELECT' ||
                        element.getAttribute('role') === 'combobox' ||
                        element.getAttribute('role') === 'listbox' ||
                        element.classList.contains('dropdown') ||
                        element.classList.contains('select');

                    if (isDropdown) {
                        console.log(`🔽 Replay: Detected dropdown, triggering open events...`);
                    }

                    this.highlightElement(element);
                    await this.sleep(300); // Show highlight briefly

                    // Trigger proper events to open dropdowns
                    if (isDropdown) {
                        // Trigger mousedown event
                        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                        await this.sleep(100);

                        // Focus the element
                        element.focus();
                        await this.sleep(100);
                    }

                    // Click the element
                    element.click();

                    // For dropdowns, wait longer for the dropdown menu to appear
                    if (isDropdown) {
                        console.log(`⏳ Waiting for dropdown menu to open...`);
                        await this.sleep(800); // Wait for dropdown to expand
                    } else {
                        await this.sleep(action.delay);
                    }
                } else {
                    this.showError(`Element "${action.target}" not found`);
                }
            }
            else if (action.type === 'CHECK') {
                const element = this.findElement(action.target);
                if (element && element.type === 'checkbox') {
                    console.log(`☑️ Replay: Checking checkbox`);
                    this.highlightElement(element);
                    await this.sleep(300);
                    if (!element.checked) {
                        element.click();
                    }
                    await this.sleep(action.delay);
                }
            }
            else {
                console.log(`⏩ Replay: Skipping unknown action type`);
                await this.sleep(action.delay);
            }
        }

        // Highlight element briefly before interaction
        highlightElement(element) {
            const rect = element.getBoundingClientRect();
            const highlight = document.createElement('div');
            highlight.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 3px solid #ff7a59;
        background: rgba(255, 122, 89, 0.2);
        pointer-events: none;
        z-index: 2147483647;
        border-radius: 4px;
        box-shadow: 0 0 0 2px rgba(255, 122, 89, 0.3);
      `;
            document.body.appendChild(highlight);

            setTimeout(() => {
                if (highlight.parentNode) {
                    highlight.parentNode.removeChild(highlight);
                }
            }, 500);
        }

        // Show error toast
        showError(message) {
            const toast = document.createElement('div');
            toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 2147483647;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
            toast.textContent = `⚠️ Replay Error: ${message}`;
            document.body.appendChild(toast);

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 3000);
        }

        // Sleep utility
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Main replay loop
        async start() {
            console.log(`\n🎬 ========== Starting Replay ==========`);
            console.log(`📝 Total steps: ${this.steps.length}`);

            // Show startup notification
            this.showStartNotification();

            // Small delay to ensure notification is visible
            await this.sleep(1000);

            for (let i = 0; i < this.steps.length; i++) {
                if (this.isStopped) {
                    console.log('⏹️ Replay stopped by user');
                    break;
                }

                while (this.isPaused) {
                    await this.sleep(100);
                }

                this.currentIndex = i;
                await this.executeStep(this.steps[i], i);
            }

            console.log(`✅ ========== Replay Complete ==========\n`);
            this.showCompleteNotification();
        }

        // Show startup notification
        showStartNotification() {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px 32px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 700;
                z-index: 2147483647;
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                animation: slideDown 0.3s ease;
            `;
            toast.innerHTML = `🎬 <strong>Replay Started!</strong><br>Executing ${this.steps.length} steps...`;
            document.body.appendChild(toast);

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.animation = 'slideUp 0.3s ease';
                    setTimeout(() => toast.remove(), 300);
                }
            }, 3000);
        }

        // Show completion notification
        showCompleteNotification() {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #10b981;
                color: white;
                padding: 16px 32px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 700;
                z-index: 2147483647;
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            `;
            toast.innerHTML = `✅ <strong>Replay Complete!</strong>`;
            document.body.appendChild(toast);

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 3000);
        }

        // Control methods
        pause() {
            this.isPaused = true;
            console.log('⏸️ Replay paused');
        }

        resume() {
            this.isPaused = false;
            console.log('▶️ Replay resumed');
        }

        stop() {
            this.isStopped = true;
            console.log('⏹️ Replay stopped');
        }

        setProgressCallback(callback) {
            this.progressCallback = callback;
        }
    }

    // Global replay instance
    window.SnappifyReplay = ReplayEngine;

    console.log('🎬 Snappify Replay Engine loaded and ready!');

    // Listen for replay commands
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        console.log('📨 Replay Engine: Message received:', msg.type);

        if (msg.type === 'execute-replay') {
            console.log('🎬 Snappify: Received replay command with', msg.steps?.length, 'steps');

            if (!msg.steps || msg.steps.length === 0) {
                console.error('❌ No steps provided for replay');
                sendResponse({ success: false, error: 'No steps provided' });
                return false;
            }

            console.log('First step description:', msg.steps[0]?.description);

            try {
                const engine = new window.SnappifyReplay(msg.steps);
                engine.start().then(() => {
                    console.log('✅ Snappify: Replay finished successfully');
                }).catch(error => {
                    console.error('❌ Replay error:', error);
                });

                console.log('✅ Replay engine started');
                sendResponse({ success: true });
            } catch (error) {
                console.error('❌ Failed to start replay engine:', error);
                sendResponse({ success: false, error: error.message });
            }

            return true; // Keep message channel open for async response
        }

        return false;
    });

    console.log('✅ Message listener registered successfully');

})();
