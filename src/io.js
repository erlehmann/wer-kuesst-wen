(function(){

  //
  // the popup menu/button at the top of the editor textarea
  //
  IO = function(elt){
    var dom = $(elt)
    var _dialog = dom.find('.dialog')
    var _animating = false

    var that = {
      init:function(){

        $('#add_node').bind('click', that.addNodeClick)
        $('#add_edge').bind('click', that.addEdgeClick)

        $('#remove_node').bind('click', that.removeNodeClick)
        $('#remove_edge').bind('click', that.removeEdgeClick)

        dom.find('.ctrl > a').live('click', that.menuClick)

        return that
      },

      addNodeClick:function(e){
        $(that).trigger({
          type: 'addNode',
          names: [$('#node_names').val()],
          urls: [$('#node_urls').val()]
        })
      },

      addEdgeClick:function(e){
        $(that).trigger({
          type: 'addEdge',
          name1: $('#node_1').val(),
          name2: $('#node_2').val()
        })
        $('#node_1').val('')
        $('#node_2').val('')
        return false
      },

      removeNodeClick:function(e){
        $(that).trigger({
          type: 'removeNode',
          urls: $('#node_urls').val()
        })
        $('#node_names').val('')
        $('#node_urls').val('')
        return false
      },

      removeEdgeClick:function(e){
        $(that).trigger({
          type: 'removeEdge',
          name1: $('#node_1').val(),
          name2: $('#node_2').val()
        })
      },

      menuClick:function(e){
        var button = (e.target.tagName=='A') ? $(e.target) : $(e.target).closest('a')
        var type = button.attr('class').replace(/\s?(selected|active)\s?/,'')

        switch(type){
        case "new":
          $(that).trigger({type:"clear"})
          break
        }

        return false
      }
    }

    return that.init()
  }

})()
