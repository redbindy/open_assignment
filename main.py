from llm import LLM
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
import uvicorn
import numpy as np

llm = LLM()
app = FastAPI()

@app.get("/")
def get():
    num1= np.random.randint(10000)
    num2= np.random.randint(10000)

    answer_a, answer_b = llm.get_answer(num1, num2)
    answer_a = answer_a.replace("\n", "<br>")
    answer_b = answer_b.replace("\n", "<br>")

    html = "<html>\n" + answer_a + "<br><br>" + answer_b + "</html>"

    return HTMLResponse(content = html)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)