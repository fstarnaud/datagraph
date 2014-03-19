define(["dbootstrap", "dojo/dom", "dojo/on", "dojo/_base/declare",
	"dojo/_base/lang", "dojo/Stateful",
	"dojo/_base/array", "dojo/keys", "dojo/store/Memory",
	"dijit/registry", "dijit/Tooltip",
	"dijit/form/ValidationTextBox","dijit/form/Select", "dijit/form/Button",
	"dijit/form/NumberSpinner", "dijit/form/DateTextBox",
	"dgrid/OnDemandGrid", "dgrid/editor", "dgrid/Keyboard", "dgrid/Selection",
	"LeagueScheduler/editgrid", "LeagueScheduler/baseinfoSingleton",
	"LeagueScheduler/widgetgen",
	"put-selector/put", "dojo/domReady!"],
	function(dbootstrap, dom, on, declare, lang, Stateful, arrayUtil, keys,
		Memory,registry, Tooltip, ValidationTextBox, Select, Button, NumberSpinner,
		DateTextBox,
		OnDemandGrid, editor, Keyboard, Selection, EditGrid,
		baseinfoSingleton, WidgetGen, put) {
		var constant = {
			idproperty_str:'newsched_id',
			form_name:'newsched_form_id',
			scinput_div:'seasoncalendar_input',
			radio1_id:'scradio1_id',
			radio2_id:'scradio2_id',
			league_select_id:'scleague_select_id',
			default_db_type:'rrdb'
		};
		var newschedwatch_class = declare([Stateful],{
			leagueselect_flag:false,
			league_fg_flag:false
		})
		return declare(null, {
			dbname_reg : null, form_reg: null, server_interface:null,
			newsched_dom:"", schedutil_obj:null, storeutil_obj:null,
			info_obj:null, idproperty:constant.idproperty_str,
			server_path:"", server_key:"",
			seasondates_btn_reg:null,
			callback:null, text_node_str:"", tooltip:null,
			start_dtbox:null, end_dtbox:null, sl_spinner:null,
			seasonstart_handle:null, seasonend_handle:null,
			seasonlength_handle:null, league_select:null, fg_select:null,
			event_flag:false, uistackmgr:null, newschedwatch_obj:null,
			selectexists_flag:false,
			legue_select_value:"", fg_select_value:"", widgetgen:null,
			current_db_type:constant.default_db_type,
			constructor: function(args) {
				lang.mixin(this, args);
				baseinfoSingleton.register_obj(this, constant.idproperty_str);
				this.newschedwatch_obj = new newschedwatch_class();
				this.newschedwatch_obj.watch('leagueselect_flag',
					lang.hitch(this, function(name, oldValue, value) {
						this.newschedwatch_obj.set('league_fg_flag',
							this.newschedwatch_obj.get('fgselect_flag') && value);
					}));
				this.newschedwatch_obj.watch('fgselect_flag',
					lang.hitch(this, function(name, oldValue, value) {
						this.newschedwatch_obj.set('league_fg_flag',
							this.newschedwatch_obj.get('leagueselect_flag') && value);
					}));
			},
			initialize: function(arg_obj) {
				this.form_reg = registry.byId(constant.form_name);
				//this.dbname_reg = registry.byId("newsched_input_id");
				// put selector documentation
				// http://davidwalsh.name/put-selector
				// https://github.com/kriszyp/put-selector
				// first check to see if the domNode has already been created by
				// seeing the dom node can be retrieved
				var sched_input = dom.byId("newched_input_id");
				if (!sched_input) {
					put(this.form_reg.domNode, "label.label_box[for=newsched_input_id]",
						'New Schedule Name:');
					sched_input = put(this.form_reg.domNode,
						"input#newsched_input_id[type=text][required=true]");
					this.dbname_reg = new ValidationTextBox({
						value:'PHMSA2014',
						regExp:'[\\w]+',
						promptMessage:'Enter New Schedule - only alphanumeric characters and _',
						invalidMessage:'only alphanumeric characters and _',
						missingMessage:'enter schedule name'
					}, sched_input);
				} else {
					// domnode already exists, get widget that should also be there
					this.dbname_reg = registry.byNode(sched_input);
				}

				this.seasondates_btn_reg = registry.byId("seasondates_btn");
				this.newsched_dom = dom.byId("newsched_text");
				this.showConfig();
			},
			set_obj: function(schedutil_obj, storeutil_obj) {
				this.schedutil_obj = schedutil_obj;
				this.storeutil_obj = storeutil_obj;
			},
			showConfig: function() {
				this.uistackmgr.switch_pstackcpane({idproperty:this.idproperty,
					p_stage:"preconfig", entry_pt:"init"});
				this.uistackmgr.switch_gstackcpane(this.idproperty, true);
				var tooltipconfig = {connectId:['newsched_input_id'],
					label:"Enter Schedule Name and press ENTER",
					position:['below','after']};
				this.tooltip = new Tooltip(tooltipconfig);
				if (this.keyup_handle)
					this.keyup_handle.remove();
				this.keyup_handle = this.dbname_reg.on("keyup", lang.hitch(this, this.processdivinfo_input));
			},
			// ref http://dojotoolkit.org/documentation/tutorials/1.9/key_events/
			processdivinfo_input: function(event) {
				if (event.keyCode == keys.ENTER) {
					if (this.form_reg.validate()) {
						confirm('Input format is Valid, creating new Schedule DB');
						this.newsched_name = this.dbname_reg.get("value");
						if (!this.storeutil_obj.nodupdb_validate(this.newsched_name,
							this.idproperty)) {
							alert("Selected sched name already exists, choose another");
							return;
						}
						// disable schedule name form
						//this.schedutil_obj.makeInvisible(this.form_dom);
						if (this.keyup_handle)
							this.keyup_handle.remove();
						this.newsched_dom.innerHTML = "Schedule Name: "+this.newsched_name;
						var today = new Date();
						var scinput_dom = dom.byId(constant.scinput_div);
						// get or create handle to widgetgen obj
						if (!this.widgetgen) {
							this.widgetgen = new WidgetGen({
								storeutil_obj:this.storeutil_obj,
								server_interface:this.server_interface
							});
						}
						this.widgetgen.create_dbtype_radiobtn(scinput_dom,
							constant.radio1_id, constant.radio2_id,
							constant.default_db_type, this,
							this.radio1_callback, this.radio2_callback,
							constant.league_select_id);
						// create league info dropdowns
						var select_node = dom.byId(constant.league_select_id);
						if (!select_node) {
							// get parent dom and generate dropdown selects
							put(scinput_dom,
								"label.label_box[for=$]", constant.league_select_id,
								"Select League");
							select_node = put(scinput_dom,
								"select[id=$][name=league_select]",
								constant.league_select_id);
							this.league_select = new Select({
								name:'league_select',
								onChange: lang.hitch(this, function(evt) {
									this.newschedwatch_obj.set('leagueselect_flag',evt!="");
									this.league_select_value = evt;
								})
							}, select_node);
							args_obj = {db_type:'rrdb', label_str:'Select League',
								config_status:true};
							var option_list = this.storeutil_obj.getLabelDropDown_list(args_obj);
							this.league_select.addOption(option_list);
							this.league_select.startup();
							if (option_list.length < 2) {
								var ls_tooltipconfig = {
									connectId:[constant.league_select_id],
									label:"If Empty Specify League Spec's First",
									position:['above','after']};
								var ls_tooltip = new Tooltip(ls_tooltipconfig);
							}
							put(scinput_dom, "br, br");  // add space
						} else {
							this.league_select = registry.byNode(select_node);
						}
						// create field group dropdown
						var fg_select_node = dom.byId("fg_select_id");
						if (!fg_select_node) {
							put(scinput_dom,
								"label.label_box[for=fg_select_id]",
								"Select Field Group");
							fg_select_node = put(scinput_dom,
								"select#fg_select_id[name=fg_select]");
							this.fg_select = new Select({
								name:'fg_select',
								onChange: lang.hitch(this, function(evt) {
									this.newschedwatch_obj.set('fgselect_flag',
										evt!="");
									this.fg_select_value = evt;
								})
							}, fg_select_node);
							args_obj = {db_type:'fielddb',
								label_str:'Select Field Group', config_status:true};
							var option_list = this.storeutil_obj.getLabelDropDown_list(args_obj);
							this.fg_select.addOption(option_list);
							this.fg_select.startup();
							if (option_list.length < 2) {
								var fg_tooltipconfig = {
									connectId:['fg_select_id'],
									label:"If Empty Specify Field Groups First",
									position:['above','after']};
								var fg_tooltip = new Tooltip(fg_tooltipconfig);
							}
							put(scinput_dom, "span.empty_gap");
						} else {
							this.fg_select = registry.byNode(fg_select_node);
						}
						var btn_node = dom.byId("schedparambtn_id");
						if (!btn_node) {
							btn_node = put(scinput_dom,
								"button.dijitButton#schedparambtn_id[type=button]");
							var btn_tooltipconfig = {
								connectId:['schedparambtn_id'],
								label:"Ensure League and Field Group are Selected",
								position:['above','after']};
							var schedule_btn = new Button({
								label:"Generate",
								disabled:true,
								class:"success",
								onClick: lang.hitch(this, this.send_generate)
							}, btn_node);
							schedule_btn.startup();
							var btn_tooltip = new Tooltip(btn_tooltipconfig);
							btn_tooltip.startup();
							this.newschedwatch_obj.watch('league_fg_flag',
								function(name, oldValue, value) {
									if (value) {
										schedule_btn.set('disabled', false);
										btn_tooltip.set('label',
											'Press to Generate Schedule');
									}
								}
							)
						}
						// set flag that is used by observable memory update in
						// storeutl
						this.selectexists_flag = true;
						// need to add btn callbacks here
						this.uistackmgr.switch_pstackcpane({
							idproperty:this.idproperty, p_stage:"config",
							entry_pt:"init"});
					} else {
						alert('Input name is Invalid, please correct');
					}
				}
			},
			// callback function when dbtype radiobutton is changed
			radio1_callback: function(select_id, event) {
				if (event) {
					this.widgetgen.swap_league_select_db(select_id, 'rrdb');
					this.current_db_type = 'rrdb';
				}
			},
			radio2_callback: function(select_id, event) {
				if (event) {
					this.widgetgen.swap_league_select_db(select_id, 'tourndb');
					this.current_db_type = 'tourndb';
				}
			},
			removefrom_select: function(db_type, index) {
				// remove entries from the div or field group dropdown
				if (db_type == 'rrdb' || db_type == 'tourndb') {
					this.league_select.removeOption(index);
				} else if (db_type == 'fielddb') {
					this.fg_select.removeOption(index)
				}
			},
			addto_select: function(db_type, label, insertIndex) {
				var soption_obj = {label:label, value:insertIndex+1,
					selected:false};
				// need to take care of tourndb also below
				// we should be able to do a simple OR between rrdb and
				// tourndb as this.league_select should be pointing the current
				// db_type
				if (db_type == 'rrdb' || db_type == 'tourndb') {
					this.league_select.addOption(soption_obj);
				} else if (db_type == 'fielddb') {
					this.fg_select.addOption(soption_obj);
				}
			},
			is_serverdata_required: function(options_obj) {
				// follow up on cases where data needs to be queried from server.
				return false;
			},
			is_newgrid_required: function() {
				return false;
			},
			send_generate: function() {
				var server_key_obj = {div_colname:this.league_select_value,
					field_colname:this.fg_select_value,
					db_type:this.current_db_type};
				this.server_interface.getServerData("send_generate",
					this.server_interface.server_ack, server_key_obj);
			},
			cleanup: function() {
				if (this.seasonstart_handle)
					this.seasonstart_handle.remove();
				if (this.seasonend_handle)
					this.seasonend_handle.remove();
				if (this.seasonlength_handle)
					this.seasonlength_handle.remove();
				if (this.tooltip)
					this.tooltip.destroyRecursive();
				if (this.dbname_reg)
					this.dbname_reg.destroyRecursive();
			}
		});
	})
