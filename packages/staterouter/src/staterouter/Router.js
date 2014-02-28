Ext.define('StateRouter.staterouter.Router', {
    requires: [
        'StateRouter.staterouter.SequentialPromiseResolver',
        'StateRouter.staterouter.State',
        'StateRouter.staterouter.transitions.FadeTransition',
        'StateRouter.staterouter.transitions.BaseViewTransition'
    ],

    singleton: true,

    stateDefinitionMap: {},
    currentState: null,

    // Configurable properties
    rootComponentId: null,
    controllerProviderFn: null,
    startFnName: 'start',
    stopFnName: 'stop',
    transition: null,

    reset: function () {
        this.stateDefinitionMap = {};
        this.currentState = null;

        // Reset configurable properties too
        this.rootComponentId = null;
        this.controllerProviderFn = null;
        this.startFnName = 'start';
        this.stopFnName = 'stop';
        this.transition = Ext.create('StateRouter.staterouter.transitions.FadeTransition');
    },

    configure: function (config) {
        this.transition = Ext.create('StateRouter.staterouter.transitions.FadeTransition');
        if (config) {
            if (config.hasOwnProperty('root')) {
                this.rootComponentId = config.root;
            }

            if (config.hasOwnProperty('controllerProvider')) {
                this.controllerProviderFn = config.controllerProvider;
            }

            if (config.hasOwnProperty('start')) {
                this.startFnName = config.start;
            }

            if (config.hasOwnProperty('stop')) {
                this.stopFnName = config.stop;
            }
        }

        return this;
    },

    getController: function (name) {
        if (!this.controllerProviderFn) {
            throw new Error("Cannot resolve controller '" + name + "'. controllerProviderFn undefined");
        }

        return this.controllerProviderFn(name);
    },

    state: function (configOrName, optConfig) {
        var newStateConfig = {},
            newStateDefinition,
            lastPeriodIndex;

        if (!configOrName) {
            throw "StateRouter.state called with no config";
//            throw new Error("StateRouter.state called with no config");
        }

        // If the first argument is a String, it is the state name
        if (Ext.isString(configOrName)) {

            if (optConfig && Ext.isObject(optConfig)) {
                Ext.apply(optConfig, {
                    name: configOrName
                });
                Ext.apply(newStateConfig, optConfig);
            } else {
                throw "Config for state: '" + configOrName + "' required";
            }
        } else if (Ext.isObject(configOrName)) {
            Ext.apply(newStateConfig, configOrName);
        }

        // Now build the state
        if (!newStateConfig.hasOwnProperty('name')) {
            throw "State requires 'name'";
        }

        newStateDefinition = Ext.create('StateRouter.staterouter.StateDefinition', {
            name: newStateConfig.name
        });

        lastPeriodIndex = newStateDefinition.getName().lastIndexOf('.');

        // Extract the parent from the name
        if (lastPeriodIndex === -1) {
            newStateDefinition.setParentName(null);
        } else {
            newStateDefinition.setParentName(newStateDefinition.getName().slice(0, lastPeriodIndex));
        }

        // Set other properties
        if (newStateConfig.hasOwnProperty('view')) {
            // Might be a view or a function which returns a view
            newStateDefinition.setView(newStateConfig.view);
        }

        if (newStateConfig.hasOwnProperty('controller')) {
            newStateDefinition.setController(newStateConfig.controller);
        }

        if (newStateConfig.hasOwnProperty('params')) {
            newStateDefinition.setParams(newStateConfig.params);
        }

        if (newStateConfig.hasOwnProperty('forwardToChild')) {
            newStateDefinition.setForwardToChild(newStateConfig.forwardToChild);
        }

        // If URL is specified, the URL parameters will override the 'params' property


        this.stateDefinitionMap[newStateDefinition.getName()] = newStateDefinition;

        return this;
    },

    go: function (newStateName, stateParams, options) {
        var stateParameters = stateParams || {},
            opts = options || {};

        Ext.apply(opts, {inherit: true});
        this.transitionTo(newStateName, stateParameters, opts);
    },

    /**
     * Transitions from the current state to a new state.
     *
     * If a currentState exists, then the controllers currently started have
     * a chance to cancel the state transition.
     *
     * If the transition is not canceled, then we need to do a diff on the
     * currentState's path with the new state's path to determine which
     * controllers need to be "stopped" and which need to be "started".
     *
     * For example, consider the following two states (expressed as URLs for illustration):
     *
     * Current State:
     * /contact/120/phone
     *
     * New State:
     * /contact/120/address/2/detail
     *
     * These paths correspond to the following states:
     * name                 url
     * contact              /contact/:id
     * contact.phone        /phone
     * contact.address
     *
     * The path is equal up to /contact/120/
     *
     *
     *
     * When transitioning from "contact.phone" to "contact.address.detail", we need to stop "contact.phone"
     * and the start "contact.address" and "contact.address.detail".  We do not need to stop "contact", because the
     * parameters (120) are the same.
     *
     * @param newStateName
     * @param stateParams
     * @param options
     */
    transitionTo: function (newStateName, stateParams, options) {
        var me = this,
            toState,
            toPath,
            allStateParams = stateParams || {},
            fromPath,
            keep = 0,
            i,
            combinedControllersPromise,
            viewTransitionPromise,
            resolveBeforeTransition = [];

        if (!me.stateDefinitionMap.hasOwnProperty(newStateName)) {
            throw new Error("Unknown state: '" + newStateName + "'");
        }

        // Build the path to the new state
        toPath = me.buildToPath(newStateName, allStateParams);

        me.inheritParams(toPath, options);

        // Build the toState
        toState = Ext.create('StateRouter.staterouter.State', {
            allParams: allStateParams,
            path: toPath
        });

        // Next, iterate through the current path to see which PathNodes we can keep.
        // keep in this context means the path up to the "keep" point is identical to
        // the previous state so we do not have to stop/start controllers up to that
        // point.
        if (me.currentState !== null) {
            fromPath = me.currentState.getPath();

            // From the root until we've reached the end of the currentState or newState path
            for (i = 0; i < toPath.length && i < fromPath.length; i++) {

                if (toPath[i].isEqual(fromPath[i])) {
                    keep++;
                } else {
                    break;
                }
            }

            // Allow states we're not keeping to cancel state transition
            if (!me.sendStateChangeRequest(keep, fromPath)) {
                return false;
            }
        }

        if (keep === toPath[length]) {
            console.log('Asked to go to the same place');
            return;
        }

        // Resolve all resolvable items in all controllers before entering new state
        combinedControllersPromise = me.resolveAllAndForwardIfNecessary(toState, keep);
//        combinedControllersPromise = me.resolveAllControllerResolvables(keep, toPath);
        resolveBeforeTransition.push(combinedControllersPromise);

        // If we have an old state and the new state has a view, we may need to
        // transition away from the old view unless we're keeping everything.
        // For instance, going directly into a child view.
        if (me.currentState !== null &&
            toState.getPathNode().getDefinition().getView() &&
            keep < me.currentState.getPath().length) {

            // The "old" view in this case is the first view discarded.
            viewTransitionPromise = me.transition.transitionFrom(
                Ext.ComponentManager.get(fromPath[keep].getDefinition().viewComponentId),
                combinedControllersPromise
            );

            if (viewTransitionPromise) {
                resolveBeforeTransition.push(viewTransitionPromise);
            }
        }

        RSVP.all(resolveBeforeTransition).then(function (results) {

            // This has to be wrapped in a promise, otherwise
            // exceptions are being eaten by RSVP
            return new RSVP.Promise(function (resolve) {

                me.saveResolveResults(toState, results[0]);

                if (me.currentState !== null) {
                    // No one canceled state transition, proceed to exit controllers we're not keeping
                    me.stopDiscardedControllers(keep, fromPath);
                }

                // Enter the new controllers
                me.startNewControllers(keep, toPath);

                resolve();
            });
        }).then(function() {
            me.currentState = toState;
        }, function (error) {

            console.log(error.stack);
            // TODO: This is just for test purposes right now
            Ext.Msg.show({
                title:'Sorry, an error occurred',
                msg: error,
                buttons: Ext.Msg.OK,
                icon: Ext.Msg.ERROR
            });
            me.sendTransitionFailed(keep, fromPath, error);
        });
    },

    buildToPath: function (newStateName, stateParams) {
        var toPath = [],
            curStateDefinitionName = newStateName,
            curStateDef;

        do {
            curStateDef = this.stateDefinitionMap[curStateDefinitionName];

            // Copy only the parameters defined in the StateDefinition
            var node = Ext.create('StateRouter.staterouter.PathNode', {
                definition: curStateDef,
                ownParams: Ext.copyTo({}, stateParams, curStateDef.getParams()),
                allParams: {}
            });

            toPath.push(node);
        } while ((curStateDefinitionName = curStateDef.getParentName()) !== null);

        // We want the array to be ordered from root to current state
        toPath.reverse();

        return toPath;
    },

    /**
     *
     * @param toPath
     * @param options
     */
    inheritParams: function (toPath, options) {
        var i,
            fromPath,
            allParams = {};

        if (this.currentState !== null) {
            fromPath = this.currentState.getPath();

            // From the root until we've reached the end of the currentState or newState path
            for (i = 0; i < toPath.length && i < fromPath.length; i++) {

                // Inherit any parameters not
                if (options && options.hasOwnProperty("inherit") && options.inherit === true &&
                    toPath[i].getDefinition().getName() === fromPath[i].getDefinition().getName()) {

                    // Only inherit them if not already specified
                    Ext.applyIf(toPath[i].ownParams, fromPath[i].ownParams);
                }
            }
        }

        // From the root until we've reached the end of the currentState or newState path
        for (i = 0; i < toPath.length; i++) {

            allParams = Ext.applyIf(allParams, toPath[i].ownParams);
            toPath[i].allParams = Ext.apply({}, allParams);
        }
    },

    sendStateChangeRequest: function (keep, fromPath) {
        var i;
        // TODO: Send in reverse as the leaf is generally the controller which would stop it
        for (i = keep; i < fromPath.length; i++) {
            var stateDefinition = fromPath[i].getDefinition();

            if (stateDefinition.getController()) {
                var controller = this.getController(stateDefinition.getController());
                // TODO: Consider sending somethign like ANCESTOR, CHILD (?), OR LEAF
                if (controller.onStateChangeRequest && !controller.onStateChangeRequest()) {
                    return false;
                }
            }
        }
        return true;
    },

    sendTransitionFailed: function (keep, fromPath, error) {
        var i;
        for (i = keep; i < fromPath.length; i++) {
            var stateDefinition = fromPath[i].getDefinition();

            if (stateDefinition.getController()) {
                var controller = this.getController(stateDefinition.getController());
                if (controller.onTransitionFailed) {
                    controller.onTransitionFailed(error);
                }
            }
        }
    },

    stopDiscardedControllers: function (keep, fromPath) {
        var me = this,
            i;
        for (i = keep; i < fromPath.length; i++) {
            var stateDefinition = fromPath[i].getDefinition();

            if (stateDefinition.getController()) {
                var controller = me.getController(stateDefinition.getController());
                Ext.callback(controller[me.stopFnName], controller);
            }
        }
    },

    /**
     * Given an input in the format:
     *
     * {
     *    stateName: {
     *       resolveA: 'Hello',
     *       resolveB: 'World',
     *    },
     *    anotherStateName: {
     *       resolveA: 'ExtJS',
     *       anyNameIsOK: 'Sencha',
     *    }
     * }
     *
     * It will store the results both in the node and in the controller
     * "resolved" and "allResolved" properties.
     *
     * @param results
     */
    saveResolveResults: function (toState, results) {
        var toPath = toState.getPath(),
            pathNode,
            stateDefinition,
            stateName,
            allResultsUpToThisNode = {},
            nodeResults,
            controller,
            i;

        for (i = 0; i < toPath.length; i++) {
            pathNode = toPath[i];
            stateDefinition = pathNode.getDefinition(),
            stateName = stateDefinition.getName();
            nodeResults = Ext.apply({}, results[stateName]);
            allResultsUpToThisNode = Ext.apply(allResultsUpToThisNode, nodeResults);

            pathNode.resolved = nodeResults;
            // make a copy otherwise this object will include all results
            pathNode.allResolved = Ext.apply({}, allResultsUpToThisNode);

            if (stateDefinition.getController()) {
                controller = this.getController(stateDefinition.getController());

                if (controller) {
                    controller.resolved = pathNode.resolved;
                    controller.allResolved = pathNode.allResolved;
                }
            }
        }
    },

    /**
     * In some cases, usually when a state acts as a grandparent for many child states,
     * the state itself has no view besides a navigation for child states.
     *
     * For these cases, we want to transition to the managing state but have it decide
     * which child state should be displayed by default.  This may not be known until
     * all of the managing state's dependencies are resolved.
     *
     * If the last node in the path declares a property "forwardToChild", we will
     * resolve all nodes first, execute that method (passing the resolved values),
     * update the path, and return a new promise to resolve that child's dependencies.
     *
     * Otherwise, we just return a promise which resolves all the dependencies in the
     * regular path.
     *
     * @param toState
     * @param keep
     * @returns {the}
     */
    resolveAllAndForwardIfNecessary: function (toState, keep) {
        var me = this,
            toPath = toState.getPath(),
            input = me.createInputForSequentialPromiseResolver(toState.getPath()),
            previousResults = {},
            childInput,
            resolveAllPromise;

        if (keep > 0) {
            previousResults = toPath[keep - 1].allResolved;
        }

        resolveAllPromise = StateRouter.staterouter.SequentialPromiseResolver.resolve(input, previousResults);

        // If the last node forwards to a child, then we want to figure out
        // which child it's forwarding to, and possibly chain another promise
        // to the resolve chain.
        if (this.isLastNodeForwarding(toPath)) {

            resolveAllPromise = resolveAllPromise.then(function (results) {
                me.appendForwardedNode(toState);

                childInput = me.createInputForSequentialPromiseResolver([toPath[toPath.length - 1]]);
                return StateRouter.staterouter.SequentialPromiseResolver.resolve(childInput, results);
            });
        }

        return resolveAllPromise;
    },

    createInputForSequentialPromiseResolver: function (pathNodeArr) {
        var nodeObjsArr = [],
            pathNode,
            i,
            stateDefinition,
            controllerName,
            controller,
            nodeObj;

        for (i = 0; i < pathNodeArr.length; i++) {
            pathNode = pathNodeArr[i];
            stateDefinition = pathNode.getDefinition();
            controllerName = stateDefinition.getController();
            nodeObj = {
                pathNode: pathNode
            };

            if (controllerName) {
                controller = this.getController(controllerName);

                if (controller && controller.resolve) {
                    nodeObj.resolve = controller.resolve;
                }
            }

            nodeObjsArr.push(nodeObj);
        }

        return nodeObjsArr;
    },

    isLastNodeForwarding: function (toPath) {
        var lastNode = toPath[toPath.length - 1];
        return Ext.isFunction(lastNode.getDefinition().forwardToChild);
    },

    appendForwardedNode: function (toState) {
        var toPath = toState.getPath(),
            currentLastNode = toPath[toPath.length - 1],
            currentLastNodeDef = currentLastNode.getDefinition(),
            forwardedStateName,
            forwardedStateDef;

        // TODO: Ensure forwardedStateName is a child of the last node state
        forwardedStateName = currentLastNodeDef.getForwardToChild()(currentLastNode.getAllParams(), toState.allResolved);
        forwardedStateDef = this.stateDefinitionMap[forwardedStateName];

        if (!forwardedStateDef) {
            throw new Error("Forwarded state not found");
        }

        // Copy only the parameters defined in the StateDefinition
        var node = Ext.create('StateRouter.staterouter.PathNode', {
            definition: forwardedStateDef,
            ownParams: Ext.copyTo({}, currentLastNode.getAllParams(), forwardedStateDef),
            allParams: {}
        });

        toPath.push(node);
    },

    startNewControllers: function (keep, toPath) {
        var me = this,
            i,
            pathNode,
            stateDefinition;

        for (i = keep; i < toPath.length; i++) {
            pathNode = toPath[i];

            me.insertChildIntoParentView(pathNode, i, keep, toPath);

            stateDefinition = pathNode.getDefinition();

            // Get the controller and call its start method
            if (stateDefinition.getController()) {
                var controller = me.getController(stateDefinition.getController());

                Ext.callback(controller[me.startFnName], controller, [pathNode.getOwnParams(), pathNode.getAllParams()]);
            }
        }
    },

    /**
     * Gets the parent component's DOM ID for this stateDefinition.
     *
     * If this state definition has no parent, it returns the root component ID.
     *
     * @param stateDefinition
     * @returns {*}
     */
    getParentComponentId: function (stateDefinition) {
        if (stateDefinition.getParentName()) {
            // We need the Component.id of the parent but we only have the
            // class name defined in the parent's state definition.
            //
            // It's of no help as the ID is only known when the component
            // is instantiated.
            //
            // As a bit of a hack, this id was inserted into its own
            // StateDefinition when this parent was originally created.
            //
            // See the code that follows.
            return this.stateDefinitionMap[stateDefinition.getParentName()].nestedViewComponentId;
        } else {
            // If no parent, we use the root
            return this.rootComponentId;
        }
    },

    // TODO: This should really notify the caller when the view is rendered in case of animations
    // TODO: OR THE ANIMATION CAN NOTIFY CONTROLLERS SO start LOGIC CAN STILL PROCEED
    insertChildIntoParentView: function (pathNode, nodeIndex, keep, path) {
        var me = this,
            stateDefinition = pathNode.getDefinition(),
            ownParams = pathNode.getOwnParams(),
            viewClass = stateDefinition.getView(),
            viewComponent,
            nestedComponent,
            parentComponentId,
            parentComponent;

        // In some cases, such as a Window or Dialog, we may not specify a view
        // to swap into the parent.  Instead, the dialog can be created in
        // the start method.  So we don't need to do anything here.
        if (viewClass) {
            parentComponentId = this.getParentComponentId(stateDefinition);

            // If the view is actually a function, we need to execute it to determine the actual view class
            if (Ext.isFunction(stateDefinition.getView())) {
                viewClass = stateDefinition.getView()(ownParams);
            }

            // First, remove all items from the parent component.
            parentComponent = Ext.getCmp(parentComponentId);
            parentComponent.removeAll();

            // Create the child and insert it into the parent
            viewComponent = Ext.create(viewClass, me.transition.getAdditionalViewConfigOptions(pathNode, nodeIndex, keep, path));
            parentComponent.add(viewComponent);

            me.transition.transitionTo(viewComponent, pathNode, nodeIndex, keep, path);

            stateDefinition.viewComponentId = viewComponent.getId();

            // This view may be an ancestor of other views.  Either the entire
            // view will be swapped out or it will have a child which will act
            // as the container for nested chidlren.
            //
            // We store the ID of this wrapping container into the
            // StateDefinition - a bit of a hack.
            if (viewComponent.routerView) {
                stateDefinition.nestedViewComponentId = viewComponent.getId();
            } else {
                nestedComponent = viewComponent.down('container[routerView]');

                if (nestedComponent) {
                    stateDefinition.nestedViewComponentId = nestedComponent.getId();
                }
                // TODO: Throw error here if this state is not a leaf and no child area defined

            }
        }
    }
},
    function () {
    StateRouter.configure = function(config) {
        return StateRouter.staterouter.Router.configure(config);
    };

    StateRouter.state = function(configOrName, optConfig) {
        return StateRouter.staterouter.Router.state(configOrName, optConfig);
    };

    StateRouter.go = function(newStateName, stateParams, options) {
        return StateRouter.staterouter.Router.go(newStateName, stateParams, options);
    };

    StateRouter.transitionTo = function(newStateName, stateParams, options) {
        return StateRouter.staterouter.Router.go(newStateName, stateParams, options);
    };
});