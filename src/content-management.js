// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import $ from 'jquery';
import koco from 'koco';
import urls from 'koco-url-utilities';

var ContentManagement = function() {

};

ContentManagement.prototype.registerContentPages = function(content, options) {

    var defaultOptions = {
        withActivator: true,
        editTitle: '',
        listTitle: '',
        listContentName: content + 's'
    };

    options = $.extend(defaultOptions, options);

    koco.router.registerPage(content + '-edit', {
        basePath: 'modules/' + content + '-pages/edit',
        withActivator: options.withActivator,
        title: options.editTitle
    });
    koco.router.addRoute(urls.patternWithQueryString(content + '/edit/:id:'), {
        pageName: content + '-edit'
    });
    koco.router.registerPage(content + '-list', {
        basePath: 'modules/' + content + '-pages/list',
        withActivator: true,
        title: options.listTitle
    });
    koco.router.addRoute(urls.patternWithQueryString(options.listContentName), {
        pageName: content + '-list'
    });
};

export default new ContentManagement();
