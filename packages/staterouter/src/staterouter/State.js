Ext.define('StateRouter.staterouter.State', {

    config: {
        path: [], // an array of states leading up to and including this path
        allParams: {}
    },

    constructor: function(config) {
        this.initConfig(config);
    },

    isEqual: function (otherState) {
        if (!otherState) {
            return false;
        }

        if (this.getDefinitionName() !== otherState.getDefinitionName) {
            return false;
        }

        // TODO: Can we simply test if allParams === otherState.allParams (?)
        for (var i = 0; i < this.path.length; i++) {
            if (!this.path[i].isEqual(otherState.path[i])) {
                return false;
            }
        }

        return true;
    },

    /**
     * Convenience method to return this state's name
     *
     * @returns {*}
     */
    getDefinitionName: function () {
        var node = this.getPathNode();
        return node.getDefinition().getName();
    },

    /**
     * Convenience method to return this state's own parameters
     *
     * @returns {*}
     */
    getOwnParams: function () {
        var node = this.getPathNode();
        return node.getOwnParams();
    },

    /**
     * Return the path node for "this" state (the last node in the path).
     */
    getPathNode: function () {
        return this.path[this.path.length - 1];
    }
});