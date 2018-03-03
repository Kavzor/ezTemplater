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
