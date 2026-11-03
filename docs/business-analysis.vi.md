# Phân tích nghiệp vụ và quyết định thiết kế

Tài liệu này mô tả cách bài toán được hiểu, các phương án đã cân nhắc, lựa chọn cuối cùng và những giới hạn đã biết.
Đề bài cố ý để mở một số điểm (hệ số quy đổi giao dịch ra nhân sự, cách tính nhu cầu theo ca, định nghĩa công bằng), nên
mỗi điểm dưới đây nêu rõ giả định đã dùng. Bản tiếng Anh: `business-analysis.md`.

## Bài toán

Quản lý cửa hàng cần quyết định ai làm ca nào trong một tuần điển hình, cân đối ba điều cùng lúc:

1. **Nhu cầu:** giờ đông khách cần nhiều người hơn giờ vắng. Số giao dịch mỗi giờ được dùng làm thước đo độ bận.
2. **Năng lực:** mỗi nhân viên có số giờ làm tối đa mỗi tuần.
3. **Công bằng:** không ai bị xếp quá ít giờ trong khi người khác đã kín.

Khó khăn chính: nhu cầu được đo theo **giờ**, nhưng nhân viên được xếp theo **ca** (khối liền, ví dụ 8 giờ). Vì vậy
lời giải gồm hai bước tách biệt:

1. **Định cỡ ca (quy tắc MAX, mục 1 và 2):** quyết định mỗi ca cần bao nhiêu người.
2. **Phân công (greedy, mục 3 và 4):** quyết định những người nào lấp các chỗ đó.

## 1. Nhu cầu theo giờ

`số người cần = max(1, ceil(giao dịch / N))` cho mọi giờ có dữ liệu. Giờ không có dữ liệu được coi là đóng cửa và không
cần ai.

- **N = 15** là giá trị mặc định, và người dùng chỉnh được cho từng schedule. Với dữ liệu mẫu (khoảng 2 đến 64 giao
  dịch mỗi giờ), giờ đông nhất cần 5 người và giờ vắng nhất cần 1.
- N là giả định của mô hình, không phải năng suất đã đo. Số giao dịch cũng chỉ phản ánh một phần công việc: chuẩn bị
  hàng, dọn dẹp, kiểm kê không được tính. Vì vậy số người tính ra là ước lượng.

## 2. Từ nhu cầu theo giờ sang nhu cầu theo ca

| Phương án | Số người của ca | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **MAX** (đã chọn) | Nhu cầu cao nhất trong các giờ của ca | Không giờ nào thiếu người so với mô hình; dễ giải thích và kiểm tra | Dư người ở giờ vắng; không tối ưu chi phí |
| Trung bình (làm tròn lên) | Nhu cầu trung bình của ca | Ít giờ công hơn | Giờ cao điểm bị thiếu người |
| Ca linh hoạt | Nhiều ca ngắn, mỗi ca theo nhu cầu riêng | Giảm phần dư; tận dụng người còn ít giờ | Phải chọn khung giờ ca; lịch khó đọc hơn; phức tạp hơn |

**Lựa chọn: MAX**, vì giờ cao điểm thiếu người ảnh hưởng trực tiếp tới khách, còn giờ công dư là chi phí có thể đo và
hiển thị. Ví dụ thứ Sáu, ca 07:00–15:00, nhu cầu từng giờ [2, 2, 2, 3, 3, 2, 5, 3]: MAX cho 5 người, trung bình cho 3,
và lúc 13:00 (cần 5) sẽ thiếu 2 người.

**Hệ quả:** trên tuần mẫu, MAX xếp 352 giờ công trong khi cộng nhu cầu từng giờ chỉ cần 257 (dư 95 giờ, khoảng 27%).
Phần dư này được hiển thị trên tab Summary, và kịch bản 3 trong app (ca 4 giờ) cho thấy ca ngắn giảm phần dư xuống
còn 71 giờ. Các ca người dùng tự tạo được hỗ trợ, nhưng app không tự tìm tổ hợp ca tối ưu.

## 3. Phân công nhân viên vào ca

Thuật toán greedy, tất định (cùng đầu vào cho cùng kết quả). Duyệt từng ngày, trong ngày duyệt từng ca theo giờ bắt đầu;
với mỗi chỗ trống chọn một người đủ điều kiện:

- **Điều kiện:** chưa ở trong ca đó; còn đủ giờ trong tuần cho cả ca; không trùng giờ với ca khác của họ; tổng giờ trong
  ngày không vượt 8 giờ (một ca dài hơn 8 giờ chỉ được xếp nếu đó là ca duy nhất của người đó trong ngày).
- **Thứ tự chọn:** người có tỉ lệ sử dụng thấp nhất; hòa thì người còn nhiều giờ trống hơn, rồi theo tên.
- **Khi không đủ người:** để trống chỗ đó và báo rõ ca nào, ngày nào, thiếu bao nhiêu người. Không ai bị xếp quá giới
  hạn tuần để lấp chỗ.
- **Giữ nguyên chỉnh sửa tay:** các placement người dùng thêm hoặc kéo được giữ, tính vào giờ đã dùng và trần 8 giờ,
  và không bị thay khi chạy lại.

Trần 8 giờ mỗi ngày là giả định, vì đề chỉ cấm trùng giờ. Hai ca mặc định 8 giờ nối nhau sẽ thành ngày làm 16 giờ, nên
không được xếp tự động.

