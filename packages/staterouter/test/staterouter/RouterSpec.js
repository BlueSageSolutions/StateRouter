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
            expect(router.stateManager.getState('state1')).not.toBeUndefined();
            expect(router.stateManager.getState('state1')).not.toBeNull();

            router.state({
                name: 'state2'
            });

            expect(router.stateManager.getState('state2')).not.toBeUndefined();
            expect(router.stateManager.getState('state2')).not.toBeNull();
        });

        it("should allow you to configure an array of states", function () {

            router.state([
                {name: 'state1'},
                {name: 'state2'}
            ]);
            expect(router.stateManager.getState('state1')).not.toBeUndefined();
            expect(router.stateManager.getState('state1')).not.toBeNull();
            expect(router.stateManager.getState('state2')).not.toBeUndefined();
            expect(router.stateManager.getState('state2')).not.toBeNull();
        });

        xit("should call controllerProcessor if defined to obtain controller name", function (done) {
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


            router.go('state1').then(function () {
                expect(which).toBe('mobile');
                done();
            });
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


            xit("should call viewProcessor if defined to obtain view name", function (done) {


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


                var mobile = true;

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

                router.go('state1').then(function () {
                    expect(vp.down('container').which).toBe('mobile');
                    done();
                });
            });
        });

    });

    describe("Router methods", function () {
        var router;

        beforeEach(function() {
            router = Ext.create('StateRouter.staterouter.Router');
        });

        it("buildToState should return proper path", function () {
            router.state('a', { params: ['id']});
            router.state('a.b');
            router.state('a.b.c', { params: ['cId']});

            var toPath = router.buildToPath('a', { id: 5});

            var expectedPath = Ext.create('StateRouter.staterouter.Path', {
                nodes:  [
                    Ext.create('StateRouter.staterouter.PathNode', {
                        state: router.stateManager.getState('a'),
                        ownParams: { id: 5 },
                        allParams: { id: 5 }
                    })
                ]
            });

            expect(toPath.isEqual(expectedPath)).toBe(true);

            router.currentPath = toPath;

            toPath = router.buildToPath('a.b.c', { cId: 'hello'}, { inherit: true});

            expectedPath = Ext.create('StateRouter.staterouter.Path', {
                nodes:  [
                    Ext.create('StateRouter.staterouter.PathNode', {
                        state: router.stateManager.getState('a'),
                        ownParams: { id: 5 },
                        allParams: { id: 5 }
                    }),
                    Ext.create('StateRouter.staterouter.PathNode', {
                        state: router.stateManager.getState('a.b'),
                        ownParams: {},
                        allParams: { id: 5 }
                    }),
                    Ext.create('StateRouter.staterouter.PathNode', {
                        state: router.stateManager.getState('a.b.c'),
                        ownParams: { cId: 'hello' },
                        allParams: { id: 5, cId: 'hello' }
                    })
                ]
            });

            expect(toPath.isEqual(expectedPath)).toBe(true);
        });
    });

    describe("Router edge cases", function () {
        var router,originalTimeout;

        beforeEach(function() {
            originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = 3000;
            router = Ext.create('StateRouter.staterouter.Router');
        });

        afterEach(function() {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        });

        it("Transition should resolve with { success: false } if currently transitioning", function (done) {
            var c1 = {
                    resolve: {
                        blah: function (resolve) {
                            resolve();
                        }
                    }
                },
                c2 = {
                    resolve: {
                        slowLoading: function (resolve, reject) {
                            // We can even remove setTimeout here since transition takes multiple ticks
                            setTimeout(function () {
                                resolve();
                            }, 1000);
                        }
                    }
                },
                bob = {};


            router.configure({
                controllerProvider: function (name) {
                    if (name === 'c1') {
                        return c1;
                    } else if (name === 'c2') {
                        return c2;
                    } else if (name === 'bob') {
                        return bob;
                    }
                    return null;
                }
            });
            router.state('state1', { controller: 'c1'});
            router.state('state1.home', { controller: 'c2'});
            router.state('bob', { controller: 'bob'});

            var p1 = new RSVP.Promise(function (resolve, reject) {
                router.go('state1.home').then(function (result) {
                    expect(result.success).toBe(true);
                    resolve();
                }).catch(function () {
                    expect('Transition should not fail').toBeUndefined();
                    resolve();
                });
            });

            var p2 = new RSVP.Promise(function (resolve, reject) {
                router.go('bob').then(function (result) {
                    expect(result.success).toBe(false);
                    expect(result.errorCode).toEqual(StateRouter.STATE_CHANGE_TRANSITIONING);
                    resolve();
                }).catch(function (reason) {
                    expect('Transition to Bob SHOULD NOT BE REJECTED').toBeUndefined();
                    expect(reason).toBeUndefined();
                    resolve();
                });
            });

            RSVP.all([p1, p2]).then(function () {
                done();
            });
        });

        it("should allow a stop to reject", function (done) {
            router.configure({controllerProvider: function (name) {
                    if (name === 'Old') {
                        return {
                            stop: function (resolve, reject) {
                                reject('Something bad happened');
                            }
                        };
                    }
                    return null;
                }});
            router.state('old', {controller: 'Old'});
            router.state('new', {controller: 'New'});
            router.go('old').then(function (result) {
                expect(result.success).toBe(true);
                return router.go('new');
            }).then(undefined, function (error) {
                expect(error).toBe('Something bad happened');
                done();
            });
        });
    });

    describe("Basic State Transitions", function() {
        var router;

        beforeEach(function() {
            router = Ext.create('StateRouter.staterouter.Router');
        });

        it("should allow you to transition from no state to a top-level state", function (done) {
            router.state('state1', {});
            router.go('state1').then(function () {
                expect(router.getCurrentState()).toBe('state1');
                done();
            });
        });

        it("when transitioning down, last node should not receive state change event", function (done) {
            var count = 0;

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
            router.go('a.b').then(function () {
                return router.go('a.b.c');
            }).then(function () {
                expect(count).toBe(0);
                done();
            });
        });

        it("when transitioning up, last node SHOULD receive state change event", function (done) {
            var count = 0,
                upCount = 0;

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
            router.go('1.2').then(function () {
                return router.go('1');
            }).then(function () {
                expect(count).toBe(2);
                expect(upCount).toBe(1);
                done();
            });
        });
//
        it("should allow you to transition from no state to any state", function (done) {
            router.state('state1', {});
            router.state('state1.home', {});
            router.state('state1.home.contact', {});
            router.state('state2', {});
            router.go('state1.home.contact').then(function () {
                expect(router.getCurrentState()).toBe('state1.home.contact');
                done();
            });
        });

        it("should allow you to access the controller via the utility method getControllerForCurrentState", function (done) {
            var c1 = {
                getMyName: function () {
                    return 'state1Controller';
                }
            };
            var c2 = {
                getMyName: function () {
                    return 'homeController';
                }
            };
            var c3 = {
                getMyName: function () {
                    return 'contactController';
                }
            };

            router.state('state1', {
                controller: 'c1'
            });
            router.state('state1.home', {
                controller: 'c2'
            });
            router.state('state1.home.contact', {
                controller: 'c3'
            });
            router.configure({
                controllerProvider: function (name) {
                    if (name === 'c1') {
                        return c1;
                    }
                    if (name === 'c2') {
                        return c2;
                    }
                    if (name === 'c3') {
                        return c3;
                    }
                    return null;
                }
            });
            router.go('state1.home.contact').then(function () {
                console.log('I got here');
                expect(router.getControllerForCurrentState()).not.toBeUndefined();
                expect(router.getControllerForCurrentState().getMyName()).toBe('contactController');
                done();
            });
        });

        it("should allow controllers to cancel a transition", function (done) {
            var c1 = {

                },
                c2 = {
                    onStateRouterEvent: function (eventName) {
                        if (eventName === 'stateChangeRequest') {
                            return false;
                        }
                    }
                };


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
            router.go('state1.home').then(function () {
                expect(router.getCurrentState()).toBe('state1.home');
                router.go('state1').then(function(result) {
                    expect(result.success).toBe(false);
                    expect(result.errorCode).toBe(StateRouter.STATE_CHANGE_CANCELED);
                    expect(router.getCurrentState()).toBe('state1.home');
                    done();
                }).catch(function(error) {
                    expect(error).toBeUndefined();
                    done();
                });
            });
        });

        it("should allow controllers to cancel a transition using the lifecycle method beforeStop", function (done) {
            var c1 = {

                },
                c2 = {
                    beforeStop: function (resolve, reject) {
                        reject();
                    }
                };


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
            router.go('state1.home').then(function () {
                expect(router.getCurrentState()).toBe('state1.home');
                router.go('state1').then(function(result) {
                    expect(result.success).toBe(false);
                    expect(result.errorCode).toBe(StateRouter.STATE_CHANGE_CANCELED);
                    expect(router.getCurrentState()).toBe('state1.home');
                    done();
                }).catch(function(reason) {
                    expect('Promise should not be resolved').toBeUndefined();
                    done();
                });
            });
        });

        it("should allow controllers to cancel a transition using the lifecycle method beforeStop with user error", function (done) {
            var msg = 'Custom Error';
            var c1 = {

                },
                c2 = {
                    beforeStop: function (resolve, reject) {
                        reject(msg);
                    }
                };


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
            router.go('state1.home').then(function () {
                expect(router.getCurrentState()).toBe('state1.home');
                router.go('state1').then(function(result) {
                    expect(result.success).toBe(false);
                    expect(result.errorCode).toBe(StateRouter.STATE_CHANGE_CANCELED);
                    expect(result.error).toBe(msg);
                    expect(router.getCurrentState()).toBe('state1.home');
                    done();
                }).catch(function(reason) {
                    expect('Promise should not be resolved').toBeUndefined();
                    done();
                });
            });
        });

        it("should allow errorHandler to handle transition errors", function (done) {
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

            router.go('state1').then(function (success) {
            }, function () {
                expect(errorObj).not.toBeUndefined();
                expect(errorObj).not.toBeNull();
                done();
            });
        });

        it("should fail state transitions if error during startup", function (done) {
            var errorObj,
                c2 = {
                    start: function () {
                        var a = 1 + blahblah;
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
            router.go('state1').then(function () {
                return router.go('state2');
            }).then(function () {
                expect('should never reach here').toBeUndefined();
            }, function () {
                expect(router.getCurrentState()).toBe(null);
                expect(errorObj).not.toBeUndefined();
                expect(errorObj.fromState).toBe('state1');
                expect(errorObj.toState).toBe('state2');
                done();
            });
        });

        it("should fail state transitions if error during resolve", function (done) {
            var errorObj,
                c2 = {
                    resolve: {
                        hello: function (resolve, reject) {
                            var a = 1 + blahblahblah;
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
            router.go('state1').then(function () {
                router.go('state2').then(function () {
                    expect('should never reach here').toBeUndefined();
                }, function () {
                    expect(router.getCurrentState()).toBe(null);
                    expect(errorObj).not.toBeUndefined();
                    expect(errorObj.fromState).toBe('state1');
                    expect(errorObj.toState).toBe('state2');
                    done();
                });
            });
        });

        it("should allow you to transition any state to another state", function (done) {
            router.state('state1', {});
            router.state('state1.home', {});
            router.state('state1.home.contact', {});
            router.state('state2', {});
            router.go('state1.home.contact').then(function () {
                router.go('state1.home').then(function () {
                    expect(router.getCurrentState()).toBe('state1.home');
                    done();
                });
            });
        });

        it("should allow one state to forward to another state by name", function (done) {

            router.state('state1', {});
            router.state('state1.contact', { forwardToChild: 'state1.contact.summary' });
            router.state('state1.contact.summary', {});
            router.state('state2', {});
            router.go('state1.contact').then(function () {
                expect(router.getCurrentState()).toBe('state1.contact.summary');
                done();
            });
        });

        it("should allow one state to forward to another state", function (done) {

            router.state('state1', {});
            router.state('state1.contact', {
                forwardToChild: function () {
                    return 'state1.contact.summary';
                }
            });
            router.state('state1.contact.summary', {});
            router.state('state2', {});
            router.go('state1.contact').then(function () {
                expect(router.getCurrentState()).toBe('state1.contact.summary');
                done();
            });
        });

        it("should allow one state to forward to deep child state", function (done) {

            router.state('state1', {});
            router.state('state1.contact', {
                forwardToChild: function () {
                    return 'state1.contact.summary.a.b.c';
                }
            });
            router.state('state1.contact.summary', {});
            router.state('state1.contact.summary.a', {});
            router.state('state1.contact.summary.a.b', {});
            router.state('state1.contact.summary.a.b.c', {});
            router.state('state2', {});
            router.go('state1.contact').then(function () {
                expect(router.getCurrentState()).toBe('state1.contact.summary.a.b.c');
                done();
            });
        });

        it("should send the forwarded state name in the STATE_CHANGED event, but not STATE_CHANGE_REQUEST", function (done) {
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
            router.go('z').then(function () {
                router.go('a.b').then(function () {
                    expect(toStateRequest).toBe('a.b');
                    expect(toStateChange).toBe('a.b.c');
                    done();
                });
            });
        });

        it("should allow you to get a handle on the current transition", function (done) {
            router.configure({
                controllerProvider: function (controller) {
                    return controller;
                }
            });
            router.state('state1', {
                controller: {
                    start: function (stateParams, stateName, resolve) {
                        setTimeout(function () {
                            resolve();
                        }, 100);
                    }
                }
            });
            router.state('state2', {});
            router.go('state1');
            router.getTransition().then(function () {
                expect(router.getCurrentState()).toBe('state1');

                router.go('state2').then(function () {
                    expect(router.getCurrentState()).toBe('state2');
                    done();
                });
            });
        });

        it("should allow you to nest transitions", function (done) {
            router.state('state1', {});
            router.state('state2', {});
            router.go('state1').then(function () {
                return router.go('state2');
            }).then(function (result) {
                expect(router.getCurrentState()).toBe('state2');
                done();
            });
        });

        it("should return a Promise from reload", function (done) {
            var count = 0;
            router.configure({
                controllerProvider: function (controller) {
                    return controller;
                }
            });
            router.state('state1', {
                controller: {
                    start: function () {
                        count++;
                    }
                }
            });
            router.go('state1').then(function () {
                return router.reload();
            }).then(function () {
                expect(count).toBe(2);
                done();
            });
        });
    });

    describe("Controllers", function() {
        var router;

        beforeEach(function() {
            router = Ext.create('StateRouter.staterouter.Router');
        });

        it("should start a controller when entering a state", function (done) {
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
            router.go('state1').then(function () {
                expect(value).toBe('Hello');
                done();
            });
        });

        it("should only proceed with controller start if resolved", function (done) {

            var resolveFn;

            router.configure({controllerProvider: function () {
                return {
                    start: function (allParams, stateName, resolve, reject) {
                        resolveFn = resolve;
                    }
                };
            }});
            router.state('state1', {controller: 'DoesntMatter'});
            router.go('state1').then(function () {
                done();
            });

            setTimeout(function () {
                expect(router.getCurrentState()).toBeNull();
                resolveFn();
            }, 10);

        });

        it("should allow user to reject starting a controller", function (done) {
            router.configure({controllerProvider: function () {
                // always return a single controller
                return {
                    start: function (allParams, stateName, resolve, reject) {
                        reject('rejected!');
                    }
                };
            }});
            router.state('state1', {controller: 'DoesntMatter'});
            router.go('state1').then(function () {
                console.log('should never be here');
            }, function (error) {
                expect(error).toBe('rejected!');
                done();
            });
        });

        it("should stop a controller when entering a state", function (done) {
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
            router.go('old').then(function () {
                router.go('new').then(function () {
                    expect(value).not.toBe('World');
                    expect(value).toBe('Hello');
                    expect(router.getCurrentState()).toBe('new');
                    done();
                });
            });
        });

        it("should pass state name to controller", function (done) {
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
            router.go('a.b').then(function () {
                expect(aState).toBe('a');
                expect(bState).toBe('a.b');
                done();
            });
        });

        it("should set stateName property in controller", function (done) {
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
            router.go('a.b').then(function () {
                expect(aStateName).toBe('a');
                expect(aController.resolved.ensureStateNameSet).toBe('a');
                expect(bStateName).toBe('a.b');
                done();
            });
        });

        describe("Application level events", function() {

            beforeEach(function (done) {
                Ext.application({
                    name: 'MyApp',
                    launch: function() {
                        done();
                    }
                });
            });

            it("should fire application level events if application configured", function (done) {
                var stateChanged = false,
                    app;

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
                    router.go('a.b').then(function () {
                        expect(stateChanged).toBe(true);
                        done();
                    });
            });
        });

        it("should not restart controllers if transitioning to child", function (done) {
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
            router.go('home').then(function () {
                router.go('home.contacts').then(function () {
                    expect(value).toBe(1);
                    done();
                });
            });
        });

        it("should all you to reload entire state even if equivalent params", function (done) {
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
            }).then(function () {
                expect(aStart).toBe(1);
                expect(bStart).toBe(1);
                expect(cStart).toBe(1);

                return router.go('a.b.c', {
                    aId: 'Hello',
                    bId: 'World'
                });
            }).then(function () {
                expect(aStart).toBe(1);
                expect(bStart).toBe(1);
                expect(cStart).toBe(1);

                return router.go('a.b.c', {
                    aId: 'Hello',
                    bId: 'World'
                }, {
                    reload: true
                });
            }).then(function () {
                expect(aStart).toBe(2);
                expect(bStart).toBe(2);
                expect(cStart).toBe(2);
                done();
            });
        });

        it("should all you to reload a state starting at some state even if equivalent params", function (done) {
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
            }).then(function () {
                expect(aStart).toBe(1);
                expect(bStart).toBe(1);
                expect(cStart).toBe(1);
                expect(aStop).toBe(0);
                expect(bStop).toBe(0);
                expect(cStop).toBe(0);

                return router.go('a.b.c', {
                    aId: 'Hello',
                    bId: 'World'
                }, {
                    reload: 'a.b'
                });
            }).then(function () {
                expect(aStart).toBe(1);
                expect(bStart).toBe(2);
                expect(cStart).toBe(2);
                expect(aStop).toBe(0);
                expect(bStop).toBe(1);
                expect(cStop).toBe(1);
                done();
            });
        });

        it("should allow you to forcefully go to some state without notifying others and allowing them to cancel", function (done) {
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
            }).then(function (result) {
                expect(result.success).toBe(true);
                expect(router.getCurrentState()).toBe('a.b.c');
                return router.go('d');
            }).then(function (result) {
                expect(result.success).toBe(false);
                expect(result.errorCode).toBe(StateRouter.STATE_CHANGE_CANCELED);
                expect(router.getCurrentState()).toBe('a.b.c');
                return router.go('d', {}, {force: true});
            }).then(function (result) {
                expect(result.success).toBe(true);
                expect(router.getCurrentState()).toBe('d');
                done();
            });
        });

        it("should not pass child params to parent controllers", function (done) {
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
            }).then(function () {
                expect(homeId).toBe(500);
                expect(homeId2).toBe(500);
                expect(homeId3).toBe(500);
                expect(contactId).toBeUndefined();
                expect(contactId2).toBe(600);
                expect(contactId3).toBe(600);
                expect(summaryId).toBeUndefined();
                expect(summaryId2).toBeUndefined();
                expect(summaryId3).toBe(700);
                done();
            });
        });

        it("should only start controllers where the state differs", function (done) {
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
            }).then(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(1);
                expect(summaryStart).toBe(1);

                // Going to same state, but summary has diff params
                return router.go('home.contacts.summary', {
                    homeId: 1,
                    anotherHomeId: 2,
                    contactId: 3,
                    summaryId: 5
                });
            }).then(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(1);
                expect(summaryStart).toBe(2);

                // Going to same state, but contact and summary has diff params
                return router.go('home.contacts.summary', {
                    homeId: 1,
                    anotherHomeId: 2,
                    contactId: 7,
                    summaryId: 6
                });
            }).then(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(2);
                expect(summaryStart).toBe(3);

                // Going to same exact state
                return router.go('home.contacts.summary', {
                    homeId: 1,
                    anotherHomeId: 2,
                    contactId: 7,
                    summaryId: 6
                });
            }).then(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(2);
                expect(summaryStart).toBe(3);

                // Going to ancestor
                return router.go('home.contacts', {
                    homeId: 1,
                    anotherHomeId: 2,
                    contactId: 7,
                    summaryId: 6 // will be ignored
                });
            }).then(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(2);
                expect(summaryStart).toBe(3);

                // Going to previous state
                return router.go('home.contacts.summary', {
                    homeId: 1,
                    anotherHomeId: 2,
                    contactId: 7,
                    summaryId: 6
                });
            }).then(function () {
                expect(homeStart).toBe(1);
                expect(contactsStart).toBe(2);
                expect(summaryStart).toBe(4);

                // Going to same state path but home params differ
                return router.go('home.contacts.summary', {
                    homeId: 8,
                    anotherHomeId: 2,
                    contactId: 7,
                    summaryId: 6
                });
            }).then(function () {
                expect(homeStart).toBe(2);
                expect(contactsStart).toBe(3);
                expect(summaryStart).toBe(5);

                // Going to same state path but contacts params differ
                return router.go('home.contacts.summary', {
                    homeId: 8,
                    anotherHomeId: 2,
                    contactId: 9,
                    summaryId: 6
                });
            }).then(function () {
                expect(homeStart).toBe(2);
                expect(contactsStart).toBe(4);
                expect(summaryStart).toBe(6);
                done();
            });
        });


        it("should pass params to forwarded child", function (done) {
            var contactIdParam,
                forwardedContactIdParam;

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
            }).then(function() {
                expect(contactIdParam).toBe(555);
                expect(forwardedContactIdParam).toBe(555);
                done();
            });
        });

        it("should allow forwardToChild to return additional parameters for forwarded child", function (done) {
            var bParams;
            var cParams;

            router.configure({controllerProvider: function (name) {
                if (name === 'a') {
                    return {};
                }
                if (name === 'b') {
                    return {
                        start: function (stateParams) {
                            bParams = stateParams;
                        }
                    };
                }
                if (name === 'b.c') {
                    return {
                        start: function (stateParams) {
                            cParams = stateParams;
                        }
                    };
                }
                return {};
            }});
            router.state('a', {
                controller: 'a'
            }).state('b', {
                controller: 'b',
                params: ['bId'],
                forwardToChild: function (params, resolved) {
                    return {
                        stateName: 'b.c',
                        stateParams: {
                            cId: 555,
                            notACParams: 666
                        }
                    };
                }
            }).state('b.c', {
                controller: 'b.c',
                params: ['cId']
            });

            router.go('b', {
                bId: 444
            }).then(function() {
                expect(router.getCurrentState()).toBe('b.c');
                expect(router.getCurrentStateParams()).toEqual({
                    bId: 444,
                    cId: 555
                });
                expect(bParams).toEqual({
                    bId: 444
                });
                expect(cParams).toEqual({
                    bId: 444,
                    cId: 555
                });
                done();
            });
        });

        it("should allow forwardToChild to return additional parameters for deep forwarded child", function (done) {
            var bParams;
            var cParams;

            router.configure({controllerProvider: function (name) {
                if (name === 'a') {
                    return {};
                }
                if (name === 'a.b') {
                    return {
                        start: function (stateParams) {
                            bParams = stateParams;
                        }
                    };
                }
                if (name === 'a.b.c') {
                    return {
                        start: function (stateParams) {
                            cParams = stateParams;
                        }
                    };
                }
                return {};
            }});
            router.state('a', {
                controller: 'a',
                forwardToChild: function (params, resolved) {
                    return {
                        stateName: 'a.b.c',
                        stateParams: {
                            bId: 444,
                            cId: 555,
                            notACParams: 666
                        }
                    };
                }
            }).state('a.b', {
                controller: 'a.b',
                params: ['bId']

            }).state('a.b.c', {
                controller: 'a.b.c',
                params: ['cId']
            });

            router.go('a').then(function() {
                expect(router.getCurrentState()).toBe('a.b.c');
                expect(router.getCurrentStateParams()).toEqual({
                    bId: 444,
                    cId: 555
                });
                expect(bParams).toEqual({
                    bId: 444
                });
                expect(cParams).toEqual({
                    bId: 444,
                    cId: 555
                });
                done();
            });
        });
    });

    // describe("View Controllers", function () {
    //     var vp;
    //     var router;
    //
    //     beforeEach(function () {
    //         vp = Ext.create('Ext.container.Container', {
    //             id: 'vp',
    //             renderTo: Ext.getBody()
    //         });
    //         router = Ext.create('StateRouter.staterouter.Router');
    //         router.configure({
    //             root: 'vp'
    //         });
    //     });
    //
    //     afterEach(function () {
    //         vp.destroy();
    //     });
    //
    //     it("should start a view controller when entering a state", function (done) {
    //         var value;
    //
    //         Ext.define('MyApp.UserController1', {
    //             extend : 'Ext.app.ViewController',
    //
    //             start: function () {
    //                 value = 'Hello'
    //             }
    //         });
    //
    //         Ext.define('UserContainer1', {
    //             extend: 'Ext.container.Container'
    //         });
    //
    //         router.state('state1', {
    //             viewController: 'MyApp.UserController1',
    //             view: 'UserContainer1'
    //         });
    //         router.go('state1').then(function () {
    //             expect(value).toBe('Hello');
    //             done();
    //         });
    //     });
    //
    //     it("should destroy controller when view is destroyed", function (done) {
    //         var c;
    //         var c2;
    //
    //         Ext.define('MyApp.UserController11', {
    //             extend : 'Ext.app.ViewController',
    //
    //             blah: 'narf',
    //
    //             start: function () {
    //                 c = this;
    //             }
    //         });
    //
    //         Ext.define('MyApp.UserController22', {
    //             extend : 'Ext.app.ViewController',
    //
    //             start: function () {
    //                 c2 = 'Hello'
    //             }
    //         });
    //
    //         Ext.define('UserContainer11', {
    //             extend: 'Ext.container.Container'
    //         });
    //         Ext.define('UserContainer22', {
    //             extend: 'Ext.container.Container'
    //         });
    //
    //         router.state('state1', {
    //             viewController: 'MyApp.UserController11',
    //             view: 'UserContainer11'
    //         });
    //         router.state('state2', {
    //             viewController: 'MyApp.UserController22',
    //             view: 'UserContainer22'
    //         });
    //         router.go('state1').then(function () {
    //             expect(c.blah).toBe(vp.down('container').getController().blah);
    //             router.go('state2').then(function () {
    //                 expect(c.blah).toBe('narf');
    //                 expect(c.isDestroyed).toBe(true);
    //                 done();
    //             });
    //         });
    //     });
    // });

    describe("Resolve", function() {
        var router;

        beforeEach(function() {
            router = Ext.create('StateRouter.staterouter.Router');
        });

        it("should set resolved property in controller", function (done) {
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
            router.go('state1').then(function () {
                expect(controller.resolved).not.toBeUndefined();
                expect(controller.resolved).not.toBeNull();
                expect(controller.resolved.a).toBe('Hello');
                expect(controller.resolved.b).toBe('World');
                done();
            });
        });

        it("should set resolved property in child controllers", function (done) {
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
            router.go('state1.child1').then(function () {
                expect(controller2.allResolved).not.toBeUndefined();
                expect(controller2.allResolved).not.toBeNull();
                expect(controller2.allResolved.state1.a).toBe('Hello');
                expect(controller2.allResolved.state1.b).toBe('World');
                done();
            });
        });

        it("should not resolve resolvables unless path changes", function (done) {
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
            router.go('state1').then(function () {
                expect(count).toBe(1);
                return router.go('state1.child1');
            }).then(function () {
                expect(count).toBe(1);
                expect(controller2Count).toBe(1);
                return router.go('state1.child2');
            }).then(function () {
                expect(count).toBe(1);
                expect(controller2Count).toBe(1);
                done();
            });
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

            it("should set resolved property in views", function (done) {
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

                router.go('state1.child1').then(function () {
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
                    done();
                });
            });
        });

        it("should pass resolved to forwardToChild method", function (done) {
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
            router.go('state1').then(function () {
                expect(router.getCurrentState()).toBe('state1.child1');
                done();
            });
        });

        it("should resolve child state resolves when forwarding to deep child", function (done) {
            var controller1 = {
                    resolve: {
                        a: function (resolve) {
                            resolve('a');
                        },
                        b: function (resolve) {
                            resolve('b');
                        },
                        c: function (resolve) {
                            resolve('c');
                        }
                    }
                },
                controller2 = {
                    resolve: {
                        d: function (resolve) {
                            setTimeout(function () {
                                resolve('d');
                            }, 100);
                        }
                    }
                },
                controller3 = {
                    resolve: {
                        e: function (resolve) {
                            resolve('e');
                        }
                    }
                },
                controller4 = {
                    resolve: {
                        f: function (resolve) {
                            resolve('f');
                        }
                    },
                    start: function () {
                        console.log('ALL RESOLVED = ');
                        console.log(this.allResolved);
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
                if (name === 'controller4') {
                    return controller4;
                }
                return null;
            }});
            router.state('state1', {
                controller: 'controller1',
                forwardToChild: function (params, resolved) {
                    expect(resolved.a).toBe('a');
                    expect(resolved.b).toBe('b');
                    expect(resolved.c).toBe('c');
                    return 'state1.child1.child2.child3';
                }
            });
            router.state('state1.child1', {controller: 'controller2', params: ['cId']});
            router.state('state1.child1.child2', {controller: 'controller3'});
            router.state('state1.child1.child2.child3', {controller: 'controller4'});
            router.go('state1').then(function () {
                expect(router.getCurrentState()).toBe('state1.child1.child2.child3');
                done();
            });
        });

        it("should keep resolved when navigating to parent", function (done) {
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
            router.go('state1.child1').then(function () {
                expect(router.getCurrentState()).toBe('state1.child1');
                expect(router.getCurrentState()).toBe('state1.child1');
                done();
            });
        });
    });

    describe("History tests", function () {

        var router;
        var app;
        var appIndex = 0;

        beforeEach(function(done) {
            Ext.application({
                name: 'MyApp' + appIndex,
                launch: function() {
                    app = window['MyApp' + appIndex].getApplication();
                    router = Ext.create('StateRouter.staterouter.Router');
                    router.configure({
                        app: app
                    });
                    appIndex++;
                    done();
                }
            });

        });

        afterEach(function () {
            Ext.History.clearListeners();
            Ext.History.add('');
        });

        it("should transition to simple state on token change", function (done) {
            router.state('home', {
                url: '/home'
            });

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('home');
                done();
            }, { single: true });

            Ext.History.add('/home');
        });

        it("should intercept invalid URLs and redirect to a state with a simple name", function (done) {
            router.configure({
                unknownUrlHandler: function () {
                    return "about";
                }
            });

            router.state('home', {
                url: '/home'
            }).state('about', {
                url: '/about'
            });

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('about');
                done();
            }, null, { single: true });

            Ext.History.add('/hello');
        });

        it("should intercept invalid URLs and redirect using an object with transition properties", function (done) {
            router.configure({
                unknownUrlHandler: function () {
                    return {
                        stateName: 'main.c2',
                        stateParams: {
                            sort: 'name'
                        },
                        options: {
                            inherit: true
                        }
                    };
                }
            });

            router.state('main', {
                url: '/main/:id'
            }).state('main.c1', {
                url: '/c1'
            }).state('main.c2', {
                url: '/c2?sort'
            });

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('main.c1');
                Ext.History.add('/main/123/hello');

                app.on(StateRouter.STATE_CHANGED, function () {
                    expect(router.getCurrentState()).toBe('main.c2');
                    expect(router.getCurrentStateParams()).toEqual({
                        sort: 'name',
                        id: '123'
                    });
                    done();
                }, null, { single: true });
            }, null, { single: true });

            Ext.History.add('/main/123/c1');
        });
