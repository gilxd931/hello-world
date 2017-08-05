
let app = angular.module('myApp', ['ngAnimate','LocalStorageModule','ngRoute']);
//-------------------------------------------------------------------------------------------------------------------
app.controller('mainController', ['UserService', function (UserService) {
    let vm = this;
    vm.userService = UserService;

    }
]);

//-------------------------------------------------------------------------------------------------------------------
app.controller('homeController',['$window','$location','localStorageService','UserService','$scope','$http',function($window,$location,localStorageService,UserService,$scope,$http){
    let self = this;
    self.userService= UserService;
    $scope.currency="$";
    self.topUrl= "http://localhost:4000/fiveHotDisks";
    self.newMonthUrl= "http://localhost:4000/newMonthDisks";
    $http.get(self.topUrl).then(function(recData){
        var data = [];
        for (var i=0; i<recData.data.length; i++)
        {
            var name = recData.data[i].name;
            data.push("Name: " + name);            // rows[0]
            var artist = recData.data[i].artist;
            data.push("Artist: " + artist);        // rows[1]
            var cost = recData.data[i].cost;
            data.push("Price: "+ cost);            // rows[2]
            var pDate = recData.data[i].publishDate;
            data.push("Publish date: "+ pDate);            // rows[3]
            var picPath = "/images/" + name +".jpg";
            data.push(picPath);      // rows[4]
        }
        $scope.topDisks = chunk(data, 5);
        //newMonth
        $http.get(self.newMonthUrl).then(function(monthData){
            var mData = [];
            for (var j=0; j<monthData.data.length; j++)
            {
                var name = monthData.data[j].name;
                mData.push("Name: " + name);            // rows[0]
                var artist = monthData.data[j].artist;
                mData.push("Artist: " + artist);        // rows[1]
                var cost = monthData.data[j].cost;
                mData.push("Price: "+ cost);            // rows[2]
                var pDate = monthData.data[j].publishDate;
                mData.push("Publish date: "+ pDate);            // rows[3]
                var picPath = "/images/" + name +".jpg";
                mData.push(picPath);      // rows[4]
            }
            $scope.newMonthDisks = chunk(mData, 5);
        }).then(function () {

                let cookie = localStorageService.cookie.get('user');
                self.UserService = UserService;

                if(cookie && !UserService.isLoggedIn){
                    let username = cookie['username'];
                    data = {username : username, usertoken : cookie['usertoken'],lastLogin:cookie['lastLogin']};
                    UserService.login(data).then(function (success) {
                        data = {username : username, usertoken: success.data.token,lastLogin:cookie['lastLogin']};
                        UserService.lastLogin=cookie['lastLogin'];
                        localStorageService.cookie.set("user", JSON.stringify(data), 3); //3 days to expire

                        $location.path('/');
                    }, function (error) {
                        //self.errorMessage = error.data;
                        console.log('login has failed. error: '+JSON.stringify(error.data));
                        //$window.alert('log-in has failed');
                    });
                }
            }

        );
    });

    self.addToCart = function(disk) {
        if (self.userService.isLoggedIn)
        {
            var existInCart = false;
            var addedName = disk[0];
            addedName = addedName.substring(6);
            var currLocalStorage = localStorageService.get('cart');

            if (currLocalStorage != null)
            {
                for (var i=0; i<currLocalStorage.length; i+=2)
                {
                    var toCompare = currLocalStorage[i][0].substring(6)
                    if( addedName == toCompare)
                    {
                        existInCart = true;
                        currLocalStorage[i+1] += 1;
                        window.alert("Disk added to cart !");
                    }
                }
            }
            if (!existInCart)
            {
                if (currLocalStorage == null)
                {
                    currLocalStorage = [];
                }
                currLocalStorage.push(disk);
                currLocalStorage.push(1);
                window.alert("Disk added to cart !");
            }

            localStorageService.set('cart', currLocalStorage);
        }

    }

}]);
//-------------------------------------------------------------------------------------------------------------------
app.controller('loginController', ['localStorageService','UserService', '$location', '$window','$http',
    function(localStorageService,UserService, $location, $window,$http) {
        let self = this;
        self.userService=UserService;

        /********************************connecting to website********************************/
        let cookie = localStorageService.cookie.get('user');
        self.UserService = UserService;

        if(cookie && !UserService.isLoggedIn){
            let username = cookie['username'];
            data = {username : username, usertoken : cookie['usertoken'],lastLogin:cookie['lastLogin']};
            UserService.login(data).then(function (success) {
                data = {username : username, usertoken: success.data.token,lastLogin:cookie['lastLogin']};
                UserService.lastLogin=cookie['lastLogin'];
                localStorageService.cookie.set("user", JSON.stringify(data), 3); //3 days to expire
            }, function (error) {
                //self.errorMessage = error.data;
                console.log('login has failed. error: '+JSON.stringify(error.data));
                //$window.alert('log-in has failed');
            }).then(function () { /********************************connecting to website********************************/
                if(!self.userService.isLoggedIn)
                {
                    self.isShowForget=false;
                    self.isShowForgetString="Forgot your password?";
                    self.showForget=function () {
                        self.isShowForget=!self.isShowForget;
                        if(self.isShowForget)
                            self.isShowForgetString="Return To Login";
                        else
                            self.isShowForgetString="Forget your password?";

                    };
                    self.jsonForgetPass = {username: '', restoreAnswer: ''};
                    self.user = {username: '', password: ''};
                }
                else
                {
                    $location.path('/');

                }
            });
        }
        else if(cookie && UserService.isLoggedIn)
        {
            $location.path('/');
        }
        else if(!cookie ||!self.userService.isLoggedIn)
        {
            if(!self.userService.isLoggedIn)
            {
                self.isShowForget=false;
                self.isShowForgetString="Forgot your password?";
                self.showForget=function () {
                    self.isShowForget=!self.isShowForget;
                    if(self.isShowForget)
                        self.isShowForgetString="Return To Login";
                    else
                        self.isShowForgetString="Forgot your password?";

                };
                self.jsonForgetPass = {username: '', restoreAnswer: ''};
                self.user = {username: '', password: ''};
            }
            else
            {
                $location.path('/');

            }
        }




        self.forget=function (isValidForgetForm) {
            if(isValidForgetForm)
            {
                $http.post('/restorePassword', self.jsonForgetPass)
                    .then(function(response) {
                        let token = response.data;
                        if(token=="wrong user")
                            alert("user "+self.jsonForgetPass.username+" does not exist");
                        else if(token=="wrong answer")
                            alert("wrong answer");
                        else
                            alert("Your password is: "+token);
                        return Promise.resolve(response);
                    })
                    .catch(function (e) {
                        return Promise.reject(e);
                    });

            }

        };

        self.login = function(isLoginFormValid) {
            if (isLoginFormValid &&!UserService.isLoggedIn) {
                UserService.login(self.user).then(function (responseFromServer) {

                    if(responseFromServer.data.canLogin)
                    {
                        if(responseFromServer.data.lastLoginDate!="date")
                            UserService.lastLogin= responseFromServer.data.lastLoginDate;
                        let data= {username : self.user.username, usertoken: responseFromServer.data.token,lastLogin:UserService.lastLogin};
                        localStorageService.cookie.set("user", JSON.stringify(data), 4); //3 days to expire
                        $location.path('/');
                        $window.alert("You are logged in!");


                    }
                    else
                    {
                        $window.alert("wrong username or password");
                        $location.path('/login');
                    }
                }, function (error) {
                    self.errorMessage = error.data;
                    $window.alert('log-in has failed');
                })
            }
        };

    }]);

