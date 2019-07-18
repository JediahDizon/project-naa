import React, { Component } from "react";
import { View, ScrollView, Dimensions, TouchableWithoutFeedback, ActivityIndicator, Platform, PermissionsAndroid, Alert } from "react-native";
import { Actions } from "react-native-router-flux";
import Swiper from "react-native-deck-swiper";
import { Card, Text, Button as PaperButton, Avatar, Paragraph } from "react-native-paper";
import CardFlip from "react-native-card-flip";
import YouTube from "react-native-youtube";

import axios from "axios";
import _ from "lodash";
import Moment from "moment";
import { Recorder } from "app/components";

const apiKey = "AIzaSyA1nulCnFQd4aTgAERCWMUrhDitdkCO7Nc";

const playback = {
	PLAYING: "playing",
	SEEKING: "seeking",
	PAUSE: "pause",
	BUFFERING: "buffering"
};

export default class extends Component {
	constructor(props) {
		super(props);
		this.videoIds = ["KVZ-P-ZI6W4", "GUAWDEVjBYM", "Hy0W7AqDC_c", "cnevlbEy-Qo"];
		this.state = {
			lock: false,
			video: {
				play: false,
				loop: true,
				id: this.videoIds[0]
			},
			permissions: [
				{
					type: PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
					title: "Read Files",
					message: "Lets the app read the audio recordings",
					granted: null
				},
				{
					type: PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
					title: "Save Files",
					message: "Lets the app store the audio recordings to a file",
					granted: null
				},
				{
					type: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
					title: "Record Audio",
					message: "Record with the microphone",
					granted: null
				}
			]
		};

		Platform.select({
			android: async () => {
				/**
				 * REQUEST PERMISSIONS
				 *
				 * Requests a series of permissions before the application can progress further.
				 * Normally used by Android OS higher than 5.0 Lollipop.
				 */

				const { permissions } = this.state;
				const permissionGrants = await PermissionsAndroid.requestMultiple(_.map(permissions, "type"));
				if(_.chain(permissionGrants).map().some(a => a !== PermissionsAndroid.RESULTS.GRANTED).value()) {
					// Give a human-readable description of the permissions list
					const permissionGrantsMapping = {};

					// Update the state based on the `permissionGrants` return value
					_.each(permissionGrants, (grantType, permissionType) => {
						const permission = _.find(permissions, a => a.type === permissionType);
						if(!_.isEmpty(permission)) permissionGrantsMapping[permission.title] = grantType;
					});

					Alert.alert(
						"Permissions",
						`Please grant all permissions before continuing.\n\n${_.chain(permissionGrantsMapping).reduce((toReturn, value, key) => toReturn += `${key} - ${_.capitalize(value)}\n`, "").replace(/_/g, " ").value()}`,
						[
							{
								text: "Ok",
								onPress: () => {}, style: "cancel"
							},
							{
								text: "Ignore",
								onPress: () => Alert.alert(
									"Are you sure?",
									"The app may not work properly. You will be prompted again next login.",
									[
										{ text: "Cancel", onPress: () => {}, style: "cancel"},
										{ text: "OK", onPress: () => {} },
									],
									{ cancelable: false }
								)
							},
						],
						{ cancelable: false }
					);
				}
			},
			ios: () => {}
		})();

		// Set the play as true to make YouTube play. This is cause by the instability of the library
		setTimeout(() => this.setState({ video: { ...this.state.video, play: true }}), 300);

		this.props.getVideos(this.videoIds);
	}

	redirect() {
		Actions.push("pages", { text: "Hello World" });
	}

