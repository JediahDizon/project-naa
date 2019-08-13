import React, { Component } from "react";
import { View, Slider } from "react-native";
import WaveForm from "react-native-audiowaveform";

export default class extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		const { source, duration, currentTime } = this.props;

		return (
			<View style={{ flex: 1 }}>
				<WaveForm
					source={{ uri: source || "http://soundbible.com/mp3/muscle-car-daniel_simon.mp3" }}
					waveFormStyle={{ waveColor: "red", scrubColor: "white" }}
					style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.1)", borderRadius: 10 }}
				/>

				<Slider
					step={1}
					maximumValue={duration}
					onValueChange={value => this.props.onScrub(value)}
					value={currentTime}
				/>
			</View>
		);
	}
}