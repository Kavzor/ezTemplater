var header = loadHolder('app-header', {
  configuration: {
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
