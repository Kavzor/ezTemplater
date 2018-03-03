# ezTemplater
Provided to you by Jakob Rolandsson as a mean to easily insert text into template-alike html files. 


## Current version
This version does not support anything but inserting text. Planning to expand to tenary expressions later on but currenly that's put on hold.


## Example usage
index.html
```html
<body>
  <app-header></app-header>

  <script src="src/js/template.js"></script>
  <script src="src/js/app.js"></script>

</body>
```

static/app-header.html
```html
<header>
  {{ person.name }} {{ person.age }} year: {{ person.year.month }} {{thing.bla}}
</header>
```

With configuration
app.js
```javascript
prepareTemplate('app-header', {
  configuration: {      //configuration is optional
    preload: true,
    srcPath: "static/",
    ready: template => {
      console.log(template);
    }
  },
  person: {
    name: 'Jakob',
    age: 21,
    year: {
      month: 12
    }
  },
  thing : {
    bla: "hej"
  }
});
```
Without configuration
```javascript
prepareTemplate('app-header', {
  person: {
    name: 'Jakob',
    age: 21,
    year: {
      month: 12
    }
  },
  thing : {
    bla: "hej"
  }
}, template => {
  template.refreshContent(); //Must be called anytime you change data in the template
  console.log(template.data); //template.data lets you access all the data that you set and manipulate it

  var person = template.data.person;
  person.name = "Anders"; //Changes the name of person object
  template.refreshContent(); //Must be called to refresh content
});

```
### defaults
A goal with ezTemplater is that it's optional whatever you want to do the configurations yourself or let ez do it for you
- preload is default false
- srcPath is default /static/ with .html as extension
- callback is required to work with the template, you either define it with configuration as "ready" property or use it as a third paramter without the optional configuration
- currently (to enforce best practise) the name of the template is required to match the element selector, e.g. if you want a &lt;**flight-description**&gt;&lt;/flight-description&gt; template you are required to have a template file called **flight-description**.html