/**
 * Created by USER on 6/1/2017.
 */
var express = require('express'); // Loading the express module to the server.
var bodyParser = require('body-parser')
var app = express(); // activating express
var cors = require('cors');
var Connection = require('tedious').Connection;
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // Enabling access to "req.body" as a json file.
var DButilsAzure = require('./DBUtils');
var Promise=require('promise');

//adds
app.use(express.static(__dirname ));
app.locals.users = {};

// order object
function Order(oID,orderDate,shipmentDate,currency,totalcost,disksList) {
    this.oID=oID;
    this.orderDate=orderDate;
    this.shipmentDate=shipmentDate;
    this.currency=currency;
    this.totalcost = totalcost;
    this.disksList=disksList;
}

// disk object
function Disk(quantity,artist,name,cost,purchaceAmount,addDate,publishDate) {
    this.quantity=quantity;
    this.artist=artist;
    this.name=name;
    this.cost=cost;
    this.purchaceAmount = purchaceAmount;
    this.addDate=addDate;
    this.publishDate = publishDate;
}

// categoriesDisks object
function CategoriesDisks(disksList,category) {
    this.disksList=disksList;
    this.category=category;
}

//-------------------------------------------------------------------------------------------------------------------
var port = 4000;
app.listen(port, function () {
    console.log('listening on port ' + port);
});

//-------------------------------------------------------------------------------------------------------------------
// conection details
var config = {
    userName: 'shkedisa',
    password: 'Sapir1234',
    server: 'sapserver.database.windows.net',
    requestTimeout: 30000,
    options: {encrypt: true, database: 'sapDB'}
};
// connect to azure
var connection = new Connection(config)
var connected = false;
connection.on('connect', function(err) {
    if (err) {
        console.error('error connecting; ' + err.stack);
        return;
    }
    console.log("connected Azure");
    connected=true;
});
//-------------------------------------------------------------------------------------------------------------------
// check if connected before every request
app.use(function(req, res, next){
    if (connected)
        next();
    else
        res.status(503).send('Server is down');
});

