describe("State", function() {
    var a;

    it("should be equal to other state if entire path is equal", function() {
        var mainDef,
            mainContactDef,
            mainContactAddressDef,
            fromState,
            toState;


        mainDef = Ext.create('StateRouter.staterouter.StateDefinition', {
            name: 'main'
        });

        mainContactDef = Ext.create('StateRouter.staterouter.StateDefinition', {
            name: 'main.contact',
            params: ['id']
        });

        mainContactAddressDef = Ext.create('StateRouter.staterouter.StateDefinition', {
            name: 'main.contact.address',
            params: ['addressId']
        });

        fromState = Ext.create('StateRouter.staterouter.State', {
            path: [
                Ext.create('StateRouter.staterouter.PathNode', {
                    definition: mainDef
                }),
                Ext.create('StateRouter.staterouter.PathNode', {
                    ownParams: {
                        id: 1
                    },
                    definition: mainContactDef
                }),
                Ext.create('StateRouter.staterouter.PathNode', {
                    ownParams: {
                        addressId: 10
                    },
                    definition: mainContactAddressDef
                })
            ]
        });

        toState = Ext.create('StateRouter.staterouter.State', {
            path: [
                Ext.create('StateRouter.staterouter.PathNode', {
                    definition: mainDef
                }),
                Ext.create('StateRouter.staterouter.PathNode', {
                    ownParams: {
                        id: 1
                    },
                    definition: mainContactDef
                }),
                Ext.create('StateRouter.staterouter.PathNode', {
                    ownParams: {
                        addressId: 10
                    },
                    definition: mainContactAddressDef
                })
            ]
        });

        expect(fromState.isEqual(toState)).toBe(true);
    });
});