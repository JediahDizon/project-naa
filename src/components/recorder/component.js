import React, { Component } from "react";
import { Text, View, Image, TouchableOpacity, Animated } from "react-native";
import { Colors, IconButton } from "react-native-paper";
import RNSoundLevel from "react-native-sound-level";
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import * as Progress from "react-native-progress";

// UTILS
import _ from "lodash";
import Utils from "./utils";
import { Histogram } from "./components";


export default class Recorder extends Component {
	constructor(props) {
		super(props);

		this.recorder = new AudioRecorderPlayer();

		this.animated = {
			backMic: {
				size: new Animated.Value(0),
				opacity: new Animated.Value(0)
			},
			frontMic: {
				progress: new Animated.Value(0)
			}
		};

		this.state = {
			realtime: {
				value: 0,
				live: false
			},
			histogram: {
				loading: false,
				data: []
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
		const { backMic } = this.animated;
		const { realtime: { value, live }, histogram} = this.state;

		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center"
				}}
			>
				<View
					style={{
						position: "absolute",
						alignItems: "center",
						justifyContent: "center"
					}}
				>
					<Histogram data={histogram.data} />
				</View>

				<View
					style={{
						position: "absolute",
						alignItems: "center",
						justifyContent: "center"
					}}
				>
					<Animated.Image
						source={{ uri: "https://www.adorama.com/images/Large/ro25.jpg" }}
						style={{
							borderRadius: backMic.size,
							height: backMic.size,
							width: backMic.size,
							opacity: backMic.opacity
						}}
					/>
				</View>

				<View style={{ position: "absolute" }}>
					<IconButton
						mode="contained"
						icon="mic"
						color={Colors.red500}
						onPress={() => live ? this.stopRecording() : this.startRecording()}
					/>
				</View>
			</View>
		);
	}

	startRecording() {
		const { realtime, histogram } = this.state;

		this.setState({
			realtime: {
				...realtime,
				live: true
			}
		}, () => {
			RNSoundLevel.start();
			RNSoundLevel.onNewFrame = data => {
				const { histogram } = this.state;
				const toSave = Utils.convertDecibelToPercent(data.value) / 100;

				this.setState({
					histogram: {
						...histogram,
						data: [...histogram.data, toSave]
					}
				}, () => {
					Animated.timing(
						this.animated.backMic.size, // The animated value to drive
						{
							toValue: 200 * toSave,
							duration: 333
						}
					).start();

					Animated.timing(
						this.animated.backMic.opacity, // The animated value to drive
						{
							toValue: 0.33 * toSave,
							duration: 333
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