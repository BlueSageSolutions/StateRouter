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

        if (!newState.getName()) {
            throw "State requires 'name'";
        }

        // Determine if this is a child state and if so verify and set the parent
        lastPeriodIndex = newState.getName().lastIndexOf('.');

        // Extract the parent from the name
        if (lastPeriodIndex === -1) {
            newState.setParent(null);
            newState.setDepth(0);
        } else {
            parentStateName = newState.getName().slice(0, lastPeriodIndex);

            if (!me.states.hasOwnProperty(parentStateName)) {
                throw "Parent '" + parentStateName + "' not found";
            }

            newState.setParent(me.states[parentStateName]);
            newState.setDepth(me.states[parentStateName].getDepth());
        }

        // If URL is specified, the URL parameters will override the 'params' property
        if (newState.getUrl()) {

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
            splitUrlResult = this.urlParser.splitUrl(newState.getUrl());

            newState.setQueryParams(splitUrlResult.queryParams);

            // Build the full baseUrl path from the root state (not including query params)
            newState.setAbsoluteUrl(splitUrlResult.baseUrl);
            if (newState.getParent() && newState.getParent().getUrl()) {
                newState.setAbsoluteUrl(newState.getParent().getAbsoluteUrl() + newState.getAbsoluteUrl());
            }

            // We call the parser twice, once with the full path to this state, including all parents baseUrls
            // This gives us our regex so we can test if a user entered full URL matches this state
            urlParserResult = this.urlParser.parse(newState.getAbsoluteUrl(), me.getAllUrlParamConditions(newState));
            newState.setAbsoluteUrlRegex(urlParserResult.regex);

            // Next, we pass just the partial URL for this specific state to the urlParser, this is just a simple
            // way to extract the URL position based parameters solely for this state
            urlParserResult = this.urlParser.parse(splitUrlResult.baseUrl);
            newState.setUrlParams(urlParserResult.params);

            newState.setParams(newState.getUrlParams().concat(newState.getQueryParams()));
        }

        me.states[newState.getName()] = newState;

        me.fireEvent('stateregistered', newState);
        return me;
    },

    verifyAllParentsNavigable: function (state) {
        var parent = state;

        // Ensure all parent nodes that have at least one parameter specify a URL
        while ((parent = parent.getParent()) !== null) {

            if (!parent.getUrl() && parent.getParams().length > 0) {
                throw "All parents of state '" + state.getName() +
                    "' which have params must provide a URL";
            }
        }
    },

    getAllUrlParamConditions: function (state) {
        var conditions = {},
            curState = state;

        do {
            if (curState.getConditions()) {
                conditions = Ext.apply(conditions, curState.getConditions());
            }
        } while ((curState = curState.getParent()) !== null);

        return conditions;
    },

    unregister: function (stateName) {
        if (this.states.hasOwnProperty(stateName)) {
            delete this.states[stateName];

            this.fireEvent('stateunregistered', stateName);
        }
    }
});