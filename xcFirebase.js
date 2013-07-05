//'use strict';

angular.module('xc.firebase', [])

.value('Firebase', Firebase)
.value('FirebaseSimpleLogin', FirebaseSimpleLogin)

.provider('$firebase', function() {

    var module = this;

    module._ref = null;
    module._authClient = null;

    module.connect = function(dbName) {
        dbName = 'https://' + dbName + '.firebaseio.com';
        module._ref = new Firebase(dbName);
        return module;
    }; 
    module.authenticate = function(authMethods, pathToLogin) {
        module._authMethods = authMethods;
        module._pathToLogin = pathToLogin;
        return module;
    };
    
    function Fireitem(snap) {
        this.$ref = snap.ref();
        this.$id  = snap.name();
        this.$priority = snap.getPriority();
        angular.extend(this, snap.val());
    }

    var FireCollection = {
        indexOfId: function(id) {
            var l = this.length;
            while(l--) {
                if (this[l].$id === id) {
                    return l;
                }
            }
            return -1;
        },
        itemById: function(id) {
            var i = this.indexOfId;
            return (i < -1) ? this[i] : null;
        },
        add: function(item) {
            ref.push(item);
        },
        upsert: function(item) {
            var copy = {};
            for (var key in item) {
                if(key.indexOf('$') !== 0) {
                    copy[key] = item[key];
                }
            }
            item.$ref.set(copy);
        },
        remove: function(itemOrId) {
            item = (typeof itemOrId === "string") ? this.itemById(itemOrId): itemOrId;
            item.$ref.remove();
        }
    };

    module.$get = ['$timeout', '$q', '$parse', 'authClient', 
    function($timeout, $q, $parse, authClient) {

        var Connection = function(path, rootRef) {
            rootRef = rootRef || module._ref;
            this.path = path;
            this.pathRef = rootRef.child(path);
            return this;
        };
        Connection.prototype = {
            "absoluteUrl": function() {
                this.pathRef.toString();
            },
            "child": function(childPath) {
                return new Connection(childPath, this.pathRef);
            },
            "once": function(eventType) {
                var d = $q.defer();
                this.pathRef.once(eventType, function(snap){
                    d.resolve(new Fireitem(snap));
                });
                return d.promise;               
            },
            "on": function(eventType, oncomplete) {
                this.pathRef.on(eventType, function(snap){    
                    oncomplete(new Fireitem(snap));
                });                    
            },
            "off": function(eventType) {
                this.pathRef.off(eventType);
            },
            "set": function(value, priority) {
                var d = $q.defer();
                if (priority) {
                    this.pathRef.setWithPriority(value, priority, function(error) {
                        if(error){
                            d.reject(error);
                        } else {
                            d.resolve();
                        }
                    });
                } else {
                    this.pathRef.set(value, function(error) {
                        if(error){
                            d.reject(error);
                        } else {
                            d.resolve();
                        }
                    });
                }
                return d.promise;
            },
            "update": function(children, priority) {
                var d = $q.defer();
                this.pathRef.update(children, function(error) {
                    if(error) {
                        d.reject(error);
                    } else {
                        if(priority) {
                            this.pathRef.setPriority(priority, function(error) {
                                if(error){
                                    d.reject(error);
                                } else {
                                    d.resolve();
                                }
                            });
                        } else {
                            d.resolve();
                        }
                    }
                });                
                return d.promise;
            },
            "push": function(value, priority) {
                var d = $q.defer();
                var ref;
                ref = this.pathRef.push(value, function(error) {
                    if(error) {
                        d.reject(error);
                    } else {
                        if(priority) {
                            this.pathRef.setPriority(priority, function(error) {
                                if(error){
                                    d.reject(error);
                                } else {
                                    d.resolve(ref.name());
                                }
                            });
                        } else {
                            d.resolve(ref.name());
                        }
                    }
                });
                return d.promise;
            },
            "remove": function() {
                var d = $q.defer();
                this.pathRef.remove(function(error) {
                    if(error){
                        d.reject(error);
                    } else {
                        d.resolve();
                    }
                });
                return d.promise;
            },
            "startAt": function(priority, name) {
                this.pathRef.startAt(priority, name);
                return this;
            },
            "endAt": function(priority, name) {
                this.pathRef.endAt(priority, name);
                return this;
            },
            "limit": function(limit) {
                this.pathRef.limit(limit);
                return this;
            },            
            "watch": function(scope, scopeVar) {
                var self = this;
                var d = $q.defer();
                var stopWatch = angular.noop;
                var firstCall = true;
                var localValue, remoteValue;

                function startWatch() {
                    stopWatch = scope.$watch(scopeVar, function() {
                        if (firstCall) {
                            firstCall = false;
                            return;
                        }
                        localValue = JSON.parse(angular.toJson($parse(scopeVar)(scope)));
                        if (!angular.equals(localValue, remoteValue)) {
                            self.pathRef.ref().set(localValue);
                        }
                    }, true);
                }

                scope.$on('$destroy', function() {
                    stopWatch();
                    self.pathRef.off('value');
                });

                self.pathRef.on('value', function(snap) {
                    remoteValue = snap.val();
                    if (!angular.equals(remoteValue, localValue)) {
                        stopWatch();
                        $timeout(function() {
                            $parse(scopeVar).assign(scope, angular.copy(remoteValue));
                            startWatch();
                        });
                        d.resolve(remoteValue);
                    }
                });

                return d.promise;
            },
            "collection": function(oncomplete) {
                var self = this;
                //var d = $q.defer();
                var collection = []; 

                this.pathRef.once('value', function(snap) {
                    //d.resolve(collection);
                    if(oncomplete) { 
                        oncomplete(snap);
                    }
                });

                this.pathRef.on('child_added', function(snap) {
                    $timeout(function(){
                        collection.push(new Fireitem(snap));
                    });
                });
                this.pathRef.on('child_changed', function(snap) {
                    $timeout(function(){
                        var i = collection.indexOfId(snap.name());
                        collection[i] = new Fireitem(snap);
                    });
                });
                this.pathRef.on('child_removed', function(snap) {
                    $timeout(function() {
                        var i = collection.indexOfId(snap.name());
                        collection.slice(i, 1);
                    });
                });
                
                angular.extend(collection, FireCollection);

                //return d.promise;
                return collection;
            },
            "scopedCollection": function(scope, scopeVar) {
                var self = this;
                var d = $q.defer();
                var collection = self.collection(function(data){
                    d.resolve(data);
                }); 

                $timeout(function() {
                    $parse(scopeVar).assign(scope, collection);
                });

                scope.$on('$destroy', function() {
                    self.pathRef.off('child_added');
                    self.pathRef.off('child_changed');
                    self.pathRef.off('child_removed');
                });

                return d.promise;
            },
            "ondisconnect": function() {
                return this.pathRef.ondisconnect;
            }
        };

        return {
            "initialize": function() {
                authClient.initialize(module._ref, module._authMethods, module._pathToLogin);
            },
            "login": function(token, options) {
                authClient.login(token, options);
            },
            "logout": function() {
                authClient.logout();
            },
            "authenticated": function() {
                return authClient.isAuthenticated();
            },
            "absoluteUrl": function() {
                module._ref.toString();
            },
            "connectTo": function(path) {
                return new Connection(path);
            },
            "servertime": function() {
                return Firebase.ServerValue.TIMESTAMP;
            }
        };
    }];
    
})

