# Quyết định chốt — Staff Scheduling System

Tài liệu này gộp hai nguồn thành một bản chốt duy nhất:

- **Bản A**: `docs/business-analysis.vi.md` (dịch từ bản tiếng Anh): thiên về quyết định sản phẩm, thuật toán, edge case.
- **Bản B**: `docs/staff-scheduling-problem-analysis.md`: thiên về hiểu bài toán, so sánh AVG/MAX/Flexible Shifts, góc nhìn chi phí.

Nếu có mâu thuẫn, bản chốt dưới đây thắng cả hai. Nếu bạn đổi ý, sửa ở đây trước, rồi mới sửa `specs/requirements.md`.

Cách đọc nhanh: mục 1 là bản chốt (đọc cái này là đủ), mục 2 là hai quyết định đã chốt ở lượt xác nhận cuối, mục 3 giải thích vì sao chọn, mục 4 là việc phải sửa trong spec.

---

## 1. Bản chốt

### 1.1 Nhu cầu và ca

| # | Quyết định | Chốt |
|---|---|---|
| 1 | Công thức nhu cầu mỗi giờ | `required = max(1, ceil(transactions / N))` khi giờ đó có dữ liệu; giờ không có dữ liệu = 0 (cửa hàng đóng) |
| 2 | Giá trị N | Mặc định **15**, người dùng chỉnh được (lưu theo từng schedule). Đây là giả định mô hình, không phải dữ liệu năng suất thật |
| 3 | Headcount của một ca | **MAX** của `required` trên các giờ thuộc ca. AVG chỉ ghi lại như phương án đã cân nhắc |
| 4 | Ca mặc định | 07:00–15:00 và 15:00–23:00. Quản lý thêm/sửa/xóa ca được, ca có thể ngắn hơn 8h |
| 5 | Flexible Shifts | **Không build bộ tự tìm ca tối ưu.** Nhưng vì thuật toán không giả định ca dài 8h, quản lý tự tạo ca ngắn rồi chạy auto-schedule vẫn hoạt động. Ghi là hướng mở rộng |

### 1.2 Phân công và công bằng

| # | Quyết định | Chốt |
|---|---|---|
| 6 | Ràng buộc cứng khi auto-schedule | (a) không vượt giờ tối đa của tuần, (b) không có hai ca chồng giờ, (c) **trần 8 giờ làm mỗi người mỗi ngày** (mục 2.2) |
| 7 | Định nghĩa công bằng | **Utilization = giờ đã xếp / giờ tối đa**. Mỗi chỗ trống chọn người có utilization **thấp nhất** |
| 8 | Quy tắc hòa | Utilization bằng nhau thì chọn người còn **nhiều giờ hơn**, vẫn bằng thì theo **tên A–Z**. Kết quả luôn giống nhau với cùng đầu vào |
| 9 | Sàn giờ tối thiểu | Không có sàn cứng ở v1. Ghi là điểm yếu đã biết |
| 10 | Không đủ người | Xếp tối đa trong giới hạn, **không vượt giờ để cố lấp**, đánh dấu ca thiếu và số người thiếu, báo tổng giờ dư/thiếu. Không báo lỗi, không im lặng |
| 11 | Chạy lại auto-schedule | Chỉ thay phần do auto tạo trước đó. **Giữ nguyên phần quản lý sửa tay** (tính vào giờ đã dùng). Hỏi xác nhận trước khi thay |
| 12 | Ca không chia hết giờ tối đa | Không cắt ca. Người max 20h chỉ nhận 2 ca 8h, 4h dư không dùng |

### 1.3 Dữ liệu, lưu trữ, giao diện

| # | Quyết định | Chốt |
|---|---|---|
| 13 | Lưu trữ | Zustand `persist` vào **localStorage**, không backend, không sessionStorage |
| 14 | Số schedule | Nhiều schedule, tạo và chuyển qua lại |
| 15 | Import CSV | Chấp nhận BOM, CRLF, dòng trống, nhãn "7am" và "07:00". Sai thì từ chối cả file, báo đúng dòng/cột. Import lại thì thay toàn bộ |
| 16 | Ánh xạ ngày CSV | **Theo thứ tự cột** của file (`dayIndex` 0 là cột đầu), hiển thị nhãn ngày đúng như header (mục 2.1) |
| 17 | Cảnh báo khi sửa tay | **Không chặn**, hiện ngay trên chip/ô: vượt giờ tối đa của tuần, thiếu người, vượt trần 8 giờ trong ngày |
| 18 | Hiển thị dư người (overstaffing) | **Không dùng cảnh báo màu vàng/đỏ.** Hiện trung tính (số dư trong ô và tổng dư của tuần), vì MAX luôn gây dư và cảnh báo đầy bảng sẽ vô nghĩa |
| 19 | Bảng tổng hợp | Đúng đề: mỗi ô có Transactions, Staff hours, Txn/staff-hour; tổng tuần gồm Total staff hours, Total transactions, Overall ratio, Average ratio (hiện **cả hai**, ô không có người hiện "–" và bị loại khỏi trung bình) |
| 20 | Thêm vào bảng tổng hợp (rẻ, có lợi khi bảo vệ) | Một dòng "Giờ công theo nhu cầu mô hình" so với "Giờ công đã xếp" và phần chênh lệch |
| 21 | Chi phí | **Không build.** Chỉ dùng ví dụ chi phí làm ý nói khi phỏng vấn (xem mục 3.4) |

