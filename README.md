# Countdown Notification Chrome Extension

A Chrome extension written in TypeScript that automatically detects countdown timers on web pages and notifies you when they reach zero. The extension uses a clean, modular architecture with comprehensive documentation.

## Features

- 🔍 **Automatic Detection**: Scans web pages for countdown timers in various formats
- ⏰ **Multiple Format Support**: Detects countdowns in formats like:
  - `HH:MM:SS` (e.g., "01:30:45")
  - `MM:SS` (e.g., "30:45")
  - `SS` (e.g., "45")
  - Text with units (e.g., "5 minutes 30 seconds", "1h 30m 45s")
- 🔔 **Real-time Notifications**: Desktop notifications when countdowns complete
- 🎯 **Smart Filtering**: Ignores very short (<5s) or very long (>24h) timers
- 🔄 **Dynamic Detection**: Continues to scan for new timers that appear dynamically
- 📍 **Click to Navigate**: Click notifications to jump to the page with the countdown

## Architecture

### Project Structure

```
countdown-notification-chrome-extension/
├── src/
│   ├── background/
│   │   └── background.ts      # Service worker for notifications
│   ├── content/
│   │   └── content.ts          # Content script for page scanning
│   ├── types/
│   │   └── countdown.ts        # TypeScript interfaces and types
│   └── utils/
│       ├── timeParser.ts       # Time parsing utilities
│       └── countdownDetector.ts # Countdown detection logic
├── public/
│   ├── manifest.json           # Chrome extension manifest
│   └── icon*.png              # Extension icons
├── dist/                       # Compiled output
├── package.json
├── tsconfig.json
└── webpack.config.js
```

### Key Components

#### 1. **Content Script** (`src/content/content.ts`)
- Runs on all web pages
- Scans DOM for countdown timer elements
- Monitors timers for updates
- Sends messages to background script

#### 2. **Background Service Worker** (`src/background/background.ts`)
- Manages countdown state across tabs
- Creates desktop notifications
- Handles notification clicks
- Performs cleanup of old timers

#### 3. **Countdown Detector** (`src/utils/countdownDetector.ts`)
- Core detection logic
- Maintains tracked timers
- Filters and validates countdowns
- Updates timer states

#### 4. **Time Parser** (`src/utils/timeParser.ts`)
- Parses various time formats
- Converts formats to seconds
- Generates unique timer IDs
- Formats display strings

## Installation

### For Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/darijavan/countdown-notification-chrome-extension.git
   cd countdown-notification-chrome-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

### For Production

1. Build the extension:
   ```bash
   npm run build
   ```

2. The `dist` folder contains the complete extension ready to be loaded or packaged.

## Usage

1. **Install the extension** following the installation steps above

2. **Browse any website** with countdown timers (e.g., e-commerce sales, live streams, event countdowns)

3. **Automatic detection**: The extension automatically detects countdown timers on the page

4. **Get notified**: When a countdown reaches zero, you'll receive a desktop notification

5. **Click notification**: Click the notification to navigate to the page with the completed countdown

## Development

### Available Scripts

- `npm run build` - Build for production (minified)
- `npm run dev` - Build for development with watch mode
- `npm run lint` - Run ESLint to check code quality

### Testing

The extension can be tested by:

1. Creating a simple HTML page with countdown timers:
   ```html
   <div id="timer1">05:00</div>
   <div id="timer2">3 minutes 30 seconds</div>
   <div id="timer3">10</div>
   ```

2. Using JavaScript to update these timers:
   ```javascript
   setInterval(() => {
     // Decrement timer values
   }, 1000);
   ```

3. Loading the extension and observing:
   - Console logs showing detection
   - Notifications when timers reach zero

## Configuration

The extension can be configured by modifying `DEFAULT_CONFIG` in `src/utils/countdownDetector.ts`:

```typescript
export const DEFAULT_CONFIG: CountdownConfig = {
  minSeconds: 5,           // Minimum countdown duration to track
  maxSeconds: 86400,       // Maximum countdown duration (24 hours)
  checkInterval: 1000,     // Check frequency in milliseconds
  patterns: [/* RegEx patterns */]
};
```

## Browser Compatibility

- Chrome/Chromium 88+
- Edge 88+
- Other Chromium-based browsers supporting Manifest V3

## Technical Details

### Manifest V3

This extension uses Manifest V3, the latest Chrome extension platform:
- Service worker instead of background page
- Improved security and performance
- Modern API design

### TypeScript

The entire codebase is written in TypeScript for:
- Type safety
- Better IDE support
- Enhanced maintainability
- Comprehensive documentation

### Detection Algorithm

1. **Initial Scan**: When a page loads, scan all visible elements
2. **Pattern Matching**: Check text content against time format patterns
3. **Validation**: Verify countdown is within valid duration range
4. **Tracking**: Store detected timers with unique IDs
5. **Monitoring**: Check every second for timer updates
6. **Completion**: Notify when timer reaches zero

### Performance Considerations

- Efficient DOM traversal with early exits
- Skips hidden and non-visual elements
- Periodic cleanup of completed timers
- Minimal memory footprint

## Privacy

This extension:
- ✅ Does not collect any user data
- ✅ Does not make external network requests
- ✅ Only reads page content to detect countdown timers
- ✅ Does not modify page content
- ✅ All processing happens locally in your browser

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - See LICENSE file for details

## Author

Created as a clean, well-documented example of a Chrome extension with TypeScript.
