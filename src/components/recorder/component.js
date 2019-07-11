import React, { Component } from "react";
import { View, Image, TouchableOpacity, UIManager, LayoutAnimation } from "react-native";
import { ProgressBar, Colors } from "react-native-paper";
import RNSoundLevel from "react-native-sound-level";
import * as Progress from "react-native-progress";

// UTILS
import Utils from "./utils";


export default class extends Component {
	constructor(props) {
		super(props);

		this.state = {
			realtime: {
				value: 0,
				live: false
			}
		};
	}

	shouldComponentUpdate() {
		LayoutAnimation.configureNext({ ...LayoutAnimation.Presets.easeInEaseOut, duration: 50 });
		return true;
	}

	componentDidMount() {
		UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
	}

	componentWillUnmount() {
		RNSoundLevel.stop();
	}

	render() {
		const { realtime: { value, live }} = this.state;

		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center"
				}}
			>
				<View style={{ position: "absolute" }}>
					<Image
						source={{uri: "https://www.adorama.com/images/Large/ro25.jpg" }}
						style={{
							height: 200 * Utils.convertDecibelToPercent(value) / 100,
							width: 200 * Utils.convertDecibelToPercent(value) / 100,
							borderRadius: 100,
							opacity: Math.pow(Utils.convertDecibelToPercent(value) / 100, 8),
							alignItems: "center",
							justifyContent: "center"
						}}
					/>
				</View>

				<View style={{ position: "absolute" }}>
					<TouchableOpacity onPress={() => live ? this.stopRecording() : this.startRecording()}>
						<Progress.Pie
							size={100}
							progress={Utils.convertDecibelToPercent(value) / 100}
							unfilledColor={Colors.white}
						/>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	startRecording() {
		const { realtime } = this.state;

		this.setState({
			realtime: {
				...realtime,
				live: true
			}
		}, () => {
			RNSoundLevel.start();
			RNSoundLevel.onNewFrame = data => {
				this.setState({ realtime: { ...this.state.realtime, value: data.value }});
			};
		});
	}

	stopRecording() {
		const { realtime } = this.state;

		this.setState({
			realtime: {
				...realtime,
				live: false
			}
		}, () => {
			RNSoundLevel.stop();
			delete RNSoundLevel.onNewFrame;
		}
		);
	}
}