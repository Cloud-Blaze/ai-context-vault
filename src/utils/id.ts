/**
 * Generates a unique ID using a combination of timestamp and random number
 * @returns A unique string ID
 */
export const generateUniqueId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}; 