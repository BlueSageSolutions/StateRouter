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

            router.state('state1');
            expect(router.stateManager.getStateDefinition('state1')).not.toBeUndefined();
            expect(router.stateManager.getStateDefinition('state1')).not.toBeNull();

            router.state({
                name: 'state2'
            });

            expect(router.stateManager.getStateDefinition('state2')).not.toBeUndefined();
            expect(router.stateManager.getStateDefinition('state2')).not.toBeNull();
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

        it("when transitioning down, last node should not receive state change event", function () {
            var count = 0;

            runs(function () {
                var controller = {

                    onStateRouterEvent: function (eventName, eventObj) {
                        if (eventName === StateRouter.STATE_CHANGED) {
                            count++;
                        }
                    }
                };

                router.configure({
                    controllerProvider: function (name) {
                        if (name === 'c') {
                            return controller;
                        }
                        return null;
                    }
                });
                router.state('a', {});
                router.state('a.b', {});
                router.state('a.b.c', { controller: 'c'});
                router.go('a.b');
            });

            waits(1);

            runs(function () {
                router.go('a.b.c');
            });

            waits(1);

            runs(function () {
                expect(count).toBe(0);
            });
        });

        it("when transitioning up, last node SHOULD receive state change event", function () {
            var count = 0,
                upCount = 0;

            runs(function () {
                var controller = {

                    onStateRouterEvent: function (eventName, eventObj) {
                        if (eventName === StateRouter.STATE_CHANGED) {
                            count++;
                            if (eventObj.fromState === '1.2' && eventObj.toState === '1') {
                                upCount++;
                            }
                        }
                    }
                };

                router.configure({
                    controllerProvider: function (name) {
                        if (name === '1') {
                            return controller;
                        }
                        return null;
                    }
                });
                router.state('1', { controller: '1'});
                router.state('1.2', {});
                router.state('1.2.3', {});
                router.go('1.2');
            });

            waits(1);

            runs(function () {
                router.go('1');
            });

            waits(1);

            runs(function () {
                expect(count).toBe(2);
                expect(upCount).toBe(1);
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

        it("should send the forwarded state name in the STATE_CHANGED event, but not STATE_CHANGE_REQUEST", function () {
            var toStateRequest,
                toStateChange,
                controllerB,
                controllerZ;

            controllerB = {
                onStateRouterEvent: function (eventName, eventObj) {
                    if (eventName === StateRouter.STATE_CHANGED) {
                        toStateChange = eventObj.toState;
                    }
                }
            };

            controllerZ = {
                onStateRouterEvent: function (eventName, eventObj) {
                    if (eventName === StateRouter.STATE_CHANGE_REQUEST) {
                        toStateRequest = eventObj.toState;
                    }
                }
            };

            runs(function () {
                router.configure({
                    controllerProvider: function (name) {
                        if (name === 'b') {
                            return controllerB;
                        } else if (name === 'z') {
                            return controllerZ;
                        }
                        return {};
                    }
                });
                router.state('a', {});
                router.state('a.b', {
                    controller: 'b',
                    forwardToChild: function () {
                        return 'a.b.c';
                    }
                });
                router.state('a.b.c', {});
                router.state('z', {
                    controller: 'z'
                });
                router.go('z');
            });


            waits(1);

            runs(function () {
               router.go('a.b');
            });

            waits(1);

            runs(function () {
                expect(toStateRequest).toBe('a.b');
                expect(toStateChange).toBe('a.b.c');
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
                        stop: function (resolve, reject) {
                            value = 'Hello';
                            resolve();
                        }
                    };
                } else if (name === 'New') {
                    return {
                        stop: function (resolve) {
                            value = 'World';
                            resolve();
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
                expect(router.getCurrentState()).toBe('new');
            });
        });

        it("should pass state name to controller", function () {
            var aState,
                bState;

            router.configure({
                controllerProvider: function (name) {
                if (name === 'a') {
                    return {
                        start: function (stateParams, stateName) {
                            aState = stateName;
                        }
                    };
                } else if (name === 'b') {
                    return {
                        start: function (stateParams, stateName) {
                            bState = stateName;
                        }
                    };
                }
                return null;
            }});
            router.state('a', {controller: 'a'});
            router.state('a.b', {controller: 'b'});
            router.go('a.b');

            waits(1);

            runs(function () {
                expect(aState).toBe('a');
                expect(bState).toBe('a.b');
            });
        });

        it("should set stateName property in controller", function () {
            var aStateName,
                bStateName,
                aController;

            aController = {
                resolve: {
                    ensureStateNameSet: function (resolve) {
                        resolve(this.stateName);
                    }
                },
                start: function () {
                    aStateName = this.stateName;
                }
            };

            router.configure({
                controllerProvider: function (name) {
                    if (name === 'a') {
                        return aController;
                    } else if (name === 'b') {
                        return {
                            start: function () {
                                bStateName = this.stateName;
                            }
                        };
                    }
                    return null;
                }});
            router.state('a', {controller: 'a'});
            router.state('a.b', {controller: 'b'});
            router.go('a.b');

            waits(1);

            runs(function () {
                expect(aStateName).toBe('a');
                expect(aController.resolved.ensureStateNameSet).toBe('a');
                expect(bStateName).toBe('a.b');
            });
        });

        it("should fire application level events if application configured", function () {
            var ready,
                stateChanged = false,
                app;

            Ext.application({
                name: 'MyApp',
                launch: function() {
                    ready = true;
                }
            });

            waits(100);

            runs(function () {
                expect(ready).toBe(true);

                app = MyApp.getApplication();
                expect(app).not.toBeUndefined();

                app.on(StateRouter.STATE_CHANGED, function () {
                    stateChanged = true;
                });

                router.configure({
                    app: app,
                    controllerProvider: function (name) {
                        return {};
                    }
                });
                router.state('a', {controller: 'a'});
                router.state('a.b', {controller: 'b'});
                router.go('a.b');
            });

            waits(100);

            runs(function () {
                expect(stateChanged).toBe(true);
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

        it("should all you to reload entire state even if equivalent params", function () {
            var aStart = 0;
            var bStart = 0;
            var cStart = 0;

            router.configure({controllerProvider: function (name) {
                if (name === 'a') {
                    return {
                        start: function () {
                            aStart++;
                        }
                    };
                }
                if (name === 'b') {
                    return {
                        start: function () {
                            bStart++;
                        }
                    };
                }
                if (name === 'c') {
                    return {
                        start: function () {
                            cStart++;
                        }
                    };
                }
                return {};
            }});
            router.state('a', {controller: 'a', params: ['aId']});
            router.state('a.b', {controller: 'b', params: ['bId']});
            router.state('a.b.c', {controller: 'c'});
            router.go('a.b.c', {
                aId: 'Hello',
                bId: 'World'
            });

            waits(1);

            runs(function () {
                expect(aStart).toBe(1);
                expect(bStart).toBe(1);
                expect(cStart).toBe(1);

                router.go('a.b.c', {
                    aId: 'Hello',
                    bId: 'World'
                });
            });

            waits(1);

            runs(function () {
                expect(aStart).toBe(1);
                expect(bStart).toBe(1);
                expect(cStart).toBe(1);

                router.go('a.b.c', {
                    aId: 'Hello',
                    bId: 'World'
                }, {
                    reload: true
                });
            });

            waits(1);

            runs(function () {
                expect(aStart).toBe(2);
                expect(bStart).toBe(2);
                expect(cStart).toBe(2);
            });
        });

        it("should all you to reload a state starting at some state even if equivalent params", function () {
            var aStart = 0;
            var bStart = 0;
            var cStart = 0;
            var aStop = 0;
            var bStop = 0;
            var cStop = 0;

            router.configure({controllerProvider: function (name) {
                if (name === 'a') {
                    return {
                        name: 'a',
                        start: function () {
                            aStart++;
                        },
                        stop: function (resolve, reject) {
                            aStop++;
                            resolve();
                        }
                    };
                }
                if (name === 'b') {
                    return {
                        name: 'b',
                        start: function () {
                            bStart++;
                        },
                        stop: function (resolve, reject) {
                            bStop++;
                            resolve();
                        }
                    };
                }
                if (name === 'c') {
                    return {
                        name: 'c',
                        start: function () {
                            cStart++;
                        },
                        stop: function (resolve, reject) {
                            cStop++;
                            resolve();
                        }
                    };
                }
                return {};
            }});
            router.state('a', {controller: 'a', params: ['aId']});
            router.state('a.b', {controller: 'b', params: ['bId']});
            router.state('a.b.c', {controller: 'c'});
            router.go('a.b.c', {
                aId: 'Hello',
                bId: 'World'
            });

            waits(1);

            runs(function () {
                expect(aStart).toBe(1);
                expect(bStart).toBe(1);
                expect(cStart).toBe(1);
                expect(aStop).toBe(0);
                expect(bStop).toBe(0);
                expect(cStop).toBe(0);

                router.go('a.b.c', {
                    aId: 'Hello',
                    bId: 'World'
                }, {
                    reload: 'a.b'
                });
            });

            waits(1);

            runs(function () {
                expect(aStart).toBe(1);
                expect(bStart).toBe(2);
                expect(cStart).toBe(2);
                expect(aStop).toBe(0);
                expect(bStop).toBe(1);
                expect(cStop).toBe(1);
            });
        });

        it("should all you to forcefully go to some state without notifying others and allowing them to cancel", function () {
            router.configure({controllerProvider: function (name) {
                if (name === 'a') {
                    return {};
                }
                if (name === 'b') {
                    return {};
                }
                if (name === 'c') {
                    return {
                        onStateRouterEvent: function (eventName, eventObj) {
                            if (eventName === StateRouter.STATE_CHANGE_REQUEST) {
                                return false;
                            }
                        }
                    };
                }
                if (name === 'd') {
                    return {};
                }
                return {};
            }});
            router.state('a', {controller: 'a', params: ['aId']});
            router.state('a.b', {controller: 'b', params: ['bId']});
            router.state('a.b.c', {controller: 'c'});
            router.state('d', {controller: 'd'});
            router.go('a.b.c', {
                aId: 'Hello',
                bId: 'World'
            });

            waits(1);

            runs(function () {
                expect(router.getCurrentState() === 'a.b.c');
                router.go('d');
            });

            waits(1);

            runs(function () {
                expect(router.getCurrentState() === 'a.b.c');
                router.go('d', {}, {force: true});
            });

            waits(1);

            runs(function () {
                expect(router.getCurrentState() === 'd');
            });
        });

        it("should not pass child params to parent controllers", function () {
            var homeId,
                homeId2,
                homeId3,
                contactId,
                contactId2,
                contactId3,
                summaryId,
                summaryId2,
                summaryId3;

            router.configure({controllerProvider: function (name) {
                if (name === 'home') {
                    return {
                        start: function (params) {
                            homeId = params.homeId;
                            contactId = params.contactId;
                            summaryId = params.summaryId;
                        }
                    };
                }
                if (name === 'home.contact') {
                    return {
                        start: function (params) {
                            homeId2 = params.homeId;
                            contactId2 = params.contactId;
                            summaryId2 = params.summaryId;
                        }
                    };
                }
                if (name === 'home.contact.summary') {
                    return {
                        start: function (params) {
                            homeId3 = params.homeId;
                            contactId3 = params.contactId;
                            summaryId3 = params.summaryId;
                        }
                    };
                }
                return {};
            }});

            router
                .state('home', {controller: 'home', params: ['homeId']})
                .state('home.contact', {controller: 'home.contact', params: ['contactId']})
                .state('home.contact.summary', {controller: 'home.contact.summary', params: ['summaryId']});

            router.go('home.contact.summary', {
                homeId: 500,
                contactId: 600,
                summaryId: 700
            });

            waits(1);

            runs(function () {
                expect(homeId).toBe(500);
                expect(homeId2).toBe(500);
                expect(homeId3).toBe(500);
                expect(contactId).toBeUndefined();
                expect(contactId2).toBe(600);
                expect(contactId3).toBe(600);
                expect(summaryId).toBeUndefined();
                expect(summaryId2).toBeUndefined();
                expect(summaryId3).toBe(700);
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
                forwardedContactIdParam;

            runs(function () {
                router.configure({controllerProvider: function (name) {
                    if (name === 'home') {
                        return {};
                    }
                    if (name === 'home.contact') {
                        return {
                            start: function (params) {
                                contactIdParam = params.contactId;
                            }
                        };
                    }
                    if (name === 'home.contact.summary') {
                        return {
                            start: function (params) {
                                forwardedContactIdParam = params.contactId;
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
                        controller: 'home.contact.summary'
                    });

                router.go('home.contact', {
                    contactId: 555
                });

                waits(1);

                runs(function () {
                    expect(contactIdParam).toBe(555);
                    expect(forwardedContactIdParam).toBe(555);
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
                    params: null,
                    resolved: null,
                    allResolved: null,
                    stateName: null
                },

                items: [{
                    xtype: 'container',
                    routerView: true
                }]
            });

            Ext.define('ChildView', {
                extend: 'Ext.container.Container',
                alias: 'widget.childview',

                myParams: null,
                myResolved: null,
                myAllResolved: null,
                myStateName: null,

                constructor: function (options) {
                    this.myParams = options.params;
                    this.myResolved = options.resolved;
                    this.myAllResolved = options.allResolved;
                    this.myStateName = options.stateName;
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
                expect(vp.down('mainview').getStateName()).toBe('state1');

                expect(vp.down('childview').myResolved).not.toBeUndefined();
                expect(vp.down('childview').myResolved).not.toBeNull();
                expect(vp.down('childview').myResolved.a).toBe('Child');
                expect(vp.down('childview').myAllResolved).not.toBeUndefined();
                expect(vp.down('childview').myAllResolved).not.toBeNull();
                expect(vp.down('childview').myAllResolved.state1.a).toBe('Hello');
                expect(vp.down('childview').myAllResolved.state1.b).toBe('World');
                expect(vp.down('childview').myAllResolved['state1.child1'].a).toBe('Child');
                expect(vp.down('childview').myStateName).toBe('state1.child1');

                expect(vp.down('childview').resolved).not.toBeUndefined();
                expect(vp.down('childview').resolved).not.toBeNull();
                expect(vp.down('childview').resolved.a).toBe('Child');
                expect(vp.down('childview').allResolved).not.toBeUndefined();
                expect(vp.down('childview').allResolved).not.toBeNull();
                expect(vp.down('childview').allResolved.state1.a).toBe('Hello');
                expect(vp.down('childview').allResolved.state1.b).toBe('World');
                expect(vp.down('childview').allResolved['state1.child1'].a).toBe('Child');
                expect(vp.down('childview').stateName).toBe('state1.child1');
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
                forwardToChild: function (params, resolved) {
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

        it("should keep resolved when navigating to parent", function () {
            var controller1 = {
                    resolve: {
                        a: function (resolve) {
                            resolve('Hello');
                        }
                    },

                    start: function () {
                        a = this.resolved.a;
                    }
                },
                controller2 = {
                },
                a;

            router.configure({controllerProvider: function (name) {
                if (name === 'controller1') {
                    return controller1;
                }
                if (name === 'controller2') {
                    return controller2;
                }
                return null;
            }});
            router.state('state1', { controller: 'controller1' });
            router.state('state1.child1', {controller: 'controller2'});
            router.go('state1.child1');

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('state1.child1');
                expect(router.getCurrentState()).toBe('state1.child1');
            });
        });
    });

    describe("History tests", function () {

        var router;

        beforeEach(function() {
            router = Ext.create('StateRouter.staterouter.Router');
        });

        it("should transition to simple state on token change", function () {
            router.state('home', {
                url: '/home'
            });

            router.onHistoryChanged('/home');

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('home');
            });
        });

        it("should transition to child state on token change", function () {
            router.state('home', {
                url: '/home'
            });
            router.state('home.contact', {
                url: '/contact'
            });

            router.onHistoryChanged('/home/contact');

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('home.contact');
            });
        });

        it("should transition to child state and set param on token change with param", function () {
            router.state('home', {
                url: '/home'
            });
            router.state('home.contact', {
                url: '/contact/:id'
            });

            router.onHistoryChanged('/home/contact/355');

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('home.contact');
                expect(router.getCurrentStateParams().id).toBe('355');
            });
        });

        it("should transition to child state and set multiple params", function () {
            router.state('home', {
                url: '/home'
            });
            router.state('home.contact', {
                url: '/contact/:id/:name'
            });

            router.onHistoryChanged('/home/contact/355/Jones');

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('home.contact');
                expect(router.getCurrentStateParams().id).toBe('355');
                expect(router.getCurrentStateParams().name).toBe('Jones');
            });
        });

        it("should transition to child state and set all params", function () {
            router.state('home', {
                url: '/home'
            });
            router.state('home.contact', {
                url: '/contact/:id/:name'
            });
            router.state('home.contact.address', {
                url: '/address/edit/:addressId'
            });

            router.onHistoryChanged('/home/contact/355/Jones/address/edit/10');

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('home.contact.address');
                expect(router.getCurrentStateParams().id).toBe('355');
                expect(router.getCurrentStateParams().name).toBe('Jones');
                expect(router.getCurrentStateParams().addressId).toBe('10');
            });
        });

        it("should transition to child state even if parent has no url", function () {
            router.state('home', {
            });
            router.state('home.contact', {
                url: '/contact'
            });

            router.onHistoryChanged('/contact');

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('home.contact');
            });
        });

        it("should allow custom regex for params", function () {
            router.state('home', {
                url: '/home'
            });
            router.state('home.contact', {
                url: '/contact/:id/:name',
                conditions: {
                    id: '([0-9]*)',
                    name: '([a-z]*)'
                }
            });
            router.state('home.contact.address', {
                url: '/address/edit/:addressId',
                conditions: {
                    addressId: '([a-z]+)'
                }
            });

            router.onHistoryChanged('/home/contact///address/edit/b');

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('home.contact.address');
                expect(router.getCurrentStateParams().id).toBe('');
                expect(router.getCurrentStateParams().name).toBe('');
                expect(router.getCurrentStateParams().addressId).toBe('b');
            });

            runs(function() {
                router.onHistoryChanged('/home/contact/a//address/edit/b');
            });

            waits(1);

            // The state hasn't changed since 'a' is invalid
            runs(function () {
                expect(router.getCurrentState()).toBe('home.contact.address');
                expect(router.getCurrentStateParams().id).toBe('');
                expect(router.getCurrentStateParams().name).toBe('');
                expect(router.getCurrentStateParams().addressId).toBe('b');
            });

            runs(function() {
                router.onHistoryChanged('/home/contact/0/a/address/edit/');
            });

            waits(1);

            // The state hasn't changed since addressId requires min 1 char
            runs(function () {
                expect(router.getCurrentState()).toBe('home.contact.address');
                expect(router.getCurrentStateParams().id).toBe('');
                expect(router.getCurrentStateParams().name).toBe('');
                expect(router.getCurrentStateParams().addressId).toBe('b');
            });

            runs(function() {
                router.onHistoryChanged('/home/contact/111/aaa/address/edit/ccc');
            });

            waits(1);

            runs(function () {
                expect(router.getCurrentState()).toBe('home.contact.address');
                expect(router.getCurrentStateParams().id).toBe('111');
                expect(router.getCurrentStateParams().name).toBe('aaa');
                expect(router.getCurrentStateParams().addressId).toBe('ccc');
            });
        });
    });

});