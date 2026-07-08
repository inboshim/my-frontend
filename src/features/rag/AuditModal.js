import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Loader2, FileText, Languages, Layers } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function AuditModal({ isOpen, onClose, userQuery, domainKey = "default" }) {
  const [status, setStatus] = useState(100);
  const [score, setScore] = useState(0);
  const [assets, setAssets] = useState({
    raw_context: '',
    translated_text: '',
    summary_result: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !userQuery) return;

    setStatus(100);
    setScore(0);
    setAssets({ raw_context: '', translated_text: '', summary_result: '' });
    setError('');

    const encodedQuery = encodeURIComponent(userQuery);
    const sseUrl = `${API_BASE_URL}/api/v1/rag/stream?user_query=${encodedQuery}&domain_key=${domainKey}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.addEventListener('pipeline_update', (e) => {
      try {
        const packet = JSON.parse(e.data);
        setStatus(packet.status);
        setScore(packet.score);
        setAssets(packet.assets);
      } catch (err) {
        console.error("패킷 파싱 실패:", err);
      }
    });

    eventSource.addEventListener('pipeline_complete', (e) => {
      try {
        const packet = JSON.parse(e.data);
        setStatus(packet.status);
        setScore(packet.score);
        setAssets(packet.assets);
      } catch (err) {
        console.error("완료 패킷 파싱 실패:", err);
      }
      eventSource.close();
    });

    eventSource.addEventListener('pipeline_error', (e) => {
      try {
        const packet = JSON.parse(e.data);
        setStatus(packet.status);
        setError(packet.assets.summary_result || '파이프라인 연산 중 예외가 발생했습니다.');
      } catch (err) {
        setError('서버 통신 오류가 발생했습니다.');
      }
      eventSource.close();
    });

    eventSource.onerror = (err) => {
      console.error("SSE 커넥션 에러:", err);
      setError("SSE 스트리밍 연결이 차단되었거나 백엔드가 응답하지 않습니다.");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen, userQuery, domainKey]);

  if (!isOpen) return null;

  // 상태 코드별 동적 스타일 생성기
  const getStepStyle = (stepMinStatus) => {
    const isActive = status >= stepMinStatus;
    return {
      flex: 1,
      border: isActive ? '1px solid #007bbf' : '1px solid #eef2f7',
      backgroundColor: isActive ? '#f0f7ff' : '#ffffff',
      color: isActive ? '#007bbf' : '#a3b1cc',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      fontWeight: '700',
      fontSize: '12px'
    };
  };

  return (
    // ── 💡 화면 전역을 덮는 딤 처리 백드롭 레이어 고정 ──
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)'
    }}>
      
      {/* ── 💡 1350px 가독성 규격을 고려한 중앙 정밀 사각 박스 ── */}
      <div style={{
        width: '100%', maxWidth: '850px', backgroundColor: '#ffffff',
        border: '1px solid #eef2f7', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column', maxHeight: '85vh',
        color: '#1a2f36', fontFamily: 'sans-serif'
      }}>
        
        {/* 헤더 영역 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #eef2f7', backgroundColor: '#f8f9fa' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', letterSpacing: '-0.3px' }}>RAG 실시간 교차 검증 트랙 (Audit Trail)</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#74829c' }}>질의어: "{userQuery}"</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a3b1cc' }}>
            <X size={20} />
          </button>
        </div>

        {/* 바디 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 에러 가드 배치 */}
          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fff5f5', border: '1px solid #ffe3e3', color: '#e53e3e', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertTriangle size={16} style={{ marginTop: '2px' }} />
              <div><strong>[시스템 가드 얼럿]</strong> {error}</div>
            </div>
          )}

          {/* 1. 상태 궤적 가시화 인디케이터 (100 ~ 500) */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={getStepStyle(200)}>
              <Languages size={18} style={{ marginBottom: '4px' }} />
              <span>1단계: 번역 노드</span>
              <span style={{ fontSize: '10px', opacity: 0.7 }}>(Status 200)</span>
            </div>
            <div style={getStepStyle(300)}>
              <FileText size={18} style={{ marginBottom: '4px' }} />
              <span>2단계: 요약 압축</span>
              <span style={{ fontSize: '10px', opacity: 0.7 }}>(Status 300)</span>
            </div>
            <div style={getStepStyle(400)}>
              <Layers size={18} style={{ marginBottom: '4px' }} />
              <span>3단계: 자가 검수</span>
              <span style={{ fontSize: '10px', opacity: 0.7 }}>(Status 400)</span>
            </div>
            <div style={{
              flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
              border: status === 500 ? '1px solid #10b981' : '1px solid #eef2f7',
              backgroundColor: status === 500 ? '#ecfdf5' : '#ffffff',
              color: status === 500 ? '#10b981' : '#a3b1cc', fontWeight: '700'
            }}>
              {status === 500 ? <CheckCircle size={18} style={{ marginBottom: '4px' }} /> : <Loader2 size={18} style={{ marginBottom: '4px' }} className="animate-spin" />}
              <span>4단계: 연산 완착</span>
              <span style={{ fontSize: '10px', opacity: 0.7 }}>(Status 500)</span>
            </div>
          </div>

          {/* 2. 80점 커트라인 스코어 보드 */}
          <div style={{ border: '1px solid #eef2f7', padding: '16px', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>LangGraph 실시간 검수 점수 (Evaluation Score)</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#74829c' }}>어드민 지정 자가 검수 통과 커트라인: <span style={{ fontWeight: '700', color: '#1a2f36' }}>80점</span></p>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontSize: '32px', fontWeight: '900', color: score >= 80 ? '#10b981' : '#a3b1cc' }}>{score}</span>
              <span style={{ fontSize: '12px', color: '#a3b1cc', marginLeft: '4px' }}>/ 100점</span>
            </div>
          </div>

          {/* 3. 3단 자산 데이터 실시간 분사 로그 박스 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#74829c', display: 'block', marginBottom: '6px' }}>[1단 자산] Raw Context (pgvector 768)</label>
              <div style={{ width: '100%', height: '70px', padding: '10px', backgroundColor: '#1e293b', color: '#f8fafc', fontFamily: 'monospace', fontSize: '11px', overflowY: 'auto', boxSizing: 'border-box' }}>
                {assets.raw_context || '백엔드 스트리밍 수신 대기 중...'}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#74829c', display: 'block', marginBottom: '6px' }}>[2단 자산] Translated Text</label>
              <div style={{ width: '100%', height: '70px', padding: '10px', backgroundColor: '#1e293b', color: '#f8fafc', fontFamily: 'monospace', fontSize: '11px', overflowY: 'auto', boxSizing: 'border-box' }}>
                {assets.translated_text || '백엔드 스트리밍 수신 대기 중...'}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#74829c', display: 'block', marginBottom: '6px' }}>[3단 자산] Summary Result</label>
              <div style={{ width: '100%', height: '70px', padding: '10px', backgroundColor: '#1e293b', color: '#f8fafc', fontFamily: 'monospace', fontSize: '11px', overflowY: 'auto', boxSizing: 'border-box' }}>
                {assets.summary_result || '백엔드 스트리밍 수신 대기 중...'}
              </div>
            </div>
          </div>

        </div>

        {/* 푸터 영역 */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #eef2f7', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 16px', backgroundColor: '#1a2f36', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            AUDIT 닫기
          </button>
        </div>

      </div>
    </div>
  );
}
