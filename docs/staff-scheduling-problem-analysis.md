# Staff Scheduling System --- Problem Understanding & Scheduling Approach

> **Quyết định phiên bản đầu tiên:** triển khai phương pháp **MAX** với
> hai ca mặc định 8 tiếng. AVG và Flexible Shifts được ghi nhận như các
> phương án đã cân nhắc và hướng mở rộng, chưa phải phạm vi bắt buộc của
> phiên bản đầu.

## 1. Bài toán nghiệp vụ

Ứng dụng hỗ trợ manager của cửa hàng retail/F&B lập lịch làm việc hằng
tuần dựa trên dữ liệu giao dịch lịch sử.

Manager cần: - Quản lý nhân viên và số giờ làm tối đa mỗi tuần. - Upload
dữ liệu giao dịch theo ngày và giờ. - Quản lý các ca làm việc. - Tự động
tạo lịch dựa trên nhu cầu nhân sự. - Xem, chỉnh sửa và đánh giá lịch
thông qua bảng tổng hợp.

Mục tiêu cốt lõi: bố trí nhiều nhân viên hơn vào giờ đông khách và ít
nhân viên hơn vào giờ vắng, đồng thời tôn trọng giới hạn giờ làm tối đa
mỗi tuần và phân bổ công việc tương đối công bằng.

### 1.1 Transaction count là proxy cho độ bận rộn

Đề bài yêu cầu xem số giao dịch trong một giờ như chỉ báo đại diện cho
mức độ bận rộn của cửa hàng.

Tuy nhiên, số giao dịch không phản ánh toàn bộ khối lượng công việc.
Nhân viên còn có thể chuẩn bị hàng, vệ sinh, kiểm kê hoặc thực hiện các
công việc không trực tiếp tạo ra giao dịch. Vì vậy, số nhân viên tính ra
là **ước lượng theo mô hình**, không phải con số chính xác tuyệt đối.

## 2. Khái niệm và yêu cầu từ đề

  -----------------------------------------------------------------------
  Khái niệm                           Ý nghĩa
  ----------------------------------- -----------------------------------
  Transaction count                   Số giao dịch trong một giờ

  Required staff                      Số nhân viên ước tính cần có trong
                                      một giờ

  Shift                               Ca làm việc, xác định bằng giờ bắt
                                      đầu và giờ kết thúc

  Staff member                        Nhân viên có tên và giới hạn giờ
                                      làm tối đa mỗi tuần

  Staff-hours                         Tổng giờ công được bố trí; trong
                                      một ô một giờ, bằng số nhân viên
                                      đang làm

  Maximum weekly hours                Số giờ tối đa một nhân viên được
                                      xếp trong một tuần

  Coverage                            Số nhân viên thực tế được bố trí
                                      trong một giờ

  Understaffing                       Nhân viên thực tế ít hơn số mô hình
                                      ước tính cần

  Overstaffing                        Nhân viên thực tế nhiều hơn số mô
                                      hình ước tính cần
  -----------------------------------------------------------------------

### 2.1 Những điều đề bài quy định

-   Một schedule đại diện cho một tuần, từ thứ Hai đến Chủ Nhật.
-   Mỗi nhân viên có tối thiểu tên và số giờ làm tối đa mỗi tuần.
-   Shift chỉ được định nghĩa bằng giờ bắt đầu và giờ kết thúc.
-   Hai ca mặc định: 07:00--15:00 và 15:00--23:00.
-   Manager được thêm, sửa và xóa shift.
-   Auto-schedule phải tôn trọng maximum weekly hours và hướng đến phân
    bổ công việc công bằng.
-   Lịch được tạo là bản nháp; manager có thể xem và chỉnh sửa.
-   Khi chỉnh sửa, bảng tổng hợp phải cập nhật và hệ thống cần cảnh báo
    vấn đề như vượt giờ tối đa hoặc thiếu nhân viên.

