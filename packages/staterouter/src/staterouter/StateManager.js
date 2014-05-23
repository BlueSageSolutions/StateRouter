Ext.define('StateRouter.staterouter.StateManager', {

    mixins: {
        observable: 'Ext.util.Observable'
    },

    states: null,
    controllerProvider: null,
    controllerProcessor: null,

    constructor: function (config) {
        this.states = {};
        this.mixins.observable.constructor.call(this, config);

        this.addEvents(
            'stateregistered',
            'stateunregistered'
        );
    },

    each: function (fn, scope) {
        return Ext.Object.each(this.states, fn, scope);
    },

    hasStateDefinition: function (stateName) {
        return this.states.hasOwnProperty(stateName);
    },

    getStateDefinition: function (stateName) {
        return this.states[stateName];
    },

    register: function (configOrName, optConfig) {
        var me = this,
            newStateConfig = optConfig || {},
            newStateDefinition,
            parentStateName,
            lastPeriodIndex,
            urlParser,
            urlParserResult;

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

            if (!me.states.hasOwnProperty(parentStateName)) {
                throw "Parent '" + parentStateName + "' not found";
            }

            newStateDefinition.setParent(me.states[parentStateName]);
        }

        // If URL is specified, the URL parameters will override the 'params' property
        if (newStateDefinition.getUrl()) {

            // Since this state can be navigated to via a URL,
            // all parents which have params must provide URLs
            me.verifyAllParentsNavigable(newStateDefinition);

            newStateDefinition.setAbsoluteUrl(newStateDefinition.getUrl());

            if (newStateDefinition.getParent() && newStateDefinition.getParent().getUrl()) {
                newStateDefinition.setAbsoluteUrl(newStateDefinition.getParent().getAbsoluteUrl() + newStateDefinition.getUrl());
            }

            urlParser = Ext.create('StateRouter.staterouter.UrlParser');
            urlParserResult = urlParser.parse(newStateDefinition.getAbsoluteUrl(), me.getAllUrlParamConditions(newStateDefinition));
            newStateDefinition.setAbsoluteUrlRegex(urlParserResult.regex);

            urlParserResult = urlParser.parse(newStateDefinition.getUrl());
            newStateDefinition.setParams(urlParserResult.params);
        }

        me.states[newStateDefinition.getName()] = newStateDefinition;

        me.fireEvent('stateregistered', newStateDefinition);
        return me;
    },

    verifyAllParentsNavigable: function (stateDef) {
        var parent = stateDef;

        // Ensure all parent nodes that have at least one parameter specify a URL
        while ((parent = parent.getParent()) !== null) {

            if (!parent.getUrl() && parent.getParams().length > 0) {
                throw "All parents of state '" + stateDef.getName() +
                    "' which have params must provide a URL";
            }
        }
    },

    getAllUrlParamConditions: function (stateDef) {
        var conditions = {},
            curStateDef = stateDef;

        do {
            if (curStateDef.getConditions()) {
                conditions = Ext.apply(conditions, curStateDef.getConditions());
            }
        } while ((curStateDef = curStateDef.getParent()) !== null);

        return conditions;
    },

    unregister: function (stateName) {
        if (this.states.hasOwnProperty(stateName)) {
            delete this.states[stateName];

            this.fireEvent('stateunregistered', stateName);
        }
    },

    getControllerForPathNode: function (pathNode) {
        return this.getControllerForState(pathNode.getDefinition());
    },

    getControllerForState: function (state) {
        var stateDef = state;

        if (Ext.isString(state)) {
            stateDef = this.getStateDefinition(state);
        }

        return this.lookupController(stateDef.getController());
    },

    lookupController: function (name) {
        // TODO: Should use the stateViewManager to pass to controllerProvider for ExtJS 5
        var controllerName = name;

        if (!controllerName) {
            return null;
        }

        if (!this.controllerProvider) {
            throw new Error("Cannot resolve controller '" + controllerName + "'. controllerProvider undefined");
        }

        if (this.controllerProcessor) {
            controllerName = this.controllerProcessor(controllerName);
        }

        return this.controllerProvider(controllerName);
    }
});