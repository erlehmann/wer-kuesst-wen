//
// halfviz.js
//
// instantiates all the helper classes, sets up the particle system + renderer
// and maintains the canvas/editor splitview
//
(function(){

  window.Worker = undefined  // web workers disabled, arbor claims like 10MB/sec
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

    sys.updateNode = function(node, names, urls){
      // FIXME: build better merge magic
      node.data.names = names
      node.data.urls = urls
    }

    sys.updateNodeMass = function(node, multiplier){
      var adjacencies = sys.getAdjacentNodes(node).length
      var mass = adjacencies * multiplier
      node.mass = mass
    }

    sys.getAdjacentNodes = function(node){
        var nodedict = {}

        var to = sys.getEdgesTo(node)
        $.each(to, function(i, edge){
            nodedict[edge.source._id] = edge.source
        })

        var from = sys.getEdgesFrom(node)
        $.each(from, function(i, edge){
            nodedict[edge.target._id] = edge.target
        })

        var nodes = []
        $.each(nodedict, function(i, node){
            nodes.push(node)
        })
        return nodes
    }

    sys.getAdjacentNodeFavorites = function(node){
        var nodedict = {}

        var nodes1 = sys.getAdjacentNodes(node)
        $.each(nodes1, function(i, node1){
            var nodes2 = sys.getAdjacentNodes(node1)
            $.each(nodes2, function(i, node2){
                if (typeof nodedict[node2.name] === typeof undefined){
                    nodedict[node2.name] = 1
                } else {
                    nodedict[node2.name] += 1
                }
            })
        })
        delete nodedict[node.name]

        var unwanted = []
        $.each(nodedict, function(name, count){
            if (count < 2){
                unwanted.push(name)
            }
        })
        $.each(unwanted, function(i, name){
            delete nodedict[name]
        })

        return nodedict
    }

    sys.exportJSON = function(){
      var data = {
          nodes: {},
          edges: {}
        }

      sys.eachNode(function(node, px){
        data.nodes[node.name] = {
          names: node.data.names,
          urls: node.data.urls
        }
      })

      sys.eachEdge(function(edge, pt1, pt2){
        source = edge.source.name
        target = edge.target.name
        if (typeof data.edges[source] === typeof undefined){
          // create source entry
          data.edges[source] = {}
        }
        // update source entry
        data.edges[source][target] = {}
      })

      return JSON.stringify(data, null, 2)
    }

    sys.importJSON = function(json){
      sys.graft(JSON.parse(json))
    }

    sys.save = function(){
      localStorage.json = sys.exportJSON()
    },

    // from <http://www.idealog.us/2006/06/javascript_to_p.html>
    sys.query = function(variable){
      var query = window.location.search.substring(1)
      var vars = query.split("&")
      for (var i=0;i<vars.length;i++){
        var pair = vars[i].split("=")
        if (pair[0] == variable) {
          return pair[1]
        }
      }
      return '';
    },

    sys.load = function(){
      var query = sys.query('json')
      if (query != ''){
        $.ajax({
          url: query,
          success: function(json){
            sys.importJSON(json)
            sys.save()
          }
        })
      }else{
        json = localStorage.json
        if (typeof json === 'string'){
          sys.importJSON(json)
        }else{
          $.ajax({
            url: './qc.json',
            success: function(json){
              sys.importJSON(json)
              sys.save()
            }
          })
        }
      }
    }

    $( "#edge_node" ).autocomplete({
      source:function(request, response){
        var a=Array();
        sys.eachNode(function(node, px){
          $.each(node.data.names, function(i, name){
            if (name.toLowerCase().search(request.term) != -1){
              a.push(name)
            }
          })
        })
        response(a)
      }
    })

    var _ed = dom.find('#editor')
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
        that.updateLayout(Math.max(1, $(window).width()-386))

        _grabber.bind('mousedown', that.grabbed)

        $(that.io).bind('get', that.getDoc)
        $(that.io).bind('clear', that.newDoc)

        $(that.io).bind('completeNodeNames', that.completeNodeNames)

        $(that.io).bind('addNode', that.addNode)
        $(that.io).bind('addEdge', that.addEdge)

        $(that.io).bind('removeNode', that.removeNode)
        $(that.io).bind('removeEdge', that.removeEdge)

        $(that.io).bind('clearText', that.clearText)

        sys.load()

        return that
      },

      getDoc:function(e){
        $.getJSON('library/'+e.id+'.json', function(doc){

          // update the system parameters
          if (doc.sys){
            sys.parameters(doc.sys)
          }

          // modify the graph in the particle system
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

      completeNodeNames:function(e){
        var urls = String(e.urls).split('\n')

        $.each(urls, function(i, url){
          if (e.nameNode.val() == ''){
            // FIXME: inefficient placement of this code
            String.prototype.endsWith = function (s) {
              return this.length >= s.length && this.substr(this.length - s.length) == s;
            }

            parseUri.options.strictMode = true
            var parseResult = parseUri(url)

            if (parseResult.host.endsWith('twitter.com')){
              var tw_id = parseResult.file
              var tw_url = 'http://api.twitter.com/1/users/show/' + tw_id + '.json'
              $.getJSON(tw_url + '?callback=?', function(json){
                var name = json.name
                var screen_name = json.screen_name
                e.nameNode.val(screen_name + '\n' + name)
              })
            } else {
              var g_url = 'https://socialgraph.googleapis.com/lookup?&q=' + url
              $.getJSON(g_url + '&callback=?', function(json){
                try {
                  var canonical_url = json.canonical_mapping[url]
                  var name = json.nodes[canonical_url].attributes.fn
                  e.nameNode.val(name)
                } catch(e){
                  // pass if property is not there
                }
              })
            }
          }
        })
      },

      addNode:function(e){
        var names = String(e.names).split('\n')
        var urls = String(e.urls).split('\n')
        var node_exists = false

        $.each(urls, function(i, url){
          var node = sys.getNodeByUrl(url)
          if(node !== false){
            sys.updateNode(node, names, urls)
            node_exists = true
          }
        })

        if(node_exists === false) {
          sys.addNode(Math.uuid(), {
            names: names,
            urls: urls
          })
        }

        sys.save()
      },

      addEdge:function(e){
        var node1 = sys.getNodeByUrlOrName(e.name1)
        var node2 = sys.getNodeByUrlOrName(e.name2)
        if(node1 && node2){
          sys.addEdge(node1, node2)
          sys.addEdge(node2, node1)
        }

        sys.save()
      },

      removeNode:function(e){
        var urls = String(e.urls).split('\n')
        $.each(urls, function(i, url){
          var node = sys.getNodeByUrl(url)
          if(node){
            sys.pruneNode(node)
          }
        })

        sys.save()
      },

      removeEdge:function(e){
        var node1 = sys.getNodeByUrlOrName(e.name1)
        var node2 = sys.getNodeByUrlOrName(e.name2)
        if(node1 && node2){
          var edges1 = sys.getEdges(node1, node2)
          var edges2 = sys.getEdges(node2, node1)
          $.each(edges1.concat(edges2), function(i, edge){
            sys.pruneEdge(edge)
          })
        }

        sys.save()
      },

      clearText:function(e){
        $.each(e.nodes, function(i, node){
          node.val('')
        })
      },

      updateGraph:function(e){
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
      }
    }

    return that.init()
  }


  $(document).ready(function(){
    var mcp = HalfViz("#halfviz")
  })


})()
