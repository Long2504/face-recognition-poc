# Phase 4 – Face Embedding

## Implemented

- InsightFace `w600k_mbf.onnx` (MobileFaceNet@WebFace600K), input RGB `112 × 112`.
- Centered square crop với margin 22%; chưa có landmark alignment.
- Output 512 chiều và L2 normalization.
- Capture A1, A2 cho cùng người và B1 cho người thứ hai.
- Cosine similarity `A1 ↔ A2` và `A1 ↔ B1`.
- Không hard-code quyết định danh tính hoặc MATCH/UNKNOWN ở phase này.
- Capture chỉ bật khi quality state là `GOOD`.

## How to run

```powershell
cd D:\Family_Hospital\face-recognition\face-recognition-poc
npm run dev
```

Mở `http://localhost:5174`.

## How to test

1. Start camera và chờ cả detection lẫn embedding model ở trạng thái `READY`.
2. Người A nhìn thẳng, đợi quality `GOOD`, bấm `Capture A1`.
3. Người A thay đổi nhẹ biểu cảm/góc mặt rồi bấm `Capture A2`.
4. Cho người B vào đúng vị trí, chờ `GOOD`, bấm `Capture B1`.
5. Ghi lại `similarity(A1, A2)` và `similarity(A1, B1)`.
6. Kỳ vọng score cùng người cao hơn score khác người; không dùng một threshold tùy ý để kết luận danh tính.

## Expected result

- Mỗi capture hiển thị `512 dimensions`.
- Embedding inference time được hiển thị.
- Hai cosine scores nằm trong `[-1, 1]`.
- `similarity(A1, A2) > similarity(A1, B1)` trong điều kiện capture hợp lý.

## Known limitations

- Detector hiện không trả 5 landmarks nên crop chỉ được center/expand, chưa affine-align theo mắt/mũi. Điều này có thể làm giảm similarity khi pose thay đổi.
- Model pretrained của InsightFace chỉ dành cho nghiên cứu phi thương mại.
- Capture chỉ nằm trong React memory và mất khi refresh.
- Chưa có threshold quyết định danh tính, enrollment hoặc persistence.
