import React, {useState} from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL;

// 💡 부모로부터는 오직 '시작할 때 필요한 그룹 ID'와 '종료 콜백'만 받습니다.
export default function CommonItemForm({ groupId, mode = 'CREATE', initialRowData, onSaveResult, onClose }) {
  
  // 🌟 [이동 완료] 입력 폼 데이터 상태를 자식 내부에서 직접 관리
  const [commonItemCode, setCommonItemCode] = useState(
    mode === 'CREATE' 
      ? { commonGroupId: groupId, commonItemId: '', commonItemName: '', commonItemOrder: 0, isUse: true }
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

  // 🌟 [이동 완료] 자체 저장 및 결과 리턴 로직
  const handleInternalSave = async () => {

    alert('그룹 코드 저장 완료');
    onSaveResult(true);

    // try {
    //   const response = await axios.post('/api/admin/code/item/save', commonItemCode);
    //   if (response.status === 200) {
    //     alert('저장 완료');
    //     onSaveResult(true); // 💡 부모에게 성공 알림 (그리드 새로고침용)
    //   }
    // } catch (error) {
    //   alert('저장 실패');
    //   onSaveResult(false);
    // }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#2d3748' }}>
          ⚙️ {mode === 'CREATE' ? '새 아이템 추가' : '아이템 수정'}
        </h3>
        
        {/* 그룹 ID */}
        <div className="modal-form-group">
          <label>그룹 ID (Group ID)</label>
          <input 
            type="text" 
            name="commonGroupId" 
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

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>취소</button>
          <button type="button" className="btn-save" onClick={handleInternalSave}>저장</button>
        </div>
      </div>
    </div>
  );
}
