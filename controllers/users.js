let userModel = require('../schemas/users');
let bcrypt = require('bcrypt');

module.exports = {
    CreateAnUser: async function (username, password, email, role, session,
        avatarUrl, fullName, status, loginCount
    ) {
        let newUser = new userModel({
            username: username,
            password: password,
            email: email,
            role: role,
            avatarUrl: avatarUrl,
            fullName: fullName,
            status: status,
            loginCount: loginCount
        });
        await newUser.save({session});
        return newUser;
    },
    QueryByUserNameAndPassword: async function (username, password) {
        let getUser = await userModel.findOne({ username: username });
        if (!getUser) return false;
        if (bcrypt.compareSync(password, getUser.password)) return getUser;
        return false;
    },
    FindUserById: async function (id) {
        return await userModel.findOne({ _id: id, isDeleted: false }).populate('role');
    },
    FindUserByEmail: async function (email) {
        return await userModel.findOne({ email: email, isDeleted: false });
    },
    FindUserByToken: async function (token) {
        let user = await userModel.findOne({
            forgotpasswordToken: token,
            isDeleted: false
        });
        if (!user || user.forgotpasswordTokenExp < Date.now()) return false;
        return user;
    },
    // HÀM MỚI: Đổi mật khẩu
    ChangePassword: async function (userId, oldPassword, newPassword) {
        let user = await userModel.findById(userId);
        if (!user) throw new Error("Người dùng không tồn tại");

        const isMatch = bcrypt.compareSync(oldPassword, user.password);
        if (!isMatch) throw new Error("Mật khẩu cũ không chính xác");

        const salt = bcrypt.genSaltSync(10);
        user.password = bcrypt.hashSync(newPassword, salt);
        return await user.save();
    }
};