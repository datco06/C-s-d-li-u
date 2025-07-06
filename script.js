document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://localhost:3000"; // Backend address

  // --- VIEW SWITCHING LOGIC ---
  // --- VIEW SWITCHING LOGIC (IMPROVED) ---
  const navLinks = document.querySelectorAll(".sidebar ul li");

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const sectionId = link.dataset.section;
      if (sectionId) {
        showSection(sectionId);
      }
    });
  });

  // Overwrite the global showSection to add data loading
  const originalShowSection = window.showSection;
  window.showSection = function (id) {
    originalShowSection(id); // Call the original function to switch views

    // Load data based on the new active section
    switch (id) {
      case "books":
        loadBooks();
        break;
      case "readers":
        loadReaders();
        break;
      case "reports":
        loadReports();
        break;
    }
  };

  // --- DATA LOADING FUNCTIONS ---

  // Load book list
  // Load book list (Updated with Search)
  async function loadBooks(searchTerm = "") {
    const tableBody = document.querySelector("#books table tbody");
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="6">Đang tìm kiếm...</td></tr>';
    try {
      // Thêm searchTerm vào URL
      const response = await fetch(
        `${API_URL}/api/sach?search=${encodeURIComponent(searchTerm)}`
      );
      const result = await response.json();
      if (result.success) {
        tableBody.innerHTML = ""; // Clear loading message
        if (result.data.length === 0) {
          tableBody.innerHTML =
            '<tr><td colspan="6">Không tìm thấy kết quả nào.</td></tr>';
        } else {
          result.data.forEach((book) => {
            const row = `
                    <tr>
                    <td>${book.MaSach}</td>
                    <td>${book.TenSach}</td>
                    <td>${book.TacGia || "N/A"}</td>
                    <td>${book.SoLuongCon}</td>
                    <td>${book.ViTri || "N/A"}</td>
                    <td><button>Xem</button> <button>Sửa</button></td>
                    </tr>
                `;
            tableBody.innerHTML += row;
          });
        }
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="6">❌ Lỗi khi tải dữ liệu: ${error.message}</td></tr>`;
    }
  }
  // Load reader list
  async function loadReaders() {
    const tableBody = document.querySelector("#readers table tbody");
    tableBody.innerHTML = '<tr><td colspan="5">Đang tải...</td></tr>';
    try {
      const response = await fetch(`${API_URL}/api/docgia/all`);
      const result = await response.json();
      if (result.success) {
        tableBody.innerHTML = "";
        result.data.forEach((reader) => {
          const row = `
            <tr>
              <td>${reader.MaDocGia}</td>
              <td>${reader.HoTen}</td>
              <td>${reader.Email}</td>
              <td>${reader.SDT}</td>
              <td>${reader.TrangThai}</td>
            </tr>
          `;
          tableBody.innerHTML += row;
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="5">❌ Lỗi khi tải dữ liệu: ${error.message}</td></tr>`;
    }
  }

  // Load reports data
  async function loadReports() {
    const tableBody = document.querySelector("#reports table tbody");
    tableBody.innerHTML = '<tr><td colspan="3">Đang tải...</td></tr>';
    try {
      const response = await fetch(`${API_URL}/api/baocao`);
      const result = await response.json();
      if (result.success) {
        tableBody.innerHTML = "";
        result.data.forEach((reportItem) => {
          const row = `
            <tr>
              <td>${reportItem.MaSach}</td>
              <td>${reportItem.TenSach}</td>
              <td>${reportItem.SoLuotMuon}</td>
            </tr>
          `;
          tableBody.innerHTML += row;
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="3">❌ Lỗi khi tải dữ liệu: ${error.message}</td></tr>`;
    }
  }

  // --- BUSINESS LOGIC FOR FORMS ---

  // 1. Reader Registration Process
  const formDangKy = document.getElementById("form-dang-ky"); // Assuming you have this form
  if (formDangKy) {
    const ketQuaDangKy = document.getElementById("dang-ky-ket-qua");
    formDangKy.addEventListener("submit", async (e) => {
      e.preventDefault();
      const docGiaData = {
        hoTen: document.getElementById("hoTen").value,
        ngaySinh: document.getElementById("ngaySinh").value,
        diaChi: document.getElementById("diaChi").value,
        sdt: document.getElementById("sdt").value,
        email: document.getElementById("email").value,
      };

      try {
        const response = await fetch(`${API_URL}/api/docgia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(docGiaData),
        });
        const result = await response.json();

        if (result.success) {
          ketQuaDangKy.innerHTML = `✅ Đăng ký thành công! Mã độc giả mới là: <strong>${result.maDocGia}</strong>`;
          ketQuaDangKy.className = "result-panel success";
          formDangKy.reset();
        } else {
          throw new Error(result.message || "Lỗi không xác định.");
        }
      } catch (error) {
        ketQuaDangKy.innerHTML = `❌ Có lỗi xảy ra: ${error.message}`;
        ketQuaDangKy.className = "result-panel error";
      }
    });
  }

  // 2. Book Borrowing Process
  const formMuonSach = document.getElementById("form-muon-sach"); // Assuming you have this form
  if (formMuonSach) {
    const ketQuaMuonSach = document.getElementById("muon-sach-ket-qua");
    formMuonSach.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        maDocGia: document.getElementById("maDocGia").value,
        maSach: document.getElementById("maSach").value,
      };

      try {
        const response = await fetch(`${API_URL}/api/phieumuon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();

        if (result.success) {
          ketQuaMuonSach.innerHTML = `✅ Tạo phiếu mượn thành công! Mã phiếu: <strong>${result.maPhieuMuon}</strong>.`;
          ketQuaMuonSach.className = "result-panel success";
          formMuonSach.reset();
        } else {
          throw new Error(result.message || "Lỗi không xác định.");
        }
      } catch (error) {
        ketQuaMuonSach.innerHTML = `❌ Không thể tạo phiếu mượn. Lý do: ${error.message}`;
        ketQuaMuonSach.className = "result-panel error";
      }
    });
  }

  // 3. Book Return Process
  const formTraSach = document.getElementById("form-tra-sach"); // Assuming you have this form
  if (formTraSach) {
    const ketQuaTraSach = document.getElementById("tra-sach-ket-qua");
    formTraSach.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        maSachTra: document.getElementById("maSachTra").value,
      };

      try {
        const response = await fetch(`${API_URL}/api/trasach`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();

        if (result.success) {
          if (result.overdue) {
            ketQuaTraSach.innerHTML = `⚠️ Ghi nhận trả sách thành công nhưng bị trễ hạn. Số tiền phạt là: <strong>${result.fee.toLocaleString(
              "vi-VN"
            )} VNĐ</strong>.`;
            ketQuaTraSach.className = "result-panel error";
          } else {
            ketQuaTraSach.innerHTML = `✅ Ghi nhận trả sách thành công, đúng hạn.`;
            ketQuaTraSach.className = "result-panel success";
          }
          formTraSach.reset();
        } else {
          throw new Error(result.message || "Lỗi không xác định.");
        }
      } catch (error) {
        ketQuaTraSach.innerHTML = `❌ Không thể trả sách. Lý do: ${error.message}`;
        ketQuaTraSach.className = "result-panel error";
      }
    });
  }
  // --- Xu ly luu thong tin doc gia ---
  const saveReaderBtn = document.getElementById("saveReaderBtn");

  if (saveReaderBtn) {
    // Chi thuc hien neu tim thay nut nay
    const saveReaderResult = document.getElementById("saveReaderResult");
    saveReaderBtn.addEventListener("click", async () => {
      // 1. Thu thap du lieu tu form
      const readerData = {
        maDocGia: document.getElementById("readerIdInput").value,
        hoTen: document.getElementById("readerNameInput").value,
        ngaySinh: document.getElementById("readerDobInput").value,
        gioiTinh: document.getElementById("readerGenderInput").value,
        diaChi: document.getElementById("readerAddressInput").value,
        sdt: document.getElementById("readerPhoneInput").value,
        email: document.getElementById("readerEmailInput").value,

        maThe: document.getElementById("cardIdInput").value,
        ngayDangKi: document.getElementById("cardRegisterDateInput").value,
        ngayHetHan: document.getElementById("cardExpiryDateInput").value,
        trangThaiThe: document.getElementById("cardStatusSelect").value,
      };
      if (!readerData.maDocGia || !readerData.hoTen || !readerData.maThe) {
        saveReaderResult.style.color = "red";
        saveReaderResult.textContent =
          "❌ Vui lòng điền mã độc giả, họ tên và mã thẻ.";
        return; // Dung xu ly
      }
      if (
        !readerData.ngaySinh ||
        !readerData.ngayDangKi ||
        !readerData.ngayHetHan
      ) {
        saveReaderResult.style.color = "red";
        saveReaderResult.textContent =
          "❌ Vui lòng chọn đầy đủ các trường ngày tháng.";
        return; // Dung xu ly
      }

      // 2. Gui du lieu len API
      try {
        const response = await fetch(`${API_URL}/api/docgia/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(readerData),
        });
        const result = await response.json();

        if (result.success) {
          saveReaderResult.style.color = "green";
          saveReaderResult.textContent = result.message;
          // Tai lai danh sach doc gia de cap nhat bang
          loadReaders();
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        saveReaderResult.style.color = "red";
        saveReaderResult.textContent = `❌ Có lỗi xảy ra: ${error.message}`;
      }
    });
  }
  // Them vao cuoi file, TRUOC dau ngoac dong }); cua DOMContentLoaded
  // --- XU LY FORM THEM SACH MOI ---
  const showAddBookFormBtn = document.getElementById("showAddBookFormBtn");
  const addBookFormContainer = document.getElementById("addBookFormContainer");
  const cancelAddBookBtn = document.getElementById("cancelAddBookBtn");
  const addBookForm = document.getElementById("addBookForm");
  const addBookResult = document.getElementById("addBookResult");

  if (showAddBookFormBtn) {
    // An/hien form
    showAddBookFormBtn.addEventListener("click", () => {
      addBookFormContainer.style.display = "block";
    });
    cancelAddBookBtn.addEventListener("click", () => {
      addBookFormContainer.style.display = "none";
    });

    // Xu ly submit form
    addBookForm.addEventListener("submit", async (e) => {
      e.preventDefault(); // Ngan chan form gui theo cach truyen thong

      const newBookData = {
        maSach: document.getElementById("addMaSach").value,
        tenSach: document.getElementById("addTenSach").value,
        nxb: document.getElementById("addNXB").value,
        namXB: document.getElementById("addNamXB").value,
        giaTien: document.getElementById("addGiaTien").value,
        soLuongNhap: document.getElementById("addSoLuongNhap").value,
        ngayNhap: document.getElementById("addNgayNhap").value,
        maTacGia: document.getElementById("addMaTacGia").value,
        maTheLoai: document.getElementById("addMaTheLoai").value,
        maBia: document.getElementById("addMaBia").value,
        maViTri: document.getElementById("addMaViTri").value,
      };

      try {
        const response = await fetch(`${API_URL}/api/sach/add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newBookData),
        });
        const result = await response.json();

        if (result.success) {
          addBookResult.style.color = "green";
          addBookResult.textContent = result.message;
          addBookForm.reset(); // Xoa du lieu tren form
          setTimeout(() => {
            addBookFormContainer.style.display = "none"; // An form di
            addBookResult.textContent = "";
          }, 2000);
          loadBooks(); // Tai lai danh sach sach
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        addBookResult.style.color = "red";
        addBookResult.textContent = `❌ Lỗi: ${error.message}`;
      }
    });
  }
  // Them vao cuoi file, TRUOC dau ngoac dong }); cua DOMContentLoaded
  // --- XU LY TIM KIEM SACH ---
  let debounceTimer;
  const bookSearchInput = document.getElementById("bookSearchInput");

  if (bookSearchInput) {
    bookSearchInput.addEventListener("input", (e) => {
      // Xóa bộ đếm thời gian cũ mỗi khi người dùng gõ
      clearTimeout(debounceTimer);

      // Đặt một bộ đếm thời gian mới
      debounceTimer = setTimeout(() => {
        const searchTerm = e.target.value;
        loadBooks(searchTerm); // Gọi hàm loadBooks với từ khóa tìm kiếm
      }, 500); // Chờ 500ms sau khi người dùng ngừng gõ
    });
  }
  // Them vao cuoi file, TRUOC dau ngoac dong }); cua DOMContentLoaded
  // --- XU LY LOGIC TAO PHIEU MUON ---

  // --- XU LY LOGIC TAO PHIEU MUON ---

  // Biến toàn cục để lưu trạng thái
  let booksToBorrow = [];

  // Lấy các element từ DOM
  const borrowReaderIdInput = document.getElementById("borrowReaderIdInput");
  const readerInfoDiv = document.getElementById("readerInfoDiv");
  const borrowBookIdInput = document.getElementById("borrowBookIdInput");
  const addBookToLoanBtn = document.getElementById("addBookToLoanBtn");
  const loanDetailsTbody = document.getElementById("loanDetailsTbody");
  const confirmLoanBtn = document.getElementById("confirmLoanBtn");
  const loanResult = document.getElementById("loanResult");
  // Thêm vào gần các khai báo const của mục phiếu mượn
  const loanDateInput = document.getElementById("loanDateInput");
  const returnDateInput = document.getElementById("returnDateInput");

  // Tự động điền ngày mặc định khi trang tải xong
  if (loanDateInput && returnDateInput) {
    const today = new Date();
    const returnDate = new Date();
    returnDate.setDate(today.getDate() + 14);

    // Định dạng ngày thành YYYY-MM-DD và gán giá trị
    loanDateInput.value = today.toISOString().split("T")[0];
    returnDateInput.value = returnDate.toISOString().split("T")[0];
  }

  // ✅ LOGIC MỚI: Lắng nghe sự kiện Enter trên ô Mã độc giả
  if (borrowReaderIdInput) {
    borrowReaderIdInput.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Ngăn form submit
        const readerId = borrowReaderIdInput.value.trim();
        if (!readerId) {
          readerInfoDiv.innerHTML = "";
          return;
        }

        try {
          const response = await fetch(`${API_URL}/api/docgia/${readerId}`);
          const result = await response.json();
          if (result.success) {
            readerInfoDiv.innerHTML = `<strong>Họ tên:</strong> ${
              result.data.HoTen
            } | <strong>Trạng thái thẻ:</strong> <span style="color: ${
              result.data.TrangThai === "Đang còn hạn" ? "green" : "red"
            }">${result.data.TrangThai}</span>`;
          } else {
            readerInfoDiv.style.color = "red";
            readerInfoDiv.textContent = result.message;
          }
        } catch (error) {
          readerInfoDiv.style.color = "red";
          readerInfoDiv.textContent = "Lỗi kết nối đến máy chủ.";
        }
      }
    });
  }

  // Hàm để vẽ lại bảng chi tiết phiếu mượn
  function renderLoanTable() {
    if (!loanDetailsTbody) return;
    loanDetailsTbody.innerHTML = ""; // Xóa bảng cũ
    booksToBorrow.forEach((book, index) => {
      // ✅ CẢI TIẾN: Xử lý trường hợp giá tiền có thể không tồn tại
      const giaTienFormatted = book.GiaTien
        ? Number(book.GiaTien).toLocaleString("vi-VN") + "đ"
        : "N/A";
      const row = `
            <tr>
                <td>${book.MaSach}</td>
                <td>${book.TenSach}</td>
                <td>${giaTienFormatted}</td>
                <td><button class="remove-book-btn" data-index="${index}">Xóa</button></td>
            </tr>
        `;
      loanDetailsTbody.innerHTML += row;
    });
  }

  // Su kien khi nhan nut "Them vao phieu"
  if (addBookToLoanBtn) {
    addBookToLoanBtn.addEventListener("click", async () => {
      const maSach = borrowBookIdInput.value.trim();
      if (!maSach) return;

      try {
        const response = await fetch(`${API_URL}/api/sach/${maSach}`);
        const result = await response.json();
        if (result.success) {
          if (booksToBorrow.find((b) => b.MaSach === result.data.MaSach)) {
            alert("Sách này đã có trong phiếu mượn.");
            return;
          }
          booksToBorrow.push(result.data);
          renderLoanTable();
          borrowBookIdInput.value = "";
        } else {
          alert(result.message);
        }
      } catch (error) {
        alert("Lỗi khi tìm thông tin sách.");
      }
    });
  }

  // Su kien khi nhan nut "Xoa" sach khoi phieu
  if (loanDetailsTbody) {
    loanDetailsTbody.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-book-btn")) {
        const indexToRemove = parseInt(e.target.dataset.index, 10);
        booksToBorrow.splice(indexToRemove, 1);
        renderLoanTable();
      }
    });
  }

  // Su kien khi nhan nut "XAC NHAN CHO MUON"
  // Su kien khi nhan nut "XAC NHAN CHO MUON"
  if (confirmLoanBtn) {
    confirmLoanBtn.addEventListener("click", async () => {
      const currentReaderId = borrowReaderIdInput.value.trim();
      if (!currentReaderId) {
        alert("Vui lòng nhập mã độc giả và nhấn Enter để xác thực.");
        return;
      }
      if (booksToBorrow.length === 0) {
        alert("Vui lòng thêm ít nhất một cuốn sách vào phiếu.");
        return;
      }

      // ✅ Lấy thêm ngày mượn và ngày trả từ input
      const ngayMuon = loanDateInput.value;
      const ngayTraDuKien = returnDateInput.value;

      if (!ngayMuon || !ngayTraDuKien) {
        alert("Vui lòng chọn ngày mượn và ngày trả dự kiến.");
        return;
      }

      const payload = {
        maDocGia: currentReaderId,
        maSachArray: booksToBorrow.map((book) => book.MaSach),
        ngayMuon: ngayMuon, // Thêm vào payload
        ngayTraDuKien: ngayTraDuKien, // Thêm vào payload
      };

      try {
        const response = await fetch(`${API_URL}/api/phieumuon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (result.success) {
          loanResult.style.color = "green";
          loanResult.textContent = `${result.message} Mã phiếu là: ${result.maPhieuMuon}`;
          // Reset form
          booksToBorrow = [];
          borrowReaderIdInput.value = "";
          readerInfoDiv.innerHTML = "";
          renderLoanTable();
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        loanResult.style.color = "red";
        loanResult.textContent = `❌ Lỗi: ${error.message}`;
      }
    });
  }
  // Them vao cuoi file, TRUOC dau ngoac dong }); cua DOMContentLoaded
  // --- XU LY LOGIC TRA SACH ---
  // --- XU LY LOGIC TRA SACH (Quy trình 2 bước mới) ---
  const returnSearchInput = document.getElementById("returnSearchInput");
  const findLoanBtn = document.getElementById("findLoanBtn");
  const returnDetailsDiv = document.getElementById("returnDetailsDiv");
  const fineSlipSection = document.getElementById("fineSlipSection");
  const returnResult = document.getElementById("returnResult");
  // Nút hành động
  const confirmReturnOnlyBtn = document.getElementById("confirmReturnOnlyBtn");
  const generateFineBtn = document.getElementById("generateFineBtn");
  const finalizeBtn = document.getElementById("finalizeBtn");

  let currentLoanData = null; // Lưu dữ liệu phiếu mượn và phiếu phạt

  // Hàm reset giao diện
  function resetReturnForm() {
    returnDetailsDiv.innerHTML = "";
    fineSlipSection.style.display = "none";
    confirmReturnOnlyBtn.style.display = "none";
    generateFineBtn.style.display = "none";
    finalizeBtn.style.display = "none";
    returnResult.textContent = "";
    currentLoanData = null;
  }

  // Sự kiện TÌM phiếu mượn
  if (findLoanBtn) {
    findLoanBtn.addEventListener("click", async () => {
      const maPhieu = returnSearchInput.value.trim();
      resetReturnForm();
      if (!maPhieu) return;

      try {
        const response = await fetch(`${API_URL}/api/phieumuon/${maPhieu}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        currentLoanData = { phieuMuon: result.data };
        returnDetailsDiv.innerHTML = `<p><strong>Độc giả:</strong> ${
          result.data.HoTen
        } | <strong>Hạn trả:</strong> ${new Date(
          result.data.NgayTraDuKien
        ).toLocaleDateString("vi-VN")}</p>`;

        if (result.data.TrangThai !== "Đang mượn") {
          returnDetailsDiv.innerHTML += `<p><strong>Trạng thái:</strong> Phiếu đã được xử lý.</p>`;
          return;
        }

        const dueDate = new Date(result.data.NgayTraDuKien);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (today > dueDate) {
          // Có phạt
          const timeDiff = today.getTime() - dueDate.getTime();
          const daysLate = Math.ceil(timeDiff / (1000 * 3600 * 24));
          const fineAmount = daysLate * 5000;
          currentLoanData.soTienPhat = fineAmount;
          returnDetailsDiv.innerHTML += `<p style="color:red; font-weight:bold;">TRỄ HẠN ${daysLate} NGÀY! TIỀN PHẠT: ${fineAmount.toLocaleString(
            "vi-VN"
          )}đ</p>`;
          generateFineBtn.style.display = "block";
        } else {
          // Không phạt
          currentLoanData.soTienPhat = 0;
          confirmReturnOnlyBtn.style.display = "block";
        }
      } catch (error) {
        returnDetailsDiv.textContent = `❌ Lỗi: ${error.message}`;
      }
    });
  }

  // Sự kiện LẬP PHIẾU PHẠT
  if (generateFineBtn) {
    generateFineBtn.addEventListener("click", async () => {
      try {
        const response = await fetch(`${API_URL}/api/phieuphat/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maPhieu: currentLoanData.phieuMuon.MaPhieu,
            soTienPhat: currentLoanData.soTienPhat,
          }),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        currentLoanData.phieuPhat = { MaPhieuPhat: result.maPhieuPhat };

        // Hiển thị thông tin phiếu phạt
        document.getElementById("fineSlipIdDisplay").textContent =
          result.maPhieuPhat;
        document.getElementById(
          "fineAmountDisplay"
        ).textContent = `${currentLoanData.soTienPhat.toLocaleString(
          "vi-VN"
        )}đ`;
        fineSlipSection.style.display = "block";

        // Chuyển đổi nút
        generateFineBtn.style.display = "none";
        finalizeBtn.style.display = "block";
      } catch (error) {
        returnResult.style.color = "red";
        returnResult.textContent = `❌ Lỗi khi lập phiếu phạt: ${error.message}`;
      }
    });
  }

  // Hàm chung để hoàn tất trả sách
  async function finalizeReturn() {
    if (!currentLoanData) return;
    try {
      const payload = {
        maPhieu: currentLoanData.phieuMuon.MaPhieu,
        maPhieuPhat: currentLoanData.phieuPhat
          ? currentLoanData.phieuPhat.MaPhieuPhat
          : null,
      };
      const response = await fetch(`${API_URL}/api/phieumuon/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      returnResult.style.color = "green";
      returnResult.textContent = result.message;
      resetReturnForm();
      returnSearchInput.value = "";
    } catch (error) {
      returnResult.style.color = "red";
      returnResult.textContent = `❌ Lỗi: ${error.message}`;
    }
  }

  // Gán sự kiện cho 2 nút cuối
  if (confirmReturnOnlyBtn)
    confirmReturnOnlyBtn.addEventListener("click", finalizeReturn);
  if (finalizeBtn) finalizeBtn.addEventListener("click", finalizeReturn);
  // --- KẾT THÚC LOGIC TẠO PHIẾU MƯỢN ---
});
