angular.module('xc.firebase', [])

.value('Firebase', Firebase)

.factory('xcFire', ['$q', '$timeout', '$parse', function($q, $timeout, $parse) {

    return function(urlOrRef, scope, name) {
        var ref;
        var d = $q.defer();
        var stopWatch = angular.noop;
        var firstCall = true;
        var localValue, remoteValue;

        if (typeof urlOrRef === "string") {
            ref = new Firebase(urlOrRef);
        } else {
            ref = urlOrRef;
        }

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
                d.resolve();
            }
        });

        return d.promise;
    };

}])


.factory('xcFireCollection', ['$timeout', function($timeout) {

    function fireItem(snap) {
        return angular.extend({
               "$ref": snap.ref(),
               "$id" : snap.name(),
               "$priority": snap.getPriority()
            },
            snap.val()
        );
    }
    
    return function(urlOrRef, scope, oncomplete) {
        var ref;
        var collection = []; 

        if (typeof urlOrRef === "string") {
            ref = new Firebase(urlOrRef);
        } else {
            ref = urlOrRef;
        }

        if (oncomplete) {
            ref.once('value', oncomplete);
        }
        ref.on('child_added', function(snap) {
            $timeout(function(){
                collection.push(fireItem(snap));
            });
        });
        ref.on('child_changed', function(snap) {
            $timeout(function(){
                var i = collection.indexOfId(snap.name());
                collection[i] = fireItem(snap);
            });
        });
        ref.on('child_removed', function(snap) {
            $timeout(function() {
                var i = collection.indexOfId(snap.name());
                collection.slice(i, 1);
            });
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

        return collection;
    };

}])

.provider('$firebase', function() {

    var module = this;

    module.fbRef = null;

    module.connect = function(path) {
        path = 'https://' + path + '.firebaseio.com';
        module.fbRef = new Firebase(path);
    };

    function Fireitem(snap) {
        this.$ref = snap.ref();
        this.$id  = snap.name();
        this.$priority = snap.getPriority();
        angular.extend(this, snap.val());
    }
    

    module.$get = ['$timeout', '$q', '$parse', function($timeout, $q, $parse) {

        var FB = {
            login: function(token) {
                var d = $q.defer();
                module.fbRef.auth(token, 
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
                module.fbRef.unauth();
            },
            connect: function(path) {
                return module.fbRef.child(path);
            },
            root: function() {
                return module.fbRef;
            },
            once: function(path, eventType) {
                var d = $q.defer();
                FB.connect(path).once(eventType, function(snap){
                    d.resolve(new Fireitem(snap));
                });
                return d.promise;
            },
            on: function(path, eventType) {
                var d = $q.defer();
                FB.connect(path).on(eventType, function(snap){
                    d.resolve(new Fireitem(snap));
                });
                return d.promise;
            },
            off: function(path, eventType) {
                FB.connect(path).off(eventType);
            },
            set: function(path, value, priority) {
                var d = $q.defer();
                var ref = FB.connect(path);
                if (priority) {
                    ref.set(value, function() {
                        d.resolve();
                    });
                } else {
                    ref.setWithPriority(value, priority, function() {
                        d.resolve();
                    });
                }
                return d.promise;
            },
            update: function(path, children, priority) {
                var d = $q.defer();
                var ref = FB.connect(path);
                ref.update(children, function() {
                    d.resolve();
                });
                if(priority) {
                    ref.setPriority(priority);
                }
                return d.promise;
            },
            push: function(path, value, priority) {
                var d = $q.defer();
                var ref = FB.connect(path);
                ref.push(value, function() {
                    d.resolve();
                });
                if(priority) {
                    ref.setPriority(priority);
                }
                return d.promise;
            },
            remove: function(path) {
                var d = $q.defer();
                FB.connect(path).remove(function() {
                    d.resolve();
                });
                return d.promise;
            },
            watch: function(path, scope, name) {
                var ref = FB.connect(path);
                var d = $q.defer();
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
                        d.resolve(remoteValue);
                    }
                });

                return d.promise;
            },
            collection: function(path, scope, oncomplete) {
                var ref = FB.connect(path);
                var collection = []; 

                if (oncomplete) {
                    ref.once('value', oncomplete);
                }
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

                return collection;
            }
        };

        return FB;
    }];
    
})


;