//-------------------------------------------------------------------------------------------------------------------

app.controller('registerController', ['localStorageService','$http','UserService', '$location', '$window',
    function(localStorageService,$http,UserService, $location, $window) {

        let self = this;
        self.user = {username: '', password: '',firstName:'',lastName:'',email:'',restoreAnswer:'',country:'',address:'',city:'',creditCardNumber:'',favoriteCatagoriesList:[]};
        self.pop=false;
        self.hiphop=false;
        self.dance=false;
        self.rap=false;
        self.rock=false;
        self.countries=[];

        self.userService=UserService;

        /********************************connecting to website********************************/
        let cookie = localStorageService.cookie.get('user');
        self.UserService = UserService;

        if(cookie && !UserService.isLoggedIn){
            let username = cookie['username'];
            data = {username : username, usertoken : cookie['usertoken'],lastLogin:cookie['lastLogin']};
            UserService.login(data).then(function (success) {
                data = {username : username, usertoken: success.data.token,lastLogin:cookie['lastLogin']};
                UserService.lastLogin=cookie['lastLogin'];
                localStorageService.cookie.set("user", JSON.stringify(data), 3); //3 days to expire
            }, function (error) {
                //self.errorMessage = error.data;
                console.log('login has failed. error: '+JSON.stringify(error.data));
                //$window.alert('log-in has failed');
            }).then(function () {
                if(self.userService.isLoggedIn)
                {
                    $location.path('/');
                }
            });
        }
        else if(cookie && UserService.isLoggedIn)
        {
            $location.path('/');
        }
        /********************************connecting to website********************************/

        self.getCountries = function () {
            $http.get("countries.xml", {
                transformResponse: function (cnv) {
                    var x2js = new X2JS();
                    var aftCnv = x2js.xml_str2json(cnv);
                    return aftCnv;
                }
            }).then(function (response) {
                response.data.Countries.Country.forEach(function (item) {
                    var name = item.Name;
                    var toAdd = { "name":name};
                    self.countries.push(toAdd);
                })
            })

        };


        self.clickRegister = function(isRegFormValid) {
            if(!self.userService.isLoggedIn&&isRegFormValid)
            {

                if(self.pop) self.user.favoriteCatagoriesList.push("pop");
                if(self.hiphop) self.user.favoriteCatagoriesList.push("hip hop");
                if(self.dance) self.user.favoriteCatagoriesList.push("dance");
                if(self.rap) self.user.favoriteCatagoriesList.push("rap");
                if(self.rock) self.user.favoriteCatagoriesList.push("rock");

                if(self.user.favoriteCatagoriesList.length>0)
                {
                    self.user.country=self.user.country.name;
                    $http.post('/registerNewUser', self.user)
                        .then(function(response) {
                            let isRegistered = response.data;
                            if(isRegistered)
                            {
                                $window.alert("Registered Successfully");
                                $location.path('/login');
                            }
                            else{
                                $window.alert("Could not register - username already exist");
                                $location.path('/');
                            }

                            return Promise.resolve(response);
                        })
                        .catch(function (e) {
                            return Promise.reject(e);
                        });
                }
            }
        };



    }]);

