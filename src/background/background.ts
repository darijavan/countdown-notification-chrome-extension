import { MessageType, CountdownMessage } from '../types/countdown';
import { formatSeconds } from '../utils/timeParser';

/**
 * Background service worker for the Countdown Notification extension
 * This script handles messages from content scripts and manages notifications.
 */

// Track timers across all tabs
const globalTimers = new Map<string, CountdownMessage['timer']>();

/**
 * Show a notification to the user
 * 
 * @param timer - The timer that triggered the notification
 */
function showNotification(timer: CountdownMessage['timer']): void {
  const notificationId = `countdown-${timer.id}`;
  const url = new URL(timer.pageUrl);
  
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icon48.png',
    title: 'Countdown Completed! ⏰',
    message: `A countdown timer has reached zero on ${url.hostname}`,
    contextMessage: `Initial duration: ${formatSeconds(timer.initialSeconds)}`,
    priority: 2,
    requireInteraction: false
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('Failed to create notification:', chrome.runtime.lastError);
    } else {
      console.log(`Notification created: ${notificationId}`);
    }
  });
  
  // Auto-clear notification after 10 seconds
  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, 10000);
}

/**
 * Handle messages from content scripts
 * 
 * @param message - The message received
 * @param sender - The sender information
 */
function handleMessage(
  message: CountdownMessage,
  sender: chrome.runtime.MessageSender
): void {
  console.log('Background: Received message', message.type, 'from', sender.tab?.url);
  
  switch (message.type) {
    case MessageType.COUNTDOWN_DETECTED:
      // Store the newly detected timer
      globalTimers.set(message.timer.id, message.timer);
      console.log(`Background: New countdown detected with ${message.timer.currentSeconds}s remaining`);
      break;
      
    case MessageType.COUNTDOWN_UPDATED: {
      // Update the timer state
      const existingTimer = globalTimers.get(message.timer.id);
      if (existingTimer) {
        Object.assign(existingTimer, message.timer);
        console.log(`Background: Timer updated: ${message.timer.currentSeconds}s remaining`);
      }
      break;
    }
      
    case MessageType.COUNTDOWN_COMPLETED: {
      // Show notification for completed countdown
      showNotification(message.timer);
      
      // Update timer state
      const completedTimer = globalTimers.get(message.timer.id);
      if (completedTimer) {
        completedTimer.hasCompleted = true;
      }
      
      console.log(`Background: Timer completed: ${message.timer.displayText}`);
      break;
    }
      
    default:
      console.warn('Background: Unknown message type:', message);
  }
}

/**
 * Handle notification clicks
 * 
 * @param notificationId - The ID of the clicked notification
 */
function handleNotificationClick(notificationId: string): void {
  console.log('Notification clicked:', notificationId);
  
  // Extract timer ID from notification ID
  const timerId = notificationId.replace('countdown-', '');
  const timer = globalTimers.get(timerId);
  
  if (timer) {
    // Find and activate the tab with the countdown
    chrome.tabs.query({}, (tabs) => {
      const tab = tabs.find(t => t.url === timer.pageUrl);
      
      if (tab && tab.id !== undefined) {
        // Focus the tab
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId!, { focused: true });
      } else {
        // Tab not found, open a new one
        chrome.tabs.create({ url: timer.pageUrl });
      }
    });
  }
  
  // Clear the notification
  chrome.notifications.clear(notificationId);
}

/**
 * Initialize the background script
 */
function initialize(): void {
  // Listen for messages from content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message as CountdownMessage, sender);
    sendResponse({ received: true });
    return true; // Keep the message channel open for async response
  });
  
  // Listen for notification clicks
  chrome.notifications.onClicked.addListener(handleNotificationClick);
  
  // Clean up old completed timers periodically (every 5 minutes)
  setInterval(() => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    for (const [id, timer] of globalTimers.entries()) {
      if (timer.hasCompleted && (now - timer.detectedAt) > fiveMinutes) {
        globalTimers.delete(id);
        console.log(`Background: Cleaned up old timer: ${id}`);
      }
    }
  }, 5 * 60 * 1000);
  
  console.log('Countdown Extension: Background script initialized');
}

// Start the background script
initialize();
