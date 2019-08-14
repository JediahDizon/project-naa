import React, { Component } from "react";
import { Text, View, TouchableOpacity, ScrollView, FlatList, StyleSheet, Animated } from "react-native";
import RNFetchBlob from "rn-fetch-blob";
import { Colors, IconButton, Button } from "react-native-paper";
import RNSoundLevel from "react-native-sound-level";
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

// UTILS
import _ from "lodash";
import { Scrubber } from "./components";

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
				duration: null,
				playing: false,
				cursor: 0 // Used for scrubbing the track
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
		const { duration, onSeek } = this.props;
		const { realtime: { live }, track: { duration: trackDuration, cursor, uri, playing }} = this.state;
		return (
			<View
				style={{
					height: 100, width: "100%"
				}}
			>
				{
					!live && (
						<Scrubber
							source={uri}
							value={cursor}
							duration={duration}
							onScrub={value => {
								// On scrub, prevent playing the recorded audio when the scrubber exceeds the duration of the recording
								if(value < trackDuration) {
									if(!playing) this.onStartPlayback();
									this.recorder.seekToPlayer(value / 1000);
								} else {
									playing && this.onStopPlayback();
								}

								this.setState({
									track: {
										...this.state.track,
										cursor: value
									}
								});
							}}
							onSlidingComplete={value => _.isFunction(onSeek) && onSeek(value)}
						/>
					)
				}
			</View>
		);
	}

	renderMicrophone() {
		const { backMic } = this.animated;
		const { realtime: { live }, track: { duration, cursor, playing }} = this.state;

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

				<Button icon="play-arrow" onPress={async () => playing ? this.onStopPlayback() : this.onStartPlayback()} style={{ marginTop: 100 }}>{ this.recorder.mmssss(cursor) } - { this.recorder.mmssss(duration) }</Button>
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
					tempUri: path.split("file:///")[1],
				}
			}, () => {
				this.recorder.addRecordBackListener((e) => {
					this.setState({
						track: {
							...this.state.track,
							duration: Math.floor(e.current_position),
						}
					});
				});

				// // Loudness Listeners
				// RNSoundLevel.start();
				// RNSoundLevel.onNewFrame = data => {
				// 	const toSave = Utils.convertDecibelToPercent(data.value) / 100;

				// 	Animated.timing(
				// 		this.animated.backMic.size, // The animated value to drive
				// 		{
				// 			toValue: 100 * toSave,
				// 			duration: 333
				// 		}
				// 	).start();

				// 	Animated.timing(
				// 		this.animated.backMic.opacity, // The animated value to drive
				// 		{
				// 			toValue: 0.33 * toSave,
				// 			duration: 333
				// 		}
				// 	).start();
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
			}, async () => {
				const { track: { uri, tempUri }} = this.state;
				RNSoundLevel.stop();

				if(!await RNFetchBlob.fs.exists(uri)) {
					await RNFetchBlob.fs.mkdir(uri);
				}

				return RNFetchBlob.fs.unlink(uri) // Delete the file that was created by the prior `mkdir` function call
				.then(() => RNFetchBlob.fs.cp(tempUri, uri))
				.catch(error => console.warn("MOVE FAILED: " + error.message));
			});
		});
	}

	onStartPlayback() {
		this.recorder.removePlayBackListener();
		this.recorder.addPlayBackListener(e => {
			e = {
				...e,
				current_position: Number(e.current_position),
				duration: Number(e.duration)
			};

			if (e.current_position >= e.duration) {
				this.recorder.stopPlayer();

				this.setState({
					track: {
						...this.state.track,
						playing: false
					}
				});
			} else {
				this.setState({
					track: {
						...this.state.track,
						cursor: e.current_position
					}
				});
			}
		});

		this.setState({
			track: {
				...this.state.track,
				playing: true
			}
		}, async () => await this.recorder.startPlayer().catch(error => console.warn("START ERROR: " + error.message)));
	}

	onPausePlay = async () => {
		await this.recorder.pausePlayer();
	}

	onStopPlayback() {
		this.setState({
			track: {
				...this.state.track,
				playing: false
			}
		}, async () => await this.recorder.stopPlayer());
	}
}