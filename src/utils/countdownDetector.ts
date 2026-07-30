import { CountdownTimer, CountdownConfig } from '../types/countdown';
import { parseTimeToSeconds, generateTimerId } from './timeParser';

/**
 * Default configuration for countdown detection
 */
export const DEFAULT_CONFIG: CountdownConfig = {
  minSeconds: 5,           // Ignore timers less than 5 seconds
  maxSeconds: 86400,       // Ignore timers more than 24 hours (likely dates, not countdowns)
  checkInterval: 1000,     // Check every second
  patterns: [
    // Match time formats with colons (HH:MM:SS, MM:SS)
    /\d{1,2}:\d{2}(?::\d{2})?/,
    // Match text with time units (more specific than pure numbers)
    /\d+\s*(?:hour|hr|h|minute|min|m|second|sec|s)(?:s)?/i
  ]
};

/**
 * Validation thresholds for confirming countdown timers
 */
const MIN_OBSERVATIONS_FOR_CONFIRMATION = 2;
const MIN_TIME_FOR_CONFIRMATION_MS = 2000;
const POTENTIAL_TIMER_STALE_THRESHOLD_MS = 10000;

/**
 * Potential timer that needs validation
 */
interface PotentialTimer {
  id: string;
  element: HTMLElement;
  firstSeenSeconds: number;
  firstSeenAt: number;
  lastSeenSeconds: number;
  lastSeenAt: number;
  observations: number;
}

/**
 * Detects countdown timers on a web page
 */
export class CountdownDetector {
  private config: CountdownConfig;
  private trackedTimers: Map<string, CountdownTimer>;
  private potentialTimers: Map<string, PotentialTimer>;
  
  constructor(config: Partial<CountdownConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.trackedTimers = new Map();
    this.potentialTimers = new Map();
  }
  
  /**
   * Scan the page for potential countdown timers
   * 
   * @param document - The document to scan
   * @returns Array of detected countdown timers
   */
  public scanPage(document: Document): CountdownTimer[] {
    const pageUrl = document.location.href;
    const potentialElements = this.findPotentialTimerElements(document);
    const newTimers: CountdownTimer[] = [];
    const now = Date.now();
    
    for (const element of potentialElements) {
      const text = element.textContent?.trim() || '';
      const seconds = parseTimeToSeconds(text);
      
      if (seconds !== null && this.isValidCountdown(seconds)) {
        const id = generateTimerId(element, pageUrl);
        
        // Check if this is already a confirmed timer
        const existingTimer = this.trackedTimers.get(id);
        if (existingTimer) {
          // Update existing timer
          existingTimer.currentSeconds = seconds;
          existingTimer.displayText = text;
          continue;
        }
        
        // Check if this is a potential timer we're tracking
        const potentialTimer = this.potentialTimers.get(id);
        
        if (potentialTimer) {
          // Update observations
          potentialTimer.lastSeenSeconds = seconds;
          potentialTimer.lastSeenAt = now;
          potentialTimer.observations++;
          
          // Validate: require at least 2 observations over 2 seconds and must show decreasing behavior
          const timeSinceFirstSeen = now - potentialTimer.firstSeenAt;
          const hasDecreased = seconds < potentialTimer.firstSeenSeconds;
          
          if (potentialTimer.observations >= MIN_OBSERVATIONS_FOR_CONFIRMATION && 
              timeSinceFirstSeen >= MIN_TIME_FOR_CONFIRMATION_MS && 
              hasDecreased) {
            // Promote to confirmed timer
            const timer: CountdownTimer = {
              id,
              element,
              initialSeconds: potentialTimer.firstSeenSeconds,
              currentSeconds: seconds,
              detectedAt: now,
              hasCompleted: false,
              pageUrl,
              displayText: text
            };
            
            this.trackedTimers.set(id, timer);
            this.potentialTimers.delete(id);
            newTimers.push(timer);
          }
        } else {
          // First time seeing this element - add to potential timers
          this.potentialTimers.set(id, {
            id,
            element,
            firstSeenSeconds: seconds,
            firstSeenAt: now,
            lastSeenSeconds: seconds,
            lastSeenAt: now,
            observations: 1
          });
        }
      }
    }
    
    // Clean up stale potential timers (older than 10 seconds)
    for (const [id, potential] of this.potentialTimers.entries()) {
      if (now - potential.lastSeenAt > POTENTIAL_TIMER_STALE_THRESHOLD_MS) {
        this.potentialTimers.delete(id);
      }
    }
    
    return newTimers;
  }
  
