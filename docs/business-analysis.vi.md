# Phân tích nghiệp vụ — Staff Scheduling System (bản tiếng Việt)

> Bản dịch của `docs/business-analysis.md`. Giữ nguyên thuật ngữ kỹ thuật tiếng Anh (shift, staff-hours, headcount...) để khớp với đề và code.

Mục đích: chuyển đề bài (PDF) thành các quyết định sản phẩm cụ thể. Đề cố tình để mở một số chỗ ("make a reasonable decision, state your assumption"). Tài liệu này liệt kê mọi lỗ hổng đã tìm thấy, kèm đề xuất, và đánh dấu chỗ nào **cần bạn quyết** trước khi code. Người chấm chấm điểm "problem reasoning" một cách rõ ràng, nên file này cũng là bằng chứng lập luận của chúng ta.

---

## 1. Thuật toán auto-schedule (trọng tâm của bài, Mục 4 của đề)

Đây là điểm mơ hồ có trọng số cao nhất. Làm sai thì cả "Correctness" lẫn "Problem reasoning" đều mất điểm. Gồm bốn quyết định con, theo thứ tự:

### 1.1 Mô hình nhu cầu: giao dịch → số nhân viên cần mỗi giờ

Đề: "một nhân viên cho mỗi N giao dịch mỗi giờ, với mức tối thiểu hợp lý (ví dụ một người) bất cứ khi nào cửa hàng mở. Bạn tự chọn N và giải thích."

- **required_staff(hour) = ceil(max(transactions, 1 nếu cửa hàng mở) / N)**, tối thiểu 1 trong giờ mở cửa.
- N là hằng số chỉnh được (không hardcode số ma thuật). Cho chỉnh để khi phỏng vấn nói được: "đổi N, chạy lại, xem lịch thay đổi".
- **CẦN QUYẾT**: chọn N. Dữ liệu mẫu dao động khoảng 2–64 giao dịch/giờ. N=15 thì giờ đông nhất (64) cần ~5 người, giờ vắng nhất (2) cần 1. Đề xuất **N=15** mặc định, người dùng chỉnh được trên UI (chi phí gần như bằng 0).

### 1.2 Chuyển nhu cầu theo giờ thành nhu cầu theo ca (ca là khối nguyên, không phải từng giờ)

Đề: "quyết định mỗi ca cần bao nhiêu người mỗi ngày để các giờ đông nhất trong ca được phủ đủ."

Ba quy tắc ứng viên:

| Quy tắc | Số người của ca | Rủi ro |
|---|---|---|
| **Max-hour** (đề xuất) | max(required_staff) trên các giờ trong ca | Dư người ở giờ vắng, nhưng chắc chắn không thiếu người ở giờ đông |
| Average-hour | trung bình required_staff trong ca, làm tròn | Giờ đông trong ca nhiều khả năng bị thiếu người |
| Sum/weighted | tổng required staff-hours / độ dài ca | Cùng rủi ro thiếu người như trung bình, lại khó giải thích hơn |

- **Đề xuất: quy tắc max-hour.** Đây là cách duy nhất không thể âm thầm làm thiếu người ở giờ đông, và dễ bảo vệ bằng lời nhất. Phải nói rõ đánh đổi (dư người) trong coverage view thay vì giấu đi.
- Quy tắc này trực tiếp gây ra mô hình dư/thiếu coverage đáng làm nổi bật trên UI (ví dụ ca 07:00 gồm cả giờ 7am vắng lẫn giờ cao điểm, nên giờ vắng đầu ca được "tặng" thêm người).

### 1.3 Phân công: điền nhân viên cụ thể vào ca dưới ràng buộc giờ tối đa

- Thuật toán greedy, tất định (deterministic), giải thích được (không dùng bộ giải ILP, vượt phạm vi 4–6 giờ):
  1. Tính headcount cần cho từng (ngày, ca) theo 1.2.
  2. Sắp xếp nhân viên theo **số giờ còn lại giảm dần** (nhiều dư địa nhất trước) mỗi lần cần điền một chỗ trống, nhờ vậy giờ làm tự dàn đều thay vì dồn hết cho một người.
  3. Với mỗi (ngày, ca) cần N người, gán N nhân viên có nhiều giờ còn lại nhất mà (a) còn ≥ độ dài ca, (b) chưa có phân công nào khác trong ngày đó (một ca/người/ngày; hai ca liền 07-15 + 15-23 không trùng giờ nhưng sẽ thành ngày làm 16h. Sửa tay vẫn có thể làm vậy, kèm cảnh báo).
  4. Nếu không đủ người đủ điều kiện, gán số người có thể và đánh dấu ca đó **understaffed** trong kết quả (không báo lỗi, không âm thầm bỏ qua; Mục 4 của đề yêu cầu rõ điều này).