//-------------------------------------------------------------------------------------------------------------------

app.controller('historyController', ['localStorageService','$location','UserService','$scope','$http',
    function(localStorageService,$location,UserService,$scope,$http) {
        let self = this;
        self.userService= UserService;
        $scope.dialogDetails = "";

        self.init=function () {
            if(!self.userService.isLoggedIn)
            {
                $location.path('/');
            }
            else
            {
                $scope.historyOrders= [];
                $scope.historyData= []
                self.historyUrl="http://localhost:4000/userOrdersHisotry?username=" +  self.userService.userName;
                $http.get(self.historyUrl).then(function(historyData){
                    var data = [];
                    $scope.historyData= historyData.data;
                    for (var i=0; i<historyData.data.length; i++)
                    {
                        var orderID = historyData.data[i].oID;
                        data.push("order ID: " + orderID);            // rows[0]
                        var orderDate = historyData.data[i].orderDate;
                        data.push("Order date: " + orderDate.substring(0,16));        // rows[1]
                        var totalCost = historyData.data[i].totalcost;
                        data.push("Total cost: "+ totalCost);            // rows[2]
                        var currency = historyData.data[i].currency;
                        // parse currency to sign
                        if (currency== "dollar")
                        {
                            currency="$";
                        }
                        else if (currency== "shekel")
                        {
                            currency="₪";
                        }
                        else if (currency== "euro")
                        {
                            currency="€";
                        }
                        data.push(currency);            // rows[3]
                    }
                    $scope.historyOrders = chunk(data, 4);
                });
            }
        };

        /********************************connecting to website********************************/
        let cookie = localStorageService.cookie.get('user');
        self.UserService = UserService;

        if(cookie && !UserService.isLoggedIn){
            let username = cookie['username'];
            data = {username : username, usertoken : cookie['usertoken'],lastLogin:cookie['lastLogin']};
            UserService.login(data).then(function (success) {
                data = {username : username, usertoken: success.data.token,lastLogin:cookie['lastLogin']};
                UserService.lastLogin=cookie['lastLogin'];
                localStorageService.cookie.set("user", JSON.stringify(data), 3); //3 days to expire

            }, function (error) {
                //self.errorMessage = error.data;
                console.log('login has failed. error: '+JSON.stringify(error.data));
                //$window.alert('log-in has failed');
            }).then(function () {
                self.init();
            });
        }        /********************************connecting to website********************************/
        else if(self.userService.isLoggedIn)
        {
            self.init();
        }
        else if(!cookie || !self.userService.isLoggedIn)
        {
            $location.path('/');
        }




        self.openDetails = function(chosenOrder) {
           var dData = [];
           var orderID= chosenOrder[0];
           var oID = orderID.substring(10); // drop the "order ID:" part

           for (var i=0; i<$scope.historyData.length ; i++)
           {
               if ($scope.historyData[i]["oID"] == oID)
               {
                   var chosenID =  $scope.historyData[i];
                   var display ="";
                   display += "Order ID: " + chosenID.oID + "<br>";
                   display += "Order Date: " + chosenID.orderDate +"<br>";
                   display += "Shipment Date: " + chosenID.shipmentDate+"<br>";
                   display += "Currency: " + chosenID.currency + "<br>";
                   display += "Total Cost: " + chosenID.totalcost + "<br>";
                   display += "Disks Orders: <br>"
                   display += "-------------------------------------------------- <br>"
                   display += "-------------------------------------------------- <br>"
                   for (var j=0; j<chosenID.disksList.length; j++)
                   {
                       display +="Disk Name: " +chosenID.disksList[j].name + "<br>";
                       display +="Artist: "+ chosenID.disksList[j].artist + "<br>";
                       display +="Publish Date:"+ chosenID.disksList[j].publishDate + "<br>";
                       display +="Quantity Purchased: "+ chosenID.disksList[j].quantity + "<br>";
                       display += "Cost: " +chosenID.disksList[j].cost + "<br>";
                       display += "-------------------------------------------------- <br>";

                   }

              }

            }
            $scope.dialogDetails= display;
            $(function() {
                $( "#dialog" ).dialog({
                    open: function(){
                        jQuery('.ui-widget-overlay').bind('click',function(){
                            "#dialog".dialog('close');
                        });
                    },
                    width: "40%",

                    autoOpen: true,
                    modal: true,

                });
                $("#dialog").html(display);
            });


        };

        }]);
