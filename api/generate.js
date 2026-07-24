export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
      const text = data.candidates[0].content.parts[0].text;
      return res.status(200).json({ result: text });
    } else {
      console.error('Gemini API 응답 구조 오류:', JSON.stringify(data));
      return res.status(500).json({ 
        error: 'Gemini API에서 올바른 응답을 받지 못했습니다.',
        details: data 
      });
    }
  } catch (error) {
    console.error('서버 통신 에러:', error);
    return res.status(500).json({ error: 'AI 응답을 생성하는 중 서버 오류가 발생했습니다.' });
  }
}