.factory('authClient', ['$q', '$timeout', '$rootScope', '$location', function($q, $timeout, $rootScope, $location) {

    var _ref = null;
    var _authClient = null;
    var _authMethods = ["github","persona","twitter","facebook","password"];
    var _pathToLogin = '/login';
    var _redirectTo  = false;
    var _user = null;

    return {
        "initialize": function(ref, authMethods, pathToLogin) {
            var self = this;
            _ref = ref;
            _authMethods = authMethods || ["github","persona","twitter","facebook","password"];
            _pathToLogin = pathToLogin || '/login';
            _redirectTo  = false;
            _user = null;
            if(!FirebaseSimpleLogin) {
                throw new Error('FirebaseSimpleLogin unavailable. Is it really included?');
            }
            _authClient = new FirebaseSimpleLogin(_ref, function(error, user) {
                if (error) {
                    _user = null;
                    $rootScope.$broadcast('firebaseAuth:error', error);
                    console.log('Error: ', error);
                } else if (user) {
                    _user = user;
                    $rootScope.$broadcast('firebaseAuth:login', user);
                    if(_redirectTo) { 
                        $timeout(function() {
                            $location.replace();
                            $location.path(_redirectTo || '/'); 
                        });
                    }
                    console.log('Login', user);
                } else {
                    _user = null;
                    $rootScope.$broadcast('firebaseAuth:logout', user);
                    console.log('Logout', user);
                }
                $rootScope.$on("$routeChangeStart", function(e, next, current) {
                    if (next.authRequired && !_user) {
                        _redirectTo = (!_redirectTo)? $location.path(): _redirectTo;
                        $location.replace();
                        $location.path(_pathToLogin);
                    } 
                });
                $rootScope.logout = function() {
                    self.logout();
                };
            });
        },
        "createUser": function(email, password) {
            if (_authClient && (_authMethods.indexOf('password') >= 0)) {
                _authClient.createUser(email, password, function(error, user){
                    if (error) {
                        _user = null;
                        $rootScope.$broadcast('firebaseAuth:error', error);
                        console.log('Error: ', error);
                    } else if (user) {
                        _user = user;
                        $rootScope.$broadcast('firebaseAuth:create', user);
                        console.log('Created', user);
                    }
                });
            } else {
                console.log('password authentication not supported.');
            }
        },
        "changePassword": function(email, oldPass, newPass) {
            if (_authClient && (_authMethods.indexOf('password') >= 0)) {
                _authClient.changePassword(email, oldPass, newPass, function(error, success) {
                    if (error) {
                        $rootScope.$broadcast('firebaseAuth:error', error);
                        console.log('Error: ', error);
                    } else {
                        $rootScope.$broadcast('firebaseAuth:passwordChanged', success);
                        console.log('Password changed: ', success);
                    }
                });
            } else {
                console.log('password authentication not supported.');
            }
        },
        "login": function(token, options) {
            if (_authClient && (_authMethods.indexOf(token) >= 0)) {
                _authClient.login(token, options);
            } else {
                // custom login
                var d = $q.defer();
                _ref.auth(token, 
                    function(error, result) {
                        if(error) {
                            d.reject(error);
                        } else {
                            d.resolve(result);  
                        } 
                    },
                    function(error) {
                        d.reject(error);
                    }
                );
                return d.promise;
            }
        },
        "logout": function() {
            if (_authClient) {
                _authClient.logout();
            } else {
                _ref.unauth();
            }
        },
        "isAuthenticated": function() {
            return (_user) ? true: false;
        }
    };

}])

;
