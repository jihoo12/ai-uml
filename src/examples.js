export const EXAMPLES = {
  flowchart: {
    type: "flowchart",
    title: "AI 주문 처리 자동화",
    direction: "LR",
    nodes: [
      { id: "request", label: "주문 접수", shape: "round" },
      { id: "validate", label: "입력 검증", shape: "rectangle" },
      { id: "stock", label: "재고 있음?", shape: "diamond" },
      { id: "payment", label: "결제 처리", shape: "rectangle" },
      { id: "database", label: "주문 저장", shape: "database" },
      { id: "notify", label: "고객에게 알림", shape: "round" },
      { id: "reject", label: "재고 부족 안내", shape: "rectangle" },
    ],
    edges: [
      { from: "request", to: "validate" },
      { from: "validate", to: "stock" },
      { from: "stock", to: "payment", label: "예" },
      { from: "stock", to: "reject", label: "아니요" },
      { from: "payment", to: "database" },
      { from: "database", to: "notify" },
    ],
  },
  class: {
    type: "class",
    title: "쇼핑몰 도메인 모델",
    classes: [
      { id: "User", attributes: ["+id: string", "+email: string"], methods: ["+login(): bool", "+logout(): void"] },
      { id: "Order", attributes: ["+id: string", "+total: number"], methods: ["+pay(): bool", "+cancel(): void"] },
      { id: "OrderItem", attributes: ["+quantity: int", "+price: number"], methods: ["+subtotal(): number"] },
      { id: "Product", attributes: ["+sku: string", "+name: string"], methods: ["+reserve(): bool"] },
    ],
    relations: [
      { from: "User", to: "Order", type: "association", label: "places" },
      { from: "Order", to: "OrderItem", type: "composition", label: "contains" },
      { from: "OrderItem", to: "Product", type: "association", label: "references" },
    ],
  },
  sequence: {
    type: "sequence",
    title: "로그인 API 시퀀스",
    participants: [
      { id: "browser", label: "브라우저" },
      { id: "server", label: "API 서버" },
      { id: "db", label: "데이터베이스" },
    ],
    messages: [
      { from: "browser", to: "server", text: "POST /login", type: "sync" },
      { from: "server", to: "db", text: "사용자 정보 조회", type: "sync" },
      { from: "db", to: "server", text: "사용자 반환", type: "return" },
      { from: "server", to: "server", text: "비밀번호 검증", type: "sync" },
      { from: "server", to: "browser", text: "JWT 발급", type: "return" },
    ],
  },
};
