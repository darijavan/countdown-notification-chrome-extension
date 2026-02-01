/**
 * Represents a countdown timer detected on a web page
 */
export interface CountdownTimer {
  /** Unique identifier for this timer */
  id: string;
  /** The HTML element containing the countdown */
  element: HTMLElement;
  /** Initial time in seconds when first detected */
  initialSeconds: number;
  /** Current time in seconds */
  currentSeconds: number;
  /** Timestamp when the timer was first detected */
  detectedAt: number;
  /** Whether this timer has reached zero */
  hasCompleted: boolean;
  /** The URL of the page where the timer was detected */
  pageUrl: string;
  /** The text content of the timer element */
  displayText: string;
}

/**
 * Message types for communication between content script and background script
 */
export enum MessageType {
  COUNTDOWN_DETECTED = 'COUNTDOWN_DETECTED',
  COUNTDOWN_COMPLETED = 'COUNTDOWN_COMPLETED',
  COUNTDOWN_UPDATED = 'COUNTDOWN_UPDATED'
}

/**
 * Message structure for countdown events
 */
export interface CountdownMessage {
  type: MessageType;
  timer: Omit<CountdownTimer, 'element'>;
}

/**
 * Configuration options for countdown detection
 */
export interface CountdownConfig {
  /** Minimum seconds to consider as a valid countdown */
  minSeconds: number;
  /** Maximum seconds to consider as a valid countdown (e.g., ignore year countdowns) */
  maxSeconds: number;
  /** How often to check for countdowns (in milliseconds) */
  checkInterval: number;
  /** Patterns to match countdown formats */
  patterns: RegExp[];
}
