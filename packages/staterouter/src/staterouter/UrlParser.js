Ext.define('StateRouter.staterouter.UrlParser', {

    /**
     * Given a valid StateRouter URL, it will split it into the base URL and the query parameters
     *
     * Example:
     * /a/b/:urlParam/c/:urlParam2?queryParam&queryParam2
     *
     * Will return:
     * {
     *     baseUrl: '/a/b/:urlParam/c/:urlParam2',
     *     queryParams: ['queryParam', 'queryParam2']
     * }
     *
     */
    splitUrl: function (url) {
        var qIndex = url.indexOf('?');
        var obj = {
            queryParams: []
        };
        var queryPart;

        if (qIndex === -1) {
            obj.baseUrl = url;
        } else {
            obj.baseUrl = url.substring(0, qIndex);
            queryPart = url.substring(qIndex + 1);
            obj.queryParams = queryPart.split('&');
        }

        return obj;
    },


    /**
     * This method does two things.
     * 
     * Given a baseUrl (without the query string), it will extract out the
     * colon delimited position based URL parameters.  Second, it will create
     * a regex which you can use to test if a URL matches this URL
     * 
     * @param baseUrl
     * @param conditions
     * @returns {{}}
     */
    parse: function(baseUrl, conditions) {
        /**
         * Find all words which start with ':'
         */
        var reg = /:(\w+)/g,
            regResult,
            param,
            result = {},
            lastIndex = 0,
            urlSegment;

        result.params = [];
        result.regex = '^';

        while ((regResult = reg.exec(baseUrl))) {
            param = regResult[1];
            result.params.push(param);

            // The urlSegment is the String leading up to but not including the parameter
            // So in the case of /loans/toast/:param/hello/:param2
            // The first iteration, urlSegment would be /loans/toast/
            // The second iteration, urlSegment would be /hello/
            urlSegment = baseUrl.substring(lastIndex, regResult.index);
            urlSegment = urlSegment.replace(/\//g, '\\/');

            if (conditions && conditions[param]) {
                result.regex += urlSegment + conditions[param];
            } else {
                result.regex += urlSegment + '([^\\/]+)';
            }

            lastIndex = reg.lastIndex;
        }

        urlSegment = baseUrl.substring(lastIndex);
        result.regex += urlSegment;
        
        // Allow query params in format ?p1=a&p2=b&p3&p4
        result.regex += '(?:\\?(?:\\w+)(?:=(?:\\w+))?(?:&(?:\\w+)(?:=(?:\\w+))?)*)?$';
        return result;
    }
});