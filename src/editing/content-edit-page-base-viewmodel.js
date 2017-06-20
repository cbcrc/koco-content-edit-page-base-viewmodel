// Copyright (c) CBC/Radio-Canada. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import ko from 'knockout';
import $ from 'jquery';
import _ from 'lodash';
import mappingUtilities from 'koco-mapping-utilities';
import koco from 'koco';
import toastr from 'toastr';
import modaler from 'koco-modaler';
import arrayUtilities from 'koco-array-utilities';
import validationUtilities from 'validation-utilities';
import Disposer from 'koco-disposer';
import i18n from 'i18next';
import moment from 'moment';
import translateUtilities from 'translate-utilities';

const defaultSettings = {
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

class ContentEditPageBaseViewModel {
  constructor(params, componentInfo, api, apiResourceName, observableContent, settings) {
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
    this.route = ko.pureComputed(() => {
      const kocoContext = koco.router.context();

      return (!kocoContext || !kocoContext.page || !kocoContext.page.viewModel || kocoContext.page.viewModel !== this) ?
        params.route :
        kocoContext.route;
    });

    this.settings = $.extend({}, defaultSettings, settings);
    this.getMessageOverride = (message) => message && translateUtilities.translate(message);
    
    if (i18n) {
      this.settings.quitConfirmMessage = this.getMessageOverride(settings.quitConfirmMessage)  || i18n.t('koco-content-management.quit_confirm_message');
      this.settings.contentCreatedMessage = this.getMessageOverride(settings.contentCreatedMessage) || i18n.t('koco-content-management.content_created_message');
      this.settings.contentUpdatedMessage = this.getMessageOverride(settings.contentUpdatedMessage) || i18n.t('koco-content-management.content_updated_message');
      this.settings.validationErrorsMessage = this.getMessageOverride(settings.validationErrorsMessage) || i18n.t('koco-content-management.validation_errors_message');
      this.settings.unknownErrorMessage = this.getMessageOverride(settings.unknownErrorMessage) || i18n.t('koco-content-management.unknown_error_message');
      this.settings.confirmQuitButtonText = this.getMessageOverride(settings.confirmQuitButtonText) || i18n.t('koco-content-management.confirm_quit_button_text');
    }

    this.ignoreDispose = false;

    this.apiQueryParams = this.settings.apiQueryParams;

    this.api = api;

    this.disposer = new Disposer();

    this.mapping = this.settings.mapping || {};

    if (this.settings.observableValueObjects) {
      mappingUtilities.mapAsObservableValueObjects(this.mapping,
        this.settings.observableValueObjects);
    }

    this.observableContent = ko.validatedObservable(ko.mapping
      .fromJS(observableContent, this.mapping));
    this.observableContent.extend({
      bootstrapValidation: {}
    });

    this.originalModelSnapshot = ko.observable();

    this.apiResourceName = apiResourceName;

    this.validatedObservables = [this.observableContent];

    this.editMode = ko.pureComputed(() => this.getId() ? 'update' : 'create');
    this.disposer.add(this.editMode);

    this.serverSideValidationErrors = ko.observableArray([]);

    this.content = ko.pureComputed(() => mappingUtilities.toJS(this.observableContent));
    this.disposer.add(this.content);
  }

  activate() {
    return this.loadLookups()
      .then(() => this.loadContent(this.route().urlParams[0].id))
      .then(() => this.afterContentLoaded())
      .then(() => {
        this.finalize();
      })
      .catch((ex) => {
        this.handleUnknownError(ex);
      });
  }

  getId() {
    return this.observableContent().id();
  }

  canNavigate() {
    if (this.isChangesWillBeLostConfirmationDisabled) {
      return true;
    }

    if (!this.hasModelChanged()) {
      return true;
    }

    return modaler.show('confirm', {
      message: this.settings.quitConfirmMessage,
      okButtonHtml: this.settings.confirmQuitButtonText
    });
  }

  onBeforeUnload() {
    if (this.isChangesWillBeLostConfirmationDisabled) {
      return;
    }

    if (!this.hasModelChanged()) {
      return;
    }

    return this.settings.quitConfirmMessage;
  }

  save(options) {
    this.serverSideValidationErrors([]);

    return this.validate().then((isValid) => {
      if (isValid) {
        return this.saveInner(options);
      }

      return Promise.resolve();
    });
  }

  validate() {
    return this.validateInner()
      .then(isValid => {
        if (!isValid) {
          return this.prepareScreenForValidationErrors();
        }

        return Promise.resolve(true);
      });
  }

  validateInner() {
    return validationUtilities.validateObservables(this.validatedObservables);
  }

  toOutputModel( /*saveOptions*/) {
    return mappingUtilities.toJS(this.observableContent);
  }

  /* todo: extraire logique de isEqual pour contenu */

  hasModelChanged() {
    return this.isEqual(
      this.originalModelSnapshot(),
      this.takeCurrentModelSnapshot(),
      this.settings.tinymcePropertyNames,
      this.settings.alikeArraysPropertyNames
    ) === false;
  }

  isEqual(object, other, htmlPropertyNames, alikeArraysPropertyNames) {
    object = mappingUtilities.toJS(object);
    other = mappingUtilities.toJS(other);

    return JSON.stringify(other) === JSON.stringify(object);
  }

  /*************************************************************/


  takeCurrentModelSnapshot() {
    var modelSnapshot = this.toOutputModel(/* saveOptions */);
    return modelSnapshot;
  }

  takeOriginalModelSnapshot() {
    setTimeout(() => {
      this.originalModelSnapshot(this.takeCurrentModelSnapshot());
    }, 500);
  }
  
  getModelSnapshot() {
    return mappingUtilities.toJS(this.observableContent);
  }

  loadContent(id) {
    let apiEndpointUrl;

    if (id) {
      apiEndpointUrl = `${this.apiResourceName}/${id}`;
    }

    return this.loadContentInner(apiEndpointUrl);
  }

  loadLookups() {
    return Promise.resolve();
  }

  afterContentLoaded() {
    return Promise.resolve();
  }

  onContentLoaded(content) {
    return new Promise((resolve) => {
      this.updateObservableContent(content);
      this.takeOriginalModelSnapshot();
      resolve();
    });
  }

  updateObservableContent(content) {
    const adaptedContentFromServer = this.fromInputModel(content);

    ko.mapping.fromJS(adaptedContentFromServer, this.mapping, this.observableContent);
  }

  fromInputModel(inputModel) {
    return inputModel;
  }

  reload(id) {
    return this.loadContent(id)
      .then(() => this.afterContentLoaded())
      .then(() => koco.router.reload());
  }

  create(writeModel, options) {
    return this.api.fetch(this.apiResourceName, {
      method: 'POST',
      body: JSON.stringify(writeModel)
    })
      .then(data => this.onCreateSuccess(data, options))
      .catch(ex => this.onCreateFail(ex));
  }

  update(writeModel, options) {
    const id = this.getId();
    let url = `${this.apiResourceName}/${id}`;

    if (this.apiQueryParams) {
      // todo: why us $.param(.., true) here and false elsewhere?
      url = `${url}?${$.param(this.apiQueryParams, true)}`;
    }

    return this.api.fetch(url, {
      method: 'PUT',
      body: JSON.stringify(writeModel)
    })
      .then(data => this.onUpdateSuccess(id, data, options))
      .then(() => this.afterContentLoaded())
      .catch(ex => this.onUpdateFail(writeModel, id, ex));
  }

  onCreateSuccess(id, options) {
    this.isChangesWillBeLostConfirmationDisabled = true;
    toastr.success(this.settings.contentCreatedMessage);

    return this.reload(id).then(() => {
      const route = koco.router.context().route;

      if (route.url.indexOf(id) === -1) {
        const urlPartToReplace = `${this.apiResourceName}/edit`;

        const defaultOptions = {
          url: route.url.replace(new RegExp(urlPartToReplace, 'i'), `${urlPartToReplace}/${id}`),
          pageTitle: koco.router.context().pageTitle,
          stateObject: {},
          replace: true
        };

        koco.router.setUrlSilently(defaultOptions);
      }
    });
  }

  onUpdateFail(writeModel, id, ex) {
    if (ex.response) {
      switch (ex.response.status) {
        case 400:
          return this.handleServerValidationErrors(ex.response.body);

        case 406:
          return this.handleServerValidationErrors([ex.response.body]);

        case 409: // Version conflict
          return this.handleSaveConflict(writeModel, ex.response.body);

        default:
          return this.handleUnknownError(ex);
      }
    } else {
      return this.handleUnknownError(ex);
    }
  }

  onCreateFail(ex) {
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

  handleUnknownError(ex) {
    toastr.error(`${this.settings.unknownErrorMessage} ${ex}`);

    return Promise.resolve();
  }

  onUpdateSuccess(id /* , data */) {
    toastr.success(this.settings.contentUpdatedMessage);

    return this.loadContent(id);
  }

  handleSaveConflict( /* writeModel, conflictInfo */) {
    return Promise.resolve();
  }

  handleServerValidationErrors(errors) {
    // On affiche seulement les erreurs globales (key = '') pour l'instant
    // TODO: Vider les erreurs avant de commencer ?

    var finalErrors = [];

    for (var key in errors) {
      for (var key2 in errors[key]) {
        finalErrors.push(errors[key][key2]);
      }
    }

    if (arrayUtilities.isNotEmptyArray(finalErrors)) {
      this.serverSideValidationErrors(finalErrors);
      return this.prepareScreenForValidationErrors();
    }

    return Promise.resolve();
  }

  prepareScreenForValidationErrors() {
    return new Promise((resolve) => {
      toastr.error(this.settings.validationErrorsMessage);

      if (this.selectFirstTabWithValidationErrors) {
        this.selectFirstTabWithValidationErrors();
      }

      $('html, body').animate({
        scrollTop: 0
      }, () => {
        resolve(false);
      });
    });
  }

  selectFirstTabWithValidationErrors() {
    let panel = $('.tab-pane.active');

    if (!panel.length || !panel.find('.form-group.has-error').length) {
      panel = $('.form-group.has-error').closest('.tab-pane');
    }

    if (panel.length) {
      $(`.nav-tabs a[href="#${panel.attr('id')}"]`).click();
    } else {
      $('.nav-tabs a').first().click();
    }
  }

  finalize() {
    this.takeOriginalModelSnapshot();
    koco.router.navigating.subscribe(this.canNavigate, this);
    $(window).on('beforeunload.editpage', this.onBeforeUnload.bind(this));
  }

  dispose() {
    // this sucks... a dirty hack...
    if (!this.ignoreDispose) {
      this.disposeInner();
    }

    this.ignoreDispose = false;
  }

  disposeInner() {
    $(window).off('beforeunload.editpage');
    koco.router.navigating.unsubscribe(this.canNavigate, this);
    this.disposer.dispose();
  }

  saveInner(options) {
    const writeModel = this.toOutputModel(options);

    if (this.editMode() === 'create') {
      return this.create(writeModel, options);
    }

    return this.update(writeModel, options);
  }

  loadContentInner(apiEndpointUrl) {
    if (apiEndpointUrl) {
      let url = apiEndpointUrl;

      if (this.apiQueryParams) {
        // todo: why us $.param(.., true) here and false elsewhere?
        url = `${url}?${$.param(this.apiQueryParams, true)}`;
      }

      return this.api.fetch(apiEndpointUrl)
        .then((content) => this.onContentLoaded(content));
    }

    return Promise.resolve();
  }
}

export default ContentEditPageBaseViewModel;