//-------------------------------------------------------------------------------------------------------------------
app.controller('productsController', ['localStorageService','$scope','$http','UserService',function(localStorageService,$scope,$http,UserService) {
    let self = this;
    self.userService = UserService;
    $scope.currency="$";
    $scope.disksToShow=[];
    $scope.allDisks=[];
    $scope.categories = ["","pop", "rock", "rap", "hip hop", "dance"];
    $scope.sortOptions =["name", "artist", "cost"];
    $scope.selectedCategory ="";
    $scope.selectedSort = "";
    $scope.isShowProducts= "Show";
    $scope.isShowRecommended= "Show";
    self.allDisksUrl= "http://localhost:4000/allDisks";
    self.baseRecommendedUrl = "http://localhost:4000/recommendedDisks?username=";
    self.categoryUrl = "http://localhost:4000/disksByCategory?category=";
    self.sortUrl = "http://localhost:4000/sortedDisks?category=";

    // we use this to save all the data of the disks when we press "products"
    $http.get(self.allDisksUrl).then(function(recData){
        $scope.allDisks = recData;

        /********************************connecting to website********************************/
        let cookie = localStorageService.cookie.get('user');
        self.UserService = UserService;

        if(cookie && !UserService.isLoggedIn){
            let username = cookie['username'];
            data = {username : username, usertoken : cookie['usertoken'],lastLogin:cookie['lastLogin']};
            UserService.login(data).then(function (success) {
                data = {username : username, usertoken: success.data.token,lastLogin:cookie['lastLogin']};
                UserService.lastLogin=cookie['lastLogin'];
                localStorageService.cookie.set("user", JSON.stringify(data), 3); //3 days to expire
            }, function (error) {
                //self.errorMessage = error.data;
                console.log('login has failed. error: '+JSON.stringify(error.data));
                //$window.alert('log-in has failed');
            });
        }
        /********************************connecting to website********************************/


    });


    self.showHideProducts = function(isShowProducts) {
        if (isShowProducts == "Show") // in show state
        {
            $http.get(self.allDisksUrl).then(function(recData){
                var data = [];
                $scope.allDisks = recData;
                for (var i=0; i<recData.data.length; i++)
                {
                    var name = recData.data[i].name;
                    data.push("Name: " + name);            // rows[0]
                    var artist = recData.data[i].artist;
                    data.push("Artist: " + artist);        // rows[1]
                    var cost = recData.data[i].cost;
                    data.push("Price: "+ cost);            // rows[2]
                    var pDate = recData.data[i].publishDate;
                    data.push("Publish date: "+ pDate);            // rows[3]
                    var picPath = "/images/" + name +".jpg";
                    data.push(picPath);      // rows[4]
                }
                $scope.disksToShow = chunk(data, 5);
                $scope.isShowProducts = "Hide";
            });

        }
        else  // in hide state
        {
            $scope.disksToShow = [];
            $scope.isShowProducts = "Show";
            $scope.selectedCategory ="";
            $scope.selectedSort = "";
        }
    };// end function showHideProducts

        self.showHideRecommended = function(isShowRecommended) {
        if (isShowRecommended == "Show") // in show state
        {
            $http.get(self.baseRecommendedUrl + self.userService.userName).then(function(recData) {
                var recJson = recData.data;
                var disksList = [];
                for (var catIndex = 0; catIndex < recJson.length; catIndex++) {
                    var catDisks = recJson[catIndex]['disksList'];
                    for (var i = 0; i < catDisks.length; i++) {
                        disksList.push(catDisks[i]);
                    }
                }

                // this returns an array as a set
                var disksList = disksList.filter(function (item, pos) {
                    return disksList.indexOf(item) == pos;
                })

                var recDisksJson = [];
                // for each obj in alldisks json-> if his disk id == disksList[diskIndex]
                // create a new disk object and add to recDisksJson
                for (var diskIndex = 0; diskIndex < disksList.length; diskIndex++)
                {
                    var disksData=  $scope.allDisks.data;

                    for (var item=0; item< disksData.length ; item++ )
                       {
                          if (disksData[item]["pID"] == disksList[diskIndex])
                          {
                              recDisksJson.push(disksData[item]);
                          }
                       }
                }
                var data = [];
                for (var i=0; i<recDisksJson.length; i++)
                {
                    var name = recDisksJson[i]['name'];
                    data.push("Name: " + name);
                    var artist = recDisksJson[i]['artist'];
                    data.push("Artist: " + artist);
                    var cost = recDisksJson[i]['cost'];
                    data.push("Price: "+ cost);
                    var pDate = recDisksJson[i]['publishDate'];
                    data.push("Publish date: "+ pDate);
                    var picPath = "/images/" + name +".jpg";
                    data.push(picPath);
                }
                $scope.recommendedDisks =  chunk(data, 5) ;
                $scope.isShowRecommended = "Hide";
            });

        }
        else  // in hide state
        {
            $scope.recommendedDisks = []
            $scope.isShowRecommended = "Show";
        }
    };// end of showHideRecommended

    $scope.filterByCategory = function() {
        $scope.selectedSort= ""
        if($scope.selectedCategory!="") // caregory selected
        {
            self.categoryUrl+= $scope.selectedCategory;
            $http.get(self.categoryUrl).then(function(recData){
                var data = [];
                for (var i=0; i<recData.data.length; i++)
                {
                    var name = recData.data[i].name;
                    data.push("Name: " + name);            // rows[0]
                    var artist = recData.data[i].artist;
                    data.push("Artist: " + artist);        // rows[1]
                    var cost = recData.data[i].cost;
                    data.push("Price: "+ cost);            // rows[2]
                    var pDate = recData.data[i].publishDate;
                    data.push("Publish date: "+ pDate);            // rows[3]
                    var picPath = "/images/" + name +".jpg";
                    data.push(picPath);      // rows[4]
                }
                $scope.disksToShow = chunk(data, 5);
            });

        }
        else  // show all
        {
            $http.get(self.allDisksUrl).then(function(recData){
                var data = [];
                for (var i=0; i<recData.data.length; i++)
                {
                    var name = recData.data[i].name;
                    data.push("Name: " + name);            // rows[0]
                    var artist = recData.data[i].artist;
                    data.push("Artist: " + artist);        // rows[1]
                    var cost = recData.data[i].cost;
                    data.push("Price: "+ cost);            // rows[2]
                    var pDate = recData.data[i].publishDate;
                    data.push("Publish date: "+ pDate);            // rows[3]
                    var picPath = "/images/" + name +".jpg";
                    data.push(picPath);      // rows[4]
                }
                $scope.disksToShow = chunk(data, 5);
            });
        }


        self.categoryUrl = "http://localhost:4000/disksByCategory?category=";
    }; // end of filterByCategory

    $scope.sortBy = function() {
        if ($scope.selectedSort != "") {
            if ($scope.selectedCategory == "")
            {
                $scope.selectedCategory = "all";
            }
            self.sortUrl += $scope.selectedCategory + "&sortType=" + $scope.selectedSort;

            $http.get(self.sortUrl).then(function (recData) {
                var data = [];
                for (var i = 0; i < recData.data.length; i++) {
                    var name = recData.data[i].name;
                    data.push("Name: " + name);            // rows[0]
                    var artist = recData.data[i].artist;
                    data.push("Artist: " + artist);        // rows[1]
                    var cost = recData.data[i].cost;
                    data.push("Price: " + cost);            // rows[2]
                    var pDate = recData.data[i].publishDate;
                    data.push("Publish date: " + pDate);            // rows[3]
                    var picPath = "/images/" + name + ".jpg";
                    data.push(picPath);      // rows[4]
                }
                $scope.disksToShow = chunk(data, 5);
            });
        }
        self.sortUrl = "http://localhost:4000/sortedDisks?category=";

    };

    self.addToCart = function(disk) {
        if (self.userService.isLoggedIn)
        {
            var existInCart = false;
            var addedName = disk[0];
            addedName = addedName.substring(6);
            var currLocalStorage = localStorageService.get('cart');

            if (currLocalStorage != null)
            {
                for (var i=0; i<currLocalStorage.length; i+=2)
                {
                    var toCompare = currLocalStorage[i][0].substring(6)
                    if( addedName == toCompare)
                    {
                        existInCart = true;
                        currLocalStorage[i+1] += 1;
                        window.alert("Disk added to cart !");
                    }
                }
            }
            if (!existInCart)
            {
                if (currLocalStorage == null)
                {
                    currLocalStorage = [];
                }
                currLocalStorage.push(disk);
                currLocalStorage.push(1);
                window.alert("Disk added to cart !");
            }

            localStorageService.set('cart', currLocalStorage);
        }

    }


    }]);

