var express = require('express');
let slugify = require('slugify');
var router = express.Router();
let modelProduct = require('../schemas/products');
let modelInventory = require('../schemas/inventories');
const { default: mongoose } = require('mongoose');
// Import middleware xác thực và phân quyền
const { checkLogin, checkRole } = require('../utils/authHandler.js');

/* GET users listing. */
// localhost:3000/api/v1/products
// Yêu cầu: Tất cả user (kể cả không đăng nhập) đều có thể xem sản phẩm
router.get('/', async function (req, res, next) {
  let data = await modelProduct.find({});
  let queries = req.query;
  let titleQ = queries.title ? queries.title : '';
  let maxPrice = queries.maxPrice ? queries.maxPrice : 1E4;
  let minPrice = queries.minPrice ? queries.minPrice : 0;
  let limit = queries.limit ? queries.limit : 5;
  let page = queries.page ? queries.page : 1;
  let result = data.filter(
    function (e) {
      return (!e.isDeleted) && e.price >= minPrice
        && e.price <= maxPrice && e.title.toLowerCase().includes(titleQ);
    }
  );
  result = result.splice(limit * (page - 1), limit);
  res.send(result);
});

// GET 1 sản phẩm: Không cần đăng nhập
router.get('/:id', async function (req, res, next) {
  try {
    let id = req.params.id;
    let result = await modelProduct.findById(id);
    if (result && (!result.isDeleted)) {
      res.send(result);
    } else {
      res.status(404).send({
        message: "ID not found"
      });
    }
  } catch (error) {
    res.status(404).send({
      message: "ID not found"
    });
  }
});

// POST: Tạo sản phẩm mới
// Yêu cầu: Phải đăng nhập và có quyền 'mod' hoặc 'admin'
router.post('/', checkLogin, checkRole('mod', 'admin'), async function (req, res, next) {
  let session = await mongoose.startSession();
  session.startTransaction();
  try {
    let newObj = new modelProduct({
      title: req.body.title,
      slug: slugify(req.body.title, {
        replacement: '-', remove: undefined,
        locale: 'vi', trim: true
      }), 
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      images: req.body.images
    });
    
    // Lưu sản phẩm và tạo inventory trong cùng 1 transaction
    let newProduct = await newObj.save({session});
    let newInv = new modelInventory({
      product: newProduct._id,
      stock: 100 // Mặc định kho hàng là 100
    });
    await newInv.save({session});
    
    await session.commitTransaction();
    session.endSession();
    res.send(newObj);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).send(error.message);
  }
});

// PUT: Cập nhật sản phẩm
// Yêu cầu: Phải đăng nhập và có quyền 'mod' hoặc 'admin'
router.put('/:id', checkLogin, checkRole('mod', 'admin'), async function (req, res, next) {
  try {
    let id = req.params.id;
    let result = await modelProduct.findByIdAndUpdate(
      id, req.body, { new: true }
    );
    if (result) {
        res.send(result);
    } else {
        res.status(404).send({ message: "ID not found" });
    }
  } catch (error) {
    res.status(404).send({
      message: "ID not found"
    });
  }
});

// DELETE: Xóa sản phẩm (Soft delete)
// Yêu cầu: Phải đăng nhập và CHỈ 'admin' mới có quyền xóa
router.delete('/:id', checkLogin, checkRole('admin'), async function (req, res, next) {
  try {
    let id = req.params.id;
    let result = await modelProduct.findByIdAndUpdate(
      id, { isDeleted: true }, { new: true }
    );
    if (result) {
        res.send(result);
    } else {
        res.status(404).send({ message: "ID not found" });
    }
  } catch (error) {
    res.status(404).send({
      message: "ID not found"
    });
  }
});

module.exports = router;