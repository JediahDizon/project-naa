import { VideoActionType } from "../types";

export default (state = getDefaultState(), action = {}) => {
	switch(action.type) {
		case VideoActionType.LOAD_VIDEOS_SUCCESS:
			return { ...getDefaultState(), videos: action.payload };

		case VideoActionType.LOAD_VIDEOS_FAILURE:
			return { error: action.payload.error };

		case VideoActionType.SET_VIDEOS_LOADING:
			return { ...state, loading: true };

		case VideoActionType.CLEAR_VIDEOS_SUCCESS:
			return {};
	}
	return state;
};

function getDefaultState() {
	return {
		loading: false,
		error: null,
		data: []
	}
}