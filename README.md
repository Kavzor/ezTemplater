# ezTemplater
Provided to you by Jakob Rolandsson as a mean to easily insert text into template-alike html files. 


## Current version
This version does not support anything but inserting text. Planning to expand to tenary expressions later on but currenly that's put on hold.


## Example usage

### with html configuration
index.html
```html
<body>
  <!-- turn off preload to prevent auto-loading, default is true -->
  <app-header .path="static/app-header.html" .preload="true"></app-header> 

  <script src="src/js/template.js"></script>
  <script src="src/js/app.js"></script>

</body>
```

static/app-header.html
```html
<header>
  {{ person.name }} {{ person.details.age }}
  
  //next version will use syntax "fruit : fruites" rather than the full declaration
  <ul .for="let fruit of fruites">
    <li>{{fruit.age}} : {{fruit.name}}</li>
  </ul>
</header>


<div .for="let fruit of fruites">
  <a href="{{fruit.name}}">{{fruit.name}}</a>
</div>
```

app.js
```javascript
ezTemplate.inflate('app-header', {
  data: {
      person: {
      name: "jakob",
      details: {
        age: 21
      }
    },
    car: {
      drovn: 20
    },
    fruites: [
      {
        name: 'apple',
        age: 32
      },
      {
        name: 'pineapple',
        age: 12
      }
    ]
  }
});

//Will be called when the template is fully instansiated
ezTemplate.getWhenReady('app-header', (template) => {
  var person = template.data.person;
  person.name = "anders";

  //Must be called to reflect changes, working to automate the process with proxies
  template.refreshContent();
});
```
### With JS configurations (same header template)
index.html
```html
<body>
  <!-- turn off preload to prevent auto-loading, default is true -->
  <app-header></app-header> 

  <script src="src/js/template.js"></script>
  <script src="src/js/app.js"></script>

</body>
```


```javascript
ezTemplate.inflate('app-header', {
  data: {
      person: {
      name: "jakob",
      details: {
        age: 21
      }
    },
    car: {
      drovn: 20
    },
    fruites: [
      {
        name: 'apple',
        age: 32
      },
      {
        name: 'pineapple',
        age: 12
      }
    ]
  },
  configuration: {
    preload: true,   //change to false to preload content or de-comment template.refreshContent() below
    path: 'static/app-header.html' //Default is tagname + .html under static folder
  }
});

ezTemplate.getWhenReady('app-header', (template) => {
  var person = template.data.person;
  person.name = "anders";

  //template.refreshContent();
});
```
### defaults
A goal with ezTemplater is that it's optional whatever you want to do the configurations yourself or let ez do it for you
- preload is default true
- path is default /static/ + tagname with .html as extension
- You can use getWhenReady whenever you want, it isn't required to inflate content, only to manipulate data
- Configurations may be done in html or js, or both (js has highest priority since it's best-practise)