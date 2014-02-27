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

                            mask = new Ext.LoadMask(oldViewComponent, { msg: me.loadMessage });

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
        var options = {};

        // Hide the first child we're creating, the ancestor of
        // any other children being added in this transition
        // this is so we can transition from 0 to 100% opacity
        // without the view being visible for few milliseconds
        if (nodeIndex === keep) {
            options.hidden = true;
        }

        return options;
    },

    transitionTo: function (newViewComponent, pathNode, nodeIndex, keep, path) {

        // TODO: we should only do this for the top-level child we're adding
        // just like getAdditionalViewConfigOptions
        // TODO: How should the generic transition API work?  Do we only pass in this
        // top level or is there some need for other types of transitions
        // to transition other nodes?
        newViewComponent.getEl().setOpacity(0);
        newViewComponent.show();
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