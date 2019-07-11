/**
 * TORC TABLET
 *
 * Torc Tablet library will contain the similar function declaraction as the
 * Torc Web. Their corresponding definition however, will not contain HTTP
 * requests to online servers. Instead, it uses a native system call to retrieve
 * data.
 *
 * NOTE
 * Considering the local storage uses a key value pair, the keys will need to be
 * encapsulated inside a value whose key is the has of the username and password.
 * This way, we will easily be able to support multi-user application including
 * an offline login; by checking if the local storage has a key that corresponds
 * to the username and password has, that would mean the user exists and will be
 * allowed to log in to the system. This functionlaity and implementation is similar
 * to the Wellman Offline multi-user support.
 *
 * API Endpoints:
 *
 * - setUser
 * - getUser
 * - saveProjects
 * - getProjects
 * - saveProject
 * - getProject
 */

import { Platform, Share, Alert, CameraRoll } from "react-native";
import RNFetchBlob from "rn-fetch-blob";
import RNFS from "react-native-fs";
import Realm from "realm";
import ImageResizer from "react-native-image-resizer";

// UTILS
import _ from "lodash";
import Moment from "moment";
import { Locales } from "app/constants"; // Used for setting the default value for "getLocale"
import Utils from "./utils";

/**
 * These keys are the key used to retrieve a data using its corresponding key,
 * considering the Local Storage API for android is a key/value pair.
 */
const config = {
	directoryPath: null,
	userHash: null, // To dynamically set the URI property of the images attached to forms. The fact that iOS has different document directory path everytime you access the file system was overlooked
	db: null,

	/* Used for DB table mapping */
	keys: {
		USER: "user",
		PROJECT: "Project",
		TASK: "Task",
		TASK_FILE: "TaskFile",
		FORM: "Form",
		FORM_DEFINITION: "FormDefinition",
		FORM_VALUES: "FormValues",
		FORM_FILES: "FormFiles",
		FORM_CHANGELOG: "FormChangelog",
		IMAGE: "Image",
		TRANSLATION: "Translation",
		OTHER: "other",
		LOG: "Log",
		SYNC: "Sync",
		DB: "db"
	},

	defaults: {
		USER: {
			uom: "c",
			Language: "en-CA"
		}
	}
};

const enums = {
	status: {
		DELETED: -1,
		PENDING: 0,
		SUCCESS: 1,
		FAILURE: 2,
		WARNING: 3,
		CANCELLED: 4,
		HOLD: 5
	}
};

