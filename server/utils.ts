/**
 * Utility functions for ID generation and security
 */

let idCounter = Math.floor(Date.now() / 1000);

/**
 * Generate a simple numeric ID (sequential based on timestamp)
 * Format: timestamp + sequential counter
 */
export function generateNumericId(): string {
  idCounter++;
  return idCounter.toString();
}

/**
 * Reset ID counter (for testing)
 */
export function resetIdCounter(): void {
  idCounter = Math.floor(Date.now() / 1000);
}
