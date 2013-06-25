xcFirebase - integrate firebase.com with angularJS!
==========
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

#####3. Use it in your controller:
```javascript
.controller('myListController', function($scope, $firebase){
  $firebase.collection($scope, 'list', 'mydata')
  .then(function(snap){
    // do something, e.g. hide a loading indicator
  });
})
.controller('myDetailController', function($scope, $firebase, detailId){
  $firebase.watch($scope, 'data', 'mydata/'+detailId) 
  .then(function(snap){ 
    // snapshot provided for setup purposes, e.g. setting pagetitle and such
  });
});
```


##What's more?
Despite of the collection and watch methods, there are several more methods to resemble the firebase methods, but wrapped 
in a promise. So for documentation, refer to the source and the firebase documentation to know what they're doing.
I implemented those primarily for completeness, all I really used so far is watch and collection, which are sufficient 
for most purposes.


##Methods
####watch(scope, scopeVar[, path])
provides implicit update of your data, means your data is live updated and always in sync. 
It takes three parameters:
- your $scope
- name of the variable on your $scope where your data will go to
- an optional path, relative to root. If omitted, the activeConnection() is used

returns a promise once the data is completely loaded, with the current snapshot

```javascript
$firebase.watch($scope, 'data', 'path-to-mydata').then(function(snap) {
  //--> init your data editing here, and only here
}
```

####collection(scope, scopeVar[, path])
The collection method gives you more control over when your data is updated, as you have to explicitly tell it to do so.
It takes three parameters:
- your $scope
- name of the variable on your $scope where your data will go to
- an optional path, relative to root. If omitted, the activeConnection() is used

returns a promise once the data is completely loaded, with the current snapshot

```javascript
$firebase.collection($scope, 'data', 'path-to-mydata').then(function(snap){
  //--> to stop a loading indicator previously started, for example
});
```

The scopeVar collection is a standard javascript array object, with the following extensions:
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

##Roadmap
- how about an adapter to indexedDB for offline storage and syncing, so you can start offline? (just an idea for now!)
- don't know, any ideas?

##License
MIT


