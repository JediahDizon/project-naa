import _ from "lodash";
import RNFetchBlob from "rn-fetch-blob";
import jwtdecode from "jwt-decode";
import axios from "axios";
import axiosRetry from "axios-retry";
import { EM } from "app/constants";

// Axios Retry to resend failed http requests more than once before throwing an exception
axiosRetry(axios, { retries: 5 });

/**
 * TORC Service
 *
 * This service is the API for communicating with the TORC servers to acquire data.
 * This service contains Async functions to allow a synchronous behavioural execution of code
 * that returns the data upon request. This service is reusable as everything it
 * needs to function are either defaulted to certain values or changed through
 * a get/set method.
 *
 * API Endpoints:
 *
 * - login
 * - getProjects
 * - getTasks
 * - getFieldForms
 * and more...
 */

let config = {
	apiUrl: "https://torc-api.resclients.com/",
	secServerUrl: "https://torc-ss.resclients.com",
	// apiUrl: "http://emdev.resclients.com:81",
	// secServerUrl: "http://emdev.resclients.com:92",
	clientId: "resem.mobile.app",
	clientSecret: "secret",
	grantType: "password",
	scope: "profile openid email offline_access emapi",
	prompt: "login",
	validRoles: ["fieldReportManager"],
	serverAssets: {
		bpmTranslations: {
			directory: "locale/translations_em.json"
		},
		translations: {
			directory: "locale"
		}
	},
	maxFileSize: 10000000, // 15MB Limit because since the files are Base64 strings, the HTTP request loads all the file in memory instead of streaming it directly to the local storage.

	user: null,
	token: null
};

const errors = (message) => ({
	204: "No content was recieved.",
	400: "Invalid username and password. (Bad Request)",
	401: "Unauthorized. Please log out and log back in.",
	403: "Only Field Report Managers can use this application.",
	404: "Cannot connect to TORC server.",
	500: `Something went wrong with TORC Web. ${message ? "\nServer Message: " + message : ""}`,
	501: `Something went wrong with TORC Web. ${message ? "\nServer Message: " + message : ""}`,
	502: `Something went wrong with TORC Web. ${message ? "\nServer Message: " + message : ""}`,
	503: `Something went wrong with TORC Web. ${message ? "\nServer Message: " + message : ""}`,
	504: `Something went wrong with TORC Web. ${message ? "\nServer Message: " + message : ""}`,
	505: `Something went wrong with TORC Web. ${message ? "\nServer Message: " + message : ""}`,
	506: `Something went wrong with TORC Web. ${message ? "\nServer Message: " + message : ""}`,
	507: `Something went wrong with TORC Web. ${message ? "\nServer Message: " + message : ""}`,
	508: `Something went wrong with TORC Web. ${message ? "\nServer Message: " + message : ""}`,
	510: `Something went wrong with TORC Web. ${message ? "\nServer Message: " + message : ""}`,
	511: `Something went wrong with TORC Web. ${message ? "\nServer Message: " + message : ""}`,
	projectNotFound: `Cannot find the project. ${message ? "\nServer Message: " + message : ""}`,
});

