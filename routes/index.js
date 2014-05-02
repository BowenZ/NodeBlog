var crypto = require('crypto'),
	fs = require('fs'),
	User = require('../models/user.js'),
	Post = require('../models/post.js'),
	Comment = require('../models/Comment.js');
var passport = require('passport');

module.exports = function(app)
{
	app.use(function(req, res){
		res.render("404");
	});
	function checkLogin(req, res, next)
	{
		if(!req.session.user)
		{
			req.flash('error', '未登录!');
			res.redirect('/login');
		}
		next();
	}

	function checkNotLogin(req, res, next)
	{
		if(req.session.user)
		{
			req.flash('error', '已登录!');
			res.redirect('back');
		}
		next();
	}

	app.get("/", function(req, res)
	{
		//判断是否是第一页，并把请求的页数转换成number类型
		var page = req.query.p? parseInt(req.query.p): 1;
		Post.getTen(null, page, function(err, posts, total){
			if(err)
			{
				posts = [];
			}
			res.render("index", {
				title: "主页",
				user: req.session.user,
				posts: posts,
				page: page,
				isFirstPage: (page - 1) == 0,
				isLastPage: ((page - 1) * 5 + posts.length == total),
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.get("/reg/checkName", function(req, res){
		//console.log(req.query.name);
		User.get(req.query.name, {$exists:true}, function(err, user){
			if(user)
			{
				res.json({repeat: 1});
				return;
			}
			else
			{
				res.json({repeat: 0});
				return;
			}
		});
	});

	app.get("/reg/checkEmail", function(req, res){
		//console.log(req.query.email);
		User.get({$exists:true}, req.query.email, function(err, user){
			if(user)
			{
				res.json({repeat: 1});
				return;
			}
			else
			{
				res.json({repeat: 0});
				return;
			}
		});
	});

	app.get("/reg", checkNotLogin);
	app.get("/reg", function(req, res)
	{
		res.render("reg", {
			title: "注册",
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.post("/reg", checkNotLogin);
	app.post("/reg", function(req, res)
	{
		var name = req.body.name,
			password = req.body.password,
			password_re = req.body['password-repeat'],
			rememberMe = req.body.rememberMe;
		//validate password
		if(password_re != password)
		{
			req.flash('error', '两次输入的密码不一致!');
			return res.redirect('/reg');
		}
		//generate md5 code
		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');
		var newUser = new User({
			name: req.body.name,
			password: password,
			email: req.body.email
		});
		//validate username
		User.get(newUser.name, {$exists:true}, function(err, user){
			if(user)
			{
				req.flash('error', '用户名已存在!');
				return res.redirect('/reg');
			}
			newUser.save(function(err){
				if(err)
				{
					req.flash('error', err);
					return res.redirect('/reg');
				}
				req.session.user = newUser;
				req.flash('success', '注册成功!');
				res.redirect('/');
			});
		});
	});

	app.get("/login", checkNotLogin);
	app.get("/login", function(req, res)
	{
		res.render("login", {
			title: "登陆",
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	//github登陆
	app.get("/login/github", passport.authenticate("github", {session: false}));
	app.get("/login/github/callback", passport.authenticate("github", {
	  session: false,
	  failureRedirect: '/login',
	  successFlash: '登陆成功！'
	}), function (req, res) {
	  req.session.user = {name: req.user.username, head: "https://gravatar.com/avatar/" + req.user._json.gravatar_id + "?s=48"};
	  res.redirect('/');
	});

	app.get("/login", checkNotLogin);
	app.post("/login", function(req, res)
	{
		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');
		User.get(req.body.name, {$exists:true}, function(err, user){
			if(!user)
			{
				req.flash('error', '用户不存在!');
				return res.redirect('/login');
			}
			if(user.password != password)
			{
				req.flash('error', '密码错误!');
				return res.redirect('/login');
			}
			req.session.user = user;
			req.flash('success', '登陆成功!');
			res.redirect('/');
		});
	});

	app.get("/post", checkLogin);
	app.get("/post", function(req, res)
	{
		res.render("post", {
			title: "发表",
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.get("/post", checkLogin);
	app.post("/post", function(req, res)
	{
		var currentUser = req.session.user,
			tags = [req.body.tag1, req.body.tag2, req.body.tag3],
			post = new Post(currentUser.name, currentUser.head, req.body.title, tags, req.body.post);
		post.save(function(err){
			if(err)
			{
				req.flash('error', err);
				return res.redirect('/');
			}
			req.flash('success', '发布成功!');
			res.redirect('/');
		});
	});

	app.get("/logout", checkLogin);
	app.get("/logout", function(req, res)
	{
		req.session.user = null;
		req.flash('success', '登出成功');
		res.redirect('/');
	});

	app.get('/upload', checkLogin);
	app.get('/upload', function(req, res)
	{
		res.render('upload', {
			title: '文件上传',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.post('/upload', checkLogin);
	app.post('/upload', function(req, res)
	{
		var filesName = req.body.filesName.split(";");
		if(!req.files)
		{
			console.log('empty file!');
			req.flash('error', '文件为空!');
			res.redirect('/upload');
		}
		if(!req.files.files.length)
		{
			var target_path = './public/images/uploadImgs/' + filesName[0] + req.files.files.originalFilename;
			fs.renameSync(req.files.files.path, target_path);
		}
		else
		{
			for(var i in req.files.files)
			{
				var target_path = './public/images/uploadImgs/' + filesName[i] + req.files.files[i].originalFilename;
				fs.renameSync(req.files.files[i].path, target_path);
			}
		}
		req.flash('success', '文件上传成功!');	
		res.redirect('/upload');
	});

	app.post('/asyncUpload', checkLogin);
	app.post('/asyncUpload', function(req, res)
	{
		console.log(123);
		console.log(req.body.filesName);
		var filesName = req.body.filesName.split(";");
		if(!req.files.files || req.files.files.originalFilename == "")
		{
			console.log('empty file!');
			req.flash('error', '文件为空!');
			res.json(0);
			return;
		}
		if(!req.files.files.length)
		{
			var target_path = './public/images/uploadImgs/' + filesName[0];
			fs.renameSync(req.files.files.path, target_path);
		}
		else
		{
			for(var i in req.files.files)
			{
				var target_path = './public/images/uploadImgs/' + filesName[i];
				if(target_path.indexOf(req.files.files[i].originalFilename.replace(new RegExp(" ", "g"), "-")) < 0)
				{
					console.log("wrong");
					var originalFilename = req.files.files[i].originalFilename;
					for(var j = 0; j < filesName.length; j++)
					{
						if(originalFilename.replace(new RegExp(" ", "g"), "-").indexOf(filesName[j].substring(14)) > -1)
						{
							target_path = './public/images/uploadImgs/' + filesName[j];
							break;
						}
					}
				}
				fs.renameSync(req.files.files[i].path, target_path);
				console.log(filesName[i]+"-"+req.files.files[i].originalFilename);
			}
		}
		res.json(1);
	});

	app.get('/search', function(req, res){
		Post.search(req.query.keyword, function(err, posts){
			if(err)
			{
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('search', {
				title: "SEARCH:" + req.query.keyword,
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.get('/u/:name', function(req, res){
		var page = req.query.p? parseInt(req.query.p): 1;
		User.get(req.params.name, {$exists:true}, function(err, user){
			if(!user)
			{
				req.flash('err', '用户不存在!');
				return res.redirect('/');
			}
			Post.getTen(user.name, page, function(err, posts, total){
				if(err)
				{
					req.flash('error', err);
					return res.redirect('/');
				}
				res.render('user', {
					title: user.name,
					posts: posts,
					page: page,
					isFirstPage: (page - 1) == 0,
					isLastPage: ((page - 1) * 10 + posts.length) == total,
					user: req.session.user,
					success: req.flash('success').toString(),
					error: req.flash('error').toString()
				});
			});
		});
	});

	app.get('/p/:_id', function(req, res){
		Post.getOne(req.params._id, function(err, post){
			if(err)
			{
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('article', {
				title: post.title,
				post: post,
				user:req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.post('/u/:name/:day/:title', function(req, res){
		var date = new Date(),
			time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10? '0' + date.getMinutes(): date.getMinutes());
		var md5 = crypto.createHash('md5'),
			email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
			head = 'http://www.gravatar.com/avatar/' + email_MD5 + '?s=48';	
		var comment = {
			name: req.body.name,
			head: head,
			email: req.body.email,
			website: req.body.website,
			time: time,
			content: req.body.content
		};
		var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
		console.log(newComment);
		newComment.save(function(err){
			if(err)
			{
				req.flash('error', err);
				return  res.redirect('back');
			}
			req.flash('success', '留言成功!');
			res.redirect('back');
		});
	});

	app.get('/edit/:name/:day/:title', checkLogin);
	app.get('/edit/:name/:day/:title', function(req, res){
		var currentUser = req.session.user;
		Post.edit(currentUser.name, req.params.day, req.params.title, function(err, post){
			if(err)
			{
				req.flash('error', err);
				return res.redirect('back');
			}
			res.render('edit', {
				title: '编辑',
				post: post,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.post('/edit/:name/:day/:title', checkLogin);
	app.post('/edit/:name/:day/:title', function(req, res){
		var currentUser = req.session.user;
		Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function(err){
			var url = '/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title;
			if(err)
			{
				req.flash('error', err);
				return res.redirect(url);
			}
			req.flash('success', '修改成功!');
			res.redirect(url);
		});
	});

	app.get('/remove/:name/:day/:title', checkLogin);
	app.get('/remove/:name/:day/:title', function(req, res){
		var currentUser = req.session.user;
		Post.remove(currentUser.name, req.params.day, req.params.title, function(err){
			if(err)
			{
				req.flash('error', err);
				return res.redirect('back');
			}
			req.flash('success', '删除成功!');
			res.redirect('/');
		});
	});

	app.get('/reprint/:name/:day/:title', checkLogin);
	app.get('/reprint/:name/:day/:title', function(req, res){
		Post.edit(req.params.name, req.params.day, req.params.title, function(err,post){
			if(err)
			{
				req.flash('error', err);
				return res.redirect(back);
			}
			var currentUser = req.session.user,
				reprint_from = {name: post.name, day: post.time.day, title: post.title},
				reprint_to = {name: currentUser.name, head: currentUser.head};
			Post.reprint(reprint_from, reprint_to, function(err, post){
				if(err)
				{
					req.flash('error', err);
					return res.redirect('back');
				}
				req.flash('success', '转载成功!');
				var url = '/u/' + post.name + '/' + post.time.day + '/' + post.title;
				res.redirect(url);
			});
		});

	});

	app.get('/archive', function(req, res){
		Post.getArchive(function(err, posts){
			if(err)
			{
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('archive', {
				title: '存档',
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.get('/tags', function(req, res){
		Post.getTags(function(err, posts){
			if(err)
			{
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('tags', {
				title: '标签',
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.get('/tags/:tag', function(req, res){
		Post.getTag(req.params.tag, function(err, posts){
			if(err)
			{
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('tag', {
				title: 'TAG' + req.params.tag,
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.get('/rankTags', function(req, res){
		Post.getRank(function(err, ranks){
			if(err)
			{
				req.flash('error', err);
				return res.redirect('/');
			}
			console.log(ranks);
			req.flash('success', 'success');
			res.redirect('/tags');
		});
	});
};
