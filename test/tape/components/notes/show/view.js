/**
 * Test: components/notes/show/View.js
 * @file
 */
import test from 'tape';
import sinon from 'sinon';
import Radio from 'backbone.radio';
import Mousetrap from 'mousetrap';

import Note from '../../../../../app/scripts/models/Note';
import View from '../../../../../app/scripts/components/notes/show/View';
import _ from '../../../../../app/scripts/utils/underscore';

let sand;
const configs = {
    actionsEdit       : 'e',
    actionsRemove     : '#',
    actionsRotateStar : 's',
};
test('notes/show/View: before()', t => {
    sand = sinon.sandbox.create();
    t.end();
});

test('View: className', t => {
    t.equal(View.prototype.className, 'layout--body');
    t.end();
});

test('View: ui()', t => {
    const ui = View.prototype.ui();
    t.equal(typeof ui, 'object', 'returns an object');
    t.end();
});

test('View: events()', t => {
    const events = View.prototype.events();
    t.equal(typeof events, 'object', 'returns an object');
    t.equal(events['click .btn--favourite'], 'toggleFavorite',
        'toggles favorite status if the favorite button is clicked');
    t.equal(events['click @ui.tasks'], 'toggleTask',
        'toggles checked status of a task if it is clicked');

    t.end();
});

test('View: triggers()', t => {
    const triggers = View.prototype.triggers();
    t.equal(typeof triggers, 'object', 'returns an object');
    t.equal(triggers['click .note--restore'], 'restore:model',
        'triggers restore:model event if the restore button is clicked');

    t.end();
});

test('View: constructor()', t => {
    sand.stub(_, 'debounce');
    sand.stub(_, 'throttle');
    const prot = View.prototype;
    sand.stub(prot, 'initialize');

    new View();
    t.equal(_.debounce.calledWith(prot.toggleTask, 200), true,
        'creates debounced version of toggleTask method');
    t.equal(_.throttle.calledWith(prot.toggleFavorite, 300, {leading: false}), true,
        'creates throttled version of toggleFavorite method');

    sand.restore();
    t.end();
});

test('View: initialize()', t => {
    const bind = sand.stub(Mousetrap, 'bind');
    new View({configs});

    t.equal(bind.calledWith('up'), true, 'listens to "up" key event');
    t.equal(bind.calledWith('down'), true, 'listens to "down" key event');

    t.equal(bind.calledWith('e'), true, 'listens to "e" key event');
    t.equal(bind.calledWith('#'), true, 'listens to "#" key event');
    t.equal(bind.calledWith('s'), true, 'listens to "s" key event');

    sand.restore();
    t.end();
});

test('View: onDestroy()', t => {
    const view   = new View({configs});
    const unbind = sand.spy(Mousetrap, 'unbind');
    sand.spy(view, 'onDestroy');

    view.destroy();
    t.equal(view.onDestroy.called, true, 'calls onDestroy method');
    t.equal(unbind.calledWith(['up', 'down', 'e', '#', 's']), true,
        'unbinds all keybindings');

    sand.restore();
    t.end();
});

test('View: toggleFavorite() - without throttle', t => {
    View.prototype.model = new Note({id: '1'});
    const toggle  = sand.spy(View.prototype.model, 'toggleFavorite');
    const request = sand.stub(Radio, 'request').returns(Promise.resolve());
    const res     = View.prototype.toggleFavorite();

    t.equal(toggle.called, true, 'changes the favorite status of a note');
    t.equal(typeof res.then, 'function', 'returns a promise');

    t.equal(request.calledWith('collections/Notes', 'saveModel', {
        model: View.prototype.model,
    }), true, 'saves the model');

    sand.restore();
    delete View.prototype.model;
    t.end();
});

test('View: toggleFavorite() - throttled', t => {
    const stub = sand.stub(View.prototype, 'toggleFavorite');
    const view = new View({configs, model: new Note({id: '3'})});

    view.toggleFavorite();
    t.equal(stub.notCalled, true, 'does not call the original method immediately');

    setTimeout(() => {
        t.equal(stub.called, true, 'calls the original method after 300 ms');

        view.destroy();
        sand.restore();
        t.end();
    }, 301);
});

