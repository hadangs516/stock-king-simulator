# 주식왕 시뮬레이션

모두에게 같은 시세가 적용되는 가상 투자 게임입니다. 현실 주가나 실제 투자 서비스가 아닙니다.

- [게임 열기](https://hadangs516.github.io/stock-king-simulator/)
- [설치·배포 순서](docs/DEPLOYMENT.md)
- [구현 상태·게임 규칙·검증 기록](docs/IMPLEMENTATION.md)

프런트엔드는 별도 빌드 없이 GitHub Pages의 main 루트에서 실행합니다. Apps Script 서버는 `server/`의 코드를 별도로 설치·배포해야 합니다. 제공된 웹앱 주소에 게임 서버가 설치되어 있다고 가정하지 않습니다.

## 로컬 검증

Node.js 22 이상에서 의존성 설치 없이 실행합니다.

```powershell
node tools/check.cjs
node --test --test-isolation=none tests/*.test.cjs
node tools/dev-server.cjs
```

마지막 명령은 `http://127.0.0.1:4173`에 테스트 서버를 엽니다. 계정과 거래는 메모리에만 보관하며 종료하면 사라집니다. 실제 Apps Script 서버와 분리되어 있습니다.

계정 PIN과 관리자 강화 암호는 GitHub에 올리지 않습니다. 운영 시트는 비공개로 유지합니다. 외부 웹 푸시와 실제 Google 서버 통합 검증은 아직 완료되지 않았습니다.
