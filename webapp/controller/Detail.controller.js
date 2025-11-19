sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library",
	"sap/ui/core/util/File",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
// Inicio remediação - (C3JOAOB) - Conversao Fiori Apps - (03.06.2025)
    "sap/m/Dialog",
    'sap/m/MessageItem',
    'sap/m/MessageView',
    'sap/m/MessageToast',
    'sap/m/Button',
    'sap/m/Bar',
    'sap/m/Title',
    "sap/ui/core/IconPool",
    "sap/ui/core/library"
    // Fim remediação - (C3JOAOB) - Conversao Fiori Apps - (03.06.2025)	
], function (BaseController, JSONModel, formatter, mobileLibrary, File, MessageBox, Fragment, Dialog, MessageItem, MessageView, MessageToast,Button,Bar,Title,IconPool,coreLibrary) {
	"use strict";

	return BaseController.extend("cadastromotoristas4hana.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data		

			if (!globalThis._saveButton) {
				globalThis._saveButton = this.byId('btnSaveButton');
			}

			this._aValidKeys = ["driver", "documents", "attachments", "internal", "driver_edit", "documents_edit"];

			var oViewModel = new JSONModel({
				busy: false,
				delay: 1000,
				lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading"),
				// Set fixed currency on view model (as the OData service does not provide a currency).
				currency: "EUR",
				// the sum of all items of this order
				totalOrderAmount: 0,
				selectedTab: "",
				isEdit: false,
				attachmentsEdit: false,
				enableInternalInformation: false
			});

			oViewModel.setDefaultBindingMode("TwoWay");

			if (this.getOwnerComponent().getModel("detailView") == undefined) {
				this.getOwnerComponent().setModel(oViewModel, "detailView");
			}


			//semantic aggreations control
			this.oSemanticPage = this.byId("page");
			this.oEditAction = this.byId("editAction");

			this.isEdit = false;



			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			this.setModel(oViewModel, "detailView");

			this.getModel('detailView').getData().enableInternalInformation = this.getOwnerComponent().getModel('detailView').getData().enableInternalInformation;
			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
		// Inicio remediação - (C3JOAOB) - Conversao Fiori Apps - (03.06.2025)
			var TitleLevel = coreLibrary.TitleLevel;
			// Inicialização do modelo para as mensagens
            this._oMessageModel = new t();
            this._oMessageModel.setData([]); // Começa vazio
			var oMessageTemplate = new MessageItem({
				type: '{type}',
				title: '{title}',
				activeTitle: '{activeTitle}',
				description: '{description}',
				subtitle: '{subtitle}',
				counter: '{counter}'
			});
			this.oMessageView = new MessageView({
				showDetailsPageHeader: false, 
				itemSelect: function () {
					oBackButton.setVisible(true);
				},
				items: {
					path: "/",
					template: oMessageTemplate
				},
				activeTitlePress: function () {
					MessageToast.show('Active title pressed');
				}
			});

            // Associa o modelo ao MessageView
			this.oMessageView.setModel(this._oMessageModel);
            let that = this
            // Criação do botão de voltar para o custom header (opcional, se tiver navegação no MessageView)
            var oBackButton = new Button({
                icon: IconPool.getIconURI("nav-back"),
                visible: false, // Inicia invisível
                press: function () {
                    that.oMessageView.navigateBack();
                    this.setVisible(false); // Esconde o botão ao voltar para a lista
                }
            });

			// Criação do Dialog que conterá o MessageView
			this.oDialog = new Dialog({
				resizable: true,
				content: this.oMessageView, // O MessageView é o conteúdo principal
				state: 'Error', // Pode setar um estado inicial
				beginButton: new Button({
					press: function () {
						this.getParent().close(); // Fecha o dialog
					},
					text: "Close"
				}),
				customHeader: new Bar({ 
					contentLeft: [oBackButton], // Botão de voltar
					contentMiddle: [
						new Title({
							text: "Error Messages", // Título inicial
							level: TitleLevel.H1
						})
					]
				}),
				contentHeight: "50%",
				contentWidth: "50%",  
				verticalScrolling: false // Deixa o MessageView controlar o scroll
			});
		// Fim remediação - (C3JOAOB) - Conversao Fiori Apps - (03.06.2025)	
		
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished: function (oEvent) {
			oEvent.getSource().setBusy(false);

		},


		onListUpdateStart: function (oEvent) {
			oEvent.getSource().setBusy(true);
		},
		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var oArguments = oEvent.getParameter("arguments");
			var oQuery = oArguments["?query"];

			this.getCompanyforUser(this.getOwnerComponent().getModel()).then((sValidationUser) => {
				if (sValidationUser == true) {
					this.getModel('detailView').setProperty('/enableInternalInformation', true);
				} else if (sValidationUser == false) {
					this.getModel('detailView').setProperty('/enableInternalInformation', false);

				} else {
					MessageBox.error(sValidationUser);
				}
			});

			this._sObjectId = oArguments.objectId;

			// Don't show two columns when in full screen mode
			if (this && this.getModel("appView").getProperty("/layout") !== "MidColumnFullScreen") {
				this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			} else if (!this) {
				return
			}

			this.getModel().metadataLoaded().then(function () {
				var sObjectPath = this.getModel().createKey("E_FuncionarioSet", {
					Cpf: this._sObjectId,
					EmailLogin: this.getUserEmailLogged()
				});
				this._bindView("/" + sObjectPath, this._sObjectId, oQuery.tab);
			}.bind(this));


			if (this.getModel('detailView').getProperty('/isEdit') == true && oQuery.tab !== "attachments") {
				oQuery.tab = oQuery.tab + "Edit";
			}

			if (oQuery && this._aValidKeys.indexOf(oQuery.tab) >= 0) {
				this.getView().getModel("detailView").setProperty("/selectedTab", oQuery.tab);
				this.getRouter().getTargets().display(oQuery.tab);
			} else {
				this.getRouter().navTo("object", {
					objectId: this._sObjectId,
					query: {
						tab: "driver"
					}
				}, true);
			}
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function (sObjectPath, sCpf, sTab) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			//Filter Vinc Table				
			let oItemsBiding = this.getView().byId('lineItemsList').getBinding('items');
			if (sCpf) {
				if (oItemsBiding.aFilters.length === 0 || oItemsBiding.aFilters[1].oValue1 != sCpf) {
					let oUserFilter = new sap.ui.model.Filter("EmailLogin", sap.ui.model.FilterOperator.EQ, this.getUserEmailLogged()),
						oCpfFilter = new sap.ui.model.Filter("Cpf", sap.ui.model.FilterOperator.EQ, sCpf);

					oItemsBiding.filter([oUserFilter, oCpfFilter]);
				}
			}

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					}.bind(this),
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}.bind(this)
				}
			});
		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			if (oView.getViewName().includes("Detail")) {
				//remove display views's and set editable view's
				const sTabKey = this.getView().byId("iconTabBar").getSelectedKey();
				let oItems = this.getView().byId("iconTabBar").getItems();

				for (let i in oItems) {
					if (oItems[i].getKey() === sTabKey && sTabKey !== 'attachments') {
						this.getView().byId(oItems[i].getId()).removeContent(0);

						this.getOwnerComponent().oListSelector.clearMasterListSelection();

						if (this.getOwnerComponent().getModel("detailView").getProperty('/isEdit') == true) {
							this.getOwnerComponent().getModel("detailView").setProperty("/attachmentsEdit", true);
							this.getRouter().getTargets().display(oItems[i].getKey() + "_edit", oElementBinding.getPath());
							break
						}

						this.getRouter().getTargets().display(oItems[i].getKey(), oElementBinding.getPath());
						break
					}
				}
			}
		},

		_onMetadataLoaded: function (oEvent, Teste) {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView"),
				oLineItemTable = this.byId("lineItemsList"),
				iOriginalLineItemTableBusyDelay;

			if (!oLineItemTable) {
				iOriginalLineItemTableBusyDelay = 1000;
			} else {

				iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

				oLineItemTable.attachEventOnce("updateFinished", function () {
					// Restore original busy indicator delay for line item table
					oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
				});
			}


			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);



			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},
		onTabSelect: function (oEvent) {
			const sSelectedTab = oEvent.getParameter("selectedKey"),
				sPath = this.getView().getElementBinding().getPath();

			this.getRouter().navTo("object", {
				objectId: this._sObjectId,
				query: {
					tab: sSelectedTab
				}
			}, true);// true without history

			this._bindView(sPath, this._sObjectId, sSelectedTab)
		},

		_onHandleTelephonePress: function (oEvent) {
			var sNumber = oEvent.getSource().getText();
			URLHelper.triggerTel(sNumber);
		},


		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}

		},
		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onEditDetail: function () {
			const sPath = this.getView().getElementBinding().getPath();
			const sRestricao = this.getModel().getProperty(sPath).Restricao;
			const sEnableInternalInformation = this.getModel('detailView').getData().enableInternalInformation;

			if (sRestricao && !sEnableInternalInformation) {
				MessageBox.error('Registro com restrição');
				return
			}

			this.getModel("appView").setProperty("/actionButtonsInfo/isEdit", true);

			if (this.getView().byId('iconTabBar').getSelectedKey() == 'attachments') {
				let oUploadSet = this.getView().byId('iconTabFilterAttachments').getAggregation('content')[0].getAggregation('content')[0];

				oUploadSet.setUploadEnabled(true);
				oUploadSet.getItems().forEach((oItem) => {
					oItem.setEnabledRemove(true);
				});
			}

			this.showFooterDetail(true);
			this.oEditAction.setVisible(false);
			this.getOwnerComponent().getModel("detailView").setProperty('/isEdit', true);
			this.isEdit = true;

			this.getOwnerComponent().getModel("detailView").setProperty('/attachmentsEdit', true);
			this._bindView(sPath);
		},

		onSaveDetail: async function () {
			this.getView().setBusy(true);
			this.getModel("appView").setProperty("/actionButtonsInfo/isEdit", false);
			
			let sPath = this.getView().getElementBinding().getPath();
			let oValues = this.getModel().getProperty(sPath);
			if (this.getView().byId('iconTabBar').getSelectedKey() == 'attachments') {
				let oUploadSet = this.getView().byId('iconTabFilterAttachments').getAggregation('content')[0].getAggregation('content')[0];

				oUploadSet.setUploadEnabled(false);
				oUploadSet.getItems().forEach((oItem) => {
					oItem.setEnabledRemove(false);
				});
			}

			oValues.EmailM = this.getUserEmailLogged();
			var haveError;

			// if (this.getModel().hasPendingChanges()) {
			await this._updateDriverData(sPath, oValues).then((oResponse) => {
				MessageBox.success("Dados atualizados com sucesso!", {
					onClose: function () {
						this.getView().setBusy(false);
						this.getModel().refresh();
					}.bind(this)
				})
			}).catch((oError) => {
			// Remediação S4 - (C3JOAOB) - (03.06.2025) - Inicio.
				this.getView().setBusy(false);  
				let aMessages = []
        	// Remediação S4 - (C3JOAOB) - (03.06.2025) - Fim.

				oError.forEach((oItem) => {
					haveError = true;

					if (oItem.code === "ZVALIDATION/099") {
						let oTabItems = this.getView().byId("iconTabBar").getItems(),
							oDriverView = oTabItems[0].getContent()[0],
							oDocumentsView = oTabItems[1].getContent()[0];

						if (oDriverView !== undefined) {
							if (oDriverView.byId("input" + oItem.target)) {
								oDriverView.byId("input" + oItem.target).setValueState("Error").setValueStateText(oItem.message);
							} else
								if (oDriverView.byId("cb" + oItem.target)) {
									oDriverView.byId("cb" + oItem.target).setValueState("Error").setValueStateText(oItem.message);
								}
						}
						// Inicio remediação - (C3JOAOB) - Conversao Fiori Apps - (03.06.2025)
						aMessages.push({
							type: 'Error', // Tipo de mensagem
							title: e.message, // Título da mensagem 
							description: 'Field: ' + e.target,
							target: e.target //Target para conseguir ir ao ponto do erro
						});
						// Fim remediação - (C3JOAOB) - Conversao Fiori Apps - (03.06.2025)
						if (oDocumentsView !== undefined) {
							if (oDocumentsView.byId("input" + oItem.target) && oTabItems[1].getContent()) {
								oDocumentsView.byId("input" + oItem.target).setValueState("Error").setValueStateText(oItem.message);
							} else
								if (oDocumentsView.byId("cb" + oItem.target) && oTabItems[1].getContent()) {
									oDocumentsView.byId("cb" + oItem.target).setValueState("Error").setValueStateText(oItem.message);
								}
						}
					}

					if (oItem.code === "/IWBEP/CX_MGW_BUSI_EXCEPTION") {
					// Inicio remediação - (C3JOAOB) - Conversao Fiori Apps - (03.06.2025)
						 aMessages.push({
							type: 'Error',
							title: "Erro geral do sistema", 
							description: e.message 
						});

						// s.error("Erro ao atualizar dados", {
						//   onClose: function () {
						//     this.getView().setBusy(false);
						//   }.bind(this),
						// });
					}
				});
					if (aMessages.length > 0) {
					this.onDisplayErrorMessages(aMessages);
					}
				// Fim remediação - (C3JOAOB) - Conversao Fiori Apps - (03.06.2025)
			});
			// }

			if (haveError) {
				return
			}

			this.showFooterDetail(false);
			this.oEditAction.setVisible(true);
			this.isEdit = false;
			this.getOwnerComponent().getModel("detailView").setProperty('/isEdit', false);
			this.getOwnerComponent().getModel("detailView").setProperty('/attachmentsEdit', false);
			this._bindView(sPath);
			this.getView().setBusy(false);
		},

		onCancelDetail: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/isEdit", false);
			const sPath = this.getView().getElementBinding().getPath();
			if (this.getView().byId('iconTabBar').getSelectedKey() == 'attachments') {
				let oUploadSet = this.getView().byId('iconTabFilterAttachments').getAggregation('content')[0].getAggregation('content')[0];

				oUploadSet.setUploadEnabled(false);
				oUploadSet.getItems().forEach((oItem) => {
					oItem.setEnabledRemove(false);
				});
			}

			this.getModel().resetChanges();
			this.showFooterDetail(false);
			this.oEditAction.setVisible(true);
			this.isEdit = false;
			this.getOwnerComponent().getModel("detailView").setProperty('/isEdit', false);
			this.getOwnerComponent().getModel("detailView").setProperty('/attachmentsEdit', false);
			this._bindView(sPath);
		},
	// S4 Remediação - (C3JOAOB) - (03.06.2025) - Inicio    
        onDisplayErrorMessages: function(aMessages){
           // Limpa o modelo atual e adiciona as novas mensagens
			this._oMessageModel.setData(aMessages);
			// Abre o dialog
			if (this.oDialog.isOpen()) {
				this.oMessageView.navigateBack(); // Volta para a lista se já estava aberto e mostrando detalhes
			} else {
				this.oDialog.open();
			}
        },
    // S4 Remediação - (C3JOAOB) - (03.06.2025) - Fim   		

		showFooterDetail: function (bShow) {
			this.oSemanticPage.setShowFooter(bShow);
		},

		_updateDriverData: function (sPath, oValues) {
			return new Promise((resolve, reject) => {
				this.getModel().update(sPath, oValues, {
					success: function (oData, oResponse) {
						if (oResponse.statusCode === "204") {
							resolve(oResponse);
						} else {
							reject(oError)
						}


					},

					error: function (oError) {
						let oErrorDetails = JSON.parse(oError.responseText).error.innererror.errordetails;
						reject(oErrorDetails);
					}
				});
			})
		},

		handleChange: async function (oEvent) {
			oEvent.getSource().setValueState('None');
		},

		validationField: function (aParameters) {
			return new Promise((resolve, reject) => {
				this.getModel().callFunction("/validationFunction", {
					method: "GET",
					urlParameters: aParameters,
					success: function (oData) {
						resolve(oData)
					},
					error: function (oError, oResponse) {
						reject(oError)
					}
				}
				)
			})
		},

		handleDateChange: function (oEvent) {
			let oDateField = oEvent.getSource();
			const sValue = oDateField.getBinding('value').getValue(),
				sToday = new Date();

			oDateField.setValueState('None');

			if (oDateField.getId().includes('inputDataValidadeCnh')) {
				if (sValue < sToday) {
					oDateField.setValueState('Error');
					oDateField.setValueStateText('Validade da CNH Vencida');
				}

				return;
			}



			if (oDateField.getId().includes('inputValidadePassaporteRne')) {
				if (sValue < sToday) {
					oDateField.setValueState('Error');
					oDateField.setValueStateText('Validade do Passaport ou RNE Vencido');
				}

				return;
			}

			if (sValue >= sToday) {
				oDateField.setValueState('Error');
				oDateField.setValueStateText('Data, não pode ser maior ou igual a data de hoje');
			}
		},

		handleValidDate: function (oEvent) {
			let oDateField = oEvent.getSource();

			const sValue = oDateField.getBinding('value').getValue(),
				sToday = new Date();

			oDateField.setValueState('None');

			if (sValue < sToday) {
				oDateField.setValueState('Error');
				oDateField.setValueStateText('Data de validade vencida!');
			}
		},

		onUploadSelectedButton: function (oEvent) {
			let oUploadSet = this.byId('attachmentUpl');

			oUploadSet.getItems().forEach(function (oItem) {
				if (oItem.getListItem().getSelected()) {
					oUploadSet.uploadItem(oItem);
				}
			});
		},

		handleUploadComplete: function (oEvent) {
			if (oEvent.getParameter('status') == 400) {

				const xmlString = oEvent.getParameter('response');
				const parser = new DOMParser();
				const xmlDoc = parser.parseFromString(xmlString, "application/xml");

				// Especificando o namespace do XML
				const namespace = "http://schemas.microsoft.com/ado/2007/08/dataservices/metadata";

				// Obtendo o conteúdo da primeira tag <message>
				const messageTag = xmlDoc.getElementsByTagNameNS(namespace, "message")[0];
				const messageContent = messageTag ? messageTag.textContent : "Erro tecnico, favor entrar em contato com o Administrador da Aplicação";

				MessageBox.error(messageContent)
			}

			this.getModel().refresh(true);
			oEvent.getSource().setBusy(false);
		},

		onAfterItemAdded: async function (oEvent) {
			const cpf = this.getModel().getProperty(this.getView().getParent().getBindingContext().getPath()).Cpf;

			let oItem = oEvent.getParameter('item'),
				oUploadSet = oEvent.getSource();

			await this.displayCategoryDialog(oItem, oUploadSet);
		},

		onBeforeItemRemove: function (oEvent) {
			oEvent.getParameter('item').getStatuses().forEach((oItem) => {
				if (oEvent.getParameter('item').getStatuses()[2].getProperty('title') === 'ID') {
					this.deleteAttachmentId = oEvent.getParameter('item').getStatuses()[2].getProperty('text');
				}
			})
		},

		onRemoveAttachmentPress: async function (oEvent) {
			const cpf = this.getModel().getProperty(this.getView().getParent().getBindingContext().getPath()).Cpf;
			const fileID = this.deleteAttachmentId;

			let oUploadSet = this.getView().byId('attachmentUpl');

			this.getModel().setHeaders({
				"x-csrf-token": "Fetch"
			});

			oUploadSet.setBusy(true);

			await this.getModel().remove(`/E_AnexosSet(DocId='${fileID}',IdRep='${cpf}')/$value`, {
				success: async function (oData) {
					oUploadSet.setBusy(false);
					this.getModel().refresh();
				}.bind(this),
				error: function (oError) {
					JSON.parse(oError.responseText).error.message.value
					oUploadSet.setBusy(false)
				}
			})
		},

		onDownloadSelectedButton: function (oEvent) {
			let oUploadSet = this.byId('attachmentUpl'),
				selectedFile = oUploadSet.getSelectedItem()[0];


			// Endpoint do arquivo binário
			const sPath = `${selectedFile.getBindingContext()}/$value`;

			// A chamada será feita diretamente via XMLHttpRequest para tratar o binário
			var oRequest = new XMLHttpRequest();
			oRequest.open("GET", this.getModel().sServiceUrl + sPath, true);
			oRequest.setRequestHeader("Accept", "application/octet-stream"); // Ou outro MIME Type adequado
			oRequest.responseType = "blob"; // Define a resposta como binário (blob)

			// Tratar a resposta da requisição
			oRequest.onload = function () {
				if (oRequest.status === 200) {
					// Obtendo os dados da view
					var oUploadSet = this.byId("attachmentUpl");

					// Criar um Blob para o arquivo
					var oBlob = oRequest.response;

					var MimeType = oRequest.getResponseHeader("Content-Type"),
						extension = "";

					//Atribuindo Extension baseado no MimeType ( Adicionar mais, caso necessário )
					switch (MimeType) {
						case "application/pdf":
							extension = ".pdf";
							break;
						case "image/jpeg":
							extension = ".jpg";
							break;
						case "image/png":
							extension = ".png";
							break;
						case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
							extension = ".xlsx";
							break;
						case "plain/text":
							extension = ".txt";
							break;
						case "application/msword":
							extension = ".doc";
							break;
						case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
							extension = ".docx";
							break;
						// Adicione outros tipos MIME conforme necessário
						default:
							extension = ".bin"; // Extensão genérica para binário
					}

					// Criar o link de download
					var oLink = document.createElement("a");
					oLink.href = window.URL.createObjectURL(oBlob);
					oLink.download = "" + oUploadSet.getSelectedItem()[0].getFileName() + extension;//"file.ext"; // Nome do arquivo a ser baixado
					oLink.click(); // Dispara o download
				} else {
					this._handleError(oRequest);
				}
			}.bind(this);

			// Caso ocorra erro
			oRequest.onerror = function () {
				sap.m.MessageToast.show("Erro na requisição do arquivo.");
			};

			// Enviar a requisição
			oRequest.send();
		},
		// Função para tratar os erros do Gateway
		_handleError: function (oRequest) {
			var sErrorMessage = "Erro ao fazer o download do arquivo.";
			// var contentType = oRequest.getResponseHeader("Content-Type");

			// contentType = "application/json";

			var fileReader = new FileReader();
			fileReader.onload = function () {
				var oParser = new DOMParser();
				var oDoc = oParser.parseFromString(fileReader.result, "application/xml");
				var sMessageNode = oDoc.getElementsByTagName("message")[0];
				if (sMessageNode) {
					sErrorMessage = sMessageNode.textContent;
				}
				MessageBox.error(sErrorMessage);
			};
			fileReader.readAsText(oRequest.response); // Lê o conteúdo binário como texto XML
		},

		onAfterRederingAttachments: async function (oEvent) {
			let oUploadSet = oEvent.getSource().byId('attachmentUpl');
			const sServicePath = "sap/opu/odata/sap/ZGTWHR032_MOTORISTA_SRV/E_AnexosSet";

			if (this.getOwnerComponent().getModel("detailView").getProperty("/isEdit")) {
				this.getModel("detailView").setProperty('/attachmentsEdit', true);
			} else {
				this.getModel("detailView").setProperty('/attachmentsEdit', false)
			}
			//if Open Application from WorkZone BTP, set BTP Url on Service 
			if (this.getOwnerComponent()._componentConfig != undefined) {
				const sBtpUrlPath = this.getOwnerComponent()._componentConfig.url;

				if (sBtpUrlPath && sBtpUrlPath.length > 1) {
					oUploadSet.setUploadUrl(sBtpUrlPath + sServicePath);
				}

			} else if (this.getOwnerComponent()._oManifest != undefined) {
				const sBtpUrHTML5lPath = this.getOwnerComponent()._oManifest._oBaseUri._string;

				if (this.getOwnerComponent()._oManifest._oBaseUri._string.length > 1) {
					oUploadSet.setUploadUrl(sBtpUrHTML5lPath + sServicePath);
				}
			}
		},

		onLoadCity: function (oEvent) {
			if (oEvent.getSource().getBindingContext()) {
				const sKey = this.getModel().getProperty(oEvent.getSource().getBindingContext().getPath() + "/Estado");
				const oFilter = new sap.ui.model.Filter("Region", sap.ui.model.FilterOperator.EQ, sKey);
				this.byId('cbCidades').bindItems({
					path: "/SH_CidadesSet",
					filters: [oFilter],
					length: 5000,
					template: new sap.ui.core.Item({
						key: "{Taxjurcode}",
						text: "{Text}"
					})
				});
			}

		},

		onComboBoxChange: function (oEvent) {

			const oValidatedComboBox = oEvent.getSource(),
				sKey = oValidatedComboBox.getSelectedKey(),
				sText = oValidatedComboBox.getValue();

			if (!sKey && sText) {
				oValidatedComboBox.setValueState('Error');
				oValidatedComboBox.setValueStateText("Preencha um valor válido!");
				globalThis._saveButton.setEnabled(false);
			} else {
				oValidatedComboBox.setValueState('None');
				globalThis._saveButton.setEnabled(true);
			}

			switch (true) {
				case oEvent.getSource().getId().includes("cbCidades"):
					this.getModel().setProperty(oEvent.getSource().getBindingContext().getPath() + "/Cidade", sText);
					this.getModel().setProperty(oEvent.getSource().getBindingContext().getPath() + "/DomicCode", sKey);
					break;
				case oEvent.getSource().getId().includes("cbEstado"):
					this.getModel().setProperty(oEvent.getSource().getBindingContext().getPath() + "/Estado", sKey);
					// if (sKey !== '') {
					const oFilter = new sap.ui.model.Filter("Region", sap.ui.model.FilterOperator.EQ, sKey);
					this.byId('cbCidades').bindItems({
						path: "/SH_CidadesSet",
						filters: [oFilter],
						length: 5000,
						template: new sap.ui.core.Item({
							key: "{Taxjurcode}",
							text: "{Text}"
						})
					})
					// }
					break;
				case oEvent.getSource().getId().includes("cbQualificacao"):
					this.getModel().setProperty(oEvent.getSource().getBindingContext().getPath() + "/Qualificacao", sKey);
					break;
				case oEvent.getSource().getId().includes("cbArea"):
					this.getModel().setProperty(oEvent.getSource().getBindingContext().getPath() + "/Area", sKey);
					break;
				case oEvent.getSource().getId().includes("cbFuncao"):
					this.getModel().setProperty(oEvent.getSource().getBindingContext().getPath() + "/Funcao", sKey);
					break;
				case oEvent.getSource().getId().includes("cbMotivacao"):
					this.getModel().setProperty(oEvent.getSource().getBindingContext().getPath() + "/Motivacao", sKey);
					break;
				case oEvent.getSource().getId().includes("cbTipoDocumentoEstrangeiro"):
					this.getModel().setProperty(oEvent.getSource().getBindingContext().getPath() + "/TipoDocumentoEstrangeiro", sKey);
					break;
			}
		},

		onSelectEstrangeiro: function (oEvent) {
			this.getView().byId('cbTipoDocumentoEstrangeiro').setValueState('None');
			this.getView().byId('inputPassaporteRne').setValueState('None');
		},

		onPressVincular: async function (oEvent) {
			let pernr = this.getModel().getProperty(this.getView().getBindingContext().getPath()).Pernr,
				EmailLogin = this.getUserEmailLogged();

			this.getModel().createEntry("/E_FuncionarioVinculoSet",
				{
					properties: {
						Pernr: pernr,
						EmailLogin: EmailLogin
					}
				});

			this.getView().setBusy(true);

			await this.createVinculo(this).then((oResponse) => {
				MessageBox.success('Transportadora vinculada com Sucesso!');
				this.getModel().resetChanges();
				this.getView().setBusy(false);
			}).catch((oError) => {
				this.getView().setBusy(false);
				let message = JSON.parse(oError.data.__batchResponses[0].response.body).error.message.value;
				MessageBox.error(message);
			});
		},

		onPressDesvincular: async function (oEvent) {
			let sPath = this.getView().byId("lineItemsList").getSelectedContextPaths()[0];

			if (!sPath) {
				MessageBox.error('Selecionar linha para desvinculo');
				return;
			}

			this.getView().setBusy(true);

			await this.removeVinculo(sPath).then((oResponse) => {
				this.getModel().refresh();
				this.oSemanticPage.getCloseAction().firePress();
				this.getView().setBusy(false);
				MessageBox.success('Transportadora desvinculada com Sucesso!');
			}).catch((oError) => {
				this.getView().setBusy(false);
				this.getModel().refresh();
				this.oSemanticPage.getCloseAction().firePress();
				let message = JSON.parse(oError.responseText).error.message.value;
				MessageBox.error(message);
			})
		},

		createVinculo: function (oMasterContext) {
			return new Promise((resolve, reject) => {
				this.getModel().submitChanges({
					success: function (oResponse, oError) {
						if (oResponse.__batchResponses[0].response.statusCode === "201") {
							resolve(oResponse);
						} else {
							reject(oError)
						}


					},

					error: function (oError) {
						this.getModel().resetChanges();
						reject(oError)
					}
				});
			})
		},

		removeVinculo: function (sPath) {
			return new Promise((resolve, reject) => {
				this.getModel().remove(sPath, {
					success: function (oData, oResponse) {
						if (oResponse.statusCode === "204") {
							resolve(oResponse);
						} else {
							reject(oError)
						}
					},

					error: function (oError) {
						reject(JSON.parse(oError.responseText).error.message.value)
					}
				});
			})
		},

		getAttchments: function (oFilter) {
			return new Promise((resolve, reject) => {
				this.getModel().read('/E_AnexosSet', {
					filters: [oFilter],
					success: function (oData) {
						resolve(oData)
					},

					error: function (oError, oResponse) {
						reject(oError)
					}
				})
			})
		},

		getCompanyforUser: async function (oModel) {
			var aParameters = { EmailLogin: this.getUserEmailLogged() };

			return await this.callCompanyFucntion(oModel, aParameters).then((oData) => {
				if (oData.validationUser.IsEldorado == true) {
					return true
				} else {
					return false
				}
			}
			).catch((oError) => {
				return JSON.parse(oError.responseText).error.message.value
			});
		},

		callCompanyFucntion: async function (oModel, aParameters) {
			return new Promise((resolve, reject) => {
				oModel.callFunction("/validationUser", {
					method: "GET",
					urlParameters: aParameters,
					success: function (oData) {
						resolve(oData)
					},
					error: function (oError, oResponse) {
						reject(oError)
					}
				})
			});
		},

		displayCategoryDialog: function (oItem, oUploadSet) {
			if (!this._pViewSettingsDialog) {
				this._pViewSettingsDialog = Fragment.load({
					id: this.getView().getId(),
					name: "cadastromotoristas4hana.view.FileCategory",
					controller: this
				}).then(function (oDialog) {
					// connect dialog to the root view of this component (models, lifecycle)
					this.getView().addDependent(oDialog);
					return oDialog;
				}.bind(this));
			}

			this._pViewSettingsDialog.then(function (oDialog) {
				oDialog.selectedFile = oItem;
				oDialog.oUploadSet = oUploadSet;
				oDialog.open();
			});
		},

		onConfirmCategory: function (oEvent) {
			let oUploadSet = this.getView().getDependents()[0].oUploadSet,
				oSelectedFile = this.getView().getDependents()[0].selectedFile;

			const sFileCategory = this.getView().byId('cbCategArquivo').getSelectedKey();
			const cpf = this.getModel().getProperty(this.getView().getParent().getBindingContext().getPath()).Cpf;
			const sFileName = oSelectedFile.getFileName();

			oUploadSet.setBusy(true);

			let oXCSRFToken = new sap.ui.core.Item({
				key: "x-csrf-token",
				text: this.getOwnerComponent().getModel().getSecurityToken()
			});

			let oSlug = new sap.ui.core.Item({
				key: "SLUG",
				text: sFileName
			});

			let oCpf = new sap.ui.core.Item({
				key: "IdRep",
				text: cpf
			});

			let oFileCategory = new sap.ui.core.Item({
				key: "fileCat",
				text: sFileCategory
			});

			oUploadSet.removeAllHeaderFields();
			oUploadSet.addHeaderField(oXCSRFToken).addHeaderField(oSlug).addHeaderField(oCpf).addHeaderField(oFileCategory).uploadItem(oSelectedFile);
			this.getView().getDependents()[0].close();

		},

		onCloseDialogCategory: function (oEvent) {
			//Remove o anexo incompleto, cancelado pelo usuário
			this.getView().getContent()[0].getIncompleteItems()[0].destroy();
			oEvent.getSource().getParent().close();
		},

		onAfterDocumentsRendering: async function (oEvent) {

			let results = await this.getValuesComboBox().then((results) => {
				// MessageBox.success("Dados Carregados");
				return results
			}).catch((oError) => {
				//MessageBox.error(oError)
			})

			if (results !== undefined) {
				if (results.length > 0) {
					results.forEach(element => {
						if (this.byId(element.idCampo).isA('sap.m.ComboBox')) {
							this.byId(element.idCampo).setValue(element.descricao)
						} else {
							this.byId(element.idCampo).setText(element.descricao)
						}

					});
				}
			}

		},

		getValuesComboBox: function (sPath) {
			if ((this.getView().getViewName() === "cadastromotoristas4hana.view.Driver") ||
				this.getView().getViewName() === "cadastromotoristas4hana.view.DriverEdit") {
				return Promise.all([
					this._promiseEstado(),
					this._promiseQualificacao(),
					this._promiseArea(),
					this._promiseFuncao(),
					this._promiseMotivacao()
				])
			} else if ((this.getView().getViewName() === "cadastromotoristas4hana.view.Documents") ||
				this.getView().getViewName() === "cadastromotoristas4hana.view.DocumentsEdit") {
				return Promise.all([
					this._promiseTipoDocumentoEstrangeiro()
				])
			}
		},

		_promiseEstado: async function () {
			var that = this;

			return new Promise(function (resolve, reject) {

				that.getEstado(resolve, reject);

			})
		},

		getEstado: function (resolve, reject) {
			var Estado = this.getModel().getProperty(this.getView().getBindingContext().getPath()).Estado,
				sViewDocuments = this.getView().getViewName();


			if (!Estado) {
				let _resultEstado;
				if (sViewDocuments == "cadastromotoristas4hana.view.DriverEdit") {
					_resultEstado = { idCampo: 'cbEstado', descricao: '' }
				} else {
					_resultEstado = { idCampo: 'IdEstado', descricao: '' }
				}
				resolve(_resultEstado);
				return;
			}

			this.getModel().read("/SH_EstadosSet(Estado='" + Estado + "')", {
				success: function (oData) {
					let _resultEstado;
					if (sViewDocuments == "cadastromotoristas4hana.view.DriverEdit") {
						_resultEstado = { idCampo: 'cbEstado', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					} else {
						_resultEstado = { idCampo: 'IdEstado', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					}
					resolve(_resultEstado);
				},

				error: function (oError, oResponse) {
					// console.log(oError);
					reject("_promiseEstado");
				}
			})
		},

		_promiseQualificacao: async function () {
			var that = this;

			return new Promise(function (resolve, reject) {

				that.getQualificacao(resolve, reject);

			})
		},

		getQualificacao: function (resolve, reject) {
			var Qualificacao = this.getModel().getProperty(this.getView().getBindingContext().getPath()).Qualificacao,
				sViewDocuments = this.getView().getViewName();


			if (!Qualificacao) {
				let _resultQualificacao;
				if (sViewDocuments == "cadastromotoristas4hana.view.DriverEdit") {
					_resultQualificacao = { idCampo: 'cbQualificacao', descricao: '' }
				} else {
					_resultQualificacao = { idCampo: 'IdQualificacao', descricao: '' }
				}
				resolve(_resultQualificacao);
				return;
			}

			this.getModel().read("/SH_QualificacaoSet(Id='" + Qualificacao + "')", {
				success: function (oData) {
					let _resultQualificacao;
					if (sViewDocuments == "cadastromotoristas4hana.view.DriverEdit") {
						_resultQualificacao = { idCampo: 'cbQualificacao', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					} else {
						_resultQualificacao = { idCampo: 'IdQualificacao', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					}
					resolve(_resultQualificacao);
				},

				error: function (oError, oResponse) {
					// console.log(oError);
					reject("_promiseQualificacao");
				}
			})
		},

		_promiseArea: async function () {
			var that = this;

			return new Promise(function (resolve, reject) {

				that.getArea(resolve, reject);

			})
		},

		getArea: function (resolve, reject) {
			var Area = this.getModel().getProperty(this.getView().getBindingContext().getPath()).Area,
				sViewDocuments = this.getView().getViewName();

			if (!Area) {
				let _resultArea;
				if (sViewDocuments == "cadastromotoristas4hana.view.DriverEdit") {
					_resultArea = { idCampo: 'cbArea', descricao: '' }
				} else {
					_resultArea = { idCampo: 'IdArea', descricao: '' }
				}
				resolve(_resultArea);
				return;
			}

			this.getModel().read("/SH_AreaSet(Id='" + Area + "')", {
				success: function (oData) {
					let _resultArea;
					if (sViewDocuments == "cadastromotoristas4hana.view.DriverEdit") {
						_resultArea = { idCampo: 'cbArea', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					} else {
						_resultArea = { idCampo: 'IdArea', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					}
					resolve(_resultArea);
				},

				error: function (oError, oResponse) {
					// console.log(oError);
					reject("_promiseArea");
				}
			})
		},

		_promiseFuncao: async function () {
			var that = this;

			return new Promise(function (resolve, reject) {

				that.getFuncao(resolve, reject);

			})
		},

		getFuncao: function (resolve, reject) {
			var Funcao = this.getModel().getProperty(this.getView().getBindingContext().getPath()).Funcao,
				sViewDocuments = this.getView().getViewName();

			if (!Funcao) {
				let _resultFuncao;
				if (sViewDocuments == "cadastromotoristas4hana.view.DriverEdit") {
					_resultFuncao = { idCampo: 'cbFuncao', descricao: '' }
				} else {
					_resultFuncao = { idCampo: 'IdFuncao', descricao: '' }
				}
				resolve(_resultFuncao);
				return;
			}

			this.getModel().read("/SH_FuncaoSet(Id='" + Funcao + "')", {
				success: function (oData) {
					let _resultFuncao;
					if (sViewDocuments == "cadastromotoristas4hana.view.DriverEdit") {
						_resultFuncao = { idCampo: 'cbFuncao', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					} else {
						_resultFuncao = { idCampo: 'IdFuncao', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					}
					resolve(_resultFuncao);
				},

				error: function (oError, oResponse) {
					// console.log(oError);
					reject("_promiseFuncao");
				}
			})
		},

		_promiseMotivacao: async function () {
			var that = this;

			return new Promise(function (resolve, reject) {

				that.getMotivacao(resolve, reject);

			})
		},

		getMotivacao: function (resolve, reject) {
			var Motivacao = this.getModel().getProperty(this.getView().getBindingContext().getPath()).Motivacao,
				sViewDocuments = this.getView().getViewName();

			if (!Motivacao) {
				let _resultMotivacao;
				if (sViewDocuments == "cadastromotoristas4hana.view.DriverEdit") {
					_resultMotivacao = { idCampo: 'cbMotivacao', descricao: '' }
				} else {
					_resultMotivacao = { idCampo: 'IdMotivacao', descricao: '' }
				}
				resolve(_resultMotivacao);
				return;
			}

			this.getModel().read("/SH_MotivacaoSet(Id='" + Motivacao + "')", {
				success: function (oData) {
					let _resultMotivacao;
					if (sViewDocuments == "cadastromotoristas4hana.view.DriverEdit") {
						_resultMotivacao = { idCampo: 'cbMotivacao', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					} else {
						_resultMotivacao = { idCampo: 'IdMotivacao', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					}
					resolve(_resultMotivacao);
				},

				error: function (oError, oResponse) {
					// console.log(oError);
					reject("_promiseMotivacao");
				}
			})
		},

		_promiseTipoDocumentoEstrangeiro: async function (sViewDocuents) {
			var that = this;

			return new Promise(function (resolve, reject) {

				that.getTipoDocumentoEstrangeiro(resolve, reject);

			})
		},

		getTipoDocumentoEstrangeiro: function (resolve, reject) {
			var TipoDocumentoEstrangeiro = this.getModel().getProperty(this.getView().getBindingContext().getPath()).TipoDocumentoEstrangeiro,
				sViewDocuments = this.getView().getViewName();

			if (!TipoDocumentoEstrangeiro) {
				let _resultTipoDocEstrangeiro;
				if (sViewDocuments == "cadastromotoristas4hana.view.DriverEdit") {
					_resultTipoDocEstrangeiro = { idCampo: 'cbTipoDocumentoEstrangeiro', descricao: '' }
				} else {
					_resultTipoDocEstrangeiro = { idCampo: 'IdTipoDocumentoEstrangeiro', descricao: '' }
				}
				resolve(_resultTipoDocEstrangeiro);
				return;
			}

			this.getModel().read("/SH_TipoDocEstrangeiroSet(Id='" + TipoDocumentoEstrangeiro + "')", {
				success: function (oData) {
					let _resultTipoDocEstrangeiro;
					if (sViewDocuments == "cadastromotoristas4hana.view.DocumentsEdit") {
						_resultTipoDocEstrangeiro = { idCampo: 'cbTipoDocumentoEstrangeiro', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					} else {
						_resultTipoDocEstrangeiro = { idCampo: 'IdTipoDocumentoEstrangeiro', descricao: (oData.Descricao !== '') ? oData.Descricao : '' }
					}
					resolve(_resultTipoDocEstrangeiro);
				},

				error: function (oError, oResponse) {
					// console.log(oError);
					reject("_promiseTipoDocumentoEstrangeiro");
				}
			})
		}

	});
});