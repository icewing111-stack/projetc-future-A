import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { location, transport, category, customItem, filter24h } = req.body;

        // Initialize Google Gen AI SDK using GEMINI_API_KEY from environment variables securely
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        const prompt = `
        사용자 위치: ${location}
        이동 수단: ${transport === 'walk_bike' ? '자전거/걷기 (인도 최적화)' : '자동차 (도로 최적화)'}
        물건 분류: ${category} ${customItem ? `(${customItem})` : ''}
        이마트24 및 24시 우선 필터: ${filter24h ? '적용' : '미적용'}

        위 조건을 바탕으로 다음 사항들을 포함하여 마크다운 형식으로 상세히 안내해주세요:
        1. 가장 가까운 편의점 브랜드(CU, GS25, 세븐일레븐, 이마트24 등) 추천 및 최적 경로 가이드라인
        2. 요청하신 물건 카테고리 기준 재고 확인 공식 사이트 바로가기 안내 (예: 각 브랜드별 재고조회 서비스 링크 및 접근 방법)
        3. 로또 판매 여부
        4. 할인 및 1+1 등 행사 여부
        5. 각 편의점 브랜드의 콜라보 행사 여부
        6. 편의점 배달 가능 여부
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return res.status(200).json({ text: response.text });
    } catch (error) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}