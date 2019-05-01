const Mongoose = require("mongoose");
const Tweet = Mongoose.model("Tweet");
const User = Mongoose.model("User");
const Analytics = Mongoose.model("Analytics");
const logger = require("../middlewares/logger");

const jwt = require("jsonwebtoken");
require("dotenv").config();



exports.signin = (req, res) => {};

exports.authCallback = (req, res) => {
  res.redirect("/");
};

exports.login = (req, res) => {
  // res.render("pages/login", {
  //   title: "Login"
  // });

  let tweetCount, userCount, analyticsCount;
  let options = {};
  Analytics.list(options)
    .then(() => {
      return Analytics.count();
    })
    .then(result => {
      analyticsCount = result;
      return Tweet.countTotalTweets();
    })
    .then(result => {
      tweetCount = result;
      return User.countTotalUsers();
    })
    .then(result => {
      userCount = result;
      logger.info(tweetCount);
      logger.info(userCount);
      logger.info(tweetCount);
      res.render("pages/login", {
        title: "Login",
        message: req.flash("error"),
        userCount: userCount,
        tweetCount: tweetCount,
        analyticsCount: analyticsCount
      });
    });
};

exports.getmanuallogin = (req, res) => {
  res.render("pages/manual_login", {
    title: "Login"
  });
};

exports.manuallogin = (req, res) => {
  current_user = req.user;
  var payload = { id: current_user._id };
  const token_r = jwt.sign(payload, process.env.JWT_SECRET);
  //current_user.token = token;
  User.findByIdAndUpdate(current_user._id, { token: token_r }, function(
    err,
    user
  ) {
    if (err || !user) {
      logger.error(err);
      return res.render("pages/500");
    }
    let tweetCount, userCount, analyticsCount;
    let options = {};
    Analytics.list(options)
      .then(() => {
        return Analytics.count();
      })
      .then(result => {
        analyticsCount = result;
        return Tweet.countTotalTweets();
      })
      .then(result => {
        tweetCount = result;
        return User.countTotalUsers();
      })
      .then(result => {
        userCount = result;
        logger.info(tweetCount);
        logger.info(userCount);
        logger.info(tweetCount);
        res.render("pages/login", {
          message: req.flash("error"),
          userCount: userCount,
          tweetCount: tweetCount,
          analyticsCount: analyticsCount
        });
      });
  });
};

exports.signup = (req, res) => {
  res.render("pages/register", {
    title: "Sign up",
    user: new User(),
    errors: undefined
  });
};

exports.register = (req, res) => {
  var strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})");

  const user = new User({
    name: req.body.name,
    email: req.body.email,
    username: req.body.username
  });
  password = req.body.password
  
  if  (strongRegex.test(password)){
    user.salt = user.makeSalt();
    user.hashedPassword = user.encryptPassword(password, user.salt);
    //logger.info(user);
  
    user.save(err => {
      if (err) {
        logger.error(err);
        return res.render("pages/500");
      }
    });
    res.redirect("/");
  }
  else{
    errors = [  
                "The password must contain at least 1 lowercase alphabetical character",
                "The password must contain at least 1 uppercase alphabetical character",
                "The password must contain at least 1 numeric character",
                "The password must contain at least one special character",
                "The password must be eight characters or longer"
              ]
    res.render('pages/register',{ errors: errors} )
  }

  

};

exports.logout = (req, res) => {
  current_user = req.user;
  if (
    current_user &&
    current_user.isAuthenticated(current_user.token, current_user._id)
  ) {
    User.findByIdAndUpdate(current_user._id, { token: undefined }, function(
      err,
      user
    ) {
      if (err || !user) {
        logger.error(err);
        return res.render("pages/500");
      }
      req.logout();
      res.redirect("/");
    });
  } else {
    return res.render("pages/500");
  }
};

exports.session = (req, res) => {
  res.redirect("/");
};

exports.create = (req, res, next) => {
  const user = new User(req.body);
  user.provider = "local";
  user
    .save()
    .catch(error => {
      return res.render("pages/login", { errors: error.errors, user: user });
    })
    .then(() => {
      return req.login(user);
    })
    .then(() => {
      return res.redirect("/");
    })
    .catch(error => {
      return next(error);
    });
};

exports.list = (req, res) => {
  const page = (req.query.page > 0 ? req.query.page : 1) - 1;
  const perPage = 5;
  const options = {
    perPage: perPage,
    page: page,
    criteria: { github: { $exists: true } }
  };
  let users, count;
  User.list(options)
    .then(result => {
      users = result;
      return User.count();
    })
    .then(result => {
      count = result;
      res.render("pages/user-list", {
        title: "List of Users",
        users: users,
        page: page + 1,
        pages: Math.ceil(count / perPage)
      });
    })
    .catch(error => {
      return res.render("pages/500", { errors: error.errors });
    });
};

exports.show = (req, res) => {
  const user = req.profile;
  const reqUserId = user._id;
  const userId = reqUserId.toString();
  const page = (req.query.page > 0 ? req.query.page : 1) - 1;
  const options = {
    perPage: 100,
    page: page,
    criteria: { user: userId }
  };
  let tweets, tweetCount;
  let followingCount = user.following.length;
  let followerCount = user.followers.length;

  Tweet.list(options)
    .then(result => {
      tweets = result;
      return Tweet.countUserTweets(reqUserId);
    })
    .then(result => {
      tweetCount = result;
      res.render("pages/profile", {
        title: "Tweets from " + user.name,
        user: user,
        tweets: tweets,
        tweetCount: tweetCount,
        followerCount: followerCount,
        followingCount: followingCount
      });
    })
    .catch(error => {
      return res.render("pages/500", { errors: error.errors });
    });
};

exports.user = (req, res, next, id) => {
  User.findOne({ _id: id }).exec((err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(new Error("failed to load user " + id));
    }
    req.profile = user;
    next();
  });
};

exports.showFollowers = (req, res) => {
  showFollowers(req, res, "followers");
};

exports.showFollowing = (req, res) => {
  showFollowers(req, res, "following");
};

exports.delete = (req, res) => {
  Tweet.remove({ user: req.user._id })
    .then(() => {
      User.findByIdAndRemove(req.user._id)
        .then(() => {
          return res.redirect("/login");
        })
        .catch(() => {
          res.render("pages/500");
        });
    })
    .catch(() => {
      res.render("pages/500");
    });
};

function showFollowers(req, res, type) {
  let user = req.profile;
  let followers = user[type];
  let tweetCount;
  let followingCount = user.following.length;
  let followerCount = user.followers.length;
  let userFollowers = User.find({ _id: { $in: followers } }).populate(
    "user",
    "_id name username github"
  );

  Tweet.countUserTweets(user._id).then(result => {
    tweetCount = result;
    userFollowers.exec((err, users) => {
      if (err) {
        return res.render("pages/500");
      }
      res.render("pages/followers", {
        user: user,
        followers: users,
        tweetCount: tweetCount,
        followerCount: followerCount,
        followingCount: followingCount
      });
    });
  });
}