export default {
	// For those who needs the table name
	tables: config.keys,

	// Used for those who needs to set the Log Status
	status: enums.status,

	/**
	 * INITIALIZE
	 *
	 * DEPRECATED
	 * This will create the files and folders needed for local data access without
	 * having to check if it exists or not. Not having this function implemented
	 * means that the File System library will throw an error everytime it acccesses
	 * a directory that doesn't exist. This function will create those directories
	 * prior to prevent this error being thrown.
	 *
	 * Currently, only the "Images" directory is needed to be created prior. In the
	 * future, we will add documents and other file types as part of the initilization
	 * process.
	 */
	async initialize() {
		try {
			config.initialized = true;
		} catch(error) {
			throw error;
		}
	},


	/**
	 * LOGIN
	 *
	 * The Login function will check if the user has previously logged to the system.
	 * Users can only access directories that belongs to them with their directory
	 * name being the hash of their username.
	 *
	 * @param  {string} - The Username to append to the password to get the hash.
	 * @return {obect} - The user object that came from the TORC Web
	 */
	async login(username, password) {
		try {
			username = _.chain(username).trim().toLower().value();
			if(!isValid(username, password)) throw new Error("Invalid username and password.");

			const userHash = RNFetchBlob.base64.encode(username + password);
			if(await RNFetchBlob.fs.exists(RNFetchBlob.fs.dirs.DocumentDir + `/${userHash}/${config.keys.USER}.txt`)) {
				const user = JSON.parse(await RNFetchBlob.fs.readFile(RNFetchBlob.fs.dirs.DocumentDir + `/${userHash}/${config.keys.USER}.txt`));
				if(_.toLower(user.email) !== username) throw new Error("Something went wrong. Please log in again with internet connectivity.");

				/**
				 * DIRECTORY PATH
				 *
				 * We use our custom document directory path so that any local storage access
				 * of the current user only affects their data on their own directory.
				 */

				config.directoryPath = RNFetchBlob.fs.dirs.DocumentDir + `/${userHash}`;
				config.userHash = userHash;
				config.db = {
					path: `${config.directoryPath}/${config.keys.DB}.txt`,
					schema: Utils.getSchema(),
					schemaVersion: Utils.getSchemaVersion()
				};

				return user;
			} else {
				throw new Error("Cannot find user locally. Please login with internet connectivity first.");
			}
		} catch(error) {
			throw error;
		}
	},


	/**
	 * ADD LOGIN
	 *
	 * Used mainly for modifying user-level settings like "UOM". What this does is
	 * it gets the old user object (if any) and merges it with the user model
	 * to save. Ofcourse, the model from the parameter takes precedence over the old one.
	 *
	 * @param  {ojbect} - The new user object to merge with and persist to the DB
	 */
	async addLogin(user) {
		try {
			if(!isValid(user.username, user.password)) throw new Error("Invalid username and password.");

			const userHash = RNFetchBlob.base64.encode(_.toLower(user.username) + user.password);
			await RNFS.mkdir(RNFetchBlob.fs.dirs.DocumentDir + `/${userHash}`);

			let oldUser = null;
			if(await RNFetchBlob.fs.exists(RNFetchBlob.fs.dirs.DocumentDir + `/${userHash}/${config.keys.USER}.txt`)) {
				oldUser = JSON.parse(await RNFetchBlob.fs.readFile(RNFetchBlob.fs.dirs.DocumentDir + `/${userHash}/${config.keys.USER}.txt`));
			}

			user = _.merge(config.defaults.USER, oldUser, user);

			if(!await RNFetchBlob.fs.isDir(RNFetchBlob.fs.dirs.DocumentDir + `/${userHash}`)) {
				// This means the directory was transformed into a file. It somehow happens. :(
				await RNFetchBlob.fs.unlink(RNFetchBlob.fs.dirs.DocumentDir + `/${userHash}`);
			}

			await RNFetchBlob.fs.writeFile(RNFetchBlob.fs.dirs.DocumentDir + `/${userHash}/${config.keys.USER}.txt`, JSON.stringify(user, null, "\t"));
		} catch(error) {
			throw error;
		}
	},

	/**
	 * SET USER
	 *
	 * DEPRECATED - We use the login function to save users to the system for offline use
	 *
	 * This sets the data of the user that is currently logged in. Normally called
	 * by the login component after getting the user data from TORC Web library.
	 *
	 * @param {user} - The user data to set
	 * @return {object} - The user data that was set
	 */

	async setUser(user = {}) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			user = _.merge(config.defaults.USER, user);
			const toSave = JSON.stringify(user, null, "\t");
			await RNFetchBlob.fs.writeFile(`${config.directoryPath}/${config.keys.USER}.txt`, toSave);
			return user;
		} catch(error) {
			throw error;
		}
	},

	/**
	 * GET USER
	 *
	 * This retrieves the data of the user that is currently logged in. This
	 * function is normally used by the login component to see if there is a user
	 * that is currently logged in.
	 */

	async getUser() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return JSON.parse(await RNFetchBlob.fs.readFile(`${config.directoryPath}/${config.keys.USER}.txt`));
	},

	/**
	 * SET PROJECTS
	 *
	 * This overwrites the projects local storage with the incoming array of
	 * projects. Normally gets called when a new user logs in and syncs.
	 *
	 * @param {projects} - The array of projects to set
	 */

	saveProjects(projects = []) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					const preparedProjects = _.map(projects, prepareProjectPersistence);

					for(let project of preparedProjects) {
						// We need to parse every file record in the project to get rid of the Base 64 prefix. Other type of data do not have this prefix.
						const toSave = _.merge(project, {
							files: _.chain(project.files)
							.filter(a => a.binaryFile)
							.map(a => ({ ...a, binaryFile: a.binaryFile ? a.binaryFile.substr(a.binaryFile.indexOf(",") + 1) : "" }))
							.value()
						});

						db.create(config.keys.PROJECT, toSave, true);
					}
				});
			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * GET PROJECTS
	 *
	 * Gets all the projects that belongs to the user.
	 *
	 * @return {array} - The array of projects that are found
	 */
	getProjects() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");


		/**
		 * PROMISE
		 *
		 * Considering that Realm DB reads the database synchronously, we need to
		 * return a promise to transform the synchronous behaviour to a more asynchronous one.
		 * By returning a promise, the invoker can perform a `.then()` function or
		 * await it. This way, it will prevent blocking the UI thread from loading.
		 * Otherwise, Realm DB will block the UI thread.
		 */

		return Realm.open(config.db)
		.then(db => {
			return _.map(db.objects(config.keys.PROJECT), prepareProjectRetrieval);
		});
	},


	/**
	 * DELETE PROJECT
	 *
	 * This function omits a project from the JSON text file that has the same ID
	 * as the one parameterized, effectively deleting it from the system.
	 *
	 * @param  {string} projectId - The project ID to be returned
	 */
	deleteProject(projectId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					const project = _.head(db.objects(config.keys.PROJECT).filtered(`id = "${projectId}"`));
					if(!_.isEmpty(project)) db.delete(project);
				});
			});
		} catch(error) {
			throw error;
		}
	},

	/**
	 * SET PROJECT
	 *
	 * This will overwrite the project that is found from the array of the projects
	 * list found on the local storage. Otherwise, it appends it to the list.
	 *
	 * @param {project} - The Project model to set to the array of projects
	 * @return {object} - The project model that was set
	 */
	saveProject(project = {}) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					// We need to parse every file record in the project to get rid of the Base 64 prefix. Other type of data do not have this prefix.
					const toSave = _.merge(project, {
						files: _.chain(project.files)
							.filter(a => a.binaryFile && a.binaryFile.substr(a.binaryFile.indexOf(",") + 1) /* Sometimes, binaryFile is null. Like what? lmao  */)
							.map(a => ({ ...a, binaryFile: a.binaryFile.substr(a.binaryFile.indexOf(",") + 1)}))
							.value()
					});

					const preparedProject = prepareProjectPersistence(toSave);
					db.create(config.keys.PROJECT, preparedProject, true);
				});

			});
		} catch(error) {
			throw error;
		}
	},

	/**
	 * GET PROJECT
	 *
	 * This function returns the project whose ID is the same as the parameterized
	 * ID. May be removed later considering components can just find it in the list
	 * returned by the `getProjects()` function.
	 *
	 * @param {id} - The ID to match with the list of projects
	 * @return {object} - The Project that has a mathing ID
	 */
	getProject(id) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			const toReturn = prepareProjectRetrieval(_.head(db.objects(config.keys.PROJECT).filtered(`id = "${id}"`)));
			return toReturn;
		});
	},


	/**
	 * SAVE PROJECT FILE
	 *
	 * Attaches the parameterized file object to the project with the same ID as the
	 * passed ID string.
	 *
	 * @param  {object} toSave - The file object to save
	 * @param  {string} projectId - THe ID of the project to attach the file to
	 */
	saveProjectFile(toSave, projectId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			db.write(() => {
				const file = prepareFilePersistence(toSave);
				const project = _.head(db.objects(config.keys.PROJECT).filtered(`id = "${projectId}"`));
				project.files = project.files || [];
				project.files.append(file);
				db.create(config.keys.PROJECT, project, true);
			});
		});
	},


	/**
	 * GET TASKS
	 *
	 * Documentation pending
	 *
	 * @return {array} - The tasks that is found on the local storage of the assigned user
	 */
	getTasks() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			const toReturn = db.objects(config.keys.TASK);
			return _.map(toReturn, prepareTaskRetrieval);
		});

		// const { db } = config;
		// const toReturn = await db.objects(config.keys.TASK);
		// return _.map(toReturn, prepareTaskRetrieval);
	},


	/**
	 * GET TASKS
	 *
	 * Documentation pending
	 *
	 * @return {array} - The tasks that is found on the local storage of the assigned user
	 */
	getTask(taskId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			const toReturn = db.objects(config.keys.TASK).filtered(`id = "${taskId}"`);
			if(_.isEmpty(toReturn)) throw new Error(`Cannot find the task specified: ${taskId}`);

			return prepareTaskRetrieval(_.head(toReturn));
		});
	},

	/**
	 * SAVE TASKS
	 *
	 * This function will take an array of task objects and then overwrite/add it
	 * to the current list of tasks from the local storage. This is will auto-generate
	 * the ID if it does not come with the parameterized object.
	 *
	 * @param  {array} tasks - The array of tasks to be added
	 */
	saveTasks(tasks = []) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					const preparedTasks = _.map(tasks, prepareTaskPersistence);
					for(let task of preparedTasks) {
						db.create(config.keys.TASK, task, true);
					}
				});
			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * SAVE TASK
	 *
	 * This funciton will save a single task object. This will auto-generate the ID
	 * if it does not come with the parameterized object.
	 *
	 * @param  {object} task - The task object to be saved
	 */
	saveTask(task) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					const toSave = prepareTaskPersistence(task);
					db.create(config.keys.TASK, toSave, true);
				});
			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * GET TASK FIELD DEFINITIONS
	 *
	 * Normally used when creating a new form where the appplciation has to show
	 * the list of possible forms to create from.
	 *
	 * @return {array} - The list of possible forms to create from
	 */
	getFormDefinitions() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				return _.map(db.objects(config.keys.FORM_DEFINITION), prepareFormDefinitionRetrieval);
			});
		} catch(error) {
			throw error;
		}
	},

	getFormDefinition(key) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				const toReturn = _.head(db.objects(config.keys.FORM_DEFINITION).filtered(`key = "${key}"`));
				if(_.isEmpty(toReturn)) throw new Error(`Cannot find the task definition with the type of ${key}.`);

				return prepareFormDefinitionRetrieval(toReturn);
			});
		} catch(error) {
			throw error;
		}
	},

	getFormDefinitionByTaskId(taskId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				const formValue = _.head(db.objects(config.keys.FORM_VALUES).filtered(`id = "${taskId}"`));
				if(_.isEmpty(formValue)) throw new Error(`Cannot find the task definition with the ID of ${taskId}.`);

				const toReturn = _.head(db.objects(config.keys.FORM_DEFINITION).filtered(`key = "${formValue.key}"`));
				if(_.isEmpty(toReturn)) throw new Error(`Cannot find the task definition with the type of ${formValue.key}.`);

				return prepareFormDefinitionRetrieval(toReturn);
			});
		} catch(error) {
			throw error;
		}
	},

	/**
	 * SAVE TASK DEFINITION
	 *
	 * Normally used by the sync when making an HTTP request to the TORC Service
	 * and saving the current form definitions assigned to the user.
	 *
	 * @param  {object} taskDefinition - The Form Definition object to save
	 */
	saveFormDefinition(taskDefinition) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					taskDefinition = prepareFormDefinitionPersistence(taskDefinition);
					db.create(config.keys.FORM_DEFINITION, taskDefinition, true);
				});
			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * DELETE TASK DEFINITION
	 *
	 * Normally used in Sync when deleting those form templates not found from the HTTP
	 * request from TORC Web.
	 *
	 * @param  {string} taskDefinitionId - The ID of the definition to get. Reminder that the ID is the `formDefintion.task.key`.
	 */
	deleteFormDefinition(taskDefinitionId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					const project = _.head(db.objects(config.keys.FORM_DEFINITION).filtered(`id = "${taskDefinitionId}"`));
					if(!_.isEmpty(project)) db.delete(project);
				});
			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * GET TASK BY PROJECT ID
	 *
	 * This function filters the returned array of tasks by the project they belong to
	 * using the parameterized project ID.
	 *
	 * @param  {string} - The Project ID to look for
	 * @return {array} - The array of Tasks that belongs to the project whose ID is that of the parameterized
	 */
	getTasksByProjectId(projectId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			const project = _.head(db.objects(config.keys.PROJECT).filtered(`id = "${projectId}"`));
			if(_.isEmpty(project)) throw new Error(`Cannot find the project with the parameterized ID: ${projectId}`);

			const taskIds = _.map(prepareProjectRetrieval(project).tasks, a => a.id);
			const tasks = db.objects(config.keys.TASK);
			return _.chain(tasks).filter(a => _.indexOf(taskIds, a.id) > -1).map(prepareTaskRetrieval).value();
		});
	},


	/**
	 * UNLINKED TASKS
	 *
	 * All unlinked tasks are going to be stored in the "changelog" table as
	 * these records are not sourced from TORC Web. Anything the Tablet saves
	 * will be in the changelog and whenever we load a record, we merge the
	 * changelog with the original prior to sending to the view components.
	 */
	getUnlinkedTasks() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			const linkedTaskIds = _.chain(db.objects(config.keys.PROJECT)).map(prepareProjectRetrieval).map(a => a.tasks).flatten().map(a => a.id).value();
			const pendingTaskLogs = db.objects(config.keys.LOG).filtered(`status != "${enums.status.SUCCESS}" AND tableName = "${config.keys.TASK}"`);

			const toReturn = _.chain(pendingTaskLogs)
			.filter(a => _.indexOf(linkedTaskIds, a.id) === -1)
			.map(a => prepareLogRetrieval(a).data) // We do not call "preapreTaskRetrieval()" because the logs for Unlinked Tasks already has the data parsed to JSON object
			.value();

			return toReturn;
		});
	},


	/**
	 * DELETE TASK
	 *
	 * Not normally used as we cannot delete tasks.
	 *
	 * @param  {taskId}  The ID of the task to be deleted
	 */
	deleteTask(taskId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			db.write(() => {
				const task = db.objects(config.keys.TASK).filtered(`id = "${taskId}"`);
				if(!_.isEmpty(task)) db.delete(task);
			});
		});
	},


	/**
	 * GET FORM FILE
	 *
	 * Gets the task file attachment using the ID provided
	 *
	 * @param {string} fileId - The ID of the file to be retrieved
	 */
	getFormFile(fileId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			return prepareFormFileRetrieval(_.head(db.objects(config.keys.FORM_FILES).filtered(`id = "${fileId}"`)));
		});
	},

	/**
	 * GET TASK FILES BY TASK ID
	 *
	 * Gets the Task Files by the parameterized Task ID. Normally, this is not used as
	 * the Save Form function already has a form model that contains the file attachments
	 * on one of its fields. So by getting the form by task ID, the invoker will already
	 * have access to the file in question.
	 *
	 * @param  {string} taskId - The ID of the task to take the files from
	 * @return {array} - An array of file objects
	 */
	getFormFilesByTaskId(taskId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			const task = _.head(db.objects(config.keys.FORM_VALUES).filtered(`id = "${taskId}"`));
			if(_.isEmpty(task)) throw new Error(`Cannot find the Task with the provided ID: ${taskId}`);

			return _.map(db.objects(config.keys.FORM_FILES).filtered(`taskId = "${task.id}"`), prepareFormFileRetrieval);
		});
	},

	/**
	 * SAVE TASK FILE
	 *
	 * This saves the task file to local storage. Considering the Task ID is already
	 * provided as part of the file object itself, we do not need any other
	 * parameter to bind this to the task it belongs to.
	 *
	 * @param  {object} toSave - A file object coming from TORC Web Service representing the contents and meta-data of the file being saved
	 */
	saveFormFile(toSave) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		// Encode the filename of the image to prevent malicious attacks
		toSave.fileName = encodeURI(decodeURI(toSave.fileName));

		const destinationDirectory = `${config.directoryPath}/${toSave.taskId}`;
		const destinationPath = `${destinationDirectory}/${toSave.id}`;

		return RNFetchBlob.fs.exists(toSave.uri)
		.then(async exists => {
			if(!exists) throw new Error(`${`"${toSave.fileName || toSave.name}"` || "File"} does not exist.`);

			// Check if the destination directory exist
			const dirExists = await RNFetchBlob.fs.isDir(destinationDirectory);
			if(!dirExists) await RNFetchBlob.fs.mkdir(destinationDirectory).catch(error => console.warn("Dir Exists: " + dirExists + "\n" + error.message));

			// For some reason, on Apple device, RNFetchBlob doesn't wanna copy if the file already exist, so we have to check if it exists and delete it if it does
			// const destinationExists = await RNFetchBlob.fs.exists(`${destinationDirectory}/${toSave.id}`);
			// if(destinationExists) await RNFetchBlob.fs.unlink(`${destinationDirectory}/${toSave.id}`);
		})
		.then(async () => {
			// Copy the file from temp to destination directory. (on iOS, the uri cannot be the same as the destination directory)
			if(toSave.uri !== destinationPath) {
				if(Platform.OS === "ios") {
					// For some reason, on Apple device, RNFetchBlob doesn't wanna overwrite if the file already exist
					await RNFetchBlob.fs.unlink(destinationPath);
				}
				await RNFetchBlob.fs.cp(toSave.uri, destinationPath);
			}
		})
		.then(() => _.includes(["image/jpg", "image/png", "image/jpeg"], toSave.contentType) && getThumbnail(toSave))
		.then(thumbnail => toSave.thumbnail = thumbnail)
		.then(() => RNFetchBlob.fs.stat(destinationPath))
		.then(stat => {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					db.create(config.keys.FORM_FILES, prepareImagePersistence({ ...toSave, ...stat, uri: destinationPath, binaryFile: null }), true);
				});
			});
		});
	},

	deleteFormFile(toDelete) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		// Check if the temp file exist
		return RNFetchBlob.fs.exists(toDelete.uri)
		.then(exists => {
			// Delete the file directory
			return exists && RNFetchBlob.fs.unlink(prepareImageRetrieval(toDelete).uri); // We use a `prepare` function because the uri will change if it's on iOS
		});
	},

	/**
	 * GET IMAGES
	 *
	 * Get all the images in the system. Since this is a very broad funtion that
	 * returns a potentially unnecessarily large data, we can allow an options
	 * object that when set, returns a filtered array of images with that certain
	 * property.
	 *
	 * OPTIONS
	 *
	 * local (boolean) - Returns the images that originated from the tablet device
	 *
	 * @param  {object} options = The object for filtering the return value based off of certain attributes
	 * @return {array} - The array of images
	 */
	getImages(options = {}) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			let toReturn = null;
			const { local } = options;
			if(local) {
				// Get all the images and filter in those that are to be synced because those means they were taken from the device locally
				const allImages = db.objects(config.keys.IMAGE);
				const imageIds = _.map(db.objects(config.keys.LOG).filtered(`tableName = "${config.keys.IMAGE}"`), a => a.id);
				toReturn = _.filter(allImages, a => _.indexOf(imageIds, a.id) > -1);
			} else {
				toReturn = db.objects(config.keys.IMAGE);
			}

			return _.map(toReturn, a => prepareImageRetrieval(a));
		});
	},


	/**
	 * GET IMAGE
	 *
	 * Returns the image by the parameterized ID.
	 *
	 * @param  {string} id - The ID of the image to get
	 * @return {object} - The Image object with the same ID
	 */
	getImage(id) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			let toReturn = _.head(db.objects(config.keys.IMAGE).filtered(`id = "${id}"`));
			if(_.isEmpty(toReturn)) throw new Error(`Cannot find the image with the ID: ${id}`);

			return prepareImageRetrieval(toReturn);
		});
	},


	/**
	 * GET IMAGE BY TASK ID
	 *
	 * Function used to retrieve an array of images that belongs to a task. Normally used
	 * by the image gallery.
	 *
	 * @param  {string} taskId - The ID of the task to retrieve images from
	 * @return {array} - An array of image objects containing the meta-data of the image and its corresponding Base 64 string representation of the image contents
	 */
	getImagesByTaskId(taskId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			const task = _.head(db.objects(config.keys.FORM_VALUES).filtered(`id = "${taskId}"`));
			if(_.isEmpty(task)) throw new Error(`Cannot find the Task with the provided ID: ${taskId}`);

			const images = db.objects(config.keys.IMAGE).filtered(`taskId = "${task.id}"`);
			return _.map(images, a => prepareImageRetrieval(a));
		});
	},

	/**
	 * SAVE IMAGES
	 *
	 * Save a bulk of images to local storage. Since the task already has the ID of the
	 * image to load, we do not need to store any metadata for the image that defines
	 * which task it belongs to.
	 */
	saveImage(toSave) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		// Encode the filename of the image to prevent malicious attacks
		toSave.fileName = encodeURI(decodeURI(toSave.fileName));

		const destinationDirectory = `${config.directoryPath}/${toSave.taskId}`;
		return RNFetchBlob.fs.exists(toSave.uri)
		.then(async exists => {
			if(!exists) throw new Error("Image does not exist.");

			// Check if the destination directory exist
			const dirExists = await RNFetchBlob.fs.isDir(destinationDirectory);
			if(!dirExists) await RNFetchBlob.fs.mkdir(destinationDirectory).catch(error => console.warn("Dir Exists: " + dirExists + "\n" + error.message));

			// For some reason, on Apple device, RNFetchBlob doesn't wanna copy if the file already exist, so we have to check if it exists and delete it if it does
			// const destinationExists = await RNFetchBlob.fs.exists(`${destinationDirectory}/${toSave.id}`);
			// if(destinationExists) await RNFetchBlob.fs.unlink(`${destinationDirectory}/${toSave.id}`);
		})
		.then(async () => {
			// Copy the file from temp to destination directory. (on iOS, the uri cannot be the same as the destination directory)
			if(toSave.uri !== `${destinationDirectory}/${toSave.id}`) {
				if(Platform.OS === "ios") {
					// For some reason, on Apple device, RNFetchBlob doesn't wanna overwrite if the file already exist
					await RNFetchBlob.fs.unlink(`${destinationDirectory}/${toSave.id}`);
				}
				await RNFetchBlob.fs.cp(toSave.uri, `${destinationDirectory}/${toSave.id}`);
			}
		})
		.then(() => getThumbnail(toSave))
		.then(thumbnail => toSave.thumbnail = thumbnail)
		.then(() => {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					db.create(config.keys.IMAGE, prepareImagePersistence({ ...toSave, uri: `${destinationDirectory}/${toSave.id}`, binaryFile: null }), true);
				});
			});
		});
	},


	/**
	 * SAVE IMAGE LOG
	 *
	 * Considering the system does not overwrite any data, saving images proves to be tricky, considering
	 * the physical file must not be modified as well. So everytime we save an image log, we need to create
	 * the physical file has to be on a seperate directory as the directory defined in `saveImage` function.
	 *
	 * @return {object} - The image with the updated `uri` property
	 */
	saveImageLog(toSave) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		// Encode the filename of the image to prevent malicious attacks
		toSave.fileName = encodeURI(decodeURI(toSave.fileName));

		const destinationDirectory = `${config.directoryPath}/${toSave.taskId}/${config.keys.LOG}`;
		// Check if the file exist
		return RNFetchBlob.fs.exists(toSave.uri)
		.then(async exists => {
			if(!exists) throw new Error("Image does not exist.");

			// Check if the destination directory exist
			const dirExists = await RNFetchBlob.fs.isDir(destinationDirectory);
			if(!dirExists) await RNFetchBlob.fs.mkdir(destinationDirectory).catch(error => console.warn("Dir Exists: " + dirExists + "\n" + error.message));

			// For some reason, on Apple device, RNFetchBlob doesn't wanna copy if the file already exist, so we have to check if it exists and delete it if it does
			// const destinationExists = await RNFetchBlob.fs.exists(`${destinationDirectory}/${toSave.id}`);
			// if(destinationExists) await RNFetchBlob.fs.unlink(`${destinationDirectory}/${toSave.id}`);
		})
		.then(async () => {
			// Copy the file from temp to destination directory. (on iOS, the uri cannot be the same as the destination directory)
			if(toSave.uri !== `${destinationDirectory}/${toSave.id}`) {
				if(Platform.OS === "ios") {
					// For some reason, on Apple device, RNFetchBlob doesn't wanna overwrite if the file already exist
					await RNFetchBlob.fs.unlink(`${destinationDirectory}/${toSave.id}`);
				}
				await RNFetchBlob.fs.cp(toSave.uri, `${destinationDirectory}/${toSave.id}`);
			}
		})
		.then(() => getThumbnail(toSave))
		.then(thumbnail => toSave.thumbnail = thumbnail)
		.then(() => ({ ...toSave, uri: `${destinationDirectory}/${toSave.id}` }));
	},

	deleteImageLog(toDelete) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		// Check if the temp file exist
		return RNFetchBlob.fs.exists(toDelete.uri)
		.then(exists => {
			// Delete the file directory
			return exists && RNFetchBlob.fs.unlink(toDelete.uri);
		})
		.then(() => this.deleteLog(toDelete.id));
	},

	/**
	 * SAVE IMAGE
	 *
	 * In an attempt to improve performance and prevent memory problems, we directly
	 * save the images to the `directoryPath` instead of getting its Base 64 string
	 * representation. Considering the new API endpoint in TORC Web returns the
	 * raw image file, TORC Service can save this image directly to a temporary file
	 * directory. This temporary file directory is then sent here, which copies it
	 * to the specified directory. Afterwards, we save the image metadata to the DB.
	 * So in the future, we retrieve images by getting the `uri` property of the image
	 * from the DB, then make a file system request to retrieve this file.
	 */

	saveImages(images = []) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		// Firstly, we prepare the directories that are needed to be created before we perform any save attempts
		const createDirRequests = [];
		const uniqueTaskIds = _.chain(images).map("taskId").uniq().value();
		for(let taskId of uniqueTaskIds) {
			// Check if the temp file exist
			createDirRequests.push(
				new Promise(async resolve => {
					const destinationDirectory = `${config.directoryPath}/${taskId}`; // Task ID is used to seperate files who might have the same file name

					// Check if the destination directory exist
					const dirExists = await RNFetchBlob.fs.isDir(destinationDirectory);
					const dirFileExists = await RNFetchBlob.fs.exists(destinationDirectory);
					if(!dirExists) await RNFetchBlob.fs.mkdir(destinationDirectory).catch(error => console.warn("Dir Exists: " + dirExists + "\nFile Exists: " + dirFileExists + "\n" + error.message));
					resolve();
				})
			);
		}

		// Create the directories in parallel
		return Promise.all(createDirRequests)
		.then(() => {
			const errors = [];
			const saveRequests = [];
			for(let toSave of images) {
				// Encode the filename of the image to prevent malicious attacks
				toSave.fileName = encodeURI(decodeURI(toSave.fileName));

				const destinationDirectory = `${config.directoryPath}/${toSave.taskId}`; // Task ID is used to seperate files who might have the same file name
				saveRequests.push(
					// Check if the temp file exist
					RNFetchBlob.fs.exists(toSave.uri)
					.then(async exists => {
						if(!exists) throw new Error("Image does not exist.");

						// For some reason, on Apple device, RNFetchBlob doesn't wanna copy if the file already exist, so we have to check if it exists and delete it if it does
						// const destinationExists = await RNFetchBlob.fs.exists(`${destinationDirectory}/${toSave.id}`);
						// if(destinationExists) await RNFetchBlob.fs.unlink(`${destinationDirectory}/${toSave.id}`);
					})
					.then(async () => {
						// Copy the file from temp to destination directory. (on iOS, the uri cannot be the same as the destination directory)
						if(toSave.uri !== `${destinationDirectory}/${toSave.id}`) {
							if(Platform.OS === "ios") {
								// For some reason, on Apple device, RNFetchBlob doesn't wanna overwrite if the file already exist
								await RNFetchBlob.fs.unlink(`${destinationDirectory}/${toSave.id}`);
							}
							await RNFetchBlob.fs.cp(toSave.uri, `${destinationDirectory}/${toSave.id}`);
						}
					})
					.then(() => {
						// Change the uri directory for thumbnail generation
						toSave.uri = `${destinationDirectory}/${toSave.id}`;

						// Add a thumbnail property to the image to save
						return getThumbnail(toSave);
					})
					.then(thumbnail => {
						toSave.thumbnail = thumbnail;

						// Upon saving the file physically to the storage, we save the metadata to the `IMAGE` table
						return Realm.open(config.db).then(db => {
							db.write(() => {
								db.create(config.keys.IMAGE, prepareImagePersistence(toSave), true);
							});
						});
					})
					.catch(error => errors.push(new Error(`${toSave.fileName} - ${error.message}`)))
				);
			}

			return Promise.all(saveRequests)
			.then(() => {
				if(_.size(errors) > 0) throw new Error(`${_.reduce(errors, (toReturn, a) => toReturn += `- ${a.message}\n`, "")}`);
			});
		});
	},

	deleteImage(id) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			db.write(() => {
				const toDelete = _.head(db.objects(config.keys.IMAGE).filtered(`id = "${id}"`));
				if(!_.isEmpty(toDelete)) {
					db.delete(toDelete);

					// After deleting the metadata from the DB, we delete the physical file
					return RNFetchBlob.fs.exists(toDelete.uri)
					.then(exists => exists && RNFetchBlob.fs.unlink(toDelete.uri));
				}
			});
		});
	},

	deleteImagesByTaskId(taskId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			db.write(() => {
				const toDelete = _.map(db.objects(config.keys.IMAGE).filtered(`taskId = "${taskId}"`));
				const deleteRequests = [];
				for(let image of toDelete) {
					db.delete(image);

					// After deleting the metadata from the DB, we delete the physical file
					deleteRequests.push(
						RNFetchBlob.fs.exists(image.uri)
						.then(exists => exists && RNFetchBlob.fs.unlink(image.uri))
					);
				}

				return Promise.all(deleteRequests);
			});
		});
	},

	/**
	 * GET FORMS
	 *
	 * This gets all the forms that are found in the DB. Normally used by the Sync actiondeleteForm
	 * when deleting all forms. Can be used on other functionalities as well.
	 *
	 * @return {array} - The array of all the forms found
	 */
	getForms() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				const forms = db.objects(config.keys.TASK);
				return _.map(forms, prepareFormRetrieval);
			});
		} catch(error) {
			throw error;
		}
	},

	/**
	 * GET FORM BY TASK ID
	 *
	 * This function is used when loading a form using the the task it's assigned to.
	 * This function will firstly check if the task object exists with the parameterized ID.
	 * Then, it will look for the form with the same ID as the task. Afterwards, it will
	 * return the form if there is one that is found.
	 *
	 * NOTE:
	 * Normally, this function gets from the table that has the original data. If any
	 * of the model has been modified, the modified data is located in the "Log" table.
	 * If you need to gain access to the modified data, you must make another query
	 * that takes it. This isolates the changes from the original data and allows
	 * for many potential scalability such as reverting to default values.
	 *
	 * @param  {string} taskId - The ID of the Task the form is associated to
	 * @return {object} - Form model that was found with the same ID
	 */
	getFormByTaskId(taskId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				let task = _.head(db.objects(config.keys.TASK).filtered(`id = "${taskId}"`));
				if(_.isEmpty(task)) {
					task = _.head(db.objects(config.keys.LOG).filtered(`id = "${taskId}"`));
					if(_.isEmpty(task)) throw new Error(`Cannot find the Task with the provided ID: ${taskId}`);
					task = prepareLogRetrieval(task).data;
				}

				// DEPRECATED
				//
				// We now use the same table for the Task and Form
				//
				// const form = _.head(db.objects(config.keys.FORM).filtered(`id = "${task.id}"`));
				// if(_.isEmpty(form)) throw new Error("Cannot find the Form belonging to the task selected.");

				return prepareFormRetrieval(task);
			});
		} catch(error) {
			throw error;
		}
	},

	getFormValue(taskId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				const formValue = prepareFormValueRetrieval(_.head(db.objects(config.keys.FORM_VALUES).filtered(`id = "${taskId}"`)) || {});
				const formValueChangelog = prepareFormValueRetrieval(_.head(db.objects(config.keys.LOG).filtered(`id = "${taskId}"`)) || {});

				if(_.isEmpty(formValue) && _.isEmpty(formValueChangelog)) throw new Error(`Cannot find the Task with the provided ID: ${taskId}`);
				formValue.values = _.merge({}, formValue.values, _.get(formValueChangelog, "data.values"));

				// DEPRECATED
				//
				// We now use the same table for the Task and Form
				//
				// const form = _.head(db.objects(config.keys.FORM).filtered(`id = "${task.id}"`));
				// if(_.isEmpty(form)) throw new Error("Cannot find the Form belonging to the task selected.");

				return formValue;
			});
		} catch(error) {
			throw error;
		}
	},

	getFormValues() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				let formValues = _.map(db.objects(config.keys.FORM_VALUES), prepareFormRetrieval);
				return formValues;
			});
		} catch(error) {
			throw error;
		}
	},

	getFormValuesByProjectId(projectId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		return Realm.open(config.db).then(db => {
			const project = _.head(db.objects(config.keys.PROJECT).filtered(`id = "${projectId}"`));
			if(_.isEmpty(project)) throw new Error(`Cannot find the project with the parameterized ID: ${projectId}`);

			const taskIds = _.map(prepareProjectRetrieval(project).tasks, a => a.id);
			const formValues = db.objects(config.keys.FORM_VALUES);
			return _.chain(formValues).filter(a => _.indexOf(taskIds, a.id) > -1).map(prepareFormValueRetrieval).value();
		});
	},

	/**
	 * SAVE FORM
	 *
	 * This function will save the form. Since the form already has the meta data
	 * it needs to know which task it belongs to, we can just save the form
	 * straight away.
	 *
	 * @params	{object} - The form object to be persisted
	 */
	saveForm(toSave) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {

					// const changeLog = {
					// 	id: toSave.item1.id,
					// 	taskDDS: difference(toSave.item1.taskDDS, db.objects(config.keys.FORM).filtered(`id = "${toSave.item1.id}"`))
					// };
					// toSave = prepareLogPersistence(changeLog);
					toSave = prepareTaskPersistence(toSave);
					db.create(config.keys.TASK, toSave, true);
				});
			});
		} catch(error) {
			throw error;
		}
	},

	saveFormValue(toSave) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					toSave = prepareFormValuePersistence(toSave);
					db.create(config.keys.FORM_VALUES, toSave, true);
				});
			});
		} catch(error) {
			throw error;
		}
	},

	/**
	 * DELETE FORM VALUE
	 *
	 * Not to be confused with the `deleteForm` function, this deletes the
	 * form value in the FORM_VALUES table instead of the TASKS table. This
	 * only deletes the form value and the files its associated to. This
	 * however, does not delete the form definition, considering form
	 * definition is a shared data.
	 *
	 * @param {string} formId - The ID of the Form Value to delete
	 */

	deleteFormValue(formId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					const form = _.head(db.objects(config.keys.FORM_VALUES).filtered(`id = "${formId}"`));
					if(!_.isEmpty(form)) db.delete(form);

					const taskFiles = _.map(db.objects(config.keys.IMAGE).filtered(`taskId = "${formId}"`));
					for(let file of taskFiles) {
						db.delete(file);
					}
				});
			});
		} catch(error) {
			throw error;
		}
	},

	/**
	 * DELETE FORM
	 *
	 * Deletes the form if found on the DB. This is noramlly used by the Sync action
	 * when dealing with deleting old form data.
	 *
	 * @param  {string} formId - The ID of the form to be deleted
	 */
	deleteForm(formId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					const form = _.head(db.objects(config.keys.TASK).filtered(`id = "${formId}"`));
					if(!_.isEmpty(form)) db.delete(form);
				});
			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * GET LOGS
	 *
	 * Logs are changes that were made while the device is offline. For example
	 * a form that is modified or an image that was recently taken. This function
	 * will return all of those logs as an array. Normally used in synchronization
	 * where it needs to get all of the logs and make HTTP requests to TORC Web.
	 *
	 * NOTE:
	 * Make sure to filter out the logs based on their status:
	 * - SUCCESS
	 * - WARNING
	 * - FAILURE
	 * - PENDING
	 * - CANCELLED
	 * - HOLD
	 *
	 * TO DO:
	 * - Encapsulate these functions to a separate file and import it from here
	 *
	 * @return {array} - The array of log records that was saved since last time
	 */

	getLogs() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				return _.map(db.objects(config.keys.LOG), prepareLogRetrieval);
			});
		} catch(error) {
			throw error;
		}
	},
	getPendingLogs() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				return _.map(
					db.objects(config.keys.LOG).filtered(`status != "${enums.status.SUCCESS}" AND status != "${enums.status.HOLD}" AND status != "${enums.status.DELETED}"`),
					prepareLogRetrieval
				);
			});
		} catch(error) {
			throw error;
		}
	},
	getPendingImageLogs() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				// For some reason, this returns an object with index as keys, instead of an array, so we have to wrap it in a map function
				return _.map(
					db.objects(config.keys.LOG).filtered(`status != "${enums.status.SUCCESS}" AND status != "${enums.status.HOLD}" AND status != "${enums.status.DELETED}" AND tableName = "${config.keys.IMAGE}"`),
					prepareImageLogRetrieval
				);
			});
		} catch(error) {
			throw error;
		}
	},
	getPendingProjectLogs() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				return _.map(
					db.objects(config.keys.LOG).filtered(`status != "${enums.status.SUCCESS}" AND status != "${enums.status.HOLD}" AND status != "${enums.status.DELETED}" AND tableName = "${config.keys.PROJECT}"`),
					prepareLogRetrieval
				);
			});
		} catch(error) {
			throw error;
		}
	},
	getPendingTaskLogs() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				return _.map(
					db.objects(config.keys.LOG).filtered(`status != "${enums.status.SUCCESS}" AND status != "${enums.status.HOLD}" AND status != "${enums.status.DELETED}" AND tableName = "${config.keys.FORM_VALUES}"`),
					prepareLogRetrieval
				);
			});
		} catch(error) {
			throw error;
		}
	},
	getPendingFormLogs() {
		return this.getPendingTaskLogs();
	},
	getImageLogs() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				// For some reason, this returns an object with index as keys, instead of an array, so we have to wrap it in a map function
				return _.map(
					db.objects(config.keys.LOG).filtered(`status != "${enums.status.SUCCESS}" AND tableName = "${config.keys.IMAGE}"`),
					prepareImageLogRetrieval
				);
			});
		} catch(error) {
			throw error;
		}
	},
	getProjectLogs() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				return _.map(
					db.objects(config.keys.LOG).filtered(`status != "${enums.status.SUCCESS}" AND tableName = "${config.keys.PROJECT}"`),
					prepareLogRetrieval
				);
			});
		} catch(error) {
			throw error;
		}
	},
	getTaskLogs() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				return _.map(
					db.objects(config.keys.LOG).filtered(`status != "${enums.status.SUCCESS}" AND tableName = "${config.keys.FORM_VALUES}"`),
					prepareLogRetrieval
				);
			});
		} catch(error) {
			throw error;
		}
	},
	getFormLogs() {
		return this.getTaskLogs();
	},

	getLog(id) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				let toReturn = _.head(db.objects(config.keys.LOG).filtered(`id = "${id}"`));
				if(_.isEmpty(toReturn)) throw new Error(`Cannot find the log with the ID: ${id}`);
				switch(toReturn.tableName) {
					case config.keys.IMAGE:
						return prepareImageLogRetrieval(toReturn);

					case config.keys.FORM_VALUES: {
						toReturn = prepareLogRetrieval(toReturn);
						toReturn.data.files = _.chain(toReturn).get("data.files").map(prepareFormFileRetrieval).value();
						return toReturn;
					}

					default:
						return prepareLogRetrieval(toReturn);
				}
			});
		} catch(error) {
			throw error;
		}
	},

	/**
	 * EXPORT LOG
	 *
	 * This uses the platform dependent sharing feature to share the log
	 * record. This is normally called when there is error in the tasks to
	 * upload. This allows the user to export the changelog records as
	 * text.
	 *
	 * @param {string} logId - The ID of the log to share
	 */

	exportLog(logId) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				let changeLog = _.head(db.objects(config.keys.LOG).filtered(`id = "${logId}"`));
				if(_.isEmpty(changeLog)) throw new Error(`Cannot find the log with the ID: ${logId}`);

				// Different logs differ in preparation process depending on which type they are
				switch(changeLog.tableName) {
					case config.keys.IMAGE: {
						changeLog = prepareImageLogRetrieval(changeLog);
						break;
					}

					default: {
						changeLog = prepareLogRetrieval(changeLog);
					}
				}

				setTimeout(async () => {
					// Set the prefix message of the shareable log record
					const prefix = "\n\n-\n\n";

					switch(changeLog.tableName) {
						case config.keys.IMAGE: {
							// Reaching this code block means the contents to share must include the base 64 string of the image
							const image = {
								...changeLog.data, // This formats the URI accordingly
								fileName: decodeURI(_.get(changeLog, "data.fileName")),
								thumbnail: null
							};

							const destinationDirectory = `${RNFetchBlob.fs.dirs.CacheDir}/${image.fileName}`;
							// We copy the file to a temporary location and use that directory to save to camera roll
							return RNFetchBlob.fs.exists(`${image.uri}`)
							.then(exists => {
								if(!exists) throw new Error("Cannot find the image to share.");

								RNFetchBlob.fs.cp(image.uri, destinationDirectory)
								.then(() => CameraRoll.saveToCameraRoll(`file://${destinationDirectory}`))
								.then(() => {
									Alert.alert(
										"Saved Successfully",
										`"${image.fileName}" was successfully saved in the gallery.`,
										[
											{
												text: "Ok",
												onPress: async () => {
													const toShare = {
														...changeLog,
														data: {
															...changeLog.data,
															thumbnail: null,
															binaryFile: null
														}
													};

													return Share.share({
														message: prefix + JSON.stringify(toShare, null, "\t")
													});
												}
											}
										],
										{cancelable: false},
									);
								});
							});
						}

						default: {
							const result = await Share.share({
								message: JSON.stringify(changeLog, null, "\t"),
							});

							if (result.action === Share.sharedAction) {
								if (result.activityType) {
									// shared with activity type of result.activityType
									console.warn("Android?");
								} else {
									// shared
									console.warn("iOS?");
								}
							} else if (result.action === Share.dismissedAction) {
								// dismissed
							}
						}
					}
				});

			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * ADD LOG
	 *
	 * Creates a new record of change log or replaces the current one if it has
	 * the same ID as the object the change is referring to.
	 *
	 * NOTE:
	 * May change to have the ID of the log record match the ID of the object to sync
	 *
	 * We do not overwrite the current Form DB Table. Instead, we save the
	 * key value pair object of the form that represents the "changes" to the
	 * "Changelog" table. This would mean that for every form loaded, we need
	 * to append the "Changelog" as well so users can view the latest data.
	 *
	 * @param  {string} id - The ID of the change log to sync. Nullify to create a new record
	 * @param  {string} tableName - To determine which table to look for when finding the object in question
	 * @param  {string} message - Optional message for any reason
	 * @param	 {string} data - The data of the changelog
	 */
	addLog(toAdd) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				const { id, tableName, message, data } = toAdd;
				db.write(() => {
					let toSync = _.head(db.objects(config.keys.LOG).filtered(`id = "${id}"`)) || {};
					const toSave = {
						id: id || generateId(),
						message: message || toSync.message || null,
						status: !_.isUndefined(toAdd.status) ? toAdd.status : enums.status.PENDING,
						tableName: tableName,
						timestamp: new Date(),
						data: data
					};

					db.create(config.keys.LOG, prepareLogPersistence(toSave), true);
				});
			});
		} catch(error) {
			throw error;
		}
	},

	updateLog(toUpdate) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				const { id, tableName, message, data } = toUpdate;
				const toUpdate = db.objects(config.keys.LOG).filtered(`id = "${id}"`);
				if(_.isEmpty(toUpdate)) throw new Error("Cannot find the log with the provided ID.");

				db.write(() => {
					let toSync = _.head(db.objects(tableName).filtered(`id = "${id}"`)) || {};
					const toSave = {
						id: id,
						objectId: id,
						message: message || toSync.message || null,
						status: !_.isUndefined(toUpdate.status) ? toUpdate.status : enums.status.PENDING,
						tableName: tableName,
						timestamp: new Date(),
						data: data
					};
					db.create(config.keys.LOG, prepareLogPersistence(toSave), true);
				});
			});
		} catch(error) {
			throw error;
		}
	},

	addTaskLog(toAdd, overwrite = false) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		toAdd.data = prepareTaskPersistence(toAdd.data);
		if(overwrite) {
			this.updateLog(toAdd);
		} else {
			this.addLog(toAdd);
		}
	},
	addFormLog(toAdd, overwrite = false) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		toAdd.data = prepareFormValuePersistence(toAdd.data);
		if(overwrite) {
			this.updateLog(toAdd);
		} else {
			this.addLog(toAdd);
		}
	},
	addImageLog(toAdd, overwrite = false) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		toAdd.data = prepareImagePersistence(toAdd.data);
		if(overwrite) {
			this.updateLog(toAdd);
		} else {
			this.addLog(toAdd);
		}
	},


	/**
	 * DELETE LOG
	 *
	 * Deletes the log lmao.
	 *
	 * NOTE:
	 * May change to different functions such as that it matches the table name to look for.
	 * For example:
	 * - deleteImageLog()
	 * - deleteTaskLog()
	 * - deleteProjectLog()
	 *
	 * @param  {string} id - The ID of the log record to delete
	 * @param  {string} tableName - The Table name to look for
	 */
	deleteLog(id, tableName) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					let toDelete = null;
					if(tableName) {
						toDelete = db.objects(config.keys.LOG).filtered(`id = "${id}" AND tableName = "${tableName}"`);
					} else {
						toDelete = db.objects(config.keys.LOG).filtered(`id = "${id}"`);
					}
					if(!_.isEmpty(toDelete)) db.delete(toDelete);
				});
			});
		} catch(error) {
			throw error;
		}
	},

	deleteLogs(tableName) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					let toDelete = db.objects(config.keys.LOG);

					if(!_.isNil(tableName)) {
						toDelete = toDelete.filtered(`tableName = "${tableName}"`);
					}

					db.delete(toDelete);
				});
			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * SET LOG STATUS
	 *
	 * Sets the status of a log record. The status must be from the enums exported
	 * by this library as "status". For exmaple, `TorcTablet.status.SUCCESS`.
	 *
	 * @param  {string} id - The ID of the record to update
	 * @param  {enum} status - The status value of the log record
	 * @param  {string} message - An optional parameter that lets you set the message of the log record
	 */
	setLogStatus(id, status, message) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");
		if(_.isUndefined(_.find(enums.status, a => a === status))) throw new Error("Invalid status provided.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					const toSync = _.head(db.objects(config.keys.LOG).filtered(`id = "${id}"`));
					if(_.isEmpty(toSync)) throw new Error(`Cannot find the Log with the provided ID: ${id}`);

					// If the status is "SUCCESS", we delete it to free up space. This cannot be retrievable once performed
					if(status === enums.status.SUCCESS) {
						db.delete(toSync);
					} else {
						const toAdd = {
							...toSync,
							message: message || toSync.message,
							status: status
						};
						db.create(config.keys.LOG, toAdd, true);
					}
				});
			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * SET TRANSLATIONS
	 *
	 * This sets the translation translations object to the local storage.
	 *
	 * @param  {type} toSet - The object translations whose object structure is based off of the response from BPM ({ locale: "en", translation: { magicString: readableString }, locale: "fr", translation: { magicString: readableStirng }})
	 */
	saveTranslation(toSet) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					const toSave = prepareTranslationPersistence(toSet);
					db.create(config.keys.TRANSLATION, toSave, true);
				});
			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * GET TRANSLATIONS
	 *
	 * Gets all the saved translation translationss in the following structure: { en: { magicString: readableString }, fr: { magicString: readableStirng }}
	 *
	 * NOTE:
	 * Please lazy-load the loading of locale wherever possible.
	 *
	 * @return {object} - The translation translations encapsulated in their associated locale
	 */
	getTranslations() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				return _.map(db.objects(config.keys.TRANSLATION), prepareTranslationRetrieval);
			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * GET TRANSLATION BY LOCALE
	 *
	 * Returns the translations with the locale provided. Used mainly to lazy-load the
	 * translation translationss.
	 *
	 * @param  {string} locale = "" - The Locale of the translation to get from. (e.g. "es, en, fr")
	 * @return {object} - The translation translations encapsulated in their associated locale
	 */
	getTranslationsByLocale(locale = Locales[0]) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				const toReturn = _.head(db.objects(config.keys.TRANSLATION).filtered(`locale = "${locale}"`));
				if(_.isEmpty(toReturn)) throw new Error(`Cannot find the translation with the provided locale: ${locale}`);

				return prepareTranslationRetrieval(toReturn).translation;
			});
		} catch(error) {
			throw error;
		}
	},


	/**
	 * GET LAST SYNC
	 *
	 * This gets the last sync record of the specified tableName. This will tell
	 * the invoker when was the last time the user synced alongside other meta-data
	 * including the model name and errors associated with the sync.
	 *
	 * @param  {string} tableName - The record with the corresponding tableName
	 * @return {object} - The latest sync record
	 */
	getSyncLogs(tableName) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				const toReturn = db.objects(config.keys.SYNC).filtered(`tableName = "${tableName}" SORT(timestamp DESC)`);
				// if(_.isEmpty(toReturn)) throw new Error(`Cannot find a sync record with the provided table name: ${tableName}`);

				return _.map(toReturn, a => prepareSyncRetrieval(a));
			});
		} catch(error) {
			throw error;
		}
	},

	addSyncLog(syncLog) {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					const toSave = prepareSyncPersistence(syncLog);
					if(!Moment(new Date(toSave.timestamp)).isValid()) throw new Error(`Cannot add a log with the provided date: ${toSave.timestamp}`);

					db.create(config.keys.SYNC, toSave, true);
					return toSave.id;
				});
			});
		} catch(error) {
			throw error;
		}
	},

	clearSyncLogs() {
		if(!isInitialized()) throw new Error("TORC Tablet Service is not yet initialized.");

		try {
			return Realm.open(config.db).then(db => {
				db.write(() => {
					let allSyncLogs = db.objects(config.keys.SYNC);
					db.delete(allSyncLogs);
				});
			});
		} catch(error) {
			throw error;
		}
	}
};


