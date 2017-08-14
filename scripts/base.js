;(function(){
	'use strict';
	var $formAddTask = $('.add-task')
	,$window = $(window)
	,$body = $('body')
	,$submitInput = $('#submitInput')
	,$delete_task
	,$detail_task
	,$task_detail = $('.task-detail')
	,$task_detail_mask = $('.task-detail-mask')
	,taskList = []
	,currentIndex
	,$updateForm
	,$task_detail_content
	,$task_detail_content_input
	,$checkboc_complete

	;
	
	
	init();
	$formAddTask.on('submit',on_addtask_form_submit);
	$task_detail_mask.on('click',hide_task_detail);
	$('.msg-button').on('click',hide_msg);

/**
 * 初始化设置
 * 从localstorage中取出数据，并渲染dom
 * @return {[type]} [description]
 */
	function init(){
		taskList = store.get('taskList') || [];
		render_task_list(taskList);
		task_remind_check();
	}

/**
 * 制作异步系统确认对话框
 * @param  {[type]} arg [确认信息对话框的标题]
 * @return {[type]}     [description]
 */
	function pop(arg){
		if (!arg){
			console.error('pop title is required')
		}
		var conf = {}
		,$box
		,$mask
		,$title
		,$content
		,$cancel
		,dfd
		,$confirm
		,confirmed
		,timer
		;

		dfd = $.Deferred();

		if(typeof arg == 'string')
			conf.title = arg;
		else{
			conf = $.extend(conf,arg);
		}
		//对话框模板
		$box = $('<div class="pop-box">'
			+'<div class="pop-title">'+ conf.title +'</div>'
			+'<div class="pop-content">'
			+   '<button style="margin-right:5px" class="primary confirm">确定</button>'
			+   '<button class="primary cancel">取消</button>'
			+'</div>'
			+'</div>'
			).css({
			color: '#444',
			width: 500,
			padding: 20,
			background: '#fff',
			position: 'fixed',
			top:0,
			left:0,
		});

		$title = $box.find('.pop-title').css({
			padding: '5px 10px',
			fontWeight: 900,
			'fontSize': 20,
			textAlign: 'center'
		})

		$content = $box.find('.pop-content').css({
			padding: '5px 10px',
			textAlign: 'center'
		})
		$mask = $('<div></div>').css({
			position: 'fixed',
			top:0,
			bottom: 0,
			left:0,
			right: 0,
			// background: 'rgba(0,0,0,0.5)',
			// background: '#fff',
		});

		$confirm  = $box.find('.confirm');
		$cancel  = $box.find('.cancel');
		//当窗口变化时，重新设置对话框的位置
		$window.on('resize',function(){
			adjust_box_position();
		})

		//不断地监听用户是否点击某一按键，如果点击，对话框隐藏
		timer = setInterval(function(){
			if(confirmed !== undefined)
			{
				dfd.resolve(confirmed);
				clearInterval(timer);
				dismiss_pop();
			}
		},50);

		$confirm.on('click',on_confirm);
		$cancel.on('click',on_cancel);
		$mask.on('click',on_cancel);
		
		$mask.appendTo($body);
		$box.appendTo($body);
		$(window).resize();

		//返回promise对象
		return dfd.promise();


		function dismiss_pop(){
			$mask.remove();
			$box.remove();
		}
/**
 * [adjust_box_position description]
 * @return {[type]} [description]
 */
		function adjust_box_position() {

		    var height = $window.height(),
		        width = $window.width(),
		        box_width = $box.width(),
		        box_height = $box.height(),
		        move_x, move_y;

		    move_x = (width - box_width) / 2;
		    move_y = (height - box_height) / 2 - 20;

		    $box.css({
		        left: move_x,
		        top: move_y
		    })

		}

		function on_cancel(){
			confirmed = false;
		}

		function on_confirm(){
			confirmed = true;
		}
}





/**
 * 定时提醒功能的核心方法
 * 
 * @return {[type]} [description]
 */
function task_remind_check(){
	var current_timestamp,task_timestamp;
	//不断地将此刻的时间戳与定时时间戳进行比较  如果此刻时间戳大于定时时间戳，
	//说明定时到了，该提醒了。
	var itl = setInterval(function(){
		for(var i = 0; i< taskList.length; i++){
		var item = taskList[i];

		if(!item.remind_date || !!item.informed) continue;

		current_timestamp = (new Date()).getTime();
		task_timestamp = (new Date(item.remind_date)).getTime();
		if(current_timestamp - task_timestamp >= 1){
			update_task(i,{informed: true});
			show_msg(item.content);
		}
	}
	},500);
}

/**
 * 显示提醒消息
 * @param  {[type]} msg [description]
 * @return {[type]}     [description]
 */
function show_msg(msg){
	$('.msg-content').html(msg).parent().show();
}

/**
 * 隐藏提醒消息
 * @return {[type]} [description]
 */
function hide_msg(){
	console.log('hhh');
	$('.msg-content').html('').parent().hide();
}

/**
 * 触发form的submit事件后的回调函数
 * @param  {[type]} e [event事件对象]
 * @return {[type]}   [description]
 */
	function on_addtask_form_submit(e) {
	    var newTask = {};
	    newTask.content = $submitInput.val();
	    if (!newTask.content) return;
	    if (add_list(newTask)) {
	        render_task_list(taskList);
	        $submitInput.val('');
	    }
	    e.preventDefault();
	}


/**
 * 注册删除监听事件
 * @param  {[$对象]} $delete_task [要添加监听事件的$对象]
 * @return {[type]}              [description]
 */
	function listenDelClick($delete_task){
		$delete_task.on('click',function(){

			var $item = $(this).parents('.task-item');
			//异步处理函数 
			pop('确定删除本宝宝吗？').then(function(rel){
				rel ? delete_task(parseInt($item.data('index'))) : null;
			})
			
		})
	}

/**
 * 监听详细按钮点击事件
 * @param  {[type]} $detail_task [被监听的对象]
 * @return {[type]}              [description]
 */
function listenDetailClick($detail_task){
	var $item = $detail_task.parents('.task-item');
	$item.on('dblclick',function(){
		var index = parseInt($(this).data('index'))
		show_task_detail(index);
	});

	$detail_task.on('click',function(){
		var $item = $(this).parents('.task-item');
		var index = parseInt($item.data('index'))
		show_task_detail(index);
	})
}

/**
 * 监听单选按钮的变化，更新数据
 * @param  {[type]} $checkboc_complete [要监听的单选按钮对象]
 * @return {[type]}                    [description]
 */
function listenCheckBoxClick($checkboc_complete){
	$checkboc_complete.on('click',function(){
		var $this = $(this);
		var isCom = $this.is(':checked');
		var tmp = {};
		tmp.complete = isCom;
		var index = $this.parents('.task-item').data('index');
		update_task(index,tmp);
	})
}

/**
 * 显示详情面板
 * @param  {[type]} index [description]
 * @return {[type]}       [description]
 */
function show_task_detail(index){
		render_task_detail(index);
		currentIndex = index;
		$task_detail_mask.show();
		$task_detail.show();
}

/**
 * 隐藏详情面板
 * @return {[type]} [description]
 */
function hide_task_detail(){
		$task_detail_mask.hide();
		$task_detail.hide();
}

/**
 * 更新detailTask对象的数据
 * @param  {[type]} index [要更改数据的索引]
 * @param  {[type]} data  [新数据]
 * @return {[type]}       []
 */
function update_task(index,data){
	if(index === undefined || !taskList[index]) return;
	console.log(data);
	taskList[index] = $.extend(taskList[index],data);
	refresh_task_list();
	return true;
}

/**
 * 渲染详情面板
 * @param  {[type]} index [description]
 * @return {[type]}       [description]
 */
function render_task_detail(index){
	if(index === undefined || !taskList[index]) return;
	var item = taskList[index]
	var tpl = ""+
		'<form>' 
	+	   '<div class="content">'
	+		item.content
	+		'</div>'
	+		'<div>'
	+			'<input name="content" style="display:none" type="text" value="'+ (!!item.content ? item.content : '') +'">'
	+		'</div>'
	+		'<div>'
	+			'<div class="desc">'
	+				'<textarea name="desc">'+(!!item.desc ? item.desc : '')+'</textarea>'
	+			'</div>'
	+		'</div>'
	+		'<div class="remind">'
	+		    '<label class="d-ib">提醒时间</label>'
	+			'<input class="datetime" type="text" name="remind_date" value="'+ (!!item.remind_date ? item.remind_date : '') +'"/>'
	+			'<button type="submit">更新</button>'
	+		'</div>'
	+	'</form>';
	/*清空内容*/
	/*监听器也一并清除*/
	$task_detail.html(null);
	/*用模板填充该区域*/
	$task_detail.html(tpl);

	$('.datetime').datetimepicker();
	$updateForm = $task_detail.find('form');
	$task_detail_content = $updateForm.find(".content");
	$task_detail_content_input = $updateForm.find("[name=content]");

	/*给div添加双击事件，双击后div变为input，可修改内容*/
	$task_detail_content.on('dblclick',function(e){
		$task_detail_content.hide();
		$task_detail_content_input.show();
	})

	/*获取表单中的数据，更新并隐藏模板*/
	$updateForm.on('submit',function(e){
		e.preventDefault();
		var data = {};
		data.content = $(this).find('[name=content]').val();
		console.log( $(this).find('[name=content]'));
		console.log(data.content);
		data.desc = $(this).find('[name=desc]').val();
		data.remind_date = $(this).find('[name=remind_date]').val();
		
		update_task(index,data);
		hide_task_detail();

	});

}

/**
 * 将新获得的数据添加到数据数组里
 * 并且重新渲染DOM
 * @param {[object]} newtask [或得到的数据]
 */
	function add_list(newtask){
		taskList.push(newtask);
		refresh_task_list()
		return true;
	}

/**
 * 从数组中删除指定index位置的数据
 * @param  {[number]} index [数据索引]
 * @return {[type]}       [description]
 */
	function delete_task(index){
		if(!taskList[index]) return;
		taskList.splice(index,1);
		refresh_task_list();
		
	}

/**
 * 将更新的数据存入localstorage并重新渲染dom
 * @return {[type]} [description]
 */
	function refresh_task_list(){
		store.set('taskList',taskList);
		render_task_list(taskList);
	}


/**
 * 根据数据渲染DOM
 * @param  {[type]} tasklist [从localstorage中取出数据数组]
 * @return {[type]}          [description]
 */
	function render_task_list(tasklist){
		var i,$task_list = $(".task-list");
		$task_list.html("");
		var complete_items = [];

		for( i = 0; i < tasklist.length; i++){
			var item = tasklist[i];
			if(item && item.complete){
				item = $.extend(item,{index:i})
				complete_items.push(item);
			}
			else{
				var $task = render_task_item(item,i);
			}
			$task_list.prepend($task);
		}

		for(var j=0;j<complete_items.length;j++){
			var item = complete_items[j];
			var $task = render_task_item(item,item.index);
			$task.addClass('complete');
			$task_list.append($task);
		}


		$delete_task = $('.operate.delete');
		$detail_task = $('.operate.detail');
		$checkboc_complete = $('.task-item .complete');


		listenDelClick($delete_task);
		listenDetailClick($detail_task);
		listenCheckBoxClick($checkboc_complete);
		
		
	}

/**
 * 为每一条数据创建$对象
 * @param  {[type]} newtask [数据对象]
 * @param  {[type]} index   [索引]
 * @return {[type]} $(task_tpl) [$对象]
 */
	function render_task_item(newtask,index){
		var task_tpl = ""+
			"<div class='task-item' data-index='"+ index +"'>"
		+		'<span class="select"><input type="checkbox"'+(!!newtask.complete?"checked":'')+' class="complete"></span>'
		+		'<span class="task-content">'+newtask.content+'</span>'
		+       '<span class="f-r">'
		+		     '<span class="operate delete">删除</span>'
		+		     '<span class="operate detail">详细</span>'
		+       '</span>'
		+	'</div>';
		return $(task_tpl);
	}

})();
