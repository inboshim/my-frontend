import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/GroupGrid.css';

// 🌟 [모듈 누락 해결]: AG-Grid 가 요구하는 페이징 및 텍스트 필터 모듈을 정확히 패키징합니다.
import { AgGridReact } from 'ag-grid-react';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function CodeAdminPage() {
  const [groupRows, setGroupRows] = useState([]); // 좌측 마스터 그룹 데이터 스토어
  const [itemRows, setItemRows] = useState([]);   // 우측 디테일 아이템 데이터 스토어
  const [selectedGroupId, setSelectedGroupId] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [groupGridApi, setGroupGridApi] = useState(null);

  // 🌟 그룹코드 모달 오픈 여부 상태
  const [isCommonGroupCodeModalOpen, setIsCommonGroupCodeModalOpen] = useState(false);
  const [commonGroupCodeModalMode, setCommonGroupCodeModalMode] = useState('CREATE'); // 'CREATE' 또는 'UPDATE'
  // 🌟 입력 폼 데이터 상태
  const [commonGroupCode, setCommonGroupCode] = useState({
    commonGroupId: '',
    commonGroupName: '', 
    isUse : true
  });

// 3. 실시간 입력 값 제한 핸들러 (DB 사이즈 및 정규식 완벽 방어)
const handleCommonGroupInputChange = (e) => {
  const { name, value, type, checked } = e.target;

  if (type === 'checkbox') {
    setCommonGroupCode(prev => ({ ...prev, [name]: checked }));
    return;
  }

  if (name === 'commonGroupId') {
    // 🌟 영문 대문자와 언더바(_)만 허용 (소문자는 대문자로 자동 치환, 그 외 문자 즉시 제거)
    const filteredValue = value.toUpperCase().replace(/[^A-Z_]/g, '');
    // 🌟 character varying(50) 제한
    if (filteredValue.length <= 50) {
      setCommonGroupCode(prev => ({ ...prev, [name]: filteredValue }));
    }
  } 
  
  if (name === 'commonGroupName') {
    // 🌟 영문 및 한글, 공백문자만 허용 (숫자, 특수문자 즉시 제거)
    const filteredValue = value.replace(/[^a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, '');
    // 🌟 character varying(100) 제한
    if (filteredValue.length <= 100) {
      setCommonGroupCode(prev => ({ ...prev, [name]: filteredValue }));
    }
  }
};

  // 저장 버튼 핸들러 (우선 콘솔 출력 및 창 닫기)
  const handleSaveGroup = () => {
    console.log('서버로 보낼 데이터:', commonGroupCode);
    // TODO: 백엔드 axios.post 통신 연결 예정
    
    // 임시로 그리드에 바로 반영해서 확인해보고 싶다면 아래 주석 해제
    // setGroupRows(prev => [...prev, { ...newGroup, status: '사용' }]);
    
    setIsCommonGroupCodeModalOpen(false); // 모달 닫기
    setCommonGroupCode({ commonGroupId: '', commonGroupName: '', isUse:true }); // 폼 초기화
  };


  // 🌟 아이템코드 모달 오픈 여부 상태
  const [isCommonItemCodeModalOpen, setIsCommonItemCodeModalOpen] = useState(false);
  const [commonItemCodeModalMode, setCommonItemCodeModalMode] = useState('CREATE'); // 'CREATE' 또는 'UPDATE'
  // 🌟 입력 폼 데이터 상태
  const [commonItemCode, setCommonItemCode] = useState({
    commonGroupId: '',
    commonItemId: '',
    commonItemName: '', 
    commonItemOrder: 0, 
    isUse : true
  });

  // 2. 우측 그리드 상단 [아이템 추가] 버튼 클릭 시 호출할 함수
const handleOpenItemCreateModal = () => {

  // 기본적으로 State 값을 먼저 보되, 비어있다면 그리드 API에서 직접 꺼냅니다.
  let currentGroupId = selectedGroupId;
  
  if (!currentGroupId && groupGridApi) {
    const selectedRows = groupGridApi.getSelectedRows();     
    
    if (selectedRows && selectedRows.length > 0) {
      // 데이터 구조에 따라 commonGroupId 또는 common_group_id 중 맞는 키값을 입력하세요.
      currentGroupId = selectedRows[0].commonGroupId || selectedRows[0].common_group_id; 
      
      console.log("그리드 API로 강제 가로챈 첫 행 ID:", currentGroupId);
    }
  }

  if (!currentGroupId) {
    alert('좌측에서 먼저 그룹을 선택해 주세요.');
    return;
  }
  
  setCommonItemCodeModalMode('CREATE');
  setCommonItemCode({
    commonGroupId: currentGroupId, // 🌟 현재 선택된 좌측 그룹 ID를 그대로 주입
    commonItemId: '',
    commonItemName: '',
    commonItemOrder: 0,
    isUse: true              // 추가 시 무조건 true 고정
  });
  setIsCommonItemCodeModalOpen(true);
};

// 3. 아이템 전용 실시간 인풋 필터링 핸들러
const handleCommonItemInputChange = (e) => {
  const { name, value, type, checked } = e.target;

  if (type === 'checkbox') {
    setCommonItemCode(prev => ({ ...prev, [name]: checked }));
    return;
  }

  if (name === 'commonItemCode') {
    // 🌟 영문 대/소문자와 언더바(_)만 허용하며 최대 50자 제한
    const filteredValue = value.replace(/[^a-zA-Z_]/g, '');
    if (filteredValue.length <= 50) {
      setCommonGroupCode(prev => ({ ...prev, [name]: filteredValue })); // (실제 프로젝트 state 명칭에 매핑)
      setCommonItemCode(prev => ({ ...prev, [name]: filteredValue }));
    }
  }

  if (name === 'commonItemName') {
    // 🌟 영문 및 한글, 공백문자만 허용하며 최대 100자 제한
    const filteredValue = value.replace(/[^a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ\s]/g, '');
    if (filteredValue.length <= 100) {
      setCommonItemCode(prev => ({ ...prev, [name]: filteredValue }));
    }
  }

  if (name === 'commonItemOrder') {
    // 🌟 오직 숫자만 허용하며 딱 3자리까지만 입력 제한
    const filteredValue = value.replace(/[^0-9]/g, '');
    if (filteredValue.length <= 3) {
      setCommonItemCode(prev => ({ ...prev, [name]: filteredValue }));
    }
  }
};

// 4. 아이템 저장 실행 함수
const handleSaveItem = () => {
  console.log('서버로 저장할 아이템 데이터:', commonItemCode);
  // TODO: axios.post('/api/item', newItem) 백엔드 연동 영역
  setIsCommonItemCodeModalOpen(false);
};


  // 🏛️ 1. [좌측 그리드 컬럼] 공통 그룹코드 명세 정의
  const groupColumnDefs = [
    { headerName: "순번", valueGetter: "node.rowIndex + 1", width: 70, cellStyle: { textAlign: 'center' } },
    { headerName: "그룹 ID", field: "common_group_id", sortable: true, filter: true, width: 150, cellStyle: { fontWeight: 'bold' } },
    { headerName: "그룹 명칭", field: "common_group_name", sortable: true, filter: true, flex: 1 }
  ];

  // 🏛️ 2. [우측 그리드 컬럼] 공통 아이템코드 명세 정의
  const itemColumnDefs = [
    { headerName: "순번", valueGetter: "node.rowIndex + 1", width: 70, cellStyle: { textAlign: 'center' } },
    { headerName: "아이템 ID", field: "common_item_id", sortable: true, filter: true, width: 180 },
    { headerName: "코드 명칭 (한글 라벨)", field: "common_item_name", sortable: true, filter: true, width: 220, cellStyle: { color: '#2b6cb0', fontWeight: 'bold' } },
    { headerName: "정렬 순서", field: "common_item_order", sortable: true, width: 100, cellStyle: { textAlign: 'center' } },
    { headerName: "상태", field: "is_use", width: 90, cellRenderer: (params) => params.value ? '🟢 사용' : '🔴 미사용', cellStyle: { textAlign: 'center' } }
  ];

  // 3. 백엔드에서 공통 그룹 마스터 목록 호출
  const fetchGroupCodes = async () => {
    try {
      setLoading(true);
      
      /* ❌ 404 에러의 주범인 axios 구문을 아래처럼 완벽하게 주석(//)으로 틀어막으세요! */
       const response = await axios.get(`${API_BASE_URL}/api/admin/code/code-group/get_all`);
       setGroupRows(response.data);       

      /* 🎯 [철통 가드]: 백엔드 상태와 상관없이 무조건 로컬 가짜 데이터를 그리드에 강제 주입 */
      // const mockGroups = [
      //   { group_id: 'PROMPT_TYPE', group_name: 'AI 에이전트 프롬프트 유형 코드' }
      // ];
      
      //setGroupRows(mockGroups); // 이 코드가 try 최하단에서 무조건 실행되어야 합니다.

    } catch (error) {
      console.error("그룹코드 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 4. 🌟 [행 클릭 연동 트리거]: 왼쪽 그룹 행을 마우스로 클릭하면 종속된 5개 아이템만 실시간 스캔
  const onGroupRowClicked = async (event) => {
    const common_group_id = event.data.common_group_id;
    handleGroupSelection(common_group_id);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/code/code-item/get_all?common_group_id=${common_group_id}`);
      setItemRows(response.data);
    } catch (error) {
      console.error("❌ 아이템코드 API 조회 실패:", error);
    }
  };

  useEffect(() => {
    fetchGroupCodes();
  }, []);

  const onGridGroupReady = (params) => {

    setGroupGridApi(params.api);
  // 그리드 API에 접근하여 첫 번째 행을 선택합니다.
  const firstRowNode = params.api.getDisplayedRowAtIndex(0);
    if (firstRowNode) {
      firstRowNode.setSelected(true);      
      handleGroupSelection(firstRowNode.data.commonGroupId);
    }
  };

  const handleGroupSelection = (commonGroupId) => {
    if (!commonGroupId) return;
    setSelectedGroupId(commonGroupId); // ID 상태 저장
    
  };

  const onGridItemReady = (params) => {
  // 그리드 API에 접근하여 첫 번째 행을 선택합니다.
  const firstRowNode = params.api.getDisplayedRowAtIndex(0);
    if (firstRowNode) {
      firstRowNode.setSelected(true);
    }
  };

  if (loading) return <div style={{ padding: '20px', fontWeight: 'bold' }}>공통코드 뼈대 인프라 로드 중...</div>;

  return (
    <div style={{ padding: '25px', backgroundColor: '#f7fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '25px' }}>
        <h3 style={{ margin: 0, color: '#2d3748', fontWeight: 'bold' }}>공통 그롭코드 / Item코드</h3>
        <span style={{ fontSize: '13px', color: '#718096' }}>💡 좌측 그룹코드를 마우스로 <b>클릭</b>하면 우측에 종속된 세부 아이템 명세 그리드가 실시간 연동됩니다.</span>
      </div>

      {/* 🌟 좌우 스플릿(Split) 공간 분할 아키텍처 배치 */}
      <div style={{ display: 'flex', gap: '5px', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px'  }}>
        
        {/* 마스터: 왼쪽 35% 영역 (그룹 코드) */}
        <div style={{ flex: 1.2 }}>
          <div className="grid-header-container">
            <div className="grid-header-title">공통 그룹 코드 목록</div>
            <button type="button" className="btn-add-group"
            onClick={() => {
              // TODO: 그룹 추가 로직 연동
              console.log('그룹 추가 버튼 클릭됨');
              setIsCommonGroupCodeModalOpen(true);


            }}>+ 그룹추가</button>
          </div>  
          {isCommonGroupCodeModalOpen && (
                  <div className="modal-overlay">
                    <div className="modal-content">
                      <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2d3748' }}>
                        {commonGroupCodeModalMode === 'CREATE' ? '새 그룹 코드 추가' : '그룹 코드 수정'}
                      </h3>
                      
                      <div className="modal-form-group">
                        <label>그룹 ID</label>
                        <input 
                          type="text" 
                          name="commonGroupId"
                          value={commonGroupCode.commonGroupId} 
                          onChange={handleCommonGroupInputChange}
                          placeholder="예: SYSTEM_TYPE"
                        />
                      </div>

                      <div className="modal-form-group">
                        <label>그룹 명칭</label>
                        <input 
                          type="text" 
                          name="groupName" 
                          value={commonGroupCode.groupName} 
                          onChange={handleCommonGroupInputChange}
                          placeholder="예: 시스템 유형 코드"
                        />
                      </div>

                      <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={() => setIsCommonGroupCodeModalOpen(false)}>취소</button>
                        <button type="button" className="btn-save" onClick={handleSaveGroup}>저장</button>
                      </div>
                    </div>
                  </div>
                )}          


          <div className="ag-theme-quartz" style={{ height: '520px', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <AgGridReact
                rowData={groupRows}
                columnDefs={groupColumnDefs}
                onRowClicked={onGroupRowClicked}
                rowSelection={{ 
                  mode: 'singleRow',
                  checkboxes: true,           // 체크박스 표시 기능 활성화
                  enableClickSelection: true 
                }}  /* 🌟 v32 최신 규격 경고 박멸 */
                pagination={true}
                paginationPageSize={10}
                paginationPageSizeSelector={[10, 20, 50, 100]} /* 🌟 노란색 불빛 완벽 방어 */
                defaultColDef={{ resizable: true }}
                onGridReady={onGridGroupReady}                
            />
          </div>
        </div>

        {/* 디테일: 오른쪽 65% 영역 (아이템 상세 명세) */}
        <div style={{ flex: 1.8 }}>
          <div className="grid-header-container">
            <div className="grid-header-title">공통 아이템 코드 목록</div>
            <button type="button" className="btn-add-group"
            onClick={handleOpenItemCreateModal}>+ 아이템추가</button>
          </div>

          {/* 🌟 아이템 전용 추가/수정 모달 팝업 */}
          {isCommonItemCodeModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2d3748' }}>
                  ⚙️ {commonItemCodeModalMode === 'CREATE' ? '새 아이템 추가' : '아이템 수정'}
                </h3>
                
                {/* 부모 그룹 ID: 언제나 읽기전용 회색 배경 */}
                <div className="modal-form-group">
                  <label>그룹 ID (Group ID)</label>
                  <input 
                    type="text" 
                    name="commonGroupId" 
                    value={commonItemCode.commonGroupId} 
                    readOnly /* 🌟 읽기전용 회색 배경 처리 */
                  />
                </div>

                {/* 아이템 ID 입력 (영문, _ 만 가능) */}
                <div className="modal-form-group">
                  <label>아이템 ID (영문, _ 만 가능)</label>
                  <input 
                    type="text" 
                    name="commonItemId" 
                    value={commonItemCode.commonItemId} 
                    onChange={handleCommonItemInputChange}
                    placeholder="예: CHICKEN_01"
                    disabled={commonItemCodeModalMode === 'UPDATE'} /* 수정 시 키값 변경 불가 처리 선택 사항 */
                  />
                </div>

                {/* 아이템 명칭 입력 (영문, 한글 / 최대 100자) */}
                <div className="modal-form-group">
                  <label>아이템 명칭 (한글, 영문만 가능 / 최대 100자)</label>
                  <input 
                    type="text" 
                    name="commonItemName" 
                    value={commonItemCode.commonItemName} 
                    onChange={handleCommonItemInputChange}
                    placeholder="예: 후라이드 치킨"
                  />
                </div>

                {/* 정렬 순서 입력 (숫자만, 최대 3자리) */}
                <div className="modal-form-group">
                  <label>정렬 순서 (숫자만 가능 / 최대 3자리)</label>
                  <input 
                    type="text" 
                    name="commonItemOrder" 
                    value={commonItemCode.commonItemOrder} 
                    onChange={handleCommonItemInputChange}
                    placeholder="예: 10"
                  />
                </div>

                {/* 사용 유무 체크박스 (추가 모드 시 true 고정 및 비활성화) */}
                <div className="modal-form-group">
                  <label>사용 유무</label>
                  <label className={`checkbox-container ${commonItemCodeModalMode === 'CREATE' ? 'disabled' : ''}`}>
                    <input 
                      type="checkbox" 
                      name="isUse" 
                      checked={commonItemCode.isUse}
                      onChange={handleCommonItemInputChange}
                      disabled={commonItemCodeModalMode === 'CREATE'} /* 🌟 추가 시 체크박스 비활성화 */
                    />
                    <span style={{ fontSize: '14px', color: '#4a5568' }}>
                      {commonItemCode.isUse ? '사용 (True)' : '미사용 (False)'}
                    </span>
                  </label>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setIsCommonItemCodeModalOpen(false)}>취소</button>
                  <button type="button" className="btn-save" onClick={handleSaveItem}>저장</button>
                </div>
              </div>
            </div>
          )}        


          <div className="ag-theme-quartz" style={{ height: '520px', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <AgGridReact
                rowData={itemRows}
                columnDefs={itemColumnDefs}
                rowSelection={{ 
                  mode: 'singleRow',
                  checkboxes: true,           // 체크박스 표시 기능 활성화
                  enableClickSelection: true 
                }}  /* 🌟 v32 최신 규격 경고 박멸 */
                pagination={true}
                paginationPageSize={10}
                paginationPageSizeSelector={[10, 20, 50, 100]} /* 🌟 완벽 반영 확인 */
                defaultColDef={{ resizable: true, filter: true }}
                onGridReady={onGridItemReady} 
                localeText={{ noRowsToShow: '좌측에서 관리할 그룹 코드를 먼저 마우스로 선택해 주세요.' }}
            />
          </div>
        </div>

      </div>

      

    </div>
  );
}