//-------------------------------------------------------------------------------------------------------------------
app.factory('UserService', ['$location','$http', function($location,$http) {
    let service = {};
    service.isLoggedIn = false;
    service.userName ="guest";
    service.lastLogin="";
    service.login = function(user) {

        return $http.post('/loginUser', user)
            .then(function(response) {
                let token = response.data.token;
                let canLogin=response.data.canLogin;
                let lastLoginDate=response.data.lastLoginDate;
                $http.defaults.headers.common = {
                    'my-Token': token,
                    'user' : user.username
                };
                if(canLogin)
                {
                    service.isLoggedIn = true;
                    service.userName = user.username;
                    //$location.path('/');
                }
                else
                    service.isLoggedIn = false;

                return Promise.resolve(response);
            })
            .catch(function (e) {
                return Promise.reject(e);
            });
    };
    return service;
}]);
//-------------------------------------------------------------------------------------------------------------------
app.config(['$locationProvider', function($locationProvider) {
    $locationProvider.hashPrefix('');
}]);
app.config( ['$routeProvider', function($routeProvider) {
    $routeProvider
        .when("/", {
            templateUrl : "views/home.html",
            controller : "homeController"
        })
        .when("/login", {
            templateUrl : "views/login.html",
            controller : "loginController"
        })
        .when("/products", {
            templateUrl : "views/products.html",
            controller: 'productsController'
        })
        .when("/about", {
            templateUrl : "views/about.html",
            controller: 'aboutController'
        })
        .when("/register", {
            templateUrl : "views/register.html",
            controller: 'registerController'
        })
        .when("/logout", {
            templateUrl : "views/home.html",
            controller: 'logoutController'
        })
        .when("/history", {
            templateUrl : "views/history.html",
            controller: 'historyController'
        })
        .when("/cart", {
            templateUrl : "views/cart.html",
            controller: 'cartController'
        })
        .otherwise({ templateUrl : "views/home.html",
            controller : "homeController"
        });
}]);

