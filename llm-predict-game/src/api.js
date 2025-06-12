// src/api.js - FastAPI 백엔드와 통신

const API_BASE_URL = 'http://localhost:8000/api';

// 에러 처리 헬퍼 함수
const handleApiError = async (response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API 오류: ${response.status}`);
    }
    return response.json();
};

// HTTP 요청 헬퍼 함수
const apiRequest = async (url, options = {}) => {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    });

    return handleApiError(response);
};

export const fetchCurrentGame = async () => {
    console.log('[API] fetchCurrentGame 호출됨');
    try {
        const data = await apiRequest('/game/current');
        console.log('[API] fetchCurrentGame 결과:', data);
        return data;
    } catch (error) {
        console.error('[API] fetchCurrentGame 오류:', error);
        throw error;
    }
};

export const updateDifficulty = async (difficulty) => {
    console.log(`[API] 난이도 업데이트: ${difficulty}`);
    try {
        const data = await apiRequest('/game/difficulty', {
            method: 'POST',
            body: JSON.stringify({ difficulty }),
        });
        console.log('[API] updateDifficulty 결과:', data);
        return data;
    } catch (error) {
        console.error('[API] updateDifficulty 오류:', error);
        throw error;
    }
};

export const startGame = async () => {
    console.log('[API] 게임 시작');
    try {
        const data = await apiRequest('/game/start', {
            method: 'POST',
        });
        console.log('[API] startGame 결과:', data);
        return data;
    } catch (error) {
        console.error('[API] startGame 오류:', error);
        throw error;
    }
};

export const submitPrediction = async (gameId, predictedWinnerId) => {
    console.log(`[API] 게임 ID ${gameId}에 대한 예측 제출: ${predictedWinnerId}`);
    try {
        const data = await apiRequest('/game/prediction', {
            method: 'POST',
            body: JSON.stringify({
                game_id: gameId,
                predicted_winner_id: predictedWinnerId,
            }),
        });
        console.log('[API] submitPrediction 결과:', data);
        return data;
    } catch (error) {
        console.error('[API] submitPrediction 오류:', error);
        throw error;
    }
};

export const fetchUserPrediction = async (gameId) => {
    console.log(`[API] fetchUserPrediction 호출됨 (게임 ID: ${gameId})`);
    try {
        const data = await apiRequest(`/game/prediction/${gameId}`);
        console.log('[API] fetchUserPrediction 결과:', data);
        return data;
    } catch (error) {
        console.error('[API] fetchUserPrediction 오류:', error);
        // 404 에러의 경우 null 반환 (예측이 없음)
        if (error.message.includes('404')) {
            return null;
        }
        throw error;
    }
};

export const resetGame = async () => {
    console.log('[API] 게임 초기화');
    try {
        const data = await apiRequest('/game/reset', {
            method: 'POST',
        });
        console.log('[API] resetGame 결과:', data);
        return data;
    } catch (error) {
        console.error('[API] resetGame 오류:', error);
        throw error;
    }
};

// 더미 데이터는 이제 사용하지 않지만, 프론트엔드에서 참조하는 경우를 위해 유지
export const dummyNumbers = {
    'easy': Array.from({length: 4}, (_, i) => i),
    'medium': Array.from({length: 6}, (_, i) => i),
    'hard': Array.from({length: 9}, (_, i) => i)
};