Ext.define('StateRouter.staterouter.Router', {
    requires: [
        'StateRouter.staterouter.SequentialPromiseResolver',
        'StateRouter.staterouter.State',
        'StateRouter.staterouter.transitions.FadeTransition',
        'StateRouter.staterouter.transitions.BaseViewTransition'
    ],

    currentState: null,

    // Created once during Router setup
    stateDefinitionMap: null,

    // Configurable properties
    rootComponentId: null,
    controllerProviderFn: null,
    controllerProcessorFn: null,
    viewProcessorFn: null,
    startFnName: null,
    stopFnName: null,
    transition: null,

    // Private state variables which change during transition
    keep: null,
    toState: null,

    constructor: function () {
        this.stateDefinitionMap = {};
        this.keep = 0;
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

            if (config.hasOwnProperty('controllerProcessor')) {
                this.controllerProcessorFn = config.controllerProcessor;
            }

            if (config.hasOwnProperty('viewProcessor')) {
                this.viewProcessorFn = config.viewProcessor;
            }

            if (config.hasOwnProperty('start')) {
                this.startFnName = config.start;
            }

            if (config.hasOwnProperty('stop')) {
                this.stopFnName = config.stop;
            }

            if (config.hasOwnProperty('errorHandler')) {
                this.errorHandler = config.errorHandler;
            }
        }

        return this;
    },

    getController: function (name) {
        var controllerName = name;

        if (!this.controllerProviderFn) {
            throw new Error("Cannot resolve controller '" + name + "'. controllerProviderFn undefined");
        }

        if (this.controllerProcessorFn) {
            controllerName = this.controllerProcessorFn(name);
        }

        return this.controllerProviderFn(controllerName);
    },

    state: function (configOrName, optConfig) {
        var newStateConfig = optConfig || {},
            newStateDefinition,
            parentStateName,
            lastPeriodIndex;

        if (Ext.isObject(configOrName)) {
            newStateConfig = configOrName;
        } else if (Ext.isString(configOrName)) {
            newStateConfig.name = configOrName;
        }

        // Now build the state
        newStateDefinition = Ext.create('StateRouter.staterouter.StateDefinition', newStateConfig);

        if (!newStateDefinition.getName()) {
            throw "State requires 'name'";
        }

        // Determine if this is a child state and if so verify and set the parent
        lastPeriodIndex = newStateDefinition.getName().lastIndexOf('.');

        // Extract the parent from the name
        if (lastPeriodIndex === -1) {
            newStateDefinition.setParent(null);
        } else {
            parentStateName = newStateDefinition.getName().slice(0, lastPeriodIndex);

            if (!this.stateDefinitionMap.hasOwnProperty(parentStateName)) {
                throw "Parent '" + parentStateName + "' not found";
            }

            newStateDefinition.setParent(this.stateDefinitionMap[parentStateName]);
        }

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
            toPath,
            allStateParams = stateParams || {},
            fromPath,
            keep = 0,
            i,
            combinedControllersPromise,
            viewTransitionPromise,
            resolveBeforeTransition = [],
            transitionEvent;

        if (!me.stateDefinitionMap.hasOwnProperty(newStateName)) {
            throw new Error("Unknown state: '" + newStateName + "'");
        }

        // Build the path to the new state
        toPath = me.buildToPath(newStateName, allStateParams);

        me.inheritParams(toPath, options);
        me.setAllParamsForPath(toPath);

        // Build the toState
        me.toState = Ext.create('StateRouter.staterouter.State', {
            allParams: allStateParams,
            path: toPath
        });

        transitionEvent = {
            toState: newStateName,
            fromState: null
        };

        // Next, iterate through the current path to see which PathNodes we can keep.
        // keep in this context means the path up to the "keep" point is identical to
        // the previous state so we do not have to stop/start controllers up to that
        // point.
        if (me.currentState !== null) {
            if (me.toState.isEqual(me.currentState)) {
                Ext.log('Asked to go to the same place');
                return false;
            }

            transitionEvent.fromState = me.currentState.getDefinitionName();

            fromPath = me.currentState.getPath();

            // From the root until we've reached the end of the currentState or newState path
            for (i = 0; i < toPath.length && i < fromPath.length; i++) {

                if (toPath[i].isEqual(fromPath[i])) {
                    keep++;
                } else {
                    break;
                }
            }

            me.keep = keep;

            // Allow states to cancel state transition
            if (!me.notifyAll(StateRouter.STATE_CHANGE_REQUEST, transitionEvent)) {

                // Let running controllers know it was canceled
                me.notifyAll(StateRouter.STATE_CHANGE_CANCELED, transitionEvent);
                return false;
            }

            me.notifyAll(StateRouter.STATE_CHANGE_TRANSITIONING, transitionEvent);
        }

        // Resolve all resolvable items in all controllers before entering new state
        combinedControllersPromise = me.resolveAllAndForwardIfNecessary();
        resolveBeforeTransition.push(combinedControllersPromise);

        // If we have an old state and the new state has a view, we may need to
        // transition away from the old view unless we're keeping everything.
        // For instance, going directly into a child view.
        if (me.currentState !== null &&
            me.toState.getPathNode().getDefinition().getView() &&
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

                // the results array includes SequentialPromiseResolver results and the transition results
                me.saveResolveResults(results[0]);

                // No one canceled state transition, proceed to exit controllers we're not keeping
                me.stopDiscardedControllers();

                // Enter the new controllers
                me.startNewControllers();

                resolve();
            });
        }).then(function() {
            me.currentState = me.toState;

            // We only need to notify the kept controllers that the state changed.
            // In fact, since currentState was already modified, if we had
            // notified all, it would notify the wrong controllers.
            me.notifyKept(StateRouter.STATE_CHANGED, transitionEvent);
        }, function (error) {

            me.notifyAll(StateRouter.STATE_CHANGE_FAILED, Ext.apply({ error: error}, transitionEvent));
            Ext.callback(me.errorHandler, me, [error]);
        });

        return true;
    },

    getCurrentState: function () {
        if (this.currentState) {
            return this.currentState.getDefinitionName();
        }
        return null;
    },

    buildToPath: function (newStateName, allParams) {
        var toPath = [],
            curStateDef = this.stateDefinitionMap[newStateName];

        do {
            // Copy only the parameters defined in the StateDefinition
            var node = Ext.create('StateRouter.staterouter.PathNode', {
                definition: curStateDef,
                ownParams: Ext.copyTo({}, allParams, curStateDef.getParams()),
                allParams: {} // this will be corrected in setAllParamsForPath
            });

            toPath.push(node);
        } while ((curStateDef = curStateDef.getParent()) !== null);

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
            fromPath;

        // Inherit any parameters not specified in transitionTo's params config
        if (options && options.hasOwnProperty("inherit") && options.inherit === true && this.currentState !== null) {
            fromPath = this.currentState.getPath();

            // From the root until we've reached the end of the currentState or newState path
            for (i = 0; i < toPath.length && i < fromPath.length; i++) {

                // Only inherit if the state name is the same at the same path index
                // TODO: should this use the keep index or same logic (?)
                if (toPath[i].getDefinition().getName() === fromPath[i].getDefinition().getName()) {

                    // Only inherit them if not already specified
                    Ext.applyIf(toPath[i].ownParams, fromPath[i].ownParams);
                }
            }
        }
    },

    setAllParamsForPath: function (toPath) {
        var i,
            allParams = {};

        // From the root until we've reached the end of the currentState or newState path
        for (i = 0; i < toPath.length; i++) {
            allParams = Ext.applyIf(allParams, toPath[i].ownParams);

            // make a copy of the current state of allParams
            // (otherwise each path node will reference the same object)
            toPath[i].allParams = Ext.apply({}, allParams);
        }
    },

    notifyDiscarded: function (eventName, eventObj) {
        if (!this.currentState) { return; }
        return this.doNotify(eventName, eventObj, this.keep, this.currentState.getPath().length);
    },

    notifyAll: function (eventName, eventObj) {
        if (!this.currentState) { return; }
        return this.doNotify(eventName, eventObj, 0, this.currentState.getPath().length);
    },

    notifyKept: function (eventName, eventObj) {
        if (!this.currentState) { return; }
        return this.doNotify(eventName, eventObj, 0, this.keep);
    },

    doNotify: function (eventName, eventObj, startIndex, endIndex) {
        var canceled = false,
            i,
            fromPath = this.currentState.getPath(),
            result,
            stateDefinition,
            controller,
            controllerKept;

        for (i = startIndex; i < endIndex; i++) {
            stateDefinition = fromPath[i].getDefinition();

            if (stateDefinition.getController()) {
                controller = this.getController(stateDefinition.getController());

                if (controller.onStateRouterEvent) {
                    controllerKept = (i < this.keep);
                    result = controller.onStateRouterEvent(eventName, eventObj, controllerKept);

                    if (result === false) {
                        canceled = true;
                    }
                }
            }
        }

        return !canceled;
    },

    stopDiscardedControllers: function () {
        var me = this,
            i,
            fromPath,
            stateDefinition,
            controller;

        if (me.currentState !== null) {
            fromPath = me.currentState.getPath();

            for (i = this.keep; i < fromPath.length; i++) {
                stateDefinition = fromPath[i].getDefinition();

                if (stateDefinition.getController()) {
                    controller = me.getController(stateDefinition.getController());
                    Ext.callback(controller[me.stopFnName], controller);
                }
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
    saveResolveResults: function (results) {
        var toPath = this.toState.getPath(),
            pathNode,
            stateDefinition,
            stateName,
            allResultsUpToThisNode = {},
            nodeResults,
            controller,
            i;

        for (i = 0; i < toPath.length; i++) {
            pathNode = toPath[i];
            stateDefinition = pathNode.getDefinition();
            stateName = stateDefinition.getName();
            nodeResults = Ext.apply({}, results[stateName]);
            allResultsUpToThisNode[stateName] = nodeResults;

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
     * @returns {the promise to resolve all}
     */
    resolveAllAndForwardIfNecessary: function () {
        var me = this,
            toPath = this.toState.getPath(),
            nodesToResolve = this.toState.getPath().slice(this.keep),
            input = me.createInputForSequentialPromiseResolver(nodesToResolve),
            previousResults = {},
            childInput,
            resolveAllPromise;

        if (this.keep > 0) {
            previousResults = toPath[this.keep - 1].allResolved;
        }

        resolveAllPromise = StateRouter.staterouter.SequentialPromiseResolver.resolve(input, previousResults);

        // If the last node forwards to a child, then we want to figure out
        // which child it's forwarding to, and possibly chain another promise
        // to the resolve chain.
        if (this.isLastNodeForwarding()) {

            resolveAllPromise = resolveAllPromise.then(function (results) {
                // A little overhead, we're saving the results twice... once now and once when it returns
                me.saveResolveResults(results);

                me.appendForwardedNode();

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

    isLastNodeForwarding: function () {
        var toPath = this.toState.getPath(),
            lastNode = toPath[toPath.length - 1];
        return Ext.isFunction(lastNode.getDefinition().forwardToChild);
    },

    appendForwardedNode: function () {
        var toPath = this.toState.getPath(),
            currentLastNode = toPath[toPath.length - 1],
            currentLastNodeDef = currentLastNode.getDefinition(),
            forwardedStateName,
            forwardedStateDef,
            ownParams,
            allParams;

        forwardedStateName = currentLastNodeDef.getForwardToChild()(currentLastNode.getAllParams(), currentLastNode.resolved, currentLastNode.allResolved);

        if (!StateRouter.isChild(currentLastNodeDef.getName(), forwardedStateName)) {
            throw new Error('Forwarded state "' + forwardedStateName + '" not a child of "' + currentLastNodeDef.getName() + '"');
        }

        forwardedStateDef = this.stateDefinitionMap[forwardedStateName];

        if (!forwardedStateDef) {
            throw new Error('Forwarded state not found');
        }

        // Copy only the parameters defined in the StateDefinition
        ownParams = Ext.copyTo({}, this.toState.getAllParams(), forwardedStateDef.getParams());
        allParams = Ext.apply({}, currentLastNode.getAllParams());

        var node = Ext.create('StateRouter.staterouter.PathNode', {
            definition: forwardedStateDef,
            ownParams: ownParams,
            allParams: Ext.applyIf(allParams, ownParams)
        });

        toPath.push(node);
    },

    startNewControllers: function () {
        var me = this,
            toPath = this.toState.getPath(),
            i,
            pathNode,
            stateDefinition;

        for (i = this.keep; i < toPath.length; i++) {
            pathNode = toPath[i];

            me.insertChildIntoParentView(pathNode, i, toPath);

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
        if (stateDefinition.getParent()) {
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
            return stateDefinition.getParent().nestedViewComponentId;
        } else {
            // If no parent, we use the root
            return this.rootComponentId;
        }
    },

    // TODO: This should really notify the caller when the view is rendered in case of animations
    // TODO: OR THE ANIMATION CAN NOTIFY CONTROLLERS SO start LOGIC CAN STILL PROCEED
    insertChildIntoParentView: function (pathNode, nodeIndex, path) {
        var me = this,
            stateDefinition = pathNode.getDefinition(),
            ownParams = pathNode.getOwnParams(),
            allParams = pathNode.getAllParams(),
            resolved = pathNode.resolved,
            previouslyResolved = pathNode.allResolved,
            viewClass = stateDefinition.getView(),
            viewComponent,
            nestedComponent,
            parentComponentId,
            parentComponent,
            viewConfig = {};

        // In some cases, such as a Window or Dialog, we may not specify a view
        // to swap into the parent.  Instead, the dialog can be created in
        // the start method.  So we don't need to do anything here.
        if (viewClass) {
            parentComponentId = this.getParentComponentId(stateDefinition);

            // If the view is actually a function, we need to execute it to determine the actual view class
            if (Ext.isFunction(stateDefinition.getView())) {
                viewClass = stateDefinition.getView()(ownParams, allParams, resolved, previouslyResolved);
            }

            if (this.viewProcessorFn) {
                viewClass = this.viewProcessorFn(viewClass);
            }

            // First, remove all items from the parent component.
            parentComponent = Ext.getCmp(parentComponentId);
            parentComponent.removeAll();

            Ext.apply(viewConfig, {
                ownParams: ownParams,
                allParams: allParams,
                resolved: resolved,
                allResolved: previouslyResolved
            });

            Ext.apply(viewConfig, me.transition.getAdditionalViewConfigOptions(pathNode, nodeIndex, this.keep, path));
            // Create the child and insert it into the parent
            viewComponent = Ext.create(viewClass, viewConfig);
            parentComponent.add(viewComponent);

            me.transition.transitionTo(viewComponent, pathNode, nodeIndex, this.keep, path);

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

    /**
     * Check if a String starts with a specified prefix
     *
     * http://stackoverflow.com/questions/646628/javascript-startswith
     */
    var startsWith = function (str, prefix) {
        return str.lastIndexOf(prefix, 0) === 0;
    };


    StateRouter.Router = new this();

    StateRouter.configure = function(config) {
        return StateRouter.Router.configure(config);
    };

    StateRouter.state = function(configOrName, optConfig) {
        return StateRouter.Router.state(configOrName, optConfig);
    };

    StateRouter.go = function(newStateName, stateParams, options) {
        return StateRouter.Router.go(newStateName, stateParams, options);
    };

    StateRouter.transitionTo = function(newStateName, stateParams, options) {
        return StateRouter.Router.go(newStateName, stateParams, options);
    };

    StateRouter.getCurrentState = function() {
        return StateRouter.Router.getCurrentState();
    };


    // Events
    StateRouter.STATE_CHANGE_REQUEST = 'stateChangeRequest';
    StateRouter.STATE_CHANGE_CANCELED = 'stateChangeCanceled';
    StateRouter.STATE_CHANGE_FAILED = 'stateChangeFailed';
    StateRouter.STATE_CHANGE_TRANSITIONING = 'stateChangeTransitioning';
    StateRouter.STATE_CHANGED = 'stateChanged';

    // Utility methods
    StateRouter.isOrHasChild = function (parentStateName, childStateName) {
        if (parentStateName === childStateName) {
            return true;
        }

        return this.isChild(parentStateName, childStateName);
    };

    StateRouter.isChild = function (parentStateName, childStateName) {
        if (parentStateName !== childStateName) {
            return startsWith(childStateName, parentStateName);
        }

        return false;
    };

    StateRouter.isOrHasParent = function (stateName, parentStateName) {
        return StateRouter.isOrHasChild(parentStateName, stateName);
    };

    StateRouter.isParent = function (stateName, parentStateName) {
        return StateRouter.isChild(parentStateName, stateName);
    };
});