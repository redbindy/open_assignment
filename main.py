from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import uvicorn
import asyncio
from datetime import datetime, timedelta, timezone
import uuid
from threading import Thread
import time

# 기존 모듈들 import
from llm import LLM
from gamelogic import board_size, create_board, score

# FastAPI 앱 초기화
app = FastAPI()

# CORS 설정 (React 프론트엔드와 통신을 위해)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 개발 서버 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LLM 인스턴스 초기화
llm = LLM()

# 게임 상태 및 사용자 예측 저장소 (실제 환경에서는 데이터베이스 사용)
game_states: Dict[str, dict] = {}
user_predictions: Dict[str, dict] = {}
current_game_id: Optional[str] = None

# Pydantic 모델들
class DifficultyRequest(BaseModel):
    difficulty: str

class GameStartRequest(BaseModel):
    difficulty: str = "medium"

class PredictionRequest(BaseModel):
    game_id: str
    predicted_winner_id: str

class GameResponse(BaseModel):
    id: str
    phase: str
    llm1: dict
    llm2: dict
    difficulty: str
    numbers: List[int]
    prediction_end_time: Optional[str]
    llm1_score: Optional[int]
    llm2_score: Optional[int]
    winner_id: Optional[str]
    message: str

# 난이도별 보드 크기 매핑
DIFFICULTY_MAPPING = {
    "easy": 4,
    "medium": 6,
    "hard": 9
}

def create_initial_game_state(game_id: str, difficulty: str = "medium") -> dict:
    """초기 게임 상태 생성"""
    return {
        "id": game_id,
        "phase": "pending",
        "llm1": {"id": "model-a", "name": "급한 답변자"},
        "llm2": {"id": "model-b", "name": "신중한 답변자"},
        "difficulty": difficulty,
        "numbers": [],
        "correct_board": "",
        "wrong_board": "",
        "prediction_end_time": None,
        "llm1_score": None,
        "llm2_score": None,
        "winner_id": None,
        "message": "게임을 시작하려면 난이도를 선택하고 '게임 시작' 버튼을 누르세요.",
        "llm_processing": False
    }

def process_llm_results_async(game_id: str):
    """LLM 결과를 비동기로 처리"""
    def process():
        try:
            time.sleep(3)  # 3초 대기 (UI에서 로딩 효과)
            
            if game_id not in game_states:
                return
                
            game = game_states[game_id]
            if game["phase"] != "llm_competition":
                return
                
            # 실제 LLM 호출
            correct_board = game["correct_board"]
            wrong_board = game["wrong_board"]
            
            # 두 보드를 정수로 변환하여 LLM에 전달
            num1 = int(correct_board)
            num2 = int(wrong_board)
            
            # LLM에서 답변 받기
            answer_fast, answer_careful = llm.get_answer(num1, num2)
            
            # 답변에서 인덱스 추출 (*, *로 감싸진 부분)
            def extract_indices(answer_text):
                try:
                    # *로 감싸진 부분 찾기
                    start = answer_text.find('*')
                    end = answer_text.rfind('*')
                    if start != -1 and end != -1 and start != end:
                        indices_str = answer_text[start+1:end].strip()
                        # 쉼표로 분리하고 정수로 변환
                        indices = [int(x.strip()) for x in indices_str.split(',') if x.strip().isdigit()]
                        return indices
                    return []
                except:
                    return []
            
            fast_indices = extract_indices(answer_fast)
            careful_indices = extract_indices(answer_careful)
            
            # 점수 계산
            game["llm1_score"] = score(fast_indices, correct_board, wrong_board)
            game["llm2_score"] = score(careful_indices, correct_board, wrong_board)
            
            # 승자 결정
            if game["llm1_score"] > game["llm2_score"]:
                game["winner_id"] = game["llm1"]["id"]
                game["message"] = f"{game['llm1']['name']}이(가) 승리했습니다!"
            elif game["llm2_score"] > game["llm1_score"]:
                game["winner_id"] = game["llm2"]["id"]
                game["message"] = f"{game['llm2']['name']}이(가) 승리했습니다!"
            else:
                game["winner_id"] = "draw"
                game["message"] = "무승부입니다!"
            
            # 게임 완료 상태로 변경
            game["phase"] = "completed"
            game["prediction_end_time"] = None
            game["llm_processing"] = False
            
        except Exception as e:
            print(f"LLM 처리 중 오류: {e}")
            if game_id in game_states:
                game_states[game_id]["message"] = "LLM 처리 중 오류가 발생했습니다."
                game_states[game_id]["phase"] = "completed"
                game_states[game_id]["llm_processing"] = False
    
    thread = Thread(target=process)
    thread.daemon = True
    thread.start()

