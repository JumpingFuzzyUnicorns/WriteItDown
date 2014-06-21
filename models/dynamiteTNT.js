// dynamiteTNT.js

var AWS = require('aws-sdk');
AWS.config.loadFromPath('./creds.aws')
var dynamoDB = new AWS.DynamoDB();

var tableName = 'WriteItDown';


module.exports = {
  
  putNewTask: function(ownerId, newTaskTitle, callback) {
    var now = new Date();
    var sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    var putParams = {
      TableName: tableName,
      Item: {
        OwnerId: {
          S: ownerId
        },
        TaskTitle: {
          S: newTaskTitle
        },
        TimeCreated: {
          N: now.getTime().toString()
        },
        TimeDue: {
          N: sevenDaysFromNow.getTime().toString()
        }
      }
    };
    dynamoDB.putItem(putParams, function(err, data) {
      if (err) {
        console.error(err, err.stack);
      } else {
        console.log("PutItem " + data);
        
        callback(err);
      }
    });    
  },
  
  queryTasksForOwner: function(ownerId, callback) {
    var queryParams = {
      TableName: tableName,
      Select: 'ALL_ATTRIBUTES',
      KeyConditions: {
        OwnerId: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [
            {
              S: ownerId
            }
          ]
        }
      },
      ConsistentRead: true
    };
    dynamoDB.query(queryParams, function(err, data) {
        tasks = data.Items.map(function(item) {
          return item.TaskTitle.S;
        });
        callback(err, tasks);
    });
  }

};