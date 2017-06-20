(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports', 'knockout', 'jquery', 'lodash', 'koco-mapping-utilities', 'koco', 'toastr', 'koco-modaler', 'koco-array-utilities', 'validation-utilities', 'koco-disposer', 'i18next', 'moment', 'translate-utilities'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports, require('knockout'), require('jquery'), require('lodash'), require('koco-mapping-utilities'), require('koco'), require('toastr'), require('koco-modaler'), require('koco-array-utilities'), require('validation-utilities'), require('koco-disposer'), require('i18next'), require('moment'), require('translate-utilities'));
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports, global.knockout, global.jquery, global.lodash, global.kocoMappingUtilities, global.koco, global.toastr, global.kocoModaler, global.kocoArrayUtilities, global.validationUtilities, global.kocoDisposer, global.i18next, global.moment, global.translateUtilities);
    global.contentEditPageBaseViewmodel = mod.exports;
  }
})(this, function (exports, _knockout, _jquery, _lodash, _kocoMappingUtilities, _koco, _toastr, _kocoModaler, _kocoArrayUtilities, _validationUtilities, _kocoDisposer, _i18next, _moment, _translateUtilities) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _knockout2 = _interopRequireDefault(_knockout);

  var _jquery2 = _interopRequireDefault(_jquery);

  var _lodash2 = _interopRequireDefault(_lodash);

  var _kocoMappingUtilities2 = _interopRequireDefault(_kocoMappingUtilities);

  var _koco2 = _interopRequireDefault(_koco);

  var _toastr2 = _interopRequireDefault(_toastr);

  var _kocoModaler2 = _interopRequireDefault(_kocoModaler);

  var _kocoArrayUtilities2 = _interopRequireDefault(_kocoArrayUtilities);

  var _validationUtilities2 = _interopRequireDefault(_validationUtilities);

  var _kocoDisposer2 = _interopRequireDefault(_kocoDisposer);

  var _i18next2 = _interopRequireDefault(_i18next);

  var _moment2 = _interopRequireDefault(_moment);

  var _translateUtilities2 = _interopRequireDefault(_translateUtilities);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var defaultSettings = {
    tinymcePropertyNames: [],
    observableValueObjects: null,
    alikeArraysPropertyNames: [],
    quitConfirmMessage: 'Si vous quitter cette page, vos changements seront perdus.',
    contentCreatedMessage: 'Le contenu a été sauvegardé.',
    contentUpdatedMessage: 'Le contenu a été sauvegardé.',
    validationErrorsMessage: 'Le formulaire comporte des erreurs. Veuillez les corriger.',
    unknownErrorMessage: 'Une erreur de type inconnu est survenu: ',
    confirmQuitButtonText: 'Quitter',
    apiQueryParams: null
  };

  var ContentEditPageBaseViewModel = function () {
    function ContentEditPageBaseViewModel(params, componentInfo, api, apiResourceName, observableContent, settings) {
      var _this = this;

      _classCallCheck(this, ContentEditPageBaseViewModel);

      if (!api) {
        throw new Error('ContentEditPageBaseViewModel - missing api');
      }

      if (!apiResourceName) {
        throw new Error('ContentEditPageBaseViewModel - missing api resource name');
      }

      if (!observableContent) {
        throw new Error('ContentEditPageBaseViewModel - missing api observable content');
      }

      // attention: params.route est fixe
      // params.route peut être en désynchronisation avec la route actuelle dû à setUrlSilently
      this.route = _knockout2.default.pureComputed(function () {
        var kocoContext = _koco2.default.router.context();

        return !kocoContext || !kocoContext.page || !kocoContext.page.viewModel || kocoContext.page.viewModel !== _this ? params.route : kocoContext.route;
      });

      this.settings = _jquery2.default.extend({}, defaultSettings, settings);
      this.getMessageOverride = function (message) {
        return message && _translateUtilities2.default.translate(message);
      };

      if (_i18next2.default) {
        this.settings.quitConfirmMessage = this.getMessageOverride(settings.quitConfirmMessage) || _i18next2.default.t('koco-content-management.quit_confirm_message');
        this.settings.contentCreatedMessage = this.getMessageOverride(settings.contentCreatedMessage) || _i18next2.default.t('koco-content-management.content_created_message');
        this.settings.contentUpdatedMessage = this.getMessageOverride(settings.contentUpdatedMessage) || _i18next2.default.t('koco-content-management.content_updated_message');
        this.settings.validationErrorsMessage = this.getMessageOverride(settings.validationErrorsMessage) || _i18next2.default.t('koco-content-management.validation_errors_message');
        this.settings.unknownErrorMessage = this.getMessageOverride(settings.unknownErrorMessage) || _i18next2.default.t('koco-content-management.unknown_error_message');
        this.settings.confirmQuitButtonText = this.getMessageOverride(settings.confirmQuitButtonText) || _i18next2.default.t('koco-content-management.confirm_quit_button_text');
      }

      this.ignoreDispose = false;

      this.apiQueryParams = this.settings.apiQueryParams;

      this.api = api;

      this.disposer = new _kocoDisposer2.default();

      this.mapping = this.settings.mapping || {};

      if (this.settings.observableValueObjects) {
        _kocoMappingUtilities2.default.mapAsObservableValueObjects(this.mapping, this.settings.observableValueObjects);
      }

      this.observableContent = _knockout2.default.validatedObservable(_knockout2.default.mapping.fromJS(observableContent, this.mapping));
      this.observableContent.extend({
        bootstrapValidation: {}
      });

      this.originalModelSnapshot = _knockout2.default.observable();

      this.apiResourceName = apiResourceName;

      this.validatedObservables = [this.observableContent];

      this.editMode = _knockout2.default.pureComputed(function () {
        return _this.getId() ? 'update' : 'create';
      });
      this.disposer.add(this.editMode);

      this.serverSideValidationErrors = _knockout2.default.observableArray([]);

      this.content = _knockout2.default.pureComputed(function () {
        return _kocoMappingUtilities2.default.toJS(_this.observableContent);
      });
      this.disposer.add(this.content);
    }

    _createClass(ContentEditPageBaseViewModel, [{
      key: 'activate',
      value: function activate() {
        var _this2 = this;

        return this.loadLookups().then(function () {
          return _this2.loadContent(_this2.route().urlParams[0].id);
        }).then(function () {
          return _this2.afterContentLoaded();
        }).then(function () {
          _this2.finalize();
        }).catch(function (ex) {
          _this2.handleUnknownError(ex);
        });
      }
    }, {
      key: 'getId',
      value: function getId() {
        return this.observableContent().id();
      }
    }, {
      key: 'canNavigate',
      value: function canNavigate() {
        if (this.isChangesWillBeLostConfirmationDisabled) {
          return true;
        }

        if (!this.hasModelChanged()) {
          return true;
        }

        return _kocoModaler2.default.show('confirm', {
          message: this.settings.quitConfirmMessage,
          okButtonHtml: this.settings.confirmQuitButtonText
        });
      }
    }, {
      key: 'onBeforeUnload',
      value: function onBeforeUnload() {
        if (this.isChangesWillBeLostConfirmationDisabled) {
          return;
        }

        if (!this.hasModelChanged()) {
          return;
        }

        return this.settings.quitConfirmMessage;
      }
    }, {
      key: 'save',
      value: function save(options) {
        var _this3 = this;

        this.serverSideValidationErrors([]);

        return this.validate().then(function (isValid) {
          if (isValid) {
            return _this3.saveInner(options);
          }

          return Promise.resolve();
        });
      }
    }, {
      key: 'validate',
      value: function validate() {
        var _this4 = this;

        return this.validateInner().then(function (isValid) {
          if (!isValid) {
            return _this4.prepareScreenForValidationErrors();
          }

          return Promise.resolve(true);
        });
      }
    }, {
      key: 'validateInner',
      value: function validateInner() {
        return _validationUtilities2.default.validateObservables(this.validatedObservables);
      }
    }, {
      key: 'toOutputModel',
      value: function toOutputModel() /*saveOptions*/{
        return _kocoMappingUtilities2.default.toJS(this.observableContent);
      }
    }, {
      key: 'hasModelChanged',
      value: function hasModelChanged() {
        return this.isEqual(this.originalModelSnapshot(), this.takeCurrentModelSnapshot(), this.settings.tinymcePropertyNames, this.settings.alikeArraysPropertyNames) === false;
      }
    }, {
      key: 'isEqual',
      value: function isEqual(object, other, htmlPropertyNames, alikeArraysPropertyNames) {
        object = _kocoMappingUtilities2.default.toJS(object);
        other = _kocoMappingUtilities2.default.toJS(other);

        return JSON.stringify(other) === JSON.stringify(object);
      }
    }, {
      key: 'takeCurrentModelSnapshot',
      value: function takeCurrentModelSnapshot() {
        var modelSnapshot = this.toOutputModel();
        return modelSnapshot;
      }
    }, {
      key: 'takeOriginalModelSnapshot',
      value: function takeOriginalModelSnapshot() {
        var _this5 = this;

        setTimeout(function () {
          _this5.originalModelSnapshot(_this5.takeCurrentModelSnapshot());
        }, 500);
      }
    }, {
      key: 'getModelSnapshot',
      value: function getModelSnapshot() {
        return _kocoMappingUtilities2.default.toJS(this.observableContent);
      }
    }, {
      key: 'loadContent',
      value: function loadContent(id) {
        var apiEndpointUrl = void 0;

        if (id) {
          apiEndpointUrl = this.apiResourceName + '/' + id;
        }

        return this.loadContentInner(apiEndpointUrl);
      }
    }, {
      key: 'loadLookups',
      value: function loadLookups() {
        return Promise.resolve();
      }
    }, {
      key: 'afterContentLoaded',
      value: function afterContentLoaded() {
        return Promise.resolve();
      }
    }, {
      key: 'onContentLoaded',
      value: function onContentLoaded(content) {
        var _this6 = this;

        return new Promise(function (resolve) {
          _this6.updateObservableContent(content);
          _this6.takeOriginalModelSnapshot();
          resolve();
        });
      }
    }, {
      key: 'updateObservableContent',
      value: function updateObservableContent(content) {
        var adaptedContentFromServer = this.fromInputModel(content);

        _knockout2.default.mapping.fromJS(adaptedContentFromServer, this.mapping, this.observableContent);
      }
    }, {
      key: 'fromInputModel',
      value: function fromInputModel(inputModel) {
        return inputModel;
      }
    }, {
      key: 'reload',
      value: function reload(id) {
        var _this7 = this;

        return this.loadContent(id).then(function () {
          return _this7.afterContentLoaded();
        }).then(function () {
          return _koco2.default.router.reload();
        });
      }
    }, {
      key: 'create',
      value: function create(writeModel, options) {
        var _this8 = this;

        return this.api.fetch(this.apiResourceName, {
          method: 'POST',
          body: JSON.stringify(writeModel)
        }).then(function (data) {
          return _this8.onCreateSuccess(data, options);
        }).catch(function (ex) {
          return _this8.onCreateFail(ex);
        });
      }
    }, {
      key: 'update',
      value: function update(writeModel, options) {
        var _this9 = this;

        var id = this.getId();
        var url = this.apiResourceName + '/' + id;

        if (this.apiQueryParams) {
          // todo: why us $.param(.., true) here and false elsewhere?
          url = url + '?' + _jquery2.default.param(this.apiQueryParams, true);
        }

        return this.api.fetch(url, {
          method: 'PUT',
          body: JSON.stringify(writeModel)
        }).then(function (data) {
          return _this9.onUpdateSuccess(id, data, options);
        }).then(function () {
          return _this9.afterContentLoaded();
        }).catch(function (ex) {
          return _this9.onUpdateFail(writeModel, id, ex);
        });
      }
    }, {
      key: 'onCreateSuccess',
      value: function onCreateSuccess(id, options) {
        var _this10 = this;

        this.isChangesWillBeLostConfirmationDisabled = true;
        _toastr2.default.success(this.settings.contentCreatedMessage);

        return this.reload(id).then(function () {
          var route = _koco2.default.router.context().route;

          if (route.url.indexOf(id) === -1) {
            var urlPartToReplace = _this10.apiResourceName + '/edit';

            var defaultOptions = {
              url: route.url.replace(new RegExp(urlPartToReplace, 'i'), urlPartToReplace + '/' + id),
              pageTitle: _koco2.default.router.context().pageTitle,
              stateObject: {},
              replace: true
            };

            _koco2.default.router.setUrlSilently(defaultOptions);
          }
        });
      }
    }, {
      key: 'onUpdateFail',
      value: function onUpdateFail(writeModel, id, ex) {
        if (ex.response) {
          switch (ex.response.status) {
            case 400:
              return this.handleServerValidationErrors(ex.response.body);

            case 406:
              return this.handleServerValidationErrors([ex.response.body]);

            case 409:
              // Version conflict
              return this.handleSaveConflict(writeModel, ex.response.body);

            default:
              return this.handleUnknownError(ex);
          }
        } else {
          return this.handleUnknownError(ex);
        }
      }
    }, {
      key: 'onCreateFail',
      value: function onCreateFail(ex) {
        if (ex.response) {
          switch (ex.response.status) {
            case 400:
              return this.handleServerValidationErrors(ex.response.body);
            case 406:
              return this.handleServerValidationErrors([ex.response.body]);
            default:
              return this.handleUnknownError(ex);
          }
        } else {
          return this.handleUnknownError(ex);
        }
      }
    }, {
      key: 'handleUnknownError',
      value: function handleUnknownError(ex) {
        _toastr2.default.error(this.settings.unknownErrorMessage + ' ' + ex);

        return Promise.resolve();
      }
    }, {
      key: 'onUpdateSuccess',
      value: function onUpdateSuccess(id /* , data */) {
        _toastr2.default.success(this.settings.contentUpdatedMessage);

        return this.loadContent(id);
      }
    }, {
      key: 'handleSaveConflict',
      value: function handleSaveConflict() /* writeModel, conflictInfo */{
        return Promise.resolve();
      }
    }, {
      key: 'handleServerValidationErrors',
      value: function handleServerValidationErrors(errors) {
        // On affiche seulement les erreurs globales (key = '') pour l'instant
        // TODO: Vider les erreurs avant de commencer ?

        var finalErrors = [];

        for (var key in errors) {
          for (var key2 in errors[key]) {
            finalErrors.push(errors[key][key2]);
          }
        }

        if (_kocoArrayUtilities2.default.isNotEmptyArray(finalErrors)) {
          this.serverSideValidationErrors(finalErrors);
          return this.prepareScreenForValidationErrors();
        }

        return Promise.resolve();
      }
    }, {
      key: 'prepareScreenForValidationErrors',
      value: function prepareScreenForValidationErrors() {
        var _this11 = this;

        return new Promise(function (resolve) {
          _toastr2.default.error(_this11.settings.validationErrorsMessage);

          if (_this11.selectFirstTabWithValidationErrors) {
            _this11.selectFirstTabWithValidationErrors();
          }

          (0, _jquery2.default)('html, body').animate({
            scrollTop: 0
          }, function () {
            resolve(false);
          });
        });
      }
    }, {
      key: 'selectFirstTabWithValidationErrors',
      value: function selectFirstTabWithValidationErrors() {
        var panel = (0, _jquery2.default)('.tab-pane.active');

        if (!panel.length || !panel.find('.form-group.has-error').length) {
          panel = (0, _jquery2.default)('.form-group.has-error').closest('.tab-pane');
        }

        if (panel.length) {
          (0, _jquery2.default)('.nav-tabs a[href="#' + panel.attr('id') + '"]').click();
        } else {
          (0, _jquery2.default)('.nav-tabs a').first().click();
        }
      }
    }, {
      key: 'finalize',
      value: function finalize() {
        this.takeOriginalModelSnapshot();
        _koco2.default.router.navigating.subscribe(this.canNavigate, this);
        (0, _jquery2.default)(window).on('beforeunload.editpage', this.onBeforeUnload.bind(this));
      }
    }, {
      key: 'dispose',
      value: function dispose() {
        // this sucks... a dirty hack...
        if (!this.ignoreDispose) {
          this.disposeInner();
        }

        this.ignoreDispose = false;
      }
    }, {
      key: 'disposeInner',
      value: function disposeInner() {
        (0, _jquery2.default)(window).off('beforeunload.editpage');
        _koco2.default.router.navigating.unsubscribe(this.canNavigate, this);
        this.disposer.dispose();
      }
    }, {
      key: 'saveInner',
      value: function saveInner(options) {
        var writeModel = this.toOutputModel(options);

        if (this.editMode() === 'create') {
          return this.create(writeModel, options);
        }

        return this.update(writeModel, options);
      }
    }, {
      key: 'loadContentInner',
      value: function loadContentInner(apiEndpointUrl) {
        var _this12 = this;

        if (apiEndpointUrl) {
          var url = apiEndpointUrl;

          if (this.apiQueryParams) {
            // todo: why us $.param(.., true) here and false elsewhere?
            url = url + '?' + _jquery2.default.param(this.apiQueryParams, true);
          }

          return this.api.fetch(apiEndpointUrl).then(function (content) {
            return _this12.onContentLoaded(content);
          });
        }

        return Promise.resolve();
      }
    }]);

    return ContentEditPageBaseViewModel;
  }();

  exports.default = ContentEditPageBaseViewModel;
});