  /**
   * Check all tracked timers for updates and completions
   * 
   * @returns Object containing updated and completed timers
   */
  public checkTimers(): {
    updated: CountdownTimer[];
    completed: CountdownTimer[];
  } {
    const updated: CountdownTimer[] = [];
    const completed: CountdownTimer[] = [];
    
    for (const timer of this.trackedTimers.values()) {
      if (timer.hasCompleted) {
        continue;
      }
      
      const text = timer.element.textContent?.trim() || '';
      const currentSeconds = parseTimeToSeconds(text);
      
      if (currentSeconds === null) {
        // Timer element no longer has valid time format
        continue;
      }
      
      const previousSeconds = timer.currentSeconds;
      timer.currentSeconds = currentSeconds;
      timer.displayText = text;
      
      // Check if countdown is decreasing
      if (currentSeconds < previousSeconds) {
        updated.push(timer);
        
        // Check if countdown has reached zero
        if (currentSeconds === 0) {
          timer.hasCompleted = true;
          completed.push(timer);
        }
      }
    }
    
    return { updated, completed };
  }
  
  /**
   * Find all elements on the page that might contain countdown timers
   * 
   * @param document - The document to search
   * @returns Array of potential timer elements
   */
  private findPotentialTimerElements(document: Document): HTMLElement[] {
    const elements: HTMLElement[] = [];
    const allElements = document.querySelectorAll('*');
    
    for (const element of Array.from(allElements)) {
      if (!(element instanceof HTMLElement)) {
        continue;
      }
      
      // Skip script, style, and other non-visual elements
      const tagName = element.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'meta', 'link'].includes(tagName)) {
        continue;
      }
      
      // Skip hidden elements
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') {
        continue;
      }
      
      // Skip elements that are commonly not countdowns
      if (this.isLikelyNonCountdown(element)) {
        continue;
      }
      
      // Get direct text content (not including children)
      const text = this.getDirectTextContent(element);
      
      if (this.matchesTimePattern(text)) {
        elements.push(element);
      }
    }
    
    return elements;
  }
  
  /**
   * Check if an element is likely not a countdown timer
   * Filters out common elements that change frequently but aren't countdowns
   * 
   * @param element - The element to check
   * @returns True if the element is likely not a countdown
   */
  private isLikelyNonCountdown(element: HTMLElement): boolean {
    const classList = Array.from(element.classList);
    const id = element.id.toLowerCase();
    const classString = classList.join(' ').toLowerCase();
    
    // Common patterns that indicate non-countdown elements
    const excludePatterns = [
      // YouTube-specific
      'view-count', 'views', 'subscriber', 'like', 'dislike',
      'thumbnail-duration', 'ytd-thumbnail-overlay-time-status',
      'badge-shape-wiz', 'metadata-stats', 'yt-',
      
      // General patterns
      'price', 'cost', 'amount', 'total', 'score', 'rating',
      'follower', 'following', 'member', 'user-count',
      'progress', 'percentage', 'volume', 'slider'
    ];
    
    // Check class names and ID
    for (const pattern of excludePatterns) {
      if (classString.includes(pattern) || id.includes(pattern)) {
        return true;
      }
    }
    
    // Check if element or parent has aria-label suggesting it's not a countdown
    const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('view') || ariaLabel.includes('subscriber') || 
        ariaLabel.includes('like') || ariaLabel.includes('rating')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get only the direct text content of an element, excluding child elements
   * 
   * @param element - The element to get text from
   * @returns The direct text content
   */
  private getDirectTextContent(element: HTMLElement): string {
    let text = '';
    
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || '';
      }
    }
    
    return text.trim();
  }
  
  /**
   * Check if text matches any of the time patterns
   * 
   * @param text - The text to check
   * @returns True if text matches a time pattern
   */
  private matchesTimePattern(text: string): boolean {
    return this.config.patterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Check if a countdown duration is valid based on configuration
   * 
   * @param seconds - The duration in seconds
   * @returns True if the duration is valid
   */
  private isValidCountdown(seconds: number): boolean {
    return seconds >= this.config.minSeconds && seconds <= this.config.maxSeconds;
  }
  
  /**
   * Get all currently tracked timers
   * 
   * @returns Array of all tracked timers
   */
  public getTrackedTimers(): CountdownTimer[] {
    return Array.from(this.trackedTimers.values());
  }
  
  /**
   * Clear all tracked timers
   */
  public clearTimers(): void {
    this.trackedTimers.clear();
  }
}
