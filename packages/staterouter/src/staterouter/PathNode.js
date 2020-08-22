Ext.define('StateRouter.staterouter.PathNode', {

    requires: [
        'StateRouter.staterouter.State'
    ],

    state: null,
    ownParams: {},
    allParams: {},
    containerForChildren: null,
    view: null,
    controller: null,

    // PathPromiseResolver sets these
    resolved: null,
    allResolved: null,

    constructor: function (config) {
        Ext.apply(this, config);
    },

    /**
     * Compares this state path with another.
     *
     * @param other
     * @returns {boolean}
     */
    isEqual: function (other) {
        if (!other) {
            throw "Other state undefined";
        }

        if (this.state.name !== other.state.name) {
            return false;
        }

        return Ext.Object.equals(this.ownParams, other.ownParams);
    },

    /**
     * First, we save this view.
     *
     * Most importantly, if this state has any child states defined,
     * we also save the view Container where the children will be inserted.
     *
     * @param viewComponent
     */
    registerView: function (viewComponent, elemId) {
        if (viewComponent) {

            this.view = viewComponent;

            // This view may be an ancestor of other views.  Either the entire
            // view will be swapped out or it will have a child which will act
            // as the container for nested children.

            if (elemId && Ext.isString(elemId)) {
                this.containerForChildren = elemId;
            } else if (viewComponent.routerView) {
                this.containerForChildren = viewComponent;
            } else if (viewComponent && viewComponent.down) {
                this.containerForChildren = viewComponent.down('container[routerView]');
            }

            // TODO: If state is not a leaf and it does not define a routerView, it's an error but we're not
            // handling this right now
        }
    }
});