var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var nunjucks = require('nunjucks');
var dotenv = require('dotenv');
var ColorHash = require('color-hash');

dotenv.config();

var webSocket = require('./socket');
var indexRouter = require('./routes/index');
var connect = require('./schemas');
// var usersRouter = require('./routes/users');
var app = express();

app.set('port', process.env.PORT || 8005);
// view engine setup
app.set('view engine', 'html');
nunjucks.configure('views', {
  express: app,
  watch: true
});
connect();

const sessionMiddleware = session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false,
  },
});

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/gif', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser((process.env.COOKIE_SECRET)));
app.use(sessionMiddleware);
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false
  }
}));

app.use((req, res, next) => {
  if (!req.session.color){
    const colorHash = new ColorHash();
    req.session.color = colorHash.hex(req.sessionID);
    // req.session.save();
  }
  next();
});

app.use('/', indexRouter);
// app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
  error.status = 404;
  next(error);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const server = app.listen(app.get('port'), () => {
  console.log(app.get('port'), '번  포트에서 대기중');
});

// module.exports = app;
webSocket(server, app, sessionMiddleware);
