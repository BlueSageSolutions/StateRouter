Ext.define('StateRouter.staterouter.StateDefinition', {

    config: {
        name: null,
        parentName: null,
        view: null,
        controller: null,
        forwardToChild: null,
        params: []
    },

    constructor: function(config) {
        this.initConfig(config);
    }

});