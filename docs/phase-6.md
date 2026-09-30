# Phase 6 – Local Recognition

## Implemented

- Hai tab `Recognize` và `Enroll` trong cùng dashboard, không cần scroll.
- Tạo query embedding từ một face có quality `GOOD`.
- Exact cosine comparison với representative embedding của toàn bộ persons.
- Lấy shortlist Top K (`5` mặc định).
- Rerank shortlist bằng sample score cao nhất của mỗi person.
- Hiển thị best candidate, Top 1, Top 2, score difference và thời gian.
- Trả `MATCH` hoặc `UNKNOWN`.
- Match threshold và minimum difference nằm trong config và chỉnh được trên UI debug.

## Decision logic

```text
representative comparison
→ Top K shortlist
→ max sample similarity per candidate
→ rerank
→ Top1 >= match threshold
  AND (không có Top2 OR Top1 - Top2 >= minimum difference)
→ MATCH, ngược lại UNKNOWN
```

Default PoC config:

- `topK = 5`
- `minimumSimilarity = 0.45`
- `minimumMargin = 0.08`

Đây là giá trị khởi đầu để test, không phải threshold production. Cần thu score thực tế của nhiều người trước khi hiệu chỉnh.

## How to run

```powershell
cd D:\Family_Hospital\face-recognition\face-recognition-poc
npm run dev
```

Mở `http://localhost:5174`.

## How to test

1. Đảm bảo đã enroll ít nhất hai người ở tab `Enroll`.
2. Chọn tab `Recognize`, Start camera.
3. Cho một người đã đăng ký nhìn vào camera, đợi quality `GOOD`.
4. Bấm `Recognize current face`.
5. Ghi lại status, best candidate, Top 1, Top 2 và difference.
6. Thử người chưa đăng ký; kỳ vọng `UNKNOWN` với threshold phù hợp.
7. Chỉnh Match threshold/Min difference để quan sát ảnh hưởng nhưng không dùng giá trị tùy ý làm kết luận production.

## Expected result

- Người đã enroll: best candidate đúng và có score separation hợp lý.
- Người chưa enroll hoặc kết quả mơ hồ: `UNKNOWN`.
- Search time nhỏ vì toàn bộ dữ liệu đang local và dataset nhỏ.

## Known limitations

- Exact local search chỉ phù hợp dataset nhỏ.
- Threshold chưa được calibration trên tập dữ liệu đại diện.
- Chưa có room-first search, backend hoặc Qdrant.
- Không có liveness; ảnh/video giả có thể qua detector.
