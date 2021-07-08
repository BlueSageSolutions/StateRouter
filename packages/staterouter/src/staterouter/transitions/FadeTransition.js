Ext.define('StateRouter.staterouter.transitions.FadeTransition', {
    extend: 'StateRouter.staterouter.transitions.BaseViewTransition',


    loadMessage: 'Please wait...',
    patience: 500, // after fade animation, the duration to wait before showing a loading animation

    transitionFrom: function (oldViewComponent, resolvePromise) {
        var me = this;

        return new RSVP.Promise(function (resolve, reject) {

            if (!oldViewComponent) {
                resolve();
                return;
            }

            // Animate it to opacity zero
            if (oldViewComponent.mountId) {
                oldViewComponent = Ext.fly(oldViewComponent.mountId);
            }
            oldViewComponent.animate({
                to: {
                    opacity: 0
                },
                listeners: {
                    afteranimate: function() {
                        var mask,
                            timeout;

                        // If the resolves are still pending even after our
                        // transition animation, give it a little more time
                        // then show the loading mask.
                        if (resolvePromise._state === this.STATE_PENDING) {

                            mask = new Ext.LoadMask({ target: oldViewComponent, msg: me.loadMessage });

                            timeout = setTimeout(function () {
                                if (mask !== null) {
                                    mask.show();
                                }
                            }, me.patience);


                            // We might have resolved while we were
                            // patiently waiting.  Cancel the timeout
                            // to prevent the loadmask from showing.
                            resolvePromise.then(function () {
                                mask.hide();
                                mask = null;
                                clearTimeout(timeout);
                                resolve();
                            }, function () {
                                mask.hide();
                                mask = null;
                                clearTimeout(timeout);
                                oldViewComponent.animate({
                                    to: {
                                        opacity: 1
                                    }
                                });
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    }
                }
            });
        });
    },

    getAdditionalViewConfigOptions: function (pathNode, nodeIndex, keep, path) {
        var options = {
            transitionDuration: 250,
        };

        if (nodeIndex === keep) {
            options.style = {
              opacity: 0
            };
        }

        return options;
    },

    transitionTo: function (newViewComponent, pathNode, nodeIndex, keep, path) {
        if (newViewComponent.mountId) {
            newViewComponent = Ext.fly(newViewComponent.mountId);
        }
        newViewComponent.animate({
            from: {
                opacity: 0
            },
            to: {
                opacity: 1
            }
        });
    }
});