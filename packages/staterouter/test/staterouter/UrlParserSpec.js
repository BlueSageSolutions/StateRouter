describe('UrlParser', function() {
    var parser,
        matchQueryParams = '(?:\\?(?:\\w+)(?:=(?:\\w+))?(?:&(?:\\w+)(?:=(?:\\w+))?)*)?$';

    beforeEach(function () {
        parser = Ext.create('StateRouter.staterouter.UrlParser');
    });

    it('should be able to split a StateRouter URL into its url and query parts', function () {
        var result = parser.splitUrl('/a/b/:urlParam/c/:urlParam2?queryParam&queryParam2');

        expect(result).toEqual({
            baseUrl: '/a/b/:urlParam/c/:urlParam2',
            queryParams: ['queryParam', 'queryParam2']
        });
    });

    it('should parse a simple url', function () {
        var result = parser.parse('/about');

        expect(result).not.toBeUndefined();
        expect(result.regex).not.toBeUndefined();
        expect(result.regex).toBe('^\/about' + matchQueryParams);
        expect(new RegExp(result.regex).test('/about')).toBe(true);
        expect(result.params.length).toBe(0);
    });

    it('should parse a url with one param', function () {
        var result = parser.parse('/contact/:contactId');

        expect(result).not.toBeUndefined();
        expect(result.regex).not.toBeUndefined();
        expect(result.regex).toBe('^\\/contact\\/(\\w+)' + matchQueryParams);
        expect(new RegExp(result.regex).test('/contact/355')).toBe(true);
        expect(result.params.length).toBe(1);
        expect(result.params[0]).toBe('contactId');
    });

    it('should parse a url with multiple params', function () {
        var result = parser.parse('/contact/:contactId/edit/:id');

        expect(result).not.toBeUndefined();
        expect(result.regex).not.toBeUndefined();
        expect(result.regex).toBe('^\\/contact\\/(\\w+)\\/edit\\/(\\w+)' + matchQueryParams);
        expect(new RegExp(result.regex).test('/contact/355/edit/abc')).toBe(true);
        expect(result.params.length).toBe(2);
        expect(result.params[0]).toBe('contactId');
        expect(result.params[1]).toBe('id');
    });

    it('should allow conditions to restrict types', function () {
        var result = parser.parse('/contact/:contactId/edit/:id', {
            contactId: '([0-9]*)',
            id: '([A-Za-z]+)'
        });

        expect(result).not.toBeUndefined();
        expect(result.regex).not.toBeUndefined();
        expect(result.regex).toBe('^\\/contact\\/([0-9]*)\\/edit\\/([A-Za-z]+)' + matchQueryParams);
        expect(new RegExp(result.regex).test('/contact/355/edit/abc')).toBe(true);
        expect(new RegExp(result.regex).test('/contact//edit/abc')).toBe(true);
        expect(new RegExp(result.regex).test('/contact/a/edit/abc')).toBe(false);
        expect(result.params.length).toBe(2);
        expect(result.params[0]).toBe('contactId');
        expect(result.params[1]).toBe('id');
    });
});