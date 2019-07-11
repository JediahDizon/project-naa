import { VideoActionType } from "../types";
import { InteractionManager, Platform } from "react-native";

// UTILS
import _ from "lodash";
import axios from "axios";

// CONSTANTS
const apiKey = "AIzaSyA1nulCnFQd4aTgAERCWMUrhDitdkCO7Nc";

export function getVideos(videoIds) {
	return dispatch => {
		dispatch({
			type: VideoActionType.SET_VIDEOS_LOADING
		});

		InteractionManager.runAfterInteractions(async () => {
			try {
				let toReturn = [];

				const videoRequests = [];
				for(let videoId of videoIds) {
					videoRequests.push(
						axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${videoId}&key=${apiKey}`)
						.then(video => _.get(video, "data.items.0"))
						.then(video => toReturn.push(video))
					);
				}

				await Promise.all(videoRequests);

				dispatch({
					type: VideoActionType.LOAD_VIDEOS_SUCCESS,
					payload: toReturn
				});
			} catch(error) {
				dispatch({
					type: VideoActionType.LOAD_VIDEOS_FAILURE,
					payload: { error }
				});
			}
		});
	};
}
