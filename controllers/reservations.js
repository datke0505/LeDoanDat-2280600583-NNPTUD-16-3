let reservationModel = require('../schemas/reservations');
let cartModel = require('../schemas/cart');
let productModel = require('../schemas/products');

module.exports = {
    // Lấy tất cả reservation của user
    GetAllReservations: async function (userId) {
        return await reservationModel.find({ user: userId }).populate('items.product');
    },

    // Lấy chi tiết 1 reservation
    GetReservationById: async function (id, userId) {
        return await reservationModel.findOne({ _id: id, user: userId }).populate('items.product');
    },

    // Logic dùng chung để tạo items có giá (subtotal)
    prepareItems: async function (itemsInput) {
        let totalAmount = 0;
        const itemsWithPrice = await Promise.all(itemsInput.map(async (item) => {
            const product = await productModel.findById(item.product);
            if (!product) throw new Error("Sản phẩm không tồn tại");
            const subtotal = product.price * item.quantity;
            totalAmount += subtotal;
            return {
                product: item.product,
                quantity: item.quantity,
                price: product.price,
                subtotal: subtotal
            };
        }));
        return { itemsWithPrice, totalAmount };
    },

    // Reserve từ giỏ hàng
    ReserveACart: async function (userId, session) {
        const cart = await cartModel.findOne({ user: userId }).session(session);
        if (!cart || cart.items.length === 0) throw new Error("Giỏ hàng trống");

        const { itemsWithPrice, totalAmount } = await this.prepareItems(cart.items);

        const newRes = new reservationModel({
            user: userId,
            items: itemsWithPrice,
            totalAmount: totalAmount,
            ExpiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
        });

        await newRes.save({ session });
        cart.items = []; // Xóa giỏ hàng sau khi đặt
        await cart.save({ session });
        return newRes;
    },

    // Reserve từ danh sách items gửi lên
    ReserveItems: async function (userId, items, session) {
        const { itemsWithPrice, totalAmount } = await this.prepareItems(items);
        const newRes = new reservationModel({
            user: userId,
            items: itemsWithPrice,
            totalAmount: totalAmount,
            ExpiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
        return await newRes.save({ session });
    },

    // Hủy reservation
    CancelReserve: async function (id, userId, session) {
        const res = await reservationModel.findOne({ _id: id, user: userId }).session(session);
        if (!res) throw new Error("Không tìm thấy đơn đặt chỗ");
        if (res.status === 'paid') throw new Error("Đơn đã thanh toán, không thể hủy");

        res.status = 'cancelled';
        return await res.save({ session });
    }
};