---

## 2. Hai việc đã quyết (từ lượt xác nhận cuối)

### 2.1 Ánh xạ ngày CSV: giữ cách cũ (theo thứ tự cột)

Cột đầu của CSV là ngày 1, cứ thế đến ngày 7. Lịch hiển thị nhãn ngày đúng như header của file ("Fri, 07 Aug", ...). Mình từng đề xuất đọc tên thứ để luôn ra Mon–Sun, bạn chọn không đổi. Hệ quả cần nhớ:

- Với file mẫu, lịch hiển thị Fri, Sat, Sun, Mon, Tue, Wed, Thu. Đề nói schedule là Mon–Sun, nên trong README ghi rõ: *"Mình coi các cột ngày một cách tổng quát theo thứ tự trong file (đề: treat the columns generically), nên tuần hiển thị bắt đầu ở ngày của cột đầu tiên."*
- CSV sắp xếp khác thứ tự sẽ ra bố cục khác. Đó là hành vi có chủ đích, không phải lỗi.
- Nếu người chấm hỏi, hướng nâng cấp là đọc tên thứ từ header để chuẩn hóa về Mon–Sun (vài dòng code).

### 2.2 Giờ làm mỗi ngày: trần 8 giờ mỗi người mỗi ngày

Bạn chọn giữ trần 8 giờ để tập trung xử lý phương pháp MAX. Mình hiểu là **Cách 2: trần 8 giờ làm việc mỗi người mỗi ngày** (nếu bạn muốn nói "tối đa một ca mỗi ngày" thì báo mình, với hai ca mặc định kết quả giống hệt nhau).

Quy tắc áp dụng khi auto-schedule:
- Không xếp hai ca chồng giờ (luôn cấm).
- Tổng giờ của một người trong một ngày không vượt **8 giờ** (hằng số `DAILY_CAP_HOURS = 8`, không có ô nhập trên UI).
- Ca dài hơn 8 giờ (người dùng tự tạo) vẫn xếp được nếu đó là ca duy nhất của người đó trong ngày.
- Với hai ca mặc định 8h: không ai làm cả ca sáng lẫn ca chiều. Với hai ca 4h: được làm cả hai.
- Sửa tay vẫn được vượt trần, nhưng hiện cảnh báo "vượt 8 giờ trong ngày".

Con số 8 giờ là giả định (tiêu chuẩn lao động thường gặp), phải ghi trong README.

---

## 3. Vì sao chốt như vậy

### 3.1 Điều mình lấy từ bản B (bản A thiếu)

- **Transaction count chỉ là proxy**: số người tính ra là ước lượng theo mô hình. Phải nói điều này trước khi bị hỏi.
- **So sánh AVG và MAX** có số liệu: với nhu cầu `[2,2,2,3,3,2,5,3]`, AVG ra 3 người nhưng giờ 13:00 cần 5 (thiếu 2), MAX ra 5.
- **Chênh lệch giờ công**: ca sáng thứ Sáu xếp 40 giờ công nhưng nhu cầu theo giờ chỉ 22 (dư 18). Cả ngày: 64 so với 37 (dư 27). Không nên kết luận 27 giờ đó là nhàn rỗi, vì nhân viên còn làm việc ngoài giao dịch.
- **Góc nhìn chi phí** và Flexible Shifts làm hướng mở rộng.
- **Danh sách giả định cho README** (mục 5).

### 3.2 Điều mình giữ từ bản A (bản B thiếu)

N chỉnh được; nhiều schedule; chi tiết localStorage; quy tắc hòa và tính tất định; edge case (0 nhân viên, 0 giao dịch); cách import CSV chịu lỗi; giữ phần sửa tay khi chạy lại; cảnh báo không chặn.

### 3.3 Chỗ hai bản khác nhau và cách mình giải quyết

| Chủ đề | Bản A | Bản B | Chốt | Vì sao |
|---|---|---|---|---|
| Thước đo công bằng | Người **còn nhiều giờ** nhất trước | Người **utilization thấp** nhất trước | Utilization (bản B) | Công bằng theo tỉ lệ với hợp đồng mới đúng ý đề ("không ai gần 0 giờ trong khi người khác đã đầy"). Ví dụ: A max 40h và C max 20h. Theo "còn nhiều giờ", C gần như không được xếp đến khi A đã dùng 20h, trong khi theo utilization hai người tăng cùng nhịp. Mình đã nói "xấp xỉ tỉ lệ" ở bản A, và cách đó chỉ đúng khi mọi người cùng max |
| N | Chỉnh được | Cố định 15 | Chỉnh được | Bạn đã chọn "N=15, user-adjustable" ở lượt trước, và chi phí là một ô nhập số |
| Nhiều ca một ngày | Cấm | Chỉ cấm trùng giờ, cấm nhiều ca là giả định thêm | Trần 8 giờ mỗi người mỗi ngày + cấm trùng giờ | Xem 2.2 |
| Cảnh báo overstaffing | Chỉ ở coverage view (stretch) | Nên hiển thị | Hiển thị trung tính, không cảnh báo màu | Xem mục 1.3 dòng 18 |
| Ánh xạ ngày CSV | Theo thứ tự cột | Không nêu, nhưng nói schedule là Mon–Sun | Theo thứ tự cột (giữ quyết định cũ) | Xem 2.1 |
| Phân công theo giờ | Một ca độc lập | Nhắc phải tính lại coverage từng giờ | Coverage luôn tính từ assignment theo từng giờ | Bảng tổng hợp vốn đã tính thế |