test('View: toggleTask() - without throttle', t => {
    const trigger   = sand.spy(View.prototype, 'trigger');
    const jqReplace = {
        attr : sand.stub().returns('1'),
        is   : sand.stub().returns(true),
        blur : sand.stub(),
        prop : sand.stub(),
    };
    sand.stub(View.prototype, '$').returns(jqReplace);

    View.prototype.toggleTask({currentTarget: 'data-task'});
    t.equal(jqReplace.blur.called, true, 'removes the focus from the checkbox');
    t.equal(jqReplace.prop.calledWith('checked', false), true,
        'changes the status of the task checkbox');
    t.equal(trigger.called, true, 'triggers "toggle:task" event');

    sand.restore();
    t.end();
});

test('View: toggleTask() - throttled', t => {
    const stub = sand.stub(View.prototype, 'toggleTask');
    const view = new View({configs, model: new Note({id: '3'})});

    view.toggleTask();
    t.equal(stub.notCalled, true, 'does not call the original method immediately');

    setTimeout(() => {
        t.equal(stub.called, true, 'calls the original method after 200 ms');

        view.destroy();
        sand.restore();
        t.end();
    }, 300);
});

test('View: onChangeFavorite()', t => {
    const view = new View({configs, model: new Note({id: '3'})});
    const stub = sand.stub();
    view.ui    = {favorite: {toggleClass: stub}};

    view.onChangeFavorite();
    t.equal(stub.calledWith('icon-favorite'), true, 'changes favorite icon');

    view.destroy();
    sand.restore();
    t.end();
});

test('View: onTaskCompleted()', t => {
    const model = new Note({taskCompleted: 2, taskAll: 10});
    const view  = new View({configs, model});
    view.ui     = {
        progress : {css  : sand.stub()},
        percent  : {html : sand.stub()},
    };

    view.onTaskCompleted();
    t.equal(view.ui.progress.css.calledWith({width: '20%'}), true,
        'changes the with of the progress bar');
    t.equal(view.ui.percent.html.calledWith('20%'), true,
        'updates the percent information');

    view.destroy();
    sand.restore();
    t.end();
});

test('View: scrollTop()', t => {
    const view  = new View({configs});
    view.ui     = {body: {scrollTop: sand.stub().returns(100)}};

    view.scrollTop();
    t.equal(view.ui.body.scrollTop.calledWith(50), true,
        'changes the scrolling position');

    view.destroy();
    sand.restore();
    t.end();
});

test('View: scrollTop()', t => {
    const view  = new View({configs});
    view.ui     = {body: {scrollTop: sand.stub().returns(150)}};

    view.scrollDown();
    t.equal(view.ui.body.scrollTop.calledWith(200), true,
        'changes the scrolling position');

    view.destroy();
    sand.restore();
    t.end();
});

test('View: navigateEdit()', t => {
    const view    = new View({configs});
    view.ui       = {editBtn: {attr: sand.stub().returns('notes/edit/1')}};
    const request = sand.stub(Radio, 'request');

    view.navigateEdit();
    t.equal(request.calledWith('utils/Url', 'navigate', {
        url: 'notes/edit/1',
    }), true, 'msg');

    view.destroy();
    sand.restore();
    t.end();
});

test('View: triggerRemove()', t => {
    const view    = new View({configs, model: new Note({id: '3'})});
    const request = sand.stub(Radio, 'request');

    view.triggerRemove();
    t.equal(request.calledWith('components/notes', 'remove', {
        model: view.model,
    }), true, 'triggers "remove" event');

    view.destroy();
    sand.restore();
    t.end();
});

test('View: serializeData()', t => {
    const model = new Note({id: '1'});
    const view  = new View({configs, model, profileLink: '/p/def'});
    sand.spy(_, 'extend');

    t.equal(typeof view.serializeData(), 'object', 'returns an object');
    t.equal(_.extend.calledWithMatch({}, model.attributes, {
        content     : model.get('content'),
        notebook    : undefined,
        profileLink : '/p/def',
    }), true, 'contains model attributes and other parameters');

    view.destroy();
    t.end();
});

test('View: templateContext()', t => {
    const context = View.prototype.templateContext();
    t.equal(typeof context, 'object', 'returns an object');

    t.equal(typeof context.createdDate(), 'string', 'returns a string');

    context.taskCompleted = 3;
    context.taskAll       = 10;
    t.equal(context.getProgress(), 30, 'calculates the percent of completed tasks');

    t.end();
});