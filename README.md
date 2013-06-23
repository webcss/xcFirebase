xcFirebase - integrate firebase.com with angularJS!
==========
You know firebase.com? You love angularJS? You played with angularFire before? 

Well, I did so as well, and was somehow disappointed with the way angularFire is written, so I rolled my own.
I believe that this is more straight forward in design, and it fixes some of the issues angularFire is struggling with (and hopefully doesn't introduce new ones!)


Unlike angularFire it is implemented as provider.
Usage is easy: 
```html
<script type="text/javascript" src="xcFirebase.js"></script>
```

Then, in your app config:
```javascript
angular.module( 'myapp', [xc.firebase])
.config(function myappConfig($firebaseProvider){
  $firebaseProvider.connect('myFirebase');
});
```

in your controller:
```javascript
.controller('myListController', function($scope, $firebase){
  $scope.list = $firebase.collection('mydata', $scope);
})
.controller('myDetailController', function($scope, $firebase){
  $firebase.watch('mydata/'+detailId, $scope, 'data').then(function(data){
    // data provided for setup purposes, e.g. setting pagetitle and such
  });
});
```

Reasons
-------
The main reason for having a provider is, there should only be one firebase per app, and you don't want to type a 
connection url all the time.
Second, to me it's clearer to use at least a provider or even better a service for data handling.

What's more?
------------
Despite of the collection and watch methods, there are several more methods to resemble the firebase methods, but wrapped into
a promise. So for documentation, refer to the firebase documentation to know what they're doing.
I implemented those primarily for completeness, all I really used so far is watch and collection which are sufficient 
for most purposes.


Deprecated xcFire & xcFireCollection factories
----------------------------------------------
The following two are deprecated and will be removed in the near future. You've been warned!

xcFire
======
xcFire serves you with implicit update of your data, means your data is live updated and always in sync. 
It takes three parameters:
1. an instance of Firebase or an URL to your data
2. your $scope
3. name of the variable on your $scope where your data will go to

```javascript
xcFire('path-to-mydata', $scope, 'data').then(function() {
  //--> init your data editing here, and only here
}
```

xcFireCollection
================
xcFireCollection gives you more control over when your data is updated, as you have to explicitly tell it to do so.
It takes two parameters, of which the second is optional.
1. an instance of Firebase or an URL to your data
2. a function to be executed when your data is loaded.

```javascript
xcFireCollection('path-to-mydata', function() {
  //--> to stop a loading indicator previously started, for example
}
```

It provides the following methods:
function add(item)
---
use it to add an item to your firebase

function update(item)
------
use it to update an item within your firebase

function remove(itemOrId)
-------
deletes an item from your firebase. It takes the item or an id as its param.

function indexOfId(id)
---------
returns the index of an id within the collection 

function itemById(id)
--------
returns the item for the given id

Roadmap
--------
- implementation as a provider to centralize firebase binding (maybe)

License
-------
MIT