**Đề không quy định tất cả ca phải dài 8 tiếng.** Hai ca 8 tiếng chỉ là
ca mặc định. Vì shift có thể được thêm, sửa và xóa, việc tạo ca ngắn hơn
là khả năng được cho phép bởi mô hình của đề.

### 2.2 Những điều đề bài để mở

Đề không quy định cụ thể: - Tỷ lệ giao dịch trên mỗi nhân viên mỗi giờ
(N). - Cách chuyển nhu cầu theo giờ thành headcount của một shift. -
Cách phân bổ nhân viên vào các shift. - Cách định nghĩa và đo lường tính
công bằng. - Cách xử lý khi nhu cầu vượt quá năng lực nhân sự hoặc ngược
lại.

Đây là những quyết định cần được giải thích trong README.

## 3. Ước tính nhu cầu nhân sự theo giờ

### 3.1 Công thức được chọn

Giả định: một nhân viên có thể xử lý khoảng **15 giao dịch mỗi giờ**.

``` text
requiredStaff(hour) = max(1, ceil(transactions(hour) / N))
N = 15
```

Trong đó: - `transactions(hour)`: số giao dịch trong giờ. - `N`: số giao
dịch giả định tương ứng với một nhân viên trong một giờ. - `ceil`: làm
tròn lên. - `max(1, ...)`: tối thiểu một nhân viên trong giờ cửa hàng
hoạt động.

N = 15 là **giả định mô hình do người phát triển lựa chọn**, không phải
con số đề bài cung cấp hay dữ liệu năng suất đã được xác thực.

### 3.2 Ví dụ

    Giao dịch/giờ           Phép tính   Nhân viên cần
  --------------- ------------------- ---------------
                5    ceil(5 / 15) = 1               1
               15   ceil(15 / 15) = 1               1
               22   ceil(22 / 15) = 2               2
               38   ceil(38 / 15) = 3               3
               64   ceil(64 / 15) = 5               5

## 4. Chuyển nhu cầu theo giờ thành nhu cầu theo ca

Dữ liệu đầu vào được chia theo giờ, nhưng nhân viên được phân công theo
shift. Ví dụ ca 07:00--15:00 gồm tám khung giờ từ 07--08 đến 14--15.

Có hai cách đã cân nhắc để xác định headcount cho một ca: AVG và MAX.

### 4.1 AVG --- lấy trung bình

``` text
shiftHeadcount = ceil(average(requiredStaff for each hour in shift))
```

Ví dụ nhu cầu theo giờ:

``` text
[2, 2, 2, 3, 3, 2, 5, 3]
```

``` text
Average = (2 + 2 + 2 + 3 + 3 + 2 + 5 + 3) / 8
        = 2.75

ceil(2.75) = 3 nhân viên
```

**Ưu điểm** - Số nhân viên được xếp có xu hướng thấp hơn MAX. - Có thể
hạn chế bố trí quá nhiều người trong phần lớn thời gian của ca.

**Nhược điểm** - Không đảm bảo đủ người ở giờ cao điểm. - Ví dụ trên, ca
chỉ có 3 người trong khi giờ 13:00--14:00 cần 5 người theo mô hình.

AVG phù hợp hơn nếu chấp nhận một số giờ cao điểm có thể thiếu nhân viên
hoặc có cách bổ sung nhân sự khác.

### 4.2 MAX --- lấy giờ cao điểm làm chuẩn

``` text
shiftHeadcount = max(requiredStaff for each hour in shift)
```

Với cùng dữ liệu:

``` text
max(2, 2, 2, 3, 3, 2, 5, 3) = 5 nhân viên
```

**Ưu điểm** - Số nhân viên trong ca không thấp hơn nhu cầu ước tính ở
bất kỳ giờ nào trong ca. - Dễ giải thích với manager. - Logic đơn giản,
dễ triển khai và kiểm thử.

**Nhược điểm** - Có thể dư nhân sự ở những giờ vắng hơn. - Không trực
tiếp tối ưu chi phí nhân công.

