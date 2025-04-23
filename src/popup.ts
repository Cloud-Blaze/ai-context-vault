import { Messaging } from './utils/messaging';
import { PopupStorage } from './utils/popup-storage';

document.addEventListener('DOMContentLoaded', async () => {
  const godModeToggle = document.getElementById('godModeToggle') as HTMLInputElement;
  const clearDataButton = document.getElementById('clearData') as HTMLButtonElement;
  const messaging = Messaging.getInstance();
  const storage = PopupStorage.getInstance();

  // Load initial state
  const godModeEnabled = await storage.get('godModeEnabled');
  godModeToggle.checked = godModeEnabled || false;

  // Handle toggle changes
  godModeToggle.addEventListener('change', async () => {
    const enabled = godModeToggle.checked;
    await storage.set('godModeEnabled', enabled);
    messaging.sendMessage({ action: 'toggleGodMode', enabled });
  });

  // Handle clear data button
  clearDataButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all stored data? This cannot be undone.')) {
      messaging.sendMessage({ action: 'clearData' });
    }
  });
}); 