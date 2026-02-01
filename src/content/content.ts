import { CountdownDetector, DEFAULT_CONFIG } from '../utils/countdownDetector';
import { MessageType, CountdownMessage, CountdownTimer } from '../types/countdown';

/**
 * Content script that runs on web pages to detect countdown timers
 * This script monitors the page for countdown timers and notifies the background script
 * when countdowns are detected or completed.
 */

// Initialize the countdown detector
const detector = new CountdownDetector(DEFAULT_CONFIG);

// Track if we've already performed the initial scan
let hasScannedInitially = false;

/**
 * Send a message to the background script
 * 
 * @param message - The message to send
 */
function sendMessage(message: CountdownMessage): void {
  try {
    chrome.runtime.sendMessage(message, () => {
      // Handle potential errors (e.g., if background script isn't ready)
      if (chrome.runtime.lastError) {
        console.debug('Countdown Extension: Failed to send message:', chrome.runtime.lastError.message);
      }
    });
  } catch (error) {
    console.debug('Countdown Extension: Error sending message:', error);
  }
}

/**
 * Convert a CountdownTimer to a serializable format (without DOM element)
 * 
 * @param timer - The timer to serialize
 * @returns A serializable timer object
 */
function serializeTimer(timer: CountdownTimer): Omit<CountdownTimer, 'element'> {
  return {
    id: timer.id,
    initialSeconds: timer.initialSeconds,
    currentSeconds: timer.currentSeconds,
    detectedAt: timer.detectedAt,
    hasCompleted: timer.hasCompleted,
    pageUrl: timer.pageUrl,
    displayText: timer.displayText
  };
}

/**
 * Perform initial scan of the page for countdown timers
 */
function performInitialScan(): void {
  if (hasScannedInitially) {
    return;
  }
  
  hasScannedInitially = true;
  
  try {
    const newTimers = detector.scanPage(document);
    
    // Notify background script about detected timers
    for (const timer of newTimers) {
      sendMessage({
        type: MessageType.COUNTDOWN_DETECTED,
        timer: serializeTimer(timer)
      });
    }
    
    if (newTimers.length > 0) {
      console.log(`Countdown Extension: Detected ${newTimers.length} countdown timer(s)`);
    }
  } catch (error) {
    console.error('Countdown Extension: Error during initial scan:', error);
  }
}

/**
 * Check all tracked timers for updates
 */
function checkTimers(): void {
  try {
    const { updated, completed } = detector.checkTimers();
    
    // Notify about updated timers
    for (const timer of updated) {
      sendMessage({
        type: MessageType.COUNTDOWN_UPDATED,
        timer: serializeTimer(timer)
      });
    }
    
    // Notify about completed timers
    for (const timer of completed) {
      sendMessage({
        type: MessageType.COUNTDOWN_COMPLETED,
        timer: serializeTimer(timer)
      });
      
      console.log(`Countdown Extension: Timer completed at ${document.location.href}`);
    }
  } catch (error) {
    console.error('Countdown Extension: Error checking timers:', error);
  }
}

/**
 * Initialize the content script
 */
function initialize(): void {
  // Perform initial scan when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', performInitialScan);
  } else {
    performInitialScan();
  }
  
  // Set up periodic checks for timer updates
  setInterval(checkTimers, DEFAULT_CONFIG.checkInterval);
  
  // Also scan for new timers periodically (every 5 seconds)
  // This helps detect timers that appear dynamically
  setInterval(() => {
    try {
      const newTimers = detector.scanPage(document);
      
      for (const timer of newTimers) {
        sendMessage({
          type: MessageType.COUNTDOWN_DETECTED,
          timer: serializeTimer(timer)
        });
      }
    } catch (error) {
      console.error('Countdown Extension: Error during periodic scan:', error);
    }
  }, 5000);
  
  console.log('Countdown Extension: Content script initialized');
}

// Start the extension
initialize();
