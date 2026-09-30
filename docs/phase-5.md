# Phase 5 – Local Enrollment

## Implemented

- Form `person_id` và `name`.
- Capture đúng 5 embedding samples; mỗi capture yêu cầu quality `GOOD`.
- Lưu local trong IndexedDB database `face-recognition-poc`, object store `persons`.
- Không lưu face image hoặc video frame.
- Hỗ trợ đăng ký nhiều người với `person_id` duy nhất.
- Dropdown hiển thị số người và số samples đã lưu.

## Representative embedding

Mỗi sample đã được L2-normalize từ Phase 4. Representative được tạo bằng:

1. Tính mean theo từng chiều của 5 vectors.
2. L2-normalize vector mean lần nữa.

Cách này tạo một vector 512D đại diện, giảm ảnh hưởng nhiễu riêng của từng lần capture và giữ cosine similarity hợp lệ.

## How to run

```powershell
cd D:\Family_Hospital\face-recognition\face-recognition-poc
npm run dev
```

Mở `http://localhost:5174`.

## How to test

1. Nhập `Person ID` và `Name`.
2. Start camera, đưa một face vào giữa và chờ quality `GOOD`.
3. Capture đủ 5 mẫu; thay đổi nhẹ biểu cảm/góc mặt giữa các mẫu.
4. Xác nhận `Representative: READY · 512D`.
5. Bấm `Save person locally`.
6. Xác nhận thông báo lưu thành công và `Registered people` tăng lên.
7. Refresh trang; người vừa đăng ký vẫn xuất hiện trong dropdown.
8. Đăng ký người thứ hai với ID khác.
9. Thử ID trùng; UI phải báo lỗi và không ghi đè người cũ.

## Expected result

- Tiến độ chuyển từ 0/5 đến 5/5.
- Person được lưu với 5 samples và một representative embedding 512D.
- Dữ liệu tồn tại sau refresh trong cùng browser/profile.

## Known limitations

- IndexedDB gắn với origin/browser profile và có thể bị xóa khi người dùng xóa site data.
- Chưa có edit/delete person trong UI.
- Chưa đồng bộ backend.
- Chưa search/recognition; đó là Phase 6.
