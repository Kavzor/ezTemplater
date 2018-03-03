function getTemplate(path, callback) {
  var ajax = new XMLHttpRequest();
  ajax.onreadystatechange = function() {
    if(this.readyState === 4 && this.status === 200){
      callback(this.response);
    }
  }
  ajax.open('GET', path);
  ajax.send();
}


function Template(template) {
  this.format = template.format;
  this.data = template.data;
  this.properties = template.properties;
 
  this.format = this.format.replace(/\n/g, "");
  this.format = this.format.split(/\s+/).join(" ");
  this.format = this.format.replace(/{{ /g, "{{").replace(/ }}/g, "}}");
  
  this.skeleton = this.format;
 
}

Template.prototype.ready = function(callback) {
  callback(this.data);
}

Template.prototype.holder = function(element) {
  this.element = document.querySelector(element);
  return this;
}

Template.prototype.preload = function() {
  this.refreshContent();
  return this;
}

Template.prototype.getData = function() {
  return this.data;
}

Template.prototype.refreshContent = function() {
  this.format = this.skeleton;
  this.properties.forEach(property => {
    let value = this.data;
    /*try{
      console.log("var " + property.split(".")[0] + " = JSON.parse(" + this.data + ");");
      //eval("var " + property.split(".")[0] + " = JSON.parse(" + this.data + ");");
    }
    catch(err){
      //console.log(err);
    }*/
    if(isTenary(property)){
      value = eval(property);
    }
    else {
      let parts = property.split(".");
      parts.forEach(part => {
        value = value[part];
      });
    }
    this.putContent(property, value);
  });
  this.element.innerHTML = this.format;
}

Template.prototype.putContent = function(property, value) {
  this.format = this.format.replace("{{" + property + "}}", value);
}

function isTenary(expression){
  console.log(expression);
  var firstSpecialChar = expression.indexOf("?");
  var secondSpecialChar = expression.indexOf('"');
  var thirdSpecialChar = expression.indexOf(":");
  if(firstSpecialChar !== -1 && secondSpecialChar !== -1 && thirdSpecialChar !== -1){
    return (firstSpecialChar < secondSpecialChar && secondSpecialChar < thirdSpecialChar);
  }
  else {
    return false;
  }
}


function extractProperties(template) {
  let properties = template.split("{{").join("}}").split("}}");
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

function loadHolder(holder, data, callback) {
  var srcPath = "static/";
  var preload = false;
  var config = data.configuration;
  if(config) {
    srcPath = config.srcPath == undefined ? srcPath : config.srcPath;
    preload = config.preload;
    callback = config.ready == undefined ? callback : config.ready;
  } 
  getTemplate(`${srcPath}${holder}.html`, template => {
    var template = load(template, data).holder(holder);
    if(preload) {
      template.preload();
    }
    if(callback) {
      callback(template);
    }
  });
}

function load(skeleton, data){
  let properties = extractProperties(skeleton);
  return new Template({
    properties: properties,
    format: skeleton,
    data: data
  });
}