### 4.3 So sánh AVG và MAX

  -----------------------------------------------------------------------
  Tiêu chí                AVG                     MAX
  ----------------------- ----------------------- -----------------------
  Cách tính               Trung bình nhu cầu      Nhu cầu cao nhất trong
                          trong ca, làm tròn lên  ca

  Giờ cao điểm            Có thể thiếu người      Được đáp ứng theo mô
                                                  hình

  Giờ thấp điểm           Có thể dư người         Dễ dư người

  Tổng giờ công           Thường thấp hơn MAX     Thường cao hơn AVG

  Độ phức tạp             Thấp                    Thấp

  Ưu tiên                 Giảm headcount trung    Không thiếu người ở giờ
                          bình                    cao điểm
  -----------------------------------------------------------------------

### 4.4 Quyết định hiện tại: MAX

Phiên bản đầu tiên sử dụng **MAX** vì: 1. Đây là cách rõ ràng để đảm bảo
giờ cao điểm không bị thiếu người theo ngưỡng N đã chọn. 2. Dễ giải
thích và kiểm chứng. 3. Phù hợp với phạm vi take-home assignment 4--6
giờ. 4. Không phải giải quyết đồng thời bài toán tối ưu thời lượng và
thời điểm bắt đầu/kết thúc ca.

Đây là lựa chọn ưu tiên coverage, chấp nhận khả năng overstaffing ở một
số giờ. Không nên mô tả MAX là phương án tối ưu chi phí.

## 5. Ví dụ tính toán với dữ liệu thứ Sáu

### 5.1 Ca sáng 07:00--15:00

  Giờ        Giao dịch   Required staff (N = 15)
  -------- ----------- -------------------------
  07--08            22                         2
  08--09            25                         2
  09--10            27                         2
  10--11            38                         3
  11--12            40                         3
  12--13            25                         2
  13--14            64                         5
  14--15            42                         3

Theo MAX:

``` text
shiftHeadcount = max(2, 2, 2, 3, 3, 2, 5, 3) = 5
```

Nếu 5 nhân viên đều làm đủ 8 tiếng:

``` text
Scheduled staff-hours = 5 × 8 = 40
Tổng required staff-hours theo giờ = 2 + 2 + 2 + 3 + 3 + 2 + 5 + 3 = 22
Chênh lệch = 40 - 22 = 18 staff-hours
```

### 5.2 Ca chiều 15:00--23:00

  Giờ        Giao dịch   Required staff (N = 15)
  -------- ----------- -------------------------
  15--16            30                         2
  16--17            19                         2
  17--18            27                         2
  18--19            18                         2
  19--20            24                         2
  20--21            34                         3
  21--22            12                         1
  22--23             5                         1

Theo MAX:

``` text
shiftHeadcount = max(2, 2, 2, 2, 2, 3, 1, 1) = 3
```

Nếu 3 nhân viên đều làm đủ 8 tiếng:

``` text
Scheduled staff-hours = 3 × 8 = 24
Tổng required staff-hours theo giờ = 2 + 2 + 2 + 2 + 2 + 3 + 1 + 1 = 15
Chênh lệch = 24 - 15 = 9 staff-hours
```

### 5.3 Tổng kết thứ Sáu

  Chỉ số                            Ca sáng   Ca chiều   Tổng
  ------------------------------- --------- ---------- ------
  Headcount theo MAX                      5          3      8
  Scheduled staff-hours                  40         24     64
  Required staff-hours theo giờ          22         15     37
  Chênh lệch                             18          9     27

Chênh lệch 27 staff-hours phản ánh số giờ công bố trí cao hơn tổng nhu
cầu ước tính theo từng giờ. Không nên kết luận toàn bộ 27 giờ là thời
gian nhân viên nhàn rỗi, vì nhân viên có thể làm các công việc khác
ngoài xử lý giao dịch.

## 6. Góc nhìn manager: giờ công dư thừa và chi phí

