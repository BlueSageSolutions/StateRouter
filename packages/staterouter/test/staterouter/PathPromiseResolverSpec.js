describe("PathPromiseResolver", function() {

    var resolver,
        stateManager;

    beforeEach(function() {
        stateManager = Ext.create('StateRouter.staterouter.StateManager');
        resolver = Ext.create('StateRouter.staterouter.PathPromiseResolver');
        resolver.stateManager = stateManager;
    });

    it("should handle empty path", function() {
        var path = [],
            complete = false;

        var p = resolver.createResolvePromise(path, 0);
        p.then(function () {
            complete = true;
        });

        waits(1);

        runs(function () {

            expect(complete).toBe(true);
        });
    });

    it("should resolve a single path with no resolvables", function() {
        var path = [],
            controller = {},
            complete = false;

        stateManager.controllerProvider = function () {
            return controller;
        };

        stateManager.register('main', {
            controller: 'main'
        });

        path.push(Ext.create('StateRouter.staterouter.PathNode', {
            definition: stateManager.getStateDefinition('main')
        }));

        var p = resolver.createResolvePromise(path, 0);
        p.then(function () {
            complete = true;
        });

        waits(1);

        runs(function () {
            expect(complete).toBe(true);
        });
    });

    it("should resolve a single path with resolvables", function() {
        var path = [],
            controller = {
                resolve: {
                    one: function (resolve) {
                        resolve('one');
                    },
                    two: function (resolve) {
                        resolve('two');
                    }
                }
            };

        stateManager.controllerProvider = function () {
            return controller;
        };
        stateManager.register('main', {
            controller: 'main'
        });

        path.push(Ext.create('StateRouter.staterouter.PathNode', {
            definition: stateManager.getStateDefinition('main')
        }));

        var p = resolver.createResolvePromise(path, 0);
        p.then(function () {
        });

        waits(1);

        runs(function () {
            expect(path[0].resolved).not.toBeUndefined();
            expect(path[0].resolved.one).toBe('one');
            expect(path[0].resolved.two).toBe('two');
            expect(path[0].allResolved).not.toBeUndefined();
            expect(path[0].allResolved.main).not.toBeUndefined();
            expect(path[0].allResolved.main.one).toBe('one');
            expect(path[0].allResolved.main.two).toBe('two');
            expect(controller.resolved).not.toBeUndefined();
            expect(controller.resolved.one).toBe('one');
            expect(controller.resolved.two).toBe('two');
            expect(controller.allResolved).not.toBeUndefined();
            expect(controller.allResolved.main).not.toBeUndefined();
            expect(controller.allResolved.main.one).toBe('one');
            expect(controller.allResolved.main.two).toBe('two');
        });
    });

    it("should not resolve kept states", function() {
        var path = [],
            count = 0,
            newCount = 0,
            keptController = {
                resolve: {
                    one: function (resolve) {
                        count++;
                        resolve('one');
                    },
                    two: function (resolve) {
                        count++;
                        resolve('two');
                    }
                }
            },
            newController = {
                resolve: {
                    three: function (resolve) {
                        newCount++;
                        resolve('three');
                    }
                }
            };

        stateManager.controllerProvider = function (name) {
            if (name === 'main') {
                return keptController;
            } else if (name === 'main.home') {
                return newController;
            }
            return null;
        };
        stateManager.register('main', {
            controller: 'main'
        });
        stateManager.register('main.home', {
            controller: 'main.home'
        });

        path.push(Ext.create('StateRouter.staterouter.PathNode', {
            definition: stateManager.getStateDefinition('main')
        }));
        path.push(Ext.create('StateRouter.staterouter.PathNode', {
            definition: stateManager.getStateDefinition('main.home')
        }));

        var p = resolver.createResolvePromise(path, 1);
        p.then(function () {
        });

        waits(1);

        runs(function () {
            expect(count).toBe(0);
            expect(newCount).toBe(1);
        });
    });

    it("should resolve a path containing a null controller", function() {
        var path,
            complete = false,
            a = {
                resolve: {
                    one: function (resolve) {
                        resolve('one');
                    },
                    two: function (resolve) {
                        resolve('two');
                    }
                }
            },
            c = {
                resolve: {
                    three: function (resolve) {
                        resolve('three');
                    }
                }
            };

        stateManager.controllerProvider = function (name) {
            if (name === 'a') {
                return a;
            } else if (name === 'a.b.c') {
                return c;
            }
            return null;
        };
        stateManager.register('a', { controller: 'a' });
        stateManager.register('a.b');
        stateManager.register('a.b.c', { controller: 'a.b.c' });

        path = [
            Ext.create('StateRouter.staterouter.PathNode', {
                definition: stateManager.getStateDefinition('a')
            }),
            Ext.create('StateRouter.staterouter.PathNode', {
                definition: stateManager.getStateDefinition('a.b')
            }),
            Ext.create('StateRouter.staterouter.PathNode', {
                definition: stateManager.getStateDefinition('a.b.c')
            })
        ];

        var p = resolver.createResolvePromise(path, 0);
        p.then(function () {
            complete = true;
        });

        waits(1);

        runs(function () {
            expect(complete).toBe(true);
            expect(path[0].resolved).toEqual({
                one: 'one',
                two: 'two'
            });
            expect(path[0].allResolved).toEqual({
                a: {
                    one: 'one',
                    two: 'two'
                }
            });
            expect(path[1].resolved).toEqual({});
            expect(path[1].allResolved).toEqual({
                a: {
                    one: 'one',
                    two: 'two'
                },
                'a.b': {}
            });

            expect(path[2].resolved).toEqual({
                three: 'three'
            });
            expect(path[2].allResolved).toEqual({
                a: {
                    one: 'one',
                    two: 'two'
                },
                'a.b': {},
                'a.b.c': {
                    three: 'three'
                }
            });
            expect(a.resolved).toEqual({
                one: 'one',
                two: 'two'
            });
            expect(a.allResolved).toEqual({
                a: {
                    one: 'one',
                    two: 'two'
                }
            });
            expect(c.resolved).toEqual({
                three: 'three'
            });
            expect(c.allResolved).toEqual({
                a: {
                    one: 'one',
                    two: 'two'
                },
                'a.b': {},
                'a.b.c': {
                    three: 'three'
                }
            });
        });
    });

    it("should pass resolve results to next child resolves", function() {
        var oldPath,
            newPath,
            previouslyResolvedA1,
            previouslyResolvedA2,
            previouslyResolvedB,
            previouslyResolvedC,
            controllerA = {
                resolve: {
                    one: function (resolve, reject, stateParams, previouslyResolved) {
                        previouslyResolvedA1 = Ext.apply({}, previouslyResolved);
                        resolve('one');
                    },
                    two: function (resolve, reject, stateParams, previouslyResolved) {
                        previouslyResolvedA2 = Ext.apply({}, previouslyResolved);
                        resolve('two');
                    }
                }
            },
            controllerB = {
                resolve: {
                    three: function (resolve, reject, stateParams, previouslyResolved) {
                        previouslyResolvedB = Ext.apply({}, previouslyResolved);
                        resolve('three');
                    }
                }
            },
            controllerC = {
                resolve: {
                    four: function (resolve, reject, stateParams, previouslyResolved) {
                        previouslyResolvedC = Ext.apply({}, previouslyResolved);
                        resolve('four');
                    }
                }
            };

        stateManager.controllerProvider = function (name) {
            if (name === 'a') {
                return controllerA;
            } else if (name === 'a.b') {
                return controllerB;
            } else if (name === 'a.b.c') {
                return controllerC;
            }
            return null;
        };
        stateManager.register('a', { controller: 'a' });
        stateManager.register('a.b', { controller: 'a.b' });
        stateManager.register('a.b.c', { controller: 'a.b.c' });

        oldPath = [
            Ext.create('StateRouter.staterouter.PathNode', {
                definition: stateManager.getStateDefinition('a')
            })
        ];

        var p = resolver.createResolvePromise(oldPath, 0);
        p = p.then(function () {
        });

        waits(1);

        runs(function () {
            expect(controllerA.resolved.one).toBe('one');
            expect(controllerA.resolved.two).toBe('two');
            expect(controllerB.resolved).toBeUndefined();
            expect(controllerB.resolved).toBeUndefined();
            expect(previouslyResolvedA1).toEqual({});
            expect(previouslyResolvedA2).toEqual({});

            newPath = [
                Ext.create('StateRouter.staterouter.PathNode', {
                    definition: stateManager.getStateDefinition('a')
                }),
                Ext.create('StateRouter.staterouter.PathNode', {
                    definition: stateManager.getStateDefinition('a.b')
                }),
                Ext.create('StateRouter.staterouter.PathNode', {
                    definition: stateManager.getStateDefinition('a.b.c')
                })
            ];
            newPath[0].resolved = controllerA.resolved;
            newPath[0].allResolved =controllerA.allResolved;

            p = resolver.createResolvePromise(newPath, 1);
            p = p.then(function () {
            });
        });

        waits(1);

        runs(function () {
            expect(controllerA.resolved.one).toBe('one');
            expect(controllerA.resolved.two).toBe('two');
            expect(controllerB.resolved.three).toBe('three');
            expect(controllerC.resolved.four).toBe('four');
            expect(previouslyResolvedA1).toEqual({});
            expect(previouslyResolvedA2).toEqual({});
            expect(previouslyResolvedB).toEqual({
                a: {
                    one: 'one',
                    two: 'two'
                }
            });
            expect(previouslyResolvedC).toEqual({
                a: {
                    one: 'one',
                    two: 'two'
                },
                'a.b': {
                    three: 'three'
                }
            });
        });
    });

    it("should pass stateParams to resolve", function() {
        var a = {
            resolve: {
                a: function (resolve, reject, stateParams) {
                    expect(stateParams.user).toEqual('bob');
                    resolve();
                }
            }
        };
        var b = {
            resolve: {
                // can have same resolve name as another node
                a: function (resolve, reject, stateParams) {
                    expect(stateParams.id).toEqual('1');
                    expect(stateParams.contactId).toEqual('2');
                    expect(stateParams.user).toEqual('bob');
                    resolve();
                }
            }
        };
        var path;

        stateManager.controllerProvider = function (name) {
            if (name === 'a') {
                return a;
            } else if (name === 'b') {
                return b;
            }
            return null;
        };
        stateManager.register('a', {
            controller: 'a',
            params: ['user']
        });
        stateManager.register('a.b', {
            controller: 'b',
            params: ['id', 'contactId']
        });

        path = [
            Ext.create('StateRouter.staterouter.PathNode', {
                definition: stateManager.getStateDefinition('a'),
                ownParams: {
                    user: 'bob'
                },
                allParams: {
                    user: 'bob'
                }
            }),
            Ext.create('StateRouter.staterouter.PathNode', {
                definition: stateManager.getStateDefinition('a.b'),
                ownParams: {
                    id: '1',
                    contactId: '2'
                },
                allParams: {
                    user: 'bob',
                    id: '1',
                    contactId: '2'
                }
            })
        ];

        resolver.createResolvePromise(path, 0).then(function () {
        });

        waits(1);
    });
});