- Độ dài ca không chia hết giờ tối đa trong tuần (ví dụ ca 8h, người có max 20h) là bình thường: người đó không nhận được ca thứ 3, dừng ở 2 ca (16h), dư 4h. Chấp nhận được theo đề ("lượng việc công bằng, hữu ích", không phải "đúng bằng mức tối đa").

### 1.4 Định nghĩa công bằng (fairness)

Đề: "không ai bị xếp 0 hoặc gần 0 giờ trong khi người khác đã đầy... Hãy định nghĩa 'đủ giờ' nghĩa là gì và áp dụng nhất quán."

- **Đề xuất**: fairness = **tỉ lệ sử dụng** (giờ đã xếp / giờ tối đa) của các nhân viên nên tương đối cân bằng, chứ không phải số giờ tuyệt đối. Quy tắc greedy "nhiều giờ còn lại nhất trước" ở 1.3 xấp xỉ điều này như một hệ quả, giữ thuật toán đơn giản và giải thích được.
- **CẦN QUYẾT**: có cần sàn cứng không (ví dụ "mọi người phải đạt ≥50% giờ tối đa trước khi ai đó đạt 100%")? Đề xuất: không có sàn cứng ở v1, greedy cân bằng là đủ tốt và sàn cứng thêm độ phức tạp thật sự (logic xếp lại) cho ngân sách bốn giờ. Ghi đánh đổi này trong README.

---

## 2. Quyết định về mô hình dữ liệu

### 2.1 Phạm vi schedule — **CẦN QUYẾT**

Đề không nói app hỗ trợ nhiều schedule (mỗi cửa hàng/tuần một cái) hay chỉ một schedule đang hoạt động. Đề xuất: hỗ trợ **nhiều schedule**, người dùng tạo/chuyển qua lại (rẻ nếu có khóa ID đúng ngay từ đầu, và làm cho việc demo "tạo schedule" tự nhiên thay vì có đúng một schedule ngầm định).

### 2.2 Lưu trữ — ĐÃ CHỐT: chỉ phía client (Zustand + localStorage)

Đề cho phép "in-memory, local storage, hoặc database" và app hoàn toàn client-side. Ban đầu chọn Supabase qua NestJS; đã thay vì người chấm phải chạy bằng một hai lệnh và không cần tạo tài khoản. localStorage (không dùng sessionStorage vì mất khi đóng tab) giữ dữ liệu qua các lần tải lại trang cho demo. Một Zustand store với `persist` là nơi duy nhất mọi màn hình đọc/ghi. Logic nghiệp vụ (parse CSV, auto-schedule, summary) là các hàm thuần trong `frontend/src/lib/`. Đánh đổi phải ghi trong README: dữ liệu theo từng trình duyệt, không chia sẻ giữa người dùng, giới hạn ~5 MB (dư cho một tuần dữ liệu theo giờ).

### 2.3 Mô hình shift

- Shift = {start, end}, thuộc về một schedule, không theo từng ngày (khớp đề: "a shift is defined by only a start time and an end time"). Cùng một shift ID dùng cho cả 7 ngày. Mặc định: 07:00–15:00, 15:00–23:00.
- Các shift chồng giờ (nếu người dùng thêm shift tùy chỉnh) được phép tồn tại, nhưng **một nhân viên không được xếp hai ca chồng giờ** trong cùng ngày, kiểm tra khi phân công.

### 2.4 Mức dung sai khi import giao dịch (Mục 3 của đề)

