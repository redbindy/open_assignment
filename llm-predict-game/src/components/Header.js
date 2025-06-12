// src/components/Header.js
import React from 'react';

import './Header.css';

const Header = () => {
    return (
        <header className="app-header">
            <div className="logo">LLM 모델 예측 게임</div>
            {/* 마이페이지 링크 제거 */}
            {/* <Link to="/mypage" className="nav-link">마이페이지</Link> */}
        </header>
    );
};

export default Header;