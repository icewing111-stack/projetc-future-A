import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { location, brand } = req.body;

    if (!location) {
      return res.status(400).json({ error: '위치 정보가 필요합니다.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
      사용자 위치: ${location}
      선택한 편의점 브랜드: ${brand || '전체'}
      
      위 정보를 바탕으로 다음 내용을 JSON 형식으로 추천 및 안내해 주세요:
      1. 가장 가까운 편의점 이름과 대략적인 거리/위치
      2. 해당 편의점의 브랜드 (CU, GS25, 세븐일레븐, 이마트24 등)
      3. 실시간 재고 조회를 위해 확인해 볼 수 있는 팁이나 관련 안내 사항
      4. 최적의 경로 안내 팁
      
      응답은 반드시 JSON 형태로 해줘.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text;
    const data = JSON.parse(resultText);

    return res.status(200).json(data);
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: 'AI 처리 중 오류가 발생했습니다.' });
  }
}
