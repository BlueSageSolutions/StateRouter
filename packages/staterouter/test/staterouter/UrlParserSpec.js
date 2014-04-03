describe('UrlParser', function() {
    var parser;

    beforeEach(function () {
        parser = Ext.create('StateRouter.staterouter.UrlParser');
    });

    it('should parse a simple url', function () {
        var result = parser.parse('/about');

        expect(result).not.toBeUndefined();
        expect(result.regex).not.toBeUndefined();
        expect(result.regex).toBe('^\/about$');
        expect(new RegExp(result.regex).test('/about')).toBe(true);
        expect(result.params.length).toBe(0);
    });

    it('should parse a url with one param', function () {
        var result = parser.parse('/contact/:contactId');

        expect(result).not.toBeUndefined();
        expect(result.regex).not.toBeUndefined();
        expect(result.regex).toBe('^\\/contact\\/((?:\\w)+)$');
        expect(new RegExp(result.regex).test('/contact/355')).toBe(true);
        expect(result.params.length).toBe(1);
        expect(result.params[0]).toBe('contactId');
    });

    it('should parse a url with multiple params', function () {
        var result = parser.parse('/contact/:contactId/edit/:id');

        expect(result).not.toBeUndefined();
        expect(result.regex).not.toBeUndefined();
        expect(result.regex).toBe('^\\/contact\\/((?:\\w)+)\\/edit\\/((?:\\w)+)$');
        expect(new RegExp(result.regex).test('/contact/355/edit/abc')).toBe(true);
        expect(result.params.length).toBe(2);
        expect(result.params[0]).toBe('contactId');
        expect(result.params[1]).toBe('id');
    });
});