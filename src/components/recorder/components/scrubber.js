import React, { Component } from "react";
import { View } from "react-native";
import WaveForm from "react-native-audiowaveform";
import { Slider } from "react-native-elements";

export default class extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		const { source, duration, value, onScrub, onSlidingComplete } = this.props;

		return (
			<View style={{ flex: 1 }}>
				<WaveForm
					source={{ uri: source || "http://soundbible.com/mp3/muscle-car-daniel_simon.mp3" }}
					waveFormStyle={{ waveColor: "red", scrubColor: "white" }}
					style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.1)", borderRadius: 10 }}
				/>

				<Slider
					value={value}
					minimumValue={0}
					maximumValue={duration}
					onSlidingComplete={value => onSlidingComplete && onSlidingComplete(value)}
					onValueChange={value => onScrub(value)}

					thumbTouchSize={{
						height: 100,
						width: 100
					}}
					thumbStyle={{
						width: 1,
						height: 10
					}}

					animateTransitions
				/>
			</View>
		);
	}
}