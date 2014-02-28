describe("PathNode", function() {

    it("should be equal to other path nodes if same parameter and definition name", function() {


        var stateDef = Ext.create('StateRouter.staterouter.StateDefinition', {
            name: 'contacts'
        });

        var pathNode = Ext.create('StateRouter.staterouter.PathNode', {
            ownParams: {
                id: 1,
                name: 'Toast'
            },
            definition: stateDef
        });

        var pathNode2 = Ext.create('StateRouter.staterouter.PathNode', {
            ownParams: {
                id: 1,
                name: 'Toast'
            },
            definition: stateDef
        });

        expect(pathNode.isEqual(pathNode2)).toBe(true);
    });

    it("should not be equal even if one path node is a superset of another", function() {


        var stateDef = Ext.create('StateRouter.staterouter.StateDefinition', {
            name: 'contacts'
        });

//        var node = Ext.create('StateRouter.staterouter.PathNode');
        var pathNode = Ext.create('StateRouter.staterouter.PathNode', {
            ownParams: {
                id: 1,
                name: 'Toast'
            },
            definition: stateDef
        });

        var pathNode2 = Ext.create('StateRouter.staterouter.PathNode', {
            ownParams: {
                id: 1,
                name: 'Toast',
                anotherParam: 'Bob'
            },
            definition: stateDef
        });

        expect(pathNode.isEqual(pathNode2)).toBe(false);
    });
});