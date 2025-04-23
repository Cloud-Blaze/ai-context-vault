import { GodMode } from './features/god-mode';
import { PopupStorage } from './utils/popup-storage';

// Initialize God Mode when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  const godMode = GodMode.getInstance();
  const storage = PopupStorage.getInstance();
  
  // Check if God Mode is enabled
  const godModeEnabled = await storage.get('godModeEnabled');
  
  if (godModeEnabled) {
    await godMode.enable();
  }
}); 