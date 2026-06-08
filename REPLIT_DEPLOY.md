# Replit 배포 가이드

## 배포 방식

이 프로젝트는 Replit에서 Node.js Web Service로 배포합니다.

- Build command: `npm run build`
- Run command: `PORT=3002 npm start`
- App port: `3002`
- Frontend: `npm run build` 후 Express가 `dist/`를 정적 서빙

`.replit` 파일에 위 설정을 반영해 두었습니다.

## GitHub에서 가져오기

1. Replit에서 `Create Repl` 또는 `Import from GitHub`를 선택합니다.
2. 저장소 `yang-yun-seok/Portfolio-Coach`를 연결합니다.
3. Shell에서 의존성을 설치합니다.

```bash
npm install
```

4. Run 버튼으로 실행을 확인합니다.

```bash
npm run build && PORT=3002 npm start
```

## Deployments 설정

Deploy 또는 Publish 화면에서 다음 설정을 사용합니다.

```bash
npm run build
PORT=3002 npm start
```

Replit은 배포 시작 시 `.replit`의 `[deployment]` 설정도 읽습니다.

## 환경변수

학생 개인 API 키 방식으로 바뀌었기 때문에 서버에는 Gemini/OpenAI 키가 필요 없습니다.

Firebase 로그인이 필요 없으면 다음처럼 둡니다.

```env
FIREBASE_AUTH_REQUIRED=false
```

Firebase 로그인을 유지하려면 Replit Secrets에 아래 값을 넣습니다.

```env
FIREBASE_AUTH_REQUIRED=true
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

또는 서비스 계정 JSON 전체를 한 줄로 넣어도 됩니다.

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

## 확인

배포 후 브라우저에서 다음을 확인합니다.

- 첫 화면이 열리는지
- `AI 모델` 설정에서 Gemini 또는 GPT API 키를 입력할 수 있는지
- 공고 데이터가 로드되는지
- Firebase 로그인을 켠 경우 로그인 화면이 정상 동작하는지
