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

        expect(new RegExp(state.getAbsoluteUrlRegex()).test('/a?sortable&enabled')).toBe(true);
        expect(state.getParams()).toEqual(['enabled', 'sortable']);
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

        expect(new RegExp(state.getAbsoluteUrlRegex()).test('/a/b')).toBe(true);
        expect(new RegExp(state.getAbsoluteUrlRegex()).test('/a/b?sortable&enabled')).toBe(true);
        expect(new RegExp(state.getAbsoluteUrlRegex()).test('/a/b?enabled&sortable')).toBe(true);
        expect(new RegExp(state.getAbsoluteUrlRegex()).test('/a/b?joe&bob')).toBe(true);
        expect(new RegExp(state.getAbsoluteUrlRegex()).test('/a/b?sortable')).toBe(true);
        expect(new RegExp(state.getAbsoluteUrlRegex()).test('/a/b?enabled')).toBe(true);
        expect(state.getParams()).toEqual(['hidden']);
    });
});