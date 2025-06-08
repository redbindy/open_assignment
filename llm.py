from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError

class LLM:
    def __init__(self, model_dir="./HyperCLOVAX-SEED-Text-Instruct-1.5B"):
        self.model_dir = model_dir
        self.torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_dir,
            torch_dtype=self.torch_dtype,
            device_map="auto",
            low_cpu_mem_usage=True,
        )
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_dir)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        self.model.eval()
        self.system_prompt_a = (
            "당신은 빠르고 직관적인 숫자 비교 게임의 전문가입니다.\n\n"
            "성격: 급하고 즉석에서 판단하는 스타일. 빠르게 답하는 것을 좋아함.\n\n"
            "규칙: 두 숫자 문자열의 각 자리를 비교하여 다른 위치의 인덱스(0부터 시작)를 찾으세요.\n\n"
            "예시:\nQ: 12345 54321\nA: [0, 1, 3, 4]\n\nQ: 111 222\nA: [0, 1, 2]\n\nQ: 123 123\nA: []\n\n"
            "반드시 [숫자, 숫자, ...] 형태의 배열로만 출력하세요. 빠르게!"
        )
        self.system_prompt_b = (
            "당신은 신중하고 분석적인 숫자 비교 게임의 전문가입니다.\n\n"
            "성격: 차근차근 분석하고 정확성을 중시하는 스타일. 실수를 싫어함.\n\n"
            "규칙: 두 숫자 문자열의 각 자리를 비교하여 다른 위치의 인덱스(0부터 시작)를 찾으세요.\n\n"
            "예시:\nQ: 12345 54321\nA: [0, 1, 3, 4]\n\nQ: 111 222\nA: [0, 1, 2]\n\nQ: 123 123\nA: []\n\n"
            "Q: 1234 5678\nA: [0, 1, 2, 3]\n\n"
            "반드시 [숫자, 숫자, ...] 형태의 배열로 정확하게 출력하세요. 신중하게 검토해서."
        )
        self.generation_config_a = {
            "max_new_tokens": 40,
            "do_sample": True,
            "top_p": 0.8,
            "top_k": 40,
            "temperature": 0.6,
            "repetition_penalty": 1.1,
            "pad_token_id": self.tokenizer.eos_token_id,
            "eos_token_id": self.tokenizer.eos_token_id,
            "early_stopping": True,
        }
        self.generation_config_b = {
            "max_new_tokens": 60,
            "do_sample": True,
            "top_p": 0.9,
            "top_k": 50,
            "temperature": 0.3,
            "repetition_penalty": 1.2,
            "pad_token_id": self.tokenizer.eos_token_id,
            "eos_token_id": self.tokenizer.eos_token_id,
            "early_stopping": True,
        }

    def get_answer(self, user_input, timeout):
        with ThreadPoolExecutor(max_workers=1) as executor:
            future_a = executor.submit(
                self.call_llm, self.system_prompt_a, self.generation_config_a, user_input
            )
            try:
                answer_a = future_a.result(timeout=timeout)
            except TimeoutError:
                answer_a = f"⏰ 시간 초과! ({timeout}초)"
            except Exception as e:
                answer_a = f"❌ 생성 오류: {str(e)}"

        with ThreadPoolExecutor(max_workers=1) as executor:
            future_b = executor.submit(
                self.call_llm, self.system_prompt_b, self.generation_config_b, user_input
            )
            try:
                answer_b = future_b.result(timeout=timeout)
            except TimeoutError:
                answer_b = f"⏰ 시간 초과! ({timeout}초)"
            except Exception as e:
                answer_b = f"❌ 생성 오류: {str(e)}"

        return answer_a, answer_b

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
        config = gen_config.copy()
        config.update({
            "max_new_tokens": min(30, gen_config.get("max_new_tokens", 50)),
            "do_sample": False,
            "num_beams": 1,
        })
        with torch.no_grad():
            output_ids = self.model.generate(**inputs, **config)
        new_tokens = output_ids[0][len(inputs["input_ids"][0]):]
        response = self.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        return response if response else "응답을 생성할 수 없습니다."
