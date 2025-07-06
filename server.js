const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION CONFIGURATION ---
const dbConfig = {
  host: "127.0.0.1",
  user: "root",
  password: "123456", // <-- IMPORTANT: REPLACE WITH YOUR MYSQL PASSWORD
  database: "QuanLyThuVien",
};

// --- API ENDPOINTS ---

// API #1: Register a New Reader
app.post("/api/docgia", async (req, res) => {
  const { hoTen, ngaySinh, diaChi, sdt, email } = req.body;

  if (!hoTen || !ngaySinh || !sdt || !email) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng điền đầy đủ thông tin bắt buộc.",
    });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    const maDocGia = "DG" + Date.now().toString().slice(-6);
    const sqlDocGia =
      "INSERT INTO DocGia (MaDocGia, HoTen, NgaySinh, DiaChi, SDT, Email) VALUES (?, ?, ?, ?, ?, ?)";
    await connection.execute(sqlDocGia, [
      maDocGia,
      hoTen,
      ngaySinh,
      diaChi,
      sdt,
      email,
    ]);

    const maThe = "THE" + Date.now().toString().slice(-6);
    const ngayDangKi = new Date();
    const ngayHetHan = new Date();
    ngayHetHan.setFullYear(ngayHetHan.getFullYear() + 4);

    const sqlTheThuVien =
      "INSERT INTO TheThuVien (MaThe, NgayDangKi, NgayHetHan, TrangThai, MaDocGia) VALUES (?, ?, ?, ?, ?)";
    await connection.execute(sqlTheThuVien, [
      maThe,
      ngayDangKi,
      ngayHetHan,
      "Đang còn hạn",
      maDocGia,
    ]);

    await connection.commit();
    res.status(201).json({ success: true, maDocGia: maDocGia });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi khi đăng ký độc giả:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
  } finally {
    if (connection) await connection.end();
  }
});

