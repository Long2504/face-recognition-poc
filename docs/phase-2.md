# Phase 2 – Face Detection

## Implemented

- Ultra-Light RFB-320 ONNX (~1.27 MB), chạy bằng ONNX Runtime Web WASM.
- Preprocessing RGB `320 × 240`, confidence threshold `0.7`.
- Hard NMS với IoU threshold `0.3`.
- Bounding box và confidence overlay trên video đã mirror.
- Debug metrics: model state, detected face count, inference ms và detection FPS.
- Tất cả cấu hình model/threshold nằm tại `web/src/config/face.config.ts`.

## How to run

```powershell
cd D:\Family_Hospital\face-recognition\face-recognition-poc
npm run dev
```

Mở `http://localhost:5174`.

## How to test

1. Bấm **Start camera** và nhìn thẳng vào webcam.
2. Chờ model chuyển từ `LOADING` sang `READY`.
3. Xác nhận có box xanh bao quanh mặt và label `FACE xx.x%`.
4. Quay mặt đi hoặc ra khỏi frame; box phải biến mất.
5. Đưa thêm một người vào frame; kiểm tra nhiều box nếu hai mặt đủ rõ/lớn.
6. Kiểm tra `Inference`, `Detected faces` và `Detection FPS` liên tục cập nhật.
7. Mở Network panel: không có frame/video request gửi đến API; chỉ model ONNX được tải về browser.

## Expected result

- Một mặt rõ, kích thước vừa: detector trả một box với confidence từ 70%.
- Không có mặt: `Detected faces` trở về 0.
- Detection chạy có chủ đích khoảng 3–10 FPS, không khóa UI.

## Known limitations

- Model 320×240 ưu tiên tốc độ; khuôn mặt rất nhỏ, bị che hoặc góc nghiêng mạnh có thể không được phát hiện.
- Threshold chưa chỉnh trên UI; giá trị hiện nằm trong config tập trung.
- Chưa có landmarks/alignment.
- Chưa có quality gate, blur check hoặc embedding (Phase 3–4).
- WASM dùng một thread để tránh yêu cầu cross-origin isolation trong PoC local.

## Troubleshooting

Nếu thấy `expected magic word 00 61 73 6d, found 3c 21 64 6f`, browser đã nhận
HTML (`<!do`) thay cho file WASM. Project đã cố định runtime tại
`/ort-wasm-simd-threaded.wasm`; hãy restart dev server và hard-refresh trang.