@app.get("/api/game/current", response_model=GameResponse)
async def get_current_game():
    """현재 게임 상태 조회"""
    global current_game_id
    
    if not current_game_id or current_game_id not in game_states:
        # 새 게임 생성
        current_game_id = str(uuid.uuid4())
        game_states[current_game_id] = create_initial_game_state(current_game_id)
    
    game = game_states[current_game_id]
    
    # 예측 시간 만료 체크
    if game["phase"] == "prediction" and game["prediction_end_time"]:
        end_time = datetime.fromisoformat(game["prediction_end_time"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) >= end_time:
            game["phase"] = "llm_competition"
            game["message"] = "예측 시간 종료! LLM 모델들이 답을 내는 중입니다..."
            game["prediction_end_time"] = None
            if not game.get("llm_processing", False):
                game["llm_processing"] = True
                process_llm_results_async(current_game_id)
    
    return GameResponse(**game)

@app.post("/api/game/difficulty")
async def update_difficulty(request: DifficultyRequest):
    """게임 난이도 업데이트"""
    global current_game_id
    
    if not current_game_id or current_game_id not in game_states:
        current_game_id = str(uuid.uuid4())
        game_states[current_game_id] = create_initial_game_state(current_game_id)
    
    game = game_states[current_game_id]
    
    if game["phase"] not in ["pending", "completed"]:
        raise HTTPException(status_code=400, detail="게임 진행 중에는 난이도를 변경할 수 없습니다.")
    
    game["difficulty"] = request.difficulty
    difficulty_text = {"easy": "쉬움", "medium": "보통", "hard": "어려움"}[request.difficulty]
    game["message"] = f"'{difficulty_text}' 난이도를 선택했습니다. '게임 시작' 버튼을 눌러주세요."
    
    return {"success": True, "message": f"난이도가 {request.difficulty}로 설정되었습니다."}

@app.post("/api/game/start")
async def start_game():
    global current_game_id

    if not current_game_id or current_game_id not in game_states:
        current_game_id = str(uuid.uuid4())
        game_states[current_game_id] = create_initial_game_state(current_game_id)

    game = game_states[current_game_id]

    if game["phase"] not in ["pending", "completed"]:
        raise HTTPException(status_code=400, detail="이미 게임이 진행 중입니다.")

    # ✅ 기존 ID 유지! 새로 만들지 마세요
    difficulty = game["difficulty"]

    # 보드 크기 결정 및 보드 생성
    if difficulty in DIFFICULTY_MAPPING:
        board_sz = DIFFICULTY_MAPPING[difficulty]
    else:
        board_sz = 6  # 기본값

    correct_board, wrong_board = create_board(board_sz)
    numbers = [int(digit) for digit in correct_board]

    # 기존 ID에 덮어쓰기
    game_states[current_game_id] = {
        "id": current_game_id,
        "phase": "prediction",
        "llm1": {"id": "model-a", "name": "급한 답변자"},
        "llm2": {"id": "model-b", "name": "신중한 답변자"},
        "difficulty": difficulty,
        "numbers": numbers,
        "correct_board": correct_board,
        "wrong_board": wrong_board,
        "prediction_end_time": (datetime.now() + timedelta(seconds=15)).isoformat() + 'Z',
        "llm1_score": None,
        "llm2_score": None,
        "winner_id": None,
        "message": "어떤 모델이 이길지 예측하고 제출해주세요!",
        "llm_processing": False
    }

    return {"success": True, "message": "게임이 시작되었습니다. 예측을 해주세요."}

@app.post("/api/game/prediction")
async def submit_prediction(request: PredictionRequest):
    """사용자 예측 제출"""
    if request.game_id not in game_states:
        raise HTTPException(status_code=404, detail="게임을 찾을 수 없습니다.")
    
    game = game_states[request.game_id]
    
    if game["phase"] != "prediction":
        raise HTTPException(status_code=400, detail="예측을 제출할 수 없는 상태입니다.")
    
    # 사용자 예측 저장
    user_predictions[request.game_id] = {
        "game_id": request.game_id,
        "predicted_winner_id": request.predicted_winner_id
    }
    
    # 게임 상태를 LLM 경쟁 단계로 변경
    game["phase"] = "llm_competition"
    game["prediction_end_time"] = None
    game["message"] = "예측이 제출되었습니다! LLM 모델들의 결과를 기다리는 중입니다..."
    game["llm_processing"] = True

    # ① 동기적으로 LLM 결과 처리
    # process_llm_results_async(request.game_id) → 아래 함수 내용을 직접 호출
    # time.sleep(3)도 필요에 따라 제거 가능

    try:
        # 실제 LLM 호출
        correct_board = game["correct_board"]
        wrong_board = game["wrong_board"]
        num1 = int(correct_board)
        num2 = int(wrong_board)
        answer_fast, answer_careful = llm.get_answer(num1, num2)

        def extract_indices(answer_text):
            try:
                start = answer_text.find('*')
                end = answer_text.rfind('*')
                if start != -1 and end != -1 and start != end:
                    indices_str = answer_text[start+1:end].strip()
                    indices = [int(x.strip()) for x in indices_str.split(',') if x.strip().isdigit()]
                    return indices
                return []
            except:
                return []

        fast_indices = extract_indices(answer_fast)
        careful_indices = extract_indices(answer_careful)
        game["llm1_score"] = score(fast_indices, correct_board, wrong_board)
        game["llm2_score"] = score(careful_indices, correct_board, wrong_board)

        # 승자 결정
        if game["llm1_score"] > game["llm2_score"]:
            game["winner_id"] = game["llm1"]["id"]
            game["message"] = f"{game['llm1']['name']}이(가) 승리했습니다!"
        elif game["llm2_score"] > game["llm1_score"]:
            game["winner_id"] = game["llm2"]["id"]
            game["message"] = f"{game['llm2']['name']}이(가) 승리했습니다!"
        else:
            game["winner_id"] = "draw"
            game["message"] = "무승부입니다!"
        game["phase"] = "completed"
        game["prediction_end_time"] = None
        game["llm_processing"] = False
    except Exception as e:
        print(f"LLM 처리 중 오류: {e}")
        game["message"] = "LLM 처리 중 오류가 발생했습니다."
        game["phase"] = "completed"
        game["llm_processing"] = False

    # 결과를 바로 반환
    return {"success": True, "message": "예측이 성공적으로 제출되었습니다!", "game": game}

@app.get("/api/game/prediction/{game_id}")
async def get_user_prediction(game_id: str):
    """사용자 예측 조회"""
    return user_predictions.get(game_id, None)

@app.post("/api/game/reset")
async def reset_game():
    """게임 리셋"""
    global current_game_id
    
    current_game_id = str(uuid.uuid4())
    game_states[current_game_id] = create_initial_game_state(current_game_id)
    
    return {"success": True, "message": "새로운 게임을 시작할 준비가 되었습니다."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)