Giờ công là một nguồn chi phí. Nếu bố trí nhiều nhân viên hơn nhu cầu
thực tế trong thời gian dài, chi phí nhân công có thể tăng mà không tạo
thêm giá trị tương ứng.

Ví dụ minh họa với chi phí 30.000 VND/giờ:

  Cách tính                          Staff-hours   Chi phí giả định
  -------------------------------- ------------- ------------------
  Theo MAX                                    64      1.920.000 VND
  Theo tổng required staff-hours              37      1.110.000 VND
  Chênh lệch                                  27        810.000 VND

Đây chỉ là phép tính minh họa, không phải dữ liệu lương trong đề. 37
staff-hours cũng không mặc nhiên là lịch làm việc khả thi hoặc tối ưu.

**Trade-off:** MAX ưu tiên đủ người ở giờ cao điểm; manager có thể muốn
giảm giờ công dư thừa. Đây là lý do có thể cân nhắc Flexible Shifts ở
phiên bản sau.

## 7. Phương án mở rộng: Flexible Shifts

### 7.1 Ý tưởng

Thay vì chỉ dùng hai ca 8 tiếng, cho phép manager tạo ca có thời lượng
khác nhau, ví dụ: - 07:00--15:00 (8 tiếng) - 09:00--13:00 (4 tiếng) -
10:00--14:00 (4 tiếng) - 15:00--19:00 (4 tiếng)

Nhân viên còn tối đa 4 giờ trong tuần có thể được xếp ca 4 tiếng, thay
vì không thể nhận ca 8 tiếng.

    Giờ làm tối đa còn lại Ca 8 tiếng                  Ca 4 tiếng
  ------------------------ --------------------------- ---------------------------
                     4 giờ Không thể xếp               Có thể xếp
                     8 giờ Có thể xếp                  Có thể xếp
                    10 giờ Có thể xếp một ca 8 tiếng   Có thể xếp một ca 4 tiếng

Điều kiện là tổng giờ được xếp trong tuần không vượt maximum weekly
hours.

### 7.2 Lợi ích

-   Linh hoạt hơn khi phân bổ nhân viên.
-   Có thể bổ sung nhân sự đúng vào khung giờ cao điểm.
-   Có thể tận dụng phần giờ làm còn lại của nhân viên.
-   Có tiềm năng giảm giờ công dư thừa so với bố trí nguyên ca 8 tiếng.

### 7.3 Rủi ro và độ phức tạp

-   Phải chọn thời điểm bắt đầu và kết thúc ca sao cho coverage phù hợp.
-   Nhiều ca nhỏ có thể khiến roster khó đọc và quản lý.
-   Phải kiểm tra nhân viên có bị xếp hai ca trùng giờ không.
-   Cần tính lại coverage theo từng giờ sau mỗi thay đổi.
-   Chia ca ngắn không tự động giảm chi phí hoặc đáp ứng tốt hơn nhu
    cầu; chọn sai khung giờ vẫn có thể thiếu người.

Flexible Shifts không phải một công thức headcount thay thế AVG hoặc
MAX. Đây là cách thiết kế lịch linh hoạt hơn và có thể kết hợp với
phương pháp tính coverage theo giờ.

### 7.4 So sánh ba phương pháp

  -----------------------------------------------------------------------
  Tiêu chí          AVG               MAX               Flexible Shifts
  ----------------- ----------------- ----------------- -----------------
  Cách bố trí       Một headcount     Headcount bằng    Nhiều ca với thời
                    trung bình cho cả nhu cầu cao nhất  lượng và thời
                    ca                trong ca          điểm khác nhau

  Đảm bảo giờ cao   Không chắc chắn   Có, theo mô hình  Có thể, nếu chọn
  điểm                                                  ca phù hợp

  Khả năng giảm giờ Thường tốt hơn    Hạn chế           Có tiềm năng tốt
  công dư           MAX                                 

  Tận dụng nhân     Không nếu chỉ có  Không nếu chỉ có  Có
  viên còn ít giờ   ca 8 tiếng        ca 8 tiếng        

  Độ phức tạp       Thấp              Thấp              Cao hơn

  Quyết định        Không chọn cho    **Chọn cho phiên  Hướng mở rộng
                    baseline          bản đầu**         
  -----------------------------------------------------------------------

