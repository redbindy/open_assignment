// src/components/GameDisplay.js

import React from 'react';
import './GameDisplay.css';

const GameDisplay = ({ game, remainingTime, selectedDifficulty }) => {
    const statusText = game.status === 'pending' ? '예정' :
                       game.status === 'ongoing' ? '진행 중' :
                       '종료';

    
    const currentDisplayDifficulty = selectedDifficulty || 'medium';

    
    const difficultyNumbersMap = {
        'easy': 4,
        'medium': 6,
        'hard': 9
    };

    
    const numbersToDisplay = game.numbers || Array.from({ length: difficultyNumbersMap[currentDisplayDifficulty] || 0 }).map(() => '?');

    // 숫자 박스 렌더링
    const numberBoxes = numbersToDisplay.map((num, index) => (
        <div key={index} className="number-box">
            {num}
        </div>
    ));

    return (
        <div className="game-display-area">
            <div className="d-flex justify-content-between align-items-start flex-wrap mb-4">
                <div className="model_box">
                    <h3 className="fw_bold">{game.llm1 ? game.llm1.name : '모델 A'}</h3>
                    {game.llm1Score !== undefined && <p>점수: {game.llm1Score}점</p>}
                </div>

                <div className="VS_box">
                    <h4 className={`mb-2 ${game.status === 'ongoing' ? 'text-success' : ''}`}>상태: {statusText}</h4>
                    {game.status !== 'completed' && (
                        <div><strong>남은 시간:</strong> <span id="timer">{remainingTime}</span></div>
                    )}
                    <div className="VS_font">VS</div>
                </div>

                <div className="model_box">
                    <h3 className="fw_bold">{game.llm2 ? game.llm2.name : '모델 B'}</h3>
                    {game.llm2Score !== undefined && <p>점수: {game.llm2Score}점</p>}
                </div>
            </div>

            {/* 숫자 퀴즈 보드 섹션 */}
            <div className="number-quiz-board-container text-center mb-4">
                <h4>제시된 숫자 ({currentDisplayDifficulty.toUpperCase()} 난이도):</h4>
                <div className="number-boxes-wrapper">
                    {numberBoxes}
                </div>
                <p className="text_muted mt-2">이 숫자들에 대한 LLM 모델들의 예측을 기다립니다.</p>
            </div>

            {game.status === 'completed' && game.winnerId && (
                <div className="game-result-message text-center mt-3 fs-5">
                    <strong>승자: {game.llm1.id === game.winnerId ? game.llm1.name : game.llm2.name}</strong>
                </div>
            )}
            {game.status === 'completed' && !game.winnerId && (game.llm1Score !== undefined && game.llm2Score !== undefined && game.llm1Score === game.llm2Score) && (
                <div className="game-result-message text-center mt-3 fs-5">
                    <strong>결과: 무승부</strong>
                </div>
            )}
        </div>
    );
};

export default GameDisplay;