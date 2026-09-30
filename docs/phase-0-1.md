# Phase 0–1 verification

## Phase 0

1. Sao chép `.env.example` thành `.env`.
2. Chạy `npm install`, sau đó `npm run dev`.
3. Mở `http://localhost:5174`.
4. Xác nhận thẻ API hiển thị `API OK`.

Kết quả mong đợi: frontend và backend cùng chạy; frontend lấy token rồi gọi health API thành công.

Kiểm tra auth bằng curl (hoặc Invoke-RestMethod): gọi `/health` không có Bearer token phải nhận 401; gọi `/auth/token` với `x-api-key` sai phải nhận 401.

## Phase 1

1. Bấm **Start camera** và cho phép trình duyệt truy cập camera.
2. Xác nhận video realtime xuất hiện.
3. Nếu có nhiều camera, chọn thiết bị khác trong danh sách.
4. Xác nhận resolution và FPS được cập nhật.
5. Bấm **Stop camera**; đèn camera phải tắt và preview dừng.

Kết quả mong đợi: camera chỉ chạy khi người dùng chủ động bật; track được giải phóng khi dừng hoặc rời trang.

## Giới hạn đã biết

- Camera cần secure context: `localhost` hoạt động; IP/hostname qua HTTP thường bị browser chặn.
- Nhãn camera có thể chưa hiện trước lần đầu người dùng cấp quyền.
- FPS là số frame video quan sát được bởi browser, không phải FPS inference.
- Chưa có face detection, quality gate, embedding hay recognition.
- API key trong frontend chỉ dùng để demo local, không phải thiết kế production.