//-------------------------------------------------------------------------------------------------------------------
// returns all the disks in the system
app.get('/allDisks', function (req,res) {
    var query= 'Select Disks.pID,Disks.artist,Disks.name,Disks.cost,Disks.purchaceAmount,Disks.addDate,Disks.publishDate from Disks';
    DButilsAzure.Select(connection, query, function (result) {
        for (var i=0; i<result.length; i++)
        {
            var changedAddDate = parseDate(result[i]["addDate"]);
            result[i]["addDate"]= changedAddDate;
            var changedPublishDate = parseDate(result[i]["publishDate"]);
            result[i]["publishDate"]= changedPublishDate;
        }
        res.send(result);
    });
    console.log("\nserver handle GET-allDisks request");
});
//-------------------------------------------------------------------------------------------------------------------
//login a user.return true if exist.  if does not exist return false.
app.post('/loginUser', function (req,res) {
    var username=req.body.username;
    var password=req.body.password;
    var token = req.body.usertoken;

    let validToken = app.locals.users[username];

    if (token && validToken == token)
    {

        var toReturn= {
            "token":token,
            "canLogin":true,
            "lastLoginDate":"date"
        };
        res.send(toReturn);
    }
    else if(token &&!password&&username)
    {
        var toReturn= {
            "token":token,
            "canLogin":true,
            "lastLoginDate":"date"
        };
        app.locals.users[username] = token;
        res.send(toReturn);
    }
    else{
        var query= "Select username,password from Customers where username='"+username+"' and password='"+password+"'";
        var myP = DButilsAzure.promiseSelect(connection,query);
        myP.then(function (ans) {

            if(ans.length==1)
            {
                var userName = ans[0].username;
                var insertQuery = "Select lastLogin from Customers where username='"+userName+"'";
                var myP2= DButilsAzure.promiseSelect2(insertQuery,config);
                myP2.then(function (ans2) { // get the user's last login date
                    var lastLoginDate= ans2[0].lastLogin;
                    var year= lastLoginDate.getFullYear();
                    var day;
                    if(lastLoginDate.getDate()<10)
                        day="0"+lastLoginDate.getDate();
                    else
                        day=lastLoginDate.getDate();
                    var month;
                    month=lastLoginDate.getMonth()+1;
                    if(month<10)
                        month="0"+month;
                    var date=lastLoginDate.getFullYear()+"-"+month+"-"+day;
                    let token = Date.now();
                    var toReturn= {
                        "token":token,
                        "canLogin":true,
                        "lastLoginDate":date
                    };
                    app.locals.users[username] = token;
                    res.send(toReturn);
                    // get current date
                    var currentDate=new Date();
                    currentDate.setDate(currentDate.getDate());
                    var day;
                    if(currentDate.getDate()<10)
                        day="0"+currentDate.getDate();
                    else
                        day=currentDate.getDate();
                    var month;
                    month=currentDate.getMonth()+1;
                    if(month<10)
                        month="0"+month;
                    var date=currentDate.getFullYear()+"-"+month+"-"+day+" "+currentDate.toTimeString().substring(0,8)+".000";

                    // query
                    var updateLastLoginQuery = "Update Customers set lastLogin='"+date+"' where username='"+ userName+"'";
                    DButilsAzure.Update(updateLastLoginQuery, config);
                }).catch( function (err) {
                    console.log(err);
                });
                //res.send(true);
            }
            else
            {
                var toReturn= {
                    "canLogin":false,
                    "lastLoginDate":0
                };
                res.send(toReturn);
            }
        }).catch( function (err) {
            console.log(err);
        });
    }
    console.log("\nserver handle POST-loginUser request");
});
//-------------------------------------------------------------------------------------------------------------------
// returns top 5 disks of the last week
app.get('/fiveHotDisks', function (req,res) {
    var weekAgo=new Date();
    weekAgo.setDate(weekAgo.getDate()-7);
    var day;
    if(weekAgo.getDate()<10)
        day="0"+weekAgo.getDate();
    else
        day=weekAgo.getDate();
    var month;
    month=weekAgo.getMonth()+1;
    if(month<10)
        month="0"+month;
    var date=weekAgo.getFullYear()+"-"+month+"-"+day+" "+weekAgo.toTimeString().substring(0,8)+".000";

    var query= "Select TOP (5) Disks.pID,Disks.artist,Disks.name,Disks.cost,Disks.purchaceAmount,Disks.addDate,Disks.publishDate,b.totalWeekAmount from (Select DisksInOrder.pID,SUM(quantity) as totalWeekAmount from Orders inner join DisksInOrder on Orders.oID=DisksInOrder.oID where orderDate>='"+date+"' group by DisksInOrder.pID) b inner join Disks on b.pID=Disks.pID  order by totalWeekAmount desc";
    DButilsAzure.Select(connection, query, function (result) {
        for (var i=0; i<result.length; i++)
        {
            var changedAddDate = parseDate(result[i]["addDate"]);
            result[i]["addDate"]= changedAddDate;
            var changedPublishDate = parseDate(result[i]["publishDate"]);
            result[i]["publishDate"]= changedPublishDate;
        }
        res.send(result);
    });
    console.log("\nserver handle GET-fiveHotDisks request");
});
//-------------------------------------------------------------------------------------------------------------------
// returns all the disks belong to a spesific category that the user choose
app.get('/disksByCategory', function (req,res) {
    var category=req.param("category");
    var query= "select Disks.pID,Disks.artist,Disks.name,Disks.cost,Disks.purchaceAmount,Disks.addDate,Disks.publishDate from Disks inner join CategoriesForDisk on Disks.pID=CategoriesForDisk.pID where cID='"+category+"'";
    DButilsAzure.Select(connection, query, function (result) {
        for (var i=0; i<result.length; i++)
        {
            var changedAddDate = parseDate(result[i]["addDate"]);
            result[i]["addDate"]= changedAddDate;
            var changedPublishDate = parseDate(result[i]["publishDate"]);
            result[i]["publishDate"]= changedPublishDate;
        }
        res.send(result);
    });
    console.log("\nserver handle GET-disksByCategory request");
});
//-------------------------------------------------------------------------------------------------------------------
//returns all disks belongs to a spesific artist that the user choose
app.get('/disksByArtist', function (req,res) {
    var artist=req.param("artistName");
    var query= "select Disks.pID,Disks.artist,Disks.name,Disks.cost,Disks.purchaceAmount,Disks.addDate,Disks.publishDate from Disks where artist='"+artist+"' order by Disks.publishDate";
    DButilsAzure.Select(connection, query, function (result) {
        for (var i=0; i<result.length; i++)
        {
            var changedAddDate = parseDate(result[i]["addDate"]);
            result[i]["addDate"]= changedAddDate;
            var changedPublishDate = parseDate(result[i]["publishDate"]);
            result[i]["publishDate"]= changedPublishDate;
        }
        res.send(result);
    });
    console.log("\nserver handle GET-disksByArtist request");
});
//-------------------------------------------------------------------------------------------------------------------
//returns all the user history orders
app.get('/userOrdersHisotry', function (req,res) {
    var user=req.param("username");
    var query= "select b.oID,b.orderDate,b.shipmentDate,b.currency,b.totalCost,b.quantity,Disks.artist,Disks.name,Disks.cost,Disks.purchaceAmount,Disks.addDate,Disks.publishDate from (select Orders.oID,Orders.orderDate,Orders.shipmentDate,Orders.currency,Orders.totalCost,DisksInOrder.pID,DisksInOrder.quantity from Orders inner join DisksInOrder on Orders.oID=DisksInOrder.oID where username='"+user+"') b inner join Disks on b.pID=Disks.pID";
    DButilsAzure.Select(connection, query, function (result) {
        var json = result;
        var ordersArray = [];
        var contains;
        var order;
        var currID;
        var jsonOrder;
        var orderDate;
        var shipmentDate;
        var currency ;
        var totalcost;
        for (var index = 0; index < json.length; index++) // filter duplicate orders, add them to ordersArray
        {
            jsonOrder = json[index];
            currID = jsonOrder["oID"]
            contains = false;
            for (var o =0; o  <ordersArray.length;  o++) {
                if (ordersArray[o].oID == currID) {
                    contains = true;
                }
            }
            if (!contains) {   // add new unique order id
                orderDate = jsonOrder["orderDate"];
                var parsedorderDate = parseDate(orderDate);
                var changedorderDate=" "+orderDate.toTimeString().substring(0,8);
                changedorderDate=parsedorderDate+changedorderDate;
                shipmentDate = jsonOrder["shipmentDate"];
                var changedshipmentDate = parseDate(shipmentDate);
                currency = jsonOrder["currency"];
                totalcost = jsonOrder["totalCost"];
                diskList = [];
                order = new Order(currID, changedorderDate, changedshipmentDate, currency, totalcost,diskList);
                ordersArray.push(order);
            }
        }
        var quantity;
        var artist;
        var name;
        var cost;
        var purchaceAmount;
        var addDate;
        var publishDate;
        // now, for every order, add his disks
        for (var newListIndex = 0; newListIndex < json.length; newListIndex++)
        {
            // take disk details
            jsonOrder = json[newListIndex];
            currID = jsonOrder["oID"];
            quantity = jsonOrder["quantity"];
            artist = jsonOrder["artist"];
            name = jsonOrder["name"];
            cost = jsonOrder["cost"];
            purchaceAmount = jsonOrder["purchaceAmount"];
            addDate = jsonOrder["addDate"];
            var changedAddDate = parseDate(addDate);
            publishDate = jsonOrder["publishDate"];
            var changedPublishDate = parseDate(publishDate);
            // create a disk
            var disk  = new Disk(quantity,artist,name,cost,purchaceAmount,changedAddDate,changedPublishDate);
            for (j =0; j< ordersArray.length ; j++)
            {
                if (ordersArray[j].oID == currID) // add disk to correct order
                {
                    ordersArray[j].disksList.push(disk);
                }
            }
        }
        res.send(ordersArray);
    });
    console.log("\nserver handle GET-userOrdersHisotry request");

});
//-------------------------------------------------------------------------------------------------------------------
// checks if the specific disk is in stock. if it does, return true. if not, return false and the number in the stock
app.get('/isInStock', function (req,res) {
    var disk=req.param("pID");
    var quantity=req.param("quantity");
    var queryForStockAmount="select stockAmount from disks where pID='"+disk+"' ";
    DButilsAzure.Select(connection, queryForStockAmount, function (result) {

        var amount= result[0].stockAmount;
        if(amount-quantity>0)
        {
            var toReturn= {
                "isInStock":true,
                "stockAmount":0
            };
            res.send(toReturn);//if the disk quantity that the user want to buy is avilable then stockAmount is 0 because it means nothing to the user/client
        }
        else
        {
            var toReturn= {
                "isInStock":false,
                "stockAmount":amount
            };
            res.send(toReturn);//if the disk quantity that the user want to buy is NOT avilable then stockAmount is the maximum amount that the user can buy
        }
    });
    console.log("\nserver handle GET-isInStock request");
});

