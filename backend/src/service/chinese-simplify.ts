import axios from "axios";

export async function convertToSimplifiedChinese(traditionalName: string): Promise<string> {
    if (!traditionalName || traditionalName.trim() === "") return "";

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
        const response = await axios.post(
            'https://api.x.ai/v1/chat/completions',
            {
                model: 'grok-3',
                messages: [
                    { role: 'system', content: 'You are an assistant specializing in converting from Traditional Chinese to Simplified Chinese.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0,
                max_tokens: 50,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const content = response.data.choices[0].message.content.trim();
        return content.replace(/^["']|["']$/g, '').trim();
    } catch (error: any) {
        console.error("Erro a :", traditionalName, error.message);
        return traditionalName;
    }
}