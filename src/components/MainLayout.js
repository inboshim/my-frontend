import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../styles/MainLayout.css'; 

// 🚀 [제미나이 스펙 전격 교체]: 기하학 큐브(Grid2X2), 수평 매퍼(SlidersHorizontal)
import { Grid2X2, SlidersHorizontal, ShieldCheck, LogOut } from 'lucide-react';

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = 'ADMIN'; 

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/summary') {
      return location.pathname === '/summary' || location.pathname === '/';
    }
    return location.pathname === path;
  };

  return (
    <div className="layout-container">
      {/* 1. 🏛️ 제미나이 화면 스펙과 분자 단위까지 100% 동기화된 클린 서클 사이드바 */}
      <div className="sidebar">
        
        {/* [상단 그룹] */}
        <div>
          {/* 최상단 구글 엠블럼 심볼 마크 매핑 */}
          <div className="sidebar-brand-area">
            <Grid2X2 size={22} strokeWidth={2.0} className="brand-icon" />
          </div>
          
          <nav className="sidebar-nav">            
            {/* 📊 그림판에 그려주신 칼날 같은 기하학 대시보드 슬라이더 아이콘 장착 */}
            <Link 
              to="/summary" 
              className={`nav-link ${isActive('/summary') ? 'active' : ''}`} 
              title="금융 레포트 분석"
            >
              <SlidersHorizontal size={22} strokeWidth={2.4} />
            </Link>
          </nav>
        </div>

        {/* [하단 그룹] */}
        <div className="sidebar-bottom-group">
          
          {userRole === 'ADMIN' && (
            <div className="admin-menu-section">
              {/* 🛡️ 거버넌스 단추: 제미나이 톤에 맞춰 둥근 원형 흑백 링으로 작동 */}
              <Link 
                to="/admin" 
                className={`nav-link admin-highlight ${isActive('/admin') ? 'active' : ''}`} 
                title="프롬프트 거버넌스"
              >
                <ShieldCheck size={22} strokeWidth={2.4} />
              </Link>
            </div>
          )}

          {/* 🔓 시스템 로그아웃 버튼 */}
          <button onClick={handleLogout} className="logout-button" title="시스템 로그아웃">
            <LogOut size={20} strokeWidth={2.4} />
          </button>
        </div>

      </div>

      {/* 2. 오른쪽 업무 콘텐츠 영역 */}
      <div className="content-area">
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;
