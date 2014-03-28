describe("Router", function() {

    describe("Utility Methods", function () {

        it("isChild", function () {
            expect(StateRouter.isChild('home', 'home.contact')).toBe(true);
            expect(StateRouter.isChild('home', 'home')).toBe(false);
            expect(StateRouter.isChild('home', 'home.contact.a')).toBe(true);
            expect(StateRouter.isChild('blah', 'home.contact.a')).toBe(false);
            expect(StateRouter.isChild('home.contact', 'home')).toBe(false);
        });

        it("isOrHasChild", function () {
            expect(StateRouter.isOrHasChild('home', 'home.contact')).toBe(true);
            expect(StateRouter.isOrHasChild('home', 'home')).toBe(true);
            expect(StateRouter.isOrHasChild('home', 'home.contact.a')).toBe(true);
            expect(StateRouter.isOrHasChild('blah', 'home.contact.a')).toBe(false);
            expect(StateRouter.isOrHasChild('home.contact', 'home')).toBe(false);
        });

        it("isOrHasParent", function () {
            expect(StateRouter.isOrHasParent('home.contact', 'home')).toBe(true);
            expect(StateRouter.isOrHasParent('home', 'home')).toBe(true);
            expect(StateRouter.isOrHasParent('home.contact.a', 'home')).toBe(true);
            expect(StateRouter.isOrHasParent('home.contact.a', 'blah')).toBe(false);
            expect(StateRouter.isOrHasParent('home', 'home.contact')).toBe(false);
        });

        it("isParent", function () {
            expect(StateRouter.isParent('home.contact', 'home')).toBe(true);
            expect(StateRouter.isParent('home', 'home')).toBe(false);
            expect(StateRouter.isParent('home.contact.a', 'home')).toBe(true);
            expect(StateRouter.isParent('home.contact.a', 'blah')).toBe(false);
            expect(StateRouter.isParent('home', 'home.contact')).toBe(false);
        });
    });

    describe("Configuration", function() {
        var router;

        beforeEach(function() {
            router = Ext.create('StateRouter.staterouter.Router');
        });
        
        // TODO: This test relies on internal implementation, refactor
        it("should allow you to specify name as first param or in config", function () {

            // TODO: Config is required, is it really required?
            router.state('state1', {});
            expect(router.stateDefinitionMap.state1).not.toBeUndefined();
            expect(router.stateDefinitionMap.state1).not.toBeNull();

            router.state({
                name: 'state2'
            });

            expect(router.stateDefinitionMap.state2).not.toBeUndefined();
            expect(router.stateDefinitionMap.state2).not.toBeNull();
        });

        it("should call controllerProcessor if defined to obtain controller name", function () {
            var which,
                desktopController = {
                    start: function () {
                        which = 'desktop';
                    }
                },
                mobileController = {
                    start: function () {
                        which = 'mobile';
                    }
                },
                controllers = {
                    MyController: desktopController,
                    MyControllerMobile: mobileController
                },
                mobile = true;

            router
                .configure({
                    controllerProvider: function (name) {
                        return controllers[name];
                    },
                    controllerProcessor: function (name) {
                        if (mobile) {
                            return name + 'Mobile';
                        } else {
                            return name;
                        }
                    }
                }).state('state1', {
                    controller: 'MyController'
                });


            router.go('state1');

            waits(1);

            runs(function () {
                expect(which).toBe('mobile');
            });
        });

        it("should call viewProcessor if defined to obtain view name", function () {
            Ext.define('ViewProcessorTestView', {
                extend: 'Ext.container.Container',
                alias: 'widget.viewprocessortestview',

                which: 'desktop'
            });

            Ext.define('ViewProcessorTestViewMobile', {
                extend: 'Ext.container.Container',
                alias: 'widget.viewprocessortestviewmobile',

                which: 'mobile'
            });


            var mobile = true,
                vp = Ext.create('Ext.container.Viewport', {
                id: 'vp'
            });

            router
                .configure({
                    viewProcessor: function (name) {
                        if (mobile) {
                            return name + 'Mobile';
                        } else {
                            return name;
                        }
                    },
                    root: 'vp'
                }).state('state1', {
                    view: 'ViewProcessorTestView'
                });

            router.go('state1');

            waits(1);

            runs(function () {
                expect(vp.down('container').which).toBe('mobile');
            });
        });
    });

    describe("Basic State Transitions", function() {
        var router;

        beforeEach(function() {
            router = Ext.create('StateRouter.staterouter.Router');
        });

        it("should allow you to transition from no state to a top-level state", function () {
            router.state('state1', {});
            router.go('state1');

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('state1');
            });
        });

        it("should allow you to transition from no state to any state", function () {
            runs(function () {
                router.state('state1', {});
                router.state('state1.home', {});
                router.state('state1.home.contact', {});
                router.state('state2', {});
                router.go('state1.home.contact');
            });

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('state1.home.contact');
            });
        });

        it("should allow controllers to cancel a transition", function () {
            var c1 = {

                },
                c2 = {
                    onStateRouterEvent: function (eventName) {
                        if (eventName === 'stateChangeRequest') {
                            return false;
                        }
                    }
                };


            runs(function () {
                router.configure({
                    controllerProvider: function (name) {
                        if (name === 'c1') {
                            return c1;
                        }
                        if (name === 'c2') {
                            return c2;
                        }
                        return null;
                    }
                });
                router.state('state1', { controller: 'c1'});
                router.state('state1.home', { controller: 'c2'});
                router.go('state1.home');
            });

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('state1.home');
                router.go('state1');
            });

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('state1.home');
            });
        });

        it("should allow errorHandler to handle transition errors", function () {
            var c1 = {
              start: function () {
                  var a = 1 + blah;
                  console.log('this will not be printed');
              }
            };
            var errorObj;

            router.configure({
                controllerProvider: function (name) {
                    return c1;
                },
                errorHandler: function (error) {
                    errorObj = error;
                }
            });
            router.state('state1', {
                controller: 'c1'
            });
            router.go('state1');

            waits(1);

            runs(function () {
                expect(errorObj).not.toBeUndefined();
                expect(errorObj).not.toBeNull();
            });

        });
        it("should fail state transitions if error during startup", function () {
            var errorObj,
                c2 = {
                    start: function () {
                        var a = 1 + blah;
                        console.log('this will not be printed');
                    }
                },
                c1 = {
                    onStateRouterEvent: function (eventName, eventObj) {
                        if (eventName === StateRouter.STATE_CHANGE_FAILED) {
                            errorObj = eventObj;
                        }
                    }
                };

            router.configure({
                controllerProvider: function (name) {
                    if (name === 'c1') {
                        return c1;
                    } else if (name === 'c2') {
                        return c2;
                    }
                }
            });
            router.state('state1', {
                controller: 'c1'
            });
            router.state('state2', {
                controller: 'c2'
            });
            router.go('state1');

            waits(1);

            runs(function () {
                router.go('state2');
            });

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('state1');
                expect(errorObj).not.toBeUndefined();
                expect(errorObj.fromState).toBe('state1');
                expect(errorObj.toState).toBe('state2');
            });
        });

        it("should fail state transitions if error during resolve", function () {
            var errorObj,
                c2 = {
                    resolve: {
                        hello: function (resolve, reject) {
                            var a = 1 + blah;
                            console.log('this will not be printed');
                        }
                    }
                },
                c1 = {
                    onStateRouterEvent: function (eventName, eventObj) {
                        if (eventName === StateRouter.STATE_CHANGE_FAILED) {
                            errorObj = eventObj;
                        }
                    }
                };

            router.configure({
                controllerProvider: function (name) {
                    if (name === 'c1') {
                        return c1;
                    } else if (name === 'c2') {
                        return c2;
                    }
                }
            });
            router.state('state1', {
                controller: 'c1'
            });
            router.state('state2', {
                controller: 'c2'
            });
            router.go('state1');

            waits(1);

            runs(function () {
                router.go('state2');
            });

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('state1');
                expect(errorObj).not.toBeUndefined();
                expect(errorObj.fromState).toBe('state1');
                expect(errorObj.toState).toBe('state2');
            });
        });

        it("should allow you to transition any state to another state", function () {
            runs(function () {
                router.state('state1', {});
                router.state('state1.home', {});
                router.state('state1.home.contact', {});
                router.state('state2', {});
                router.go('state1.home.contact');
            });


            waits(1);

            runs(function () {
                router.go('state1.home');
            });

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('state1.home');
            });
        });

        it("should allow one state to forward to another state", function () {

            runs(function () {
                router.state('state1', {});
                router.state('state1.contact', {
                    forwardToChild: function () {
                        return 'state1.contact.summary';
                    }
                });
                router.state('state1.contact.summary', {});
                router.state('state2', {});
                router.go('state1.contact');
            });


            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('state1.contact.summary');
            });
        });
    });

    describe("Controllers", function() {
        var router;

        beforeEach(function() {
            router = Ext.create('StateRouter.staterouter.Router');
        });

        it("should start a controller when entering a state", function () {
            var value;

            router.configure({controllerProvider: function () {
                // always return a single controller
                return {
                    start: function () {
                        value = 'Hello';
                    }
                };
            }});
            router.state('state1', {controller: 'DoesntMatter'});
            router.go('state1');

            waits(1);

            runs(function () {
                expect(value).toBe('Hello');
            });
        });

        it("should stop a controller when entering a state", function () {
            var value;

            router.configure({controllerProvider: function (name) {
                if (name === 'Old') {
                    return {
                        stop: function () {
                            value = 'Hello';
                        }
                    };
                } else if (name === 'New') {
                    return {
                        stop: function () {
                            value = 'World';
                        }
                    };
                }
                return null;
            }});
            router.state('old', {controller: 'Old'});
            router.state('new', {controller: 'New'});
            router.go('old');

            waits(1);

            runs(function () {
                router.go('new');
            });

            waits(1);

            runs(function () {
                expect(value).not.toBe('World');
                expect(value).toBe('Hello');
            });
        });

        it("should not restart controllers if transitioning to child", function () {
            var value = 0;

            router.configure({controllerProvider: function (name) {
                if (name === 'home') {
                    return {
                        start: function () {
                            value++;
                        }
                    };
                }
                return {};
            }});
            router.state('home', {controller: 'home'});
            router.state('home.contacts', {controller: 'New'});
            router.go('home');

            waits(1);

            runs(function () {
                router.go('home.contacts');
            });

            waits(1);

            runs(function () {
                expect(value).toBe(1);
            });
        });

        it("should only start controllers where the state differs", function () {
            var homeStart = 0,
                contactsStart = 0,
                summaryStart = 0;

            router.configure({controllerProvider: function (name) {
                if (name === 'home') {
                    return {
                        start: function () {
                            homeStart++;
                        }
                    };
                }
                if (name === 'home.contacts') {
                    return {
                        start: function () {
                            contactsStart++;
                        }
                    };
                }
                if (name === 'home.contacts.summary') {
                    return {
                        start: function () {
                            summaryStart++;
                        }
                    };
                }
                return {};
            }});
            router
                .state('home', {controller: 'home', params: ['homeId', 'anotherHomeId']})
                .state('home.contacts', {controller: 'home.contacts', params: ['contactId']})
                .state('home.contacts.summary', {controller: 'home.contacts.summary', params: ['summaryId']});

            router.go('home.contacts.summary', {
                homeId: 1,
                anotherHomeId: 2,
                contactId: 3,
                summaryId: 4
            });

            waits(1);

            runs(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(1);
                expect(summaryStart).toBe(1);
            });

            waits(1);

            // Going to same state, but summary has diff params
            runs(function () {
                router.go('home.contacts.summary', {
                    homeId: 1,
                    anotherHomeId: 2,
                    contactId: 3,
                    summaryId: 5
                });
            });

            waits(1);

            runs(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(1);
                expect(summaryStart).toBe(2);
            });

            // Going to same state, but contact and summary has diff params
            runs(function () {
                router.go('home.contacts.summary', {
                    homeId: 1,
                    anotherHomeId: 2,
                    contactId: 7,
                    summaryId: 6
                });
            });

            waits(1);

            runs(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(2);
                expect(summaryStart).toBe(3);
            });

            // Going to same exact state
            runs(function () {
                router.go('home.contacts.summary', {
                    homeId: 1,
                    anotherHomeId: 2,
                    contactId: 7,
                    summaryId: 6
                });
            });

            waits(1);

            runs(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(2);
                expect(summaryStart).toBe(3);
            });

            // Going to ancestor
            runs(function () {
                router.go('home.contacts', {
                    homeId: 1,
                    anotherHomeId: 2,
                    contactId: 7,
                    summaryId: 6 // will be ignored
                });
            });

            waits(1);

            runs(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(2);
                expect(summaryStart).toBe(3);
            });

            // Going to previous state
            runs(function () {
                router.go('home.contacts.summary', {
                    homeId: 1,
                    anotherHomeId: 2,
                    contactId: 7,
                    summaryId: 6
                });
            });

            waits(1);

            runs(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(2);
                expect(summaryStart).toBe(4);
            });

            // Going to same state path but home params differ
            runs(function () {
                router.go('home.contacts.summary', {
                    homeId: 8,
                    anotherHomeId: 2,
                    contactId: 7,
                    summaryId: 6
                });
            });

            waits(1);

            runs(function () {
                expect(homeStart).toBe(2);
                expect(contactsStart).toBe(3);
                expect(summaryStart).toBe(5);
            });

            // Going to same state path but contacts params differ
            runs(function () {
                router.go('home.contacts.summary', {
                    homeId: 8,
                    anotherHomeId: 2,
                    contactId: 9,
                    summaryId: 6
                });
            });

            waits(1);

            runs(function () {
                expect(homeStart).toBe(2);
                expect(contactsStart).toBe(4);
                expect(summaryStart).toBe(6);
            });
        });


        it("should pass params to forwarded child", function () {
            var contactIdParam,
                forwardedContactIdParam,
                childParam;

            runs(function () {
                router.configure({controllerProvider: function (name) {
                    if (name === 'home') {
                        return {};
                    }
                    if (name === 'home.contact') {
                        return {
                            start: function (ownParams) {
                                contactIdParam = ownParams.contactId;
                            }
                        };
                    }
                    if (name === 'home.contact.summary') {
                        return {
                            start: function (ownParams, allParams) {
                                forwardedContactIdParam = allParams.contactId;
                                childParam = ownParams.childParamsTest;
                            }
                        };
                    }
                    return {};
                }});
                router
                    .state('home', {controller: 'home'})
                    .state('home.contact', {
                        controller: 'home.contact',
                        params: ['contactId'],
                        forwardToChild: function () {
                            return 'home.contact.summary';
                        }
                    })
                    .state('home.contact.summary', {
                        controller: 'home.contact.summary',
                        params: ['childParamsTest']
                    });

                router.go('home.contact', {
                    contactId: 555,
                    childParamsTest: 'Normally would not use when forwarding'
                });

                waits(1);

                runs(function () {
                    expect(contactIdParam).toBe(555);
                    expect(forwardedContactIdParam).toBe(555);
                    expect(childParam).toBe('Normally would not use when forwarding');
                });
            });
        });
    });

    describe("Resolve", function() {
        var router;

        beforeEach(function() {
            router = Ext.create('StateRouter.staterouter.Router');
        });

        it("should set resolved property in controller", function () {
            var controller = {
                    resolve: {
                        a: function (resolve) {
                            resolve('Hello');
                        },
                        b: function (resolve) {
                            resolve('World');
                        }
                    }
                };

            router.configure({controllerProvider: function () {
                // always return a single controller
                return controller;
            }});
            router.state('state1', {controller: 'DoesntMatter'});
            router.go('state1');

            waits(1);

            runs(function () {
                expect(controller.resolved).not.toBeUndefined();
                expect(controller.resolved).not.toBeNull();
                expect(controller.resolved.a).toBe('Hello');
                expect(controller.resolved.b).toBe('World');
            });
        });

        it("should set resolved property in child controllers", function () {
            var controller1 = {
                    resolve: {
                        a: function (resolve) {
                            resolve('Hello');
                        },
                        b: function (resolve) {
                            resolve('World');
                        }
                    }
                },
                controller2 = {
                };

            router.configure({controllerProvider: function (name) {
                if (name === 'controller1') {
                    return controller1;
                }
                if (name === 'controller2') {
                    return controller2;
                }
                return null;
            }});
            router.state('state1', {controller: 'controller1'});
            router.state('state1.child1', {controller: 'controller2'});
            router.go('state1.child1');

            waits(1);

            runs(function () {
                expect(controller2.allResolved).not.toBeUndefined();
                expect(controller2.allResolved).not.toBeNull();
                expect(controller2.allResolved.state1.a).toBe('Hello');
                expect(controller2.allResolved.state1.b).toBe('World');
            });
        });

        it("should not resolve resolvables unless path changes", function () {
            var count = 0,
                controller2Count = 0,
                controller1 = {
                    resolve: {
                        a: function (resolve) {
                            count++;
                            resolve();
                        }
                    }
                },
                controller2 = {
                    resolve: {
                        a: function (resolve) {
                            controller2Count++;
                            resolve();
                        }
                    }
                },
                controller3 = {
                    resolve: {
                        a: function (resolve) {
                            resolve();
                        }
                    }
                };

            router.configure({controllerProvider: function (name) {
                if (name === 'controller1') {
                    return controller1;
                }
                if (name === 'controller2') {
                    return controller2;
                }
                if (name === 'controller3') {
                    return controller3;
                }
                return null;
            }});
            router.state('state1', {controller: 'controller1'});
            router.state('state1.child1', {controller: 'controller2'});
            router.state('state1.child2', {controller: 'controller3'});
            router.go('state1');

            waits(1);

            runs(function () {
                expect(count).toBe(1);
                router.go('state1.child1');
            });

            waits(1);

            runs(function () {
                expect(count).toBe(1);
                expect(controller2Count).toBe(1);
                router.go('state1.child2');
            });

            waits(1);

            runs(function () {
                expect(count).toBe(1);
                expect(controller2Count).toBe(1);
            });
        });


        it("should set resolved property in views", function () {
            Ext.define('MainView', {
                extend: 'Ext.container.Container',
                alias: 'widget.mainview',

                config: {
                    ownParams: null,
                    allParams: null,
                    resolved: null,
                    allResolved: null
                },

                items: [{
                    xtype: 'container',
                    routerView: true
                }]
            });

            Ext.define('ChildView', {
                extend: 'Ext.container.Container',
                alias: 'widget.childview',

                myOwnParams: null,
                myAllParams: null,
                myResolved: null,
                myAllResolved: null,

                constructor: function (options) {
                    this.myOwnParams = options.ownParams;
                    this.myAllParams = options.allParams;
                    this.myResolved = options.resolved;
                    this.myAllResolved = options.allResolved;
                    this.callParent(arguments);
                }
            });
            var controller1 = {
                    resolve: {
                        a: function (resolve) {
                            resolve('Hello');
                        },
                        b: function (resolve) {
                            resolve('World');
                        }
                    }
                },
                controller2 = {
                    resolve: {
                        a: function (resolve) {
                            resolve('Child');
                        }
                    }
                };


            var vp = Ext.create('Ext.container.Viewport', {
                id: 'vp'
            });
            router.configure({
                controllerProvider: function (name) {
                    if (name === 'controller1') {
                        return controller1;
                    }
                    if (name === 'controller2') {
                        return controller2;
                    }
                    return null;
                },
                root: 'vp'
            });
            router.state('state1', {
                controller: 'controller1',
                view: 'MainView'
            });
            router.state('state1.child1', {
                controller: 'controller2',
                view: 'ChildView'
            });
            router.go('state1.child1');

            waits(1);

            runs(function () {
                expect(vp.down('mainview').getResolved()).not.toBeUndefined();
                expect(vp.down('mainview').getResolved()).not.toBeNull();
                expect(vp.down('mainview').getResolved().a).toBe('Hello');
                expect(vp.down('mainview').getResolved().b).toBe('World');
                expect(vp.down('mainview').getAllResolved()).not.toBeUndefined();
                expect(vp.down('mainview').getAllResolved()).not.toBeNull();
                expect(vp.down('mainview').getAllResolved().state1.a).toBe('Hello');
                expect(vp.down('mainview').getAllResolved().state1.b).toBe('World');

                expect(vp.down('childview').myResolved).not.toBeUndefined();
                expect(vp.down('childview').myResolved).not.toBeNull();
                expect(vp.down('childview').myResolved.a).toBe('Child');
                expect(vp.down('childview').myAllResolved).not.toBeUndefined();
                expect(vp.down('childview').myAllResolved).not.toBeNull();
                expect(vp.down('childview').myAllResolved.state1.a).toBe('Hello');
                expect(vp.down('childview').myAllResolved.state1.b).toBe('World');
                expect(vp.down('childview').myAllResolved['state1.child1'].a).toBe('Child');
            });
        });

        it("should pass resolved to forwardToChild method", function () {
            var controller1 = {
                    resolve: {
                        a: function (resolve) {
                            resolve('Hello');
                        },
                        b: function (resolve) {
                            resolve('World');
                        },
                        menu: function (resolve) {
                            resolve('state1.child1');
                        }
                    }
                },
                controller2 = {
                };

            router.configure({controllerProvider: function (name) {
                if (name === 'controller1') {
                    return controller1;
                }
                if (name === 'controller2') {
                    return controller2;
                }
                return null;
            }});
            router.state('state1', {
                controller: 'controller1',
                forwardToChild: function (ownParams, resolved) {
                    return resolved.menu;
                }
            });
            router.state('state1.child1', {controller: 'controller2'});
            router.go('state1');

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('state1.child1');
            });
        });
    });

});