## 8. Phân công nhân viên vào ca

Sau khi xác định headcount cần cho từng ca, hệ thống chọn nhân viên để
điền vào các vị trí đó.

### 8.1 Ràng buộc

-   Không xếp nhân viên vượt maximum weekly hours.
-   Không xếp cùng một nhân viên vào các ca trùng thời gian.
-   Cố gắng phân bổ giờ làm tương đối công bằng.
-   Nếu không đủ nhân viên, hiển thị thiếu hụt thay vì âm thầm tạo lịch
    như thể đã đáp ứng đủ nhu cầu.

Quy tắc không xếp một nhân viên vào hai ca trùng thời gian là điều kiện
logic cần thiết. Việc cấm một nhân viên làm nhiều ca trong cùng ngày
nhưng không trùng giờ là một giả định bổ sung, không được đề quy định
rõ.

### 8.2 Heuristic phân bổ đơn giản

Có thể sử dụng chiến lược greedy:

1.  Duyệt từng ngày trong tuần.
2.  Duyệt từng shift trong ngày.
3.  Xác định số vị trí cần điền theo headcount.
4.  Tìm nhân viên còn đủ giờ để nhận ca và không bị trùng lịch.
5.  Ưu tiên nhân viên có tỷ lệ sử dụng giờ làm thấp hơn.

Một chỉ số tham khảo:

``` text
utilization = assignedWeeklyHours / maxWeeklyHours
```

Ví dụ:

  Nhân viên     Giờ tối đa/tuần   Đã xếp   Utilization
  ----------- ----------------- -------- -------------
  A                          40       20           50%
  B                          40       30           75%
  C                          20       10           50%

Nếu cần chọn giữa A và B, A có utilization thấp hơn nên có thể được ưu
tiên. Đây là heuristic để phân bổ tương đối công bằng, không phải thuật
toán tối ưu toàn cục.

### 8.3 Khi không đủ nhân viên

Ví dụ ca cần 5 người nhưng chỉ có 3 nhân viên đủ điều kiện: - Xếp 3
người hiện có. - Hiển thị số lượng còn thiếu. - Đánh dấu giờ bị
understaffed. - Không vượt maximum weekly hours để cố lấp đủ vị trí.

Đề yêu cầu xử lý rõ trường hợp nhu cầu vượt quá năng lực nhân sự hoặc
năng lực nhân sự dư thừa.

## 9. Bảng tổng hợp và cảnh báo

Mỗi ô trong bảng tương ứng một ngày và một giờ.

  Chỉ số                        Cách tính
  ----------------------------- ----------------------------------------
  Transactions                  Số giao dịch trong giờ
  Staff hours                   Số nhân viên được xếp làm trong giờ đó
  Transactions per staff hour   Transactions / Staff hours

Nếu không có nhân viên trong một giờ, hiển thị `–` thay vì chia cho 0.

### 9.1 Chỉ số tổng hợp tuần

**Total staff hours:** tổng staff-hours của tất cả ô trong tuần.

**Total transactions:** tổng giao dịch trong tuần.

**Overall transactions per staff hour:**

``` text
totalTransactions / totalStaffHours
```

**Average transactions per staff hour:** trung bình cộng các tỷ lệ
transactions/staff-hours của từng ô có nhân viên.

Hai chỉ số overall và average khác nhau: - Overall tính trên tổng giao
dịch và tổng giờ công. - Average cho mỗi ô giờ có nhân viên trọng số như
nhau.

### 9.2 Cảnh báo