//
//        it("should allow you to keep the current URL if state does not define URL", function () {
//            // TODO: This test does not actually work as it seems there's no way to obtain the current history token
//            router.state('home', {
//                url: '/home'
//            });
//            router.state('home.wizard', {
//                url: '/wizard',
//                forwardToChild: function () {
//                    return 'home.wizard.step1';
//                }
//            });
//            router.state('home.wizard.step1', {
//                url: '/step1'
//            });
//            router.state('home.wizard.step2', {
//            });
//
//            runs(function () {
//                router.go('home.wizard');
//            });
//
//            waits(1);
//
//            runs(function () {
//                // Simulate address bar changing
//                Ext.History.fireEvent('change');
//            });
//
//            waits(1);
//
//            runs(function () {
////                expect(Ext.History.getToken()).toBe('/home/wizard/step1');
//                expect(router.getCurrentState()).toBe('home.wizard.step1');
//            });
//
//            runs(function () {
//                router.go('home.wizard.step2', {}, { keepUrl: true });
//            });
//
//            waits(1);
//
//            runs(function () {
////                expect(Ext.History.getToken()).toBe('/home/wizard/step2');
//                expect(router.getCurrentState()).toBe('home.wizard.step2');
//            });
//        });
//
        it("should transition to child state on token change", function (done) {
            router.state('home', {
                url: '/home'
            });
            router.state('home.contact', {
                url: '/contact'
            });

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('home.contact');
                done();
            }, { single: true });

            Ext.History.add('/home/contact');
        });

        it("should transition to child state and set param on token change with param", function (done) {
            router.state('home', {
                url: '/home'
            });
            router.state('home.contact', {
                url: '/contact/:id'
            });

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('home.contact');
                expect(router.getCurrentStateParams().id).toBe('355');
                done();
            }, { single: true });

            Ext.History.add('/home/contact/355');
        });

        it("should transition to child state and set multiple params", function (done) {
            router.state('home', {
                url: '/home'
            });
            router.state('home.contact', {
                url: '/contact/:id/:name'
            });

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('home.contact');
                expect(router.getCurrentStateParams().id).toBe('355');
                expect(router.getCurrentStateParams().name).toBe('Jones');
                done();
            }, { single: true });

            Ext.History.add('/home/contact/355/Jones');
        });

        it("should transition to child state and set all params", function (done) {
            router.state('home', {
                url: '/home'
            });
            router.state('home.contact', {
                url: '/contact/:id/:name'
            });
            router.state('home.contact.address', {
                url: '/address/edit/:addressId'
            });

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('home.contact.address');
                expect(router.getCurrentStateParams().id).toBe('355');
                expect(router.getCurrentStateParams().name).toBe('Jones');
                expect(router.getCurrentStateParams().addressId).toBe('10');
                done();
            }, { single: true });

            Ext.History.add('/home/contact/355/Jones/address/edit/10');
        });

        it("should transition to state and set query params", function (done) {
            router.state('home', {
                url: '/home?min'
            });

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('home');
                expect(router.getCurrentStateParams().min).toBe('10');
                done();
            }, { single: true });

            Ext.History.add('/home?min=10');
        });

        it("should transition to state and set multiple query params", function (done) {
            router.state('home', {
                url: '/home?min&max'
            });

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('home');
                expect(router.getCurrentStateParams().min).toBe('10');
                expect(router.getCurrentStateParams().max).toBe('100');
                done();
            }, { single: true });

            Ext.History.add('/home?max=100&min=10');
        });

        it("should transition to child state and all query params", function (done) {
            router.state('home', {
                url: '/home?min&max'
            });

            router.state('home.contacts', {
                url: '/contacts?enabled&sortBy&hidden'
            });

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('home.contacts');
                expect(router.getCurrentStateParams().min).toBe('10');
                expect(router.getCurrentStateParams().max).toBe('100');
                expect(router.getCurrentStateParams().enabled).toBe(true);
                expect(router.getCurrentStateParams().sortBy).toBe('name');
                expect(router.getCurrentStateParams().hidden).not.toBe('false');
                expect(router.getCurrentStateParams().hidden).toBe(false);
                done();
            }, { single: true });

            Ext.History.add('/home/contacts?enabled&max=100&min=10&sortBy=name&hidden=false');
        });

        it("should transition to child state even if parent has no url", function (done) {
            router.state('home', {
            });
            router.state('home.contact', {
                url: '/contact'
            });

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('home.contact');
                done();
            }, { single: true });

            Ext.History.add('/contact');
        });

        // This test isn't that useful since we have to simulate change events (is regex really working?)
        it("should allow custom regex for params", function (done) {
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

            app.on(StateRouter.STATE_CHANGED, function () {
                expect(router.getCurrentState()).toBe('home.contact.address');
                expect(router.getCurrentStateParams().id).toBe('');
                expect(router.getCurrentStateParams().name).toBe('');
                expect(router.getCurrentStateParams().addressId).toBe('b');

                Ext.History.add('/home/contact/a//address/edit/b');

                setTimeout(function () {
                    // The state hasn't changed since 'a' is invalid
                    expect(router.getCurrentState()).toBe('home.contact.address');
                    expect(router.getCurrentStateParams().id).toBe('');
                    expect(router.getCurrentStateParams().name).toBe('');
                    expect(router.getCurrentStateParams().addressId).toBe('b');
                    Ext.History.add('/home/contact/0/a/address/edit/');

                    setTimeout(function () {
                        // The state hasn't changed since addressId requires min 1 char
                        expect(router.getCurrentState()).toBe('home.contact.address');
                        expect(router.getCurrentStateParams().id).toBe('');
                        expect(router.getCurrentStateParams().name).toBe('');
                        expect(router.getCurrentStateParams().addressId).toBe('b');

                        app.on(StateRouter.STATE_CHANGED, function () {
                            expect(router.getCurrentState()).toBe('home.contact.address');
                            expect(router.getCurrentStateParams().id).toBe('111');
                            expect(router.getCurrentStateParams().name).toBe('aaa');
                            expect(router.getCurrentStateParams().addressId).toBe('ccc');
                            done();
                        }, this, { single: true });

                        setTimeout(function () {
                            Ext.History.add('/home/contact/111/aaa/address/edit/ccc');
                        }, 100);
                    }, 100);
                }, 100);

            }, this, { single: true });

            Ext.History.add('/home/contact///address/edit/b');
        });
    });

});