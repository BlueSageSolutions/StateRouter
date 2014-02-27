Ext.define('StateRouter.staterouter.transitions.BaseViewTransition', {

    STATE_PENDING: undefined,
    STATE_SEALED: 0,
    STATE_FULFILLED: 1,
    STATE_REJECTED: 2,

    transitionFrom: function (oldViewComponent, resolvePromise) {
    },

    transitionFromFailed: function () {
    },

    getAdditionalViewConfigOptions: function (pathNode, nodeIndex, keep, path) {
        return {};
    },

    transitionTo: function (newViewComponent, pathNode, nodeIndex, keep, path) {
    }
});