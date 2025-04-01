const ENCRYPTION_WORKER_URL =
  "https://cloudflare-encryption.ai-context-vault.workers.dev";

// Cache for decrypted PAT
let decryptedPatCache = null;
let lastEncryptedPat = null;

// Debug function to check cache status
export const getCacheStatus = () => {
  console.debug("[AI Context Vault] PAT Cache Status:", {
    hasCache: !!decryptedPatCache,
    lastEncryptedPat: lastEncryptedPat
      ? `${lastEncryptedPat.slice(0, 8)}...`
      : null,
    cacheValue: decryptedPatCache
      ? `${decryptedPatCache.slice(0, 8)}...`
      : null,
  });
  return {
    hasCache: !!decryptedPatCache,
    lastEncryptedPat: lastEncryptedPat
      ? `${lastEncryptedPat.slice(0, 8)}...`
      : null,
    cacheValue: decryptedPatCache
      ? `${decryptedPatCache.slice(0, 8)}...`
      : null,
  };
};

export const encryptPAT = async (pat) => {
  try {
    console.debug("[AI Context Vault] Encrypting PAT...");
    const response = await fetch(`${ENCRYPTION_WORKER_URL}/encrypt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "encrypt",
        data: pat,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Clear cache when PAT changes
    decryptedPatCache = null;
    lastEncryptedPat = null;
    console.debug("[AI Context Vault] PAT encrypted, cache cleared");
    return data.encrypted;
  } catch (error) {
    console.error("[AI Context Vault] Error encrypting PAT:", error);
    throw error;
  }
};

export const decryptPAT = async (encryptedPat) => {
  try {
    // Return cached value if available and PAT hasn't changed
    if (decryptedPatCache && lastEncryptedPat === encryptedPat) {
      console.debug("[AI Context Vault] Using cached PAT");
      return decryptedPatCache;
    }

    console.debug("[AI Context Vault] Decrypting PAT...");
    const response = await fetch(`${ENCRYPTION_WORKER_URL}/decrypt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "decrypt",
        data: encryptedPat,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Cache the decrypted value
    decryptedPatCache = data.decrypted;
    lastEncryptedPat = encryptedPat;
    console.debug("[AI Context Vault] PAT decrypted and cached");
    return data.decrypted;
  } catch (error) {
    console.error("[AI Context Vault] Error decrypting PAT:", error);
    throw error;
  }
};