//-------------------------------------------------------------------------------------------------------------------
// register a new user to the system
app.post('/registerNewUser', function (req,res) {
    var username=req.body.username;
    var password=req.body.password;
    var firstName=req.body.firstName;
    var lastName=req.body.lastName;
    var email=req.body.email;
    var restoreAnswer=req.body.restoreAnswer;
    var country=req.body.country;
    var address=req.body.address;
    var city=req.body.city;
    var favoriteCatagoriesList=req.body.favoriteCatagoriesList;
    var creditCardNumber = req.body.creditCardNumber;

    var isExists=false;
    var query1= "Select username from Customers where username='"+username+"'";

    var myP= DButilsAzure.promiseSelect(connection, query1);

    myP.then(function (ans) {       // if DB retures 1 row- it means the user exists in the system
        if(ans.length==1)
        {
            isExists=true;
        }
    })
        .then(function (ans) {  //       send to client side that user cant be added
            if(isExists==true)
            {
                res.send(false);
            }
            else  // user can be added. send 2 queries for the relevant tables
            {
                // get current date
                var currentDate=new Date();
                currentDate.setDate(currentDate.getDate());
                var day;
                if(currentDate.getDate()<10)
                    day="0"+currentDate.getDate();
                else
                    day=currentDate.getDate();
                var month;
                month=currentDate.getMonth()+1;
                if(month<10)
                    month="0"+month;
                var date=currentDate.getFullYear()+"-"+month+"-"+day+" "+currentDate.toTimeString().substring(0,8)+".000";

                var query2= "INSERT INTO [dbo].[Customers] VALUES ('"+username+"','"+password+"','"+firstName+"','"+lastName+"','"+address+"','"+city+"','"+country+"','"+restoreAnswer+"','"+email+"','"+date+"','"+creditCardNumber+"')";
                DButilsAzure.Insert(query2, config);
                for (var i=0;i<favoriteCatagoriesList.length;i++)
                {
                    var query3="INSERT INTO [dbo].[CategoriesForCustomer] VALUES ('"+username+"','"+favoriteCatagoriesList[i]+"')";
                    DButilsAzure.Insert(query3, config);
                }
                res.send(true);
            }
        }).catch( function (err) {
        console.log(err);
    });
    console.log("\nserver handle POST-registerNewUser request");
});


