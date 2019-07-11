import React, { Component } from "react";
import { Text } from "react-native";

export default class extends Component {
	render() {
		return (
			<Text>Page Two: { JSON.stringify(this.props) } + { this.props.text }</Text>
		);
	}
}
