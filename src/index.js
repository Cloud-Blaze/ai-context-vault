// Encryption Worker Code
async function importKey(rawKey) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(rawKey),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export default {
  async fetch(request, env) {
    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const { action, data } = await request.json();
      const key = await importKey(env.ENCRYPTION_KEY);

      if (action === "encrypt") {
        // Generate a random IV
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(data);
        
        // Encrypt the data
        const encrypted = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          encoded
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
        return new Response(btoa(String.fromCharCode(...combined)));

      } else if (action === "decrypt") {
        // Decode the combined data
        const decoded = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        
        // Extract IV and encrypted data
        const iv = decoded.slice(0, 12);
        const encrypted = decoded.slice(12);

        // Decrypt the data
        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          key,
          encrypted
        );

        return new Response(new TextDecoder().decode(decrypted));
      }

      return new Response("Invalid action", { status: 400 });

    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
}; 