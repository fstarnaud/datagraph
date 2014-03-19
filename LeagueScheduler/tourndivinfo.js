// ref http://dojotoolkit.org/reference-guide/1.9/dojo/_base/declare.html
define(["dojo/_base/declare", "dojo/dom", "dojo/_base/lang",
	"dijit/registry", "dgrid/editor", "LeagueScheduler/baseinfo",
	"LeagueScheduler/baseinfoSingleton",
	"dojo/domReady!"],
	function(declare, dom, lang, registry, editor, baseinfo,
		baseinfoSingleton){
		var constant = {
			infobtn_id:"infoBtnNode_id",
			idproperty_str:"tourndiv_id",
			updatebtn_str:"Update Tourn Div Info",
			grid_id:"tourndivinfogrid_id",
			text_node_str: 'Schedule Name',
			db_type:'tourndb',
		};
		return declare(baseinfo, {
			infogrid_store:null, idproperty:constant.idproperty_str,
			db_type:constant.db_type,
			constructor: function(args) {
				lang.mixin(this, args);
				baseinfoSingleton.register_obj(this, constant.idproperty_str);
			},
			getcolumnsdef_obj: function() {
				// IMPORTANT: make sure one field matches the idproperty string, if
				// the idproperty is going to be used at the idProperty field for
				// the store
				var columnsdef_obj = {
					tourndiv_id: "Div ID",
					div_age: editor({label:"Age", autoSave:true},"text","dblclick"),
					div_gen: editor({label:"Gender", autoSave:true}, "text", "dblclick"),
					totalteams: editor({label:"Total Teams", autoSave:true,
						set:function(item) {
							return parseInt(item.totalteams)
						}}, "text", "dblclick"),
					totalbrackets: editor({label:"Total RR Brackets", autoSave:true,
						set:function(item) {
							return parseInt(item.totalbrackets)
						}}, "text", "dblclick"),
					elimination_num: editor({label:"Elimination #", autoSave:true,
						set:function(item) {
							return parseInt(item.elimination_num)
						}}, "text", "dblclick"),
					elimination_type: editor({label:"Elimination Type", field:"elimination_type", autoSave:true}, "text", "dblclick"),
					field_id_str: editor({label:"Fields", field:"field_id_str", autoSave:true}, "text", "dblclick"),
					gameinterval: editor({label:"Inter-Game Interval (min)",
						autoSave:true,
						set:function(item) {
							return parseInt(item.gameinterval)
						}}, "text", "dblclick"),
					rr_gamedays: editor({label:"Number RR Gamedays", autoSave:true,
						set:function(item) {
							return parseInt(item.rr_gamedays)
						}}, "text", "dblclick"),
				};
				return columnsdef_obj;
			},
			initialize: function(newgrid_flag) {
				var form_name = "newdivinfo_form_id";
				var form_reg = registry.byId(form_name);
				var input_reg = registry.byId("newdivinfo_input_id");
				var divnum_reg = registry.byId("divnum_input_id");
				var tooltipconfig_list = [{connectId:['divnum_input_id'],
					label:"Specify Number of Divisions and press ENTER",
					position:['below','after']},
					{connectId:['newdivinfo_input_id'],
					label:"Specify Schedule Name",
					position:['below','after']}];
				var args_obj = {
					dbname_reg:input_reg,
					form_reg:form_reg,
					entrynum_reg:divnum_reg,
					server_path:"create_newdbcol/",
					server_key:"info_data",
					text_node_str: constant.text_node_str,
					grid_id:constant.grid_id,
					updatebtn_str:constant.updatebtn_str,
					tooltipconfig_list:tooltipconfig_list,
					newgrid_flag:newgrid_flag,
					cellselect_flag:false
				}
				this.showConfig(args_obj);
			},
			getServerDBInfo: function(options_obj) {
				// note third parameter maps to query object, which in this case
				// there is none.  But we need to provide some argument as js does
				// not support named function arguments.  Also specifying "" as the
				// parameter instead of null might be a better choice as the query
				// object will be emitted in the jsonp request (though not consumed
				// at the server)
				options_obj.serverdata_key = 'info_list';
				options_obj.idproperty = constant.idproperty_str;
				options_obj.server_key = 'info_data';
				options_obj.server_path = "create_newdbcol/";
				options_obj.cellselect_flag = false;
				options_obj.text_node_str = "Division List Name";
				options_obj.grid_id = constant.grid_id;
				options_obj.updatebtn_str = constant.updatebtn_str;
				options_obj.getserver_path = 'get_dbcol/';
				options_obj.db_type = 'tourndb';
				this.inherited(arguments);
			},
			getInitialList: function(divnum) {
				var info_list = new Array();
				for (var i = 1; i < divnum+1; i++) {
					// make sure one of the keys matches the idProperty used for
					// store.
					info_list.push({tourndiv_id:i, div_age:"", div_gen:"",
					                  totalteams:2,
					                  totalbrackets:1,
					                  elimination_num:1,
					                  elimination_type:"",field_id_str:"",
					                  gameinterval:1, rr_gamedays:1});
				}
				return info_list;
			},
			checkconfig_status: function(raw_result){
				// do check to make sure all fields have been filled.
				// note construct of using arrayUtil.some works better than
				// query.filter() as loop will exit immediately if .some() returns
				// true.
				// config_status is an integer type as booleans cannot be directly
				// be transmitted to server (sent as 'true'/'false' string)
				// Baseline implementation - if need to customize, do so in
				// inherited child class
				var config_status = 0;
				if (arrayUtil.some(raw_result, function(item, index) {
					// ref http://stackoverflow.com/questions/8312459/iterate-through-object-properties
					// iterate through object's own properties too see if there
					// any unfilled fields.  If so alert and exit without sending
					// data to server
					var break_flag = false;
					for (var prop in item) {
						if (prop == 'totalteams') {
							if (item[prop] < 2) {
								console.log("tourndivinfo:checkconfig:need at least two teams");
								break_flag = true;
								break;
							}
						} else if (prop == 'totalbrackets') {
							if (item[prop] < 1) {
								console.log("tourndivinfo:checkconfig:need at least one bracket");
								break_flag = true;
								break;
							}
						} else {
							if (item[prop] === "") {
								//alert("Not all fields in grid filled out, but saving");
								break_flag = true;
								break;
							}
						}
					}
					return break_flag;
				})) {
					// insert return statement here if plan is to prevent saving.
					console.log("Not all fields complete for "+this.idproperty+
						" but saving");
				} else {
					config_status = 1;
				}
				return config_status;
			}
		});
});
