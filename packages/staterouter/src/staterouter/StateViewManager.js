Ext.define('StateRouter.staterouter.StateViewManager', {

    rootComponentId: null,
    stateToViewId: null,
    stateToRouterViewId: null,

    constructor: function () {
        this.stateToViewId = {};
        this.stateToRouterViewId = {};
    },

    register: function (stateName, viewComponent) {
        var nestedComponent;

        this.stateToViewId[stateName] = viewComponent.getId();

        // This view may be an ancestor of other views.  Either the entire
        // view will be swapped out or it will have a child which will act
        // as the container for nested children.
        //
        // We store the ID of this wrapping container into the
        // StateDefinition - a bit of a hack.
        if (viewComponent.routerView) {
            this.stateToRouterViewId[stateName] = viewComponent.getId();
        } else {
            nestedComponent = viewComponent.down('container[routerView]');

            if (nestedComponent) {
                this.stateToRouterViewId[stateName] = nestedComponent.getId();
            }
            // If this state is not a leaf and it does not define a routerView,
            // then some parent will be the child view insertion point
        }
    },

    findView: function (stateDefinition) {
        if (this.stateToViewId.hasOwnProperty(stateDefinition.getName())) {
            return Ext.getCmp(this.stateToViewId[stateDefinition.getName()]);
        }
        return null;
    },

    findContainerToInsertChild: function (stateDefinition) {
        var stateDef = stateDefinition;

        // Start with the parent
        while ((stateDef = stateDef.getParent())) {

            if (this.stateToRouterViewId.hasOwnProperty(stateDef.getName())) {
                return Ext.getCmp(this.stateToRouterViewId[stateDef.getName()]);
            }
        }

        // No view found, use root
        if (!Ext.isString(this.rootComponentId)) {
            throw 'Cannot insert view. No routerView found and root not defined';
        }

        return Ext.getCmp(this.rootComponentId);
    }
});