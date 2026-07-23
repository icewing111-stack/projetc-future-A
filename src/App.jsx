import React, { useState } from 'react';

function App() {
  const [location, setLocation] = useState('');
  const [brand, setBrand] = useState('전체');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location.trim()) {
      setError('현재 위치를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location, brand }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '요청을 처리하지 못했습니다.');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>편의점 찾기 및 재고 조회 도우미</h2>
      <p>현재 계신 위치를 입력하시면 AI가 가까운 편의점과 경로, 재고 확인 팁을 안내해 드립니다.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>현재 위치 (주소 또는 건물명)</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="예: 서울시 강남구 테헤란로 123"
            style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>선호하는 편의점 브랜드</label>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }}
          >
            <option value="전체">전체 (상관없음)</option>
            <option value="CU">CU</option>
            <option value="GS25">GS25</option>
            <option value="세븐일레븐">세븐일레븐</option>
            <option value="이마트24">이마트24</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: '12px', fontSize: '16px', backgroundColor: '#0070f3', color: '#white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
        >
          {loading ? 'AI가 최적의 편의점을 찾는 중...' : '가장 가까운 편의점 찾기'}
        </button>
      </form>

      {error && <div style={{ color: 'red', marginTop: '15px' }}>{error}</div>}

      {result && (
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f4f4f4', borderRadius: '8px' }}>
          <h3>AI 추천 결과</h3>
          <p><strong>추천 편의점:</strong> {result.storeName || result.name || '정보 없음'}</p>
          <p><strong>브랜드:</strong> {result.brand || brand}</p>
          <p><strong>위치 및 거리:</strong> {result.location || result.distance || '정보 없음'}</p>
          <p><strong>경로 안내:</strong> {result.routeGuide || result.path || '도보 이동 추천'}</p>
          <p><strong>재고 조회 안내:</strong> {result.inventoryTip || result.stockInfo || '공식앱(포켓CU, 우리동네GS 등)을 통해 실시간 재고를 확인하세요.'}</p>
        </div>
      )}
    </div>
  );
}

export default App;
