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

        $('#add_edge').bind('click', that.addEdgeClick)

        dom.find('.ctrl > a').live('click', that.menuClick)

        return that
      },

      addEdgeClick:function(e){
        $(that).trigger({
          type: 'addEdge',
          name1: $('#node_1').val(),
          name2: $('#node_2').val()
        })
        return false
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
