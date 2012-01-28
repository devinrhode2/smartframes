  if (buster(domain) === 'y') {
    
    //'y' means this is a frame buster or site that blocks framing
    altLoad(url);
    
  } else if (buster(domain) === 'n') {
    //'n' means this site has hit onload without problems, should never have a problem with this site.
    
    src(url);
    
    //dbl check headers blocking framing
    (function(url, domain){
      var xhr = new XMLHttpRequest();
      xhr.open('HEAD', url, true);
      xhr.onreadystatechange = function(){
        if ( xhr.readyState == 4 ) {
          if ( xhr.status == 200 ) {
            var resp = xhr.getResponseHeader('x-frame-options');
            if (resp !== null) { //it's null if header is not set.
              if (resp.indexOf('DENY') > -1 || resp.indexOf('SAMEORIGIN') > -1) {
                console.error('SITE CHANGED, DETECTED ON DBL CHK!')
                badGuy(domain);
                altLoad(url);
              }
            }
          } else {
            console.error('HEAD dbl check error. xhr:');
            console.error(xhr);
            if (xhr.status === 405) { //405, method not allowed.
              console.error('was added as bad site.');
              badGuy(domain);
            } else {
              console.error('was not added as bad site!');
            }
          }
        }
      };
      xhr.send(null);
    }(url, domain))
    
  } else if (buster(domain) === 'unknown') {
    
    //ooo! a new site scout hasn't seen yet.
    (function(url, domain){ //self calling function since we're attaching onreadystatechange and don't want the vars to change.
      var xhr = new XMLHttpRequest();
      
      //first we check if the headers block framing.
      xhr.open('HEAD', url, true);
      xhr.onreadystatechange = function(){
        if ( xhr.readyState == 4 ) {
          if ( xhr.status == 200 ) {
            console.error('HEAD request response:')
            console.error(xhr);
            console.error(xhr.getAllResponseHeaders());
            var reported = false;
            var resp = xhr.getResponseHeader('x-frame-options');
            if (resp !== null) {
              if (/deny/i.test(resp) || /sameorigin/i.test(resp)) {
              
                //report as blocking domain
                badGuy(domain);
                reported = true;
                
                //trigger altLoad immediately.
                //...if we are still seeking to load this page
                if (preview.url === url) {
                  altLoad(url);
                } else {
                  console.error('ABORTING load of ' + url + ' seems that ' + preview.url + ' needs to be loaded instead.');
                  console.groupEnd();
                  return;
                }
              }
            }
            
            if (preview.url !== url) {
              console.error('ABORTING load of ' + url + ' seems that ' + preview.url + ' needs to be loaded instead.');
              console.groupEnd();
              return;
            }
            
            //if headers are fine (not reported), proceed with caution.
            if (reported === false) {
               window.hitBeforeUnload = 'no';
               detectorLoop.prev = 'no';
               
               //attach onbeforeunload if javascript tries breaking the frame and going to the full site.
               window.onbeforeunload = function() {
               
                 //detectorLoop recognizes that hitBeforeUnload is now 'yes' 
                 //it then asks if this site directly triggered this popup.
                 hitBeforeUnload = 'yes';
                 
                 //note, this creates a popup before a frame bust.
                 return 'Click "LEAVE THIS PAGE" if trying to:\nA. Go back a page\nB. Reload\nC. Close tab/window, or\nD. Close Chrome? \n\nOtherwise, click "Stay on this Page" to keep Scout on the side and load a result on the right.';
               };
               iframe.onload = function () {
                 
                 //after a frame bust is attempted and the user clicks 'stay on this page' a onload occurs
                 //but we only want to add non-busting sites as nice sites ('n') onload
                 if (hitBeforeUnload === 'no') {
                   
                   //*sigh* this adds the domain as a nice site/good guy. After success, it pushes the update via pusher out to all clients.
                   GET('http://thescoutapp.com/smartframes/post.php?newsite=' + domain + '&buster=n', function(obj){
                     console.error('requested addition of nice domain. Reponse: ' + obj);
                   });
                 }
         
                 loading('done');//fade out loading notification
                 
                 //wrap errors and warnings.
                 console.groupEnd();
                 
                 //null out onbeforeunload so we don't have un-necessary popups when they close the tab
                 window.onbeforeunload = null;
               };
               
               //finally, set the iframe src and hopefully we just hit onload with no issues!
               src(url);
            }
          } else {
          
            //if not 200 response, report and just altLoad that SOB!
            badGuy(domain);
            altLoad(url);
          }
        }
      };
      xhr.send(null);//(trigger HEAD request)
    }(url, domain))
    
  } else {
    alert('buster did not return \'y\', \'n\', or \'unknown\' but instead: ' + buster(domain));
    console.error(buster(domain));
  }
}

window.hitBeforeUnload = false;
detectorLoop.prev = 'no';
function detectorLoop() {
  if (detectorLoop.prev === 'no'  && hitBeforeUnload === 'yes') {
    var maybe = prompt('Were you trying to leave this page or close the tab, or did opening this result itself create a popup asking if you wanted to leave? \n\nIf the website created this popup, please enter \'y\' and it will be loaded in a manner that avoids this.\n\n IF YOU ARE UNSURE: just hit Ok and you can continue searching.', '');
    if (maybe === 'y') {
      GET('http://thescoutapp.com/smartframes/post.php?newsite=' + window.domain + '&buster=y', function(obj){
        console.error('user entered \'y\', sent request to add bad site. The response:');
        console.error(obj);
      });
    }
    detectorLoop.prev = hitBeforeUnload;
    window.onbeforeunload = null;
    setTimeout(detectorLoop, 300);
  } else {
  
    //just keep watching for a change!
    setTimeout(detectorLoop, 300);
  }
}
detectorLoop();

function badGuy(url) {
  if (typeof url === 'undefined') {
    url = preview.url;
    console.error('using preview.url to add a badGuy/buster');
  }
  GET('http://thescoutapp.com/smartframes/post.php?newsite=' + url + '&buster=y', function(obj){
    console.error(obj);
  });
}

//domain to be added to database..
function domainForDatabase(url) {
  //remove first 7 characters. The uniqueness of the 's' in https is preserved because a / will start the url. 
  url = url.substr(7, url.length);
  
  //cut off everything beyond the domain name
  url = url.substr(0, url.indexOf('/', 4));
  return url;
}
