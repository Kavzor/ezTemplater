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