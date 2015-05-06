# koco-content-management
`koco content management` is a component used to create listing and editing pages for content management systems (CMS). It is an opinionated component based on the [koco generator](https://github.com/cbcrc/generator-koco).

## Table of contents

- [Installation](#installation)
- [Creating a content listing page](#creating-a-content-listing-page)
	- [About content listing page](#about-content-listing-page)
	- [Setup of content listing page](#setup-of-content-listing-page)
		- [Activator for content listing page](#content-listing-page-activator-optional)
		- [Base ViewModel for content listing page](#content-listing-page-base-viewmodel)
- [Creating a content editing page](#creating-a-content-editing-page)
	- [About content editing page](#about-content-editing-page)
	- [Setup of content editing page](#setup-of-content-editing-page)
		- [Activator for content editing page](#content-editing-page-activator)
		- [Base ViewModel for content editing page](#content-editing-page-base-viewmodel)
- [Registering Content Pages](#registering-content-pages)


## Installation

``` bash
bower install koco-content-management --save
```

## Creating a content listing page

### About content listing page

//TODO

### Setup

#### Activator for content listing page (optional)

You can use the default `activator` ([see koco-router activator contract for more information](https://github.com/cbcrc/koco-router#the-activator-contract)) by first adding this to your `require.config.js` file

```javascript
paths: {
  ...
  'content-list-page-base-activator': 'bower_components/koco-content-management/src/listing/content-list-page-activator'
  ...
}
```

and then creating an `activator` that inherits from the `content-list-page-base-activator`

```javascript
define(['./my-list-page-viewmodel', 'content-list-page-base-activator'],
    function(MyEditPageViewModel, ContentEditPageBaseActivator) {
        'use strict';

        var Activator = function() {
            var self = this;

            ContentEditPageBaseActivator.call(self, new MyEditPageViewModel());
        };

        Activator.prototype = Object.create(ContentEditPageBaseActivator.prototype);
        Activator.prototype.constructor = Activator;

        return Activator;
    });

```

#### Base ViewModel for content listing page

```javascript
paths: {
  ...
  'content-list-page-base-viewmodel': 'bower_components/koco-content-management/src/listing/content-list-page-base-viewmodel'
  ...
}
```

- Create a `shareable` viewmodel that is different than the main viewmodel `-ui.js` (the `shareable` viewmodel will be joined with the main viewmodel after the activation process). This `shareable` viewmodel should `extend` ([see jQuery extend for more information](http://api.jquery.com/jquery.extend/)) the `base viewmodel` (`content-list-page-base-viewmodel`) like this:

`my-list-page-viewmodel.js` -->

```javascript
define(['knockout', 'jquery', 'content-list-page-base-viewmodel', 'my-rest-api'],
    function(ko, $, ContentEditPageBaseViewModel, myRestApi) {
        'use strict';

        //For example
        var defaultSearchFields = {
            keywords: ''
        };

        var MyEditPageViewModel = function() {
            var contentEditPageBaseViewModel = new ContentEditPageBaseViewModel(myRestApi, 'myRestApiResource', defaultSearchFields);
            $.extend(contentEditPageBaseViewModel, this);
            var self = contentEditPageBaseViewModel;

            return self;
        };

        return MyEditPageViewModel;
    });

```

- Create the main viewmodel for your content listing page. The main viewmodel will receive the `shareable` viewmodel as the `context` argument:

`my-list-page-ui.js` -->

```javascript
define(['knockout', 'jquery', 'text!./my-list-page.html'],
    function(ko, $, template) {
        'use strict';

        var MyEditPageViewModel = function(context, componentInfo) {
            var self = this;

            $.extend(context, self);
            self = context;

            return self;
        };

        return {
            viewModel: {
                createViewModel: function(context, componentInfo) {
                    var viewmodel = new MyEditPageViewModel(context, componentInfo);

                    return viewmodel;
                }
            },
            template: template
        };
    });
```

## Creating a content editing page

### About content editing page

//TODO

### Setup of content editing page

#### Activator for content editing page (optional)

You can use the default `activator` ([see koco-router activator contract for more information](https://github.com/cbcrc/koco-router#the-activator-contract)) by first adding this to your `require.config.js` file

```javascript
paths: {
  ...
  'content-edit-page-base-activator': 'bower_components/koco-content-management/src/listing/content-edit-page-base-activator'
  ...
}
```

and then creating an `activator` that inherits from the `content-edit-page-base-activator`

```javascript
define(['./my-edit-page-viewmodel', 'content-edit-page-base-activator'],
    function(MyEditPageViewModel, ContentEditPageBaseActivator) {
        'use strict';

        var Activator = function() {
            var self = this;

            ContentEditPageBaseActivator.call(self, new MyEditPageViewModel());
        };

        Activator.prototype = Object.create(ContentEditPageBaseActivator.prototype);
        Activator.prototype.constructor = Activator;

        return Activator;
    });

```

#### Base ViewModel for content editing page

```javascript
paths: {
  ...
  'content-edit-page-base-viewmodel': 'bower_components/koco-content-management/src/editing/content-edit-page-base-viewmodel'
  ...
}
```

- Create a `shareable` viewmodel that is different than the main viewmodel `-ui.js` (the `shareable` viewmodel will be joined with the main viewmodel after the activation process). This `shareable` viewmodel should `extend` ([see jQuery extend for more information](http://api.jquery.com/jquery.extend/)) the `base viewmodel` (`content-edit-page-base-viewmodel`) like this:

`my-edit-page-viewmodel.js` -->

```javascript
define(['knockout', 'jquery', 'content-edit-page-base-viewmodel', 'my-rest-api'],
    function(ko, $, ContentEditPageBaseViewModel, myRestApi) {
        'use strict';

        //For example
        self.defaultContent = {
            id: null,
            title: ''
        };

        var MyEditPageViewModel = function() {
            var contentEditPageBaseViewModel = new ContentEditPageBaseViewModel(myRestApi, 'myRestApiResource', ko.mapping.fromJS(self.defaultContent));
            $.extend(contentEditPageBaseViewModel, this);
            var self = contentEditPageBaseViewModel;

            return self;
        };

        return MyEditPageViewModel;
    });

```

- Create the main viewmodel for your content editing page. The main viewmodel will receive the `shareable` viewmodel as the `context` argument:

`my-edit-page-ui.js` -->

```javascript
define(['knockout', 'jquery', 'text!./my-edit-page.html'],
    function(ko, $, template) {
        'use strict';

        var MyEditPageViewModel = function(context, componentInfo) {
            var self = this;

            $.extend(context, self);
            self = context;

            return self;
        };

        return {
            viewModel: {
                createViewModel: function(context, componentInfo) {
                    var viewmodel = new MyEditPageViewModel(context, componentInfo);

                    return viewmodel;
                }
            },
            template: template
        };
    });
```

## Registering Content Pages

The content management comes with a utility function that works well with koco and can be used this way:

```javascript
// require.config.js
paths: {
    ...
    'content-management': 'bower_components/koco-content-management/src/content-management'
    ...
}
```

```javascript
// components.js
define([..., 'content-management'], 
    function(contentManagement) {
        ...
        contentManagement.registerContentPages('my-content', {
                withActivator: true, //default:true
                editTitle: 'Editing My Content',
                listTitle: 'Listing My Content',
                listContentName: '' //default:adds an 's' at the end of the provided content name
            })
        ...
        });
```
