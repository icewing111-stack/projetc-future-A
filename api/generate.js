export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { location } = req.body;

    if (!location) {
        return res.status(400).json({ error: 'Location is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in environment variables.' });
    }

    const prompt = `사용자의 현재 위치는 "${location}"입니다. 
이 위치를 기준으로 가장 가까운 편의점(CU, GS25, 세븐일레븐, 이마트24 등)을 찾아주세요.
1. 가장 가까운 편의점 브랜드와 지점명을 확인해주세요.
2. 현재 위치에서 해당 편의점까지의 최적의 길 안내(경로 요약)를 제공해주세요.
3. 해당 편의점의 주요 상품(예: 삼각김밥, 생수, 상비약 등) 재고 상태를 예상하거나 안내할 수 있도록 구성해주세요.
답변은 지도와 함께 보기 쉽도록 깔끔하고 친절하게 한국어로 작성해주세요.`;

    try {
        const fetchModule = await import('node-fetch');
        const fetch = fetchModule.default;

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await geminiResponse.json();

        if (!geminiResponse.ok) {
            return res.status(geminiResponse.status).json({ error: data.error?.message || 'Gemini API Error' });
        }

        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '결과를 생성할 수 없습니다.';

        return res.status(200).json({ result: generatedText });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
