describe("Router", function() {

    describe("Configuration", function() {

        beforeEach(function() {
           StateRouter.staterouter.Router.reset();
        });
        it("should allow you to specify name as first param or in config", function () {

            // TODO: Config is required, is it really required?
            StateRouter.state('state1', {});
            expect(StateRouter.staterouter.Router.stateDefinitionMap['state1']).not.toBeUndefined();
            expect(StateRouter.staterouter.Router.stateDefinitionMap['state1']).not.toBeNull();

            StateRouter.state({
                name: 'state2'
            });

            expect(StateRouter.staterouter.Router.stateDefinitionMap['state2']).not.toBeUndefined();
            expect(StateRouter.staterouter.Router.stateDefinitionMap['state2']).not.toBeNull();
        });

        it("should call controllerProcessor if defined to obtain controller name", function () {
            var which,
                desktopController = {
                    start: function () {
                        which = 'desktop'
                    }
                },
                mobileController = {
                    start: function () {
                        which = 'mobile'
                    }
                },
                controllers = {
                    MyController: desktopController,
                    MyControllerMobile: mobileController
                },
                mobile = true;

            StateRouter
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


            StateRouter.go('state1');

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

            StateRouter
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

            StateRouter.go('state1');

            waits(1);

            runs(function () {
                expect(vp.down('container').which).toBe('mobile');
            });
        });
    });

    describe("Basic State Transitions", function() {

        beforeEach(function() {
            StateRouter.staterouter.Router.reset();
        });
        it("should allow you to transition from no state to a top-level state", function () {

            StateRouter.state('state1', {});
            StateRouter.go('state1');

            waits(1);

            runs(function () {
                expect(StateRouter.getCurrentState()).toBe('state1');
            });
        });

        it("should allow you to transition from no state to any state", function () {

            runs(function () {
                StateRouter.state('state1', {});
                StateRouter.state('state1.home', {});
                StateRouter.state('state1.home.contact', {});
                StateRouter.state('state2', {});
                StateRouter.go('state1.home.contact');
            });

            waits(1);

            runs(function () {
                expect(StateRouter.getCurrentState()).toBe('state1.home.contact');
            });
        });

        it("should allow you to transition any state to another state", function () {

            runs(function () {
                StateRouter.state('state1', {});
                StateRouter.state('state1.home', {});
                StateRouter.state('state1.home.contact', {});
                StateRouter.state('state2', {});
                StateRouter.go('state1.home.contact');
            });


            waits(1);

            runs(function () {
                StateRouter.go('state1.home');
            });

            waits(1);

            runs(function () {
                expect(StateRouter.getCurrentState()).toBe('state1.home');
            });
        });
    });

    describe("Controllers", function() {

        beforeEach(function() {
            StateRouter.staterouter.Router.reset();
        });
        it("should start a controller when entering a state", function () {
            var value;

            StateRouter.configure({controllerProvider: function () {
                // always return a single controller
                return {
                    start: function () {
                        value = 'Hello';
                    }
                };
            }});
            StateRouter.state('state1', {controller: 'DoesntMatter'});
            StateRouter.go('state1');

            waits(1);

            runs(function () {
                expect(value).toBe('Hello');
            });
        });

        it("should stop a controller when entering a state", function () {
            var value;

            StateRouter.configure({controllerProvider: function (name) {
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
            StateRouter.state('old', {controller: 'Old'});
            StateRouter.state('new', {controller: 'New'});
            StateRouter.go('old');

            waits(1);

            runs(function () {
                StateRouter.go('new');
            });

            waits(1);

            runs(function () {
                expect(value).not.toBe('World');
                expect(value).toBe('Hello');
            });
        });

        it("should not restart controllers if transitioning to child", function () {
            var value = 0;

            StateRouter.configure({controllerProvider: function (name) {
                if (name === 'home') {
                    return {
                        start: function () {
                            value++;
                        }
                    };
                }
                return {};
            }});
            StateRouter.state('home', {controller: 'home'});
            StateRouter.state('home.contacts', {controller: 'New'});
            StateRouter.go('home');

            waits(1);

            runs(function () {
                StateRouter.go('home.contacts');
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

            StateRouter.configure({controllerProvider: function (name) {
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
            StateRouter
                .state('home', {controller: 'home', params: ['homeId', 'anotherHomeId']})
                .state('home.contacts', {controller: 'home.contacts', params: ['contactId']})
                .state('home.contacts.summary', {controller: 'home.contacts.summary', params: ['summaryId']});

            StateRouter.go('home.contacts.summary', {
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
                StateRouter.go('home.contacts.summary', {
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
                StateRouter.go('home.contacts.summary', {
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
                StateRouter.go('home.contacts.summary', {
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
                StateRouter.go('home.contacts', {
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
                StateRouter.go('home.contacts.summary', {
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
                StateRouter.go('home.contacts.summary', {
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
                StateRouter.go('home.contacts.summary', {
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


    });

    describe("Resolve", function() {

        beforeEach(function() {
            StateRouter.staterouter.Router.reset();
        });
        it("should set resolved property in controller", function () {
            var controller = {
                    resolve: {
                        a: function () {
                            return new RSVP.Promise(function (resolve) { resolve('Hello'); });
                        },
                        b: function () {
                            return new RSVP.Promise(function (resolve) { resolve('World'); });
                        }
                    }
                };

            StateRouter.configure({controllerProvider: function () {
                // always return a single controller
                return controller;
            }});
            StateRouter.state('state1', {controller: 'DoesntMatter'});
            StateRouter.go('state1');

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
                        a: function () {
                            return new RSVP.Promise(function (resolve) { resolve('Hello'); });
                        },
                        b: function () {
                            return new RSVP.Promise(function (resolve) { resolve('World'); });
                        }
                    }
                },
                controller2 = {
                };

            StateRouter.configure({controllerProvider: function (name) {
                if (name === 'controller1') {
                    return controller1;
                }
                if (name === 'controller2') {
                    return controller2;
                }
                return null;
            }});
            StateRouter.state('state1', {controller: 'controller1'});
            StateRouter.state('state1.child1', {controller: 'controller2'});
            StateRouter.go('state1.child1');

            waits(1);

            runs(function () {
                expect(controller2.allResolved).not.toBeUndefined();
                expect(controller2.allResolved).not.toBeNull();
                expect(controller2.allResolved.state1.a).toBe('Hello');
                expect(controller2.allResolved.state1.b).toBe('World');
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
                        a: function () {
                            return new RSVP.Promise(function (resolve) { resolve('Hello'); });
                        },
                        b: function () {
                            return new RSVP.Promise(function (resolve) { resolve('World'); });
                        }
                    }
                },
                controller2 = {
                    resolve: {
                        a: function () {
                            return new RSVP.Promise(function (resolve) { resolve('Child'); });
                        }
                    }
                };


            var vp = Ext.create('Ext.container.Viewport', {
                id: 'vp'
            });
            StateRouter.configure({
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
            StateRouter.state('state1', {
                controller: 'controller1',
                view: 'MainView'
            });
            StateRouter.state('state1.child1', {
                controller: 'controller2',
                view: 'ChildView'
            });
            StateRouter.go('state1.child1');

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
                        a: function () {
                            return new RSVP.Promise(function (resolve) { resolve('Hello'); });
                        },
                        b: function () {
                            return new RSVP.Promise(function (resolve) { resolve('World'); });
                        },
                        menu: function () {
                            return new RSVP.Promise(function (resolve) { resolve('state1.child1'); });
                        }
                    }
                },
                controller2 = {
                };

            StateRouter.configure({controllerProvider: function (name) {
                if (name === 'controller1') {
                    return controller1;
                }
                if (name === 'controller2') {
                    return controller2;
                }
                return null;
            }});
            StateRouter.state('state1', {
                controller: 'controller1',
                forwardToChild: function (ownParams, resolved, allResolved) {
                    return resolved.menu;
                }
            });
            StateRouter.state('state1.child1', {controller: 'controller2'});
            StateRouter.go('state1');

            waits(1);

            runs(function () {
                expect(StateRouter.getCurrentState()).toBe('state1.child1');
            });
        });
    });

});