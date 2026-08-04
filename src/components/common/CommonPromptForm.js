import React, {useState , useRef, useEffect} from 'react';
import axios from 'axios';
import { isOutOfBounds } from '../../utils/validation';

import '../../styles/GroupGrid.css';
import { AgGridReact } from 'ag-grid-react';

import { ModuleRegistry, TextEditorModule, SelectEditorModule } from 'ag-grid-community';

// ⚡ 화면이 켜지기 전, AG-Grid 최신 엔진에 편집 일꾼 모듈 2종을 공식 등록합니다!
ModuleRegistry.registerModules([TextEditorModule, SelectEditorModule]);

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function CommonPromptForm({ mode = 'CREATE', initialRowData, onSaveResult, onClose }) {

    const promptIdRef = useRef(null);
    const commonItemIdRef = useRef(null);    
    const systemPromptTextRef = useRef(null);    
    const nistHallucinationThresholdRef = useRef(null);    
    const nistToxicityThresholdRef = useRef(null);    

    const [itemOptions, setItemOptions] = useState([]);
    const [isPromptValidated, setIsPromptValidated] = useState(false);
    const [isValidating, setIsValidating] = useState(false); 

    const [activeTab, setActiveTab] = useState("GUIDE");  

    const [promptOptions, setPromptOptions] = useState([]);
    const [gridApi, setGridApi] = useState(null);

    // 🌟 [이동 완료] 입력 폼 데이터 상태를 자식 내부에서 직접 관리
    const [promptManager, setPromptManager] = useState(
    mode === 'CREATE' 
        ? { promptId:null, commonItemId: '', systemPromptText: '', nistHallucinationThreshold: null, nistToxicityThreshold: null , isActive: true, commonPromptAssistText: null , commonPromptValidateText: null }
        : initialRowData // 수정 모드일 때는 부모가 넘겨준 행 데이터 적용
    );

    const columnDefs = [    
    { headerName: "입력(최대)", field: "numCtx", width:93, editable: true,
        valueParser: params => {
            const clean = params.newValue.toString().replace(/[^0-9]/g, '');
            return clean.length <= 4 ? Number(clean) : Number(clean.slice(0, 4));
        }
    },
    
    { headerName: "출력(최대)", field: "numPredict", width:93, editable: true,
        valueParser: params => {
            const clean = params.newValue.toString().replace(/[^0-9]/g, '');
            return clean.length <= 4 ? Number(clean) : Number(clean.slice(0, 4));
        }
    },
    { headerName: "난수제어", field: "temperature", width:90, editable: true,
        valueParser: params => {
            let val = params.newValue.toString().replace(/[^0-9.]/g, '');
            const parts = val.split('.');
            if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
            if (parts[1] && parts[1].length > 2) val = parts[0] + '.' + parts[1].slice(0, 2);
            return val ? Number(val) : 0.00;
        }

    },
    { headerName: "반복폭주", field: "repeatPenalty", width:90, editable: true,
        valueParser: params => {
            let val = params.newValue.toString().replace(/[^0-9.]/g, '');
            const parts = val.split('.');
            if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
            if (parts[1] && parts[1].length > 2) val = parts[0] + '.' + parts[1].slice(0, 2);
            return val ? Number(val) : 1.10;
        }

    },
    { headerName: "Low VRAM", field: "lowVram", width:102, editable: true,
        valueFormatter: params => params.value ? 'True' : 'False',
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {            
            values: ['false', 'true']
        },        
        valueParser: params => params.newValue === true || params.newValue === 'true',
        cellEditorParams: {
            values: [false, true],
            valueFormatter: params => params.value ? 'True' : 'False'
        }
    }    
        
  ];

  const defaultColDef = {
    resizable: true,
    sortable: false,
    filter: false,
    singleClickEdit: true, 
    cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }
};

    // ========================================================
    // 1. [추가] 에이전트 키별 동적 플레이스홀더 텍스트 맵 정의
    // ========================================================
    const placeholderMap = {
        translation_system: `예: You are a professional English-to-Korean financial translator.
        Translate the following raw text into natural Korean investment tone.
        Do not alter or omit any financial metrics or percentage data.`,

        summary_system: `예: 당신은 대기업 투자전략실의 수석 분석 에이전트입니다.
        제공된 번역본 문맥을 기반으로 주요 파이낸셜 지표와 비즈니스 동향을 분석하세요.
        수치 데이터를 누락 없이 정확하게 요약해야 합니다.`,

        summary_user_default: `예: [필수체크] 핵심 요약:<gold>여기에 1~2줄로 압축 요약</gold>
        [주요 재무 지표 요약]
        - 매출액/영업이익 추이:
        - 핵심 투자 리스크 지표:`,

        evaluation_system: `예: 당신은 미국 NIST AI RMF 1.0 가이드라인을 준수하는 환각 검수관입니다.
        계산된 정량 코사인 유사도 점수와 요약본 본문을 대조 검증하세요.
        반드시 최종 판정으로 PASS 또는 FAIL을 명시해야 합니다.`,

        keyword_recommend_system: `예: 당신은 데이터 마이닝 및 자연어 처리(NLP) 기반의 트렌드 분석 전문가입니다.
        제공된 비즈니스 투자 리포트 본문에서 시장의 흐름과 핵심 논지를 관통하는 주요 키워드를 선별하세요.
        의미 없는 대명사나 조사는 배제하고, 반드시 명사 형태의 핵심어 5개만 추출해야 합니다.`
    };

    // 현재 선택된 아이템 ID에 매핑되는 예시가 없다면 보여줄 기본 방어 문구
    const currentPlaceholder = placeholderMap[promptManager.commonItemId] || "프롬프트 ID을 선택하시면 전용 프롬프트 작성 가이드 템플릿이 여기에 노출됩니다.";


    // 3. 실시간 입력 값 제한 핸들러 (DB 사이즈 및 정규식 완벽 방어)
    const handleInputChange = (e) => {
      const { name, value, type, checked } = e.target;      

    setPromptManager(prev => ({
        ...prev,
        // 체크박스면 checked 값을, 숫자형 인풋이면 parseFloat(value)를, 나머지는 value를 저장
        [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? 0.0 : parseFloat(value)) : value)
    }));

    if (name === "systemPromptText") {
        setIsPromptValidated(false); 
    }

    //   if (type === 'checkbox') {
    //     setPromptManager(prev => ({ ...prev, [name]: checked }));
    //     return;
    //   }
    
    //   if (name === 'commonGroupId') {
    //     // 🌟 영문 대문자와 언더바(_)만 허용 (소문자는 대문자로 자동 치환, 그 외 문자 즉시 제거)
    //     const filteredValue = value.toUpperCase().replace(/[^A-Z_]/g, '');
    //     // 🌟 character varying(50) 제한
    //     if (filteredValue.length <= 50) {
    //       setPromptManager(prev => ({ ...prev, [name]: filteredValue }));
    //     }
    //   } 
      
    //   if (name === 'commonGroupName') {
    //     // 🌟 영문 및 한글, 공백문자만 허용 (숫자, 특수문자 즉시 제거)
    //     const filteredValue = value.replace(/[^a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ0-9\s]/g, '');
    //     // 🌟 character varying(100) 제한
    //     if (filteredValue.length <= 100) {
    //       setPromptManager(prev => ({ ...prev, [name]: filteredValue }));
    //     }
    //   }

    //   if (name === 'commonItemId') {
    //     // 🌟 영문 및 한글, 공백문자만 허용 (숫자, 특수문자 즉시 제거)
    //     const filteredValue = value.replace(/[^a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣ0-9\s]/g, '');
    //     // 🌟 character varying(100) 제한
    //     if (filteredValue.length <= 100) {
    //       setPromptManager(prev => ({ ...prev, [name]: filteredValue }));
    //     }
    //   }
    };
    
    useEffect(() => {
        fetchItemCodes("TEXT");
        const selectedPromptId = promptManager.promptId;
        console.log("프롬프트 ID ::: ", selectedPromptId);
        fetchPromptOptions(selectedPromptId);
    }, []);

    const onGridGroupReady = (params) => {
        
        // 1. 그리드 API 백엔드 컨트롤러 등록
        setGridApi(params.api);
        
    }; 

    // 3. 백엔드에서 공통 그룹 마스터 목록 호출
    const fetchItemCodes = async (groupType) => {
        try {        
        
            const response = await axios.get(`${API_BASE_URL}/api/admin/code/code-item/get_all`, {
            params: {
                commonGroupId : "",
                commonGroupType : groupType,
                commonItemId : "",
                commonItemName : "",
                isUse : true,
                commonItemIdYn : "N",
            }
            });
        
        console.log("옵션 데이타 ::: ", response.data);
        setItemOptions(response.data);      

        } catch (error) {
            console.error("아이템코드 로드 실패:", error);
        } finally {        
        }
    };

    // 3. 백엔드에서 공통 그룹 마스터 목록 호출
    const fetchPromptOptions = async (promptId) => {
        try {        
        
            const response = await axios.get(`${API_BASE_URL}/api/admin/prompts/prompt_options`, {
            params: {
                    promptId : promptId                
                }
            });
        
        console.log("프롬프트 데이타 ::: ", response.data);
        setPromptOptions(response.data);      

        } catch (error) {
            console.error("프롬프트 옵션 로드 실패:", error);
        } finally {        
        }
    };

    const handleAiValidate = async () => {

    if (isValidating) return;    

    // 1. 필수 선택/입력값 유효성 검사
    if (!promptManager.commonItemId) {
        alert("에이전트 유형(ID)을 선택해 주세요.");
        commonItemIdRef.current.focus();        
        return;
    }
    if (!promptManager.systemPromptText) {
        alert("시스템 프롬프트 텍스트를 입력해 주세요.");
        systemPromptTextRef.current.focus();        
        return;
    }    

    try {

        setIsValidating(true);

        // 2. 우측 파란색 상자에 이미 연동되어 있는 '유효성 검사 템플릿' 정보 가져오기
        const selectedOption = itemOptions.find(opt => opt.commonItemId === promptManager.commonItemId);
        
        const validateTemplateText = promptManager.commonPromptValidateText || (selectedOption ? selectedOption.commonPromptValidateText : "");

        const response = await axios.post(`${API_BASE_URL}/api/admin/prompts/validate`, {commonItemId: promptManager.commonItemId,
            currentPromptText: promptManager.systemPromptText,
            validateTemplateText: validateTemplateText
            }, {
        headers: {
            'Content-Type': 'application/json'
        }
        });

        let result = response.data;
    
        // 만약 response.data 자체가 문자열이거나, 혹은 백엔드 응답 결과가 이중 문자열일 경우를 모두 방어
        if (typeof result === 'string') {
            try {
                result = JSON.parse(result);
            } catch (e) {
                console.error("1차 파싱 실패:", e);
            }
        }
        
        // Ollama가 준 내용물(result) 자체가 아직 문자열 상태일 경우 한 번 더 파싱 시도
        if (result && typeof result === 'string') {
            try {
                result = JSON.parse(result);
            } catch (e) {
                console.error("2차 파싱 실패:", e);
            }
        }         

        // [중요 디버깅 로그]: 개발자 도구 콘솔에서 최종 객체 구조를 눈으로 직접 확인용
        console.log("최종 변환된 AI 결과 객체 ::: ", result);
        setIsPromptValidated(true); 
        alert("시스템 프롬프트 텍스트 정보가 유효성을 통과하였습니다.\n저장 버튼을 실행하세요.");

    } catch (error) {
        // ⚠️ 백엔드에서 400 Bad Request 등으로 에러 응답을 보냈을 때 처리
        if (error.response && error.response.data) {
        const errorData = error.response.data;
        let failureReason = "";

        // 1. 백엔드가 fastapi의 HTTPException(detail=...) 구조로 보낸 경우
        if (errorData.detail) {
            failureReason = typeof errorData.detail === 'object' 
            ? (errorData.detail.reason || JSON.stringify(errorData.detail)) 
            : errorData.detail;
        } 
        // 2. 만약 백엔드가 400 에러 상태에서도 일반 JSON 객체 {"is_valid": false, "reason": "..."}를 그대로 보낸 경우
        else if (errorData.reason) {
            failureReason = errorData.reason;
        }

        // 🚨 유효성 검증 실패 사유를 얼럿창에 표시하고 유효성 검증 상태를 false로 지정
        setIsPromptValidated(false);
        alert(`[유효성 검증 실패]\n\n사유: ${failureReason || "프롬프트 규격이 올바르지 않습니다."}`);
        
        } else {
            // 서버 네트워크 단절이나 알 수 없는 전역 에러 케이스
            setIsPromptValidated(false);
            console.error("통신 에러 상세 ::: ", error);
            alert("서버와 통신 중 알 수 없는 에러가 발생했습니다.");
        }
        
    } finally{
        setIsValidating(false);
    }
    };

    // 저장 버튼 핸들러 (우선 콘솔 출력 및 창 닫기)
    const handleSavePrompt = async () => {
    //console.log('서버로 보낼 데이터:', promptManager);

    // [체크 1-1] 에이전트 아이템 ID 필수값
    if (!promptManager.commonItemId) {
      alert('프롬프트 ID를 선택해 주세요.');
      commonItemIdRef.current.focus(); // 🌟 Group ID 창으로 포커스 이동
      return;
    }

    //시스템 프롬프트 텍스트.
    if (!promptManager.systemPromptText || promptManager.systemPromptText.length < 10) {
        alert("⚠️ 시스템 프롬프트 본문을 최소 10자 이상 성의 있게 작성해 주세요.");
        systemPromptTextRef.current.focus();
        return;
    }    

    // 2. 그리드 옵션 3건 루프 검사
    for (const [index, option] of promptOptions.entries()) {
        const typeName = option.commonItemId; // 예: TYPE_A, TYPE_B, TYPE_C

        // ① 입력(최대) 검증 (범위 예시: 1 ~ 8192)
        if (isOutOfBounds(option.numCtx, 1, 8192)) {
            alert(`[${typeName}] 입력(최대) 값은 1에서 8192 사이의 숫자여야 합니다.`);
            
            // 에러 발생한 행(index)과 셀(numCtx)로 포커스 이동 및 편집 모드 활성화
            if (gridApi) {
            gridApi.setFocusedCell(index, 'numCtx');
            gridApi.startEditingCell({ rowIndex: index, colKey: 'numCtx' });
            }
            return;
        }

        // ② 출력(최대) 검증 (범위 예시: 1 ~ 4000)
        if (isOutOfBounds(option.numPredict, 1, 4000)) {
            alert(`[${typeName}] 출력(최대) 값은 1에서 4000 사이의 숫자여야 합니다.`);
            
            if (gridApi) {
            gridApi.setFocusedCell(index, 'numPredict');
            gridApi.startEditingCell({ rowIndex: index, colKey: 'numPredict' });
            }
            return;
        }

        // ③ 난수제어(temperature) 검증 (범위: 0.0 ~ 2.0)
        if (isOutOfBounds(option.temperature, 0.0, 2.0)) {
            alert(`[${typeName}] 난수제어 값은 0.0에서 2.0 사이의 숫자여야 합니다.`);
            
            if (gridApi) {
            gridApi.setFocusedCell(index, 'temperature');
            gridApi.startEditingCell({ rowIndex: index, colKey: 'temperature' });
            }
            return;
        }

        // ④ 반복폭주(repeatPenalty) 검증 (범위: 1.0 ~ 2.0)
        if (isOutOfBounds(option.repeatPenalty, 1.0, 2.0)) {
            alert(`[${typeName}] 반복폭주 값은 1.0에서 2.0 사이의 숫자여야 합니다.`);
            
            if (gridApi) {
            gridApi.setFocusedCell(index, 'repeatPenalty');
            gridApi.startEditingCell({ rowIndex: index, colKey: 'repeatPenalty' });
            }
            return;
        }

        // ⑤ Low VRAM 검증 (반드시 False여야 하는 조건)
        // 화면 상에서 문자열 "False" 또는 불리언 false 모두 대응할 수 있도록 비교 처리
        if (option.lowVram === 'True' || option.lowVram === true) {
            alert(`[${typeName}] Low VRAM은 사용할 수 없습니다. False로 변경해 주세요.`);
            
            if (gridApi) {
            gridApi.setFocusedCell(index, 'lowVram');
            gridApi.startEditingCell({ rowIndex: index, colKey: 'lowVram' });
            }
            return;
        }
    }

    // 2. [비동기 통신] FastAPI 백엔드로 데이터 전송
    try {
        
        // [핵심 추가] 현재 어떤 셀이든 편집 중이라면, 그 상태를 즉시 강제 종료하고 값을 그리드에 반영시킵니다.
        if (gridApi) {
            gridApi.stopEditing(); 
        }

        // 만약 앞서 연결했던 cellValueChanged 핸들러가 반영되는 React State 시간(비동기)이 필요하다면,
        // gridApi에서 최신 데이터를 그 자리에서 즉시 긁어와 Payload를 만드는 것이 가장 안전합니다.
        const latestOptions = [];
        if (gridApi) {
            gridApi.forEachNode((node) => {
            latestOptions.push(node.data);
            });
        }       

        setPromptOptions(latestOptions);        

        // 1. 백엔드 스키마 명칭에 맞게 딕셔너리(객체) 정제
    const savePayload = {
            // 신규 추가일 때 prompt_id가 null이나 undefined면 백엔드에서 에러가 날 수 있으므로, 
            // 현재 선택된 상태값이 없다면 명시적으로 빈 문자열("") 또는 null 처리를 해줍니다.
            prompt_id: promptManager.promptId || null, 
            
            // [수정] commonitemid -> common_item_id 로 언더바(_) 추가
            common_item_id: promptManager.commonItemId || "summary_system", 
            
            system_prompt_text: promptManager.systemPromptText,
            nist_hallucination_threshold: Number(promptManager.nistHallucinationThreshold),
            nist_toxicity_threshold: Number(promptManager.nistToxicityThreshold),
            is_active: promptManager.isActive,
            
            // 하단 그리드 옵션 3건 (필드명 스네이크 케이스 매핑)
            prompt_options: promptOptions.map(option => ({
            common_item_id: option.commonItemId,
            num_ctx: Number(option.numCtx),
            num_predict: Number(option.numPredict),
            temperature: Number(option.temperature),
            repeat_penalty: Number(option.repeatPenalty),
            low_vram: option.lowVram === 'True' || option.lowVram === true
            }))
        };

        //console.log("저장 데이타 ::: ", savePayload);
        
        // 💡 백엔드 라우터에 설정된 UPSERT 엔드포인트 주소로 POST 요청
        const response = await axios.post(`${API_BASE_URL}/api/admin/prompts/update`, savePayload, {
        headers: {
            'Content-Type': 'application/json'
        }
        });

        // 3. [성공 처리] 백엔드가 200 OK 또는 201 Created를 리턴했을 때
        if (response.status === 200 || response.status === 201) {
        alert('프롬프트가 정상적으로 저장 되었습니다.');
        
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
    const handleDeletePrompt = async () => {
    console.log('서버로 보낼 삭제 데이터:', promptManager);

    // 2. [비동기 통신] FastAPI 백엔드로 데이터 전송
    try {
        // 💡 백엔드 라우터에 설정된 UPSERT 엔드포인트 주소로 POST 요청
        const response = await axios.post(`${API_BASE_URL}/api/admin/prompts/delete`, promptManager, {
        headers: {
            'Content-Type': 'application/json'
        }
        });

        // 3. [성공 처리] 백엔드가 200 OK 또는 201 Created를 리턴했을 때
        if (response.status === 200 || response.status === 201) {
        alert('프롬프트 정보가 정상적으로 삭제 되었습니다.');
        
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
            <div className="modal-content" style={{ 
                maxWidth: '1050px !important', 
                width: '1200px', 
                padding: '10px', 
                boxSizing: 'border-box',
                display: 'block' /* 내부 요소를 수직으로 쌓지 않고 독립 배치가 가능하게 차단 */
                }}>
                <h3 style={{ marginTop: 0, marginBottom: '24px', color: '#2d3748', fontSize: '18px', fontWeight: 'bold' }}>
                {mode === 'CREATE' ? '새 프롬프트 추가' : '프롬프트 수정'}
                </h3>                

                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'row',
                    gap: '10px', 
                    width: '100%', 
                    alignItems: 'flex-start',
                    justifyContent: 'space-between'
                }}>
        
                    
                    {/* ================== [왼쪽 바구니]: 입력 폼 필드들 (너비 고정하여 밀림 방지) ================== */}
                    <div style={{ width: '650px', minWidth: '560px', flexShrink: 0 }}>
          

                        <div className="modal-form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '6px', color: '#4a5568' }}>프롬프트 ID</label>        
                        <select 
                            name="commonItemId"
                            value={promptManager.commonItemId}
                            ref={commonItemIdRef}
                            onChange={handleInputChange}
                            className="modal-select-control"                    
                            disabled={mode === 'UPDATE'}
                            >
                            {mode === 'CREATE' && <option value="">-- [필수] 선택하세요. --</option>}
                                                
                            {mode === 'UPDATE' ? (
                                <option value={promptManager.commonItemId}>
                                    {promptManager.commonItemId}
                                </option>
                            ) : (
                                // 등록 모드일 때는 DB에서 읽어온 공통코드 목록을 드롭다운에 매핑
                                itemOptions.map((option) => (
                                    <option key={option.commonItemSeq} value={option.commonItemId}>
                                        {option.commonItemId} ({option.commonItemName})
                                    </option>
                                ))
                            )}
                        </select>

                        {/* 📌 [고도화 2] 대용량 지시문을 위한 TextArea 전환 스펙 반영 */}
                        <div className="modal-form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '6px', color: '#4a5568' }}>시스템 프롬프트 텍스트</label>
                            <textarea 
                                name="systemPromptText" 
                                value={promptManager.systemPromptText} 
                                ref={systemPromptTextRef} 
                                onChange={handleInputChange}
                                placeholder={currentPlaceholder}                        
                                rows={30}
                                className="modal-textarea-control"
                            />
                        </div>                        

                        {/* 최종 버튼 영역 */}                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>

                            {/* 1. 아직 검증을 받지 않았거나 실패한 상태일 때만 검사 버튼 노출 */}
                            {!isPromptValidated && (
                            <button 
                            type="button" 
                            onClick={handleAiValidate}
                            style={{ padding: '10px 16px', backgroundColor: '#3182ce', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                            🔍 AI 유효성 검사
                            </button>
                            )}

                            {/* 2. 🌟 AI 검증관의 승인을 받았을 때만 대망의 [저장] 버튼이 출현! */}
                            {isPromptValidated && (
                                <button type="button" className="btn-save" onClick={handleSavePrompt}>
                                    저장
                                </button>
                            )}

                            {mode === 'UPDATE' && (
                                <button
                                    type="button"
                                    className="btn-delete-group"
                                    onClick={() => {
                                        const confirmDelete = window.confirm(
                                            `⚠️ [삭제 경고]\n프롬프트 ID: [${promptManager.promptId}]를 정말 삭제하시겠습니까?`
                                        );
                                        if (confirmDelete) {
                                            handleDeletePrompt();
                                        }
                                    }}
                                >
                                    삭제
                                </button>
                            )}  

                            <button type="button" className="btn-cancel" onClick={onClose}>
                                취소
                            </button>
                        </div>                 

                    </div>

                </div>                

                <div style={{ flex: '1', minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
                    {/* ⚙️ div 기반 탭 메뉴 세팅 */}
                    <div className="modal-tab-header" style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '16px', gap: '8px' }}>
                    <div 
                        onClick={() => setActiveTab('GUIDE') } 
                        style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 'bold', borderBottom: activeTab === 'GUIDE' ? '3px solid #dd6b20' : '3px solid transparent', color: activeTab === 'GUIDE' ? '#dd6b20' : '#718096', cursor: 'pointer', userSelect: 'none' }}
                    >
                        💡 작성 가이드라인
                    </div>
                    <div 
                        onClick={() => setActiveTab('VALIDATE')} 
                        style={{ padding: '10px 16px', fontSize: '14px', fontWeight: 'bold', borderBottom: activeTab === 'VALIDATE' ? '3px solid #4a90e2' : '3px solid transparent', color: activeTab === 'VALIDATE' ? '#4a90e2' : '#718096', cursor: 'pointer', userSelect: 'none' }}
                    >
                        🔷 유효성 검증 메시지
                    </div>
                    <div 
                        onClick={() => setActiveTab('LLM_OPTIONS')} 
                        style={{ 
                            padding: '10px 16px', 
                            fontSize: '14px', 
                            fontWeight: 'bold', 
                            borderBottom: activeTab === 'LLM_OPTIONS' ? '3px solid #6b5ced' : '3px solid transparent', 
                            color: activeTab === 'LLM_OPTIONS' ? '#6b5ced' : '#718096', 
                            cursor: 'pointer', 
                            userSelect: 'none' 
                        }}
                    >
                        ⚙️엔진 옵션 & NIST 설정
                    </div>            
                </div>    

                
                    
                    {(() => {
                        const selectedOption = itemOptions.find(opt => opt.commonItemId === promptManager.commonItemId);
                        
                        const assistantText = promptManager.commonPromptAssistText || selectedOption?.commonPromptAssistText || '';
                        const validateText = promptManager.commonPromptValidateText || selectedOption?.commonPromptValidateText || '';

                        return (
                        <>
                            
                            {/* [1번 탭: GUIDE] 활성화 시 작동 */}
                            {activeTab === 'GUIDE' && (            
                                <div style={{ backgroundColor: '#fdfaf2', borderLeft: '5px solid #e2a12e', padding: '16px', borderRadius: '4px', boxSizing: 'border-box' }}>
                                    <div style={{ fontSize: '13px', color: '#555555', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                        {assistantText || '왼쪽에서 프롬프트 ID를 선택하면 전용 작성 가이드라인이 이곳에 노출됩니다.'}
                                    </div>
                                </div>    
                            )}

                            {/* [2번 탭: VALIDATE] 활성화 시 작동 */}
                            {activeTab === 'VALIDATE' && (    
                                <div style={{ backgroundColor: '#f0f7ff', borderLeft: '5px solid #4a90e2', padding: '16px', borderRadius: '4px', boxSizing: 'border-box' }}>
                                    <div style={{ fontSize: '13px', color: '#4a6b9d', whiteSpace: 'pre-wrap', lineHeight: '1.6'}}>
                                        {validateText || '에이젼트 ID를 선택하면 LLM이 체크할 자체 유효성 검사 요약 개요가 노출됩니다.'}
                                    </div>
                                </div>
                            )}                            

                            {/* [3번 탭: OPTIONS] 활성화 시 작동 */}
                            {activeTab === 'LLM_OPTIONS' && (    
                                <div style={{ backgroundColor: '#f6f5ff', borderLeft: '5px solid #6b5ced', padding: '16px', borderRadius: '4px', boxSizing: 'border-box' }}>
                                    
                                    {/* 📌 [고도화 3] 0.00 단위 입력 가능한 숫자형 항목 2개 추가 (나란히 배치) */}
                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                                        {/* 환각 임계치 입력구역 */}
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#4a5568' }}>
                                            NIST 환각 임계치
                                            </label>
                                            <input 
                                                type="number" 
                                                name="nistHallucinationThreshold" 
                                                value={promptManager.nistHallucinationThreshold} 
                                                ref={nistHallucinationThresholdRef} 
                                                onChange={handleInputChange}
                                                step="0.05"
                                                min="0"
                                                max="1"
                                                placeholder="0.75"
                                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                                                defaultValue="0" 
                                            />
                                            <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#718096', lineHeight: '1.4' }}>
                                            * 범위: 0.0 ~ 1.0 (권장: 0.75)<br />높을수록 원문 대조가 엄격해져 환각을 방지합니다.
                                            </span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#4a5568' }}>
                                            NIST 유해성 임계치
                                            </label>
                                            <input 
                                                type="number" 
                                                name="nistToxicityThreshold" 
                                                value={promptManager.nistToxicityThreshold} 
                                                ref={nistToxicityThresholdRef} 
                                                onChange={handleInputChange}
                                                step="0.05"
                                                min="0"
                                                max="1"
                                                placeholder="0.30"
                                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                                                defaultValue="0" 
                                            />
                                            <span style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: '#718096', lineHeight: '1.4' }}>
                                            * 범위: 0.0 ~ 1.0 (권장: 0.30)<br />이 값보다 독성 점수가 높으면 출력을 사전 차단합니다.
                                            </span>
                                        </div>
                                    </div>

                                    {/* 활성 유무 체크박스 */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '6px', color: '#4a5568' }}>활성 유무</label>
                                        <label className={`checkbox-container ${mode === 'CREATE' ? 'disabled' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: mode === 'CREATE' ? 'not-allowed' : 'pointer' }}>
                                            <input 
                                                type="checkbox" 
                                                name="isActive" 
                                                checked={promptManager.isActive}
                                                onChange={handleInputChange}
                                                disabled={mode === 'CREATE'} 
                                            />
                                            <span style={{ fontSize: '14px', color: '#4a5568' }}>
                                                {promptManager.isActive ? '사용 (True)' : '미사용 (False)'}
                                            </span>
                                        </label>
                                    </div>

                                    <div className="ag-theme-alpine" style={{ height: '177px', width: '100%', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                    <AgGridReact
                                        rowData={promptOptions}
                                        columnDefs={columnDefs}     
                                        defaultColDef={defaultColDef}                               
                                        rowSelection={{ mode: 'singleRow', checkboxes: false, headerCheckbox: false}}
                                        pagination={false}                                                           
                                        getRowId={(params) => params.data.commonItemId}
                                        onCellValueChanged={(params) =>{
                                            console.log('실시간 셀 수정 감지 완료:', params.data);
                                            // 필요시 부모 컴포넌트의 전송 데이터 핸들러와 매핑 연동

                                            if (!params.api) return;

                                            const updatedRows = [];
                                            // 그리드에 표시된 최신 로우 데이터들을 전부 긁어모읍니다.
                                            params.api.forEachNode((node) => {
                                                updatedRows.push(node.data);
                                            });

                                            // 변경된 최신 3건의 옵션 데이터를 React 상태(State)에 덮어씌웁니다.
                                            setPromptOptions(updatedRows);

                                        }}             
                                        onGridReady={onGridGroupReady}
                                    />
                                                                
                                </div>

                                    {/* 가이드 라인 목록 (핵심 키워드 뒤에서 깔끔하게 줄바꿈 처리) */}
    <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-start">
            <span className="font-bold text-blue-600 min-w-[80px] inline-block">• 첫 번째 행</span>
            <span>
                : <strong className="text-gray-700">TYPE_A (대형 요약 분석)</strong>
                <br />
                <span className="text-gray-400 mx-1">-</span> 금융 보고서의 요약문/재무제표 등 대용량 팩트 기반 정밀 요약 옵션
            </span>
        </div>
        <div className="flex flex-col sm:flex-row items-start">
            <span className="font-bold text-emerald-600 min-w-[80px] inline-block">• 두 번째 행</span>
            <span>
                : <strong className="text-gray-700">TYPE_B (중형 분석)</strong>
                <br />
                <span className="text-gray-400 mx-1">-</span> 일반적인 리서치 본문 및 분석 섹션 처리를 위한 표준 옵션
            </span>
        </div>
        <div className="flex flex-col sm:flex-row items-start">
            <span className="font-bold text-amber-600 min-w-[80px] inline-block">• 세 번째 행</span>
            <span>
                : <strong className="text-gray-700">TYPE_C (소형 분석)</strong>
                <br />
                <span className="text-gray-400 mx-1">-</span> 목차, 개요, 부록 등 분량이 적은 단순 서술형 섹션의 고속 처리 옵션
            </span>
        </div>
    </div>




                                

                                </div>

                                
                            )}                            
                        </>
                        );
                    })()}
                    
                    </div>

                    

              </div>
            </div>
        </div>

    );

}