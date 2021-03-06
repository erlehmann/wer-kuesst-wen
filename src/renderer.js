(function(){

  Renderer = function(canvas){
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d");
    var gfx = arbor.Graphics(canvas)
    var particleSystem = null

    var that = {
      init:function(system){
        particleSystem = system
        particleSystem.screenSize(canvas.width, canvas.height)
        particleSystem.screenPadding(80, 60, 20, 60)

        that.initMouseHandling()
      },

      redraw:function(){
        if (!particleSystem) return

        gfx.clear() // convenience ƒ: clears the whole canvas rect

        // draw the nodes & save their bounds for edge drawing
        var nodeBoxes = {}
        particleSystem.eachNode(function(node, pt){
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords

          // determine the box size and round off the coords if we'll be
          // drawing a text label (awful alignment jitter otherwise...)
          var label = node.data.names[0]||"unbekannt"
          var w = ctx.measureText(""+label).width + 10
          if (!(""+label).match(/^[ \t]*$/)){
            pt.x = Math.floor(pt.x)
            pt.y = Math.floor(pt.y)
          }else{
            label = null
          }

          $.each(node.data.urls, function(index, url) {
            // try to set profile picture if not there
            if (typeof node.data.img === typeof undefined){
              var img_url
              var icon_url

              // FIXME: inefficient placement of this code
              String.prototype.endsWith = function (s) {
                return this.length >= s.length && this.substr(this.length - s.length) == s;
              }

              parseUri.options.strictMode = true
              var parseResult = parseUri(url)

              if (parseResult.host.endsWith('facebook.com')){
                var fb_id = parseResult.file
                img_url = 'https://graph.facebook.com/' + fb_id + '/picture'
                icon_url = 'img/facebook.png'
              }

              if (parseResult.host.endsWith('twitter.com')){
                var tw_id = parseResult.file
                img_url = 'http://api.twitter.com/1/users/profile_image/' + tw_id
                icon_url = 'img/twitter.png'
              }

              if (typeof img_url === 'string'){
                var img = new Image()
                img.src = img_url
                node.data.img = img
              }

              if (typeof icon_url === 'string'){
                var icon = new Image()
                icon.src = icon_url
                node.data.icon = icon
              }

              // horrible hack to prevent over 9000 requests
              if ((typeof node.data.img_loading === typeof undefined) &&
                  (typeof node.data.img === typeof undefined)) {
                node.data.img_loading = true
                // i am repeating myself here (similar code also appears in halfviz.js)
                var g_url = 'https://socialgraph.googleapis.com/lookup?&q=' + url
                $.getJSON(g_url + '&callback=?', function(json){
                  try {
                    var canonical_url = json.canonical_mapping[url]
                    var img_url = json.nodes[canonical_url].attributes.photo

                    if (typeof img_url === 'string'){
                      var img = new Image()
                      img.src = img_url
                      node.data.img = img
                    }
                  } catch(e){
                    // pass if property is not there
                  }
                })
              }

            }
          })

          var img = node.data.img
          if (typeof img !== typeof undefined){
            ctx.drawImage(img, pt.x-24, pt.y-60, 48, 48)
          }

          var icon = node.data.icon
          if (typeof icon !== typeof undefined){
            ctx.drawImage(icon, pt.x-24, pt.y-(icon.height+12), 16, 16)
          }

          // draw a rectangle centered at pt
          if (node.data.color) ctx.fillStyle = node.data.color
          else ctx.fillStyle = "rgba(0,0,0,.8)"
          if (node.data.color=='none') ctx.fillStyle = "white"

          if (node.data.shape=='dot'){
            gfx.oval(pt.x-w/2, pt.y-w/2, w,w, {fill:ctx.fillStyle})
            nodeBoxes[node.name] = [pt.x-w/2, pt.y-w/2, w,w]
          }else{
            gfx.rect(pt.x-w/2, pt.y-10, w,20, 4, {fill:ctx.fillStyle})
            nodeBoxes[node.name] = [pt.x-w/2, pt.y-11, w, 22]
          }

          // draw the text
          if (label){
            ctx.font = "12px Helvetica"
            ctx.textAlign = "center"
            ctx.fillStyle = "white"
            if (node.data.color=='none') ctx.fillStyle = '#333333'
            ctx.fillText(label||"", pt.x, pt.y+4)
            ctx.fillText(label||"", pt.x, pt.y+4)
          }

        })


        // draw the edges
        particleSystem.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords

          var weight = edge.data.weight
          var color = edge.data.color

          if (!color || (""+color).match(/^[ \t]*$/)) color = null

          // find the start point
          var tail = intersect_line_box(pt1, pt2, nodeBoxes[edge.source.name])
          var head = intersect_line_box(tail, pt2, nodeBoxes[edge.target.name])

          ctx.save()
            ctx.beginPath()
            ctx.lineWidth = (!isNaN(weight)) ? parseFloat(weight) : 1
            ctx.strokeStyle = (color) ? color : "rgba(0,0,0,.8)"
            ctx.fillStyle = null

            ctx.moveTo(tail.x, tail.y)
            ctx.lineTo(head.x, head.y)
            ctx.stroke()
          ctx.restore()

          // draw an arrowhead if this is a -> style edge
          if (edge.data.directed){
            ctx.save()
              // move to the head position of the edge we just drew
              var wt = !isNaN(weight) ? parseFloat(weight) : 1
              var arrowLength = 6 + wt
              var arrowWidth = 2 + wt
              ctx.fillStyle = (color) ? color : "#cccccc"
              ctx.translate(head.x, head.y);
              ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));

              // delete some of the edge that's already there (so the point isn't hidden)
              ctx.clearRect(-arrowLength/2,-wt/2, arrowLength/2,wt)

              // draw the chevron
              ctx.beginPath();
              ctx.moveTo(-arrowLength, arrowWidth);
              ctx.lineTo(0, 0);
              ctx.lineTo(-arrowLength, -arrowWidth);
              ctx.lineTo(-arrowLength * 0.8, -0);
              ctx.closePath();
              ctx.fill();
            ctx.restore()
          }

        })



      },
      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        selected = null;
        nearest = null;
        var dragged = null;
        var oldmass = 1

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            selected = nearest = dragged = particleSystem.nearest(_mouseP);

            if (dragged.node !== null) dragged.node.fixed = true

            $(canvas).bind('mousedown', handler.metadataUpdate)
            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)

            return false
          },

          metadataUpdate:function(e){
            var node = nearest.node
            $('#node_names').val(node.data.names.join('\n'))
            $('#node_urls').val(node.data.urls.join('\n'))
            $('.selected_name').text(node.data.names[0])

            $('#update_node').attr('disabled', 'disabled')
            $('#remove_node').removeAttr('disabled')
            $('#clear_text').removeAttr('disabled')
            $('#show_edge_form').removeAttr('disabled')

            var adjacentNodes = sys.getAdjacentNodes(node)
            $('#relationship-list').empty()

            $.each(adjacentNodes, function(index){
              var adjacentNode = adjacentNodes[index]
              var name = adjacentNode.data.names[0]

              $('#relationship-list').append('<li><img height=48 width=48 src="' + adjacentNode.data.img.src +'" alt="' + name + '">' + '<b>' + name + '</b>' + '<button class="btn remove_edge" data-name="' + name + '">Entfernen</button>')
            })

            if(adjacentNodes.length == 0){
              $('#relationship-list').append('<li><img src="img/foreveralone.png" alt="Für immer allein."><b>Niemand</b>')
            }

            var favoriteNodes = sys.getAdjacentNodeFavorites(node)
            $('#analysis-table').empty()

            $.each(favoriteNodes, function(name, count){
              var favoriteNode = sys.getNode(name)
              var percentage = (count/adjacentNodes.length)*100

              $('#analysis-table').append(
                '<tr><td>' + favoriteNode.data.names[0] + '</td><td>' + count + '</td><td>' + Math.round(percentage) + '%</td></tr>'
              )
            })

          $("#analysis-table").parent().trigger("update")

            return false
          },

          dragged:function(e){
            var old_nearest = nearest && nearest.node._id
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (!nearest) return
            if (dragged !== null && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null
            selected = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            _mouseP = null
            return false
          }
        }
        $(canvas).mousedown(handler.clicked);

      }

    }

    // helpers for figuring out where to draw arrows (thanks springy.js)
    var intersect_line_line = function(p1, p2, p3, p4)
    {
      var denom = ((p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y));
      if (denom === 0) return false // lines are parallel
      var ua = ((p4.x - p3.x)*(p1.y - p3.y) - (p4.y - p3.y)*(p1.x - p3.x)) / denom;
      var ub = ((p2.x - p1.x)*(p1.y - p3.y) - (p2.y - p1.y)*(p1.x - p3.x)) / denom;

      if (ua < 0 || ua > 1 || ub < 0 || ub > 1)  return false
      return arbor.Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    }

    var intersect_line_box = function(p1, p2, boxTuple)
    {
      var p3 = {x:boxTuple[0], y:boxTuple[1]},
          w = boxTuple[2],
          h = boxTuple[3]

      var tl = {x: p3.x, y: p3.y};
      var tr = {x: p3.x + w, y: p3.y};
      var bl = {x: p3.x, y: p3.y + h};
      var br = {x: p3.x + w, y: p3.y + h};

      return intersect_line_line(p1, p2, tl, tr) ||
            intersect_line_line(p1, p2, tr, br) ||
            intersect_line_line(p1, p2, br, bl) ||
            intersect_line_line(p1, p2, bl, tl) ||
            false
    }

    return that
  }

})()
