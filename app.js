var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var MongoStore = require('connect-mongo')(express);
var settings = require('./settings');
var flash = require('connect-flash');

var routes = require('./routes');

/*日志组件
var fs = require('fs');
var accessLog = fs.createWriteStream('access.log', {flags: 'a'});
var errorLog = fs.createWriteStream('error.log', {flags: 'a'});
*/
var app = express();
//github登陆
var passport = require('passport'),
    GithubStrategy = require('passport-github').Strategy;
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(flash());

app.use(favicon(__dirname + "\\public\\images\\Have a Nice Day Bon Jovi.jpg"));
app.use(logger('dev'));
/*保存为日志文件
app.use(logger({stream: accessLog}));*/
/*app.use(bodyParser.json());
app.use(bodyParser.urlencoded());*/
app.use(express.bodyParser({
    keepExtensions: true,
    uploadDir: "./public/images/uploadImgs"
}));
app.use(cookieParser());

//增加session功能并将信息保存到mongodb中
app.use(express.session({
    secret: settings.cookieSecret,
    key: settings.db,
    cookie: {
        //保存周期为30天
        maxAge: 1000 * 60 * 60 * 24 * 30
    },
    store: new MongoStore({
        db: settings.db
    })
}));
app.use(express.static(path.join(__dirname, 'public')));
/*增加记录错误日志功能
  app.use(function (err, req, res, next) {
  var meta = '[' + new Date() + '] ' + req.url + '\n';
  errorLog.write(meta + err.stack + '\n');
  next();
});*/
app.use(passport.initialize()); //初始化 Passport
app.use(app.router);

routes(app);

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

passport.use(new GithubStrategy({
    clientID: "2387bd7a6c15f9924ee3",
    clientSecret: "55afad558db652d0b6bf83a143d150f974528b03",
    callbackURL: "http://localhost:3000/login/github/callback"
}, function(accessToken, refreshToken, profile, done) {
    done(null, profile);
}));

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.listen(3000);
module.exports = app;
