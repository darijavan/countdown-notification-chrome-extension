/**
 * Utility functions for parsing countdown timer formats
 */

/**
 * Parse various time formats and convert to seconds
 * Supports formats like:
 * - HH:MM:SS (e.g., "01:30:45")
 * - MM:SS (e.g., "30:45")
 * - SS (e.g., "45")
 * - H:MM:SS (e.g., "1:30:45")
 * - Text with numbers (e.g., "5 minutes 30 seconds")
 * 
 * @param text - The text to parse
 * @returns The number of seconds, or null if no valid time format is found
 */
export function parseTimeToSeconds(text: string): number | null {
  // Clean the text
  const cleaned = text.trim();
  
  // Pattern 1: HH:MM:SS or H:MM:SS or MM:SS or M:SS
  const colonPattern = /(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/;
  const colonMatch = cleaned.match(colonPattern);
  
  if (colonMatch) {
    const parts = colonMatch.slice(1).filter(p => p !== undefined).map(Number);
    
    if (parts.length === 3) {
      // HH:MM:SS format
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      // MM:SS format
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    }
  }
  
  // Pattern 2: Just seconds (pure number)
  const pureNumberPattern = /^\d{1,5}$/;
  if (pureNumberPattern.test(cleaned)) {
    const seconds = parseInt(cleaned, 10);
    // Only consider it a countdown if it's a reasonable range
    if (seconds > 0 && seconds <= 86400) { // Max 24 hours
      return seconds;
    }
  }
  
  // Pattern 3: Text with time units (e.g., "5 minutes 30 seconds", "1h 30m 45s")
  let totalSeconds = 0;
  
  // Hours
  const hoursMatch = cleaned.match(/(\d+)\s*(?:hour|hr|h)(?:s)?/i);
  if (hoursMatch) {
    totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
  }
  
  // Minutes
  const minutesMatch = cleaned.match(/(\d+)\s*(?:minute|min|m)(?:s)?/i);
  if (minutesMatch) {
    totalSeconds += parseInt(minutesMatch[1], 10) * 60;
  }
  
  // Seconds
  const secondsMatch = cleaned.match(/(\d+)\s*(?:second|sec|s)(?:s)?/i);
  if (secondsMatch) {
    totalSeconds += parseInt(secondsMatch[1], 10);
  }
  
  if (totalSeconds > 0) {
    return totalSeconds;
  }
  
  return null;
}

/**
 * Check if a time value represents a countdown (decreasing over time)
 * 
 * @param previousSeconds - Previous time value in seconds
 * @param currentSeconds - Current time value in seconds
 * @returns True if the time is decreasing (countdown)
 */
export function isCountingDown(previousSeconds: number, currentSeconds: number): boolean {
  return currentSeconds < previousSeconds;
}

/**
 * Generate a unique ID for a timer based on its element and position
 * 
 * @param element - The HTML element
 * @param pageUrl - The URL of the page
 * @returns A unique identifier string
 */
export function generateTimerId(element: HTMLElement, pageUrl: string): string {
  const xpath = getXPath(element);
  return `${pageUrl}::${xpath}`;
}

/**
 * Get the XPath of an element
 * 
 * @param element - The HTML element
 * @returns The XPath string
 */
function getXPath(element: HTMLElement): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  if (element === document.body) {
    return '/html/body';
  }
  
  const parent = element.parentElement;
  if (!parent) {
    return '';
  }
  
  const siblings = Array.from(parent.children);
  const index = siblings.indexOf(element) + 1;
  const tagName = element.tagName.toLowerCase();
  
  return `${getXPath(parent)}/${tagName}[${index}]`;
}

/**
 * Format seconds into a readable time string
 * 
 * @param seconds - The number of seconds
 * @returns A formatted string (e.g., "1h 30m 45s")
 */
export function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}
