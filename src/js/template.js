'use strict';



var ezTemplate = (function() {
  const TRIES_THRESHOLD = 200;
  var templates = new Array();

  function getExternalTemplate(path, callback) {
    var ajax = new XMLHttpRequest();
    ajax.onreadystatechange = function() {
      if(this.readyState === 4 && this.status === 200){
        callback(this.response);
      }
    }
    ajax.open('GET', path);
    ajax.send();
  }

  function getConfigurations(template, element) {
    var configurations = {}
    var jsConfigurations = template.configuration;
    jsConfigurations = jsConfigurations === undefined ? {} : jsConfigurations;

    var jsPreload = jsConfigurations.preload;
    var elPreload = element.getAttribute('.preload');
    configurations.preload = jsPreload === undefined ? elPreload : jsPreload;
    configurations.preload = configurations.preload === null ? true : configurations.preload;
    
    var jsPath = jsConfigurations.path;
    var elPath = element.getAttribute('.path');
    configurations.path = jsPath === undefined ? elPath : jsPath;
    configurations.path = configurations.path == null ? 'static/' + element.tagName.toLowerCase() + '.html' : configurations.path;

    return configurations;
  }

  var inflate = function(selector, template) {
    var element = document.querySelector(selector);
    var config = getConfigurations(template, element);

    var templateIndex = templates.push({tagName: element.tagName.toLowerCase()}) - 1;
    
    config.templateIndex = templateIndex;

    loadFromExternalSource(config, {
      element: element,
      data: template.data,
      ready: template.ready
    });
  }

  function loadFromExternalSource(config, template){
    getExternalTemplate(config.path, skeleton => {
      var index = config.templateIndex;
      template.skeleton = skeleton;
      templates[index].template = new EzTemplate(template);
      
      if(typeof config.preload === 'string') {
        config.preload = (config.preload == "true");
      }
      if(config.preload) {
        templates[index].template.refreshContent();
      }
    });
  }

  var getWhenReady = function(target, whenReady, tries = 0) {
    var ezTemplate = templates.find(template => {
      return template.tagName.toLowerCase() === target;
    });
    if(ezTemplate.template === undefined){
      setTimeout(() => {
        if (tries > TRIES_THRESHOLD) {
          throw `Could not find '${target}', check your spelling`;
        }
        else {
          getWhenReady(target, whenReady, ++tries);
        }
      }, 10);
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



let handler = {
  get(target, key) {
    if (typeof target[key] === 'object' && target[key] !== null) {
      return new Proxy(target[key], handler);
    } else {
      return target[key];
    }
  },
  set: function(object, property, value) {
    object[property] = value;
  }
}

function extractUsedProperties(skeleton){
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

function EzTemplate(template) {
  this.element = template.element;
  this.ready = template.ready;
  this.data = new Proxy(template.data, handler);

  //make template more code friendly by removing most whitespaces and line-breaks
  template.skeleton = template.skeleton.replace(/\n/g, "");
  template.skeleton = template.skeleton.split(/\s+/).join(" ");
  template.skeleton = template.skeleton.replace(/{{ /g, "{{").replace(/ }}/g, "}}");
  
  this.skeleton = template.skeleton;
  this.properties = extractUsedProperties(this.skeleton);
} 

EzTemplate.prototype.putContent = function(rawContent, property, value) {
   return rawContent.replace("{{" + property + "}}", value);
}


EzTemplate.prototype.refreshContent = function() {
  console.log(this.skeleton);
  this.element.innerHTML = this.skeleton;
  this.handleDeepProperties(this.element.getElementsByTagName('*'));
  /*this.properties.forEach(property => {
    let value = this.data;
    
    let parts = property.split(".");
    parts.forEach(part => {
      value = value[part];
    });
  
    this.putContent(property, value);
  });
  expandOnFor(this.element.querySelector('*'));*/
}

EzTemplate.prototype.handleDeepProperties = function(childElements) {
  for(let index = 0; index < childElements.length; index++) {
    var childElement = childElements[index];
    var content = childElement.firstChild.nodeValue;

    var forAttribute = childElement.getAttribute('.for');
    if(forAttribute !== null) {
      var arrayStartIndex = forAttribute.lastIndexOf(' ');
      var arrayName = forAttribute.substr(arrayStartIndex).trim();

      var propertyStartIndex = forAttribute.indexOf(' ');
      var propertyName = forAttribute.substr(propertyStartIndex).trim();
      var propertyEndIndex = propertyName.indexOf(' ');
      var propertyName = propertyName.substr(0, propertyEndIndex);

      var childContent = childElement.innerHTML;
      while (childElement.firstChild) childElement.removeChild(childElement.firstChild); //empty childElement
      var properties = extractUsedProperties(childContent);

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
      this.properties.forEach(property => {
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