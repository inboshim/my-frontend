import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/LoginPage.css';

function LoginPage() {
  // 처음부터 테스트 계정 값이 채워진 상태로 초기화합니다.
  const [email, setEmail] = useState('test@email.com');
  const [password, setPassword] = useState('1234');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === 'test@email.com' && password === '1234') {
      setError('');
      
      // ★ 로그인 성공 징표를 브라우저에 저장!
      localStorage.setItem('isLoggedIn', 'true');      
      
      navigate('/');
    } else {
      setError('로그인 정보가 올바르지 않습니다.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">🚀 My AI 플랫폼</h2>
        <p className="login-subtitle">포트폴리오 평가를 위한 데모 로그인 페이지입니다.</p>

        <form onSubmit={handleLogin} className="login-form">
          {/* 이메일 입력 칸 (readOnly 추가) */}
          <div className="input-group">
            <label className="input-label">데모 이메일 주소</label>
            <input
              type="email"
              value={email}
              readOnly // 사용자가 지우거나 수정할 수 없도록 잠금
              className="login-input"
              style={{ cursor: 'not-allowed', opacity: 0.8 }} // 마우스 커서와 투명도로 읽기 전용 표시
            />
          </div>

          {/* 비밀번호 입력 칸 (readOnly 추가) */}
          <div className="input-group">
            <label className="input-label">데모 비밀번호</label>
            <input
              type="password"
              value={password}
              readOnly // 사용자가 지우거나 수정할 수 없도록 잠금
              className="login-input"
              style={{ cursor: 'not-allowed', opacity: 0.8 }} // 마우스 커서와 투명도로 읽기 전용 표시
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          {/* 면접관은 오직 이 버튼 하나만 누르면 바로 진입 가능합니다! */}
          <button type="submit" className="login-button">
            데모 계정으로 접속하기
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
