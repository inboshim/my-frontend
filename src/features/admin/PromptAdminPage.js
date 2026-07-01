import React, { useState, useEffect } from 'react';
import axios from 'axios';

// 🌟 [모듈 누락 해결]: AG-Grid 가 요구하는 페이징 및 텍스트 필터 모듈을 정확히 패키징합니다.
import { AgGridReact } from 'ag-grid-react';
import { 
  ModuleRegistry, 
  ClientSideRowModelModule, 
  ValidationModule,
  PaginationModule,  
  TextFilterModule,
  CellStyleModule,
  RowSelectionModule, 
  LocaleModule // 👈 수입은 정상 완료 상태 확인
} from 'ag-grid-community';

//import 'ag-grid-community/styles/ag-grid.css';
//import 'ag-grid-community/styles/ag-theme-alpine.css';

// 🌟 [전역 레지스트리 가동]: 새로 추가된 모듈들을 배열에 몽땅 넣어 주입합니다.
ModuleRegistry.registerModules([
  ClientSideRowModelModule,   
  ValidationModule,
  PaginationModule,  
  TextFilterModule,
  CellStyleModule,
  RowSelectionModule, 
  LocaleModule // 👈 수입은 정상 완료 상태 확인
]);

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function PromptAdminPage() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false); // 팝업 모달 상태 관리
  
  // 현재 팝업창에서 수정 중인 단일 데이터 스토어
  const [selectedPrompt, setSelectedPrompt] = useState({
    prompt_id: null,
    prompt_type: '',
    item_name: '',
    system_prompt_text: ''
  });

  // 🏛️ 1. AG-Grid 컬럼 명세 정의 (JOIN 데이터 매핑)
  const columnDefs = [
    { headerName: "순번", valueGetter: "node.rowIndex + 1", width: 80, cellStyle: { textAlign: 'center' } },
    { headerName: "에이전트 유형 (ID)", field: "prompt_type", sortable: true, filter: true, width: 220 },
    { headerName: "관리 명칭 (공통코드)", field: "item_name", sortable: true, filter: true, width: 250,
      cellStyle: { fontWeight: 'bold', color: '#2b6cb0' } 
    },
    { headerName: "시스템 지시문 본문 (미리보기)", field: "system_prompt_text", flex: 1, minWidth: 300,
      cellRenderer: (params) => params.value ? params.value.substring(0, 70) + '...' : '지시문이 비어있습니다.'
    },
    { headerName: "상태", field: "is_active", width: 100, 
      cellRenderer: (params) => params.value ? '🟢 활성' : '🔴 중지', cellStyle: { textAlign: 'center' } 
    }
  ];

  // API 데이터 로드 (백엔드 컨트롤러 JOIN 함수 연동)
  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/admin/prompts`);
      setPrompts(response.data);
    } catch (error) {
      alert("❌ 그리드 데이터를 불러오지 못했습니다: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  // 🌟 2. [핵심 요건] 그리드 행 더블클릭 시 팝업창 출력 리스너
  const onRowDoubleClicked = (event) => {
    const data = event.data;
    setSelectedPrompt({
      prompt_id: data.prompt_id,
      prompt_type: data.prompt_type,
      item_name: data.item_name || '미지정 에이전트',
      system_prompt_text: data.system_prompt_text
    });
    setIsModalOpen(true); // 팝업 모달 오픈
  };

  // 💾 3. 팝업창 내부 [변경사항 반영] 저장 버튼 핸들러 (Axios 동기화)
  const handleSave = async () => {
    try {
      // 백엔드로 수정된 데이터 전송 (Upsert 또는 Update 엔드포인트 가정)
      await axios.post(`${API_BASE_URL}/api/admin/prompts/save`, {
        prompt_type: selectedPrompt.prompt_type,
        system_prompt_text: selectedPrompt.system_prompt_text
      });
      
      alert("✨ 프롬프트 지시문이 안전하게 변경되었습니다.");
      setIsModalOpen(false); // 팝업 닫기
      fetchPrompts(); // 데이터 그리드 리프레시 새로고침
    } catch (error) {
      alert("❌ 저장 실패 (Oops 규칙 위반 확인 필요): " + error.message);
    }
  };

  if (loading) return <div style={{ padding: '20px', fontWeight: 'bold' }}>데이터 그리드 빌드 중...</div>;

  return (
    <div style={{ padding: '25px', backgroundColor: '#f7fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h3 style={{ margin: 0, color: '#2d3748', fontWeight: 'bold' }}>🏛️ AI 에이전트 프롬프트 마스터 관리자 패널</h3>
        <span style={{ fontSize: '13px', color: '#718096' }}>💡 수정하려면 리스트 행을 <b>더블클릭</b> 하세요.</span>
      </div>

      {/* ■ 마스터 데이터 영역: AG-Grid 테마 결합 */}
      <div className="ag-theme-alpine" style={{ height: '520px', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <AgGridReact
          rowData={prompts}
          columnDefs={columnDefs}
          onRowDoubleClicked={onRowDoubleClicked} // 더블클릭 이벤트 연결
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100]} /* 🌟 노란색 불빛 완벽 방어 */
          defaultColDef={{ resizable: true, filter: true }}
        />
      </div>

      {/* ========================================================================= */}
      {/* 🌟 디테일 팝업 영역: 더블클릭 시 렌더링되는 모달 창 */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '10px', width: '680px', boxShadow: '0 20px 25px rgba(0,0,0,0.15)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, color: '#2b6cb0' }}>🛠️ 에이전트 시스템 프롬프트 상세 수정</h4>
              <span style={{ fontSize: '12px', backgroundColor: '#ebf8ff', color: '#2b6cb0', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                {selectedPrompt.item_name}
              </span>
            </div>
            <hr style={{ border: '0.5px solid #edf2f7', marginBottom: '20px' }} />

            {/* 고유 식별자 키 라벨링 */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#4a5568' }}>
                코드 ID (prompt_type)
              </label>
              <input 
                value={selectedPrompt.prompt_type}
                disabled={true} // 데이터 연동 무결성을 위해 고유 식별자 수정 잠금방어
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '5px', backgroundColor: '#edf2f7', color: '#718096', fontWeight: 'monospace' }}
              />
            </div>

            {/* 프롬프트 입력용 거대 텍스트 영역 */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', fontSize: '13px', color: '#4a5568' }}>
                시스템 지시문 설정 (System Prompt)
              </label>
              <textarea 
                value={selectedPrompt.system_prompt_text}
                onChange={(e) => setSelectedPrompt({...selectedPrompt, system_prompt_text: e.target.value})}
                rows={10}
                style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e0', borderRadius: '5px', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5', outline: 'none' }}
                placeholder="Qwen 통제용 가드레일 단어(Strict, Never)를 포함하여 작성하세요..."
              />
            </div>

            {/* 하단 제어 컨트롤러 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '9px 16px', backgroundColor: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                닫기
              </button>
              <button 
                onClick={handleSave}
                style={{ padding: '9px 20px', backgroundColor: '#319795', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }} // 수동 저장용 그린톤 매칭
              >
                변경사항 반영
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}