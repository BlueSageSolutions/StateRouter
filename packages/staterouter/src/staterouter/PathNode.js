Ext.define('StateRouter.staterouter.PathNode', {

    requires: [
        'StateRouter.staterouter.StateDefinition'
    ],

    $configPrefixed: false,

    config: {
        definition: null,
        ownParams: {},
        allParams: {}
    },

    constructor: function(config) {
        this.initConfig(config);
    },

    /**
     * Compares this state path with another.
     *
     * @param other
     * @returns {boolean}
     */
    isEqual: function (other) {
        var key,
            otherParams;

        if (!other) {
            throw "Other state undefined";
        }

        if (this.definition.getName() !== other.definition.getName()) {
            return false;
        }

        otherParams = other.ownParams;

        for (key in this.ownParams) {
            if (this.ownParams.hasOwnProperty(key)) {

                if (!otherParams.hasOwnProperty(key) || this.ownParams[key] !== otherParams[key]) {
                    return false;
                }
            }
        }

        for (key in otherParams) {
            if (otherParams.hasOwnProperty(key)) {

                if (!this.ownParams.hasOwnProperty(key) || this.ownParams[key] !== otherParams[key]) {
                    return false;
                }
            }
        }

        return true;
    }

});