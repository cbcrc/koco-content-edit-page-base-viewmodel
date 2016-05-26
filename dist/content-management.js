'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _router = require('router');

var _router2 = _interopRequireDefault(_router);

var _kocoUrlUtilities = require('koco-url-utilities');

var _kocoUrlUtilities2 = _interopRequireDefault(_kocoUrlUtilities);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ContentManagement = function ContentManagement() {}; // Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

ContentManagement.prototype.registerContentPages = function (content, options) {

    var defaultOptions = {
        withActivator: true,
        editTitle: '',
        listTitle: '',
        listContentName: content + 's'
    };

    options = _jquery2.default.extend(defaultOptions, options);

    _router2.default.registerPage(content + '-edit', {
        basePath: 'components/' + content + '-pages/edit',
        withActivator: options.withActivator,
        title: options.editTitle
    });
    _router2.default.addRoute(_kocoUrlUtilities2.default.patternWithQueryString(content + '/edit/:id:'), {
        pageName: content + '-edit'
    });
    _router2.default.registerPage(content + '-list', {
        basePath: 'components/' + content + '-pages/list',
        withActivator: true,
        title: options.listTitle
    });
    _router2.default.addRoute(_kocoUrlUtilities2.default.patternWithQueryString(options.listContentName), {
        pageName: content + '-list'
    });
};

exports.default = new ContentManagement();