//-------------------------------------------------------------------------------------------------------------------
app.controller('logoutController', ['localStorageService','UserService','$location', function (localStorageService,UserService,$location) {
    let vm = this;
    vm.userService = UserService;
    vm.userService.isLoggedIn=false;
    vm.userService.userName ="guest";
    vm.userService.lastLogin="";
    localStorageService.cookie.remove('user');
    localStorageService.remove('cart');
    $location.path('/');

}
]);

//-------------------------------------------------------------------------------------------------------------------

app.controller('aboutController', ['localStorageService','UserService','$location', function (localStorageService,UserService,$location) {
    let self = this;


    /********************************connecting to website********************************/
    let cookie = localStorageService.cookie.get('user');
    self.UserService = UserService;

    if(cookie && !UserService.isLoggedIn){
        let username = cookie['username'];
        data = {username : username, usertoken : cookie['usertoken'],lastLogin:cookie['lastLogin']};
        UserService.login(data).then(function (success) {
            data = {username : username, usertoken: success.data.token,lastLogin:cookie['lastLogin']};
            UserService.lastLogin=cookie['lastLogin'];
            localStorageService.cookie.set("user", JSON.stringify(data), 3); //3 days to expire
        }, function (error) {
            //self.errorMessage = error.data;
            console.log('login has failed. error: '+JSON.stringify(error.data));
            //$window.alert('log-in has failed');
        });
    }
    /********************************connecting to website********************************/

}
]);

