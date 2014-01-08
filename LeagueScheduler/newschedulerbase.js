define(["dbootstrap", "dojo/dom", "dojo/on", "dojo/_base/declare",
	"dojo/_base/lang", "dojo/date",
	"dojo/dom-class", "dojo/_base/array", "dojo/keys", "dojo/store/Memory", "dijit/registry",
	"dgrid/OnDemandGrid", "dgrid/editor", "dgrid/Keyboard", "dgrid/Selection", "LeagueScheduler/editgrid", "LeagueScheduler/baseinfoSingleton", "dojo/domReady!"],
	function(dbootstrap, dom, on, declare, lang, date, domClass, arrayUtil, keys, Memory,
		registry, OnDemandGrid, editor, Keyboard, Selection, EditGrid,
		baseinfoSingleton) {
		var weekoffset_CONST = 12;
		return declare(null, {
			dbname_reg : null, form_reg: null, server_interface:null,
			newsched_dom:"", schedutil_obj:null,
			form_name:"", form_dom:null,
			info_obj:null, idproperty:"", server_path:"", server_key:"",
			cellselect_flag:false,
			seasoncalendar_input_dom:null,seasondates_btn_reg:null,
			callback:null, text_node_str:"",
			seasonstart_reg:null, seasonend_reg:null, seasonlength_reg:null,
			seasonstart_handle:null, seasonend_handle:null,
			seasonlength_handle:null,
			constructor: function(args) {
				lang.mixin(this, args);
			},
			initialize: function(arg_obj) {
				this.form_name = "newsched_form_id";
				this.form_reg = registry.byId(this.form_name);
				this.form_dom = dom.byId(this.form_name);
				this.dbname_reg = registry.byId("newsched_input_id");
				this.seasoncalendar_input_dom = dom.byId("seasoncalendar_input");
				this.seasondates_btn_reg = registry.byId("seasondates_btn");
				this.newsched_dom = dom.byId("newsched_text");
				this.showConfig();
			},
			set_schedutil_obj: function(obj) {
				this.schedutil_obj = obj;
			},
			showConfig: function() {
				var active_grid = baseinfoSingleton.get_active_grid();
				if (active_grid) {
					active_grid.cleanup();
					baseinfoSingleton.reset_active_grid();
				}
				this.schedutil_obj.makeVisible(this.form_dom);
				baseinfoSingleton.set_visible_form_dom(this.form_dom);
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
						if (!this.nodupname_validate(this.newsched_name)) {
							alert("Selected sched name already exists, choose another");
							return;
						}
						// disable schedule name form
						this.schedutil_obj.makeInvisible(this.form_dom);
						if (this.keyup_handle)
							this.keyup_handle.remove();
						//enable season start/end date input datetime textbox and button
						this.schedutil_obj.makeVisible(this.seasoncalendar_input_dom);
						baseinfoSingleton.set_visible_form_dom(this.seasoncalendar_input_dom);
						this.newsched_dom.innerHTML = "Schedule Name: "+this.newsched_name;
						// set initial values for seasonstart and end dates
						this.seasonstart_reg = registry.byId("seasonstart_date");
						this.seasonend_reg = registry.byId("seasonend_date");
						this.seasonlength_reg = registry.byId("seasonlength_spinner");
						var today = new Date();
						this.seasonstart_reg.set('value', today);
						this.seasonend_reg.set('value',
							date.add(today, 'week', weekoffset_CONST));
						this.seasonlength_reg.set('value', weekoffset_CONST);
						if (this.seasonstart_handle)
							this.seasonstart_handle.remove();
						this.seasonstart_handle = on.pausable(this.seasonstart_reg,
							"change",
							lang.hitch(this, function(event) {
								console.log("season start handle");
								var enddate = this.seasonend_reg.get('value');
								var numweeks = date.difference(event, enddate,'week');
								if (numweeks < 1) {
									alert("end date needs to be at least one week after start date");
									// reset the date to an arbitrary default
									numweeks = this.seasonlength_reg.get('value');
									this.seasonstart_handle.pause();
									this.seasonstart_reg.set('value',
										date.add(enddate, 'week', -numweeks));
									this.seasonstart_handle.resume();
								} else {
									this.seasonlength_handle.pause();
									this.seasonlength_reg.set('value', numweeks);
									this.seasonlength_handle.resume();
								}
							})
						);
						if (this.seasonend_handle)
							this.seasonend_handle.remove();
						this.seasonend_handle = on.pausable(this.seasonend_reg,
							"change",
							lang.hitch(this, function(event) {
								console.log("seasonendhandler");
								var startdate = this.seasonstart_reg.get('value');
								var numweeks = date.difference(startdate, event,'week');
								if (numweeks < 1) {
									alert("end date needs to be at least one week after start date");
									numweeks = this.seasonlength_reg.get('value');
									this.seasonend_handle.pause();
									this.seasonend_reg.set('value',
										date.add(startdate, 'week', numweeks));
									this.seasonend_handle.resume();
								} else {
									this.seasonlength_handle.pause();
									this.seasonlength_reg.set('value', numweeks);
									this.seasonlength_handle.resume();
								}
							})
						);
						if (this.seasonlength_handle)
							this.seasonlength_handle.remove();
						this.seasonlength_handle = on.pausable(this.seasonlength_reg,
							"change",
							lang.hitch(this, function(event) {
								console.log("season len handler");
								var startdate = this.seasonstart_reg.get('value');
								var enddate = date.add(startdate, 'week', event);
								this.seasonend_handle.pause();
								this.seasonend_reg.set('value', enddate);
								this.seasonend_handle.resume();
							})
						);
						if (this.sdates_handle)
							this.sdates_handle.remove();
						this.sdates_handle = this.seasondates_btn_reg.on("click",
							lang.hitch(this, this.getSeasonDatesFromInput));
					} else {
						alert('Input name is Invalid, please correct');
					}
				}
			},
			nodupname_validate: function(col_name) {
				// if name exists in the current list (index > -1) then
				// return false (test failed)
				// currently dbname_list includes list of all db names
				// and doesn't distinguish between various field/div db's
				var dbname_list = baseinfoSingleton.get_dbname_list();
				if (dbname_list.indexOf(col_name) > -1)
					return false;
				else
					return true;
			},
			getSeasonDatesFromInput: function(event) {
				var seasonstart_date = this.seasonstart_reg.get("value");
				var seasonend_date = this.seasonend_reg.get("value");
				console.log("start end="+seasonstart_date+" "+seasonend_date);
			},
		});
	})
