/**
 * A path of nodes each bound to a state definition used to specify a specific application state.
 */
Ext.define('StateRouter.staterouter.Path', {

    requires: [
        'StateRouter.staterouter.PathNode'
    ],

    nodes: [],
    allParams: {}, // TODO: Consider deleting, see Router.buildToPath

    constructor: function (config) {
        Ext.apply(this, config);
    },

    isEqual: function (otherPath) {
        if (!otherPath) {
            return false;
        }

        if (this.nodes.length !== otherPath.nodes.length) {
            return false;
        }

        for (var i = 0; i < this.nodes.length; i++) {
            if (!this.nodes[i].isEqual(otherPath.nodes[i])) {
                return false;
            }
        }

        return true;
    },

    lastNode: function () {
        return this.nodes[this.nodes.length - 1];
    },

    findContainerToInsertChild: function (indexOfPathNodeToInsert) {

        // Start with the parent state
        var curIndex = indexOfPathNodeToInsert - 1;
        var pathNode;

        while (curIndex >= 0) {
            pathNode = this.nodes[curIndex];

            if (pathNode.containerForChildren) {
                return pathNode.containerForChildren;
            }

            curIndex--;
        }

        return null;
    }
});