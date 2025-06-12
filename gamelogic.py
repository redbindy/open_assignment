from random import randint

def board_size():
    level = randint(0, 2)
    if level == 0:
        board_size = 4
    elif level == 1:
        board_size = 6
    elif level == 2:
        board_size = 9
    return board_size

def create_board(board_size):
    correct_number_board = ''
    wrong_number_board = ''

    for i in range(board_size):
        correct_number_board += str(randint(0, 9))
        wrong_number_board += str(randint(0, 9))

    if correct_number_board == wrong_number_board:
        create_board(board_size)
    
    return correct_number_board, wrong_number_board

def score(answer, correct_number_board, wrong_number_board):
    correct = 0
    for i in answer:
        if correct_number_board[i] != wrong_number_board[i]:
            correct += 1
    return correct
