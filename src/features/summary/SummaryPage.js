import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ShieldCheck, Copy, RefreshCw } from 'lucide-react'; // 아이콘 체인 유지
import AuditModal from '../rag/AuditModal'; // 위에서 만든 모달 임포트
import '../../styles/SummaryPage.css'; // 실제 프로젝트 폴더 경로에 맞춰 선언 확인

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

function SummaryPage() {
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [summaryBlocks, setSummaryBlocks] = useState([]); // 2열 1행 구조화 카드 배열 상자

  const [selectedFile, setSelectedFile] = useState(null); 
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [summaryResult, setSummaryResult] = useState('');

  // 사용자님의 명품 드래그 앤 드롭형 고해상도 팝업 모달 변수 완벽 유지
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [inputPage, setInputPage] = useState('1');

  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 모달 제어를 위한 실시간 트리거 상태 선언
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("최신 AI 트렌드 및 벡터 DB 성능 검증"); // 실제 입력된 질의어 바인딩

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handleFileChange = (e) => {
    if (selectedFile || isUploading) return;
    const file = e.target.files[0]; // 단일 파일 객체 정확한 인덱스 고정 패치
    if (file) {
      if (file.type === 'application/pdf') {
        // 통과
      } else {
        alert('월가 영문 레포트(PDF) 파일만 업로드 가능합니다.');
        return;
      }
      setSelectedFile(file);
      setFileName(file.name); 
      setSummaryResult('');
      setSummaryBlocks([]);
      setProgress(0);
      setStatus('');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileName('');
    setIsUploading(false);
    setSummaryResult('');
    setSummaryBlocks([]);
    setProgress(0);
    setStatus('');
    setNumPages(null);
    setPageNumber(1);
    setInputPage('1');
    setScale(1.0);
    setIsOpenModal(false);
    setModalPos({ x: 0, y: 0 });
    setIsAuditOpen(false);
    
    const fileInput = document.getElementById('summary-file-input');
    if (fileInput) fileInput.value = '';
  };

  const handlePageJump = (targetPageStr) => {
    const pageNum = parseInt(targetPageStr, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= (numPages || 1)) {
      setPageNumber(pageNum);
      setInputPage(pageNum.toString());
    } else {
      alert(`1페이지부터 ${numPages || 1}페이지 사이의 올바른 숫자를 입력해 주세요.`);
      setInputPage(pageNumber.toString());
    }
  };
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; 
    setIsDragging(true);
    setDragStart({
      x: e.clientX - modalPos.x,
      y: e.clientY - modalPos.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setModalPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleStartAudit = () => {
    
    console.log("파일선택유무 : 파일업로드 유무", selectedFile + " : "+ isUploading);    

    if (!selectedFile || isUploading) return;

    setIsAuditOpen(true);

  };

  const handleStartSummary = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setSummaryResult(''); 
    setSummaryBlocks([]); 
    setProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL;
      const response = await fetch(`${API_BASE_URL}/api/summary/pdf`, {
        method: 'POST',
        body: formData, 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '서버 오류가 발생했습니다.');
      }

      // 싱글 리더 및 고성능 버퍼 가동으로 스트림 락과 데이터 쪼개짐 깨짐을 동시 방어
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = ''; 

      while (true) {
        const { value, done } = await reader.read();
        if (done) break; 

        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; 
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith("data: ")) continue;
          
          try {
            const jsonStr = trimmedLine.replace("data: ", "").trim();
            if (!jsonStr) continue;
            
            const data = JSON.parse(jsonStr);
            
            if (data.status) setStatus(data.status);
            if (data.progress) setProgress(data.progress);
            
            if (data.result_chunk) {
              setSummaryBlocks((prev) => {
                // 백엔드 파이썬 서버의 신호탄(START_PAGE_NUM:)을 감지하면 카드를 즉시 찢어서 각각 독립 생성
                if (prev.length === 0 || data.result_chunk.includes("START_PAGE_NUM:")) {
                  return [...prev, { 
                    id: Date.now() + Math.random(), 
                    text: data.result_chunk
                    , pageSource: null 
                    , status_code: data.status_code || 'SUCCESS'     
                  }];
                }
                return prev.map((block, idx) => 
                  idx === prev.length - 1 
                    ? { 
                        ...block, 
                        text: block.text + data.result_chunk,
                        status_code: data.status_code || block.status_code || 'SUCCESS'
                      } 
                  : block
                );
              });
            }

            if (data.page_source) {
              const targetPageNum = parseInt(data.page_source, 10);
              setSummaryBlocks((prev) => 
                prev.map((block, idx) => 
                  idx === prev.length - 1 
                    ? { 
                        ...block, 
                        pageSource: targetPageNum,
                        status_code: data.status_code || block.status_code || 'SUCCESS'

                      } 
                  : block
                )
              );
            }
          } catch (jsonErr) {
            console.warn("JSON 파싱 유연 방어:", jsonErr);
            continue;
          }
        }
      }

    } catch (error) {
      console.error('요약 연동 중 에러:', error);
      setSummaryResult(`[에러 발생] 요약 처리에 실패했습니다.\n사유: ${error.message}`);
    } finally {
      setIsUploading(false); 
    }
  };

  return (
    <div className="summary-container">
      
      {/* 상단 대시보드 타이틀 헤더 (여백 긴밀 축소 패치) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #eef2f7', paddingBottom: '6px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1a1f36', letterSpacing: '-0.5px' }}>
          실시간 AI 요약 대시보드
        </h2>
        <span style={{ backgroundColor: '#eef2f7', color: '#5469d4', padding: '5px 12px', borderRadius: '30px', fontSize: '11.5px', fontWeight: '600' }}>
          Active Model: Qwen2.5-1.5B (CUDA-Citation)
        </span>
      </div>

      {/* 중단: 슬림 컨트롤 바 */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e3e8ee', borderRadius: '8px', padding: '12px 20px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', height: '44px' }}>
          
          <label style={{ flex: 1, border: selectedFile ? '1px solid #e3e8ee' : '1px dashed #cfd7df', borderRadius: '6px', height: '100%', display: 'flex', alignItems: 'center', padding: '0 15px', cursor: selectedFile || isUploading ? 'not-allowed' : 'pointer', backgroundColor: selectedFile ? '#f4f6f8' : '#f8f9fa', margin: 0 }}>
            <span style={{ fontSize: '16px', marginRight: '8px' }}>📊</span>
            {fileName ? (
              <span style={{ fontWeight: '600', color: '#4f566b', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '450px' }}>
                {fileName} (선택 완료)
              </span>
            ) : (
              <span style={{ color: '#697386', fontSize: '13px' }}>금융 리서치 영문 파일(PDF)을 선택해 주세요</span>
            )}
            <input id="summary-file-input" type="file" accept=".pdf" onChange={handleFileChange} disabled={!!selectedFile || isUploading} style={{ display: 'none' }} />
          </label>

          <button disabled={!selectedFile || isUploading} onClick={handleStartSummary} style={{ backgroundColor: !selectedFile ? '#a3b1cc' : '#5469d4', color: '#fff', border: 'none', borderRadius: '6px', height: '100%', padding: '0 25px', fontWeight: '600', fontSize: '13.5px', cursor: !selectedFile || isUploading ? 'not-allowed' : 'pointer', minWidth: '180px', margin: 0 }}>
            {isUploading ? 'AI 분석 중...' : 'AI 한글 요약 시작'}
          </button>

          <button 
            disabled={!selectedFile} 
            onClick={() => { setPageNumber(1); setInputPage('1'); setIsOpenModal(true); }}
            style={{ backgroundColor: !selectedFile ? '#f4f6f8' : '#fff', color: !selectedFile ? '#a3b1cc' : '#4f566b', border: '1px solid #cfd7df', borderRadius: '6px', height: '100%', padding: '0 18px', fontWeight: '500', fontSize: '13.5px', cursor: !selectedFile ? 'not-allowed' : 'pointer', margin: 0 }}
          >
            원본 문서 보기
          </button>          
          <button
            disabled={isUploading}
            onClick={handleStartAudit}
            style={{ backgroundColor: !selectedFile ? '#f4f6f8' : '#fff', color: !selectedFile ? '#a3b1cc' : '#4f566b', border: '1px solid #cfd7df', borderRadius: '6px', height: '100%', padding: '0 25px', fontWeight: '600', fontSize: '13.5px', cursor: isUploading ? 'not-allowed' : 'pointer', minWidth: '180px', margin: 0 }}
                        
          >
            문서 적합성 확인
          </button>

          <button disabled={isUploading} onClick={handleReset} style={{ backgroundColor: '#fff', color: '#4f566b', border: '1px solid #cfd7df', borderRadius: '6px', height: '100%', padding: '0 20px', fontWeight: '500', fontSize: '13.5px', cursor: isUploading ? 'not-allowed' : 'pointer', margin: 0 }}>
            초기화
          </button>
        </div>

        {progress > 0 && (
          <div style={{ marginTop: '10px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '11.5px' }}>
              <span style={{ color: '#4f566b' }}>상태: <strong style={{ color: '#5469d4', fontWeight: '600' }}>{status}</strong></span>
              <span style={{ fontWeight: '700', color: '#5469d4' }}>{progress}%</span>
            </div>
            <div style={{ width: '100%', backgroundColor: '#eef2f7', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, backgroundColor: '#5469d4', height: '5px', borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 리포트 결과창 구역 */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e3e8ee', borderRadius: '8px', padding: '20px 25px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minHeight: 'calc(100vh - 160px)', boxSizing: 'border-box' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14.5px', fontWeight: '500', color: '#1a1f36', borderBottom: '1px solid #eef2f7', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span></span> [중요 키워드] : "투자", "전략", "상승", "성장", "배분", "수치", "마진", "수익", "BUY" 를 기준으로 실기간 AI 분석합니다.
        </h3>
        
        {summaryResult && (
          <span style={{ color: '#d93939', fontWeight: '500', display: 'block', backgroundColor: '#fdf2f2', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #d93939', fontSize: '14.5px', marginBottom: '15px' }}>{summaryResult}</span>
        )}
        {/* 🌟 [최종 UI 대완공 패치] 행별 동적 높이 일치 및 투자 신호 필독 하이라이트 2열 바둑판 레이아웃 */}
        <div style={{ 
          display: summaryBlocks.length > 0 ? 'grid' : 'block',
          gridTemplateColumns: '1fr 1fr', // 가로 2열 고정
          gridAutoRows: 'auto',           // 행별 동적 높이 측정
          alignItems: 'stretch',         // 높이가 큰 카드 기준으로 양쪽 키 맞춤 동기화
          gap: '14px', 
          boxSizing: 'border-box'
        }}>
          {summaryBlocks.length > 0 ? (
            summaryBlocks.map((block) => {
              
              // 🌟 [2중 방어선] 목차 구간 텍스트 발견 시 카드를 생성하지 않고 완전 스킵 배제
              if (block.text.includes("제외되었습니다") || block.text.includes("데이터 부족") || block.text.trim() === "") {
                return null; 
              }

              // [치환 마스터] 시작 코드 파싱을 통한 순수 정수 쪽수 복원
              let pageDisplayNum = "";
              if (block.pageSource) {
                pageDisplayNum = block.pageSource.toString();
              } else if (block.text.includes("START_PAGE_NUM:")) {
                const match = block.text.match(/START_PAGE_NUM:(\d+)/);
                if (match && match) {
                  pageDisplayNum = match[1];
                }
              }

              // 요구사항 매핑: 제목 양식 강제 치환 고정 및 유령 문자 선출 차단 가드레일
              const finalHeaderTitle = pageDisplayNum ? `### ${pageDisplayNum}페이지 요약` : "📝 투자 정보 분석 중...";

              // 본문 내부의 모든 구형 마크다운 및 태그 찌꺼기 문자열 100% 완전 정제 살균
              let cleanBodyText = block.text
                .replace(/START_PAGE_NUM:\d+/g, "")
                .replace(/START_PAGE_NUM:/g, "")
                .replace(/\d+,\d+페이지/g, "")
                .replace(/###\s*\d+페이지\s*투자\s*정보/g, "")
                .replace(/###\s*\d+페이지/g, "")
                .replace(/###/g, "")
                .trim();

              if (cleanBodyText.includes("START_PAGE_NUM") || /^[\s,0-9A-Za-z_:]+$/.test(cleanBodyText)) {
                cleanBodyText = ""; 
              }

              if (cleanBodyText.startsWith(",")) {
                cleanBodyText = cleanBodyText.replace(/^[\s,]+/, "").trim();
              }

              if (cleanBodyText.startsWith("▶")) {
                cleanBodyText = "\n" + cleanBodyText;
              }

              if (!cleanBodyText && !pageDisplayNum) {
                return null;
              }

              // 1. [최상단 배치] 백엔드 SSE 스트리밍이 던져준 상태 코드 최우선 확보
              const currentStatus = block.status_code || 'SUCCESS';

              // 2. 클래스 및 배지 폰트 색상 안전 매핑 테이블 빌드
              const STATUS_CLASS_MAP = {
                SUCCESS: 'card-status-success',
                ANOMALY_LOW_SCORE: 'card-status-anomaly',
                SKIP_TIMEOUT: 'card-status-timeout'
              };

              const STATUS_BADGE_MAP = {
                SUCCESS: { bg: '#d93838', text: '🔴 필수 체크' },
                ANOMALY_LOW_SCORE: { bg: '#e03131', text: '⚠️ 품질 과락 (재연산 대기)' },
                SKIP_TIMEOUT: { bg: '#6c757d', text: '⚪ 지연 스킵' }
              };

              const cardClass = STATUS_CLASS_MAP[currentStatus] || 'card-status-success';
              const badge = STATUS_BADGE_MAP[currentStatus] || STATUS_BADGE_MAP['SUCCESS'];

              // 3. 투자 지식 수집용 중요 페이지 동적 판별 필터 가동
              const keyWords = ["투자", "전략", "상승", "성장", "배분", "수치", "마진", "수익", "BUY"];
              let importanceScore = 0;
              
              // 🚨 [핵심 교정] 오직 서버 상태가 정상('SUCCESS')일 때만 본문 단어 채점을 작동시킵니다.
              if (currentStatus === 'SUCCESS') {
                keyWords.forEach(word => {
                  if (cleanBodyText.includes(word)) importanceScore += 1;
                });
              }

              // 최종 필독(Important) 여부 확정: 서버가 성공했고 단어도 2개 이상일 때만 황금 마크 허용
              const isImportantPage = currentStatus === 'SUCCESS' && importanceScore >= 2;

              //console.log("currentStatus : ", currentStatus);

              return (
                <div 
                  key={block.id} 
                  className={`evaluation-summary-card ${cardClass} ${isImportantPage ? 'is-important' : ''}`}
                >
                  {/* 상단 타이틀 배너 (좌측: 대제목 및 빨간 배지 / 우측 반대편: 짙은 하늘색 알약 버튼 1열 정렬) */}
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', marginBottom: '10px', borderBottom: '1px solid #eef2f7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="card-title" style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px' }}>
                        {finalHeaderTitle}
                      </span>
                      {/* 💡 서버 상태 코드 및 중요도에 따른 배지 스마트 노출 */}
                      {(currentStatus !== 'SUCCESS' || isImportantPage) && (
                        <span style={{ backgroundColor: badge.bg, color: '#ffffff', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px' }}>
                          {badge.text}
                        </span>
                      )}
                    </div>

                    {pageDisplayNum ? (                      

                      <button
                        onClick={() => {
                          const targetPage = parseInt(pageDisplayNum, 10);
                          setPageNumber(targetPage); 
                          setInputPage(targetPage.toString()); 
                          setIsOpenModal(true);      
                        }}
                        className="btn-source"
                        style={{ display: 'inline-flex', alignItems: 'center', color: '#ffffff', fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '20px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        
                      >
                        📖 원문 {pageDisplayNum}쪽 확인하기
                      </button>                          
                      
                    ) : (
                      <span style={{ fontSize: '11px', color: '#a3b1cc', fontStyle: 'italic' }}>추론 대기 중..</span>
                    )}
                  </div>

                  {/* 3줄 리포트 본문 출력 영역 (글자 크기 16px 압축형 고수 및 필독 카드는 글씨를 더 또렷하게 강조) */}
                  <div style={{ fontSize: '16px', lineHeight: '1.45', color: '#111111', fontWeight: (isImportantPage && currentStatus === 'SUCCESS') ? '600' : '500', whiteSpace: 'pre-wrap', letterSpacing: '-0.4px', flexGrow: 1, marginBottom: '10px' }}>
                    {cleanBodyText || <span style={{ color: '#a3b1cc', fontStyle: 'italic', fontSize: '14px' }}>금융 데이터 독해 및 구조화 번역 중...</span>}
                  </div>
                </div>
              );
            })
          ) : !summaryResult && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#a3b1cc', fontStyle: 'italic', fontSize: '13.5px' }}>
              <span>1. 금융 리서치 영문 파일(PDF) 선택.   2. "AI 한글 요약 시작" 버튼을 실행해 주세요.</span>             
            </div>
          )}
        </div>
      </div>
      {/* 🌟 사용자님의 마우스 드래그앤드롭형 고해상도 모달 팝업 레이어 완전 유지 복원 */}
      {isOpenModal && selectedFile && (
        <div 
          onMouseMove={handleMouseMove} 
          onMouseUp={handleMouseUp}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, boxSizing: 'border-box' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              backgroundColor: '#fff', borderRadius: '12px', padding: '25px', width: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', overflow: 'hidden', boxSizing: 'border-box',
              transform: `translate(${modalPos.x}px, ${modalPos.y}px)`, 
              transition: isDragging ? 'none' : 'transform 0.1s ease-out' 
            }}
          >
            <div 
              onMouseDown={handleMouseDown} 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '15px', borderBottom: '1px solid #eef2f7', paddingBottom: '10px', cursor: 'move', userSelect: 'none' }}
            >
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1a1f36', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '600px' }}>
                🖐️ 여기를 클릭하고 드래그하여 이동: <span style={{ color: '#007bbf', fontWeight: '700' }}>{fileName}</span>
              </h3>
              <button onClick={() => { setIsOpenModal(false); setModalPos({x:0, y:0}); }} style={{ border: 'none', backgroundColor: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#697386' }}>✕</button>
            </div>

            <div style={{ marginBottom: '15px', display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#f8f9fa', padding: '8px 20px', borderRadius: '30px', border: '1px solid #e3e8ee', userSelect: 'none' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '13px' }}>
                <button disabled={pageNumber <= 1} onClick={() => { const p = pageNumber - 1; setPageNumber(p); setInputPage(p.toString()); }} style={{ padding: '3px 10px', cursor: 'pointer', fontWeight: '600', borderRadius: '4px', border: '1px solid #cfd7df', backgroundColor: '#fff' }}>이전</button>
                <input 
                  type="text" 
                  value={inputPage}
                  onChange={(e) => setInputPage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePageJump(inputPage); }} 
                  style={{ width: '40px', textAlign: 'center', padding: '3px', fontWeight: '700', border: '1px solid #cfd7df', borderRadius: '4px', color: '#1a1f36' }}
                />
                <span style={{ fontWeight: '600', color: '#4f566b' }}>/ {numPages || 1} P</span>
                <button onClick={() => handlePageJump(inputPage)} style={{ padding: '3px 8px', cursor: 'pointer', fontSize: '12px', borderRadius: '4px', border: 'none', backgroundColor: '#007bbf', color: '#fff', fontWeight: '600', marginLeft: '2px' }}>이동</button>
                <button disabled={pageNumber >= (numPages || 1)} onClick={() => { const p = pageNumber + 1; setPageNumber(p); setInputPage(p.toString()); }} style={{ padding: '3px 10px', cursor: 'pointer', fontWeight: '600', borderRadius: '4px', border: '1px solid #cfd7df', backgroundColor: '#fff' }}>다음</button>
              </div>
              <div style={{ width: '1px', height: '16px', backgroundColor: '#cfd7df' }}></div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px' }}>
                <button onClick={() => setScale(prev => Math.max(0.6, prev - 0.1))} style={{ padding: '3px 10px', cursor: 'pointer', fontWeight: '700', borderRadius: '4px', border: '1px solid #cfd7df', backgroundColor: '#fff' }}>－</button>
                <span style={{ fontWeight: '700', minWidth: '60px', textAlign: 'center', color: '#007bbf' }}>{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(prev => Math.min(2.0, prev + 0.1))} style={{ padding: '3px 10px', cursor: 'pointer', fontWeight: '700', borderRadius: '4px', border: '1px solid #cfd7df', backgroundColor: '#fff' }}>＋</button>
              </div>
            </div>

            <div style={{ flex: 1, width: '100%', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', backgroundColor: '#f4f6f8', padding: '15px', borderRadius: '6px', boxSizing: 'border-box' }}>
              <div style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.06)', backgroundColor: '#fff' }}>
                <Document file={selectedFile} onLoadSuccess={onDocumentLoadSuccess}>
                  <Page pageNumber={pageNumber} width={650} scale={scale} renderTextLayer={false} renderAnnotationLayer={false} />
                </Document>
              </div>
            </div>

          </div>        
        </div>
      )}

    <AuditModal 
      isOpen={isAuditOpen} 
      onClose={() => setIsAuditOpen(false)} 
      userQuery={selectedFile?.name}
      domainKey="admin_tech_domain" // 어제 연동한 2단계 프롬프트 가버넌스 도메인 키
    />

    </div>
  );
}

export default SummaryPage;