//-------------------------------------------------------------------------------------------------------------------
// returns the user password, if his question is correct
app.post('/restorePassword', function (req,res) {
    var username=req.body.username;
    var restoreAnswer=req.body.restoreAnswer;

    var query= "Select answer,password from Customers where username='"+username+"'";
    DButilsAzure.Select(connection, query, function (result) {
        if(result.length==0)
        {
            res.send("wrong user");
        }
        else if(restoreAnswer==result[0].answer)
        {
            res.send(result[0].password);
        }
        else
        {
            res.send("wrong answer");
        }
    });
    console.log("\nserver handle POST-restorePassword request");
});
//-------------------------------------------------------------------------------------------------------------------
// Returns all the Disks of the catagory  in the system  sorted by "sortType".
app.get('/sortedDisks', function (req,res) {
    var category=req.param("category");
    var sortType=req.param("sortType");
    var query;
    if (category == "all") // in case the user dont want to filter by category
    {
        query= "select distinct Disks.pID,Disks.artist,Disks.name,Disks.cost,Disks.purchaceAmount,Disks.addDate,Disks.publishDate from Disks inner join CategoriesForDisk on Disks.pID=CategoriesForDisk.pID order by Disks."+sortType;
    }
    else // filter by category
    {
        query= "select Disks.pID,Disks.artist,Disks.name,Disks.cost,Disks.purchaceAmount,Disks.addDate,Disks.publishDate from Disks inner join CategoriesForDisk on Disks.pID=CategoriesForDisk.pID where cID='"+category+"' order by Disks."+sortType;
    }
    DButilsAzure.Select(connection, query, function (result) {
        for (var i=0; i<result.length; i++)
        {
            var changedAddDate = parseDate(result[i]["addDate"]);
            result[i]["addDate"]= changedAddDate;
            var changedPublishDate = parseDate(result[i]["publishDate"]);
            result[i]["publishDate"]= changedPublishDate;
        }
        res.send(result);
    });
    console.log("\nserver handle GET-sortedDisks request");
});

