const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservations');
const { checkLogin, checkRole } = require('../utils/authHandler.js');
const mongoose = require('mongoose');

// Get All (User: của họ | Mod/Admin: Xem tất cả - Logic mở rộng)
router.get('/', checkLogin, async (req, res) => {
    try {
        const data = await reservationController.GetAllReservations(req.userId);
        res.status(200).send(data);
    } catch (e) { res.status(400).send(e.message); }
});

// Get Detail
router.get('/:id', checkLogin, async (req, res) => {
    try {
        const data = await reservationController.GetReservationById(req.params.id, req.userId);
        res.status(200).send(data);
    } catch (e) { res.status(400).send(e.message); }
});

// Post Reserve từ Cart
router.post('/reserveACart', checkLogin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const result = await reservationController.ReserveACart(req.userId, session);
        await session.commitTransaction();
        res.status(201).send(result);
    } catch (e) {
        await session.abortTransaction();
        res.status(400).send(e.message);
    } finally { session.endSession(); }
});

// Post Reserve Items
router.post('/reserveItems', checkLogin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const result = await reservationController.ReserveItems(req.userId, req.body.items, session);
        await session.commitTransaction();
        res.status(201).send(result);
    } catch (e) {
        await session.abortTransaction();
        res.status(400).send(e.message);
    } finally { session.endSession(); }
});

// Post Cancel (Chỉ User chủ đơn hoặc Admin)
router.post('/cancelReserve/:id', checkLogin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const result = await reservationController.CancelReserve(req.params.id, req.userId, session);
        await session.commitTransaction();
        res.status(200).send("Cancelled successfully");
    } catch (e) {
        await session.abortTransaction();
        res.status(400).send(e.message);
    } finally { session.endSession(); }
});

module.exports = router;