### 3.4 Con số mẫu để bạn nói khi phỏng vấn

Tuần mẫu, N = 15:
- Giờ công xếp theo MAX: **352** (44 ca-người × 8h).
- Giờ công nhu cầu cộng theo từng giờ: **257**.
- Chênh lệch: **95 giờ, khoảng 27%**. Đây là cái giá của "không thiếu người ở giờ cao điểm".
- Ví dụ chi phí minh họa 30.000 VND/giờ: 95 giờ ≈ 2.850.000 VND mỗi tuần. Đây chỉ là phép tính minh họa, không phải dữ liệu lương trong đề, và 257 giờ cũng chưa chắc là lịch khả thi hay tối ưu.
- Thứ Sáu: 64 giờ xếp so với 37 giờ nhu cầu (dư 27), khớp bản B.

Câu trả lời khi bị hỏi "sao không giảm cho đỡ tốn?": "MAX ưu tiên không thiếu người lúc cao điểm. Muốn giảm dư thì dùng ca ngắn phủ đúng giờ cao điểm. Hệ thống cho tạo ca ngắn, nhưng chưa tự tìm tổ hợp ca tối ưu vì đó là bài toán lớn hơn."

### 3.5 Một giới hạn đã biết khi dùng ca chồng giờ

Auto-schedule điền từng ca độc lập. Nếu quản lý tạo hai ca chồng nhau (ví dụ 07:00–15:00 và 09:00–13:00), mỗi ca tự đòi người cho giờ cao điểm của nó nên thành dư người. Cách nâng cấp sau này: tính **nhu cầu còn lại** cho mỗi ca sau khi trừ phần các ca đã xếp trong ngày đã phủ. Với ca không chồng nhau (mặc định) kết quả y hệt MAX. v1 chỉ cảnh báo, không giải quyết.

---

## 4. Việc đã sửa trong spec và ghi chú

Đã cập nhật `specs/requirements.md` (Ticket 5 trần 8 giờ/ngày và utilization thấp nhất; Ticket 6 thêm dòng giờ công theo nhu cầu và số dư trung tính; Ticket 7 cảnh báo vượt trần ngày), `docs/business-analysis.md` (mục 1.3) và `Self-Note-Practice.md`. Data model giữ nguyên: `dayIndex` theo thứ tự cột.

---

## 5. Giả định cần ghi trong README (bản chốt)

1. N = 15 là giả định mô hình để đổi giao dịch thành nhu cầu nhân sự, chỉnh được, không phải dữ liệu năng suất đã kiểm chứng.
2. Giờ có dữ liệu giao dịch được coi là giờ mở cửa và cần tối thiểu một nhân viên.
3. Transaction count chỉ là proxy; mô hình chưa tính việc ngoài giao dịch (chuẩn bị hàng, dọn dẹp, kiểm kê).
4. Headcount của một ca là MAX nhu cầu theo giờ trong ca; chấp nhận dư người ở giờ vắng để không thiếu ở giờ cao điểm.
5. Không xếp vượt giờ tối đa trong tuần; ca là nguyên khối nên giờ lẻ còn lại không dùng.
6. Không xếp hai ca chồng giờ; auto-schedule giới hạn tối đa 8 giờ làm mỗi người mỗi ngày (giả định thêm, tiêu chuẩn lao động thường gặp).
7. Công bằng = cân bằng utilization bằng greedy; không có sàn tối thiểu cứng; không tối ưu toàn cục.
8. Khi thiếu người, giữ lịch trong giới hạn nhân sự và hiển thị thiếu hụt.
9. Quản lý có thể sửa tay vượt giờ hoặc thiếu người; hệ thống cảnh báo, không chặn.
10. Dữ liệu lưu trong localStorage của trình duyệt (theo từng trình duyệt, không chia sẻ).

## 6. Điểm yếu nên tự nói trước

- Greedy không tối ưu toàn cục và thứ tự duyệt ngày ảnh hưởng ngày nào được đủ người trước khi thiếu nhân lực.
- MAX gây dư giờ công (khoảng 27% tuần mẫu).
- Không có availability, ngày nghỉ, vai trò.
- Ca chồng giờ làm dư người (mục 3.5).
- N là giả định, chưa kiểm chứng.
