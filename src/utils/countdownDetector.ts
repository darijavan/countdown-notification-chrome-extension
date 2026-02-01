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
    // Match pure numbers that could be seconds
    /\b\d{1,5}\b/,
    // Match text with time units
    /\d+\s*(?:hour|hr|h|minute|min|m|second|sec|s)(?:s)?/i
  ]
};

/**
 * Detects countdown timers on a web page
 */
export class CountdownDetector {
  private config: CountdownConfig;
  private trackedTimers: Map<string, CountdownTimer>;
  
  constructor(config: Partial<CountdownConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.trackedTimers = new Map();
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
    
    for (const element of potentialElements) {
      const text = element.textContent?.trim() || '';
      const seconds = parseTimeToSeconds(text);
      
      if (seconds !== null && this.isValidCountdown(seconds)) {
        const id = generateTimerId(element, pageUrl);
        const existingTimer = this.trackedTimers.get(id);
        
        if (existingTimer) {
          // Update existing timer
          existingTimer.currentSeconds = seconds;
          existingTimer.displayText = text;
        } else {
          // Create new timer
          const timer: CountdownTimer = {
            id,
            element,
            initialSeconds: seconds,
            currentSeconds: seconds,
            detectedAt: Date.now(),
            hasCompleted: false,
            pageUrl,
            displayText: text
          };
          
          this.trackedTimers.set(id, timer);
          newTimers.push(timer);
        }
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
      
      // Get direct text content (not including children)
      const text = this.getDirectTextContent(element);
      
      if (this.matchesTimePattern(text)) {
        elements.push(element);
      }
    }
    
    return elements;
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
