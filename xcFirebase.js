angular.module('firebase', [])

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

    function FireItem(snap) {
        this.$ref = snap.ref();
        this.$id  = snap.name();
        this.$priority = snap.getPriority();
        angular.extend( this, snap.val() );
    }

    function fireItem(snap) {
        return angular.extend({
               "$ref": snap.ref(),
               "$id" : snap.name(),
               "$priority": snap.getPriority()
            },
            snap.val()
        );
    }
    
    return function(urlOrRef, oncomplete) {
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

;

