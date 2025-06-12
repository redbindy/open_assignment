from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import time
import threading

class LLM:
    def __init__(self, model_dir="./HyperCLOVAX-SEED-Text-Instruct-1.5B"):
        self.torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        self.model = AutoModelForCausalLM.from_pretrained(
            model_dir,
            torch_dtype=self.torch_dtype,
            device_map="auto",
            low_cpu_mem_usage=True,
        )

        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)

        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        self.model.eval()

        prompt_template = ("당신은 숫자 비교 게임의 전문가입니다.\n\n"
            "성격: {}\n\n"
            "규칙: 두 숫자 문자열의 각 자리를 비교하여 다른 위치의 인덱스(0부터 시작)를 찾으세요.\n\n"
            "답변 규칙: 정답은 반드시 * ... *로 감싸세요.\n\n"
            "답변 형식:\n"
            "1. 0 != 1(다름)\n"
            "2. 2 == 2(일치)\n"
            "3. 3 != 0(다름)\n\n"
            "*0, 2*\n\n"
            "예시:\n"
            "Q: 12345 54321\n"
            "1. 1 != 5(다름)\n"
            "2. 2 != 4(다름)\n"
            "3. 3 == 3(일치)\n"
            "4. 4 != 2(다름)\n"
            "5. 5 != 1(다름)\n\n"
            "*0, 1, 3, 4*\n\n"
            "{}")

        # 급한
        personality_fast = "급하고 즉석에서 판단하는 스타일. 빠르게 답하는 것을 좋아함."
        end_of_prompt_fast = "빠르게 답하세요!"
        self.system_prompt_fast = prompt_template.format(personality_fast, end_of_prompt_fast)

        self.generation_config_fast = {
            "max_new_tokens": 80,
            "do_sample": True,
            "top_p": 0.8,
            "temperature": 0.6,
            "pad_token_id": self.tokenizer.eos_token_id,
            "eos_token_id": self.tokenizer.eos_token_id,
        }

        # 신중
        personality_careful = "차근차근 분석하고 정확성을 중시하는 스타일. 실수를 싫어함."
        end_of_prompt_careful = "신중하게 검토해서 정확히 답하세요."
        self.system_prompt_careful = prompt_template.format(personality_careful, end_of_prompt_careful)

        self.generation_config_careful = {
            "max_new_tokens": 80,
            "do_sample": True,
            "top_p": 0.9,
            "temperature": 0.3,
            "repetition_penalty": 1.2,
            "pad_token_id": self.tokenizer.eos_token_id,
            "eos_token_id": self.tokenizer.eos_token_id,
        }

    def get_answer(self, num1: int, num2: int, timeout_sec: int = 5):
        user_input = f"{num1} {num2}"
        results = {"fast": None, "careful": None}
        
        fast_thread = threading.Thread(target=self._run_fast, args=(user_input, results))
        careful_thread = threading.Thread(target=self._run_careful, args=(user_input, results))

        fast_thread.start()
        careful_thread.start()

        fast_thread.join(timeout=timeout_sec)
        careful_thread.join(timeout=timeout_sec)

        if fast_thread.is_alive():
            results["fast"] = f"⏰시간 초과!"

        if careful_thread.is_alive():
            results["careful"] = f"⏰시간 초과!"

        return results["fast"], results["careful"]

    def _run_fast(self, user_input, results):
        try:
            results["fast"] = self.call_llm(self.system_prompt_fast, self.generation_config_fast, user_input)
        except Exception as e:
            results["fast"] = f"❌ 급한 답변자 오류: {str(e)}"

    def _run_careful(self, user_input, results):
        try:
            results["careful"] = self.call_llm(self.system_prompt_careful, self.generation_config_careful, user_input)
        except Exception as e:
            results["careful"] = f"❌ 신중한 답변자 오류: {str(e)}"

    def call_llm(self, system_prompt, gen_config, user_input):
        current_chat = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ]

        inputs = self.tokenizer.apply_chat_template(
            current_chat,
            add_generation_prompt=True,
            return_dict=True,
            return_tensors="pt",
            truncation=True,
            max_length=256
        )

        if torch.cuda.is_available():
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            output_ids = self.model.generate(**inputs, **gen_config)

        new_tokens = output_ids[0][len(inputs["input_ids"][0]):]
        response = self.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        return response if response else "응답을 생성할 수 없습니다."