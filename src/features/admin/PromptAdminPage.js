import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/GroupGrid.css';

// 🌟 [모듈 누락 해결]: AG-Grid 가 요구하는 페이징 및 텍스트 필터 모듈을 정확히 패키징합니다.
import { AgGridReact } from 'ag-grid-react';
import CommonPromptForm from '../../components/common/CommonPromptForm';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function PromptAdminPage() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
    
  const [groupGridApi, setPromptGridApi] = useState(null);
    
  const [selectedPromptRowData, setSelectedPromptRowData] = useState(null); 
    
    // 🌟 그룹코드 모달 오픈 여부 상태
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isPromptModalMode, setIsPromptModalMode] = useState('CREATE'); // 'CREATE' 또는 'UPDATE'  

  // 현재 팝업창에서 수정 중인 단일 데이터 스토어
  const [selectedPrompt, setSelectedPrompt] = useState(null);
    

  // 🏛️ 1. AG-Grid 컬럼 명세 정의 (JOIN 데이터 매핑)
  const columnDefs = [
    { headerName: "순번", valueGetter: "node.rowIndex + 1", sortable: false, filter: false, width: 80, cellStyle: { textAlign: 'center' } },
    { headerName: "에이전트 유형 (ID)", field: "promptType", sortable: false, filter: false, width: 180, cellStyle: { fontWeight: 'bold', color: '#2b6cb0' } },
    { headerName: "실행 순서", field: "commonItemOrder", sortable: false, filter: false, width: 100, cellStyle: { textAlign: 'center' } },
    { headerName: "시스템 지시문 본문 (미리보기)", field: "systemPromptText", sortable: false, filter: false, flex: 1, minWidth: 250,
      cellRenderer: (params) => params.value ? params.value.substring(0, 130) + '...' : '지시문이 비어있습니다.'
    },
    { headerName: "상태", field: "isActive", width: 100, sortable: false, filter: false,
      cellRenderer: (params) => params.value ? '🟢 활성' : '🔴 중지', cellStyle: { textAlign: 'center' } 
    }
  ];

  // API 데이터 로드 (백엔드 컨트롤러 JOIN 함수 연동)
  const fetchPrompts = async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_BASE_URL}/api/admin/prompts`, {
          params: {            
            promptId: null,
            commonGroupId : "",
            commonItemId : "",
            systemPromptText : ""
          }
        });  
      
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

    const rowData = event.data;

    console.log("로우 데이타 ::: ", rowData);

    setIsPromptModalMode('UPDATE'); // 수정 모드로 세팅
    setSelectedPromptRowData(rowData);      // 선택된 행 데이터를 자식에게 줄 준비
    setIsPromptModalOpen(true); // 팝업 모달 오픈
  };  
  
  // 2. 우측 그리드 상단 [아이템 추가] 버튼 클릭 시 호출할 함수
  const handleOpenPromptCreateModal = () => {

    // 🌟 부모는 오직 모드 세팅과 모달 레이어 스위치만 ON 합니다. (나머지 세팅은 자식이 함)
    setIsPromptModalMode('CREATE');
    setIsPromptModalOpen(true);  
};

  if (loading) return <div style={{ padding: '20px', fontWeight: 'bold' }}>데이터 그리드 빌드 중...</div>;

  return (
    <div style={{ padding: '25px', backgroundColor: '#f7fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h3 style={{ margin: 0, color: '#2d3748', fontWeight: 'bold' }}>프롬프트 관리자</h3>
        
        {/* <span style={{ fontSize: '13px', color: '#718096' }}>💡 수정하려면 리스트 행을 <b>더블클릭</b> 하세요.</span> */}
        {/* ➕ 신규 아이템 코드 추가 버튼 */}
              <button 
                type="button" 
                className="btn-add-group" // 버튼 스타일 통일을 위해 클래스명 바인딩
                onClick={handleOpenPromptCreateModal} // 오리지널 핸들러 함수 유기적 연결
                style={{ padding: '6px 16px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
              >
                + 프롬프트 추가
              </button>
      </div>

      {/* ■ 마스터 데이터 영역: AG-Grid 테마 결합 */}
      <div className="ag-theme-alpine" style={{ height: '520px', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <AgGridReact
          rowData={prompts}
          columnDefs={columnDefs}
          onRowDoubleClicked={onRowDoubleClicked} // 더블클릭 이벤트 연결
          rowSelection={{ 
                  mode: 'singleRow',
                  checkboxes: false,
                  headerCheckbox: false
                }}  /* 🌟 v32 최신 규격 경고 박멸 */ 
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50, 100]} /* 🌟 노란색 불빛 완벽 방어 */
          defaultColDef={{ resizable: true, filter: true }}
          ensureDomOrder={true}          // DOM 순서를 보장하여 드래그 선택을 정확하게 만듭니다.
          enableCellTextSelection={true}  // ★ 셀 안의 텍스트를 마우스로 드래그 선택할 수 있게 합니다.         
        />
      </div>

      {/* ========================================================================= */}
      {/* 🌟 디테일 팝업 영역: 더블클릭 시 렌더링되는 모달 창 */}
      {/* ========================================================================= */}
      {isPromptModalOpen && (
        <CommonPromptForm               
          mode={isPromptModalMode}    
          initialRowData={selectedPromptRowData}
          onClose={() => setIsPromptModalOpen(false)}
          onSaveResult={(isSuccess) => {       
            if (isSuccess) {
              
              fetchPrompts("", "");
              setIsPromptModalOpen(false); 
            }
          }}
        />
        
      )}
    </div>
  );
}