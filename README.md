# 규칙

## 코딩

1. 클래스 이름은 파스칼 케이스로 작성한다.

~~~ python
class UserInformation:
    # 구현
~~~

2. 클래스명을 제외한 나머지는 모두 스네이크 케이스로 작성한다.

~~~ python
apple_count = 5

def get_num():
    # 구현
~~~

3. 변수 이름은 가능하면 명사로, 함수 이름은 동사로 시작한다.

~~~ python
user_to_select = User()

def show_image():
    # 구현
~~~

## 깃

1. 브랜치 이름은 소문자로 한다.

~~~ git
git branch llm
~~~

2. 브랜치 이름은 가급적이면 한 단어로 표현하되 필요시 스네이크 케이스로 작성한다.

~~~ git
git branch llm_debug
~~~

3. 커밋 메시지는 변경사항에 대해 요약식으로 작성한다.

~~~ git
git commit -m "get_sum() 함수에 1부터 10까지 더하는 기능 추가"
~~~