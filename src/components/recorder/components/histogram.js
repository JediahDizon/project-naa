import React, { Component } from "react";
import { View, ScrollView, Image, TouchableOpacity, Animated, FlatList } from "react-native";
import { Colors, IconButton } from "react-native-paper";
import RNSoundLevel from "react-native-sound-level";
import * as Progress from "react-native-progress";

// UTILS
import _ from "lodash";

export default class Recorder extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		const { data } = this.props;

		return (
			<View
				style={{
					width: "100%",
					height: 200,
					justifyContent: "flex-start"
				}}
			>
				<ScrollView horizontal style={{ flex: 1 }}>
					<View style={{ marginRight: 50 }} />

					<FlatList
						horizontal
						inverted
						data={data}
						renderItem={({ item }) => (
							<View style={{ height: (item * 50) + 10, width: 15, backgroundColor: "red", margin: 5 }} />
						)}
					/>
				</ScrollView>
			</View>
		);
	}
}