	render() {
		const { Videos: { videos: data, loading } } = this.props;
		const { lock, video } = this.state;


		// We display a 2-column layout when on landscape/tablet and 1 column layout for mobile/portrait
		const { height } = Dimensions.get("window");


		// This library does not rerender components upon change on their children
		return (
			<View style={{ flex: 1 }}>
				{
					_.isArray(data) && !_.isEmpty(data) && (
						<Swiper
							infinite
							keyExtractor={card => card.id}
							verticalSwipe={false}
							horizontalSwipe={!lock}
							marginTop={0}
							cardVerticalMargin={0}
							cardHorizontalMargin={0}
							cards={data}
							stackSize= {3}
							stackSeparation={5}
							renderCard={card => this.renderCard(card)}
							onSwiped={index => this.setState({ video: { ...video, id: _.get(data, `${index === _.size(data) - 1 ? 0 : index + 1}.id`) } })}
							backgroundColor="rgba(0, 0, 0, 0)"
						>
							{/* Temporary fix to the cards not rerendering */}
							<Text style={{ opacity: 0 }}>{ JSON.stringify(this.state.video, null, "\t") }</Text>
						</Swiper>
					)
				}

				<View style={{ alignContent: "center", height: height / 3, zIndex: 10 }}>
					<YouTube
						apiKey={apiKey}
						videoId={video.id}
						play={video.play}
						loop={true}

						controls={2}
						showFullscreenButton={false}
						showInfo={false}
						modestBranding={false}
						rel={false}
						resumePlayAndroid={false}

						onReady={e => this.setState({ video: { ...video, ready: true } })}
						onChangeState={e => this.setState({ video: { ...video, play: e.state === playback.PLAYING, state: e.state } })}
						onError={e => this.setState({ video: { ...video, error: e.error } })}

						style={{ flex: 1, height: height / 3, zIndex: 10 }}
						ref={ref => this.YouTube = ref}
					/>
				</View>

				{
					loading && (
						<ActivityIndicator style={{ margin: 20 }} />
					)
				}
			</View>
		);
	}

	renderCard(video) {
		return (
			<CardFlip
				style={{ flex: 1 }}
				ref={card => this[video.id] = card}
				duration={750}
				perspective={2000}
			>
				{ this.renderCardFront(video) }
				{ this.renderCardBack(video) }
			</CardFlip>
		);
	}

	renderCardFront(video) {
		const { snippet = {} } = video;

		// We display a 2-column layout when on landscape/tablet and 1 column layout for mobile/portrait
		const { height, width } = Dimensions.get("window");
		const aspectRatio = height/width;

		return (
			<ScrollView style={{ flex: 1, paddingTop: 20 }}>
				<TouchableWithoutFeedback onPress={() => this.setState({ lock: true }, () => this[video.id].flip())}>
					<Card
						style={{
							marginLeft: aspectRatio > 1.4 ? 0 : 20,
							marginRight: aspectRatio > 1.4 ? 0 : 20,
							marginBottom: height / 5,
							marginTop: height / 3
						}}
					>
						{
							snippet.loading ? (
								<ActivityIndicator style={{ margin: 30 }} />
							) : (
								<React.Fragment>
									<Card.Title title={snippet.title} subtitle={Moment(snippet.publishedAt).format("LL")} left={(props) => <Avatar.Icon {...props} icon="close" />} />

									<Card.Content style={{ minHeight: height / 3 }}>
										<Paragraph>{ snippet.description }</Paragraph>
									</Card.Content>

									<Card.Actions>
										<PaperButton icon="close" onPress={() => this.setState({ lock: true }, () => this[video.id].flip())}>Cancel</PaperButton>
									</Card.Actions>
								</React.Fragment>
							)
						}
					</Card>
				</TouchableWithoutFeedback>
			</ScrollView>
		);
	}

	renderCardBack(video) {
		const { Videos: { loading }} = this.props;

		const { height, width } = Dimensions.get("window");
		const aspectRatio = height/width;

		return (
			<ScrollView style={{ flex: 1, paddingTop: 20 }}>
				<Card
					style={{
						marginLeft: aspectRatio > 1.4 ? 0 : 20,
						marginRight: aspectRatio > 1.4 ? 0 : 20,
						marginBottom: height / 5,
						marginTop: height / 3
					}}
				>
					<Card.Content>
						{
							loading ? (
								<ActivityIndicator style={{ margin: 30 }} />
							) : (
								<Recorder />
							)
						}
					</Card.Content>
					<Card.Actions>
						<PaperButton icon="close" onPress={() => this.setState({ lock: false }, () => this[video.id].flip())}>Cancel</PaperButton>
					</Card.Actions>
				</Card>
			</ScrollView>
		);
	}

	async onCardFlip() {
		const { video, video: { id } } = this.state;

		this.setState({
			video: {
				...video,
				loading: true
			}
		});

		const videoData = await getVideoData(id);
		const { snippet: { title, description, publishedAt }} = videoData;

		this.setState({
			lock: true,
			video: {
				...video,
				loading: false,
				title, description, publishedAt
			}
		});
	}
}

async function getVideoData(videoId) {
	const toReturn = _.get(await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${videoId}&key=${apiKey}`), "data.items.0");
	return toReturn;
}