
// Native fetch for Node 18+
const API_KEY = "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";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

async function testOpenRouter() {
    console.log("🔍 TESTING OPENROUTER CONNECTION (Native Fetch)...");
    console.log(`🔑 Key: ${API_KEY.substring(0, 10)}...`);

    const modelsToTest = [
        "mistralai/mistral-7b-instruct:free",
        "google/gemma-2-9b-it:free",
        "microsoft/phi-3-mini-128k-instruct:free",
        "meta-llama/llama-3.3-70b-instruct:free"
    ];

    for (const model of modelsToTest) {
        console.log(`\n🤖 Testing Model: ${model}`);
        try {
            const response = await fetch(ENDPOINT, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Listo POS Diagnosis"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: "ping" }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ SUCCESS! Response:`, data.choices[0].message.content);
            } else {
                const errorText = await response.text();
                // Parse error JSON if possible
                try {
                    const errorJson = JSON.parse(errorText);
                    console.error(`❌ FAILED (${response.status}):`, JSON.stringify(errorJson, null, 2));
                } catch {
                    console.error(`❌ FAILED (${response.status}):`, errorText);
                }
            }
        } catch (e) {
            console.error(`❌ NETWORK ERROR:`, e.message);
        }
    }
}

testOpenRouter();
