describe('StateManager', function() {
    var manager;

    beforeEach(function () {
        manager = Ext.create('StateRouter.staterouter.StateManager');
    });

    it('should allow states to have a URL with query params', function () {
        var state;

        manager.register('a', {
            url: '/a?enabled&sortable'
        });

        state = manager.getState('a');

        expect(new RegExp(state.absoluteUrlRegex).test('/a?sortable&enabled')).toBe(true);
        expect(state.params).toEqual(['enabled', 'sortable']);
    });

    it('should allow states to be unregistered', function () {
        manager.register('a');
        expect(manager.getState('a')).not.toBeUndefined();
        expect(manager.getState('a')).not.toBeNull();
        manager.unregister('a');
        expect(manager.getState('a')).toBeUndefined();
    });

    it('should allow states to be replaced', function () {
        manager.register('a', { url: 'a'});
        expect(manager.getState('a').url).toBe('a');
        manager.register('a', { url: 'b'});
        expect(manager.getState('a').url).toBe('b');
    });

    it('should allow child states to have a URL with query params', function () {
        var state;

        manager.register('a', {
            url: '/a?enabled&sortable'
        });

        manager.register('a.b', {
            url: '/b?hidden'
        });

        manager.getState('a');
        state = manager.getState('a.b');

        expect(new RegExp(state.absoluteUrlRegex).test('/a/b')).toBe(true);
        expect(new RegExp(state.absoluteUrlRegex).test('/a/b?sortable&enabled')).toBe(true);
        expect(new RegExp(state.absoluteUrlRegex).test('/a/b?enabled&sortable')).toBe(true);
        expect(new RegExp(state.absoluteUrlRegex).test('/a/b?joe&bob')).toBe(true);
        expect(new RegExp(state.absoluteUrlRegex).test('/a/b?sortable')).toBe(true);
        expect(new RegExp(state.absoluteUrlRegex).test('/a/b?enabled')).toBe(true);
        expect(state.params).toEqual(['hidden']);
    });

    it('should allow you to attach metadata to state', function () {
        manager.register('a', { myData: 'abc'});
        expect(manager.getState('a').myData).not.toBeUndefined();
        expect(manager.getState('a').myData).not.toBeNull();
        expect(manager.getState('a').myData).toBe('abc');
    });

    it('should allow you to merge states', function () {
        manager.register('a', { url: '/a/:id', myData: 'abc'});
        expect(manager.getState('a').params).toEqual(['id']);
        manager.merge('a', { url: '/ahhh', anotherValue: 'def'});
        expect(manager.getState('a').params).toEqual([]);
        expect(manager.getState('a').url).toBe('/ahhh');
        expect(manager.getState('a').myData).toBe('abc');
        expect(manager.getState('a').anotherValue).toBe('def');
    });

    it('should allow you to merge complex states', function () {
        function forwardingFunction() {
            return 'a.b';
        }

        manager.register('a', { url: '/a/:id', myData: 'abc', forwardToChild: forwardingFunction });
        expect(manager.getState('a').params).toEqual(['id']);
        manager.merge('a', { anotherValue: 'def'});
        expect(manager.getState('a').params).toEqual(['id']);
        expect(manager.getState('a').url).toBe('/a/:id');
        expect(manager.getState('a').myData).toBe('abc');
        expect(manager.getState('a').anotherValue).toBe('def');
        expect(manager.getState('a').forwardToChild).toBe(forwardingFunction);
    });

    it('should throw an error if merging an unknown state', function () {
        manager.register('a', { url: '/a/:id', myData: 'abc' });
        expect(function () { manager.merge('b', { anotherValue: 'def'}) }).toThrow("State not found: b");
    });

});