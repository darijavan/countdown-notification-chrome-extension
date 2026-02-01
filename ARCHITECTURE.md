# Architecture Overview

This document provides a detailed overview of the Countdown Notification Chrome Extension architecture.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Browser                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐                    ┌──────────────────┐    │
│  │  Web Page      │                    │  Background      │    │
│  │                │                    │  Service Worker  │    │
│  │  ┌──────────┐  │    Messages       │                  │    │
│  │  │ Content  │◄─┼───────────────────►│  Manages State   │    │
│  │  │ Script   │  │                    │  & Notifications │    │
│  │  └──────────┘  │                    └──────────────────┘    │
│  │       │        │                              │              │
│  │       │ Scans  │                              │ Creates      │
│  │       ▼        │                              ▼              │
│  │  ┌──────────┐  │                    ┌──────────────────┐    │
│  │  │   DOM    │  │                    │  Desktop         │    │
│  │  │ Elements │  │                    │  Notifications   │    │
│  │  └──────────┘  │                    └──────────────────┘    │
│  └────────────────┘                                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Content Script (`src/content/content.ts`)

**Purpose**: Runs on every web page to detect and monitor countdown timers.

**Responsibilities**:
- Scan the DOM for potential countdown timer elements
- Parse time formats from text content
- Track detected timers
- Monitor timer updates every second
- Send messages to background script when:
  - New timer detected
  - Timer updated
  - Timer completed (reached zero)

**Lifecycle**:
1. Injected when page loads (document_idle)
2. Performs initial scan
3. Sets up periodic checks (1 second intervals)
4. Continues running as long as page is open

**Message Flow**:
```
Content Script → Background Script
  - COUNTDOWN_DETECTED (new timer found)
  - COUNTDOWN_UPDATED (timer value changed)
  - COUNTDOWN_COMPLETED (timer reached zero)
```

### 2. Background Service Worker (`src/background/background.ts`)

**Purpose**: Manages global extension state and handles notifications.

**Responsibilities**:
- Receive messages from content scripts
- Maintain global timer registry across all tabs
- Create desktop notifications when countdowns complete
- Handle notification clicks (navigate to relevant tab)
- Clean up old completed timers (after 5 minutes)

**State Management**:
```typescript
Map<string, CountdownTimer>
  key: unique timer ID (URL + XPath)
  value: timer data (without DOM element)
```

**Notification Lifecycle**:
1. Receive COUNTDOWN_COMPLETED message
2. Create desktop notification
3. Auto-dismiss after 10 seconds
4. Handle click events (focus/open tab)

### 3. Countdown Detector (`src/utils/countdownDetector.ts`)

**Purpose**: Core logic for detecting and tracking countdown timers.

**Key Methods**:

- `scanPage()`: Find all countdown timers on the page
  - Queries all elements in the DOM
  - Filters out hidden/non-visual elements
  - Matches against time format patterns
  - Creates CountdownTimer objects

- `checkTimers()`: Update tracked timers and detect completions
  - Re-reads current timer values
  - Compares with previous values
  - Detects when timers reach zero
  - Returns updated and completed timers

- `findPotentialTimerElements()`: Efficient DOM traversal
  - Skips script/style/meta tags
  - Checks element visibility
  - Extracts direct text content only
  - Matches against time patterns

**Configuration**:
```typescript
{
  minSeconds: 5,        // Ignore very short timers
  maxSeconds: 86400,    // Ignore very long timers (24h)
  checkInterval: 1000,  // Check frequency (1 second)
  patterns: [...]       // RegEx patterns for time formats
}
```

### 4. Time Parser (`src/utils/timeParser.ts`)

**Purpose**: Parse various time formats and provide utility functions.

**Supported Formats**:

1. **Colon-separated**: `HH:MM:SS`, `MM:SS`
   - Examples: "01:30:45", "30:45"
   
2. **Plain numbers**: Just seconds
   - Examples: "45", "120"
   
3. **Text with units**: Hours, minutes, seconds
   - Examples: "5 minutes 30 seconds", "1h 30m 45s"

**Key Functions**:

- `parseTimeToSeconds()`: Convert any format to seconds
- `generateTimerId()`: Create unique ID from element + URL
- `formatSeconds()`: Convert seconds to readable format
- `getXPath()`: Generate XPath for element identification

### 5. Type Definitions (`src/types/countdown.ts`)

**Purpose**: TypeScript interfaces for type safety.

**Key Types**:

```typescript
// Represents a detected countdown timer
interface CountdownTimer {
  id: string;              // Unique identifier
  element: HTMLElement;    // DOM element (content script only)
  initialSeconds: number;  // Original duration
  currentSeconds: number;  // Current value
  detectedAt: number;      // Timestamp
  hasCompleted: boolean;   // Completion status
  pageUrl: string;         // Page location
  displayText: string;     // Current display text
}

// Message types for script communication
enum MessageType {
  COUNTDOWN_DETECTED,
  COUNTDOWN_UPDATED,
  COUNTDOWN_COMPLETED
}

// Configuration options
interface CountdownConfig {
  minSeconds: number;
  maxSeconds: number;
  checkInterval: number;
  patterns: RegExp[];
}
```

