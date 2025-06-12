# gamelogic.py
from random import randint

def board_size():
    """랜덤 보드 크기 결정 (더 이상 사용하지 않음 - 난이도별로 고정)"""
    level = randint(0, 2)
    if level == 0:
        board_size = 4
    elif level == 1:
        board_size = 6
    elif level == 2:
        board_size = 9
    return board_size

def create_board(board_size):
    """지정된 크기의 두 개의 서로 다른 숫자 보드 생성"""
    max_attempts = 100  # 무한 루프 방지
    attempts = 0
    
    while attempts < max_attempts:
        correct_number_board = ''
        wrong_number_board = ''

        for i in range(board_size):
            correct_number_board += str(randint(0, 9))
            wrong_number_board += str(randint(0, 9))

        # 두 보드가 다른지 확인
        if correct_number_board != wrong_number_board:
            return correct_number_board, wrong_number_board
        
        attempts += 1
    
    # 최대 시도 횟수 초과 시 강제로 다르게 만들기
    correct_number_board = ''.join([str(randint(0, 9)) for _ in range(board_size)])
    wrong_number_board = correct_number_board[:-1] + str((int(correct_number_board[-1]) + 1) % 10)
    
    return correct_number_board, wrong_number_board

def score(answer_indices, correct_number_board, wrong_number_board):
    """
    답변 인덱스를 받아서 점수 계산
    answer_indices: 다른 위치라고 예측한 인덱스들의 리스트
    correct_number_board: 정답 보드 (문자열)
    wrong_number_board: 비교 보드 (문자열)
    """
    if not answer_indices:
        return 0
    
    correct = 0
    board_length = len(correct_number_board)
    
    for i in answer_indices:
        # 인덱스가 유효한 범위인지 확인
        if 0 <= i < board_length:
            # 해당 위치의 숫자가 실제로 다른지 확인
            if correct_number_board[i] != wrong_number_board[i]:
                correct += 1
    
    return correct

def get_correct_answer(correct_number_board, wrong_number_board):
    """정답 인덱스들을 반환 (테스트용)"""
    correct_indices = []
    for i in range(len(correct_number_board)):
        if correct_number_board[i] != wrong_number_board[i]:
            correct_indices.append(i)
    return correct_indices

def calculate_accuracy(predicted_indices, correct_number_board, wrong_number_board):
    """정확도 계산 (선택사항)"""
    correct_indices = set(get_correct_answer(correct_number_board, wrong_number_board))
    predicted_indices = set(predicted_indices)
    
    if not correct_indices:
        return 1.0 if not predicted_indices else 0.0
    
    intersection = correct_indices.intersection(predicted_indices)
    union = correct_indices.union(predicted_indices)
    
    return len(intersection) / len(union) if union else 0.0