from llm import LLM

def main():
    llm = LLM()
    timeout = 10  # 각 답변에 허용할 최대 시간(초)
    print("LLM 숫자 비교 게임 (종료하려면 exit/quit 입력)")
    while True:
        user_input = input("문제 입력: ").strip()
        if user_input.lower() in ("exit", "quit"):
            print("프로그램을 종료합니다.")
            break
        answer_a, answer_b = llm.get_answer(user_input, timeout)
        print(f"A: {answer_a}")
        print(f"B: {answer_b}")

if __name__ == "__main__":
    main()
