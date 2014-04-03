Ext.define('StateRouter.staterouter.StateDefinition', {

    config: {
        name: null,
        parent: null,
        view: null,
        controller: null,
        forwardToChild: null,
        url: null,
        absoluteUrl: null,
        absoluteUrlRegex: null,
        params: []
    },

    constructor: function(config) {
        this.initConfig(config);
    }

});