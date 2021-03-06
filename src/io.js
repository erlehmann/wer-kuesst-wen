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

        $('#node_urls').change(that.completeNodeNames)
        $('#node_names').change(that.completeNodeNames)

        $('#node_urls').keyup(that.enableSaving)
        $('#node_names').keyup(that.enableSaving)

        $('#update_node').bind('click', that.addNodeClick)
        $('#add_edge').bind('click', that.addEdgeClick)

        $('#remove_node').bind('click', that.removeNodeClick)
        $('.remove_edge').live('click', that.removeEdgeClick)

        $('#clear_text').bind('click', that.clearTextClick)
        $('#show_edge_form').bind('click', that.toggleEdgeForm)

        $('#data_export').bind('click', that.exportJSON)
        $("#analysis-table").parent().tablesorter()

        return that
      },

      completeNodeNames:function(e){
        $(that).trigger({
          type: 'completeNodeNames',
          nameNode: $('#node_names'),
          urls: $('#node_urls').val()
        })
      },

      enableSaving:function(e){
        $('#update_node').removeAttr('disabled')
      },

      addNodeClick:function(e){
        $(that).trigger({
          type: 'addNode',
          names: [$('#node_names').val()],
          urls: [$('#node_urls').val()]
        })
        $('#node_names').val('')
        $('#node_urls').val('')
        return false
      },

      addEdgeClick:function(e){
        $(that).trigger({
          type: 'addEdge',
          name1: $('#relationship-list-name').text(),
          name2: $('#edge_node').val()
        })
        $('#edge_node').val('')
        $('#edge_form').toggle()
        $('#show_edge_form').toggle()
        return false
      },

      removeNodeClick:function(e){
        $(that).trigger({
          type: 'removeNode',
          urls: $('#node_urls').val()
        })
        $('#node_names').val('')
        $('#node_urls').val('')
        $('#update_node').attr('disabled', 'disabled')
        $('#remove_node').attr('disabled', 'disabled')
        $('#clear_text').attr('disabled', 'disabled')
        $('#show_edge_form').attr('disabled', 'disabled')
        return false
      },

      removeEdgeClick:function(e){
        $(that).trigger({
          type: 'removeEdge',
          name1: $('#relationship-list-name').text(),
          name2: $(this).attr('data-name')
        })
        $(this).parent().remove()
        return false
      },

      clearTextClick:function(e){
        $(that).trigger({
          type: 'clearText',
          nodes: [
            $('#node_names'),
            $('#node_urls')
          ]
        })
        $('#clear_text').attr('disabled', 'disabled')
        return false
      },

      toggleEdgeForm:function(e){
        $('#edge_form').toggle()
        $('#show_edge_form').toggle()
      },

      exportJSON:function(e){
        json = sys.exportJSON()
        console.log(json)
        uri = "data:application/octet-stream," + encodeURIComponent(json)
        console.log(uri)
        newWindow=window.open(uri, 'Download');
      }

    }

    return that.init()
  }

})()
