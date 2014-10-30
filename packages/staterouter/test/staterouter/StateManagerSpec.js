describe('StateManager', function() {
    var manager;

    beforeEach(function () {
        manager = Ext.create('StateRouter.staterouter.StateManager');
    });

    it('should allow states to have a URL with query params', function () {
        var stateDef;

        manager.register('a', {
            url: '/a?enabled&sortable'
        });

        stateDef = manager.getStateDefinition('a');

        expect(new RegExp(stateDef.getAbsoluteUrlRegex()).test('/a?sortable&enabled')).toBe(true);
        expect(stateDef.getParams()).toEqual(['enabled', 'sortable']);
    });

    it('should allow child states to have a URL with query params', function () {
        var stateDef;

        manager.register('a', {
            url: '/a?enabled&sortable'
        });

        manager.register('a.b', {
            url: '/b?hidden'
        });

        manager.getStateDefinition('a');
        stateDef = manager.getStateDefinition('a.b');

        expect(new RegExp(stateDef.getAbsoluteUrlRegex()).test('/a/b')).toBe(true);
        expect(new RegExp(stateDef.getAbsoluteUrlRegex()).test('/a/b?sortable&enabled')).toBe(true);
        expect(new RegExp(stateDef.getAbsoluteUrlRegex()).test('/a/b?enabled&sortable')).toBe(true);
        expect(new RegExp(stateDef.getAbsoluteUrlRegex()).test('/a/b?joe&bob')).toBe(true);
        expect(new RegExp(stateDef.getAbsoluteUrlRegex()).test('/a/b?sortable')).toBe(true);
        expect(new RegExp(stateDef.getAbsoluteUrlRegex()).test('/a/b?enabled')).toBe(true);
        expect(stateDef.getParams()).toEqual(['hidden']);
    });
});