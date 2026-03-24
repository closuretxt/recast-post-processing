// Compatibility module for other extensions

// IMPORTS
import { getContext } from "../../../../extensions.js";

// VARIABLES
const LOG_PREFIX = "[Recast Compatibility]";

let isSteppedThinkingActive = false; // Stepped Thinking specific variables

// INIT
// Initializes listeners for specific extension events to prevent conflicts
export async function initCompatibilityListeners(onHideNextAiMessageReArm) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const st = getContext();
    if (!st || !st.eventSource) return;

    // Listen for Stepped Thinking mutex capture
    st.eventSource.on('GENERATION_MUTEX_CAPTURED', () => {
        isSteppedThinkingActive = true;
    });

    // Listen for Stepped Thinking mutex release
    st.eventSource.on('GENERATION_MUTEX_RELEASED', () => {
        isSteppedThinkingActive = false;
        if (typeof onHideNextAiMessageReArm === 'function') {
            onHideNextAiMessageReArm();
        }
    });

    // Success
    console.warn(`${LOG_PREFIX} Initialized.`);
}

/**
 * Checks if the stream intercept should be skipped due to other active extensions
 * @param {boolean} compatibilityModeEnabled - Whether compatibility mode is enabled in settings
 * @returns {boolean} True if it should be skipped
 */
export function shouldSkipStreamIntercept(compatibilityModeEnabled) {
    if (compatibilityModeEnabled && isSteppedThinkingRunning()) {
        return true;
    }
    return false;
}

/**
 * Checks if MESSAGE_RECEIVED should be ignored due to other active extensions
 * @param {boolean} compatibilityModeEnabled - Whether compatibility mode is enabled in settings
 * @returns {boolean} True if it should be ignored
 */
export function shouldIgnoreMessageReceived(compatibilityModeEnabled) {
    if (compatibilityModeEnabled && isSteppedThinkingRunning()) {
        return true;
    }
    return false;
}

// Random Stuff
export function isSteppedThinkingRunning() { // Checks if Stepped Thinking generation is currently active
    return isSteppedThinkingActive;
}
