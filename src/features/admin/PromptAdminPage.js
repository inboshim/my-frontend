import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = "http://localhost:8080";

export default function PromptAdminPage() {
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState(null);

    const fetchPrompts = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${BACKEND_URL}/api/admin/prompts`);
            setPrompts(response.data);
        } catch (error) {
            alert("❌ 데이터를 불러오지 못했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrompts();
    }, []);

    const handlePromptChange = (key, value) => {
        setPrompts(prev => prev.map(p => 
            p.prompt_key === key ? { ...p, prompt_text: value } : p
        ));
    };

    const handleSave = async (key, text) => {
        if (!text.trim()) {
            alert("⚠️ 공백은 저장할 수 없습니다.");
            return;
        }
        try {
            setSavingKey(key);
            const response = await axios.post(`${BACKEND_URL}/api/admin/prompts/update`, {
                prompt_key: key,
                prompt_text: text
            });
            alert("✨ " + response.data.message);
        } catch (error) {
            alert("❌ 실패: " + (error.response?.data?.detail || error.message));
        } finally {
            setSavingKey(null);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '15px', fontWeight: '600' }}>
                <div>🏛️ 중앙 프롬프트 마스터 인프라 동기화 중...</div>
            </div>
        );
    }

    return (
        // 🚀 요약 화면 컨테이너(.summary-container)와 동일한 와이드폭 및 여백 적용
        <div className="summary-container">
            
            {/* 상단 대시보드 타이틀 헤더 (여백 긴밀 축소 패치) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #eef2f7', paddingBottom: '6px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1a1f36', letterSpacing: '-0.5px' }}>
                <span style={{ color: '#10b981' }}></span> AI 에이젼트 프롬프트
                </h2>                
            </div>                        
            
                       
            {/* 📊 하단 결과 카드: 요약 대시보드 리포트 판넬과 동일한 하얀색 입체 카드 그리드 사출 */}
            <div className="report-result-card" style={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '12px', 
                padding: '24px', 
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
            }}>
                {prompts.map((p) => (
                    <div key={p.prompt_key} style={{ 
                        borderRadius: '8px', 
                        border: '1px solid #f1f5f9', 
                        backgroundColor: '#f8fafc', /* 부드러운 회색 박스로 격리 */
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>                                
                                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>&nbsp;{p.description}[{p.prompt_key}]</span>
                            </div>
                            
                            {/* 확정 버튼: 금융권 표준 그린 액션 톤 적용 */}
                            <button
                                onClick={() => handleSave(p.prompt_key, p.prompt_text)}
                                disabled={savingKey === p.prompt_key}
                                style={{ 
                                    backgroundColor: savingKey === p.prompt_key ? '#cbd5e1' : '#10b981', 
                                    color: '#fff', 
                                    border: 'none', 
                                    borderRadius: '6px', 
                                    padding: '6px 14px', 
                                    fontSize: '12px', 
                                    fontWeight: '700', 
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {savingKey === p.prompt_key ? 'DB저장 중...' : '프롬프트 저장'}
                            </button>
                        </div>
                        
                        {/* 텍스트 에디터 창 입력 영역 스타일 고도화 */}
                        <textarea
                            value={p.prompt_text}
                            onChange={(e) => handlePromptChange(p.prompt_key, e.target.value)}
                            rows={5}
                            style={{ 
                                width: '100%', 
                                boxSizing: 'border-box', 
                                borderRadius: '6px', 
                                border: '1px solid #e2e8f0', 
                                backgroundColor: '#ffffff', 
                                padding: '14px', 
                                color: '#334155', 
                                fontFamily: 'sans-serif', 
                                fontSize: '13px', 
                                lineHeight: '1.6',
                                resize: 'vertical', 
                                outline: 'none'
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
