Ext.define('StateRouter.staterouter.UrlParser', {

    parse: function(pattern, conditions) {
        /**
         * Find all words which start with ':'
         * @type {RegExp}
         */
        var reg = /:((?:\w)+)/g,
            regResult,
            param,
            result = {},
            lastIndex = 0,
            urlSegment;

        result.params = [];
        result.regex = '^';

        while ((regResult = reg.exec(pattern))) {
            param = regResult[1];
            result.params.push(param);

            urlSegment = pattern.substring(lastIndex, regResult.index);
            urlSegment = urlSegment.replace(/\//g, '\\/');

            if (conditions && conditions[param]) {
                result.regex += urlSegment + conditions[param];
            } else {
                result.regex += urlSegment + '(\\w+)';
            }

            lastIndex = reg.lastIndex;
        }

        urlSegment = pattern.substring(lastIndex);
        result.regex += urlSegment + '$';
        return result;
    }
});