// API #2: Create a Book Loan Slip
// API #2: Tạo Phiếu Mượn Sách (Nâng cấp cho nhiều sách)
// API #2: Tạo Phiếu Mượn Sách (Nâng cấp cuối cùng)
app.post("/api/phieumuon", async (req, res) => {
  // ✅ Nhận thêm ngayMuon và ngayTraDuKien từ body
  const { maDocGia, maSachArray, ngayMuon, ngayTraDuKien } = req.body;

  if (
    !maDocGia ||
    !maSachArray ||
    !Array.isArray(maSachArray) ||
    maSachArray.length === 0 ||
    !ngayMuon ||
    !ngayTraDuKien
  ) {
    return res.status(400).json({
      success: false,
      message: "Thiếu thông tin bắt buộc (mã độc giả, sách, ngày mượn/trả).",
    });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    // 1. Kiểm tra độc giả (giữ nguyên)
    const [theRows] = await connection.execute(
      "SELECT TrangThai FROM TheThuVien WHERE MaDocGia = ?",
      [maDocGia]
    );
    if (theRows.length === 0 || theRows[0].TrangThai !== "Đang còn hạn") {
      throw new Error(
        "Thẻ thư viện của độc giả đã hết hạn hoặc không tồn tại."
      );
    }
    const [phieuQuaHan] = await connection.execute(
      "SELECT * FROM PhieuMuon WHERE MaDocGia = ? AND TrangThai = 'Quá hạn'",
      [maDocGia]
    );
    if (phieuQuaHan.length > 0) {
      throw new Error("Độc giả đang có sách mượn quá hạn.");
    }

    // 2. Kiểm tra tất cả sách trong danh sách (giữ nguyên)
    for (const maSach of maSachArray) {
      const [sachRows] = await connection.execute(
        "SELECT SoLuongCon FROM Sach WHERE MaSach = ?",
        [maSach]
      );
      if (sachRows.length === 0 || sachRows[0].SoLuongCon <= 0) {
        throw new Error(`Sách với mã ${maSach} đã hết hoặc không tồn tại.`);
      }
    }

    // 3. Tạo phiếu mượn mới
    const maPhieu = "PM" + Date.now().toString().slice(-6);
    const maNhanVien = "NV001"; // Giả định

    // ❌ Bỏ phần tự động tính toán ngày
    // ✅ Sử dụng ngày tháng từ payload do người dùng gửi lên
    const sqlPhieuMuon =
      "INSERT INTO PhieuMuon (MaPhieu, NgayMuon, NgayTraDuKien, TrangThai, MaDocGia, MaNhanVien) VALUES (?, ?, ?, 'Đang mượn', ?, ?)";
    await connection.execute(sqlPhieuMuon, [
      maPhieu,
      ngayMuon,
      ngayTraDuKien,
      maDocGia,
      maNhanVien,
    ]);

    // 4. Thêm chi tiết phiếu mượn và cập nhật số lượng (giữ nguyên)
    for (const maSach of maSachArray) {
      const sqlChiTiet =
        "INSERT INTO ChiTietPhieuMuon (MaPhieu, MaSach, SoLuong) VALUES (?, ?, 1)";
      await connection.execute(sqlChiTiet, [maPhieu, maSach]);
      const sqlUpdateSach =
        "UPDATE Sach SET SoLuongCon = SoLuongCon - 1 WHERE MaSach = ?";
      await connection.execute(sqlUpdateSach, [maSach]);
    }

    await connection.commit();
    res.status(201).json({
      success: true,
      message: "Tạo phiếu mượn thành công!",
      maPhieuMuon: maPhieu,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi khi tạo phiếu mượn:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.end();
  }
});
// API #3: Process Book Return
app.post("/api/trasach", async (req, res) => {
  const { maSachTra } = req.body;

  if (!maSachTra) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu mã sách cần trả." });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    const sqlFindLoan = `
            SELECT pm.MaPhieu, pm.NgayTraDuKien, s.GiaTien
            FROM PhieuMuon pm
            JOIN ChiTietPhieuMuon ctpm ON pm.MaPhieu = ctpm.MaPhieu
            JOIN Sach s ON ctpm.MaSach = s.MaSach
            WHERE ctpm.MaSach = ? AND pm.TrangThai = 'Đang mượn'
            LIMIT 1
        `;
    const [loanRows] = await connection.execute(sqlFindLoan, [maSachTra]);

    if (loanRows.length === 0) {
      throw new Error("Không tìm thấy phiếu mượn đang hoạt động cho sách này.");
    }
    const { MaPhieu, NgayTraDuKien, GiaTien } = loanRows[0];

    const ngayTraThuc = new Date();
    const isLate = ngayTraThuc > new Date(NgayTraDuKien);
    const trangThaiMoi = "Đã trả";

    const sqlUpdateLoan =
      "UPDATE PhieuMuon SET NgayTraThuc = ?, TrangThai = ? WHERE MaPhieu = ?";
    await connection.execute(sqlUpdateLoan, [
      ngayTraThuc,
      trangThaiMoi,
      MaPhieu,
    ]);

    const sqlUpdateStock =
      "UPDATE Sach SET SoLuongCon = SoLuongCon + 1 WHERE MaSach = ?";
    await connection.execute(sqlUpdateStock, [maSachTra]);

    if (isLate) {
      const soTienPhat = GiaTien * 0.2;
      const maPhieuPhat = "PP" + Date.now().toString().slice(-6);
      const sqlInsertFine =
        "INSERT INTO PhieuPhat (MaPhieuPhat, MaPhieu, SoTien, TrangThai) VALUES (?, ?, ?, 'Chưa thanh toán')";
      await connection.execute(sqlInsertFine, [
        maPhieuPhat,
        MaPhieu,
        soTienPhat,
      ]);

      await connection.commit();
      return res.json({ success: true, overdue: true, fee: soTienPhat });
    }

    await connection.commit();
    res.json({ success: true, overdue: false });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi khi trả sách:", error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

// API #4: GET All Books
// API #4: GET All Books (Updated with Search)
app.get("/api/sach", async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // Lấy từ khóa tìm kiếm từ query parameter
    const { search = "" } = req.query;
    const searchQuery = `%${search}%`; // Thêm ký tự '%' cho truy vấn LIKE

    let sql = `
          SELECT 
              s.MaSach, 
              s.TenSach, 
              s.SoLuongCon,
              v.GhiChu AS ViTri,
              GROUP_CONCAT(tg.TenTacGia SEPARATOR ', ') AS TacGia
          FROM Sach s
          LEFT JOIN ViTri v ON s.MaViTri = v.MaViTri
          LEFT JOIN TacGia_Sach tgs ON s.MaSach = tgs.MaSach
          LEFT JOIN TacGia tg ON tgs.MaTacGia = tg.MaTacGia
      `;

    // Chỉ thêm điều kiện WHERE nếu có từ khóa tìm kiếm
    if (search) {
      sql += ` WHERE s.TenSach LIKE ? OR tg.TenTacGia LIKE ? OR s.MaSach LIKE ?`;
    }

    sql += ` GROUP BY s.MaSach`;

    // Nếu có tìm kiếm, truyền 3 tham số. Nếu không, không truyền tham số nào.
    const params = search ? [searchQuery, searchQuery, searchQuery] : [];

    const [rows] = await connection.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sách:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
  } finally {
    if (connection) await connection.end();
  }
});
// API để lấy thông tin của một cuốn sách cụ thể
app.get("/api/sach/:id", async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    // Lấy các thông tin cần thiết cho phiếu mượn
    const [rows] = await connection.execute(
      "SELECT MaSach, TenSach, GiaTien FROM Sach WHERE MaSach = ?",
      [req.params.id]
    );

    if (rows.length > 0) {
      res.json({ success: true, data: rows[0] });
    } else {
      // Nếu không tìm thấy, trả về lỗi 404
      res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sách với mã này." });
    }
  } catch (error) {
    console.error("Lỗi khi tìm sách:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
  } finally {
    if (connection) await connection.end();
  }
});

// API #5: GET All Readers
app.get("/api/docgia/all", async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const sql = `
            SELECT dg.MaDocGia, dg.HoTen, dg.Email, dg.SDT, tt.TrangThai 
            FROM DocGia dg
            JOIN TheThuVien tt ON dg.MaDocGia = tt.MaDocGia
        `;
    const [rows] = await connection.execute(sql);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách độc giả:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
  } finally {
    if (connection) await connection.end();
  }
});
// API để lấy thông tin của một độc giả
app.get("/api/docgia/:id", async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const sql = `
          SELECT dg.MaDocGia, dg.HoTen, tt.TrangThai 
          FROM DocGia dg 
          JOIN TheThuVien tt ON dg.MaDocGia = tt.MaDocGia 
          WHERE dg.MaDocGia = ?
      `;
    const [rows] = await connection.execute(sql, [req.params.id]);

    if (rows.length > 0) {
      res.json({ success: true, data: rows[0] });
    } else {
      res
        .status(404)
        .json({ success: false, message: "Không tìm thấy độc giả." });
    }
  } catch (error) {
    console.error("Lỗi khi lấy thông tin độc giả:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  } finally {
    if (connection) await connection.end();
  }
});
// API #6: GET Borrowing Report
// API #6: GET Borrowing Report (Updated with Date Filter)
app.get("/api/baocao", async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const { startDate, endDate } = req.query;

    // Bắt buộc phải join thêm bảng PhieuMuon để lọc theo NgayMuon
    let sql = `
          SELECT 
              s.MaSach, 
              s.TenSach, 
              COUNT(ctpm.MaSach) AS SoLuotMuon
          FROM ChiTietPhieuMuon ctpm
          JOIN Sach s ON ctpm.MaSach = s.MaSach
          JOIN PhieuMuon pm ON ctpm.MaPhieu = pm.MaPhieu
      `;

    const params = [];

    // Nếu người dùng cung cấp khoảng thời gian, thêm điều kiện WHERE
    if (startDate && endDate) {
      sql += ` WHERE pm.NgayMuon BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    sql += `
          GROUP BY s.MaSach, s.TenSach
          ORDER BY SoLuotMuon DESC
      `;

    const [rows] = await connection.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Lỗi khi tạo báo cáo:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
  } finally {
    if (connection) await connection.end();
  }
});
// API #7: LUU THONG TIN DOC GIA (THEM MOI / CAP NHAT)
app.post("/api/docgia/save", async (req, res) => {
  // Lấy toàn bộ dữ liệu từ frontend gửi lên
  const {
    maDocGia,
    hoTen,
    ngaySinh,
    gioiTinh,
    diaChi,
    sdt,
    email,
    maThe,
    ngayDangKi,
    ngayHetHan,
    trangThaiThe,
  } = req.body;

  // Kiem tra du lieu co ban
  if (!maDocGia || !hoTen || !maThe) {
    return res.status(400).json({
      success: false,
      message: "Mã độc giả, họ tên và mã thẻ là bắt buộc.",
    });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction(); // Bat dau transaction

    // --- Xu ly bang DocGia ---
    const sqlDocGia = `
            INSERT INTO DocGia (MaDocGia, HoTen, NgaySinh, GioiTinh, DiaChi, SDT, Email)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                HoTen = VALUES(HoTen),
                NgaySinh = VALUES(NgaySinh),
                GioiTinh = VALUES(GioiTinh),
                DiaChi = VALUES(DiaChi),
                SDT = VALUES(SDT),
                Email = VALUES(Email)
        `;
    await connection.execute(sqlDocGia, [
      maDocGia,
      hoTen,
      ngaySinh,
      gioiTinh,
      diaChi,
      sdt,
      email,
    ]);

    // --- Xu ly bang TheThuVien ---
    const sqlTheThuVien = `
            INSERT INTO TheThuVien (MaThe, NgayDangKi, NgayHetHan, TrangThai, MaDocGia)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                NgayDangKi = VALUES(NgayDangKi),
                NgayHetHan = VALUES(NgayHetHan),
                TrangThai = VALUES(TrangThai)
        `;
    await connection.execute(sqlTheThuVien, [
      maThe,
      ngayDangKi,
      ngayHetHan,
      trangThaiThe,
      maDocGia,
    ]);

    await connection.commit(); // Luu tat ca thay doi neu khong co loi
    res.json({ success: true, message: "Lưu thông tin độc giả thành công!" });
  } catch (error) {
    if (connection) await connection.rollback(); // Hoan tac thay doi neu co loi
    console.error("Lỗi khi lưu thông tin độc giả:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
  } finally {
    if (connection) await connection.end();
  }
});
// API #8: THEM SACH MOI
app.post("/api/sach/add", async (req, res) => {
  // Lay du lieu tu body cua request
  const {
    maSach,
    tenSach,
    nxb,
    namXB,
    giaTien,
    soLuongNhap,
    ngayNhap,
    maTacGia,
    maTheLoai,
    maBia,
    maViTri,
  } = req.body;

  // Kiem tra cac truong bat buoc
  if (!maSach || !tenSach || !soLuongNhap || !ngayNhap || !maTacGia) {
    return res.status(400).json({
      success: false,
      message:
        "Vui lòng điền các thông tin bắt buộc: Mã sách, Tên sách, Số lượng, Ngày nhập, Mã tác giả.",
    });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction(); // Bat dau transaction

    // 1. Them vao bang Sach
    const sqlSach = `
          INSERT INTO Sach (MaSach, TenSach, NXB, NamXB, GiaTien, SoLuongNhap, SoLuongCon, NgayNhap, MaTheLoai, MaBia, MaViTri)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
    // SoLuongCon ban dau bang SoLuongNhap
    await connection.execute(sqlSach, [
      maSach,
      tenSach,
      nxb,
      namXB,
      giaTien,
      soLuongNhap,
      soLuongNhap,
      ngayNhap,
      maTheLoai,
      maBia,
      maViTri,
    ]);

    // 2. Them vao bang lien ket TacGia_Sach
    const sqlTacGiaSach = `
          INSERT INTO TacGia_Sach (MaTacGia, MaSach, VaiTro) VALUES (?, ?, ?)
      `;
    await connection.execute(sqlTacGiaSach, [
      maTacGia,
      maSach,
      "Tác giả chính",
    ]);

    await connection.commit(); // Luu thay doi neu moi thu thanh cong
    res
      .status(201)
      .json({ success: true, message: `Thêm sách "${tenSach}" thành công!` });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi khi thêm sách mới:", error);
    // Tra ve thong bao loi cu the tu database
    res.status(500).json({
      success: false,
      message: error.sqlMessage || "Lỗi máy chủ nội bộ.",
    });
  } finally {
    if (connection) await connection.end();
  }
});
// API #9: TIM THONG TIN PHIEU MUON
app.get("/api/phieumuon/:id", async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const maPhieu = req.params.id;

    // Lấy thông tin phiếu và độc giả
    const [phieuRows] = await connection.execute(
      `SELECT pm.MaPhieu, pm.NgayMuon, pm.NgayTraDuKien, pm.TrangThai, dg.HoTen 
           FROM PhieuMuon pm 
           JOIN DocGia dg ON pm.MaDocGia = dg.MaDocGia 
           WHERE pm.MaPhieu = ?`,
      [maPhieu]
    );

    if (phieuRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu mượn." });
    }

    // Lấy thông tin các sách đã mượn
    const [sachRows] = await connection.execute(
      `SELECT s.MaSach, s.TenSach 
           FROM ChiTietPhieuMuon ctpm 
           JOIN Sach s ON ctpm.MaSach = s.MaSach 
           WHERE ctpm.MaPhieu = ?`,
      [maPhieu]
    );

    res.json({ success: true, data: { ...phieuRows[0], sachMuon: sachRows } });
  } catch (error) {
    console.error("Lỗi khi tìm phiếu mượn:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
  } finally {
    if (connection) await connection.end();
  }
});

// API #10: XU LY TRA SACH VA TAO PHIEU PHAT
// API #10 (Mới): LẬP PHIẾU PHẠT
app.post("/api/phieuphat/create", async (req, res) => {
  const { maPhieu, soTienPhat } = req.body;
  if (!maPhieu || soTienPhat <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu thông tin để lập phiếu phạt." });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    // Kiểm tra xem phiếu này đã có phiếu phạt chưa
    const [existing] = await connection.execute(
      "SELECT MaPhieuPhat FROM PhieuPhat WHERE MaPhieu = ?",
      [maPhieu]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Phiếu mượn này đã tồn tại phiếu phạt.",
        maPhieuPhat: existing[0].MaPhieuPhat,
      });
    }

    const maPhieuPhat = "PP" + Date.now().toString().slice(-6);
    await connection.execute(
      "INSERT INTO PhieuPhat (MaPhieuPhat, MaPhieu, SoTien, TrangThai) VALUES (?, ?, ?, 'Chưa thanh toán')",
      [maPhieuPhat, maPhieu, soTienPhat]
    );

    res.status(201).json({
      success: true,
      message: "Lập phiếu phạt thành công!",
      maPhieuPhat,
    });
  } catch (error) {
    console.error("Lỗi khi lập phiếu phạt:", error);
    res.status(500).json({
      success: false,
      message: error.sqlMessage || "Lỗi máy chủ nội bộ.",
    });
  } finally {
    if (connection) await connection.end();
  }
});

// API #11 (Mới): HOÀN TẤT TRẢ SÁCH (CÓ HOẶC KHÔNG CÓ PHẠT)
app.post("/api/phieumuon/finalize", async (req, res) => {
  const { maPhieu, maPhieuPhat } = req.body; // maPhieuPhat có thể là null
  if (!maPhieu)
    return res
      .status(400)
      .json({ success: false, message: "Thiếu mã phiếu mượn." });

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    const [sachRows] = await connection.execute(
      "SELECT MaSach FROM ChiTietPhieuMuon WHERE MaPhieu = ?",
      [maPhieu]
    );
    for (const sach of sachRows) {
      await connection.execute(
        "UPDATE Sach SET SoLuongCon = SoLuongCon + 1 WHERE MaSach = ?",
        [sach.MaSach]
      );
    }

    await connection.execute(
      "UPDATE PhieuMuon SET TrangThai = 'Đã trả', NgayTraThuc = CURDATE() WHERE MaPhieu = ?",
      [maPhieu]
    );

    // Nếu có mã phiếu phạt được gửi kèm, cập nhật nó là "Đã thanh toán"
    if (maPhieuPhat) {
      await connection.execute(
        "UPDATE PhieuPhat SET TrangThai = 'Đã thanh toán', NgayThanhToan = CURDATE() WHERE MaPhieuPhat = ?",
        [maPhieuPhat]
      );
    }

    await connection.commit();
    res.json({ success: true, message: "Hoàn tất trả sách thành công!" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Lỗi khi hoàn tất trả sách:", error);
    res.status(500).json({
      success: false,
      message: error.sqlMessage || "Lỗi máy chủ nội bộ.",
    });
  } finally {
    if (connection) await connection.end();
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Máy chủ API đang chạy tại http://localhost:${port}`);
});
