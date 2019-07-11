import React from "react";
import { ErrorBoundary } from "app/components";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import Component from "./component";

// ACTIONS
import { Actions } from "app/store";

function mapStateToProps(state) {
	return {
		User: state.User,
		Translation: state.Translation
	};
}

function mapDispatchToProps(dispatch) {
	// Used by the header buttons
	return bindActionCreators({ }, dispatch);
}

export default connect(null, mapDispatchToProps)(props => <ErrorBoundary><Component {...props} /></ErrorBoundary>);