//-------------------------------------------------------------------------------------------------------------------
app.controller('cartController', ['$location','$scope','localStorageService','UserService', function ($location,$scope,localStorageService,UserService) {
    let self = this;
    self.userService = UserService;
    self.totalCost=0;
    $scope.currency="$";
    $scope.cartView = [];

    self.init=function () {
        if (self.userService.isLoggedIn)
        {
            var currenctLocalStorage = localStorageService.get('cart');
            if (currenctLocalStorage != null)
            {
                var data = [];
                for (var i=0; i<currenctLocalStorage.length ; i+=2)
                {
                    var name =currenctLocalStorage[i][0];
                    data.push(name);            // rows[0]
                    var artist = currenctLocalStorage[i][1];
                    data.push( artist);        // rows[1]
                    var cost = currenctLocalStorage[i][2];
                    data.push(cost);            // rows[2]
                    var pDate = currenctLocalStorage[i][3];
                    data.push(pDate);            // rows[3]
                    var picPath = currenctLocalStorage[i][4];
                    data.push(picPath);      // rows[4]
                    // quantity
                    data.push("Quantity: " +currenctLocalStorage[i+1]);

                    self.totalCost+=(currenctLocalStorage[i+1]*cost.substring(7));

                }

                $scope.cartView = chunk(data, 6);

            }
        }
    };

    /********************************connecting to website********************************/
    let cookie = localStorageService.cookie.get('user');
    self.UserService = UserService;

    if(cookie && !UserService.isLoggedIn){
        let username = cookie['username'];
        data = {username : username, usertoken : cookie['usertoken'],lastLogin:cookie['lastLogin']};
        UserService.login(data).then(function (success) {
            data = {username : username, usertoken: success.data.token,lastLogin:cookie['lastLogin']};
            UserService.lastLogin=cookie['lastLogin'];
            localStorageService.cookie.set("user", JSON.stringify(data), 3); //3 days to expire

        }, function (error) {
            //self.errorMessage = error.data;
            console.log('login has failed. error: '+JSON.stringify(error.data));
            //$window.alert('log-in has failed');
        }).then(function () {
            self.init();
        });
    }        /********************************connecting to website********************************/
    else if(cookie&&UserService.isLoggedIn)
    {
        self.init();
    }
    else if(!cookie|| !UserService.isLoggedIn)
    {
        $location.path('/');
    }




    self.openDetails = function (disk) {
        var display ="";
        display += "Disk Name: " + disk[0].substring(6) + "<br>";
        display += "Artist: " + disk[1].substring(7) + "<br>";
        display += "Cost: " + disk[2].substring(6) + "<br>";
        display += "Publish date: " + disk[3].substring(13) + "<br>";
        display += "Quantity: " + disk[5].substring(9) + "<br>";

        $(function() {
            $( "#cartDialog" ).dialog({
                open: function(){
                    jQuery('.ui-widget-overlay').bind('click',function(){
                        "#cartDialog".dialog('close');
                    });
                },
                width: "40%",

                autoOpen: true,
                modal: true,

            });
            $("#cartDialog").html(display);
        });
    }

    self.purchase = function () {
        window.alert("Not supported yet");
    };

    self.clear=function () {
        if(localStorageService.get('cart'))
        {
            localStorageService.remove('cart');
            $location.path('/');
        }

    };

    self.plus=function (disk) {
            var addedName = disk[0];
            addedName = addedName.substring(6);
            var currLocalStorage = localStorageService.get('cart');
            var newQuantity=0;
            var existInCart=false;
            if (currLocalStorage != null)
            {
                for (var i=0; i<currLocalStorage.length; i+=2)
                {
                    var toCompare = currLocalStorage[i][0].substring(6)
                    if( addedName == toCompare)
                    {

                        existInCart=true;
                        currLocalStorage[i+1] += 1;
                        newQuantity=currLocalStorage[i+1];

                    }
                }
            }
        if (!existInCart)
        {
            if (currLocalStorage == null)
            {
                currLocalStorage = [];
            }
            currLocalStorage.push(disk);
            currLocalStorage.push(1);
            newQuantity=1;
           // window.alert("Disk added to cart !");
        }

        localStorageService.set('cart', currLocalStorage);
        disk[5]="Quantity: "+newQuantity;
        var costToAdd=parseInt(disk[2].substring(7));
        self.totalCost+=costToAdd;


    };

    self.minus=function (disk) {
        var addedName = disk[0];
        addedName = addedName.substring(6);
        var currLocalStorage = localStorageService.get('cart');
        var newQuantity=0;
        var deleteFromStorage=false;
        var indexToDelete;
        if (currLocalStorage != null)
        {
            for (var i=0; i<currLocalStorage.length; i+=2)
            {
                var toCompare = currLocalStorage[i][0].substring(6)
                if( addedName == toCompare)
                {

                    if(currLocalStorage[i+1]==1)
                    {
                        deleteFromStorage=true;
                        indexToDelete=i;
                    }
                    if(currLocalStorage[i+1]>0)
                    {
                        var costToRemove=parseInt(disk[2].substring(7));
                        self.totalCost-=costToRemove;

                        currLocalStorage[i+1] -= 1;
                        newQuantity=currLocalStorage[i+1];
                        //window.alert("Disk removed from cart !");
                    }
                }
            }
        }
        if(deleteFromStorage)
        {
            var newStorage=[];
            for(var j=0;j<currLocalStorage.length;j+=2)
            {
                if(j!=indexToDelete)
                {
                    newStorage.push(currLocalStorage[j]);
                    newStorage.push(currLocalStorage[j+1]);
                }
            }
            currLocalStorage=newStorage;
        }

        localStorageService.set('cart', currLocalStorage);
        disk[5]="Quantity: "+newQuantity;
    };


}
]);
//-------------------------------------------------------------------------------------------------------------------

// this function is to make a view as a row
function chunk(arr, size) {
    var newArr = [];
    for (var i=0; i<arr.length; i+=size) {
        newArr.push(arr.slice(i, i+size));
    }
    return newArr;
}
