describe("PathNode", function() {

    it("should be equal to other path nodes if same parameter and definition name", function() {


        var state = Ext.create('StateRouter.staterouter.State', {
            name: 'contacts'
        });

        var pathNode = Ext.create('StateRouter.staterouter.PathNode', {
            ownParams: {
                id: 1,
                name: 'Toast'
            },
            state: state
        });

        var pathNode2 = Ext.create('StateRouter.staterouter.PathNode', {
            ownParams: {
                id: 1,
                name: 'Toast'
            },
            state: state
        });

        expect(pathNode.isEqual(pathNode2)).toBe(true);
    });

    it("should not be equal even if one path node is a superset of another", function() {


        var state = Ext.create('StateRouter.staterouter.State', {
            name: 'contacts'
        });

//        var node = Ext.create('StateRouter.staterouter.PathNode');
        var pathNode = Ext.create('StateRouter.staterouter.PathNode', {
            ownParams: {
                id: 1,
                name: 'Toast'
            },
            state: state
        });

        var pathNode2 = Ext.create('StateRouter.staterouter.PathNode', {
            ownParams: {
                id: 1,
                name: 'Toast',
                anotherParam: 'Bob'
            },
            state: state
        });

        expect(pathNode.isEqual(pathNode2)).toBe(false);
    });

    describe("View Tests", function () {

        var vp;

        beforeEach(function () {
            vp = Ext.create('Ext.container.Container', {
                id: 'vp',
                renderTo: Ext.getBody()
            });
        });

        afterEach(function () {
            vp.destroy();
        });


        it("should register view as routerView", function () {

            Ext.define('RouterViewPanel', {
                extend: 'Ext.container.Container',
                id: 'routerViewPanel',
                routerView: true
            });

            var routerViewPanel = Ext.create('RouterViewPanel');
            Ext.getCmp('vp').add(routerViewPanel);

            var pathNode = Ext.create('StateRouter.staterouter.PathNode');
            pathNode.registerView(routerViewPanel);

            expect(pathNode.view).not.toBeUndefined();
            expect(pathNode.view).not.toBeNull();
            expect(pathNode.view.getId()).toBe('routerViewPanel');
            expect(pathNode.containerForChildren).not.toBeUndefined();
            expect(pathNode.containerForChildren).not.toBeNull();
            expect(pathNode.containerForChildren.getId()).toBe('routerViewPanel');
        });

        it("should register child container as routerView", function () {

            Ext.define('RouterViewPanel', {
                extend: 'Ext.container.Container',
                id: 'routerViewPanel',
                items: [{
                    xtype: 'container',
                    id: 'childRouterView',
                    routerView: true
                }]
            });

            var routerViewPanel = Ext.create('RouterViewPanel');
            Ext.getCmp('vp').add(routerViewPanel);

            var pathNode = Ext.create('StateRouter.staterouter.PathNode');
            pathNode.registerView(routerViewPanel);

            expect(pathNode.view).not.toBeUndefined();
            expect(pathNode.view).not.toBeNull();
            expect(pathNode.view.getId()).toBe('routerViewPanel');
            expect(pathNode.containerForChildren).not.toBeUndefined();
            expect(pathNode.containerForChildren).not.toBeNull();
            expect(pathNode.containerForChildren.getId()).toBe('childRouterView');
        });
    });
});