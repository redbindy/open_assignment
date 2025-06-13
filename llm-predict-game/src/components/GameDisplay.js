import React, { useEffect, useState, useRef } from 'react';
import './GameDisplay.css';

const GameDisplay = ({ game, remainingTime, selectedDifficulty }) => {
    const [displayedAnswerFast, setDisplayedAnswerFast] = useState('');
    const [displayedAnswerCareful, setDisplayedAnswerCareful] = useState('');
    const [showScore, setShowScore] = useState(false);

    const typingTimeoutFast = useRef(null);
    const typingTimeoutCareful = useRef(null);
    const showScoreTimeout = useRef(null);

    // 실제 모델 답변 (백엔드 필드명에 맞게 조정!)
    const answerFast =
        game.llm1?.reasoning ||
        game.llm1?.answer ||
        game.llm1?.rawAnswer ||
        game.llm1?.resultText ||
        '';
    const answerCareful =
        game.llm2?.reasoning ||
        game.llm2?.answer ||
        game.llm2?.rawAnswer ||
        game.llm2?.resultText ||
        '';

    // "게임 끝났을 때" 타이핑 효과 + 3초 후 점수/승자 노출
    useEffect(() => {
        setDisplayedAnswerFast('');
        setDisplayedAnswerCareful('');
        setShowScore(false);
        if (typingTimeoutFast.current) clearTimeout(typingTimeoutFast.current);
        if (typingTimeoutCareful.current) clearTimeout(typingTimeoutCareful.current);
        if (showScoreTimeout.current) clearTimeout(showScoreTimeout.current);

        if (game.phase === 'completed') {
            // Fast 타이핑
            if (answerFast && answerFast.length) {
                let idx = 0;
                const totalMs = 3000;
                const interval = totalMs / answerFast.length;
                function typeNext() {
                    setDisplayedAnswerFast(prev => prev + answerFast[idx]);
                    idx++;
                    if (idx < answerFast.length) {
                        typingTimeoutFast.current = setTimeout(typeNext, interval);
                    }
                }
                typeNext();
            }
            // Careful 타이핑
            if (answerCareful && answerCareful.length) {
                let idx = 0;
                const totalMs = 3000;
                const interval = totalMs / answerCareful.length;
                function typeNext() {
                    setDisplayedAnswerCareful(prev => prev + answerCareful[idx]);
                    idx++;
                    if (idx < answerCareful.length) {
                        typingTimeoutCareful.current = setTimeout(typeNext, interval);
                    }
                }
                typeNext();
            }
            // 3초 뒤 점수/승자 표시
            showScoreTimeout.current = setTimeout(() => setShowScore(true), 3000);
        }

        return () => {
            if (typingTimeoutFast.current) clearTimeout(typingTimeoutFast.current);
            if (typingTimeoutCareful.current) clearTimeout(typingTimeoutCareful.current);
            if (showScoreTimeout.current) clearTimeout(showScoreTimeout.current);
        };
    }, [game.phase, answerFast, answerCareful, game.id]);

    const statusText =
        game.status === 'pending' ? '예정' :
        game.status === 'ongoing' ? '진행 중' :
        '종료';

    const currentDisplayDifficulty = selectedDifficulty || 'medium';
    const difficultyNumbersMap = { 'easy': 4, 'medium': 6, 'hard': 9 };
    const numbersToDisplay =
        game.numbers ||
        Array.from({ length: difficultyNumbersMap[currentDisplayDifficulty] || 0 }).map(() => '?');
    const numberBoxes = numbersToDisplay.map((num, index) => (
        <div key={index} className="number-box">
            {num}
        </div>
    ));

    return (
        <div className="game-display-area">
            <div className="d-flex justify-content-between align-items-start flex-wrap mb-4">
                <div className="model_box">
                    {game.phase === 'completed' && (
                        <div style={{ minHeight: 48, marginBottom: 6, color: '#555', fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
                            {displayedAnswerFast || <span style={{ color: '#bbb' }}>모델 대답 출력 중...</span>}
                        </div>
                    )}
                    <h3 className="fw_bold">{game.llm1 ? game.llm1.name : '모델 A'}</h3>
                    {showScore && game.llm1Score !== undefined && <p>점수: {game.llm1Score}점</p>}
                </div>

                <div className="VS_box">
                    <h4 className={`mb-2 ${game.status === 'ongoing' ? 'text-success' : ''}`}>상태: {statusText}</h4>
                    {game.status !== 'completed' && (
                        <div>
                            <strong>남은 시간:</strong> <span id="timer">{remainingTime}</span>
                        </div>
                    )}
                    <div className="VS_font">VS</div>
                </div>

                <div className="model_box">
                    {game.phase === 'completed' && (
                        <div style={{ minHeight: 48, marginBottom: 6, color: '#555', fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
                            {displayedAnswerCareful || <span style={{ color: '#bbb' }}>모델 대답 출력 중...</span>}
                        </div>
                    )}
                    <h3 className="fw_bold">{game.llm2 ? game.llm2.name : '모델 B'}</h3>
                    {showScore && game.llm2Score !== undefined && <p>점수: {game.llm2Score}점</p>}
                </div>
            </div>

            {/* === 여기만 추가 === */}
            <div className="number-quiz-board-container text-center mb-4">
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#234', marginBottom: 6 }}>
                    숫자1: {game.correct_board}
                </div>
                <h4>제시된 숫자 ({currentDisplayDifficulty.toUpperCase()} 난이도):</h4>
                <div className="number-boxes-wrapper">
                    {numberBoxes}
                </div>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: '#A44', marginTop: 6 }}>
                    숫자2: {game.wrong_board}
                </div>
                <p className="text_muted mt-2">이 숫자들에 대한 LLM 모델들의 예측을 기다립니다.</p>
            </div>
            {/* === 여기까지 === */}

            {showScore && game.status === 'completed' && game.winnerId && (
                <div className="game-result-message text-center mt-3 fs-5">
                    <strong>승자: {game.llm1.id === game.winnerId ? game.llm1.name : game.llm2.name}</strong>
                </div>
            )}
            {showScore && game.status === 'completed' && !game.winnerId &&
                (game.llm1Score !== undefined && game.llm2Score !== undefined && game.llm1Score === game.llm2Score) && (
                <div className="game-result-message text-center mt-3 fs-5">
                    <strong>결과: 무승부</strong>
                </div>
            )}
        </div>
    );
};

export default GameDisplay;
