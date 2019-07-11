import React from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { ErrorBoundary } from "app/components";
import Component from "./component";

// ACTIONS
import { Actions } from "app/store";

function mapStateToProps(state) {
	return {
		Videos: state.Videos || {}
	};
}

function mapDispatchToProps(dispatch) {
	return bindActionCreators({ ...Actions.Videos }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(props => <ErrorBoundary><Component {...props} /></ErrorBoundary>);
