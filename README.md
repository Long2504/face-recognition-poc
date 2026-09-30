# Face Recognition PoC

PoC độc lập để kiểm chứng face recognition theo từng phase. Hiện tại project đã triển khai từ **Phase 0** đến **Phase 7 (NestJS recognition API)** và không lưu ảnh.

## Kiến trúc hiện tại

```text
Browser (React/Vite)
  ├─ getUserMedia() -> video chỉ tồn tại trong browser
  ├─ ONNX Runtime Web + Ultra-Light RFB-320 -> face boxes local
  ├─ FaceQualityService -> size/confidence/edge/blur gate
  ├─ MobileFaceNet/ArcFace -> normalized 512D embedding
  ├─ NestJS API -> Person + 5 embeddings + representative embedding trong memory
  ├─ POST /recognition/search -> Top K + sample rerank -> MATCH / UNKNOWN
  ├─ POST /auth/token + x-api-key -> nhận JWT ngắn hạn
  └─ GET /health + Bearer JWT -> NestJS API
```

Video webcam không được gửi lên backend. Với PoC local, Vite nhúng `API_KEY` vào browser khi khởi động để gọi API cấp token. Giá trị này có thể bị đọc từ frontend; khi triển khai thật, việc cấp token phải do một trusted server thực hiện.

## Cấu trúc

```text
face-recognition-poc/
  web/       React + TypeScript + Vite
  api/       NestJS + TypeScript
  models/    model files ở các phase sau
  docker/    Qdrant/Redis ở các phase sau
  docs/      tài liệu phase và test
```

## Cài đặt và chạy

Yêu cầu Node.js 20 trở lên.

```bash
cp .env.example .env
npm install
npm run dev
```

PowerShell:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Mở `http://localhost:5174`. API chạy ở `http://localhost:3000`.

Để chạy riêng từng app:

```bash
npm run start:dev -w api
npm run dev -w web
```

## Kiểm tra

```bash
npm run build
npm test
```

Test camera thủ công: mở web, chờ API báo `OK`, bấm **Start camera**, cấp quyền, nhìn vào camera và kiểm tra bounding box/confidence cùng các chỉ số inference/detection FPS, rồi bấm **Stop camera**.

## Auth API

`POST /auth/token` là endpoint public duy nhất và yêu cầu header `x-api-key` khớp `API_KEY` trong `.env`.

```json
{
  "keyServer": "local-web",
  "bucket": "face-recognition-poc",
  "expiresIn": "1h",
  "serverIp": "127.0.0.1"
}
```

Các endpoint khác yêu cầu `Authorization: Bearer <token>`; thiếu/sai/hết hạn token trả về HTTP 401.

## Roadmap

- [x] Phase 0: bootstrap, health check
- [x] Phase 1: webcam lifecycle, camera selector, resolution/FPS
- [x] Phase 2: browser face detection
- [x] Phase 3: face quality gate
- [x] Phase 4: face embedding
- [x] Phase 5: local enrollment
- [x] Phase 6: local recognition
- [x] Phase 7: NestJS recognition API
- [ ] Phase 8: room-first candidate search
- [ ] Phase 9: Qdrant
- [ ] Phase 10: Redis cache
- [ ] Phase 11: end-to-end demo

Chi tiết kiểm thử nằm trong thư mục [`docs/`](docs/), bao gồm [`docs/phase-7.md`](docs/phase-7.md).

> `w600k_mbf.onnx` là pretrained model của InsightFace và chỉ dành cho nghiên cứu phi thương mại. Phải thay model hoặc có license phù hợp trước khi triển khai thương mại.
