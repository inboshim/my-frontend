import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../../styles/GroupGrid.css';

// 🌟 [모듈 누락 해결]: AG-Grid 가 요구하는 페이징 및 텍스트 필터 모듈을 정확히 패키징합니다.
import { AgGridReact } from 'ag-grid-react';
import CommonGroupForm from '../../components/common/CommonGroupForm';
import CommonItemForm from '../../components/common/CommonItemForm';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function CodeAdminPage() {
  const [groupRows, setGroupRows] = useState([]); // 좌측 마스터 그룹 데이터 스토어
  const [itemRows, setItemRows] = useState([]);   // 우측 디테일 아이템 데이터 스토어
  const [selectedGroupId, setSelectedGroupId] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [groupGridApi, setGroupGridApi] = useState(null);

  const [selectedGroupRowData, setSelectedGroupRowData] = useState(null); 
  const [selectedItemRowData, setSelectedItemRowData] = useState(null); 

  // 🌟 그룹코드 모달 오픈 여부 상태
  const [isCommonGroupCodeModalOpen, setIsCommonGroupCodeModalOpen] = useState(false);
  const [commonGroupCodeModalMode, setCommonGroupCodeModalMode] = useState('CREATE'); // 'CREATE' 또는 'UPDATE'
  
  // 🌟 아이템코드 모달 오픈 여부 상태
  const [isCommonItemCodeModalOpen, setIsCommonItemCodeModalOpen] = useState(false);
  const [commonItemCodeModalMode, setCommonItemCodeModalMode] = useState('CREATE'); // 'CREATE' 또는 'UPDATE'
  
  const [searchGroupId, setSearchGroupId] = useState('');
  const [searchGroupName, setSearchGroupName] = useState('');
  const [searchItemId, setSearchItemId] = useState('');
  const [searchItemName, setSearchItemName] = useState('');

    // 2. 우측 그리드 상단 [아이템 추가] 버튼 클릭 시 호출할 함수
  const handleOpenItemCreateModal = () => {

  // 기본적으로 State 값을 먼저 보되, 비어있다면 그리드 API에서 직접 꺼냅니다.
  let currentGroupId = selectedGroupId;
  
  if (!currentGroupId && groupGridApi) {
    const selectedRows = groupGridApi.getSelectedRows();     
    
    if (selectedRows && selectedRows.length > 0) {
      // 데이터 구조에 따라 commonGroupId 또는 commonGroupId 중 맞는 키값을 입력하세요.
      currentGroupId = selectedRows[0].commonGroupId || selectedRows[0].commonGroupId; 
      
      console.log("그리드 API로 강제 가로챈 첫 행 ID:", currentGroupId);
    }
  }

  if (!currentGroupId) {
    alert('좌측에서 먼저 그룹을 선택해 주세요.');
    return;
  }
  
  // 🌟 [핵심 변경] 부모의 selectedGroupId 상태를 안전하게 가로챈 ID로 갱신해 둡니다.
  setSelectedGroupId(currentGroupId); 
  
  // 🌟 부모는 오직 모드 세팅과 모달 레이어 스위치만 ON 합니다. (나머지 세팅은 자식이 함)
  setCommonItemCodeModalMode('CREATE');
  setIsCommonItemCodeModalOpen(true);  
};

  // 🏛️ 1. [좌측 그리드 컬럼] 공통 그룹코드 명세 정의
  const groupColumnDefs = [
    { headerName: "순번", valueGetter: "node.rowIndex + 1", width: 60, cellStyle: { textAlign: 'center' } },
    { headerName: "그룹코드 ID", field: "commonGroupId", sortable: true, filter: true, width: 200, cellStyle: { fontWeight: 'bold' } },
    { headerName: "그룹코드 명칭", field: "commonGroupName", sortable: true, filter: true, flex: 1 }
  ];

  // 🏛️ 2. [우측 그리드 컬럼] 공통 아이템코드 명세 정의
  const itemColumnDefs = [
    { headerName: "순번", valueGetter: "node.rowIndex + 1", width: 60, cellStyle: { textAlign: 'center' } },
    { headerName: "아이템코드 ID", field: "commonItemId", sortable: true, filter: true, width: 170 },
    { headerName: "아이템코드 명칭", field: "commonItemName", sortable: true, filter: true, width: 210, cellStyle: { color: '#2b6cb0', fontWeight: 'bold' } },
    { headerName: "정렬 순서", field: "commonItemOrder", sortable: true, width: 90, cellStyle: { textAlign: 'center' } },
    { headerName: "상태", field: "isUse", width: 90, cellRenderer: (params) => params.value ? '🟢 사용' : '🔴 미사용', cellStyle: { textAlign: 'center' } }
  ];

  // 3. 백엔드에서 공통 그룹 마스터 목록 호출
  const fetchGroupCodes = async (searchId, searchName) => {
    try {
      setLoading(true);      
        console.log("그룹코드 :::", searchId);
        console.log("그룹명칭 :::", searchName);
        const response = await axios.get(`${API_BASE_URL}/api/admin/code/code-group/get_all`, {
          params: {
            commonGroupId : searchId,
            commonGroupName : searchName            
          }
        });
      
      setGroupRows(response.data);      

    } catch (error) {
      console.error("그룹코드 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. 백엔드에서 공통 그룹 마스터 목록 호출
  const fetchItemCodes = async (groupCodeId, searchId, searchName) => {
    try {
      setLoading(true);      
      
        const response = await axios.get(`${API_BASE_URL}/api/admin/code/code-item/get_all`, {
          params: {
            commonGroupId : groupCodeId,
            commonItemId : searchId,
            commonItemName : searchName            
          }
        });      
      
      setItemRows(response.data);      

    } catch (error) {
      console.error("아이템코드 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  
  let clickTimer = null;
  // 4. 🌟 [행 클릭 연동 트리거]: 왼쪽 그룹 행을 마우스로 클릭하면 종속된 5개 아이템만 실시간 스캔
  const onGroupRowClick = async (event) => {

    if (clickTimer) {
      clearTimeout(clickTimer);
    }

    clickTimer = setTimeout(() => {

      // 1. [추가] 마우스 드래그로 글자 블록이 지정된 상태인지 확인합니다.
      const selectedText = window.getSelection().toString();
      
      // 2. [추가] 드래그된 글자가 있다면 조회를 취소하고 타이머만 초기화한 뒤 종료합니다.
      if (selectedText && selectedText.trim().length > 0) {
        clickTimer = null;
        return; 
      }

      const commonGroupId = event.data.commonGroupId;
      handleGroupSelection(commonGroupId);
      fetchItemCodes(commonGroupId, "", "");

      clickTimer = null;

    }, 250);    
    
  };

  // 2. AG-Grid 행 더블클릭 시 호출될 함수
const onGroupRowDoubleClick = (event) => {

  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }

  const rowData = event.data; // 💡 AG-Grid가 제공하는 더블클릭된 행의 실제 데이터 객체
  //console.log("더블클릭된 행 데이터:", rowData);

  setCommonGroupCodeModalMode('UPDATE'); // 수정 모드로 세팅
  setSelectedGroupRowData(rowData);      // 선택된 행 데이터를 자식에게 줄 준비
  setIsCommonGroupCodeModalOpen(true);   // 모달 오픈 스위치 ON
};

  useEffect(() => {
    fetchGroupCodes("", "");
  }, []);

  const onGridGroupReady = (params) => {
        
    // 1. 그리드 API 백엔드 컨트롤러 등록
    setGroupGridApi(params.api);
    
  }; 

  const onRowDataUpdated = (params) => {
    // 데이터가 아예 없는 경우 함수 종료 (에러 방지)
    if (!params.api || params.api.getDisplayedRowCount() === 0) return;

    if (selectedGroupId) {
        // 루프 없이 ID로 바로 노드 찾기 (getRowId가 설정되어 있어야 합니다)
        const rowNode = params.api.getRowNode(selectedGroupId);
        if (rowNode) {
            rowNode.setSelected(true);
            return; // 찾아서 선택했다면 종료
        }
    }

    // 만약 selectedGroupId가 없거나 그리드에서 못 찾았다면 첫 번째 행 기본 선택
    const firstRowNode = params.api.getDisplayedRowAtIndex(0);
    if (firstRowNode) {
        firstRowNode.setSelected(true);
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
      {/* <div style={{ marginBottom: '25px' }}>
        <h3 style={{ margin: 0, color: '#2d3748', fontWeight: 'bold' }}>공통 그롭코드 / Item코드</h3>
        <span style={{ fontSize: '13px', color: '#718096' }}>💡 좌측 그룹코드를 마우스로 <b>클릭</b>하면 우측에 종속된 세부 아이템 명세 그리드가 실시간 연동됩니다.</span>
      </div> */}

      {/* 🌟 좌우 스플릿(Split) 공간 분할 아키텍처 배치 */}
      <div style={{ display: 'flex', gap: '5px', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px'  }}>
        
        {/* 마스터: 왼쪽 35% 영역 (그룹 코드) */}
        <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column'  }}>
            <div className="grid-header-title" style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0' }}>
              공통 그룹 코드 목록
            </div>

            <div className="group-search-rowspan-bar" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between', 
              backgroundColor: '#f8fafc',      // 정갈한 연회색 오피스톤 배경
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '12px',
              border: '1px solid #e2e8f0',
              gap: '16px'
            }}>
              {/* 💡 [좌측 영역] 1행(ID)과 2행(명칭)을 수직으로 내려 쌓는 공간 */}
              <div className="input-rows-container" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                flex: 1 
              }}>
                {/* 1행: 그룹코드 ID 입력 라인 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#4a5568', minWidth: '90px', textAlign: 'right' }}>그룹코드 ID :</span>
                  <input 
                    type="text" 
                    value={searchGroupId} 
                    onChange={(e) => setSearchGroupId(e.target.value)} 
                    placeholder="그룹코드 ID 검색어 입력하세요." 
                    style={{ padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1, maxwidth: '200px', fontSize: '12px', outline: 'none' }} 
                  />
                </div>

                {/* 2행: 그룹명칭 입력 라인 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#4a5568', minWidth: '90px', textAlign: 'right' }}>그룹코드 명칭 :</span>
                  <input 
                    type="text" 
                    value={searchGroupName} 
                    onChange={(e) => setSearchGroupName(e.target.value)} 
                    placeholder="그룹코드 명칭 검색어 입력하세요." 
                    style={{ padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1, maxwidth: '200px', fontSize: '12px', outline: 'none' }} 
                  />
                </div>
              </div>

              {/* 💡 [우측 영역] 1, 2행 높이만큼 통째로 합쳐진(Rowspan) 버튼 공간 */}
              <div className="button-rowspan-container" style={{ 
                display: 'flex', 
                flexDirection: 'column', // 버튼도 상하로 배치하여 Rowspan 밸런스 매핑
                gap: '6px',
                justifyContent: 'center',
                height: '100%'
              }}>
                {/* 🔍 조건 검색 실행 버튼 */}
                <button 
                  type="button"
                  onClick={() => fetchGroupCodes(searchGroupId, searchGroupName)} 
                  style={{ padding: '6px 16px', backgroundColor: '#4a5568', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                >
                  조회
                </button>
                
                {/* ➕ 신규 마스터 코드 추가 버튼 */}
                <button 
                  type="button" 
                  className="btn-add-group"
                  onClick={() => {                    
                    setCommonGroupCodeModalMode('CREATE');
                    setIsCommonGroupCodeModalOpen(true);
                  }} 
                  style={{ padding: '6px 16px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                >
                  + 그룹추가
                </button>
              </div>

            </div>            
          
          {isCommonGroupCodeModalOpen && (
            <CommonGroupForm               
              mode={commonGroupCodeModalMode}    
              initialRowData={selectedGroupRowData}
              onClose={() => setIsCommonGroupCodeModalOpen(false)}
              onSaveResult={(isSuccess) => {       
                if (isSuccess) {
                  // itemGridApi.refreshServerSide(); ➔ 성공 시 우측 그리드 새로고침 로직 기술
                  fetchGroupCodes(searchGroupId, searchGroupName);
                  setIsCommonGroupCodeModalOpen(false); 
                }
              }}
            />
          )}          


          <div className="ag-theme-quartz" style={{ height: '520px', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <AgGridReact
                getRowId={(params) => params.data.commonGroupId }
                rowData={groupRows}
                columnDefs={groupColumnDefs}
                onRowClicked={onGroupRowClick}
                onRowDoubleClicked={onGroupRowDoubleClick}                 
                rowSelection={{ 
                  mode: 'singleRow',
                  checkboxes: true,           // 체크박스 표시 기능 활성화
                  enableClickSelection: true 
                }}  /* 🌟 v32 최신 규격 경고 박멸 */                
                pagination={true}
                paginationPageSize={10}
                paginationPageSizeSelector={[10, 20, 50, 100]} /* 🌟 노란색 불빛 완벽 방어 */
                defaultColDef={{ resizable: true }}                
                onRowDataUpdated={onRowDataUpdated}   
                onGridGroupReady={onGridGroupReady}
                ensureDomOrder={true}          // DOM 순서를 보장하여 드래그 선택을 정확하게 만듭니다.
                enableCellTextSelection={true}  // ★ 셀 안의 텍스트를 마우스로 드래그 선택할 수 있게 합니다.         
            />
          </div>
        </div>

        {/* 디테일: 오른쪽 65% 영역 (아이템 상세 명세) */}
        <div style={{ flex: 1.7, display: 'flex', flexDirection: 'column' }}>

          {/* 🌟 1행: 좌측 h3 태그와 완벽하게 대칭을 이루는 순수한 타이틀 라벨 */}
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0' }}>
            공통 아이템 코드 목록
          </h3>     

          {/* 🌟 2행: 레거시 div를 걷어내고 좌측과 100% 동일한 컨테이너 속성으로 도킹 */}
          <div className="item-search-rowspan-bar" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',      // 좌측과 동일한 연회색 오피스톤 배경
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '12px',
            border: '1px solid #e2e8f0',
            gap: '16px'
          }}>
            {/* 💡 [좌측 2행 영역] 1행(아이템 ID)과 2행(코드명칭)을 수직으로 내려 쌓는 공간 */}
            <div className="input-rows-container" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px',
              flex: 1 
            }}>
              {/* 1행: 아이템 ID 입력 라인 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#4a5568', minWidth: '100px', textAlign: 'right' }}>아이템 ID :</span>
                <input 
                  type="text" 
                  value={searchItemId} 
                  onChange={(e) => setSearchItemId(e.target.value)} 
                  placeholder="아이템 ID 검색어 입력하세요." 
                  style={{ padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1, maxWidth: '500px', fontSize: '12px', outline: 'none' }} 
                />
              </div>{/* 2행: 코드명칭 입력 라인 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#4a5568', minWidth: '100px', textAlign: 'right' }}>아이템 명칭 :</span>
                <input 
                  type="text" 
                  value={searchItemName} 
                  onChange={(e) => setSearchItemName(e.target.value)} 
                  placeholder="아이템 명칭 검색어 입력하세요." 
                  style={{ padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1, maxWidth: '500px', fontSize: '12px', outline: 'none' }} 
                />
              </div>
            </div>

            {/* 💡 [우측 버튼 영역] 1, 2행 높이만큼 통째로 합쳐진(Rowspan) 버튼 공간 */}
            <div className="button-rowspan-container" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px',
              justifyContent: 'center'
            }}>
              {/* 🔍 아이템 조건 검색 실행 버튼 */}
              <button 
                type="button"
                onClick={() => fetchItemCodes(selectedGroupId, searchItemId, searchItemName)} 
                style={{ padding: '6px 16px', backgroundColor: '#4a5568', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
              >
                조회
              </button>
              
              {/* ➕ 신규 아이템 코드 추가 버튼 */}
              <button 
                type="button" 
                className="btn-add-group" // 버튼 스타일 통일을 위해 클래스명 바인딩
                onClick={handleOpenItemCreateModal} // 오리지널 핸들러 함수 유기적 연결
                style={{ padding: '6px 16px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
              >
                + 아이템추가
              </button>
            </div>  
          </div>

          
          

          {/* 💡 CodeAdminPage.js 하단 결합부에서 쓸모없는 이전 파라미터들을 싹 지워주세요 */}
          {isCommonItemCodeModalOpen && (
            <CommonItemForm 
              groupId={selectedGroupId}           
              mode={commonItemCodeModalMode}           
              initialRowData={selectedItemRowData}          
              onClose={() => setIsCommonItemCodeModalOpen(false)}
              onSaveResult={(isSuccess) => {       
                if (isSuccess) {
                  // itemGridApi.refreshServerSide(); ➔ 성공 시 우측 그리드 새로고침 로직 기술
                  

                  setIsCommonItemCodeModalOpen(false); 
                }
              }}
            />
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