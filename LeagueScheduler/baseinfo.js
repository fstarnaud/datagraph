define(["dbootstrap", "dojo/dom", "dojo/_base/declare", "dojo/_base/lang",
	"dojo/_base/array", "dojo/keys", "dojo/Stateful",
	"dijit/registry", "dijit/Tooltip", "dijit/form/Button",
	"LeagueScheduler/editgrid", "LeagueScheduler/baseinfoSingleton",
	"dojo/domReady!"],
	function(dbootstrap, dom, declare, lang, arrayUtil, keys, Stateful,
		registry, Tooltip, Button, EditGrid, baseinfoSingleton) {
		var constant = {
			infobtn_id:"infoBtnNode_id",
			fielddb_type:"fielddb"
		};
		var colname_class = declare([Stateful],{
			colname:null
		})
		return declare(null, {
			server_interface:null, editgrid:null, uistackmgr:null,
			idproperty:null, storeutil_obj:null, text_node:null,
			keyup_handle:null, tooltip_list:null, rownum:0,
			colname_obj:null,
			constructor: function(args) {
				lang.mixin(this, args);
				this.tooltip_list = new Array();
				this.colname_obj = new colname_class();
				this.colname_obj.watch("colname",
					lang.hitch(this,function(name, oldValue, value) {
						console.log('switching from '+oldValue+' to '+value);
						if (this.idproperty == 'div_id') {
							var divstr_list = this.getDivstr_list();
							if (divstr_list.length > 0) {
								baseinfoSingleton.watch_obj.set('divstr_list',
									divstr_list);
							}

						}
					})
				);
			},
			showConfig: function(args_obj) {
				var tooltipconfig_list = args_obj.tooltipconfig_list;
				delete args_obj.tooltipconfig_list;  //save space before passing?
				var entrynum_reg = args_obj.entrynum_reg;
				// ref http://stackoverflow.com/questions/11743392/check-if-array-is-empty-or-exists
				// to check if array exists and is non-empty
				if (typeof tooltipconfig_list !== 'undefined' && this.tooltip_list.length == 0) {
					arrayUtil.forEach(tooltipconfig_list, function(item) {
						this.tooltip_list.push(new Tooltip(item));
					}, this);
				}
				this.uistackmgr.switch_pstackcpane(this.idproperty, "preconfig");
				this.uistackmgr.switch_gstackcpane(this.idproperty, true);
				if (this.keyup_handle)
					this.keyup_handle.remove();
				this.keyup_handle = entrynum_reg.on("keyup", lang.hitch(this, this.processdivinfo_input, args_obj));
			},
			// ref http://dojotoolkit.org/documentation/tutorials/1.9/key_events/
			processdivinfo_input: function(args_obj, event) {
				if (event.keyCode == keys.ENTER) {
					var form_reg = args_obj.form_reg;
					var dbname_reg = args_obj.dbname_reg;
					var entrynum_reg = args_obj.entrynum_reg;
					var newgrid_flag = args_obj.newgrid_flag;
					var grid_id = args_obj.grid_id;
					var server_path = args_obj.server_path;
					var server_key = args_obj.server_key;
					var cellselect_flag = args_obj.cellselect_flag;
					var text_node_str = args_obj.text_node_str;
					var updatebtn_str = args_obj.updatebtn_str;
					if (form_reg.validate()) {
						confirm('Input format is Valid, creating new DB');
						var colname = dbname_reg.get("value")
						if (!this.storeutil_obj.nodupdb_validate(colname,
							this.idproperty)) {
							alert("Selected sched name already exists, choose another");
							return;
						}
						//this.colname_obj.set('colname',colname);
						//var divinfo_obj = this.info_obj;
						//divnum is the total # of divisions or other entity like fields
						var divnum = entrynum_reg.get("value");
						this.rownum = divnum;
						var divinfo_list = this.getInitialList(divnum);
						if (this.keyup_handle)
							this.keyup_handle.remove();
						if (newgrid_flag) {
							var columnsdef_obj = this.getcolumnsdef_obj();
							this.editgrid = new EditGrid({griddata_list:divinfo_list,
								colname:colname,
								server_interface:this.server_interface,
								grid_id:grid_id,
								error_node:dom.byId("divisionInfoInputGridErrorNode"),
								idproperty:this.idproperty,
								server_path:server_path,
								server_key:server_key,
								cellselect_flag:cellselect_flag,
								info_obj:this,
								uistackmgr:this.uistackmgr,
								storeutil_obj:this.storeutil_obj});
							this.editgrid.recreateSchedInfoGrid(columnsdef_obj);
							var args_obj = {
								colname:colname,
								text_node_str:text_node_str,
								text_node:this.text_node,
								updatebtn_str:updatebtn_str,
								idproperty:this.idproperty,
								swapcpane_flag:true,
								newgrid_flag:true
							}
						} else {
							this.editgrid.replace_store(colname, divinfo_list);
							var args_obj = {
								colname:colname,
								text_node_str:text_node_str,
								text_node:this.text_node,
								updatebtn_str:updatebtn_str,
								idproperty:this.idproperty,
								swapcpane_flag:true,
								newgrid_flag:false
							}
						}
						this.reconfig_infobtn(args_obj);
					} else {
						alert('Input name is Invalid, please correct');
					}
				}
			},
			getServerDBInfo: function(options_obj) {
				// note third parameter maps to query object, which in this case
				// there is none.  But we need to provide some argument as js does
				// not support named function arguments.  Also specifying "" as the
				// parameter instead of null might be a better choice as the query
				// object will be emitted in the jsonp request (though not consumed
				// at the server)
				var item = options_obj.item;
				//this.colname_obj.set('colname',item);
				options_obj.text_node = this.text_node;
				options_obj.storeutil_obj = this.storeutil_obj;
				this.server_interface.getServerData(options_obj.getserver_path+item,
					lang.hitch(this, this.createEditGrid), null, options_obj);
			},
			createEditGrid: function(server_data, options_obj) {
				// don't create grid if a grid already exists and it points to the same schedule db col
				// if grid needs to be generated, make sure to clean up prior to recreating editGrid
				var colname = options_obj.item;
				var columnsdef_obj = options_obj.columnsdef_obj;
				var idproperty = options_obj.idproperty;
				var server_key = options_obj.server_key;
				// if server data is fielddb information, then we need to do
				// some data conversion (convert to date obj) before passing onto grid
				// Note server_key is key for outgoing request
				// serverdata_key is for incoming data
				var data_list = server_data[options_obj.serverdata_key];
				this.rownum = data_list.length;
				if (server_key == constant.fielddb_type) {
					if (idproperty == 'field_id') {
						arrayUtil.forEach(data_list, function(item, index) {
							// save date str to pass into start and end time calc
							// (though it can be a dummy date)
							var start_str = item.start_date;
							var end_str = item.end_date;
							item.start_date = new Date(start_str);
							item.end_date = new Date(end_str);
							item.start_time = new Date(start_str+' '+item.start_time);
							item.end_time = new Date(end_str+' '+item.end_time);
						})
					} else {
						alert('check db_type and idproperty consistency');
					}
				}
				if (!this.server_interface) {
					console.log("no server interface");
					alert("no server interface, check if service running");
				}
				if (options_obj.newgrid_flag) {
					this.editgrid = new EditGrid({griddata_list:data_list,
						colname:colname,
						server_interface:this.server_interface,
						grid_id:options_obj.grid_id,
						error_node:dom.byId("divisionInfoInputGridErrorNode"),
						idproperty:idproperty,
						server_path:options_obj.server_path,
						server_key:options_obj.server_key,
						cellselect_flag:options_obj.cellselect_flag,
						info_obj:options_obj.info_obj,
						uistackmgr:this.uistackmgr,
						storeutil_obj:options_obj.storeutil_obj});
					this.editgrid.recreateSchedInfoGrid(columnsdef_obj);
				} else {
					this.editgrid.replace_store(colname, data_list);
				}
				var args_obj = {
					colname:colname,
					text_node_str:options_obj.text_node_str,
					text_node:options_obj.text_node,
					updatebtn_str:options_obj.updatebtn_str,
					idproperty:idproperty,
					swapcpane_flag:options_obj.swapcpane_flag,
					newgrid_flag:options_obj.newgrid_flag
				}
				this.reconfig_infobtn(args_obj);
			},
			// function to reassign infobtn_update with title string and callback
			// function.  Also update pstack/gstack_cpane.
			reconfig_infobtn: function(args_obj) {
				// parse args object
				var colname = args_obj.colname;
				var text_node_str = args_obj.text_node_str;
				var text_node = args_obj.text_node;
				var updatebtn_str = args_obj.updatebtn_str;
				var idproperty = args_obj.idproperty;
				var swapcpane_flag = args_obj.swapcpane_flag;
				var newgrid_flag = args_obj.newgrid_flag;

				var text_str = text_node_str + ": <b>"+colname+"</b>";
				text_node.innerHTML = text_str;
				var updatebtn_widget = this.getInfoBtn_widget(updatebtn_str,
					idproperty);
				var btn_callback = lang.hitch(this.editgrid, this.editgrid.sendDivInfoToServer);
				updatebtn_widget.set("onClick", btn_callback);
				if (swapcpane_flag) {
					this.uistackmgr.switch_pstackcpane(idproperty, "config",
						text_str, btn_callback);
					if (!newgrid_flag) {
						// also swap grid if we are not generating a new one
						// if we are generating a new grid, switchgstack is called
						// from within editgrid
						this.uistackmgr.switch_gstackcpane(idproperty, false,
							this.editgrid.schedInfoGrid);
					}
				}
			},
			getInfoBtn_widget: function(label_str, idproperty_str) {
				var infobtn_widget = registry.byId(constant.infobtn_id);
				if (infobtn_widget) {
					var info_type = infobtn_widget.get('info_type');
					if (info_type != idproperty_str) {
						infobtn_widget.set('label', label_str);
						infobtn_widget.set('info_type', idproperty_str);
					}
				} else {
					infobtn_widget = new Button({
						label:label_str,
						type:"button",
						class:"primary",
						info_type:idproperty_str
					}, constant.infobtn_id);
					infobtn_widget.startup();
				}
				return infobtn_widget;
			},
			is_serverdata_required: function(options_obj) {
				return (options_obj.item != this.colname_obj.get('colname'))?true:false;
			},
			is_newgrid_required: function() {
				if (!this.editgrid)
					return true;
				else
					return (this.editgrid.schedInfoGrid)?false:true;
			},
			cleanup:function() {
				arrayUtil.forEach(this.tooltip_list, function(item) {
					item.destroyRecursive();
				});
				if (this.keyup_handle)
					this.keyup_handle.remove();
			}
		})
	}
);
