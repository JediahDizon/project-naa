import React, { Component } from "react";
import { View, Image, TouchableOpacity, Animated } from "react-native";
import { Colors } from "react-native-paper";
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
			},
			animated: {
				size: console.warn(new Animated.Value(0)) || new Animated.Value(0)
			}
		};
	}

	shouldComponentUpdate() {
		// LayoutAnimation.configureNext({ ...LayoutAnimation.Presets.easeInEaseOut, duration: 50 });
		return true;
	}

	componentWillUnmount() {
		this.stopRecording();
	}

	render() {
		const { realtime: { value, live }, animated } = this.state;

		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center"
				}}
			>
				<View style={{ position: "absolute" }}>
					<Animated.Image
						source={{uri: "https://www.adorama.com/images/Large/ro25.jpg" }}
						style={{
							height: 200 * animated.size || 200,
							width: 200 * animated.size || 200,
							borderRadius: 100,
							opacity: Math.pow(animated.size, 8),
							alignItems: "center",
							justifyContent: "center",
							transition: "all .5s"
						}}
					/>
				</View>
				<View style={{ position: "absolute" }}>
					<TouchableOpacity onPress={() => live ? this.stopRecording() : this.startRecording()}>
						<Progress.Pie
							size={100}
							progress={animated.size}
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
				this.setState({ realtime: { ...this.state.realtime, value: data.value }}, () => {
					Animated.timing(
						this.state.animated.size, // The animated value to drive
						{
							toValue: Utils.convertDecibelToPercent(data.value) / 100,
							duration: 333, // Make it take a while
						}
					).start();
				});
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