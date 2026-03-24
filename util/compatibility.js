// Compatibility module for other extensions
import { getContext } from "../../../../extensions.js";

// Stepped Thinking specific variables
let isSteppedThinkingActive = false;

/**
 * Initializes listeners for specific extension events to prevent conflicts
 */
export function initCompatibilityListeners(onHideNextAiMessageReArm) {
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
}

/**
 * Checks if Stepped Thinking generation is currently active
 * @returns {boolean} True if active
 */
export function isSteppedThinkingRunning() {
    return isSteppedThinkingActive;
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
