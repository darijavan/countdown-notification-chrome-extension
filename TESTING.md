# Manual Testing Guide

This guide helps you manually test the Countdown Notification Chrome Extension.

## Prerequisites

1. Chrome browser (version 88 or later)
2. Built extension (run `npm run build` if not already done)

## Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked"
4. Navigate to and select the `dist` folder from this project
5. The extension should now appear in your extensions list

## Test Scenarios

### Test 1: Basic Timer Detection

1. Open the included `test-page.html` file in Chrome:
   - Option A: Drag the file into Chrome
   - Option B: Navigate to `file:///path/to/countdown-notification-chrome-extension/test-page.html`

2. Open Chrome DevTools (F12) and go to the Console tab

3. You should see:
   - "Countdown Extension: Content script initialized"
   - "Countdown Extension: Detected X countdown timer(s)"

4. Check the background script console:
   - Click on the extension's "service worker" link in `chrome://extensions/`
   - You should see messages like "Background: New countdown detected with Xs remaining"

### Test 2: Countdown Completion Notification

1. Keep the test page open
2. Wait for one of the timers to reach zero (the shortest is 15 seconds)
3. You should receive a desktop notification saying "Countdown Completed! ⏰"
4. The notification should include the hostname and initial duration

### Test 3: Notification Click

1. When you receive a notification, click on it
2. Chrome should focus or open the tab with the countdown timer
3. The notification should disappear

### Test 4: Multiple Timers

1. The test page includes 5 different timer formats:
   - HH:MM:SS (1 minute)
   - MM:SS (30 seconds)
   - Seconds only (15 seconds)
   - Text format (45 seconds)
   - Mixed format (2 minutes)

2. All timers should be detected
3. You should receive a notification for each timer as it completes

### Test 5: Real-World Websites

Test on websites with actual countdown timers:

1. **E-commerce Sales**: Visit sites with flash sales or limited-time offers
   - Example: Look for sites with "Sale ends in: XX:XX:XX"

2. **Live Streams**: Visit sites that count down to live events
   - Example: YouTube live streams with countdown timers

3. **Auction Sites**: Visit auction sites with bidding countdowns
   - Example: eBay listings with time remaining

4. **Event Pages**: Visit event registration pages with countdown timers

### Test 6: Dynamic Timer Detection

1. Open a blank page
2. Open DevTools Console
3. Inject a countdown timer dynamically:
   ```javascript
   const timer = document.createElement('div');
   timer.id = 'test-timer';
   timer.textContent = '00:30';
   timer.style.fontSize = '48px';
   document.body.appendChild(timer);
   
   let seconds = 30;
   setInterval(() => {
     if (seconds > 0) {
       seconds--;
       const mins = Math.floor(seconds / 60);
       const secs = seconds % 60;
       timer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
     }
   }, 1000);
   ```

4. The extension should detect this timer within 5 seconds
5. You should receive a notification when it reaches zero

## Expected Behaviors

### Content Script Logs

You should see these in the page's console:
- "Countdown Extension: Content script initialized"
- "Countdown Extension: Detected X countdown timer(s)"
- "Countdown Extension: Timer completed at [URL]"

### Background Script Logs

Access via the service worker link in chrome://extensions/:
- "Countdown Extension: Background script initialized"
- "Background: Received message COUNTDOWN_DETECTED from [URL]"
- "Background: New countdown detected with Xs remaining"
- "Background: Timer updated: Xs remaining"
- "Background: Timer completed: [timer text]"
- "Notification created: countdown-[id]"

### Notifications

- Should appear when a timer reaches zero
- Should include the site's hostname
- Should show the initial timer duration
- Should auto-dismiss after 10 seconds
- Clicking should navigate to the page

## Troubleshooting

### Extension Not Loading
- Check that you selected the `dist` folder, not the project root
- Ensure the build completed successfully
- Check for errors in chrome://extensions/

### No Timers Detected
- Check the page actually has countdown timers
- Open DevTools and verify the timer elements contain time-formatted text
- Check that timers are between 5 seconds and 24 hours
- Ensure the timer text matches one of the supported formats

### No Notifications
- Check that Chrome notifications are enabled in system settings
- Verify the countdown actually reached zero
- Check the background service worker console for errors
- Ensure the "notifications" permission is granted

### Console Errors
- If you see permission errors, reload the extension
- If you see "Failed to send message", check that the background script is running
- If you see TypeScript errors, rebuild the extension

## Performance Testing

1. Open a page with multiple timers (like the test page)
2. Open Chrome Task Manager (Shift+Esc)
3. Check the extension's memory and CPU usage
4. It should remain low (<10MB memory, <1% CPU when idle)

## Cleanup

After testing:
1. You can remove the extension from chrome://extensions/
2. Or disable it by toggling the switch
3. Test data is cleared automatically after 5 minutes

## Reporting Issues

If you find bugs during testing, please note:
- Browser version
- Steps to reproduce
- Console error messages
- Screenshots of unexpected behavior
