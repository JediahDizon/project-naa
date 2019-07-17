import React, { Component } from "react";
import { View, ScrollView, FlatList, StyleSheet, Animated } from "react-native";
import { Colors, IconButton } from "react-native-paper";
import RNSoundLevel from "react-native-sound-level";
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import WaveForm from 'react-native-audiowaveform';

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
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center"
				}}
			>

				{ this.renderHistogram() }
				{ this.renderMicrophone() }

			</View>
		);
	}

	renderHistogram() {
		const { histogram: { data }} = this.state;
		return (
			<React.Fragment>
				<ScrollView
					horizontal
					style={{ height: 100 }}
					ref={ref => this.histogram = ref}
					onContentSizeChange={() => this.histogram.scrollToEnd({ animated: true })}
				>
					<FlatList
						horizontal
						data={data}
						keyExtractor={(a, index) => `${index}`}
						renderItem={({ item }) => (
							<View
								style={{
									height: (item * 50),
									opacity: item,
									width: 1,
									margin: 0,
									borderRadius: 0,
									backgroundColor: "red",
								}}
							/>
						)}
					/>
				</ScrollView>
			</React.Fragment>
		);
	}

	renderMicrophone() {
		const { backMic } = this.animated;
		const { realtime: { live }} = this.state;

		return (
			<View
				style={{
					flex: 1,
					alignItems: "center",
					justifyContent: "center"
				}}
			>
				<View style={{ position: "absolute" }}>
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
						onPress={async () => live ? await this.stopRecording() : await this.startRecording()}
					/>
				</View>
			</View>
		);
	}

	startRecording() {
		const { realtime } = this.state;

		let filePath = null;
		return this.recorder.startRecorder()
		.then(path => {
			filePath = path;
			console.warn(filePath);
		})
		.then(() => {
			this.setState({
				realtime: {
					...realtime,
					live: true
				}
			}, () => {
				// Loudness Listeners
				// RNSoundLevel.start();
				// RNSoundLevel.onNewFrame = data => {
				// 	const { histogram } = this.state;
				// 	const toSave = Utils.convertDecibelToPercent(data.value) / 100;

				// 	this.setState({
				// 		histogram: {
				// 			...histogram,
				// 			data: [...histogram.data, toSave]
				// 		}
				// 	}, () => {
				// 		Animated.timing(
				// 			this.animated.backMic.size, // The animated value to drive
				// 			{
				// 				toValue: 100 * toSave,
				// 				duration: 333
				// 			}
				// 		).start();

				// 		Animated.timing(
				// 			this.animated.backMic.opacity, // The animated value to drive
				// 			{
				// 				toValue: 0.33 * toSave,
				// 				duration: 333
				// 			}
				// 		).start();
				// 	});
				// };
			});
		});
	}

	stopRecording() {
		const { realtime } = this.state;
		return this.recorder.stopRecorder()
		.then(() => {
			this.setState({
				realtime: {
					...realtime,
					live: false
				}
			}, () => {
				// RNSoundLevel.stop();
			});
		});
	}
}