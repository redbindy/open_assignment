// src/pages/HomePage.js

import React, { useEffect, useState, useCallback, useRef } from 'react';
import GameDisplay from '../components/GameDisplay';
import { fetchCurrentGame, submitPrediction, fetchUserPrediction, updateDifficulty, startGame, resetGame, dummyNumbers } from '../api';
import './HomePage.css';

const HomePage = () => {
    const [game, setGame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [remainingTime, setRemainingTime] = useState('');
    const [selectedPrediction, setSelectedPrediction] = useState('');
    const [predictionMessage, setPredictionMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userHasPredicted, setUserHasPredicted] = useState(false);
    const [selectedDifficulty, setSelectedDifficulty] = useState('medium');

    const timerIdRef = useRef(null);
    const gameEndTimeRef = useRef(null);
    const lastPredictedGameId = useRef(null);
    const isInitialLoad = useRef(true);

    const canPredict = game?.phase === 'prediction' && !userHasPredicted && !isSubmitting;
    const canSelectDifficulty = game?.phase === 'pending' || game?.phase === 'completed';
    const showGameStartButton = game?.phase === 'pending' || game?.phase === 'completed';
    const showPredictionSection = game?.phase !== 'pending';
    const showResetGameButton = game?.phase === 'completed';

    // getGameData 함수에서 selectedPrediction 의존성 제거
    const getGameData = useCallback(async () => {
        if (timerIdRef.current) {
            clearInterval(timerIdRef.current);
            timerIdRef.current = null;
        }

        try {
            setLoading(true);
            setError(null);

            const data = await fetchCurrentGame();
            setGame(data);

            if (data.difficulty) setSelectedDifficulty(data.difficulty);

            // 사용자 예측 정보 가져오기
            const userPredictionForCurrentGame = await fetchUserPrediction(data.id);

            // 예측 상태 확인 로직 개선
            const hasServerPrediction = !!(userPredictionForCurrentGame && userPredictionForCurrentGame.predictedWinnerId);
            const hasLocalPrediction = lastPredictedGameId.current === data.id;
            const predicted = hasServerPrediction || hasLocalPrediction;
            
            setUserHasPredicted(predicted);

            // 예측 선택 상태 복원
            if (hasServerPrediction) {
                setSelectedPrediction(userPredictionForCurrentGame.predictedWinnerId);
            } else if (!hasLocalPrediction && isInitialLoad.current) {
                // 초기 로드 시에만 선택 초기화
                setSelectedPrediction('');
            }

            // 페이즈별 메시지 및 타이머 설정
            if (data.phase === 'prediction' && data.predictionEndTime) {
                gameEndTimeRef.current = new Date(data.predictionEndTime).getTime();
                
                if (!predicted) {
                    setPredictionMessage("어떤 모델이 이길지 예측하고 제출해주세요!");
                } else {
                    setPredictionMessage("이번 라운드에 이미 예측에 참여하셨습니다.");
                }

                const updatePredictionTimer = () => {
                    const now = new Date().getTime();
                    const diff = gameEndTimeRef.current - now;
                    if (diff > 0) {
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                        setRemainingTime(`${minutes}분 ${seconds}초`);
                    } else {
                        setRemainingTime('0분 0초');
                        if (timerIdRef.current) {
                            clearInterval(timerIdRef.current);
                            timerIdRef.current = null;
                        }
                        // 타이머 종료 시 한 번만 재호출
                        setTimeout(() => getGameData(), 1000);
                    }
                };

                updatePredictionTimer();
                timerIdRef.current = setInterval(updatePredictionTimer, 1000);

            } else if (data.phase === 'llm_competition') {
                setRemainingTime('');
                setPredictionMessage(data.message || "LLM 모델들이 답을 내는 중입니다.");
                // LLM 경쟁 중일 때만 주기적으로 체크
                setTimeout(() => getGameData(), 2000);

            } else if (data.phase === 'completed') {
                setRemainingTime('');
                if (timerIdRef.current) {
                    clearInterval(timerIdRef.current);
                    timerIdRef.current = null;
                }

                // 게임 완료 시 최종 결과 메시지
                let finalMessage = '게임 결과가 불확실합니다.';
                const currentPrediction = hasServerPrediction ? userPredictionForCurrentGame.predictedWinnerId : selectedPrediction;

                if (predicted && currentPrediction) {
                    if (data.winnerId) {
                        const winnerName = data.winnerId === data.llm1.id ? data.llm1.name : data.llm2.name;
                        if (currentPrediction === data.winnerId) {
                            finalMessage = `🎉 예측 성공! ${winnerName}이(가) 승리했습니다!`;
                        } else if (currentPrediction === 'draw') {
                            finalMessage = `❌ 예측 실패... 무승부를 예측했지만 ${winnerName}이(가) 승리했습니다.`;
                        } else {
                            const predictedName = currentPrediction === data.llm1.id ? data.llm1.name : data.llm2.name;
                            finalMessage = `❌ 예측 실패... ${predictedName}을(를) 예측했지만 ${winnerName}이(가) 승리했습니다.`;
                        }
                    } else if (data.llm1Score !== undefined && data.llm2Score !== undefined && data.llm1Score === data.llm2Score) {
                        if (currentPrediction === 'draw') {
                            finalMessage = '🎉 예측 성공! 게임은 무승부였습니다.';
                        } else {
                            const predictedName = currentPrediction === data.llm1.id ? data.llm1.name : data.llm2.name;
                            finalMessage = `❌ 예측 실패... ${predictedName} 승리를 예측했지만 무승부였습니다.`;
                        }
                    }
                } else {
                    finalMessage = '이번 라운드에 예측에 참여하지 않았습니다.';
                }

                setPredictionMessage(finalMessage);
                // 게임 완료 시 예측 기록 초기화
                lastPredictedGameId.current = null;
            } else {
                setRemainingTime('');
                setPredictionMessage(data.message || "게임을 시작하려면 난이도를 선택하고 '게임 시작' 버튼을 누르세요.");
            }

            isInitialLoad.current = false;
        } catch (err) {
            console.error('게임 데이터 로딩 오류:', err);
            setError("게임 정보를 불러오는 데 실패했습니다.");
            setGame(null);
            setRemainingTime('');
            setPredictionMessage('게임 정보 로딩 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, []); // 의존성 배열에서 selectedPrediction 제거

    useEffect(() => {
        getGameData();

        return () => {
            if (timerIdRef.current) {
                clearInterval(timerIdRef.current);
                timerIdRef.current = null;
            }
        };
    }, [getGameData]);

    // 난이도 변경
    const handleDifficultyChange = useCallback(async (newDifficulty) => {
        if (!game || (game.phase !== 'pending' && game.phase !== 'completed')) {
            setPredictionMessage('게임 진행 중에는 난이도를 변경할 수 없습니다.');
            return;
        }
        try {
            setLoading(true);
            await updateDifficulty(newDifficulty);
            setSelectedDifficulty(newDifficulty);
            await getGameData();
        } catch (error) {
            console.error('난이도 변경 오류:', error);
            setPredictionMessage('난이도 설정에 실패했습니다.');
            setError("난이도 설정에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    }, [game, getGameData]);

    // 게임 시작
    const handleStartGame = useCallback(async () => {
        if (!game || (!game.difficulty && game.phase === 'pending')) {
            setPredictionMessage("난이도를 먼저 선택해주세요!");
            return;
        }
        if (game.phase !== 'pending' && game.phase !== 'completed') return;
        
        setLoading(true);
        try {
            await startGame();
            // 새 게임 시작 시 상태 초기화
            setSelectedPrediction('');
            setUserHasPredicted(false);
            setPredictionMessage("어떤 모델이 이길지 예측하고 제출해주세요!");
            lastPredictedGameId.current = null;
            isInitialLoad.current = true;
            await getGameData();
        } catch (error) {
            console.error('게임 시작 오류:', error);
            setError('게임 시작 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [game, getGameData]);

    // 예측 제출
    const handleSubmitPrediction = useCallback(async () => {
        if (!selectedPrediction) {
            setPredictionMessage('승리할 모델을 선택해주세요!');
            return;
        }
        if (game.phase !== 'prediction') {
            setPredictionMessage('지금은 예측을 제출할 수 있는 시기가 아닙니다.');
            return;
        }
        if (userHasPredicted) {
            setPredictionMessage('이미 예측에 참여하셨습니다.');
            return;
        }

            setIsSubmitting(true);
    setPredictionMessage('예측 제출 중...');

    try {
        if (!game || !game.id) {
            setPredictionMessage('현재 게임 정보가 없습니다. 예측할 수 없습니다.');
            return;
        }
        
        // 서버에서 바로 최종 결과(game) 반환
        const result = await submitPrediction(game.id, selectedPrediction);
        
        if (result.success && result.game) {
            // 바로 결과로 상태 업데이트
            setGame(result.game);
            setUserHasPredicted(true);
            setPredictionMessage(result.game.message || '예측이 성공적으로 제출되었습니다!');
            lastPredictedGameId.current = game.id;
            // 타이머, 폴링, setTimeout 등 불필요
        } else {
            setPredictionMessage(result.message || '예측 제출에 실패했습니다.');
        }
    } catch (error) {
        setPredictionMessage(error.message || '네트워크 오류 또는 서버 응답 문제');
        setError("예측 제출에 실패했습니다.");
    } finally {
        setIsSubmitting(false);
    }
}, [game, selectedPrediction, userHasPredicted]);

    // 게임 리셋
    const handleResetGame = useCallback(async () => {
        setLoading(true);
        try {
            await resetGame();
            // 리셋 시 모든 상태 초기화
            setSelectedPrediction('');
            setUserHasPredicted(false);
            setPredictionMessage("게임을 시작하려면 난이도를 선택하고 '게임 시작' 버튼을 누르세요.");
            lastPredictedGameId.current = null;
            isInitialLoad.current = true;
            await getGameData();
        } catch (error) {
            console.error('게임 리셋 오류:', error);
            setError('게임 초기화 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [getGameData]);

    // 예측 선택 (클릭)
    const handlePredictionOptionClick = useCallback((llmId) => {
        if (canPredict) {
            setSelectedPrediction(llmId);
            setPredictionMessage("예측을 제출하려면 '예측 제출하기' 버튼을 누르세요.");
        }
    }, [canPredict]);

    // 예측 선택 (라디오 버튼)
    const handleRadioChange = useCallback((e) => {
        if (canPredict) {
            setSelectedPrediction(e.target.value);
            setPredictionMessage("예측을 제출하려면 '예측 제출하기' 버튼을 누르세요.");
        }
    }, [canPredict]);

    if (loading) return <div className="loading-message text-center py-5">게임 정보를 불러오는 중...</div>;
    if (error) return <div className="error-message text-center py-5">{error}</div>;
    if (!game) return <div className="no-game-message text-center py-5">현재 게임 정보를 불러올 수 없습니다.</div>;

    return (
        <div className="home-page-container main-container py-5">
            <div className="difficulty-selection-section text-center mb-4">
                <h4>다음 게임 난이도 선택:</h4>
                <div className="d-flex justify-content-center gap-3">
                    <button
                        className={`btn ${selectedDifficulty === 'easy' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handleDifficultyChange('easy')}
                        disabled={!canSelectDifficulty}
                    >
                        쉬움 ({dummyNumbers.easy.length}칸)
                    </button>
                    <button
                        className={`btn ${selectedDifficulty === 'medium' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handleDifficultyChange('medium')}
                        disabled={!canSelectDifficulty}
                    >
                        보통 ({dummyNumbers.medium.length}칸)
                    </button>
                    <button
                        className={`btn ${selectedDifficulty === 'hard' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => handleDifficultyChange('hard')}
                        disabled={!canSelectDifficulty}
                    >
                        어려움 ({dummyNumbers.hard.length}칸)
                    </button>
                </div>
            </div>

            {showGameStartButton && (
                <div className="text-center mb-4">
                    <button className="btn btn-success btn-lg" onClick={handleStartGame} disabled={!canSelectDifficulty}>
                        게임 시작
                    </button>
                </div>
            )}

            {(game.phase === 'prediction' || game.phase === 'llm_competition' || game.phase === 'completed') && (
                <GameDisplay game={game} remainingTime={remainingTime} selectedDifficulty={selectedDifficulty} />
            )}

            {showPredictionSection && (
                <div className="prediction-section text-center mb-5 position-relative">
                    <h3>어떤 모델이 이길까요? 예측해 보세요!</h3>
                    <div className="d-flex justify-content-center gap-4 mb-4">
                        <div
                            className={`prediction_option ${selectedPrediction === game.llm1.id ? 'selected' : ''} ${!canPredict ? 'disabled' : ''}`}
                            onClick={() => handlePredictionOptionClick(game.llm1.id)}
                        >
                            <input type="radio" id="predictA" name="prediction" value={game.llm1.id}
                                   checked={selectedPrediction === game.llm1.id} onChange={handleRadioChange} disabled={!canPredict} />
                            <label htmlFor="predictA">
                                {game.llm1.name} 승
                            </label>
                        </div>
                        <div
                            className={`prediction_option ${selectedPrediction === 'draw' ? 'selected' : ''} ${!canPredict ? 'disabled' : ''}`}
                            onClick={() => handlePredictionOptionClick('draw')}
                        >
                            <input type="radio" id="predictDraw" name="prediction" value="draw"
                                   checked={selectedPrediction === 'draw'} onChange={handleRadioChange} disabled={!canPredict} />
                            <label htmlFor="predictDraw">
                                무승부
                            </label>
                        </div>
                        <div
                            className={`prediction_option ${selectedPrediction === game.llm2.id ? 'selected' : ''} ${!canPredict ? 'disabled' : ''}`}
                            onClick={() => handlePredictionOptionClick(game.llm2.id)}
                        >
                            <input type="radio" id="predictB" name="prediction" value={game.llm2.id}
                                   checked={selectedPrediction === game.llm2.id} onChange={handleRadioChange} disabled={!canPredict} />
                            <label htmlFor="predictB">
                                {game.llm2.name} 승
                            </label>
                        </div>
                    </div>

                    <div>
                        <button type="button" onClick={handleSubmitPrediction} disabled={isSubmitting || !canPredict || !selectedPrediction}>
                            예측 제출하기
                        </button>
                    </div>

                    <div id="prediction_message" className="prediction-message mt-3 fs-5">
                        {predictionMessage}
                    </div>
                </div>
            )}

            {showResetGameButton && (
                <div className="text-center mt-4">
                    <button className="btn btn-info btn-lg" onClick={handleResetGame}>
                        새 게임 시작
                    </button>
                </div>
            )}
        </div>
    );
};

export default HomePage;