## 4. Công bằng

**Định nghĩa:** tỉ lệ sử dụng = giờ đã xếp / giờ tối đa của người đó, và thuật toán chọn người có tỉ lệ thấp nhất.

Lý do không chia đều số giờ tuyệt đối: giới hạn mỗi người khác nhau. Với An tối đa 40 giờ, Chi tối đa 20 giờ và 48 giờ
cần xếp, chia đều (24 và 24) làm Chi vượt giới hạn, còn chia theo tỉ lệ cho An 32 giờ và Chi 16 giờ, cả hai dùng 80%.
Trên tuần mẫu với 10 người, tỉ lệ sử dụng nằm trong khoảng 80% đến 100% và không ai bị 0 giờ.

**Hạn chế:**
- Không có sàn giờ tối thiểu. Việc cân bằng là hệ quả của cách chọn người, không phải cam kết. Nếu số người nhiều hơn
  số lượt xếp thì chắc chắn có người 0 giờ.
- Giờ tối đa được coi là trần, không phải giờ được đảm bảo theo hợp đồng.
- Chỉ cân bằng tổng giờ trong tuần, không cân bằng ca khó (cuối tuần, ca tối) và không xét nguyện vọng.
- Ca là khối liền nên có giờ lẻ không dùng được: người còn 20 giờ với ca 8 giờ chỉ nhận thêm 2 ca và 4 giờ còn lại bỏ trống.

## 5. Dữ liệu và lưu trữ

- **Lưu trữ phía client:** Zustand với `persist` ghi vào localStorage; không backend, không cơ sở dữ liệu. Lý do: chạy
  bằng một đến hai lệnh, không cần tài khoản. Đánh đổi: dữ liệu theo từng trình duyệt, không chia sẻ giữa người dùng.
  Dùng localStorage thay vì sessionStorage để dữ liệu không mất khi đóng tab. Dữ liệu đọc lỗi thì app khởi động rỗng và
  thông báo cho người dùng.
- **Nhiều schedule:** người dùng tạo và chuyển qua lại giữa các schedule.
- **Shift:** gồm giờ bắt đầu và giờ kết thúc, dùng chung cho cả tuần. Mặc định 07:00–15:00 và 15:00–23:00. Giờ bắt
  đầu và kết thúc là giờ tròn, trong một ngày.
- **Import CSV:** chấp nhận tiêu đề tuần khác hoặc không có, hàng giờ theo thứ tự bất kỳ, nhãn `7am`, `1pm` hoặc
  `13:00`, BOM, CRLF, trường có ngoặc kép. File sai (nhãn giờ lỗi, ô không phải số nguyên không âm, số cột không khớp)
  bị từ chối toàn bộ kèm dòng và cột lỗi, không import một phần. Các cột ngày được giữ theo thứ tự và nhãn của file
  (tuần mẫu chạy từ thứ Sáu đến thứ Năm) để tránh lệch ngày khi ánh xạ lại. Đề nói các cột được coi là ngày trong tuần
  một cách tổng quát, và cách này là một cách hiểu điều đó. Các ô demand có thể sửa trực tiếp, với số nguyên từ 0 đến
  100.000.

## 6. Bảng tổng hợp và cảnh báo

- Mỗi ô (ngày, giờ) hiển thị số giao dịch, số người đang làm (staff-hours) và giao dịch trên mỗi staff-hour. Ô không có
  người hiển thị "–".
- Tổng tuần hiển thị cả hai chỉ số: **tổng giao dịch / tổng staff-hours**, và **trung bình các tỉ lệ từng ô** (chỉ
  tính ô có người). Hai số khác nhau vì cách thứ hai cho mỗi ô trọng số như nhau.
- Hiển thị thêm giờ công cần theo mô hình so với giờ công đã xếp.
- **Cảnh báo không chặn:** vượt giờ tối đa tuần, vượt 8 giờ trong ngày, ca chồng giờ, giờ thiếu người so với nhu cầu.
  Quản lý có thể chủ động chấp nhận đánh đổi. Phần dư người được hiển thị trung tính thay vì cảnh báo, vì quy tắc MAX
  luôn tạo ra một phần dư.

## 7. Giới hạn đã biết

Định cỡ ca (quy tắc MAX):
- **Phần dư:** giờ vắng trong ca vẫn có thêm người, nên giờ công đã xếp lớn hơn giờ công mô hình yêu cầu.
- **Giá trị ngoại lai:** một giờ đột biến quyết định số người của cả ca.
- **Ca chồng giờ:** mỗi ca được định cỡ độc lập nên có thể dư người. Có thể cải thiện bằng cách trừ phần nhu cầu đã được
  các ca khác phủ.

Phân công (greedy):
- **Không tối ưu toàn cục:** khi năng lực sát nhu cầu, nó có thể xếp ít chỗ hơn mức tối đa có thể (đã kiểm tra bằng cách
  so với vét cạn trên các bài toán nhỏ). Khi thiếu người, các ngày đầu tuần được lấp trước.
- **Giới hạn về công bằng:** xem mục 4.

Chưa mô hình hóa: ngày nghỉ và nguyện vọng, vai trò, giờ nghỉ, ca qua nửa đêm, công việc không phát sinh giao dịch.

## 8. Ngoài phạm vi

Xác thực, nhiều người dùng, triển khai. Không xây dựng: ngày nghỉ, vai trò, xuất CSV, coverage view riêng.
