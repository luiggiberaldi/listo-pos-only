
// ESM Script for Node 18+ (Native Fetch)
const ENDPOINT = "https://openrouter.ai/api/v1/models";

async function listFreeModels() {
    console.log("🔍 LISTING AVAILABLE OPENROUTER MODELS...");
    try {
        const response = await fetch(ENDPOINT);
        if (!response.ok) {
            console.error(`❌ API Error: ${response.status}`);
            return;
        }

        const data = await response.json();

        // Filter strictly free models (prompt & completion = 0)
        const freeModels = data.data.filter(m => {
            const promptPrice = parseFloat(m.pricing.prompt);
            const completionPrice = parseFloat(m.pricing.completion);
            return promptPrice === 0 && completionPrice === 0;
        });

        console.log(`✅ FOUND ${freeModels.length} FREE MODELS:`);
        freeModels.forEach(m => {
            console.log(`- ${m.id} | Context: ${m.context_length}`);
        });

    } catch (e) {
        console.error(`❌ NETWORK ERROR:`, e.message);
    }
}

listFreeModels();
