/**
 * 🔍 GHOST JSON PARSER v2
 * Ultra-defensive JSON extraction from AI responses
 * Handles malformed JSON with auto-repair strategies
 */

/**
 * Attempt to repair common JSON syntax errors
 */
function repairJSON(jsonString) {
    let repaired = jsonString;

    // Fix missing commas between properties
    repaired = repaired.replace(/"\s+"/g, '", "');
    repaired = repaired.replace(/"\s*\n\s*"/g, '", "');

    // Fix missing commas before objects/arrays
    repaired = repaired.replace(/}(\s*){/g, '}, {');
    repaired = repaired.replace(/](\s*)\[/g, '], [');

    // Remove trailing commas
    repaired = repaired.replace(/,(\s*)[}\]]/g, '$1}');

    return repaired;
}

export function extractActionFromResponse(responseText) {
    let action = null;
    let cleanText = responseText;

    // Strategy 1: Find JSON using bracket counting (Robust for nested objects)
    const start = responseText.indexOf('{');
    if (start !== -1) {
        let count = 0;
        let end = -1;

        for (let i = start; i < responseText.length; i++) {
            if (responseText[i] === '{') count++;
            else if (responseText[i] === '}') count--;

            if (count === 0) {
                end = i + 1;
                break;
            }
        }

        if (end !== -1) {
            const jsonStr = responseText.substring(start, end);

            // DEBUG: Log matched JSON (Robust)
            console.log(`%c🔍 JSON EXTRACTED:`, 'background: #3498db; color: #fff; padding: 2px;', jsonStr);

            try {
                // Sanitize newlines inside strings if needed, but usually JSON.parse handles if clean
                // Pre-repair common JSON errors before parsing
                const repairedJson = repairJSON(jsonStr);

                action = JSON.parse(repairedJson);
                cleanText = responseText.replace(jsonStr, '').trim();
                return { action, cleanText };
            } catch (e) {
                console.warn(`⚠️ Extracted JSON parse failed: ${e.message}`, jsonStr);
                // Continue to fallback strategies if parse fails
            }
        }
    }

    // Strategy 2: Legacy Regex Fallback (Only if bracket counting failed or yielded invalid JSON)
    const jsonMatch = responseText.match(/\{"action"\s*:.*?\}/s);
    if (jsonMatch) {
        try {
            action = JSON.parse(jsonMatch[0]);
            cleanText = responseText.replace(jsonMatch[0], '').trim();
            return { action, cleanText };
        } catch (e) { }
    }

    return { action: null, cleanText: responseText };
}