//-------------------------------------------------------------------------------------------------------------------
// purchase a order. after validation that all products are in stock.
app.post('/purchase', function (req,res) {
    var disksAndQuantityList= req.body.disksAndQuantityList;
    var currency= req.body.currency;
    var shipmentDate= req.body.shipmentDate;
    var totalCost = req.body.totalCost;
    var username = req.body.username;
    var newOrderID;

    var clientAnswer=-1;

    var currDate=new Date();
    var day;
    if(currDate.getDate()<10)
        day="0"+currDate.getDate();
    else
        day=currDate.getDate();
    var month;
    month=currDate.getMonth()+1;
    if(month<10)
        month="0"+month;
    var date=currDate.getFullYear()+"-"+month+"-"+day+" "+currDate.toTimeString().substring(0,8)+".000";
    var orderQuery= "INSERT INTO [dbo].[Orders] VALUES ('"+username+"','"+date+"','"+shipmentDate+"','"+currency+"',"+totalCost+")";
    var myP= DButilsAzure.promiseInsert(connection,orderQuery);
    myP.then(function () { // get the new order ID

        var getNewOrderIDQuery= "Select TOP (1) oID from Orders order by oID desc";
        var myP2 =DButilsAzure.promiseSelect(connection, getNewOrderIDQuery);
        myP2.then(function (ans) {
            newOrderID = ans[0].oID; // new order's id
            clientAnswer=newOrderID;
            console.log("new order ID is: "+newOrderID);

        }).then(function () {  // insert to DisksInOrder table
            for (var indexInList=0; indexInList < disksAndQuantityList.length; indexInList+=2)
            {
                // insert every disk- quantity to db
                var pID = disksAndQuantityList[indexInList];
                var quantity = disksAndQuantityList[indexInList+1];
                var disksInOrderQuery = "INSERT INTO [dbo].[DisksInOrder] VALUES ("+newOrderID+ "," + pID+ "," + quantity+")";
                DButilsAzure.Insert(disksInOrderQuery, config);
            }
        }).then(function () { // update Disks table
            for (var indexInList=0; indexInList < disksAndQuantityList.length; indexInList+=2)
            {
                // insert every disk db
                var pID = disksAndQuantityList[indexInList];
                var quantity = disksAndQuantityList[indexInList+1];
                var disksInOrderQuery = "Update  [dbo].[Disks] set purchaceAmount= purchaceAmount+1,stockAmount=stockAmount-"+quantity+" where pID="+pID;
                DButilsAzure.Update(disksInOrderQuery, config);
            }
            res.send(clientAnswer+"");
        }).catch( function (err) {
            console.log(err);
            res.send(clientAnswer+"");
        });
    }).catch( function (err) {
        console.log(err);
        res.send(clientAnswer+"");
    });

    console.log("\nserver handle POST-purchase request");
});

