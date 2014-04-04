Ext.define('StateRouter.staterouter.SequentialPromiseResolver', {
    singleton: true,

    // special reserved key used to determine which state the results belong to
    // (prefixed with numeric since it's unlikely to be used as a JS variable)
    STATE_NAME_KEY: '1stateName',

    handleResults: function (results, allResults) {
        var me = this,
            stateName;

        // STATE_NAME_KEY's value if the name of the state
        // which these async results belong to.
        if (results && results[me.STATE_NAME_KEY]) {
            stateName = results[me.STATE_NAME_KEY];

            delete results[me.STATE_NAME_KEY];
            allResults[stateName] = results;
        }
    },

    chainPromises: function (existingPromise, stateObj, allResults) {
        var me = this,
            pathNode = stateObj.pathNode,
            scope = stateObj.scope,
            newPromise;

        // Wait until previous controller's resolves are resolved,
        // then resolve "this" controller's resolves.
        newPromise = existingPromise.then(function (results) {
            var promises = {},
                resolvePromiseFn;

            me.handleResults(results, allResults);

            // A bit of a hack, it's difficult to track which state
            // the results of a promise belong to since we're chaining
            // them and some states might not have a controller or resolve block.
            // So we create this additional promise a special key to store the
            // state name.
            promises[me.STATE_NAME_KEY] = new RSVP.Promise(function (resolve) { resolve(pathNode.getDefinition().getName()); });

            for (var resolveKey in stateObj.resolve) {
                if (stateObj.resolve.hasOwnProperty(resolveKey)) {
                    if (resolveKey === me.STATE_NAME_KEY) {
                        throw new Error('Illegal resolve identifier "' + me.STATE_NAME_KEY + '". This identifier is reserved.');
                    }

                    // Create a promise which calls the resolve function
                    resolvePromiseFn = stateObj.resolve[resolveKey];
                    promises[resolveKey] = me.createPromise(resolvePromiseFn, scope, pathNode.getOwnParams(), pathNode.getAllParams(), allResults);
                }
            }

            return RSVP.hash(promises, pathNode.getDefinition().getName());
        });

        return newPromise;
    },

    createPromise: function (resolveFn, scope, ownParams, allParams, allResults) {
        return new RSVP.Promise(function (resolve, reject) {
            resolveFn.call(scope, resolve, reject, ownParams, allParams, allResults);
        });
    },

    /**
     * Returns a promise which will resolve each controller's "resolve"
     * map of promises sequentially, passing the results of all previous
     * resolved promises.
     *
     * promiseArr is specified in the following format:
     *
     * [
     *   {
     *       pathNode: StateRouter.staterouter.PathNode
     *       resolve: {
     *         contact: function() {
      *          return new RSVP.Promise(....);
      *        }
      *      }
      *  },
     *   {   pathNode: StateRouter.staterouter.PathNode,
     *       resolve: {
     *         email: function() {
      *          return new RSVP.Promise(....);
      *        }
      *      }
      *  }
     * ]
     *
     *
     *
     * @param nodeObjsArr the array of promises to resolved in the format defined above
     * @param [previousResults]   input to be passed to the promises
     * @returns the chained promise
     */
    resolve: function (nodeObjsArr, previousResults) {
        var me = this,
            allResults = previousResults || {},
            r = new RSVP.Promise(function (resolve) { resolve(allResults); }),
            i;

        for (i = 0; i < nodeObjsArr.length; i++) {
            if (!nodeObjsArr[i].resolve) {
                nodeObjsArr[i].resolve = {};
            }

            r = me.chainPromises(r, nodeObjsArr[i], allResults);
        }

        // If we have at least one promise, then we need
        // to store the previous promises results.
        if (nodeObjsArr.length > 0) {
            r = r.then(function (results) {
                me.handleResults(results, allResults);
                return new RSVP.Promise(function (resolve) { resolve(allResults); });
            });
        }

        return r;
    }
});