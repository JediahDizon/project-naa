export default {

	/**
	 * GET SCHEMA VERSION
	 *
	 * Considering that we need to make a migration whenever there is a modificiation
	 * to the current table schemas, we might as well bind a schema version beside
	 * the schema definition themselves.
	 *
	 * NOTE:
	 * Whenever there is a change in the schema, this number must increment accordingly.
	 *
	 * @return {int} - The current version of the schema
	 */
	getSchemaVersion() {
		return 92;
	},

	getSchema() {
		return [
			{
				name: "Project",
				primaryKey: "id",
				properties: {
					alerts: "string?",
					assignedTo: "string?",
					attachments: "string?",
					comment: "string?",
					creationDate: "string?",
					files: "File[]",
					id: "string",
					name: "string?",
					tasks: "string?"
				}
			},
			{
				name: "Task",
				primaryKey: "id",
				properties: {
					// Based from the `getTaskDetail` endpoint response data
					activityId: "string?",
					activityType: "string?",
					asideContent: "string?",
					assetId: "string?",
					assignedByUserId: "string?",
					assignedUserId: "string?",
					assingnedTo: "string?",
					bpmStatus: "string?",
					canClose: "bool?",
					customTypes: "string?",
					datum: "string?",
					deadLine: "string?",
					extraDetailsJson: "string?",
					files: "File[]",
					form: "string?",
					id: "string",
					jurisdiction: "string?",
					key: "string?",
					manual: "string?",
					model: "string?",
					name: "string?",
					namedConditions: "string?",
					overview: "string?",
					photoTypes: "string?",
					priority: "string?",
					processCommonData: "string?",
					processTypes: "string?",
					progress: "string?",
					progressUpdateComments: "string?",
					regulatoryAgency: "string?",
					regulatoryId: "string?",
					schema: "string?",
					status: "string?",
					taskDDS: "string?",
					taskProjectAlerts: "string?",
					tasksProjectsFiles: "string?",
					type: "string?",
					uiDefinition: "string?",
					well: "string?"
					// well: "Well?"
				}
			},

			/**
			 * FORM
			 *
			 * DEPRECATED - We now use the Task DB to get any form that is needed.
			 *
			 * This contains a single task found in the payload of the `getTaskDetail`
			 * endpoint from TORC Web.
			 */
			{
				name: "Form",
				primaryKey: "id",
				properties: {
					id: "string",
					item1: "Task",
					item2: "string"
				}
			},
			{
				name: "User",
				primaryKey: "id",
				properties: {
					active: "string?",
					addedBy: "string?",
					cellPhone: "string?",
					changedBy: "string?",
					clientid: "string?",
					companyPosition: "string?",
					dateAdded: "string?",
					dateChanged: "string?",
					displayName: "string?",
					email: "string?",
					firstName: "string?",
					id: "string",
					language: "string?",
					lastName: "string?",
					name: "string?",
					officePhone: "string?",
					otherPhone: "string?",
					remarks: "string?",
					roles: "string?",
					userName: "string?"
				}
			},

			// DEPRECATED - We now stringify the well from the task itself
			{
				name: "Well",
				primaryKey: "id",
				properties: {
					addedBy: "string?",
					assignedTo: "string?",
					changedBy: "string?",
					clientid: "string?",
					countyDistrict: "string?",
					dateAdded: "string?",
					dateChanged: "string?",
					dateRemoved: "string?",
					fluid: "string?",
					geographicArea: "string?",
					governmentField: "string?",
					h2S_Percent: "double?",
					hierarchy: "string?",
					id: "string",
					licenceNumber: "string?",
					name: "string?",
					nonComplianceScore: "int?",
					officeCentre: "string?",
					parentClientid: "string?",
					regulatoryAgency: "string?",
					status: "string?",
					surfaceLatitude: "double?",
					surfaceLocation: "string?",
					surfaceLocationFilter: "int?",
					surfaceLocationType: "string?",
					surfaceLongitude: "double?",
					surfaceSRid: "string?",
					taskDetailsJson: "string?",
					tasks: "Task[]",
					userGroups: "string?",
					wellboreUWI: "string?"
				}
			},

			/**
			 * ACTIVITY
			 *
			 * DEPREATED - The A Level Data now comes with the Task Definition
			 *
			 * This is normally used to get the A level data for the task forms.
			 */
			{
				name: "Activity",
				primaryKey: "id",
				properties: {
					activityDetailJson: "string?",
					activityEndDate: "string?",
					activityStartDate: "string?",
					addedBy: "string?",
					clientid: "string?",
					dateAdded: "string?",
					dateChanged: "string?",
					dateDeleted: "string?",
					id: "string",
					isWmng: "int?",
					name: "string?",
					overview: "string?",
					reducedTasks: "string?",
					tasks: "string?",
					type: "string?",
					wellSummary: "string?",
					wellid: "string?",
					wmngid: "string?"
				}
			},

			// DEPRECATED - Files are now separate based on what file type they are, whether Task Attachments or Form Files
			{
				name: "File",
				primaryKey: "id",
				properties: {
					binaryFile: "string?", // Optional because some files are located in the physical disk
					contentType: "string?",
					id: "string",
					name: "string?",
					prop: "string?",
					size: "int?",
					taskId: "string?",
					projectId: "string?",

					// Uri for local files
					uri: "string?"
				}
			},

			/**
			 * TASK FILES
			 *
			 * Not to be confused with the Form Files,
			 * these are files that are attached to the task
			 * as an attachment, and not as a form file used by
			 * form builder
			 */
			{
				name: "FormFiles",
				primaryKey: "id",
				properties: {
					contentType: "string?",
					id: "string",
					uri: "string?", // Points to the directory of the image
					taskId: "string?",
					jsonDetails: "string?",
					name: "string?",
					prop: "string?",
					size: "int?"
				}
			},

			{
				name: "Image",
				primaryKey: "id",
				properties: {
					canChange: "string?",
					contentType: "string?",
					fileName: "string?",
					fileSize: "int?",
					fileType: "string?",
					id: "string",
					jsonDetails: "string?",
					projectId: "string?",
					uri: "string?", // Points to the directory of the image
					taskId: "string?",
					thumbnail: "string?"
				}
			},

			/**
			 * FORM VALUES/DEFINITION
			 *
			 * The Form templates. In the begginning, there was a misconceptino on what
			 * "Task Definition" means and in TORC Web, it neans the form values. While this
			 * app is in development however, it is known as the form templates.
			 */
			{
				name: "FormDefinition",
				primaryKey: "key",
				properties: {
					key: "string",
					form: "string",
					name: "string?",
					schema: "string?",
					customTypes: "string?",
					namedConditions: "string?",
					photoTypes: "string?",
					processCommonData: "string?"
				}
			},
			{
				name: "FormValues",
				primaryKey: "id",
				properties: {
					id: "string",
					key: "string",
					values: "string?",
					files: "File[]",
					attachments: "string?",
					alerts: "string?",
					progress: "string?",
					well: "string?"
				}
			},
			{
				name: "Log",
				primaryKey: "id",
				properties: {
					id: "string",
					timestamp: "date",
					tableName: "string?",
					status: "int", // SUCCESS, WARNING, FAILURE, PENDING, CANCELLED, HOLD
					message: "string?",
					data: "string",
					errors: "string?"
				}
			},
			{
				name: "Translation",
				primaryKey: "locale",
				properties: {
					locale: "string",
					translation: "string?"
				}
			},

			/**
			 * SYNC
			 *
			 * This will contain the records of core models (Project, Tasks, Images, etc...),
			 * containing metadata since their last sync. This is mainly used for the
			 * push towards lazy-loaded data.
			 */
			{
				name: "Sync",
				primaryKey: "id",
				properties: {
					id: "string",
					timestamp: "date",
					tableName: "string?",
					model: "string?",
					errors: "string?",
					type: "int"
				}
			}
		];
	},
};
