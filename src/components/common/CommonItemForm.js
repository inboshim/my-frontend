import React, {useState, useRef} from 'react';
import axios from 'axios';
import { isInvalidOrZeroLess } from '../../utils/validation';

const API_BASE_URL = process.env.REACT_APP_API_URL;

// 💡 부모로부터는 오직 '시작할 때 필요한 그룹 ID'와 '종료 콜백'만 받습니다.
export default function CommonItemForm({ groupId, mode = 'CREATE', initialRowData, onSaveResult, onClose }) {
  
  const commonGroupIdRef = useRef(null);
  const commonItemIdRef = useRef(null);
  const commonItemNameRef = useRef(null);
  const commonItemOrderRef = useRef(null);
  const commonPromptAssistTextRef = useRef(null);  
  const commonPromptValidateTextRef = useRef(null);

  const [activeTab, setActiveTab] = useState("GUIDE");  

  // 🌟 [이동 완료] 입력 폼 데이터 상태를 자식 내부에서 직접 관리
  const [commonItemCode, setCommonItemCode] = useState(
    mode === 'CREATE' 
      ? { common_item_seq: null, commonGroupId: groupId, commonItemId: '', commonItemName: '', commonItemOrder: 0, isUse: true, commonPromptAssistText:"", commonPromptValidateText:"" }
      : initialRowData // 수정 모드일 때는 부모가 넘겨준 행 데이터 적용
  );
  
  // 🌟 아이템 전용 실시간 인풋 필터링 핸들러 (자식 내부로 내재화)
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setCommonItemCode(prev => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === 'commonItemId') { // 💡 기존 오타 수정: commonItemCode -> commonItemId
      // 🌟 영문 대/소문자와 언더바(_)만 허용하며 최대 50자 제한
      const filteredValue = value.replace(/[^a-zA-Z_]/g, '');
      if (filteredValue.length <= 50) {
        setCommonItemCode(prev => ({ ...prev, [name]: filteredValue }));
      }
    }

    if (name === 'commonItemName') {
      // 🌟 영문 및 한글, 공백문자만 허용하며 최대 100자 제한
      const filteredValue = value.replace(/[^a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ0-9\s]/g, '');
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

    if (name === 'commonPromptAssistText' || name === 'commonPromptValidateText') { 
      
      setCommonItemCode(prev => ({ ...prev, [name]: value }));
      
    }
    
  };

  // 🌟 [이동 완료] 자체 저장 및 결과 리턴 로직
  const handleSaveItem = async () => {    

    // [체크 1-1] 그룹 ID 필수값 및 정규식 체크 (영문, _ 필수)
    if (!commonItemCode.commonGroupId.trim()) {
      alert('그룹 ID를 확인해 주세요.');
      commonGroupIdRef.current.focus(); // 🌟 Group ID 창으로 포커스 이동
      return;
    }

    // [체크 2-1] 그룹 명칭 필수값 및 정규식 체크 (영문, _ 필수)
    if (!commonItemCode.commonItemId.trim()) {
      alert('아이템코드 ID을 입력해 주세요.');
      commonItemIdRef.current.focus(); // 🌟 Group Name 창으로 포커스 이동
      return;
    }    

    // [체크 2-2] 그룹 명칭 필수값 및 정규식 체크 (영문, _ 필수)
    if (!commonItemCode.commonItemName.trim()) {
      alert('아이템코드 명칭을 입력해 주세요.');
      commonItemNameRef.current.focus(); // 🌟 Group Name 창으로 포커스 이동
      return;
    }    
    
    // [체크 2-2] 그룹 명칭 필수값 및 정규식 체크 (영문, _ 필수)
    if (isInvalidOrZeroLess(commonItemCode.commonItemOrder)) {
      alert('숫자 0 이상 정렬 순서를 입력해 주세요.');
      commonItemOrderRef.current.focus(); // 🌟 Group Name 창으로 포커스 이동
      return; 
    }   

    // [체크 2-2] 시스템 프롬프트 도움 텍스트
    if (!commonItemCode.commonPromptAssistText.trim()) {
      alert('시스템 프롬프트 도움 문구 가이드 라인을 작성해 주세요.');
      commonPromptAssistTextRef.current.focus(); // 🌟 Group Name 창으로 포커스 이동
      return;
    }    

    // [체크 2-2] 시스템 프롬프트 유효성 텍스트
    if (!commonItemCode.commonPromptValidateText.trim()) {
      alert('시스템 프롬프트 도움 문구 가이드 라인을 작성해 주세요.');
      commonPromptValidateTextRef.current.focus(); // 🌟 Group Name 창으로 포커스 이동
      return;
    }    

    console.log("서버 전송 데이타 ::: ", commonItemCode);
    
    // 2. [비동기 통신] FastAPI 백엔드로 데이터 전송
    try {
        // 💡 백엔드 라우터에 설정된 UPSERT 엔드포인트 주소로 POST 요청
        const response = await axios.post(`${API_BASE_URL}/api/admin/code/code-item/update`, commonItemCode, {
        headers: {
            'Content-Type': 'application/json'
        }
        });

        // 3. [성공 처리] 백엔드가 200 OK 또는 201 Created를 리턴했을 때
        if (response.status === 200 || response.status === 201) {
        alert('아이템 코드가 정상적으로 저장 되었습니다.');
        
        // 💡 부모 페이지에게 저장 완료 신호 전송 (좌측 AG-Grid 목록 새로고침 유발)
        onSaveResult(true); 
        }
        
    } catch (error) {
                
        const errorDetail = error.response?.data?.detail;
        const errorMsg = typeof errorDetail === 'object' 
            ? JSON.stringify(errorDetail, null, 2) 
            : errorDetail || '서버 통신 오류';

        alert(`저장에 실패했습니다.\n사유: ${errorMsg}`);
        
        onSaveResult(false);
    }
  };

  // 삭제 버튼 핸들러 (우선 콘솔 출력 및 창 닫기)
    const handleDeleteItem = async () => {
    console.log('서버로 보낼 삭제 데이터:', commonItemCode);

    // 2. [비동기 통신] FastAPI 백엔드로 데이터 전송
    try {
        // 💡 백엔드 라우터에 설정된 UPSERT 엔드포인트 주소로 POST 요청
        const response = await axios.post(`${API_BASE_URL}/api/admin/code/code-item/delete`, commonItemCode, {
        headers: {
            'Content-Type': 'application/json'
        }
        });

        // 3. [성공 처리] 백엔드가 200 OK 또는 201 Created를 리턴했을 때
        if (response.status === 200 || response.status === 201) {
        alert('아이템 코드가 정상적으로 삭제 되었습니다.');
        
        // 💡 부모 페이지에게 저장 완료 신호 전송 (좌측 AG-Grid 목록 새로고침 유발)
        onSaveResult(true); 
        }
        
    } catch (error) {
                
        const errorDetail = error.response?.data?.detail;
        const errorMsg = typeof errorDetail === 'object' 
            ? JSON.stringify(errorDetail, null, 2) 
            : errorDetail || '서버 통신 오류';

        alert(`삭제에 실패했습니다.\n사유: ${errorMsg}`);
        
        onSaveResult(false);
    }
    
    };

  return (
    <div className="modal-overlay">
      <div className="modal-content-wide">
        <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#2d3748' }}>
          ⚙️ {mode === 'CREATE' ? '새 아이템 추가' : '아이템 수정'}
        </h3>
        
        {/* 좌우 2분할 메인 레이아웃 컨테이너 */}
        <div className="modal-body-split-container" style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'flex-start', width: '100%' }}>
          <div className="modal-left-meta-pane" style={{ width: '30%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 그룹 ID */}
            <div className="modal-form-group">
              <label>그룹 ID (Group ID)</label>
              <input 
                type="text" 
                name="commonGroupId" 
                ref={commonGroupIdRef} 
                value={commonItemCode.commonGroupId} 
                readOnly 
              />
            </div>

            {/* 아이템 ID 입력 */}
            <div className="modal-form-group">
              <label>아이템 ID (영문, _ 만 가능)</label>
              <input 
                type="text" 
                name="commonItemId" // 💡 name 속성을 commonItemId로 정확히 일치시킴
                ref={commonItemIdRef} 
                value={commonItemCode.commonItemId || ''} 
                onChange={handleInputChange} // 💡 내부 필터링 핸들러 호출
                placeholder="예: CHICKEN_01"
                disabled={mode === 'UPDATE'} 
              />
            </div>

            {/* 아이템 명칭 입력 */}
            <div className="modal-form-group">
              <label>아이템 명칭 (한글, 영문만 가능 / 최대 100자)</label>
              <input 
                type="text" 
                name="commonItemName" 
                ref={commonItemNameRef} 
                value={commonItemCode.commonItemName || ''} 
                onChange={handleInputChange}
                placeholder="예: 후라이드 치킨"
              />
            </div>

            {/* 정렬 순서 입력 */}
            <div className="modal-form-group">
              <label>정렬 순서 (숫자만 가능 / 최대 3자리)</label>
              <input 
                type="text" 
                name="commonItemOrder"
                ref={commonItemOrderRef}
                value={commonItemCode.commonItemOrder}
                onChange={handleInputChange}
                placeholder="예: 10"
              />
            </div>

            {/* 사용 유무 체크박스 */}
            <div className="modal-form-group">
              <label>사용 유무</label>
              <label className={`checkbox-container ${mode === 'CREATE' ? 'disabled' : ''}`}>
                <input 
                  type="checkbox" 
                  name="isUse" 
                  checked={commonItemCode.isUse}
                  onChange={handleInputChange}
                  disabled={mode === 'CREATE'} 
                />
                <span style={{ fontSize: '14px', color: '#4a5568' }}>
                  {commonItemCode.isUse ? '사용 (True)' : '미사용 (False)'}
                </span>
              </label>
            </div>  
            
          </div>          

          <div className="right-panel-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            {/* ⚙️ div 기반 탭 메뉴 세팅 */}
            <div className="modal-tab-header" style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '16px', gap: '8px' }}>
              <div 
                onClick={() => setActiveTab('GUIDE')} 
                style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 'bold', borderBottom: activeTab === 'GUIDE' ? '3px solid #dd6b20' : '3px solid transparent', color: activeTab === 'GUIDE' ? '#dd6b20' : '#718096', cursor: 'pointer', userSelect: 'none' }}
              >
                💡 시스템 프롬프트 작성 가이드라인
              </div>
              <div 
                onClick={() => setActiveTab('VALIDATE')} 
                style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 'bold', borderBottom: activeTab === 'VALIDATE' ? '3px solid #4a90e2' : '3px solid transparent', color: activeTab === 'VALIDATE' ? '#4a90e2' : '#718096', cursor: 'pointer', userSelect: 'none' }}
              >
                🔷 시스템 프롬프트 유효성 검증 메시지
              </div>
            </div>

            {/* 탭 바디 콘텐츠 영역 */}
            <div className="modal-tab-body-content">
              
              {/* [1번 탭: GUIDE] 활성화 시 작동 */}
              {activeTab === 'GUIDE' && (
                
                <div className="input-group-style" style={{ display: 'flex', flexDirection: 'column' }}>                
                {/* 1. 시스템 프롬프트 작성 가이드 도움 문구 */}
                <div className="guide-box-style guide-box">               
                  <span className="guide-title">ID 유형이 번역(translate)이면 영문 작성, 그 외 한글 작성 가능합니다.</span>
                </div>                    
                  <textarea
                      name="commonPromptAssistText"
                      value={commonItemCode.commonPromptAssistText}
                      ref={commonPromptAssistTextRef}
                      onChange={handleInputChange}
                      placeholder='예시) 이 프롬프트는 번역 에이전트의 페르소나를 정의합니다. 문체는 정중하게 유지해 주세요.'
                      rows={20}
                      className="wide-textarea-control"
                      style={{                         
                        resize: 'none',         /* 크기 조절 손잡이 비활성화 */
                        backgroundColor: '#fffaf0', 
                        lineHeight: '1.5' 
                      }}
                  />
                  <span className="helper-text">* 이 항목은 운영자가 해당 프롬프트를 수정할 때 가이드 팝업으로 노출됩니다.</span>
                  
                </div>
              )}

              {/* [2번 탭: VALIDATE] 활성화 시 작동 */}
              {activeTab === 'VALIDATE' && (
                <div className="input-group-style" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="validation-box-style validation-box">                     
                      <span className="guide-title">시스템 프롬프트를 AI 검증관이 자동으로 유효성 검사 시 사용 템플릿.</span>                    
                  </div>
                    <textarea
                      name="commonPromptValidateText"
                      value={commonItemCode.commonPromptValidateText}
                      ref={commonPromptValidateTextRef}
                      onChange={handleInputChange}
                      placeholder='예시) 당신은 검증관입니다. 다음 프롬프트가 적절한지 판단하고 JSON 양식으로 출력하세요. 대상: {{target_prompt}}'                                
                      rows={20}
                      className="wide-textarea-control"
                      style={{                         
                        resize: 'none',         /* 크기 조절 손잡이 비활성화 */
                        backgroundColor: '#ebf8ff', 
                        lineHeight: '1.5' 
                      }}
                  />
                  <span className="helper-text">{"* 필수 키워드: {{target_prompt}} 치환자를 반드시 포함하여 작성해 주세요."}</span>                    
                    
                </div>  
              )}
            </div>           
            
          </div>  

        </div>


        

        {/* 사용 유무 체크박스 하단에 배치될 최종 버튼 영역 */}
      <div className="wide-footer-container">                    

          {/* 2. [우측] 취소 및 저장 버튼 그룹 (수정 모드가 아닐 때도 레이아웃 우측 정렬 유지) */}
          <div className="modal-footer-right-group">
              <button type="button" className="btn-save" onClick={handleSaveItem}>
                  저장
              </button>

              {/* 1. [좌측] 수정 모드일 때만 나타나는 보수적인 개별 삭제 버튼 */}
              {mode === 'UPDATE' && (
                  <button
                      type="button"
                      className="btn-delete-group"
                      onClick={() => {
                          // 2중 안전장치 유효성 컨펌 가동
                          const confirmDelete = window.confirm(
                              `⚠️ [삭제 경고]\n아이템 ID: [${commonItemCode.commonItemId}]를 정말 삭제하시겠습니까?`
                          );
                          if (confirmDelete) {                              
                              
                            handleDeleteItem();

                          }
                      }}
                  >
                      그룹 삭제
                  </button>
              )}  

              <button type="button" className="btn-cancel" onClick={onClose}>
                  취소
              </button>
          </div>    
          </div>
      </div>
    </div>
  );
}
