Ext.define('StateRouter.staterouter.StateManager', {

    mixins: {
        observable: 'Ext.util.Observable'
    },

    states: null,
    controllerProvider: null,
    urlParser: null,
    stateViewManager: null,

    constructor: function (config) {
        this.states = {};
        this.mixins.observable.constructor.call(this, config);

        this.urlParser = Ext.create('StateRouter.staterouter.UrlParser');
    },

    each: function (fn, scope) {
        return Ext.Object.each(this.states, fn, scope);
    },

    hasState: function (stateName) {
        return this.states.hasOwnProperty(stateName);
    },

    getState: function (stateName) {
        return this.states[stateName];
    },

    register: function (configOrName, optConfig) {
        var me = this,
            newStateConfig = optConfig || {},
            newState,
            parentStateName,
            lastPeriodIndex,
            urlParserResult,
            splitUrlResult;

        if (Ext.isObject(configOrName)) {
            newStateConfig = configOrName;
        } else if (Ext.isString(configOrName)) {
            newStateConfig.name = configOrName;
        }

        // Now build the state
        newState = Ext.create('StateRouter.staterouter.State', newStateConfig);

        if (!newState.name) {
            throw "State requires 'name'";
        }

        // Determine if this is a child state and if so verify and set the parent
        lastPeriodIndex = newState.name.lastIndexOf('.');

        // Extract the parent from the name
        if (lastPeriodIndex === -1) {
            newState.parent = null;
            newState.depth = 0;
        } else {
            parentStateName = newState.name.slice(0, lastPeriodIndex);

            if (!me.states.hasOwnProperty(parentStateName)) {
                throw "Parent '" + parentStateName + "' not found";
            }

            newState.parent = me.states[parentStateName];
            newState.depth = newState.parent.depth + 1;
        }

        // If URL is specified, the URL parameters will override the 'params' property
        if (newState.url) {

            // Since this state can be navigated to via a URL,
            // all parents which have params must provide URLs
            me.verifyAllParentsNavigable(newState);

            // First, split the URL into its base and query parts
            // /abc/:param?a&b
            //
            // becomes...
            // {
            //    baseUrl: /abc/:param
            //    queryParams: ['a', 'b']
            // }
            splitUrlResult = this.urlParser.splitUrl(newState.url);

            newState.queryParams = splitUrlResult.queryParams;

            // Build the full baseUrl path from the root state (not including query params)
            newState.absoluteUrl = splitUrlResult.baseUrl;
            if (newState.parent && newState.parent.url) {
                newState.absoluteUrl = newState.parent.absoluteUrl + newState.absoluteUrl;
            }

            // We call the parser twice, once with the full path to this state, including all parents baseUrls
            // This gives us our regex so we can test if a user entered full URL matches this state
            urlParserResult = this.urlParser.parse(newState.absoluteUrl, me.getAllUrlParamConditions(newState));
            newState.absoluteUrlRegex = urlParserResult.regex;

            // Next, we pass just the partial URL for this specific state to the urlParser, this is just a simple
            // way to extract the URL position based parameters solely for this state
            urlParserResult = this.urlParser.parse(splitUrlResult.baseUrl);
            newState.urlParams = urlParserResult.params;

            newState.params = newState.urlParams.concat(newState.queryParams);
        }

        me.states[newState.name] = newState;

        me.fireEvent('stateregistered', newState);
        return me;
    },
    
    merge: function (configOrName, updatedConfig) {
        var newStateConfig = updatedConfig || {};

        if (Ext.isObject(configOrName)) {
            newStateConfig = configOrName;
        } else if (Ext.isString(configOrName)) {
            newStateConfig.name = configOrName;
        }
        var state = this.getState(newStateConfig.name);
        if (!state) {
            throw "State not found: " + newStateConfig.name;
        }
        newStateConfig = Ext.apply(state, newStateConfig);
        this.register(newStateConfig);
    },

    verifyAllParentsNavigable: function (state) {
        var parentState = state;

        // Ensure all parent nodes that have at least one parameter specify a URL
        while ((parentState = parentState.parent) !== null) {

            if (!parentState.url && parentState.params.length > 0) {
                throw "All parents of state '" + state.name +
                    "' which have params must provide a URL";
            }
        }
    },

    getAllUrlParamConditions: function (state) {
        var conditions = {},
            curState = state;

        do {
            if (curState.conditions) {
                conditions = Ext.apply(conditions, curState.conditions);
            }
        } while ((curState = curState.parent) !== null);

        return conditions;
    },

    unregister: function (stateName) {
        if (this.states.hasOwnProperty(stateName)) {
            delete this.states[stateName];

            this.fireEvent('stateunregistered', stateName);
        }
    }
});