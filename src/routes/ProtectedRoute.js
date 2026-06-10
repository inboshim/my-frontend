// src/routes/ProtectedRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

function ProtectedRoute() {
  // 브라우저 저장소에서 로그인 상태 징표 확인
  const isAuthenticated = localStorage.getItem('isLoggedIn') === 'true';

  // 로그인이 안 되어 있다면 '알림창 없이' 바로 로그인 페이지('/login')로 부드럽게 이동시킵니다.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 로그인 상태가 맞다면 원래 가려던 업무 화면들을 보여줍니다.
  return <Outlet />;
}

export default ProtectedRoute;
