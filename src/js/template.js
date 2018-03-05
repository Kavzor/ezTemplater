'use strict';


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

var ezTemplate = (function() {
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

  function loadFromExternalSource(config, ezTemplate){
    getExternal(config.path, skeleton => {
      config.skeleton = format(skeleton);
      var template = buildEzTemplate(ezTemplate).config(config).build();
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

function buildEzTemplate(template){
  return new EzTemplate(template);
}

function EzTemplate(template) {
  this.element = template.element;
  this.index = template.index;
  this.data = template.data;
  this.proxy = new Proxy(this, getLiveHandler(this));
} 

EzTemplate.prototype.config = function(config){
  this.config = config;
  return this;
}

EzTemplate.prototype.build = function() {
  this.loadSettings();
  return this;
}

function getLiveHandler(parent) {
  return {
    get(target, key) {
      if (typeof target[key] === 'object' && target[key] !== null) {
        return new Proxy(target[key], getLiveHandler(parent));
      } else {
        return target[key];
      }
    },
    set: function(object, property, value) {
      object[property] = value;
      parent.refreshContent();
    }
  }
}

function toBoolean(string) {
  return string == 'true';
}

EzTemplate.prototype.loadSettings = function() {
  var preload = this.config.preload;
  if(typeof preload === 'string') {
    preload = toBoolean(preload);
  }
  if(preload) {
    this.refreshContent();
  }
}

EzTemplate.prototype.putContent = function(rawContent, property, value) {
   return rawContent.replace("{{" + property + "}}", value);
}

EzTemplate.prototype.refreshContent = function() {
  this.element.innerHTML = this.config.skeleton;
  this.handleDeepProperties(this.element.getElementsByTagName('*'));
}

EzTemplate.prototype.handleDeepProperties = function(childElements) {
  for(let index = 0; index < childElements.length; index++) {
    var childElement = childElements[index];
    var content = childElement.firstChild.nodeValue;

    var forAttribute = childElement.getAttribute('.for');
    if(forAttribute !== null) {
      forAttribute = forAttribute.replace(/ /g, "").split("_");
/*
      var arrayStartIndex = forAttribute.lastIndexOf(' ');
      var arrayName = forAttribute.substr(arrayStartIndex).trim();

      var propertyStartIndex = forAttribute.indexOf(' ');
      var propertyName = forAttribute.substr(propertyStartIndex).trim();
      var propertyEndIndex = propertyName.indexOf(' ');
      var propertyName = propertyName.substr(0, propertyEndIndex);
*/
      var indexName = forAttribute[2];
      var arrayName = forAttribute[1];
      var propertyName = forAttribute[0];
      var childContent = childElement.innerHTML;
      while (childElement.firstChild) childElement.removeChild(childElement.firstChild); //empty childElement
      
      var properties = extractProperties(childContent);
      this.data[arrayName].forEach(value => {
        properties.forEach(property => {
          let parts = property.split(".");
          let item = value;
          parts.forEach(part => {
            if(part !== propertyName){
              item = item[part];
            }
          });
          childContent = childContent.replace('{{' + property + '}}', item);
        });
        childElement.innerHTML += childContent; 
      });
    }
    else {
      var properties = extractProperties(childElement.firstChild.nodeValue);
      properties.forEach(property => {
        let value = this.data;
        
        let parts = property.split(".");
        parts.forEach(part => {
          if(value !== undefined){
            value = value[part];
          }
        });

        content = this.putContent(content, property, value);
        childElement.firstChild.nodeValue = content;
      });
    }
  } 
}