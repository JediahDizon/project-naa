import RNFetchBlob from "rn-fetch-blob";
import Moment from "moment";

const config = {
	directoryPath: `${RNFetchBlob.fs.dirs.DownloadDir}/Logs`,
	keys: {
		INFO: "Info",
		WARNING: "Warning",
		ERROR: "Error",
	}
};

async function log(toSave, fileName) {
	try {
		await RNFetchBlob.fs.appendFile(`${config.directoryPath}/${fileName}`, `${Moment().format("LLL")} \n${toSave}\n\n`);
	} catch(error) {
		throw error;
	}
}

export default {
	initialize() {
		setTimeout(async () => {
			try {
				// Directory Existence Validation
				if(!await RNFetchBlob.fs.exists(`${config.directoryPath}/${config.keys.INFO}.txt`)) await RNFetchBlob.fs.writeFile(`${config.directoryPath}/${config.keys.INFO}.txt`, "");
				if(!await RNFetchBlob.fs.exists(`${config.directoryPath}/${config.keys.WARNING}.txt`)) await RNFetchBlob.fs.writeFile(`${config.directoryPath}/${config.keys.WARNING}.txt`, "");
				if(!await RNFetchBlob.fs.exists(`${config.directoryPath}/${config.keys.ERROR}.txt`)) await RNFetchBlob.fs.writeFile(`${config.directoryPath}/${config.keys.ERROR}.txt`, "");

				config.initialized = true;
			} catch(error) {
				throw error;
			}
		}, 1);
	},

	info(toSave) {
		setTimeout(async () => {
			await log(toSave, `${config.keys.INFO}.txt`);
		}, 1);
	},

	warn(toSave) {
		setTimeout(async () => {
			log(toSave, `${config.keys.INFO}.txt`);
		}, 1);
	},

	error(toSave) {
		setTimeout(async () => {
			log(toSave, `${config.keys.INFO}.txt`);
		}, 1);
	}
};
