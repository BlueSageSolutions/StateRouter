Ext.define('StateRouter.staterouter.State', {

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
    conditions: {},
    leaf: true,

    constructor: function (config) {
        Ext.apply(this, config);
    }

});