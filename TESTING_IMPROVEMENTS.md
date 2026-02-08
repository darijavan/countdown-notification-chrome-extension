# Testing Guide for Countdown Detection Improvements

## Quick Start

1. **Build the extension**:
   ```bash
   npm run build
   ```

2. **Load in Chrome**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

3. **Test the improvements**:
   Follow the test scenarios below

## Test Scenario 1: YouTube False Positive Test

### Objective
Verify that the extension no longer triggers false positives on YouTube.

### Steps
1. Open YouTube (https://youtube.com)
2. Hover over various video thumbnails
3. Scroll through the feed
4. Watch video view counts and durations

### Expected Result
- ❌ Should NOT receive notifications for:
  - Video durations (e.g., "10:30" on thumbnails)
  - View counts changing
  - Subscriber counts
  - Like/dislike numbers
  - Video progress timestamps

### Success Criteria
No spurious notifications while browsing YouTube normally.

---

## Test Scenario 2: Test Page - YouTube-like False Positives

### Objective
Verify the improvements using the included test page.

### Steps
1. Open `test-youtube-like.html` in Chrome
2. Observe the page for 5 seconds
3. Wait for the real countdown to be detected

### Expected Result
- ❌ Should NOT trigger on:
  - Video durations (10:30, 5:45, 15:22)
  - Changing subscriber counts
  - Changing video views
  - Random changing numbers
  
- ✅ Should trigger on:
  - The "REAL Countdown" (00:30) after 2-3 seconds
  - Notification when countdown reaches 00:00

### Success Criteria
- Only 1 countdown detected (the real one)
- Notification appears when countdown completes
- Takes 2-3 seconds to confirm the countdown (not instant)

---

## Test Scenario 3: Original Test Page - Legitimate Countdowns

### Objective
Verify that legitimate countdowns are still detected correctly.

### Steps
1. Open `test-page.html` in Chrome
2. Check browser console for detection messages
3. Wait for countdowns to complete
4. Verify notifications appear

### Expected Result
- ✅ All 5 countdown formats detected:
  - HH:MM:SS format (00:01:00)
  - MM:SS format (00:30)
  - Seconds only (15) - **Note**: May NOT be detected due to stricter rules
  - Text with seconds (45 seconds)
  - Mixed units (2 minutes 0 seconds)

- ✅ Notifications appear when each countdown reaches zero
- ⏱️ Detection takes 2-3 seconds (not instant)

### Success Criteria
- Most countdowns detected and notify correctly
- Single-digit seconds countdown (15) may not be detected - this is expected behavior to avoid false positives

---

## Test Scenario 4: Edge Cases

### Test 4.1: Very Short Countdown
**Test**: Create a countdown starting at 5 seconds
```html
<div id="test" style="font-size: 48px;">5</div>
<script>
let s = 5;
setInterval(() => {
  if (s >= 0) document.getElementById('test').textContent = s--;
}, 1000);
</script>
```

**Expected**: May NOT be detected (single digit, too short validation period)
**Reason**: Trade-off to prevent false positives

### Test 4.2: Countdown Starting at 30 Seconds
**Test**: Countdown in MM:SS format
```html
<div id="test" style="font-size: 48px;">00:30</div>
<script>
let s = 30;
setInterval(() => {
  if (s >= 0) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    document.getElementById('test').textContent = 
      `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    s--;
  }
}, 1000);
</script>
```

**Expected**: SHOULD be detected after 2-3 seconds
**Reason**: Clear countdown format with decreasing behavior

### Test 4.3: Static Time Display (Not Counting Down)
**Test**: Time that doesn't change
```html
<div style="font-size: 48px;">10:30</div>
```

**Expected**: Should NOT be detected
**Reason**: No decreasing behavior observed

---

## Troubleshooting

### Issue: Legitimate countdown not detected

**Possible Causes**:
1. Countdown is too short (<10 seconds for pure numbers)
2. Not enough time for validation (need 2+ seconds)
3. Element has excluded class/ID (check `isLikelyNonCountdown()`)

**Solutions**:
- Wait at least 2-3 seconds after countdown starts
- Use colon format (MM:SS) instead of pure numbers
- Check browser console for debug messages

### Issue: Still getting false positives

**Possible Causes**:
1. Element not matching excluded patterns
2. New type of dynamic content not filtered

**Solutions**:
- Identify the element's classes/IDs
- Add new patterns to `isLikelyNonCountdown()` in `countdownDetector.ts`
- Report the issue with specific element details

---

## Debugging Tips

### View Console Logs
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for messages starting with "Countdown Extension:"

### Check Background Script
1. Go to `chrome://extensions/`
2. Click "service worker" under the extension
3. View background script logs

### Inspect Elements
1. Right-click on suspicious element
2. Choose "Inspect"
3. Check classes, IDs, and aria-labels
4. Compare against excluded patterns in code

---

## Performance Checks

### Memory Usage
1. Open Chrome Task Manager (Shift+Esc)
2. Find the extension process
3. Should use <10MB memory

### CPU Usage
1. In Task Manager, check CPU column
2. Should be <1% when idle
3. Brief spikes during scans are normal

---

## Reporting Issues

If you find problems, please provide:
1. **URL** where issue occurs
2. **Screenshot** of the element causing false positive
3. **Element inspection** (classes, IDs, HTML)
4. **Console logs** from both content and background scripts
5. **Expected vs actual behavior**

---

## Summary of Changes

### What's Different
- **Validation Delay**: 2-3 second delay before confirmation (was instant)
- **Pure Numbers**: Only 10-3600 seconds accepted (was 1-86400)
- **Single Digits**: No longer detected as countdowns (1-9)
- **Context Aware**: Filters YouTube and similar dynamic elements

### What's the Same
- All colon formats still work (HH:MM:SS, MM:SS)
- Text with units still works (5 minutes, 30 seconds)
- Notification behavior unchanged
- Performance characteristics similar

### Trade-offs
- ⏱️ Slight detection delay (acceptable)
- ⛔ Some very short countdowns not detected (prevents false positives)
- ✅ Dramatically fewer false positives
- ✅ More accurate overall
