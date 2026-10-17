var King = typeof King === 'undefined' ? {} : King;
// Short fictional reports. Symbols remain limited to compatible businesses.
King.newsLibrary=[
 {"id":"memory-validation","symbols":["005930","000660"],"category":"기업뉴스","image":"semiconductor","impact":4,"title":"{name}, 새 메모리 시험 공급","body":["{name}가 서버에 쓰는 새 메모리를 고객사에 시험 공급했다.","시험을 통과하면 추가 주문을 협의할 예정이다."]},
 {"id":"equipment-maintenance","symbols":["240810","058470","039030","095340","009150"],"category":"기업뉴스","image":"semiconductor","impact":2,"title":"{name}, 제품 점검 서비스 개선","body":["{name}가 고객사에 납품한 제품의 점검 방식을 바꿨다.","고장 징후를 미리 살피고 필요한 부품을 준비하기로 했다."]},
 {"id":"vehicle-mix","symbols":["005380","000270"],"category":"기업뉴스","image":"automotive","impact":3,"title":"{name}, 인기 차종 생산 확대","body":["{name}가 주문이 많이 들어온 차종을 더 먼저 만들기로 했다.","공장을 새로 짓는 대신 기존 생산 일정을 조정한다."]},
 {"id":"dealer-service","symbols":["067990"],"category":"기업뉴스","image":"automotive","impact":2,"title":"{name}, 자동차 정비 대기 줄인다","body":["{name}가 정비 예약 때 필요한 부품의 재고도 함께 확인한다.","방문 뒤 부품을 기다리는 일을 줄이려는 조치다."]},
 {"id":"materials-procurement","symbols":["051910","247540","086520","005490"],"category":"기업뉴스","image":"energy","impact":-2,"title":"{name}, 원재료 구매 조건 재검토","body":["{name}가 원재료 가격 변화에 맞춰 구매 계약을 다시 검토한다.","재료비가 달라지면 제품을 팔아 남기는 이익에도 영향을 줄 수 있다."]},
 {"id":"battery-inspection","symbols":["006400"],"category":"기업뉴스","image":"energy","impact":-3,"title":"{name}, 배터리 검사 강화","body":["{name}가 배터리를 보내기 전 검사 항목을 늘렸다.","추가 검사에 따라 일부 제품의 출하 일정이 달라질 수 있다."]},
 {"id":"bio-batch","symbols":["207940","068270"],"category":"기업뉴스","image":"biotech","impact":3,"title":"{name}, 의약품 생산 관리 개선","body":["{name}가 원료부터 출하까지 생산 기록을 한 번에 확인하도록 바꿨다.","기록 누락을 줄이고 제품 품질을 관리하기 위한 조치다."]},
 {"id":"medical-training","symbols":["145020","214150","214450"],"category":"이벤트","image":"biotech","impact":1,"title":"{name}, 해외 판매사에 제품 교육","body":["{name}가 해외 판매사를 대상으로 제품 보관과 운송 교육을 진행했다.","교육 내용을 정리한 안내서도 나눠줄 예정이다."]},
 {"id":"research-schedule","symbols":["196170","128940","000100"],"category":"기업뉴스","image":"biotech","impact":-2,"title":"{name}, 연구 검토 일정 조정","body":["{name}가 연구 자료를 확인하는 순서와 일정을 바꿨다.","연구의 최종 결과는 아직 발표하지 않았다."]},
 {"id":"platform-billing","symbols":["035420","035720"],"category":"기업뉴스","image":"digital","impact":2,"title":"{name}, 광고 결제 내역 보기 쉬워진다","body":["{name}가 광고주 화면에서 광고 기간과 결제 내역을 함께 보여준다.","광고 가격을 바꾸는 발표는 포함되지 않았다."]},
 {"id":"game-patch","symbols":["263750","293490","259960","078340"],"category":"기업뉴스","image":"digital","impact":-1,"title":"{name}, 게임 접속 안정화 점검","body":["{name}가 이용자가 몰릴 때 생기는 접속 문제를 점검했다.","수정 후에도 같은 문제가 생기는지 확인할 예정이다."]},
 {"id":"retail-distribution","symbols":["090430","237880","004170"],"category":"기업뉴스","image":"consumer","impact":3,"title":"{name}, 잘 팔리는 매장에 상품 더 보낸다","body":["{name}가 매장별 판매량에 맞춰 상품을 나눠 보내기로 했다.","남는 재고를 줄이고 품절을 막으려는 조치다."]},
 {"id":"food-delivery","symbols":["097950"],"category":"기업뉴스","image":"consumer","impact":-2,"title":"{name}, 냉장 식품 배송 경로 조정","body":["{name}가 냉장 식품의 배송 경로 일부를 바꿨다.","제품을 신선하게 보내면서 운송 과정을 줄일 수 있는지 살펴본다."]},
 {"id":"market-rate","symbols":null,"category":"시장뉴스","image":"economy","impact":0,"title":"기준금리 {rate}%로 결정","body":["게임 속 기준금리가 {beforeRate}%에서 {rate}%로 정해졌다.","금리가 높아지면 빚이 많은 기업의 이자 부담이 커질 수 있다."]},
 {"id":"market-activity","symbols":null,"category":"시장뉴스","image":"economy","impact":0,"title":"경기 지수 {activity}, 시장 분위기는?","body":["게임 속 경기 지수가 {beforeActivity}에서 {activity}로 바뀌었다.","100보다 높으면 경제 활동이 활발하고, 낮으면 주춤한 상태다."]},
 {"id":"ir-materials","symbols":["005930","000660","005380","000270","051910","006400","207940","068270","035420","035720","090430","097950"],"category":"이벤트","image":"economy","impact":0,"title":"{name}, 투자자 질문에 답변","body":["{name}가 사업과 최근 발표에 대한 질문을 모아 답변했다.","이미 공개한 내용을 정리한 자료로, 새로운 계약 발표는 아니다."]}
];
