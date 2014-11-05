Ext.define('StateRouter.staterouter.State', {

    $configPrefixed: false,

    config: {
        name: null,
        parent: null,
        depth: null,
        view: null,
        viewController: null,
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