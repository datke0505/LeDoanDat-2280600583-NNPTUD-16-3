var express = require("express");
var router = express.Router();
let { postUserValidator, validateResult } = require('../utils/validatorHandler')
let userController = require('../controllers/users')
let cartModel = require('../schemas/cart');
let { checkLogin, checkRole } = require('../utils/authHandler.js')

let userModel = require("../schemas/users");
const { default: mongoose } = require("mongoose");

// GET ALL USERS
// Chỉ ADMIN và MODERATOR mới có quyền xem danh sách user
router.get("/", checkLogin, checkRole("admin", "mod"), async function (req, res, next) {
  try {
    let users = await userModel
      .find({ isDeleted: false })
      .populate({
        'path': 'role',
        'select': "name"
      })
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// GET USER BY ID
router.get("/:id", checkLogin, async function (req, res, next) {
  try {
    let result = await userModel.findOne({ _id: req.params.id, isDeleted: false }).populate('role');
    if (result) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

// HÀM MỚI: ĐỔI MẬT KHẨU (Change Password)
// Yêu cầu: Phải đăng nhập, nhận vào oldPassword và newPassword
router.post("/change-password", checkLogin, async function (req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).send({ message: "Vui lòng nhập đầy đủ mật khẩu cũ và mới" });
    }
    
    // Gọi hàm ChangePassword từ userController (đã được cập nhật ở bước trước)
    await userController.ChangePassword(req.userId, oldPassword, newPassword);
    
    res.status(200).send({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// CREATE USER & CART
router.post("/", postUserValidator, validateResult, async function (req, res, next) {
  let session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Tạo User thông qua Controller
    let newItem = await userController.CreateAnUser(
      req.body.username,
      req.body.password,
      req.body.email,
      req.body.role,
      session
    );

    // Tạo giỏ hàng trống cho User mới
    let newCart = new cartModel({
      user: newItem._id
    });
    
    let result = await newCart.save({ session });
    await result.populate('user');

    await session.commitTransaction();
    session.endSession();
    res.status(201).send(result);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).send({ message: err.message });
  }
});

// UPDATE USER
router.put("/:id", checkLogin, async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findById(id);
    
    if (!updatedItem) return res.status(404).send({ message: "id not found" });

    // Chỉ cập nhật các field có trong body (ngoại trừ password)
    for (const key of Object.keys(req.body)) {
      if (key !== 'password') { // Password nên được xử lý qua route change-password riêng
        updatedItem[key] = req.body[key];
      }
    }
    
    await updatedItem.save();
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// DELETE USER (Soft Delete)
// Yêu cầu: Chỉ ADMIN mới có quyền xóa user
router.delete("/:id", checkLogin, checkRole("admin"), async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send({ message: "Xóa người dùng thành công", data: updatedItem });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;