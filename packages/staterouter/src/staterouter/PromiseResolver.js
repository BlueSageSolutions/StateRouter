Ext.define('StateRouter.staterouter.PromiseResolver', {
    singleton: true,

    // special reserved key used to determine which state the results belong to
    // (prefixed with numeric since it's unlikely to be used as a JS variable)
    STATE_NAME_KEY: '1stateName',

    emptyPromise: function () {
        return new RSVP.Promise(function (resolve) { resolve(); });
    },

    storeControllerResolvableResults: function (results, state) {
        var me = this,
            stateDefinition,
            controller;

        if (!state.allResolved) {
            state.allResolved = {};
        }

        // STATE_NAME_KEY's value if the name of the state
        // which these async results belong to.
        if (results && results[me.STATE_NAME_KEY]) {
            stateDefinition = StateRouter.staterouter.Router.stateDefinitionMap[results[me.STATE_NAME_KEY]];

            delete results[me.STATE_NAME_KEY];
            state.allResolved[stateDefinition.getName()] = results;

            if (stateDefinition && stateDefinition.getController()) {

                controller = StateRouter.staterouter.Router.getController(stateDefinition.getController());
                controller.resolved = results;
                controller.allResolved = Ext.apply({}, state.allResolved);
            }
        }
    },

    chainControllerPromises: function (existingPromise, pathNode, state) {
        var me = this,
            stateDefinition = pathNode.getDefinition(),
            controllerName = stateDefinition.getController(),
            controller,
            newPromise;

        if (controllerName && (controller = StateRouter.staterouter.Router.getController(controllerName))) {

            if (Ext.isObject(controller.resolve)) {

                // Wait until previous controller's resolves are resolved,
                // then resolve "this" controller's resolves.
                newPromise = existingPromise.then(function (results) {
                    var promises = {},
                        resolvePromiseFn;

                    me.storeControllerResolvableResults(results, state);

                    // A bit of a hack, it's difficult to track which state
                    // the results of a promise belong to since we're chaining
                    // them and some states might not have a controller or resolve block.
                    // So we create this additional promise a special key to store the
                    // state name.
                    promises[me.STATE_NAME_KEY] = new RSVP.Promise(function (resolve) { resolve(stateDefinition.getName()); });

                    for (var resolveKey in controller.resolve) {
                        if (controller.resolve.hasOwnProperty(resolveKey)) {
                            if (resolveKey === me.STATE_NAME_KEY) {
                                throw new Error('Illegal resolve identifier "' + me.STATE_NAME_KEY + '". This identifier is reserved.');
                            }

                            // Call the function to return the promise and add
                            // it to the array. This starts the loading process.
                            resolvePromiseFn = controller.resolve[resolveKey];
                            promises[resolveKey] = resolvePromiseFn(pathNode.getOwnParams(), pathNode.getAllParams(), state.allResolved);
                        }
                    }
                    return RSVP.hash(promises, pathNode.getDefinition().getName());
                });

                return newPromise;
            }
        }

        return null;
    },

    /**
     * Returns a promise which will resolve each controller's "resolve"
     * map of promises sequentially, passing the results of all previous
     * resolved promises.
     *
     * @param state
     * @param fromIndex
     * @param toIndex
     * @returns the chained promise
     */
    resolveControllerResolvables: function (state, fromIndex, toIndex) {
        var me = this,
            r = me.emptyPromise(),
            toPath = state.getPath(),
            i,
            stopIndex = toIndex || toPath.length,
            pathNode,
            nullablePromise,
            numPromises = 0;

        for (i = fromIndex; i < stopIndex; i++) {
            pathNode = toPath[i];

            nullablePromise = me.chainControllerPromises(r, pathNode, state);

            if (nullablePromise) {
                r = nullablePromise;
                numPromises++;
            }
        }

        // If we have at least one promise, then we need
        // to store the previous promises results.
        if (numPromises > 0) {
            r = r.then(function (results) {
                me.storeControllerResolvableResults(results, state);
                return me.emptyPromise();
            });
        }

        return r;
    }
});