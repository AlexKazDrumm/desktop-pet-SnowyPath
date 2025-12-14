(function(){
  var fs=require('fs');
  var path='src/scenes/road/hitchhiker-event.js';
  var text=fs.readFileSync(path,'utf8').split('\n');
  function rep(lineNo, find, replace){
    var i=lineNo-1;
    if(text[i].includes(find)) text[i]=text[i].replace(find,replace);
  }
  rep(137,'label: "', 'label: "');
  rep(201,'label: "', 'label: "');
})();
