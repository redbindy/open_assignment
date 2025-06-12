// src/api.js

let currentDummyDifficulty = 'medium';
let dummyUserPrediction = {};

let currentGameState = {
    id: 'game-0',
    phase: 'pending',
    llm1: { id: 'model-a', name: 'GPT-4o' },
    llm2: { id: 'model-b', name: 'Gemini 1.5 Pro' },
    difficulty: currentDummyDifficulty,
    numbers: [],
    predictionEndTime: undefined,
    llm1Score: undefined,
    llm2Score: undefined,
    winnerId: undefined,
    message: "게임을 시작하려면 난이도를 선택하고 '게임 시작' 버튼을 누르세요.",
};

export const dummyNumbers = {
    'easy': [1, 5, 8, 2],
    'medium': [10, 3, 7, 1, 9, 4],
    'hard': [15, 2, 8, 11, 4, 1, 9, 6, 13]
};

export const fetchCurrentGame = async () => {
    console.log(`[더미 API] fetchCurrentGame 호출됨. 현재 페이즈: ${currentGameState.phase}`);

    const now = new Date().getTime();
    const gameEndTime = new Date(currentGameState.predictionEndTime || 0).getTime();

    if (currentGameState.phase === 'prediction' && now >= gameEndTime) {
        currentGameState.phase = 'llm_competition';
        currentGameState.message = "예측 시간 종료! LLM 모델들이 답을 내는 중입니다...";
        currentGameState.predictionEndTime = undefined;
        setTimeout(() => {
            processLlmResults();
        }, 3000);
    }

    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ ...currentGameState });
        }, 300);
    });
};

export const updateDifficulty = async (difficulty) => {
    console.log(`[더미 API] 난이도 업데이트: ${difficulty}`);
    currentDummyDifficulty = difficulty;
    currentGameState.difficulty = difficulty;
    currentGameState.numbers = dummyNumbers[difficulty];
    currentGameState.message = `'${difficulty.toUpperCase()}' 난이도를 선택했습니다. '게임 시작' 버튼을 눌러주세요.`;

    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ success: true, message: `난이도가 ${difficulty}로 설정되었습니다.` });
        }, 100);
    });
};

export const startGame = async () => {
    console.log("[더미 API] 게임 시작 (예측 단계 진입).");
    if (currentGameState.phase === 'pending' || currentGameState.phase === 'completed') {
        currentGameState.id = `game-${Date.now()}`;
        currentGameState.phase = 'prediction';
        currentGameState.numbers = dummyNumbers[currentDummyDifficulty];
        currentGameState.predictionEndTime = new Date(Date.now() + 15 * 1000).toISOString();
        currentGameState.message = "어떤 모델이 이길지 예측하고 제출해주세요!";
        currentGameState.llm1Score = undefined;
        currentGameState.llm2Score = undefined;
        currentGameState.winnerId = undefined;
        dummyUserPrediction = {};
    }

    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ success: true, message: "게임이 시작되었습니다. 예측을 해주세요." });
        }, 100);
    });
};

export const submitPrediction = async (gameId, predictedWinnerId) => {
    console.log(`[더미 API] 게임 ID ${gameId}에 대한 예측 제출: ${predictedWinnerId}`);
    if (currentGameState.phase === 'prediction' && currentGameState.id === gameId) {
        
        dummyUserPrediction[gameId] = { gameId, predictedWinnerId };
        currentGameState.phase = 'llm_competition';
        currentGameState.predictionEndTime = undefined;
        currentGameState.message = "예측이 제출되었습니다! LLM 모델들의 결과를 기다리는 중입니다...";

        setTimeout(() => {
            processLlmResults();
        }, 3000);
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ success: true, message: '예측이 성공적으로 제출되었습니다!' });
            }, 100);
        });
    } else {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ success: false, message: '예측을 제출할 수 없는 상태입니다.' });
            }, 100);
        });
    }
};

export const fetchUserPrediction = async (gameId) => {
    console.log(`[더미 API] fetchUserPrediction 호출됨 (게임 ID: ${gameId}).`);
    return new Promise(resolve => {
        setTimeout(() => {
            
            resolve(dummyUserPrediction[gameId] || null);
        }, 100);
    });
};

const processLlmResults = () => {
    if (currentGameState.phase === 'llm_competition') {
        currentGameState.phase = 'completed';
        currentGameState.llm1Score = Math.floor(Math.random() * 10) + 1;
        currentGameState.llm2Score = Math.floor(Math.random() * 10) + 1;

        if (currentGameState.llm1Score > currentGameState.llm2Score) {
            currentGameState.winnerId = currentGameState.llm1.id;
            currentGameState.message = `${currentGameState.llm1.name}이(가) 승리했습니다!`;
        } else if (currentGameState.llm2Score > currentGameState.llm1Score) {
            currentGameState.winnerId = currentGameState.llm2.id;
            currentGameState.message = `${currentGameState.llm2.name}이(가) 승리했습니다!`;
        } else {
            currentGameState.winnerId = 'draw';
            currentGameState.message = "무승부입니다!";
        }
        console.log(`[더미 API] 게임 완료. 승자: ${currentGameState.winnerId}, 점수: ${currentGameState.llm1.name}: ${currentGameState.llm1Score}, ${currentGameState.llm2.name}: ${currentGameState.llm2Score}`);
    }
};

export const resetGame = async () => {
    console.log("[더미 API] 게임 초기화.");
    currentGameState = {
        id: 'game-0',
        phase: 'pending',
        llm1: { id: 'model-a', name: 'GPT-4o' },
        llm2: { id: 'model-b', name: 'Gemini 1.5 Pro' },
        difficulty: currentDummyDifficulty,
        numbers: [],
        predictionEndTime: undefined,
        llm1Score: undefined,
        llm2Score: undefined,
        winnerId: undefined,
        message: "게임을 시작하려면 난이도를 선택하고 '게임 시작' 버튼을 누르세요.",
    };
    dummyUserPrediction = {}; 
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ success: true, message: "새로운 게임을 시작할 준비가 되었습니다." });
        }, 100);
    });
};