/**
 * IS INITIALIZED
 *
 * Returns a boolean value that deteremines whether the service has been initialzied
 * or not. This condition returns the boolean value of the `initialized` property
 * of the configuration variable.
 *
 * Initialization means that this service will create the local directories to allow
 * functions to not have to check if it exists or not.
 *
 * @return {boolean} - The value that determines if the service has been initialized
 */
async function isInitialized() {
	const { directoryPath, db } = config;
	if(_.isEmpty(directoryPath) || _.isEmpty(db)) return false;

	// Directory Existence Validation
	if(!await RNFetchBlob.fs.exists(`${config.directoryPath}/${config.keys.USER}.txt`)) return false;

	return true;
}

function getExtension(filename = "") {
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
 * PREAPRE OBJECT PERSISTENCE / RETRIEVAL
 *
 * With Realm DB, we need to parse every object's fields to their barebone
 * primitive values (int, string, etc...). Meaning, we cannot directly save
 * objects. We need to create a schema for them that defines their fields and
 * their corresponding primitive values. However, we do not have time
 * so we need to just convert it to a string when saving, and parsing to an
 * object when loading.
 */

function prepareProjectPersistence(a) {
	return {
		...a,
		files: !_.isEmpty(a.files) ? _.map(a.files, prepareFilePersistence) : [],
		// tasks: !_.isEmpty(preparedTasks) ? preparedTasks : [],
		tasks: JSON.stringify(a.tasks),
		alerts: JSON.stringify(a.alerts)
	};
}

function prepareProjectRetrieval(a) {
	return {
		...a,
		files: _.map(a.files, prepareFileRetrieval),
		tasks: JSON.parse(a.tasks),
		alerts: JSON.parse(a.alerts)
	};
}

function prepareFilePersistence(a) {
	return a;
}

function prepareFileRetrieval(a) {
	// On iOS platform the directory path will be changed every time you access to the file system. So if you need read file on iOS, you need to get dir path first and concat file name with it.
	let fileUri = a.uri;
	if (Platform.OS === "ios") {
		let arr = _.split(fileUri, "/");
		fileUri = `${RNFetchBlob.fs.dirs.DocumentDir}/${config.userHash}/${a.taskId}/${arr[arr.length - 1]}`;
	}

	return {
		...a,
		uri: fileUri
	};
}

function prepareTaskPersistence(a) {
	return {
		...a,
		asideContent: JSON.stringify(a.asideContent),
		customTypes: JSON.stringify(a.customTypes),
		datum: JSON.stringify(a.datum),
		files: !_.isEmpty(a.files) ? JSON.stringify(a.files) : [],
		form: JSON.stringify(a.form),
		namedConditions: JSON.stringify(a.namedConditions),
		overview: JSON.stringify(a.overview),
		processCommonData: JSON.stringify(a.processCommonData),
		processTypes: JSON.stringify(a.processTypes),
		schema: JSON.stringify(a.schema),
		taskDDS: JSON.stringify(a.taskDDS),
		uiDefinition: JSON.stringify(a.uiDefinition),
		well: JSON.stringify(a.well)
		// well: !_.isEmpty(a.well) ? prepareWellPersistence(a.well) : {}
	};
}

function prepareTaskRetrieval(a) {
	return {
		...a,
		asideContent: _.isString(a.asideContent) ? JSON.parse(a.asideContent) : {},
		customTypes: _.isString(a.customTypes) ? JSON.parse(a.customTypes) : {},
		datum: _.isString(a.datum) ? JSON.parse(a.datum) : {},
		files: !_.isEmpty(a.files) ? JSON.stringify(a.files) : [],
		form: _.isString(a.form) ? JSON.parse(a.form) : {},
		namedConditions: _.isString(a.namedConditions) ? JSON.parse(a.namedConditions) : [],
		overview: _.isString(a.overview) ? JSON.parse(a.overview) : {},
		processCommonData: _.isString(a.processCommonData) ? JSON.parse(a.processCommonData) : {},
		processTypes: _.isString(a.processTypes) ? JSON.parse(a.processTypes) : {},
		schema: _.isString(a.schema) ? JSON.parse(a.schema) : {},
		taskDDS: _.isString(a.taskDDS) ? JSON.parse(a.taskDDS) : {},
		uiDefinition: _.isString(a.uiDefinition) ? JSON.parse(a.uiDefinition) : {},
		well: _.isString(a.well) ? JSON.parse(a.well) : {}
		// well: !_.isEmpty(a.well) ? prepareWellPersistence(a.well) : {}
	};
}

function prepareFormFilePersistence(a) {
	return {
		...a,
		id: a.id || generateId(),
		canChange: JSON.stringify(a.canChange),
		jsonDetails: JSON.stringify(a.jsonDetails)
	};
}

function prepareFormFileRetrieval(a) {
	// On iOS platform the directory path will be changed every time you access to the file system. So if you need read file on iOS, you need to get dir path first and concat file name with it.
	let fileUri = a.uri;
	if (Platform.OS === "ios") {
		let arr = _.split(fileUri, "/");
		fileUri = `${RNFetchBlob.fs.dirs.DocumentDir}/${config.userHash}/${a.taskId}/${arr[arr.length - 1]}`;
	}

	return {
		...a,
		uri: fileUri,
		canChange: _.isString(a.canChange) ? JSON.parse(a.canChange) : !!a.canChange,
		jsonDetails: _.isString(a.jsonDetails) ? JSON.parse(a.jsonDetails) : null
	};
}

function prepareWellPersistence(a) {
	return {
		...a,
		tasks: !_.isEmpty(a.tasks) ? a.tasks : []
	};
}

function prepareFormValuePersistence(a) {
	return {
		...a,
		id: a.id || generateId(),
		values: _.isObject(a.values) ? JSON.stringify(a.values) : null,
		files: _.isArray(a.files) ? _.map(a.files, prepareFilePersistence) : [],
		well: _.isObject(a.well) ? JSON.stringify(a.well) : null,
		attachments: _.isArray(a.attachments) ? JSON.stringify(a.attachments) : [],
		alerts: _.isArray(a.alerts) ? JSON.stringify(a.alerts) : []
	// return prepareTaskPersistence(a);
	};
}

function prepareFormValueRetrieval(a) {
	return {
		...a,
		id: a.id || generateId(),
		values: _.isString(a.values) ? JSON.parse(a.values) : null,
		files: _.map(a.files, prepareFileRetrieval),
		well: _.isString(a.well) ? JSON.parse(a.well) : null,
		attachments: _.isString(a.attachments) ? JSON.parse(a.attachments) : [],
		alerts: _.isString(a.alerts) ? JSON.parse(a.alerts) : []
	// return prepareTaskPersistence(a);
	};
}

function prepareFormRetrieval(a) {
	// DEPRECATED
	//
	// We now use the same retrieval/persistence preperation functions for Task and Forms
	// return {
	// 	item1: JSON.parse(a.item1),
	// 	item2: JSON.parse(a.item2)
	// };

	return prepareTaskRetrieval(a);
}

function prepareImagePersistence(a) {
	return {
		...a,
		id: a.id || generateId(), // Normally, image has IDs before it reaches this service, but just in case, we generate it. It's alright because what makes an image unique from each other is also which task it belongs to.
		canChange: JSON.stringify(a.canChange),
		jsonDetails: JSON.stringify(a.jsonDetails)
	};
}

function prepareImageRetrieval(a) {
	// On iOS platform the directory path will be changed every time you access to the file system. So if you need read file on iOS, you need to get dir path first and concat file name with it.
	let fileUri = a.uri;
	if (Platform.OS === "ios") {
		let arr = _.split(fileUri, "/");
		fileUri = `${RNFetchBlob.fs.dirs.DocumentDir}/${config.userHash}/${a.taskId}/${arr[arr.length - 1]}`;
	}

	return {
		...a,
		uri: fileUri,
		canChange: _.isString(a.canChange) ? JSON.parse(a.canChange) : !!a.canChange,
		jsonDetails: _.isString(a.jsonDetails) ? JSON.parse(a.jsonDetails) : null
	};
}

// This one returns the `uri` property with the LOG suffix
function prepareImageLogRetrieval(a) {
	a = prepareLogRetrieval(a);

	// On iOS platform the directory path will be changed every time you access to the file system. So if you need read file on iOS, you need to get dir path first and concat file name with it.
	let fileUri = _.get(a, "data.uri");
	if (Platform.OS === "ios") {
		let arr = _.split(fileUri, "/");
		fileUri = `${RNFetchBlob.fs.dirs.DocumentDir}/${config.userHash}/${a.data.taskId}/${config.keys.LOG}/${arr[arr.length - 1]}`;
	}

	return {
		...a,
		data: {
			...a.data,
			uri: fileUri,
			canChange: _.isString(a.data.canChange) ? JSON.parse(a.data.canChange) : !!a.data.canChange,
			jsonDetails: _.isString(a.data.jsonDetails) ? JSON.parse(a.data.jsonDetails) : a.data.jsonDetails
		}
	};
}

function prepareFormDefinitionPersistence(a) {
	return {
		...a,
		customTypes: JSON.stringify(a.customTypes),
		form: JSON.stringify(a.form),
		schema: JSON.stringify(a.schema),
		namedConditions: JSON.stringify(a.namedConditions),
		processCommonData: JSON.stringify(a.processCommonData)
	};
}

function prepareFormDefinitionRetrieval(a) {
	return {
		...a,
		customTypes: JSON.parse(a.customTypes),
		form: _.isString(a.form) ? JSON.parse(a.form) : null,
		schema: _.isString(a.schema) ? JSON.parse(a.schema) : null,
		namedConditions: _.isString(a.namedConditions) ? JSON.parse(a.namedConditions) : null,
		processCommonData: _.isString(a.processCommonData) ? JSON.parse(a.processCommonData) : null
	};
}

function prepareLogPersistence(a) {
	return {
		...a,
		data: JSON.stringify(a.data),
		errors: JSON.stringify(_.map(a.errors, "message"))
	};
}

function prepareLogRetrieval(a) {
	return {
		...a,
		data: _.isString(a.data) ? JSON.parse(a.data) : null,
		errors: _.isString(a.errors) ? _.map(JSON.parse(a.errors), a => new Error(a)) : null
	};
}

function prepareTranslationPersistence(a) {
	return {
		...a,
		translation: JSON.stringify(a.translation)
	};
}

function prepareTranslationRetrieval(a) {
	return {
		...a,
		translation: JSON.parse(a.translation)
	};
}

function prepareSyncRetrieval(a) {
	return {
		...a,
		timestamp: Moment(new Date(a.timestamp)).isValid() ? new Date(a.timestamp).toISOString() : null,
		model: JSON.parse(a.model) || [],
		errors: _.map(JSON.parse(a.errors), a => new Error(a)),
		type: _.isFinite(a.type) ? _.toNumber(a.type) : 0
	};
}

function prepareSyncPersistence(a) {
	return {
		...a,
		id: a.id || generateId(),
		timestamp: Moment(new Date(a.timestamp)).isValid() ? new Date(a.timestamp) : new Date(),
		model: a.model ? JSON.stringify(a.model) : null,
		errors: !_.isEmpty(a.errors) ? JSON.stringify(_.map(a.errors, "message")) : null,
		type: _.isFinite(a.type) ? _.toNumber(a.type) : 0
	};
}

function generateId() {
	/**
	* Fast UUID generator, RFC4122 version 4 compliant.
	* @author Jeff Ward (jcward.com).
	* @license MIT license
	* @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
	**/
	let lut = []; for (let i = 0; i < 256; i++) { lut[i] = (i < 16 ? "0" : "") + (i).toString(16); }
	let d0 = Math.random() * 0xffffffff | 0;
	let d1 = Math.random() * 0xffffffff | 0;
	let d2 = Math.random() * 0xffffffff | 0;
	let d3 = Math.random() * 0xffffffff | 0;
	return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + "-" +
		lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + "-" + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + "-" +
		lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + "-" + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
		lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff];
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
 * GET THUMBNAIL
 *
 * There are other `getThumbnail` functions in other places but those generates
 * their thumbnails using base64 strings. This however, uses the image uri because
 * the new way of saving images is through file system access and not strings.
 *
 * @param {object} toPrepare - This is an image object that has the `uri` property that points to the image directory
 * @return {string} - The image data in Base 64 string after the compression
 */
async function getThumbnail(toPrepare) {
	let base64 = "";
	try {
		if(toPrepare.size > 10000000) throw new Error("File size too big");
		let filePath = toPrepare.uri;
		// //  On iOS platform the directory path will be changed every time you access to the file system. So if you need read file on iOS, you need to get dir path first and concat file name with it.
		// if (Platform.OS === "ios") {
		// 	let arr = toPrepare.uri.split("/");
		// 	filePath = `${RNFetchBlob.fs.dirs.DocumentDir}/${arr[arr.length - 1]}`;
		// }

		base64 = await RNFetchBlob.fs.readFile(filePath, "base64");

		const response = await ImageResizer.createResizedImage(`data:${toPrepare.contentType || "image/jpeg"};base64,${base64}`, 300, 300, "JPEG", 30);
		// response.uri is the URI of the new image that can now be displayed, uploaded...
		// response.path is the path of the new image
		// response.name is the name of the new image with the extension
		// response.size is the size of the new image

		return await RNFetchBlob.fs.readFile(response.path, "base64");
	} catch(error) {
		// Only produce a warning and don't throw anything
		console.warn(`Get thumbnail error:\n${error}\n${JSON.stringify({...toPrepare, base64: base64.substr(0, 50)}, null, "\t")}`);
	}
}