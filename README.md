xc.firebase 
==========
###use firebase.com with angularJS the easy way!
You know firebase.com? You love angularJS? You played with angularFire before? 

Well, I did so as well, and was somehow disappointed with the way angularFire is written, so I rolled my own.
I believe that this is more straight forward in design, and it fixes some of the issues angularFire is struggling with (and hopefully doesn't introduce new ones!)

##Reasons
The main reason for having a provider is, there should only be one firebase per app, and I don't want to type a 
connection url all the time.
Second, to me it's clearer to use  a provider (or even better a service) for data handling.

##How to use?
Unlike angularFire it is implemented as provider.
Usage is easy: 

#####1. include the javascript in your html:
```html
<script type="text/javascript" src="xcFirebase.js"></script>
```

#####2. Then, in your app config you write:
```javascript
angular.module( 'myapp', ['xc.firebase'])
.config(function myappConfig($firebaseProvider){
  $firebaseProvider.connect('myFirebase');
});
```
This sets the rootpath to your firebase, e.g. https://myFirebase.firebaseio.com

#####3 a. Use it in your controller:
```javascript
.controller('myListController', function( $scope, $firebase ){
  $firebase.child( 'mydata' ).ScopedCollection( $scope, 'list' )
  .then(function(snap){
    // do something, e.g. hide a loading indicator
  });
})
.controller('myDetailController', function( $scope, $firebase, detailId ){
  $firebase.child( 'mydata/' + detailId ).watch( $scope, 'data' ) 
  .then(function(snap){ 
    // snapshot provided for setup purposes, e.g. setting pagetitle and such
  });
});
```
#####3 b. ...or as a service:
```javascript
.factory('myService', ['$q', '$firebase', function( $q, $firebase ) {

    var myData = $firebase.connectTo('myData');
    
    return {
        "getAll": function(oncomplete) {
            return myData.collection(oncomplete);
        },
        "getById": function(id) {
            return myData.child(id);
        },
        "remove": function(id) {
            myData.child(id).remove();
        }
    };
}])

.controller( 'myListCtrl', function( $scope, myService ) {

    $scope.data = myService.getAll(function(data) {
      console.log('all arrived!');
    });
     
})

.controller('myDetailCtrl', function ( $scope, $routeParams, myService ) {
    
    $scope.detailId = $routeParams.id;
    myService.getById($routeParams.id).watch( $scope, 'data' ).then(function(data) {
        
    });

});
```

##Methods
####watch(scope, scopeVar)
provides implicit update of your data, means your data is live updated and always in sync. 
It takes two parameters:
- your $scope
- the name of the variable on your $scope where your data will go to

returns a promise once the data is completely loaded, with the current snapshot

```javascript
$firebase.watch($scope, 'data').then(function(snap) {
  //--> init your data editing here, and only here
}
```

####collection([oncomplete])
The collection method is great for use in a service, and gives you more control over when your data is updated, 
as you have to explicitly tell it to do so.
It takes a function to call when data is completely loaded as an optional parameter.

```javascript
$firebase.collection(function(snap){
  //--> to stop a loading indicator previously started, for example
});
```

####scopedCollection(scope, scopeVar)
The scopedCollection method is similar to collection, but is intended for direct use on a controller. It gives you more
control over when your data is updated, as you have to explicitly tell it to do so.
It takes two parameters:
- your $scope
- the name of the variable on your $scope where your data will go to

returns a promise once the data is completely loaded, with the current snapshot

```javascript
$firebase.scopedCollection( $scope, 'data' ).then(function(snap){
  //--> to stop a loading indicator previously started, for example
});
```

Both collections are standard javascript array objects, with the following extensions:
####function add(item)
use it to add an item to your firebase

####function update(item)
use it to update an item within your firebase

####function remove(itemOrId)
deletes an item from your firebase. It takes the item or an id as its param.

####function indexOfId(id)
returns the index of an id within the collection 

####function itemById(id)
returns the item for the given id

##What's more?
Despite of the (scoped)collection and watch methods, there are several more methods to resemble the firebase methods, but wrapped 
in a promise. For documentation on those please refer to the source and the firebase documentation to know what they're doing.
I implemented those primarily for completeness, all I really used so far is watch and collection, which are sufficient 
for most purposes.

##Authentication
xc.firebase now supports firebase's SimpleLogin.
All you need to do is

#####1. Setup authentication in your app config:

```javascript
config( function myAppConfig ( $routeProvider, $locationProvider, $firebaseProvider ) {
    
    $routeProvider
    .when( '/myFirstPage', {
      authRequired: true,
      controller: firstPageCtrl,
      templateUrl: 'firstpage.tmpl.html'
    })
    .when( '/mySecondPage', {
      authRequired: true,
      controller: secondPageCtrl,
      templateUrl: 'secondpage.tmpl.html'
    })
    .when( '/about', {
      authRequired: false,
      controller: aboutCtrl,
      templateUrl: 'about.tmpl.html'
    })    
    .otherwise({ redirectTo: '/' });

    $firebaseProvider
        .connect('myFirebase')
        .authenticate(['password'], '/login');

});
```
In your routeProvider you define wether or not a location requires authenticated access by setting 'authRequired: true'.
The authenticate method takes two params, one is an array of allowed authentication methods, the other is a path to your 
login screen.

#####2. initialize it on app run

```javascript
.run( function run ( $firebase ) {

    $firebase.initialize();
    
});
```
This is mandatory (for now) to kickoff authentication.

##Samples
#####1. Receive a notification on any datachange
To receive and notify upon any data changed, use the following in your controller or service
```javascript
$firebase.connectTo('products').on('child_changed', function(item) {
    console.log('data changed');
});
```
    
##Roadmap
- definition of indexes on any field similar to FirebaseIndex
- how about an adapter to indexedDB for offline storage and syncing, so you can start offline? (just an idea for now!)
- don't know, any ideas?

##License
MIT


