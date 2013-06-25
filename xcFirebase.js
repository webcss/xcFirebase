angular.module('xc.firebase', [])

.value('Firebase', Firebase)

.provider('$firebase', function() {

    var module = this;

    module.fbRef = null;

    module.connect = function(dbName) {
        dbName = 'https://' + dbName + '.firebaseio.com';
        module.fbRef = new Firebase(dbName);
    };

    function Fireitem(snap) {
        this.$ref = snap.ref();
        this.$id  = snap.name();
        this.$priority = snap.getPriority();
        angular.extend(this, snap.val());
    }
    
    function defOnComplete(error) {
        if(error){
            d.reject(error);
        } else {
            d.resolve();
        }
    }

    module.$get = ['$timeout', '$q', '$parse', function($timeout, $q, $parse) {

        var activeConnection = module.fbRef;

        var FB = {
            login: function(token) {
                var d = $q.defer();
                FB.root().auth(token, 
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
            },
            logout: function() {
                FB.root().unauth();
            },
            connect: function(path, options) {
                var ref = FB.root().child(path);
                if (options) {
                    for(var key in options) {
                        switch(key) {
                            case 'startAt':
                            case 'endAt':
                            case 'limit':
                                ref[key](options[key]);
                                break;
                            default:
                                throw new Error('invalid firebase option: ' + key);
                        }
                    }
                }
                activeConnection = ref;
                return FB;
            },
            activeConnection: function() {
                return activeConnection;
            },
            root: function() {
                return module.fbRef;
            },
            once: function(eventType) {
                var d = $q.defer();
                var ref = FB.activeConnection();
                ref.once(eventType, function(snap){
                    d.resolve(new Fireitem(snap));
                });
                return d.promise;
            },
            on: function(eventType) {
                var d = $q.defer();
                var ref = FB.activeConnection();
                ref.on(eventType, function(snap){
                    d.resolve(new Fireitem(snap));
                });
                return d.promise;
            },
            off: function(eventType) {
                var ref = FB.activeConnection();
                ref.off(eventType);
            },
            set: function(value, priority) {
                var d = $q.defer();
                 var ref = FB.activeConnection();
                if (priority) {
                    ref.set(value, function(error) {
                        if(error){
                            d.reject(error);
                        } else {
                            d.resolve();
                        }
                    });
                } else {
                    ref.setWithPriority(value, priority, function(error) {
                        if(error){
                            d.reject(error);
                        } else {
                            d.resolve();
                        }
                    });
                }
                return d.promise;
            },
            update: function(children, priority) {
                var d = $q.defer();
                var ref = FB.activeConnection();
                ref.update(children, function(error) {
                    if(error) {
                        d.reject(error);
                    } else {
                        d.resolve();
                        if(priority) {
                            ref.setPriority(priority, function(error) {
                                if(error){
                                    d.reject(error);
                                } else {
                                    d.resolve();
                                }
                            });
                        }
                    }
                });
                
                return d.promise;
            },
            push: function(value, priority) {
                var d = $q.defer();
                var ref = FB.activeConnection();
                ref.push(value, function(error) {
                    if(error) {
                        d.reject(error);
                    } else {
                        d.resolve();
                        if(priority) {
                            ref.setPriority(priority, function(error) {
                                if(error){
                                    d.reject(error);
                                } else {
                                    d.resolve();
                                }
                            });
                        }
                    }
                });
                return d.promise;
            },
            remove: function(path) {
                var d = $q.defer();
                var ref = (path)? FB.activeConnection().child(path): FB.activeConnection();
                ref.remove(function(error) {
                    if(error){
                        d.reject(error);
                    } else {
                        d.resolve();
                    }
                });
                return d.promise;
            },
            watch: function(scope, name, path) {
                var d = $q.defer();
                var ref = (path)? FB.root().child(path): FB.activeConnection();
                var stopWatch = angular.noop;
                var firstCall = true;
                var localValue, remoteValue;

                function startWatch() {
                    stopWatch = scope.$watch(name, function() {
                        if (firstCall) {
                            firstCall = false;
                            return;
                        }
                        localValue = JSON.parse(angular.toJson($parse(name)(scope)));
                        if (!angular.equals(localValue, remoteValue)) {
                            ref.ref().set(localValue);
                        }
                    }, true);
                }

                scope.$on('$destroy', function() {
                    stopWatch();
                    ref.off('value');
                });

                ref.on('value', function(snap) {
                    remoteValue = snap.val();
                    if (!angular.equals(remoteValue, localValue)) {
                        stopWatch();
                        $timeout(function() {
                            $parse(name).assign(scope, angular.copy(remoteValue));
                            startWatch();
                        });
                        d.resolve(snap);
                    }
                });

                return d.promise;
            },
            collection: function(scope, name, path) {
                var d = $q.defer();
                var ref = (path)? FB.root().child(path): FB.activeConnection();
                var collection = []; 

                ref.once('value', function(snap) {
                    d.resolve(snap);
                });

                ref.on('child_added', function(snap) {
                    $timeout(function(){
                        collection.push(new Fireitem(snap));
                    });
                });
                ref.on('child_changed', function(snap) {
                    $timeout(function(){
                        var i = collection.indexOfId(snap.name());
                        collection[i] = new Fireitem(snap);
                    });
                });
                ref.on('child_removed', function(snap) {
                    $timeout(function() {
                        var i = collection.indexOfId(snap.name());
                        collection.slice(i, 1);
                    });
                });

                $timeout(function() {
                    $parse(name).assign(scope, collection);
                });

                scope.$on('$destroy', function() {
                    ref.off('child_added');
                    ref.off('child_changed');
                    ref.off('child_removed');
                });
                
                angular.extend(collection, {
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
                });

                return d.promise;
            }
        };

        return FB;
    }];
    
})

;

