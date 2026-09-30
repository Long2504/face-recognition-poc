# Phase 3 – Face Quality

## Implemented

`FaceQualityService` đánh giá từng face theo thứ tự ưu tiên:

1. `LOW_CONFIDENCE`: confidence dưới `0.7`.
2. `TOO_SMALL`: cạnh ngắn của face dưới `96 px`.
3. `TOO_CLOSE_TO_EDGE`: box cách mép frame dưới `3%`.
4. `BLUR`: variance of Laplacian dưới `80`.
5. `GOOD`: vượt qua toàn bộ quality gates.

Blur được tính trên grayscale face crop, thu nhỏ tối đa còn 160 px để chi phí ổn định. Đây là heuristic phục vụ PoC và cần hiệu chỉnh bằng score thực tế trước production.

Toàn bộ threshold nằm trong `web/src/config/face.config.ts`.

## How to run

```powershell
cd D:\Family_Hospital\face-recognition\face-recognition-poc
npm run dev
```

Mở `http://localhost:5174`.

## How to test

1. Nhìn thẳng vào camera, đủ sáng và đứng gần: kỳ vọng `GOOD`.
2. Đi xa camera: kỳ vọng `TOO_SMALL`.
3. Di chuyển mặt sát cạnh frame: kỳ vọng `TOO_CLOSE_TO_EDGE`.
4. Di chuyển nhanh hoặc cố tình làm camera mất nét: kỳ vọng `BLUR` và blur score giảm.
5. Quay nghiêng/che mặt để detector kém chắc chắn: có thể thấy `LOW_CONFIDENCE`.
6. Theo dõi label trên box và các dòng `Quality`, `Face size`, `Blur score`.

## Expected result

- Box xanh: `GOOD`.
- Box vàng: `BLUR`.
- Box đỏ: các trạng thái không đạt khác.
- Không có face: UI hiển thị `NO_FACE`.

## Known limitations

- Blur score phụ thuộc camera, ánh sáng và độ phân giải; threshold `80` chỉ là giá trị PoC ban đầu.
- Chưa kiểm tra pose/landmarks, occlusion hoặc illumination.
- Với nhiều face, debug panel hiển thị face lớn nhất; mỗi box vẫn có quality riêng.
- Chưa tạo embedding và chưa quyết định danh tính.
