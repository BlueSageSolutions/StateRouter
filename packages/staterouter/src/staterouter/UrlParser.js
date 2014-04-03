Ext.define('StateRouter.staterouter.UrlParser', {

    parse: function(pattern) {
        /**
         * Find all words which start with ':'
         * @type {RegExp}
         */
        var reg = /:((?:\w)+)/g,
            regResult,
            result = {},
            lastIndex = 0,
            urlSegment;

        result.params = [];
        result.regex = '^';

        while ((regResult = reg.exec(pattern))) {
            result.params.push(regResult[1]);

            urlSegment = pattern.substring(lastIndex, regResult.index);
            urlSegment = urlSegment.replace(/\//g, '\\/');

            result.regex += urlSegment + '((?:\\w)+)';

            lastIndex = reg.lastIndex;
        }

        urlSegment = pattern.substring(lastIndex);
        result.regex += urlSegment + '$';
        return result;
    }
});