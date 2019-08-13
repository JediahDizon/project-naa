import React, { Component } from "react";

// COMPONENTS
import { Root } from "app/views";

export default class App extends Component<Props> {
	constructor(props) {
		super(props);

		// Remove Yellow boxes
		// console.disableYellowBox = true;
	}
	render() {
		return (
			<Root />
		);
	}
}
