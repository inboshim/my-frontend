import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 공통 레이아웃 및 인증 가드
import MainLayout from './components/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute'; // ★ 인증 가드 임포트

// 도메인(기능)별 페이지 컴포넌트
import LoginPage from './features/auth/LoginPage';
import SummaryPage from './features/summary/SummaryPage'; // 🌟 우리의 핵심 업무 화면

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 로그인 화면 (누구나 접근 가능) */}
        <Route path="/login" element={<LoginPage />} />

        {/* 2. 로그인한 유저만 접근 가능한 보안 영역 (ProtectedRoute로 보호) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            
            {/* 
              [구조 혁신 🌟] 
              텅 비어있던 불필요한 대시보드 페이지(DashboardPage)를 완전히 삭제했습니다.
              이제 사용자가 최초 루트(/) 경로로 로그인하여 들어오자마자
              가장 완성도 높은 'SummaryPage(요약 대시보드)'가 인덱스(첫 화면)로 즉시 띄워집니다!
            */}
            <Route index element={<SummaryPage />} />
            
            {/* 만약 기존 사이드바 메뉴 등에서 /summary 주소로 링크가 걸려있을 때를 대비한 안전 예외 처리 */}
            <Route path="summary" element={<SummaryPage />} />
          </Route>
        </Route>

        {/* 3. 잘못된 주소로 들어오거나 예외 주소 접근 시 자동 루트(/) 리다이렉트 안전장치 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
