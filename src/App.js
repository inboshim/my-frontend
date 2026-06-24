import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 공통 레이아웃 및 인증 가드
import MainLayout from './components/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute'; // ★ 인증 가드 무결성 유지

// 도메인(기능)별 페이지 컴포넌트
import LoginPage from './features/auth/LoginPage';
import SummaryPage from './features/summary/SummaryPage'; 
import PromptAdminPage from './features/admin/PromptAdminPage'; // 🚀 새로 만든 관리자 화면 정격 장착

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 로그인 화면 (누구나 접근 가능) */}
        <Route path="/login" element={<LoginPage />} />

        {/* 2. 로그인한 유저만 접근 가능한 보안 영역 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            
            {/* [인덱스 매핑] 사용자가 로그인 후 처음 루트(/)로 들어오면 요약 대시보드가 즉시 뜹니다. */}
            <Route index element={<SummaryPage />} />
            
            {/* 예외 처리를 위한 /summary 하위 경로 매핑 유지 */}
            <Route path="summary" element={<SummaryPage />} />

            {/* 🚀 [어드민 대시보드 안착] http://localhost:3000/admin 접근 시 가동되는 주소선 개설 */}
            <Route path="admin" element={<PromptAdminPage />} />

          </Route>
        </Route>

        {/* 3. 잘못된 주소 접근 시 자동 루트(/) 리다이렉트 안전장치 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
