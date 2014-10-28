Ext.define('StateRouter.staterouter.StateDefinition', {

    $configPrefixed: false,

    config: {
        name: null,
        parent: null,
        view: null,
        controller: null,
        forwardToChild: null,
        url: null,
        absoluteUrl: null,
        absoluteUrlRegex: null,
        params: [], // all params
        urlParams: [], // URL positioned params
        queryParams: [], // query params
        conditions: {}
    },

    constructor: function(config) {
        this.initConfig(config);
    }

});