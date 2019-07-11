import { createStore, applyMiddleware, combineReducers } from "redux";
import { Reducers } from "../store";

// MIDDLEWARES
import thunk from "redux-thunk";
// import { createLogger } from "redux-logger";

// UTILS
import _ from "lodash";

export default function configureStore(initialState) {
	initialState = !_.isUndefined(initialState) ? initialState : _.transform(Reducers, (state, a, key) => state[key] = a(), {}); // Use each of the Reducer's default state as the default state for the store
	const store = createStore(
		combineReducers(Reducers),
		initialState,
		applyMiddleware(thunk, /*createLogger({ collapsed: true })*/)
	);

	if(module.hot) {
		module.hot.accept(() => store.replaceReducer(combineReducers(Reducers)));
	}

	return store;
}
