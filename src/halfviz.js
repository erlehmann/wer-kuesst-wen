//
// halfviz.js
//
// instantiates all the helper classes, sets up the particle system + renderer
// and maintains the canvas/editor splitview
//
(function(){

  trace = arbor.etc.trace
  objmerge = arbor.etc.objmerge
  objcopy = arbor.etc.objcopy

  var HalfViz = function(elt){
    var dom = $(elt)

    sys = arbor.ParticleSystem(100, 500, 0.75, true)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...
    sys.screenPadding(20)

    sys.getNodeByName = function(name){
      var target_node
      sys.eachNode(function(node, pt){
        $.each(node.data.names, function(i, node_name){
          if(name === node_name) {
            target_node = node
            return false  // break $.each()
          }
        })
      })
      return target_node || false
    }

    sys.getNodeByUrl = function(url){
      var target_node
      sys.eachNode(function(node, pt){
        $.each(node.data.urls, function(i, node_url){
          if(url === node_url) {
            target_node = node
            return false  // break $.each()
          }
        })
      })
      return target_node || false
    }

    sys.getNodeByUrlOrName = function(query){
      return sys.getNodeByUrl(query) || sys.getNodeByName(query) || false
    }

    var _ed = dom.find('#editor')
    var _code = dom.find('textarea')
    var _canvas = dom.find('#viewport').get(0)
    var _grabber = dom.find('#grabber')

    var _updateTimeout = null
    var _current = null // will be the id of the doc if it's been saved before
    var _editing = false // whether to undim the Save menu and prevent navigating away
    var _failures = null

    var that = {
      io:IO("#editor .io"),
      init:function(){

        $(window).resize(that.resize)
        that.resize()
        that.updateLayout(Math.max(1, $(window).width()-340))

        _code.keydown(that.typing)
        _grabber.bind('mousedown', that.grabbed)

        $(that.io).bind('get', that.getDoc)
        $(that.io).bind('clear', that.newDoc)

        $(that.io).bind('addNode', that.addNode)
        $(that.io).bind('addEdge', that.addEdge)

        $(that.io).bind('removeNode', that.removeNode)
        return that
      },

      getDoc:function(e){
        $.getJSON('library/'+e.id+'.json', function(doc){

          // update the system parameters
          if (doc.sys){
            sys.parameters(doc.sys)
          }

          // modify the graph in the particle system
          _code.val(doc.src)
          that.updateGraph()
          that.resize()
          _editing = false
        })

      },

      newDoc:function(){
        alice = sys.addNode("alice", {label: 'alice'})
        bob = sys.addNode("bob", {label: 'bob'})
        edge = sys.addEdge(alice, bob)
        that.updateGraph()
        that.resize()
        _editing = false
      },

      addNode:function(e){
        // FIXME: use UUID or something
        sys.addNode(e.names[0], {
          names: e.names,
          urls: e.urls
        })
      },

      addEdge:function(e){
        var node1 = sys.getNodeByUrlOrName(e.name1)
        var node2 = sys.getNodeByUrlOrName(e.name2)
        if(node1 && node2){
          sys.addEdge(node1, node2)
        }
      },

      removeNode:function(e){
        var node = sys.getNodeByUrlOrName(e.name)
        if(node){
          sys.pruneNode(node)
        }
      },

      updateGraph:function(e){
        console.log(_code.val())
        _updateTimeout = null
      },

      resize:function(){
        var w = $(window).width() - 40
        var x = w - _ed.width()
        that.updateLayout(x)
        sys.renderer.redraw()
      },

      updateLayout:function(split){
        var w = dom.width()
        var h = _grabber.height()
        var split = split || _grabber.offset().left
        var splitW = _grabber.width()
        _grabber.css('left',split)

        var edW = w - split
        var edH = h
        _ed.css({width:edW, height:edH})
        if (split > w-20) _ed.hide()
        else _ed.show()

        var canvW = split - splitW
        var canvH = h
        _canvas.width = canvW
        _canvas.height = canvH
        sys.screenSize(canvW, canvH)

        _code.css({height:h-20,  width:edW-4, marginLeft:2})
      },

      grabbed:function(e){
        $(window).bind('mousemove', that.dragged)
        $(window).bind('mouseup', that.released)
        return false
      },
      dragged:function(e){
        var w = dom.width()
        that.updateLayout(Math.max(10, Math.min(e.pageX-10, w)) )
        sys.renderer.redraw()
        return false
      },
      released:function(e){
        $(window).unbind('mousemove', that.dragged)
        return false
      },
      typing:function(e){
        var c = e.keyCode
        if ($.inArray(c, [37, 38, 39, 40, 16])>=0){
          return
        }

        if (!_editing){
          $.address.value("")
        }
        _editing = true

        if (_updateTimeout) clearTimeout(_updateTimeout)
        _updateTimeout = setTimeout(that.updateGraph, 900)
      }
    }

    return that.init()
  }


  $(document).ready(function(){
    var mcp = HalfViz("#halfviz")
  })


})()
