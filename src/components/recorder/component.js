import React, { Component } from "react";
import { Text, View, TouchableOpacity, ScrollView, FlatList, StyleSheet, Animated } from "react-native";
import { Colors, IconButton, Button } from "react-native-paper";
import RNSoundLevel from "react-native-sound-level";
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import WaveForm from 'react-native-audiowaveform';
import RNFetchBlob from "rn-fetch-blob";

// UTILS
import _ from "lodash";
import Moment from "moment";
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
			track: {
				uri: `${RNFetchBlob.fs.dirs.DocumentDir}/1.m4a`,
				tempUri: null,
				totalTime: null,
				playing: false
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
			<View>

				{ this.renderWaveform() }
				{ this.renderMicrophone() }

			</View>
		);
	}

	renderWaveform() {
		const { realtime: { live }, track: { uri, tempUri, playing }} = this.state;
		return (
			<View
				style={{
					height: 100, width: "100%"
				}}
			>
				{
					!live && (
						<WaveForm
							source={{ uri: `file:///${uri || tempUri}` }}
							waveFormStyle={{ waveColor: "red", scrubColor: "white" }}
							style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.1)", borderRadius: 10 }}
							play={playing}
						/>
					)
				}

				{
					// <FlatList
					// 	horizontal
					// 	data={data}
					// 	keyExtractor={(a, index) => `${index}`}
					// 	renderItem={({ item }) => (
					// 		<View
					// 			style={{
					// 				height: (item * 50) + 1,
					// 				opacity: item,
					// 				width: 3,
					// 				margin: 1,
					// 				borderRadius: 0,
					// 				backgroundColor: "red",
					// 			}}
					// 		/>
					// 	)}
					// />
				}
			</View>
		);
	}

	renderMicrophone() {
		const { backMic } = this.animated;
		const { realtime: { live }, playing} = this.state;

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

				<TouchableOpacity style={{ position: "absolute" }} onPress={async () => live ? await this.stopRecording() : await this.startRecording()}>
					<IconButton
						mode="contained"
						icon="mic"
						color={Colors.red500}
					/>
				</TouchableOpacity>

				<Button onPress={async () => playing ? await this.onStopPlay() : await this.onStartPlay()} style={{ marginTop: 100 }}>{ this.state.track.duration }</Button>
			</View>
		);
	}

	startRecording() {
		const { realtime } = this.state;

		return this.recorder.startRecorder()
		.then(async path => {
			// if(!await RNFetchBlob.fs.exists(config.tracks[0].uri)) {
			// 	await RNFetchBlob.fs.mkdir(config.tracks[0].uri);
			// }

			// console.warn(await await RNFetchBlob.fs.exists(config.tracks[0].uri) + " - " + await RNFetchBlob.fs.exists(path))

			// return RNFetchBlob.fs.unlink(config.tracks[0].uri)
			// .then(() => RNFetchBlob.fs.mv(path, config.tracks[0].uri))
			// .catch(error => console.warn("MOVE FAILED: " + error.message));


			this.setState({
				realtime: {
					...realtime,
					live: true
				},
				track: {
					...this.state.track,
					tempUri: path.split("file:///")[1]
				}
			}, () => {
				this.recorder.addRecordBackListener((e) => {
					this.setState({
						track: {
							...this.state.track,
							duration: this.recorder.mmssss(Math.floor(e.current_position)),
						}
					});
					return;
				});

				// Loudness Listeners
				RNSoundLevel.start();
				RNSoundLevel.onNewFrame = data => {
					const toSave = Utils.convertDecibelToPercent(data.value) / 100;

					Animated.timing(
						this.animated.backMic.size, // The animated value to drive
						{
							toValue: 100 * toSave,
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
				};
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
			}, async () => {
				const { track: { uri, tempUri }} = this.state;
				RNSoundLevel.stop();

				if(!await RNFetchBlob.fs.exists(uri)) {
					await RNFetchBlob.fs.mkdir(uri);
				}

				return RNFetchBlob.fs.unlink(uri)
				.then(() => RNFetchBlob.fs.mv(tempUri, uri))
				.catch(error => console.warn("MOVE FAILED: " + error.message));
			});
		});
	}

	onStartPlay = async () => {
		console.warn("Start");

		const { track: { uri }} = this.state;
		const msg = await this.recorder.startPlayer(`file:///${uri}`).catch(error => console.warn("START ERROR: " + error.message));
		console.warn(msg);

		this.setState({
			track: {
				...this.state.track,
				playing: true
			}
		});

		this.recorder.addPlayBackListener(e => {
			console.warn(e.current_position + " - " + e.duration);

			if (e.current_position >= e.duration) {
				this.recorder.stopPlayer();
			}
		});
	}

	onPausePlay = async () => {
		await this.recorder.pausePlayer();
	}

	onStopPlay = async () => {
		console.warn("Stop");
		this.recorder.stopPlayer();

		this.setState({
			track: {
				...this.state.track,
				playing: false
			}
		});
	}
}