//-------------------------------------------------------------------------------------------------------------------
// returns all the new disks of the last month
app.get('/newMonthDisks', function (req,res) {
    var today=new Date();
    today.setDate(today.getDate());
    var day;
    if(today.getDate()<10)
        day="0"+today.getDate();
    else
        day=today.getDate();

    var month;
    //set the month of 'today' to be the previous month
    today.setMonth(today.getMonth() - 1);
    month=today.getMonth()+1;
    if(month<10)
        month="0"+month;

    var year=today.getFullYear();

    var date=year+"-"+month+"-"+day;

    var query= "select pID,artist,name,cost,purchaceAmount,addDate,publishDate from Disks where addDate>='"+date+"'";
    console.log(query);
    DButilsAzure.Select(connection, query, function (result) {
        for (var i=0; i<result.length; i++)
        {
            var changedAddDate = parseDate(result[i]["addDate"]);
            result[i]["addDate"]= changedAddDate;
            var changedPublishDate = parseDate(result[i]["publishDate"]);
            result[i]["publishDate"]= changedPublishDate;
        }
        res.send(result);
    });
    console.log("\nserver handle GET-newMonthDisks request");
});

//-------------------------------------------------------------------------------------------------------------------
// returns all the new disks of the last month
app.get('/recommendedDisks', function (req,res) {
    var disksInCategoryList = [];
    var username = req.param("username");
    var query;
    var length;
    // the query retuens all the categories that the user likes ( marked in the registration)
    query = "select CategoriesForCustomer.cID from CategoriesForCustomer where username='" + username + "'";
    var myP = DButilsAzure.promiseSelect(connection, query);
    myP.then(function (ans) {
        length = ans.length;
        for (var i=0; i<length ; i++) {
            var currCategory = ans[i].cID;
            //  var disksForCategory = new Object();
            var top5CategoryQuery = "select top (5) Disks.pID, CategoriesForDisk.cID from Disks inner join CategoriesForDisk on Disks.pID=CategoriesForDisk.pID where CategoriesForDisk.cID='" + currCategory + "' order by  purchaceAmount desc"
            var myP2 = DButilsAzure.promiseSelect2(top5CategoryQuery, config);
            myP2.then(function (ans2) {
                var catList = [];
                for ( var j=0; j<ans2.length; j++)
                {
                    catList.push(ans2[j].pID);
                }
                var cat = ans2[0].cID;
                categoriesDisks = new CategoriesDisks(catList,cat);
                disksInCategoryList.push(categoriesDisks);
                if (disksInCategoryList.length==length)
                {
                    res.send(disksInCategoryList);
                    console.log("\nserver handle GET-recommendedProducts request");
                }
            }).catch(function (err) {
                console.log(err);
            });
        }

    }).catch(function (err) {
        console.log(err);
    });
});

function parseDate(dateToChange)
{
    var year= dateToChange.getFullYear();
    var day;
    if(dateToChange.getDate()<10)
        day="0"+dateToChange.getDate();
    else
        day=dateToChange.getDate();
    var month;
    month=dateToChange.getMonth()+1;
    if(month<10)
        month="0"+month;
    var date=dateToChange.getFullYear()+"-"+month+"-"+day;
    return date;
}
//npm install express
