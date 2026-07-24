import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';

// Provided Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAjBunlYqgNVpbSrVeqVeJNd4bfdEQpHZE",
  authDomain: "project-a-2041c.firebaseapp.com",
  projectId: "project-a-2041c",
  storageBucket: "project-a-2041c.firebasestorage.app",
  messagingSenderId: "754719005631",
  appId: "1:754719005631:web:1d1ced23c384d09959df0a",
  measurementId: "G-QFYQXW5WT6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Leaflet 기본 마커 아이콘 설정
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.parseHtmlTag = false;

const createBrandIcon = (brandName, color) => {
  return L.divIcon({
    className: 'custom-brand-marker',
    html: `<div style="background-color: ${color}; color: white; padding: 6px 10px; border-radius: 20px; font-weight: bold; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); border: 2px solid white; text-align: center; white-space: nowrap;">🏪 ${brandName}</div>`,
    iconSize: [70, 35],
    iconAnchor: [35, 17]
  });
};

const currentLocationIcon = L.divIcon({
  className: 'current-location-marker',
  html: `<div style="background-color: #ff4757; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 18px; box-shadow: 0 0 10px rgba(255, 71, 87, 0.8); border: 3px solid white;">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

export default function App() {
  const [step, setStep] = useState(1);
  const [age, setAge] = useState('');
  const [isLargeFont, setIsLargeFont] = useState(false);
  
  const [location, setLocation] = useState('서울 강남구 역삼동');
  const [transport, setTransport] = useState('걷기/자전거(인도)');
  const [category, setCategory] = useState('간편식품');
  const [customItem, setCustomItem] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // 게시판 상태
  const [posts, setPosts] = useState([]);
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mapCenter = [37.5006, 127.0364];
  const convenienceStores = [
    { id: 1, name: 'CU 역삼점', brand: 'CU', position: [37.5012, 127.0355], color: '#6f42c1' },
    { id: 2, name: 'GS25 강남중앙점', brand: 'GS25', position: [37.4995, 127.0378], color: '#007bff' },
    { id: 3, name: '세븐일레븐 역삼역점', brand: '세븐일레븐', position: [37.5020, 127.0370], color: '#dc3545' },
    { id: 4, name: '이마트24 역삼2호점', brand: '이마트24', position: [37.4988, 127.0350], color: '#e67e22' }
  ];

  const routePolyline = transport.includes('인도') 
    ? [[37.5006, 127.0364], [37.5009, 127.0360], [37.5012, 127.0355]] 
    : [[37.5006, 127.0364], [37.5000, 127.0380], [37.4995, 127.0378]]; 

  // Firestore에서 게시글 불러오기 (최신순)
  const fetchPosts = async () => {
    try {
      const q = query(collection(db, "feedback_posts"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedPosts = [];
      querySnapshot.forEach((doc) => {
        fetchedPosts.push({ id: doc.id, ...doc.data() });
      });
      setPosts(fetchedPosts);
    } catch (err) {
      console.error("게시글 불러오기 오류:", err);
      // 만약 createdAt 인덱스가 아직 생성되지 않았을 경우 fallback으로 전체 가져오기 시도
      try {
        const fallbackSnapshot = await getDocs(collection(db, "feedback_posts"));
        const fallbackPosts = [];
        fallbackSnapshot.forEach((doc) => {
          fallbackPosts.push({ id: doc.id, ...doc.data() });
        });
        setPosts(fallbackPosts);
      } catch (e) {
        console.error("Fallback 오류:", e);
      }
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleAgeSubmit = (e) => {
    e.preventDefault();
    const numAge = parseInt(age, 10);
    if (isNaN(numAge)) {
      alert('올바른 나이를 입력해주세요.');
      return;
    }
    if (numAge >= 45) {
      setIsLargeFont(true);
    } else {
      setIsLargeFont(false);
    }
    setStep(2);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!location.trim()) {
      alert('현재 위치를 입력해주세요.');
      return;
    }

    setLoading(true);
    setAiResult(null);

    const prompt = `
      사용자 위치: ${location}
      이동 수단: ${transport} (${transport.includes('인도') ? '인도/보행자 전용 안전 경로 안내' : '자동차/오토바이 도로 중심 최단 거리 안내'})
      물건 분류: ${category} ${category === '직접 입력하기' ? `(${customItem})` : ''}
      
      위 조건을 바탕으로 다음 항목을 상세히 분석해줘:
      1. 가장 가까운 편의점 브랜드 추천
      2. 선택한 이동 수단(${transport})에 따른 맞춤형 경로 특징 설명
      3. 선택한 물건의 재고 확인 가능한 공식 사이트 안내
      4. 로또 판매 여부
      5. 할인 및 1+1 행사 여부
      6. 각 브랜드별 콜라보 행사 여부
      7. 이마트24 영업점 지도 표시 및 특징 안내
      8. 편의점 배달 가능 여부
    `;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (response.ok) {
        setAiResult(data.result);
      } else {
        setAiResult(data.error || '오류가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      setAiResult('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 게시글 등록 핸들러
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) {
      alert('작성자와 내용을 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "feedback_posts"), {
        author: author.trim(),
        content: content.trim(),
        createdAt: serverTimestamp()
      });
      setAuthor('');
      setContent('');
      await fetchPosts();
      alert('의견이 성공적으로 등록되었습니다.');
    } catch (err) {
      console.error("게시글 등록 오류:", err);
      alert('게시글 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const officialStockLinks = {
    CU: { name: 'CU 공식 재고조회', url: 'https://pocketcu.co.kr' },
    GS25: { name: '우리동네GS (재고조회)', url: 'https://gs25.gsretail.com' },
    SevenEleven: { name: '세븐일레븐 재고조회', url: 'https://www.7-eleven.co.kr' },
    Emart24: { name: '이마트24 매장/재고', url: 'https://www.emart24.co.kr' }
  };

  return (
    <div className={`app-container ${isLargeFont ? 'large-font' : ''}`}>
      {step === 1 ? (
        <div className="age-card">
          <h2>편의점 스마트 길찾기</h2>
          <p>원활한 맞춤형 서비스 이용을 위해 연령을 입력해 주세요.</p>
          <form onSubmit={handleAgeSubmit}>
            <input
              type="number"
              placeholder="나이를 입력하세요 (예: 30, 50)"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />
            <button type="submit">시작하기</button>
          </form>
        </div>
      ) : (
        <div className="main-card">
          <h2>편의점 통합 길찾기 & 재고 도우미</h2>
          
          <form onSubmit={handleSearch} className="search-form">
            <div className="form-group">
              <label>📍 현재 위치 입력:</label>
              <input
                type="text"
                placeholder="예: 서울시 강남구 역삼동"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>🚗 이동 수단 선택 (경로 자동 분기):</label>
              <select value={transport} onChange={(e) => setTransport(e.target.value)}>
                <option value="걷기/자전거(인도)">걷기 / 자전거 ➔ 인도(보행자 도로) 중심 안전 경로</option>
                <option value="자동차(도로)">자동차 ➔ 도로(차도) 중심 최단 경로</option>
              </select>
            </div>

            <div className="form-group">
              <label>🛍️ 물건 분류 카테고리:</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="간편식품">간편식품 (도시락, 삼각김밥 등)</option>
                <option value="음료/디저트">음료/디저트</option>
                <option value="안전상비의약품">안전상비의약품</option>
                <option value="직접 입력하기">직접 입력하기</option>
              </select>
            </div>

            {category === '직접 입력하기' && (
              <div className="form-group">
                <label>✍️ 찾는 물건 직접 입력:</label>
                <input
                  type="text"
                  placeholder="예: 특정 브랜드 음료, 빵 등"
                  value={customItem}
                  onChange={(e) => setCustomItem(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="map-container-wrapper">
              <p className="map-desc">
                🗺️ 실시간 지도: 현재 위치(빨간 마커)와 주변 편의점 로고 표시 
                ({transport.includes('인도') ? '🟢 인도 경로 안내선' : '🔵 자동차 도로 경로 안내선'})
              </p>
              <div style={{ height: '320px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ccc' }}>
                <MapContainer center={mapCenter} zoom={16} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={mapCenter} icon={currentLocationIcon}>
                    <Popup><b>현재 내 위치</b><br/>{location}</Popup>
                  </Marker>

                  {convenienceStores.map(store => (
                    <Marker 
                      key={store.id} 
                      position={store.position} 
                      icon={createBrandIcon(store.brand, store.color)}
                    >
                      <Popup>
                        <b>{store.name}</b><br/>
                        브랜드: {store.brand}<br/>
                        {transport} 맞춤 경로 적용됨
                      </Popup>
                    </Marker>
                  ))}

                  <Polyline 
                    positions={routePolyline} 
                    color={transport.includes('인도') ? '#2ecc71' : '#3498db'} 
                    weight={5} 
                    opacity={0.8} 
                    dashArray={transport.includes('인도') ? '5, 10' : ''}
                  />
                </MapContainer>
              </div>
            </div>

            <div className="stock-links-section">
              <p>🔗 브랜드별 공식 재고 조회 바로가기</p>
              <div className="link-buttons">
                {Object.entries(officialStockLinks).map(([key, info]) => (
                  <a key={key} href={info.url} target="_blank" rel="noopener noreferrer" className="stock-btn">
                    {info.name}
                  </a>
                ))}
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'AI가 최적의 경로 및 재고를 분석 중...' : '맞춤 편의점 정보 조회하기'}
            </button>
          </form>

          {aiResult && (
            <div className="result-box">
              <h3>💡 AI 종합 분석 및 추천 결과</h3>
              <div className="result-content">
                {aiResult.split('\n').map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* 사용자 의견 게시판 섹션 (요청 조건 완벽 반영) */}
          <div className="feedback-board-section" style={{ marginTop: '30px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
            <h3>💬 사용자 의견 게시판</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>앱 사용 소감이나 개선 의견을 자유롭게 남겨주세요!</p>
            
            {/* 글 작성 입력 폼 */}
            <form onSubmit={handlePostSubmit} style={{ marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.9rem' }}>작성자 이름:</label>
                <input
                  type="text"
                  placeholder="이름 또는 닉네임 입력"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.9rem' }}>의견 내용:</label>
                <textarea
                  placeholder="의견을 입력해주세요"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows="3"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem', resize: 'vertical' }}
                  required
                />
              </div>
              <button type="submit" disabled={submitting} style={{ backgroundColor: '#28a745', marginTop: '5px' }}>
                {submitting ? '등록 중...' : '의견 등록하기'}
              </button>
            </form>

            {/* 게시판 목록 영역 (최신순) */}
            <div className="board-list-area">
              <h4 style={{ marginBottom: '10px', fontSize: '1rem' }}>📋 등록된 의견 목록 (최신순)</h4>
              {posts.length === 0 ? (
                <p style={{ color: '#888', fontSize: '0.9rem', fontStyle: 'italic' }}>아직 등록된 의견이 없습니다. 첫 번째 의견을 남겨주세요!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {posts.map((post) => (
                    <div key={post.id} style={{ background: '#fff', border: '1px solid #e1e4e8', padding: '12px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem', color: '#555' }}>
                        <b>👤 {post.author}</b>
                        <span>{post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleString() : '방금 전'}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: '#222', whiteSpace: 'pre-wrap' }}>{post.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