Sau khi manager chỉnh sửa roster, hệ thống cần cập nhật summary và hiển
thị cảnh báo phù hợp: - Nhân viên vượt maximum weekly hours. - Một giờ
bị understaffed. - Có thể hiển thị overstaffing nếu số nhân viên thực tế
vượt nhu cầu ước tính.

Đề nêu rõ ví dụ cảnh báo vượt giờ tối đa và thiếu nhân viên. Cảnh báo
overstaffing là phần mở rộng hữu ích cho manager.

## 10. Phạm vi triển khai

### Core version

  -----------------------------------------------------------------------
  Hạng mục                            Quyết định
  ----------------------------------- -----------------------------------
  Demand estimation                   `ceil(transactions / 15)`, tối
                                      thiểu 1 khi cửa hàng mở

  N                                   Cố định bằng 15

  Default shifts                      07:00--15:00 và 15:00--23:00

  Shift headcount                     MAX nhu cầu nhân sự theo giờ trong
                                      shift

  Shift management                    Cho phép thêm, sửa, xóa shift

  Staff allocation                    Tôn trọng maximum weekly hours, ưu
                                      tiên phân bổ công bằng

  Insufficient staff                  Hiển thị coverage thiếu, không vượt
                                      giới hạn nhân sự

  Schedule editing                    Manager có thể assign, reassign,
                                      remove nhân viên

  Summary                             Tính lại theo roster sau khi chỉnh
                                      sửa

  Persistence                         Có thể dùng local storage theo lựa
                                      chọn triển khai
  -----------------------------------------------------------------------

### Chưa ưu tiên

-   Tự động tối ưu chi phí lương.
-   Tự động tìm tổ hợp ca ngắn và dài tối ưu.
-   Tối ưu toàn cục để tìm lịch công bằng nhất.
-   Availability hoặc ngày nghỉ của từng nhân viên.
-   Roles/skills như supervisor.
-   Drag-and-drop và export nếu không còn thời gian.

## 11. Giả định cần ghi trong README

1.  N = 15 là giả định để chuyển số giao dịch thành nhu cầu nhân sự,
    không phải dữ liệu năng suất đã được xác thực.
2.  Mỗi giờ cửa hàng hoạt động cần tối thiểu một nhân viên.
3.  Headcount của một shift được xác định bằng MAX nhu cầu nhân sự trong
    các giờ thuộc shift.
4.  Nhân viên không được xếp vượt maximum weekly hours.
5.  Nhân viên không được xếp vào các shift trùng thời gian.
6.  Khi không đủ nhân viên, hệ thống giữ lịch trong giới hạn nhân sự và
    hiển thị understaffing.
7.  Hai ca mặc định dài 8 tiếng, nhưng manager có thể tạo ca có thời
    lượng khác.
8.  Transaction count chỉ là proxy cho độ bận rộn; mô hình chưa tính đầy
    đủ công việc ngoài giao dịch và các yếu tố vận hành khác.

## 12. Kết luận

Pipeline của phiên bản đầu tiên:

``` text
CSV giao dịch
    |
    v
Nhu cầu nhân sự theo giờ
requiredStaff = max(1, ceil(transactions / 15))
    |
    v
Nhu cầu nhân sự theo ca
shiftHeadcount = MAX(requiredStaff trong ca)
    |
    v
Phân công nhân viên
- Không vượt maximum weekly hours
- Không xếp ca trùng giờ
- Cố gắng phân bổ công bằng
    |
    v
Weekly roster
- Manager xem và chỉnh sửa
    |
    v
Aggregated summary
- Transactions
- Staff hours
- Transactions per staff hour
- Tổng hợp tuần và cảnh báo
```

**Quyết định hiện tại:** triển khai MAX với hai ca mặc định trước. Đây
là baseline đơn giản, dễ giải thích và kiểm thử. Flexible Shifts là
hướng mở rộng hợp lý nếu muốn giảm giờ công dư thừa và tận dụng phần giờ
làm còn lại của nhân viên, nhưng chưa cần đưa vào phạm vi cốt lõi.
