const mongoose = require('mongoose');

const { Schema } = mongoose;
const { Types: {ObjectId} } =   Schema;
const chatSchema = new Schema({
    room: {//쳇팅방 아이디
        type:ObjectId,
        required: true,
        ref: 'Room'
    },
    user: {//쳇팅한 사람
        type: String,
        required: true
    },
    chat: String, // 채팅내역
    gif: String, //gif 이미지 주소
    createdAt: { //챗팅 시간
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Chat', chatSchema);