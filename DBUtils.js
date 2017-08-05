/**
 * Created by USER on 6/21/2017.
 */
/**
 * Created by USER on 6/1/2017.
 */
var Request = require('tedious').Request;
var TYPES = require('tedious').TYPES;
var Connection = require('tedious').Connection;
var Promise=require('promise');

//----------------------------------------------------------------------------------------------------------------------
// execute select queries from DB
exports.Select = function(connection, query, callback) {
    var req = new Request(query, function (err, rowCount) {
        if (err) {
            console.log(err);
            return;
        }
    });
    var ans = [];
    var properties = [];
    req.on('columnMetadata', function (columns) {
        columns.forEach(function (column) {
            if (column.colName != null)
                properties.push(column.colName);
        });
    });
    req.on('row', function (row) {
        var item = {};
        for (i=0; i<row.length; i++) {
            item[properties[i]] = row[i].value;
        }
        ans.push(item);
    });

    req.on('requestCompleted', function () {
        //don't forget handle your errors
        console.log('request Completed: '+ req.rowCount + ' row(s) returned');
        callback(ans);
    });

    connection.execSql(req);

};
//----------------------------------------------------------------------------------------------------------------------
// execute insert queries to DB
exports.Insert= function(query2,config) {
    var connection2 = new Connection(config);
    connection2.on('connect', function (err) {
        if (err) {
            console.log(err);
        } else {
            var request = new Request(query2,function (err, rowCount,rows) {
            });
            connection2.execSql(request);
        }
    });
};
//----------------------------------------------------------------------------------------------------------------------
// execute insert queries from DB with promise
exports.promiseInsert= function(connection, query) {
    return new Promise(function(resolve,reject){
        var req = new Request(query, function (err) {
            if (err) {
                console.log(err);
                reject(err.message);
            }
            else
            {
                console.log('request Completed');
                resolve();
            }
        });

        connection.execSql(req);

    });

};

//----------------------------------------------------------------------------------------------------------------------
// execute select queries from DB with promise
exports.promiseSelect = function(connection, query) {
    return new Promise(function(resolve,reject){
        var req = new Request(query, function (err, rowCount) {
            if (err) {
                console.log(err);
                reject(err.message);
            }
        });
        var ans = [];
        var properties = [];
        req.on('columnMetadata', function (columns) {
            columns.forEach(function (column) {
                if (column.colName != null)
                    properties.push(column.colName);
            });
        });
        req.on('row', function (row) {
            var item = {};
            for (i=0; i<row.length; i++) {
                item[properties[i]] = row[i].value;
            }
            ans.push(item);
        });

        req.on('requestCompleted', function () {
            //don't forget handle your errors
            console.log('request Completed: '+ req.rowCount + ' row(s) returned');
            //console.log(ans);
            resolve(ans);
            //callback(ans);
        });
        connection.execSql(req);
    });

};
//----------------------------------------------------------------------------------------------------------------------
// execute update queries to DB
exports.Update= function(query,config) {
    var connection2 = new Connection(config);
    connection2.on('connect', function (err) {
        if (err) {
            console.log(err);
        } else {
            var request = new Request(query,function (err, rowCount,rows) {
            });
            connection2.execSql(request);
        }
    });
};

//----------------------------------------------------------------------------------------------------------------------
// execute select queries from DB with new connection
exports.promiseSelect2 = function(query, config) {


    return new Promise(function(resolve,reject) {

        var connection2 = new Connection(config);
        connection2.on('connect', function (err) {
            if (err) {
                console.log(err);
                reject(err.message);

            } else {
                var request = new Request(query, function (err, rowCount, rows) {
                    if (err) {
                        console.log(err);
                        reject(err.message);
                    }
                }); // close request
                var ans2 = [];
                var properties2 = [];
                request.on('columnMetadata', function (columns) {
                    columns.forEach(function (column) {
                        if (column.colName != null)
                            properties2.push(column.colName);
                    });
                });
                request.on('row', function (row) {
                    var item = {};
                    for (i = 0; i < row.length; i++) {
                        item[properties2[i]] = row[i].value;
                    }
                    ans2.push(item);
                });

                request.on('requestCompleted', function () {
                    //don't forget handle your errors
                    //console.log(ans);
                    resolve(ans2);
                    //callback(ans);
                });
                connection2.execSql(request);

            }

        });
    });
};