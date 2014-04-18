describe("SequentialPromiseResolver", function() {

    it("should return an empty object if empty arr", function() {
        var theResults;


        StateRouter.staterouter.SequentialPromiseResolver.resolve([]).then(function (results) {
            theResults = results;
        });

        waits(10);

        runs(function () {
            expect(theResults).toEqual({});
        });
    });

    it("should return a result even if no promise object passed with node", function() {
        var mainDef,
            mainPathNode,
            promiseArr,
            theResults;

        mainDef = Ext.create('StateRouter.staterouter.StateDefinition', {
            name: 'main'
        });

        mainPathNode = Ext.create('StateRouter.staterouter.PathNode', {
            definition: mainDef
        });

        promiseArr = [{
            pathNode: mainPathNode
        }];


        StateRouter.staterouter.SequentialPromiseResolver.resolve(promiseArr).then(function (results) {
            theResults = results;
        });

        waits(10);

        runs(function () {
            expect(theResults).toEqual({main: {}});
        });
    });

    it("should execute promises sequentially, piping output to next set of promises", function() {
        var mainPathNode,
            mainContactPathNode,
            mainContactAddressPathNode,
            promiseArr,
            theResults;

        mainPathNode = Ext.create('StateRouter.staterouter.PathNode', {
            definition: Ext.create('StateRouter.staterouter.StateDefinition', {
                name: 'main'
            })
        });

        mainContactPathNode = Ext.create('StateRouter.staterouter.PathNode', {
            definition: Ext.create('StateRouter.staterouter.StateDefinition', {
                name: 'main.contact'
            })
        });

        mainContactAddressPathNode = Ext.create('StateRouter.staterouter.PathNode', {
            definition: Ext.create('StateRouter.staterouter.StateDefinition', {
                name: 'main.contact.address'
            })
        });

        promiseArr = [{
            pathNode: mainPathNode,
            resolve: {
                a: function (resolve) {
                    resolve("Hello ");
                },
                b: function (resolve) {
                    resolve("StateRouter ");
                }
            }
        }, {
            pathNode: mainContactPathNode,
            resolve: {
                // can have same resolve name as another node
                a: function (resolve, reject, params, previouslyResolved) {
                    resolve(previouslyResolved.main.a + previouslyResolved.main.b + 'World');
                }
            }
        }, {
            pathNode: mainContactAddressPathNode,
            resolve: {
                last: function (resolve, reject, params, previouslyResolved) {
                    resolve(previouslyResolved['main.contact'].a + '!!');
                }
            }
        }];

        StateRouter.staterouter.SequentialPromiseResolver.resolve(promiseArr).then(function (results) {
            theResults = results['main.contact.address'].last;
        });

        waits(10);

        runs(function () {
            expect(theResults).toEqual("Hello StateRouter World!!");
        });
    });

    it("should allow previous result to be used as input", function() {
        var mainPathNode,
            mainContactPathNode,
            promiseArr1,
            promiseArr2,
            theResults;

        mainPathNode = Ext.create('StateRouter.staterouter.PathNode', {
            definition: Ext.create('StateRouter.staterouter.StateDefinition', {
                name: 'main'
            })
        });

        mainContactPathNode = Ext.create('StateRouter.staterouter.PathNode', {
            definition: Ext.create('StateRouter.staterouter.StateDefinition', {
                name: 'main.contact'
            })
        });

        promiseArr1 = [{
            pathNode: mainPathNode,
            resolve: {
                a: function (resolve) {
                    resolve("Hello");
                }
            }
        }];


        promiseArr2 = [{
            pathNode: mainContactPathNode,
            resolve: {
                b: function (resolve, reject, params, previouslyResolved) {
                    resolve(previouslyResolved.main.a + " World");
                }
            }
        }];


        StateRouter.staterouter.SequentialPromiseResolver.resolve(promiseArr1).then(function (results) {

            StateRouter.staterouter.SequentialPromiseResolver.resolve(promiseArr2, results).then(function (results) {
                theResults = results['main.contact'].b;
            });

        });

        waits(10);

        runs(function () {
            expect(theResults).toEqual("Hello World");
        });
    });

    it("should pass node parameters and all previous params to resolve", function() {
        var mainPathNode,
            mainContactPathNode,
            promiseArr,
            theResults;

        mainPathNode = Ext.create('StateRouter.staterouter.PathNode', {
            definition: Ext.create('StateRouter.staterouter.StateDefinition', {
                name: 'main',
                params: ['user']
            }),
            ownParams: {
                user: 'bob'
            },
            allParams: {
                user: 'bob'
            }
        });

        mainContactPathNode = Ext.create('StateRouter.staterouter.PathNode', {
            definition: Ext.create('StateRouter.staterouter.StateDefinition', {
                name: 'main.contact',
                params: ['id', 'contactId']
            }),
            ownParams: {
                id: '1',
                contactId: '2'
            },
            allParams: {
                user: 'bob',
                id: '1',
                contactId: '2'
            }
        });

        promiseArr = [{
            pathNode: mainPathNode,
            resolve: {
                a: function (resolve, reject, params) {
                    expect(params.user).toEqual('bob');
                    resolve();
                }
            }
        }, {
            pathNode: mainContactPathNode,
            resolve: {
                // can have same resolve name as another node
                a: function (resolve, reject, params) {
                    expect(params.id).toEqual('1');
                    expect(params.contactId).toEqual('2');
                    expect(params.user).toEqual('bob');
                    resolve();
                }
            }
        }];

        StateRouter.staterouter.SequentialPromiseResolver.resolve(promiseArr).then(function (results) {
            theResults = results['main.contact.address'].last;
        });

        waits(10);
    });
});