- CSV mẫu (`sample_transaction_interview.csv`) có dòng tiêu đề, rồi dòng header nhãn ngày kiểu "Fri, 07 Aug", rồi các dòng giờ "7am".."10pm". Importer phải:
  - Coi các cột ngày **một cách tổng quát** (ánh xạ theo vị trí/thứ tự vào Mon–Sun của schedule, không theo nhãn ngày cụ thể; đề nói rõ "treat columns generically as days of the week").
  - **CẦN QUYẾT**: thứ tự cột mẫu là Fri→Thu (tuần bắt đầu thứ Sáu). Cột "ngày 1" ánh xạ vào thứ Hai của schedule, hay tuần của schedule bắt đầu ở đúng cột đầu của CSV? Đề xuất: **ánh xạ thẳng thứ tự cột CSV vào Ngày 1..7 của schedule theo thứ tự upload**, và để schedule hiển thị nhãn thứ mà các cột ngụ ý (không ép bắt đầu từ thứ Hai). Đơn giản hơn, tránh lỗi lệch ngày âm thầm, và khớp với "treat generically".
  - Parse nhãn giờ như "7am", "1pm" → 24h; chấp nhận cả "07:00".
  - Input sai (nhãn giờ lỗi, ô không phải số, thiếu cột) → từ chối cả file với thông báo lỗi rõ tới mức dòng/cột, không import một phần.

---

## 3. Bảng tổng hợp (Mục 2.6 của đề) — phần lớn đã rõ, còn hai khoảng trống

- "Transactions per staff hour" mỗi ô: đã định nghĩa chính xác (giao dịch ÷ staff-hours, "–" khi chia 0).
- **Average transactions per staff hour** (trung bình các tỉ lệ từng ô, chỉ tính ô có người) so với **overall** (tổng giao dịch ÷ tổng staff-hours): đề yêu cầu hiển thị cả hai, hai số sẽ khác nhau khi lượng người không đều. Không cần quyết, chỉ cần đừng gộp thành một số.
- Cách trình bày (một lưới, xếp chồng giá trị, hay các lưới riêng): đề nói "tùy bạn". Đề xuất: một lưới, 3 giá trị nhỏ xếp chồng trong mỗi ô (giao dịch / staff-hours / tỉ lệ), tô màu theo tỉ lệ (bảng màu cụ thể để skill design-taste-frontend quyết lúc build).

---

## 4. Cảnh báo khi sửa trực tiếp (Mục 2.7 của đề)

Đề muốn cảnh báo, không chặn, khi một chỉnh sửa làm ai đó vượt giờ tối đa hoặc làm một giờ thiếu người. Đề xuất:
- Vượt giờ tối đa → badge cảnh báo ngay trên nhân viên đó và trên ca cụ thể, không chặn.
- Giờ bị thiếu người (số người xếp < required_staff theo 1.1 cho giờ đó) → badge cảnh báo trên ô ở cả roster view lẫn bảng tổng hợp.
- Không có validate chặn cứng: quản lý có thể chủ động chấp nhận đánh đổi (khớp "surface the outcome... rather than failing silently").

---

## 5. Ngoài phạm vi một cách rõ ràng (theo Mục 5 của đề)

Authentication, multi-user, deployment. Roles/skills, availability/ngày nghỉ, drag-and-drop, xuất CSV chỉ là **stretch goals**: làm sau khi luồng cốt lõi đã chắc, không làm trước.

---

## 6. Các quyết định — ĐÃ XÁC NHẬN

1. **N = 15**, người dùng chỉnh được trên UI/config.
2. **Lưu trữ: Zustand + localStorage, không backend** (thay cho lựa chọn Supabase ban đầu).
3. Hỗ trợ **nhiều schedule** (tạo/chuyển).
4. **Ánh xạ ngày CSV: theo thứ tự cột** → Ngày 1..7, không ép bắt đầu thứ Hai.
5. **Fairness: chỉ greedy cân bằng**, không có sàn sử dụng tối thiểu cứng (mặc định, chưa bị phản đối).

Xem `specs/requirements.md` cho bảng ticket sinh ra từ các quyết định này.

> Lưu ý: bản dịch này phản ánh phân tích đầu tiên. Quy tắc "người còn nhiều giờ nhất trước" ở 1.3/1.4 đã được thay bằng "utilization thấp nhất trước", và kéo-thả đã được build. Xem `docs/final-decisions.vi.md`.
>
> Lưu ý: mục 4 ở trên (ánh xạ ngày) và quy tắc fairness ở 1.3 đang được xem xét lại trong `docs/final-decisions.vi.md` sau khi đối chiếu với `docs/staff-scheduling-problem-analysis.md`.
