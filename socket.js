const SocketIO = require('socket.io');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cookie = require('cookie-signature');

module.exports = (server, app, sessionMiddleware) => {
  const io = SocketIO(server, {path:'/socket.io'});
  app.set('io', io); //라우터에서 io객체를 사용할 수 있도록 저장, req.app.get('io')로 접근 가능
  const room = io.of('/room'); 
  const chat = io.of('/chat');

  // 모든 소켓 연결마다 장착
  // socket.request.session 객체가 생성
  io.use((socket, next) => {
    cookieParser(process.env.COOKIE_SECRET)(socket.request, socket.request.res, next);
    sessionMiddleware(socket.request, socket.request.res, next);
  });

  room.on('connection', (socket) => {
    console.log('room 네임스페이스에 접속');
    socket.on('disconnect', () => {
      console.log('room 네임스페이스 접속 해제');
    });
  });

  chat.on('connection', (socket) => {
    console.log('chat 네임스페이스에 접속');
    const req = socket.request;
    console.log('req.session:', req.session);
    const {headers: { referer }} = req;
    const roomId = referer
                  .split('/')[referer.split('/').length-1]
                  .replace(/\?.+/,'');
    socket.join(roomId);

    // 특정한 방으로 메시지를 보낼 수 있음(to 메서드)
    socket.to(roomId).emit('join', {
      user: 'system',
      chat: `${socket.request.session.color}님이 입장하셨습니다.`
    });

    socket.on('disconnect', ()=>{
      console.log('chat 네임스페이스 접속 해제');
      socket.leave(roomId);
      const currentRoom = socket.adapter.rooms[roomId];
      const userCount = currentRoom? currentRoom.length:0;
      if(userCount === 0) {
        // console.log('[req]',req);
        const signedCookie = req.signedCookies['connect.sid'];
        const connectSID = cookie.sign(signedCookie, process.env.COOKIE_SECRET);
        axios.delete(`http://localhost:8005/room/${roomId}`, {
          headers: {
            Cookie: `connect.sid=s%3A${connectSID}`,
          },
        })
          .then(() => {
            console.log('방 제거 요청 성공');
          })
          .catch((error) => {
            console.error(error);
          });
      } else {
        socket.to(roomId).emit('exit', {
          user:'system',
          chat: `${req.session.color}님이 퇴장하셨습니다.`
        });
      }
    });
  });

  io.on('connection', (socket) => { //웹소켓 연결 시,
    const req = socket.request;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('새로운 클라이언트 접속',ip, socket.id, req.ip);
    socket.on('disconnect', () => { //클라이언트로 부터 메시지 수신 시,
      console.log('클라이언트 접속 해제', ip, socket.id);
      clearInterval(socket.interval);
    });
    socket.on('error', (error) => { //에러 시,
      console.error(error);
    });
    socket.on('reply', (data) => { //클라이언트로 부터 메시지 수신 시,
      console.log(data);
    });

    socket.interval = setInterval(() => {// 3초마다 클라이언트로 메시지 전송
      socket.emit('news', 'Hello Socket.IO');
    }, 3000);
  });
}
