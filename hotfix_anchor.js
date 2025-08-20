// SwipeTree Anchor Hotfix
(function(){
  const origGetImage = window.getImageSrc || function(id){
    return id + ".jpg";
  };

  window.getImageSrc = function(id){
    if(!id) return "placeholder.jpg";
    let str = id.toString();
    // Legacy safeguard: if input looks too short, normalize length
    if(str.length < 6){
      str = str.padEnd(6,"0");
    }
    return str + ".jpg";
  };
})();