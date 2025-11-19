sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"sap/ui/core/Fragment",
	"../model/formatter",
	"sap/m/MessageBox",
	"sap/ui/export/library",
	"sap/ui/export/Spreadsheet",
	"sap/m/MessageToast",
	"sap/m/MessageItem",
	"sap/m/MessageView",
	"sap/m/Button",
	"sap/m/Bar",
	"sap/m/Title",
	"sap/m/Popover",
	"sap/ui/core/IconPool",
	"sap/ui/core/util/File"
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter, GroupHeaderListItem, Device, Fragment, formatter, MessageBox, exportLibrary, Spreadsheet, MessageToast,
	MessageItem, MessageView, Button, Bar, Title, Popover, IconPool, File) {
	"use strict";

	var EdmType = exportLibrary.EdmType;

	return BaseController.extend("cadastromotoristas4hana.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit: function () {
			// Control state model
			var oList = this.byId("list"),
				oViewModel = this._createViewModel(),
				// Put down master list's original value for busy indicator delay,
				// so it can be restored later on. Busy handling on the master list is
				// taken care of by the master list itself.
				iOriginalBusyDelay = oList.getBusyIndicatorDelay();

			this._oList = oList;

			// keeps the filter and search state
			this._oListFilterState = {
				aFilter: [],
				aSearch: []
			};

			this.setModel(oViewModel, "masterView");
			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oList.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for the list
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			this.getView().addEventDelegate({
				onBeforeFirstShow: function () {
					this.getOwnerComponent().oListSelector.setBoundMasterList(oList);
				}.bind(this)
			});

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
			this.getRouter().attachBypassed(this.onBypassed, this);


			//Instance ImportFile MessageView 
			this.messagePopoverInit();
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * After list data is available, this handler method updates the
		 * master list counter
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		onUpdateFinished: function (oEvent) {
			// update the master list object counter after new data is loaded
			this._updateListItemCount(oEvent.getParameter("total"));
			this.getView().setBusy(false)
		},

		/**
		 * Event handler for the master search field. Applies current
		 * filter value and triggers a new search. If the search field's
		 * 'refresh' button has been pressed, no new search is triggered
		 * and the list binding is refresh instead.
		 * @param {sap.ui.base.Event} oEvent the search event
		 * @public
		 */
		onSearch: function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			}

			var sQuery = oEvent.getParameter("query");

			if (sQuery) {
				let aFilter = this._oListFilterState.aFilter[0];
				aFilter.oValue1 = sQuery;
				this._oListFilterState.aSearch = aFilter;
			} else {
				if (this._oListFilterState.aFilter.length > 0) {
					this._oListFilterState.aFilter[0].oValue1 = sQuery;
				}
				this._oListFilterState.aSearch = [];
			}

			this._applyFilterSearch();

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh: function () {
			this._oList.getBinding("items").refresh(true);
		},

		/**
		 * Event handler for the filter, sort and group buttons to open the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onOpenViewSettings: function (oEvent) {
			var sDialogTab = "filter";
			if (oEvent.getSource().isA("sap.m.Button")) {
				var sButtonId = oEvent.getSource().getId();
				if (sButtonId.match("sort")) {
					sDialogTab = "sort";
				} else if (sButtonId.match("group")) {
					sDialogTab = "group";
				}
			}
			// load asynchronous XML fragment
			if (!this._pViewSettingsDialog) {
				this._pViewSettingsDialog = Fragment.load({
					id: this.getView().getId(),
					name: "cadastromotoristas4hana.view.ViewSettingsDialog",
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());

					let presetFiltersStatusEP = [
						new Filter("Status", FilterOperator.Contains, "EP")
					],

						presetFiltersStatusCR = [
							new Filter("Status", FilterOperator.Contains, "CR")
						],

						presetFiltersStatusPA = [
							new Filter("Status", FilterOperator.Contains, "PA")
						],

						presetFiltersCpf = [
							new Filter("Cpf", FilterOperator.Contains, null)
						],

						presetFiltersNome = [
							new Filter("Nome", FilterOperator.Contains, null)
						],

						presetFiltersTransp = [
							new Filter("NameTransp", FilterOperator.Contains, null)
						];

					oDialog.addPresetFilterItem(new sap.m.ViewSettingsItem({
						key: "Staus",
						text: "Filtrar por Status: Cadastro em processamento",
						customData: new sap.ui.core.CustomData({
							key: "EP",
							value: presetFiltersStatusEP
						})
					}));

					oDialog.addPresetFilterItem(new sap.m.ViewSettingsItem({
						key: "Staus",
						text: "Filtrar por Status: Cadastro realizado",
						customData: new sap.ui.core.CustomData({
							key: "CR",
							value: presetFiltersStatusCR
						})
					}));

					oDialog.addPresetFilterItem(new sap.m.ViewSettingsItem({
						key: "Status",
						text: "Filtrar por Status: Pendente anexo(s)",
						customData: new sap.ui.core.CustomData({
							key: "PA",
							value: presetFiltersStatusPA
						})
					}));

					oDialog.addPresetFilterItem(new sap.m.ViewSettingsItem({
						key: "Cpf",
						text: "Filtrar por Cpf",
						customData: new sap.ui.core.CustomData({
							key: "filter",
							value: presetFiltersCpf
						})
					}));

					oDialog.addPresetFilterItem(new sap.m.ViewSettingsItem({
						key: "Nome",
						text: "Filtrar por Nome do Motorista",
						customData: new sap.ui.core.CustomData({
							key: "filter",
							value: presetFiltersNome
						})
					}));

					oDialog.addPresetFilterItem(new sap.m.ViewSettingsItem({
						key: "NameTransp",
						text: "Filtrar por Transportadora",
						customData: new sap.ui.core.CustomData({
							key: "filter",
							value: presetFiltersTransp
						})
					}));

					return oDialog;
				}.bind(this));
			}
			this._pViewSettingsDialog.then(function (oDialog) {
				oDialog.open(sDialogTab);
			});
		},

		/**
		 * Event handler for the filter, sort and group buttons to open the CreateEntry.
		 * @public
		 */
		onOpenViewCreate: function () {
			// load asynchronous XML fragment
			if (!this._pViewCreateDialog) {
				this.setModel(new JSONModel({
					Cpf: null,
					Nome: null
				}), "CreateEntry");

				this._pViewCreateDialog = Fragment.load({
					id: this.getView().getId(),
					name: "cadastromotoristas4hana.view.CreateEntry",
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					return oDialog;
				}.bind(this));
			}

			this._pViewCreateDialog.then(function (oDialog) {
				this.getModel('CreateEntry').setProperty('/Cpf', null);
				oDialog.open();
			}.bind(this));
		},

		/**
		 * Event handler for close CreateEntry View
		 * @param {sap.ui.base.Event} oEvent the button press event
		 * @public
		 */
		onCloseDialogCreate: function (oEvent) {
			//Clear model
			this.getModel("CreateEntry").setProperty("Cpf", "");
			this.getModel("CreateEntry").setProperty("Nome", "");


			//Clear Input
			this.getView().byId('_CpfInput').setValue("")
			// this.getView().byId('_NomeInput').setValue("")

			oEvent.getSource().getParent().close();
		},

		/**
		 * Event handler for create Motorista Entry on click save button 
		 * @public
		 */
		onCreateEntry: async function (oEvent) {
			const cpf = this.getModel('CreateEntry').getProperty('/Cpf').replace(/\D/g, "");


			var oVincModel = new JSONModel({
				Cpf: null,
				EmailLogin: this.getUserEmailLogged()
			}),

				oCreateDialog = this.getView().byId('createDialog');

			this.setModel(oVincModel, 'oVincModel');

			this.getModel().read(`/E_FuncionarioSet('${cpf}')`, {
				success: async function (oData) {

					let aVincData = this.getModel('oVincModel').getProperty('/');

					aVincData.Cpf = cpf;

					await this.createVinculo(this, aVincData).then((oData) => {
						this.getModel().refresh();
						this.getView().byId('createDialog').setBusy(false);
						oCreateDialog.close();
						this._oList.getBinding('items').refresh();

						MessageBox.success('Motorista Vinculado com Sucesso!');

						this.getRouter().navTo("object", {
							objectId: oData.Cpf
						}, true);
					}).catch((oError) => {
						this.getView().byId('createDialog').setBusy(false);
						oCreateDialog.close();
						MessageBox.error(oError);
					})
				}.bind(this),
				error: async function (oError) {
					let aNewDriver = this.getModel('CreateEntry').getProperty('/');

					aNewDriver.Cpf = cpf;
					aNewDriver.EmailC = this.getUserEmailLogged();
					aNewDriver.EmailM = this.getUserEmailLogged();

					await this.createDriver(this, aNewDriver).then((oData) => {
						let aNewVinc = this.getModel('oVincModel').getProperty('/');
						aNewVinc.Cpf = oData.Cpf;

						this.createVinculo(this, aNewVinc).then((oData) => {
							this.getModel().refresh();
							this.getView().byId('createDialog').setBusy(false);
							oCreateDialog.close();
							this._oList.getBinding('items').refresh();
							MessageBox.success('Motorista Cadastrado com Sucesso!');

							this.getRouter().navTo("object", {
								objectId: oData.Cpf
							}, true);
						}).catch((oError) => {
							this.getView().byId('createDialog').setBusy(false);
							oCreateDialog.close();
							MessageBox.error(oError);
						})

					}).catch((oError) => {
						this.getView().byId('createDialog').setBusy(false);
						oCreateDialog.close();
						MessageBox.error(oError);
					})
				}.bind(this)
			})

		},

		onValueHelpRequestDriver: function () {
			var oView = this.getView()

			if (!this._oDialogSearchDriver) {
				this._oDialogSearchDriver = Fragment.load({
					id: oView.getId(),
					name: "cadastromotoristas4hana.view.DriverSelect",
					controller: this
				}).then(function (oValueHelpSearchDriver) {
					oView.addDependent(oValueHelpSearchDriver)
					return oValueHelpSearchDriver
				})
			}

			this._oDialogSearchDriver.then(function (oValueHelpSearchDriver) {
				oValueHelpSearchDriver.open()
			})
		},

		/**
		 * Event handler called when ViewSettingsDialog has been confirmed, i.e.
		 * has been closed with 'OK'. In the case, the currently chosen filters or groupers
		 * are applied to the master list, which can also mean that they
		 * are removed from the master list, in case they are
		 * removed in the ViewSettingsDialog.
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @public
		 */
		onConfirmViewSettingsDialog: function (oEvent) {
			var aFilterItems = oEvent.getParameter("filterItems"),
				aFilters = [],
				aCaptions = [];

			if (oEvent.getParameters().filterString.includes('Cpf')) {
				aFilters.push(new Filter("Cpf", FilterOperator.Contains, ''))
				aCaptions.push("Cpf");

			} else if (oEvent.getParameters().filterString.includes('Nome')) {
				aFilters.push(new Filter("Nome", FilterOperator.Contains, ''))
				aCaptions.push("Nome");

			} else if (oEvent.getParameters().filterString.includes('Transportadora')) {
				aFilters.push(new Filter("NameTransp", FilterOperator.Contains, ''))
				aCaptions.push("Transportadora");
			} else if (oEvent.getParameters().filterString.includes('Status')) {
				if (oEvent.getParameters().filterString.includes('processamento')) {
					aFilters.push(new Filter("Status", FilterOperator.EQ, 'EP'));
					aCaptions.push("Status: Cadastro em processamento");
				}

				if (oEvent.getParameters().filterString.includes('realizado')) {
					aFilters.push(new Filter("Status", FilterOperator.EQ, 'CR'));
					aCaptions.push("Status: Cadastro realizado");
				}

				if (oEvent.getParameters().filterString.includes('anexo')) {
					aFilters.push(new Filter("Status", FilterOperator.EQ, 'PA'));
					aCaptions.push("Status: Pendente Anexo(s)");
				}
			}


			this._oListFilterState.aFilter = aFilters;
			this._updateFilterBar(aCaptions.join(", "));
			this._applyFilterSearch();
		},

		/**
		 * Apply the chosen grouper to the master list
		 * @param {sap.ui.base.Event} oEvent the confirm event
		 * @private
		 */
		_applyGrouper: function (oEvent) {
			var mParams = oEvent.getParameters(),
				sPath,
				bDescending,
				aSorters = [];
			// apply sorter to binding
			if (mParams.groupItem) {
				mParams.groupItem.getKey() === "CompanyName" ?
					sPath = "Customer/" + mParams.groupItem.getKey() : sPath = mParams.groupItem.getKey();
				bDescending = mParams.groupDescending;
				var vGroup = this._oGroupFunctions[mParams.groupItem.getKey()];
				aSorters.push(new Sorter(sPath, bDescending, vGroup));
			}
			this._oList.getBinding("items").sort(aSorters);
		},

		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange: function (oEvent) {
			var oList = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected"),
				isEdit = this.getModel("appView").getProperty('/actionButtonsInfo/isEdit');
			
			//skip navigation when detail view in edit mode
			if (isEdit) {
				oList.removeSelections();
				MessageBox.error('No modo edição, não é possivel trocar de registro!');
				return

			}


			// skip navigation when deselecting an item in multi selection mode
			if (!(oList.getMode() === "MultiSelect" && !bSelected)) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
			}
		},

		/**
		 * Event handler for the bypassed event, which is fired when no routing pattern matched.
		 * If there was an object selected in the master list, that selection is removed.
		 * @public
		 */
		onBypassed: function () {
			this._oList.removeSelections(true);
		},

		/**
		 * Used to create GroupHeaders with non-capitalized caption.
		 * These headers are inserted into the master list to
		 * group the master list's items.
		 * @param {Object} oGroup group whose text is to be displayed
		 * @public
		 * @returns {sap.m.GroupHeaderListItem} group header with non-capitalized caption.
		 */
		createGroupHeader: function (oGroup) {
			return new GroupHeaderListItem({
				title: oGroup.text
			});
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */


		_createViewModel: function () {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				titleCount: 0,
				noDataText: this.getResourceBundle().getText("masterListNoDataText")
			});
		},

		_onMasterMatched: function () {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail: function (oItem) {
			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("Cpf")
			}, bReplace);
		},

		/**
		 * Sets the item count on the master list header
		 * @param {int} iTotalItems the total number of items in the list
		 * @private
		 */
		_updateListItemCount: function (iTotalItems) {
			// only update the counter if the length is final
			if (this._oList.getBinding("items").isLengthFinal()) {
				this.getModel("masterView").setProperty("/titleCount", iTotalItems);
			}
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @private
		 */
		_applyFilterSearch: function () {
			var aFilters = this._oListFilterState.aFilter,
				oViewModel = this.getModel("masterView");
			this._oList.getBinding("items").filter(aFilters, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aFilters.length !== 0) {
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataWithFilterOrSearchText"));
			} else if (this._oListFilterState.aSearch.length > 0) {
				// only reset the no data text to default when no new search was triggered
				oViewModel.setProperty("/noDataText", this.getResourceBundle().getText("masterListNoDataText"));
			}
		},

		/**
		 * Internal helper method that sets the filter bar visibility property and the label's caption to be shown
		 * @param {string} sFilterBarText the selected filter value
		 * @private
		 */
		_updateFilterBar: function (sFilterBarText) {
			var oViewModel = this.getModel("masterView");
			oViewModel.setProperty("/isFilterBarVisible", (this._oListFilterState.aFilter.length > 0));
			oViewModel.setProperty("/filterBarLabel", this.getResourceBundle().getText("masterFilterBarText", [sFilterBarText]));
		},

		/**
			* Convenience method for create a Driver.
			* @public
			* @returns {true}
			*/
		createDriver: async function (oMasterContext, aCreateEntry) {
			return new Promise((resolve, reject) => {
				oMasterContext.getModel().create("/E_FuncionarioSet", aCreateEntry, {
					success: function (oData) {
						resolve(oData)
					},

					error: function (oError) {
						reject(JSON.parse(oError.responseText).error.message.value)
					}
				});
			})
		},

		onUpdateStart: function (oEvent) {
			if (oEvent.getSource().getBinding('items').aFilters.length === 0) {
				let oUserFilter = new Array(),
					oItemsBiding = oEvent.getSource().getBinding('items');

				oUserFilter.push(new Filter("EmailLogin", FilterOperator.EQ, this.getUserEmailLogged()));

				oItemsBiding.filter(oUserFilter);
			}
		},


		createVinculo: function (oMasterContext, aVincData) {
			return new Promise((resolve, reject) => {
				oMasterContext.getModel().create("/E_FuncionarioVinculoSet", aVincData, {
					success: function (oData) {
						resolve(oData)
					},

					error: function (oError) {
						reject(JSON.parse(oError.responseText).error.message.value)
					}
				});
			})
		},

		onPressUpload: function (oEvent) {
			var oView = this.getView()

			if (!this._oDialogDriversUpload) {
				this._oDialogDriversUpload = Fragment.load({
					id: oView.getId(),
					name: "cadastromotoristas4hana.view.DriversUpload",
					controller: this
				}).then(function (oDialogDriversUpload) {
					oView.addDependent(oDialogDriversUpload)
					return oDialogDriversUpload
				})
			}

			this._oDialogDriversUpload.then(function (oDialogDriversUpload) {
				oDialogDriversUpload.open()
			})
		},

		onCloseDialogUploadDriver: function (oEvent) {
			this.getView().byId('uploadDriverDialog').close();
		},



		handleUploadDrivers: function (oEvent) {
			const specialChars = /[`!@#$%^&*()+\Ç+=\[\]{};':"\\|,çÇ<>\/?~]/
			const sServicePath = "sap/opu/odata/sap/ZGTWHR032_MOTORISTA_SRV/E_AnexosSet";

			let oFileUploader = this.getView().byId('fileUploader');



			if (oFileUploader.getValue() === "") {
				MessageBox.error("Selecione o arquivo primeiro")
				return

			} else if (specialChars.test(oFileUploader.getValue()) === true) {
				MessageBox.error("Nome do arquivo contem caracteres especiais")
				return
			}

			oEvent.getSource().getParent().setBusy(true);

			//if Open Application from WorkZone BTP, set BTP Url on Service 
			// if (this.getOwnerComponent()._componentConfig != undefined) {
			// 	const sBtpUrlPath = this.getOwnerComponent()._componentConfig.url;

			// 	if (sBtpUrlPath.length > 1) {
			// 		oFileUploader.setUploadUrl(sBtpUrlPath + sServicePath);
			// 	}

			// } else

			if (this.getOwnerComponent()._oManifest != undefined) {
				const sBtpUrHTML5lPath = this.getOwnerComponent()._oManifest._oBaseUri.toString();

				if (this.getOwnerComponent()._oManifest._oBaseUri.toString().length > 1) {
					oFileUploader.setUploadUrl(sBtpUrHTML5lPath + sServicePath);
				}
			}

			oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "SLUG",
				value: oFileUploader.getValue()
			}))

			oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "x-csrf-token",
				value: this.getModel().getSecurityToken()
			}))

			oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
				name: "carga",
				value: "X"
			}))

			oFileUploader.setSendXHR(true)
			oFileUploader.upload()
			oFileUploader.removeAllHeaderParameters()
		},

		handleUploadComplete: async function (oEvent) {
			const sUuid = oEvent.getParameter('responseRaw').split("<d:IdArquivoCarga>")[1].slice(0, 32);
			let aFilter = new Array();


			aFilter.push(new Filter({
				path: "Uuid",
				operator: FilterOperator.EQ,
				value1: sUuid
			}))

			aFilter.push(new Filter({
				path: "EmailLogin",
				operator: FilterOperator.EQ,
				value1: this.getUserEmailLogged()
			}))


			await this.createDriverFromXLSX(aFilter).then((oData) => {
				MessageBox.success('Upload completo, verifique o log para mais informações!');
				this.getModel().refresh();
				this.oMessageView.getModel("oModelReturnMessages").setData(oData);
			}).catch((oError) => {
				MessageBox.error(oError)
			})

			oEvent.getSource().getParent().setBusy(false);
		},

		handleExportTemplate: function (oEvent) {
			let aCols, oSettings, oSheet;
			aCols = this.createColumnsConfig();

			oSettings = {
				workbook: { columns: aCols },
				dataSource: [{ sample: 'sample' }],
				fileName: "Arquivo_Template_Criar_Motoristas"
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build()
				.then(function () {
					MessageToast.show('Export foi finalizado');
				}).finally(function () {
					oSheet.destroy();
				});
		},

		handleUploadMessagesPress: function (oEvent) {
			this.oMessageView.navigateBack();
			this._oPopover.openBy(oEvent.getSource());
		},

		createDriverFromXLSX: function (aFilter) {
			return new Promise((resolve, reject) => {
				this.getModel().read("/E_CreateDriveFromXLSXSet", {
					filters: aFilter,
					success: function (oData, oResponse) {
						resolve(oData.results);
					},
					error: function (oError) {
						reject(JSON.parse(oError.responseText).error.message.value);
					}
				})
			})
		},


		messagePopoverInit: function () {
			var oMessageTemplate = new MessageItem({
				type: '{oModelReturnMessages>status_message}',
				title: '{oModelReturnMessages>title}',
				description: '{oModelReturnMessages>message}',
				subtitle: '{oModelReturnMessages>subtitle}'
			});

			var oModel = new JSONModel(),
				that = this;

			this.oMessageView = new MessageView({
				showDetailsPageHeader: false,
				itemSelect: function () {
					oBackButton.setVisible(true);
				},
				items: {
					path: "oModelReturnMessages>/",
					template: oMessageTemplate
				}
			});
			var oBackButton = new Button({
				icon: IconPool.getIconURI("nav-back"),
				visible: false,
				press: function () {
					that.oMessageView.navigateBack();
					that._oPopover.focus();
					this.setVisible(false);
				}
			});

			this.oMessageView.setModel(oModel, "oModelReturnMessages");

			var oCloseButton = new Button({
				text: "Close",
				press: function () {
					that._oPopover.close();
				}
			}).addStyleClass("sapUiTinyMarginEnd"),
				oPopoverFooter = new Bar({
					contentRight: oCloseButton
				}),
				oPopoverBar = new Bar({
					contentLeft: [oBackButton],
					contentMiddle: [
						new Title({ text: "Messages" })
					]
				});

			this._oPopover = new Popover({
				customHeader: oPopoverBar,
				contentWidth: "440px",
				contentHeight: "440px",
				verticalScrolling: false,
				modal: true,
				content: [this.oMessageView],
				footer: oPopoverFooter
			});
		},

		createColumnsConfig: function () {
			return [
				{
					"property": "Cpf",
					"type": EdmType.String,
					"width": "11",
					"label": "Pessoa Física (CPF) *",
				},
				{
					"property": "Estrangeiro",
					"type": EdmType.String,
					"label": "Estrangeiro (marcar como X=Sim | Vazio=Não)"
				},
				{
					"property": "Dt1cnh",
					"type": EdmType.Date,
					"calendar": 'Gregorian',
					"label": "Data 1ª Habilitação (DD/MM/AAAA)"
				},
				{
					"property": "Email",
					"type": EdmType.String,
					"width": "10",
					"label": "Email *"
				},
				{
					"property": "Nome",
					"type": EdmType.String,
					"width": "80",
					"label": "Nome Completo *"
				},
				{
					"property": "NomeMae",
					"type": EdmType.String,
					"width": "40",
					"label": "Nome Mãe"
				},
				{
					"property": "DataNasc",
					"type": EdmType.Date,
					"calendar": 'Gregorian',
					"label": "Data Nascimento *"
				},
				{
					"property": "Genero",
					"type": EdmType.String,
					"width": "1",
					"label": "Genero * Marcar como: (M = Masculino | F = Feminino) "
				},
				{
					"property": "Fone",
					"type": EdmType.String,
					"width": "20",
					"label": "Telefone *"
				},
				{
					"property": "Celular",
					"type": EdmType.String,
					"width": "20",
					"label": "Celular"
				},
				{
					"property": "CelularVeiculo",
					"type": EdmType.String,
					"width": "20",
					"label": "Celular do Veiculo"
				},
				{
					"property": "Cnh",
					"type": EdmType.String,
					"width": "12",
					"label": "Nº Cart. Habilit. * ( Apenas numeros )"
				},
				{
					"property": "CategoriaCnh",
					"type": EdmType.String,
					"width": "3",
					"label": "Cat. Cart. Habilit. *"
				},
				{
					"property": "DataEmissaoCnh",
					"type": EdmType.Date,
					"calendar": 'Gregorian',
					"label": "Data Emissão CNH * (DD/MM/AAAA)"
				},
				{
					"property": "DataValidadeCnh",
					"type": EdmType.Date,
					"calendar": 'Gregorian',
					"label": "Validade da CNH * (DD/MM/AAAA)"
				},
				{
					"property": "Rg",
					"type": EdmType.Number,
					"scale": 0,
					"width": "16",
					"label": "Documento Identidade (RG) * Apenas numeros"
				},
				{
					"property": "DataEmissaoRg",
					"type": EdmType.Date,
					"calendar": 'Gregorian',
					"label": "Data Emissão (RG) (DD/MM/AAAA)"
				},
				{
					"property": "OrgaoExpedidorRg",
					"type": EdmType.String,
					"width": "8",
					"label": "Orgão Expedidor (RG)"
				},
				{
					"property": "EstadoEmissorRg",
					"type": EdmType.String,
					"width": "3",
					"label": "Estado UF (RG)"
				},
				{
					"property": "CartaoRepom",
					"type": EdmType.String,
					"width": "30",
					"label": "Cartão Repom"
				},
				{
					"property": "Cep",
					"type": EdmType.String,
					"width": "10",
					"label": "Código postal *"
				},
				{
					"property": "Rua",
					"type": EdmType.String,
					"width": "30",
					"label": "Rua"
				},
				{
					"property": "Numero",
					"type": EdmType.String,
					"width": "10",
					"label": "Nº da Rua"
				},
				{
					"property": "Complemento",
					"type": EdmType.String,
					"width": "6",
					"label": "Complemento"
				},
				{
					"property": "Bairro",
					"type": EdmType.String,
					"width": "25",
					"label": "Bairro"
				},
				{
					"property": "Cidade",
					"type": EdmType.String,
					"width": "25",
					"label": "Cidade *"
				},
				{
					"property": "Estado",
					"type": EdmType.String,
					"width": "3",
					"label": "Estado *"
				},
				{
					"property": "PassaporteRne",
					"type": EdmType.String,
					"width": "60",
					"label": "Número do Passaporte/RNE"
				},
				{
					"property": "PaisEmissor",
					"type": EdmType.String,
					"width": "50",
					"label": "País Emiss. Pass/RNE"
				},
				{
					"property": "TipoDocumentoEstrangeiro",
					"type": EdmType.String,
					"width": "20",
					"label": "Tipo de Doc. Estrangeiro"
				},
				{
					"property": "ValidadePassaporteRne",
					"type": EdmType.String,
					"label": "Validade da Passaporte/RNE (DD/MM/AAAA)"
				},
				{
					"property": "Qualificacao",
					"type": EdmType.String,
					"width": "50",
					"label": "Qualificações *"
				},
				{
					"property": "Funcao",
					"type": EdmType.String,
					"width": "50",
					"label": "Função *"
				},
				{
					"property": "Area",
					"type": EdmType.String,
					"width": "50",
					"label": "Área *"
				},
				{
					"property": "Motivacao",
					"type": EdmType.String,
					"width": "50",
					"label": "Motivação *"
				}

			]
		},

		getSampleDataSource: function () {
			return new Promise((resolve, reject) => {
				let oFilter = new Array();
				oFilter.push(new Filter("EmailLogin", FilterOperator.EQ, this.getUserEmailLogged()));

				this.getModel().read("/E_FuncionarioSet", {
					urlParameters: {
						"$top": 1
					},

					filters: oFilter,
					success: function (oData) {
						resolve(oData)
					},

					error: function (oError) {
						reject(oError)
					}

				})
			})
		}


	});
});