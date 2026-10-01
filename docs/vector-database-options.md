# Vector database options

Hai phương án đang được cân nhắc cho bước lưu trữ và tìm kiếm embedding. Chưa chốt phương án.

## Option 1: PostgreSQL + pgvector

Lưu dữ liệu người và embedding trong PostgreSQL. Extension `pgvector` thêm kiểu dữ liệu vector, phép đo cosine và index HNSW/IVFFlat.

Ví dụ bảng:

```sql
CREATE TABLE persons (
  id text PRIMARY KEY,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE face_templates (
  id bigserial PRIMARY KEY,
  person_id text NOT NULL REFERENCES persons(id),
  embedding vector(512) NOT NULL,
  template_type text NOT NULL,
  model_version text NOT NULL
);

CREATE INDEX face_templates_embedding_hnsw
ON face_templates USING hnsw (embedding vector_cosine_ops);
```

Tìm ứng viên trong phạm vi đã lọc:

```sql
SELECT person_id, 1 - (embedding <=> $1::vector) AS similarity
FROM face_templates
JOIN persons ON persons.id = face_templates.person_id
WHERE persons.active = true
ORDER BY embedding <=> $1::vector
LIMIT 20;
```

`$1` là query embedding 512 chiều. SQL `WHERE` áp dụng điều kiện nghiệp vụ; phép toán vector xếp hạng các vector còn lại. Với approximate index, cần kiểm tra execution plan và recall khi kết hợp filter.

Ưu điểm: một hệ thống lưu cả dữ liệu quan hệ và vector; transaction, backup, SQL và tooling PostgreSQL quen thuộc. Hợp lý nếu muốn kiến trúc gọn hoặc đã vận hành PostgreSQL.

Trade-off: hiệu năng vector và filtered search cần benchmark theo số lượng vector, độ chọn lọc của filter và tải đồng thời. Có thể cần iterative scans, index metadata, partitioning hoặc tuning riêng.

## Option 2: Database quan hệ + Qdrant

Database quan hệ lưu thông tin chuẩn của người. Qdrant lưu vector và payload dùng cho tìm kiếm.

Ví dụ payload trong Qdrant:

```json
{
  "person_id": "P001",
  "active": true,
  "room_id": "ROOM_01",
  "template_type": "representative",
  "model_version": "w600k_mbf-v1"
}
```

Luồng query:

```text
query embedding 512D + limit 20 + filter (room_id/active)
→ Qdrant ANN search
→ trả person_id và score của ứng viên
→ backend lấy sample embeddings của nhóm nhỏ đó
→ exact cosine rerank
→ quyết định MATCH/UNKNOWN
```

Ưu điểm: vector search là chức năng chuyên biệt; payload filter kết hợp tìm kiếm; có thể scale và vận hành vector store độc lập với database nghiệp vụ.

Trade-off: dữ liệu được chia ở hai hệ thống nên phải đồng bộ person, trạng thái active, room và xóa/cập nhật vector; cần xử lý retry, consistency, backup và giám sát cho cả hai.

## Cách so sánh trước khi chọn

Benchmark cả hai trên cùng tập embedding đại diện và cùng query mẫu. Ghi nhận:

- p50/p95 latency khi có 1,000 / 100,000 / 1,000,000 vectors.
- Recall@20: tỷ lệ ứng viên đúng lọt vào Top 20 so với exact search làm chuẩn.
- Hiệu năng khi lọc theo room/active và khi filter khớp ít hoặc nhiều người.
- RAM/disk, thời gian nạp dữ liệu, cập nhật, xóa, backup và phục hồi.
- Số camera đồng thời và số request tìm kiếm/giây.

Không coi con số 10 triệu là đạt chỉ vì dùng ANN. Cần benchmark theo phần cứng, recall yêu cầu, concurrency, độ chọn lọc filter và cấu hình index thực tế.

## Quy tắc dữ liệu chung

- Chỉ so sánh embedding được tạo bởi cùng model, phiên bản và preprocessing.
- Lưu model/preprocessing version để biết vector có tương thích không.
- Tìm Top 20 representative vectors trước; backend rerank bằng sample embeddings của các ứng viên.
- Xóa hoặc vô hiệu hóa toàn bộ vectors liên quan khi person bị xóa/deactivate theo chính sách dữ liệu.
- Ảnh/video không nằm trong kho vector; API nhận embedding từ browser.
