# Thiết lập

1. Add skill: ponytail, design-taste-frontend, caveman
2.

# Dùng model OPUS (Vai trò: Tech Lead / Architect)

• Effort Level: High. Chúng ta cần tận dụng tối đa khả năng suy luận sâu của Opus để bóc tách file PDF.
• Nhiệm vụ: Đọc tài liệu PDF → Lập kế hoạch tổng thể → Chia nhỏ thành các Sub-tasks (User Stories/Jira tickets) cực kỳ rõ ràng, không mơ hồ.
• System Prompt / Chỉ thị quan trọng:
• "Mục tiêu của bạn là chuyển đổi file PDF yêu cầu này thành một kế hoạch thực thi kỹ thuật."
• "Bám sát 100% vào tài liệu gốc, không tự ý thêm bớt tính năng nếu không có trong PDF."
• "Đầu ra (Output) của bạn phải là danh sách các task độc lập. Mỗi task phải có đầy đủ: Mục tiêu, Input, Output kỳ vọng, và Các bước thực hiện chi tiết để một coder cấp dưới có thể đọc và làm theo ngay lập tức mà không cần hỏi lại."

# CON SONNET (Vai trò: Coder Thực Thi / Ponytail Developer)

• Effort Level: Medium (Nếu task khó hoặc cần logic xử lý thuật toán) hoặc Low (Nếu chỉ là viết CRUD, giao diện, hoặc task lặp đi lặp lại). Lời khuyên: Nên bắt đầu bằng Medium để đảm bảo code không bị lỗi vặt.
• Nhiệm vụ: Nhận đúng 1 Sub-task từ Opus → Viết code → Không giải thích dông dài.
• System Prompt / Chỉ thị quan trọng:
• "Bạn là một Kỹ sư phần mềm thực dụng (Pragmatic Developer). Nhiệm vụ duy nhất của bạn là hiện thực hóa ticket được giao bằng source code hoàn chỉnh."
• "Nghiêm cấm bay bổng, nghiêm cấm tự ý thay đổi cấu trúc hệ thống hoặc thêm các hàm không liên quan."
• "Tập trung vào tính đúng đắn của logic, xử lý ngoại lệ (error handling) chặt chẽ và tuân thủ đúng chuẩn coding convention."
• "Trả ra kết quả dạng block code sạch sẽ, kèm giải thích cực kỳ ngắn gọn nếu cần thiết."

# Thống nhất cách bàn giao

1. Global Context (Ngắn gọn): Bức tranh tổng thể của dự án. Do Opus tóm tắt lại trong đoạn văn. Ví dụ: "Hệ thống e-commerce dùng Node.js + Postgres,...(các chi tiết liên quan khác)".
2. The Specific Task: Toàn bộ nội dung của Sub-task do Opus sinh ra
3. Codebase hiện tại: chưa có đang là một workspace rỗng.
4. Codebase: Monolith hai folder riêng biệt: frontend/, backend/. Phải có .env.example
   Palexy-Take-Home/
   ├── .gitignore
   ├── README.md
   ├── specs/ # Ghi lại yêu cầu
   ├── docs/
   ├── frontend/ # Toàn bộ mã nguồn Frontend (React)
   │ ├── src/
   │ ├── package.json
   │ └── README.md
   │
   ├── backend/ # Toàn bộ mã nguồn Backend (Nestjs)
   │ ├── src/
   │ ├── package.json
   │ └── README.md
   │
   └── shared/ # (Tùy chọn) Thư mục chứa tài nguyên dùng chung
   └── types/ # Ví dụ: Dùng chung interface/types của TypeScript
