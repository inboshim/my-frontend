import React, {useState , useRef} from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function CommonGroupForm({ groupId, mode = 'CREATE', initialRowData, onSaveResult, onClose }) {

    const groupIdRef = useRef(null);
    const groupNameRef = useRef(null);    

    // 🌟 [이동 완료] 입력 폼 데이터 상태를 자식 내부에서 직접 관리
    const [commonGroupCode, setCommonGroupCode] = useState(
    mode === 'CREATE' 
        ? { commonGroupSeq:'', commonGroupId: '', commonGroupName: '', isUse: true }
        : initialRowData // 수정 모드일 때는 부모가 넘겨준 행 데이터 적용
    );

    // 3. 실시간 입력 값 제한 핸들러 (DB 사이즈 및 정규식 완벽 방어)
    const handleInputChange = (e) => {
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
    const handleSaveGroup = async () => {
    console.log('서버로 보낼 데이터:', commonGroupCode);

    // [체크 1-1] 그룹 ID 필수값 및 정규식 체크 (영문, _ 필수)
    if (!commonGroupCode.commonGroupId.trim()) {
      alert('그룹코드 아이디를 입력해 주세요.');
      groupIdRef.current.focus(); // 🌟 Group ID 창으로 포커스 이동
      return;
    }

    // [체크 2-1] 그룹 명칭 필수값 및 정규식 체크 (영문, _ 필수)
    if (!commonGroupCode.commonGroupName.trim()) {
      alert('그룹코드 명칭을 입력해 주세요.');
      groupNameRef.current.focus(); // 🌟 Group Name 창으로 포커스 이동
      return;
    }    

    // 2. [비동기 통신] FastAPI 백엔드로 데이터 전송
    try {
        // 💡 백엔드 라우터에 설정된 UPSERT 엔드포인트 주소로 POST 요청
        const response = await axios.post(`${API_BASE_URL}/api/admin/code/code-group/update`, commonGroupCode, {
        headers: {
            'Content-Type': 'application/json'
        }
        });

        // 3. [성공 처리] 백엔드가 200 OK 또는 201 Created를 리턴했을 때
        if (response.status === 200 || response.status === 201) {
        alert('그룹 코드가 정상적으로 저장 되었습니다.');
        
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
    

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2d3748' }}>
                {mode === 'CREATE' ? '새 그룹 코드 추가' : '그룹 코드 수정'}
                </h3>
                
                <div className="modal-form-group">
                <label>그룹 ID</label>
                <input 
                    type="text" 
                    name="commonGroupId"
                    value={commonGroupCode.commonGroupId} 
                    ref={groupIdRef} 
                    onChange={handleInputChange}
                    placeholder="예: SYSTEM_TYPE"
                    disabled={mode === 'UPDATE'} 
                />
                </div>

                <div className="modal-form-group">
                <label>그룹 명칭</label>
                <input 
                    type="text" 
                    name="commonGroupName" 
                    value={commonGroupCode.commonGroupName} 
                    ref={groupNameRef} 
                    onChange={handleInputChange}
                    placeholder="예: 시스템 유형 코드"
                />
                </div>

                {/* 사용 유무 체크박스 */}
                <div className="modal-form-group">
                <label>사용 유무</label>
                <label className={`checkbox-container ${mode === 'CREATE' ? 'disabled' : ''}`}>
                    <input 
                    type="checkbox" 
                    name="isUse" 
                    checked={commonGroupCode.isUse}
                    onChange={handleInputChange}
                    disabled={mode === 'CREATE'} 
                    />
                    <span style={{ fontSize: '14px', color: '#4a5568' }}>
                    {commonGroupCode.isUse ? '사용 (True)' : '미사용 (False)'}
                    </span>
                </label>
                </div>

                <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>취소</button>
                <button type="button" className="btn-save" onClick={handleSaveGroup}>저장</button>
                </div>
            </div>
        </div>

    );

}