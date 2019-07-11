import React, { Component } from "react";
import { Text } from "react-native";
import { Actions } from "react-native-router-flux";

export default class extends Component {
	redirect() {
		Actions.push("PageTwo", { text: "Hello World" });
	}

	render() {
		return (
			<Text onPress={this.redirect}>Page One: { JSON.stringify(this.props) } + { this.props.text }</Text>
		);
	}
}
