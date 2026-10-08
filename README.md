# AI UML Studio

**AI가 다이어그램을 설계하고, 이 도구가 그립니다.**

AI가 출력한 **JSON 또는 XML**을 넣으면 구조를 검증한 뒤 [Mermaid](https://mermaid.js.org/)로 변환해 브라우저에서 시각화하는 정적 웹 앱입니다. API 키, 서버, 빌드 과정이 필요하지 않습니다.

## 빠른 시작

Node.js 20 이상을 설치하고 저장소를 내려받습니다.

```bash
git clone https://github.com/jihoo12/ai-uml.git
cd ai-uml
npm run dev
```

브라우저에서 `http://localhost:4173`을 엽니다. 또는 정적 웹 서버로 `index.html`을 제공하면 됩니다. 다이어그램 라이브러리는 jsDelivr CDN을 사용하므로 **최초 렌더링 시 인터넷 연결이 필요**합니다. 소스 데이터는 브라우저에서 처리하며 이 앱의 서버로 업로드되지 않습니다. CDN에서 라이브러리 자원을 다운로드합니다.

## 사용법

1. 클래스 / 시퀀스 / 플로우차트 예제를 선택하거나 AI에게 아래 스키마로 JSON/XML을 생성해 달라고 요청합니다.
2. 왼쪽 편집기에 붙여넣거나 `.json`/`.xml` 파일을 드롭합니다.
3. 오른쪽에서 즉시 생성된 다이어그램을 확인합니다.
4. **SVG 저장**, **Mermaid 복사**, **소스 저장**을 사용할 수 있습니다.
5. JSON/XML 탭을 누르면 마지막으로 **정상 검증된 구조**를 기준으로 다른 형식으로 변환됩니다. 현재 입력이 잘못된 경우 탭을 변경하면 마지막 정상 구조를 사용하니 수정본이 유실되지 않도록 주의해 주세요.

### JSON: Flowchart

```json
{
  "type": "flowchart",
  "title": "결제 흐름",
  "direction": "LR",
  "nodes": [
    {"id": "request", "label": "결제 요청", "shape": "round"},
    {"id": "check", "label": "카드 승인?", "shape": "diamond"},
    {"id": "done", "label": "완료", "shape": "rectangle"}
  ],
  "edges": [
    {"from": "request", "to": "check"},
    {"from": "check", "to": "done", "label": "성공"}
  ]
}
```

- `type`: `flowchart`, `class`, `sequence` 중 하나(필수)
- `title`: 화면에 표시하는 선택적 제목
- `direction`: `LR`(기본), `RL`, `TB`, `BT`
- `shape`: `rectangle`(기본), `round`, `diamond`, `circle`, `database`
- `nodes[].id`: 영문으로 시작하는 영문·숫자·밑줄 조합, 중복 불가
- `edges[].from`과 `edges[].to`: 존재하는 노드 ID여야 함
- `edges[].label`: 선택적 연결 설명

### JSON: Class diagram

```json
{
  "type": "class",
  "title": "사용자 모델",
  "classes": [
    {"id": "User", "attributes": ["+id: string", "+email: string"], "methods": ["+login(): bool"]},
    {"id": "Admin", "attributes": ["+role: string"], "methods": ["+banUser(): void"]}
  ],
  "relations": [
    {"from": "Admin", "to": "User", "type": "inheritance", "label": "extends"}
  ]
}
```

- 관계 `type`: `association`(기본), `inheritance`, `composition`, `aggregation`, `dependency`
- `attributes`, `methods`, `relations`은 생략 가능

### JSON: Sequence diagram

```json
{
  "type": "sequence",
  "title": "로그인",
  "participants": [
    {"id": "client", "label": "클라이언트"},
    {"id": "server", "label": "API 서버"}
  ],
  "messages": [
    {"from": "client", "to": "server", "text": "POST /login", "type": "sync"},
    {"from": "server", "to": "client", "text": "200 OK", "type": "return"}
  ]
}
```

- 메시지 `type`: `sync`(기본), `async`, `return`, `dashed`
- 시퀀스 순서는 `messages` 배열 순서와 동일

### XML 예제

```xml
<?xml version="1.0" encoding="UTF-8"?>
<diagram type="flowchart" title="결제 흐름" direction="LR">
  <nodes>
    <node id="request" label="결제 요청" shape="round" />
    <node id="check" label="카드 승인?" shape="diamond" />
    <node id="done" label="완료" />
  </nodes>
  <edges>
    <edge from="request" to="check" />
    <edge from="check" to="done" label="성공" />
  </edges>
</diagram>
```

클래스 다이어그램은 `<classes><class id="User"><attribute>+id: string</attribute><method>+login(): bool</method></class></classes>` 및 `<relations><relation from="Admin" to="User" type="inheritance" /></relations>` 구조를 사용합니다.

시퀀스 다이어그램은 `<participants><participant id="client" label="클라이언트" /></participants>` 및 `<messages><message from="client" to="server" text="요청" type="sync" /></messages>` 구조를 사용합니다.

## AI 프롬프트

웹사이트 하단 **AI용 프롬프트 복사**를 선택하면 스키마 제약이 포함된 요청을 복사할 수 있습니다.

> 아래 시스템을 UML 다이어그램 JSON으로 작성해 줘. 마크다운 없이 JSON만 반환해. `type`은 flowchart/class/sequence 중 하나를 선택해. ID는 영문자로 시작하고 영문/숫자/밑줄만 사용해. 모든 from/to는 존재하는 ID를 참조해야 해. 시스템 설명: [여기에 붙여넣기]

## 개발 구조

```text
index.html             웹 인터페이스
styles.css             반응형 스타일
assets/logo.svg        로고
src/app.js             편집기 · 입력 · 미리보기 · 내보내기
src/diagram.js         스키마 검증 및 Mermaid 생성
src/xml.js             XML 읽기/쓰기
src/examples.js        다이어그램 샘플
tests/diagram.test.js  변환 및 검증 테스트
```

```bash
npm test        # Node 기본 테스트 러너
npm run dev     # localhost:4173 개발 서버
```

브라우저 환경의 `DOMParser`가 XML 처리에 필요합니다. `npm test`는 JSON과 Mermaid 변환 테스트를 확인하며 XML의 브라우저 동작은 별도 수동 점검이 필요합니다.

## 제한 및 보안

- 한 입력의 최대 길이는 150,000자이며, 유형별 요소 수 제한이 있습니다.
- 실행 가능한 Mermaid 코드를 직접 입력받지 않고 허용된 JSON/XML 요소로만 코드를 생성합니다.
- XML DTD/ENTITY를 거부합니다. XML 파서는 브라우저 기본 `DOMParser`를 사용합니다.
- Mermaid `securityLevel: "strict"`를 설정합니다.
- 현재는 Class / Sequence / Flowchart만 지원하며, PlantUML 전체 문법은 지원하지 않습니다.
- **실시간 렌더러**는 jsDelivr에서 고정 버전 Mermaid를 불러옵니다. 완전 오프라인 사용에는 로컬 배포가 필요합니다.

## 배포

정적 사이트라 GitHub Pages, Netlify, Cloudflare Pages 등에서 별도 빌드 명령 없이 저장소 루트를 배포할 수 있습니다. GitHub Pages를 사용하려면 Repository → Settings → Pages에서 `Deploy from a branch`, `main`, `/ (root)`를 선택하세요.

## 라이선스

기존 저장소의 LICENSE를 따릅니다.
