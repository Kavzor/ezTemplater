'use strict';

function isForElement(element) {
  return element.getAttribute('.for') !== null;
}

function isFormElement(element) {
  return element.getAttribute('.model') !== null;
}

function toBoolean(string) {
  return string == 'true';
}

function getExternal(path, callback) {
  var ajax = new XMLHttpRequest();
  ajax.onreadystatechange = function() {
    if(this.readyState === 4 && this.status === 200){
      callback(this.response);
    }
  }
  ajax.open('GET', path);
  ajax.send();
}

function extractProperties(skeleton){
  let properties = skeleton.split("{{").join("}}").split("}}");
  properties = properties.filter(property => {
    return (property.indexOf("<") === -1 
            && property.indexOf(">") === -1
            && property.trim().length > 0)
            && property.indexOf(".") !== -1;
  });
  properties = properties.map(property => {
    return property.trim();
  });
  return properties;
}

function format(skeleton) {
  //make template more code friendly by removing most whitespaces and line-breaks
  skeleton = skeleton.replace(/\n/g, "");
  skeleton = skeleton.split(/\s+/).join(" ");
  skeleton = skeleton.replace(/{{ /g, "{{").replace(/ }}/g, "}}");
  return skeleton;  
}

var ez = (function() {
  const TRIES_THRESHOLD = 200;
  const TRIES_DELAY     = 10;
  var templates         = new Array();
  
  function updateReadyTemplates(template) {
    templates[template.index].template = template; 
  }

  var ezConfiguration = (function() {
    const DEFAULT_FILE_EXTENSION  = '.html';
    const DEFAULT_FOLDER          = 'static/';
    const DEFAULT_PRELOAD         = true;
    const ATTRIBUTE_PRELOAD       = '.preload';
    const ATTRIBUTE_PATH          = '.path';
    const ATTRIBUTE_FOR           = '.for';

    var getConfig = function(config, element) {
      var jsConfig = new JsConfiguration(config);
      var htmlConfig = new HTMLConfiguration(element);
      var preload = jsConfig.preload !== undefined ? jsConfig.preload : htmlConfig.preload;
      preload = preload !== null ? preload : DEFAULT_PRELOAD;

      var path = jsConfig.path !== undefined ? jsConfig.path : htmlConfig.path;
      path = path !== null ? path : DEFAULT_FOLDER + htmlConfig.tagName + DEFAULT_FILE_EXTENSION;

      var tagName = htmlConfig.tagName;
      
      return {
        preload: preload,
        path: path,
        tagName: tagName
      }
    }

    function JsConfiguration(jsConfig) {
      if(jsConfig !== undefined) {
        this.preload = jsConfig.preload;
        this.path = jsConfig.path;
      }
    }

    function HTMLConfiguration(element) {
      this.preload = element.getAttribute(ATTRIBUTE_PRELOAD);
      this.path = element.getAttribute(ATTRIBUTE_PATH);
      this.tagName = element.tagName.toLowerCase();
    }

    return {
      getConfig: getConfig
    }

  })();

  var inflate = function(selector, template) {
    var element = document.querySelector(selector);
    var config = ezConfiguration.getConfig(template.configuration, element);
    var templateIndex = templates.push({tagName: config.tagName}) - 1;
    var ezTemplate = {
      element: element,
      data: template.data,
      index: templateIndex
    }
    loadFromExternalSource(config, ezTemplate);
  }

  function loadFromExternalSource(config, template){
    getExternal(config.path, skeleton => {
      config.skeleton = format(skeleton);
      template = ezTemplate.build(template).config(config).load();

      updateReadyTemplates(template);
    });
  }

  var getWhenReady = function(target, whenReady, tries = 0) {
    var ezTemplate = templates.find(template => {
      return template.tagName === target;
    });
    if(ezTemplate.template === undefined){
      setTimeout(() => {
        if (tries > TRIES_THRESHOLD) {
          throw `Could not find '${target}', check your spelling`;
        }
        else {
          getWhenReady(target, whenReady, ++tries);
        }
      }, TRIES_DELAY);
    }
    else {
      whenReady(ezTemplate.template);
    }
  }

  return {
    inflate: inflate,
    getWhenReady: getWhenReady
  }
})();


var ezParser = (function() {
  const TYPE_FOR = "element_for";
  const TYPE_TEXT = "element_text";
  const TYPE_FORM = "element_form";

  var prepare = function(ezTemplate) {
    return new EzParser(ezTemplate);
  }

  function EzParser(ezTemplate) {
    this.ezTemplate = ezTemplate;
    this.forExpressions = new Array();
    this.textExpressions = new Array();
    this.eventExpressions = new Array();
    this.formExpressions = new Array();
  }

  EzParser.prototype.addElement = function(type, element) {
    switch(type) {
      case TYPE_FOR: 
        this.forExpressions.push(element);
      break;
      case TYPE_TEXT: 
        this.textExpressions.push(element);
      break;
      case TYPE_FORM:
        this.formExpressions.push(element);
      break;
    }
  }

  return {
    prepare: prepare,
    TYPE_FOR: TYPE_FOR,
    TYPE_TEXT: TYPE_TEXT,
    TYPE_FORM: TYPE_FORM
  }
  
})();

