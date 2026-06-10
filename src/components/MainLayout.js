import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import '../styles/MainLayout.css'; // ★ CSS 파일 임포트 추가

function MainLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    
      // ★ 로그아웃 시 브라우저에 있던 징표를 파기!
      localStorage.removeItem('isLoggedIn');
      navigate('/login');
    
  };

  return (
    <div className="layout-container">
      {/* 1. 왼쪽 사이드바 메뉴 영역 */}
      <div className="sidebar">
        <div>
          <h3 className="sidebar-title">🚀 My AI 플랫폼</h3>
          
          <nav className="sidebar-nav">            
            <Link to="/summary" className="nav-link">
              📄 PDF 파일 요약
            </Link>
          </nav>
        </div>

        {/* 하단 로그아웃 버튼 */}
        <button onClick={handleLogout} className="logout-button">
          🔓 로그아웃
        </button>
      </div>

      {/* 2. 오른쪽 업무 콘텐츠 영역 */}
      <div className="content-area">
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;
