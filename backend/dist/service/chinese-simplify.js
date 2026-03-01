"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToSimplifiedChinese = convertToSimplifiedChinese;
const axios_1 = __importDefault(require("axios"));
async function convertToSimplifiedChinese(traditionalName) {
    if (!traditionalName || traditionalName.trim() === "")
        return "";
    const prompt = `
You are an expert in the Chinese language. Convert the following football team name from traditional Chinese to simplified Chinese.

Important rules:
- Maintain the exact same meaning and pronunciation.
- Use only simplified characters (大陆简体字).
- Do not add explanations or translate into another language.
- Respond ONLY with the name in simplified Chinese.

Traditional Chinese name: "${traditionalName}"

Response:
  `.trim();
    try {
        const response = await axios_1.default.post('https://api.x.ai/v1/chat/completions', {
            model: 'grok-3',
            messages: [
                { role: 'system', content: 'You are an assistant specializing in converting from Traditional Chinese to Simplified Chinese.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0,
            max_tokens: 50,
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const content = response.data.choices[0].message.content.trim();
        return content.replace(/^["']|["']$/g, '').trim();
    }
    catch (error) {
        const status = error.response?.status;
        const data = error.response?.data;
        console.error("[chinese-simplify] Failed for:", traditionalName, "| status:", status ?? "N/A", "|", typeof data === "string" ? data : JSON.stringify(data ?? error.message).slice(0, 200));
        return traditionalName;
    }
}