var ezPage = (function() {
  function putTextContent(data, properties, content, reference) {
    properties.forEach(property => {
      let parts = property.split(".");
      let value = data;
      parts.forEach(part => {
        if(part !== reference) {
          value = value[part];
        }
      });
        content = content.replace('{{' + property + '}}', value);
    });
    return content;
  }

  var refreshForElements = function(forExpressions) {
    forExpressions.forEach(forExpression => {
      var element = forExpression.element;
      var name = forExpression.array.name;
      var reference = forExpression.array.reference;
      var properties = forExpression.properties;
      var data = forExpression.data;
      let content = forExpression.skeleton;

      while (element.firstChild) element.removeChild(element.firstChild); //empty childElement


      data.forEach(value => {
        var rowValue = putTextContent(value, properties, content, reference);
        element.innerHTML += rowValue;
      });
    });
  }

  var refreshTextElements = function(textExpressions) {
    textExpressions.forEach(textExpression => {
      textExpression.element.firstChild.nodeValue = textExpression.skeleton;
      
      var data = textExpression.data;
      var properties = textExpression.properties;
      var element = textExpression.element;
      var content = textExpression.element.firstChild.nodeValue;
    

      textExpression.element.firstChild.nodeValue = putTextContent(data, properties, content);
    });
  }

  return {
    refreshTextElements: refreshTextElements,
    refreshForElements: refreshForElements
  }
})();



var ezTemplate = (function() {
  const ARRAY_VAR_POS   = 0;
  const ARRAY_NAME_POS  = 1;
  const ARRAY_INDEX_POS = 2;
  
  var build = function(template){
    return new EzTemplate(template);
  }
  
  function EzTemplate(template) {
    this.element = template.element;
    this.index = template.index;
    this.data = template.data;
    this.proxy = new Proxy(this, this.getDataHandler());
    this.parser = ezParser.prepare(this);
    this.ezIndex = 0;
  } 
  EzTemplate.prototype.config = function(config){
    this.config = config;
    return this;
  }
  EzTemplate.prototype.load = function() {
    this.element.innerHTML = this.config.skeleton; //load elements, else you won't be able to parse
    this.prepareParser(this.element.getElementsByTagName('*'));
    this.loadSettings();
    return this;
  }
  
  EzTemplate.prototype.loadSettings = function() {
    var preload = this.config.preload;
    if(typeof preload === 'string') {
      preload = toBoolean(preload);
    }
    if(preload) {
      this.refreshAll();
    }
  }
  
  EzTemplate.prototype.refreshAll = function() {
    ezPage.refreshForElements(this.parser.forExpressions);
    ezPage.refreshTextElements(this.parser.textExpressions);
  }
  EzTemplate.prototype.handleFormElements = function(model, elements) {
    for(let index = 0; index < elements.length; index++) {
      var element = elements[index];
      var name = element.getAttribute('name');
      if(name !== null) {
        console.log(this.data[model][name]);
      }
    }
  }

  EzTemplate.prototype.prepareParser = function(childElements) {
    for(let index = 0; index < childElements.length; index++) {
      let childElement = childElements[index];
      if(isFormElement(childElement)) {
        let formAttribute = childElement.getAttribute('.model');
        let formElements = childElement.getElementsByTagName('*');
        index += formElements.length;
        this.handleFormElements(formAttribute, formElements);
      }
      else {
        let content = isForElement(childElement) ? childElement.innerHTML : childElement.firstChild.nodeValue;
        let properties = extractProperties(content);
    
        if(isForElement(childElement)) {
          let forAttribute = childElement.getAttribute('.for');
          index += childElement.childElementCount;
    
          forAttribute = forAttribute.replace(/ /g, "").split("/");
          this.parser.addElement(ezParser.TYPE_FOR, {
            element: childElement,
            skeleton:   childElement.innerHTML,
            properties: properties,
            ezIndex:    this.ezIndex++,
            data:       this.data[forAttribute[ARRAY_NAME_POS]],
            array: {
              name:       forAttribute[ARRAY_NAME_POS],
              reference:  forAttribute[ARRAY_VAR_POS],
              index:      forAttribute[ARRAY_INDEX_POS]
            }
          });
        }
        else {
          this.parser.addElement(ezParser.TYPE_TEXT, {
            element: childElement,
            data: this.data,
            properties: properties,
            skeleton: content,
            ezIndex: this.ezIndex++
          });
        }
      
      }
    }
  }
  
  EzTemplate.prototype.getDataHandler = function() {
    var ezTemplate = this;
    return {
      get(target, key) {
        if (typeof target[key] === 'object' && target[key] !== null) {
          return new Proxy(target[key], ezTemplate.getDataHandler());
        } else {
          return target[key];
        }
      },
      set: function(object, property, value) {
        object[property] = value;
        ezTemplate.refreshAll();
      }
    }
  }

  return {
    build: build
  }
})();