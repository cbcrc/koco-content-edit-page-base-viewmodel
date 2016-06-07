(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['exports', 'jquery', 'koco', 'koco-url-utilities'], factory);
    } else if (typeof exports !== "undefined") {
        factory(exports, require('jquery'), require('koco'), require('koco-url-utilities'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod.exports, global.jquery, global.koco, global.kocoUrlUtilities);
        global.contentManagement = mod.exports;
    }
})(this, function (exports, _jquery, _koco, _kocoUrlUtilities) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });

    var _jquery2 = _interopRequireDefault(_jquery);

    var _koco2 = _interopRequireDefault(_koco);

    var _kocoUrlUtilities2 = _interopRequireDefault(_kocoUrlUtilities);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

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

        _koco2.default.router.registerPage(content + '-edit', {
            basePath: 'modules/' + content + '-pages/edit',
            withActivator: options.withActivator,
            title: options.editTitle
        });
        _koco2.default.router.addRoute(_kocoUrlUtilities2.default.patternWithQueryString(content + '/edit/:id:'), {
            pageName: content + '-edit'
        });
        _koco2.default.router.registerPage(content + '-list', {
            basePath: 'modules/' + content + '-pages/list',
            withActivator: true,
            title: options.listTitle
        });
        _koco2.default.router.addRoute(_kocoUrlUtilities2.default.patternWithQueryString(options.listContentName), {
            pageName: content + '-list'
        });
    };

    exports.default = new ContentManagement();
});