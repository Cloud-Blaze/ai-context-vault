/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Env {
	ENCRYPTION_KEY: string;
	PREVIOUS_ENCRYPTION_KEY?: string;  // Optional previous key for version 1
}

interface RequestBody {
	action: 'encrypt' | 'decrypt';
	data: string;
	version?: number;
}

interface EncryptedData {
	version: number;
	data: string;
	iv: string;
}

// CORS headers helper
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Max-Age': '86400',
};

// Error response helper
const errorResponse = (message: string, status: number = 400): Response => {
	return new Response(
		JSON.stringify({
			error: message,
			status: status,
			timestamp: new Date().toISOString()
		}),
		{
			status,
			headers: {
				'Content-Type': 'application/json',
				...corsHeaders,
			},
		}
	);
};

// Success response helper
const successResponse = (data: any, status: number = 200): Response => {
	return new Response(
		JSON.stringify(data),
		{
			status,
			headers: {
				'Content-Type': 'application/json',
				...corsHeaders,
			},
		}
	);
};

// Encryption helper functions
async function encryptData(data: string, key: string, version: number = 2): Promise<EncryptedData> {
	const encoder = new TextEncoder();
	const dataBuffer = encoder.encode(data);

	// Hash the key to ensure it's the right length (256 bits)
	const keyBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(key));

	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		keyBuffer,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt']
	);

	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encryptedData = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		cryptoKey,
		dataBuffer
	);

	const encryptedArray = new Uint8Array(encryptedData);
	const result = new Uint8Array(iv.length + encryptedArray.length);
	result.set(iv);
	result.set(encryptedArray, iv.length);

	return {
		version,
		data: btoa(String.fromCharCode(...result)),
		iv: btoa(String.fromCharCode(...iv))
	};
}

async function decryptData(encryptedData: EncryptedData, env: Env): Promise<string> {
	const decoder = new TextDecoder();
	const encoder = new TextEncoder();

	// Determine which key to use based on version
	let keyString: string;
	switch (encryptedData.version) {
		case 1:
			if (!env.PREVIOUS_ENCRYPTION_KEY) {
				throw new Error('Previous encryption key not available for version 1');
			}
			keyString = env.PREVIOUS_ENCRYPTION_KEY;
			break;
		case 2:
			keyString = env.ENCRYPTION_KEY;
			break;
		default:
			throw new Error(`Unsupported encryption version: ${encryptedData.version}`);
	}

	// Hash the key to ensure it's the right length (256 bits)
	const keyBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(keyString));

	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		keyBuffer,
		{ name: 'AES-GCM', length: 256 },
		false,
		['decrypt']
	);

	const dataArray = Uint8Array.from(atob(encryptedData.data), c => c.charCodeAt(0));
	const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
	const data = dataArray.slice(12); // Skip IV as it's now stored separately

	const decryptedData = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv },
		cryptoKey,
		data
	);

	return decoder.decode(decryptedData);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			// Log the request method and URL
			const url = new URL(request.url);
			console.log(`Request method: ${request.method}, URL: ${request.url}, Path: ${url.pathname}`);
			console.log('Request headers:', Object.fromEntries(request.headers.entries()));

			// Handle CORS preflight requests first
			if (request.method === 'OPTIONS') {
				console.log('Handling OPTIONS request');
				return new Response(null, {
					status: 204,
					headers: corsHeaders,
				});
			}

			// Then validate encryption key
			if (!env.ENCRYPTION_KEY) {
				console.log('Missing encryption key');
				return errorResponse('Encryption key not configured', 500);
			}
			console.log('Encryption key is configured');

			// Accept POST method only
			if (request.method !== 'POST') {
				console.log(`Invalid method: ${request.method}`);
				return errorResponse(`Method ${request.method} not allowed. Expected POST.`, 405);
			}

			// Clone the request to read the body multiple times if needed
			const clonedRequest = request.clone();

			// Log the raw request body
			const rawBody = await clonedRequest.text();
			console.log('Raw request body:', rawBody);

			try {
				const body = JSON.parse(rawBody) as RequestBody;
				console.log('Parsed request body:', body);

				if (!body.action || !body.data) {
					console.log('Missing action or data in body');
					return errorResponse('Missing action or data in request body');
				}

				// Determine action based on both URL path and body
				let action = body.action;
				if (url.pathname === '/encrypt') {
					action = 'encrypt';
				} else if (url.pathname === '/decrypt') {
					action = 'decrypt';
				}

				switch (action) {
					case 'encrypt':
						console.log('Processing encrypt action');
						const encrypted = await encryptData(body.data, env.ENCRYPTION_KEY, body.version || 2);
						return successResponse(encrypted);

					case 'decrypt':
						console.log('Processing decrypt action');
						const decrypted = await decryptData(body.data as EncryptedData, env);
						return successResponse({ decrypted });

					default:
						console.log(`Invalid action: ${action}`);
						return errorResponse(`Invalid action: ${action}. Expected 'encrypt' or 'decrypt'.`);
				}
			} catch (e: any) {
				console.error('Error processing request body:', e);
				return errorResponse(`Invalid JSON payload: ${e?.message || 'Unknown error'}. Expected format: { "action": "encrypt"|"decrypt", "data": string, "version"?: number }`);
			}
		} catch (error: any) {
			console.error('Unhandled error:', error);
			return errorResponse(`Internal server error: ${error?.message || 'Unknown error'}`, 500);
		}
	},
} satisfies ExportedHandler<Env>;
