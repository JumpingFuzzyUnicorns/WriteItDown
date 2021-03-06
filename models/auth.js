var awsHelper = require('./aws-helper.js');
var crypto = require('crypto');
var log = require('npmlog');

var dynamoDB = awsHelper.dynamoDB();

var tableName = 'WriteItDownUser';

function computeSHA1(password) {
    var sha = crypto.createHash('sha1');
    sha.update(password);
    return sha.digest('base64');
}

function createSession(userId, callback) {
    var sessionId = crypto.randomBytes(16).toString('hex');
    var sessionLifetimeMillis = 24*60*60*1000; // 1d
    var now = new Date();
    var expirationTimeActual = now.getTime() + sessionLifetimeMillis;
    var expirationTimeProactive = now.getTime() + sessionLifetimeMillis/2;
    var putParams = {
        TableName: tableName,
        Item: {
            Id: { S: userId },
            SessionId: { S: sessionId },
            SessionExpiration: { N: expirationTimeActual.toString() }
        },
        Expected : {
            Id: {
                ComparisonOperator: 'NULL'
            }
        }
    };
    dynamoDB.putItem(putParams, function(err, data) {
        if (err) {
            log.error(JSON.stringify(err));
            callback(err.message, null);
        } else {
            log.info("User " + userId + " session " + sessionId);
            callback(null, {
                userId: userId,
                sessionId: sessionId,
                sessionExpiration: expirationTimeProactive
            });
        }
    });
}

function updateSession(userId, sessionId, expirationDate) {
    var updateParams = {
        TableName: tableName,
        Key: {
            Id: { S: userId },
            SessionId: { S: sessionId },
        },
        AttributeUpdates: {
            SessionExpiration: {
                Action: 'PUT',
                Value: { N: expirationDate.getTime().toString() }
            }
        },
        Expected : {
            Id: { ComparisonOperator: 'NOT_NULL' }
        },
        ReturnValues: 'NONE'
    };
    dynamoDB.updateItem(updateParams, function(err, data) {
        if (err) {
            log.error(JSON.stringify(err));
        } else {
            log.info("User " + userId + " session " + sessionId + " expired now");
        }
    });
}

function signInUser(userModel, callback) {
    var getParams = {
        TableName: tableName,
        Key: {
            Id: { S: userModel.userId },
            SessionId: { S: "0" }
        },
        ConsistentRead: true,
        AttributesToGet: [ 'Id', 'Salt', 'Password' ]
    };
    dynamoDB.getItem(getParams, function(err, data) {
        if (err) {
            log.error("signin: " + err);
            callback("Error signing in; please try again", null);
        } else {
            if (data.Item && computeSHA1(data.Item.Salt.S + userModel.password) == data.Item.Password.S) {
                createSession(data.Item.Id.S, callback);
            } else {
                callback("Bad username or password", null);
            }
        }
    });
}

function checkSessionId(userId, sessionId, callback) {
    var getParams = {
        TableName: tableName,
        Key: {
            Id: { S: userId },
            SessionId: { S: sessionId }
        },
        ConsistentRead: true,
        AttributesToGet: [ 'Id', 'SessionExpiration' ]
    };
    dynamoDB.getItem(getParams, function(err, data) {
        if (err) {
            log.error("checkSessionId: " + err);
            callback("Invalid session");
        } else {
            var now = new Date();
            if (now.getTime() > data.Item.SessionExpiration.N) {
                log.error("sessionId " + sessionId + " expired at " + data.Item.SessionExpiration.N + "; it is now " + now.getTime());
                callback("Invalid session");
            } else {
                log.info("sessionId " + sessionId + " valid until " + data.Item.SessionExpiration.N + "; it is now " + now.getTime());
                callback(null);
            }
        }
    });
}

module.exports = {
    
    authRequest: function(userId, sessionId, callback) {
        if (userId && sessionId) {
            checkSessionId(userId, sessionId, callback)
        } else {
            callback("Who are you?");   
        }
    },
    
    expireSession: function(userId, sessionId) {
        updateSession(userId, sessionId, new Date());            
    },
    
    createNewUser: function(userModel, callback) {
        var salt = crypto.randomBytes(16).toString('hex');
        var saltedPassword = salt + userModel.password;
        var putParams = {
            TableName: tableName,
            Item: {
                Id: { S: userModel.userId },
                Salt: { S: salt },
                Password: { S: computeSHA1(saltedPassword) },
                SessionId: { S: "0" }
            },
            Expected : {
                Id: {
                    ComparisonOperator: 'NULL'
                }
            }
        };
        dynamoDB.putItem(putParams, function(err, data) {
            if (err) {
                log.error(JSON.stringify(err));
                if (err.code == "ConditionalCheckFailedException") {
                    callback(userModel.userId + " already exists.  Try another name", null);
                } else {
                    callback(err.message, null);
                }
            } else {
                log.info("Created " + userModel.userId);
                signInUser(userModel, callback);
            }
        });
    },
    
    signInUser: signInUser
}