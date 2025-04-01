// Cloudflare Worker for PAT encryption/decryption
export default {
  async fetch(request, env, ctx) {
    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const { action, data } = await request.json();

      // Validate action
      if (!["encrypt", "decrypt"].includes(action)) {
        return new Response("Invalid action", { status: 400 });
      }

      // Get encryption key from Workers secrets
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(env.ENCRYPTION_KEY),
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
      );

      if (action === "encrypt") {
        // Generate a random IV
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Encrypt the PAT
        const encrypted = await crypto.subtle.encrypt(
          {
            name: "AES-GCM",
            iv: iv,
          },
          key,
          new TextEncoder().encode(data)
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        return new Response(
          JSON.stringify({
            encrypted: btoa(String.fromCharCode(...combined)),
          })
        );
      } else {
        // Decrypt the PAT
        const combined = new Uint8Array(
          atob(data)
            .split("")
            .map((c) => c.charCodeAt(0))
        );

        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        const decrypted = await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: iv,
          },
          key,
          encrypted
        );

        return new Response(
          JSON.stringify({
            decrypted: new TextDecoder().decode(decrypted),
          })
        );
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }
  },
};
