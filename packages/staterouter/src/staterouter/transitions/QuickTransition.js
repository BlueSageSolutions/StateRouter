Ext.define('StateRouter.staterouter.transitions.QuickTransition', {
    extend: 'StateRouter.staterouter.transitions.BaseViewTransition',


    loadMessage: 'Please wait...',
    patience: 500, // after fade animation, the duration to wait before showing a loading animation

    transitionFrom: function (oldViewComponent, resolvePromise) {
        var me = this;

        return new RSVP.Promise(function (resolve, reject) {
            var mask;
            var timeout;

            if (!oldViewComponent) {
                resolve();
                return;
            }

            // Animate it to opacity zero
            oldViewComponent.hide();


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
                    oldViewComponent.show();
                    resolve();
                });
            } else {
                resolve();
            }
        });
    },

    getAdditionalViewConfigOptions: function (pathNode, nodeIndex, keep, path) {
        var options = {
            transitionDuration: 0,
        };

        if (nodeIndex === keep) {
            options.hidden = true;
        }

        return options;
    },

    transitionTo: function (newViewComponent, pathNode, nodeIndex, keep, path) {
        newViewComponent.show();
    }
});