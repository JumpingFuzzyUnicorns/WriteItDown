var express = require('express');
var router = express.Router();

var log = require('npmlog');

var dynamiteTNT = require('../models/dynamiteTNT');
var auth = require('../models/auth');

var clownie = 'clownie';

if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

/*
router.use(function(req, res, next) {
  if (!(req.path.startsWith('/signin'))) {
    auth.authRequest(req, function(err) {
      if (err) {
        res.status(401).send();
      } else {
        next();
      }
    });
  } else {
    next();
  }
});
*/

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', {
    title: 'WriteItDown',
  });
});

/* GET login page. */
/*
router.get('/login', function(req, res) {
  log.info("userId=" + req.query.userId)
  res.render('login', {
    title: 'Sign into WriteItDown',
    userId: req.query.userId
  })
});
*/

router.param('taskid', function(req, res, next, id) {
  match = id.match(/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/);
  if (match) {
    req.taskId = id;
    log.info("param taskId=" + req.taskId);
    next();
  } else {
    var errString = "Mismatched taskId " + id;
    log.error(errString);
    next(new Error(errString));
  }
});

router.get('/tasks', function(req, res) {
  log.info(JSON.stringify(req.headers));
  log.info("content-type: " + req.get('Content-Type'));
  dynamiteTNT.queryTasksForOwner(clownie, function(err, tasks) {
    if (err) {
      log.error(err, err.stack);
      res.status(500).send(err);
    } else {
      log.info('Tasks ' + JSON.stringify(tasks));
      if (req.accepts('html')) {
        res.render('tasklist', {
          taskList: tasks,
        });
      } else {
        res.json(tasks);
      }
    }    
  });  
});

router.post('/tasks/new', function(req, res) {
  log.info(JSON.stringify(req.body));
  itemModel = req.body;
  dynamiteTNT.createNewTask(clownie, itemModel, function(err, newTask) {
    if (err) {
      log.error(err, err.stack);
      res.status(500).send(err);
    } else {
      log.info("New task created: " + JSON.stringify(newTask));
      res.json(newTask);
    }
  });
});

router.post('/tasks/:taskid', function(req, res){
  log.info(JSON.stringify(req.body));
  itemModel = req.body;
  dynamiteTNT.updateTask(clownie, req.params.taskid, itemModel, function(err, updatedTask) {
    if (err) {
      log.error(err, err.stack);
      res.status(500).send(err);
    } else {
      log.info("Updated task: " + JSON.stringify(updatedTask));
      res.json(updatedTask);
    }
  });
});

router.post('/users/new', function(req, res) {
  newUserModel = req.body;
  auth.createNewUser(newUserModel, function(err, session) {
    if (err) {
      log.error(err);
      res.status(500).send(err);
    } else {
      log.info("User " + session.userId);
      res.json(session);
    }
  });
});

module.exports = router;