export default {
	// DEBUG - Allows mutation of the URL settings
	config,
	errors,
	isInitialized: isInitialized, // Used mainly by the Sync Redux Action to determine if the service was initialized


	/**
	 * LOGIN
	 *
	 * The login function will make a request to the TORC server based off of the
	 * configuration files defined in the constants found on the config variable. This
	 * function is normally used by the login component of the application.
	 *
	 * @param {username} - The username as a string
	 * @param {password} - The password as a string
	 * @return {object} - The response from the HTTP request
	 */
	async login(username, password) {
		if(!isValid(username, password)) throw new Error("Invalid username and password.");

		// Prepare variables for a POST request to TORC server
		const { clientId, clientSecret, grantType, scope } = config;
		const formData = new FormData();
		formData.append("grant_type", grantType);
		formData.append("client_secret", clientSecret);
		formData.append("client_id", clientId);
		formData.append("scope", scope);
		formData.append("username", username);
		formData.append("password", password);

		let toReturn = null;
		try {
			const userToken = await axios({
				method: "POST",
				url: `${config.secServerUrl}/connect/token`,
				headers: {
					Authorization: `Basic ${RNFetchBlob.base64.encode(`${clientId}:${clientSecret}`)}`
				},
				data: formData
			}).then(response => response.data);

			//The returned access token field is a JWT parseable string.
			const userModel = jwtdecode(userToken.access_token);

			/**
			 * As per reqruiement, we only allow usage of this application from users
			 * whose roles are defined in the constants file. We have to prevent login
			 * from other type of users.
			 */

			// There are times where the roles are sent as a string instead of an array
			userModel.roles = !_.isArray(userModel.roles) ? [userModel.roles] : userModel.roles;
			if(!_.some(config.validRoles, value => _.indexOf(userModel.roles, value) > -1)) {
				const parsedRoles = _.reduce(userModel.roles, (result, value) => result + "\n" + value);
				throw new Error(errors()[403] + "\n\nYour current roles are:\n\n" + parsedRoles);
			}

			// Set the user model to be used in the future
			config.user = userModel;

			// Set the token to be used when fetching asset data (e.g. Projects)
			config.token = userToken.access_token;

			toReturn = userModel;
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	/**
	 * LOGOUT
	 *
	 * A function that is called when the user needs to logout. This will clear any
	 * configuration that is defined upon logging in. For example, the user and the
	 * token that is needed to make requests to TORC server.
	 */
	logout() {
		config.user = null;
		config.token = null;
	},

	/**
	 * GET USER
	 *
	 * This API will get the user based off of the authentication header. It does
	 * not take any parameters in the request body. This is normally used by the
	 * User page where the user data needs to be displayed.
	 *
	 * @return {object} - The user model that comes from TORC server
	 */
	async getUser() {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { token } = config;
		let toReturn = null;
		try {
			toReturn = await axios({
				method: "GET",
				url: `${config.secServerUrl}/connect/userinfo`, // For some reason, the `sub` property of the user model is used as an ID in TORC. WTH?
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	/**
	 * GET PROJECTS
	 *
	 * The getProjects function will make a GET Request for projects to the TORC
	 * server using the client ID found on the configuration setting and return
	 * the response data. Any exception that is thrown will be thrown back to the
	 * invoker.
	 *
	 * @return {array} - The array of projects from TORC
	 */
	async getProjects() {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, user, token } = config;
		let toReturn = null;
		try {
			toReturn = await axios({
				method: "GET",
				url: `${apiUrl}/projects/assignedTo/${user.sub}`, // For some reason, the `sub` property of the user model is used as an ID in TORC. WTH?
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			})
			.then(response => response.data)
			.then(project => {
				// As per requirement we only download the tasks that concerns the tablet
				project.tasks = _.filter(project.tasks, a => _.indexOf(["completed", "completedOnWeb", "suspended", "cancelled"], a.progress) === -1);
				return project;
			});
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	async getProject(projectId) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			toReturn = await axios({
				method: "GET",
				url: `${apiUrl}/projects/findById/${projectId}`, // For some reason, the `sub` property of the user model is used as an ID in TORC. WTH?
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	async saveProject(toSave) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			const filesToSave = _.filter(toSave.files, a => !a.deleted);

			const keepFiles = [];
			const requestBody = [];
			for(let file of filesToSave) {
				// Using Fetch Blob, we wrap the base 64 string cause that's the only way we can submit images through Form Data
				// const toWrap = await RNFetchBlob.wrap(file.binaryFile.substr(file.binaryFile.indexOf(",") + 1));

				// For some reason, the project files have the `data:` prefix instead of just the binaryFile so we have to truncate the prefix
				requestBody.push({
					name: file.id,
					data: file.binaryFile.substr(file.binaryFile.indexOf(",") + 1),
					filename: file.fileName,
					type: file.fileType || file.type
				});

				// keepFiles request property is used by the TORC Web to determine which files to delete
				keepFiles.push({
					id: file.id,
					name: file.fileName,
					size: (file.fileSize || 0) / 1000 + " KB",
					type: file.fileType || file.type,
					fileType: false
				});
			}

			// Normally, we'd use Axios but it's hard to get it to work with `FormData` library
			await RNFetchBlob.fetch(
				"POST",
				`${apiUrl}/projects/update`,
				{
					Authorization: `Bearer ${token}`,
					"Content-Type" : "multipart/form-data",
				},
				[
					{ name: "id", data: toSave.id },
					{ name: "name", data: toSave.name },
					{ name: "comment", data: toSave.comment || "" },
					{ name: "keepFiles", data: JSON.stringify([]) },
					{ name: "alerts", data: JSON.stringify([]) },
					...requestBody
				]
			).then(response => {
				const { status, message, data } = response.info();
				if(status !== 200) {
					const toThrow = errors(JSON.stringify(response.data, null, "\t"))[response.status];
					if(toThrow) throw new Error(toThrow);
					// if(response.status == 404) throw new Error("Cannot connect to TORC server.");
					// if(response.status == 401) throw new Error("Unauthorized. Please log out and log back in.");
					// var code = (response.status + "")[0];
					// if(code == 5) throw new Error("Something went wrong with TORC Web. Try syncing again.\n\nServer Message: " + message || JSON.stringify(data || "Unknown Error"));

					throw new Error("Something went wrong. Please contact administrator if problem persists.");
				}
			});

			// toReturn = await axios({
			// 	method: "POST",
			// 	url: `${apiUrl}/projects/update`,
			// 	headers: {
			// 		Authorization: `Bearer ${token}`,
			// 		Accept: "application/json"
			// 	},
			// 	data: formData
			// }).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},


	/**
	 * GET TASKS
	 *
	 * Similar to the GET PROJECTS function. This time, it's the `tasks` field
	 * found on the Projects model. There is no API for getting all tasks assigned
	 * by the user. There is however, an API endpoint for getting tasks by their
	 * IDs.
	 *
	 * TORC Task Controller:
	 * [HttpGet("summary/{typeTab}/{card}")]
	 * [HttpGet("summaryDetail")]
	 * [HttpGet("{id}")]
	 * [HttpGet("getExtraDetailsJson/{taskId}")]
	 * [HttpGet("getTaskDefinition/{taskId}/{property}")]
	 * [HttpGet("updateAlertsDate/{taskId}")]
	 * [HttpGet("fieldTasksDefinition")]
	 * [HttpGet("{type}/ByDeadline/{startDate}/{endDate}")]
	 * [HttpGet("getTask/{taskId}")]
	 * [HttpGet("file")]
	 *
	 * @return	{array} - The array of Tasks from TORC
	 */
	async getTasksByProjectId(projectId) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = [];
		try {
			// Get the Project object using the ID
			const Project = await axios({
				method: "GET",
				url: `${apiUrl}/projects/findById/${projectId}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);

			if(_.isEmpty(Project)) throw new Error("Cannot find Project with the parameterized ID.");
			if(!_.isEmpty(Project.tasks)) {
				const taskRequests = [];
				for(let task of Project.tasks) {
					// // Get the Task based off of the paramterized ID
					// const task = await axios({
					// 	method: "GET",
					// 	url: `${apiUrl}/tasks/getTask/${taskToLoad.id}`,
					// 	headers: {
					// 		Authorization: `Bearer ${token}`,
					// 		Accept: "application/json"
					// 	}
					// }).then(response => response.data);

					// Get the associated form object to pass to Form Builder component
					taskRequests.push(axios({
						method: "POST",
						url: `${apiUrl}/tasks/getTaskDetail`,
						headers: {
							Authorization: `Bearer ${token}`,
							Accept: "application/json"
						},
						data: {
							activityId: task.activityId,
							id: task.id,
							type: task.type
						}
					})
					.then(response => response.data.item1) // We only use the `item1` property from this response as it contains both the form and the task details
					.then(async taskDetails => {
						// DEPRECATED
						//
						// The purpose of this request is to get the A level data. But we
						// now ue the A level data found in the Task's `item1.taskDDS.A`
						//
						// const activityDetails = await axios({
						// 	method: "GET",
						// 	url: `${apiUrl}/activities/getActivity/${taskDetails.activityId}`,
						// 	headers: {
						// 		Authorization: `Bearer ${token}`,
						// 		Accept: "application/json"
						// 	}
						// }).then(response => response.data);


						/**
						 * GET ACTIVITY
						 *
						 * This HTTP request is responsible for setting the "A level data"
						 * of the task to dwonload. Mainly used by Form Builder when a field
						 * needs access to the UWI selections.
						 */

						// const A = JSON.parse(activityDetails.activityDetailJson || null);
						// return _.set(taskDetails, "A", A);

						return prepareTaskRetrieval(taskDetails);
					}));
				}


				// As per requirement, tasks from TORC Web whose marked as "Complet.ed" are not included in the download payload
				toReturn = await Promise.all(taskRequests);

				// DEPRECATED
				//
				// We now merge the Form and the Task tables and just make 1 request endpoint for getting Form and Task
				//
				// // Get the Tasks based off of the array found on the Project model
				// toReturn = await axios({
				// 	method: "POST",
				// 	url: `${apiUrl}/tasks/getTasksByIds`,
				// 	headers: {
				// 		Authorization: `Bearer ${token}`,
				// 		Accept: "application/json"
				// 	},
				// 	data: _.map(Project.tasks, a => a.id)
				// }).then(response => response.data);
			}
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}
		return toReturn;
	},


	/**
	 * GET FIELD TASK DEFINITION
	 *
	 * Gets every possible type of form to be loaded for the application. Normally
	 * used when creating a form where you have to make a selection on which form
	 * type to create.
	 *
	 * @return {array} - The array of posible forms to be created
	 */
	async getTaskDefinitions() {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = [];
		try {
			// Get the Project object using the ID
			toReturn = await axios({
				method: "GET",
				url: `${apiUrl}/tasks/fieldTasksDefinition`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	async getFormDefinitionByTaskId(taskId) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = [];
		try {
			// Get the Project object using the ID
			toReturn = await axios({
				method: "GET",
				url: `${apiUrl}/tasks/getDefinition?taskId=${taskId}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	/**
	 * GET FIELD FORM
	 *
	 * Get Field Form function will get the form object used by the Form Builder
	 * component. This includes the template of the Form and the Data assocaited
	 * to the form.
	 *
	 * @param		{string} taskId - The ID of the task the form is associated to
	 * @return	{object} - Form object that contains its associated template and data
	 */
	async getFormByTaskId(taskId) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			// Get the Task based off of the paramterized ID
			const task = await axios({
				method: "GET",
				url: `${apiUrl}/tasks/getTask/${taskId}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);

			// Get the associated form object to pass to Form Builder component
			toReturn = await axios({
				method: "POST",
				url: `${apiUrl}/tasks/getTaskDetail`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				},
				data: {
					activityId: task.activityId,
					id: task.id,
					type: task.type
				}
			}).then(response => prepareTaskRetrieval(response.data.item1));
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},


	/**
	 * GET FORM VALUES
	 *
	 * This gets the values of the form with the associated task ID. Unlike the
	 * getFormByTaskId, this only gets the values from the `taskDDS.jsonFormTmp`
	 * property of the return value of `getTaskDetail` endpoint.
	 *
	 * @param  {string} taskId - THe ID of the task the values correspond to
	 * @return {object} - The values of the form
	 */
	async getFormValue(taskId) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			// Get the associated form object to pass to Form Builder component
			toReturn = await axios({
				method: "GET",
				url: `${apiUrl}/tasks/getValues?taskId=${taskId}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => {
				if(_.isEmpty(response.data)) throw new Error(errors()[204]);
				return prepareFormValueRetrieval(response.data);
			});
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},


	/**
	 * SAVE FORM
	 *
	 * Saves the form using the changes in taskDDS.jsonFormTmp, considering that property
	 * contains the changes made locally.
	 *
	 * NOTE:
	 * The API endpoint for saving forms only accepts an object that contains the
	 * "changes" to the form taskDDS.jsonFormTmp. You do not have to send the entire
	 * form model to the payload.
	 *
	 * For some reason, the "savePhotos" endpoint is the one used to save form details as well. Lmao.
	 *
	 * There are two types of forms to be saved: one that exists, and one that is newly created. We check
	 * a form's existence if we make a search for their ID and see if it exists or not.
	 *
	 * @param  {object} toSave - The Form model containing the taskDDS.jsonFormTmp data as an object whose properties are a set of changes
	 */
	async saveForm(toSave) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, user, token } = config;
		let toReturn = null;
		try {
			// Get the Task based off of the paramterized form ID
			const task = await axios({
				method: "GET",
				url: `${apiUrl}/tasks/getTask/${toSave.id}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);

			/**
			 * As documented above, we need to verify the forms existence in the system
			 * to determine how to save this new form, whether it'd be modifying an existing one
			 * or creating a new one.
			 */

			if(_.isEmpty(task)) {
				/**
				 * Reacing this line of code mans that the Form is new
				 * (Atleast, safe to assume. An edge case would mean this form just got deleted)
				 */

				if(_.isEmpty(toSave.well || toSave.wellId)) throw new Error("Form is not assigned a well.");

				// const well = await axios({
				// 	method: "POST",
				// 	url: `${apiUrl}/wells/filter`, // For some reason, the `sub` property of the user model is used as an ID in TORC. WTH?
				// 	headers: {
				// 		Authorization: `Bearer ${token}`,
				// 		Accept: "application/json"
				// 	},
				// 	data: {
				// 		JsonFilter: {
				// 			licenceNumbers: [toSave.well.LicenceNumber]
				// 		}
				// 	}
				// }).then(response => {
				// 	return response;
				// });

				// Start
				// PageSize
				// JsonFilter
				// SortOrder
				// OrderBy
				// Selected
				// ClientId
				// WellId
				// ActivityId
				// Name
				// Type
				// RegulatoryAgency
				// Deadline
				// DateAdded
				// onlySelections
				// selectedTasks
				// Priority
				// Status
				// Progress
				// Limit
				// AssignedTo
				// AssignedUserId
				// Activity

			} else {

				// Get the associated form object to pass to the JSON Data item in the request body
				// const form = await axios({
				// 	method: "POST",
				// 	url: `${apiUrl}/tasks/getTaskDetail`,
				// 	headers: {
				// 		Authorization: `Bearer ${token}`,
				// 		Accept: "application/json"
				// 	},
				// 	data: {
				// 		activityId: task.activityId,
				// 		id: task.id,
				// 		type: task.type
				// 	}
				// }).then(response => response.data.item1);

				// Get the project it belongs to for the `projectId` field in the request body
				const project = await axios({
					method: "GET",
					url: `${apiUrl}/projects/assignedTo/${user.sub}`, // For some reason, the `sub` property of the user model is used as an ID in TORC. WTH?
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json"
					}
				}).then(response => {
					const projects = response.data;
					return _.find(projects, a => _.indexOf(_.map(a.tasks, a => a.id), task.id) > -1);
				});

				if(_.isNil(project)) throw new Error("The task to sync is in a project that is not assigned to you. Please contact the office or admin for support.");

				// Since we can't upload files with raw base64 data, we need to save it to a URI directory and use Fetch Blob library to wrap it
				const filesToSave = [];

				for(let file of toSave.files || []) {
					// const fileData = file.binaryFile;
					// const filePath = `${RNFS.TemporaryDirectoryPath}/${file.name}`;

					// await RNFS.exists(filePath)
					// .then(exists => exists && RNFetchBlob.fs.unlink(filePath))
					// .catch(error => console.warn(error.message));

					// await RNFetchBlob.fs.createFile(filePath, fileData, "base64").catch(error => console.warn(error.message));

					/**
					 * NOTE:
					 *
					 * - The HTTP Request only succeeds if we "encode" the name property of the Form Data (WTH?)
					 * - The HTTP Requests fails if there is no "name" and "prop" properties being encoded in the form data
					 * - Form Data library parses the items that has a "uri" property that points to a file directory (That's how we upload files with the Form Data)
					 */
					filesToSave.push({
						name: encodeURIComponent(JSON.stringify({ name: file.name, prop: file.prop, jsonDetails: _.isObject(file.jsonDetails) ? JSON.stringify(file.jsonDetails) : null })),
						filename: file.name,
						type: file.contentType,
						prop: file.prop,
						uri: file.uri
					});
				}

				// FORM DATA - SAVE PHOTOS ENDPOINT
				const formData = new FormData();
				formData.append("taskId", toSave.id);
				formData.append("projectId", project.id);
				formData.append("jsonForm", toSave.taskDDS.jsonFormTmp);
				formData.append("taskType", task.taskType);
				formData.append("jurisdiction", task.well.geographicArea);
				formData.append("wellId", task.well.id);
				formData.append("activityId", task.activity.id);
				_.each(filesToSave, a => formData.append(a.name, { name: a.filename, prop: a.prop, type: a.type, uri: `file:///${a.uri}` }));

				toReturn = await fetch(new Request(`${apiUrl}/tasks_projects_files/savePhotos`, {
					method: "POST",
					headers: new Headers({ Authorization: `Bearer ${token}` }),
					body: formData
				})).then(response => {
					const { status } = response;
					if(status !== 200) {
						const toThrow = errors(JSON.stringify(response.data, null, "\t"))[response.status];
						if(toThrow) throw new Error(toThrow);
						// if(status == 404) throw new Error("Cannot connect to TORC server.");
						// if(status == 401) throw new Error("Unauthorized. Please log out and log back in.");
						// var code = (status + "")[0];
						// if(code == 5) throw new Error("Something went wrong with TORC Web. Try syncing again.\n\nServer Message: " + (response.message || JSON.stringify(response.data || "Unknown Server Error")));
					}
				});
			}
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},


	/**
	 * VALIDATE FORM
	 *
	 * This validates the form by making a call to BPM to determine if it's compliant
	 * to the provincial rules. (I guess)
	 *
	 * @param  {object} toValidate - The Form model to validate: { taskId: formModel.id, currentForm: formModel.taskDDS.jsonFormTmp }
	 * @return {string[]} The BPM returns a string array that tells Form Builder which field is invalid
	 */
	async validateForm(toValidate) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = [];
		try {
			toReturn = await axios({
				method: "POST",
				url: `${apiUrl}/tasks/validateTasks`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				},
				data: {
					taskId: toValidate.id,
					currentForm: JSON.parse(toValidate.taskDDS.jsonFormTmp)
				}
			}).then(response => {
				const { missing, invalid, alerts, success } = response.data.item2;

				// We get the Inner Status key by getting the response's inner status key and mapping
				// const { customTypes: innerCustomTypes, processCommonData } = toValidate;
				// const customTypes = _.merge({}, innerCustomTypes, (processCommonData || {}).customTypes);
				// const status = _.get(customTypes, "key")

				return {
					missing,
					invalid,
					alerts,
					success
					// innerStatus: _.merge({}, innerCustomTypes, (processCommonData || {}).customTypes)
				};
			});
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	/**
	 * GET PROJECT FILES
	 *
	 * Returns the files to be assigned to a project.
	 *
	 * @param  {string} projectId - The project ID the files belongs to
	 * @return {array} - The array of file objects
	 */


	async getProjectFile(projectId, fileId) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			if(!_.isEmpty(projectId)) {
				// Get the project to get the metadata of the file to download
				const Project = await axios({
					method: "GET",
					url: `${apiUrl}/projects/findById/${projectId}`,
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json"
					}
				}).then(response => response.data);

				let file = null;
				if(!_.isEmpty(Project) && !_.isEmpty(Project.files)) {
					file = _.find(Project.files, { id: fileId });
					if(_.isNil(file)) throw new Error(`Cannot find the file with the provided ID: ${fileId}`);

					toReturn = await RNFetchBlob.fetch(
						"GET",
						`${apiUrl}/projects/getFile/${projectId}/${fileId}`, // Encode to prevent malicious file names due to interpolated URL
						{
							Authorization: `Bearer ${token}`,
							Accept: "application/json",
							responseType: "arrayBuffer"
						}
					)
					.then(response => response.base64())
					.then(blob => {
						if(!blob) throw new Error(`File ${file.name || file.fileName} is invalid.`);
						return { ...file, binaryFile: blob };
					});
				}
			} else {
				throw new Error(`No Project was found with the ID provided: ${projectId}.`);
			}
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	async getProjectFilesByProjectId(projectId) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = [];
		try {
			// Get the attachment files from the `files` array found on the Form model
			if(!_.isEmpty(projectId)) {
				const Project = await axios({
					method: "GET",
					url: `${apiUrl}/projects/findById/${projectId}`,
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json"
					}
				}).then(response => response.data);

				if(!_.isEmpty(Project) && !_.isEmpty(Project.files)) {
					for(let file of Project.files) {
						if(file.size > config.maxFileSize) continue;

						// I forgot why we are not using Axios
						await RNFetchBlob.fetch(
							"GET",
							`${apiUrl}/projects/getFile/${file.projectId}/${file.id}`,
							{
								Authorization: `Bearer ${token}`,
								Accept: "application/json",
								responseType: "arrayBuffer",
								"RNFB-Response" : "base64"
							}
						)
						.then(response => response.base64())
						.then(blob => {
							if(!blob) throw new Error(`File ${file.name || file.fileName} is invalid.`);
							toReturn.push({ ...file, binaryFile: blob });
						})
						.catch(error => {
							throw new Error(`The file "${(file.fileName)}" is possibly corrupted: ${error.message}`);
						});
					}
				}
			} else {
				throw new Error("No Project ID provided to download files.");
			}
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	/**
	 *
	 * @param {string} fileId - The ID of the file to be retrieved
	 * @param {string} overrides - Optional parameter for any overrides on metadata requested by the invoker
	 */
	async getTaskFile(fileId, overrides = {}) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		// Delete any previous download session
		// await RNFetchBlob.session(fileId).dispose().catch(error => console.warn(error.message));

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			toReturn = await RNFetchBlob
			.config({
				// Add this option that makes response data to be stored as a file.
				fileCache : true,
				// By adding this option, the temp files will have a file extension
				appendExt : "jpg",
				// Add the downloaded file to the session to be deleted later
				session: fileId
			})
			.fetch("GET", `${apiUrl}/tasks_projects_files/getFile/${fileId}`, {
				Authorization: `Bearer ${token}`
			})
			// Return value: { ...properties, uri: <directory> }
			.then(response => {
				const headerData = _.merge(JSON.parse(_.get(response.info().headers, "x-file-metadata") || "{}"), JSON.parse(_.get(response.info().headers, "X-File-Metadata") || "{}"));
				const metaData = {
					...headerData,
					...overrides,
					binaryFile: null
				};

				return { ...metaData, uri: response.path() };
			});

		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	async getTaskFilesByTaskId(taskId) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		// Delete any previous download session
		// await RNFetchBlob.session("temp").dispose().catch(error => console.warn(error.message));

		const { apiUrl, token } = config;
		let toReturn = [];
		try {
			// Download all the images metadata assigned to the task
			const taskImages = await axios({
				method: "GET",
				url: `${apiUrl}/tasks_projects_files/getAllByTaskId/${taskId}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);

			// For each of the images, download the image and append the details from the metadata downloaded
			for(let toSave of taskImages) {
				await RNFetchBlob
				.config({
					// Add this option that makes response data to be stored as a file.
					fileCache : true,
					// Add the downloaded file to the session to be deleted later
					session: "temp"
				})
				.fetch("GET", `${apiUrl}/tasks_projects_files/getFile/${toSave.id}`, {
					Authorization: `Bearer ${token}`
				})
				.then(async response => {
					// Sometimes, when TORC Web errors out, it doesn't throw an exception. Instead, it continues to create an empty file, which causes errors when processing
					const fileProperties = await RNFetchBlob.fs.stat(response.path());
					if(fileProperties.size !== 0) {
						// Rename the temporary file to have the same filename as the image
						const tempDir = response.path();
						const originalFileName = tempDir.substr(tempDir.lastIndexOf("/") + 1);
						const destinationDirectory = tempDir.replace(originalFileName, toSave.fileName);

						await RNFetchBlob.fs.mv(tempDir, destinationDirectory);
						const headerData = _.merge(JSON.parse(_.get(response.info().headers, "x-file-metadata") || "{}"), JSON.parse(_.get(response.info().headers, "X-File-Metadata") || "{}"));
						const metaData = {
							...headerData,
							...toSave,
							binaryFile: null,
							taskId: taskId
						};

						toReturn.push({ ...metaData, uri: destinationDirectory });
					}
				});
			}

		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		// We only save those that are not IMAGES because those are for a different function
		// Initially, we thought that the endpoint for task attachments is different
		return _.filter(toReturn, a => a.fileType !== "IMAGETABLET");
	},

	/**
	 * GET FORM FILE
	 *
	 * Pretty straightforward. It gets the task file specified by the ID provided.
	 *
	 * NOTE
	 * Considering that there is no endpoint for getting file metadata, all we could do
	 * is rely on the overrides parameter to determine the file name of the file in
	 * question.
	 *
	 * @param  {string} fileId - The ID of the file to download
	 * @param  {object} overrides - The overrides often used to determine the metadata of the file
	 * @return {object} - Returns the file object containing a `binaryFile` as well as the other fields in the overrides
	 */
	async getFormFile(fileId, overrides = {}) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			toReturn = await RNFetchBlob
			.config({
				// Add this option that makes response data to be stored as a file.
				fileCache : true,
				// By adding this option, the temp files will have a file extension
				appendExt : "jpg",
				// Add the downloaded file to the session to be deleted later
				session: fileId
			})
			.fetch("GET", `${apiUrl}/tasks/getFile/${fileId}`, {
				Authorization: `Bearer ${token}`
			})
			// Return value: { ...properties, uri: <directory> }
			.then(async response => {
				const headerData = _.merge(JSON.parse(_.get(response.info().headers, "x-file-metadata") || "{}"), JSON.parse(_.get(response.info().headers, "X-File-Metadata") || "{}"));
				if(_.isEmpty(headerData)) throw new Error(`Cannot download the file with the ID ${fileId}: Missing metadata`);

				// Sometimes, when TORC Web errors out, it doesn't throw an exception. Instead, it continues to create an empty file, which causes errors when processing
				const fileProperties = await RNFetchBlob.fs.stat(response.path());
				const metaData = {
					...headerData,
					...overrides,
					jsonDetails: JSON.parse(headerData.jsonDetails || "{}"), // The header Details is stringified JSON which needs to be parsed
					fileSize: fileProperties.size,
					binaryFile: null
				};

				return { ...metaData, uri: response.path() };
			});
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;

		// const { apiUrl, token } = config;
		// let toReturn = null;
		// try {
		// 	toReturn = await RNFetchBlob.fetch(
		// 		"GET",
		// 		`${apiUrl}/tasks/getFile?fileId=${fileId}`,
		// 		{
		// 			Authorization: `Bearer ${token}`,
		// 			Accept: "*/*",
		// 			responseType: "arrayBuffer"
		// 		}
		// 	)
		// 	.then(response => response.data)
		// 	.then(blob => ({ ...overrides, binaryFile: blob.substr(blob.indexOf(",") + 1) })); // We truncate the `data:..., base64,...` prefix cause for some reason TORC Web returns the files with that prefix lmao
		// } catch(error) {
		// 	const { response } = error;
		// 	if(response) {
		// 		const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
		// 		if(toThrow) throw new Error(toThrow);
		// 	}
		// 	throw error;
		// }
		// return toReturn;
	},


	/**
	 * GET FORM FILES
	 *
	 * This is used to download the files (e.g. signature images, photos) that exists
	 * in the Task object being loaded. This is normally used for the Form Builder
	 * to load fields such as the Signature field, or the Task Details to load the
	 * pictures that were uploaded for that specific task.
	 *
	 * @param  {string} taskId - The ID of the task that has the files to downlaod from
	 * @return {array} - An array of objects whose fields contains the metadata of the image alongside the	Base 64 string representation of the contents of the file
	 */
	async getFormFilesByTaskId(taskId, overrides = {}) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		// Delete any previous download session
		// await RNFetchBlob.session("temp").dispose().catch(error => console.warn(error.message));
		const fetchSession = RNFetchBlob.session(taskId);
		if(_.size(fetchSession.list()) > 0) {
			await fetchSession.dispose().catch(error => console.warn(error.message));
		}

		const { apiUrl, token } = config;
		let toReturn = [];
		try {
			// Download all the images metadata assigned to the task
			// Get the associated form object to extract the form file metadata
			const taskFiles = await axios({
				method: "GET",
				url: `${apiUrl}/tasks/getValues?taskId=${taskId}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => {
				if(_.isEmpty(response.data)) throw new Error(errors()[204]);
				return prepareFormValueRetrieval(response.data);
			})
			.then(formValues => formValues.files);

			// For each of the images, download the image and append the details from the metadata downloaded
			for(let toSave of taskFiles) {
				await RNFetchBlob
				.config({
					// Add this option that makes response data to be stored as a file.
					fileCache : true,
					// Add the downloaded file to the session to be deleted later
					session: taskId
				})
				.fetch("GET", `${apiUrl}/tasks/getFile/${toSave.id}`, {
					Authorization: `Bearer ${token}`
				})
				.then(async response => {
					// Sometimes, when TORC Web errors out, it doesn't throw an exception. Instead, it continues to create an empty file, which causes errors when processing
					const fileProperties = await RNFetchBlob.fs.stat(response.path());
					if(fileProperties.size !== 0) {
						// Rename the temporary file to have the same filename as the image
						const tempDir = response.path();
						const originalFileName = tempDir.substr(tempDir.lastIndexOf("/") + 1);
						const destinationDirectory = tempDir.replace(originalFileName, toSave.name);

						// Avoid `mv` function to throw errors by deleting the destination file first before copying
						await RNFetchBlob.fs.exists(destinationDirectory)
						.then(exists => exists && RNFetchBlob.fs.unlink(destinationDirectory))
						.then(() => RNFetchBlob.fs.mv(tempDir, destinationDirectory))
						.catch(error => console.warn("MOVING ERROR\n\n" + error.message));

						const headerData = _.merge(JSON.parse(_.get(response.info().headers, "x-file-metadata") || "{}"), JSON.parse(_.get(response.info().headers, "X-File-Metadata") || "{}"));
						const metaData = {
							...headerData,
							...toSave,
							fileSize: fileProperties.size,
							binaryFile: null,
							taskId: taskId
						};

						toReturn.push({ ...metaData, uri: destinationDirectory });
					}
				});
			}

		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;

		// const { apiUrl, token } = config;
		// let toReturn = [];
		// try {
		// 	// Get the attachment files from the `files` array found on the Form model
		// 	if(!_.isEmpty(taskId)) {
		// 		const task = await axios({
		// 			method: "GET",
		// 			url: `${apiUrl}/tasks/getValues?taskId=${taskId}`,
		// 			headers: {
		// 				Authorization: `Bearer ${token}`,
		// 				Accept: "application/json"
		// 			}
		// 		}).then(response => response.data);

		// 		if(!_.isEmpty(task) && !_.isEmpty(task.files)) {
		// 			for(let file of task.files) {
		// 				if(file.size > config.maxFileSize) continue;
		// 				await RNFetchBlob.fetch(
		// 					"GET",
		// 					`${apiUrl}/tasks/getFile?fileId=${file.id}`,
		// 					{
		// 						Authorization: `Bearer ${token}`,
		// 						Accept: "*/*",
		// 						responseType: "arrayBuffer"
		// 					}
		// 				)
		// 				.then(response => response.data)
		// 				.then(blob => blob && toReturn.push({ ...file, binaryFile: blob.substr(blob.indexOf(",") + 1) })); // We truncate the `data:..., base64,...` prefix cause for some reason TORC Web returns the files with that prefix lmao
		// 			}
		// 		}
		// 	} else {
		// 		throw new Error("No Task ID provided to download files.");
		// 	}
		// } catch(error) {
		// 	const { response } = error;
		// 	if(response) {
		// 		const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
		// 		if(toThrow) throw new Error(toThrow);
		// 	}
		// 	throw error;
		// }

		// return toReturn;
	},


	/**
	 * GET TASK FILE BY METADATA
	 *
	 * Considering the Task objects already have the array of file meta-data as
	 * part of their property, we can speed up the performance by using that property
	 * to get the files it's associated to.
	 *
	 * @param  {object} file - A file object metadata found on the Task object
	 * @return {array} - An array of objects whose fields are the file's meta-data alongside the Base 64 string representation of the contents of the file
	 */
	async getFormFilesByMetadata(file) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = [];
		try {
			// For some reason, Axios doesn't return anything for the data
			await fetch(`${apiUrl}/tasks/file?name=${file.name}&taskId=${file.taskId}`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "*/*",
					responseType: "arrayBuffer"
				},
				params: {
					name: file.name,
					taskId: file.taskId
				}
			})
			.then(async response => {
				const blob = await response.blob();

				return new Promise(resolve => {
					const fileReader = new FileReader();
					fileReader.onloadend = function() {
						resolve(fileReader.result);
					};
					blob && fileReader.readAsDataURL(blob); // Sometimes, blob is null. Like, what? Lol.
				});
			})
			.then(blob => toReturn.push({...file, data: blob}));
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},


	/**
	 * SAVE IMAGE
	 *
	 * This saves the image to TORC Web using the task ID provided as part of the
	 * image object, as originated from the image model from TORC Web.
	 *
	 * @param  {type} toSave - The image object to save which will contain the task ID and binaryFile properties
	 */
	async saveImage(toSave) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, user, token } = config;
		let toReturn = null;
		try {
			// Get the Task based off of the paramterized form ID
			const task = await axios({
				method: "GET",
				url: `${apiUrl}/tasks/getTask/${toSave.taskId}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
			if(_.isEmpty(task)) throw new Error("Cannot find the task the image is assigned to.");

			// Get the project it belongs to for the `projectId` field in the request body
			const project = await axios({
				method: "GET",
				url: `${apiUrl}/projects/assignedTo/${user.sub}`, // For some reason, the `sub` property of the user model is used as an ID in TORC. WTH?
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => {
				const projects = response.data;
				return _.find(projects, a => _.indexOf(_.map(a.tasks, a => a.id), task.id) > -1);
			});

			if(_.isNil(project)) throw new Error("The image to sync is in a project that is not assigned to you. Please contact the office or admin for support.");

			// Form Data for the `savePhotos` endpoint
			const formData = new FormData();
			formData.append("taskId", task.id);
			formData.append("projectId", project.id);
			formData.append("jsonForm", JSON.stringify({}));
			formData.append("taskType", task.taskType);
			formData.append("jurisdiction", task.well.geographicArea);
			formData.append("wellId", task.well.id);
			formData.append("activityId", task.activity.id);

			/**
			 * NOTE:
			 *
			 * - The HTTP Request only succeeds if we "encode" the name property of the Form Data
			 * - The HTTP Requests fails if the name of the form data record is not a	encoded stringified jsonDetails
			 * - Form Data library parses the items that has a "uri" property that points to a file directory (That's how we upload files with the Form Data)
			 */

			// Since we can't upload files with raw base64 data, we need to save it locally as a file and feed the returned directory to Form Data library
			if(await RNFetchBlob.fs.exists(toSave.uri)) {
				// Reaching this code block means the file has been verified to exist and is now ready to be uploaded
				formData.append(
					encodeURIComponent(JSON.stringify(toSave.jsonDetails)),
					{
						name: toSave.fileName, // We encode incoming images from the `getImage` endpoints to replace spaces for file system error prevention
						type: toSave.contentType,
						uri: `file:///${toSave.uri}`
					}
				);
			}

			toReturn = await fetch(new Request(`${apiUrl}/tasks_projects_files/savePhotos`, {
				method: "POST",
				headers: new Headers({ Authorization: `Bearer ${token}` }),
				body: formData
			})).then(response => {
				const { status } = response;
				if(status !== 200) {
					const toThrow = errors(JSON.stringify(response.data, null, "\t"))[response.status];
					if(toThrow) throw new Error(toThrow);
					// if(status == 404) throw new Error("Cannot connect to TORC server.");
					// if(status == 401) throw new Error("Unauthorized. Please log out and log back in.");
					// var code = (status + "")[0];
					// if(code == 5) throw new Error("Something went wrong with TORC Web. Try syncing again.\n\nServer Message: " + (response.message || JSON.stringify(response.data || "Unknown Server Error")));
				}
			});
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},


	/**
	 * UPDATE IMAGE
	 *
	 * Just like the "saveImage" function above, this function will call a different
	 * API endpoint (updateDetails). This uses the image's ID field to determine
	 * which image file to update.
	 *
	 * @param  {object} toSave - The Image to save containing the ID of the image to update
	 */
	async updateImage(toSave) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			// Get the Task based off of the paramterized form ID
			const task = await axios({
				method: "GET",
				url: `${apiUrl}/tasks/getTask/${toSave.taskId}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
			if(_.isEmpty(task)) throw new Error("Cannot find the task the image is assigned to.");

			// FORM DATA - SAVE PHOTOS ENDPOINT
			const formData = new FormData();
			formData.append("id", toSave.id);
			formData.append("jsonDetails", JSON.stringify(toSave.jsonDetails));

			/**
			 * NOTE:
			 *
			 * - The HTTP Request only succeeds if we "encode" the name property of the Form Data
			 * - The HTTP Requests fails if the name of the form data record is not a	encoded stringified jsonDetails
			 * - Form Data library parses the items that has a "uri" property that points to a file directory (That's how we upload files with the Form Data)
			 */

			// Since we can't upload files with raw base64 data, we need to save it locally as a file and feed the returned directory to Form Data library
			if(await RNFetchBlob.fs.exists(toSave.uri)) {
				// Reaching this code block means the file has been verified to exist and is now ready to be uploaded

				formData.append(
					encodeURIComponent(JSON.stringify(toSave.jsonDetails)),
					{
						name: toSave.fileName, // We encode incoming images from the `getImage` endpoints to replace spaces for file system error prevention
						type: toSave.contentType,
						uri: `file:///${toSave.uri}`
					}
				);
			}

			toReturn = await fetch(new Request(`${apiUrl}/tasks_projects_files/updateDetails`, {
				method: "POST",
				headers: new Headers({ Authorization: `Bearer ${token}` }),
				body: formData
			})).then(response => {
				const { status } = response;
				if(status !== 200) {
					const toThrow = errors(JSON.stringify(response.data, null, "\t"))[response.status];
					if(toThrow) throw new Error(toThrow);
					// if(status == 404) throw new Error("Cannot connect to TORC server.");
					// if(status == 401) throw new Error("Unauthorized. Please log out and log back in.");
					// var code = (status + "")[0];
					// if(code == 5) throw new Error("Something went wrong with TORC Web. Try syncing again.\n\nServer Message: " + (response.message || JSON.stringify(response.data || "Unknown Server Error")));
				}
			});
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},


	/**
	 * GET IMAGES
	 *
	 * This function will get all the images from the TORC Server. Normally, these
	 * data comes from the Tablet where they take pictures of the Wells.
	 *
	 * @param  {string} taskId - The Task ID the images belongs to
	 * @return {array} - The array of images that the specified task have.
	 */
	async getImagesByTaskId(taskId) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		// Delete any previous download session
		// await RNFetchBlob.session("temp").dispose().catch(error => console.warn(error.message));
		const fetchSession = RNFetchBlob.session(taskId);
		if(_.size(fetchSession.list()) > 0) {
			await fetchSession.dispose().catch(error => console.warn(error.message));
		}

		const { apiUrl, token } = config;
		let toReturn = [];
		try {
			// Download all the images metadata assigned to the task
			const taskImages = await axios({
				method: "GET",
				url: `${apiUrl}/tasks_projects_files/getAllImagesByTaskId/${taskId}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);

			// For each of the images, download the image and append the details from the metadata downloaded
			for(let toSave of taskImages) {
				await RNFetchBlob
				.config({
					// Add this option that makes response data to be stored as a file.
					fileCache : true,
					// Add the downloaded file to the session to be deleted later
					session: taskId
				})
				.fetch("GET", `${apiUrl}/tasks_projects_files/getFile/${toSave.id}`, {
					Authorization: `Bearer ${token}`
				})
				.then(async response => {
					// Sometimes, when TORC Web errors out, it doesn't throw an exception. Instead, it continues to create an empty file, which causes errors when processing
					const fileProperties = await RNFetchBlob.fs.stat(response.path());
					if(fileProperties.size !== 0) {
						// Rename the temporary file to have the same filename as the image
						const tempDir = response.path();
						const originalFileName = tempDir.substr(tempDir.lastIndexOf("/") + 1);
						const destinationDirectory = tempDir.replace(originalFileName, toSave.fileName);

						// Avoid `mv` function to throw errors by deleting the destination file first before copying
						await RNFetchBlob.fs.exists(destinationDirectory)
						.then(exists => exists && RNFetchBlob.fs.unlink(destinationDirectory))
						.then(() => RNFetchBlob.fs.mv(tempDir, destinationDirectory))
						.catch(error => console.warn("MOVING ERROR\n\n" + error.message));

						const headerData = _.merge(JSON.parse(_.get(response.info().headers, "x-file-metadata") || "{}"), JSON.parse(_.get(response.info().headers, "X-File-Metadata") || "{}"));
						const metaData = {
							...headerData,
							...toSave,
							fileSize: fileProperties.size,
							binaryFile: null,
							taskId: taskId
						};

						toReturn.push({ ...metaData, uri: destinationDirectory });
					}
				});
			}

		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},


	/**
	 * GET IMAGE
	 *
	 * Gets an individual image as a Base 64 String representing the binary file
	 * of the image to download. This is usually accompanied by an `overrides`
	 * parameter that wraps the data to a File object containng the metadata of the image
	 * because you cannot know the metadata just by the Base 64.
	 *
	 * @param  {string} imageId - The ID of the image to download
	 * @return {object} - The File object with a filled in `binaryFile` property
	 */
	async getImage(imageId, overrides = {}) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		// Delete any previous download session
		// await RNFetchBlob.session(imageId).dispose().catch(error => console.warn(error.message));

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			// DEPRECATED
			//
			// We now download images without converting to base64 as it should have been in the first place
			//
			// toReturn = await axios({
			// 	method: "GET",
			// 	url: `${apiUrl}/tasks_projects_files/getFile/${imageId}`,
			// 	headers: {
			// 		Authorization: `Bearer ${token}`,
			// 		Accept: "application/json"
			// 	}
			// })
			// .then(response => response.data);

			toReturn = await RNFetchBlob
			.config({
				// Add this option that makes response data to be stored as a file.
				fileCache : true,
				// By adding this option, the temp files will have a file extension
				appendExt : "jpg",
				// Add the downloaded file to the session to be deleted later
				session: imageId
			})
			.fetch("GET", `${apiUrl}/tasks_projects_files/getFile/${imageId}`, {
				Authorization: `Bearer ${token}`
			})
			// Return value: { ...properties, uri: <directory> }
			.then(async response => {
				const headerData = _.merge(JSON.parse(_.get(response.info().headers, "x-file-metadata") || "{}"), JSON.parse(_.get(response.info().headers, "X-File-Metadata") || "{}"));

				// Sometimes, when TORC Web errors out, it doesn't throw an exception. Instead, it continues to create an empty file, which causes errors when processing
				const fileProperties = await RNFetchBlob.fs.stat(response.path());
				const metaData = {
					...headerData,
					...overrides,
					jsonDetails: JSON.parse(headerData.jsonDetails || "{}"), // THe header Details is stringified JSON which needs to be parsed
					fileSize: fileProperties.size,
					binaryFile: null
				};

				if(_.isEmpty(headerData)) throw new Error(`Cannot download the image with the ID ${imageId}: Missing metadata`);

				return { ...metaData, uri: response.path() };
			});

		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},


	/**
	 * GET TRANSLATIONS
	 *
	 * Returns the translation mapping found in the BPM server. Used mainly for the
	 * translations of the "Form Validation" values as those uses magic strings
	 * that maps to a readable text.
	 *
	 * @return {object} - The mapping as a Javascript object ({ en: { magicString: readableString }, fr: { magicString: readableString }})
	 */
	async getBpmTranslations(locale = "en") {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			// We assign the value of the BPM Translation to a "translation" key to make its structure the same as the other locales
			const bpmTranslations = {
				translation : await axios({
					method: "GET",
					url: `${apiUrl}/files?path=${config.serverAssets.bpmTranslations.directory}`,
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/json"
					}
				}).then(response => response.data)
			};

			// Request enCA + enMX + en + es
			let localeTranslations = await axios({
				method: "GET",
				url: `${apiUrl}/files?path=${config.serverAssets.translations.directory}/${locale}.json`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);

			// Some translations are not standardized to JSON so it returns an array of strings representing the characters of the file
			localeTranslations = typeof localeTranslations === "string" ? require("app/assets").Locales[_.replace(locale, "-", "")] : localeTranslations;

			toReturn = _.merge({}, localeTranslations, bpmTranslations);

		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},


	/**
	 * HANDLE COMMAND
	 *
	 * Normally used by Form Builder with a form field of type "command", all this does is
	 * make an API request to a TORC endpoint. The intention is so "save"
	 * a file in Form Builder using the specified field key called "target". The
	 * return value is the Form model that contains the file and the target value
	 * mathing the filename of the file downloaded.
	 *
	 * @param  {object} params - Contains a componiation of key value pair that defines what file to download
	 * @return {type} - Return the form model with the file downloaded in the "files" property
	 */
	async handleCommand(params) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			toReturn = await axios({
				method: "POST",
				url: `${apiUrl}/tasks/handleCommand`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				},
				body: params
			}).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},



	/**
	 * GET CHANGE LOGS
	 *
	 * The following functions are used to allow for lazy loading data so that
	 * TORC Tablet does not have to download everything for every eync. Instead,
	 * TORC Tablet will only download those that are changed with the specified
	 * `dateSince` parameter.
	 *
	 * @param  {string} dateSince - The epoch date to determine which data are modified since
	 * @return {object} - Log object from TORC Web
	 */

	async getProjectChangelogs(dateSince) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			toReturn = await axios({
				method: "GET",
				url: `${apiUrl}/projects/getProjectChangelogs?since=${dateSince}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	async getProjectFileChangelogs(dateSince) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			toReturn = await axios({
				method: "GET",
				url: `${apiUrl}/projects/getFileChangelogs?since=${dateSince}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	async getTaskChangelogs(dateSince) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			toReturn = await axios({
				method: "GET",
				url: `${apiUrl}/tasks/getValueChangelogs?since=${dateSince}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	async getFormFileChangelogs(dateSince) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			toReturn = await axios({
				method: "GET",
				url: `${apiUrl}/tasks/getFileChangelogs?since=${dateSince}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	async getImageChangelogs(dateSince) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			toReturn = await axios({
				method: "GET",
				url: `${apiUrl}/tasks_projects_files/getImageChangelogs?since=${dateSince}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},

	async getDefinitionChangelogs(dateSince) {
		if(!isInitialized()) throw new Error("TORC Service is not yet initialized.");

		const { apiUrl, token } = config;
		let toReturn = null;
		try {
			toReturn = await axios({
				method: "GET",
				url: `${apiUrl}/tasks_projects_files/getDefinitionChangelogs?since=${dateSince}`,
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: "application/json"
				}
			}).then(response => response.data);
		} catch(error) {
			const { response } = error;
			if(response) {
				const toThrow = errors(error.message || JSON.stringify(response.data, null, "\t"))[response.status];
				if(toThrow) throw new Error(toThrow);
			}
			throw error;
		}

		return toReturn;
	},
};

/**
 * HTTP AUTH HEADER
 *
 * DEPRECATED
 * This is called when an HTTP request to TORC needs the Authorization value
 * in the header. This uses a 3rd party library instead of the natiev library `btoa`
 * because cross platform dependency is an issue with devices that does not support
 * `btoa()`
 *
 * @param {clientId} - The ID of the client logged in
 * @param {clientSecret} - The Secret of the client logged in
 * @return {string} - String value of the Authorization header to be made to the HTTP request
 */
function getAuthorization(clientId, clientSecret) {
	return `Basic ${RNFetchBlob.base64.encode(`${clientId}:${clientSecret}`)}`;
}

/**
 * VALIDATION
 *
 * The validation for the username and password used to login to the TORC library,
 * Currently, the validation is shallow and basic. This will improve in the near
 * future.
 */
function isValid(username, password) {
	return !_.isEmpty(username) && !_.isEmpty(password) && _.isString(username) && _.isString(password);
}


/**
 * IS INITIALIZED
 *
 * Returns a boolean value that deteremines whether the service has been initialzied
 * or not. The condition right now states that if the service has never performed
 * the "login" function yet, then it is considered not yet initialzied.
 *
 * @return {boolean} - The value that determines if the service has been initialized
 */
function isInitialized() {
	const { user, token } = config;
	return !_.isEmpty(user) && !_.isEmpty(token);
}

function getExtension(filename) {
	var parts = filename.split(".");
	return _.tail(parts);
}

function isImage(filename) {
	var fileExtension = getExtension(filename);
	switch (_.lowerCase(fileExtension)) {
		case "jpg":
		case "gif":
		case "bmp":
		case "png":
			return true;
	}
	return false;
}



/**
 * DATA URI TO BLOB
 *
 * Converts a base64 string to blob. Normally used when making a Form Data file
 * POST request that needs a blob.
 * https://gist.github.com/poeticninja/0e4352bc80bc34fad6f7
 *
 * @param  {string} dataURI - The Base64 string representation of the file to convert
 * @return {blob} - The resulting blob object
 */
function dataURItoBlob(dataURI) {
// convert base64/URLEncoded data component to raw binary data held in a string
	var byteString;
	if (dataURI.split(",")[0].indexOf("base64") >= 0)
		byteString = atob(dataURI.split(",")[1]);
	else
		byteString = unescape(dataURI.split(",")[1]);

	// separate out the mime component
	var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];

	// write the bytes of the string to a typed array
	var ia = new Uint8Array(byteString.length);
	for (var i = 0; i < byteString.length; i++) {
		ia[i] = byteString.charCodeAt(i);
	}
	return new Blob([ia], { type:mimeString });
}


/**
 * PREPARE TASK RETRIEVAL
 *
 * This function will return a sanitized task that involves cleanup of the
 * values in the TaskDDS property. Considering there are a few values in the
 * task that are not suppose to be there (e.g. Signature Image's default value
 * is `{ approved: null, ... }`), we need to get rid of this so that it is legit
 * when Form Builder gets it.
 *
 * @param  {type} toPrepare description
 * @return {type}           description
 */
function prepareTaskRetrieval(toPrepare = {}) {
	// JSON PARSE - For some reason, the TaskDDS property is a string
	const values = JSON.parse(_.get(toPrepare, "values") || "{}");

	// Check if the signature image points to a file name
	if(!_.chain(values).get("signatureImage.name").isEmpty().value()) {
		// Check if the file exists
		const toFind = _.find(toPrepare.files, { "name": _.get(values, "signatureImage.name") });
		if(_.isNil(toFind)) values.signatureImage = null;
	} else {
		values.signatureImage = null;
	}

	// CHANGES - Contains the changes to be applied
	const changes = {
		taskDDS: {
			jsonFormTmp: JSON.stringify(values)
		}
	};

	return _.merge({}, toPrepare, changes);
}

function prepareFormValueRetrieval(toPrepare = {}) {
	// JSON PARSE - For some reason, the TaskDDS property is a string
	const values = toPrepare.values || {};

	// Check if the signature image points to a file name
	if(!_.chain(values).get("signatureImage.name").isEmpty().value()) {
		// Check if the file exists
		const toFind = _.find(toPrepare.files, { "name": _.get(values, "signatureImage.name") });
		if(_.isNil(toFind)) values.signatureImage = null;
	} else {
		values.signatureImage = null;
	}

	// Check if the progress of the task is "Completed". This means we have to change it to "completedOnWeb" to make it distinct from the "completedOnTablet"
	let progress = toPrepare.progress;
	if(toPrepare.progress === EM.taskStatus.completed) {
		progress = EM.taskStatus.completedOnWeb;
	}

	// CHANGES - Contains the changes to be applied
	const changes = {
		values,
		progress
	};

	return _.merge({}, toPrepare, changes);
}