## Data Flow

### Timer Detection Flow

```
1. Page loads
   ↓
2. Content script initializes
   ↓
3. Scan DOM for timer elements
   ↓
4. Parse text content → seconds
   ↓
5. Validate (5s < timer < 24h)
   ↓
6. Create CountdownTimer object
   ↓
7. Send COUNTDOWN_DETECTED message
   ↓
8. Background stores in global registry
```

### Timer Monitoring Flow

```
1. Every second (setInterval)
   ↓
2. For each tracked timer
   ↓
3. Re-read element text content
   ↓
4. Parse new value
   ↓
5. Compare with previous value
   ↓
6. If decreased → COUNTDOWN_UPDATED
   ↓
7. If reached 0 → COUNTDOWN_COMPLETED
   ↓
8. Background shows notification
```

### Notification Interaction Flow

```
1. User clicks notification
   ↓
2. Background receives click event
   ↓
3. Extract timer ID from notification ID
   ↓
4. Look up timer in registry
   ↓
5. Query all tabs for matching URL
   ↓
6a. If found → focus tab
6b. If not found → open new tab
   ↓
7. Clear notification
```

## Performance Considerations

### DOM Scanning Optimization

1. **Lazy Evaluation**: Only scan visible elements
2. **Early Exits**: Skip non-visual elements immediately
3. **Pattern Pre-filtering**: Quick regex check before parsing
4. **Caching**: Store tracked timers, don't re-scan

### Memory Management

1. **Lean Timer Objects**: Serialize before sending (remove DOM references)
2. **Automatic Cleanup**: Remove completed timers after 5 minutes
3. **Map-based Storage**: Efficient O(1) lookups
4. **No Memory Leaks**: Proper event listener cleanup

### CPU Usage

1. **Fixed Intervals**: Predictable 1-second checks
2. **Bounded Scans**: Only check known timer elements
3. **No Busy Loops**: Event-driven architecture
4. **Efficient Regex**: Optimized time format patterns

## Extension Lifecycle

### Installation
1. User installs extension
2. Manifest loaded by Chrome
3. Background service worker initialized
4. Content scripts registered for injection

### Page Load
1. Page begins loading
2. Content script injected at document_idle
3. Initial DOM scan performed
4. Periodic checks begin

### Runtime
1. Content scripts monitor pages
2. Background manages notifications
3. Messages flow between contexts
4. State maintained in background

### Unload
1. User closes tab → content script stops
2. All tabs closed → background may sleep
3. Wake on message or alarm
4. Clean shutdown, no dangling resources

## Security Model

### Permissions

- `notifications`: Required for desktop notifications
- `activeTab`: Required for current tab access
- `scripting`: Required for content script injection
- `<all_urls>`: Required to scan all websites

### Isolation

- Content scripts run in isolated world
- No direct access to page JavaScript
- Message passing is only communication channel
- Background has no direct page access

### Data Privacy

- No external network requests
- No data collection or analytics
- Local processing only
- Automatic data cleanup

## Extension Points

### Adding New Time Formats

1. Add regex pattern to `DEFAULT_CONFIG.patterns`
2. Add parsing logic in `parseTimeToSeconds()`
3. Test with various inputs

### Customizing Detection

1. Modify `DEFAULT_CONFIG` values
2. Adjust `minSeconds` and `maxSeconds` thresholds
3. Change `checkInterval` for frequency

### Extending Notifications

1. Modify `showNotification()` parameters
2. Add custom notification data
3. Implement advanced notification actions

## Testing Strategy

### Unit Testing Approach
- Test time parsing with various formats
- Test timer ID generation
- Test state management logic

### Integration Testing Approach
- Test message passing between contexts
- Test notification creation and handling
- Test timer lifecycle (detect → update → complete)

### Manual Testing
- Use test-page.html with various formats
- Test on real-world websites
- Verify notifications appear correctly
- Test notification clicks

## Future Enhancements

Potential areas for improvement:

1. **User Configuration UI**: Options page for settings
2. **Timer History**: Log of completed countdowns
3. **Sound Notifications**: Audio alerts option
4. **Timer Filtering**: Whitelist/blacklist specific sites
5. **Advanced Patterns**: ML-based timer detection
6. **Batch Notifications**: Group multiple completions
7. **Snooze Feature**: Delay notifications
8. **Export Data**: Save timer history

## Conclusion

This architecture provides a robust, efficient, and extensible foundation for countdown detection and notification in Chrome. The clean separation of concerns, comprehensive type safety, and thoughtful performance optimizations make this a production-ready extension.
