Ext.define('StateRouter.staterouter.Router', {
    requires: [
        'Ext.util.History',
        'StateRouter.staterouter.PathPromiseResolver',
        'StateRouter.staterouter.Path',
        'StateRouter.staterouter.StateManager',
        'StateRouter.staterouter.transitions.FadeTransition',
        'StateRouter.staterouter.transitions.BaseViewTransition',
        'StateRouter.staterouter.UrlParser'
    ],

    currentPath: null,

    // Created once during Router setup
    stateManager: null,
    promiseResolver: null,

    // Configurable properties
    root: null,
    app: null,
    controllerProvider: null,
    viewProcessorFn: null,
    startFnName: null,
    stopFnName: null,
    beforeStopFnName: null,
    transition: null,

    // Private state variables which change during transition
    keep: null,
    toPath: null,
    transitioning: false,
    ready: true,
    historyInitialized: false,

    constructor: function () {
        var me = this;

        me.stateManager = Ext.create('StateRouter.staterouter.StateManager', {
            listeners: {
                stateregistered: Ext.bind(me.onStateRegistered, me)
            }
        });

        me.promiseResolver = Ext.create('StateRouter.staterouter.PathPromiseResolver');

        me.keep = 0;
        me.startFnName = 'start';
        me.stopFnName = 'stop';
        me.beforeStopFnName = 'beforeStop';
    },

    configure: function (config) {
        var me = this;
        if (config) {
            if (config.hasOwnProperty('transition')) {
                me.transition = Ext.create(config.transition);
            } else {
                me.transition = Ext.create('StateRouter.staterouter.transitions.FadeTransition');
            }

            if (config.hasOwnProperty('root')) {
                me.root = config.root;
            }

            if (config.hasOwnProperty('app')) {
                me.app = config.app;
                me.controllerProvider = function (name) {
                    return me.app.getController(name);
                };
            }

            if (config.hasOwnProperty('controllerProvider')) {
                me.controllerProvider = config.controllerProvider;
            }

            if (config.hasOwnProperty('start')) {
                me.startFnName = config.start;
            }

            if (config.hasOwnProperty('stop')) {
                me.stopFnName = config.stop;
            }

            if (config.hasOwnProperty('beforeStop')) {
                me.beforeStopFnName = config.beforeStop;
            }

            if (config.hasOwnProperty('errorHandler')) {
                me.errorHandler = config.errorHandler;
            }

            if (config.hasOwnProperty('unknownUrlHandler')) {
                me.unknownUrlHandler = config.unknownUrlHandler;
            }
        }

        return this;
    },

    onStateRegistered: function (state) {
        var me = this;

        // If we registered a state with a URL, initialize ExtJS's History class
        // and mark the StateRouter as not ready
        if (state.url) {
            if (!me.historyInitialized) {
                me.ready = false;
                me.historyInitialized = true;

                Ext.History.init(function () {
                    me.ready = true;
                });
                Ext.History.on('change', me.onHistoryChanged, me);
            }
        }
    },

    onHistoryChanged: function (token) {
        var me = this,
            matches,
            curState,
            allPositionalUrlParams = [],
            paramsObj = {},
            foundMatch = false,
            unknownUrlHandlerResult;

        if (me.transitioning) {
            return;
        }

        this.stateManager.each(function (key, state) {
            if (state.absoluteUrlRegex) {
                matches = token.match(state.absoluteUrlRegex);
                if (matches !== null) {

                    curState = state;
                    do {
                        allPositionalUrlParams = curState.urlParams.concat(allPositionalUrlParams);
                    } while ((curState = curState.parent) !== null);


                    if (allPositionalUrlParams.length > 0) {

                        for (var i = 0; i < allPositionalUrlParams.length; i++) {
                            paramsObj[allPositionalUrlParams[i]] = matches[i+1];
                        }
                    }

                    // Now, extract the query params
                    var queryRegex = /(?:\?|&)(\w+)(?:=(\w+))?/g;
                    var regResult;

                    while ((regResult = queryRegex.exec(token))) {
                        var queryParam = regResult[1];
                        var queryValue = regResult[2];

                        if (queryValue === undefined) {
                            queryValue = true;
                        } else if (queryValue === 'false') {
                            queryValue = false;
                        } else if (queryValue === 'true') {
                            queryValue = true;
                        }

                        paramsObj[queryParam] = queryValue;
                    }

                    me.transitionTo(state.name, paramsObj);
                    foundMatch = true;
                    return false;
                }
            }
        });

        if (!foundMatch && me.unknownUrlHandler) {
            unknownUrlHandlerResult = Ext.callback(me.unknownUrlHandler, me, [token]);

            if (Ext.isString(unknownUrlHandlerResult)) {
                me.transitionTo(unknownUrlHandlerResult);
            } else if (Ext.isObject(unknownUrlHandlerResult)) {
                me.transitionTo(unknownUrlHandlerResult.stateName,
                    unknownUrlHandlerResult.stateParams || {},
                    unknownUrlHandlerResult.options || {});
            }
        }
    },

    handleCurrentHistoryToken: function (noHistoryTokenCallback) {
        var me = this;
        if (!me.ready) {
            Ext.History.on('ready', function () {
                me.handleCurrentHistoryToken(noHistoryTokenCallback);
            }, me, { single: true });
            return;
        }

        if (Ext.History.getToken()) {
            me.onHistoryChanged(Ext.History.getToken());
        } else {
            Ext.callback(noHistoryTokenCallback, me);
        }
    },

    /**
     * Reloads the leaf state forcefully. If you instead want to reload firing a state change request,
     * pass in { force: false }
     */
    reload: function (options) {
        var opts = options || {};
        StateRouter.go(StateRouter.getCurrentState(), {}, Ext.apply({
            reload: StateRouter.getCurrentState(),
            force: true
        }, opts));
    },

    state: function (configOrName, optConfig) {
        var me = this;
        
        if (Ext.isArray(configOrName)) {
            Ext.each(configOrName, function (stateConfig) {
                me.stateManager.register(stateConfig);
            });
        } else {
            this.stateManager.register(configOrName, optConfig);
        }
        
        return this;
    },

    merge: function (configOrName, optConfig) {
        var me = this;
        if (Ext.isArray(configOrName)) {
            Ext.each(configOrName, function (conf) {
                me.stateManager.merge(conf);
            });
        } else {
            this.stateManager.merge(configOrName, optConfig);
        }
        
        return this;
    },

    go: function (newStateName, stateParams, options) {
        var stateParameters = stateParams || {},
            opts = options || {};

        Ext.apply(opts, {inherit: true});
        return this.transitionTo(newStateName, stateParameters, opts);
    },

    /**
     * Transitions from the current state to a new state.
     *
     * If a currentPath exists, then the controllers currently started have
     * a chance to cancel the state transition.
     *
     * If the transition is not canceled, then we need to do a diff on the
     * currentPath's path with the new state's path to determine which
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
     * @param [options]
     */
    transitionTo: function (newStateName, stateParams, options) {
        var me = this,
            transitionEvent,
            lastNodeForwarding,
            reload = false,
            keepUrl = Ext.isObject(options) && options.keepUrl === true;

        if (options) {

            // Verify reload config is valid
            if (options.reload !== undefined) {
                reload = options.reload;

                if (Ext.isString(reload)) {
                    if (!this.stateManager.hasState(reload)) {
                        throw 'Unknown reload state: ' + reload;
                    }
                }
            }
        }
        if (me.transitioning) {
            return new RSVP.reject(StateRouter.STATE_CHANGE_TRANSITIONING);
        }

        // Transitioning should be set to true immediately, even if the transition will be canceled. It's used
        // to prevent two transitions from occurring at the same time. Since promises are fulfilled on the next "tick"
        // if we don't set it here, then it's possible a second transition may be completed before the first.
        me.transitioning = true;

        return this.waitUntilHistoryReady().then(function () {
            // Prepare path and call beforeStop lifecycle event
            return me.prepareTransition(newStateName, stateParams, reload, options);
        }).then(function (transitionEventResult) {
            transitionEvent = transitionEventResult;
            lastNodeForwarding = me.isLastNodeForwarding();

            // Stop controllers, load resolvables, determine forwarded PathNode if applicable
            // fade current UI, update history token (if last node not forwarding)
            return me.beginTransition(lastNodeForwarding, transitionEvent, keepUrl);
        }).then(function () {
            var historyPromise = new RSVP.resolve();

            // The last node was forwarded, update the address bar now
            if (lastNodeForwarding && !keepUrl) {
                historyPromise = me.updateAddressBar();
            }

            // Enter the new controllers
            var startPromise = me.startNewControllers();

            return RSVP.all([historyPromise, startPromise]);
        }).then(function() {
            // The transition completed!
            me.currentPath = me.toPath;

            // Because the last node may forward to a child and we do not know what the forwarded
            // state is until the resolvables are resolved, we only know the final
            // state at this point (after forwardToChild is executed)
            transitionEvent.toState = me.toPath.lastNode().state.name;
            transitionEvent.toParams = me.toPath.lastNode().allParams;


            // It's possible the controllers notified below or any code using the wrapped promise
            // may throw an exception. In that case, the error handler below still execute even though
            // the transition was actually successful.

            // If we've kept everything, then it means we navigated to some parent state
            // we must notify the last node so it knows to update its UI
            if (me.keep === me.currentPath.nodes.length) {
                me.notifyAll(StateRouter.STATE_CHANGED, transitionEvent);
            } else {
                // We notify all except the last node
                me.notifyAncestors(StateRouter.STATE_CHANGED, transitionEvent);
            }

            me.transitioning = false;
            return new RSVP.resolve();
        }).then(undefined, function (error) { // same as "catch", but safer since catch is reserved word

            // It may have been rejected simply because they attempted to go to same place, simply resolve here
            if (error === StateRouter.SAME_PLACE) {
                me.transitioning = false;
                return new RSVP.resolve(false);
            }

            // TODO: On failure destroy view controllers from keep to end
            var errorEvent = Ext.apply({ error: error}, transitionEvent);

            if (error && error !== StateRouter.STATE_CHANGE_CANCELED) {
                me.notifyAll(StateRouter.STATE_CHANGE_FAILED, errorEvent);
                me.currentPath = null;
                Ext.callback(me.errorHandler, me, [errorEvent]);
            }

            me.transitioning = false;
            return new RSVP.reject(error);
        });
    },

    waitUntilHistoryReady: function () {
        if (this.ready) {
            return new RSVP.resolve();
        }

        return new RSVP.Promise(function (resolve) {
            // We have at least one state definition with a URL config, and Ext.History is not ready yet.
            // Wait until we receive the ready event
            Ext.History.on('ready', function () {
                resolve();
            }, this, { single: true });
        });
    },

    /**
     * Here we build the Path object we're attempting to navigate to. We also determine
     * at which point PathNode parameters diverge (the "keep" variable). The "keep" variable plays a role in
     * determining which controllers are stopped and started as we begin the transition.
     *
     * Finally, we call the lifecycle method beforeStop for all nodes' controllers in the current Path.
     *
     */
    prepareTransition: function (newStateName, stateParams, reload, options) {
        var transitionEvent;
        var force = Ext.isObject(options) && options.force === true;
        stateParams = stateParams || {};

        if (!this.stateManager.hasState(newStateName)) {
            throw new Error("Unknown state: '" + newStateName + "'");
        }

        // Build the path to the new state
        this.toPath = this.buildToPath(newStateName, stateParams, options);

        transitionEvent = {
            options: options,
            toState: newStateName,
            toParams: stateParams,
            fromState: null,
            fromParams: null
        };

        this.keep = 0;

        // currentPath would only be null when the user first loads the application (even if a hash is in the URL)
        if (this.currentPath !== null) {
            if (reload === false && this.toPath.isEqual(this.currentPath)) {
                Ext.log('Asked to go to the same place');
                // We reject here, but in transitionTo's "catch" we check for this error and resolve
                return new RSVP.reject(StateRouter.SAME_PLACE);
            }

            this.calculateKeepPoint(reload);

            transitionEvent.fromState = this.getCurrentState();
            transitionEvent.fromParams = this.getCurrentStateParams();

            // Allow states to cancel state transition (unless we're forcefully going to this state)
            if (force === false) {
                return this.beforeStop(transitionEvent).then(function () {
                    return new RSVP.resolve(transitionEvent);
                });
            }
        }

        // If there is no current path or we are forcefully going to the state, simply resolve
        return new RSVP.resolve(transitionEvent);
    },

    /**
     * Simultaneously:
     *   - stop() necessary controllers and THEN resolve Controller "resolvables"
     *   - Fade away the current UI
     *   - Update the history URL hash.
     *
     *  Note: The first promise is a multi-step promise.
     */
    beginTransition: function (lastNodeForwarding, transitionEvent, keepUrl) {
        var combinedControllersPromise,
            viewTransitionPromise,
            resolveBeforeTransition = [];

        this.notifyAll(StateRouter.STATE_CHANGE_TRANSITIONING, transitionEvent);

        // For new states, create (in the case of ViewController) or obtain an instance of the controller
        // and install it in the path.
        this.updateControllersForPath(this.keep);

        // If we're not forwarding to a child, update the address bar at this point. This is more for perceived
        // performance otherwise the hash token will only be changed after the whole state is finished loading.
        // Updating the address bar is not synchronous, so we maintain a history change 'promise'
        // which must complete before the transition completes.
        if (!lastNodeForwarding && !keepUrl) {
            resolveBeforeTransition.push(this.updateAddressBar());
        }

        // Resolve all resolvable items in all controllers before entering new state
        combinedControllersPromise = this.createStopAndResolvePromise();
        resolveBeforeTransition.push(combinedControllersPromise);

        // If we have an old state and the new state has a view, we may need to
        // transition away from the old view unless we're keeping everything.
        // For instance, going directly into a child view.
        if (this.currentPath !== null &&
            this.toPath.lastNode().state.view &&
            this.keep < this.currentPath.nodes.length) {

            // The "old" view in this case is the first view discarded.
            viewTransitionPromise = this.transition.transitionFrom(
                this.currentPath.nodes[this.keep].view,
                combinedControllersPromise
            );

            if (viewTransitionPromise) {
                resolveBeforeTransition.push(viewTransitionPromise);
            }
        }

        return RSVP.all(resolveBeforeTransition);
    },

    calculateKeepPoint: function (reload) {
        var fromPath = this.currentPath.nodes;
        var toPath = this.toPath.nodes;
        var i;
        var keep = 0;
        var reloadFromState;

        if (reload !== true) {
            reloadFromState = Ext.isString(reload);

            // From the root until we've reached the end of the currentPath or newState path
            for (i = 0; i < toPath.length && i < fromPath.length; i++) {

                if (reloadFromState && toPath[i].state.name === reload) {
                    break;
                }

                if (!toPath[i].isEqual(fromPath[i])) {
                    break;
                }

                // Since we're keeping this node, we replace toPath's node with the kept node
                // This way, the view, controller, resolved, allResolved, etc. are all setup
                toPath[i] = fromPath[i];
                keep++;
            }
        }

        this.keep = keep;
    },

    /**
     * Updates the address bar based on the new Path
     *
     * @returns a Promise which will be fulfilled when the history token is updated
     */
    updateAddressBar: function () {
        var me = this,
            absoluteUrl,
            allParams;

        if (!me.historyInitialized) {
            return new RSVP.resolve();
        }

        if (!this.toPath) {
            return this.addHistoryToken('/');
        } else {
            absoluteUrl = this.toPath.lastNode().state.absoluteUrl;
            if (absoluteUrl !== null) {

                allParams = Ext.apply({}, this.toPath.allParams);

                for (var param in allParams) {
                    if (allParams.hasOwnProperty(param)) {
                        if (absoluteUrl.indexOf(':' + param) !== -1) {
                            absoluteUrl = absoluteUrl.replace(':' + param, allParams[param]);
                            delete allParams[param];
                        }
                    }
                }

                var count = 0;
                for (param in allParams) {
                    if (allParams.hasOwnProperty(param)) {
                        absoluteUrl += (count === 0) ? '?' : '&';
                        absoluteUrl += param + '=' + allParams[param];
                        count++;
                    }
                }

                return this.addHistoryToken(absoluteUrl);
            } else {
                return this.addHistoryToken('/');
            }
        }
    },

    /**
     * Adds the new history token if different than the current.
     *
     * If the history changed, returns a promise which will resolve when
     * the history changes.
     *
     * Otherwise, returns a fulfilled promise
     *
     * @param token
     * @returns {Promise}
     */
    addHistoryToken: function (token) {
        // If the history isn't changing, return a fulfilled promise immediately
        if (Ext.History.getToken() === token) {
            return new RSVP.resolve();
        }

        // Otherwise, we expect the history to change
        // 1. Create a promise which resolves on history change
        // 2. Add a token to the history
        // 3. Return the promise
        var me = this;
        var promise = new RSVP.Promise(function (resolve) {
            Ext.History.on('change', function () {
                // Allow all other history change listeners to complete first.
                //
                // Mainly, we want onHistoryChanged to be called before this method resolves so that
                // transitioning is still set to true.  If we did not do this, this method may complete
                // first completing the transition, then onHistoryChanged will be called and attempt
                // to transition to the same state.
                setTimeout(function () {
                    resolve();
                }, 1);
            }, me, { single: true });
        });
        Ext.History.add(token);
        return promise;
    },

    getCurrentState: function () {
        if (this.currentPath) {
            return this.currentPath.lastNode().state.name;
        }
        return null;
    },

    getCurrentStateParams: function () {
        if (this.currentPath) {
            return Ext.apply({}, this.currentPath.allParams);
        }
        return null;
    },

    buildToPath: function (newStateName, transitionParams, options) {

        var toPath;
        var toPathNodes = [];
        var curState = this.stateManager.getState(newStateName);

        var inherit = options && options.hasOwnProperty("inherit") && options.inherit === true && this.currentPath !== null;
        var nodeToInheritFrom;

        do {
            // Copy only the parameters defined in the StateDefinition
            var node = Ext.create('StateRouter.staterouter.PathNode', {
                state: curState,
                ownParams: Ext.copyTo({}, transitionParams, curState.params)
            });

            // Inherit params from the current path if the state name is equivalent
            if (inherit && curState.depth < this.currentPath.nodes.length) {
                nodeToInheritFrom = this.currentPath.nodes[curState.depth];

                if (curState.name === nodeToInheritFrom.state.name) {
                    // Only inherit them if not already specified
                    Ext.applyIf(node.ownParams, nodeToInheritFrom.ownParams);
                }
            }

            toPathNodes.push(node);
        } while ((curState = curState.parent) !== null);

        // We want the array to be ordered from root to current state
        toPathNodes.reverse();

        toPath = Ext.create('StateRouter.staterouter.Path', {
            nodes: toPathNodes
        });

        this.updateAllParamsForPath(toPath);

        return toPath;
    },

    updateAllParamsForPath: function (toPath) {
        var i,
            allParams = {},
            node;

        for (i = 0; i < toPath.nodes.length; i++) {
            node = toPath.nodes[i];

            allParams = Ext.applyIf(allParams, node.ownParams);

            // make a copy of the current state of allParams
            // (otherwise each path node will reference the same object)
            node.allParams = Ext.apply({}, allParams);
        }

        toPath.allParams = allParams;
    },

    updateControllersForPath: function (startIndex) {
        var i;
        var node;
        var state;

        for (i = startIndex; i < this.toPath.nodes.length; i++) {
            node = this.toPath.nodes[i];
            state = node.state;

            if (state.controller) {
                if (!this.controllerProvider) {
                    throw new Error("Cannot resolve controller '" + state.controller + "'. controllerProvider undefined");
                }

                node.controller = this.controllerProvider(state.controller);
            } else if (state.viewController) {
                node.controller = Ext.create(state.viewController);
            }
        }
    },

    notifyDiscarded: function (eventName, eventObj) {
        if (!this.currentPath) {
            return this.fireEvent(eventName, eventObj);
        }
        return this.doNotify(eventName, eventObj, this.keep, this.currentPath.nodes.length);
    },

    notifyAll: function (eventName, eventObj) {
        if (!this.currentPath) {
            return this.fireEvent(eventName, eventObj);
        }
        return this.doNotify(eventName, eventObj, 0, this.currentPath.nodes.length);
    },

    notifyKept: function (eventName, eventObj) {
        if (!this.currentPath) {
            return this.fireEvent(eventName, eventObj);
        }
        return this.doNotify(eventName, eventObj, 0, this.keep);
    },

    notifyAncestors: function (eventName, eventObj) {
        if (!this.currentPath) {
            return this.fireEvent(eventName, eventObj);
        }
        return this.doNotify(eventName, eventObj, 0, this.currentPath.nodes.length - 1);
    },

    doNotify: function (eventName, eventObj, startIndex, endIndex, path) {
        var canceled = false,
            i,
            pathArray,
            result,
            controller,
            controllerKept;

        if (this.currentPath) {
            pathArray = path || this.currentPath.nodes;

            for (i = startIndex; i < endIndex; i++) {
                controller = pathArray[i].controller;

                if (controller && controller.onStateRouterEvent) {
                    controllerKept = (i < this.keep);
                    result = controller.onStateRouterEvent(eventName, eventObj, controllerKept);

                    if (result === false) {
                        canceled = true;
                    }
                }
            }
        }

        if (this.fireEvent(eventName, eventObj) === false) {
            canceled = true;
        }

        return !canceled;
    },

    fireEvent: function (eventName, eventObj) {
        if (this.app) {
            return this.app.fireEvent(eventName, eventObj);
        }
    },

    beforeStop: function (transitionEvent) {
        // TODO: The state change request event should be deprecated in favor of the beforeStop lifecycle method
        if (!this.notifyAll(StateRouter.STATE_CHANGE_REQUEST, transitionEvent)) {
            return new RSVP.reject(StateRouter.STATE_CHANGE_CANCELED);
        }

        return this.executeLifecycleMethods(this.beforeStopFnName, [transitionEvent]);
    },

    createStopAndResolvePromise: function () {
        var me = this;
        return this.stopDiscardedControllers().then(function () {
            return me.resolveAllAndForwardIfNecessary();
        });
    },

    stopDiscardedControllers: function () {
        return this.executeLifecycleMethods(this.stopFnName);
    },

    executeLifecycleMethods: function (fnName, args) {
        var me = this,
            i,
            fromPath,
            controller,
            r;
        args = args || [];

        function chainPromise(theController) {
            r = r.then(function () {
                return new RSVP.Promise(function (resolve, reject) {
                    Ext.callback(theController[fnName], theController, [resolve, reject].concat(args));
                });
            });
        }

        r = new RSVP.resolve();

        if (me.currentPath !== null) {
            fromPath = me.currentPath.nodes;

            // Stop in reverse order
            for (i = fromPath.length - 1; i >= this.keep; i--) {
                controller = fromPath[i].controller;

                if (controller && Ext.isFunction(controller[fnName])) {
                    chainPromise(controller);
                }
            }
        }

        return r;
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
            toPathNodes = this.toPath.nodes,
            resolveAllPromise;
        var numNodes = toPathNodes.length;

        resolveAllPromise = me.promiseResolver.createResolvePromise(toPathNodes, this.keep);

        // If the last node forwards to a child, then we want to append the child state
        // to the path and chain one final promise to resolve the forwarded controller's dependencies
        if (this.isLastNodeForwarding()) {
            resolveAllPromise = resolveAllPromise.then(function () {
                me.appendForwardedNode();
                me.updateControllersForPath(numNodes);
                return me.promiseResolver.createResolvePromise(toPathNodes, numNodes);
            });
        }

        return resolveAllPromise;
    },

    isLastNodeForwarding: function () {
        // If the property is not undefined
        return this.toPath.lastNode().state.forwardToChild;
    },

    appendForwardedNode: function () {
        var currentLastNode = this.toPath.lastNode(),
            currentLastNodeState = currentLastNode.state,
            currentDepth = currentLastNodeState.depth,
            forwardedStateName = currentLastNodeState.forwardToChild,
            forwardedState,
            forwardedParams = {},
            ownParams,
            node;

        if (Ext.isFunction(currentLastNodeState.forwardToChild)) {
            forwardedStateName = currentLastNodeState.forwardToChild(currentLastNode.allParams, currentLastNode.resolved, currentLastNode.allResolved);
        }

        if (Ext.isObject(forwardedStateName)) {
            if (Ext.isObject(forwardedStateName.stateParams)) {
                forwardedParams = forwardedStateName.stateParams;
            }

            forwardedStateName = forwardedStateName.stateName;
        }

        if (!StateRouter.isChild(currentLastNodeState.name, forwardedStateName)) {
            throw new Error('Forwarded state "' + forwardedStateName + '" not a child of "' + currentLastNodeState.name + '"');
        }

        forwardedState = this.stateManager.getState(forwardedStateName);

        if (!forwardedState) {
            throw new Error('Forwarded state not found');
        }

        while (forwardedState.name !== currentLastNodeState.name) {

            // Copy only the parameters defined in the StateDefinition
            ownParams = Ext.copyTo({}, forwardedParams, forwardedState.params);

            node = Ext.create('StateRouter.staterouter.PathNode', {
                state: forwardedState,
                ownParams: ownParams
            });

            this.toPath.nodes.splice(currentDepth + 1, 0, node);

            forwardedState = forwardedState.parent;
        }

        // Set the all params for the newly created nodes
        for (var i = currentDepth + 1; i < this.toPath.nodes.length; i++) {
            node = this.toPath.nodes[i];
            node.allParams = Ext.apply({}, this.toPath.nodes[i - 1].allParams);
            node.allParams = Ext.applyIf(node.allParams, node.ownParams);
        }

        this.toPath.allParams = this.toPath.lastNode().allParams;
    },

    startNewControllers: function () {
        var me = this,
            toPath = this.toPath.nodes,
            i,
            pathNode,
            state,
            controller,
            autoResolve;

        var promise = RSVP.resolve();

        function chainStartPromise(theController, allParams, stateName, autoResolve) {
            promise = promise.then(function () {
                return new RSVP.Promise(function (resolve, reject) {
                    if (autoResolve) {
                        Ext.callback(theController[me.startFnName], theController, [allParams, stateName]);
                        resolve();
                    } else {
                        Ext.callback(theController[me.startFnName], theController, [allParams, stateName, resolve, reject]);
                    }
                });
            });
        }

        for (i = this.keep; i < toPath.length; i++) {
            pathNode = toPath[i];
            state = pathNode.state;

            // Get the controller and call its start method
            controller = pathNode.controller;

            // Notify all ancestors of the toPath's path that a new state is being activated
            me.doNotify(StateRouter.STATE_PATH_STARTING, {
                state: state.name
            }, 0, i, toPath);

            me.insertChildIntoParentView(pathNode, i, toPath);

            if (controller) {
                controller.stateName = state.name;

                if (controller && Ext.isFunction(controller[me.startFnName])) {
                    autoResolve = controller[me.startFnName].length < 3;
                    chainStartPromise(controller, pathNode.allParams, state.name, autoResolve);
                }
            }
        }

        return promise;
    },


    // TODO: This should really notify the caller when the view is rendered in case of animations
    // TODO: OR THE ANIMATION CAN NOTIFY CONTROLLERS SO start LOGIC CAN STILL PROCEED
    insertChildIntoParentView: function (pathNode, nodeIndex, path) {
        var me = this,
            state = pathNode.state,
            allParams = pathNode.allParams,
            resolved = pathNode.resolved,
            previouslyResolved = pathNode.allResolved,
            viewClass = state.view,
            viewComponent,
            parentComponent,
            viewConfig = {};

        // In some cases, such as a Window or Dialog, we may not specify a view
        // to swap into the parent.  Instead, the dialog can be created in
        // the start method.  So we don't need to do anything here.
        if (viewClass) {
            // If the view is actually a function, we need to execute it to determine the actual view class
            if (Ext.isFunction(state.view)) {
                viewClass = state.view(allParams, resolved, previouslyResolved);
            }

            if (this.viewProcessorFn) {
                viewClass = this.viewProcessorFn(viewClass);
            }

            // First, remove all items from the parent component.
            parentComponent = this.toPath.findContainerToInsertChild(nodeIndex);
            if (!parentComponent) {
                parentComponent = Ext.getCmp(this.root);
            }
            parentComponent.removeAll();

            Ext.apply(viewConfig, {
                toParams: allParams,
                resolved: resolved,
                allResolved: previouslyResolved,
                stateName: state.name
            });

            if (state.viewController) {
                Ext.apply(viewConfig, {
                    controller: pathNode.controller
                });
            }

            Ext.apply(viewConfig, me.transition.getAdditionalViewConfigOptions(pathNode, nodeIndex, this.keep, path));
            // Create the child and insert it into the parent
            viewComponent = Ext.create(viewClass, viewConfig);
            parentComponent.add(viewComponent);

            me.transition.transitionTo(viewComponent, pathNode, nodeIndex, this.keep, path);
            pathNode.registerView(viewComponent);
        }
    },

    /**
     * Returns the controller for the last node in the current path, or null if no current path or
     * no controller defined
     */
    getControllerForCurrentState: function () {
        var lastNode;

        if (this.currentPath) {
            lastNode = this.currentPath.lastNode();

            if (lastNode) {
                return lastNode.controller;
            }
        }

        return null;
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

    StateRouter.handleCurrentHistoryToken = function(noHistoryTokenCallback) {
        return StateRouter.Router.handleCurrentHistoryToken(noHistoryTokenCallback);
    };

    StateRouter.configure = function(config) {
        return StateRouter.Router.configure(config);
    };

    StateRouter.state = function(configOrName, optConfig) {
        return StateRouter.Router.state(configOrName, optConfig);
    };

    StateRouter.merge = function(configOrName, optConfig) {
        return StateRouter.Router.merge(configOrName, optConfig);
    };

    StateRouter.reload = function(options) {
        return StateRouter.Router.reload(options);
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

    StateRouter.getCurrentStateParams = function() {
        return StateRouter.Router.getCurrentStateParams();
    };

    StateRouter.getStateManager = function () {
        return StateRouter.Router.stateManager;
    };

    StateRouter.getControllerForCurrentState = function () {
        return StateRouter.Router.getControllerForCurrentState();
    };


    // Events
    StateRouter.STATE_CHANGE_REQUEST = 'stateChangeRequest';
    StateRouter.STATE_CHANGE_CANCELED = 'stateChangeCanceled';
    StateRouter.STATE_CHANGE_FAILED = 'stateChangeFailed';
    StateRouter.STATE_CHANGE_TRANSITIONING = 'stateChangeTransitioning';
    StateRouter.STATE_CHANGED = 'stateChanged';
    StateRouter.STATE_PATH_STARTING = 'statePathStarting';
    StateRouter.SAME_PLACE = 'Attempted to transition to the same place';

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